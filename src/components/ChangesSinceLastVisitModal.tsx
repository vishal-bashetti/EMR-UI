import { useQuery } from '@tanstack/react-query'
import { getChangesSinceLastVisit, type ChangesSinceLastVisit } from '../api/patientBrain'
import { Icons } from './Icons'
import { cn } from '../utils/cn'

interface ChangesSinceLastVisitModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: number
}

export function ChangesSinceLastVisitModal({ isOpen, onClose, patientId }: ChangesSinceLastVisitModalProps) {
  const { data: changes, isLoading, isError } = useQuery<ChangesSinceLastVisit>({
    queryKey: ['changesSinceLastVisit', patientId],
    queryFn: () => getChangesSinceLastVisit(patientId),
    enabled: isOpen,
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-amber-400 font-bold text-base">⚡</span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Changes Since Last Visit</h2>
              <p className="text-xs text-slate-400">
                {changes?.last_visit_date ? `Last visit: ${changes.last_visit_date} (${changes.days_since_last_visit} days ago)` : 'All historical records'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {Icons.x}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {isLoading ? (
            <p className="p-6 text-center text-slate-500">Calculating deltas…</p>
          ) : isError || !changes ? (
            <p className="p-6 text-center text-slate-500">Could not retrieve changes.</p>
          ) : (
            <>
              {/* Important Metric Changes */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Metric Trends
                </span>
                {changes.important_metric_changes.length > 0 ? (
                  <ul className="space-y-1.5">
                    {changes.important_metric_changes.map((c, i) => (
                      <li key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="font-bold text-slate-800">{c.test_or_vital}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-mono px-2 py-0.5 rounded-md font-bold text-xs",
                            c.severity === 'worse' ? "bg-rose-50 text-rose-700 border border-rose-200" :
                            c.severity === 'better' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            "bg-slate-100 text-slate-700"
                          )}>
                            {c.previous} → {c.current}
                          </span>
                          {c.delta && <span className="text-slate-500 font-mono text-[11px]">({c.delta})</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 italic">No significant metric changes recorded.</p>
                )}
              </div>

              {/* New Lab Results */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  New Completed Lab Reports ({changes.new_results.length})
                </span>
                {changes.new_results.length > 0 ? (
                  <ul className="space-y-1.5">
                    {changes.new_results.map(r => (
                      <li key={r.id} className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900">{r.test_name}</span>
                          <span className="text-slate-500 text-[11px] block">{r.result_date}</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-800 text-sm">
                          {r.result_value} {r.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 italic">No new lab results since last visit.</p>
                )}
              </div>

              {/* Medication Changes */}
              {changes.medication_changes.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Medication Adjustments ({changes.medication_changes.length})
                  </span>
                  <ul className="space-y-1.5">
                    {changes.medication_changes.map(m => (
                      <li key={m.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{m.drug_name}</span>
                          <span className="text-[10px] font-bold uppercase text-slate-500">{m.action}</span>
                        </div>
                        {m.reason && <p className="text-slate-600 mt-1">Why: {m.reason} {m.reason_details && `(${m.reason_details})`}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-white font-semibold text-xs hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
