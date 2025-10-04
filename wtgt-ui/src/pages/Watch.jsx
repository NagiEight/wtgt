import React from 'react';
import ChatPanel from '../components/ChatPanel';
import VideoPanel from '../components/VideoPanel';

const Watch = () => {
    return (
        <div className="flex h-full md:flex-row bg-(--color-bg) text-(--color-text)">
            <VideoPanel
                title="DECO*27 - Monitoring (Best Friend Remix) feat. Hatsune Miku"
                src=""
                poster="/media/episode1-thumb.jpg"

            />
            <ChatPanel />
        </div>

    );
};

export default Watch;
