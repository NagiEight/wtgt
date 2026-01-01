// Theme types
export type Theme = "dark" | "light";

export interface ThemeContextType {
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
}

// User types
export interface User {
  id: string;
  username: string;
  avatar?: string;
  email?: string;
}

export interface UserProfile extends User {
  createdAt: Date;
  lastLogin?: Date;
}

// Room types
export type RoomType = "private" | "public";

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  host: User;
  currentMedia: string;
  isPaused: boolean;
  members: User[];
  moderators: User[];
  createdAt: Date;
  messages: Message[];
}

export interface RoomMember {
  id: string;
  username: string;
  avatar?: string;
  role: "member" | "moderator" | "host";
}

export interface CreateRoomInput {
  name: string;
  type: RoomType;
  mediaName: string;
}

// Message types
export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  content: unknown;
}

export interface ConnectionMessage extends WebSocketMessage {
  type: "connection";
  content: {
    userId: string;
    username: string;
    avatar?: string;
  };
}

export interface ErrorMessage extends WebSocketMessage {
  type: "error";
  content: {
    message: string;
    code?: string;
  };
}

// Admin types
export interface AdminUser extends User {
  isAdmin: true;
  permissions: string[];
}

export interface ServerLog {
  id: string;
  timestamp: Date;
  event: string;
  userId?: string;
  roomId?: string;
  data?: Record<string, unknown>;
}

export interface ServerStats {
  activeRooms: number;
  activeUsers: number;
  totalMessages: number;
  uptime: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
