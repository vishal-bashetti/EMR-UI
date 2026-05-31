import api from './axios'

export const getVitalConfigs = () => api.get('/visits/vitals/config').then(r => r.data)
export const createVitalConfig = (data) => api.post('/visits/vitals/config', data).then(r => r.data)
export const getLastVisit = (patientId) => api.get(`/visits/last/${patientId}`).then(r => r.data)
export const getVisitHistory = (patientId, limit = 6) =>
  api.get(`/visits/history/${patientId}`, { params: { limit } }).then(r => r.data)
export const createVisit = (data) => api.post('/visits/', data).then(r => r.data)
