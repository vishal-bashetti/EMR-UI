import { useState } from 'react'
import { useAppointments, useCreateAppointment, useUpdateAppointmentStatus, useDeleteAppointment } from '../hooks/useAppointments'
import { usePatients } from '../hooks/usePatients'
import { useDoctors } from '../hooks/useUsers'

const STATUS_COLORS = {
  Scheduled: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
}

export default function AppointmentsPage() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', appointment_time: '' })

  const { data: appointments, isLoading } = useAppointments()
  const { data: patients } = usePatients()
  const { data: doctors } = useDoctors()
  const create = useCreateAppointment()
  const updateStatus = useUpdateAppointmentStatus()
  const remove = useDeleteAppointment()

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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Schedule
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Patient', 'Doctor', 'Date & Time', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {appointments?.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">
                  {a.patient?.first_name} {a.patient?.last_name}
                </td>
                <td className="px-5 py-3 text-gray-500">Dr. {a.doctor?.username}</td>
                <td className="px-5 py-3 text-gray-500">
                  {new Date(a.appointment_time).toLocaleString()}
                </td>
                <td className="px-5 py-3">
                  <select
                    value={a.status}
                    onChange={(e) => updateStatus.mutate({ id: a.id, status: e.target.value })}
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-700'}`}
                  >
                    <option>Scheduled</option>
                    <option>Completed</option>
                    <option>Cancelled</option>
                  </select>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => remove.mutate(a.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {appointments?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">No appointments yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Schedule Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">Schedule Appointment</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Patient</label>
                <select
                  required
                  value={form.patient_id}
                  onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select patient…</option>
                  {patients?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Doctor</label>
                <select
                  required
                  value={form.doctor_id}
                  onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select doctor…</option>
                  {doctors?.map((d) => (
                    <option key={d.id} value={d.id}>Dr. {d.username}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={form.appointment_time}
                  onChange={(e) => setForm({ ...form, appointment_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {create.isPending ? 'Saving…' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
