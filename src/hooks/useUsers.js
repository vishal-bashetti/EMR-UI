import { useQuery } from '@tanstack/react-query'
import { getMe, getUsers, getDoctors } from '../api/users'

export const useMe = () =>
  useQuery({ queryKey: ['me'], queryFn: getMe })

export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: getUsers })

export const useDoctors = () =>
  useQuery({ queryKey: ['doctors'], queryFn: getDoctors })
