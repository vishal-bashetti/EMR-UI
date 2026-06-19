import api from './axios'
import type { Patient, PatientInput } from '../types'

export const getPatients = (search?: string): Promise<Patient[]> =>
  api.get<Patient[]>('/patients/', { params: search ? { search } : {} }).then((r) => r.data)

export const getPatient = (id: number): Promise<Patient> =>
  api.get<Patient>(`/patients/${id}`).then((r) => r.data)

export const createPatient = (data: PatientInput): Promise<Patient> =>
  api.post<Patient>('/patients/', data).then((r) => r.data)

export const updatePatient = (id: number, data: PatientInput): Promise<Patient> =>
  api.put<Patient>(`/patients/${id}`, data).then((r) => r.data)

export const deletePatient = (id: number): Promise<{ detail: string }> =>
  api.delete<{ detail: string }>(`/patients/${id}`).then((r) => r.data)

export const getPatientAiSummary = (id: number): Promise<{ summary_text: string; id: number; patient_id: number; last_updated_at: string }> =>
  api.get<{ summary_text: string; id: number; patient_id: number; last_updated_at: string }>(`/patients/${id}/ai_summary`).then((r) => r.data)
