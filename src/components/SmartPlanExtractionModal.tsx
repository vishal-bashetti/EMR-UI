import { useState } from 'react'
import { structurePlanText, commitPlanActions, type PlanActionCandidate } from '../api/patientBrain'
import { Icons } from './Icons'
import { useQueryClient } from '@tanstack/react-query'

interface SmartPlanExtractionModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: number
  visitId?: number
  onPlanApplied?: (actions: PlanActionCandidate[]) => void
}

export function SmartPlanExtractionModal({
  isOpen,
  onClose,
  patientId,
  visitId,
  onPlanApplied,
}: SmartPlanExtractionModalProps) {
  const queryClient = useQueryClient()
  const [inputText, setInputText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parsedActions, setParsedActions] = useState<PlanActionCandidate[]>([])
  const [isCommitting, setIsCommitting] = useState(false)

  if (!isOpen) return null

  const handleParse = async () => {
    if (!inputText.trim()) return
    setIsParsing(true)
    try {
      const resp = await structurePlanText(patientId, inputText)
      setParsedActions(resp.actions)
    } catch {
      // Fallback
      setParsedActions([])
    } finally {
      setIsParsing(false)
    }
  }

  const handleCommit = async () => {
    if (parsedActions.length === 0) return
    setIsCommitting(true)
    try {
      await commitPlanActions(patientId, parsedActions, visitId)
      queryClient.invalidateQueries({ queryKey: ['openLoops', patientId] })
      queryClient.invalidateQueries({ queryKey: ['patientBrain', patientId] })
      if (onPlanApplied) onPlanApplied(parsedActions)
      onClose()
    } catch {
      // Handle error
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-emerald-400 font-bold text-base">✦</span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">AI-Assisted Plan Structuring</h2>
              <p className="text-xs text-slate-400">Convert clinical notes into structured decisions &amp; loops</p>
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

        <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Input text */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800">
              Type or paste your informal plan:
            </label>
            <textarea
              rows={3}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="e.g. continue meds repeat hba1c after 3 months and review..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-emerald-600 font-mono text-xs"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleParse}
                disabled={!inputText.trim() || isParsing}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isParsing ? 'Analyzing…' : 'Structure Plan'}
              </button>
            </div>
          </div>

          {/* Structured confirmation preview (Section 25) */}
          {parsedActions.length > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                I Understood (Confirm before saving):
              </span>
              <ul className="space-y-1.5">
                {parsedActions.map((a, i) => (
                  <li key={i} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-emerald-100 font-medium text-slate-800">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span className="flex-1">{a.description}</span>
                    {a.due_in && (
                      <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        {a.due_in}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 font-semibold text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={parsedActions.length === 0 || isCommitting}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 disabled:opacity-40 shadow-xs transition-colors cursor-pointer"
          >
            {isCommitting ? 'Saving…' : 'Confirm & Commit Plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
