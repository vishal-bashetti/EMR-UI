import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment,
  getAppointmentStatuses,
  createAppointmentStatus,
  getAppointmentTypes,
} from '../api/appointments'
import type { AppointmentInput, AppointmentsQuery } from '../types'

export const useCreateAppointmentStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAppointmentStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointmentStatuses'] }),
  })
}

export const useAppointments = (params?: AppointmentsQuery) =>
  useQuery({ queryKey: ['appointments', params], queryFn: () => getAppointments(params) })

export const useAppointment = (id?: number | null) =>
  useQuery({
    queryKey: ['appointment', id],
    queryFn: () => getAppointment(id as number),
    enabled: !!id,
  })

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
    mutationFn: ({ id, data }: { id: number; data: AppointmentInput }) => updateAppointment(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['appointment', variables.id] })
    },
  })
}

export const useUpdateAppointmentStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateAppointmentStatus(id, status),
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

export const useAppointmentStatuses = () =>
  useQuery({ queryKey: ['appointmentStatuses'], queryFn: getAppointmentStatuses })

export const useAppointmentTypes = () =>
  useQuery({ queryKey: ['appointmentTypes'], queryFn: getAppointmentTypes })
