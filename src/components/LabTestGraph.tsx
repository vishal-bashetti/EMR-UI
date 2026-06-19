import React, { useState } from 'react'
import { useLabResultsHistory } from '../hooks/useLabResults'

export function LabTestGraph({ patientId, testName, referenceRange, unit }: { patientId: number; testName: string; referenceRange?: string | null; unit?: string | null }) {
  const { data: history } = useLabResultsHistory(patientId, testName, 10)
  const [isOpen, setIsOpen] = useState(false)

  // Parse numeric values, filter out non-numerics or nulls
  const dataPoints = (history || [])
    .map(r => ({
      date: new Date(r.ordered_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      value: parseFloat(r.result_value || ''),
      raw: r
    }))
    .filter(d => !isNaN(d.value))
    .reverse() // Chronological order

  if (dataPoints.length < 2) {
    return null // Need at least 2 points for a graph
  }

  // Common SVG drawing logic
  const drawGraph = (width: number, height: number, showLabels: boolean = false) => {
    const padding = showLabels ? 40 : 5
    const graphWidth = width - padding * 2
    const graphHeight = height - padding * 2

    const values = dataPoints.map(d => d.value)
    const minVal = Math.min(...values)
    const maxVal = Math.max(...values)
    const range = maxVal - minVal || 1 // Avoid divide by zero

    const points = dataPoints.map((d, i) => {
      const x = padding + (i / (dataPoints.length - 1)) * graphWidth
      const y = height - padding - ((d.value - minVal) / range) * graphHeight
      return { x, y, d }
    })

    const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`

    return (
      <svg width={width} height={height} className="overflow-visible">
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth={showLabels ? 2 : 1.5} strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={showLabels ? 4 : 2} fill="#2563eb" className="cursor-pointer transition-all hover:r-6" />
            {showLabels && (
              <text x={p.x} y={p.y - 12} fontSize="12" fill="#475569" textAnchor="middle" fontWeight="bold">
                {p.d.value}
              </text>
            )}
            {showLabels && (
              <text x={p.x} y={height - 10} fontSize="11" fill="#94a3b8" textAnchor="middle">
                {p.d.date}
              </text>
            )}
          </g>
        ))}
      </svg>
    )
  }

  return (
    <>
      <div 
        className="inline-flex items-center justify-center p-1 cursor-pointer hover:bg-slate-100 rounded opacity-60 hover:opacity-100 transition-all border border-transparent hover:border-slate-200"
        onClick={(e) => { e.stopPropagation(); setIsOpen(true) }}
        title="View test history graph"
      >
        <div className="w-12 h-6 flex items-center justify-center">
          {drawGraph(48, 24)}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Test History: {testName}</h3>
                {referenceRange && <p className="text-sm text-slate-500 mt-0.5">Reference: {referenceRange} {unit}</p>}
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-8 flex items-center justify-center border-b border-slate-100 bg-slate-50/50">
              {drawGraph(500, 250, true)}
            </div>
            <div className="p-6 bg-slate-50">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Recent Results</h4>
              <div className="space-y-2">
                {dataPoints.slice().reverse().map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <span className="font-medium text-slate-700">{d.date}</span>
                    <span className={`font-bold ${d.raw.status === 'Abnormal' ? 'text-red-600' : 'text-slate-900'}`}>
                      {d.value} <span className="font-normal text-slate-400">{unit}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
