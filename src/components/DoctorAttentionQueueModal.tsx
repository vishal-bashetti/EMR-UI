import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getClinicAttentionQueue } from '../api/patientBrain'
import { Icons } from './Icons'

interface DoctorAttentionQueueModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DoctorAttentionQueueModal({ isOpen, onClose }: DoctorAttentionQueueModalProps) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const { data: queue, isLoading, isError } = useQuery({
    queryKey: ['clinicAttentionQueue', today, page],
    queryFn: () => getClinicAttentionQueue(page),
    enabled: isOpen,
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#061712] via-[#0d2820] to-[#071913] border-b border-emerald-950/60 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-rose-500/30 to-rose-600/10 text-rose-400 border border-rose-500/30 font-bold flex items-center justify-center text-lg shadow-2xs">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Clinician Attention Queue</h2>
              <p className="text-xs text-emerald-400 font-medium">Today's appointments: Decisions, Alerts, and FYIs</p>
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

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {isLoading ? (
            <p className="p-8 text-center text-slate-500">Scanning patient records for attention items…</p>
          ) : isError ? (
            <p role="alert" className="p-8 text-center text-rose-700">Unable to load attention items. Please try again.</p>
          ) : !queue || queue.total_count === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-1">
              <p className="text-base font-bold text-slate-800">{queue?.total_patients === 0 ? 'No appointments today' : 'No attention items on this page'}</p>
              <p>Only patients with appointments today are checked. Use Next to review more patients.</p>
            </div>
          ) : (
            <>
              {/* Category 1: Needs Decision */}
              {queue.needs_decision.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs uppercase tracking-wider">
                    <span>🚨</span> Needs Decision ({queue.needs_decision.length})
                  </div>
                  <ul className="space-y-2">
                    {queue.needs_decision.map((item, idx) => (
                      <li
                        key={idx}
                        onClick={() => {
                          onClose()
                          navigate(`/patients/${item.patient_id}`)
                        }}
                        className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 hover:bg-rose-100/70 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{item.patient_name}</span>
                            <span className="text-[11px] font-mono text-emerald-800">{item.opd_number}</span>
                          </div>
                          <p className="font-semibold text-rose-900 mt-0.5">{item.title}</p>
                          <p className="text-slate-600 text-[11px]">{item.detail}</p>
                        </div>
                        <span className="text-[11px] font-bold text-rose-700 underline">Open Chart →</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Category 2: Needs Attention */}
              {queue.needs_attention.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs uppercase tracking-wider">
                    <span>⚠️</span> Needs Attention ({queue.needs_attention.length})
                  </div>
                  <ul className="space-y-2">
                    {queue.needs_attention.map((item, idx) => (
                      <li
                        key={idx}
                        onClick={() => {
                          onClose()
                          navigate(`/patients/${item.patient_id}`)
                        }}
                        className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 hover:bg-amber-100/70 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{item.patient_name}</span>
                            <span className="text-[11px] font-mono text-emerald-800">{item.opd_number}</span>
                          </div>
                          <p className="font-semibold text-amber-950 mt-0.5">{item.title}</p>
                          <p className="text-slate-600 text-[11px]">{item.detail}</p>
                        </div>
                        <span className="text-[11px] font-bold text-amber-800 underline">Open Chart →</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Category 3: FYI */}
              {queue.fyi.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <span>ℹ️</span> FYI ({queue.fyi.length})
                  </div>
                  <ul className="space-y-1.5">
                    {queue.fyi.map((item, idx) => (
                      <li
                        key={idx}
                        onClick={() => {
                          onClose()
                          navigate(`/patients/${item.patient_id}`)
                        }}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{item.patient_name}</span>
                          <span className="text-slate-600 ml-2">{item.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">View</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <button type="button" disabled={page === 1 || isLoading} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Previous</button>
            <span aria-live="polite">
              Page {page}{queue ? ` · ${queue.scanned_patients} checked / ${queue.total_patients} patients today` : ''}
            </span>
            <button type="button" disabled={!queue?.has_next || isLoading} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border disabled:opacity-40">Next</button>
          </div>
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
