import api from './axios'

export const getDrugs = (search, limit = 50) =>
  api.get('/drugs/', { params: { search, limit } }).then(r => r.data)
export const createDrug = (data) => api.post('/drugs/', data).then(r => r.data)
export const getDrug = (id) => api.get(`/drugs/${id}`).then(r => r.data)
export const updateDrug = (id, data) => api.put(`/drugs/${id}`, data).then(r => r.data)
