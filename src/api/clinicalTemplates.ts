import api from './axios'

export interface ClinicalTemplate {
  id: number
  name: string
  type: string
  content: string | null
}

export interface ClinicalTemplateCreate {
  name: string
  type: string
  content: string
}

export const getClinicalTemplates = async (): Promise<ClinicalTemplate[]> => {
  const res = await api.get('/clinical/templates')
  return res.data
}

export const createClinicalTemplate = async (data: ClinicalTemplateCreate): Promise<ClinicalTemplate> => {
  const payload = { ...data, items: [] }
  const res = await api.post('/clinical/templates', payload)
  return res.data
}
