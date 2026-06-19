import { useState, useRef, useEffect, useCallback } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { usePatient } from '../hooks/usePatients'
import { useMe } from '../hooks/useUsers'
import { useVitalConfigs, useCreateVisit, useUpdateVisit } from '../hooks/useVisits'
import { useAppointmentStatuses, useAppointments, useCreateAppointment, useUpdateAppointmentStatus } from '../hooks/useAppointments'
import { useLabCatalog, useLatestLabResults, useComboCatalog, useOrderCombo } from '../hooks/useLabResults'
import { useDrugs, useCreateDrug } from '../hooks/useDrugs'
import { getLastVisit, getVisitById, getDiagnosisSuggestions, getTreatmentSuggestions } from '../api/visits'
import { Icons } from '../components/Icons'
import { SuggestionInput } from '../components/SuggestionInput'
import { PrintableVisit } from '../components/PrintableVisit'
import { AiBot } from '../components/AiBot'
import { useClinic } from '../hooks/useSettings'
import type { Drug, PrescriptionInput, VitalConfig, VisitPayload, VisitResponse } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComplaintRow { complaint: string; from_date: string; duration: string }
interface DiagnosisRow { diagnosis: string; date: string }
interface TreatmentRow { treatment: string; due_date: string }
interface LabItem { id: number; name: string; price: number }
type CarryStatus = 'loading' | 'loaded' | 'none' | 'error' | null

// Sidebar section keys — used for scrollspy and navigation
type SectionKey = 'overview' | 'vitals' | 'complaints' | 'diagnoses' | 'treatments' | 'prescriptions' | 'labs'

// ─── Shared style primitives ──────────────────────────────────────────────────

const inputCls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow'
const smallInputCls = 'border border-slate-200 rounded-lg px-2.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white'
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
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-4"
    >
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-blue-600 shadow-sm shrink-0">
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-700 tracking-tight">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto text-xs font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{badge}</span>
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
      className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors -ml-2.5"
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
    label: 'Details',
    color: 'text-blue-600',
    accentBg: 'bg-blue-50',
    items: [
      { key: 'overview', label: 'Visit Overview' },
      { key: 'vitals', label: 'Vitals' },
      { key: 'complaints', label: 'Chief Complaints' },
    ],
  },
  {
    label: 'Diagnoses',
    color: 'text-violet-600',
    accentBg: 'bg-violet-50',
    items: [
      { key: 'diagnoses', label: 'Diagnoses' },
      { key: 'treatments', label: 'Treatments' },
      { key: 'prescriptions', label: 'Prescriptions' },
    ],
  },
  {
    label: 'Lab / Reports',
    color: 'text-emerald-600',
    accentBg: 'bg-emerald-50',
    items: [
      { key: 'labs', label: 'Lab Orders' },
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
}) {
  const scrollTo = (key: SectionKey) => {
    document.getElementById(`visit-section-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <aside className="sticky top-0 h-screen w-56 flex flex-col bg-white border-r border-slate-200 shrink-0 overflow-y-auto">
      {/* Top: patient context + back link */}
      <div className="px-3 pt-3 pb-3 border-b border-slate-100">
        <button
          type="button"
          onClick={onBackToPatient}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left hover:bg-blue-50 transition-colors group"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-blue-500 shrink-0 group-hover:text-blue-600">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span className="text-xs font-semibold text-slate-600 group-hover:text-blue-700 truncate leading-tight">
            {patientName || 'Patient'}
          </span>
        </button>
        <p className="text-[10px] text-slate-400 font-medium px-2.5 mt-0.5">
          {isEditing ? 'Editing visit' : 'New visit'}
        </p>
      </div>

      {/* Carry-forward */}
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

      {/* Section navigation */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {SIDEBAR_GROUPS.map(group => (
          <div key={group.label}>
            <p className={`text-[9px] font-black uppercase tracking-[0.12em] px-2 mb-1.5 ${group.color}`}>
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
        ))}
      </nav>

      {/* Bottom: save/cancel */}
      <div className="px-3 py-3 border-t border-slate-100 space-y-2">
        <button
          type="submit"
          form="visit-form"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl transition-colors shadow-sm shadow-blue-200"
        >
          {isPending ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
              Saving…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"/></svg>
              {isEditing ? 'Update Visit' : 'Save Visit'}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>
    </aside>
  )
}

// ─── Section: Visit Overview ──────────────────────────────────────────────────

function OverviewSection({
  status, reason, notes, quickNotes, advice, statuses,
  onStatus, onReason, onNotes, onQuickNotes, onAdvice, onPrint,
}: {
  status: string; reason: string; notes: string; quickNotes: string; advice: string
  statuses?: { id: number; name: string }[]
  onStatus: (v: string) => void; onReason: (v: string) => void
  onNotes: (v: string) => void; onQuickNotes: (v: string) => void; onAdvice: (v: string) => void
  onPrint?: () => void
}) {
  const { t } = useTranslation()
  return (
    <FormSection 
      id="overview" 
      title={t('visit.overview')} 
      icon={Icons.stethoscope}
      headerAction={onPrint && (
        <button type="button" onClick={onPrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors print:hidden">
          {Icons.download} Print Report
        </button>
      )}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Visit Status</label>
          <select className={inputCls} value={status} onChange={e => onStatus(e.target.value)}>
            {statuses?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t('visit.reason')}</label>
          <input className={inputCls} value={reason} onChange={e => onReason(e.target.value)} placeholder={t('visit.reasonPlaceholder')} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>{t('visit.notes')}</label>
          <textarea className={`${inputCls} min-h-[80px] resize-y`} value={notes} onChange={e => onNotes(e.target.value)} placeholder={t('visit.notesPlaceholder')} />
        </div>
        <div>
          <label className={labelCls}>{t('visit.quickNotes')}</label>
          <textarea className={`${inputCls} min-h-[70px] resize-y`} value={quickNotes} onChange={e => onQuickNotes(e.target.value)} placeholder={t('visit.quickNotesPlaceholder')} />
        </div>
        <div>
          <label className={labelCls}>{t('visit.advice')}</label>
          <textarea className={`${inputCls} min-h-[70px] resize-y`} value={advice} onChange={e => onAdvice(e.target.value)} placeholder={t('visit.advicePlaceholder')} />
        </div>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-[1fr_130px_110px_28px] gap-2 px-1">
            {['Complaint', 'From date', 'Duration', ''].map((h, i) => (
              <span key={i} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
            ))}
          </div>
          {complaints.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_130px_110px_28px] gap-2 items-center">
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
  treatments, onAdd, onRemove, onUpdate, readOnly,
}: {
  treatments: TreatmentRow[]
  onAdd: () => void
  onRemove: (i: number) => void
  onUpdate: (i: number, field: keyof TreatmentRow, val: string) => void
  readOnly?: boolean
}) {
  const { t } = useTranslation()
  return (
    <FormSection id="treatments" title={t('visit.treatments')} icon={Icons.treatment} badge={treatments.length || undefined}>
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
  prescriptions, drugSearch, showDropdown, drugResults, drugSearchRef,
  onSearchChange, onSearchFocus, onAddDrug, onCreateDrug, onRemove, onUpdate, onSaveToCatalog, onPrint
}: {
  prescriptions: PrescriptionInput[]
  drugSearch: string
  showDropdown: boolean
  drugResults?: Drug[]
  drugSearchRef: React.RefObject<HTMLDivElement | null>
  onSearchChange: (v: string) => void
  onSearchFocus: () => void
  onAddDrug: (name: string) => void
  onCreateDrug: (name: string) => void
  onRemove: (i: number) => void
  onUpdate: (i: number, field: keyof PrescriptionInput, val: string) => void
  onSaveToCatalog: (name: string) => void
  onPrint?: () => void
}) {
  const { t } = useTranslation()
  return (
    <FormSection 
      id="prescriptions" 
      title={t('visit.prescriptions')} 
      icon={Icons.pill} 
      badge={prescriptions.length || undefined}
      headerAction={onPrint && (
        <button type="button" onClick={onPrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition-colors print:hidden">
          {Icons.download} Print Rx
        </button>
      )}
    >
      {/* Drug search */}
      <div ref={drugSearchRef} className="relative mb-4">
        <input
          className={inputCls}
          value={drugSearch}
          onChange={e => onSearchChange(e.target.value)}
          onFocus={onSearchFocus}
          placeholder={t('visit.drugSearchPlaceholder')}
        />
        {showDropdown && drugResults && drugResults.length > 0 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto">
            {drugResults.map(drug => (
              <button key={drug.id} type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between gap-4 border-b border-slate-50 last:border-0 transition-colors"
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
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl px-4 py-3 text-sm flex items-center justify-between">
            <span className="text-slate-400">No drugs found for "{drugSearch}"</span>
            <button type="button" onClick={() => onCreateDrug(drugSearch)}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors">
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
              {['Medicine', 'Morning', 'Afternoon', 'Evening', 'Night', 'When', 'Notes', ''].map((h, i) => (
                <th key={i} className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {prescriptions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-400">
                  {t('visit.prescriptionsHint')}
                </td>
              </tr>
            ) : prescriptions.map((p, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <input
                      className="w-32 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      value={p.name}
                      onChange={e => onUpdate(i, 'name', e.target.value)}
                    />
                    <button type="button" title="Save to catalog" onClick={() => onSaveToCatalog(p.name)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-blue-600 transition-all rounded">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    </button>
                  </div>
                </td>
                {(['morning', 'afternoon', 'evening', 'night'] as const).map(field => (
                  <td key={field} className="px-1.5 py-2.5">
                    <input
                      className="w-14 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                      value={p[field]}
                      onChange={e => onUpdate(i, field, e.target.value)}
                      placeholder="0"
                    />
                  </td>
                ))}
                <td className="px-1.5 py-2.5">
                  <select className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
                    className="w-36 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
            ))}
          </tbody>
        </table>
      </div>
    </FormSection>
  )
}

// ─── Section: Lab Orders ──────────────────────────────────────────────────────

function LabSection({
  selectedItems, selectedCombos, labSearch, showDropdown, labCatalog, comboCatalog, labSearchRef, lastLabReports,
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
  onSearchChange: (v: string) => void
  onSearchFocus: () => void
  onAdd: (item: LabItem) => void
  onRemove: (id: number) => void
  onAddCombo: (item: LabItem) => void
  onRemoveCombo: (id: number) => void
}) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <FormSection id="labs" title="Lab Orders" icon={Icons.flask} badge={selectedItems.length + selectedCombos.length || undefined}>
      {/* Previous lab reports collapsible */}
      {lastLabReports && lastLabReports.length > 0 && (
        <div className="mb-4 border border-emerald-200 bg-emerald-50/40 rounded-xl overflow-hidden">
          <button type="button"
            onClick={() => setShowHistory(s => !s)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center text-emerald-600">{Icons.flask}</span>
              Last Lab Report · {new Date(lastLabReports[0].ordered_date).toLocaleDateString('en-GB')} · {lastLabReports.length} test{lastLabReports.length > 1 ? 's' : ''}
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

      {/* Lab search */}
      <div ref={labSearchRef} className="relative mb-4">
        <input
          className={inputCls}
          value={labSearch}
          onChange={e => onSearchChange(e.target.value)}
          onFocus={onSearchFocus}
          placeholder="Search lab tests or combos to order…"
        />
        {showDropdown && ((labCatalog && labCatalog.length > 0) || (comboCatalog && comboCatalog.length > 0)) && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto">
            {comboCatalog && comboCatalog.length > 0 && (
              <>
                <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">Combo Panels</div>
                {comboCatalog.map((item: LabItem) => (
                  <button key={`combo-${item.id}`} type="button"
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between gap-4 border-b border-slate-50 last:border-0 transition-colors"
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
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between gap-4 border-b border-slate-50 last:border-0 transition-colors"
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
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl px-4 py-3 text-sm text-slate-400">
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
              className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg text-sm font-semibold">
              {item.name}
              {item.price > 0 && <span className="text-xs text-blue-500 font-normal">₹{item.price.toFixed(0)}</span>}
              <button type="button" onClick={() => onRemove(item.id)} className="text-blue-400 hover:text-blue-600 transition-colors">
                {Icons.x}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{labSearch ? '' : 'Search and select lab tests or combos to order.'}</p>
      )}
    </FormSection>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewVisitPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const patientId = Number(searchParams.get('patient_id'))
  const appointmentId = searchParams.get('appointment_id') ? Number(searchParams.get('appointment_id')) : null

  const { data: me } = useMe()
  const { data: clinic } = useClinic()
  const doctorIdFromUrl = searchParams.get('doctor_id') ? Number(searchParams.get('doctor_id')) : null
  const doctorId = doctorIdFromUrl ?? me?.id ?? 0
  
  const canManageClinical = me?.role?.name === 'Admin' || me?.role?.permissions?.some(p => p.name === 'manage_clinical') || false

  const [printType, setPrintType] = useState<'prescription' | 'report' | null>(null)

  const handlePrint = (type: 'prescription' | 'report') => {
    setPrintType(type)
    setTimeout(() => {
      window.print()
    }, 200)
  }

  const { data: patient } = usePatient(patientId)
  const { data: vitalConfigs } = useVitalConfigs()
  const { data: statuses } = useAppointmentStatuses()
  const { data: lastLabReports } = useLatestLabResults(patientId)
  const createVisit = useCreateVisit()
  const updateVisit = useUpdateVisit()
  const createDrug = useCreateDrug()

  const { data: patientAppointments, isLoading: appointmentsLoading } = useAppointments({ patient_id: patientId })
  const createAppointment = useCreateAppointment()
  const updateAppointmentStatus = useUpdateAppointmentStatus()

  // ── Form state ──
  const [editingEncounterId, setEditingEncounterId] = useState<number | null>(() => {
    const encId = searchParams.get('encounter_id')
    if (encId) return parseInt(encId, 10)
    return null
  })

  const [status, setStatus] = useState('Open')

  useEffect(() => {
    if (appointmentId && patientAppointments) {
      const app = patientAppointments.find(a => a.id === appointmentId)
      if (app) {
        if (app.status !== 'Ongoing' && app.status !== 'Completed' && app.status !== 'Cancelled' && app.status !== 'No Show') {
          updateAppointmentStatus.mutate({ id: appointmentId, status: 'Ongoing' })
          setStatus('Ongoing')
        } else if (!editingEncounterId && app.status === 'Ongoing') {
          setStatus('Ongoing')
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, patientAppointments, editingEncounterId])
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [quickNotes, setQuickNotes] = useState('')
  const [advice, setAdvice] = useState('')
  const [vitals, setVitals] = useState<Record<number, string>>({})
  const [complaints, setComplaints] = useState<ComplaintRow[]>([])
  const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>([])
  const [treatments, setTreatments] = useState<TreatmentRow[]>([])
  const [selectedLabs, setSelectedLabs] = useState<LabItem[]>([])
  const [selectedCombos, setSelectedCombos] = useState<LabItem[]>([])
  const [prescriptions, setPrescriptions] = useState<PrescriptionInput[]>([])
  const [saveError, setSaveError] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)

  // ── Carry-forward ──
  const [carryStatus, setCarryStatus] = useState<CarryStatus>(null)
  const handleCarryForward = async (specificEncounterId?: number | any) => {
    const encId = typeof specificEncounterId === 'number' ? specificEncounterId : undefined;
    setCarryStatus('loading')
    try {
      const data = encId ? await getVisitById(encId) : await getLastVisit(patientId)
      const enc = data.encounter
      if (encId) setStatus(enc.status || 'Open')
      setReason(enc.reason || '')
      setNotes(enc.notes || '')
      setQuickNotes(enc.quick_notes || '')
      setAdvice(enc.advice || '')
      setVitals(data.vitals.reduce<Record<number, string>>((acc, v) => ({ ...acc, [v.vital_config_id]: v.value || '' }), {}))
      setComplaints(data.complaints.map(c => ({ complaint: c.complaint, from_date: c.from_date || '', duration: c.duration || '' })))
      setDiagnoses(data.diagnoses.map(d => ({ diagnosis: d.diagnosis, date: d.date || '' })))
      setTreatments(data.treatments.map(tr => ({ treatment: tr.treatment, due_date: tr.due_date || '' })))
      setPrescriptions(data.prescriptions?.flatMap(p => p.items as PrescriptionInput[]) || [])
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
  const { data: labCatalog } = useLabCatalog(labSearch)
  const { data: comboCatalog } = useComboCatalog(labSearch)
  const orderCombo = useOrderCombo()

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
  const updatePrescription = (i: number, field: keyof PrescriptionInput, val: string) =>
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
  const sectionKeys: SectionKey[] = ['overview', 'vitals', 'complaints', 'diagnoses', 'treatments', 'prescriptions', 'labs']

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
  const performSave = async (finalStatus: string) => {
    setShowSaveModal(false)
    setSaveError('')
    const payload: VisitPayload = {
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_id: appointmentId,
      status: finalStatus,
      reason: reason || null,
      notes: notes || null,
      quick_notes: quickNotes || null,
      advice: advice || null,
      vitals: Object.entries(vitals).filter(([, v]) => v !== '').map(([id, value]) => ({ vital_config_id: Number(id), value })),
      complaints: complaints.filter(c => c.complaint.trim()),
      diagnoses: diagnoses.filter(d => d.diagnosis.trim()),
      treatments: treatments.filter(tr => tr.treatment.trim()),
      lab_test_catalogs: selectedLabs.map(l => l.id),
      prescriptions: prescriptions.filter(p => p.name.trim()),
    }
    try {
      if (editingEncounterId) {
        await updateVisit.mutateAsync({ id: editingEncounterId, data: payload })
      } else {
        await createVisit.mutateAsync(payload)
      }

      if (selectedCombos.length > 0) {
        await Promise.all(selectedCombos.map(combo => orderCombo.mutateAsync({ patient_id: patientId, combo_id: combo.id })))
      }

      navigate(`/patients/${patientId}`)
    } catch (e) {
      setSaveError(isAxiosError(e) ? ((e.response?.data as { detail?: string })?.detail || t('visit.failedSave')) : t('visit.failedSave'))
    }
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    if (!appointmentId && !searchParams.get('edit')) {
      setSaveError('An appointment must be selected for this visit.')
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
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
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
                      const params = new URLSearchParams(searchParams)
                      params.set('appointment_id', String(app.id))
                      navigate(`?${params.toString()}`, { replace: true })
                    }}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">
                        {new Date(app.appointment_time).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">Status: {app.status}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
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
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-blue-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
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
              className="w-full mt-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
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
        <button onClick={() => navigate('/patients')} className="mt-3 text-blue-600 text-sm font-medium">{t('visit.goBack')}</button>
      </div>
    )
  }

  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : '…'
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

  const visitDataForPrinting = patient ? ({
    encounter: {
      encounter_date: new Date().toISOString(),
      quick_notes: quickNotes,
      advice: advice,
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
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
      />

      {/* Main content */}
      <div id="visit-content-scroll" className="flex-1 overflow-y-auto">
        {/* Sticky breadcrumb bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-2">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 min-w-0">
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
        </div>

        {/* Prominent Patient Details Banner */}
        {patient && (
          <div className="mx-6 mt-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-3xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg font-bold shrink-0">
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

        {/* Form sections */}
        <form id="visit-form" onSubmit={handleSave} className="px-6 py-6 space-y-4 max-w-3xl">
          <OverviewSection
            status={status} reason={reason} notes={notes} quickNotes={quickNotes} advice={advice}
            statuses={statuses}
            onStatus={setStatus} onReason={setReason} onNotes={setNotes}
            onQuickNotes={setQuickNotes} onAdvice={setAdvice}
            onPrint={() => handlePrint('report')}
          />

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
          />

          <PrescriptionsSection
            prescriptions={prescriptions}
            drugSearch={drugSearch}
            showDropdown={showDrugDropdown}
            drugResults={drugResults}
            drugSearchRef={drugSearchRef}
            onSearchChange={v => { setDrugSearch(v); setShowDrugDropdown(true) }}
            onSearchFocus={() => drugSearch.length >= 1 && setShowDrugDropdown(true)}
            onAddDrug={addDrug}
            onCreateDrug={handleCreateDrug}
            onRemove={removePrescription}
            onUpdate={updatePrescription}
            onSaveToCatalog={handleSaveToCatalog}
            onPrint={() => handlePrint('prescription')}
          />

          <LabSection
            selectedItems={selectedLabs}
            selectedCombos={selectedCombos}
            labSearch={labSearch}
            showDropdown={showLabDropdown}
            labCatalog={labCatalog as LabItem[] | undefined}
            comboCatalog={comboCatalog as LabItem[] | undefined}
            labSearchRef={labSearchRef}
            lastLabReports={lastLabReports}
            onSearchChange={v => { setLabSearch(v); setShowLabDropdown(true) }}
            onSearchFocus={() => labSearch.length >= 1 && setShowLabDropdown(true)}
            onAdd={addLabItem}
            onRemove={removeLabItem}
            onAddCombo={(item) => {
              if (!selectedCombos.find(c => c.id === item.id)) setSelectedCombos(c => [...c, item])
              setLabSearch('')
              setShowLabDropdown(false)
            }}
            onRemoveCombo={(id) => setSelectedCombos(c => c.filter(x => x.id !== id))}
          />

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {saveError}
            </div>
          )}

          {/* Bottom padding so last section isn't hidden behind nothing */}
          <div className="h-8" />
        </form>
      </div>

      {patientId ? <AiBot patientId={patientId} /> : null}

      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Save Consultation</h3>
            <p className="text-sm text-slate-500 mb-6">Would you like to complete this consultation or keep it open for later?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => performSave('Completed')} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                Complete Consultation
              </button>
              <button onClick={() => performSave('Waiting')} className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors">
                Keep as Waiting
              </button>
              <button onClick={() => setShowSaveModal(false)} className="w-full mt-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Layout */}
      {visitDataForPrinting && patient && (
        <PrintableVisit
          visit={visitDataForPrinting}
          patient={patient}
          clinic={clinic}
          doctor={me}
          type={printType}
        />
      )}
    </div>
  )
}
