import api from './axios'
import type { LabCatalogItem, LabCatalogInput, LabResult, LabResultInput, LabComboCatalogItem, OrderComboPayload, LabQueueResponseItem, LabComboCatalogInput } from '../types'

export const getLabCatalog = (query?: string): Promise<LabCatalogItem[]> =>
  api.get<LabCatalogItem[]>('/lab_results/lab_catalog', { params: query ? { query } : undefined }).then((r) => r.data)

export const createLabCatalogItem = (data: LabCatalogInput): Promise<LabCatalogItem> =>
  api.post<LabCatalogItem>('/lab_results/lab_catalog', data).then((r) => r.data)

export const updateLabCatalogItem = (id: number, data: LabCatalogInput): Promise<LabCatalogItem> =>
  api.put<LabCatalogItem>(`/lab_results/lab_catalog/${id}`, data).then((r) => r.data)

export const deleteLabCatalogItem = (id: number): Promise<{ detail: string }> =>
  api.delete<{ detail: string }>(`/lab_results/lab_catalog/${id}`).then((r) => r.data)

export const getComboCatalog = (query?: string): Promise<LabComboCatalogItem[]> =>
  api.get<LabComboCatalogItem[]>('/lab_results/combo_catalog', { params: query ? { query } : undefined }).then((r) => r.data)

export const createComboCatalogItem = (data: LabComboCatalogInput): Promise<LabComboCatalogItem> =>
  api.post<LabComboCatalogItem>('/lab_results/combo_catalog', data).then((r) => r.data)

export const updateComboCatalogItem = (id: number, data: LabComboCatalogInput): Promise<LabComboCatalogItem> =>
  api.put<LabComboCatalogItem>(`/lab_results/combo_catalog/${id}`, data).then((r) => r.data)

export const deleteComboCatalogItem = (id: number): Promise<{ detail: string }> =>
  api.delete<{ detail: string }>(`/lab_results/combo_catalog/${id}`).then((r) => r.data)

export const orderCombo = (data: OrderComboPayload): Promise<any> =>
  api.post('/lab_results/order_combo', data).then((r) => r.data)

export const getLabQueue = (status?: string): Promise<LabQueueResponseItem[]> =>
  api.get<LabQueueResponseItem[]>('/lab_results/orders/queue', { params: status ? { status } : undefined }).then((r) => r.data)

export const getLabResults = (patientId: number): Promise<LabResult[]> =>
  api.get<LabResult[]>(`/patients/${patientId}/lab_results`).then((r) => r.data)

export const getLabResultsHistory = (patientId: number, testName?: string, limit = 6): Promise<LabResult[]> =>
  api
    .get<LabResult[]>(`/patients/${patientId}/lab_results/history`, { params: { test_name: testName, limit } })
    .then((r) => r.data)

export const getLatestLabResults = (patientId: number): Promise<LabResult[]> =>
  api.get<LabResult[]>(`/patients/${patientId}/lab_results/latest`).then((r) => r.data)

export const createLabResult = (data: LabResultInput): Promise<LabResult> =>
  api.post<LabResult>('/lab_results', data).then((r) => r.data)

export const getLabResult = (id: number): Promise<LabResult> =>
  api.get<LabResult>(`/lab_results/${id}`).then((r) => r.data)

export const updateLabResult = (id: number, data: LabResultInput): Promise<LabResult> =>
  api.put<LabResult>(`/lab_results/${id}`, data).then((r) => r.data)

export const deleteLabResult = (id: number): Promise<{ detail: string }> =>
  api.delete<{ detail: string }>(`/lab_results/${id}`).then((r) => r.data)

export const getLabResultsByDate = (date: string): Promise<LabQueueResponseItem[]> =>
  api.get<LabQueueResponseItem[]>('/lab_results/by_date', { params: { date } }).then((r) => r.data)
