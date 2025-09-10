import React from 'react';

const MessageImage = ({ src, alt }) => (
  <div
    className="p-2 mb-2 rounded-md"
    style={{
      backgroundColor: '#262836',
      boxShadow: 'inset 0 0 0 2px #645b51',
    }}
  >
    🖼️
    <img
      src={src}
      alt={alt}
      className="rounded-md mt-2 w-full max-w-xs border border-[#645b51]"
    />
  </div>
);

export default MessageImage;
