import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export interface PeriodStats {
  total_patients: number
  consultations: {
    patients: number
    total_appointments: number
    revenue: number
  }
  blood_tests: {
    patients: number
    total_tests: number
    revenue: number
  }
  others: {
    revenue: number
  }
}

export interface DashboardStats {
  today: PeriodStats
  this_week: PeriodStats
  this_month: PeriodStats
}

export const getDashboardStats = (): Promise<DashboardStats> =>
  api.get<DashboardStats>('/dashboard/stats').then((r) => r.data)

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
  })
