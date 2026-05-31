import axios from 'axios'
import type { TokenResponse } from '../types'

// Auth uses form-encoded login (OAuth2PasswordRequestForm)
export const login = async (username: string, password: string): Promise<TokenResponse> => {
  const form = new URLSearchParams()
  form.append('username', username)
  form.append('password', password)
  const { data } = await axios.post<TokenResponse>('/api/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}
