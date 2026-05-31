import api from './axios'
import type { Invoice, InvoiceInput, BillSuggestion } from '../types'

export const createInvoice = (data: InvoiceInput): Promise<Invoice> =>
  api.post<Invoice>('/billing/', data).then((r) => r.data)

export const getInvoices = (patientId?: number): Promise<Invoice[]> =>
  api.get<Invoice[]>('/billing/', { params: patientId ? { patient_id: patientId } : {} }).then((r) => r.data)

export const getInvoice = (id: number): Promise<Invoice> =>
  api.get<Invoice>(`/billing/${id}`).then((r) => r.data)

export const updateInvoiceStatus = (id: number, status: string): Promise<Invoice> =>
  api.put<Invoice>(`/billing/${id}/status`, null, { params: { status } }).then((r) => r.data)

export const deleteInvoice = (id: number): Promise<{ detail: string }> =>
  api.delete<{ detail: string }>(`/billing/${id}`).then((r) => r.data)

// Suggests billable items (consultation fee + completed lab tests) for an appointment.
export const suggestBill = (appointmentId: number): Promise<BillSuggestion> =>
  api.get<BillSuggestion>(`/billing/suggest/${appointmentId}`).then((r) => r.data)
