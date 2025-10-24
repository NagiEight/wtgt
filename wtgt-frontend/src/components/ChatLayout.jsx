import { useEffect, useState, useRef } from "react";
import ChatPanel from "./ChatPanel";
import ChatInput from "./ChatInput";
import { sendChatMessage, subscribe } from "../utils/socket";

export default function ChatLayout() {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState({});
  const [roomInfo, setRoomInfo] = useState(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    // Subscribe to room info updates
    const unsubRoom = subscribe("join", (roomData) => {
      setRoomInfo(roomData);
      if (roomData.messages) {
        setMessages(Object.values(roomData.messages));
      }
    });

    // Subscribe to new messages
    const unsubMessage = subscribe("message", (messageData) => {
      setMessages((prev) => [
        ...prev,
        {
          Sender: messageData.Sender,
          Text: messageData.Text,
          Timestamp: messageData.Timestamp || new Date().toISOString(),
        },
      ]);
    });

    // Subscribe to member updates
    const unsubMembers = subscribe("members", (memberList) => {
      setMembers(memberList);
    });

    return () => {
      unsubRoom();
      unsubMessage();
      unsubMembers();
    };
  }, []);

  const handleSendMessage = (text) => {
    if (!text.trim()) return;
    sendChatMessage(text);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      {roomInfo && (
        <div className="p-4 border-b border-gray-700 bg-gray-800">
          <h2 className="text-lg font-semibold">Room: {roomInfo.roomID}</h2>
          <p className="text-sm text-gray-400">
            {Object.keys(members).length} members online
          </p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4" ref={chatContainerRef}>
        <ChatPanel messages={messages} members={members} />
      </div>
      <ChatInput onSend={handleSendMessage} />
    </div>
  );
}
