import { FaPaperPlane } from "react-icons/fa";
import { useState } from "react";

export default function ChatInput({ onSend }) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 border-t border-gray-700 bg-gray-900">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-1 px-4 py-2 rounded-full bg-gray-800 text-white focus:outline-none"
      />
      <button
        onClick={handleSend}
        className="p-2 bg-blue-600 rounded-full hover:bg-blue-700"
      >
        <FaPaperPlane className="text-white" />
      </button>
    </div>
  );
}
