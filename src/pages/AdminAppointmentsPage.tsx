import { useTranslation } from 'react-i18next'
import { useAppointments } from '../hooks/useAppointments'
import { Avatar } from '../components/Layout'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Scheduled: 'bg-blue-100 text-blue-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Cancelled: 'bg-red-100 text-red-600',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  )
}

export default function AdminAppointmentsPage() {
  const { t } = useTranslation()
  const { data: appointments, isLoading } = useAppointments()

  const now = new Date()
  const threeMonthsFromNow = new Date()
  threeMonthsFromNow.setMonth(now.getMonth() + 3)

  const next3MonthsAppts = appointments?.filter((a) => {
    const d = new Date(a.appointment_time)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return d >= startOfToday && d <= threeMonthsFromNow
  }).sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()) || []

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Appointments
          </h1>
          <p className="text-slate-500 text-sm mt-1">Appointments scheduled within the next 3 months</p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Upcoming Appointments</h2>
          </div>
          <span className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full font-medium shadow-sm">
            Total: {next3MonthsAppts.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : !next3MonthsAppts.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-3 opacity-40">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p className="text-sm font-medium">No appointments found</p>
            <p className="text-xs mt-1">There are no appointments scheduled for the next 3 months.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {next3MonthsAppts.map((appt) => {
              const dt = new Date(appt.appointment_time)
              const patientName = [appt.patient?.first_name, appt.patient?.last_name].filter(Boolean).join(' ')
              return (
                <div key={appt.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <Avatar name={patientName || '?'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {patientName || 'Unknown Patient'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      Dr. {appt.doctor?.username}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-slate-600">
                      {dt.toLocaleDateString('en-GB')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
