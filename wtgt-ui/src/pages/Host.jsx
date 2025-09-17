import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bannerImage from '../assets/banner.png';
import { host } from '../utils/roomManager';
import { initSocket } from '../utils/wsClient';
const Host = () => {
    const navigate = useNavigate();

    const [roomInput, setRoomInput] = useState('');
    const [userInput, setUserInput] = useState('');
    const [fileName, setFileName] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [serverIp, setServerIp] = useState('');

    const handleUpload = (e) => {
        const file = e.target.files[0];
        setVideoFile(file);
        if (file) setFileName(file.name);
    };


    // const handleHost = () => {
    //     // const ws = new WebSocket(`ws://localhost:3000`);
    //     // host('eeeee.mp4', ws);
    //     // navigate(`/watch?roomId=${roomInput}&host=true&username=${userInput}`);
    //     const ws = initSocket(serverIp);
    //     ws.onopen = () => {
    //         ws.send(JSON.stringify({ type: "host", content: "fileName.mp4" }));
    //         console.log(JSON.stringify({ type: "host", content: "fileName.mp4" }));
    //         navigate(`/watch?roomId=${roomInput}`);
    //     };
    // };
    const handleHost = () => {
        const ws = initSocket(serverIp); // serverIp should come from state or props

        ws.onopen = () => {

            // ws.send(JSON.stringify({
            //     type: 'host',
            //     roomId: roomInput,
            //     username: userInput,
            //     fileName: videoFile?.name || '',
            // }));
            host(videoFile?.name || '', ws);
            navigate(`/watch?roomId=${roomInput}&username=${userInput}`);
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            alert('Failed to connect to server. Please check the IP and try again.');
        };
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
                <input
                    type="text"
                    placeholder="Server IP"
                    value={serverIp}
                    onChange={(e) => setServerIp(e.target.value)}
                    className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-500)]"
                />

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
