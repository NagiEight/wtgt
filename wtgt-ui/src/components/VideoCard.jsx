const VideoCard = ({ thumbnail, title, channel, views, date }) => {
    return (
        <div className=" overflow-hidden shadow-md bg-(--color-bg) text-(--color-text)">
            <img src={thumbnail} alt="Video Thumbnail" className="w-full h-48 object-cover" />
            <div className="bg-(--color-bg) p-4">
                <h3 className="text-lg font-bold mb-1">{title}</h3>
                <p className="text-sm text-gray-300">{channel}</p>
                <p className="text-xs text-gray-400 mt-1">{views} • {date}</p>
            </div>
        </div>
    );
};
export default VideoCard;
