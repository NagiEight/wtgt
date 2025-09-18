import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import bannerImage from '../assets/banner.png';
import { initSocket } from '../utils/roomManager';

const Banner = () => {
    const [serverIP, setServerIP] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const isValidAddress = (input) => {
        const ipRegex = /^(ws:\/\/)?((25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(?!$)|$)){4}(:\d+)?$/;
        const domainRegex = /^(ws:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?$/;
        const localhostRegex = /^(ws:\/\/)?localhost(:\d+)?$/;
        return ipRegex.test(input) || domainRegex.test(input) || localhostRegex.test(input);
    };

    const handleConnect = () => {
        // if (!isValidAddress(serverIP)) {
        //     setError("this isn't a valid ip address, try again.");
        //     return;
        // }

        setError('');
        const formattedIP = serverIP.startsWith('ws://') ? serverIP : `ws://${serverIP}`;
        console.log(`Connecting to server at ${formattedIP}`);
        initSocket(formattedIP);
        navigate('/videos');
    };

    return (
        <section
            className="w-full bg-cover bg-center text-[var(--color-black-500)] py-20"
            style={{ backgroundImage: `url(${bannerImage})` }}
        >
            <div className="max-w-4xl mx-auto px-6 text-center bg-white/70 backdrop-blur-sm rounded-lg py-10">
                <h1 className="text-4xl font-bold font-[var(--font-display)] mb-4">
                    Welcome to WTGT
                </h1>
                <p className="text-lg leading-relaxed mb-6">
                    Watch anime together with friends in real-time. Share the experience, chat, and enjoy your favorite shows no matter where you are.
                </p>

                <div className="flex flex-col items-center space-y-2 mb-6">
                    <div className="flex w-full max-w-md space-x-2">
                        <input
                            type="text"
                            value={serverIP}
                            onChange={(e) => setServerIP(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleConnect();
                                }
                            }}
                            placeholder="Enter Server IP"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-500)]"
                        />

                        <button
                            onClick={handleConnect}
                            className="px-6 py-2 bg-[var(--color-magenta-500)] text-white rounded-md font-semibold hover:bg-[var(--color-cyan-500)] transition"
                        >
                            Connect
                        </button>
                    </div>

                    {error && (
                        <p className="text-red-600 font-medium">{error}</p>
                    )}
                    <p className="text-sm text-gray-400">example: localhost:3000</p>
                </div>
            </div>
        </section>
    );
};

export default Banner;
