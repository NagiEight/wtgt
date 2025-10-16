import { useState } from "react";
import { connectToSocket } from "../utils/socket";

export default function Connect({ onConnect }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleConnect = () => {
    try {
      const ws = connectToSocket(input);
      ws.onopen = () => onConnect(input);
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
      <input
        type="text"
        placeholder="ws://localhost:3000"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full max-w-md px-4 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
      />
      <button
        onClick={handleConnect}
        className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded"
      >
        Connect
      </button>
      {error && <p className="text-red-400 mt-2">{error}</p>}
    </div>
  );
}
