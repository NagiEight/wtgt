/**
 * WebSocket Context Provider
 * Provides WebSocket client throughout the app
 */

import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { WebSocketClient, getWebSocketClient } from './WebSocketClient'
import type { ServerMessage, ServerMessageType } from './types'

interface WebSocketContextType {
  client: WebSocketClient | null
  isConnected: boolean
  error: Error | null
  connect: (username: string, avatar?: string, userId?: string) => Promise<void>
  disconnect: () => void
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined)

export interface WebSocketProviderProps {
  children: ReactNode
  url?: string
}

export function WebSocketProvider({ children, url = `ws://${window.location.hostname}:3000` }: WebSocketProviderProps) {
  const [client] = useState(() => getWebSocketClient(url))
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client) return

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
  }, [client])

  const connect = useCallback(
    async (username: string, avatar?: string, userId?: string) => {
      if (!client) throw new Error('WebSocket client not available')
      try {
        await client.connect(username, avatar, userId)
        setError(null)
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        throw error
      }
    },
    [client]
  )

  const disconnect = useCallback(() => {
    client?.disconnect()
  }, [client])

  return (
    <WebSocketContext.Provider value={{ client, isConnected, error, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  )
}

/**
 * Hook to use WebSocket context
 */
export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}

/**
 * Hook to subscribe to a message type
 */
export function useWebSocketMessage<T = any>(
  type: ServerMessageType,
  callback: (content: T) => void
) {
  const { client } = useWebSocketContext()

  useEffect(() => {
    if (!client) return
    return client.on(type, callback)
  }, [client, type, callback])
}

/**
 * Hook to subscribe to all messages
 */
export function useWebSocketMessages(callback: (message: ServerMessage) => void) {
  const { client } = useWebSocketContext()

  useEffect(() => {
    if (!client) return
    return client.onMessage(callback)
  }, [client, callback])
}
