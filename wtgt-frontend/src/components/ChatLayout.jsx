import ChatPanel from "./ChatPanel";
import ChatInput from "./ChatInput";

export default function ChatLayout() {
  const handleSendMessage = (msg) => {
    console.log("New message:", msg);
    // Add logic to update chat state
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <div className="flex-1 overflow-y-auto p-4">
        <ChatPanel />
      </div>
      <ChatInput onSend={(msg) => console.log(msg)} />
    </div>
  );
}
