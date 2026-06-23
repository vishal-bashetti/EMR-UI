import type { ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMe } from '../hooks/useUsers'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useAppointments } from '../hooks/useAppointments'
import { useInvoices, useCreateInvoice } from '../hooks/useBilling'
import { Avatar } from '../components/Layout'
import { InvoiceModal } from '../components/InvoiceModal'
import { Icons } from '../components/Icons'
import { useState, useEffect, useRef, useMemo } from 'react'

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
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [billApptId, setBillApptId] = useState<number | null>(null)

  const now = new Date()
  const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0]
  const selectedDate = searchParams.get('appointment_date') || todayStr
  const selectedStatus = searchParams.get('status') || ''
  const searchQuery = searchParams.get('search') || ''

  const { data: me } = useMe()
  const role = me?.role?.name?.toLowerCase() || ''
  
  const { data: stats } = useDashboardStats()
  const { data: appointments } = useAppointments({ 
    appointment_date: selectedDate,
    ...(role === 'doctor' && me?.id ? { doctor_id: me.id } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
    ...(searchQuery ? { search: searchQuery } : {}),
    skip: 0,
    limit: 100
  })
  const { data: invoices } = useInvoices(undefined, selectedDate, selectedDate)
  const invoiceLookup = useMemo(() => {
    if (!invoices) return () => []
    const byAppt = new Map()
    const byPatientNoAppt = new Map()
    for (const inv of invoices) {
      if (inv.appointment_id) {
        if (!byAppt.has(inv.appointment_id)) byAppt.set(inv.appointment_id, [])
        byAppt.get(inv.appointment_id).push(inv)
      } else if (inv.patient_id) {
        if (!byPatientNoAppt.has(inv.patient_id)) byPatientNoAppt.set(inv.patient_id, [])
        byPatientNoAppt.get(inv.patient_id).push(inv)
      }
    }
    return (apptId: number, patientId?: number) => {
      const apptInvs = byAppt.get(apptId) || []
      const patientInvs = patientId ? (byPatientNoAppt.get(patientId) || []) : []
      return [...apptInvs, ...patientInvs]
    }
  }, [invoices])

  const [visibleCount, setVisibleCount] = useState(20)
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setVisibleCount(20)
  }, [searchQuery, selectedStatus, selectedDate])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 20)
        }
      },
      { root: null, rootMargin: '0px', threshold: 0.1 }
    )
    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }
    return () => observer.disconnect()
  }, [])

  const createInvoice = useCreateInvoice()

  const displayAppts = appointments || []
  const isToday = selectedDate === todayStr
  
  const displayTitle = isToday 
    ? t('dashboard.todaysAppointments', "Today's Appointments") 
    : `Appointments on ${new Date(selectedDate).toLocaleDateString('en-GB')}`
  const displaySubtitle = `Showing appointments for ${new Date(selectedDate).toLocaleDateString('en-GB')}`

  const remaining = displayAppts.filter((a) => !['Completed', 'Cancelled', 'No Show'].includes(a.status || '')) || []
  const completed = displayAppts.filter((a) => a.status === 'Completed') || []

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
            {new Date().toLocaleDateString('en-GB')}
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
          label={t('dashboard.patientsSeenToday', 'Patients Seen Today')}
          value={stats?.today?.total_patients || 0}
          sub={t('dashboard.handledToday', 'Handled today')}
          accent="blue"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label={isToday ? t('dashboard.todaysAppointments') : "Appointments"}
          value={displayAppts.length}
          sub={`${new Date(selectedDate).toLocaleDateString('en-GB')}`}
          accent="green"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />
        <StatCard
          label={t('dashboard.remaining', 'Remaining')}
          value={remaining.length}
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
            <h2 className="text-base font-semibold text-slate-900">{displayTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{displaySubtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                const p = new URLSearchParams(searchParams)
                if (e.target.value) p.set('search', e.target.value)
                else p.delete('search')
                setSearchParams(p, { replace: true })
              }}
              className="text-sm font-medium border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-none focus:border-blue-500 w-40"
            />
            <select 
              value={selectedStatus}
              onChange={(e) => {
                const p = new URLSearchParams(searchParams)
                if (e.target.value) p.set('status', e.target.value)
                else p.delete('status')
                setSearchParams(p, { replace: true })
              }}
              className="text-sm font-medium border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-none focus:border-blue-500 cursor-pointer bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="No Show">No Show</option>
            </select>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                const p = new URLSearchParams(searchParams)
                if (e.target.value) p.set('appointment_date', e.target.value)
                else p.delete('appointment_date')
                setSearchParams(p, { replace: true })
              }}
              className="text-sm font-medium border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            />
            <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium shrink-0">
              {t('dashboard.totalCount', { count: displayAppts?.length ?? 0 })}
            </span>
          </div>
        </div>

        {!displayAppts?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-3 opacity-40">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p className="text-sm font-medium">{t('dashboard.noAppointments')}</p>
            <p className="text-xs mt-1">{t('dashboard.noAppointmentsSub')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[60vh] overflow-y-auto relative border border-slate-100 rounded-lg">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 font-semibold">ID (OPD)</th>
                  <th className="px-6 py-3 font-semibold">Token</th>
                  <th className="px-6 py-3 font-semibold">Patient Name</th>
                  <th className="px-6 py-3 font-semibold">Recent Visit</th>
                  <th className="px-6 py-3 font-semibold">Time</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Purpose</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayAppts.slice(0, visibleCount).map((appt) => {
                  const dt = new Date(appt.appointment_time)
                  const lastVisitDt = appt.last_visit_date ? new Date(appt.last_visit_date) : null
                  const patientName = [appt.patient?.first_name, appt.patient?.last_name].filter(Boolean).join(' ') || t('dashboard.unknownPatient')
                  const isPastOrOngoing = ['completed', 'no show', 'wait', 'ongoing'].includes(appt.status?.toLowerCase() || '')
                  
                  return (
                    <tr 
                      key={appt.id} 
                      className={`hover:bg-slate-50 transition-colors ${role === 'doctor' ? 'cursor-pointer' : ''}`}
                      onClick={() => {
                        if (role === 'doctor') {
                           if (isPastOrOngoing) {
                              navigate(`/patients/${appt.patient_id}?tab=visits`)
                           } else {
                              navigate(`/visits/new?patient_id=${appt.patient_id}&appointment_id=${appt.id}`)
                           }
                        }
                      }}
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                        {appt.patient?.opd_number || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-bold text-xs tracking-wide">
                          {appt.token_number || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{patientName}</div>
                        <div className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">{appt.patient?.contact_number || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        {lastVisitDt ? (
                           <div>
                             <div className="font-medium text-slate-700">{lastVisitDt.toLocaleDateString('en-GB')}</div>
                           </div>
                        ) : (
                           <span className="text-slate-400 italic text-xs">First visit</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-700">{dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{dt.toLocaleDateString('en-GB')}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 items-start">
                          <StatusBadge status={appt.status || 'Scheduled'} />
                          {invoiceLookup(appt.id, appt.patient_id).map((inv: any) => (
                            <span key={inv.id} className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${inv.status.toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                              ₹{inv.amount} {inv.status}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600">
                        {appt.appointment_type?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setBillApptId(appt.id) }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Create Bill"
                          >
                            {Icons.billing}
                          </button>
                          <button
                            onClick={(e) => {
                               e.stopPropagation()
                               if (isPastOrOngoing) {
                                  navigate(`/patients/${appt.patient_id}?tab=visits`)
                               } else {
                                  navigate(`/visits/new?patient_id=${appt.patient_id}&appointment_id=${appt.id}`)
                               }
                            }}
                            className="text-xs font-semibold bg-blue-50 text-blue-600 px-3.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                          >
                            {isPastOrOngoing ? 'View Visit' : 'Start Visit'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {visibleCount < displayAppts.length && (
              <div ref={observerTarget} className="h-4 w-full" />
            )}
          </div>
        )}
      </div>

      {billApptId && (
        <InvoiceModal
          patients={patients}
          defaultAppointmentId={billApptId}
          defaultPatientId={displayAppts.find(a => a.id === billApptId)?.patient_id}
          onClose={() => setBillApptId(null)}
          onSave={async (data) => {
            await createInvoice.mutateAsync(data)
            setBillApptId(null)
          }}
        />
      )}
    </div>
  )
}
