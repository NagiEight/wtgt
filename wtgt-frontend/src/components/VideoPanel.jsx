import React from 'react';
import ReactPlayer from 'react-player';
import IconButton from './IconButton';
import PreviousIcon from './VideoIcons/PreviousIcon';
import JumpBackIcon from './VideoIcons/JumpBackIcon';
import PlayPauseIcon from './VideoIcons/PlayPauseIcon';
import JumpForwardIcon from './VideoIcons/JumpForwardIcon';
import NextIcon from './VideoIcons/NextIcon';
import RepeatIcon from './VideoIcons/RepeatIcon';
import ShuffleIcon from './VideoIcons/ShuffleIcon';
import TheaterIcon from './VideoIcons/TheaterIcon';
import VolumeBoostIcon from './VideoIcons/VolumeBoostIcon';
import PlaylistPanel from './PlaylistPanel';

const playlistItems = [
  { title: 'Suisei - Stellar Stellar' },
  { title: 'Suisei - Bluerose' },
  { title: 'Suisei - Template' },
  { title: 'Suisei - GHOST' },
  { title: 'Suisei - Tenkyuu, Suisei wa Yoru wo Mataide' },
];

const VideoPanel = () => {
  const handleSelect = (item) => {
    console.log('Selected:', item.title);
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 gap-4">
      <div className="w-full flex items-center justify-between px-4 py-2 rounded-md bg-[#262836]" style={{ boxShadow: 'inset 0 0 0 2px #645b51' }}>
  <span className="text-[#b09477] font-semibold text-sm">Suisei Channel</span>
  <span className="text-[#7c7366] text-xs">Ping: 42ms</span>
</div>

      <div
        className="w-full h-[80%] rounded-md bg-[#262836] flex items-center justify-center"
        style={{
          boxShadow: 'inset 0 0 0 2px #645b51, 0 4px 12px rgba(0,0,0,0.5)',
          borderRadius: '8px',
        }}
      >
        <ReactPlayer
          url="https://www.youtube.com/watch?v=5qap5aO4i9A"
          controls
          width="100%"
          height="100%"
        />
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        <IconButton title="Previous" onClick={() => console.log('Previous')}>
          <PreviousIcon />
        </IconButton>
        <IconButton title="Jump Back" onClick={() => console.log('Jump Back')}>
          <JumpBackIcon />
        </IconButton>
        <IconButton title="Play/Pause" onClick={() => console.log('Play/Pause')}>
          <PlayPauseIcon />
        </IconButton>
        <IconButton title="Jump Forward" onClick={() => console.log('Jump Forward')}>
          <JumpForwardIcon />
        </IconButton>
        <IconButton title="Next" onClick={() => console.log('Next')}>
          <NextIcon />
        </IconButton>
        <IconButton title="Repeat" onClick={() => console.log('Repeat')}>
          <RepeatIcon />
        </IconButton>
        <IconButton title="Shuffle" onClick={() => console.log('Shuffle')}>
          <ShuffleIcon />
        </IconButton>
        <IconButton title="Theater Mode" onClick={() => console.log('Theater Mode')}>
          <TheaterIcon />
        </IconButton>
        <IconButton title="Volume Boost" onClick={() => console.log('Volume Boost')}>
          <VolumeBoostIcon />
        </IconButton>
      </div>

      <PlaylistPanel items={playlistItems} onSelect={handleSelect} />
    </div>
  );
};

export default VideoPanel;
