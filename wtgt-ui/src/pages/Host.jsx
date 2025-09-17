import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bannerImage from '../assets/banner.png';

const Host = () => {
    const navigate = useNavigate();

    const [roomInput, setRoomInput] = useState('');
    const [userInput, setUserInput] = useState('');
    const [fileName, setFileName] = useState('');
    const [videoFile, setVideoFile] = useState(null);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        setVideoFile(file);
        if (file) setFileName(file.name);
    };

    const handleHost = () => {

        navigate(`/watch?roomId=${roomInput}`);
    };

    const isFormValid = roomInput && userInput && videoFile;

    return (
        <section
            className="w-full bg-cover bg-center text-[var(--color-black-500)] py-20"
            style={{ backgroundImage: `url(${bannerImage})` }}
        >
            <div className="max-w-xl mx-auto px-6 text-center bg-white/70 backdrop-blur-sm rounded-lg py-10 space-y-6">
                <h1 className="text-3xl font-bold font-[var(--font-display)]">Host a Room</h1>
                <p className="text-lg font-medium">
                    Host room <span className="font-bold text-[var(--color-cyan-500)]">#{roomInput || '____'}</span> as <span className="font-bold text-[var(--color-magenta-500)]">{userInput || '____'}</span>
                    {fileName && <> with <span className="font-bold text-[var(--color-yellow-500)]">{fileName}</span></>}
                </p>

                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Room ID"
                        value={roomInput}
                        onChange={(e) => setRoomInput(e.target.value)}
                        className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-500)]"
                    />
                    <input
                        type="text"
                        placeholder="Username"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
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
                        disabled={!isFormValid}
                        className={`w-full px-4 py-2 bg-[var(--color-cyan-500)] text-white rounded-md font-semibold transition clickable
                            ${!isFormValid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--color-cyan-600)]'}`}
                    >
                        Host Room
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Host;
