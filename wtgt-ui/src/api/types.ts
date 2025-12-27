/**
 * API Communication Types
 * Defines all WebSocket message types and server communication protocols
 */

// =============================================
// Server Message Types
// =============================================

export type ServerMessageType =
  | 'info'
  | 'init'
  | 'join'
  | 'message'
  | 'election'
  | 'demotion'
  | 'leave'
  | 'end'
  | 'pause'
  | 'sync'
  | 'upload';

  

export interface ServerMessage<T = unknown> {
  type: ServerMessageType
  content: T
  timestamp?: number
}

// =============================================
// Client Request Types
// =============================================

export type ClientRequestType =
  | 'host'
  | 'join'
  | 'leave'
  | 'sendMessage'
  | 'upload'
  | 'pause'
  | 'sync'
  | 'election'
  | 'demotion'
  | 'adminLogin'
  | 'adminLogout'
  | 'serverShutdown'

export interface ClientRequest<T = unknown> {
  type: ClientRequestType
  content: T
}

// =============================================
// Host/Room Creation
// =============================================

export interface HostContent {
  MediaName: string
  RoomType: 'private' | 'public'
  IsPaused: boolean
}

export interface HostResponse {
  roomId: string
  success: boolean
}

// =============================================
// Join Room
// =============================================

export interface JoinContent {
  roomId: string
}

export interface JoinResponse {
  roomId: string
  currentMedia: string
  isPaused: boolean
  host: {
    id: string
    username: string
    avatar?: string
  }
  members: Array<{
    id: string
    username: string
    avatar?: string
  }>
  moderators: string[]
  messages: Array<{
    id: string
    senderId: string
    senderUsername: string
    text: string
    timestamp: number
  }>
}

// =============================================
// Leave Room
// =============================================

export interface LeaveContent {
  roomId: string
}

export interface LeaveResponse {
  success: boolean
  message: string
}

// =============================================
// Messages
// =============================================

export interface SendMessageContent {
  roomId: string
  text: string
}

export interface MessageReceivedContent {
  roomId: string
  messageId: string
  senderId: string
  senderUsername: string
  senderAvatar?: string
  text: string
  timestamp: number
}

// =============================================
// Media Upload
// =============================================

export interface UploadContent {
  roomId: string
  mediaName: string
  mediaUrl?: string
}

export interface UploadResponse {
  success: boolean
  mediaName: string
}

// =============================================
// Playback Control
// =============================================

export interface PauseContent {
  roomId: string
  isPaused: boolean
  currentTime?: number
}

export interface SyncContent {
  roomId: string
}

export interface PlaybackStateChangedContent {
  roomId: string
  isPaused: boolean
  currentTime?: number
  changedBy: string
}

// =============================================
// Member Management
// =============================================

export interface ElectionContent {
  roomId: string
  memberId: string
}

export interface DemotionContent {
  roomId: string
  memberId: string
}

export interface MemberJoinedContent {
  roomId: string
  memberId: string
  memberUsername: string
  memberAvatar?: string
}

export interface MemberLeftContent {
  roomId: string
  memberId: string
}

// =============================================
// Admin
// =============================================

export interface AdminLoginContent {
  password: string
}

export interface AdminLoginResponse {
  success: boolean
  adminId: string
}

export interface AdminLogoutContent {
  // Empty
}

// =============================================
// Error Handling
// =============================================

export interface ErrorContent {
  message: string
  code?: string
  details?: unknown
}

// =============================================
// Connection/Info
// =============================================

export interface ConnectionContent {
  userId: string
  username: string
  avatar?: string
}

export interface InfoContent {
  roomId: string
}
