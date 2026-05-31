import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAppointments, createAppointment, updateAppointment, updateAppointmentStatus, deleteAppointment,
  getAppointmentStatuses, createAppointmentStatus,
} from '../api/appointments'

export const useAppointmentStatuses = () =>
  useQuery({ queryKey: ['appointmentStatuses'], queryFn: getAppointmentStatuses })

export const useCreateAppointmentStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAppointmentStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointmentStatuses'] }),
  })
}

export const useAppointments = (params) =>
  useQuery({ queryKey: ['appointments', params], queryFn: () => getAppointments(params) })

export const useCreateAppointment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export const useUpdateAppointment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => updateAppointment(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export const useUpdateAppointmentStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => updateAppointmentStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}

export const useDeleteAppointment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })
}
