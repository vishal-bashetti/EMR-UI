import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClinicalTemplates, createClinicalTemplate, ClinicalTemplate, ClinicalTemplateCreate } from '../api/clinicalTemplates'

export const useClinicalTemplates = () => {
  return useQuery({
    queryKey: ['clinicalTemplates'],
    queryFn: getClinicalTemplates,
  })
}

export const useCreateClinicalTemplate = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClinicalTemplateCreate) => createClinicalTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinicalTemplates'] })
    },
  })
}
