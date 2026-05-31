import api from './axios'
import type { Drug, DrugInput } from '../types'

export const getDrugs = (search?: string, limit = 50): Promise<Drug[]> =>
  api.get<Drug[]>('/drugs/', { params: { search, limit } }).then((r) => r.data)

export const createDrug = (data: DrugInput): Promise<Drug> =>
  api.post<Drug>('/drugs/', data).then((r) => r.data)

export const getDrug = (id: number): Promise<Drug> =>
  api.get<Drug>(`/drugs/${id}`).then((r) => r.data)

export const updateDrug = (id: number, data: DrugInput): Promise<Drug> =>
  api.put<Drug>(`/drugs/${id}`, data).then((r) => r.data)
