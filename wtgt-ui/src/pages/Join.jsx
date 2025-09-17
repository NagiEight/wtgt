import React, { useState, useContext } from 'react';
import bannerImage from '../assets/banner.png'; // Adjust path if needed
import { initSocket, join, joinIp } from '../utils/roomManager';
// import { SocketContext } from "../utils/SocketContext";

const Join = () => {
    // const ws = useContext(SocketContext);
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [serverIp, setServerIp] = useState('');

    const handleJoin = async () => {
        // You can redirect or validate here
        console.log(`Joining room #${roomId} as ${username}`);
        console.log(`Server IP: ${serverIp}`);
        joinIp(roomId, serverIp);
    };
    return (
        <section
            className="w-full bg-cover bg-center text-[var(--color-black-500)] py-20"
            style={{ backgroundImage: `url(${bannerImage})` }}
        >
            <div className="max-w-xl mx-auto px-6 text-center bg-white/70 backdrop-blur-sm rounded-lg py-10 space-y-6">
                <h1 className="text-3xl font-bold font-[var(--font-display)]">
                    Join a Room
                </h1>

                {/* Live Sentence */}
                <p className="text-lg font-medium">
                    Join room <span className="font-bold text-[var(--color-cyan-500)]">#{roomId || '____'}</span> as <span className="font-bold text-[var(--color-magenta-500)]">{username || '____'}</span>
                </p>

                {/* Input Fields */}
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Server IP"
                        value={serverIp}
                        onChange={(e) => setServerIp(e.target.value)}
                        className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-500)]"
                    />
                    <input
                        type="text"
                        placeholder="Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-500)]"
                    />
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-500)]"
                    />
                    <button
                        onClick={handleJoin}
                        className="w-full px-4 py-2 bg-[var(--color-cyan-500)] text-white rounded-md font-semibold hover:bg-[var(--color-cyan-600)] transition"
                    >
                        Join Room
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Join;
