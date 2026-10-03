import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPatientAiSummary } from '../api/patients'

export function AiChartSummary({ patientId }: { patientId: number }) {
  const [open, setOpen] = useState(false)
  const summary = useQuery({ queryKey: ['patientAiSummary', patientId], queryFn: () => getPatientAiSummary(patientId), enabled: open && !!patientId })
  return <details style={{ bottom: 'max(4.5rem, env(safe-area-inset-bottom))', right: 'max(1.5rem, env(safe-area-inset-right))' }} className="fixed z-30 print:hidden max-w-sm rounded-xl border border-slate-200 bg-white shadow-lg" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-primary-700">AI chart summary</summary>
    <div className="border-t border-slate-200 p-4 max-h-96 overflow-y-auto">
      <p className="text-xs text-slate-500 text-pretty">Generated from recorded visits. Review the source chart before using this summary.</p>
      {summary.isLoading ? <p role="status" className="mt-4 text-sm text-slate-500">Loading summary…</p>
        : summary.isError ? <div role="alert" className="mt-4 text-sm text-slate-600"><p>A summary is not available for this patient.</p><button className="btn btn-secondary mt-3" onClick={() => summary.refetch()}>Retry</button></div>
        : <><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{summary.data?.summary_text || 'No generated summary is recorded yet.'}</p>
          {summary.data?.last_updated_at && <p className="mt-3 text-xs text-slate-500">Updated {new Date(summary.data.last_updated_at).toLocaleString()}</p>}</>}
    </div>
  </details>
}
