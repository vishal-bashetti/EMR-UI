import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import api from '../api/axios'
import { useMe } from '../hooks/useUsers'
import { can, localDate } from '../utils/workflow'

interface Service { service_name: string; quantity: number; unit_price: number; price_missing: boolean }
interface Suggestion {
  patient_id: number; patient_name: string; opd_number: string | null; service_date: string
  items: Service[]; unbilled_items: Service[]; total_amount: number; needs_review: boolean; status: string
  existing_invoices: { id: number; status: string; amount: number }[]
}

export default function DailyBillSuggestions({ onViewInvoice }: { onViewInvoice: (id: number) => void }) {
  const [date, setDate] = useState(localDate)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [review, setReview] = useState<Suggestion | null>(null)
  const [error, setError] = useState('')
  const { data: me } = useMe()
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['dailyBillSuggestions', date],
    queryFn: () => api.get<Suggestion[]>('/billing/suggestions/daily', { params: { service_date: date } }).then(r => r.data),
  })
  const create = useMutation({
    mutationFn: (s: Suggestion) => api.post('/billing/suggestions/daily', null, { params: { patient_id: s.patient_id, service_date: s.service_date } }),
    onSuccess: async () => {
      setReview(null)
      await Promise.all([qc.invalidateQueries({ queryKey: ['invoices'] }), qc.invalidateQueries({ queryKey: ['dailyBillSuggestions'] })])
    },
    onError: e => {
      setError(isAxiosError(e) ? e.response?.data?.detail || 'Unable to generate invoice.' : 'Unable to generate invoice.')
      qc.invalidateQueries({ queryKey: ['dailyBillSuggestions'] })
    },
  })
  const matches = (query.data || []).filter(s => [s.patient_name, s.opd_number, s.patient_id, s.status,
    ...s.items.map(i => i.service_name), ...s.existing_invoices.map(i => String(i.id))].join(' ').toLowerCase().includes(search.trim().toLowerCase()))
  const pages = Math.max(1, Math.ceil(matches.length / pageSize))
  const current = Math.min(page, pages)
  const visible = matches.slice((current - 1) * pageSize, current * pageSize)
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4" aria-label="Daily bill suggestions">
    <div><h2 className="font-bold text-slate-900">Bill Suggestions</h2><p className="text-xs text-slate-500 mt-1">One suggestion per patient per day. Consultation and lab charges are checked against existing bills.</p></div>
    <div className="flex flex-wrap gap-3">
      <label className="text-xs font-medium text-slate-600">Service date<input type="date" value={date} onChange={e => { if (e.target.value) { setDate(e.target.value); setPage(1) } }} className="block mt-1 rounded-lg border border-slate-200 p-2 text-sm" /></label>
      <label className="flex-1 min-w-48 text-xs font-medium text-slate-600">Search suggestions<input type="search" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Patient, OPD number, service, bill number or status" className="block w-full mt-1 rounded-lg border border-slate-200 p-2 text-sm" /></label>
    </div>
    {query.isLoading ? <p role="status">Loading bill suggestions…</p> : query.isError ? <p role="alert">Unable to load suggestions. <button className="underline" onClick={() => query.refetch()}>Retry</button></p> : <>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{['Patient', 'Services used', 'Existing bills', 'Suggested amount', 'Status', ''].map((h, i) => <th scope="col" key={i} className="p-3">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{visible.map(s => <tr key={s.patient_id}>
          <td className="p-3 font-medium">{s.patient_name}<div className="text-xs text-slate-500 font-normal">OPD: {s.opd_number || '—'}</div></td>
          <td className="p-3">{s.items.map(i => i.service_name).join(', ')}</td>
          <td className="p-3">{s.existing_invoices.length ? s.existing_invoices.map(i => <button key={i.id} onClick={() => onViewInvoice(i.id)} className="block text-blue-700 underline">#{i.id} · {i.status} · ₹{i.amount.toFixed(2)}</button>) : 'None'}</td>
          <td className="p-3 whitespace-nowrap font-semibold">₹{s.total_amount.toFixed(2)}{s.needs_review && <div className="text-xs font-normal text-amber-700">Verify charges</div>}</td>
          <td className="p-3 text-xs">{s.status}</td>
          <td className="p-3"><button disabled={!s.unbilled_items.length} onClick={() => { setReview(s); setError('') }} className="whitespace-nowrap text-blue-700 font-medium disabled:text-slate-400">Review suggestion</button></td>
        </tr>)}{!visible.length && <tr><td colSpan={6} className="p-6 text-center text-slate-500">{query.data?.length ? 'No suggestions match your search.' : 'No consultation or lab services recorded for this day.'}</td></tr>}</tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span aria-live="polite">{matches.length} suggestions · Page {current} of {pages}</span>
        <div className="flex items-center gap-3"><label>Rows <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }} className="rounded border p-1">{[10, 25, 50].map(n => <option key={n}>{n}</option>)}</select></label><button disabled={current === 1} onClick={() => setPage(current - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button><button disabled={current === pages} onClick={() => setPage(current + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button></div>
      </div>
    </>}
    {review && <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-labelledby="suggestion-title" className="w-full max-w-lg max-h-[85vh] overflow-auto rounded-2xl bg-white p-6 space-y-4">
      <h3 id="suggestion-title" className="font-bold">{review.patient_name} · {review.service_date}</h3>
      <p className="text-sm text-slate-500">Only the following unbilled services will be included. Existing bills are checked again before saving.</p>
      {review.unbilled_items.map((i, index) => <div key={index} className="flex justify-between gap-4 text-sm"><span>{i.service_name}</span><span>{i.price_missing ? 'Price missing' : `₹${i.unit_price.toFixed(2)}`}</span></div>)}
      <p className="font-bold">Total: ₹{review.total_amount.toFixed(2)}</p>
      {review.needs_review && <p className="text-sm text-amber-800">Check missing prices, invoices without line items, or package tests billed individually before generating a bill.</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3"><button disabled={create.isPending} onClick={() => setReview(null)}>Close</button>{can(me, 'manage_billing') && <button disabled={create.isPending || review.needs_review} onClick={() => create.mutate(review)} className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-40">{create.isPending ? 'Generating…' : 'Generate bill'}</button>}</div>
    </div></div>}
  </section>
}
