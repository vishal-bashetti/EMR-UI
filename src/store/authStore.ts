import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  accessToken: string | null
  setTokens: (access: string, refresh: string) => void
  setUser: (user: User) => void
  logout: () => void
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('access_token'),

  setTokens: (access, refresh) => {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
    set({ accessToken: access })
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, accessToken: null })
  },
}))

export default useAuthStore
