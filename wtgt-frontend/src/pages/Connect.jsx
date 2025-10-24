import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { connectToSocket } from "../utils/socket";

export default function Connect({ onConnect }) {
  const [serverInput, setServerInput] = useState("ws://localhost:3000");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleConnect = () => {
    if (!username.trim()) {
      setError("Username is required");
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
        <button
          onClick={handleConnect}
          className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
        >
          Connect
        </button>
        {error && <p className="text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
}
