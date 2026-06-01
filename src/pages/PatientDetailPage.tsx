import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePatient } from '../hooks/usePatients'
import { useVisitHistory } from '../hooks/useVisits'
import { useLabResults, useUpdateLabResult } from '../hooks/useLabResults'
import { useInvoices, useUpdateInvoiceStatus } from '../hooks/useBilling'
import { useMe } from '../hooks/useUsers'
import { Icons } from '../components/Icons'
import type { LabResult, LabResultInput, VisitResponse, Invoice } from '../types'

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

// ─── Shared primitives ────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{children}</p>
  )
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
      <div className="text-slate-300 mb-2">{icon}</div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {sub && <p className="text-xs mt-1">{sub}</p>}
    </div>
  )
}

// ─── Patient Avatar ───────────────────────────────────────────────────────────

function PatientAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const colors = ['from-blue-500 to-blue-600', 'from-violet-500 to-violet-600', 'from-emerald-500 to-emerald-600', 'from-rose-500 to-rose-600', 'from-amber-500 to-amber-600']
  const color = colors[name.charCodeAt(0) % colors.length]
  const sz = size === 'sm' ? 'w-9 h-9 text-sm' : size === 'lg' ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-base'
  return (
    <div className={`${sz} bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
      {initials}
    </div>
  )
}

// ─── Patient Hero Card ────────────────────────────────────────────────────────

function PatientHero({
  patient,
  age,
  patientId,
  doctorId,
}: {
  patient: ReturnType<typeof usePatient>['data'] & object
  age: number | null
  patientId: number
  doctorId?: number
}) {
  const { t } = useTranslation()
  const name = `${patient.first_name} ${patient.last_name}`

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center gap-4">
        <PatientAvatar name={name} size="md" />

        <div className="flex-1 min-w-0">
          {/* Name + key demographics inline */}
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-slate-900 leading-tight">{name}</h1>
            {age !== null && <span className="text-sm text-slate-500">{age} yrs</span>}
            {patient.gender && <span className="text-sm text-slate-500">{patient.gender}</span>}
            {patient.dob && <span className="text-xs text-slate-400">{patient.dob}</span>}
            {patient.blood_group && (
              <span className="inline-flex items-center px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs font-bold">
                {patient.blood_group}
              </span>
            )}
          </div>

          {/* Contact + emergency inline */}
          <div className="flex flex-wrap items-center gap-3 mt-1">
            {patient.contact_number && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3 text-slate-400 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                {patient.contact_number}
              </span>
            )}
            {patient.email && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3 shrink-0"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {patient.email}
              </span>
            )}
            {patient.address && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3 shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {patient.address}
              </span>
            )}
            {(patient.emergency_contact || patient.emergency_phone) && (
              <span className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-full px-2 py-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span className="font-medium">Emergency:</span>
                {patient.emergency_contact && <span>{patient.emergency_contact}</span>}
                {patient.emergency_phone && <span>· {patient.emergency_phone}</span>}
              </span>
            )}
          </div>
        </div>

        <Link
          to={`/visits/new?patient_id=${patientId}&doctor_id=${doctorId || ''}`}
          className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-blue-200"
        >
          {Icons.plus}
          {t('patientDetail.newVisit')}
        </Link>
      </div>
    </div>
  )
}

// ─── Latest Visit Summary ─────────────────────────────────────────────────────

export function LatestVisitSummary({ visit, patientId, doctorId }: { visit: VisitResponse; patientId?: number; doctorId?: number }) {
  const { encounter, vitals, complaints, diagnoses, treatments, prescriptions } = visit
  const [expanded, setExpanded] = useState(false)
  const dt = new Date(encounter.encounter_date)

  const sections = [
    {
      label: 'Vitals', color: 'text-rose-600 bg-rose-50 border-rose-100',
      empty: 'No vitals',
      content: vitals.length > 0 && (
        <div className="space-y-1.5">
          {vitals.map(v => (
            <div key={v.id} className="flex justify-between text-sm">
              <span className="text-slate-500 text-xs">Vital {v.vital_config_id}</span>
              <span className="font-semibold text-slate-800 text-xs">{v.value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      label: 'Complaints', color: 'text-orange-600 bg-orange-50 border-orange-100',
      empty: 'None',
      content: complaints.length > 0 && (
        <ul className="space-y-1">
          {complaints.map(c => (
            <li key={c.id} className="text-xs text-slate-700">
              <span className="font-medium">{c.complaint}</span>
              {c.duration && <span className="text-slate-400 ml-1">({c.duration})</span>}
            </li>
          ))}
        </ul>
      ),
    },
    {
      label: 'Diagnoses', color: 'text-violet-600 bg-violet-50 border-violet-100',
      empty: 'None',
      content: diagnoses.length > 0 && (
        <ul className="space-y-1">
          {diagnoses.map(d => <li key={d.id} className="text-xs text-slate-700 font-medium">{d.diagnosis}</li>)}
        </ul>
      ),
    },
    {
      label: 'Treatments', color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
      empty: 'None',
      content: treatments.length > 0 && (
        <ul className="space-y-1">
          {treatments.map(tr => <li key={tr.id} className="text-xs text-slate-700">{tr.treatment}</li>)}
        </ul>
      ),
    },
  ]

  return (
    <div className="bg-gradient-to-br from-blue-50/60 to-indigo-50/40 rounded-2xl border border-blue-100 shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-blue-100/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0">
            {Icons.stethoscope}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">Latest Visit</span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                #{encounter.visit_number}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                encounter.status === 'Open'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {encounter.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              {' · '}{dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
            {encounter.reason && (
              <p className="text-xs text-slate-600 italic mt-1">"{encounter.reason}"</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {encounter.status !== 'Completed' && patientId && (
            <Link
              to={`/visits/new?patient_id=${patientId}&doctor_id=${doctorId || ''}&edit=true`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 shadow-sm"
            >
              {Icons.edit} Continue Visit
            </Link>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-white/60 rounded-lg transition-colors"
          >
            {expanded ? 'Less' : 'More'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      {/* 4-column summary grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-blue-100/60">
        {sections.map(sec => (
          <div key={sec.label} className="px-4 py-3">
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${sec.color.split(' ')[0]}`}>
              {sec.label}
            </p>
            {sec.content || <p className="text-xs text-slate-400">{sec.empty}</p>}
          </div>
        ))}
      </div>

      {/* Expanded: prescriptions + notes/advice */}
      {expanded && (
        <div className="border-t border-blue-100/60 bg-white/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-blue-100/60">
            {/* Prescriptions */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2">Prescriptions</p>
              {prescriptions && prescriptions.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Medicine', 'Timing', 'When', 'Notes'].map(h => (
                        <th key={h} className="text-left pb-1.5 font-semibold text-slate-400 pr-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {prescriptions.map((p, i) => (
                      <tr key={i}>
                        <td className="py-1.5 font-semibold text-slate-800 pr-3">{p.name}</td>
                        <td className="py-1.5 text-slate-600 pr-3 font-mono text-[11px]">
                          {[p.morning, p.afternoon, p.evening, p.night].join('-')}
                        </td>
                        <td className="py-1.5 text-slate-500 pr-3">{p.when}</td>
                        <td className="py-1.5 text-slate-400">{p.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-xs text-slate-400">None</p>}
            </div>

            {/* Notes + Advice */}
            <div className="px-4 py-3 space-y-3">
              {encounter.notes && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Doctor's Notes</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{encounter.notes}</p>
                </div>
              )}
              {encounter.advice && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Advice</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{encounter.advice}</p>
                </div>
              )}
              {!encounter.notes && !encounter.advice && (
                <p className="text-xs text-slate-400">No notes or advice recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Visit Card (history timeline) ───────────────────────────────────────────

function VisitCard({ visit, index, patientId, doctorId }: {
  visit: VisitResponse
  index: number
  patientId?: number
  doctorId?: number
}) {
  const { encounter, vitals, complaints, diagnoses, treatments, prescriptions } = visit
  const [open, setOpen] = useState(index === 0)
  const dt = new Date(encounter.encounter_date)

  const hasContent = vitals.length || complaints.length || diagnoses.length || treatments.length || (prescriptions?.length ?? 0)

  return (
    <div className={`relative bg-white border rounded-2xl transition-all duration-200 ${
      open ? 'border-blue-200 shadow-sm' : 'border-slate-200 hover:border-slate-300'
    }`}>
      {/* Timeline dot */}
      <div className="absolute -left-[25px] top-5 w-3 h-3 rounded-full border-2 border-white shadow-sm bg-blue-500" />

      {/* Header – always visible */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-800">Visit #{encounter.visit_number}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                encounter.status === 'Open'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {encounter.status}
              </span>
              {encounter.reason && (
                <span className="text-xs text-slate-400 italic truncate max-w-[200px]">"{encounter.reason}"</span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}{dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Continue visit for open encounters */}
          {encounter.status !== 'Completed' && patientId && (
            <Link
              to={`/visits/new?patient_id=${patientId}&doctor_id=${doctorId || ''}&edit=true`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors border border-blue-200"
            >
              {Icons.edit} Continue
            </Link>
          )}
          {/* summary chips */}
          {[
            complaints.length ? `${complaints.length} complaint${complaints.length > 1 ? 's' : ''}` : null,
            diagnoses.length ? `${diagnoses.length} dx` : null,
            (prescriptions?.length ?? 0) > 0 ? `${prescriptions!.length} Rx` : null,
          ].filter(Boolean).map((chip, i) => (
            <span key={i} className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full hidden sm:inline">
              {chip}
            </span>
          ))}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {/* Expanded body */}
      {open && hasContent ? (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
          {/* Vitals */}
          {vitals.length > 0 && (
            <div>
              <SectionLabel>Vitals</SectionLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {vitals.map(v => (
                  <div key={v.id} className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-medium">Vital {v.vital_config_id}</p>
                    <p className="text-sm font-bold text-slate-800">{v.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Complaints */}
          {complaints.length > 0 && (
            <div>
              <SectionLabel>Chief Complaints</SectionLabel>
              <div className="space-y-1.5">
                {complaints.map(c => (
                  <div key={c.id} className="flex items-center gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                    <span className="text-slate-700 font-medium">{c.complaint}</span>
                    {c.duration && <span className="text-slate-400 text-xs">({c.duration})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagnoses & Treatments side by side */}
          {(diagnoses.length > 0 || treatments.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {diagnoses.length > 0 && (
                <div>
                  <SectionLabel>Diagnoses</SectionLabel>
                  <div className="space-y-1.5">
                    {diagnoses.map(d => (
                      <div key={d.id} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                        <span className="text-slate-700 font-medium">{d.diagnosis}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {treatments.length > 0 && (
                <div>
                  <SectionLabel>Treatments</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {treatments.map(tr => (
                      <span key={tr.id} className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-100 px-2.5 py-1 rounded-full font-medium">
                        {tr.treatment}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Prescriptions */}
          {prescriptions && prescriptions.length > 0 && (
            <div>
              <SectionLabel>Prescriptions</SectionLabel>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Medicine', 'M', 'A', 'E', 'N', 'When', 'Notes'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {prescriptions.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-semibold text-slate-800">{p.name}</td>
                        {[p.morning, p.afternoon, p.evening, p.night].map((val, j) => (
                          <td key={j} className="px-3 py-2 text-center text-slate-600 font-mono">{val || '—'}</td>
                        ))}
                        <td className="px-3 py-2 text-slate-500">{p.when || '—'}</td>
                        <td className="px-3 py-2 text-slate-400">{p.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes/Advice */}
          {(encounter.notes || encounter.advice) && (
            <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-3.5 border border-slate-100">
              {encounter.notes && (
                <div>
                  <SectionLabel>Doctor's Notes</SectionLabel>
                  <p className="text-xs text-slate-600 leading-relaxed">{encounter.notes}</p>
                </div>
              )}
              {encounter.advice && (
                <div>
                  <SectionLabel>Advice</SectionLabel>
                  <p className="text-xs text-slate-600 leading-relaxed">{encounter.advice}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : open && !hasContent ? (
        <div className="border-t border-slate-100 px-5 py-6 text-center">
          <p className="text-sm text-slate-400">No clinical details recorded for this visit.</p>
        </div>
      ) : null}
    </div>
  )
}

// ─── Lab Result Update Modal ──────────────────────────────────────────────────

function LabResultUpdateModal({
  lab, onClose, onSave,
}: {
  lab: LabResult
  onClose: () => void
  onSave: (form: LabResultInput) => void
}) {
  const [form, setForm] = useState<LabResultInput>({
    test_name: lab.test_name,
    result_value: lab.result_value || '',
    unit: lab.unit || '',
    reference_range: lab.reference_range || '',
    status: lab.status,
    notes: lab.notes || '',
    patient_id: lab.patient_id,
    encounter_id: lab.encounter_id,
    catalog_id: lab.catalog_id,
    cost: lab.cost,
    ordered_by: lab.ordered_by,
  })

  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Update Lab Result</h2>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">{lab.test_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors">
            {Icons.x}
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Result Value</label>
              <input className={inputCls} value={form.result_value} onChange={e => setForm(f => ({ ...f, result_value: e.target.value }))} placeholder="e.g. 5.2" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unit</label>
              <input className={inputCls} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="e.g. mg/dL" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reference Range</label>
            <input className={inputCls} value={form.reference_range} onChange={e => setForm(f => ({ ...f, reference_range: e.target.value }))} placeholder="e.g. 3.5–5.0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea className={`${inputCls} resize-none min-h-[60px]`} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes…" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancel</button>
            <button onClick={() => onSave(form)} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl">Save Result</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab content components ───────────────────────────────────────────────────

function VisitHistoryTab({ visits, loading, patientId, doctorId }: {
  visits?: VisitResponse[]
  loading: boolean
  patientId: number
  doctorId?: number
}) {
  if (loading) return <Spinner />
  if (!visits?.length) {
    return (
      <EmptyState
        icon={Icons.stethoscope}
        title="No visits recorded yet"
        sub='Click "New Visit" to record the first clinical visit'
      />
    )
  }
  return (
    // Timeline: left border line
    <div className="relative pl-8 border-l-2 border-slate-100 ml-2 space-y-4">
      {visits.map((visit, i) => (
        <VisitCard key={visit.encounter.id} visit={visit} index={i} patientId={patientId} doctorId={doctorId} />
      ))}
      {/* Start-of-timeline marker */}
      <div className="absolute bottom-0 -left-[5px] w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white" />
      <Link
        to={`/visits/new?patient_id=${patientId}&doctor_id=${doctorId || ''}`}
        className="relative flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 ml-0 mt-4"
      >
        {Icons.plus} Add new visit
      </Link>
    </div>
  )
}

function LabResultsTab({ results, loading, onEdit }: {
  results?: LabResult[]
  loading: boolean
  onEdit: (lab: LabResult) => void
}) {
  if (loading) return <Spinner />
  if (!results?.length) return <EmptyState icon={Icons.flask} title="No lab results" sub="Lab orders from visits will appear here." />

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {['Test', 'Status', 'Result', 'Unit', 'Ref Range', 'Ordered', ''].map((h, i) => (
              <th key={i} className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-5 last:pr-5">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {results.map(lab => (
            <tr key={lab.id} className="hover:bg-slate-50/60 transition-colors group">
              <td className="px-4 py-3.5 pl-5 font-semibold text-slate-800">{lab.test_name}</td>
              <td className="px-4 py-3.5">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_LAB[lab.status] || 'bg-slate-100 text-slate-500'}`}>
                  {lab.status}
                </span>
              </td>
              <td className="px-4 py-3.5 text-slate-700 font-medium">{lab.result_value || <span className="text-slate-300">—</span>}</td>
              <td className="px-4 py-3.5 text-slate-400 text-xs">{lab.unit || <span className="text-slate-300">—</span>}</td>
              <td className="px-4 py-3.5 text-slate-400 text-xs">{lab.reference_range || <span className="text-slate-300">—</span>}</td>
              <td className="px-4 py-3.5 text-slate-500 text-xs">
                {new Date(lab.ordered_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </td>
              <td className="px-4 py-3.5 pr-5 text-right">
                <button
                  onClick={() => onEdit(lab)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  Update
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BillingTab({ invoices, loading, onStatusChange }: {
  invoices?: Invoice[]
  loading: boolean
  onStatusChange: (id: number, status: string) => void
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  if (loading) return <Spinner />
  if (!invoices?.length) return <EmptyState icon={Icons.billing} title="No invoices" sub="Invoices are created when lab tests are completed." />

  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0)
  const totalPending = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount, 0)

  return (
    <div className="space-y-4">
      {/* Mini summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Invoices', val: invoices.length, cls: 'text-slate-800' },
          { label: 'Paid', val: `₹${totalPaid.toFixed(0)}`, cls: 'text-emerald-700' },
          { label: 'Outstanding', val: `₹${totalPending.toFixed(0)}`, cls: 'text-amber-700' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-xs text-slate-400 font-medium">{s.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${s.cls}`}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Invoice', 'Amount', 'Status', 'Items', ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-5 last:pr-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {invoices.map(inv => (
              <>
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                  onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                >
                  <td className="px-4 py-3.5 pl-5 font-bold text-slate-800">#{inv.id}</td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">₹{inv.amount.toFixed(2)}</td>
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    <div className="relative w-fit group">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${STATUS_INV[inv.status] || 'bg-slate-100 text-slate-500'}`}>
                        {inv.status}
                      </span>
                      <select
                        value={inv.status}
                        onChange={e => onStatusChange(inv.id, e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400">
                    {inv.items?.length ?? 0} item{inv.items?.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3.5 pr-5 text-right">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3.5 h-3.5 text-slate-400 transition-transform inline ${expandedId === inv.id ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                  </td>
                </tr>
                {expandedId === inv.id && (
                  <tr key={`${inv.id}-expand`}>
                    <td colSpan={5} className="px-6 py-3 bg-slate-50/50 border-t border-slate-50">
                      {inv.items?.length > 0 ? (
                        <div className="border-l-2 border-blue-200 pl-3 space-y-1">
                          {inv.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-xs text-slate-600">
                              <span className="font-medium">{item.service_name}</span>
                              <span className="text-slate-400">{item.quantity} × ₹{item.unit_price.toFixed(2)} = ₹{(item.quantity * item.unit_price).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No line items.</p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'visits', labelKey: 'patientDetail.tabVisitHistory', icon: Icons.stethoscope },
  { key: 'labs', labelKey: 'patientDetail.tabLabResults', icon: Icons.flask },
  { key: 'billing', labelKey: 'patientDetail.tabBilling', icon: Icons.billing },
] as const
type Tab = (typeof TABS)[number]['key']

export default function PatientDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const patientId = Number(id)
  const [activeTab, setActiveTab] = useState<Tab>('visits')
  const [editingLab, setEditingLab] = useState<LabResult | null>(null)

  const { data: patient, isLoading: loadingPatient } = usePatient(patientId)
  const { data: visitHistory, isLoading: loadingVisits } = useVisitHistory(patientId, 20)
  const { data: labResults, isLoading: loadingLabs } = useLabResults(patientId)
  const { data: invoices, isLoading: loadingInvoices } = useInvoices(patientId)
  const { data: me } = useMe()
  const updateLab = useUpdateLabResult()
  const updateInvoiceStatus = useUpdateInvoiceStatus()

  const handleLabSave = async (form: LabResultInput) => {
    if (!editingLab) return
    await updateLab.mutateAsync({ id: editingLab.id, data: form })
    setEditingLab(null)
  }

  if (loadingPatient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
          {Icons.patients}
        </div>
        <p className="text-sm font-medium">{t('patientDetail.notFound')}</p>
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {Icons.arrowLeft} {t('patientDetail.backToPatients')}
        </button>
      </div>
    )
  }

  const patientName = `${patient.first_name} ${patient.last_name}`
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const age = patient.dob
    ? Math.floor((now - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  // Tab data counts for badges
  const tabCounts: Record<Tab, number | undefined> = {
    visits: visitHistory?.length,
    labs: labResults?.length,
    billing: invoices?.length,
  }

  return (
    <div className="min-h-full bg-slate-50">
      {/* Sticky header: breadcrumb + patient banner */}
      <div className="sticky top-0 z-10 shadow-sm">
        {/* Breadcrumb */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-2 flex items-center gap-1.5">
          <button
            onClick={() => navigate('/patients')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 shrink-0"
          >
            {Icons.arrowLeft}
            {t('patients.title')}
          </button>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-300 shrink-0"><polyline points="9 18 15 12 9 6"/></svg>
          <span className="text-sm font-semibold text-slate-800 truncate max-w-xs">{patientName}</span>
        </div>
        {/* Compact patient banner */}
        <PatientHero patient={patient} age={age} patientId={patientId} doctorId={me?.id} />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-4">
        {/* Tab bar */}
        <div className="flex items-center gap-1 mb-4 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
          {TABS.map(tab => {
            const count = tabCounts[tab.key]
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className={`${activeTab === tab.key ? 'text-blue-100' : 'text-slate-400'}`}>
                  {tab.icon}
                </span>
                {t(tab.labelKey)}
                {count !== undefined && count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${
                    activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'visits' && (
          <VisitHistoryTab
            visits={visitHistory}
            loading={loadingVisits}
            patientId={patientId}
            doctorId={me?.id}
          />
        )}
        {activeTab === 'labs' && (
          <LabResultsTab
            results={labResults}
            loading={loadingLabs}
            onEdit={setEditingLab}
          />
        )}
        {activeTab === 'billing' && (
          <BillingTab
            invoices={invoices}
            loading={loadingInvoices}
            onStatusChange={(id, status) => updateInvoiceStatus.mutate({ id, status })}
          />
        )}
      </div>

      {/* Lab Result Update Modal */}
      {editingLab && (
        <LabResultUpdateModal
          lab={editingLab}
          onClose={() => setEditingLab(null)}
          onSave={handleLabSave}
        />
      )}
    </div>
  )
}
