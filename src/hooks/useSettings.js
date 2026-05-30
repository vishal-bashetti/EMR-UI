import { useQuery } from '@tanstack/react-query'
import { getSettings } from '../api/settings'

export const useSettings = () =>
  useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const data = await getSettings()
      // Convert array of key/value pairs to an object map
      const settingsMap = {}
      data.forEach(item => {
        settingsMap[item.key] = item.value
      })
      return settingsMap
    }
  })
