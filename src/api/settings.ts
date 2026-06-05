import api from './axios'
import type { SystemSetting, Clinic, ClinicInput } from '../types'

export const getSettings = (): Promise<SystemSetting[]> =>
  api.get<SystemSetting[]>('/settings/').then((r) => r.data)

export const getClinic = (): Promise<Clinic> =>
  api.get<Clinic>('/clinic/').then((r) => r.data)

export const updateClinic = (data: ClinicInput): Promise<Clinic> =>
  api.put<Clinic>('/clinic/', data).then((r) => r.data)

export const uploadClinicLogo = (file: File): Promise<{ logo_path: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/clinic/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}
