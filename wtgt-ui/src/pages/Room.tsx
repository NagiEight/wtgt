import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { Layout } from '../components/Layout'
import type { Message } from '../types'

export const Room = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: {
        id: 'user-1',
        username: 'Alice',
        avatar: '👩',
      },
      text: 'This movie is amazing!',
      timestamp: new Date(Date.now() - 60000),
    },
  ])
  const [messageInput, setMessageInput] = useState('')

  const handleSendMessage = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (messageInput.trim()) {
      const newMessage: Message = {
        id: String(messages.length + 1),
        sender: {
          id: 'current-user',
          username: 'You',
          avatar: '😊',
        },
        text: messageInput,
        timestamp: new Date(),
      }
      setMessages([...messages, newMessage])
      setMessageInput('')
    }
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
                  Coming soon...
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 rounded-xl border border-default card">
            <div className="flex gap-4">
              <button className="flex-1 py-2 rounded-lg font-semibold transition-colors btn-secondary">
                ▶ Play
              </button>
              <button className="flex-1 py-2 rounded-lg font-semibold transition-colors btn-secondary">
                ⏸ Pause
              </button>
              <button className="flex-1 py-2 rounded-lg font-semibold transition-colors btn-secondary">
                ⬆ Upload Media
              </button>
            </div>
          </div>

          {/* Room Info */}
          <div className="p-4 rounded-xl border border-default card grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm opacity-75">Members</p>
              <p className="text-2xl font-bold">12</p>
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
                  <span>{msg.sender.avatar}</span>
                  <span className="font-semibold text-sm">
                    {msg.sender.username}
                  </span>
                  <span className="text-xs text-content-secondary">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm break-words">{msg.text}</p>
              </div>
            ))}
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
  )
}
