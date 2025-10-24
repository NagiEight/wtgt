import { useEffect, useRef, useState } from "react";
import { subscribe, updateMediaState, pauseMedia } from "../utils/socket";

export default function VideoPlayer() {
  const videoRef = useRef(null);
  const [isHost, setIsHost] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Subscribe to room state updates
    const unsubHost = subscribe("host", ({ host }) => {
      // Check if current user is host based on their ID
      setIsHost(host === localStorage.getItem("userID"));
    });

    // Handle sync messages
    const unsubSync = subscribe("sync", ({ isPaused, currentTime }) => {
      const video = videoRef.current;
      if (!video || isHost) return;

      setIsSyncing(true);
      if (Math.abs(video.currentTime - currentTime) > 0.5) {
        video.currentTime = currentTime;
      }
      isPaused ? video.pause() : video.play();
      setIsSyncing(false);
    });

    return () => {
      unsubHost();
      unsubSync();
    };
  }, [isHost]);

  const handleTimeUpdate = () => {
    if (!isHost || isSyncing) return;
    const video = videoRef.current;
    updateMediaState(video.paused, video.currentTime);
  };

  const handlePlayPause = () => {
    if (!isHost) return;
    const video = videoRef.current;
    pauseMedia(video.paused);
  };

  return (
    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-md relative">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlayPause}
        onPause={handlePlayPause}
        poster="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
      >
        <source
          src="https://www.w3schools.com/html/mov_bbb.mp4"
          type="video/mp4"
        />
        <source
          src="https://www.w3schools.com/html/movie.webm"
          type="video/webm"
        />
        Your browser does not support the video tag.
      </video>
      {!isHost && (
        <div className="absolute top-0 right-0 bg-black bg-opacity-50 text-white px-2 py-1 text-sm">
          Viewer Mode
        </div>
      )}
    </div>
  );
}
