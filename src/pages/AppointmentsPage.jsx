import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useAppointments, useCreateAppointment,
  useUpdateAppointmentStatus, useDeleteAppointment,
  useAppointmentStatuses,
} from '../hooks/useAppointments'
import { usePatients } from '../hooks/usePatients'
import { useDoctors } from '../hooks/useUsers'
import { Icons } from '../components/Icons'

const FALLBACK_STATUS = {
  Scheduled: { cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500' },
  Completed: { cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  Cancelled: { cls: 'bg-red-50 text-red-600 ring-1 ring-red-200', dot: 'bg-red-400' },
}

function StatusBadge({ status, onChange, statuses }) {
  const s = FALLBACK_STATUS[status] || { cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200', dot: 'bg-slate-400' }
  const options = statuses?.length ? statuses.map(s => s.name) : ['Scheduled', 'Completed', 'Cancelled']
  return (
    <div className="relative group">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${s.cls}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {status}
      </span>
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  )
}

function PatientAvatar({ name }) {
  const colors = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500']
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  const initials = name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?'
  return (
    <div className={`w-9 h-9 ${colors[idx]} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  )
}

const inputCls = 'w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white'

export default function AppointmentsPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', appointment_time: '' })
  const [filterStatus, setFilterStatus] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data: appointments, isLoading } = useAppointments()
  const { data: patients } = usePatients()
  const { data: doctors } = useDoctors()
  const { data: apptStatuses } = useAppointmentStatuses()
  const create = useCreateAppointment()
  const updateStatus = useUpdateAppointmentStatus()
  const remove = useDeleteAppointment()

  const statusNames = apptStatuses?.map(s => s.name) ?? ['Scheduled', 'Completed', 'Cancelled']

  const displayed = filterStatus
    ? appointments?.filter((a) => a.status === filterStatus)
    : appointments

  const allCount = appointments?.length ?? 0
  const statusCounts = statusNames.reduce((acc, name) => {
    acc[name] = appointments?.filter(a => a.status === name).length ?? 0
    return acc
  }, {})

  const handleSubmit = async (e) => {
    e.preventDefault()
    await create.mutateAsync({
      patient_id: Number(form.patient_id),
      doctor_id: Number(form.doctor_id),
      appointment_time: new Date(form.appointment_time).toISOString(),
    })
    setForm({ patient_id: '', doctor_id: '', appointment_time: '' })
    setShowForm(false)
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-400 mt-0.5">{allCount} total appointments</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
        >
          {Icons.plus} Schedule
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {[['', 'All', allCount], ...statusNames.map(n => [n, n, statusCounts[n] ?? 0])].map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => setFilterStatus(val)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === val
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
              filterStatus === val ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Patient', 'Doctor', 'Date', 'Time', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6 last:pr-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayed?.map((a) => {
                const dt = new Date(a.appointment_time)
                const patientName = [a.patient?.first_name, a.patient?.last_name].filter(Boolean).join(' ')
                return (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-5 py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <PatientAvatar name={patientName} />
                        <div>
                          <p className="font-semibold text-slate-800">{patientName || '—'}</p>
                          <p className="text-xs text-slate-400">#{a.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                          {Icons.user}
                        </div>
                        <span className="text-slate-700 font-medium">Dr. {a.doctor?.username}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-slate-500 text-xs">
                        {Icons.clock}
                        {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        status={a.status}
                        onChange={(status) => updateStatus.mutate({ id: a.id, status })}
                        statuses={apptStatuses}
                      />
                    </td>
                    <td className="px-5 py-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {a.status === 'Scheduled' && (
                          <Link
                            to={`/visits/new?patient_id=${a.patient_id}&doctor_id=${a.doctor_id}&appointment_id=${a.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                            title="Record Visit"
                          >
                            {Icons.visits} Visit
                          </Link>
                        )}
                        <button
                          onClick={() => setConfirmDelete(a)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          {Icons.trash}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {displayed?.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center text-slate-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-3 opacity-40">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      <p className="text-sm font-medium">No appointments</p>
                      <p className="text-xs mt-1">Schedule one using the button above.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Schedule Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Schedule Appointment</h2>
                <p className="text-xs text-slate-400 mt-0.5">Select patient, doctor and time</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                {Icons.x}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Patient <span className="text-red-400">*</span>
                </label>
                <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} className={inputCls}>
                  <option value="">Select patient…</option>
                  {patients?.map((p) => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Doctor <span className="text-red-400">*</span>
                </label>
                <select required value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} className={inputCls}>
                  <option value="">Select doctor…</option>
                  {doctors?.map((d) => (
                    <option key={d.id} value={d.id}>Dr. {d.username}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Date & Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={form.appointment_time}
                  onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                  className={inputCls}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                  {create.isPending ? 'Saving…' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4 text-red-500">
              {Icons.trash}
            </div>
            <h3 className="text-base font-bold text-slate-900">Cancel Appointment?</h3>
            <p className="text-sm text-slate-500 mt-1 mb-5">
              This will permanently delete the appointment for{' '}
              <span className="font-medium text-slate-700">
                {confirmDelete.patient?.first_name} {confirmDelete.patient?.last_name}
              </span>.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">
                Keep it
              </button>
              <button
                onClick={() => { remove.mutate(confirmDelete.id); setConfirmDelete(null) }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
