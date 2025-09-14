import React, { useState, useEffect, useRef } from 'react';
import ChatPanel from './components/ChatPanel';
import VideoPanel from './components/VideoPanel';
import MessageManager from './utils/messageManager';
const WTGTPage = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [showChat, setShowChat] = useState(true);
  const [chatOnRight, setChatOnRight] = useState(true);
  const managerRef = useRef(null);

  useEffect(() => {
    const manager = new MessageManager();

    manager.onMessage((msg) => {
      if (msg.type === "init") {
        const messages = msg.content?.messages || {};
        setMessages(Object.values(messages));
      } else if (msg.type === "message") {
        const newMsg = msg.content?.info;
        if (newMsg) {
          setMessages((prev) => [...prev, newMsg]);
        } else {
          console.warn("Malformed message broadcast:", msg);
        }
      }
    });

    managerRef.current = manager;
  }, []);

  const sendMessage = () => {
    if (input.trim()) {
      managerRef.current.sendMessage(input);
      setInput("");
    }
  };
  return (
    <div className="relative w-screen h-screen font-sans overflow-hidden bg-[#1b1a19]">
      <svg
        className="absolute inset-0 w-screen h-screen -z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="starGlow" cx="50%" cy="50%" r="80%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#b09477" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1b1a19" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#starGlow)" />
        <circle cx="20%" cy="30%" r="1.5" fill="#b09477" />
        <circle cx="70%" cy="60%" r="1.2" fill="#b09477" />
        <circle cx="40%" cy="80%" r="1.8" fill="#b09477" />
        <circle cx="85%" cy="25%" r="1.4" fill="#b09477" />
      </svg>

      <div className={`flex h-full w-full ${chatOnRight ? 'flex-row' : 'flex-row-reverse'}`}>
        <VideoPanel />
        {showChat && (
          <ChatPanel
            messages={messages}
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            showChat={showChat}
            setShowChat={setShowChat}
            chatOnRight={chatOnRight}
            setChatOnRight={setChatOnRight}
          />
        )}
      </div>
    </div>
  );
};

export default WTGTPage;
