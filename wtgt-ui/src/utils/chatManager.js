// utils/chatManager.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;
let socket;

export function connectToRoom({ roomId, username, onMessage, onUserJoin, onSync }) {
    socket = io(SOCKET_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
        socket.emit('join-room', { roomId, username });
    });

    socket.on('chat-message', onMessage);
    socket.on('user-joined', onUserJoin);
    socket.on('sync-playback', onSync);
}

export function sendMessage({ roomId, username, message }) {
    if (socket) {
        socket.emit('chat-message', { roomId, username, message });
    }
}

export function syncPlayback({ roomId, time, paused }) {
    if (socket) {
        socket.emit('sync-playback', { roomId, time, paused });
    }
}

export function disconnectChat() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
