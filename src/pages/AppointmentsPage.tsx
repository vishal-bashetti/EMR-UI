import { useState, useMemo, useEffect } from 'react'
import type { FormEvent, MouseEvent, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useAppointments,
  useAppointment,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  useAppointmentStatuses,
  useAppointmentTypes,
} from '../hooks/useAppointments'
import { usePatients, useCreatePatient } from '../hooks/usePatients'
import { useDoctors } from '../hooks/useUsers'
import { useSettings } from '../hooks/useSettings'
import { useClinicClosures, closureReason } from '../hooks/useClinicClosures'
import { isAxiosError } from 'axios'
import { useCreateInvoice, useInvoices, useUpdateInvoiceStatus } from '../hooks/useBilling'
import { PaymentModal } from '../components/PaymentModal'
import { InvoiceModal } from '../components/InvoiceModal'
import { consultationPath, localDate } from '../utils/workflow'
import { Icons } from '../components/Icons'
import { cn } from '../utils/cn'
import type { Appointment, AppointmentInput, Patient } from '../types'

// ─── Utilities ────────────────────────────────────────────────────────────────

type CalendarViewMode = 'day' | 'week' | 'month'

function generateTimeSlots(start?: string, end?: string, durationStr?: string): string[] {
  const duration = parseInt(durationStr ?? '', 10)
  if (!start || !end || isNaN(duration)) return []
  const slots: string[] = []
  const [startHour, startMin] = start.split(':').map(Number)
  const [endHour, endMin] = end.split(':').map(Number)
  const current = new Date()
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

function getInitials(first?: string, last?: string): string {
  return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase()
}

const AVATAR_PALETTE = [
  '#059669', '#0d9488', '#0284c7', '#4f46e5',
  '#7c3aed', '#c026d3', '#db2777', '#ea580c',
  '#d97706', '#16a34a',
]

function avatarColor(name = ''): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]
}

function formatLongDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function isToday(dateStr: string): boolean {
  return localDate() === dateStr
}

function getWeekDays(dateStr: string): { start: string; end: string; days: Date[] } {
  const base = new Date(dateStr + 'T00:00:00')
  const day = base.getDay() // 0 is Sun, 1 is Mon...
  const diff = base.getDate() - day + (day === 0 ? -6 : 1) // align to Monday
  const monday = new Date(base)
  monday.setDate(diff)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }
  const start = localDate(days[0])
  const end = localDate(days[6])
  return { start, end, days }
}

function getMonthDays(dateStr: string): { start: string; end: string; monthLabel: string; days: Date[]; currentMonth: number } {
  const base = new Date(dateStr + 'T00:00:00')
  const year = base.getFullYear()
  const month = base.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Align start to preceding Monday
  const startDay = firstDay.getDay()
  const offset = startDay === 0 ? 6 : startDay - 1
  const calStart = new Date(firstDay)
  calStart.setDate(firstDay.getDate() - offset)

  const days: Date[] = []
  const cur = new Date(calStart)
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
    if (i >= 28 && cur.getMonth() !== month && cur.getDay() === 1) {
      break
    }
  }

  return {
    start: localDate(days[0]),
    end: localDate(days[days.length - 1]),
    monthLabel: base.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    days,
    currentMonth: month,
  }
}

// ─── Reusable Sub-components ─────────────────────────────────────────────────

function Avatar({ first, last, size = 36, fontSize = 12 }: { first?: string; last?: string; size?: number; fontSize?: number }) {
  const bg = avatarColor(first || '')
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 800,
        color: 'white',
        letterSpacing: '0.04em',
      }}
    >
      {getInitials(first, last)}
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
      {children}
    </div>
  )
}

function ModalCard({ onClose, title, children, maxWidth = 480 }: { onClose: () => void; title: ReactNode; children: ReactNode; maxWidth?: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        className="bg-white rounded-2xl w-full shadow-2xl border border-slate-200 overflow-hidden relative my-6"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 size-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
          <h3 className="text-lg font-bold text-slate-900 mb-5">
            {title}
          </h3>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Form State Types ────────────────────────────────────────────────────────

interface ScheduleForm {
  patient_id: number | string
  doctor_id: string
  appointment_type_id: string
  appointment_time: string
  status: string
}

interface NewPatientForm {
  first_name: string
  last_name: string
  dob: string
  gender: string
  contact_number: string
  email: string
  blood_group: string
  emergency_contact: string
  emergency_phone: string
  address: string
  opd_number: string
  language: string
  is_active: number
}

type NewPatientTextField = 'first_name' | 'last_name' | 'contact_number' | 'dob'

const EMPTY_PATIENT_FORM: NewPatientForm = {
  first_name: '',
  last_name: '',
  dob: '',
  gender: 'Male',
  contact_number: '',
  email: '',
  blood_group: 'A+',
  emergency_contact: '',
  emergency_phone: '',
  address: '',
  opd_number: '',
  language: '',
  is_active: 1,
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Calendar View: 'day' (Default for doctor), 'week', 'month'
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day')
  const [selectedDate, setSelectedDate] = useState<string>(() => localDate())

  // Modal controls
  const [showForm, setShowForm] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const { data: closures } = useClinicClosures()
  const selectedClosure = closureReason(closures, selectedDate)
  const [billApptId, setBillApptId] = useState<number | null>(null)
  const [payingInvoice, setPayingInvoice] = useState<number | null>(null)
  const [form, setForm] = useState<ScheduleForm>({
    patient_id: '',
    doctor_id: '',
    appointment_type_id: '',
    appointment_time: '',
    status: 'Scheduled',
  })
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [showCreatePatient, setShowCreatePatient] = useState(false)
  const [patientForm, setPatientForm] = useState<NewPatientForm>(EMPTY_PATIENT_FORM)

  // Compute week and month boundaries
  const weekRange = useMemo(() => getWeekDays(selectedDate), [selectedDate])
  const monthRange = useMemo(() => getMonthDays(selectedDate), [selectedDate])

  // Determine query parameters based on viewMode
  const queryParams = useMemo(() => {
    if (viewMode === 'day') {
      return { appointment_date: selectedDate }
    }
    if (viewMode === 'week') {
      return { start_date: weekRange.start, end_date: weekRange.end }
    }
    return { start_date: monthRange.start, end_date: monthRange.end }
  }, [viewMode, selectedDate, weekRange, monthRange])

  useEffect(() => {
    const tm = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(tm)
  }, [searchQuery])

  // Queries & Mutations
  const { data: settings, isLoading: loadingSettings } = useSettings()
  const { data: statuses } = useAppointmentStatuses()
  const { data: types } = useAppointmentTypes()
  const { data: appointments, isLoading: loadingAppointments } = useAppointments(queryParams)
  const { data: patients, isFetching: loadingPatients } = usePatients(debouncedSearch)
  const { data: doctors } = useDoctors()
  const { data: appointmentDetails, isLoading: loadingDetails } = useAppointment(selectedAppointmentId)
  const { data: invoices } = useInvoices(undefined, queryParams.start_date || selectedDate, queryParams.end_date || selectedDate)

  const createInvoice = useCreateInvoice()
  const updateInvoiceStatus = useUpdateInvoiceStatus()
  const create = useCreateAppointment()
  const createPatientMut = useCreatePatient()
  const updateAppt = useUpdateAppointment()
  const remove = useDeleteAppointment()

  const isSelectedApptUneditable =
    appointmentDetails && ['No Show', 'Completed', 'Cancelled'].includes(appointmentDetails.status)

  // Slots for Day view
  const timeSlots = useMemo(
    () => generateTimeSlots(settings?.start_time, settings?.end_time, settings?.slot_duration_minutes),
    [settings]
  )

  // Group appointments by time (HH:MM) for Day view
  const appointmentsByTime = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    if (appointments) {
      appointments.forEach((a) => {
        if (a.appointment_time) {
          const parts = a.appointment_time.split('T')
          if (parts.length > 1) {
            const datePart = parts[0]
            if (datePart === selectedDate) {
              const ts = parts[1].substring(0, 5)
              if (!map[ts]) map[ts] = []
              map[ts].push(a)
            }
          }
        }
      })
    }
    return map
  }, [appointments, selectedDate])

  // Group appointments by date (YYYY-MM-DD) for Week and Month views
  const appointmentsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    if (appointments) {
      appointments.forEach((a) => {
        if (a.appointment_time) {
          const dStr = a.appointment_time.split('T')[0]
          if (!map[dStr]) map[dStr] = []
          map[dStr].push(a)
        }
      })
    }
    return map
  }, [appointments])

  // Actions
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const closed = closureReason(closures, form.appointment_time.slice(0, 10))
    if (closed) { setBookingError(`Clinic closed: ${closed}. Choose another date.`); return }
    setBookingError('')
    try {
    await create.mutateAsync({
      patient_id: Number(form.patient_id),
      doctor_id: Number(form.doctor_id),
      appointment_type_id: Number(form.appointment_type_id),
      appointment_time: form.appointment_time + (form.appointment_time.length === 16 ? ':00' : ''),
      status: form.status,
    })
    resetScheduleForm()
    } catch (error) {
      setBookingError(isAxiosError(error) ? error.response?.data?.detail || 'Unable to book appointment.' : 'Unable to book appointment.')
    }
  }

  const handleCreatePatient = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await createPatientMut.mutateAsync(patientForm)
      setSearchQuery(patientForm.contact_number)
      setShowCreatePatient(false)
      setPatientForm(EMPTY_PATIENT_FORM)
    } catch (err) {
      console.error('Failed to create patient', err)
    }
  }

  const resetScheduleForm = () => {
    setForm({
      patient_id: '',
      doctor_id: '',
      appointment_type_id: '',
      appointment_time: '',
      status: 'Scheduled',
    })
    setSearchQuery('')
    setSelectedPatient(null)
    setShowCreatePatient(false)
    setShowForm(false)
  }

  const getStatusColor = (statusName: string): string => {
    const s = statuses?.find((st) => st.name === statusName)
    return s?.color || '#059669'
  }

  const adjustDate = (delta: number) => {
    const d = new Date(selectedDate + 'T00:00:00')
    if (viewMode === 'day') {
      d.setDate(d.getDate() + delta)
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + delta * 7)
    } else if (viewMode === 'month') {
      d.setMonth(d.getMonth() + delta)
    }
    setSelectedDate(localDate(d))
  }

  const handleTimeSlotClick = (time: string, dateStr: string = selectedDate) => {
    const closed = closureReason(closures, dateStr)
    if (closed) { setBookingError(`Clinic closed on ${dateStr}: ${closed}. Choose another date.`); return }
    setBookingError('')
    setForm((f) => ({ ...f, appointment_time: `${dateStr}T${time}` }))
    setShowForm(true)
  }

  // Quick Walk-in action (Section 31)
  const handleQuickWalkin = () => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const walkinType = types?.find((t) => t.name.toLowerCase().includes('walk'))
    setForm({
      patient_id: '',
      doctor_id: doctors?.[0]?.id ? String(doctors[0].id) : '',
      appointment_type_id: walkinType ? String(walkinType.id) : types?.[0]?.id ? String(types[0].id) : '',
      appointment_time: `${localDate(now)}T${hh}:${mm}`,
      status: 'Arrived',
    })
    setShowForm(true)
  }

  const totalAppts = appointments?.length || 0

  return (
    <div className="min-h-full bg-slate-50/60 p-4 md:p-6 lg:p-8 space-y-6">
      {/* ── Header & Navigation Bar (Section 7 & 31) ─────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white via-slate-50/50 to-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Left: Title & Date Info */}
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-xl badge-icon-emerald flex items-center justify-center shrink-0">
            {Icons.calendar}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {t('appointments.title')}
              </h1>
              {totalAppts > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {totalAppts} {totalAppts === 1 ? 'visit' : 'visits'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
              {viewMode === 'day' && <span>{formatLongDate(selectedDate)}</span>}
              {viewMode === 'week' && (
                <span>
                  {formatLongDate(weekRange.start)} – {formatLongDate(weekRange.end)}
                </span>
              )}
              {viewMode === 'month' && <span>{monthRange.monthLabel}</span>}
              {isToday(selectedDate) && viewMode === 'day' && (
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                  Today
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: View Switcher (Day / Week / Month) */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 self-start md:self-auto shadow-2xs">
          {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer',
                viewMode === mode
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Right: Date navigator & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Navigator buttons */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={() => adjustDate(-1)}
              title="Previous"
              className="px-3 py-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 text-sm font-bold border-r border-slate-200 cursor-pointer"
            >
              ‹
            </button>
            {viewMode === 'day' ? (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              />
            ) : (
              <button
                type="button"
                onClick={() => setSelectedDate(localDate())}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                {viewMode === 'week' ? 'Week View' : 'Month View'}
              </button>
            )}
            <button
              onClick={() => adjustDate(1)}
              title="Next"
              className="px-3 py-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-900 text-sm font-bold border-l border-slate-200 cursor-pointer"
            >
              ›
            </button>
            <button
              onClick={() => setSelectedDate(localDate())}
              className="px-3 py-1.5 text-[11px] font-extrabold text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 border-l border-slate-200 uppercase tracking-wide cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* Quick Walk-in action (Section 31) */}
          <button
            type="button"
            onClick={handleQuickWalkin}
            className="btn btn-secondary text-xs px-3.5 py-1.5 bg-gradient-to-r from-amber-50 to-amber-100/90 text-amber-900 border border-amber-300 hover:from-amber-100 hover:to-amber-200 font-bold flex items-center gap-1.5 shadow-2xs"
            title="Fast register a walk-in patient"
          >
            {Icons.plus}
            <span>Walk-in</span>
          </button>

          {/* New Scheduled Appointment CTA */}
          <button
            type="button"
            onClick={() => handleTimeSlotClick('09:00')}
            className="btn btn-primary text-xs px-3.5 py-1.5 font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-700/30"
          >
            {Icons.plus}
            <span>{t('appointments.schedule')}</span>
          </button>
        </div>
      </div>

      {/* ── Loading schedule bar ────────────────────────────────────────── */}
      {selectedClosure && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Clinic closed: {selectedClosure}. Existing appointments remain visible for rescheduling.</p>}
      {bookingError && !showForm && <p role="alert" className="text-sm text-red-700">{bookingError}</p>}
      {(loadingSettings || loadingAppointments) && (
        <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-slate-200 shadow-2xs w-fit text-xs text-slate-600">
          <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>{t('appointments.loadingSchedule')}</span>
        </div>
      )}

      {/* ── 1. DAY VIEW (Default for Doctor) ────────────────────────────── */}
      {viewMode === 'day' && !loadingSettings && settings && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Header Row */}
          <div className="flex bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
            <div className="w-24 sm:w-28 shrink-0 py-3 text-center border-r border-slate-800 text-slate-400">
              {t('appointments.time')}
            </div>
            <div className="flex-1 py-3 px-4 flex items-center justify-between text-slate-300">
              <span>{t('appointments.patientSlots')}</span>
              {totalAppts > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {totalAppts} scheduled today
                </span>
              )}
            </div>
          </div>

          {/* Time Slot Rows */}
          <div className="divide-y divide-slate-100">
            {timeSlots.map((time) => {
              const slotApps = appointmentsByTime[time] || []
              const isHour = time.endsWith(':00')

              return (
                <div
                  key={time}
                  className="flex min-h-[76px] hover:bg-slate-50/50 transition-colors group"
                >
                  {/* Time gutter */}
                  <div
                    className={cn(
                      'w-24 sm:w-28 shrink-0 flex items-center justify-center font-mono text-xs border-r border-slate-100',
                      isHour
                        ? 'bg-slate-900 text-white font-bold'
                        : 'bg-slate-800/90 text-slate-400 font-medium'
                    )}
                  >
                    {time}
                  </div>

                  {/* Slot content */}
                  <div
                    className="flex-1 p-2.5 sm:p-3 flex flex-wrap items-center gap-3 cursor-default"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) handleTimeSlotClick(time)
                    }}
                  >
                    {slotApps.length === 0 ? (
                      <div
                        onClick={() => handleTimeSlotClick(time)}
                        className="flex-1 flex items-center gap-2 py-2 text-xs text-slate-300 hover:text-slate-400 cursor-pointer italic"
                      >
                        <span>{t('appointments.available')}</span>
                        <span className="hidden group-hover:inline-block not-italic text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          + Book
                        </span>
                      </div>
                    ) : (
                      <>
                        {slotApps.map((a) => {
                          const sc = getStatusColor(a.status)
                          const isWalkin =
                            a.appointment_type?.name?.toLowerCase().includes('walk') ||
                            a.status === 'Arrived'
                          const apptInvoice = invoices?.find(
                            (inv) =>
                              inv.appointment_id === a.id ||
                              (inv.patient_id === a.patient_id && !inv.appointment_id)
                          )
                          const isPaid = apptInvoice?.status?.toLowerCase() === 'paid'

                          return (
                            <div
                              key={a.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedAppointmentId(a.id)
                              }}
                              className="w-72 bg-white rounded-xl border border-slate-200/90 p-3 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative border-l-4"
                              style={{ borderLeftColor: sc }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Avatar
                                    first={a.patient?.first_name}
                                    last={a.patient?.last_name}
                                    size={32}
                                    fontSize={11}
                                  />
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-slate-900 truncate">
                                      {a.patient?.first_name} {a.patient?.last_name}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 truncate">
                                      Dr. {a.doctor?.username}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                                    style={{
                                      backgroundColor: `${sc}15`,
                                      color: sc,
                                      border: `1px solid ${sc}30`,
                                    }}
                                  >
                                    {a.status}
                                  </span>
                                  {isWalkin && (
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                      Walk-in
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Card actions & billing */}
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                {/* Direct consultation link */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate(consultationPath(a))
                                  }}
                                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                  {Icons.stethoscope}
                                  <span>Start Consult</span>
                                </button>

                                {/* Billing badge */}
                                {apptInvoice ? (
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={cn(
                                        'text-[10px] font-bold px-2 py-0.5 rounded-md border',
                                        isPaid
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                      )}
                                    >
                                      ₹{apptInvoice.amount} {isPaid ? 'Paid' : 'Due'}
                                    </span>
                                    {!isPaid && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setPayingInvoice(apptInvoice.id)
                                        }}
                                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                                      >
                                        Pay
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setBillApptId(a.id)
                                    }}
                                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                                  >
                                    + Bill
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        <button
                          type="button"
                          onClick={() => handleTimeSlotClick(time)}
                          className="text-xs font-bold text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border border-dashed border-emerald-300 px-3 py-1.5 rounded-xl cursor-pointer transition-all"
                        >
                          + Add
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 2. WEEK VIEW (Section 7) ────────────────────────────────────── */}
      {viewMode === 'week' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Week Grid Header */}
          <div className="grid grid-cols-7 bg-slate-900 text-white border-b border-slate-800 divide-x divide-slate-800 text-center">
            {weekRange.days.map((dayDate) => {
              const dStr = localDate(dayDate)
              const isTodayCol = isToday(dStr)
              const count = appointmentsByDay[dStr]?.length || 0

              return (
                <div
                  key={dStr}
                  className={cn(
                    'py-3 px-2',
                    isTodayCol && 'bg-emerald-950/60 ring-2 ring-emerald-500 inset-0'
                  )}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {dayDate.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </p>
                  <p
                    className={cn(
                      'text-sm font-extrabold mt-0.5',
                      isTodayCol ? 'text-emerald-400' : 'text-slate-100'
                    )}
                  >
                    {dayDate.getDate()} {dayDate.toLocaleDateString('en-GB', { month: 'short' })}
                  </p>
                  {count > 0 && (
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-800 text-slate-300">
                      {count} {count === 1 ? 'visit' : 'visits'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Week Columns Content */}
          <div className="grid grid-cols-7 divide-x divide-slate-100 min-h-[500px]">
            {weekRange.days.map((dayDate) => {
              const dStr = localDate(dayDate)
              const dayAppts = appointmentsByDay[dStr] || []
              const isTodayCol = isToday(dStr)

              return (
                <div
                  key={dStr}
                  className={cn(
                    'p-2.5 flex flex-col justify-between gap-2',
                    isTodayCol ? 'bg-emerald-50/20' : 'bg-white'
                  )}
                >
                  <div className="space-y-2">
                    {dayAppts.map((a) => {
                      const sc = getStatusColor(a.status)
                      const timeStr = a.appointment_time
                        ? new Date(a.appointment_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''
                      const isWalkin =
                        a.appointment_type?.name?.toLowerCase().includes('walk') ||
                        a.status === 'Arrived'

                      return (
                        <div
                          key={a.id}
                          onClick={() => setSelectedAppointmentId(a.id)}
                          className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer border-l-4"
                          style={{ borderLeftColor: sc }}
                        >
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-mono font-bold text-slate-700">{timeStr}</span>
                            <span
                              className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md uppercase"
                              style={{
                                backgroundColor: `${sc}15`,
                                color: sc,
                              }}
                            >
                              {a.status}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-slate-900 truncate">
                            {a.patient?.first_name} {a.patient?.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            Dr. {a.doctor?.username}
                          </p>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px]">
                            {isWalkin ? (
                              <span className="font-bold text-amber-700 bg-amber-50 px-1 rounded">
                                Walk-in
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                {a.appointment_type?.name || 'Routine'}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(consultationPath(a))
                              }}
                              className="font-bold text-emerald-700 hover:underline"
                            >
                              Start →
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {dayAppts.length === 0 && (
                      <div className="py-8 text-center text-xs text-slate-300 italic">
                        No appointments
                      </div>
                    )}
                  </div>

                  {/* Add appointment for this day */}
                  {closureReason(closures, dStr) && <p className="text-xs text-amber-800">Closed: {closureReason(closures, dStr)}</p>}
                  <button
                    type="button"
                    disabled={!!closureReason(closures, dStr)}
                    onClick={() => handleTimeSlotClick('09:00', dStr)}
                    className="w-full py-1.5 rounded-lg border border-dashed border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/50 text-xs font-bold transition-all cursor-pointer"
                  >
                    + Book
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 3. MONTH VIEW (Section 7) ───────────────────────────────────── */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Month Weekday Header */}
          <div className="grid grid-cols-7 bg-slate-900 text-slate-300 font-bold text-[11px] uppercase tracking-wider text-center py-2.5 border-b border-slate-800">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Month Calendar Grid */}
          <div className="grid grid-cols-7 border-b border-slate-100 divide-x divide-y divide-slate-100">
            {monthRange.days.map((dayDate) => {
              const dStr = localDate(dayDate)
              const dayAppts = appointmentsByDay[dStr] || []
              const isTodayCell = isToday(dStr)
              const isCurrentMonth = dayDate.getMonth() === monthRange.currentMonth

              return (
                <div
                  key={dStr}
                  onClick={() => {
                    setSelectedDate(dStr)
                    setViewMode('day')
                  }}
                  className={cn(
                    'min-h-[110px] p-2 flex flex-col justify-between transition-colors cursor-pointer hover:bg-slate-50',
                    !isCurrentMonth && 'bg-slate-50/50 text-slate-300',
                    isTodayCell && 'bg-emerald-50/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={cn(
                        'size-6 rounded-full flex items-center justify-center text-xs font-bold',
                        isTodayCell
                          ? 'bg-emerald-600 text-white font-extrabold'
                          : isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      )}
                    >
                      {dayDate.getDate()}
                    </span>

                    {dayAppts.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900">
                        {dayAppts.length}
                      </span>
                    )}
                  </div>

                  {/* Preview Chips */}
                  {closureReason(closures, dStr) && <p className="mb-1 text-[10px] font-semibold text-amber-800">Closed: {closureReason(closures, dStr)}</p>}
                  <div className="space-y-1 overflow-hidden">
                    {dayAppts.slice(0, 2).map((a) => (
                      <div
                        key={a.id}
                        className="truncate text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60"
                      >
                        {a.appointment_time?.split('T')[1]?.substring(0, 5)}{' '}
                        {a.patient?.first_name}
                      </div>
                    ))}
                    {dayAppts.length > 2 && (
                      <span className="text-[9px] font-bold text-slate-400 block text-right">
                        +{dayAppts.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Appointment Details Modal ─────────────────────────────────── */}
      {selectedAppointmentId && (
        <ModalCard
          onClose={() => setSelectedAppointmentId(null)}
          title={t('appointments.detailsTitle')}
          maxWidth={480}
        >
          {loadingDetails ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3">
              <span className="size-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-400">Loading appointment details...</p>
            </div>
          ) : appointmentDetails ? (
            <div className="space-y-4">
              {/* Patient Card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3.5">
                <Avatar
                  first={appointmentDetails.patient?.first_name}
                  last={appointmentDetails.patient?.last_name}
                  size={48}
                  fontSize={16}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    {appointmentDetails.patient?.first_name} {appointmentDetails.patient?.last_name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {appointmentDetails.patient?.gender} · DOB: {appointmentDetails.patient?.dob || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">
                    📞 {appointmentDetails.patient?.contact_number}
                  </p>
                </div>
              </div>

              {/* Visit Attributes */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <FieldLabel>{t('appointments.doctor')}</FieldLabel>
                  <p className="font-bold text-slate-900">Dr. {appointmentDetails.doctor?.username}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <FieldLabel>{t('appointments.type')}</FieldLabel>
                  <p className="font-bold text-slate-900">
                    {appointmentDetails.appointment_type?.name || t('appointments.general')}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <FieldLabel>{t('appointments.dateTime')}</FieldLabel>
                <p className="font-bold text-slate-900">
                  {new Date(appointmentDetails.appointment_time).toLocaleString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Status Selector */}
              <div>
                <FieldLabel>{t('settings.colStatus')}</FieldLabel>
                <select
                  disabled={isSelectedApptUneditable || false}
                  value={appointmentDetails.status}
                  onChange={(e) => {
                    const updatedData: AppointmentInput = {
                      patient_id: appointmentDetails.patient_id,
                      doctor_id: appointmentDetails.doctor_id,
                      appointment_type_id:
                        appointmentDetails.appointment_type_id ??
                        appointmentDetails.appointment_type?.id ??
                        null,
                      appointment_time: appointmentDetails.appointment_time,
                      status: e.target.value,
                    }
                    updateAppt.mutate({ id: appointmentDetails.id, data: updatedData })
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {statuses?.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSelectedApptUneditable || false}
                  onClick={() => {
                    if (confirm(t('appointments.deletePrompt'))) {
                      remove.mutate(appointmentDetails.id)
                      setSelectedAppointmentId(null)
                    }
                  }}
                  className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-40 cursor-pointer"
                >
                  {t('common.delete')}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAppointmentId(null)
                      navigate(consultationPath(appointmentDetails))
                    }}
                    className="btn btn-primary text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    Start Consultation
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillApptId(appointmentDetails.id)}
                    className="btn btn-secondary text-xs px-3 py-1.5"
                  >
                    Bill
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAppointmentId(null)}
                    className="btn btn-secondary text-xs px-3 py-1.5"
                  >
                    {t('common.done')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-red-600 py-6">{t('appointments.couldNotLoad')}</p>
          )}
        </ModalCard>
      )}

      {/* ── Schedule Appointment Modal ────────────────────────────────── */}
      {showForm && (
        <ModalCard onClose={resetScheduleForm} title={t('appointments.scheduleTitle')} maxWidth={520}>
          {/* Step 1: Search Patient */}
          {!selectedPatient && !showCreatePatient && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FieldLabel>{t('appointments.searchPatient')}</FieldLabel>
                <button
                  type="button"
                  onClick={() => setShowCreatePatient(true)}
                  className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  + {t('appointments.newPatientBtn')}
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('appointments.searchPlaceholder')}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              {loadingPatients && (
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
                  Searching patients...
                </p>
              )}

              {searchQuery && !loadingPatients && patients && (
                <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-100 shadow-2xs">
                  {patients.length > 0 ? (
                    patients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p)
                          setForm((f) => ({ ...f, patient_id: p.id }))
                        }}
                        className="p-3 hover:bg-emerald-50/50 cursor-pointer flex items-center gap-3 transition-colors"
                      >
                        <Avatar first={p.first_name} last={p.last_name} size={34} fontSize={11} />
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {p.first_name} {p.last_name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            📞 {p.contact_number} · {p.gender}, {p.blood_group}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                      <p>No matching patients found.</p>
                      <button
                        type="button"
                        onClick={() => setShowCreatePatient(true)}
                        className="btn btn-primary text-xs px-3 py-1 bg-emerald-600 text-white font-bold"
                      >
                        Create New Patient
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Create Patient Form */}
          {showCreatePatient && !selectedPatient && (
            <form onSubmit={handleCreatePatient} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-900">Quick Patient Registration</span>
                <button
                  type="button"
                  onClick={() => setShowCreatePatient(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div>
                <FieldLabel>OPD / Medical Record Number *</FieldLabel>
                <input
                  value={patientForm.opd_number}
                  onChange={(e) => setPatientForm({ ...patientForm, opd_number: e.target.value })}
                  required
                  placeholder="OPD-10293"
                  className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {([
                  { label: 'First Name *', key: 'first_name', required: true },
                  { label: 'Last Name *', key: 'last_name', required: true },
                  { label: 'Phone Number *', key: 'contact_number', required: true },
                  { label: 'Date of Birth *', key: 'dob', type: 'date', required: true },
                ] as { label: string; key: NewPatientTextField; type?: string; required?: boolean }[]).map(
                  ({ label, key, type, required }) => (
                    <div key={key}>
                      <FieldLabel>{label}</FieldLabel>
                      <input
                        required={required}
                        type={type || 'text'}
                        value={patientForm[key]}
                        onChange={(e) => setPatientForm({ ...patientForm, [key]: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white"
                      />
                    </div>
                  )
                )}

                <div>
                  <FieldLabel>Gender *</FieldLabel>
                  <select
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <FieldLabel>Blood Group</FieldLabel>
                  <input
                    value={patientForm.blood_group}
                    onChange={(e) => setPatientForm({ ...patientForm, blood_group: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <FieldLabel>Preferred Language</FieldLabel>
                  <input
                    value={patientForm.language}
                    onChange={(e) => setPatientForm({ ...patientForm, language: e.target.value })}
                    placeholder="e.g. Telugu, Hindi, English"
                    list="quick-patient-languages"
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white"
                  />
                  <datalist id="quick-patient-languages">
                    {['Telugu', 'Hindi', 'English', 'Tamil', 'Kannada', 'Malayalam', 'Urdu', 'Marathi', 'Bengali'].map(language => (
                      <option key={language} value={language} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePatient(false)}
                  className="btn btn-secondary text-xs"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={createPatientMut.isPending}
                  className="btn btn-primary text-xs bg-emerald-600 text-white font-bold"
                >
                  {createPatientMut.isPending ? 'Saving...' : 'Save & Select'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Appointment Booking Form */}
          {selectedPatient && !showCreatePatient && (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Patient Banner */}
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    first={selectedPatient.first_name}
                    last={selectedPatient.last_name}
                    size={36}
                    fontSize={12}
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      📞 {selectedPatient.contact_number} · {selectedPatient.gender}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null)
                    setForm((f) => ({ ...f, patient_id: '' }))
                  }}
                  className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Doctor Selection */}
              <div>
                <FieldLabel>{t('appointments.doctor')}</FieldLabel>
                <select
                  required
                  value={form.doctor_id}
                  onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 bg-white"
                >
                  <option value="">{t('appointments.selectDoctor')}</option>
                  {doctors?.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.username}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type and Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>{t('appointments.appointmentType')}</FieldLabel>
                  <select
                    required
                    value={form.appointment_type_id}
                    onChange={(e) => setForm({ ...form, appointment_type_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value="">{t('appointments.selectType')}</option>
                    {types?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (₹{t.rate})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel>{t('settings.colStatus')}</FieldLabel>
                  <select
                    required
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                  >
                    {statuses?.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <FieldLabel>{t('appointments.dateTimeField')}</FieldLabel>
                <input
                  type="datetime-local"
                  required
                  value={form.appointment_time}
                  onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 bg-white"
                />
                {closureReason(closures, form.appointment_time.slice(0, 10)) && <p className="mt-2 text-xs text-amber-800">Clinic closed: {closureReason(closures, form.appointment_time.slice(0, 10))}. Choose another date.</p>}
                {bookingError && <p role="alert" className="mt-2 text-xs text-red-700">{bookingError}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetScheduleForm}
                  className="btn btn-secondary text-xs"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={create.isPending || !!closureReason(closures, form.appointment_time.slice(0, 10))}
                  className="btn btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {create.isPending ? t('common.saving') : t('appointments.scheduleAppointment')}
                </button>
              </div>
            </form>
          )}
        </ModalCard>
      )}

      {/* ── Billing Modal ─────────────────────────────────────────────── */}
      {billApptId && (
        <InvoiceModal
          patients={patients}
          defaultAppointmentId={billApptId}
          defaultPatientId={appointments?.find((a) => a.id === billApptId)?.patient_id}
          onClose={() => setBillApptId(null)}
          onSave={async (data) => {
            await createInvoice.mutateAsync(data)
            setBillApptId(null)
          }}
        />
      )}

      {/* ── Payment Details Modal ─────────────────────────────────────── */}
      {payingInvoice && (
        <PaymentModal
          invoiceId={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onSave={(data) => {
            updateInvoiceStatus.mutate({ id: payingInvoice, data })
            setPayingInvoice(null)
          }}
        />
      )}
    </div>
  )
}
