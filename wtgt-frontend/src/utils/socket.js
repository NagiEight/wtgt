let socket = null;

export function connectToSocket(url) {
  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    throw new Error('Invalid WebSocket URL');
  }
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = new WebSocket(url);
  }
  return socket;
}

export function getSocket() {
  return socket;
}
