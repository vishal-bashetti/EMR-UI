import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPatients, getPatient, createPatient, updatePatient, deletePatient, getPatientAiSummary } from '../api/patients'
import type { PatientInput } from '../types'

export const usePatients = (search?: string, options?: any) =>
  useQuery({ queryKey: ['patients', search], queryFn: () => getPatients(search), ...options })

export const usePatient = (id?: number) =>
  useQuery({ queryKey: ['patients', id], queryFn: () => getPatient(id as number), enabled: !!id })

export const usePatientAiSummary = (id?: number, enabled: boolean = false) =>
  useQuery({ queryKey: ['patients', id, 'ai_summary'], queryFn: () => getPatientAiSummary(id as number), enabled: !!id && enabled, staleTime: Infinity })

export const useCreatePatient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPatient,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export const useUpdatePatient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatientInput }) => updatePatient(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}

export const useDeletePatient = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deletePatient,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  })
}
