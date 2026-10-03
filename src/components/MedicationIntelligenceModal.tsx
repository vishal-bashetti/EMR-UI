import { useQuery } from '@tanstack/react-query'
import { getMedicationIntelligence, type MedicationIntelligence } from '../api/patientBrain'
import { Icons } from './Icons'

interface MedicationIntelligenceModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: number
  drugName?: string
}

export function MedicationIntelligenceModal({
  isOpen,
  onClose,
  patientId,
  drugName,
}: MedicationIntelligenceModalProps) {
  const { data: intel, isLoading, isError } = useQuery<MedicationIntelligence>({
    queryKey: ['medicationIntelligence', patientId, drugName],
    queryFn: () => getMedicationIntelligence(patientId, drugName),
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
            <span className="text-emerald-400 font-bold text-base">💊</span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Prescription Intelligence</h2>
              <p className="text-xs text-slate-400">Patient Medication Evolution &amp; Rationales</p>
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

        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {isLoading ? (
            <p className="p-6 text-center text-slate-500">Loading medication intelligence…</p>
          ) : isError || !intel || intel.medications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="font-semibold text-slate-700">No structured medication history recorded yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Prescription changes with documented reasons will automatically appear here.
              </p>
            </div>
          ) : (
            intel.medications.map((m, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{m.drug_name}</h3>
                    <span className="text-[11px] text-slate-500">
                      Started: {m.started_at} · Current Dose: {m.latest_dose || 'N/A'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    m.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {m.status}
                  </span>
                </div>

                {m.status === 'Stopped' && m.stop_reason && (
                  <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-rose-950 font-medium">
                    <span className="font-bold">Stopped on {m.stopped_at}:</span> {m.stop_reason}
                    {m.stop_details && <span className="text-rose-800 block text-[11px] mt-0.5">{m.stop_details}</span>}
                  </div>
                )}

                {/* History Timeline */}
                <div className="space-y-1.5 pt-1 border-t border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Titration &amp; Changes:</span>
                  <ul className="space-y-1">
                    {m.history.map((h, i) => (
                      <li key={i} className="flex items-start justify-between bg-white p-2 rounded-lg border border-slate-200">
                        <div>
                          <span className="font-semibold text-slate-800">{h.action.replace('_', ' ').toUpperCase()}</span>
                          {h.transition && <span className="font-mono text-emerald-700 ml-1.5">({h.transition})</span>}
                          {h.reason && <p className="text-slate-600 text-[11px] mt-0.5">Why: {h.reason} {h.details && `(${h.details})`}</p>}
                        </div>
                        <span className="text-slate-400 text-[10px] whitespace-nowrap">{h.date}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
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
