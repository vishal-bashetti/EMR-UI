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
