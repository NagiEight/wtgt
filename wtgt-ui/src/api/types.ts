/**
 * API Communication Types
 * Defines all WebSocket message types and server communication protocols
 */

// =============================================
// Server Message Types
// =============================================

export type ServerMessageType =
  | "info"
  | "init"
  | "join"
  | "message"
  | "election"
  | "demotion"
  | "leave"
  | "end"
  | "pause"
  | "sync"
  | "upload";

export interface ServerMessage<T = unknown> {
  type: ServerMessageType;
  content: T;
  timestamp?: number;
}

// =============================================
// Client Request Types
// =============================================

export type ClientRequestType =
  | "host"
  | "join"
  | "message"
  | "election"
  | "demotion"
  | "leave"
  | "pause"
  | "sync"
  | "upload"
  | "query"
  | "adminLogin"
  | "adminLogout"
  | "shutdown";

export interface ClientRequest<T = unknown> {
  type: ClientRequestType;
  content: T;
}

// =============================================
// Host/Room Creation
// =============================================

export interface HostContent {
  MediaName: string;
  RoomType: "private" | "public";
  IsPaused: boolean;
}

export interface HostResponse {
  roomId: string;
  success: boolean;
}

// =============================================
// Join Room
// =============================================

export interface init {
  type: "init";
  content: {
    CurrentMedia: string;
    IsPaused: boolean;
    Host: string;
    Mods: string[];
    Members: {
      [MemberID: string]: {
        UserName: string;
        Avt: string;
      };
    };
    Messages: {
      [MessageID: string]: {
        Sender: string;
        Text: string;
        Timestamp: string;
      };
    };
  };
}

export interface JoinContent {
  RoomID: string;
}

export interface message {
  type: "message";
  content: {
    MessageID: string;
    Sender: string;
    Text: string;
    Timestamp: string;
  };
}

export interface join {
  type: "join";
  content: {
    UserID: string;
    UserName: string;
    Avt: string;
  };
}
// =============================================
// Leave Room
// =============================================

export interface LeaveContent {
  roomId: string;
}

export interface LeaveResponse {
  success: boolean;
  message: string;
}

// =============================================
// Messages
// =============================================

export interface SendMessageContent {
  Text: string;
}

export interface MessageReceivedContent {
  messageId: string;
  sender: string;
  text: string;
  timestamp: string;
}

// =============================================
// Media Upload
// =============================================

export interface UploadContent {
  MediaName: string;
}

export interface UploadResponse {
  success: boolean;
  mediaName: string;
}

// =============================================
// Playback Control
// =============================================

export interface PauseContent {
  roomId: string;
  isPaused: boolean;
  currentTime?: number;
}

export interface SyncContent {
  roomId: string;
}

export interface PlaybackStateChangedContent {
  roomId: string;
  isPaused: boolean;
  currentTime?: number;
  changedBy: string;
}

// =============================================
// Member Management
// =============================================

export interface ElectionContent {
  roomId: string;
  memberId: string;
}

export interface DemotionContent {
  roomId: string;
  memberId: string;
}

export interface MemberJoinedContent {
  roomId: string;
  memberId: string;
  memberUsername: string;
  memberAvatar?: string;
}

export interface MemberLeftContent {
  roomId: string;
  memberId: string;
}

// =============================================
// Admin
// =============================================

export interface AdminLoginContent {
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  adminId: string;
}

export interface AdminLogoutContent {
  // Empty
}

// =============================================
// Error Handling
// =============================================

export interface ErrorContent {
  message: string;
  code?: string;
  details?: unknown;
}

// =============================================
// Connection/Info
// =============================================

export interface ConnectionContent {
  userId: string;
  username: string;
  avatar?: string;
}

export interface InfoContent {
  roomId: string;
}
