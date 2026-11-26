import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { toast } from 'react-toastify'
import type { TokenResponse } from '../types'
import useAuthStore from '../store/authStore'

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

let refreshInFlight: Promise<string> | null = null

async function refreshAccess(failedAuthorization: unknown): Promise<string> {
  const refresh = async () => {
    const current = localStorage.getItem('access_token')
    // A concurrent request (or tab) may already have rotated this session.
    if (current && failedAuthorization !== `Bearer ${current}`) return current
    const token = localStorage.getItem('refresh_token')
    if (!token) throw new Error('Session expired')
    const { data } = await axios.post<TokenResponse>('/api/auth/refresh', { refresh_token: token })
    if (localStorage.getItem('refresh_token') !== token) throw new Error('Session changed during refresh')
    useAuthStore.getState().setTokens(data.access_token, data.refresh_token)
    return data.access_token
  }
  if (!refreshInFlight) {
    // Web Locks coordinate rotation across browser tabs on secure origins.
    refreshInFlight = Promise.resolve(typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('emr-session-refresh', refresh)
      : refresh()).finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

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
        try {
          const access = await refreshAccess(original.headers.Authorization)
          original.headers.Authorization = `Bearer ${access}`
          return api(original)
        } catch {
          // Do not log out a newer login when an older request fails.
        }
      }
      
      // Token is missing, expired, or refresh failed
      const current = localStorage.getItem('access_token')
      if (!current || original.headers.Authorization === `Bearer ${current}`) {
        useAuthStore.getState().logout()
        if (window.location.pathname !== '/login') window.location.href = '/login'
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
