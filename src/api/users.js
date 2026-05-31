import api from './axios'

export const getMe = () => api.get('/users/me').then((r) => r.data)
export const getUsers = () => api.get('/users/').then((r) => r.data)
export const getDoctors = () => api.get('/users/doctors').then((r) => r.data)
export const createUser = (data) => api.post('/users/', data).then((r) => r.data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data).then((r) => r.data)
export const deleteUser = (id) => api.delete(`/users/${id}`).then((r) => r.data)

export const getRoles = () => api.get('/users/roles').then((r) => r.data)
export const createRole = (data) => api.post('/users/roles', data).then((r) => r.data)
export const updateRole = (id, data) => api.put(`/users/roles/${id}`, data).then((r) => r.data)
export const deleteRole = (id) => api.delete(`/users/roles/${id}`).then((r) => r.data)

export const getPermissions = () => api.get('/users/permissions').then((r) => r.data)
export const createPermission = (data) => api.post('/users/permissions', data).then((r) => r.data)
