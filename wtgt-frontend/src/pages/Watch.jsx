import VideoPlayer from "../components/VideoPlayer";
import VideoDetails from "../components/VideoDetails";
import ChatLayout from "../components/ChatLayout";

export default function Watch() {
  return (
    <div className="flex flex-col md:flex-row bg-gray-900 text-white min-h-screen">
      <main className="flex-1 p-4">
        <VideoPlayer />
        <VideoDetails />
      </main>
      <aside className="w-full md:w-80 p-4 border-l border-gray-700">
        <ChatLayout />
      </aside>
    </div>
  );
}
