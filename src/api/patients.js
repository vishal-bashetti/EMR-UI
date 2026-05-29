import api from './axios'

export const getPatients = (search) =>
  api.get('/patients/', { params: search ? { search } : {} }).then((r) => r.data)

export const getPatient = (id) => api.get(`/patients/${id}`).then((r) => r.data)

export const createPatient = (data) => api.post('/patients/', data).then((r) => r.data)

export const updatePatient = (id, data) => api.put(`/patients/${id}`, data).then((r) => r.data)

export const deletePatient = (id) => api.delete(`/patients/${id}`).then((r) => r.data)
