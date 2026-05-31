import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMe,
  getUsers,
  getDoctors,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  createPermission,
} from '../api/users'
import type { UserInput, RoleInput } from '../types'

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: getMe })

export const useUsers = () => useQuery({ queryKey: ['users'], queryFn: getUsers })

export const useDoctors = () => useQuery({ queryKey: ['doctors'], queryFn: getDoctors })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserInput }) => updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export const useRoles = () => useQuery({ queryKey: ['roles'], queryFn: getRoles })

export const useCreateRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export const useUpdateRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoleInput }) => updateRole(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export const useDeleteRole = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export const usePermissions = () => useQuery({ queryKey: ['permissions'], queryFn: getPermissions })

export const useCreatePermission = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPermission,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['permissions'] }),
  })
}
