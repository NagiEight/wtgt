import React, { useState } from 'react';
import bannerImage from '../assets/banner.png';
import { hostRoom } from '../utils/roomManager';



const Host = () => {
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const [fileName, setFileName] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const handleUpload = (e) => {
        const file = e.target.files[0];
        setVideoFile(file);
        if (file) {
            setFileName(file.name);
        }
    };

    const handleHost = async () => {
        console.log(`Hosting room #${roomId} as ${username} with ${fileName}`);
        await hostRoom({ roomId: roomId, username: username, videoFile: videoFile });
        // Redirect or initialize session here
    };

    return (
        <section
            className="w-full bg-cover bg-center text-[var(--color-black-500)] py-20"
            style={{ backgroundImage: `url(${bannerImage})` }}
        >
            <div className="max-w-xl mx-auto px-6 text-center bg-white/70 backdrop-blur-sm rounded-lg py-10 space-y-6">
                <h1 className="text-3xl font-bold font-[var(--font-display)]">
                    Host a Room
                </h1>

                {/* Live Sentence */}
                <p className="text-lg font-medium">
                    Host room <span className="font-bold text-[var(--color-cyan-500)]">#{roomId || '____'}</span> as <span className="font-bold text-[var(--color-magenta-500)]">{username || '____'}</span>
                    {fileName && (
                        <> with <span className="font-bold text-[var(--color-yellow-500)]">{fileName}</span></>
                    )}
                </p>

                {/* Inputs */}
                <div className="space-y-4">
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
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleUpload}
                        className="w-full px-4 py-2 bg-[var(--color-yellow-100)] rounded-md cursor-pointer"
                    />
                    <button
                        onClick={handleHost}
                        className="w-full px-4 py-2 bg-[var(--color-cyan-500)] text-white rounded-md font-semibold hover:bg-[var(--color-cyan-600)] transition"
                    >
                        Host Room
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Host;
