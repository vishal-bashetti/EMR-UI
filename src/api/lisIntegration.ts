import api from './axios'

export interface LISStatus {
  configured: boolean
  connected: boolean
  status: 'NOT_CONFIGURED' | 'CONNECTED' | 'TEMPORARILY_UNAVAILABLE' | 'KEY_REJECTED' | 'INCOMPATIBLE' | 'UNKNOWN'
  host: string | null
  connection_id?: string | null
  last_checked?: string | null
  account?: string | null
}

export interface LISTest {
  code: string
  name: string
  department: string
  price: number
  unit: string
  sampleType: string
  loinc: string
}

export interface LISCombo {
  code: string
  name: string
  testCodes: string[]
  price: number
}

export interface LISCatalog {
  tests: LISTest[]
  combos: LISCombo[]
}

export const getLISStatus = (checkHealth: boolean = false): Promise<LISStatus> =>
  api.get('/integrations/lis/status', { params: { check_health: checkHealth } }).then(r => r.data)

export const connectLIS = (data: { host: string; api_key: string }): Promise<{ connected: boolean; host: string; status: string; account: string }> =>
  api.post('/integrations/lis/connect', data).then(r => r.data)

export const disconnectLIS = (): Promise<{ connected: boolean; status: string }> =>
  api.delete('/integrations/lis/disconnect').then(r => r.data)

export const getLISCatalog = (): Promise<LISCatalog> =>
  api.get('/integrations/lis/catalog').then(r => r.data)

export const createLISOrder = (data: {
  patient_id: number
  test_codes: string[]
  package_codes?: string[]
  source_id: string
  notes?: string
}): Promise<any> => api.post('/integrations/lis/orders', data).then(r => r.data)
