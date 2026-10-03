import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPatientOpenLoops, createOpenLoop, closeOpenLoop, type OpenLoopItem } from '../api/patientBrain'
import { Icons } from './Icons'
import { cn } from '../utils/cn'

interface OpenLoopsModalProps {
  isOpen: boolean
  onClose: () => void
  patientId: number
}

export function OpenLoopsModal({ isOpen, onClose, patientId }: OpenLoopsModalProps) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [newDesc, setNewDesc] = useState('')
  const [newType, setNewType] = useState('investigation')
  const [newDays, setNewDays] = useState('30')
  const [showAddForm, setShowAddForm] = useState(false)

  const { data: loops = [], isLoading } = useQuery<OpenLoopItem[]>({
    queryKey: ['openLoops', patientId],
    queryFn: () => getPatientOpenLoops(patientId),
    enabled: isOpen,
  })

  const closeLoopMutation = useMutation({
    mutationFn: (loopId: number) => closeOpenLoop(patientId, loopId, 'Manually closed by clinician'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['openLoops', patientId] })
      queryClient.invalidateQueries({ queryKey: ['patientBrain', patientId] })
    },
  })

  const addLoopMutation = useMutation({
    mutationFn: () => {
      const expDate = new Date()
      expDate.setDate(expDate.getDate() + parseInt(newDays || '30'))
      return createOpenLoop(patientId, {
        type: newType,
        description: newDesc,
        expected_date: expDate.toISOString().split('T')[0],
      })
    },
    onSuccess: () => {
      setNewDesc('')
      setShowAddForm(false)
      queryClient.invalidateQueries({ queryKey: ['openLoops', patientId] })
      queryClient.invalidateQueries({ queryKey: ['patientBrain', patientId] })
    },
  })

  if (!isOpen) return null

  const displayedLoops = loops.filter(l => {
    if (filter === 'pending') return l.status === 'pending' || l.status === 'overdue'
    if (filter === 'completed') return l.status === 'completed'
    return true
  })

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-amber-400 font-bold text-base">🔄</span>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Clinical Open Loops</h2>
              <p className="text-xs text-slate-400">Track pending orders, referrals, and repeat tests</p>
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

        {/* Filter bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex gap-1.5">
            {(['pending', 'completed', 'all'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-lg font-semibold capitalize transition-colors cursor-pointer",
                  filter === f ? "bg-slate-900 text-white shadow-2xs" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
          >
            {showAddForm ? 'Cancel' : '+ Add Loop'}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <form
            onSubmit={e => {
              e.preventDefault()
              if (newDesc.trim()) addLoopMutation.mutate()
            }}
            className="p-3 bg-emerald-50/50 border-b border-emerald-100 text-xs space-y-2.5"
          >
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="What needs to happen? (e.g. Repeat HbA1c, Review MRI report)..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-hidden focus:border-emerald-600"
            />
            <div className="flex items-center gap-2">
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 font-medium"
              >
                <option value="investigation">Lab / Investigation</option>
                <option value="referral">Referral</option>
                <option value="follow_up">Follow-Up Review</option>
                <option value="medication_review">Medication Review</option>
              </select>
              <select
                value={newDays}
                onChange={e => setNewDays(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 font-medium"
              >
                <option value="7">In 1 week</option>
                <option value="14">In 2 weeks</option>
                <option value="30">In 1 month</option>
                <option value="90">In 3 months</option>
                <option value="180">In 6 months</option>
              </select>
              <button
                type="submit"
                disabled={!newDesc.trim() || addLoopMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-600 disabled:opacity-50 cursor-pointer ml-auto"
              >
                Save Loop
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
          {isLoading ? (
            <p className="p-6 text-center text-slate-500">Loading open loops…</p>
          ) : displayedLoops.length === 0 ? (
            <p className="p-8 text-center text-slate-500 italic">No loops found in this category.</p>
          ) : (
            displayedLoops.map(loop => (
              <div
                key={loop.id}
                className={cn(
                  "p-3 rounded-xl border flex items-center justify-between gap-3",
                  loop.status === 'completed' ? "bg-slate-50 border-slate-200 opacity-75" :
                  loop.is_overdue ? "bg-rose-50/70 border-rose-200" :
                  "bg-white border-slate-200 shadow-2xs"
                )}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{loop.description}</span>
                    {loop.is_overdue && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                        {loop.days_overdue}d Overdue
                      </span>
                    )}
                    {loop.status === 'completed' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Completed
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex gap-2">
                    <span>Expected: {loop.expected_date || 'N/A'}</span>
                    <span>•</span>
                    <span className="capitalize">{loop.type}</span>
                    {loop.completion_note && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">{loop.completion_note}</span>
                      </>
                    )}
                  </div>
                </div>

                {loop.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => closeLoopMutation.mutate(loop.id)}
                    disabled={closeLoopMutation.isPending}
                    className="shrink-0 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    ✓ Complete
                  </button>
                )}
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
