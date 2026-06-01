import api from './axios'
import type { Invoice, InvoiceInput, BillSuggestion } from '../types'

export const createInvoice = (data: InvoiceInput): Promise<Invoice> =>
  api.post<Invoice>('/billing/', data).then((r) => r.data)

export const getInvoices = (patientId?: number, startDate?: string, endDate?: string): Promise<Invoice[]> => {
  const params: Record<string, string | number> = {}
  if (patientId) params.patient_id = patientId
  if (startDate) params.start_date = startDate
  if (endDate) params.end_date = endDate
  return api.get<Invoice[]>('/billing/', { params }).then((r) => r.data)
}

export const getInvoice = (id: number): Promise<Invoice> =>
  api.get<Invoice>(`/billing/${id}`).then((r) => r.data)

export const updateInvoice = (id: number, data: InvoiceInput): Promise<Invoice> =>
  api.put<Invoice>(`/billing/${id}`, data).then((r) => r.data)

export const updateInvoiceStatus = (id: number, status: string): Promise<Invoice> =>
  api.put<Invoice>(`/billing/${id}/status`, null, { params: { status } }).then((r) => r.data)

export const deleteInvoice = (id: number): Promise<{ detail: string }> =>
  api.delete<{ detail: string }>(`/billing/${id}`).then((r) => r.data)

// Suggests billable items (consultation fee + completed lab tests) for an appointment.
export const suggestBill = (appointmentId: number): Promise<BillSuggestion> =>
  api.get<BillSuggestion>(`/billing/suggest/${appointmentId}`).then((r) => r.data)

export const searchInvoiceItems = (query: string): Promise<{ service_name: string; unit_price: number }[]> =>
  api.get<{ service_name: string; unit_price: number }[]>('/billing/items/search', { params: { query } }).then((r) => r.data)
