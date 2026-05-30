import { useState, useMemo, useEffect } from 'react'
import {
  useAppointments,
  useAppointment,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useAppointmentStatuses,
  useAppointmentTypes
} from '../hooks/useAppointments'
import { usePatients, useCreatePatient } from '../hooks/usePatients'
import { useDoctors } from '../hooks/useUsers'
import { useSettings } from '../hooks/useSettings'

// ─── Utilities ────────────────────────────────────────────────────────────────

function generateTimeSlots(start, end, durationStr) {
  const duration = parseInt(durationStr, 10)
  if (!start || !end || isNaN(duration)) return []
  const slots = []
  const [startHour, startMin] = start.split(':').map(Number)
  const [endHour, endMin] = end.split(':').map(Number)
  let current = new Date()
  current.setHours(startHour, startMin, 0, 0)
  const endTime = new Date()
  endTime.setHours(endHour, endMin, 0, 0)
  while (current <= endTime) {
    const hh = String(current.getHours()).padStart(2, '0')
    const mm = String(current.getMinutes()).padStart(2, '0')
    slots.push(`${hh}:${mm}`)
    current.setMinutes(current.getMinutes() + duration)
  }
  return slots
}

function getInitials(first, last) {
  return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase()
}

const AVATAR_PALETTE = [
  '#4361ee', '#7209b7', '#e63946', '#2b9348',
  '#f77f00', '#4cc9f0', '#dc2f02', '#3a0ca3',
  '#06d6a0', '#f72585',
]

function avatarColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

function formatLongDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function isToday(dateStr) {
  const t = new Date()
  t.setMinutes(t.getMinutes() - t.getTimezoneOffset())
  return t.toISOString().split('T')[0] === dateStr
}

// ─── Shared Styles (injected once) ───────────────────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  .appt-page * { box-sizing: border-box; }

  /* Time slot row */
  .ts-row { transition: background 0.14s; }
  .ts-row:hover { background: rgba(67,97,238,0.025); }
  .ts-row:hover .ts-add { opacity: 1 !important; transform: scale(1) !important; }

  /* Appointment card */
  .appt-card {
    transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
    cursor: pointer;
    user-select: none;
  }
  .appt-card:hover {
    transform: translateY(-4px) scale(1.015);
    box-shadow: 0 16px 36px rgba(0,0,0,0.14);
  }

  /* Modal animations */
  .modal-backdrop { animation: mbIn 0.22s ease forwards; }
  .modal-sheet { animation: msIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  @keyframes mbIn { from { opacity:0; } to { opacity:1; } }
  @keyframes msIn { from { opacity:0; transform:scale(0.9) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }

  /* Form fields */
  .appt-input {
    width: 100%;
    border: 1.5px solid #dde3f0;
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 14px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #fafbff;
    color: #0f172a;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    appearance: none;
  }
  .appt-input:focus {
    border-color: #4361ee;
    box-shadow: 0 0 0 3.5px rgba(67,97,238,0.13);
    background: #fff;
  }

  /* Nav buttons */
  .nav-pill-btn {
    padding: 9px 14px;
    background: none; border: none; cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 600; color: #64748b;
    transition: background 0.15s, color 0.15s;
  }
  .nav-pill-btn:hover { background: #4361ee; color: white; }

  /* Patient row */
  .pt-row { transition: background 0.12s; cursor: pointer; }
  .pt-row:hover { background: #eef1ff; }

  /* Pulsing dot */
  @keyframes pdot { 0%,100%{opacity:1} 50%{opacity:0.35} }
  .pdot { animation: pdot 1.8s ease-in-out infinite; }

  /* CTA button */
  .cta-btn {
    background: linear-gradient(135deg, #4361ee 0%, #7209b7 100%);
    box-shadow: 0 4px 16px rgba(67,97,238,0.38);
    border: none; cursor: pointer; color: white;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 700; border-radius: 12px;
    padding: 10px 22px; font-size: 13px; letter-spacing: 0.02em;
    display: flex; align-items: center; gap: 6px;
    transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
  }
  .cta-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(67,97,238,0.48); filter: brightness(1.06); }
  .cta-btn:active { transform: translateY(0); }
  .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Ghost cancel btn */
  .ghost-btn {
    padding: 10px 20px; font-size: 13px; font-weight: 600;
    color: #64748b; background: #f1f5f9; border: none;
    border-radius: 10px; cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: background 0.15s;
  }
  .ghost-btn:hover { background: #e2e8f0; }

  /* Danger btn */
  .danger-btn {
    color: #ef4444; background: #fef2f2; border: 1.5px solid #fecaca;
    font-size: 13px; font-weight: 600; padding: 9px 18px; border-radius: 10px;
    cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif;
    transition: background 0.15s;
  }
  .danger-btn:hover { background: #fee2e2; }

  /* Scrollbar */
  .thin-scroll::-webkit-scrollbar { width: 4px; }
  .thin-scroll::-webkit-scrollbar-track { background: transparent; }
  .thin-scroll::-webkit-scrollbar-thumb { background: #dde3f0; border-radius: 4px; }
`

// ─── Reusable sub-components ─────────────────────────────────────────────────

function Avatar({ first, last, size = 36, fontSize = 12 }) {
  const bg = avatarColor(first || '')
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 800, color: 'white', letterSpacing: '0.04em',
      boxShadow: `0 3px 10px ${bg}50`,
    }}>
      {getInitials(first, last)}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
      {children}
    </div>
  )
}

function ModalCard({ onClose, title, children, maxWidth = 440 }) {
  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', inset: 0,
      background: 'rgba(8,12,35,0.65)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '20px', overflowY: 'auto',
    }}>
      <div className="modal-sheet" style={{
        background: 'white', borderRadius: 22, width: '100%', maxWidth,
        boxShadow: '0 28px 72px rgba(0,0,0,0.28)', overflow: 'hidden',
        position: 'relative', margin: '20px 0',
      }}>
        {/* Gradient top bar */}
        <div style={{ height: 5, background: 'linear-gradient(90deg, #4361ee, #7209b7, #f72585)' }} />
        <div style={{ padding: 26 }}>
          {/* Close */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 18, right: 18,
              width: 32, height: 32, borderRadius: '50%',
              background: '#f1f5f9', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', fontSize: 14, fontWeight: 700,
              fontFamily: 'inherit', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
          >✕</button>
          <h3 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: '0 0 22px', letterSpacing: '-0.4px' }}>
            {title}
          </h3>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().split('T')[0]
  })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', appointment_type_id: '', appointment_time: '', status: 'Ongoing' })
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showCreatePatient, setShowCreatePatient] = useState(false)
  const [patientForm, setPatientForm] = useState({
    first_name: '', last_name: '', dob: '', gender: 'Male', contact_number: '',
    email: '', blood_group: 'A+', emergency_contact: '', emergency_phone: '', address: '', is_active: 1
  })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { data: settings, isLoading: loadingSettings } = useSettings()
  const { data: statuses } = useAppointmentStatuses()
  const { data: types } = useAppointmentTypes()
  const { data: appointments, isLoading: loadingAppointments } = useAppointments({ appointment_date: selectedDate })
  const { data: patients, isFetching: loadingPatients } = usePatients(debouncedSearch)
  const { data: doctors } = useDoctors()
  const { data: appointmentDetails, isLoading: loadingDetails } = useAppointment(selectedAppointmentId)
  const create = useCreateAppointment()
  const createPatientMut = useCreatePatient()
  const updateAppt = useUpdateAppointment()
  const remove = useDeleteAppointment()

  const timeSlots = useMemo(() => generateTimeSlots(settings?.start_time, settings?.end_time, settings?.slot_duration_minutes), [settings])

  const appointmentsByTime = useMemo(() => {
    const map = {}
    if (appointments) {
      appointments.forEach(a => {
        if (a.appointment_time) {
          const parts = a.appointment_time.split('T')
          if (parts.length > 1) {
            const ts = parts[1].substring(0, 5)
            if (!map[ts]) map[ts] = []
            map[ts].push(a)
          }
        }
      })
    }
    return map
  }, [appointments])

  const handleSubmit = async (e) => {
    e.preventDefault()
    await create.mutateAsync({
      patient_id: Number(form.patient_id),
      doctor_id: Number(form.doctor_id),
      appointment_type_id: Number(form.appointment_type_id),
      appointment_time: form.appointment_time + (form.appointment_time.length === 16 ? ':00' : ''),
      status: form.status
    })
    resetScheduleForm()
  }

  const handleCreatePatient = async (e) => {
    e.preventDefault()
    try {
      await createPatientMut.mutateAsync(patientForm)
      setSearchQuery(patientForm.contact_number)
      setShowCreatePatient(false)
      setPatientForm({ first_name: '', last_name: '', dob: '', gender: 'Male', contact_number: '', email: '', blood_group: 'A+', emergency_contact: '', emergency_phone: '', address: '', is_active: 1 })
    } catch (err) {
      console.error('Failed to create patient', err)
    }
  }

  const resetScheduleForm = () => {
    setForm({ patient_id: '', doctor_id: '', appointment_type_id: '', appointment_time: '', status: 'Ongoing' })
    setSearchQuery('')
    setSelectedPatient(null)
    setShowCreatePatient(false)
    setShowForm(false)
  }

  const getStatusColor = (statusName) => {
    const s = statuses?.find(st => st.name === statusName)
    return s?.color || '#374151'
  }

  const adjustDate = (days) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const handleTimeSlotClick = (time) => {
    setForm(f => ({ ...f, appointment_time: `${selectedDate}T${time}` }))
    setShowForm(true)
  }

  const totalAppts = appointments?.length || 0

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="appt-page"
      style={{
        minHeight: '100%',
        backgroundColor: '#eef0f8',
        backgroundImage: 'radial-gradient(circle, #bfc7df 1px, transparent 1px)',
        backgroundSize: '26px 26px',
        fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
        padding: '28px 32px',
      }}
    >
      <style>{GLOBAL_CSS}</style>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 26, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Icon */}
            <div style={{
              width: 40, height: 40, borderRadius: 11,
              background: 'linear-gradient(135deg, #4361ee, #7209b7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(67,97,238,0.38)', flexShrink: 0,
            }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h1 style={{ fontSize: 27, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.6px', margin: 0 }}>
              Appointments
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginLeft: 52 }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{formatLongDate(selectedDate)}</span>
            {isToday(selectedDate) && (
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', color: '#4361ee', background: '#eef1ff', padding: '2px 9px', borderRadius: 20, textTransform: 'uppercase' }}>Today</span>
            )}
            {totalAppts > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: 'white', border: '1.5px solid #e2e8f0', padding: '2px 9px', borderRadius: 20 }}>
                {totalAppts} {totalAppts === 1 ? 'appointment' : 'appointments'}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Date navigator */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: 13, border: '1.5px solid #dde3f0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <button className="nav-pill-btn" onClick={() => adjustDate(-1)} style={{ borderRight: '1px solid #e2e8f0', fontSize: 17 }}>‹</button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ border: 'none', outline: 'none', padding: '9px 14px', fontSize: 13, fontWeight: 700, color: '#1e293b', fontFamily: 'inherit', background: 'transparent', cursor: 'pointer', minWidth: 138 }}
            />
            <button className="nav-pill-btn" onClick={() => adjustDate(1)} style={{ borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', fontSize: 17 }}>›</button>
            <button className="nav-pill-btn" onClick={() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); setSelectedDate(d.toISOString().split('T')[0]) }} style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', color: '#4361ee' }}>TODAY</button>
          </div>
          {/* CTA */}
          <button className="cta-btn" onClick={() => handleTimeSlotClick('09:00')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Schedule
          </button>
        </div>
      </div>

      {/* ── Loading indicator ──────────────────────────────────────────── */}
      {(loadingSettings || loadingAppointments) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18, padding: '11px 16px', background: 'white', borderRadius: 11, border: '1.5px solid #dde3f0', width: 'fit-content', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div className="pdot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#4361ee' }} />
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Loading schedule…</span>
        </div>
      )}

      {/* ── Schedule Grid ──────────────────────────────────────────────── */}
      {!loadingSettings && settings && (
        <div style={{ background: 'white', borderRadius: 20, border: '1.5px solid #dde3f0', overflow: 'hidden', boxShadow: '0 6px 28px rgba(0,0,0,0.08)' }}>

          {/* Column header row */}
          <div style={{ display: 'flex', background: '#1a2547', borderBottom: '2px solid #eef0f8' }}>
            <div style={{ width: 88, flexShrink: 0, padding: '13px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>TIME</span>
            </div>
            <div style={{ flex: 1, padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: '#64748b', textTransform: 'uppercase' }}>PATIENT SLOTS</span>
              {totalAppts > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: '#4361ee', background: '#eef1ff', padding: '2px 8px', borderRadius: 10, letterSpacing: '0.05em' }}>{totalAppts} BOOKED</span>}
            </div>
          </div>

          {/* Time rows */}
          {timeSlots.map((time, idx) => {
            const slotApps = appointmentsByTime[time] || []
            const isHour = time.endsWith(':00')
            return (
              <div
                key={time}
                className="ts-row"
                style={{ display: 'flex', borderBottom: idx < timeSlots.length - 1 ? '1px solid #f1f4fb' : 'none', minHeight: 80 }}
              >
                {/* Time column */}
                <div style={{
                  width: 88, flexShrink: 0, flexShrink: 0,
                  background: isHour ? '#1a2547' : '#202d5c',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRight: '2px solid #f1f4fb',
                  position: 'relative',
                }}>
                  {isHour && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(67,97,238,0.5)' }} />}
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: isHour ? 14 : 12,
                    fontWeight: isHour ? 600 : 400,
                    color: isHour ? 'white' : 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.05em',
                  }}>{time}</span>
                </div>

                {/* Content area */}
                <div
                  style={{ flex: 1, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', cursor: 'default' }}
                  onClick={(e) => { if (e.target === e.currentTarget) handleTimeSlotClick(time) }}
                >
                  {slotApps.length === 0 ? (
                    <div onClick={() => handleTimeSlotClick(time)} style={{ flex: 1, display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
                      <span style={{ fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' }}>Available — click to schedule</span>
                    </div>
                  ) : (
                    <>
                      {slotApps.map(a => {
                        const sc = getStatusColor(a.status)
                        return (
                          <div
                            key={a.id}
                            className="appt-card"
                            onClick={(e) => { e.stopPropagation(); setSelectedAppointmentId(a.id) }}
                            style={{
                              background: 'white', border: '1.5px solid #e8edf5',
                              borderLeft: `5px solid ${sc}`,
                              borderRadius: 13, padding: '11px 14px', width: 218,
                              boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                              display: 'flex', flexDirection: 'column', gap: 7,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <Avatar first={a.patient?.first_name} last={a.patient?.last_name} size={34} fontSize={11} />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {a.patient?.first_name} {a.patient?.last_name}
                                </div>
                                <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                                  Dr. {a.doctor?.username}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20, backgroundColor: `${sc}18`, color: sc }}>
                                {a.status}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      <button
                        className="ts-add"
                        onClick={(e) => { e.stopPropagation(); handleTimeSlotClick(time) }}
                        style={{ fontSize: 11, fontWeight: 700, color: '#4361ee', background: '#eef1ff', border: '1.5px dashed #c7d2fe', padding: '9px 14px', borderRadius: 11, cursor: 'pointer', opacity: 0, transform: 'scale(0.9)', transition: 'all 0.18s', fontFamily: 'inherit' }}
                      >+ Add</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Appointment Details Modal ─────────────────────────────────── */}
      {selectedAppointmentId && (
        <ModalCard onClose={() => setSelectedAppointmentId(null)} title="Appointment Details" maxWidth={450}>
          {loadingDetails ? (
            <div style={{ padding: '36px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f1f5f9' }} />
              <div style={{ height: 12, background: '#f1f5f9', borderRadius: 6, width: 130 }} />
              <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, width: 90 }} />
            </div>
          ) : appointmentDetails ? (
            <>
              {/* Patient card */}
              <div style={{ background: 'linear-gradient(135deg, #f6f8ff, #f2f0ff)', border: '1.5px solid #dde3ff', borderRadius: 15, padding: '16px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar first={appointmentDetails.patient?.first_name} last={appointmentDetails.patient?.last_name} size={54} fontSize={19} />
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                    {appointmentDetails.patient?.first_name} {appointmentDetails.patient?.last_name}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {appointmentDetails.patient?.gender} · DOB: {appointmentDetails.patient?.dob}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {appointmentDetails.patient?.contact_number}{appointmentDetails.patient?.email ? ` · ${appointmentDetails.patient.email}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {[
                  { label: 'Doctor', value: `Dr. ${appointmentDetails.doctor?.username}` },
                  { label: 'Type', value: appointmentDetails.appointment_type?.name || 'General' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#f8fafc', borderRadius: 12, padding: '13px 15px' }}>
                    <FieldLabel>{label}</FieldLabel>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: '#f8fafc', borderRadius: 12, padding: '13px 15px', marginBottom: 14 }}>
                <FieldLabel>Date & Time</FieldLabel>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  {new Date(appointmentDetails.appointment_time).toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <FieldLabel>Status</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <select
                    value={appointmentDetails.status}
                    onChange={(e) => {
                      const updatedData = {
                        patient_id: appointmentDetails.patient_id || appointmentDetails.patient?.id,
                        doctor_id: appointmentDetails.doctor_id || appointmentDetails.doctor?.id,
                        appointment_type_id: appointmentDetails.appointment_type_id || appointmentDetails.appointment_type?.id,
                        appointment_time: appointmentDetails.appointment_time,
                        status: e.target.value
                      }
                      updateAppt.mutate({ id: appointmentDetails.id, data: updatedData })
                    }}
                    className="appt-input"
                    style={{ cursor: 'pointer', paddingRight: 40, color: getStatusColor(appointmentDetails.status), fontWeight: 700, fontSize: 14 }}
                  >
                    {statuses?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1.5px solid #f0f2f8' }}>
                <button className="danger-btn" onClick={() => { if (confirm('Delete this appointment?')) { remove.mutate(appointmentDetails.id); setSelectedAppointmentId(null) } }}>
                  Delete
                </button>
                <button className="ghost-btn" onClick={() => setSelectedAppointmentId(null)}>Done</button>
              </div>
            </>
          ) : (
            <p style={{ color: '#ef4444', textAlign: 'center', padding: '32px 0', fontWeight: 500 }}>Could not load appointment details.</p>
          )}
        </ModalCard>
      )}

      {/* ── Schedule Appointment Modal ────────────────────────────────── */}
      {showForm && (
        <ModalCard onClose={resetScheduleForm} title="Schedule Appointment" maxWidth={530}>
          {/* Step 1: Search patient */}
          {!selectedPatient && !showCreatePatient && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <FieldLabel>Search Patient</FieldLabel>
                <button
                  type="button"
                  onClick={() => setShowCreatePatient(true)}
                  style={{ fontSize: 11, fontWeight: 700, color: '#4361ee', background: '#eef1ff', border: 'none', cursor: 'pointer', padding: '5px 12px', borderRadius: 8, fontFamily: 'inherit' }}
                >+ New Patient</button>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter name or contact number…"
                className="appt-input"
                style={{ marginBottom: 8 }}
              />
              {loadingPatients && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0' }}>
                  <div className="pdot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4361ee' }} />
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Searching…</span>
                </div>
              )}
              {searchQuery && !loadingPatients && patients && (
                <div className="thin-scroll" style={{ border: '1.5px solid #dde3f0', borderRadius: 13, maxHeight: 210, overflowY: 'auto', boxShadow: '0 4px 18px rgba(0,0,0,0.08)', marginTop: 4 }}>
                  {patients.length > 0 ? patients.map(p => (
                    <div key={p.id} className="pt-row" onClick={() => { setSelectedPatient(p); setForm(f => ({ ...f, patient_id: p.id })) }} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f4fb', display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar first={p.first_name} last={p.last_name} size={38} fontSize={13} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{p.first_name} {p.last_name}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>📞 {p.contact_number} · {p.gender}, {p.blood_group}</div>
                      </div>
                    </div>
                  )) : (
                    <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                      <div style={{ fontSize: 30, marginBottom: 10 }}>🔍</div>
                      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 14 }}>No patients found</div>
                      <button type="button" onClick={() => setShowCreatePatient(true)} className="cta-btn" style={{ margin: '0 auto' }}>+ Create New Patient</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Create patient form */}
          {showCreatePatient && !selectedPatient && (
            <div style={{ background: '#f8fafc', borderRadius: 15, border: '1.5px solid #dde3f0', padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 13, borderBottom: '1.5px solid #e2e8f0' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>New Patient Details</div>
                <button type="button" onClick={() => setShowCreatePatient(false)} style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>← Back</button>
              </div>
              <form onSubmit={handleCreatePatient}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'First Name *', key: 'first_name', required: true },
                    { label: 'Last Name *', key: 'last_name', required: true },
                    { label: 'Contact Number *', key: 'contact_number', required: true },
                    { label: 'Date of Birth *', key: 'dob', type: 'date', required: true },
                  ].map(({ label, key, type, required }) => (
                    <div key={key}>
                      <FieldLabel>{label}</FieldLabel>
                      <input required={required} type={type || 'text'} value={patientForm[key]} onChange={e => setPatientForm({ ...patientForm, [key]: e.target.value })} className="appt-input" style={{ background: 'white', fontSize: 13, padding: '9px 12px' }} />
                    </div>
                  ))}
                  <div>
                    <FieldLabel>Gender *</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <select value={patientForm.gender} onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })} className="appt-input" style={{ background: 'white', fontSize: 13, padding: '9px 12px', cursor: 'pointer', paddingRight: 30 }}>
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                      <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Blood Group</FieldLabel>
                    <input value={patientForm.blood_group} onChange={e => setPatientForm({ ...patientForm, blood_group: e.target.value })} className="appt-input" style={{ background: 'white', fontSize: 13, padding: '9px 12px' }} />
                  </div>
                  <div>
                    <FieldLabel>Email</FieldLabel>
                    <input type="email" value={patientForm.email} onChange={e => setPatientForm({ ...patientForm, email: e.target.value })} className="appt-input" style={{ background: 'white', fontSize: 13, padding: '9px 12px' }} />
                  </div>
                  <div>
                    <FieldLabel>Emergency Contact</FieldLabel>
                    <input value={patientForm.emergency_contact} onChange={e => setPatientForm({ ...patientForm, emergency_contact: e.target.value })} className="appt-input" style={{ background: 'white', fontSize: 13, padding: '9px 12px' }} />
                  </div>
                  <div>
                    <FieldLabel>Emergency Phone</FieldLabel>
                    <input value={patientForm.emergency_phone} onChange={e => setPatientForm({ ...patientForm, emergency_phone: e.target.value })} className="appt-input" style={{ background: 'white', fontSize: 13, padding: '9px 12px' }} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <FieldLabel>Address</FieldLabel>
                    <input value={patientForm.address} onChange={e => setPatientForm({ ...patientForm, address: e.target.value })} className="appt-input" style={{ background: 'white', fontSize: 13, padding: '9px 12px' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 13, borderTop: '1.5px solid #e2e8f0' }}>
                  <button type="button" onClick={() => setShowCreatePatient(false)} className="ghost-btn" style={{ fontSize: 12 }}>Cancel</button>
                  <button type="submit" disabled={createPatientMut.isPending} className="cta-btn" style={{ opacity: createPatientMut.isPending ? 0.65 : 1 }}>
                    {createPatientMut.isPending ? 'Saving…' : 'Save Patient'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Appointment form */}
          {selectedPatient && !showCreatePatient && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Selected patient card */}
              <div style={{ background: 'linear-gradient(135deg, #f0f4ff, #f5f0ff)', border: '1.5px solid #dde3ff', borderRadius: 15, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 13 }}>
                <Avatar first={selectedPatient.first_name} last={selectedPatient.last_name} size={44} fontSize={15} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#7c3aed', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>Selected Patient</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#1e1b4b' }}>{selectedPatient.first_name} {selectedPatient.last_name}</div>
                  <div style={{ fontSize: 12, color: '#6d28d9' }}>{selectedPatient.contact_number}</div>
                </div>
                <button type="button" onClick={() => { setSelectedPatient(null); setForm(f => ({ ...f, patient_id: '' })) }} style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', background: 'white', border: '1.5px solid #c4b5fd', padding: '6px 13px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit' }}>Change</button>
              </div>

              <div>
                <FieldLabel>Doctor</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <select required value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} className="appt-input" style={{ cursor: 'pointer', paddingRight: 40 }}>
                    <option value="">Select doctor…</option>
                    {doctors?.map(d => <option key={d.id} value={d.id}>Dr. {d.username}</option>)}
                  </select>
                  <svg style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <FieldLabel>Appointment Type</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <select required value={form.appointment_type_id} onChange={(e) => setForm({ ...form, appointment_type_id: e.target.value })} className="appt-input" style={{ cursor: 'pointer', paddingRight: 30 }}>
                      <option value="">Select type…</option>
                      {types?.map(t => <option key={t.id} value={t.id}>{t.name} (₹{t.rate})</option>)}
                    </select>
                    <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <div style={{ position: 'relative' }}>
                    <select required value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="appt-input" style={{ cursor: 'pointer', paddingRight: 30, color: getStatusColor(form.status), fontWeight: 700 }}>
                      {statuses?.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <svg style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel>Date & Time</FieldLabel>
                <input type="datetime-local" required value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} className="appt-input" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1.5px solid #f0f2f8' }}>
                <button type="button" onClick={resetScheduleForm} className="ghost-btn">Cancel</button>
                <button type="submit" disabled={create.isPending} className="cta-btn" style={{ opacity: create.isPending ? 0.65 : 1 }}>
                  {create.isPending ? 'Saving…' : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          )}
        </ModalCard>
      )}
    </div>
  )
}
