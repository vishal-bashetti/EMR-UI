import api from './axios'

export const getMe = () => api.get('/users/me').then((r) => r.data)

export const getUsers = () => api.get('/users/').then((r) => r.data)

export const getDoctors = () => api.get('/users/doctors').then((r) => r.data)
