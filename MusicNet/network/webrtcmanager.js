const socket = io('https://musicnet-signaling-server-latest.onrender.com'); 

function initializeWebRTC(roomCode, onConnectionEstablished) {
    const peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }, // STUN server
        ]
    });

    // Join room
    socket.emit('joinRoom', roomCode);

    // SDP offer
    socket.on('offer', (offer) => {
        peerConnection.setRemoteDescription(offer)
            .then(() => peerConnection.createAnswer())
            .then(answer => peerConnection.setLocalDescription(answer))
            .then(() => {
                socket.emit('answer', roomCode, peerConnection.localDescription);
            })
            .catch(err => console.error('Error manage offer:', err));
    });

    // SDP answer
    socket.on('answer', (answer) => {
        peerConnection.setRemoteDescription(answer)
            .catch(err => console.error('Error manage answer:', err));
    });

    //   ICE candidate
    socket.on('iceCandidate', (candidate) => {
        peerConnection.addIceCandidate(candidate)
            .catch(err => console.error('Error candidare ICE:', err));
    });

    // Manage ICE candidates generate locally
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('iceCandidate', roomCode, event.candidate);
        }
    };

    // connection is ready
    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'connected') {
            console.log("Connection WebRTC ready");
            onConnectionEstablished(peerConnection); // callback function
        } else if (peerConnection.connectionState === 'disconnected') {
            console.log("Connection WebRTC lost");
        }
    };

    return peerConnection;
}