# Quick Reference: Updating Room.tsx to Use WebSocket API

## Before
- Placeholder components
- Hardcoded demo data
- No server connection

## After
- Real-time video playback control
- Live chat messaging
- Media uploading
- Member management
- Full server synchronization

---

## STEP 1: Import the API

```typescript
import { useWebSocketContext, useWebSocketMessage } from '../api'
import type {
  MessageReceivedContent,
  PlaybackStateChangedContent,
  JoinResponse,
  MemberJoinedContent,
  MemberLeftContent,
} from '../api'
```

---

## STEP 2: Replace Initial State

### OLD (Remove):
```typescript
const [messages, setMessages] = useState<Message[]>([...])
const [messageInput, setMessageInput] = useState('')
```

### NEW:
```typescript
const { client, isConnected, connect } = useWebSocketContext()
const [messages, setMessages] = useState<ChatMessage[]>([])
const [messageInput, setMessageInput] = useState('')
const [members, setMembers] = useState<RoomMember[]>([])
const [currentMedia, setCurrentMedia] = useState('')
const [isPaused, setIsPaused] = useState(false)
```

---

## STEP 3: Connect to Server

```typescript
useEffect(() => {
  if (!isConnected && client) {
    const username = localStorage.getItem('username') || 'Anonymous'
    const avatar = localStorage.getItem('avatar') || '😊'
    connect(username, avatar)
  }
}, [isConnected, client, connect])
```

---

## STEP 4: Join Room When Connected

```typescript
useEffect(() => {
  if (isConnected && client) {
    client.joinRoom(roomId)
  }
}, [isConnected, client, roomId])
```

---

## STEP 5: Subscribe to Server Events

```typescript
// Handle room data (on join)
useWebSocketMessage<JoinResponse>('roomData', (content) => {
  setCurrentMedia(content.currentMedia)
  setIsPaused(content.isPaused)
  setMembers(content.members.map((m) => ({...})))
})

// Handle incoming messages
useWebSocketMessage<MessageReceivedContent>('messageReceived', (content) => {
  setMessages((prev) => [...prev, {...}])
})

// Handle playback changes
useWebSocketMessage<PlaybackStateChangedContent>('playbackStateChanged', (content) => {
  setIsPaused(content.isPaused)
})

// Handle member joined
useWebSocketMessage<MemberJoinedContent>('memberJoined', (content) => {
  setMembers((prev) => [...prev, {...}])
})

// Handle member left
useWebSocketMessage<MemberLeftContent>('memberLeft', (content) => {
  setMembers((prev) => prev.filter((m) => m.id !== content.memberId))
})
```

---

## STEP 6: Update Button Handlers

```typescript
const handlePlayPause = () => {
  if (client) {
    client.pausePlayback(roomId, !isPaused)
  }
}

const handleUploadMedia = (mediaName: string) => {
  if (client) {
    client.uploadMedia(roomId, mediaName)
  }
}

const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  if (messageInput.trim() && client) {
    client.sendMessage(roomId, messageInput)
    setMessageInput('')
  }
}
```

---

## STEP 7: Update JSX Elements

### Video Player
**OLD:** Hardcoded placeholder  
**NEW:** Shows current media name
```typescript
<p className="text-sm text-content-secondary">
  {currentMedia || 'Waiting for media...'}
</p>
```

### Controls
```typescript
<button onClick={handlePlayPause} className="...">
  {isPaused ? '▶ Play' : '⏸ Pause'}
</button>

<button onClick={() => handleUploadMedia('new-media.mp4')} className="...">
  ⬆ Upload Media
</button>
```

### Room Info Stats
```typescript
<p className="text-2xl font-bold">{members.length}</p>
<p className="text-2xl font-bold">
  {members.filter((m) => m.role === 'moderator').length}
</p>
```

### Messages
```typescript
{messages.length === 0 ? (
  <p>No messages yet...</p>
) : (
  messages.map((msg) => (
    <div key={msg.id}>
      <span>{msg.sender.avatar}</span>
      <span>{msg.sender.username}</span>
      <span>{msg.timestamp.toLocaleTimeString()}</span>
      <p>{msg.text}</p>
    </div>
  ))
)}
```

### Message Input
```typescript
<input
  disabled={!isConnected}
  placeholder="Type a message..."
/>
<button
  type="submit"
  disabled={!isConnected || !messageInput.trim()}
>
  Send
</button>
```

---

## STEP 8: Add TypeScript Types

```typescript
interface RoomMember {
  id: string
  username: string
  avatar: string
  role: 'member' | 'moderator' | 'host'
}

interface ChatMessage {
  id: string
  sender: {
    id: string
    username: string
    avatar: string
  }
  text: string
  timestamp: Date
}
```

---

## Result: Fully Functional Room Component

✅ Real-time chat messaging  
✅ Play/pause synchronization  
✅ Media uploading  
✅ Live member list  
✅ Message history  
✅ Connection status handling  
✅ Full error handling  
✅ Type safety with TypeScript  
✅ Responsive design with CSS variables  

---

## See Also
- `INTEGRATION_EXAMPLE.tsx` - Complete working implementation
- `README.md` - Full API documentation
