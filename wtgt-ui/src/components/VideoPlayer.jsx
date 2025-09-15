import React from 'react';
import {
    PlayIcon, PauseIcon, ArrowPathIcon, ForwardIcon,
    SpeakerWaveIcon, Cog6ToothIcon, ArrowsPointingOutIcon,
    RectangleStackIcon, TvIcon, ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const VideoPlayer = ({ src }) => {
    return (
        <>
            {/* Video Display */}
            <div className="bg-black rounded-lg overflow-hidden relative h-[60vh] flex items-center justify-center">
                <video className="w-full h-full object-cover" controls src={src} />

                {/* Controls Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/50 px-4 py-2 rounded-md">
                    <div className="flex items-center space-x-2">
                        <button><ArrowPathIcon className="h-5 w-5 text-white" /></button>
                        <button><PlayIcon className="h-5 w-5 text-white" /></button>
                        <button><PauseIcon className="h-5 w-5 text-white" /></button>
                        <button><ForwardIcon className="h-5 w-5 text-white" /></button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <SpeakerWaveIcon className="h-5 w-5 text-white" />
                        <input type="range" className="w-24" />
                        <span className="text-white text-sm">00:12 / 24:00</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Cog6ToothIcon className="h-5 w-5 text-white" />
                        <RectangleStackIcon className="h-5 w-5 text-white" />
                        <TvIcon className="h-5 w-5 text-white" />
                        <ArrowsPointingOutIcon className="h-5 w-5 text-white" />
                    </div>
                </div>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-lg p-4 shadow-md space-y-2">
                <h2 className="text-xl font-bold">Uploaded Video</h2>
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Ping: 42ms</span>
                    <button className="flex items-center space-x-1 text-[var(--color-cyan-500)] hover:underline">
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        <span>Download</span>
                    </button>
                </div>
                <p className="text-sm text-gray-700">
                    This is a placeholder description for your uploaded video. You can customize this later.
                </p>
            </div>
        </>
    );
};

export default VideoPlayer;
