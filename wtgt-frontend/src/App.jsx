import React, { useEffect, useRef, useState } from 'react';

const ws = new WebSocket('ws://localhost:3000');

export default function App() {
  const videoRef = useRef(null);
  const [canSync, setCanSync] = useState(false);
  const [isReady, setIsReady] = useState(false);
  let lastSync = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => setCanSync(true);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  useEffect(() => {
    ws.onmessage = async (event) => {
      try {
        const text = await event.data.text();
        const { type, time, playing } = JSON.parse(text);
        const video = videoRef.current;
        if (!video || !canSync) return;

        if (type === 'sync') {
          video.currentTime = time;
          if (playing) {
            video.play().catch((err) => {
              console.warn('Autoplay blocked or aborted:', err);
            });
          } else {
            video.pause();
          }
        }
      } catch (err) {
        console.warn('Received non-JSON or malformed message:', event.data);
      }
    };
  }, [canSync]);

  const broadcastSync = () => {
    const now = Date.now();
    if (now - lastSync.current < 500) return; // throttle to 500ms
    lastSync.current = now;

    const video = videoRef.current;
    if (!video || !canSync) return;

    ws.send(
      JSON.stringify({
        type: 'sync',
        time: video.currentTime,
        playing: !video.paused,
      })
    );
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h1>🎬 Watch Together</h1>
      <video
        ref={videoRef}
        width="640"
        controls
        onPlay={broadcastSync}
        onPause={broadcastSync}
        onSeeked={broadcastSync}
        onLoadedData={() => setIsReady(true)}
      >
        <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
      </video>
      {!isReady && <p>Loading video...</p>}
    </div>
  );
}
