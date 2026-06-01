import api from './axios'
import type {
  Appointment,
  AppointmentInput,
  AppointmentsQuery,
  AppointmentStatusConfig,
  AppointmentStatusInput,
  AppointmentType,
} from '../types'

export const getAppointmentStatuses = (): Promise<AppointmentStatusConfig[]> =>
  api.get<AppointmentStatusConfig[]>('/appointments/statuses').then((r) => r.data)

export const createAppointmentStatus = (data: AppointmentStatusInput): Promise<AppointmentStatusConfig> =>
  api.post<AppointmentStatusConfig>('/appointments/statuses', data).then((r) => r.data)

export const getAppointments = (params?: AppointmentsQuery): Promise<Appointment[]> =>
  api.get<Appointment[]>('/appointments/', { params }).then((r) => r.data)

export const getAppointment = (id: number): Promise<Appointment> =>
  api.get<Appointment>(`/appointments/${id}`).then((r) => r.data)

export const createAppointment = (data: AppointmentInput): Promise<Appointment> =>
  api.post<Appointment>('/appointments/', data).then((r) => r.data)

export const updateAppointment = (id: number, data: AppointmentInput): Promise<Appointment> =>
  api.put<Appointment>(`/appointments/${id}`, data).then((r) => r.data)

export const updateAppointmentStatus = (id: number, status: string): Promise<Appointment> =>
  api.put<Appointment>(`/appointments/${id}/status`, null, { params: { status } }).then((r) => r.data)

export const deleteAppointment = (id: number): Promise<{ detail: string }> =>
  api.delete<{ detail: string }>(`/appointments/${id}`).then((r) => r.data)

export const getAppointmentTypes = (query?: string): Promise<AppointmentType[]> =>
  api.get<AppointmentType[]>('/appointments/types', { params: query ? { query } : undefined }).then((r) => r.data)
