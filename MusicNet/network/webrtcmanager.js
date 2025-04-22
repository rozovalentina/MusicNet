// Configuración optimizada de Socket.IO
const socket = io('https://musicnet-signaling-server-latest.onrender.com', {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket'],
    autoConnect: false, // Nosotros controlaremos la conexión manualmente
    withCredentials: true,
    secure: true,
    rejectUnauthorized: false
});

// Manejadores de eventos mejorados
socket.on('connect', () => {
    console.log('✅ Conectado al servidor de signaling');
    multiplayerState.connected = true;
});

socket.on('disconnect', (reason) => {
    console.warn('❌ Desconectado del servidor:', reason);
    multiplayerState.connected = false;
    
    if (reason === 'io server disconnect') {
        // Reconexión manual si el servidor nos desconectó
        socket.connect();
    }
});

socket.on('connect_error', (error) => {
    console.error('Error de conexión:', error.message);
    // Intento de reconexión después de un retraso
    setTimeout(() => socket.connect(), 2000);
});


// Modifica la función initializeWebRTC
function initializeWebRTC(roomCode, isHost, onConnectionEstablished) {
    console.log(`[WebRTC] Inicializando conexión P2P para sala ${roomCode}`);

    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { 
                urls: 'turn:your-turn-server.com',
                username: 'username',
                credential: 'password'
            }
        ],
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
    };

    const peerConnection = new RTCPeerConnection(config);
    let dataChannel = null;

    // Manejo robusto de estados
    peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log(`Estado conexión: ${state}`);
        
        if (state === 'connected') {
            console.log('✅ Conexión P2P establecida');
            onConnectionEstablished(peerConnection);
        } else if (state === 'failed') {
            console.error('❌ Conexión P2P fallida');
            restartIce(peerConnection);
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log(`Estado ICE: ${peerConnection.iceConnectionState}`);
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Enviando ICE candidate');
            socket.emit('iceCandidate', { 
                roomCode : roomCode, 
                candidate: event.candidate 
            });
        }
    };

    peerConnection.onnegotiationneeded = async () => {
        try {
            if (isHost) {
                const offer = await peerConnection.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: false
                });
                await peerConnection.setLocalDescription(offer);
                socket.emit('offer', { roomCode, offer });
            }
        } catch (error) {
            console.error('Error en negociación:', error);
        }
    };

    // Configuración del DataChannel
    if (isHost) {
        dataChannel = peerConnection.createDataChannel('gameData', {
            ordered: true,
           // maxPacketLifeTime: 3000,
            maxRetransmits: 5
        });
        setupDataChannel(dataChannel);
    }

    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannel(dataChannel);
    };

    return { peerConnection, dataChannel };
}

function restartIce(peerConnection) {
    console.log('Reiniciando ICE...');
    peerConnection.restartIce();
}

// Función mejorada setupDataChannel
function setupDataChannel(channel) {
    channel.onopen = () => {
        console.log('🟢 DataChannel listo');
        multiplayerState.dataChannelReady = true;
        
        // Enviar estado inicial si es necesario
        if (game.scene.getScene("playSceneMultiplayer")) {
            const gameState = game.scene.getScene("playSceneMultiplayer").getGameState();
            channel.send(JSON.stringify({
                type: 'gameState',
                data: gameState
            }));
        }
    };

    channel.onclose = () => {
        console.log('🔴 DataChannel cerrado');
        multiplayerState.dataChannelReady = false;
        attemptReconnect();
    };

    channel.onerror = (error) => {
        console.error('Error en DataChannel:', error);
    };

    channel.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('Mensaje recibido:', message.type);
            
            const playScene = game.scene.getScene("playSceneMultiplayer");
            if (playScene) {
                playScene.handleNetworkMessage(message);
            }
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    };
}

function attemptReconnect() {
    if (multiplayerState.retryCount < multiplayerState.maxRetries) {
        multiplayerState.retryCount++;
        const delay = Math.min(1000 * multiplayerState.retryCount, 5000);
        
        console.log(`Intentando reconectar (${multiplayerState.retryCount}/${multiplayerState.maxRetries}) en ${delay}ms`);
        
        setTimeout(() => {
            if (socket.disconnected) {
                socket.connect();
            }
            
            if (multiplayerState.peerConnection && 
                multiplayerState.peerConnection.connectionState !== 'connected') {
                initializeWebRTC(multiplayerState.roomCode, multiplayerState.isHost, 
                    (pc) => {
                        multiplayerState.peerConnection = pc;
                    });
            }
        }, delay);
    } else {
        console.error('Máximo de reintentos alcanzado');
        //game.scene.start('multiplayerScene');
    }
}