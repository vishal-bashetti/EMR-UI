import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useMe } from '../hooks/useUsers'
import { usePatients } from '../hooks/usePatients'
import { useAppointments } from '../hooks/useAppointments'
import { Avatar } from '../components/Layout'

type Accent = 'blue' | 'green' | 'violet' | 'amber'

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string
  value?: number
  sub?: string
  icon: ReactNode
  accent: Accent
}) {
  const accents: Record<Accent, { bg: string; icon: string; value: string }> = {
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', value: 'text-blue-700' },
    green: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', value: 'text-emerald-700' },
    violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600', value: 'text-violet-700' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', value: 'text-amber-700' },
  }
  const c = accents[accent]
  return (
    <div className={`${c.bg} rounded-2xl p-5 border border-white shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${c.value}`}>{value ?? <span className="opacity-30">—</span>}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        <div className={`${c.icon} w-10 h-10 rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

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

export default function DashboardPage() {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const { data: patients } = usePatients()
  const { data: appointments } = useAppointments()

  const today = new Date().toLocaleDateString('en-CA')
  const todayAppts = appointments?.filter((a) => a.appointment_time?.slice(0, 10) === today) || []
  const scheduled = appointments?.filter((a) => a.status === 'Scheduled') || []
  const completed = appointments?.filter((a) => a.status === 'Completed') || []

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return t('dashboard.greetingMorning')
    if (h < 17) return t('dashboard.greetingAfternoon')
    return t('dashboard.greetingEvening')
  }

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('dashboard.greetingLine', { greeting: greeting(), name: me?.username ?? '…' })}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-slate-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {me?.role?.name}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t('dashboard.totalPatients')}
          value={patients?.length}
          sub={t('dashboard.activeRecords')}
          accent="blue"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label={t('dashboard.todaysAppointments')}
          value={todayAppts.length}
          sub={`${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          accent="green"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />
        <StatCard
          label={t('dashboard.scheduled')}
          value={scheduled.length}
          sub={t('dashboard.upcomingVisits')}
          accent="violet"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <StatCard
          label={t('dashboard.completed')}
          value={completed.length}
          sub={t('dashboard.allTime')}
          accent="amber"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><polyline points="20 6 9 17 4 12"/></svg>}
        />
      </div>

      {/* Recent appointments */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{t('dashboard.recentAppointments')}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.recentSubtitle')}</p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
            {t('dashboard.totalCount', { count: appointments?.length ?? 0 })}
          </span>
        </div>

        {!appointments?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-3 opacity-40">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p className="text-sm font-medium">{t('dashboard.noAppointments')}</p>
            <p className="text-xs mt-1">{t('dashboard.noAppointmentsSub')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.slice(0, 6).map((appt) => {
              const dt = new Date(appt.appointment_time)
              const patientName = [appt.patient?.first_name, appt.patient?.last_name].filter(Boolean).join(' ')
              return (
                <div key={appt.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <Avatar name={patientName || '?'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {patientName || t('dashboard.unknownPatient')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {t('dashboard.doctorPrefix', { name: appt.doctor?.username ?? '' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-slate-600">
                      {dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
