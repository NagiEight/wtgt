const messages = [
  {
    user: "Alice",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "Hey, have you seen the new video?",
    timestamp: "02:03",
    fromMe: false,
  },
  {
    user: "You",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    text: "Yeah! The visuals were amazing.",
    timestamp: "02:04",
    fromMe: true,
  },
  {
    user: "Alice",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "I loved the soundtrack. Totally nostalgic!",
    timestamp: "02:05",
    fromMe: false,
  },
];

export default function ChatPanel() {
  return (
    <div className="flex flex-col space-y-5">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex items-end ${
            msg.fromMe ? "justify-end" : "justify-start"
          }`}
        >
          {!msg.fromMe && (
            <img
              src={msg.avatar}
              alt={msg.user}
              className="w-8 h-8 rounded-full mr-2"
            />
          )}
          <div
            className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
              msg.fromMe
                ? "bg-blue-600 text-white rounded-br-none"
                : "bg-gray-800 text-white rounded-bl-none"
            }`}
          >
            <p>{msg.text}</p>
            <span className="text-xs text-gray-300 block text-right mt-1">
              {msg.timestamp}
            </span>
          </div>
          {msg.fromMe && (
            <img
              src={msg.avatar}
              alt={msg.user}
              className="w-8 h-8 rounded-full ml-2"
            />
          )}
        </div>
      ))}
    </div>
  );
}
