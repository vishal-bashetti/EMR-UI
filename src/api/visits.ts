import api from './axios'
import type { VitalConfig, VisitResponse, VisitPayload, VisitAmendment, VisitLabOrderIntent } from '../types'

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

export const createVisit = (data: VisitPayload): Promise<VisitResponse> =>
  api.post<VisitResponse>('/visits/', data).then((r) => r.data)

export const updateVisit = (id: number, data: VisitPayload): Promise<VisitResponse> =>
  api.put<VisitResponse>(`/visits/${id}`, data).then((r) => r.data)

export const addVisitAmendment = (id: number, data: { reason: string; note: string }): Promise<VisitAmendment> =>
  api.post<VisitAmendment>(`/visits/${id}/amendments`, data).then((r) => r.data)

export const submitVisitLabOrder = (id: number): Promise<VisitLabOrderIntent> =>
  api.post<VisitLabOrderIntent>(`/visits/${id}/lab-order/submit`).then((r) => r.data)

export const getVisitLabOrder = (id: number, signal?: AbortSignal): Promise<VisitLabOrderIntent> =>
  api.get<VisitLabOrderIntent>(`/visits/${id}/lab-order`, { signal }).then((r) => r.data)

export const getDiagnosisSuggestions = (q: string) =>
  api.get<{ text: string; count: number }[]>('/visits/suggestions/diagnoses', { params: { q } }).then(r => r.data)

export const getTreatmentSuggestions = (q: string) =>
  api.get<{ text: string; count: number }[]>('/visits/suggestions/treatments', { params: { q } }).then(r => r.data)
