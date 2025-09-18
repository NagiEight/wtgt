// @ts-check
// wsClient.js
let ws = null;

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
    ws.send(JSON.stringify({ type: "host", content: mediaName }));
}

/**
 * @param {string} roomID
 */
const join = async (roomID) => {
    ws.send(JSON.stringify({ type: "join", content: roomID }));
}


const leave = () => {
    ws.send(JSON.stringify({ type: "leave" }));
}

export {
    host,
    join,
}