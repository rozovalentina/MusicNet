const socket = io('https://musicnet-signaling-server-latest.onrender.com', {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000
});

function initializeWebRTC(roomCode, onConnectionEstablished) {
    console.groupCollapsed(`[WebRTC] Inicializando conexión para sala ${roomCode}`);
    
    // 1. Configuración de la conexión PeerConnection
    const peerConnection = new RTCPeerConnection({
        iceServers: [
            { 
                urls: [
                    'stun:stun.l.google.com:19302',
                    'stun:stun1.l.google.com:19302',
                    'stun:stun2.l.google.com:19302'
                ] 
            },
            // Agrega tus servidores TURN aquí si los tienes
            // { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
        ],
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
    });

    console.log('[WebRTC] PeerConnection creado con configuración:', peerConnection.getConfiguration());

    // 2. Manejo de eventos ICE Candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('[WebRTC] Nuevo ICE Candidate generado:', 
                `${event.candidate.candidate.substring(0, 40)}... (${event.candidate.protocol}/${event.candidate.type})`);
            
            socket.emit('iceCandidate', roomCode, event.candidate);
        } else {
            console.log('[WebRTC] Todos los ICE Candidates han sido generados');
        }
    };

    // 3. Manejo de estados de conexión
    peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        console.log(`[WebRTC] ICE Connection State cambiado a: ${state}`);
        
        if (state === 'failed') {
            console.error('[WebRTC] Error en conexión ICE, intentando reiniciar...');
            peerConnection.restartIce();
        }
    };

    peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log(`[WebRTC] Connection State cambiado a: ${state}`);
        
        if (state === 'connected') {
            console.groupEnd();
            onConnectionEstablished(peerConnection);
        }
        
        if (state === 'disconnected' || state === 'failed') {
            console.warn('[WebRTC] Conexión perdida, intentando recuperar...');
        }
    };

    peerConnection.onsignalingstatechange = () => {
        console.log(`[WebRTC] Signaling State cambiado a: ${peerConnection.signalingState}`);
    };

    // 4. Manejo de ofertas/respuestas SDP
    socket.on('offer', async (offer) => {
        console.log('[WebRTC] Oferta SDP recibida:', offer.type);
        try {
            await peerConnection.setRemoteDescription(offer);
            console.log('[WebRTC] RemoteDescription establecido correctamente');
            
            const answer = await peerConnection.createAnswer();
            console.log('[WebRTC] Respuesta SDP creada:', answer.type);
            
            await peerConnection.setLocalDescription(answer);
            console.log('[WebRTC] LocalDescription establecido');
            
            socket.emit('answer', roomCode, answer);
            console.log('[WebRTC] Respuesta enviada al servidor');
        } catch (error) {
            console.error('[WebRTC] Error en manejo de oferta:', error);
        }
    });

    socket.on('answer', async (answer) => {
        console.log('[WebRTC] Respuesta SDP recibida:', answer.type);
        try {
            await peerConnection.setRemoteDescription(answer);
            console.log('[WebRTC] RemoteDescription establecido desde respuesta');
        } catch (error) {
            console.error('[WebRTC] Error al establecer respuesta:', error);
        }
    });

    // 5. Manejo de ICE Candidates remotos
    socket.on('iceCandidate', async (candidate) => {
        console.log('[WebRTC] ICE Candidate remoto recibido:', 
            `${candidate.candidate.substring(0, 40)}...`);
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('[WebRTC] ICE Candidate remoto añadido con éxito');
        } catch (error) {
            console.error('[WebRTC] Error al añadir ICE Candidate:', error);
        }
    });

    // 6. Solo el host crea la oferta inicial
    if (this.isHost) {
        console.log('[WebRTC] Creando oferta inicial (modo host)');
        peerConnection.createOffer()
            .then(offer => {
                console.log('[WebRTC] Oferta creada:', offer.type);
                return peerConnection.setLocalDescription(offer);
            })
            .then(() => {
                console.log('[WebRTC] Enviando oferta al servidor');
                socket.emit('offer', roomCode, peerConnection.localDescription);
            })
            .catch(error => {
                console.error('[WebRTC] Error en creación de oferta:', error);
            });
    }

    console.log('[WebRTC] Conexión inicializada, esperando negociación...');
    return peerConnection;
}