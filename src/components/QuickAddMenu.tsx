import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icons } from './Icons'
import { cn } from '../utils/cn'

interface QuickAddMenuProps {
  onOpenNewPatient?: () => void
}

export function QuickAddMenu({ onOpenNewPatient }: QuickAddMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N shortcut for New Patient
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault()
        setIsOpen(false)
        if (onOpenNewPatient) onOpenNewPatient()
        else navigate('/patients?action=new')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [navigate, onOpenNewPatient])

  const options = [
    {
      label: 'New Patient',
      desc: 'Register a new patient record',
      shortcut: 'Ctrl+N',
      icon: Icons.patients,
      color: 'badge-icon-emerald',
      action: () => {
        setIsOpen(false)
        if (onOpenNewPatient) onOpenNewPatient()
        else navigate('/patients?action=new')
      }
    },
    {
      label: 'Add Walk-in',
      desc: 'Instant queue check-in for walk-in patient',
      shortcut: '',
      icon: Icons.clock,
      color: 'badge-icon-blue',
      action: () => {
        setIsOpen(false)
        navigate('/today?action=walkin')
      }
    },
    {
      label: 'New Appointment',
      desc: 'Schedule appointment slot in calendar',
      shortcut: '',
      icon: Icons.calendar,
      color: 'badge-icon-indigo',
      action: () => {
        setIsOpen(false)
        navigate('/appointments?action=book')
      }
    },
    {
      label: 'New Prescription',
      desc: 'Start consultation & prescribe medication',
      shortcut: 'Alt+P',
      icon: Icons.pill,
      color: 'badge-icon-emerald',
      action: () => {
        setIsOpen(false)
        navigate('/visits/new')
      }
    },
    {
      label: 'Lab Order',
      desc: 'Order laboratory tests or panels',
      shortcut: '',
      icon: Icons.flask,
      color: 'badge-icon-amber',
      action: () => {
        setIsOpen(false)
        navigate('/labs?action=new')
      }
    }
  ]

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Quick Add"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-sm shadow-emerald-700/20 transition-all cursor-pointer"
      >
        <span className="text-base leading-none font-bold">+</span>
        <span className="hidden sm:inline">Quick Add</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100/80 mb-1 bg-gradient-to-r from-slate-50 via-emerald-50/25 to-slate-50 rounded-t-xl">
            <p className="text-xs font-bold text-slate-800">Quick Actions</p>
            <p className="text-[11px] text-slate-400">Add a record or initiate a clinical workflow</p>
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={opt.action}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs', opt.color)}>
                    {opt.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{opt.desc}</p>
                  </div>
                </div>
                {opt.shortcut && (
                  <kbd className="hidden sm:inline-block text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {opt.shortcut}
                  </kbd>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
