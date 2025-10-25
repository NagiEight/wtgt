import { useEffect, useRef, useState } from "react";
import {
  subscribe,
  updateMediaState,
  pauseMedia,
  updateSeek,
} from "../utils/socket";

export default function VideoPlayer() {
  const videoRef = useRef(null);
  const [isHost, setIsHost] = useState(
    localStorage.getItem("isHost") === "true"
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [localFileUrl, setLocalFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Listen for video filename from host
    const unsubVideo = subscribe("upload", (data) => {
      if (data) {
        setVideoName(data);
        setLocalFileUrl(""); // Reset member's file selection
      }
    });

    // Members: respond to pause and sync messages
    const unsubPause = subscribe("pause", (isPaused) => {
      const video = videoRef.current;
      if (!video || isHost) return;
      isPaused ? video.pause() : video.play();
    });

    const unsubSync = subscribe("sync", (currentTime) => {
      const video = videoRef.current;
      if (!video || isHost) return;
      if (
        typeof currentTime === "number" &&
        Math.abs(video.currentTime - currentTime) > 0.5
      ) {
        video.currentTime = currentTime;
      }
      if (typeof isPaused === "boolean") {
        isPaused ? video.pause() : video.play();
      }
    });

    // Listen for host status changes in localStorage
    const handleStorage = () => {
      setIsHost(localStorage.getItem("isHost") === "true");
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      unsubPause();
      unsubSync();
      unsubVideo();
      window.removeEventListener("storage", handleStorage);
    };
  }, [isHost]);
  useEffect(() => {
    // Listen for video URL updates (sync from server)
    const unsubVideo = subscribe("video", (videoData) => {
      if (videoData && videoData.url) setVideoUrl(videoData.url);
    });

    // Handle sync messages
    const unsubSync = subscribe(
      "sync",
      ({ isPaused, currentTime, videoUrl: syncUrl }) => {
        const video = videoRef.current;
        // Only sync if not host
        if (!video || isHost) return;
        if (syncUrl && syncUrl !== videoUrl) setVideoUrl(syncUrl);
        setIsSyncing(true);
        if (Math.abs(video.currentTime - currentTime) > 0.5) {
          video.currentTime = currentTime;
        }
        isPaused ? video.pause() : video.play();
        setIsSyncing(false);
      }
    );

    // Listen for host status changes in localStorage
    const handleStorage = () => {
      setIsHost(localStorage.getItem("isHost") === "true");
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      unsubSync();
      unsubVideo();
      window.removeEventListener("storage", handleStorage);
    };
  }, [isHost, videoUrl]);

  const handleTimeUpdate = () => {
    if (!isHost || isSyncing) return;
    const video = videoRef.current;
    //updateMediaState(video.paused, video.currentTime, videoUrl);
    console.log(video.currentTime);
    updateSeek(video.currentTime);
  };

  const handlePlayPause = () => {
    if (!isHost) return;
    const video = videoRef.current;
    pauseMedia(video.paused);
  };

  // Host: select video and send filename
  const handleHostSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setVideoName(file.name);
    setLocalFileUrl(URL.createObjectURL(file));
    // Send filename to server via WebSocket
    import("../utils/socket").then(({ sendMessage }) => {
      sendMessage("upload", file.name);
    });
  };

  // Member: select local file after host uploads
  const handleMemberSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.name !== videoName) {
      alert(`Please select the video named: ${videoName}`);
      return;
    }
    setLocalFileUrl(URL.createObjectURL(file));
  };

  return (
    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-md relative flex items-center justify-center">
      {isHost ? (
        !videoName ? (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <div className="mb-4 text-green-400 font-bold text-lg">
              You are the host
            </div>
            <label className="bg-gray-800 text-white px-6 py-3 rounded cursor-pointer text-lg">
              Select Video
              <input
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={handleHostSelect}
              />
            </label>
          </div>
        ) : localFileUrl ? (
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlayPause}
            onPause={handlePlayPause}
            poster="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
            src={localFileUrl}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="text-gray-400 text-xl">
            Please select your video file: {videoName}
          </div>
        )
      ) : !videoName ? (
        <div className="text-gray-400 text-xl">
          Waiting for host to select a video...
        </div>
      ) : !localFileUrl ? (
        <div className="flex flex-col items-center justify-center w-full h-full">
          <div className="mb-4 text-blue-400 font-bold text-lg">
            Host selected: {videoName}
          </div>
          <label className="bg-gray-800 text-white px-6 py-3 rounded cursor-pointer text-lg">
            Select Your Copy
            <input
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              onChange={handleMemberSelect}
            />
          </label>
        </div>
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlayPause}
          onPause={handlePlayPause}
          poster="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
          src={localFileUrl}
        >
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
}
