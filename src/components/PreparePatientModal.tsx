import { useQuery } from '@tanstack/react-query'
import { getPreparePatientBrief, type PreparePatientBrief } from '../api/patientBrain'
import { Icons } from './Icons'
import { cn } from '../utils/cn'

interface PreparePatientModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: number
  onAskPG: (prompt?: string) => void
}

export function PreparePatientModal({ isOpen, onClose, patientId, onAskPG }: PreparePatientModalProps) {
  const { data: brief, isLoading, isError, refetch } = useQuery<PreparePatientBrief>({
    queryKey: ['preparePatient', patientId],
    queryFn: () => getPreparePatientBrief(patientId),
    enabled: isOpen,
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-lg">
              ✦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Patient Prepared Brief</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  5-Second Review
                </span>
              </div>
              {brief && (
                <p className="text-xs text-slate-300 mt-0.5">
                  {brief.patient.name} · {brief.patient.age ?? '—'} yrs {brief.patient.gender} · {brief.patient.opd_number}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {Icons.x}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {isLoading ? (
            <div className="space-y-3 p-6 text-center text-slate-500">
              <div className="inline-block animate-spin text-emerald-600 mb-2">✦</div>
              <p>Preparing patient intelligence summary…</p>
            </div>
          ) : isError || !brief ? (
            <div className="p-6 text-center text-slate-600 space-y-2">
              <p>Failed to compile pre-visit briefing.</p>
              <button onClick={() => refetch()} className="text-emerald-700 font-bold underline">Retry</button>
            </div>
          ) : (
            <>
              {/* Active Conditions Strip */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Active Problems
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {brief.active_problems.length > 0 ? (
                    brief.active_problems.map(p => (
                      <span key={p.id} className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold text-xs">
                        {p.problem_name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">No active problems documented</span>
                  )}
                </div>
              </div>

              {/* Grid: Since Last Visit Changes & Pending */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Col 1: Since Last Visit */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    ⚡ Since Last Visit
                  </span>
                  {brief.since_last_visit_changes.length > 0 ? (
                    <ul className="space-y-2">
                      {brief.since_last_visit_changes.map((c, i) => (
                        <li key={i} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="font-semibold text-slate-800">{c.test_or_vital}</span>
                          <span className={cn(
                            "font-mono font-bold px-1.5 py-0.5 rounded text-[11px]",
                            c.severity === 'worse' ? "bg-rose-50 text-rose-700 border border-rose-200" :
                            c.severity === 'better' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            "bg-slate-50 text-slate-700"
                          )}>
                            {c.previous} → {c.current}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 italic">No significant metric changes recorded.</p>
                  )}
                </div>

                {/* Col 2: Pending & Overdue */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                    🔄 Pending Actions & Loops
                  </span>
                  {brief.overdue_loops.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-rose-700 uppercase">Overdue:</span>
                      {brief.overdue_loops.map(l => (
                        <div key={l.id} className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-900 font-medium">
                          {l.description} — <span className="font-bold">{l.days_overdue}d overdue</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {brief.pending_loops.length > 0 ? (
                    <div className="space-y-1">
                      {brief.pending_loops.map(l => (
                        <div key={l.id} className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800">
                          {l.description}
                          {l.expected_date && <span className="text-slate-500 text-[11px] block">Due: {l.expected_date}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    brief.overdue_loops.length === 0 && <p className="text-slate-400 italic">No pending actions.</p>
                  )}
                </div>
              </div>

              {/* Why Previous Medication Changed (Section 5 & 23) */}
              {brief.why_previous_medications_changed.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                    💊 Why Previous Medication Changed
                  </span>
                  <div className="space-y-1.5">
                    {brief.why_previous_medications_changed.map((m, i) => (
                      <div key={i} className="bg-white/90 p-2.5 rounded-lg border border-amber-200/60 text-slate-800">
                        <span className="font-bold text-slate-900">{m.drug_name}</span> ({m.action})
                        <div className="mt-0.5 text-slate-700 font-medium">
                          → <span className="text-amber-950 font-bold">{m.reason}</span>
                          {m.details && <span className="text-slate-600"> ({m.details})</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Visit Plan */}
              {brief.last_plan && brief.last_plan.visit_id && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Last Visit Plan ({brief.last_plan.date})
                  </span>
                  <div className="space-y-1 text-slate-700">
                    {brief.last_plan.advice && <p>• <span className="font-semibold">Advice:</span> {brief.last_plan.advice}</p>}
                    {brief.last_plan.treatments?.length > 0 && (
                      <p>• <span className="font-semibold">Treatments:</span> {brief.last_plan.treatments.join(', ')}</p>
                    )}
                    {brief.last_plan.prescriptions?.length > 0 && (
                      <p>• <span className="font-semibold">Prescriptions:</span> {brief.last_plan.prescriptions.join(', ')}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose()
              onAskPG("Summarize this patient's clinical trajectory")
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            <span className="text-emerald-400">✦</span> Ask PG Assistant
          </button>
        </div>
      </div>
    </div>
  )
}
