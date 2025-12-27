/**
 * API Module Exports
 * Central point for all WebSocket communication utilities
 */

// Types
export type { ServerMessage, ServerMessageType, ClientRequest, ClientRequestType } from './types'
export type {
  HostContent,
  HostResponse,
  JoinContent,
  JoinResponse,
  LeaveContent,
  LeaveResponse,
  SendMessageContent,
  MessageReceivedContent,
  UploadContent,
  UploadResponse,
  PauseContent,
  SyncContent,
  PlaybackStateChangedContent,
  ElectionContent,
  DemotionContent,
  MemberJoinedContent,
  MemberLeftContent,
  AdminLoginContent,
  AdminLoginResponse,
  AdminLogoutContent,
  ErrorContent,
  ConnectionContent,
  InfoContent,
} from './types'

// WebSocket Client
export { WebSocketClient, getWebSocketClient, createWebSocketClient } from './WebSocketClient'

// Hooks
export { useWebSocket } from './useWebSocket'
export { useWebSocketContext, useWebSocketMessage, useWebSocketMessages } from './WebSocketContext'

// Context Provider
export { WebSocketProvider } from './WebSocketContext'
export type { WebSocketProviderProps } from './WebSocketContext'
