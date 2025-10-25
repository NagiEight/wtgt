import { useEffect, useRef, useState } from "react";
import { subscribe, updateMediaState, pauseMedia } from "../utils/socket";

export default function VideoPlayer() {
  const videoRef = useRef(null);
  const [isHost, setIsHost] = useState(
    localStorage.getItem("isHost") === "true"
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Subscribe to room state updates
    const unsubHost = subscribe("host", ({ host }) => {
      setIsHost(host === localStorage.getItem("userID"));
    });

    // Listen for video URL updates (sync from server)
    const unsubVideo = subscribe("video", (videoData) => {
      if (videoData && videoData.url) setVideoUrl(videoData.url);
    });

    // Handle sync messages
    const unsubSync = subscribe(
      "sync",
      ({ isPaused, currentTime, videoUrl: syncUrl }) => {
        const video = videoRef.current;
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

    return () => {
      unsubHost();
      unsubSync();
      unsubVideo();
    };
  }, [isHost, videoUrl]);
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
    updateMediaState(video.paused, video.currentTime, videoUrl);
  };

  const handlePlayPause = () => {
    if (!isHost) return;
    const video = videoRef.current;
    pauseMedia(video.paused);
  };

  // Handle video upload
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="mb-4 text-green-400 font-bold text-lg">
          You are the host
        </div>
        <label className="bg-gray-800 text-white px-6 py-3 rounded cursor-pointer text-lg">
          {uploading ? "Uploading..." : "Upload Video"}
          <input
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      </div>;
    } catch (err) {
      alert("Upload failed");
    }
    setUploading(false);
  };

  return (
    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-md relative flex items-center justify-center">
      {!videoUrl ? (
        isHost ? (
          <label className="bg-gray-800 text-white px-6 py-3 rounded cursor-pointer text-lg">
            {uploading ? "Uploading..." : "Upload Video"}
            <input
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        ) : (
          <div className="text-gray-400 text-xl">
            Waiting for host to upload a video...
          </div>
        )
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full h-full"
            controls
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            onPlay={handlePlayPause}
            onPause={handlePlayPause}
            poster="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
            src={videoUrl}
          >
            Your browser does not support the video tag.
          </video>
          {!isHost && (
            <div className="absolute top-0 right-0 bg-black bg-opacity-50 text-white px-2 py-1 text-sm">
              Viewer Mode
            </div>
          )}
        </>
      )}
    </div>
  );
}
