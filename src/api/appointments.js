import api from './axios'

export const getAppointments = (params) =>
  api.get('/appointments/', { params }).then((r) => r.data)

export const getAppointment = (id) => api.get(`/appointments/${id}`).then((r) => r.data)

export const createAppointment = (data) => api.post('/appointments/', data).then((r) => r.data)

export const updateAppointment = (id, data) =>
  api.put(`/appointments/${id}`, data).then((r) => r.data)

export const updateAppointmentStatus = (id, status) =>
  api.put(`/appointments/${id}/status`, null, { params: { status } }).then((r) => r.data)

export const deleteAppointment = (id) => api.delete(`/appointments/${id}`).then((r) => r.data)

export const getAppointmentStatuses = () => api.get('/appointments/statuses').then((r) => r.data)

export const getAppointmentTypes = () => api.get('/appointments/types').then((r) => r.data)
