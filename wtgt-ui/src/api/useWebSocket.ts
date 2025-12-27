/**
 * useWebSocket Hook
 * React hook for managing WebSocket connection and events
 */

import { useEffect, useRef, useState } from 'react'
import { WebSocketClient, getWebSocketClient } from './WebSocketClient'
import type { ServerMessage, ServerMessageType } from './types'

interface UseWebSocketOptions {
  url?: string
  autoConnect?: boolean
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { url = `ws://${window.location.hostname}:3000`, autoConnect = true } = options
  const clientRef = useRef<WebSocketClient | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Initialize client
  useEffect(() => {
    clientRef.current = getWebSocketClient(url)
    return () => {
      // Don't disconnect on unmount to preserve connection across components
    }
  }, [url])

  // Auto-connect
  useEffect(() => {
    if (!autoConnect || !clientRef.current) return

    const client = clientRef.current

    if (client.isConnected()) {
      setIsConnected(true)
      return
    }

    const unsubscribeConnect = client.onConnect(() => {
      setIsConnected(true)
      setError(null)
    })

    const unsubscribeDisconnect = client.onDisconnect(() => {
      setIsConnected(false)
    })

    const unsubscribeError = client.onError((err) => {
      setError(err)
    })

    return () => {
      unsubscribeConnect()
      unsubscribeDisconnect()
      unsubscribeError()
    }
  }, [autoConnect])

  /**
   * Connect to server
   */
  const connect = async (username: string, avatar?: string, userId?: string) => {
    if (!clientRef.current) throw new Error('WebSocket client not initialized')
    try {
      await clientRef.current.connect(username, avatar, userId)
      setIsConnected(true)
      setError(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    }
  }

  /**
   * Disconnect from server
   */
  const disconnect = () => {
    clientRef.current?.disconnect()
    setIsConnected(false)
  }

  /**
   * Subscribe to a specific message type
   */
  const on = <T = any>(type: ServerMessageType, handler: (content: T) => void) => {
    if (!clientRef.current) throw new Error('WebSocket client not initialized')
    return clientRef.current.on(type, handler)
  }

  /**
   * Subscribe to all messages
   */
  const onMessage = (handler: (message: ServerMessage) => void) => {
    if (!clientRef.current) throw new Error('WebSocket client not initialized')
    return clientRef.current.onMessage(handler)
  }

  // Get client methods bound to current instance
  const client = clientRef.current

  return {
    // State
    isConnected,
    error,

    // Connection
    connect,
    disconnect,

    // Event handlers
    on,
    onMessage,
    onConnect: client?.onConnect.bind(client),
    onDisconnect: client?.onDisconnect.bind(client),
    onError: client?.onError.bind(client),

    // Room operations
    hostRoom: client?.hostRoom.bind(client),
    joinRoom: client?.joinRoom.bind(client),
    leaveRoom: client?.leaveRoom.bind(client),

    // Message operations
    sendMessage: client?.sendMessage.bind(client),

    // Media operations
    uploadMedia: client?.uploadMedia.bind(client),
    pausePlayback: client?.pausePlayback.bind(client),
    syncPlayback: client?.syncPlayback.bind(client),

    // Member operations
    electModerator: client?.electModerator.bind(client),
    demoteModerator: client?.demoteModerator.bind(client),

    // Admin operations
    adminLogin: client?.adminLogin.bind(client),
    adminLogout: client?.adminLogout.bind(client),
    shutdownServer: client?.shutdownServer.bind(client),

    // Utility
    getUserInfo: client?.getUserInfo.bind(client),
  }
}
