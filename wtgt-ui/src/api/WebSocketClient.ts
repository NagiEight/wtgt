/**
 * WebSocket Client
 * Handles all WebSocket communication with the server
 */

import type { Room, User, Message } from "../types";
import type {
  ServerMessage,
  ServerMessageType,
  ClientRequest,
  ClientRequestType,
  HostContent,
  JoinContent,
  SendMessageContent,
  UploadContent,
  PauseContent,
  SyncContent,
  ElectionContent,
  DemotionContent,
  AdminLoginContent,
} from "./types";

type MessageHandler = (message: ServerMessage) => void;
type TypedMessageHandler<T> = (content: T) => void;
type ConnectionHandler = () => void;
type DisconnectionHandler = () => void;
type ErrorHandler = (error: Error) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private messageHandlers: Map<
    ServerMessageType,
    Set<TypedMessageHandler<any>>
  > = new Map();
  private defaultHandlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private disconnectionHandlers: Set<DisconnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private userId: string | null = null;
  private username: string | null = null;
  private avatar: string | null = null;
  private isIntentionallyClosed = false;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Connect to WebSocket server with user profile
   */
  public connect(
    username: string,
    avatar?: string,
    userId?: string
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.username = username;
        this.avatar = avatar || "😊";
        this.userId = userId || this.generateUserId();
        this.isIntentionallyClosed = false;

        const wsUrl = new URL(this.url);
        wsUrl.searchParams.set("UserName", this.username);
        wsUrl.searchParams.set("Avt", this.avatar);

        this.ws = new WebSocket(wsUrl.toString());

        this.ws.onopen = () => {
          console.log("✅ Connected to server");
          this.reconnectAttempts = 0;
          this.connectionHandlers.forEach((handler) => handler());
        };

        this.ws.onmessage = (event) => {
          try {
            const message: ServerMessage = JSON.parse(event.data);
            this.handleMessage(message);
            resolve(true);
          } catch (error) {
            console.error("Failed to parse message:", error);
            this.errorHandlers.forEach((handler) =>
              handler(new Error("Failed to parse server message"))
            );
            reject(false);
          }
        };

        this.ws.onerror = (event) => {
          const error = new Error("WebSocket error");
          console.error("❌ WebSocket error:", event);
          this.errorHandlers.forEach((handler) => handler(error));
          reject(error);
        };

        this.ws.onclose = () => {
          console.log("🔌 Disconnected from server");
          this.disconnectionHandlers.forEach((handler) => handler());

          if (
            !this.isIntentionallyClosed &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.reconnectAttempts++;
            console.log(
              `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
            );
            setTimeout(() => {
              this.connect(username, avatar, userId).catch(console.error);
            }, this.reconnectDelay);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Send a request to the server
   */
  private sendRequest<T>(type: ClientRequestType, content?: T): void {
    if (!this.isConnected()) {
      throw new Error("WebSocket is not connected");
    }

    if (content === undefined) {
      const request = { type };

      this.ws!.send(JSON.stringify(request));
      console.log("➡️ Sent request:", request);
      return;
    }

    const request: ClientRequest = {
      type,
      content,
    };

    this.ws!.send(JSON.stringify(request));
    console.log("➡️ Sent request:", request);
  }

  /**
   * Handle incoming server message
   */
  private handleMessage(message: ServerMessage): void {
    // Call default handlers
    this.defaultHandlers.forEach((handler) => handler(message));

    // Call type-specific handlers
    const typeHandlers = this.messageHandlers.get(message.type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => handler(message.content));
    }
  }

  /**
   * Register a handler for a specific message type
   */
  public on<T = any>(
    type: ServerMessageType,
    handler: TypedMessageHandler<T>
  ): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  /**
   * Register a handler for all messages (unfiltered)
   */
  public onMessage(handler: MessageHandler): () => void {
    this.defaultHandlers.add(handler);
    return () => this.defaultHandlers.delete(handler);
  }

  /**
   * Register connection handler
   */
  public onConnect(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  /**
   * Register disconnection handler
   */
  public onDisconnect(handler: DisconnectionHandler): () => void {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  /**
   * Register error handler
   */
  public onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  // =============================================
  // Room Operations
  // =============================================

  /**
   * Host a new room
   */
  public hostRoom(
    mediaName: string,
    roomType: "private" | "public",
    isPaused = false
  ): Promise<string> {
    console.log("Hosting room on server");

    return new Promise((resolve, reject) => {
      this.sendRequest<HostContent>("host", {
        MediaName: mediaName,
        RoomType: roomType,
        IsPaused: isPaused,
      });

      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "info" && data.content) {
            console.log("Room hosted:", data.content);
            this.ws?.removeEventListener("message", handler); // cleanup
            resolve(data.content.RoomID as string);
          }
        } catch (err) {
          this.ws?.removeEventListener("message", handler);
          console.error("Error handling hostResult:", err);
          resolve("");
        }
      };
      if (!this.ws) {
        throw new Error("WebSocket not connected");
      }
      this.ws.addEventListener("message", handler);

      // Optional timeout
      setTimeout(() => {
        if (!this.ws) {
          throw new Error("WebSocket not connected");
        }
        this.ws.removeEventListener("message", handler);
        reject(new Error("Timeout waiting for rooms"));
      }, 5000);
    });
  }

  /**
   * Join an existing room
   */
  public joinRoom(roomId: string): void {
    this.sendRequest<JoinContent>("join", { RoomID: roomId });

    const handler = (event: MessageEvent) => {
      console.log("Handling joinRoom response:", JSON.parse(event.data));
      try {
        const data = JSON.parse(event.data);
        if (data.type === "info" && data.content) {
          console.log("Joined room:", data.content);
          this.ws?.removeEventListener("message", handler); // cleanup
        }
      } catch (err) {
        this.ws?.removeEventListener("message", handler);
        console.error("Error handling joinResult:", err);
      }
    };

    this.ws?.addEventListener("message", handler);
  }

  /**
   * Leave current room
   */
  public leaveRoom(roomId: string): void {
    this.sendRequest<JoinContent>("leave", { RoomID: roomId });
  }

  public getRooms(): Promise<Room[]> {
    console.log("Requesting rooms from server");

    return new Promise((resolve, reject) => {
      if (!this.ws) {
        return reject(new Error("WebSocket not connected"));
      }

      this.sendRequest<{}>("query");

      const handler = (event: MessageEvent) => {
        try {
          if (!this.ws) {
            return reject(new Error("WebSocket not connected"));
          }
          const data = JSON.parse(event.data);
          if (data.type === "queryResult" && data.content) {
            const rooms = this.parseRooms(data.content);
            console.log("Received rooms:", rooms);
            this.ws.removeEventListener("message", handler); // cleanup
            resolve(rooms);
          } else {
            console.warn("Unexpected response for getRooms:", data);
            this.ws.removeEventListener("message", handler);
            resolve([]);
          }
        } catch (err) {
          if (!this.ws) {
            return reject(new Error("WebSocket not connected"));
          }
          this.ws.removeEventListener("message", handler);
          reject(err);
        }
      };

      this.ws.addEventListener("message", handler);

      // Optional timeout
      setTimeout(() => {
        if (!this.ws) {
          return reject(new Error("WebSocket not connected"));
        }
        this.ws.removeEventListener("message", handler);
        reject(new Error("Timeout waiting for rooms"));
      }, 5000);
    });
  }

  public parseRooms(content: Record<string, any>): Room[] {
    return Object.entries(content).map(([roomId, raw]) => {
      const room: Room = {
        id: roomId,
        name: raw.CurrentMedia ?? "Untitled Room", // server doesn’t send a name, fallback
        type: raw.Type,
        host: {
          id: raw.Host,
          username: raw.Host, // you’ll probably want to look up user info separately
          avatar: "🙂", // placeholder until you resolve actual user data
        } as User,
        currentMedia: raw.CurrentMedia,
        isPaused: raw.IsPaused,
        members: raw.Members.map((memberId: string) => ({
          id: memberId,
          username: memberId,
          avatar: "👤",
        })) as User[],
        moderators: raw.Mods.map((modId: string) => ({
          id: modId,
          username: modId,
          avatar: "⭐",
        })) as User[],
        createdAt: new Date(), // server doesn’t send createdAt, so you may need to add it
        messages: Object.values(raw.Messages ?? {}) as Message[], // adjust if Messages is keyed
      };
      return room;
    });
  }

  // =============================================
  // Message Operations
  // =============================================

  /**
   * Send a message to the current room
   */
  public sendMessage(Text: string): void {
    this.sendRequest<SendMessageContent>("message", {
      Text,
    });

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "messageAck" && data.content) {
          console.log("Message sent:", data.content);
          this.ws?.removeEventListener("message", handler); // cleanup
        }
      } catch (err) {
        this.ws?.removeEventListener("message", handler);
        console.error("Error handling messageAck:", err);
      }
    };
    this.ws?.addEventListener("message", handler);
  }

  // =============================================
  // Media Operations
  // =============================================

  /**
   * Upload new media to room
   */
  public uploadMedia(mediaName: string): void {
    this.sendRequest<UploadContent>("upload", {
      MediaName: mediaName,
    });

    // Handle upload progress
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "upload" && data.content) {
          console.log("Upload progress:", data.content);
          // You can add more detailed progress handling here if needed
        }
      } catch (err) {
        console.error("Error handling upload:", err);
      }
    };
    this.ws?.addEventListener("message", handler);
  }

  /**
   * Pause/resume playback
   */
  public pausePlayback(
    roomId: string,
    isPaused: boolean,
    currentTime?: number
  ): void {
    this.sendRequest<PauseContent>("pause", {
      roomId,
      isPaused,
      currentTime,
    });
  }

  /**
   * Sync playback state with server
   */
  public syncPlayback(roomId: string): void {
    this.sendRequest<SyncContent>("sync", { roomId });
  }

  // =============================================
  // Member Management
  // =============================================

  /**
   * Elect a member as moderator
   */
  public electModerator(roomId: string, memberId: string): void {
    this.sendRequest<ElectionContent>("election", {
      roomId,
      memberId,
    });
  }

  /**
   * Demote a moderator
   */
  public demoteModerator(roomId: string, memberId: string): void {
    this.sendRequest<DemotionContent>("demotion", {
      roomId,
      memberId,
    });
  }

  // =============================================
  // Admin Operations
  // =============================================

  /**
   * Login as admin
   */
  public adminLogin(password: string): void {
    this.sendRequest<AdminLoginContent>("adminLogin", {
      password,
    });
  }

  /**
   * Logout as admin
   */
  public adminLogout(): void {
    this.sendRequest<{}>("adminLogout", {});
  }

  /**
   * Shutdown server (admin only)
   */
  public shutdownServer(): void {
    this.sendRequest<{}>("shutdown", {});
  }

  // =============================================
  // Utility
  // =============================================

  /**
   * Get current user info
   */
  public getUserInfo() {
    return {
      userId: this.userId,
      username: this.username,
      avatar: this.avatar,
    };
  }

  /**
   * Generate a unique user ID
   */
  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
let clientInstance: WebSocketClient | null = null;

export function getWebSocketClient(url?: string): WebSocketClient {
  if (!clientInstance) {
    const wsUrl = url || `ws://${window.location.hostname}:3000`;
    clientInstance = new WebSocketClient(wsUrl);
  }
  return clientInstance;
}

export function createWebSocketClient(url: string): WebSocketClient {
  return new WebSocketClient(url);
}
