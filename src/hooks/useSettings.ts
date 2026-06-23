import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, getClinic, updateClinic, uploadClinicLogo } from '../api/settings'
import type { SettingsMap, Clinic, ClinicInput } from '../types'

export const useSettings = () =>
  useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<SettingsMap> => {
      const data = await getSettings()
      // Convert array of key/value pairs to an object map
      const settingsMap: SettingsMap = {}
      data.forEach((item) => {
        settingsMap[item.key] = item.value
      })
      return settingsMap
    },
  })

export const useClinic = () =>
  useQuery({
    queryKey: ['clinic'],
    queryFn: getClinic,
    staleTime: 5 * 60_000,
  })

export const useUpdateClinic = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ClinicInput) => updateClinic(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] })
    },
  })
}

export const useUploadClinicLogo = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadClinicLogo(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] })
    },
  })
}

import { loginMessagingProvider, logoutMessagingProvider } from '../api/settings'

export const useLoginMessagingProvider = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof loginMessagingProvider>[0]) => loginMessagingProvider(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] })
    },
  })
}

export const useLogoutMessagingProvider = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => logoutMessagingProvider(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic'] })
    },
  })
}
