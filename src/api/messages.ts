import api from './axios'
import type { Message, MessageCreate } from '../types'

export const getInbox = (): Promise<Message[]> =>
  api.get<Message[]>('/messages/inbox').then(r => r.data)

export const getSent = (): Promise<Message[]> =>
  api.get<Message[]>('/messages/sent').then(r => r.data)

export const sendMessage = (data: MessageCreate): Promise<Message> =>
  api.post<Message>('/messages/', data).then(r => r.data)

export const markRead = (id: number): Promise<Message> =>
  api.put<Message>(`/messages/${id}/read`).then(r => r.data)
