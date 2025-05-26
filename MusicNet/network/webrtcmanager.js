const WebRTCManager = (() => {
    let socket;
    let peerConnection;
    let dataChannel;
    let onMessageCallback = () => {};
    let messageQueue = [];
    let pendingMessages = [];
    let pendingCandidates = [];
    let onReadyCallback;
    let offerCreated = false;
    let isHost = false;
    let roomCode = "";

    const ensureSocket = () => {
        if (!socket) {
            socket = io('https://musicnet-signaling-server-latest.onrender.com', {
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                transports: ['polling'],
                autoConnect: false,
                withCredentials: true,
                secure: true,
                rejectUnauthorized: false
            });
            socket.connect();
        }
    };

    const connect = ({ roomCode: rc, isHost: hostFlag, onReady }) => {
        if (peerConnection) {
            console.warn("⚠️ Ya existe una RTCPeerConnection activa. Ignorando nuevo connect().");
            return;
        }

        ensureSocket();
        onReadyCallback = onReady;
        isHost = hostFlag;
        roomCode = rc;

        const config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };

        peerConnection = new RTCPeerConnection(config);

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('iceCandidate', { roomCode, candidate: event.candidate });
            }
        };

        peerConnection.ondatachannel = (event) => {
            console.log("📡 Invitado recibió dataChannel");
            dataChannel = event.channel;
            setupDataChannel();
        };

        socket.on('offer', async ({ offer, roomCode: incomingRoomCode }) => {
            if (!isHost) {
                console.log("📨 Invitado recibió offer");
                if (peerConnection.signalingState !== 'stable') {
                    console.warn('⚠️ Oferta recibida en estado', peerConnection.signalingState);
                    return;
                }
                try {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    socket.emit('answer', {
                        roomCode: incomingRoomCode || roomCode,
                        answer
                    });
                    console.log('📨 Invitado respondió con answer');
                } catch (err) {
                    console.error('❌ Error al aplicar offer en invitado:', err);
                }
            }
        });

        socket.on('answer', async ({ answer }) => {
            if (isHost) {
                if (peerConnection.remoteDescription) {
                    console.warn('⚠️ Ya hay remoteDescription. Ignorando answer duplicado.');
                    return;
                }
                try {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    console.log("✅ Host aplicó answer correctamente");

                    for (const candidate of pendingCandidates) {
                        try {
                            await peerConnection.addIceCandidate(candidate);
                        } catch (err) {
                            console.error("Error aplicando ICE desde buffer:", err);
                        }
                    }
                    pendingCandidates = [];

                } catch (err) {
                    console.error("❌ Error al aplicar answer:", err);
                }
            }
        });

        socket.on('iceCandidate', async ({ candidate }) => {
            const iceCandidate = new RTCIceCandidate(candidate);
            if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
                try {
                    await peerConnection.addIceCandidate(iceCandidate);
                } catch (error) {
                    console.error("Error ICE:", error);
                }
            } else {
                console.warn("❗ ICE recibido antes del SDP remoto. Bufferizando.");
                pendingCandidates.push(iceCandidate);
            }
        });

        socket.on('message', (data) => {
            if (typeof data === 'object' && data.type) {
                messageQueue.push(data);
            }
            if (onMessageCallback) onMessageCallback(data);
        });
    };

    const createOfferWhenReady = (roomCodeToUse) => {
        if (peerConnection && !offerCreated) {
            dataChannel = peerConnection.createDataChannel('gameData');
            console.log("📡 Host creó dataChannel");
            setupDataChannel();

            peerConnection.createOffer()
                .then((offer) => {
                    offerCreated = true;
                    return peerConnection.setLocalDescription(offer);
                })
                .then(() => {
                    socket.emit('offer', {
                        roomCode: roomCodeToUse || roomCode,
                        offer: peerConnection.localDescription
                    });
                    console.log("📨 Host envió offer");
                })
                .catch((err) => {
                    console.error("❌ Error al crear y enviar offer:", err);
                });
        }
    };

    const setupDataChannel = () => {
        dataChannel.onopen = () => {
            console.log('🟢 DataChannel abierto');
            if (onReadyCallback) onReadyCallback({ peerConnection, dataChannel });

            while (pendingMessages.length > 0) {
                const msg = pendingMessages.shift();
                dataChannel.send(JSON.stringify(msg));
            }
        };

        dataChannel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                messageQueue.push(message);
                if (onMessageCallback) onMessageCallback(message);
            } catch (error) {
                console.error('Error al procesar mensaje:', error);
            }
        };
    };

    const sendMessage = (data) => {
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify(data));
        } else {
            console.warn("📦 DataChannel no listo - Bufferizando mensaje");
            pendingMessages.push(data);
        }
    };

    const onMessage = (callback) => {
        onMessageCallback = callback;
    };

    const disconnect = () => {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        offerCreated = false;
    };

    const createRoom = (roomCode) => {
        ensureSocket();
        socket.emit('createRoom', roomCode);
    };

    const joinRoom = (roomCode, callback) => {
        ensureSocket();
        socket.emit('joinRoom', roomCode, callback);
    };

    const leaveRoom = (roomCode) => {
        ensureSocket();
        socket.emit('leaveRoom', roomCode);
    };

    const offAll = () => {
        if (!socket) return;
        socket.off('offer');
        socket.off('answer');
        socket.off('iceCandidate');
        socket.off('message');
    };

    const getNextMessage = () => {
        return messageQueue.shift();
    };

    const getSocket = () => socket;

    return {
        connect,
        sendMessage,
        onMessage,
        disconnect,
        createRoom,
        joinRoom,
        leaveRoom,
        offAll,
        getNextMessage,
        getSocket,
        createOfferWhenReady,
        getPeerConnection: () => peerConnection,
        getDataChannel: () => dataChannel
    };
})();

