import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPatientBrain, type PatientBrainData } from '../api/patientBrain'
import { Icons } from './Icons'
import { cn } from '../utils/cn'

interface PatientBrainSidebarProps {
  patientId: number
  onOpenPG: (prompt?: string) => void
  onOpenPrepareBrief: () => void
  onOpenChanges: () => void
  onOpenLoops: () => void
  onOpenMedIntelligence: () => void
  onOpenTrends: () => void
}

export function PatientBrainSidebar({
  patientId,
  onOpenPG,
  onOpenPrepareBrief,
  onOpenChanges,
  onOpenLoops,
  onOpenMedIntelligence,
  onOpenTrends,
}: PatientBrainSidebarProps) {
  const { data: brain, isLoading, isError, refetch } = useQuery<PatientBrainData>({
    queryKey: ['patientBrain', patientId],
    queryFn: () => getPatientBrain(patientId),
    staleTime: 30000,
  })

  if (isLoading) {
    return (
      <aside aria-label="Patient Brain" className="w-72 shrink-0 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 text-xs animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        <div className="h-8 bg-slate-100 rounded"></div>
        <div className="h-16 bg-slate-100 rounded"></div>
      </aside>
    )
  }

  if (isError || !brain) {
    return (
      <aside aria-label="Patient Brain" className="w-72 shrink-0 bg-white border border-slate-200 rounded-xl p-4 shadow-xs text-xs space-y-2">
        <div className="flex items-center justify-between text-slate-800 font-bold">
          <span>Patient Brain</span>
          <button onClick={() => refetch()} className="text-emerald-700 hover:underline">Retry</button>
        </div>
        <p className="text-slate-500">Clinical index unavailable.</p>
      </aside>
    )
  }

  const overdueCount = brain.overdue_loops_count || 0
  const attentionItems = [...brain.needs_decision, ...brain.needs_attention]

  return (
    <aside aria-label="Patient Brain" className="w-72 shrink-0 space-y-3.5 select-none">
      {/* Brain Header Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-3.5 shadow-sm border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold text-sm">✦</span>
            <span className="font-bold tracking-tight text-xs uppercase text-slate-200">Patient Brain</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-emerald-300">
            v{brain.version}
          </span>
        </div>

        {/* 3 Metrics Strip */}
        <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-white/10 text-center">
          <div className="bg-white/5 rounded-lg py-1 px-1">
            <span className="block text-xs font-bold text-white">{brain.active_problems_count}</span>
            <span className="text-[10px] text-slate-400 font-medium">Problems</span>
          </div>
          <div className={cn("rounded-lg py-1 px-1", overdueCount > 0 ? "bg-amber-500/20 text-amber-300" : "bg-white/5 text-slate-300")}>
            <span className="block text-xs font-bold">{brain.open_loops_count}</span>
            <span className="text-[10px] opacity-80 font-medium">{overdueCount > 0 ? `${overdueCount} Overdue` : 'Loops'}</span>
          </div>
          <div className="bg-white/5 rounded-lg py-1 px-1 cursor-pointer hover:bg-white/10 transition-colors" onClick={onOpenChanges}>
            <span className="block text-xs font-bold text-white">{brain.recent_changes_count}</span>
            <span className="text-[10px] text-slate-400 font-medium">Changes</span>
          </div>
        </div>
      </div>

      {/* Needs Attention / Decision section */}
      {attentionItems.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-200/90 rounded-xl p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
              <span>⚠️</span> Needs Attention ({attentionItems.length})
            </span>
          </div>
          <ul className="space-y-1.5 text-xs">
            {attentionItems.slice(0, 3).map((item, idx) => (
              <li key={idx} className="bg-white/90 rounded-lg p-2 border border-rose-100 shadow-2xs">
                <p className="font-semibold text-slate-900 leading-tight">{item.title}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{item.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overdue Loops Badge */}
      {overdueCount > 0 && (
        <div
          onClick={onOpenLoops}
          className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between cursor-pointer hover:bg-amber-100/70 transition-colors"
        >
          <div className="flex items-center gap-1.5 text-xs text-amber-900 font-bold">
            <span>⏰</span>
            <span>{overdueCount} Overdue Action{overdueCount > 1 ? 's' : ''}</span>
          </div>
          <span className="text-[11px] font-medium text-amber-700 underline">Review</span>
        </div>
      )}

      {/* Prefer Buttons Over AI (Section 17) */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
          Instant Intelligence
        </span>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            type="button"
            onClick={onOpenChanges}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-medium text-slate-700 transition-colors cursor-pointer text-left"
          >
            <span>⚡</span> What Changed?
          </button>
          <button
            type="button"
            onClick={onOpenLoops}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-medium text-slate-700 transition-colors cursor-pointer text-left"
          >
            <span>🔄</span> Pending ({brain.open_loops_count})
          </button>
          <button
            type="button"
            onClick={onOpenMedIntelligence}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-medium text-slate-700 transition-colors cursor-pointer text-left"
          >
            <span>💊</span> Med History
          </button>
          <button
            type="button"
            onClick={onOpenTrends}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 font-medium text-slate-700 transition-colors cursor-pointer text-left"
          >
            <span>📈</span> Lab Trends
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenPrepareBrief}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 font-bold text-xs transition-colors cursor-pointer mt-1"
        >
          <span>📋</span> 5-Sec Pre-Visit Brief
        </button>

        {/* Ask PG CTA */}
        <button
          type="button"
          onClick={() => onOpenPG()}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-bold text-xs shadow-xs transition-colors cursor-pointer mt-2"
        >
          <span className="text-emerald-400">✦</span> Ask PG Assistant
        </button>
      </div>
    </aside>
  )
}
