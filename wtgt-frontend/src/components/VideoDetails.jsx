export default function VideoDetails() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Never Gonna Give You Up</h1>
      <div className="flex items-center gap-4 mb-4">
        <img
          src="https://yt3.ggpht.com/ytc/AKedOLQZrQw4w9WgXcQ=s88-c-k-c0x00ffffff-no-rj"
          alt="Channel"
          className="w-10 h-10 rounded-full"
        />
        <div>
          <p className="font-medium">Rick Astley</p>
          <p className="text-sm text-gray-400">1.2M subscribers</p>
        </div>
        <button className="ml-auto bg-red-600 px-4 py-1 rounded hover:bg-red-700">
          Subscribe
        </button>
      </div>
      <p className="text-gray-300">
        Official music video for “Never Gonna Give You Up” by Rick Astley.
      </p>
    </div>
  );
}
