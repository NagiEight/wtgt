import React from 'react';

const MessageText = ({ content }) => (
  <div
    className="text-sm text-[#b09477] p-2 mb-2 rounded-md"
    style={{
      backgroundColor: '#262836',
      boxShadow: 'inset 0 0 0 2px #645b51',
    }}
  >
    🌟 {content}
  </div>
);

export default MessageText;
