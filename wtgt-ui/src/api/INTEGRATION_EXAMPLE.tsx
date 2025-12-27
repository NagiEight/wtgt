/**
 * Integration Guide - Room Component with API
 * 
 * This file shows how to integrate the WebSocket API into the Room component
 * to enable playing, pausing, uploading, and sending messages.
 */

import { useEffect, useState } from 'react'
import { useWebSocketContext, useWebSocketMessage } from '../api'
import type {
  MessageReceivedContent,
  PlaybackStateChangedContent,
  JoinResponse,
  MemberJoinedContent,
  MemberLeftContent,
} from '../api'

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

/**
 * INTEGRATION EXAMPLE: Room Component
 * 
 * Key features:
 * 1. Connect to server on mount
 * 2. Join room when connection established
 * 3. Send/receive messages in real-time
 * 4. Play/pause media synchronized across room
 * 5. Upload new media
 * 6. Handle member join/leave events
 */
export function RoomIntegration() {
  // ========== WebSocket Connection ==========
  const { client, isConnected, connect } = useWebSocketContext()

  // ========== Room State ==========
  const [roomId] = useState('room-123') // From URL params in real app
  const [members, setMembers] = useState<RoomMember[]>([])
  const [currentMedia, setCurrentMedia] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)

  // ========== Connect to Server ==========
  useEffect(() => {
    if (!isConnected && client) {
      // Get user info from localStorage or props
      const username = localStorage.getItem('username') || 'Anonymous'
      const avatar = localStorage.getItem('avatar') || '😊'
      
      connect(username, avatar)
        .catch((err) => console.error('Failed to connect:', err))
    }
  }, [isConnected, client, connect])

  // ========== Join Room When Connected ==========
  useEffect(() => {
    if (isConnected && client) {
      client.joinRoom(roomId)
    }
  }, [isConnected, client, roomId])

  // ========== Handle Room Data on Join ==========
  useWebSocketMessage<JoinResponse>('roomData', (content) => {
    console.log('📌 Joined room:', content)
    
    // Update current media
    setCurrentMedia(content.currentMedia)
    setIsPaused(content.isPaused)

    // Update members list
    const joinedMembers: RoomMember[] = content.members.map((member) => ({
      id: member.id,
      username: member.username,
      avatar: member.avatar || '😊',
      role: content.host.id === member.id ? 'host' : 
            content.moderators.includes(member.id) ? 'moderator' : 'member',
    }))
    setMembers(joinedMembers)

    // Load existing messages
    const existingMessages: ChatMessage[] = content.messages.map((msg) => ({
      id: msg.id,
      sender: {
        id: msg.senderId,
        username: msg.senderUsername,
        avatar: '😊', // Could add to message if available
      },
      text: msg.text,
      timestamp: new Date(msg.timestamp),
    }))
    setMessages(existingMessages)
  })

  // ========== Handle Incoming Messages ==========
  useWebSocketMessage<MessageReceivedContent>('messageReceived', (content) => {
    console.log('💬 New message:', content)
    
    const newMessage: ChatMessage = {
      id: content.messageId,
      sender: {
        id: content.senderId,
        username: content.senderUsername,
        avatar: content.senderAvatar || '😊',
      },
      text: content.text,
      timestamp: new Date(content.timestamp),
    }

    setMessages((prev) => [...prev, newMessage])
  })

  // ========== Handle Playback State Changes ==========
  useWebSocketMessage<PlaybackStateChangedContent>(
    'playbackStateChanged',
    (content) => {
      console.log('⏸️  Playback changed:', content)
      setIsPaused(content.isPaused)
      // TODO: Seek video to currentTime if available
    }
  )

  // ========== Handle Member Joined ==========
  useWebSocketMessage<MemberJoinedContent>('memberJoined', (content) => {
    console.log('👤 Member joined:', content)
    
    setMembers((prev) => [
      ...prev,
      {
        id: content.memberId,
        username: content.memberUsername,
        avatar: content.memberAvatar || '😊',
        role: 'member',
      },
    ])
  })

  // ========== Handle Member Left ==========
  useWebSocketMessage<MemberLeftContent>('memberLeft', (content) => {
    console.log('👤 Member left:', content)
    setMembers((prev) => prev.filter((m) => m.id !== content.memberId))
  })

  // ========== Send Message Handler ==========
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!messageInput.trim() || !client) return

    client.sendMessage(roomId, messageInput)
    setMessageInput('')
  }

  // ========== Play/Pause Handler ==========
  const handlePlayPause = () => {
    if (!client) return
    client.pausePlayback(roomId, !isPaused)
  }

  // ========== Upload Media Handler ==========
  const handleUploadMedia = async (mediaName: string, mediaUrl?: string) => {
    if (!client) return

    setUploadLoading(true)
    try {
      client.uploadMedia(roomId, mediaName, mediaUrl)
      
      // Wait for upload response
      // TODO: Add upload confirmation from server
      
      setCurrentMedia(mediaName)
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploadLoading(false)
    }
  }

  // ========== Render Component ==========
  return (
    <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* ===== VIDEO PLAYER SECTION ===== */}
      <div className="col-span-2 space-y-4">
        {/* Video Player */}
        <div className="rounded-xl overflow-hidden border border-default card">
          <div className="aspect-video flex items-center justify-center bg-surface">
            <div className="text-center">
              <p className="text-4xl mb-4">🎬</p>
              <p className="text-lg font-semibold">Now Playing:</p>
              <p className="text-sm text-content-secondary">{currentMedia || 'Waiting for media...'}</p>
            </div>
          </div>
        </div>

        {/* Media Controls */}
        <div className="p-4 rounded-xl border border-default card">
          <div className="flex gap-4">
            <button
              onClick={handlePlayPause}
              className="flex-1 py-2 rounded-lg font-semibold transition-colors btn-secondary"
              disabled={!currentMedia}
            >
              {isPaused ? '▶ Play' : '⏸ Pause'}
            </button>

            <button
              onClick={() => handleUploadMedia('example.mp4')}
              className="flex-1 py-2 rounded-lg font-semibold transition-colors btn-secondary"
              disabled={uploadLoading}
            >
              {uploadLoading ? '⏳ Uploading...' : '⬆ Upload Media'}
            </button>

            <button
              onClick={() => client?.syncPlayback(roomId)}
              className="flex-1 py-2 rounded-lg font-semibold transition-colors btn-secondary"
            >
              🔄 Sync
            </button>
          </div>
        </div>

        {/* Room Info Stats */}
        <div className="p-4 rounded-xl border border-default card grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm opacity-75">Members</p>
            <p className="text-2xl font-bold">{members.length}</p>
          </div>
          <div>
            <p className="text-sm opacity-75">Moderators</p>
            <p className="text-2xl font-bold">
              {members.filter((m) => m.role === 'moderator').length}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-75">Messages</p>
            <p className="text-2xl font-bold">{messages.length}</p>
          </div>
        </div>

        {/* Members List */}
        <div className="p-4 rounded-xl border border-default card">
          <h3 className="font-bold mb-3">Room Members ({members.length})</h3>
          <div className="space-y-2 max-h-[150px] overflow-y-auto">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-2 p-2 bg-surface rounded">
                <span className="text-lg">{member.avatar}</span>
                <span className="flex-1">{member.username}</span>
                <span className="text-xs px-2 py-1 rounded bg-primary text-white">
                  {member.role === 'host' ? '👑 Host' : member.role === 'moderator' ? '🛡️ Mod' : '👤 Member'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== CHAT SIDEBAR ===== */}
      <div className="rounded-xl border border-default card flex flex-col">
        <div className="p-4 border-b border-default">
          <h2 className="font-bold">💬 Chat</h2>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-content-secondary text-center py-8">
              No messages yet...
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{msg.sender.avatar}</span>
                  <span className="font-semibold text-sm">{msg.sender.username}</span>
                  <span className="text-xs text-content-secondary">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm break-words pl-6">{msg.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-default">
          <div className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 rounded-lg border border-default bg-app text-content placeholder-content-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={!isConnected}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg font-semibold transition-colors btn-primary disabled:opacity-50"
              disabled={!isConnected || !messageInput.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RoomIntegration
