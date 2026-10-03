import { Link, useNavigate } from 'react-router-dom'
import { Icons } from './Icons'
import { cn } from '../utils/cn'
import type { Patient } from '../types'

interface PatientQuickPreviewDrawerProps {
  patient: Patient | null
  onClose: () => void
}

export function PatientQuickPreviewDrawer({ patient, onClose }: PatientQuickPreviewDrawerProps) {
  const navigate = useNavigate()
  if (!patient) return null

  const name = `${patient.first_name} ${patient.last_name}`
  const age = patient.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-emerald-950/60 bg-gradient-to-r from-[#061712] via-[#0d2820] to-[#071913] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl badge-icon-emerald font-bold text-sm shadow-xs">
              {patient.first_name?.[0] || 'P'}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Quick Preview</p>
              <h3 className="text-sm font-bold text-white tracking-tight leading-tight truncate">
                {name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Preview"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {Icons.x}
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Identity & Demographics */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">OPD Number</span>
              <span className="font-mono font-bold text-emerald-800">{patient.opd_number || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Age & Gender</span>
              <span className="font-semibold text-slate-800">
                {age !== null ? `${age} yrs` : '—'} {patient.gender ? `· ${patient.gender}` : ''}
              </span>
            </div>
            {patient.blood_group && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Blood Group</span>
                <span className="font-bold text-rose-700 bg-rose-50 border border-rose-100 px-1.5 py-0.2 rounded text-[10px]">
                  {patient.blood_group}
                </span>
              </div>
            )}
          </div>

          {/* Contact Details */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Contact Info</span>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Phone</span>
              <span className="font-semibold text-slate-800">{patient.contact_number || '—'}</span>
            </div>
            {patient.email && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-700 truncate max-w-[180px]">{patient.email}</span>
              </div>
            )}
            {patient.address && (
              <div className="pt-1 border-t border-slate-100">
                <span className="text-slate-500 block mb-0.5">Address</span>
                <span className="text-slate-700 leading-snug">{patient.address}</span>
              </div>
            )}
          </div>

          {/* Primary Quick Actions (Section 30) */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => { onClose(); navigate(`/visits/new?patient_id=${patient.id}`) }}
              className="w-full btn btn-primary py-2.5 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-700/20 cursor-pointer"
            >
              {Icons.plus} Start Consultation
            </button>
            <Link
              to={`/patients/${patient.id}`}
              onClick={onClose}
              className="w-full btn btn-secondary py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Open Full Chart →
            </Link>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Patient ID: #{patient.id}</span>
          <button type="button" onClick={onClose} className="font-semibold text-slate-600 hover:text-slate-900">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
