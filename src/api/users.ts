import api from './axios'
import type { User, UserInput, Role, RoleInput, Permission, PermissionInput } from '../types'

export const getMe = (): Promise<User> => api.get<User>('/users/me').then((r) => r.data)
export const getUsers = (): Promise<User[]> => api.get<User[]>('/users/').then((r) => r.data)
export const getDoctors = (): Promise<User[]> => api.get<User[]>('/users/doctors').then((r) => r.data)
export const createUser = (data: UserInput): Promise<User> => api.post<User>('/users/', data).then((r) => r.data)
export const updateUser = (id: number, data: UserInput): Promise<User> =>
  api.put<User>(`/users/${id}`, data).then((r) => r.data)
export const deleteUser = (id: number): Promise<{ detail: string }> =>
  api.delete<{ detail: string }>(`/users/${id}`).then((r) => r.data)
export const updateUserTabs = (id: number, tabs: string[]): Promise<User> =>
  api.put<User>(`/users/${id}/tabs`, { tab_names: tabs }).then((r) => r.data)
export const uploadSignature = (id: number, file: File): Promise<{ detail: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<{ detail: string }>(`/users/${id}/signature`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const getRoles = (): Promise<Role[]> => api.get<Role[]>('/users/roles').then((r) => r.data)
export const createRole = (data: RoleInput): Promise<Role> => api.post<Role>('/users/roles', data).then((r) => r.data)
export const updateRole = (id: number, data: RoleInput): Promise<Role> =>
  api.put<Role>(`/users/roles/${id}`, data).then((r) => r.data)
export const deleteRole = (id: number): Promise<{ detail: string }> =>
  api.delete<{ detail: string }>(`/users/roles/${id}`).then((r) => r.data)

export const getPermissions = (): Promise<Permission[]> =>
  api.get<Permission[]>('/users/permissions').then((r) => r.data)
export const createPermission = (data: PermissionInput): Promise<Permission> =>
  api.post<Permission>('/users/permissions', data).then((r) => r.data)
