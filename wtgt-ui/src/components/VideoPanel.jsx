import React, { useState } from 'react';
import VideoPlayer from './VideoPlayer';

const VideoPanel = () => {
    const [videoSrc, setVideoSrc] = useState(null);

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoSrc(url);
        }
    };

    return (
        <div className="flex-1 p-6 flex flex-col space-y-4">
            {/* {!videoSrc ? (
                <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-lg shadow-md border-2 border-dashed border-[var(--color-cyan-300)]">
                    <p className="text-lg mb-4">Upload a video to start hosting</p>
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleUpload}
                        className="px-4 py-2 bg-[var(--color-cyan-500)] text-white rounded-md cursor-pointer"
                    />
                </div>
            ) : (
                
            )} */}
            <VideoPlayer src={videoSrc} />
        </div>
    );
};

export default VideoPanel;
