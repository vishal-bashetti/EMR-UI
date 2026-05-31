import { useQuery } from '@tanstack/react-query'
import { getSettings } from '../api/settings'
import type { SettingsMap } from '../types'

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
