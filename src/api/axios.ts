import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'react-toastify'
import type { TokenResponse } from '../types'

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (error.response?.status === 401 && original) {
      // Ignore 401s from the login endpoint itself
      if (original.url?.includes('/auth/login')) {
        return Promise.reject(error)
      }

      if (!original._retry) {
        original._retry = true
        const refresh = localStorage.getItem('refresh_token')
        if (refresh) {
          try {
            const { data } = await axios.post<TokenResponse>('/api/auth/refresh', { refresh_token: refresh })
            localStorage.setItem('access_token', data.access_token)
            localStorage.setItem('refresh_token', data.refresh_token)
            original.headers.Authorization = `Bearer ${data.access_token}`
            return api(original)
          } catch {
            // Refresh failed, fall through to logout
          }
        }
      }
      
      // Token is missing, expired, or refresh failed
      localStorage.clear()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return Promise.reject(error)
    } else if (error.response?.status === 403) {
      toast.error('User permission denied.')
    } else if (error.response?.status === 404) {
      toast.error('Resource not found.')
    } else if (error.response?.status === 500) {
      toast.error('An internal server error occurred.')
    } else if (error.response?.data && (error.response.data as any).detail) {
      toast.error(String((error.response.data as any).detail))
    } else if (!error.response && error.request) {
      toast.error('Network error. Please check your connection.')
    } else {
      toast.error(error.message || 'An unexpected error occurred.')
    }
    return Promise.reject(error)
  }
)

export default api
