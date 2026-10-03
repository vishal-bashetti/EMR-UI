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
import { useLISCatalog, useLISStatus } from './useLISIntegration'
import type { LabResult, LabQueueResponseItem, LabResultInput, OrderComboPayload, LabCatalogInput, LabComboCatalogInput, LabCatalogItem, LabComboCatalogItem } from '../types'

function stableCodeToId(code: string): number {
  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = (hash << 5) - hash + code.charCodeAt(i)
    hash |= 0
  }
  return 100000 + Math.abs(hash % 800000)
}

export const useLabCatalog = (query?: string, options?: any) => {
  const status = useLISStatus()
  const isConfigured = !!status.data?.configured
  const isConnected = !!status.data?.connected

  const local = useQuery<LabCatalogItem[]>({
    queryKey: ['labCatalog', query],
    queryFn: () => getLabCatalog(query),
    ...options,
    enabled: status.isSuccess && !isConfigured && (options?.enabled ?? true),
  })

  const remote = useLISCatalog(status.isSuccess && isConfigured && (options?.enabled ?? true))

  const remoteData: LabCatalogItem[] | undefined = isConfigured
    ? remote.data?.tests
        .filter(item => !query || item.name.toLowerCase().includes(query.toLowerCase()) || item.code.toLowerCase().includes(query.toLowerCase()))
        .map(item => ({
          id: stableCodeToId(`TEST-${item.code}`),
          lis_code: item.code,
          name: item.name,
          description: item.department,
          price: item.price,
          unit: item.unit,
          min_value: null,
          max_value: null,
          is_active: true,
        }))
    : undefined

  // While LIS mode is configured, available tests must come exclusively from LIS.
  // Never fall back to local EMR catalog during an outage or error.
  const data: LabCatalogItem[] | undefined = isConfigured ? (remoteData || []) : local.data

  return {
    ...(isConfigured ? remote : local),
    data,
    isLoading: status.isLoading || (isConfigured ? remote.isLoading : local.isLoading),
    isConfigured,
    isConnected,
  }
}

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

export const useComboCatalog = (query?: string, options?: any) => {
  const status = useLISStatus()
  const isConfigured = !!status.data?.configured
  const isConnected = !!status.data?.connected

  const local = useQuery<LabComboCatalogItem[]>({
    queryKey: ['comboCatalog', query],
    queryFn: () => getComboCatalog(query),
    ...options,
    enabled: status.isSuccess && !isConfigured && (options?.enabled ?? true),
  })

  const remote = useLISCatalog(status.isSuccess && isConfigured && (options?.enabled ?? true))

  const remoteData: LabComboCatalogItem[] | undefined = isConfigured
    ? remote.data?.combos
        .filter(item => !query || item.name.toLowerCase().includes(query.toLowerCase()) || item.code.toLowerCase().includes(query.toLowerCase()))
        .map(item => ({
          id: stableCodeToId(`COMBO-${item.code}`),
          lis_code: item.code,
          lis_test_codes: item.testCodes,
          name: item.name,
          description: 'Provided by connected LIS',
          test_ids: [],
          price: item.price,
          is_active: true,
        }))
    : undefined

  const data: LabComboCatalogItem[] | undefined = isConfigured ? (remoteData || []) : local.data

  return {
    ...(isConfigured ? remote : local),
    data,
    isLoading: status.isLoading || (isConfigured ? remote.isLoading : local.isLoading),
    isConfigured,
    isConnected,
  }
}

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

export const useLabQueue = (status?: string, options?: any) => useQuery<LabQueueResponseItem[]>({
  queryKey: ['labQueue', status],
  queryFn: () => getLabQueue(status),
  refetchInterval: 30_000,
  staleTime: 15_000,
  ...options,
})

export const useLabResultsHistory = (patientId?: number, testName?: string, limit = 10, options?: any) =>
  useQuery<LabResult[]>({
    queryKey: ['labResultsHistory', patientId, testName, limit],
    queryFn: () => getLabResultsHistory(patientId as number, testName, limit),
    ...options,
    enabled: !!patientId && (options?.enabled ?? true),
  })

export const useLatestLabResults = (patientId?: number, options?: any) =>
  useQuery<LabResult[]>({
    queryKey: ['latestLabResults', patientId],
    queryFn: () => getLatestLabResults(patientId as number),
    ...options,
    enabled: !!patientId && (options?.enabled ?? true),
  })

export const useLabResults = (patientId?: number, options?: any) =>
  useQuery<LabResult[]>({
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
  useQuery<LabQueueResponseItem[]>({
    queryKey: ['labResultsByDate', date],
    queryFn: () => getLabResultsByDate(date as string),
    ...options,
    enabled: !!date && (options?.enabled ?? true),
  })
