import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPatients, getPatient, createPatient, updatePatient, deletePatient } from '../api/patients'

export const usePatients = (search) =>
  useQuery({ queryKey: ['patients', search], queryFn: () => getPatients(search) })

export const usePatient = (id) =>
  useQuery({ queryKey: ['patients', id], queryFn: () => getPatient(id), enabled: !!id })

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
    mutationFn: ({ id, data }) => updatePatient(id, data),
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
