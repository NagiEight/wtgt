import { useEffect, useState } from "react";
import ChatPanel from "./ChatPanel";
import ChatInput from "./ChatInput";
import { sendChatMessage, subscribe } from "../utils/socket";

export default function ChatLayout() {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState({});

  useEffect(() => {
    // Subscribe to new messages
    const unsubMessage = subscribe("message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Subscribe to member updates
    const unsubMembers = subscribe("members", (memberList) => {
      setMembers(memberList);
    });

    return () => {
      unsubMessage();
      unsubMembers();
    };
  }, []);

  const handleSendMessage = (text) => {
    if (!text.trim()) return;
    sendChatMessage(text);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <div className="flex-1 overflow-y-auto p-4">
        <ChatPanel messages={messages} members={members} />
      </div>
      <ChatInput onSend={handleSendMessage} />
    </div>
  );
}
