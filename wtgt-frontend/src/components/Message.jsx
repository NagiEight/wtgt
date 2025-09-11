// Message.jsx
import React from 'react';
import MessageText from './Messages/MessageText';
import MessageImage from './Messages/MessageImage';
import MessageFile from './Messages/MessageFile';
import MessageVoice from './Messages/MessageVoice';

const Message = ({ type, content, src, alt, filename, label, sender, timestamp }) => {
  return (
    <div
      className="p-3 mb-3 rounded-md"
      style={{
        backgroundColor: '#262836',
        boxShadow: 'inset 0 0 0 2px #645b51',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <img
          src={sender.avatar}
          alt={sender.name}
          className="w-6 h-6 rounded-full border border-[#b09477]"
        />
        <span className="text-sm text-[#b09477] font-semibold">{sender.name}</span>
        <span className="text-xs text-[#7c7366] ml-auto">{timestamp}</span>
      </div>

      {type === 'text' && <MessageText content={content} />}
      {type === 'image' && <MessageImage src={src} alt={alt} />}
      {type === 'file' && <MessageFile filename={filename} />}
      {type === 'voice' && <MessageVoice label={label} />}
    </div>
  );
};

export default Message;
