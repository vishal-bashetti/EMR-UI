import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { connectLIS, createLISOrder, disconnectLIS, getLISCatalog, getLISStatus, LISStatus } from '../api/lisIntegration'

export const useLISStatus = (checkHealth = false) =>
  useQuery<LISStatus>({
    queryKey: ['lisIntegrationStatus', checkHealth],
    queryFn: () => getLISStatus(checkHealth),
    staleTime: checkHealth ? 0 : 30_000,
  })

export const useCheckLISHealth = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => getLISStatus(true),
    onSuccess: (data) => {
      qc.setQueryData(['lisIntegrationStatus', false], data)
      qc.invalidateQueries({ queryKey: ['lisIntegrationStatus'] })
    },
  })
}

export const useLISCatalog = (enabled = true) =>
  useQuery({
    queryKey: ['lisIntegrationCatalog'],
    queryFn: getLISCatalog,
    enabled,
    staleTime: 60_000,
  })

export const useConnectLIS = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: connectLIS,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lisIntegrationStatus'] })
      qc.invalidateQueries({ queryKey: ['lisIntegrationCatalog'] })
      qc.invalidateQueries({ queryKey: ['labCatalog'] })
      qc.invalidateQueries({ queryKey: ['comboCatalog'] })
    },
  })
}

export const useDisconnectLIS = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: disconnectLIS,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lisIntegrationStatus'] })
      qc.invalidateQueries({ queryKey: ['lisIntegrationCatalog'] })
      qc.invalidateQueries({ queryKey: ['labCatalog'] })
      qc.invalidateQueries({ queryKey: ['comboCatalog'] })
    },
  })
}

export const useCreateLISOrder = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createLISOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['labQueue'] }),
  })
}
