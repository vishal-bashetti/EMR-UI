import { useMe } from '../hooks/useUsers'
import { usePatients } from '../hooks/usePatients'
import { useAppointments } from '../hooks/useAppointments'

export default function DashboardPage() {
  const { data: me } = useMe()
  const { data: patients } = usePatients()
  const { data: appointments } = useAppointments()

  const today = new Date().toISOString().split('T')[0]
  const todayAppts = appointments?.filter((a) => a.appointment_time?.startsWith(today)) || []
  const scheduled = appointments?.filter((a) => a.status === 'Scheduled') || []

  const stats = [
    { label: 'Total Patients', value: patients?.length ?? '—', color: 'blue' },
    { label: "Today's Appointments", value: todayAppts.length, color: 'green' },
    { label: 'Scheduled', value: scheduled.length, color: 'indigo' },
    { label: 'Total Appointments', value: appointments?.length ?? '—', color: 'purple' },
  ]

  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {me?.username ?? '…'}
        </h2>
        <p className="text-gray-500 mt-1">Role: {me?.role?.name ?? '—'}</p>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-10 lg:grid-cols-4">
        {stats.map(({ label, value, color }) => (
          <div
            key={label}
            className={`border rounded-xl p-5 ${colorMap[color]}`}
          >
            <p className="text-sm font-medium opacity-70">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Appointments</h3>
        {appointments?.length === 0 && (
          <p className="text-gray-400 text-sm">No appointments yet.</p>
        )}
        <div className="space-y-3">
          {appointments?.slice(0, 5).map((appt) => (
            <div key={appt.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">
                  {appt.patient?.first_name} {appt.patient?.last_name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Dr. {appt.doctor?.username} · {new Date(appt.appointment_time).toLocaleString()}
                </p>
              </div>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                appt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                appt.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {appt.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
