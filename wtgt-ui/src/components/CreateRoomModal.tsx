import { useState } from 'react'
import type { RoomType } from '../types'

interface CreateRoomModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateRoom: (roomData: {
    name: string
    type: RoomType
    mediaName: string
  }) => void
}

export const CreateRoomModal = ({
  isOpen,
  onClose,
  onCreateRoom,
}: CreateRoomModalProps) => {
  const [roomName, setRoomName] = useState('')
  const [roomType, setRoomType] = useState<RoomType>('public')
  const [mediaName, setMediaName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!roomName.trim()) {
      newErrors.roomName = 'Room name is required'
    }
    if (roomName.length > 50) {
      newErrors.roomName = 'Room name must be 50 characters or less'
    }

    if (!mediaName.trim()) {
      newErrors.mediaName = 'Media name is required'
    }
    if (mediaName.length > 100) {
      newErrors.mediaName = 'Media name must be 100 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (validateForm()) {
      onCreateRoom({
        name: roomName.trim(),
        type: roomType,
        mediaName: mediaName.trim(),
      })

      // Reset form
      setRoomName('')
      setRoomType('public')
      setMediaName('')
      setErrors({})
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-2xl p-6 animate-slide-up card border-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Create New Room</h2>
          <button
            onClick={onClose}
            className="text-2xl hover:opacity-70 transition-opacity text-primary"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Room Name</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g., Movie Night"
              maxLength={50}
              className={`w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary bg-app text-content placeholder-content-secondary ${
                errors.roomName ? 'border-error' : 'border-default'
              }`}
            />
            {errors.roomName && (
              <p className="text-sm mt-1 text-error">
                {errors.roomName}
              </p>
            )}
            <p className="text-xs mt-1 text-content-secondary">
              {roomName.length}/50
            </p>
          </div>

          {/* Media Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Media Name
            </label>
            <input
              type="text"
              value={mediaName}
              onChange={(e) => setMediaName(e.target.value)}
              placeholder="e.g., Inception, Breaking Bad - S01E01"
              maxLength={100}
              className={`w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary bg-app text-content placeholder-content-secondary ${
                errors.mediaName ? 'border-error' : 'border-default'
              }`}
            />
            {errors.mediaName && (
              <p className="text-sm mt-1 text-error">
                {errors.mediaName}
              </p>
            )}
            <p className="text-xs mt-1 text-content-secondary">
              {mediaName.length}/100
            </p>
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Room Type</label>
            <div className="grid grid-cols-2 gap-3">
              {(['public', 'private'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRoomType(type)}
                  className={`p-3 rounded-lg border-2 transition-all font-medium capitalize ${
                    roomType === type
                      ? 'border-primary bg-app text-primary'
                      : 'border-default bg-surface hover:bg-hover'
                  }`}
                >
                  {type === 'public' ? '🌐' : '🔒'} {type}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2 text-content-secondary">
              {roomType === 'public'
                ? 'Anyone can join this room'
                : 'Only invited users can join'}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg font-semibold transition-colors btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg font-semibold transition-colors btn-primary"
            >
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
