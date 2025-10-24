import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectToSocket, hostRoom, joinRoom } from "../utils/socket";

export default function Connect({ onConnect }) {
  const [serverInput, setServerInput] = useState("ws://localhost:3000");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleConnect = () => {
    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (!isCreatingRoom && !roomId.trim()) {
      setError("Room ID is required to join a room");
      return;
    }

    try {
      const ws = connectToSocket(serverInput, username, avatar);

      ws.onopen = () => {
        // Store user info in localStorage for persistence
        localStorage.setItem(
          "userProfile",
          JSON.stringify({ username, avatar })
        );

        if (isCreatingRoom) {
          hostRoom({
            RoomType: "public", // or could make this configurable
            MediaName: "", // could add media URL input if needed
            IsPaused: true,
          });
        } else {
          joinRoom(roomId);
        }

        navigate("/watch");
        onConnect?.(serverInput);
      };

      ws.onerror = () =>
        setError("Failed to connect. Check the address and try again.");
    } catch (err) {
      setError("Invalid WebSocket address.");
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white px-4"
      style={{ height: "calc(100vh - 64px)" }}
    >
      <h1 className="text-3xl font-bold mb-6">🔌 Connect to Server</h1>
      <div className="w-full max-w-md space-y-4">
        <input
          type="text"
          placeholder="ws://localhost:3000"
          value={serverInput}
          onChange={(e) => setServerInput(e.target.value)}
          className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500"
        />
        <input
          type="text"
          placeholder="Username (required)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500"
          required
        />
        <input
          type="url"
          placeholder="Avatar URL (optional)"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500"
        />

        <div className="flex gap-4">
          <button
            onClick={() => setIsCreatingRoom(true)}
            className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
              isCreatingRoom
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setIsCreatingRoom(false)}
            className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
              !isCreatingRoom
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Join Room
          </button>
        </div>

        {!isCreatingRoom && (
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500"
          />
        )}

        <button
          onClick={handleConnect}
          className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
        >
          {isCreatingRoom ? "Create & Connect" : "Join & Connect"}
        </button>
        {error && <p className="text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
}
