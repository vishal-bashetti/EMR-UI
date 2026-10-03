import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Icons } from './Icons'
import { cn } from '../utils/cn'
import { LabTestGraph } from './LabTestGraph'
import type { VisitResponse, LabResult, Invoice, VisitAmendment } from '../types'

type TimelineFilter = 'all' | 'consultations' | 'labs' | 'prescriptions' | 'documents'

interface UnifiedTimelineEvent {
  id: string
  type: 'consultation' | 'lab' | 'prescription' | 'document'
  date: Date
  title: string
  subtitle?: string
  status?: string
  statusColor?: string
  details?: React.ReactNode
  sourceObj?: any
}

interface UnifiedPatientTimelineProps {
  patientId: number
  visits?: VisitResponse[]
  labs?: LabResult[]
  invoices?: Invoice[]
  canAmend?: boolean
  onPrint?: (visit: VisitResponse, type: 'report' | 'prescription') => void
  onEditLab?: (lab: LabResult) => void
}

export function UnifiedPatientTimeline({
  patientId,
  visits = [],
  labs = [],
  invoices = [],
  canAmend = false,
  onPrint,
  onEditLab,
}: UnifiedPatientTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>('all')
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Construct chronological unified event stream (Section 12)
  const allEvents = useMemo(() => {
    const list: UnifiedTimelineEvent[] = []

    // 1. Consultation encounters
    visits.forEach((v) => {
      const vDate = new Date(v.encounter.encounter_date)
      const rxItems = v.prescriptions?.flatMap(p => p.items || []) || []

      list.push({
        id: `consult-${v.encounter.id}`,
        type: 'consultation',
        date: vDate,
        title: `Consultation #${v.encounter.visit_number || v.encounter.id}`,
        subtitle: v.encounter.reason ? `Reason: ${v.encounter.reason}` : (v.diagnoses.length > 0 ? `Diagnosis: ${v.diagnoses.map(d => d.diagnosis).join(', ')}` : 'Routine clinical consultation'),
        status: v.encounter.signed_at ? 'Signed' : v.encounter.status === 'Completed' ? 'Completed' : 'Draft / Open',
        statusColor: v.encounter.signed_at || v.encounter.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        sourceObj: v,
        details: (
          <div className="space-y-3 pt-2 text-xs">
            {/* Vitals & Complaints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {v.vitals.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Vitals Recorded</span>
                  <div className="flex flex-wrap gap-2 text-slate-700">
                    {v.vitals.map(vt => (
                      <span key={vt.id} className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                        {vt.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {v.complaints.length > 0 && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Chief Complaints</span>
                  <ul className="list-disc list-inside text-slate-700 space-y-0.5">
                    {v.complaints.map(c => (
                      <li key={c.id}>
                        <span className="font-semibold">{c.complaint}</span>
                        {c.duration && <span className="text-slate-500"> ({c.duration})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Prescriptions issued during this visit */}
            {rxItems.length > 0 && (
              <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100">
                <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] block mb-1">Medications Prescribed</span>
                <div className="space-y-1">
                  {rxItems.map((med, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-700">
                      <span className="font-semibold">{med.name}</span>
                      <span className="font-mono text-emerald-800 font-medium">
                        {[med.morning, med.afternoon, med.evening, med.night].join('-')} {med.when}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Doctor notes & advice */}
            {(v.encounter.notes || v.encounter.advice) && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                {v.encounter.notes && (
                  <p className="text-slate-600"><span className="font-bold text-slate-700">Notes:</span> {v.encounter.notes}</p>
                )}
                {v.encounter.advice && (
                  <p className="text-slate-600"><span className="font-bold text-slate-700">Advice:</span> {v.encounter.advice}</p>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              {onPrint && (
                <>
                  <button
                    type="button"
                    onClick={() => onPrint(v, 'report')}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Print Summary
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => onPrint(v, 'prescription')}
                    className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Print Prescription
                  </button>
                </>
              )}
              {!['Completed', 'Cancelled'].includes(v.encounter.status) && (
                <Link
                  to={`/visits/new?patient_id=${patientId}&edit=true&encounter_id=${v.encounter.id}`}
                  className="ml-auto font-bold text-xs text-emerald-700 hover:underline"
                >
                  Resume Draft →
                </Link>
              )}
            </div>
          </div>
        )
      })

      // Also create dedicated prescription event if items exist
      if (rxItems.length > 0) {
        list.push({
          id: `rx-${v.encounter.id}`,
          type: 'prescription',
          date: vDate,
          title: `Prescription (${rxItems.length} medications)`,
          subtitle: rxItems.map(m => m.name).join(', '),
          status: 'Issued',
          statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          details: (
            <div className="pt-2 text-xs space-y-1.5">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 font-semibold border-b border-slate-100">
                    <th className="pb-1">Drug</th>
                    <th className="pb-1">Dosage Timing</th>
                    <th className="pb-1">Timing</th>
                    <th className="pb-1">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rxItems.map((med, idx) => (
                    <tr key={idx}>
                      <td className="py-1 font-semibold text-slate-800">{med.name}</td>
                      <td className="py-1 font-mono text-emerald-800">{[med.morning, med.afternoon, med.evening, med.night].join('-')}</td>
                      <td className="py-1 text-slate-600">{med.when || 'After food'}</td>
                      <td className="py-1 text-slate-400">{med.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })
      }
    })

    // 2. Laboratory results
    labs.forEach((l) => {
      const lDate = new Date(l.ordered_date)
      const hasAbnormal = l.result_value && l.reference_range
      list.push({
        id: `lab-${l.id}`,
        type: 'lab',
        date: lDate,
        title: `Lab Test: ${l.test_name}`,
        subtitle: l.result_value ? `Result: ${l.result_value} ${l.unit || ''} (Ref: ${l.reference_range || '—'})` : 'Ordered — Pending analysis',
        status: l.status,
        statusColor: l.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
        sourceObj: l,
        details: (
          <div className="pt-2 text-xs space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Measured Value</span>
                <span className="text-sm font-bold text-slate-900">{l.result_value || 'Pending'} {l.unit}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reference Range</span>
                <span className="text-xs font-semibold text-slate-600">{l.reference_range || '—'}</span>
              </div>
            </div>
            {l.notes && <p className="text-slate-500 italic">"{l.notes}"</p>}
            <div className="flex items-center gap-2">
              <LabTestGraph patientId={patientId} testName={l.test_name} referenceRange={l.reference_range} unit={l.unit} />
              {onEditLab && (
                <button
                  type="button"
                  onClick={() => onEditLab(l)}
                  className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  Update Result
                </button>
              )}
            </div>
          </div>
        )
      })
    })

    // Sort descending by date
    list.sort((a, b) => b.date.getTime() - a.date.getTime())
    return list
  }, [visits, labs, patientId, onPrint, onEditLab])

  // Filter events by selected category
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return allEvents
    if (filter === 'consultations') return allEvents.filter(e => e.type === 'consultation')
    if (filter === 'labs') return allEvents.filter(e => e.type === 'lab')
    if (filter === 'prescriptions') return allEvents.filter(e => e.type === 'prescription')
    return allEvents
  }, [allEvents, filter])

  return (
    <div className="space-y-4">
      {/* ─── Timeline Filters (Section 12) ─── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { key: 'all', label: 'All History', count: allEvents.length },
            { key: 'consultations', label: 'Consultations', count: allEvents.filter(e => e.type === 'consultation').length },
            { key: 'labs', label: 'Laboratory', count: allEvents.filter(e => e.type === 'lab').length },
            { key: 'prescriptions', label: 'Prescriptions', count: allEvents.filter(e => e.type === 'prescription').length },
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key as TimelineFilter)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer',
                filter === f.key
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              )}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          Showing {filteredEvents.length} chronological events
        </p>
      </div>

      {/* ─── Timeline Event Stream ─── */}
      {filteredEvents.length === 0 ? (
        <div className="card p-12 text-center bg-white border border-slate-200/80 rounded-xl">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-800 flex items-center justify-center mx-auto mb-3 shadow-2xs">
            {Icons.calendar}
          </div>
          <p className="text-sm font-semibold text-slate-800">No events found in this category</p>
          <p className="text-xs text-slate-400 mt-1">Select "All History" or start a new clinical encounter.</p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200/80 ml-3 sm:ml-4 space-y-4">
          {filteredEvents.map((evt, idx) => {
            const isExpanded = !!expandedEvents[evt.id]
            const typeIcon = evt.type === 'consultation' ? Icons.stethoscope :
              evt.type === 'prescription' ? Icons.pill :
              Icons.flask

            const badgeBg = evt.type === 'consultation' ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white' :
              evt.type === 'prescription' ? 'bg-gradient-to-br from-teal-500 to-emerald-700 text-white' :
              'bg-gradient-to-br from-blue-500 to-indigo-700 text-white'

            return (
              <div
                key={evt.id}
                className="relative card bg-white border border-slate-200/80 rounded-xl hover:border-slate-300 transition-all shadow-2xs overflow-hidden"
              >
                {/* Timeline node icon */}
                <div className={cn(
                  'absolute -left-[35px] sm:-left-[43px] top-4 size-7 sm:size-8 rounded-full flex items-center justify-center border-2 border-white shadow-xs shrink-0',
                  badgeBg
                )}>
                  <span className="scale-75">{typeIcon}</span>
                </div>

                {/* Event Header */}
                <div
                  onClick={() => toggleExpand(evt.id)}
                  className="p-3.5 sm:p-4 cursor-pointer hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                        {evt.title}
                      </h4>
                      {evt.status && (
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', evt.statusColor || 'bg-slate-100 text-slate-600')}>
                          {evt.status}
                        </span>
                      )}
                    </div>
                    {evt.subtitle && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {evt.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400 tabular-nums">
                      {evt.date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <button
                      type="button"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={cn('size-4 transition-transform duration-150', isExpanded && 'rotate-180')}
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-white">
                    {evt.details}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
