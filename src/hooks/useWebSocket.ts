import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'
import { toast } from 'react-toastify'

export function useWebSocket() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore(s => s.accessToken)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!accessToken) return

    // Reconstruct the ws url from the current window location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const wsUrl = `${protocol}//${host}/api/ws/messages?token=${accessToken}`

    const connect = () => {
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('WS Connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'NEW_MESSAGE') {
            // Invalidate queries to fetch the latest messages
            queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] })
            // Optional: show a small toast notification
            toast.info(`New message received`, { autoClose: 3000, position: 'bottom-right' })
          }
        } catch (e) {
          console.error('Failed to parse WS message', e)
        }
      }

      ws.onclose = () => {
        console.log('WS Disconnected. Reconnecting in 3s...')
        setTimeout(connect, 3000)
      }

      wsRef.current = ws
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null // Prevent reconnect loop on unmount
        wsRef.current.close()
      }
    }
  }, [accessToken, queryClient])
}
