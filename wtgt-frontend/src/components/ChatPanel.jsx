import React from 'react';
import IconButton from './IconButton';
import PictureIcon from './ChatIcons/PictureIcon';
import FileIcon from './ChatIcons/FileIcon';
import VoiceIcon from './ChatIcons/VoiceIcon';
import Message from './Message';

const ChatPanel = ({
  messages,
  input,
  setInput,
  sendMessage,
  showChat,
  setShowChat,
  chatOnRight,
  setChatOnRight,
}) => {
  return (
    <div className="w-[30%] h-full flex flex-col justify-between p-4">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setChatOnRight(!chatOnRight)}
          className="px-3 py-1 text-sm rounded-md"
          style={{
            backgroundColor: '#b09477',
            color: '#1b1a19',
            boxShadow: 'inset 0 0 0 2px #1b1a19',
          }}
        >
          Move Chat {chatOnRight ? 'Left' : 'Right'}
        </button>
      </div>

      <div
        className="flex-grow overflow-y-auto mb-4 rounded-md bg-[#3e3935] p-3"
        style={{
          boxShadow: 'inset 0 0 0 2px #565d6e, 0 4px 12px rgba(0,0,0,0.4)',
          borderRadius: '8px',
        }}
      >
        {messages.map((msg, i) => (
          <Message
            key={i}
            type="text"
            content={msg.content}
            sender={{
              name: msg.SenderID || 'Anonymous',
              avatar: 'https://via.placeholder.com/24',
            }}
            timestamp={msg.timestamp}
          />
        ))}
      </div>

      <div className="flex gap-2 mb-2 justify-end">
        <IconButton title="Upload Image" onClick={() => console.log('Image')}>
          <PictureIcon />
        </IconButton>
        <IconButton title="Attach File" onClick={() => console.log('File')}>
          <FileIcon />
        </IconButton>
        <IconButton title="Send Voice" onClick={() => console.log('Voice')}>
          <VoiceIcon />
        </IconButton>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
          className="flex-1 px-2 py-1 text-sm"
          style={{
            backgroundColor: '#262836',
            color: '#b09477',
            borderRadius: '6px',
            boxShadow: 'inset 0 0 0 2px #645b51',
          }}
        />
        <button
          onClick={sendMessage}
          className="px-3 py-1 text-sm transition hover:scale-105"
          style={{
            backgroundColor: '#b09477',
            color: '#1b1a19',
            borderRadius: '6px',
            boxShadow: 'inset 0 0 0 2px #1b1a19',
          }}
        >
          💫
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
