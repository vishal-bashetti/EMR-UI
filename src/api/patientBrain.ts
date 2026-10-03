import api from './axios'

export interface PatientProblemItem {
  id: number
  problem_name: string
  problem_code?: string | null
  status: string
  diagnosed_at?: string | null
  priority: string
}

export interface MetricTrendItem {
  metric_name: string
  category: 'lab' | 'vital'
  unit?: string | null
  reference_range?: string | null
  latest_value?: number | null
  latest_display: string
  latest_date?: string | null
  previous_value?: number | null
  previous_display?: string | null
  previous_date?: string | null
  delta?: number | null
  percent_change?: number | null
  direction: 'increased' | 'decreased' | 'stable'
  consecutive_direction_count: number
  clinical_status: 'normal' | 'abnormal_high' | 'abnormal_low' | 'critical'
  history: Array<{ date: string; value: number; display_value: string; source_id?: number }>
}

export interface OpenLoopItem {
  id: number
  patient_id: number
  type: string
  description: string
  target_code?: string | null
  expected_date?: string | null
  status: 'pending' | 'completed' | 'cancelled' | 'overdue'
  is_overdue: boolean
  days_overdue: number
  completed_at?: string | null
  result_id?: number | null
  completion_note?: string | null
  created_at: string
}

export interface MetricChangeItem {
  test_or_vital: string
  previous: string
  current: string
  delta?: string | null
  direction: 'increased' | 'decreased' | 'stable'
  severity: 'better' | 'worse' | 'neutral'
}

export interface ChangesSinceLastVisit {
  patient_id: number
  last_visit_date?: string | null
  days_since_last_visit?: number | null
  new_results: Array<Record<string, any>>
  medication_changes: Array<{
    id: number
    drug_name: string
    action: string
    old_dose?: string | null
    new_dose?: string | null
    reason?: string | null
    reason_details?: string | null
    created_at: string
  }>
  new_diagnoses: string[]
  completed_orders: Array<Record<string, any>>
  pending_orders: OpenLoopItem[]
  new_documents: Array<Record<string, any>>
  new_referrals: Array<Record<string, any>>
  important_metric_changes: MetricChangeItem[]
}

export interface PreparePatientBrief {
  patient: {
    id: number
    name: string
    age?: number | null
    gender?: string | null
    opd_number?: string | null
    blood_group?: string | null
  }
  reason_for_visit?: string | null
  active_problems: PatientProblemItem[]
  allergies: Array<{ allergen: string; severity: string }>
  since_last_visit_changes: MetricChangeItem[]
  new_completed_reports: Array<Record<string, any>>
  pending_loops: OpenLoopItem[]
  overdue_loops: OpenLoopItem[]
  last_plan: Record<string, any>
  why_previous_medications_changed: Array<{
    drug_name: string
    action: string
    old_dose?: string | null
    new_dose?: string | null
    reason: string
    details?: string | null
    date: string
  }>
  attention_items: Array<{
    type: string
    title: string
    detail: string
    source_type?: string
  }>
}

export interface PatientBrainData {
  patient_id: number
  version: number
  generated_at: string
  active_problems_count: number
  open_loops_count: number
  overdue_loops_count: number
  recent_changes_count: number
  problems: Array<{
    id: number
    name: string
    status: string
    diagnosed_at?: string | null
    medications: string[]
    latest_metrics: Record<string, any>
    trends: Record<string, number[]>
    pending: string[]
  }>
  needs_attention: Array<{ type: string; title: string; detail: string; source_type?: string }>
  needs_decision: Array<{ type: string; title: string; detail: string; source_type?: string }>
  fyi: Array<{ type: string; title: string; detail: string; source_type?: string }>
  open_loops: OpenLoopItem[]
  active_medications: Array<{ id: number; drug_name: string; dosage?: string; frequency?: string }>
  latest_vitals: Record<string, string>
}

export interface TraceableSource {
  source_type: string
  source_id?: number | null
  date?: string | null
  label: string
}

export interface PGResponse {
  intent: string
  facts: string[]
  pg_observations: string[]
  answer_text: string
  sources: TraceableSource[]
  active_topic?: string | null
  active_problem?: string | null
  tokens_used: number
  latency_ms: number
  estimated_cost: number
}

export interface MedicationIntelligence {
  patient_id: number
  medications: Array<{
    drug_name: string
    started_at: string
    status: string
    stopped_at?: string | null
    stop_reason?: string | null
    stop_details?: string | null
    latest_dose?: string | null
    last_changed: string
    change_count: number
    history: Array<{
      date: string
      action: string
      transition: string
      reason: string
      details: string
    }>
  }>
}

export interface PlanActionCandidate {
  type: string
  description: string
  drug_name?: string | null
  dose?: string | null
  test_name?: string | null
  due_in?: string | null
  expected_days?: number | null
}

export interface PlanStructureData {
  raw_text: string
  actions: PlanActionCandidate[]
  summary_preview: string[]
}

// -------------------------------------------------------------------------
// API Call Functions
// -------------------------------------------------------------------------
export async function getPatientBrain(patientId: number, refresh: boolean = false): Promise<PatientBrainData> {
  const { data } = await api.get<PatientBrainData>(`/patients/${patientId}/brain`, {
    params: { refresh },
  })
  return data
}

export async function getPreparePatientBrief(patientId: number): Promise<PreparePatientBrief> {
  const { data } = await api.get<PreparePatientBrief>(`/patients/${patientId}/prepare`)
  return data
}

export async function getChangesSinceLastVisit(patientId: number): Promise<ChangesSinceLastVisit> {
  const { data } = await api.get<ChangesSinceLastVisit>(`/patients/${patientId}/changes-since-last-visit`)
  return data
}

export async function getPatientTrends(patientId: number): Promise<{
  patient_id: number
  lab_trends: MetricTrendItem[]
  vital_trends: MetricTrendItem[]
}> {
  const { data } = await api.get(`/patients/${patientId}/trends`)
  return data
}

export async function getPatientOpenLoops(patientId: number, status?: string): Promise<OpenLoopItem[]> {
  const { data } = await api.get<OpenLoopItem[]>(`/patients/${patientId}/open-loops`, {
    params: { status },
  })
  return data
}

export async function createOpenLoop(patientId: number, payload: {
  type: string
  description: string
  expected_date?: string | null
  target_code?: string | null
  problem_id?: number | null
}): Promise<OpenLoopItem> {
  const { data } = await api.post<OpenLoopItem>(`/patients/${patientId}/open-loops`, payload)
  return data
}

export async function closeOpenLoop(patientId: number, loopId: number, note?: string): Promise<OpenLoopItem> {
  const { data } = await api.post<OpenLoopItem>(`/patients/${patientId}/open-loops/${loopId}/close`, {
    completion_note: note,
  })
  return data
}

export async function getMedicationIntelligence(patientId: number, drug?: string): Promise<MedicationIntelligence> {
  const { data } = await api.get<MedicationIntelligence>(`/patients/${patientId}/medication-intelligence`, {
    params: { drug },
  })
  return data
}

export async function recordMedicationEvent(patientId: number, payload: {
  drug_name: string
  action: string
  old_dose?: string | null
  new_dose?: string | null
  reason?: string | null
  reason_details?: string | null
  visit_id?: number | null
}): Promise<any> {
  const { data } = await api.post(`/patients/${patientId}/medication-events`, payload)
  return data
}

export async function askPGAssistant(patientId: number, question: string, activeProblem?: string, activeTopic?: string): Promise<PGResponse> {
  const { data } = await api.post<PGResponse>(`/patients/${patientId}/pg-assistant/ask`, {
    question,
    active_problem: activeProblem,
    active_topic: activeTopic,
  })
  return data
}

export async function structurePlanText(patientId: number, rawText: string): Promise<PlanStructureData> {
  const { data } = await api.post<PlanStructureData>(`/patients/${patientId}/plan/structure`, {
    raw_text: rawText,
  })
  return data
}

export async function commitPlanActions(patientId: number, actions: PlanActionCandidate[], visitId?: number): Promise<any> {
  const { data } = await api.post(`/patients/${patientId}/plan/commit`, {
    visit_id: visitId,
    actions,
  })
  return data
}

export async function getClinicAttentionQueue(page = 1, pageSize = 20): Promise<{
  needs_decision: Array<any>
  needs_attention: Array<any>
  fyi: Array<any>
  total_count: number
  page: number
  page_size: number
  total_patients: number
  scanned_patients: number
  has_next: boolean
  appointment_date: string
}> {
  const { data } = await api.get('/dashboard/attention-queue', { params: { page, page_size: pageSize } })
  return data
}

export async function submitBrainCorrection(patientId: number, payload: {
  entity_type: string
  entity_id?: number | null
  source_value?: string | null
  derived_value?: string | null
  doctor_correction: string
}): Promise<any> {
  const { data } = await api.post(`/patients/${patientId}/brain/correct`, payload)
  return data
}
