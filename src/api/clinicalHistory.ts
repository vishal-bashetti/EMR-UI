import api from './axios'

export interface AllergyRecord {
  id: number
  allergen: string
  reaction: string | null
  severity: string
  status: string
}

export interface ProblemRecord {
  id: number
  title: string
  icd_code: string | null
  onset_date: string | null
  status: string
}

export interface MedicationRecord {
  id: number
  drug_name: string
  dosage: string | null
  frequency: string | null
  route: string | null
  status: string
}

export interface ImmunizationRecord {
  id: number
  vaccine_name: string
  administered_date: string
  lot_number: string | null
  site?: string | null
  notes?: string | null
}

export interface HistoryPrescription {
  id: number
  date_prescribed: string
  status: string | null
  encounter_id: number | null
  items: { id: number; molecule: string; name?: string; morning: string | null; afternoon: string | null; evening: string | null; night: string | null; when: string | null; details: string | null }[]
}

export const getHistoryPrescriptions = (patientId: number) =>
  api.get<HistoryPrescription[]>('/prescriptions/', { params: { patient_id: patientId } }).then(response => response.data)

export const addHistoryMedication = (patientId: number, data: { drug_name: string; dosage: string; frequency: string; route: string; status: string }) =>
  api.post(`/patients/${patientId}/medications`, { ...data, patient_id: patientId }).then(response => response.data)
export const addHistoryImmunization = (patientId: number, data: { vaccine_name: string; administered_date: string; lot_number: string; site: string; notes: string }) =>
  api.post(`/patients/${patientId}/immunizations`, { ...data, patient_id: patientId }).then(response => response.data)

export const getAllergies = (patientId: number) =>
  api.get<AllergyRecord[]>(`/patients/${patientId}/allergies`).then(response => response.data)
export const getProblems = (patientId: number) =>
  api.get<ProblemRecord[]>(`/patients/${patientId}/medical_problems`).then(response => response.data)
export const getMedications = (patientId: number) =>
  api.get<MedicationRecord[]>(`/patients/${patientId}/medications`).then(response => response.data)
export const getImmunizations = (patientId: number) =>
  api.get<ImmunizationRecord[]>(`/patients/${patientId}/immunizations`).then(response => response.data)
