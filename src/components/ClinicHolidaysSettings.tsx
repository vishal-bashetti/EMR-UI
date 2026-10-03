import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import api from '../api/axios'
import { useClinicClosures, type ClinicClosures } from '../hooks/useClinicClosures'

export default function ClinicHolidaysSettings() {
  const query = useClinicClosures()
  const qc = useQueryClient()
  const [draft, setDraft] = useState<ClinicClosures | null>(null)
  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const form = draft || query.data || { weekly_days_off: [], holidays: [] }
  const save = useMutation({ mutationFn: () => api.put<ClinicClosures>('/settings/closures', form),
    onSuccess: r => { qc.setQueryData(['clinicClosures'], r.data); setDraft(null); setMessage('Holiday settings saved.') },
    onError: e => setMessage(isAxiosError(e) ? e.response?.data?.detail || 'Unable to save holidays.' : 'Unable to save holidays.'),
  })
  if (query.isLoading) return <p role="status">Loading holiday settings…</p>
  if (query.isError) return <p role="alert">Unable to load holidays. <button onClick={() => query.refetch()}>Retry</button></p>
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
    <div><h2 className="font-bold text-slate-900">Holidays & Weekly Days Off</h2><p className="mt-1 text-sm text-slate-500">These closures apply to all doctors. New bookings are blocked; existing appointments remain visible for rescheduling.</p></div>
    <fieldset disabled={save.isPending}><legend className="text-sm font-semibold mb-3">Weekly holidays</legend><div className="flex flex-wrap gap-4">{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.weekly_days_off.includes(index)} onChange={e => { setMessage(''); setDraft({ ...form, weekly_days_off: e.target.checked ? [...form.weekly_days_off, index] : form.weekly_days_off.filter(d => d !== index) }) }} />{day}</label>)}</div></fieldset>
    <form onSubmit={e => { e.preventDefault(); if (form.holidays.some(h => h.date === date)) { setMessage('A holiday already exists for this date.'); return } setDraft({ ...form, holidays: [...form.holidays, { date, name: name.trim() }].sort((a, b) => a.date.localeCompare(b.date)) }); setDate(''); setName(''); setMessage('') }} className="space-y-3">
      <h3 className="text-sm font-semibold">Specific holiday dates</h3>
      <div className="flex flex-wrap items-end gap-3"><label className="text-xs text-slate-600">Holiday date<input required type="date" value={date} onChange={e => setDate(e.target.value)} className="block border rounded-lg p-2 mt-1 text-sm" /></label><label className="text-xs text-slate-600 flex-1">Holiday name<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Diwali" className="block w-full border rounded-lg p-2 mt-1 text-sm" /></label><button disabled={save.isPending || !name.trim()} className="rounded-lg border px-4 py-2 text-sm">Add holiday</button></div>
    </form>
    <ul className="divide-y divide-slate-100">{form.holidays.map(h => <li key={h.date} className="flex justify-between gap-3 py-3 text-sm"><span>{h.date} · {h.name}</span><button disabled={save.isPending} onClick={() => { setDraft({ ...form, holidays: form.holidays.filter(item => item.date !== h.date) }); setMessage('') }} className="text-red-700" aria-label={`Remove ${h.name} on ${h.date}`}>Remove</button></li>)}</ul>
    {!form.holidays.length && <p className="text-sm text-slate-500">No specific holiday dates added.</p>}
    <div className="flex items-center justify-between gap-3"><p role="status" className="text-sm">{message || (draft ? 'Unsaved changes' : '')}</p><button disabled={save.isPending || !draft} onClick={() => save.mutate()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{save.isPending ? 'Saving…' : 'Save holidays'}</button></div>
  </section>
}
