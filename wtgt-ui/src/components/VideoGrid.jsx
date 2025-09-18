import VideoCard from './VideoCard';

const VideoGrid = ({ videos }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {videos.map(video => (
            <VideoCard key={video.id} video={video} />
        ))}
    </div>
);
export default VideoGrid;