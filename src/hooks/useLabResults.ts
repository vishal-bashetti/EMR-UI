import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getLabCatalog,
  createLabCatalogItem,
  getLabResults,
  getLabResultsHistory,
  updateLabResult,
} from '../api/labResults'
import type { LabResultInput } from '../types'

export const useLabCatalog = () => useQuery({ queryKey: ['labCatalog'], queryFn: getLabCatalog })

export const useCreateLabCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createLabCatalogItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labCatalog'] }),
  })
}

export const useLabResultsHistory = (patientId?: number, testName?: string) =>
  useQuery({
    queryKey: ['labResultsHistory', patientId, testName],
    queryFn: () => getLabResultsHistory(patientId as number, testName, 10),
    enabled: !!patientId && !!testName,
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
