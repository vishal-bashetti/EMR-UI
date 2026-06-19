import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/messages'
import type { Message, MessageCreate } from '../types'

export function useInbox() {
  return useQuery({
    queryKey: ['messages', 'inbox'],
    queryFn: api.getInbox,
  })
}

export function useSentMessages() {
  return useQuery({
    queryKey: ['messages', 'sent'],
    queryFn: api.getSent,
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'sent'] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] })
    },
  })
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'inbox'] })
    },
  })
}
