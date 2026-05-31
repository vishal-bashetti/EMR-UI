import api from './axios'
import type { SystemSetting } from '../types'

export const getSettings = (): Promise<SystemSetting[]> =>
  api.get<SystemSetting[]>('/settings/').then((r) => r.data)
