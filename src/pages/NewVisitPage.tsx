import { useState, useRef, useEffect, useCallback } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePatient } from '../hooks/usePatients'
import { useMe } from '../hooks/useUsers'
import { useVitalConfigs, useCreateVisit, useUpdateVisit } from '../hooks/useVisits'
import { useAppointmentStatuses, useAppointments, useCreateAppointment } from '../hooks/useAppointments'
import { useLabCatalog, useLatestLabResults, useComboCatalog, useOrderCombo } from '../hooks/useLabResults'
import { useLISStatus } from '../hooks/useLISIntegration'
import { useDrugs, useCreateDrug } from '../hooks/useDrugs'
import { useClinicalTemplates, useCreateClinicalTemplate } from '../hooks/useClinicalTemplates'
import { getLastVisit, getVisitById, getVisitLabOrder, getDiagnosisSuggestions, getTreatmentSuggestions, submitVisitLabOrder } from '../api/visits'
import { getAllergies } from '../api/clinicalHistory'
import { Icons } from '../components/Icons'
import { AllergyStatus } from '../components/AllergyStatus'
import { SuggestionInput } from '../components/SuggestionInput'
import { PrintableVisit } from '../components/PrintableVisit'
import { LinkedLabReports } from '../components/LinkedLabReports'
import { AiChartSummary } from '../components/AiChartSummary'
import { ConsultationContext } from '../components/ConsultationContext'
import { PatientBrainSidebar } from '../components/PatientBrainSidebar'
import { PGAssistantDrawer } from '../components/PGAssistantDrawer'
import { PreparePatientModal } from '../components/PreparePatientModal'
import { ChangesSinceLastVisitModal } from '../components/ChangesSinceLastVisitModal'
import { OpenLoopsModal } from '../components/OpenLoopsModal'
import { MedicationIntelligenceModal } from '../components/MedicationIntelligenceModal'
import { SmartPlanExtractionModal } from '../components/SmartPlanExtractionModal'
import { useClinic } from '../hooks/useSettings'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { ClinicalAiAssistant } from '../components/ClinicalAiAssistant'
import { consultationPath } from '../utils/workflow'
import { startAppointment } from '../api/appointments'
import { cn } from '../utils/cn'
import type { Drug, PrescriptionInput, VitalConfig, VisitPayload, VisitResponse, VisitLabOrderIntent } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComplaintRow { complaint: string; from_date: string; duration: string }
interface DiagnosisRow { diagnosis: string; date: string }
interface TreatmentRow { treatment: string; due_date: string }
interface LabItem { id: number; name: string; price: number; lis_code?: string; lis_test_codes?: string[] }
type CarryStatus = 'loading' | 'loaded' | 'none' | 'error' | null

// Sidebar section keys — used for scrollspy and navigation
type SectionKey = 'overview' | 'vitals' | 'complaints' | 'diagnoses' | 'treatments' | 'prescriptions' | 'labs' | 'followup' | 'assistant'

// ─── Shared style primitives ──────────────────────────────────────────────────

const inputCls = 'w-full border border-border rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white'
const smallInputCls = 'border border-border rounded-md px-2.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white'
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5'

function FormSection({
  id, title, icon, badge, headerAction, children,
}: {
  id: SectionKey
  title: string
  icon: ReactNode
  badge?: number
  headerAction?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      id={`visit-section-${id}`}
      className="card scroll-mt-4 shadow-xs relative focus-within:z-20"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100/80 bg-gradient-to-r from-slate-50/70 via-emerald-50/20 to-transparent rounded-t-xl">
        <div aria-hidden="true" className="size-9 flex items-center justify-center rounded-xl badge-icon-emerald shrink-0 shadow-2xs">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-slate-800 text-balance">{title}</h2>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto text-xs font-bold bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 px-2 py-0.5 rounded-full shadow-2xs">{badge}</span>
        )}
        {headerAction && <div className="ml-auto">{headerAction}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 px-2.5 py-1.5 rounded-lg transition-colors -ml-2.5"
    >
      {Icons.plus} {label}
    </button>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const SIDEBAR_GROUPS: {
  label: string
  color: string
  accentBg: string
  items: { key: SectionKey; label: string }[]
}[] = [
  {
    label: '1 · Review & document',
    color: 'text-primary-600',
    accentBg: 'bg-primary-50',
    items: [
      { key: 'overview', label: 'Visit Overview' },
      { key: 'vitals', label: 'Vitals' },
      { key: 'complaints', label: 'Chief Complaints' },
    ],
  },
  {
    label: '2 · Assessment & plan',
    color: 'text-primary-600',
    accentBg: 'bg-primary-50',
    items: [
      { key: 'diagnoses', label: 'Diagnoses' },
      { key: 'treatments', label: 'Treatments' },
      { key: 'prescriptions', label: 'Prescriptions' },
    ],
  },
  {
    label: '3 · Orders & follow-up',
    color: 'text-primary-600',
    accentBg: 'bg-primary-50',
    items: [
      { key: 'labs', label: 'Lab Orders' },
      { key: 'followup', label: 'Follow-up' },
      { key: 'assistant', label: 'Documentation assistant' },
    ],
  },
]

function VisitSidebar({
  active,
  counts,
  carryStatus,
  onCarryForward,
  isPending,
  isEditing,
  onCancel,
  patientName,
  onBackToPatient,
  status,
}: {
  active: SectionKey
  counts: Partial<Record<SectionKey, number>>
  carryStatus: CarryStatus
  onCarryForward: () => void
  isPending: boolean
  isEditing: boolean
  onCancel: () => void
  patientName: string
  onBackToPatient: () => void
  status?: string
}) {
  const isNoShowOrCancelled = status === 'No Show' || status === 'Cancelled'
  const scrollTo = (key: SectionKey) => {
    document.getElementById(`visit-section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <aside aria-label="Consultation sections" className="hidden lg:flex sticky top-0 h-full w-52 flex-col bg-white border-r border-slate-200 shrink-0 overflow-y-auto">
      {/* Top: patient context + back link */}
      <div className="px-3 pt-3 pb-3 border-b border-slate-100">
        <button
          type="button"
          onClick={onBackToPatient}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-primary-50 transition-colors group"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-primary-500 shrink-0 group-hover:text-primary-600">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span className="text-xs font-semibold text-slate-600 group-hover:text-primary-700 truncate leading-tight">
            {patientName || 'Patient'}
          </span>
        </button>
        <p className="text-[10px] text-slate-400 font-medium px-2.5 mt-0.5">
          {isEditing ? 'Editing visit' : 'New visit'}
        </p>
      </div>

      {/* Carry-forward */}
      {!isNoShowOrCancelled && (
        <div className="px-3 pt-3 pb-3 border-b border-slate-100">
          <button
            type="button"
            onClick={onCarryForward}
            disabled={carryStatus === 'loading'}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl transition-colors border border-slate-200"
          >
            {carryStatus === 'loading' ? (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.9"/></svg>
            )}
            Load Last Visit
          </button>
          {carryStatus === 'loaded' && (
            <p className="text-center text-[10px] text-emerald-600 font-medium mt-1.5">✓ Previous visit loaded</p>
          )}
          {carryStatus === 'none' && (
            <p className="text-center text-[10px] text-slate-400 mt-1.5">No previous visits found</p>
          )}
          {carryStatus === 'error' && (
            <p className="text-center text-[10px] text-red-500 mt-1.5">Could not load last visit</p>
          )}
        </div>
      )}

      {/* Section navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {isNoShowOrCancelled ? (
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-2">
            <p className="font-semibold flex items-center gap-1.5 text-amber-800">
              <span>⚠️</span> Visit {status}
            </p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Clinical inputs are hidden because the visit is marked as {status?.toLowerCase()}.
            </p>
            <button
              type="button"
              onClick={() => scrollTo('overview')}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-800 border border-amber-200 hover:bg-amber-100/50 transition-colors cursor-pointer"
            >
              Visit Overview
            </button>
          </div>
        ) : (
          SIDEBAR_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-medium text-slate-500 px-2 mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const isActive = active === item.key
                  const count = counts[item.key]
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => scrollTo(item.key)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                        isActive
                          ? `${group.accentBg} ${group.color} font-semibold`
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      {count !== undefined && count > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          isActive ? `bg-white/70 ${group.color}` : 'bg-slate-100 text-slate-400'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Bottom: save/cancel */}
      <div className="px-3 py-3 border-t border-slate-100 space-y-2">
        <button
          type="submit"
          form="visit-form"
          disabled={isPending}
          className="btn btn-primary w-full flex items-center justify-center gap-2 py-2.5 cursor-pointer"
        >
          {isPending ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
              Saving…
            </>
          ) : isNoShowOrCancelled ? (
            `Save as ${status}`
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>
              Review & complete
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </aside>
  )
}

// ─── Component: FieldWithTemplate ─────────────────────────────────────────────
function FieldWithTemplate({
  label, value, onChange, placeholder, type, isTextarea = true, className = ''
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type: string; isTextarea?: boolean; className?: string
}) {
  const { data: templates } = useClinicalTemplates()
  const createTemplate = useCreateClinicalTemplate()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const relevantTemplates = templates?.filter(t => t.type === type) || []

  const handleSave = () => {
    if (!value.trim()) return alert('Field is empty')
    const name = window.prompt('Enter template name:')
    if (name) {
      createTemplate.mutate({ name, type, content: value })
    }
  }

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <label className={labelCls + ' !mb-0'}>{label}</label>
        <div className="flex items-center gap-3 relative" ref={dropdownRef}>
          {relevantTemplates.length > 0 && (
            <button type="button" onClick={() => setShowDropdown(!showDropdown)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              Load Template
            </button>
          )}
          <button type="button" onClick={handleSave} className="text-xs text-slate-500 hover:text-slate-700 font-medium">
            Save as Template
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 shadow-lg rounded-md z-10 py-1 max-h-48 overflow-y-auto">
              {relevantTemplates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    onChange(value ? `${value}\n${t.content}` : t.content || '')
                    setShowDropdown(false)
                  }}
                >
                  <div className="font-medium text-slate-800">{t.name}</div>
                  <div className="text-xs text-slate-500 truncate">{t.content}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {isTextarea ? (
        <textarea className={`${inputCls} min-h-[70px] resize-y`} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input className={inputCls} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </div>
  )
}

// ─── Section: Next Followup ──────────────────────────────────────────────────

function FollowupSection({
  followupDays, followupMonths, followupDate,
  onFollowupDays, onFollowupMonths, onFollowupDate
}: {
  followupDays: number | ''; followupMonths: number | ''; followupDate: string
  onFollowupDays: (v: string) => void; onFollowupMonths: (v: string) => void; onFollowupDate: (v: string) => void
}) {
  return (
    <FormSection id="followup" title="Next Followup" icon={Icons.calendar}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <input type="number" min="1" className="w-16 bg-transparent text-sm font-medium outline-none" placeholder="0" value={followupDays} onChange={e => onFollowupDays(e.target.value)} />
          <span className="text-xs text-slate-500 font-medium">Days</span>
        </div>
        <span className="text-xs text-slate-400 font-bold">OR</span>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <input type="number" min="1" className="w-16 bg-transparent text-sm font-medium outline-none" placeholder="0" value={followupMonths} onChange={e => onFollowupMonths(e.target.value)} />
          <span className="text-xs text-slate-500 font-medium">Months</span>
        </div>
        <span className="text-xs text-slate-400 font-bold">OR</span>
        <input type="date" className={`${inputCls} w-auto`} value={followupDate} onChange={e => onFollowupDate(e.target.value)} />
      </div>
    </FormSection>
  )
}

// ─── Section: Visit Overview ──────────────────────────────────────────────────

function OverviewSection({
  status, reason, notes, quickNotes, advice, statuses, isPreparingPrint,
  onStatus, onReason, onNotes, onQuickNotes, onAdvice, onPrint, onQuickSave
}: {
  status: string; reason: string; notes: string; quickNotes: string; advice: string
  statuses?: { id: number; name: string }[]
  onStatus: (v: string) => void; onReason: (v: string) => void
  onNotes: (v: string) => void; onQuickNotes: (v: string) => void; onAdvice: (v: string) => void
  onPrint?: () => void
  isPreparingPrint?: boolean
  onQuickSave?: () => void
}) {
  const { t } = useTranslation()
  const isNoShowOrCancelled = status === 'No Show' || status === 'Cancelled'

  return (
    <FormSection
      id="overview"
      title={t('visit.overview')}
      icon={Icons.stethoscope}
      headerAction={!isNoShowOrCancelled && onPrint ? (
        <button type="button" onClick={onPrint} disabled={isPreparingPrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors print:hidden cursor-pointer disabled:opacity-60">
          {Icons.download} {isPreparingPrint ? 'Preparing print…' : 'Print Report'}
        </button>
      ) : undefined}
    >
      <div className={cn("grid gap-4", isNoShowOrCancelled ? "grid-cols-1 max-w-xl" : "grid-cols-2")}>
        <div>
          <label className={labelCls}>Visit Status</label>
          <select className={inputCls} value={status} onChange={e => onStatus(e.target.value)}>
            {statuses?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>

        {isNoShowOrCancelled ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-3">
            <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
              <span>⚠️</span>
              <span>Visit marked as {status}</span>
            </div>
            <p className="text-amber-700 leading-relaxed text-xs">
              All clinical examination, prescription, and investigation inputs are hidden because this visit is marked as {status.toLowerCase()}.
            </p>
            {onQuickSave && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onQuickSave}
                  className="btn btn-primary text-xs px-4 py-2 font-bold shadow-md shadow-emerald-700/20 cursor-pointer"
                >
                  Confirm & Save as {status}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <FieldWithTemplate
              type="reason"
              label={t('visit.reason')}
              value={reason}
              onChange={onReason}
              placeholder={t('visit.reasonPlaceholder')}
              isTextarea={false}
            />
            <FieldWithTemplate
              type="notes"
              label={t('visit.notes')}
              value={notes}
              onChange={onNotes}
              placeholder={t('visit.notesPlaceholder')}
              className="col-span-2"
            />
            <FieldWithTemplate
              type="quickNotes"
              label={t('visit.quickNotes')}
              value={quickNotes}
              onChange={onQuickNotes}
              placeholder={t('visit.quickNotesPlaceholder')}
            />
            <FieldWithTemplate
              type="advice"
              label={t('visit.advice')}
              value={advice}
              onChange={onAdvice}
              placeholder={t('visit.advicePlaceholder')}
            />
          </>
        )}
      </div>
    </FormSection>
  )
}

// ─── Section: Vitals ─────────────────────────────────────────────────────────

function VitalsSection({
  vitalConfigs, vitals, onChange,
}: {
  vitalConfigs: VitalConfig[]
  vitals: Record<number, string>
  onChange: (id: number, val: string) => void
}) {
  const { t } = useTranslation()
  const filledCount = vitalConfigs.filter(vc => vitals[vc.id]).length

  return (
    <FormSection id="vitals" title={t('visit.vitals')} icon={Icons.heartbeat} badge={filledCount || undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {vitalConfigs.map(vc => {
          const isComputed = vc.data_type === 'computed'
          const hasValue = !!vitals[vc.id]
          return (
            <div key={vc.id}>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls + ' mb-0'}>{vc.name}</label>
                {isComputed && (
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Auto</span>
                )}
              </div>
              <div className="relative">
                <input
                  className={`${inputCls} ${isComputed ? 'bg-slate-50 text-slate-500' : ''} ${hasValue ? 'border-emerald-200 bg-emerald-50/30' : ''}`}
                  type={['float', 'integer', 'number'].includes(vc.data_type) ? 'number' : 'text'}
                  value={vitals[vc.id] || ''}
                  onChange={e => onChange(vc.id, e.target.value)}
                  placeholder={vc.name}
                  readOnly={isComputed}
                  step={vc.data_type === 'float' ? 'any' : undefined}
                />
                {hasValue && !isComputed && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </FormSection>
  )
}

// ─── Section: Complaints ──────────────────────────────────────────────────────

function ComplaintsSection({
  complaints, onAdd, onRemove, onUpdate,
}: {
  complaints: ComplaintRow[]
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, field: keyof ComplaintRow, val: string) => void
}) {
  const { t } = useTranslation()
  return (
    <FormSection id="complaints" title={t('visit.complaints')} icon={Icons.clipboard} badge={complaints.length || undefined}>
      {complaints.length > 0 && (
        <div className="space-y-2 mb-1">
          <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_130px_110px_28px] gap-2 px-1">
            {['Complaint', 'From date', 'Duration', ''].map((h, i) => (
              <span key={i} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
            ))}
          </div>
          {complaints.map((c, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_130px_110px_28px] gap-2 items-center">
              <input className={`${smallInputCls} w-full`} value={c.complaint} onChange={e => onUpdate(i, 'complaint', e.target.value)} placeholder={t('visit.complaintPlaceholder')} />
              <input className={`${smallInputCls} w-full`} type="date" value={c.from_date} onChange={e => onUpdate(i, 'from_date', e.target.value)} />
              <input className={`${smallInputCls} w-full`} value={c.duration} onChange={e => onUpdate(i, 'duration', e.target.value)} placeholder={t('visit.durationPlaceholder')} />
              <button type="button" onClick={() => onRemove(i)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">{Icons.x}</button>
            </div>
          ))}
        </div>
      )}
      {complaints.length === 0 && (
        <p className="text-sm text-slate-400 mb-1">{t('visit.noComplaints')}</p>
      )}
      <AddRowButton onClick={onAdd} label={t('visit.addComplaint')} />
    </FormSection>
  )
}

// ─── Section: Diagnoses ───────────────────────────────────────────────────────

function DiagnosesSection({
  diagnoses, onAdd, onRemove, onUpdate, readOnly,
}: {
  diagnoses: DiagnosisRow[]
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, field: keyof DiagnosisRow, val: string) => void
  readOnly?: boolean
}) {
  const { t } = useTranslation()
  return (
    <FormSection id="diagnoses" title={t('visit.diagnoses')} icon={Icons.diagnosis} badge={diagnoses.length || undefined}>
      {diagnoses.length > 0 && (
        <div className="space-y-2 mb-1">
          <div className={`grid ${readOnly ? 'grid-cols-[1fr_160px]' : 'grid-cols-[1fr_160px_28px]'} gap-2 px-1`}>
            {['Diagnosis', 'Date', ...(readOnly ? [] : [''])].map((h, i) => (
              <span key={i} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
            ))}
          </div>
          {diagnoses.map((d, i) => (
            <div key={i} className={`grid ${readOnly ? 'grid-cols-[1fr_160px]' : 'grid-cols-[1fr_160px_28px]'} gap-2 items-center`}>
              <SuggestionInput className={`${smallInputCls} w-full`} value={d.diagnosis} onChange={val => onUpdate(i, 'diagnosis', val)} fetchSuggestions={getDiagnosisSuggestions} placeholder={t('visit.diagnosisPlaceholder')} disabled={readOnly} />
              <input className={`${smallInputCls} w-full`} type="date" value={d.date} onChange={e => onUpdate(i, 'date', e.target.value)} disabled={readOnly} />
              {!readOnly && <button type="button" onClick={() => onRemove(i)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">{Icons.x}</button>}
            </div>
          ))}
        </div>
      )}
      {diagnoses.length === 0 && <p className="text-sm text-slate-400 mb-1">{t('visit.noDiagnoses')}</p>}
      {!readOnly && <AddRowButton onClick={onAdd} label={t('visit.addDiagnosis')} />}
    </FormSection>
  )
}

// ─── Section: Treatments ─────────────────────────────────────────────────────

function TreatmentsSection({
  treatments, onAdd, onRemove, onUpdate, readOnly, onOpenSmartPlan,
}: {
  treatments: TreatmentRow[]
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, field: keyof TreatmentRow, val: string) => void
  readOnly?: boolean
  onOpenSmartPlan?: () => void
}) {
  const { t } = useTranslation()
  return (
    <FormSection
      id="treatments"
      title={t('visit.treatments')}
      icon={Icons.treatment}
      badge={treatments.length || undefined}
      headerAction={onOpenSmartPlan && !readOnly ? (
        <button
          type="button"
          onClick={onOpenSmartPlan}
          className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg cursor-pointer"
        >
          <span>✦</span> AI Plan Assistant
        </button>
      ) : undefined}
    >
      {treatments.length > 0 && (
        <div className="space-y-2 mb-1">
          <div className={`grid ${readOnly ? 'grid-cols-[1fr_160px]' : 'grid-cols-[1fr_160px_28px]'} gap-2 px-1`}>
            {['Treatment', 'Due date', ...(readOnly ? [] : [''])].map((h, i) => (
              <span key={i} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
            ))}
          </div>
          {treatments.map((tr, i) => (
            <div key={i} className={`grid ${readOnly ? 'grid-cols-[1fr_160px]' : 'grid-cols-[1fr_160px_28px]'} gap-2 items-center`}>
              <SuggestionInput className={`${smallInputCls} w-full`} value={tr.treatment} onChange={val => onUpdate(i, 'treatment', val)} fetchSuggestions={getTreatmentSuggestions} placeholder={t('visit.treatmentPlaceholder')} disabled={readOnly} />
              <input className={`${smallInputCls} w-full`} type="date" value={tr.due_date} onChange={e => onUpdate(i, 'due_date', e.target.value)} disabled={readOnly} />
              {!readOnly && <button type="button" onClick={() => onRemove(i)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">{Icons.x}</button>}
            </div>
          ))}
        </div>
      )}
      {treatments.length === 0 && <p className="text-sm text-slate-400 mb-1">{t('visit.noTreatments')}</p>}
      {!readOnly && <AddRowButton onClick={onAdd} label={t('visit.addTreatment')} />}
    </FormSection>
  )
}

// ─── Section: Prescriptions ───────────────────────────────────────────────────

function PrescriptionsSection({
  prescriptions, drugSearch, showDropdown, drugResults, drugSearchRef, activeAllergies = [], isPreparingPrint,
  onSearchChange, onSearchFocus, onAddDrug, onCreateDrug, onRemove, onUpdate, onSaveToCatalog, onPrint,
  onOpenMedIntelligence,
}: {
  prescriptions: PrescriptionInput[]
  drugSearch: string
  showDropdown: boolean
  drugResults?: Drug[]
  drugSearchRef: React.RefObject<HTMLDivElement | null>
  activeAllergies?: Array<{ allergen: string; severity: string }>
  onSearchChange: (v: string) => void
  onSearchFocus: () => void
  onAddDrug: (name: string) => void
  onCreateDrug: (name: string) => void
  onRemove: (i: number) => void
  onUpdate: <K extends keyof PrescriptionInput>(i: number, field: K, val: PrescriptionInput[K]) => void
  onSaveToCatalog: (name: string) => void
  onPrint?: () => void
  isPreparingPrint?: boolean
  onOpenMedIntelligence?: () => void
}) {
  const { t } = useTranslation()

  // Real-time prescription safety checks (Section 19)
  const allergyConflicts = prescriptions.filter(p =>
    p.name.trim() && activeAllergies.some(a =>
      p.name.toLowerCase().includes(a.allergen.toLowerCase()) ||
      a.allergen.toLowerCase().includes(p.name.toLowerCase())
    )
  )

  const duplicates = prescriptions.filter((p, i) =>
    p.name.trim() && prescriptions.findIndex(other => other.name.trim().toLowerCase() === p.name.trim().toLowerCase()) !== i
  )

  const applyFrequency = (i: number, freq: 'OD' | 'BD' | 'TDS' | 'QID' | 'HS') => {
    if (freq === 'OD') { onUpdate(i, 'morning', '1'); onUpdate(i, 'afternoon', '0'); onUpdate(i, 'evening', '0'); onUpdate(i, 'night', '0') }
    else if (freq === 'BD') { onUpdate(i, 'morning', '1'); onUpdate(i, 'afternoon', '0'); onUpdate(i, 'evening', '1'); onUpdate(i, 'night', '0') }
    else if (freq === 'TDS') { onUpdate(i, 'morning', '1'); onUpdate(i, 'afternoon', '1'); onUpdate(i, 'evening', '1'); onUpdate(i, 'night', '0') }
    else if (freq === 'QID') { onUpdate(i, 'morning', '1'); onUpdate(i, 'afternoon', '1'); onUpdate(i, 'evening', '1'); onUpdate(i, 'night', '1') }
    else if (freq === 'HS') { onUpdate(i, 'morning', '0'); onUpdate(i, 'afternoon', '0'); onUpdate(i, 'evening', '0'); onUpdate(i, 'night', '1') }
  }

  return (
    <FormSection
      id="prescriptions"
      title={t('visit.prescriptions')}
      icon={Icons.pill}
      badge={prescriptions.length || undefined}
      headerAction={
        <div className="flex items-center gap-2">
          {onOpenMedIntelligence && (
            <button
              type="button"
              onClick={onOpenMedIntelligence}
              className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
            >
              <span>💊</span> Med Intelligence
            </button>
          )}
          {onPrint && (
            <button type="button" onClick={onPrint} disabled={isPreparingPrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md transition-colors print:hidden cursor-pointer disabled:opacity-60">
              {Icons.download} {isPreparingPrint ? 'Preparing print…' : 'Print Rx'}
            </button>
          )}
        </div>
      }
    >
      {/* Real-time Allergy Conflict Alert (Section 19) */}
      {allergyConflicts.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-2.5 animate-in fade-in duration-150">
          <span className="text-rose-600 font-bold text-base shrink-0">🚨</span>
          <div>
            <p className="text-xs font-bold">CRITICAL ALLERGY CONFLICT WARNING</p>
            <p className="text-[11px] text-rose-800 mt-0.5">
              Prescribed medicine matches documented patient allergy: <span className="font-bold underline">{allergyConflicts.map(c => c.name).join(', ')}</span>. Confirm with patient before issuing.
            </p>
          </div>
        </div>
      )}

      {/* Duplicate Medication Warning */}
      {duplicates.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-2.5">
          <span className="text-amber-600 font-bold text-sm shrink-0">⚠️</span>
          <div>
            <p className="text-xs font-bold">Duplicate Medication Detected</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              "{duplicates.map(d => d.name).join(', ')}" is listed more than once in this prescription.
            </p>
          </div>
        </div>
      )}

      {/* Drug search */}
      <div ref={drugSearchRef} className="relative z-30 mb-4">
        <input
          className={inputCls}
          value={drugSearch}
          onChange={e => onSearchChange(e.target.value)}
          onFocus={onSearchFocus}
          onClick={onSearchFocus}
          placeholder={t('visit.drugSearchPlaceholder')}
        />
        {showDropdown && drugResults && drugResults.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-2xl max-h-60 overflow-y-auto">
            {drugResults.map(drug => (
              <button key={drug.id} type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between gap-4 border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
                onClick={() => onAddDrug(drug.strength ? `${drug.name} ${drug.strength}` : drug.name)}
              >
                <div>
                  <span className="font-semibold text-slate-800">
                    {drug.name} {drug.strength && <span className="font-normal text-slate-500 ml-1">{drug.strength}</span>}
                  </span>
                  {drug.generic_name && <span className="text-slate-400 ml-2 text-xs">{drug.generic_name}</span>}
                </div>
                <span className="text-xs text-slate-400 shrink-0">{drug.form || ''}</span>
              </button>
            ))}
          </div>
        )}
        {showDropdown && drugSearch.length >= 1 && drugResults?.length === 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-2xl px-4 py-3 text-sm flex items-center justify-between">
            <span className="text-slate-400">No drugs found for "{drugSearch}"</span>
            <button type="button" onClick={() => onCreateDrug(drugSearch)}
              className="btn btn-secondary px-3 py-1.5 text-xs">
              Create &amp; Add
            </button>
          </div>
        )}
      </div>

      {/* Prescription table */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              {['Medicine', 'Morning', 'Afternoon', 'Evening', 'Night', 'Quick Preset', 'When', 'Days', 'Notes', ''].map((h, i) => (
                <th key={i} className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {prescriptions.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                  {t('visit.prescriptionsHint')}
                </td>
              </tr>
            ) : prescriptions.map((p, i) => {
              const isConflict = allergyConflicts.some(c => c.name === p.name)
              return (
                <tr key={i} className={cn('transition-colors group', isConflict ? 'bg-rose-50/50' : 'hover:bg-slate-50/50')}>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <input
                        className={cn(
                          'w-36 border rounded-md px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 bg-white',
                          isConflict ? 'border-rose-400 text-rose-950 ring-1 ring-rose-300' : 'border-border text-slate-800 focus:ring-primary-500'
                        )}
                        value={p.name}
                        onChange={e => onUpdate(i, 'name', e.target.value)}
                      />
                      <button type="button" title="Save to catalog" onClick={() => onSaveToCatalog(p.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-emerald-700 transition-all rounded">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                      </button>
                    </div>
                  </td>
                  {(['morning', 'afternoon', 'evening', 'night'] as const).map(field => (
                    <td key={field} className="px-1.5 py-2.5">
                      <input
                        className="w-12 border border-border rounded-md px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white font-mono"
                        value={p[field]}
                        onChange={e => onUpdate(i, field, e.target.value)}
                        placeholder="0"
                      />
                    </td>
                  ))}
                  {/* Quick Frequency Presets (Section 18) */}
                  <td className="px-1.5 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {(['OD', 'BD', 'TDS', 'QID'] as const).map(freq => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => applyFrequency(i, freq)}
                          className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 transition-colors cursor-pointer"
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-1.5 py-2.5">
                    <select className="border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                      value={p.when} onChange={e => onUpdate(i, 'when', e.target.value)}>
                      <option value="">—</option>
                      <option value="Before food">{t('visit.whenBeforeFood')}</option>
                      <option value="After food">{t('visit.whenAfterFood')}</option>
                      <option value="With food">{t('visit.whenWithFood')}</option>
                      <option value="At bedtime">{t('visit.whenAtBedtime')}</option>
                      <option value="SOS">{t('visit.whenSos')}</option>
                    </select>
                  </td>
                  <td className="px-1.5 py-2.5">
                    <input
                      aria-label={`Duration in days for ${p.name || 'medicine ' + (i + 1)}`}
                      inputMode="numeric"
                      className="w-16 border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                      value={p.duration_days ?? ''}
                      onChange={e => {
                        const value = e.target.value
                        if (value === '') {
                          onUpdate(i, 'duration_days', null)
                        } else if (/^[1-9][0-9]*$/.test(value) && Number(value) <= 2147483647) {
                          onUpdate(i, 'duration_days', Number(value))
                        }
                      }}
                    />
                  </td>
                  <td className="px-1.5 py-2.5">
                    <input
                      className="w-32 border border-border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
                      value={p.details}
                      onChange={e => onUpdate(i, 'details', e.target.value)}
                      placeholder={t('visit.detailsPlaceholder')}
                    />
                  </td>
                  <td className="px-1.5 py-2.5">
                    <button type="button" onClick={() => onRemove(i)}
                      className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      {Icons.x}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </FormSection>
  )
}

// ─── Section: Lab Orders ──────────────────────────────────────────────────────

function LabSection({
  selectedItems, selectedCombos, labSearch, showDropdown, labCatalog, comboCatalog, labSearchRef, lastLabReports, lisConnected,
  patientId, lisConfigured, labOrder,
  onSearchChange, onSearchFocus, onAdd, onRemove, onAddCombo, onRemoveCombo
}: {
  selectedItems: LabItem[]
  selectedCombos: LabItem[]
  labSearch: string
  showDropdown: boolean
  labCatalog?: LabItem[]
  comboCatalog?: LabItem[]
  labSearchRef: React.RefObject<HTMLDivElement | null>
  lastLabReports?: Array<{ id: number; test_name: string; result_value: string | null; unit: string | null; reference_range: string | null; status: string; notes: string | null; ordered_date: string }>
  lisConnected: boolean
  lisConfigured: boolean
  patientId: number
  labOrder: VisitLabOrderIntent | null
  onSearchChange: (v: string) => void
  onSearchFocus: () => void
  onAdd: (item: LabItem) => void
  onRemove: (id: number) => void
  onAddCombo: (item: LabItem) => void
  onRemoveCombo: (id: number) => void
}) {
  const [showHistory, setShowHistory] = useState(false)
  const orderStatus = {
    PENDING: 'Queued for LIS',
    PROCESSING: 'Sending to LIS',
    ACCEPTED: 'Sent to LIS',
    FAILED: 'Delivery failed. A retry is scheduled.',
  }

  return (
    <FormSection id="labs" title="Lab Orders" icon={Icons.flask} badge={selectedItems.length + selectedCombos.length || undefined}>
      {labOrder && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <p className="font-semibold" aria-live="polite">{orderStatus[labOrder.status]}{labOrder.accession_number && ` · ${labOrder.accession_number}`}</p>
          <p className="mt-1">{[...labOrder.test_codes, ...labOrder.package_codes].join(', ')}</p>
        </div>
      )}
      {labOrder?.status === 'ACCEPTED' && labOrder.accession_number ? (
        <LinkedLabReports patientId={patientId} accessionNumber={labOrder.accession_number} />
      ) : !labOrder && lisConfigured ? (
        <LinkedLabReports patientId={patientId} />
      ) : null}
      {!labOrder && lisConnected && <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Orders are sent to the connected LIS.</p>}
      {/* Previous lab reports collapsible */}
      {lastLabReports && lastLabReports.length > 0 && (
        <div className="mb-4 border border-emerald-200 bg-emerald-50/40 rounded-xl overflow-hidden">
          <button type="button"
            onClick={() => setShowHistory(s => !s)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center text-emerald-600">{Icons.flask}</span>
              EMR lab history · {lastLabReports.length} test{lastLabReports.length > 1 ? 's' : ''}
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3.5 h-3.5 transition-transform ${showHistory ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {showHistory && (
            <div className="border-t border-emerald-100 divide-y divide-emerald-50">
              {lastLabReports.map(r => (
                <div key={r.id} className="px-4 py-2.5 bg-white/60 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{r.test_name}</p>
                    {r.result_value && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.result_value} {r.unit} {r.reference_range && <span className="text-slate-400">({r.reference_range})</span>}
                      </p>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    r.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    r.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!labOrder && <>
      {/* Lab search */}
      <div ref={labSearchRef} className="relative z-30 mb-4">
        <input
          className={inputCls}
          value={labSearch}
          onChange={e => onSearchChange(e.target.value)}
          onFocus={onSearchFocus}
          onClick={onSearchFocus}
          placeholder="Search lab tests or combos to order…"
        />
        {showDropdown && ((labCatalog && labCatalog.length > 0) || (comboCatalog && comboCatalog.length > 0)) && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-2xl max-h-60 overflow-y-auto">
            {comboCatalog && comboCatalog.length > 0 && (
              <>
                <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">Combo Panels</div>
                {comboCatalog.map((item: LabItem) => (
                  <button key={`combo-${item.id}`} type="button"
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between gap-4 border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
                    onClick={() => onAddCombo(item)}
                  >
                    <span className="font-medium text-slate-800">{item.name}</span>
                    {item.price > 0 && <span className="text-xs text-slate-400">₹{item.price.toFixed(2)}</span>}
                  </button>
                ))}
              </>
            )}
            {labCatalog && labCatalog.length > 0 && (
              <>
                <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">Individual Tests</div>
                {labCatalog.map((item: LabItem) => (
                  <button key={`lab-${item.id}`} type="button"
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between gap-4 border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
                    onClick={() => onAdd(item)}
                  >
                    <span className="font-medium text-slate-800">{item.name}</span>
                    {item.price > 0 && <span className="text-xs text-slate-400">₹{item.price.toFixed(2)}</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
        {showDropdown && labSearch.length >= 1 && labCatalog?.length === 0 && comboCatalog?.length === 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-2xl px-4 py-3 text-sm text-slate-400">
            No tests found for "{labSearch}"
          </div>
        )}
      </div>

      {/* Selected tests */}
      {selectedItems.length > 0 || selectedCombos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedCombos.map(item => (
            <div key={`combo-${item.id}`}
              className="flex items-center gap-2 bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200 px-3 py-1.5 rounded-lg text-sm font-semibold">
              {item.name}
              {item.price > 0 && <span className="text-xs text-fuchsia-500 font-normal">₹{item.price.toFixed(0)}</span>}
              <button type="button" onClick={() => onRemoveCombo(item.id)} className="text-fuchsia-400 hover:text-fuchsia-600 transition-colors">
                {Icons.x}
              </button>
            </div>
          ))}
          {selectedItems.map(item => (
            <div key={`lab-${item.id}`}
              className="flex items-center gap-2 bg-primary-50 text-primary-700 border border-primary-200 px-3 py-1.5 rounded-md text-sm font-semibold">
              {item.name}
              {item.price > 0 && <span className="text-xs text-primary-500 font-normal">₹{item.price.toFixed(0)}</span>}
              <button type="button" onClick={() => onRemove(item.id)} className="text-primary-400 hover:text-primary-600 transition-colors">
                {Icons.x}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{labSearch ? '' : 'Search and select lab tests or combos to order.'}</p>
      )}
      </>}
    </FormSection>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewVisitPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const patientId = Number(searchParams.get('patient_id'))
  const appointmentId = searchParams.get('appointment_id') ? Number(searchParams.get('appointment_id')) : null

  const { data: me } = useMe()
  const { data: clinic } = useClinic()
  const doctorIdFromUrl = searchParams.get('doctor_id') ? Number(searchParams.get('doctor_id')) : null
  const [assignedDoctorId, setAssignedDoctorId] = useState<number | null>(null)
  const doctorId = assignedDoctorId ?? doctorIdFromUrl ?? me?.id ?? 0

  const canManageClinical = me?.role?.name === 'Admin' || me?.role?.permissions?.some(p => p.name === 'manage_clinical') || false

  const [printType, setPrintType] = useState<'prescription' | 'report' | null>(null)
  const [isPGOpen, setIsPGOpen] = useState(false)
  const [pgPrompt, setPgPrompt] = useState<string | undefined>()
  const [isPrepareOpen, setIsPrepareOpen] = useState(false)
  const [isChangesOpen, setIsChangesOpen] = useState(false)
  const [isLoopsOpen, setIsLoopsOpen] = useState(false)
  const [isMedIntelOpen, setIsMedIntelOpen] = useState(false)
  const [isSmartPlanOpen, setIsSmartPlanOpen] = useState(false)

  const handlePrint = (type: 'prescription' | 'report') => {
    setPrintType(current => current ?? type)
  }

  const { data: patient } = usePatient(patientId)
  const allergyRecords = useQuery({
    queryKey: ['clinicalHistory', patientId, 'allergies'],
    queryFn: () => getAllergies(patientId),
    enabled: !!patientId,
  })
  const { data: vitalConfigs } = useVitalConfigs()
  const { data: statuses } = useAppointmentStatuses()
  const { data: lastLabReports } = useLatestLabResults(patientId)
  const createVisit = useCreateVisit()
  const updateVisit = useUpdateVisit()
  const createDrug = useCreateDrug()

  const { data: patientAppointments, isLoading: appointmentsLoading } = useAppointments({ patient_id: patientId })
  const createAppointment = useCreateAppointment()

  // ── Form state ──
  const [editingEncounterId, setEditingEncounterId] = useState<number | null>(() => {
    const encId = searchParams.get('encounter_id')
    if (encId) return parseInt(encId, 10)
    return null
  })
  const [editingVersion, setEditingVersion] = useState<number | null>(null)
  const [recordedLabOrder, setRecordedLabOrder] = useState<VisitLabOrderIntent | null>(null)
  const visitLabOrderKey = ['visitLabOrder', editingEncounterId]
  const { data: refreshedLabOrder } = useQuery({
    queryKey: visitLabOrderKey,
    queryFn: ({ signal }) => getVisitLabOrder(editingEncounterId!, signal),
    enabled: !!editingEncounterId && recordedLabOrder?.encounter_id === editingEncounterId,
    staleTime: 0,
    refetchInterval: (query) => query.state.data?.status === 'ACCEPTED' ? false : 10_000,
  })
  const labOrderIntent = recordedLabOrder?.encounter_id === editingEncounterId
    ? refreshedLabOrder ?? recordedLabOrder
    : null
  const rememberLabOrder = (intent: VisitLabOrderIntent | null) => {
    if (intent) queryClient.setQueryData(['visitLabOrder', intent.encounter_id], intent)
    setRecordedLabOrder(intent)
  }

  const [status, setStatus] = useState('Open')
  const isNoShowOrCancelled = status === 'No Show' || status === 'Cancelled'
  const [isStarting, setIsStarting] = useState(false)

  const selectedAppointment = patientAppointments?.find(a => a.id === appointmentId)
  const canStartConsultation = !!selectedAppointment && !editingEncounterId &&
    !['Ongoing', 'Completed', 'Cancelled', 'No Show'].includes(selectedAppointment.status)
  const startConsultation = async () => {
    if (!appointmentId || isStarting) return
    setIsStarting(true)
    try {
      await startAppointment(appointmentId)
      await queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setStatus('Ongoing')
      setSaveError('')
    } catch (e) {
      setSaveError(isAxiosError(e) ? ((e.response?.data as { detail?: string })?.detail || e.message) : 'Could not start consultation')
    } finally {
      setIsStarting(false)
    }
  }
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [quickNotes, setQuickNotes] = useState('')
  const [advice, setAdvice] = useState('')
  const [followupDays, setFollowupDays] = useState<number | ''>('')
  const [followupMonths, setFollowupMonths] = useState<number | ''>('')
  const [followupDate, setFollowupDate] = useState('')
  const [vitals, setVitals] = useState<Record<number, string>>({})
  const [complaints, setComplaints] = useState<ComplaintRow[]>([])
  const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>([])
  const [treatments, setTreatments] = useState<TreatmentRow[]>([])
  const [selectedLabs, setSelectedLabs] = useState<LabItem[]>([])
  const [selectedCombos, setSelectedCombos] = useState<LabItem[]>([])
  const [prescriptions, setPrescriptions] = useState<PrescriptionInput[]>([])
  const [saveError, setSaveError] = useState('')
  const [lisOrderError, setLisOrderError] = useState<string | null>(null)
  const [isRetryingLisOrder, setIsRetryingLisOrder] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [isSigned, setIsSigned] = useState(false)
  const draftFields = { reason, notes, quickNotes, advice, followupDays, followupMonths, followupDate, vitals, complaints, diagnoses, treatments, prescriptions, selectedLabs, selectedCombos }
  const draftSnapshot = JSON.stringify(draftFields)
  const hasDocumentation = !!(reason || notes || quickNotes || advice || complaints.length || diagnoses.length || treatments.length || prescriptions.length || selectedLabs.length || selectedCombos.length || Object.keys(vitals).length)
  const hasUnsavedChanges = !isSigned && (savedSnapshot === null ? hasDocumentation : savedSnapshot !== draftSnapshot)
  useEffect(() => {
    if (editingVersion !== null && savedSnapshot === null) setSavedSnapshot(draftSnapshot)
  }, [editingVersion, savedSnapshot, draftSnapshot])
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [hasUnsavedChanges])

  // ── Carry-forward ──
  const [carryStatus, setCarryStatus] = useState<CarryStatus>(null)
  const handleCarryForward = async (specificEncounterId?: number | any) => {
    const encId = typeof specificEncounterId === 'number' ? specificEncounterId : undefined;
    setCarryStatus('loading')
    try {
      const data = encId
        ? await queryClient.fetchQuery({ queryKey: ['visit', encId], queryFn: () => getVisitById(encId), staleTime: 0 })
        : await queryClient.fetchQuery({ queryKey: ['lastVisit', patientId], queryFn: () => getLastVisit(patientId) })
      const enc = data.encounter
      if (encId && enc.patient_id !== patientId) {
        setCarryStatus('error')
        return
      }
      if (encId && enc.status === 'Completed') {
        navigate(`/patients/${patientId}`, { replace: true })
        return
      }
      if (encId) {
        rememberLabOrder(data.lab_order_intent ?? null)
        setAssignedDoctorId(enc.doctor_id)
        setStatus(enc.status || 'Open')
        setEditingVersion(enc.version)
      }
      setReason(enc.reason || '')
      setNotes(enc.notes || '')
      setQuickNotes(enc.quick_notes || '')
      setAdvice(enc.advice || '')
      setFollowupDays(enc.followup_days || '')
      setFollowupDate(enc.followup_date || '')
      setFollowupMonths('')
      setVitals(data.vitals.reduce<Record<number, string>>((acc, v) => ({ ...acc, [v.vital_config_id]: v.value || '' }), {}))
      setComplaints(data.complaints.map(c => ({ complaint: c.complaint, from_date: c.from_date || '', duration: c.duration || '' })))
      setDiagnoses(data.diagnoses.map(d => ({ diagnosis: d.diagnosis, date: d.date || '' })))
      setTreatments(data.treatments.map(tr => ({ treatment: tr.treatment, due_date: tr.due_date || '' })))
      setPrescriptions(data.prescriptions?.flatMap(p => p.items as PrescriptionInput[]) || [])
      if (encId) {
        setSelectedLabs(data.lab_order_intent ? [] : enc.draft_orders?.labs ?? [])
        setSelectedCombos(data.lab_order_intent ? [] : enc.draft_orders?.packages ?? [])
      }
      setCarryStatus('loaded')
    } catch (e) {
      setCarryStatus(isAxiosError(e) && e.response?.status === 404 ? 'none' : 'error')
    }
  }

  useEffect(() => {
    const edit = searchParams.get('edit')
    const encId = searchParams.get('encounter_id')
    if (edit === 'true' || encId) {
      handleCarryForward(encId ? parseInt(encId, 10) : undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // ── Vital formula computation ──
  const lastComputedVitals = useRef<Record<number, string>>({})
  useEffect(() => {
    if (!vitalConfigs) return
    let updated = false
    const newVitals = { ...vitals }
    vitalConfigs.forEach(vc => {
      if (vc.data_type === 'computed' && vc.formula) {
        let expression = vc.formula
        vitalConfigs.forEach(inner => {
          if (inner.data_type !== 'computed') {
            const val = parseFloat(newVitals[inner.id] || '0') || 0
            const regex = new RegExp(inner.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
            expression = expression.replace(regex, val.toString())
          }
        })
        try {
          const result = new Function(`return ${expression}`)()
          const computed = (isNaN(result) || !isFinite(result) || result === 0) ? '' : result.toFixed(2)
          if (computed !== lastComputedVitals.current[vc.id]) {
            newVitals[vc.id] = computed
            lastComputedVitals.current[vc.id] = computed
            updated = true
          }
        } catch { /* ignore */ }
      }
    })
    if (updated) setVitals(newVitals)
  }, [vitals, vitalConfigs])

  // ── Drug search ──
  const [drugSearch, setDrugSearch] = useState('')
  const [showDrugDropdown, setShowDrugDropdown] = useState(false)
  const drugSearchRef = useRef<HTMLDivElement>(null)
  const { data: drugResults } = useDrugs(drugSearch)

  // ── Lab search ──
  const [labSearch, setLabSearch] = useState('')
  const [showLabDropdown, setShowLabDropdown] = useState(false)
  const labSearchRef = useRef<HTMLDivElement>(null)
  const canLoadLabCatalog = !labOrderIntent && (!editingEncounterId || editingVersion !== null)
  const { data: labCatalog } = useLabCatalog(labSearch, { enabled: canLoadLabCatalog })
  const { data: comboCatalog } = useComboCatalog(labSearch, { enabled: canLoadLabCatalog })
  const orderCombo = useOrderCombo()
  const lisStatus = useLISStatus()

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drugSearchRef.current && !drugSearchRef.current.contains(e.target as Node)) setShowDrugDropdown(false)
      if (labSearchRef.current && !labSearchRef.current.contains(e.target as Node)) setShowLabDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Complaints CRUD ──
  const addComplaint = () => setComplaints(c => [...c, { complaint: '', from_date: '', duration: '' }])
  const removeComplaint = (i: number) => setComplaints(c => c.filter((_, j) => j !== i))
  const updateComplaint = (i: number, field: keyof ComplaintRow, val: string) =>
    setComplaints(c => c.map((item, j) => j === i ? { ...item, [field]: val } : item))

  // ── Diagnoses CRUD ──
  const addDiagnosis = () => setDiagnoses(d => [...d, { diagnosis: '', date: '' }])
  const removeDiagnosis = (i: number) => setDiagnoses(d => d.filter((_, j) => j !== i))
  const updateDiagnosis = (i: number, field: keyof DiagnosisRow, val: string) =>
    setDiagnoses(d => d.map((item, j) => j === i ? { ...item, [field]: val } : item))

  // ── Treatments CRUD ──
  const addTreatment = () => setTreatments(t => [...t, { treatment: '', due_date: '' }])
  const removeTreatment = (i: number) => setTreatments(t => t.filter((_, j) => j !== i))
  const updateTreatment = (i: number, field: keyof TreatmentRow, val: string) =>
    setTreatments(t => t.map((item, j) => j === i ? { ...item, [field]: val } : item))

  // ── Prescriptions CRUD ──
  const addDrug = (name: string) => {
    setPrescriptions(p => [...p, { name, morning: '', afternoon: '', evening: '', night: '', when: '', details: '' }])
    setDrugSearch('')
    setShowDrugDropdown(false)
  }
  const removePrescription = (i: number) => setPrescriptions(p => p.filter((_, j) => j !== i))
  const updatePrescription = <K extends keyof PrescriptionInput>(i: number, field: K, val: PrescriptionInput[K]) =>
    setPrescriptions(p => p.map((item, j) => j === i ? { ...item, [field]: val } : item))
  const handleCreateDrug = async (name: string) => {
    try { await createDrug.mutateAsync({ name, is_active: true }); addDrug(name) }
    catch { alert('Failed to create drug.') }
  }
  const handleSaveToCatalog = async (name: string) => {
    if (window.confirm(`Save "${name}" to drug catalog?`)) {
      try { await createDrug.mutateAsync({ name, is_active: true }); alert('Saved!') }
      catch { alert('Failed to save.') }
    }
  }

  // ── Lab items CRUD ──
  const addLabItem = (item: LabItem) => {
    if (!selectedLabs.find(l => l.id === item.id)) setSelectedLabs(l => [...l, item])
    setLabSearch('')
    setShowLabDropdown(false)
  }
  const removeLabItem = (id: number) => setSelectedLabs(l => l.filter(x => x.id !== id))

  // ── Scrollspy: track active section ──
  const [activeSection, setActiveSection] = useState<SectionKey>('overview')
  const sectionKeys: SectionKey[] = ['overview', 'vitals', 'complaints', 'diagnoses', 'treatments', 'prescriptions', 'labs', 'followup', 'assistant']

  const handleScroll = useCallback(() => {
    for (const key of [...sectionKeys].reverse()) {
      const el = document.getElementById(`visit-section-${key}`)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (rect.top <= 120) { setActiveSection(key); break }
    }
  }, [])

  useEffect(() => {
    const content = document.getElementById('visit-content-scroll')
    content?.addEventListener('scroll', handleScroll, { passive: true })
    return () => content?.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // ── Submit ──
  const performSave = async (finalStatus: string, keepOpen = false) => {
    if (canStartConsultation && finalStatus !== 'No Show' && finalStatus !== 'Cancelled') {
      setSaveError('Start the consultation before saving.');
      return
    }
    if (finalStatus === 'Completed' && !reason.trim() && !notes.trim() && !complaints.some(item => item.complaint.trim())) {
      setSaveError('Document a reason, complaint or clinical note before completing the visit.'); return
    }
    setShowSaveModal(false)
    setSaveError('')
    setLisOrderError(null)
    const isLisConfigured = !!lisStatus.data?.configured
    const isLisConnected = !!lisStatus.data?.connected
    const lisCodes = [...new Set([...selectedLabs.map(item => item.lis_code).filter((code): code is string => !!code), ...selectedCombos.flatMap(combo => combo.lis_test_codes || [])])]
    const packageCodes = [...new Set(selectedCombos.map(item => item.lis_code).filter((code): code is string => !!code))]

    const payload: VisitPayload = {
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_id: appointmentId,
      status: finalStatus,
      reason: reason || null,
      notes: notes || null,
      quick_notes: quickNotes || null,
      advice: advice || null,
      followup_days: followupDays ? Number(followupDays) : undefined,
      followup_months: followupMonths ? Number(followupMonths) : undefined,
      followup_date: followupDate || undefined,
      vitals: Object.entries(vitals).filter(([, v]) => v !== '').map(([id, value]) => ({ vital_config_id: Number(id), value })),
      complaints: complaints.filter(c => c.complaint.trim()),
      diagnoses: diagnoses.filter(d => d.diagnosis.trim()),
      treatments: treatments.filter(tr => tr.treatment.trim()),
      lab_test_catalogs: labOrderIntent ? undefined : isLisConfigured ? [] : selectedLabs.map(l => l.id),
      lis_order: !labOrderIntent && isLisConfigured && (lisCodes.length > 0 || packageCodes.length > 0) ? {
        test_codes: lisCodes,
        package_codes: packageCodes,
        notes: reason || diagnoses.map(item => item.diagnosis).join(', '),
      } : undefined,
      prescriptions: prescriptions.filter(p => p.name.trim()),
      draft_orders: labOrderIntent ? undefined : { labs: selectedLabs, packages: selectedCombos },
    }
    if (keepOpen) {
      delete (payload as Partial<VisitPayload>).lab_test_catalogs
      delete payload.lis_order
    }
    if (editingEncounterId) {
      if (editingVersion === null) {
        setSaveError('Wait for the current visit to load before saving.')
        return
      }
      payload.expected_version = editingVersion
    }
    try {
      const saved = editingEncounterId
        ? await updateVisit.mutateAsync({ id: editingEncounterId, data: payload })
        : await createVisit.mutateAsync(payload)
      const savedVisit = saved.encounter
      const savedLabOrder = saved.lab_order_intent ?? labOrderIntent
      if (!editingEncounterId) setEditingEncounterId(savedVisit.id)
      if (savedLabOrder) {
        rememberLabOrder(savedLabOrder)
        setSelectedLabs([])
        setSelectedCombos([])
      }
      setEditingVersion(savedVisit.version)
      setStatus(finalStatus)
      setSavedSnapshot(savedLabOrder ? JSON.stringify({ ...draftFields, selectedLabs: [], selectedCombos: [] }) : draftSnapshot)
      setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      setIsSigned(finalStatus === 'Completed')
      if (keepOpen) {
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('encounter_id', String(savedVisit.id)); nextParams.set('edit', 'true')
        setSearchParams(nextParams, { replace: true })
        return
      }

      if (isLisConfigured || savedLabOrder) {
        if (payload.lis_order && savedLabOrder?.status !== 'ACCEPTED') {
          const sourceId = savedVisit.id
          if (!isLisConnected) {
            setLisOrderError(`Visit #${sourceId} saved. The laboratory request is queued and will retry automatically when the LIS is available.`)
            return
          }
          try {
            const result = await submitVisitLabOrder(sourceId)
            rememberLabOrder(result)
            if (result.status !== 'ACCEPTED') {
              setLisOrderError(`Visit #${sourceId} saved. The laboratory request is ${result.status.toLowerCase()} and will retry automatically. ${result.last_error || ''}`)
              return
            }
          } catch (lisErr) {
            setLisOrderError(`Visit #${sourceId} saved with a queued laboratory request. ${isAxiosError(lisErr) ? ((lisErr.response?.data as { detail?: string })?.detail || lisErr.message) : 'Submission will retry automatically.'}`)
            return
          }
        }
      } else if (selectedCombos.length > 0) {
        await Promise.all(selectedCombos.map(combo => orderCombo.mutateAsync({ patient_id: patientId, combo_id: combo.id })))
      }

      navigate(`/patients/${patientId}?tab=visits`)
    } catch (e) {
      setSaveError(isAxiosError(e) ? ((e.response?.data as { detail?: string })?.detail || t('visit.failedSave')) : t('visit.failedSave'))
    }
  }

  const handleRetryLisOrder = async () => {
    if (!editingEncounterId) return
    setIsRetryingLisOrder(true)
    setLisOrderError(null)
    try {
      const result = await submitVisitLabOrder(editingEncounterId)
      rememberLabOrder(result)
      if (result.status !== 'ACCEPTED') setLisOrderError(`The laboratory request is ${result.status.toLowerCase()} and will retry automatically. ${result.last_error || ''}`)
    } catch (e) {
      setLisOrderError(`LIS lab order retry failed: ${isAxiosError(e) ? ((e.response?.data as { detail?: string })?.detail || e.message) : 'Unknown error'}`)
    } finally {
      setIsRetryingLisOrder(false)
    }
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    if (!appointmentId && !searchParams.get('edit')) {
      setSaveError('An appointment must be selected for this visit.')
      return
    }
    if (canStartConsultation && status !== 'Cancelled' && status !== 'No Show') {
      setSaveError('Start the consultation before saving this visit.')
      return
    }
    if (status !== 'Cancelled' && status !== 'No Show') {
      setShowSaveModal(true)
    } else {
      performSave(status)
    }
  }

  // ── Component Sub-render: Appointment Selector ──
  const isEditing = searchParams.get('edit') === 'true'
  if (!appointmentId && !isEditing && !appointmentsLoading) {
    const pendingAppointments = patientAppointments?.filter(a => !['Completed', 'Cancelled', 'No Show'].includes(a.status)) || []

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <div className="card shadow-modal w-full max-w-md overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">Select Appointment</h2>
            <p className="text-xs text-slate-500 mt-1">Please select an existing appointment or create a walk-in appointment to start this visit.</p>
          </div>
          <div className="p-5 max-h-[60vh] overflow-y-auto">
            {pendingAppointments.length > 0 ? (
              <div className="space-y-2 mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pending Appointments</p>
                {pendingAppointments.map(app => (
                  <button
                    key={app.id}
                    onClick={() => {
                      if (app.encounter_id && app.encounter_status !== 'Completed') {
                        setEditingEncounterId(app.encounter_id)
                        handleCarryForward(app.encounter_id)
                      }
                      navigate(consultationPath(app), { replace: true })
                    }}
                    className="w-full text-left p-3 rounded-md border border-border hover:border-primary-300 hover:bg-primary-50 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-primary-700">
                        {new Date(app.appointment_time).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Status: {app.status}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-primary-100 flex items-center justify-center text-slate-400 group-hover:text-primary-600 transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 mb-6">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <p className="text-sm font-medium text-slate-600">No pending appointments today</p>
                <p className="text-xs text-slate-400 mt-1">Create a new walk-in appointment to proceed.</p>
              </div>
            )}

            <button
              type="button"
              disabled={createAppointment.isPending}
              onClick={() => {
                createAppointment.mutate({
                  patient_id: patientId,
                  doctor_id: doctorId,
                  appointment_type_id: null,
                  appointment_time: new Date().toISOString(),
                  status: 'Scheduled'
                }, {
                  onSuccess: (data) => {
                    const params = new URLSearchParams(searchParams)
                    params.set('appointment_id', String(data.id))
                    navigate(`?${params.toString()}`, { replace: true })
                  }
                })
              }}
              className="btn btn-primary w-full py-2.5 px-4 flex items-center justify-center gap-2"
            >
              {createAppointment.isPending ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Create Walk-in Appointment
                </>
              )}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="btn btn-secondary w-full mt-3 py-2 text-xs"
            >
              Cancel & Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Guard ──
  if (!patientId) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-slate-400">
        <p className="text-sm">{t('visit.missingInfo')}</p>
        <button onClick={() => navigate('/patients')} className="mt-3 text-primary-600 text-sm font-medium">{t('visit.goBack')}</button>
      </div>
    )
  }

  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : '…'
  const activeAllergies = allergyRecords.data?.filter(item => item.status === 'Active') ?? []
  const isPending = createVisit.isPending || updateVisit.isPending

  // sidebar counts
  const counts: Partial<Record<SectionKey, number>> = {
    vitals: vitalConfigs?.filter(vc => vitals[vc.id]).length,
    complaints: complaints.length,
    diagnoses: diagnoses.length,
    treatments: treatments.length,
    prescriptions: prescriptions.length,
    labs: selectedLabs.length,
  }

  const visitDataForPrinting = printType && patient ? ({
    encounter: {
      encounter_date: new Date().toISOString(),
      quick_notes: quickNotes,
      advice: advice,
      followup_days: followupDays,
      followup_months: followupMonths,
      followup_date: followupDate,
    },
    vitals: Object.entries(vitals).filter(([_, val]) => val).map(([k, v]) => {
      const cfg = vitalConfigs?.find(c => c.id.toString() === k)
      return { name: cfg?.name || k, unit: '', value: Number(v) }
    }),
    complaints,
    diagnoses,
    treatments,
    prescriptions: prescriptions.length > 0 ? [{ items: prescriptions }] : [],
  } as unknown as VisitResponse) : null;

  return (
    <div className="consultation-workspace flex h-full overflow-hidden bg-slate-50">
      {/* Mini Sidebar */}
      <VisitSidebar
        active={activeSection}
        counts={counts}
        carryStatus={carryStatus}
        onCarryForward={handleCarryForward}
        isPending={isPending}
        isEditing={!!editingEncounterId}
        onCancel={() => navigate(`/patients/${patientId}`)}
        patientName={patientName}
        onBackToPatient={() => navigate(`/patients/${patientId}`)}
        status={status}
      />

      {/* Main content and docked footer container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Main scrollable content */}
        <div id="visit-content-scroll" className="flex-1 min-w-0 overflow-y-auto">
          {/* Sticky breadcrumb bar */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            {/* Breadcrumb */}
            <nav className="hidden sm:flex items-center gap-1.5 min-w-0">
              <button
                onClick={() => navigate('/patients')}
                className="text-sm text-slate-400 hover:text-slate-700 font-medium transition-colors shrink-0"
              >
                {t('patients.title')}
              </button>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-300 shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
              <button
                onClick={() => navigate(`/patients/${patientId}`)}
                className="text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors truncate max-w-[160px]"
              >
                {patientName}
              </button>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-300 shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
              <span className="text-sm font-semibold text-slate-800 shrink-0">
                {editingEncounterId ? 'Edit Visit' : 'New Visit'}
              </span>
            </nav>
            {canStartConsultation && !isNoShowOrCancelled && (
              <button type="button" onClick={startConsultation} disabled={isStarting || !canManageClinical}
                className="btn btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-50">
                {isStarting ? 'Starting…' : 'Start consultation'}
              </button>
            )}
            {(!canStartConsultation || isNoShowOrCancelled) && (
              <div className="ml-auto flex items-center gap-2 flex-wrap">
                {isNoShowOrCancelled ? (
                  <>
                    <span role="status" className="text-xs text-rose-600 font-semibold">
                      Marked as {status}
                    </span>
                    <button
                      type="button"
                      disabled={isPending || !canManageClinical}
                      onClick={() => performSave(status)}
                      className="btn btn-primary cursor-pointer"
                    >
                      {isPending ? 'Saving…' : `Save as ${status}`}
                    </button>
                  </>
                ) : (
                  <>
                    <span role="status" className="text-xs text-slate-500 hidden md:block">{isSigned ? 'Signed' : hasUnsavedChanges ? 'Unsaved changes' : savedAt ? `Draft saved at ${savedAt}` : editingEncounterId ? 'Draft loaded' : 'New consultation'}</span>
                    <button type="button" disabled={isPending || isSigned || !canManageClinical} onClick={() => performSave('Ongoing', true)} className="btn btn-secondary">{isPending ? 'Saving…' : 'Save draft'}</button>
                    <button type="submit" form="visit-form" disabled={isPending || isSigned || !canManageClinical} className="btn btn-primary">Review & complete</button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Prominent Patient Details Banner */}
          {patient && (
            <div className="mx-4 sm:mx-6 mt-6 p-5 bg-gradient-to-r from-white via-emerald-50/30 to-teal-50/20 border border-slate-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-6xl shadow-xs">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 shadow-sm shadow-emerald-700/20">
                  {patient.first_name?.[0]}{patient.last_name?.[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{patientName}</h2>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2 items-center">
                    {patient.opd_number && <span className="font-mono text-slate-600 font-medium">{patient.opd_number}</span>}
                    {patient.opd_number && <span>·</span>}
                    <span>{patient.gender}</span>
                    <span>·</span>
                    <span>{patient.dob ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs` : ''}</span>
                    {patient.blood_group && (
                      <>
                        <span>·</span>
                        <span className="text-red-500 font-bold">{patient.blood_group}</span>
                      </>
                    )}
                    {patient.contact_number && (
                      <>
                        <span>·</span>
                        <span>{patient.contact_number}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {patient.language ? (
                <div className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-xl shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-indigo-500">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Language</p>
                    <p className="text-sm font-bold text-indigo-700">{patient.language}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 px-4 py-2.5 rounded-xl shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-amber-500">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Language</p>
                    <p className="text-sm font-bold text-amber-700">Not Specified</p>
                  </div>
                </div>
              )}
            </div>
          )}
          {!isNoShowOrCancelled && (
            <div className="mx-4 sm:mx-6 mt-3 max-w-6xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AllergyStatus records={allergyRecords.data} isPending={allergyRecords.isPending} isError={allergyRecords.isError} />
            </div>
          )}

          {/* Form sections */}
          <div className="flex items-start gap-6 px-4 sm:px-6 max-w-6xl">
          <form id="visit-form" onSubmit={handleSave} className="py-6 space-y-6 flex-1 min-w-0">
          {!isNoShowOrCancelled && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="font-semibold text-slate-900 text-balance">Consultation progress</h2>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">{[
                ['History', !!(reason.trim() || notes.trim() || complaints.some(item => item.complaint.trim()))],
                ['Assessment', diagnoses.some(item => item.diagnosis.trim())],
                ['Plan', !!(advice.trim() || treatments.length || prescriptions.length || selectedLabs.length || selectedCombos.length)],
                ['Follow-up', !!(followupDays || followupMonths || followupDate)],
              ].map(([label, present]) => <div key={String(label)} className="rounded-lg bg-slate-50 px-3 py-2"><p className="font-medium text-slate-700">{label}</p><p className={present ? 'mt-1 text-primary-700' : 'mt-1 text-slate-500'}>{present ? 'Documented' : 'Not documented'}</p></div>)}</div>
              <p className="mt-3 text-xs text-slate-500">Document what was assessed. Save a draft to continue later; completion signs the record.</p>
            </div>
          )}

          <OverviewSection
            status={status} reason={reason} notes={notes} quickNotes={quickNotes} advice={advice}
            statuses={statuses}
            onStatus={v => { setStatus(v); setSaveError('') }} onReason={setReason} onNotes={setNotes}
            onQuickNotes={setQuickNotes} onAdvice={setAdvice}
            onPrint={patient ? () => handlePrint('report') : undefined}
            isPreparingPrint={!!printType}
            onQuickSave={() => performSave(status)}
          />

          {!isNoShowOrCancelled && (
            <>
              {vitalConfigs && vitalConfigs.length > 0 && (
                <VitalsSection
                  vitalConfigs={vitalConfigs}
                  vitals={vitals}
                  onChange={(id, val) => setVitals(v => ({ ...v, [id]: val }))}
                />
              )}

              <ComplaintsSection
                complaints={complaints}
                onAdd={addComplaint}
                onRemove={removeComplaint}
                onUpdate={updateComplaint}
              />

              <DiagnosesSection
                diagnoses={diagnoses}
                onAdd={addDiagnosis}
                onRemove={removeDiagnosis}
                onUpdate={updateDiagnosis}
                readOnly={!canManageClinical}
              />

              <TreatmentsSection
                treatments={treatments}
                onAdd={addTreatment}
                onRemove={removeTreatment}
                onUpdate={updateTreatment}
                readOnly={!canManageClinical}
                onOpenSmartPlan={() => setIsSmartPlanOpen(true)}
              />

              <PrescriptionsSection
                prescriptions={prescriptions}
                drugSearch={drugSearch}
                showDropdown={showDrugDropdown}
                drugResults={drugResults}
                drugSearchRef={drugSearchRef}
                activeAllergies={activeAllergies}
                onSearchChange={v => { setDrugSearch(v); setShowDrugDropdown(true) }}
                onSearchFocus={() => drugSearch.length >= 1 && setShowDrugDropdown(true)}
                onAddDrug={addDrug}
                onCreateDrug={handleCreateDrug}
                onRemove={removePrescription}
                onUpdate={updatePrescription}
                onSaveToCatalog={handleSaveToCatalog}
                onPrint={patient ? () => handlePrint('prescription') : undefined}
                isPreparingPrint={!!printType}
                onOpenMedIntelligence={() => setIsMedIntelOpen(true)}
              />

              <LabSection
                selectedItems={selectedLabs}
                selectedCombos={selectedCombos}
                labSearch={labSearch}
                showDropdown={showLabDropdown}
                labCatalog={labCatalog as LabItem[] | undefined}
                comboCatalog={comboCatalog as LabItem[] | undefined}
                labSearchRef={labSearchRef}
                lisConnected={!!lisStatus.data?.connected}
                lisConfigured={!!lisStatus.data?.configured}
                labOrder={labOrderIntent}
                patientId={patientId}
                lastLabReports={lastLabReports}
                onSearchChange={v => { setLabSearch(v); setShowLabDropdown(true) }}
                onSearchFocus={() => setShowLabDropdown(true)}
                onAdd={addLabItem}
                onRemove={removeLabItem}
                onAddCombo={(item) => {
                  if (!selectedCombos.find(c => c.id === item.id)) setSelectedCombos(c => [...c, item])
                  setLabSearch('')
                  setShowLabDropdown(false)
                }}
                onRemoveCombo={(id) => setSelectedCombos(c => c.filter(x => x.id !== id))}
              />

              <FollowupSection
                followupDays={followupDays} followupMonths={followupMonths} followupDate={followupDate}
                onFollowupDays={v => { setFollowupDays(v ? Number(v) : ''); setFollowupMonths(''); setFollowupDate('') }}
                onFollowupMonths={v => { setFollowupMonths(v ? Number(v) : ''); setFollowupDays(''); setFollowupDate('') }}
                onFollowupDate={v => { setFollowupDate(v); setFollowupDays(''); setFollowupMonths('') }}
              />

              <ClinicalAiAssistant disabled={!canManageClinical || isSigned} data={{
                reason, notes, advice,
                complaints: complaints.filter(item => item.complaint.trim()).map(item => [item.complaint, item.duration].filter(Boolean).join(' · ')),
                vitals: (vitalConfigs || []).filter(item => vitals[item.id]).map(item => `${item.name}: ${vitals[item.id]}`),
                diagnoses: diagnoses.filter(item => item.diagnosis.trim()).map(item => item.diagnosis),
                treatments: treatments.filter(item => item.treatment.trim()).map(item => item.treatment),
                prescriptions: prescriptions.filter(item => item.name.trim()).map(item => [item.name, item.morning && `Morning: ${item.morning}`, item.afternoon && `Afternoon: ${item.afternoon}`, item.evening && `Evening: ${item.evening}`, item.night && `Night: ${item.night}`, item.when, item.duration_days && `Days: ${item.duration_days}`, item.details].filter(Boolean).join(' · ')),
                followup: followupDate || (followupDays ? `Follow-up in ${followupDays} days` : followupMonths ? `Follow-up in ${followupMonths} months` : ''),
              }} onApply={text => setNotes(existing => [existing.trim(), text].filter(Boolean).join('\n\n'))} />
            </>
          )}

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-600">
              {saveError}
            </div>
          )}

          {lisOrderError && labOrderIntent?.status !== 'ACCEPTED' && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-sm text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-amber-800">Visit Saved with Lab Order Warning</p>
                <p className="text-amber-700 text-xs mt-0.5">{lisOrderError}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRetryLisOrder}
                  disabled={isRetryingLisOrder}
                  className="btn btn-primary px-3 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 border-none text-white disabled:opacity-50"
                >
                  {isRetryingLisOrder ? 'Retrying…' : 'Retry Lab Order'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/patients/${patientId}`)}
                  className="btn btn-secondary px-3 py-1.5 text-xs"
                >
                  View Patient
                </button>
              </div>
            </div>
          )}

          {/* Bottom padding so last section isn't hidden behind nothing */}
          <div className="h-8" />
        </form>
        {!isNoShowOrCancelled && (
          <div className="hidden xl:block w-72 shrink-0 sticky top-20 space-y-4 pb-8">
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
              onOpenTrends={() => navigate(`/patients/${patientId}?tab=labs`)}
            />
            <ConsultationContext patientId={patientId} />
          </div>
        )}
        </div>
      </div>

      {/* ─── 22. Sticky Consultation Completion Footer (Section 22) ─── */}
      <div className="sticky bottom-0 z-30 bg-gradient-to-r from-white via-slate-50/90 to-white backdrop-blur-md border-t border-slate-200/90 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className={cn('size-2 rounded-full', isPending ? 'bg-amber-500 animate-pulse' : isNoShowOrCancelled ? 'bg-rose-500' : 'bg-emerald-500 shadow-2xs')} />
            <span>{isPending ? 'Saving changes…' : isNoShowOrCancelled ? `Status: ${status}` : 'Autosave: Draft active'}</span>
          </div>
          {!isNoShowOrCancelled && (
            <>
              <span className="text-slate-300">|</span>
              <div className="hidden md:flex items-center gap-2 text-slate-500">
                <span className="font-semibold text-slate-800">{complaints.length}</span> complaints ·
                <span className="font-semibold text-slate-800">{diagnoses.length}</span> diagnoses ·
                <span className="font-semibold text-slate-800">{prescriptions.length}</span> prescriptions ·
                <span className="font-semibold text-slate-800">{selectedLabs.length + selectedCombos.length}</span> labs
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isNoShowOrCancelled ? (
            <>
              <button
                type="button"
                onClick={() => navigate(`/patients/${patientId}`)}
                className="btn btn-secondary text-xs px-3.5 py-1.5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending || !canManageClinical}
                onClick={() => performSave(status)}
                className="btn btn-primary text-xs px-4 py-1.5 font-bold shadow-md shadow-emerald-700/20 cursor-pointer"
              >
                {isPending ? 'Saving…' : `Save as ${status}`}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsPrepareOpen(true)}
                className="btn btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 text-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/80 shadow-2xs font-semibold cursor-pointer"
              >
                <span>📋</span> Brief
              </button>
              <button
                type="button"
                onClick={() => {
                  setPgPrompt(undefined)
                  setIsPGOpen(true)
                }}
                className="btn text-xs px-2.5 py-1.5 flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 bg-gradient-to-r from-[#061712] via-[#0d2820] to-[#071913] hover:from-[#081f18] hover:to-[#09221a] border border-emerald-900/60 shadow-2xs font-semibold cursor-pointer"
              >
                <span className="text-emerald-400">✦</span> Ask PG
              </button>
              <button
                type="button"
                disabled={isPending || isSigned}
                onClick={() => performSave('Open')}
                className="btn btn-secondary text-xs px-3.5 py-1.5"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handlePrint('report')}
                className="btn btn-secondary text-xs px-3.5 py-1.5 hidden sm:inline-flex"
              >
                Preview Note
              </button>
              <button
                type="button"
                disabled={isPending || isSigned}
                onClick={() => setShowSaveModal(true)}
                className="btn btn-primary text-xs px-4 py-1.5 font-bold shadow-md shadow-emerald-700/20 cursor-pointer"
              >
                Complete Consultation
              </button>
            </>
          )}
        </div>
      </div>
      </div>

      {patientId && canManageClinical && !isNoShowOrCancelled ? <AiChartSummary patientId={patientId} /> : null}

      <AlertDialog.Root open={showSaveModal} onOpenChange={setShowSaveModal}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
          <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90dvh] overflow-y-auto">
            <div className="w-16 h-16 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <AlertDialog.Title className="text-xl font-semibold text-slate-900 text-balance">Review & complete consultation</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-slate-500 text-pretty">Confirm the documentation for {patientName}. Signing locks this visit; later corrections are recorded as amendments.</AlertDialog.Description>
            <dl className="my-5 grid grid-cols-2 gap-3 text-sm">{[['Complaints', complaints.filter(item => item.complaint.trim()).length], ['Diagnoses', diagnoses.filter(item => item.diagnosis.trim()).length], ['Prescription lines', prescriptions.filter(item => item.name.trim()).length], ['Lab selections', selectedLabs.length + selectedCombos.length]].map(([label, count]) => <div key={String(label)} className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-800 tabular-nums">{count}</dd></div>)}</dl>
            <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3"><AllergyStatus records={allergyRecords.data} isPending={allergyRecords.isPending} isError={allergyRecords.isError} /></p>
            {saveError && <p role="alert" className="mt-3 text-sm text-red-700">{saveError}</p>}
            <div className="flex flex-col gap-3">
              <button disabled={isPending || isSigned || me?.id !== doctorId} onClick={() => performSave('Completed')} className="btn btn-primary w-full py-2.5">
                Sign & complete
              </button>
              <button disabled={isPending || isSigned} onClick={() => performSave('Waiting')} className="btn btn-secondary w-full py-2.5">
                Save & await results
              </button>
              <AlertDialog.Cancel className="btn btn-secondary w-full mt-2 py-2 text-sm">Return to note</AlertDialog.Cancel>
            </div>
            {me?.id !== doctorId && <p className="mt-3 text-xs text-slate-500">Only the assigned clinician can sign this visit.</p>}
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Hidden Print Layout */}
      {printType && visitDataForPrinting && patient && (
        <PrintableVisit
          visit={visitDataForPrinting}
          patient={patient}
          clinic={clinic}
          doctor={me}
          type={printType}
          onAfterPrint={() => setPrintType(null)}
        />
      )}

      {/* ─── PG Assistant Drawer (Sections 12–20 & 36) ─── */}
      <PGAssistantDrawer
        isOpen={isPGOpen}
        onClose={() => setIsPGOpen(false)}
        patientId={patientId}
        patientName={patient ? `${patient.first_name} ${patient.last_name}` : 'Patient'}
        opdNumber={patient?.opd_number}
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

      {/* ─── Smart Plan Extraction Modal (Section 25) ─── */}
      <SmartPlanExtractionModal
        isOpen={isSmartPlanOpen}
        onClose={() => setIsSmartPlanOpen(false)}
        patientId={patientId}
        visitId={editingEncounterId || undefined}
        onPlanApplied={(actions) => {
          const extraAdvice = actions.map(a => `${a.type.toUpperCase()}: ${a.description}${a.due_in ? ` (${a.due_in})` : ''}`).join('\n')
          if (extraAdvice) {
            setAdvice(prev => prev ? `${prev}\n${extraAdvice}` : extraAdvice)
          }
        }}
      />
    </div>
  )
}
