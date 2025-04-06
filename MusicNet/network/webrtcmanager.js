const socket = io('https://musicnet-signaling-server-latest.onrender.com', {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    transports: ['websocket', 'polling'], // Intenta ambos métodos
    upgrade: true,
    rememberUpgrade: true,
    secure: true,
    rejectUnauthorized: false 
});

// Modifica la función initializeWebRTC
function initializeWebRTC(roomCode, isHost, onConnectionEstablished) {
    console.log(`[WebRTC] Inicializando conexión para sala ${roomCode}, isHost: ${isHost}`);

    const config = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };

    const peerConnection = new RTCPeerConnection(config);

    // Manejo mejorado de estados
    peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE Connection State: ${peerConnection.iceConnectionState}`);
        if (peerConnection.iceConnectionState === 'failed') {
            console.error('ICE Connection failed, restarting...');
            // Lógica de reintento aquí
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log(`Connection State: ${peerConnection.connectionState}`);
        if (peerConnection.connectionState === 'connected') {
            console.log('WebRTC connection established!');
            onConnectionEstablished(peerConnection);
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Enviando ICE candidate');
            socket.emit('iceCandidate', roomCode, event.candidate);
        } else {
            console.log('Todos los ICE candidates han sido recolectados');
        }
    };

    // Solo el host crea el DataChannel inicial
    let dataChannel;
    if (isHost) {
        dataChannel = peerConnection.createDataChannel('gameData', {
            ordered: true,
            maxRetransmits: 3
        });
        setupDataChannel(dataChannel);
    }

    peerConnection.ondatachannel = (event) => {
        console.log('DataChannel recibido');
        dataChannel = event.channel;
        setupDataChannel(dataChannel);
    };

    return { peerConnection, dataChannel };
}

// Función mejorada setupDataChannel
function setupDataChannel(channel) {
    channel.onopen = () => {
        console.log('DataChannel abierto');
        multiplayerState.connected = true;
    };

    channel.onclose = () => {
        console.log('DataChannel cerrado');
        multiplayerState.connected = false;
    };

    channel.onerror = (error) => {
        console.error('DataChannel error:', error);
    };

    channel.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            game.scene.getScene("playSceneMultiplayer").handleMessage(message);
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    };
}
