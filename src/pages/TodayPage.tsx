import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import api from '../api/axios'
import { getAppointments } from '../api/appointments'
import { getLabQueue } from '../api/labResults'
import { useUpdateAppointmentStatus } from '../hooks/useAppointments'
import { useMe } from '../hooks/useUsers'
import { Icons } from '../components/Icons'
import { can, consultationPath, localDate, worklistStage } from '../utils/workflow'
import { cn } from '../utils/cn'
import { DoctorAttentionQueueModal } from '../components/DoctorAttentionQueueModal'

type Followup = { encounter_id: number; patient_id: number; patient_name: string; followup_date: string; reason?: string }

export default function TodayPage() {
  const { data: me } = useMe()
  const navigate = useNavigate()
  const [date, setDate] = useState(localDate())
  const [stage, setStage] = useState('all')
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<{ id: number; message: string } | null>(null)
  const [isAttentionQueueOpen, setIsAttentionQueueOpen] = useState(false)

  const isDoctor = me?.role?.name?.toLowerCase().includes('doctor')
  const clinical = can(me, 'manage_clinical')

  // Greeting based on time of day
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const doctorTitle = me?.username ? `Dr. ${me.username}` : 'Doctor'

  // Appointments for selected date
  const appointments = useQuery({
    queryKey: ['appointments', { appointment_date: date, doctor_id: isDoctor ? me?.id : undefined, limit: 1000 }],
    queryFn: () => getAppointments({ appointment_date: date, ...(isDoctor && me?.id ? { doctor_id: me.id } : {}), limit: 1000 }),
    enabled: can(me, 'view_appointments'),
    refetchInterval: 30000,
  })

  // Upcoming & overdue follow-ups
  const followups = useQuery({
    queryKey: ['followups', date, me?.id],
    queryFn: () => api.get<Followup[]>('/visits/followups/upcoming', {
      params: { start_date: date, end_date: date, ...(isDoctor && me?.id ? { doctor_id: me.id } : {}) }
    }).then(r => r.data),
    enabled: can(me, 'view_clinical'),
  })

  // Lab queue orders pending review
  const labOrders = useQuery({
    queryKey: ['labQueue', 'pending'],
    queryFn: () => getLabQueue('Pending'),
    enabled: can(me, 'view_clinical'),
  })

  const checkin = useUpdateAppointmentStatus()
  const rows = appointments.data || []

  // Calculated KPI metrics (Section 4)
  const stats = useMemo(() => {
    const total = rows.length
    const waitingList = rows.filter(r => worklistStage(r) === 'waiting')
    const waitingCount = waitingList.length
    const inConsultCount = rows.filter(r => worklistStage(r) === 'consulting').length
    const completedCount = rows.filter(r => worklistStage(r) === 'finished').length
    const scheduledCount = rows.filter(r => worklistStage(r) === 'scheduled').length

    // Calculate approximate longest waiting time
    let longestWaitMins = 0
    if (waitingList.length > 0) {
      const now = new Date().getTime()
      waitingList.forEach(item => {
        const apptTime = new Date(item.appointment_time).getTime()
        const diffMins = Math.max(0, Math.floor((now - apptTime) / 60000))
        if (diffMins > longestWaitMins) longestWaitMins = diffMins
      })
    }

    const followupsDueCount = followups.data?.length || 0
    const pendingLabsCount = labOrders.data?.length || 0

    return {
      total,
      scheduledCount,
      waitingCount,
      inConsultCount,
      completedCount,
      longestWaitMins: longestWaitMins > 0 ? `${longestWaitMins}m` : 'On schedule',
      followupsDueCount,
      pendingLabsCount,
    }
  }, [rows, followups.data, labOrders.data])

  // Filtered queue rows
  const filtered = useMemo(() => {
    return rows.filter(item => {
      const stageMatch = stage === 'all' || worklistStage(item) === stage
      const searchMatch = !search.trim() || [
        item.patient?.first_name,
        item.patient?.last_name,
        item.patient?.opd_number,
        item.token_number,
        item.patient?.contact_number,
        item.status
      ].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
      return stageMatch && searchMatch
    })
  }, [rows, stage, search])

  const changeStatus = async (id: number, newStatus: string = 'Waiting') => {
    setActionError(null)
    try {
      await checkin.mutateAsync({ id, status: newStatus })
    } catch (error) {
      setActionError({
        id,
        message: isAxiosError(error) ? error.response?.data?.detail || 'Status update failed.' : 'Status update failed.'
      })
    }
  }

  // Active / Ongoing consults for Attention Required panel
  const ongoingConsults = useMemo(() => {
    return rows.filter(r => r.status === 'Ongoing' || worklistStage(r) === 'consulting')
  }, [rows])

  return (
    <div className="workspace-page space-y-6">
      {/* ─── 4. Header: Greeting & Today's Work Actions ─── */}
      <header className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500"></span>
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
              {greeting}, {doctorTitle}
            </p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
            Today's Work
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}<span className="font-semibold text-slate-700">{stats.total} Appointments</span> ({stats.completedCount} completed, {stats.total - stats.completedCount} remaining)
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            id="worklist-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value || localDate())}
            className="input text-xs py-2 px-3 bg-slate-50 border-slate-200 rounded-xl"
            aria-label="Filter worklist by date"
          />
          {date !== localDate() && (
            <button
              type="button"
              onClick={() => setDate(localDate())}
              className="btn btn-secondary text-xs px-3"
            >
              Today
            </button>
          )}
          {/* Primary Action: New Consultation (Section 4) */}
          {clinical && can(me, 'view_patients') && <button
            type="button"
            onClick={() => navigate('/visits/new?action=start')}
            className="btn btn-primary text-xs px-4 shadow-sm shadow-emerald-700/30 font-bold"
          >
            {Icons.plus} New Consultation
          </button>}
          {/* Secondary Action: Add Walk-in (Section 4) */}
          <button
            type="button"
            onClick={() => navigate('/appointments?action=walkin')}
            className="btn btn-secondary text-xs px-3.5 font-bold"
          >
            {Icons.clock} Add Walk-in
          </button>
          {/* Attention Queue (Section 8) */}
          <button
            type="button"
            onClick={() => setIsAttentionQueueOpen(true)}
            className="btn btn-secondary text-xs px-3.5 font-bold flex items-center gap-1.5 border-rose-200 text-rose-800 bg-rose-50 hover:bg-rose-100"
          >
            <span>⚡</span> Attention Queue
          </button>
        </div>
      </header>

      {/* ─── 4. KPI Cards: 4 Compact Actionable Cards (Section 4) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Appointments Today */}
        <div className="card p-4 gradient-card-emerald rounded-2xl hover:border-emerald-300 transition-all hover:shadow-xs group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Appointments Today</span>
            <div className="size-8 rounded-lg badge-icon-emerald flex items-center justify-center shrink-0">
              {Icons.calendar}
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{stats.total}</span>
            <span className="text-xs text-slate-500">total booked</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {stats.completedCount} completed · {stats.scheduledCount} expected
          </p>
        </div>

        {/* KPI 2: Patients Waiting */}
        <div className="card p-4 gradient-card-amber rounded-2xl hover:border-amber-400 transition-all hover:shadow-xs group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Patients Waiting</span>
            <div className="size-8 rounded-lg badge-icon-amber flex items-center justify-center shrink-0">
              {Icons.clock}
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{stats.waitingCount}</span>
            <span className="text-xs text-amber-700 font-medium">ready for consult</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Longest wait: <span className="font-semibold text-slate-700">{stats.longestWaitMins}</span>
          </p>
        </div>

        {/* KPI 3: Follow-ups Due */}
        <div className="card p-4 gradient-card-blue rounded-2xl hover:border-blue-400 transition-all hover:shadow-xs group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Follow-ups Due</span>
            <div className="size-8 rounded-lg badge-icon-blue flex items-center justify-center shrink-0">
              {Icons.stethoscope}
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{stats.followupsDueCount}</span>
            <span className="text-xs text-slate-500">due today</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Review overdue patient visits
          </p>
        </div>

        {/* KPI 4: New Results */}
        <div className="card p-4 gradient-card-indigo rounded-2xl hover:border-indigo-400 transition-all hover:shadow-xs group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">New Lab Results</span>
            <div className="size-8 rounded-lg badge-icon-indigo flex items-center justify-center shrink-0">
              {Icons.flask}
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">{stats.pendingLabsCount}</span>
            <span className="text-xs text-indigo-700 font-medium">pending review</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Awaiting clinician acknowledgement
          </p>
        </div>
      </div>

      {/* ─── Main Content Grid: 5. Patient Queue + 6. Attention Required ─── */}
      <div className="grid xl:grid-cols-3 gap-6 items-start">
        {/* ─── 5. Today's Patient Queue (2 Cols) ─── */}
        <section className="xl:col-span-2 min-w-0 rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
          {/* Queue Header & Stage Tabs */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Today's Patient Queue</h2>
                <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 text-xs tabular-nums">
                  {filtered.length}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Live consultation and arrival queue
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => appointments.refetch()}
                disabled={appointments.isFetching}
                className="btn btn-secondary text-xs py-1.5 px-3"
              >
                {appointments.isFetching ? 'Refreshing…' : 'Refresh Queue'}
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-3.5 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-slate-400 size-4">
                {Icons.search}
              </span>
              <input
                id="queue-search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filter by patient name, OPD, token, mobile..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              {[
                { key: 'all', label: 'All' },
                { key: 'waiting', label: `Waiting (${stats.waitingCount})` },
                { key: 'consulting', label: `Consulting (${stats.inConsultCount})` },
                { key: 'scheduled', label: `Expected (${stats.scheduledCount})` },
                { key: 'finished', label: `Completed (${stats.completedCount})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStage(tab.key)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer',
                    stage === tab.key
                      ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Queue Table */}
          {appointments.isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : appointments.isError ? (
            <div className="p-8 text-center text-sm text-red-600">
              Failed to load patient queue. <button className="underline font-semibold" onClick={() => appointments.refetch()}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                {Icons.calendar}
              </div>
              <p className="text-sm font-semibold text-slate-800">No patients in this queue view</p>
              <p className="text-xs text-slate-400 mt-1">Check another status filter or register a walk-in patient.</p>
              <button
                type="button"
                onClick={() => { setSearch(''); setStage('all') }}
                className="btn btn-secondary text-xs mt-4"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Time / Token</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3 hidden sm:table-cell">Age / Sex</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">Visit Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => {
                    const patientName = [item.patient?.first_name, item.patient?.last_name].filter(Boolean).join(' ') || `Patient #${item.patient_id}`
                    const stageKey = worklistStage(item)
                    const isFinished = stageKey === 'finished' || item.encounter_status === 'Completed'
                    const isOngoing = item.status === 'Ongoing' || stageKey === 'consulting'
                    const isWaiting = stageKey === 'waiting'
                    const timeStr = new Date(item.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                    return (
                      <tr
                        key={item.id}
                        className={cn(
                          'hover:bg-slate-50/70 transition-colors',
                          isOngoing && 'bg-emerald-50/30'
                        )}
                      >
                        {/* Time / Token */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'size-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                              isOngoing ? 'bg-emerald-600 text-white' : isWaiting ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            )}>
                              {item.token_number || '—'}
                            </span>
                            <span className="font-semibold text-slate-700 tabular-nums">{timeStr}</span>
                          </div>
                        </td>

                        {/* Patient Name & OPD */}
                        <td className="py-3 px-3">
                          <div className="min-w-0">
                            <Link
                              to={`/patients/${item.patient_id}`}
                              className="font-bold text-slate-900 hover:text-emerald-700 hover:underline block truncate"
                            >
                              {patientName}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {item.patient?.opd_number && (
                                <span className="font-mono text-[10px] text-slate-500 font-medium">
                                  {item.patient.opd_number}
                                </span>
                              )}
                              {item.patient?.blood_group && (
                                <span className="text-[9px] font-bold px-1 rounded bg-rose-50 text-rose-700 border border-rose-100">
                                  {item.patient.blood_group}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Age / Sex */}
                        <td className="py-3 px-3 hidden sm:table-cell whitespace-nowrap text-slate-600">
                          {item.patient?.gender ? (
                            <span>{item.patient.gender}</span>
                          ) : '—'}
                        </td>

                        {/* Visit Type */}
                        <td className="py-3 px-3 hidden md:table-cell whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                            {item.token_number ? 'Walk-in' : 'Scheduled'}
                          </span>
                        </td>

                        {/* Status (Section 5) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
                            isOngoing ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-400/40' :
                            isWaiting ? 'bg-amber-100 text-amber-800' :
                            isFinished ? 'bg-slate-100 text-slate-500' :
                            'bg-blue-50 text-blue-700'
                          )}>
                            {isOngoing && <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            {isOngoing ? 'In Consultation' : isWaiting ? 'Waiting' : item.status}
                          </span>
                        </td>

                        {/* Actions (Section 5) */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Check In action for reception/nurse */}
                            {stageKey === 'scheduled' && (
                              <button
                                type="button"
                                onClick={() => changeStatus(item.id, 'Waiting')}
                                disabled={checkin.isPending}
                                className="btn btn-secondary text-xs py-1 px-2.5"
                              >
                                Check In
                              </button>
                            )}

                            {/* Start / Resume Consultation action */}
                            {clinical && !isFinished && (
                              <Link
                                to={consultationPath(item)}
                                className={cn(
                                  'btn text-xs py-1 px-3',
                                  isOngoing ? 'btn-primary bg-emerald-600 hover:bg-emerald-700 text-white' : 'btn-primary bg-emerald-700 text-white'
                                )}
                              >
                                {item.encounter_id ? 'Resume' : 'Start Consult'}
                              </Link>
                            )}

                            {/* Open Chart */}
                            <Link
                              to={`/patients/${item.patient_id}?tab=visits`}
                              className="btn btn-secondary text-xs py-1 px-2"
                              title="Open Patient Chart"
                            >
                              Chart
                            </Link>
                          </div>
                          {actionError?.id === item.id && (
                            <p className="text-[10px] text-rose-600 mt-1">{actionError.message}</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── 6. Attention Required Panel (Section 6) ─── */}
        <aside className="space-y-4 min-w-0">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-amber-500 animate-ping" />
                <h2 className="text-sm font-bold text-slate-900">Attention Required</h2>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Action Items
              </span>
            </div>

            <div className="mt-3.5 space-y-3">
              {/* Clinician Attention Triage Card (Section 8) */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-rose-50/80 to-amber-50/80 border border-rose-200/70">
                <div className="flex items-start gap-2.5">
                  <span className="text-rose-600 size-4 shrink-0 mt-0.5 font-bold">⚡</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-rose-950">Clinician Attention Triage</p>
                    <p className="text-[11px] text-rose-800 mt-0.5">
                      Categorized review: Needs Decision, Needs Attention, and FYI.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAttentionQueueOpen(true)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 hover:text-rose-950 hover:underline"
                    >
                      Open Attention Queue →
                    </button>
                  </div>
                </div>
              </div>

              {/* Abnormal Results / Pending Lab Review */}
              {labOrders.data && labOrders.data.length > 0 ? (
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70">
                  <div className="flex items-start gap-2.5">
                    <span className="text-amber-700 size-4 shrink-0 mt-0.5">
                      {Icons.flask}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-amber-900">
                        {labOrders.data.length} Lab Results Awaiting Review
                      </p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        New orders completed and awaiting doctor sign-off.
                      </p>
                      <Link
                        to="/labs"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 mt-1.5"
                      >
                        Review Results →
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                  <span className="text-emerald-600 size-4 shrink-0">{Icons.check}</span>
                  <span className="text-xs text-slate-500">All lab results up to date</span>
                </div>
              )}

              {/* Overdue Follow-ups */}
              {followups.data && followups.data.length > 0 ? (
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/70">
                  <div className="flex items-start gap-2.5">
                    <span className="text-blue-700 size-4 shrink-0 mt-0.5">
                      {Icons.clock}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-blue-900">
                        {followups.data.length} Follow-ups Due
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {followups.data.slice(0, 3).map(f => (
                          <li key={f.encounter_id} className="text-[11px] text-blue-800 truncate">
                            <Link to={`/patients/${f.patient_id}`} className="font-semibold hover:underline">
                              {f.patient_name}
                            </Link>
                            {f.reason && <span className="text-blue-600"> · {f.reason}</span>}
                          </li>
                        ))}
                      </ul>
                      {followups.data.length > 3 && (
                        <p className="text-[10px] text-blue-600 mt-1">+{followups.data.length - 3} more</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Active / Ongoing Consultations */}
              {ongoingConsults.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                  <div className="flex items-start gap-2.5">
                    <span className="text-emerald-700 size-4 shrink-0 mt-0.5">
                      {Icons.stethoscope}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-emerald-950">
                        {ongoingConsults.length} Active Visit in Progress
                      </p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Consultation draft open. Ready to review and sign.
                      </p>
                      <Link
                        to={consultationPath(ongoingConsults[0])}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 mt-1.5"
                      >
                        Resume Active Consultation →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Quick Care Link Card */}
          <section className="rounded-2xl bg-linear-to-br from-slate-900 to-[#0e231e] p-5 text-white shadow-xs">
            <div className="size-9 rounded-xl bg-white/10 flex items-center justify-center mb-3">
              {Icons.patients}
            </div>
            <h3 className="text-sm font-bold">Fast Patient Lookup</h3>
            <p className="text-xs text-slate-300 mt-1">
              Search by name, phone or OPD to view full medical history and timeline.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => navigate('/patients')}
                className="btn btn-primary bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold py-1.5 px-3"
              >
                Directory
              </button>
              <button
                type="button"
                onClick={() => navigate('/patients?action=new')}
                className="btn btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs py-1.5 px-3"
              >
                + New Patient
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* ─── Clinician Attention Queue Modal (Section 8) ─── */}
      <DoctorAttentionQueueModal
        isOpen={isAttentionQueueOpen}
        onClose={() => setIsAttentionQueueOpen(false)}
      />
    </div>
  )
}
