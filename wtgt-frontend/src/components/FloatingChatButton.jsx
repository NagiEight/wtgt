import React from 'react';

const FloatingChatButton = ({ onClick, isOpen }) => {
    return (
        <button
            onClick={onClick}
            className="fixed top-1/2 right-0 transform -translate-y-1/2 z-50 w-12 h-24 rounded-l-full shadow-lg transition hover:scale-105 flex items-center justify-center"
            style={{
                backgroundColor: '#b09477',
                color: '#1b1a19',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
        >
            {isOpen ? '✖' : '💬'}
        </button>
    );
};

export default FloatingChatButton;
