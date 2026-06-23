import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getLabCatalog,
  createLabCatalogItem,
  updateLabCatalogItem,
  deleteLabCatalogItem,
  getComboCatalog,
  createComboCatalogItem,
  updateComboCatalogItem,
  deleteComboCatalogItem,
  orderCombo,
  getLabQueue,
  getLabResults,
  getLabResultsHistory,
  getLatestLabResults,
  createLabResult,
  updateLabResult,
  deleteLabResult,
  getLabResultsByDate,
} from '../api/labResults'
import type { LabResultInput, OrderComboPayload, LabCatalogInput, LabComboCatalogInput } from '../types'

export const useLabCatalog = (query?: string, options?: any) => useQuery({ 
  queryKey: ['labCatalog', query], 
  queryFn: () => getLabCatalog(query),
  ...options,
  enabled: (query === undefined || query.length > 1) && (options?.enabled ?? true),
})

export const useCreateLabCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createLabCatalogItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labCatalog'] }),
  })
}

export const useUpdateLabCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: LabCatalogInput }) => updateLabCatalogItem(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labCatalog'] }),
  })
}

export const useDeleteLabCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteLabCatalogItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labCatalog'] }),
  })
}

export const useComboCatalog = (query?: string, options?: any) => useQuery({
  queryKey: ['comboCatalog', query],
  queryFn: () => getComboCatalog(query),
  ...options,
})

export const useCreateComboCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createComboCatalogItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comboCatalog'] }),
  })
}

export const useUpdateComboCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: LabComboCatalogInput }) => updateComboCatalogItem(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comboCatalog'] }),
  })
}

export const useDeleteComboCatalogItem = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteComboCatalogItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comboCatalog'] }),
  })
}

export const useOrderCombo = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: orderCombo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labQueue'] }),
  })
}

export const useCreateLabResult = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createLabResult,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labQueue'] }),
  })
}

export const useLabQueue = (status?: string, options?: any) => useQuery({
  queryKey: ['labQueue', status],
  queryFn: () => getLabQueue(status),
  refetchInterval: 30_000,
  staleTime: 15_000,
  ...options,
})

export const useLabResultsHistory = (patientId?: number, testName?: string, limit = 10, options?: any) =>
  useQuery({
    queryKey: ['labResultsHistory', patientId, testName, limit],
    queryFn: () => getLabResultsHistory(patientId as number, testName, limit),
    ...options,
    enabled: !!patientId && (options?.enabled ?? true),
  })

export const useLatestLabResults = (patientId?: number, options?: any) =>
  useQuery({
    queryKey: ['latestLabResults', patientId],
    queryFn: () => getLatestLabResults(patientId as number),
    ...options,
    enabled: !!patientId && (options?.enabled ?? true),
  })

export const useLabResults = (patientId?: number, options?: any) =>
  useQuery({
    queryKey: ['labResults', patientId],
    queryFn: () => getLabResults(patientId as number),
    ...options,
    enabled: !!patientId && (options?.enabled ?? true),
  })

export const useUpdateLabResult = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: LabResultInput }) => updateLabResult(id, data),
    onSuccess: (_, variables) => {
      if (variables.data.patient_id) {
        qc.invalidateQueries({ queryKey: ['labResults', variables.data.patient_id] })
        qc.invalidateQueries({ queryKey: ['latestLabResults', variables.data.patient_id] })
        qc.invalidateQueries({ queryKey: ['labResultsHistory', variables.data.patient_id] })
      } else {
        qc.invalidateQueries({ queryKey: ['labResults'] })
      }
      qc.invalidateQueries({ queryKey: ['labQueue'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export const useDeleteLabResult = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteLabResult,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['labResults'] })
      qc.invalidateQueries({ queryKey: ['labQueue'] })
    },
  })
}

export const useLabResultsByDate = (date?: string, options?: any) =>
  useQuery({
    queryKey: ['labResultsByDate', date],
    queryFn: () => getLabResultsByDate(date as string),
    ...options,
    enabled: !!date && (options?.enabled ?? true),
  })
