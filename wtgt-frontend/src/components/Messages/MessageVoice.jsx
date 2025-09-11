import React from 'react';

const MessageVoice = ({ label }) => (
  <div
    className="p-2 mb-2 rounded-md flex items-center justify-between"
    style={{
      backgroundColor: '#262836',
      boxShadow: 'inset 0 0 0 2px #645b51',
    }}
  >
    <span className="text-sm text-[#b09477]">🎙️ {label}</span>
    <button
      className="px-2 py-1 text-xs rounded-md"
      style={{
        backgroundColor: '#b09477',
        color: '#1b1a19',
        boxShadow: 'inset 0 0 0 2px #1b1a19',
      }}
    >
      ▶️ Play
    </button>
  </div>
);

export default MessageVoice;
