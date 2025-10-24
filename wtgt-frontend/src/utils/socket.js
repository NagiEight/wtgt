let socket = null;
let messageHandlers = new Map();

export function connectToSocket(url, username, avatar) {
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        throw new Error('Invalid WebSocket URL');
    }

    const wsUrl = new URL(url);
    wsUrl.searchParams.append('UserName', username);
    wsUrl.searchParams.append('Avt', avatar || '');

    if (!socket || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket(wsUrl.toString());
        setupSocketHandlers();
    }
    return socket;
}

function setupSocketHandlers() {
    socket.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            const handlers = messageHandlers.get(message.type) || [];
            handlers.forEach(handler => handler(message.content));
        } catch (error) {
            console.error('Error handling message:', error);
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        notifyHandlers('error', error);
    };

    socket.onclose = () => {
        notifyHandlers('close');
        socket = null;
    };
}

export function sendMessage(type, content) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        throw new Error('Socket is not connected');
    }

    socket.send(JSON.stringify({ type, content }));
}

export function subscribe(type, handler) {
    if (!messageHandlers.has(type)) {
        messageHandlers.set(type, []);
    }
    messageHandlers.get(type).push(handler);

    // Return unsubscribe function
    return () => {
        const handlers = messageHandlers.get(type);
        const index = handlers.indexOf(handler);
        if (index !== -1) {
            handlers.splice(index, 1);
        }
    };
}

function notifyHandlers(type, payload) {
    const handlers = messageHandlers.get(type) || [];
    handlers.forEach(handler => handler(payload));
}

export function getSocket() {
    return socket;
}

// Room management functions
export function joinRoom(roomId) {
    sendMessage('join', { roomID: roomId });
}

export function leaveRoom() {
    sendMessage('leave');
}

export function hostRoom(roomConfig) {
    sendMessage('host', roomConfig);
}

// Media control functions
export function updateMediaState(isPaused, currentTime) {
    sendMessage('sync', { isPaused, currentTime });
}

export function pauseMedia(isPaused) {
    sendMessage('pause', { isPaused });
}

// Chat functions
export function sendChatMessage(text) {
    sendMessage('message', { text });
}

// Moderation functions
export function promoteMember(memberId) {
    sendMessage('election', { targetID: memberId });
}

export function demoteMember(memberId) {
    sendMessage('demotion', { targetID: memberId });
}
