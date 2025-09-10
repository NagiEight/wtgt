import React from 'react';

const IconButton = ({ title, onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-md transition hover:scale-105"
      title={title}
      style={{
        backgroundColor: '#262836',
        color: '#b09477',
        boxShadow: 'inset 0 0 0 2px #645b51',
      }}
    >
      {children}
    </button>
  );
};

export default IconButton;
