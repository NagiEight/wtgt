export default function ChatPanel({ messages = [], members = {} }) {
  const currentUser = JSON.parse(localStorage.getItem("userProfile") || "{}");
  return (
    <div className="flex flex-col space-y-5">
      {messages.map((msg, idx) => {
        const member = members[msg.Sender] || {};
        const isCurrentUser = member.UserName === currentUser.username;

        return (
          <div
            key={idx}
            className={`flex items-end ${
              isCurrentUser ? "justify-end" : "justify-start"
            }`}
          >
            {!isCurrentUser && (
              <img
                src={
                  member.Avt ||
                  "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
                }
                alt={member.UserName}
                className="w-8 h-8 rounded-full mr-2"
              />
            )}
            <div
              className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                isCurrentUser
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-gray-800 text-white rounded-bl-none"
              }`}
            >
              {!isCurrentUser && (
                <p className="text-xs text-gray-300 mb-1">{member.UserName}</p>
              )}
              <p>{msg.Text}</p>
              <span className="text-xs text-gray-300 block text-right mt-1">
                {(() => {
                  // Expecting format: "23:07:40 24/10/2025"
                  const ts = msg.Timestamp;
                  if (typeof ts === "string") {
                    const match = ts.match(
                      /^(\d{2}:\d{2}:\d{2}) (\d{2})\/(\d{2})\/(\d{4})$/
                    );
                    if (match) {
                      // const [_, time, day, month, year] = match;
                      return match[1]; // Just show HH:mm:ss
                    }
                  }
                  return ts || "";
                })()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
