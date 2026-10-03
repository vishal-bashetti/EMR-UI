import { useState } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { usePatient, useUpdatePatient } from '../hooks/usePatients'
import { useVisitHistory } from '../hooks/useVisits'
import { useLatestLabResults, useUpdateLabResult } from '../hooks/useLabResults'
import { useClinic } from '../hooks/useSettings'
import { PrintableVisit } from '../components/PrintableVisit'
import { LabTestGraph } from '../components/LabTestGraph'
import { useInvoices, useUpdateInvoiceStatus } from '../hooks/useBilling'
import { useMe } from '../hooks/useUsers'
import { Icons } from '../components/Icons'
import { cn } from '../utils/cn'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { ClinicalHistory } from '../components/ClinicalHistory'
import { getAllergies, getProblems } from '../api/clinicalHistory'
import { addVisitAmendment, submitVisitLabOrder } from '../api/visits'
import { PatientSnapshot } from '../components/PatientSnapshot'
import { UnifiedPatientTimeline } from '../components/UnifiedPatientTimeline'
import { PatientBrainSidebar } from '../components/PatientBrainSidebar'
import { PGAssistantDrawer } from '../components/PGAssistantDrawer'
import { PreparePatientModal } from '../components/PreparePatientModal'
import { ChangesSinceLastVisitModal } from '../components/ChangesSinceLastVisitModal'
import { OpenLoopsModal } from '../components/OpenLoopsModal'
import { MedicationIntelligenceModal } from '../components/MedicationIntelligenceModal'
import type { LabResult, LabResultInput, VisitResponse, Invoice, VisitAmendment, VisitLabOrderIntent, Patient } from '../types'

// ─── Shared style maps ────────────────────────────────────────────────────────

const STATUS_LAB: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Cancelled: 'bg-red-50 text-red-600 border border-red-200',
}
const STATUS_INV: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  Paid: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Cancelled: 'bg-red-50 text-red-600 border border-red-200',
}

// ─── 8. Sticky Patient Header (Section 8) ─────────────────────────────────────

function StickyPatientHeader({
  patient,
  age,
  patientId,
  doctorId,
  allergies,
  problems,
  onEdit,
  onOpenAssistant,
  onOpenPrepareBrief,
}: {
  patient: Patient
  age: number | null
  patientId: number
  doctorId?: number
  allergies: Array<{ id: number; allergen: string; severity: string; reaction?: string | null }>
  problems: Array<{ id: number; title: string; status: string }>
  onEdit?: () => void
  onOpenAssistant: () => void
  onOpenPrepareBrief: () => void
}) {
  const navigate = useNavigate()
  const name = `${patient.first_name} ${patient.last_name}`
  const activeProblems = problems.filter(p => p.status !== 'Resolved')

  return (
    <div className="sticky top-0 z-20 bg-gradient-to-r from-white via-slate-50/50 to-white border-b border-slate-200 shadow-2xs">
      {/* Top minimal breadcrumb */}
      <div className="bg-slate-50/80 border-b border-slate-100 px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate('/patients')}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-900 font-medium transition-colors"
          >
            {Icons.arrowLeft} Patients
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-800">{name}</span>
          <span className="font-mono text-emerald-700 font-medium ml-1">({patient.opd_number || `PT-${patient.id}`})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPrepareBrief}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg cursor-pointer shadow-2xs"
          >
            <span>📋</span> Prepare Brief
          </button>
          <button
            type="button"
            onClick={onOpenAssistant}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 border border-slate-300 px-2.5 py-1 rounded-lg cursor-pointer shadow-2xs"
          >
            <span className="text-emerald-600">✦</span> Ask PG
          </button>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Avatar with blood group indicator */}
          <div className="relative shrink-0">
            <div className="size-11 rounded-xl badge-icon-emerald font-bold text-base flex items-center justify-center shadow-xs">
              {patient.first_name?.[0] || 'P'}
            </div>
            {patient.blood_group && (
              <span className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-xs">
                {patient.blood_group}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 leading-tight tracking-tight truncate">
                {name}
              </h1>
              <span className="text-xs font-semibold text-slate-500">
                {age !== null ? `${age}y` : ''} {patient.gender ? `· ${patient.gender}` : ''}
              </span>
              {patient.opd_number && (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">
                  {patient.opd_number}
                </span>
              )}
            </div>

            {/* Critical Allergy Alert + Conditions Inline (Section 8) */}
            <div className="flex items-center gap-2.5 mt-1 flex-wrap text-xs">
              {/* Allergy Warning */}
              {allergies.length > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-gradient-to-r from-rose-100 via-rose-200/90 to-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
                  <span>⚠️</span>
                  <span>ALLERGY: {allergies.map(a => `${a.allergen} (${a.severity})`).join(', ')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold gradient-card-emerald text-emerald-900 shadow-2xs">
                  <span className="text-emerald-700 font-bold">✓</span> No known drug allergies
                </span>
              )}

              {/* Major Active Conditions */}
              {activeProblems.length > 0 && (
                <span className="text-slate-500 truncate hidden sm:inline">
                  <span className="font-semibold text-slate-700">Conditions:</span> {activeProblems.map(p => p.title).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="btn btn-secondary text-xs px-3 py-1.5 font-bold"
            >
              {Icons.edit} Edit
            </button>
          )}
          <Link
            to={`/visits/new?patient_id=${patientId}&doctor_id=${doctorId || ''}`}
            className="btn btn-primary text-xs px-3.5 py-1.5 font-bold shadow-sm shadow-emerald-700/30"
          >
            {Icons.plus} Start Consultation
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── 11. Patient Overview Tab (Section 11) ────────────────────────────────────

function PatientOverviewTab({
  patient,
  latestVisit,
  labs,
  invoices,
  onNavigateTab
}: {
  patient: Patient
  latestVisit?: VisitResponse
  labs?: LabResult[]
  invoices?: Invoice[]
  onNavigateTab: (tab: string) => void
}) {
  const rxItems = latestVisit?.prescriptions?.flatMap(p => p.items || []) || []

  return (
    <div className="space-y-5">
      {/* Greeting card */}
      <div className="card p-4.5 bg-gradient-to-r from-emerald-50/80 via-teal-50/30 to-white border border-emerald-200/80 rounded-2xl shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900">
          Patient Clinical Overview
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Recent consultations, diagnostic reports, and current management plan.
        </p>
      </div>

      {/* Latest Consultation Card */}
      {latestVisit ? (
        <div className="card p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="size-7 rounded-lg badge-icon-emerald flex items-center justify-center text-xs font-bold">
                {Icons.stethoscope}
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Latest Consultation #{latestVisit.encounter.visit_number}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {new Date(latestVisit.encounter.encounter_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
            <span className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full border',
              latestVisit.encounter.signed_at || latestVisit.encounter.status === 'Completed'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            )}>
              {latestVisit.encounter.signed_at ? 'Signed' : latestVisit.encounter.status}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-3 text-xs">
            {/* Reason & Diagnoses */}
            <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assessment</span>
              {latestVisit.encounter.reason && (
                <p className="text-slate-700"><span className="font-semibold">Reason:</span> "{latestVisit.encounter.reason}"</p>
              )}
              {latestVisit.diagnoses.length > 0 ? (
                <p className="text-slate-700">
                  <span className="font-semibold">Diagnoses:</span> {latestVisit.diagnoses.map(d => d.diagnosis).join(', ')}
                </p>
              ) : (
                <p className="text-slate-400 italic">No formal diagnosis coded.</p>
              )}
            </div>

            {/* Prescribed Meds */}
            <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prescriptions</span>
              {rxItems.length > 0 ? (
                <ul className="space-y-1">
                  {rxItems.slice(0, 3).map((m, i) => (
                    <li key={i} className="flex justify-between text-slate-800">
                      <span className="font-semibold">{m.name}</span>
                      <span className="text-slate-500 font-mono text-[11px]">{[m.morning, m.afternoon, m.evening, m.night].join('-')}</span>
                    </li>
                  ))}
                  {rxItems.length > 3 && (
                    <li className="text-[10px] text-slate-400">+{rxItems.length - 3} more medications</li>
                  )}
                </ul>
              ) : (
                <p className="text-slate-400 italic">No medications prescribed in this visit.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center bg-white border border-slate-200 rounded-xl">
          <p className="text-sm font-semibold text-slate-800">No visits on record</p>
          <p className="text-xs text-slate-400 mt-1">Start a new consultation to record history and treatments.</p>
        </div>
      )}

      {/* Recent Laboratory Results */}
      <div className="card p-4 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span className="text-indigo-600">{Icons.flask}</span>
            Recent Laboratory Findings
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('labs')}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            View all ({labs?.length || 0}) →
          </button>
        </div>

        {labs && labs.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-2 mt-3 text-xs">
            {labs.slice(0, 4).map(lab => (
              <div key={lab.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">{lab.test_name}</p>
                  <p className="text-[11px] text-slate-400">{new Date(lab.ordered_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">{lab.result_value || 'Pending'}</span>
                  <span className="text-[10px] text-slate-400 block">{lab.unit}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-3 text-center">No diagnostic test orders recorded.</p>
        )}
      </div>
    </div>
  )
}

// ─── Main Patient Detail Page (Section 9: Three-Area Layout) ──────────────────

type ActiveTab = 'overview' | 'timeline' | 'clinical' | 'labs' | 'billing'

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const patientId = Number(id)
  const [chartParams, setChartParams] = useSearchParams()
  const requestedTab = chartParams.get('tab')
  const activeTab: ActiveTab = requestedTab && ['overview', 'timeline', 'clinical', 'labs', 'billing'].includes(requestedTab)
    ? requestedTab as ActiveTab
    : 'overview'

  const setActiveTab = (tab: ActiveTab) => setChartParams({ tab }, { replace: true })

  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [editingLab, setEditingLab] = useState<LabResult | null>(null)
  const [editingPatient, setEditingPatient] = useState(false)
  const [printVisit, setPrintVisit] = useState<{ visit: VisitResponse; type: 'report' | 'prescription' } | null>(null)

  const { data: patient, isLoading: loadingPatient } = usePatient(patientId)
  const { data: visitHistory, isLoading: loadingVisits } = useVisitHistory(patientId, 20)
  const { data: labResults, isLoading: loadingLabs } = useLatestLabResults(patientId)
  const { data: invoices, isLoading: loadingInvoices } = useInvoices(patientId)
  const { data: me } = useMe()
  const { data: clinic } = useClinic()

  const allergiesQuery = useQuery({ queryKey: ['clinicalHistory', patientId, 'allergies'], queryFn: () => getAllergies(patientId), enabled: !!patientId })
  const problemsQuery = useQuery({ queryKey: ['clinicalHistory', patientId, 'problems'], queryFn: () => getProblems(patientId), enabled: !!patientId })

  const updateLab = useUpdateLabResult()
  const updatePatientMutation = useUpdatePatient()
  const updateInvoiceStatus = useUpdateInvoiceStatus()

  const [isPGOpen, setIsPGOpen] = useState(false)
  const [pgPrompt, setPgPrompt] = useState<string | undefined>()
  const [isPrepareOpen, setIsPrepareOpen] = useState(false)
  const [isChangesOpen, setIsChangesOpen] = useState(false)
  const [isLoopsOpen, setIsLoopsOpen] = useState(false)
  const [isMedIntelOpen, setIsMedIntelOpen] = useState(false)

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Spinner />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400 gap-3">
        <div className="size-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
          {Icons.patients}
        </div>
        <p className="text-sm font-medium">Patient not found</p>
        <button
          onClick={() => navigate('/patients')}
          className="btn btn-secondary text-xs"
        >
          {Icons.arrowLeft} Back to Patients
        </button>
      </div>
    )
  }

  const age = patient.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const latestVisit = visitHistory?.[0]
  const previousVisit = visitHistory?.[1]

  const handlePrint = (visit: VisitResponse, type: 'report' | 'prescription') => {
    setPrintVisit({ visit, type })
  }

  const handleLabSave = async (form: LabResultInput) => {
    if (!editingLab) return
    await updateLab.mutateAsync({ id: editingLab.id, data: form })
    setEditingLab(null)
  }

  return (
    <div className="min-h-full bg-slate-100/60 flex flex-col font-sans">
      {/* ─── 8. Sticky Patient Header ─── */}
      <StickyPatientHeader
        patient={patient}
        age={age}
        patientId={patientId}
        doctorId={me?.id}
        allergies={allergiesQuery.data || []}
        problems={problemsQuery.data || []}
        onEdit={() => setEditingPatient(true)}
        onOpenAssistant={() => {
          setPgPrompt(undefined)
          setIsPGOpen(true)
        }}
        onOpenPrepareBrief={() => setIsPrepareOpen(true)}
      />

      {/* ─── 9. Three-Area Workspace Layout (Section 9) ─── */}
      <div className="flex-1 max-w-[1560px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Patient Navigation (2 Cols) */}
        <aside className="lg:col-span-2 card p-2 bg-white border border-slate-200/80 rounded-xl space-y-1 shadow-2xs">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Patient Chart
          </p>
          {[
            { key: 'overview', label: 'Overview', icon: Icons.dashboard },
            { key: 'timeline', label: 'Timeline', icon: Icons.calendar, badge: visitHistory?.length },
            { key: 'clinical', label: 'History & Meds', icon: Icons.activity },
            { key: 'labs', label: 'Labs & Reports', icon: Icons.flask, badge: labResults?.length },
            { key: 'billing', label: 'Invoices', icon: Icons.billing, badge: invoices?.length },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as ActiveTab)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                activeTab === tab.key
                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500/30'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className={cn('size-4 shrink-0', activeTab === tab.key ? 'text-emerald-700' : 'text-slate-400')}>
                  {tab.icon}
                </span>
                <span className="truncate">{tab.label}</span>
              </div>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Center Column: Active Clinical Workspace (7 Cols) */}
        <section className="lg:col-span-7 min-w-0 space-y-4">
          {activeTab === 'overview' && (
            <PatientOverviewTab
              patient={patient}
              latestVisit={latestVisit}
              labs={labResults}
              invoices={invoices}
              onNavigateTab={(t) => setActiveTab(t as ActiveTab)}
            />
          )}

          {activeTab === 'timeline' && (
            <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              <UnifiedPatientTimeline
                patientId={patientId}
                visits={visitHistory}
                labs={labResults}
                invoices={invoices}
                canAmend={me?.role?.name === 'Admin' || !!me?.role?.permissions?.some(p => p.name === 'manage_clinical')}
                onPrint={handlePrint}
                onEditLab={setEditingLab}
              />
            </div>
          )}

          {activeTab === 'clinical' && (
            <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              <ClinicalHistory patientId={patientId} />
            </div>
          )}

          {activeTab === 'labs' && (
            <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Diagnostic Reports</h3>
                <Link to="/labs" className="btn btn-secondary text-xs py-1 px-2.5">
                  Order Laboratory Tests
                </Link>
              </div>
              {labResults && labResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400">
                        <th className="py-2 px-2">Test Name</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 px-2">Value</th>
                        <th className="py-2 px-2">Ref Range</th>
                        <th className="py-2 px-2">Trend</th>
                        <th className="py-2 px-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {labResults.map(lab => (
                        <tr key={lab.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-2 font-bold text-slate-800">
                            {lab.test_name}
                          </td>
                          <td className="py-2.5 px-2">
                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', STATUS_LAB[lab.status] || 'bg-slate-100 text-slate-600')}>
                              {lab.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-bold text-slate-900">
                            {lab.result_value || '—'} {lab.unit}
                          </td>
                          <td className="py-2.5 px-2 text-slate-500 font-mono text-[11px]">
                            {lab.reference_range || '—'}
                          </td>
                          <td className="py-2.5 px-2">
                            <LabTestGraph
                              patientId={patientId}
                              testName={lab.test_name}
                              referenceRange={lab.reference_range}
                              unit={lab.unit}
                            />
                          </td>
                          <td className="py-2.5 px-2 text-slate-400">
                            {new Date(lab.ordered_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No laboratory results documented.</p>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="card p-4 sm:p-5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 pb-3 mb-3 border-b border-slate-100">
                Patient Invoices & Statements
              </h3>
              {invoices && invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Invoice #{inv.id}</p>
                        <p className="text-[11px] text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 text-sm">₹{inv.amount.toFixed(2)}</p>
                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', STATUS_INV[inv.status] || 'bg-slate-100 text-slate-600')}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No invoices recorded for this patient.</p>
              )}
            </div>
          )}
        </section>

        {/* Right Column: Persistent Patient Brain & Snapshot (3 Cols) (Section 10) */}
        <section className="lg:col-span-3 min-w-0 space-y-4">
          <PatientBrainSidebar
            patientId={patientId}
            onOpenPG={(prompt) => {
              setPgPrompt(prompt)
              setIsPGOpen(true)
            }}
            onOpenPrepareBrief={() => setIsPrepareOpen(true)}
            onOpenChanges={() => setIsChangesOpen(true)}
            onOpenLoops={() => setIsLoopsOpen(true)}
            onOpenMedIntelligence={() => setIsMedIntelOpen(true)}
            onOpenTrends={() => setActiveTab('labs')}
          />
          <PatientSnapshot
            patient={patient}
            latestVisit={latestVisit}
            previousVisit={previousVisit}
            onOpenAssistant={() => {
              setPgPrompt(undefined)
              setIsPGOpen(true)
            }}
          />
        </section>
      </div>

      {/* ─── PG Assistant Drawer (Sections 12–20 & 36) ─── */}
      <PGAssistantDrawer
        isOpen={isPGOpen}
        onClose={() => setIsPGOpen(false)}
        patientId={patientId}
        patientName={`${patient.first_name} ${patient.last_name}`}
        opdNumber={patient.opd_number}
        initialQuestion={pgPrompt}
      />

      {/* ─── Pre-Visit Brief Modal (Section 11) ─── */}
      <PreparePatientModal
        isOpen={isPrepareOpen}
        onClose={() => setIsPrepareOpen(false)}
        patientId={patientId}
        onAskPG={(prompt) => {
          setPgPrompt(prompt)
          setIsPGOpen(true)
        }}
      />

      {/* ─── Changes Since Last Visit Modal (Section 22) ─── */}
      <ChangesSinceLastVisitModal
        isOpen={isChangesOpen}
        onClose={() => setIsChangesOpen(false)}
        patientId={patientId}
      />

      {/* ─── Open Loops Modal (Section 6 & 7) ─── */}
      <OpenLoopsModal
        isOpen={isLoopsOpen}
        onClose={() => setIsLoopsOpen(false)}
        patientId={patientId}
      />

      {/* ─── Prescription Intelligence Modal (Section 5 & 23) ─── */}
      <MedicationIntelligenceModal
        isOpen={isMedIntelOpen}
        onClose={() => setIsMedIntelOpen(false)}
        patientId={patientId}
      />

      {/* Modals & Print previews */}
      {editingPatient && patient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Edit Demographics</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Contact Number</label>
                <input
                  type="text"
                  defaultValue={patient.contact_number || ''}
                  id="edit-phone"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setEditingPatient(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const phone = (document.getElementById('edit-phone') as HTMLInputElement)?.value
                    await updatePatientMutation.mutateAsync({
                      id: patient.id,
                      data: {
                        first_name: patient.first_name,
                        last_name: patient.last_name,
                        gender: patient.gender,
                        dob: patient.dob,
                        contact_number: phone,
                        email: patient.email || undefined,
                        blood_group: patient.blood_group || undefined,
                        opd_number: patient.opd_number || undefined,
                      },
                    })
                    setEditingPatient(false)
                  }}
                  className="btn btn-primary bg-emerald-600 text-white text-xs"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {printVisit && patient && (
        <PrintableVisit
          visit={printVisit.visit}
          patient={patient}
          clinic={clinic}
          doctor={me}
          type={printVisit.type}
          onReady={() => window.print()}
        />
      )}
    </div>
  )
}
