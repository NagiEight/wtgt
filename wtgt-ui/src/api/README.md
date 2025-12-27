# API Module - WebSocket Communication

Complete TypeScript implementation for WebSocket communication between the React UI and Node.js server.

## 📁 File Structure

```
src/api/
├── index.ts                      # Central exports
├── types.ts                      # TypeScript interfaces for all messages
├── WebSocketClient.ts            # Low-level WebSocket client class
├── useWebSocket.ts               # React hook for WebSocket
├── WebSocketContext.tsx          # React Context provider
└── README.md                     # This file
```

## 🚀 Quick Start

### Setup (in App.tsx or main layout)

```tsx
import { WebSocketProvider } from "./api";

export default function App() {
  return (
    <WebSocketProvider url="ws://localhost:3000">
      {/* Your app components */}
    </WebSocketProvider>
  );
}
```

### Use in Components

**Option 1: Using Context Hook**

```tsx
import { useWebSocketContext, useWebSocketMessage } from "./api";

export function RoomComponent() {
  const { client, isConnected, connect, disconnect } = useWebSocketContext();

  // Handle incoming messages
  useWebSocketMessage("messageReceived", (content) => {
    console.log("New message:", content);
  });

  const handleConnect = async () => {
    await connect("Alice", "👩");
  };

  const handleSendMessage = () => {
    client?.sendMessage("room-123", "Hello!");
  };

  return (
    <div>
      <p>Connected: {isConnected ? "Yes" : "No"}</p>
      <button onClick={handleConnect}>Connect</button>
      <button onClick={handleSendMessage}>Send Message</button>
    </div>
  );
}
```

**Option 2: Using useWebSocket Hook**

```tsx
import { useWebSocket } from "./api";

export function RoomComponent() {
  const { isConnected, connect, sendMessage, joinRoom, on } = useWebSocket();

  // Subscribe to messages
  useEffect(() => {
    return on("messageReceived", (content) => {
      console.log("New message:", content);
    });
  }, [on]);

  return (
    <div>
      <button onClick={() => connect("Alice", "👩")}>Connect</button>
      <button onClick={() => joinRoom("room-123")}>Join Room</button>
    </div>
  );
}
```

## 📡 API Methods

### Connection

```typescript
// Connect to server
await connect(username: string, avatar?: string, userId?: string)

// Disconnect from server
disconnect()

// Check connection status
isConnected: boolean

// Get current user info
getUserInfo(): { userId, username, avatar }
```

### Room Operations

```typescript
// Host a new room
hostRoom(mediaName: string, roomType: 'private' | 'public', isPaused?: boolean)

// Join an existing room
joinRoom(roomId: string)

// Leave current room
leaveRoom(roomId: string)
```

### Message Operations

```typescript
// Send a message to current room
sendMessage(roomId: string, text: string)

// Subscribe to incoming messages
on('messageReceived', (content: MessageReceivedContent) => {})
```

### Media Operations

```typescript
// Upload new media to room
uploadMedia(roomId: string, mediaName: string, mediaUrl?: string)

// Pause/resume playback
pausePlayback(roomId: string, isPaused: boolean, currentTime?: number)

// Sync playback state
syncPlayback(roomId: string)

// Subscribe to playback changes
on('playbackStateChanged', (content: PlaybackStateChangedContent) => {})
```

### Member Management

```typescript
// Elect a member as moderator
electModerator(roomId: string, memberId: string)

// Demote a moderator
demoteModerator(roomId: string, memberId: string)

// Subscribe to member changes
on('memberJoined', (content: MemberJoinedContent) => {})
on('memberLeft', (content: MemberLeftContent) => {})
on('modElected', (content) => {})
on('modDemoted', (content) => {})
```

### Admin Operations

```typescript
// Login as admin
adminLogin(password: string)

// Logout as admin
adminLogout()

// Shutdown server (admin only)
shutdownServer()

// Subscribe to admin responses
on('adminLogin', (content: AdminLoginResponse) => {})
```

## 📨 Message Types

All server message types and client request types are defined in `types.ts`:

### Server Messages (Incoming)

- `info` - Server info message
- `error` - Error from server
- `success` - Success confirmation
- `connection` - User connected
- `disconnection` - User disconnected
- `roomData` - Room data
- `memberJoined` - New member joined room
- `memberLeft` - Member left room
- `messageReceived` - New chat message
- `mediaUpdated` - Media changed
- `playbackStateChanged` - Play/pause state changed
- `modElected` - Member elected as mod
- `modDemoted` - Member demoted from mod

### Client Requests (Outgoing)

- `host` - Create new room
- `join` - Join existing room
- `leave` - Leave room
- `sendMessage` - Send chat message
- `upload` - Upload new media
- `pause` - Pause/resume playback
- `sync` - Sync playback state
- `election` - Elect moderator
- `demotion` - Demote moderator
- `adminLogin` - Login as admin
- `adminLogout` - Logout as admin
- `serverShutdown` - Shutdown server

## 🎯 Complete Example: Room Component

```tsx
import { useEffect, useState } from "react";
import { useWebSocketContext, useWebSocketMessage } from "../api";
import type {
  MessageReceivedContent,
  PlaybackStateChangedContent,
} from "../api";

export function Room() {
  const { client, isConnected, connect } = useWebSocketContext();
  const [messages, setMessages] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [roomId] = useState("room-123");

  // Subscribe to incoming messages
  useWebSocketMessage<MessageReceivedContent>("messageReceived", (content) => {
    setMessages((prev) => [
      ...prev,
      {
        id: content.messageId,
        sender: {
          id: content.senderId,
          username: content.senderUsername,
          avatar: content.senderAvatar,
        },
        text: content.text,
        timestamp: new Date(content.timestamp),
      },
    ]);
  });

  // Subscribe to playback changes
  useWebSocketMessage<PlaybackStateChangedContent>(
    "playbackStateChanged",
    (content) => {
      setIsPaused(content.isPaused);
    }
  );

  // Initialize connection
  useEffect(() => {
    if (!isConnected) {
      connect("Alice", "👩");
    }
  }, [isConnected, connect]);

  // Join room on mount
  useEffect(() => {
    if (isConnected && client) {
      client.joinRoom(roomId);
    }
  }, [isConnected, client, roomId]);

  const handleSendMessage = (text: string) => {
    client?.sendMessage(roomId, text);
  };

  const handlePlayPause = () => {
    client?.pausePlayback(roomId, !isPaused);
  };

  const handleUpload = (mediaName: string) => {
    client?.uploadMedia(roomId, mediaName);
  };

  return (
    <div>
      {/* Video Player */}
      <div className="player-container">
        <button onClick={handlePlayPause}>
          {isPaused ? "▶ Play" : "⏸ Pause"}
        </button>
        <button onClick={() => handleUpload("new-media.mp4")}>
          ⬆ Upload Media
        </button>
      </div>

      {/* Messages */}
      <div className="chat">
        {messages.map((msg) => (
          <div key={msg.id}>
            <strong>{msg.sender.username}</strong>: {msg.text}
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector("input");
          if (input) {
            handleSendMessage(input.value);
            input.value = "";
          }
        }}
      >
        <input type="text" placeholder="Send a message..." />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

## 🔄 Event Subscription Example

```tsx
import { useEffect } from "react";
import { useWebSocketContext } from "../api";

export function ChatDebugger() {
  const { client } = useWebSocketContext();

  useEffect(() => {
    if (!client) return;

    // Subscribe to all message types
    const unsubscribe1 = client.on("messageReceived", (content) => {
      console.log("💬 Message:", content);
    });

    const unsubscribe2 = client.on("playbackStateChanged", (content) => {
      console.log("⏸️  Playback:", content);
    });

    const unsubscribe3 = client.on("memberJoined", (content) => {
      console.log("👤 Member joined:", content);
    });

    const unsubscribe4 = client.onMessage((message) => {
      console.log("📨 Raw message:", message);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
    };
  }, [client]);

  return <div>Check console for messages</div>;
}
```

## 🛠️ Advanced Usage

### Custom Message Handler

```tsx
function MyComponent() {
  const { client } = useWebSocketContext();

  useEffect(() => {
    if (!client) return;

    // Handle all incoming messages
    return client.onMessage((message) => {
      console.log(`Got ${message.type}:`, message.content);

      // Custom logic based on message type
      switch (message.type) {
        case "messageReceived":
          // Handle message
          break;
        case "error":
          // Handle error
          break;
        // ... other types
      }
    });
  }, [client]);
}
```

### Error Handling

```tsx
function MyComponent() {
  const { client, error } = useWebSocketContext();

  useEffect(() => {
    if (!client) return;

    return client.onError((error) => {
      console.error("WebSocket error:", error.message);
      // Show error to user
    });
  }, [client]);

  if (error) {
    return <div className="error">Connection error: {error.message}</div>;
  }
}
```

### Connection/Disconnection Events

```tsx
function ConnectionStatus() {
  const { client, isConnected } = useWebSocketContext();

  useEffect(() => {
    if (!client) return;

    const unsubscribeConnect = client.onConnect(() => {
      console.log("✅ Connected to server");
    });

    const unsubscribeDisconnect = client.onDisconnect(() => {
      console.log("🔌 Disconnected from server");
    });

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, [client]);

  return <div>Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</div>;
}
```

## 📝 Type Safety

All messages and API calls are fully typed. TypeScript will help you catch errors:

```tsx
// ✅ Correct
client?.sendMessage("room-123", "Hello");

// ❌ TypeScript error - missing roomId
client?.sendMessage("Hello");

// ✅ Typed message handler
useWebSocketMessage<MessageReceivedContent>("messageReceived", (content) => {
  console.log(content.senderUsername); // ✅ Property exists
  console.log(content.typo); // ❌ TypeScript error
});
```

## 🔌 Server Configuration

The client expects the server to be running on:

- **Default**: `ws://localhost:3000`
- **Custom**: Pass `url` prop to `WebSocketProvider`

```tsx
<WebSocketProvider url="ws://192.168.1.100:3000">
  <App />
</WebSocketProvider>
```

## 🎓 Architecture

```
┌─────────────────────────────────────────┐
│         React Components                 │
│   (Room, Chat, Settings, etc.)          │
└────────────────┬────────────────────────┘
                 │
         useWebSocketContext
         useWebSocketMessage
         useWebSocket (hook)
                 │
┌────────────────▼────────────────────────┐
│       WebSocketContext (Provider)        │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│       WebSocketClient (Class)            │
│  • connect/disconnect                    │
│  • hostRoom/joinRoom/leaveRoom          │
│  • sendMessage                          │
│  • uploadMedia/pausePlayback            │
│  • electModerator/demoteModerator       │
│  • Event subscriptions                  │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│    Native WebSocket (Browser)            │
└────────────────┬────────────────────────┘
                 │
        ws://server:3000
                 │
┌────────────────▼────────────────────────┐
│    Node.js WebSocket Server              │
│  (wtgt-server)                          │
└─────────────────────────────────────────┘
```

## 📚 See Also

- `types.ts` - Complete message type definitions
- `WebSocketClient.ts` - Low-level implementation
- Server: `wtgt-server/cmpl/server.js`

---

**Status**: ✅ Ready to integrate with Room, Dashboard, and other components
