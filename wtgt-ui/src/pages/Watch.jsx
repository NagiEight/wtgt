import React from 'react';
import VideoPanel from '../components/VideoPanel';
import ChatPanel from '../components/ChatPanel';

const Watch = () => {
    return (
        <div className="flex h-full bg-[var(--color-cyan-50)] text-[var(--color-black-500)]">
            <VideoPanel />
            <ChatPanel />
        </div>

    );
};

export default Watch;
