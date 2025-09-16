// utils/roomManager.js
const API_URL = import.meta.env.VITE_API_URL;

export async function hostRoom({ roomId, username, videoFile }) {
    const formData = new FormData();
    formData.append('roomId', roomId);
    formData.append('host', username);
    formData.append('video', videoFile);

    const res = await fetch(`${API_URL}/rooms/host`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) throw new Error('Failed to host room');
    return await res.json();
}

export async function joinRoom({ roomId, username }) {
    const res = await fetch(`${API_URL}/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, username })
    });

    if (!res.ok) throw new Error('Failed to join room');
    return await res.json();
}

export async function getVideoStream(roomId) {
    return `${API_URL}/rooms/stream/${roomId}`;
}

export async function downloadVideo(roomId) {
    window.location.href = `${API_URL}/rooms/download/${roomId}`;
}
