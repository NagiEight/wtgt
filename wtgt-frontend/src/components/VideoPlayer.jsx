export default function VideoPlayer() {
  return (
    <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-md">
      <video
        className="w-full h-full"
        controls
        preload="metadata"
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
    </div>
  );
}
