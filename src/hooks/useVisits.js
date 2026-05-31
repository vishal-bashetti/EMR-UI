import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVitalConfigs, getLastVisit, getVisitHistory, createVisit } from '../api/visits'

export const useVitalConfigs = () =>
  useQuery({ queryKey: ['vitalConfigs'], queryFn: getVitalConfigs })

export const useLastVisit = (patientId) =>
  useQuery({ queryKey: ['lastVisit', patientId], queryFn: () => getLastVisit(patientId), enabled: !!patientId })

export const useVisitHistory = (patientId, limit = 6) =>
  useQuery({
    queryKey: ['visitHistory', patientId, limit],
    queryFn: () => getVisitHistory(patientId, limit),
    enabled: !!patientId,
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
