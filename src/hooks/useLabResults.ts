import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getLabCatalog,
  createLabCatalogItem,
  getLabResults,
  getLabResultsHistory,
  getLatestLabResults,
  updateLabResult,
} from '../api/labResults'
import type { LabResultInput } from '../types'

export const useLabCatalog = (query?: string) => useQuery({ 
  queryKey: ['labCatalog', query], 
  queryFn: () => getLabCatalog(query),
  enabled: query === undefined || query.length > 1,
})

export const useCreateLabCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createLabCatalogItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labCatalog'] }),
  })
}

export const useLabResultsHistory = (patientId?: number, testName?: string, limit = 10) =>
  useQuery({
    queryKey: ['labResultsHistory', patientId, testName, limit],
    queryFn: () => getLabResultsHistory(patientId as number, testName, limit),
    enabled: !!patientId,
  })

export const useLatestLabResults = (patientId?: number) =>
  useQuery({
    queryKey: ['latestLabResults', patientId],
    queryFn: () => getLatestLabResults(patientId as number),
    enabled: !!patientId,
  })

export const useLabResults = (patientId?: number) =>
  useQuery({
    queryKey: ['labResults', patientId],
    queryFn: () => getLabResults(patientId as number),
    enabled: !!patientId,
  })

export const useUpdateLabResult = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: LabResultInput }) => updateLabResult(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labResults'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
