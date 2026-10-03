import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export interface ClinicClosures { weekly_days_off: number[]; holidays: { date: string; name: string }[] }
export const useClinicClosures = () => useQuery({ queryKey: ['clinicClosures'],
  queryFn: () => api.get<ClinicClosures>('/settings/closures').then(r => r.data) })

export function closureReason(closures: ClinicClosures | undefined, date: string) {
  if (!closures || !date) return null
  const holiday = closures.holidays.find(h => h.date === date)
  if (holiday) return holiday.name
  return closures.weekly_days_off.includes(new Date(`${date}T00:00:00`).getDay()) ? 'Weekly holiday' : null
}
