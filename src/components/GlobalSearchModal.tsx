import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePatients } from '../hooks/usePatients'
import { useAppointments } from '../hooks/useAppointments'
import { Icons } from './Icons'
import { cn } from '../utils/cn'

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenNewPatient?: () => void
}

export function GlobalSearchModal({ isOpen, onClose, onOpenNewPatient }: GlobalSearchModalProps) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  const { data: patients = [] } = usePatients()
  const { data: appointments = [] } = useAppointments({ limit: 100 })

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Quick navigation actions
  const quickActions = useMemo(() => [
    { id: 'act-new-patient', label: 'New Patient Registration', sub: 'Create a new patient record (Ctrl+N)', icon: Icons.plus, action: () => { onClose(); onOpenNewPatient ? onOpenNewPatient() : navigate('/patients?action=new') } },
    { id: 'act-new-consult', label: 'Start Consultation', sub: 'Open clinical consultation workspace', icon: Icons.stethoscope, action: () => { onClose(); navigate('/visits/new') } },
    { id: 'act-today', label: 'Today\'s Worklist & Queue', sub: 'View daily schedule and attention panel', icon: Icons.calendar, action: () => { onClose(); navigate('/today') } },
    { id: 'act-appts', label: 'Book Appointment', sub: 'Schedule calendar and walk-ins', icon: Icons.clock, action: () => { onClose(); navigate('/appointments') } },
    { id: 'act-pharmacy', label: 'Pharmacy & Prescriptions', sub: 'Dispensing queue and medication orders', icon: Icons.pill, action: () => { onClose(); navigate('/pharmacy') } },
    { id: 'act-labs', label: 'Orders & Results', sub: 'Diagnostic test results and LIS review', icon: Icons.flask, action: () => { onClose(); navigate('/labs') } },
  ], [navigate, onClose, onOpenNewPatient])

  // Filtered patients
  const filteredPatients = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return patients.filter(p =>
      [p.first_name, p.last_name, p.opd_number, p.contact_number, p.email, String(p.id)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    ).slice(0, 5)
  }, [patients, query])

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return appointments.filter(a =>
      [a.patient?.first_name, a.patient?.last_name, a.patient?.opd_number, a.token_number, a.doctor?.username, a.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    ).slice(0, 4)
  }, [appointments, query])

  // Combined flat items for keyboard navigation
  const allItems = useMemo(() => {
    const list: Array<{ id: string; onSelect: () => void }> = []
    if (query.trim()) {
      filteredPatients.forEach(p => list.push({
        id: `pat-${p.id}`,
        onSelect: () => { onClose(); navigate(`/patients/${p.id}`) }
      }))
      filteredAppointments.forEach(a => list.push({
        id: `apt-${a.id}`,
        onSelect: () => { onClose(); navigate(a.patient_id ? `/patients/${a.patient_id}` : '/appointments') }
      }))
    }
    quickActions.forEach(act => list.push({
      id: act.id,
      onSelect: act.action
    }))
    return list
  }, [query, filteredPatients, filteredAppointments, quickActions, onClose, navigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % (allItems.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + (allItems.length || 1)) % (allItems.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].onSelect()
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-emerald-50/25 to-slate-50">
          <span className="text-emerald-600 size-5 flex items-center justify-center shrink-0">
            {Icons.search}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
            placeholder="Search patient name, OPD, mobile, appointment, Rx, action... (Ctrl+K)"
            className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded bg-slate-200/60"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-block rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-400 shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Patients Results */}
          {filteredPatients.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Patients ({filteredPatients.length})
              </div>
              <div className="space-y-1">
                {filteredPatients.map((p) => {
                  const itemIndex = allItems.findIndex(i => i.id === `pat-${p.id}`)
                  const isSelected = selectedIndex === itemIndex
                  const name = `${p.first_name} ${p.last_name}`
                  return (
                    <div
                      key={p.id}
                      onClick={() => { onClose(); navigate(`/patients/${p.id}`) }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                        isSelected ? 'bg-gradient-to-r from-emerald-50 to-teal-50/60 text-emerald-950 ring-1 ring-emerald-500/25 shadow-2xs' : 'hover:bg-slate-50 text-slate-800'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'size-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                          isSelected ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                        )}>
                          {p.first_name?.[0] || 'P'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {p.opd_number && <span className="font-mono text-emerald-700 font-medium mr-2">{p.opd_number}</span>}
                            {p.gender && <span>{p.gender} · </span>}
                            {p.contact_number && <span>{p.contact_number}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.blood_group && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                            {p.blood_group}
                          </span>
                        )}
                        <span className="text-xs font-medium text-emerald-700 hidden sm:inline">Open Chart →</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Appointments Results */}
          {filteredAppointments.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Appointments ({filteredAppointments.length})
              </div>
              <div className="space-y-1">
                {filteredAppointments.map((a) => {
                  const itemIndex = allItems.findIndex(i => i.id === `apt-${a.id}`)
                  const isSelected = selectedIndex === itemIndex
                  const patName = [a.patient?.first_name, a.patient?.last_name].filter(Boolean).join(' ') || `Patient #${a.patient_id}`
                  return (
                    <div
                      key={a.id}
                      onClick={() => { onClose(); navigate(a.patient_id ? `/patients/${a.patient_id}` : '/appointments') }}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                        isSelected ? 'bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/20' : 'hover:bg-slate-50 text-slate-800'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {a.token_number || '#'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{patName}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {new Date(a.appointment_time).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(a.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {a.doctor?.username || 'Doctor'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-600">
                        {a.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick Actions (Always shown or filtered) */}
          <div>
            <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quick Actions & Navigation
            </div>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {quickActions.map((act) => {
                const itemIndex = allItems.findIndex(i => i.id === act.id)
                const isSelected = selectedIndex === itemIndex
                return (
                  <div
                    key={act.id}
                    onClick={act.action}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors',
                      isSelected ? 'bg-gradient-to-r from-emerald-50 to-teal-50/60 text-emerald-950 ring-1 ring-emerald-500/25 shadow-2xs' : 'hover:bg-slate-50 text-slate-800'
                    )}
                  >
                    <div className={cn(
                      'size-8 rounded-lg flex items-center justify-center shrink-0',
                      isSelected ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-2xs' : 'bg-slate-100 text-slate-600'
                    )}>
                      {act.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{act.label}</p>
                      <p className="text-[11px] text-slate-400 truncate">{act.sub}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer with Keyboard Legend */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="font-semibold text-slate-700 bg-white border border-slate-200 px-1 rounded">↑↓</kbd> to navigate</span>
            <span><kbd className="font-semibold text-slate-700 bg-white border border-slate-200 px-1 rounded">↵</kbd> to select</span>
            <span><kbd className="font-semibold text-slate-700 bg-white border border-slate-200 px-1 rounded">ESC</kbd> to dismiss</span>
          </div>
          <span className="font-medium text-emerald-700">SKFB Fast Navigation</span>
        </div>
      </div>
    </div>
  )
}
