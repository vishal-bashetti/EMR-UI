import api from './axios'

export const getLabCatalog = () => api.get('/lab_catalog').then(r => r.data)
export const createLabCatalogItem = (data) => api.post('/lab_catalog', data).then(r => r.data)
export const getLabResults = (patientId) =>
  api.get(`/patients/${patientId}/lab_results`).then(r => r.data)
export const getLabResultsHistory = (patientId, testName, limit = 6) =>
  api.get(`/patients/${patientId}/lab_results/history`, { params: { test_name: testName, limit } }).then(r => r.data)
export const createLabResult = (data) => api.post('/lab_results', data).then(r => r.data)
export const getLabResult = (id) => api.get(`/lab_results/${id}`).then(r => r.data)
export const updateLabResult = (id, data) => api.put(`/lab_results/${id}`, data).then(r => r.data)
