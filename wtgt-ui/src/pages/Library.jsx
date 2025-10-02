import VideoCard from '../components/VideoCard';
import TagLine from '../components/TagLine';
const videos = [
    {
        thumbnail: 'https://via.placeholder.com/320x180.png?text=Video+1',
        title: 'Intro to CMYK Colors',
        channel: 'DesignLab',
        views: '1.2M views',
        date: '2 weeks ago',
    },
    {
        thumbnail: 'https://via.placeholder.com/320x180.png?text=Video+2',
        title: 'CMYK vs RGB Explained',
        channel: 'ColorTheory',
        views: '980K views',
        date: '1 month ago',
    },
    // Add more video objects here
];

const Library = () => {
    return (
        <div className="p-6 bg-(--color-bg) min-h-screen">
            <TagLine
                tags={['Action', 'Romance', 'Isekai', 'Slice of Life', 'Mecha']}
                onTagClick={(tag) => console.log(`Clicked: ${tag}`)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {videos.map((video, index) => (
                    <VideoCard key={index} {...video} />
                ))}
            </div>
        </div>
    );
};

export default Library;
