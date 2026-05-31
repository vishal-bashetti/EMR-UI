import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLabCatalog, createLabCatalogItem, getLabResults, getLabResultsHistory, updateLabResult } from '../api/labResults'

export const useLabCatalog = () =>
  useQuery({ queryKey: ['labCatalog'], queryFn: getLabCatalog })

export const useCreateLabCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createLabCatalogItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labCatalog'] }),
  })
}

export const useLabResultsHistory = (patientId, testName) =>
  useQuery({
    queryKey: ['labResultsHistory', patientId, testName],
    queryFn: () => getLabResultsHistory(patientId, testName, 10),
    enabled: !!patientId && !!testName,
  })

export const useLabResults = (patientId) =>
  useQuery({
    queryKey: ['labResults', patientId],
    queryFn: () => getLabResults(patientId),
    enabled: !!patientId,
  })

export const useUpdateLabResult = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => updateLabResult(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labResults'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}
