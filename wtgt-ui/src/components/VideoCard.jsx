import React from 'react';

const VideoCard = ({ video }) => (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition p-4">
        <img src={video.thumbnail} alt={video.title} className="w-full h-48 object-cover rounded" />
        <h3 className="mt-2 text-lg font-semibold">{video.title}</h3>
        <p className="text-sm text-gray-500">{video.channel}</p>
    </div>
);

export default VideoCard;