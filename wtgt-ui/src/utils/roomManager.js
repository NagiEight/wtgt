// @ts-check
// wsClient.js
let ws = null;
let mediaName = '';
export const initSocket = (serverIp) => {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        // socket = new WebSocket(`ws://localhost:3000`); // Replace with your server address
        ws = new WebSocket(serverIp); // Replace with your server address
    }
    ws.onopen = () => {
        console.log('WebSocket connection established.');
    }
    return ws;
};

export const getSocket = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not ready. Call initSocket first.');
        return null;
    }
    return ws;
};

/**
 * @param {string} mediaName
 */
const host = async (mediaName) => {
    console.log('sending: ', JSON.stringify({ type: "host", content: mediaName }));
    ws.send(JSON.stringify({ type: "host", content: mediaName }));
    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        alert('Failed to connect to server. Please check the IP and try again.');
    }
}

/**
 * @param {string} roomID
 */
const join = async (roomID) => {
    console.log('sending: ', JSON.stringify({ type: "join", content: roomID }));
    ws.send(JSON.stringify({ type: "join", content: roomID }));
    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        alert('Failed to connect to server. Please check the IP and try again.');
    }

    ws.onmessage = (message) => {
        mediaName = JSON.parse(message.data).content.CurrentMedia;
        console.log('Received message:', mediaName);
    }
}

const getMediaName = () => {
    return mediaName;
}


const leave = () => {
    ws.send(JSON.stringify({ type: "leave" }));
}

export {
    host,
    join,
    leave,
    getMediaName
}