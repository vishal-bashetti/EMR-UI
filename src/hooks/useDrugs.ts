import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDrugs, createDrug, updateDrug } from '../api/drugs'
import type { DrugInput } from '../types'

export const useDrugs = (search?: string) =>
  useQuery({
    queryKey: ['drugs', search],
    queryFn: () => getDrugs(search),
    enabled: !!(search && search.length >= 1),
  })

export const useAllDrugs = () =>
  useQuery({ queryKey: ['drugs', 'all'], queryFn: () => getDrugs(undefined, 200) })

export const useCreateDrug = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createDrug,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drugs'] }),
  })
}

export const useUpdateDrug = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DrugInput }) => updateDrug(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drugs'] }),
  })
}
