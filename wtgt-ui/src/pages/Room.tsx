import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import type { Message, RoomMember } from "../types";
import { useWebSocketContext, useWebSocketMessage, useWebSocket } from "../api";
import type {
  MessageReceivedContent,
  PlaybackStateChangedContent,
  MemberLeftContent,
} from "../api";
import type { init, join, message } from "../api/types";

export const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { client, isConnected, connect } = useWebSocketContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [currentMedia, setCurrentMedia] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [members, setMembers] = useState<RoomMember[]>([]);

  const { uploadMedia } = useWebSocket();

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (messageInput.trim() && client) {
      client.sendMessage(messageInput);
      setMessageInput("");

      const content = {
        MessageID: "temp-id-" + Date.now(),
        Sender: "current-user",
        Text: messageInput,
        Timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [
        parseMessagesFromMessageRequest({ type: "message", content }),
        ...prev,
      ]);
    }
  };
  useEffect(() => {
    if (!isConnected && client) {
      const username = localStorage.getItem("username") || "Anonymous";
      const avatar = localStorage.getItem("avatar") || "😊";
      connect(username, avatar);
    }
  }, [isConnected, client, connect]);

  useEffect(() => {
    const joinRoom = async () => {
      if (!isConnected) {
        await connect("Anonymous", "😊");
      }
      if (isConnected && client && roomId) {
        client.joinRoom(roomId);
      }
    };
    joinRoom();
  }, [isConnected, client, roomId, connect]);

  useEffect(() => {
    return () => {
      setMessages([]);
    };
  }, [roomId]);

  function parseMembersFromInitRequest(init: init): RoomMember[] {
    const { Members, Host, Mods } = init.content;

    return Object.entries(Members).map(([id, { UserName, Avt }]) => {
      let role: RoomMember["role"] = "member";

      if (id === Host) {
        role = "host";
      } else if (Mods.includes(id)) {
        role = "moderator";
      }

      return {
        id,
        username: UserName,
        avatar: Avt,
        role,
      };
    });
  }

  function parseMessagesFromMessageRequest(message: message): Message {
    const { MessageID, Sender, Text, Timestamp } = message.content;
    return {
      id: MessageID,
      sender: Sender,
      text: Text,
      timestamp: Timestamp,
    };
  }

  function parseMessagesFromMessageReceivedContent(
    message: MessageReceivedContent
  ): Message {
    const { messageId, text, timestamp, sender } = message;
    return {
      id: messageId,
      sender: sender,
      text: text,
      timestamp: timestamp,
    };
  }

  function parseMembersFromJoinRequest(
    join: join,
    members: RoomMember[]
  ): RoomMember[] {
    console.log("Parsing join request:", join);
    const { UserID, UserName, Avt } = join.content;

    // Build a quick lookup for roles
    const hostId = members.find((m) => m.role === "host")?.id;
    const modIds = members
      .filter((m) => m.role === "moderator")
      .map((m) => m.id);

    let role: RoomMember["role"] = "member";
    if (UserID === hostId) {
      role = "host";
    } else if (modIds.includes(UserID)) {
      role = "moderator";
    }

    return [
      {
        id: UserID,
        username: UserName,
        avatar: Avt,
        role,
      },
    ];
  }

  useWebSocketMessage<init>("init", (content) => {
    setCurrentMedia(content.content.CurrentMedia);
    setIsPaused(content.content.IsPaused);
    setMembers(parseMembersFromInitRequest(content));
  });

  // Handle incoming messages
  useWebSocketMessage<MessageReceivedContent>("message", (content) => {
    setMessages((prev) => [
      ...prev,
      parseMessagesFromMessageReceivedContent(content),
    ]);
  });

  // Handle playback changes
  useWebSocketMessage<PlaybackStateChangedContent>("pause", (content) => {
    setIsPaused(content.isPaused);
  });

  // Handle member joined
  useWebSocketMessage<join>("join", (content) => {
    setMembers((prev) => [
      ...prev,
      parseMembersFromJoinRequest(content, prev)[0],
    ]);
  });

  // Handle member left
  useWebSocketMessage<MemberLeftContent>("leave", (content) => {
    setMembers((prev) => prev.filter((m) => m.id !== content.memberId));
  });
  function handlePlayPause(event: React.MouseEvent<HTMLButtonElement>): void {
    setIsPaused((prev) => !prev);
  }

  function handleUploadMedia(arg0: string): void {
    if (roomId === undefined || !uploadMedia) return;
    setCurrentMedia(arg0);
    uploadMedia(roomId);
  }

  return (
    <Layout title={`Room: ${roomId}`}>
      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Video Player */}
        <div className="col-span-2 space-y-4">
          <div className="rounded-xl overflow-hidden border border-default card">
            <div className="aspect-video flex items-center justify-center bg-surface">
              <div className="text-center">
                <p className="text-4xl mb-4">🎬</p>
                <p className="text-lg font-semibold">Video Player</p>
                <p className="text-sm mt-2 text-content-secondary">
                  {currentMedia || "Waiting for media..."}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 rounded-xl border border-default card">
            <div className="flex gap-4">
              <button
                onClick={handlePlayPause}
                className="flex-1 py-2 rounded-lg font-semibold transition-colors btn-secondary"
              >
                {isPaused ? "▶ Play" : "⏸ Pause"}
              </button>
              <button
                onClick={() => handleUploadMedia("new-media.mp4")}
                className="flex-1 py-2 rounded-lg font-semibold transition-colors btn-secondary"
              >
                ⬆ Upload Media
              </button>
            </div>
          </div>

          {/* Room Info */}
          <div className="p-4 rounded-xl border border-default card grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm opacity-75">Members</p>
              <p className="text-2xl font-bold">{members.length}</p>
            </div>
            <div>
              <p className="text-sm opacity-75">Moderators</p>
              <p className="text-2xl font-bold">2</p>
            </div>
            <div>
              <p className="text-sm opacity-75">Messages</p>
              <p className="text-2xl font-bold">{messages.length}</p>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="rounded-xl border border-default card flex flex-col">
          <div className="p-4 border-b border-default">
            <h2 className="font-bold">Chat</h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  {/* <span>👌</span> */}
                  <span className="font-semibold text-sm">{msg.sender}</span>
                  <span className="text-xs text-content-secondary">
                    {msg.timestamp}
                  </span>
                </div>
                <p className="text-sm break-words">{msg.text}</p>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-default"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-lg border border-default bg-app text-content placeholder-content-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg font-semibold transition-colors btn-primary"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};
