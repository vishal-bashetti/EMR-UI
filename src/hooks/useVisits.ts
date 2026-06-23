import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVitalConfigs, getLastVisit, getVisitHistory, createVisit, updateVisit } from '../api/visits'
import type { VisitPayload } from '../types'

export const useVitalConfigs = () => useQuery({ queryKey: ['vitalConfigs'], queryFn: getVitalConfigs })

export const useLastVisit = (patientId?: number) =>
  useQuery({
    queryKey: ['lastVisit', patientId],
    queryFn: () => getLastVisit(patientId as number),
    enabled: !!patientId,
  })

export const useVisitHistory = (patientId?: number, limit = 6, options?: any) =>
  useQuery({
    queryKey: ['visitHistory', patientId, limit],
    queryFn: () => getVisitHistory(patientId as number, limit),
    ...options,
    enabled: !!patientId && (options?.enabled ?? true),
  })

export const useCreateVisit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createVisit,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['visitHistory', vars.patient_id] })
      qc.invalidateQueries({ queryKey: ['lastVisit', vars.patient_id] })
      qc.invalidateQueries({ queryKey: ['labResults', vars.patient_id] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

export const useUpdateVisit = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: VisitPayload }) => updateVisit(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['visitHistory', vars.data.patient_id] })
      qc.invalidateQueries({ queryKey: ['lastVisit', vars.data.patient_id] })
      qc.invalidateQueries({ queryKey: ['labResults', vars.data.patient_id] })
      qc.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}
