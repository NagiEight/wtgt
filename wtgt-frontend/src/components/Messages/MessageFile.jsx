import React from 'react';

const MessageFile = ({ filename }) => (
  <div
    className="p-2 mb-2 rounded-md text-sm"
    style={{
      backgroundColor: '#262836',
      boxShadow: 'inset 0 0 0 2px #645b51',
    }}
  >
    📎 <a href="#" className="underline text-[#b09477] hover:text-[#7c7366]">{filename}</a>
  </div>
);

export default MessageFile;
