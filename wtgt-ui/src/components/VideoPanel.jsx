import React from 'react';

const VideoPanel = ({ title, src, poster }) => {
    return (
        <div className="w-full mx-auto bg-(--color-bg) rounded-lg p-4 max-w-7xl">
            <div className="aspect-video w-full overflow-hidden rounded-sm">
                <video
                    className="w-full h-full "
                    controls
                    poster={poster}
                >
                    <source src={src} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
            <div className='flex flex-col sm:flex-row justify-between gap-4 pt-2 items-center'>
                {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
                <div className='flex gap-4'>
                    <button className='group flex items-center px-6 py-1 rounded-md font-semibold bg-(--color-magenta)/20 border-3 border-(--color-subtext) text-(--color-text) transition-all duration-200 hover:bg-(--color-magenta) hover:text-(--color-bg) hover:border-none hover:border-(--color-bg) focus:outline-none focus:border-(--color-cyan)'>
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" className='text-(--color-text) group-hover:text-(--color-bg) duration:200 transition text-lg rotate-180 ' fill='currentColor'><path strokeWidth={40} d="M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z"></path></svg>
                        Upload
                    </button>
                    <button className=' group flex items-center px-6 py-1 rounded-md font-semibold bg-(--color-cyan)/20 border-3 border-(--color-subtext) text-(--color-text) transition-all duration-200 hover:bg-(--color-cyan) hover:text-(--color-bg) hover:border-(--color-bg) focus:outline-none focus:border-(--color-cyan)'>
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" className='text-(--color-text) group-hover:text-(--color-bg) duration:200 transition text-lg' fill='currentColor'><path strokeWidth={40} d="M17 18v1H6v-1h11zm-.5-6.6-.7-.7-3.8 3.7V4h-1v10.4l-3.8-3.8-.7.7 5 5 5-4.9z"></path></svg>
                        Download
                    </button>
                </div>


            </div >
            <div className='h-8'></div>
            <div className='p-4 border-2 border-dashed text-md bg-(--color-yellow)/20 rounded-lg'>
                <p className='font-bold'>
                    4,553,731 views  24 Jan 2023
                </p>
                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.
            </div>
        </div >

    );
};

export default VideoPanel;
