
export function setupDataChannel(peerConnection, onMessageReceived) {
    const dataChannel = peerConnection.createDataChannel('gameData');

    dataChannel.onopen = () => {
        console.log("Data Channel is open");
    };

    dataChannel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("Message:", message);
        onMessageReceived(message); // callback function
    };

    return dataChannel;
}

export function sendData(dataChannel, data) {
    if (dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(data));
    } else {
        console.error("Data channel is not open");
    }
}