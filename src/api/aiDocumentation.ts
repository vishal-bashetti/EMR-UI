import api from './axios'
export interface DocumentationInput {
  reason: string; notes: string; complaints: string[]; vitals: string[];
  diagnoses: string[]; treatments: string[]; prescriptions: string[]; advice: string; followup: string;
}
export interface DocumentationDraft {
  subjective: string; objective: string; assessment: string; plan: string;
  mode: 'ai' | 'template'; missing_sections: string[]; source_digest: string;
}
export const getDocumentationStatus = () => api.get<{ configured: boolean }>('/ai/status').then(r => r.data)
export const prepareDocumentation = (data: DocumentationInput) => api.post<DocumentationDraft>('/ai/documentation', data, { timeout: 35000 }).then(r => r.data)
