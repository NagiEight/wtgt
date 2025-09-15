import React, { useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { connectToRoom, sendMessage } from '../utils/chatManager';


const ChatPanel = ({ roomNumber = 'Room #1234' }) => {
    const [messages, setMessages] = useState([
        { user: 'Nagi', text: 'This scene is wild 😱' },
        { user: 'Copilot', text: 'I can’t believe what just happened!' },
        { user: 'Claire', text: 'current' }
    ]);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (input.trim()) {
            setMessages([...messages, { user: 'You', text: input }]);
            setInput('');
        }
    };
    useEffect(() => {
        connectToRoom({
            roomId,
            username,
            onMessage: (msg) => setMessages((prev) => [...prev, msg]),
            onUserJoin: (notice) => console.log(notice),
            onSync: ({ time, paused }) => syncVideo(time, paused)
        });

        return () => disconnectChat();
    }, [roomId, username]);

    return (
        <div className="w-80 border-l border-gray-200 bg-white p-4 flex flex-col h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Live Chat</h3>
                <span className="text-sm text-gray-500">{roomNumber}</span>
            </div>

            {/* Scrollable Message List */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className="bg-[var(--color-cyan-100)] p-2 rounded-md text-sm">
                        <strong>{msg.user}:</strong> {msg.text}
                    </div>
                ))}
            </div>

            {/* Input + Icon */}
            <div className="flex space-x-2 items-center">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-500)]"
                />
                <button
                    onClick={handleSend}
                    className="p-2 bg-[var(--color-cyan-500)] text-white rounded-md hover:bg-[var(--color-cyan-600)]"
                >
                    <PaperAirplaneIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

export default ChatPanel;
