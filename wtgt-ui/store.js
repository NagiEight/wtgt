class Store {
    constructor() {
        this.rooms = new Map();
        this.users = new Map();
        this.chats = new Map();
        this.playback = new Map();
    }

    // Room methods
    setRoom(roomId, data) {
        this.rooms.set(roomId, { ...data, createdAt: Date.now() });
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    // User methods
    addUserToRoom(roomId, username) {
        const users = this.users.get(roomId) || new Set();
        users.add(username);
        this.users.set(roomId, users);
    }

    getRoomUsers(roomId) {
        return Array.from(this.users.get(roomId) || []);
    }

    // Chat methods
    addChat(roomId, message) {
        const chats = this.chats.get(roomId) || [];
        chats.push(message);
        this.chats.set(roomId, chats);
    }

    // Playback methods
    updatePlayback(roomId, data) {
        this.playback.set(roomId, data);
    }

    getPlayback(roomId) {
        return this.playback.get(roomId);
    }

    // Cleanup
    cleanupRoom(roomId) {
        this.rooms.delete(roomId);
        this.users.delete(roomId);
        this.chats.delete(roomId);
        this.playback.delete(roomId);
    }
}

export const store = new Store();