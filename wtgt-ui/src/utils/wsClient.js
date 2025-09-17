// wsClient.js
let socket = null;

export const initSocket = (serverIp) => {
    if (!socket || socket.readyState === WebSocket.CLOSED) {
        // socket = new WebSocket(`ws://localhost:3000`); // Replace with your server address
        socket = new WebSocket(`http://localhost:3000?UserName=Claire%20Iidea&Avt=uri`); // Replace with your server address
    }

    return socket;
};

export const getSocket = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not ready. Call initSocket first.');
        return null;
    }
    return socket;
};
