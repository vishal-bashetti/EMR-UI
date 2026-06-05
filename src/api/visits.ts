import api from './axios'
import type { VitalConfig, VisitResponse, VisitPayload, Encounter } from '../types'

export const getVitalConfigs = (): Promise<VitalConfig[]> =>
  api.get<VitalConfig[]>('/visits/vitals/config').then((r) => r.data)

export const createVitalConfig = (data: Partial<VitalConfig>): Promise<VitalConfig> =>
  api.post<VitalConfig>('/visits/vitals/config', data).then((r) => r.data)

export const getLastVisit = (patientId: number): Promise<VisitResponse> =>
  api.get<VisitResponse>(`/visits/last/${patientId}`).then((r) => r.data)

export const getVisitHistory = (patientId: number, limit = 6): Promise<VisitResponse[]> =>
  api.get<VisitResponse[]>(`/visits/history/${patientId}`, { params: { limit } }).then((r) => r.data)

export const getVisitById = (encounterId: number): Promise<VisitResponse> =>
  api.get<VisitResponse>(`/visits/${encounterId}`).then((r) => r.data)

export const createVisit = (data: VisitPayload): Promise<Encounter> =>
  api.post<Encounter>('/visits/', data).then((r) => r.data)

export const updateVisit = (id: number, data: VisitPayload): Promise<Encounter> =>
  api.put<Encounter>(`/visits/${id}`, data).then((r) => r.data)
