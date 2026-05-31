import api from './axios'

export const createInvoice = (data) => api.post('/billing/', data).then(r => r.data)
export const getInvoices = (patientId) =>
  api.get('/billing/', { params: patientId ? { patient_id: patientId } : {} }).then(r => r.data)
export const getInvoice = (id) => api.get(`/billing/${id}`).then(r => r.data)
export const updateInvoiceStatus = (id, status) =>
  api.put(`/billing/${id}/status`, null, { params: { status } }).then(r => r.data)
export const deleteInvoice = (id) => api.delete(`/billing/${id}`).then(r => r.data)
