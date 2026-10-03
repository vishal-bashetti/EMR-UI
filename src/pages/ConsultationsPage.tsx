import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAppointments } from '../api/appointments'
import { consultationPath, localDate } from '../utils/workflow'

export default function ConsultationsPage() {
  const [date, setDate] = useState(localDate)
  const [search, setSearch] = useState('')
  const { data: appointments = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['appointments', 'consultations', date],
    queryFn: async () => {
      // Read every page so busy days are not silently truncated at the API limit.
      const rows = []
      for (let skip = 0; ; skip += 500) {
        const page = await getAppointments({ appointment_date: date, skip, limit: 500 })
        rows.push(...page)
        if (page.length < 500) return rows
      }
    },
  })
  const ordered = useMemo(() => [...appointments].sort((a, b) =>
    a.appointment_time.localeCompare(b.appointment_time) || a.id - b.id
  ).map((appointment, index) => ({ appointment, position: index + 1 })), [appointments])
  const visible = ordered.filter(({ appointment: a }) => {
    const p = a.patient
    const text = [p?.first_name, p?.last_name, p?.opd_number, p?.contact_number,
      a.patient_id, a.token_number, a.doctor?.username, a.appointment_type?.name, a.status].join(' ').toLowerCase()
    return search.trim().toLowerCase().split(/\s+/).every(word => text.includes(word))
  })

  return <div className="space-y-5 p-4 sm:p-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Consultations</h1>
      <p className="mt-1 text-sm text-slate-500">Daily consultations in appointment time order, earliest first.</p>
    </div>
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="text-sm font-medium text-slate-700">Consultation date
        <input type="date" value={date} onChange={e => { if (e.target.value) setDate(e.target.value) }} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <button type="button" onClick={() => setDate(localDate())} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Today</button>
      <label className="min-w-60 flex-1 text-sm font-medium text-slate-700">Search consultations
        <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, OPD number, phone, token, doctor or status" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
    </div>
    {isLoading ? <p role="status" className="p-6 text-slate-500">Loading consultations…</p>
      : isError ? <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-800">Unable to load consultations. <button onClick={() => refetch()} className="underline">Retry</button></div>
      : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <p aria-live="polite" className="border-b border-slate-200 px-4 py-3 text-sm text-slate-500">{visible.length} of {appointments.length} consultations · {date}</p>
        {visible.length === 0 ? <p className="p-8 text-center text-slate-500">{appointments.length ? 'No consultations match your search.' : 'No consultations for this day.'}</p>
          : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr>{['Order / Token', 'Time', 'Patient', 'Phone', 'Doctor / Type', 'Status', 'Action'].map(title => <th key={title} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{title}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{visible.map(({ appointment: a, position }) => <tr key={a.id} className="hover:bg-slate-50">
              <td className="px-4 py-4"><span className="font-semibold">{position}</span>{a.token_number && <div className="text-xs text-slate-500">Token {a.token_number}</div>}</td>
              <td className="whitespace-nowrap px-4 py-4">{new Date(a.appointment_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
              <td className="min-w-48 px-4 py-4"><Link to={`/patients/${a.patient_id}`} className="font-semibold text-emerald-800 hover:underline">{a.patient ? `${a.patient.first_name} ${a.patient.last_name}`.trim() : `Patient #${a.patient_id}`}</Link><div className="mt-1 text-xs text-slate-500">OPD: {a.patient?.opd_number || '—'} · {a.patient?.gender || '—'}</div></td>
              <td className="whitespace-nowrap px-4 py-4">{a.patient?.contact_number || '—'}</td>
              <td className="px-4 py-4">{a.doctor?.username || '—'}<div className="text-xs text-slate-500">{a.appointment_type?.name || 'Consultation'}</div></td>
              <td className="whitespace-nowrap px-4 py-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">{a.encounter_status === 'Completed' ? 'Completed' : a.status}</span></td>
              <td className="whitespace-nowrap px-4 py-4"><Link to={consultationPath(a)} className="font-medium text-emerald-800 hover:underline">{['Completed', 'Cancelled', 'No Show'].includes(a.status) || a.encounter_status === 'Completed' ? 'View record' : a.encounter_id || a.status === 'Ongoing' ? 'Continue' : 'Open consultation'}</Link></td>
            </tr>)}</tbody>
          </table></div>}
      </div>}
  </div>
}
