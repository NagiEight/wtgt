import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

const ChatPanel = ({ roomNumber = 'Room #1234', username = 'You', roomId = 'default-room' }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const chatManagerRef = useRef(null);

    // useEffect(() => {
    //     chatManagerRef.current = chatManager;

    //     // Set up callbacks
    //     chatManager
    //         .on('onNewMessage', (msg) => {
    //             setMessages((prev) => [...prev, {
    //                 user: msg.sender,
    //                 text: msg.text,
    //                 timestamp: msg.timestamp
    //             }]);
    //         })
    //         .on('onHistoryUpdate', (history) => {
    //             const formatted = history.map(msg => ({
    //                 user: msg.sender,
    //                 text: msg.text,
    //                 timestamp: msg.timestamp
    //             }));
    //             setMessages(formatted);
    //         });

    //     // Connect to room
    //     roomManager.connect();

    //     return () => {
    //         roomManager.disconnect?.(); // If you have a disconnect method
    //     };
    // }, [roomId, username]);

    const handleSend = () => {
        if (input.trim() && chatManagerRef.current) {
            chatManagerRef.current.sendMessage(input);
            setInput('');
        }
    };

    return (
        <div className="w-80 border-l border-(--color-text) bg-(-=color-bg) border-dashed border-l-2 p-4 flex flex-col h-[calc(100vh-4rem)]">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Live Chat</h3>
                <span className="text-sm text-gray-500">{roomNumber}</span>
            </div>

            {/* Scrollable Message List */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className="bg-(--color-cyan) p-2 rounded-sm text-sm">
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
                    className="flex-1 w-full bg-(--color-yellow)/20 h-10 px-4 py-2 border rounded-sm border-2 focus:outline-none focus:ring-2 focus:ring-(--color-cyan)"
                />
                <button
                    onClick={handleSend}
                    className="h-10 w-10 p-2 bg-(--color-cyan)/20 border-2 border-(--color-text) text-white rounded-md hover:bg-(--color-cyan)"
                >
                    <PaperAirplaneIcon className="h-5 w-5 text-(--color-text)" />
                </button>
            </div>
        </div>
    );
};

export default ChatPanel;
