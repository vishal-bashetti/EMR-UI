import api from './axios'
import type { LabCatalogItem, LabCatalogInput, LabResult, LabResultInput } from '../types'

export const getLabCatalog = (): Promise<LabCatalogItem[]> =>
  api.get<LabCatalogItem[]>('/lab_catalog').then((r) => r.data)

export const createLabCatalogItem = (data: LabCatalogInput): Promise<LabCatalogItem> =>
  api.post<LabCatalogItem>('/lab_catalog', data).then((r) => r.data)

export const getLabResults = (patientId: number): Promise<LabResult[]> =>
  api.get<LabResult[]>(`/patients/${patientId}/lab_results`).then((r) => r.data)

export const getLabResultsHistory = (patientId: number, testName?: string, limit = 6): Promise<LabResult[]> =>
  api
    .get<LabResult[]>(`/patients/${patientId}/lab_results/history`, { params: { test_name: testName, limit } })
    .then((r) => r.data)

export const createLabResult = (data: LabResultInput): Promise<LabResult> =>
  api.post<LabResult>('/lab_results', data).then((r) => r.data)

export const getLabResult = (id: number): Promise<LabResult> =>
  api.get<LabResult>(`/lab_results/${id}`).then((r) => r.data)

export const updateLabResult = (id: number, data: LabResultInput): Promise<LabResult> =>
  api.put<LabResult>(`/lab_results/${id}`, data).then((r) => r.data)
