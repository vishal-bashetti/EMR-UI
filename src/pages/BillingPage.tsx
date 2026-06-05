import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useInvoices, useUpdateInvoiceStatus, useDeleteInvoice, useCreateInvoice, useUpdateInvoice } from '../hooks/useBilling'
import { usePatients } from '../hooks/usePatients'
import { useAppointments } from '../hooks/useAppointments'
import { suggestBill } from '../api/billing'
import { Icons } from '../components/Icons'
import { ItemAutocomplete } from '../components/ItemAutocomplete'
import { InvoiceModal } from '../components/InvoiceModal'
import type { Invoice, InvoiceInput, Patient } from '../types'

const inputCls = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white'
const smallInputCls = 'border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white'

interface ItemRow {
  service_name: string
  quantity: number | string
  unit_price: number | string
}

interface InvoiceFormState {
  patient_id: string
  appointment_id: string
  items: ItemRow[]
}

const EMPTY_INVOICE: InvoiceFormState = {
  patient_id: '',
  appointment_id: '',
  items: [{ service_name: '', quantity: 1, unit_price: '' }],
}

// ─── Patient initials avatar ──────────────────────────────────────────────────

function PatientChip({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const colors = [
    'from-blue-500 to-blue-600',
    'from-violet-500 to-violet-600',
    'from-emerald-500 to-emerald-600',
    'from-rose-500 to-rose-600',
    'from-amber-500 to-amber-600',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
        {initials}
      </div>
      <span className="text-sm text-slate-700 font-medium truncate">{name}</span>
    </div>
  )
}

// ─── Status badge (click-to-change overlay) ───────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Cancelled: 'bg-red-50 text-red-600 ring-1 ring-red-200',
}

function StatusBadge({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const { t } = useTranslation()
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-500'
  return (
    <div className="relative group w-fit">
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer select-none ${cls}`}>
        {status}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 opacity-50"><polyline points="6 9 12 15 18 9"/></svg>
      </span>
      <select
        value={status}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
      >
        <option value="Pending">{t('status.pending')}</option>
        <option value="Paid">{t('status.paid')}</option>
        <option value="Cancelled">{t('status.cancelled')}</option>
      </select>
    </div>
  )
}

// ─── Invoice row ──────────────────────────────────────────────────────────────

function InvoiceRow({
  inv, expanded, patientName, onToggle, onStatusChange, onEdit, onDelete,
}: {
  inv: Invoice
  expanded: boolean
  patientName: string
  onToggle: () => void
  onStatusChange: (s: string) => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <tr
        className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
        onClick={onToggle}
      >
        {/* Invoice # */}
        <td className="px-4 py-3 pl-6">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
            <span className="text-sm font-bold text-slate-800">#{inv.id}</span>
          </div>
        </td>

        {/* Patient */}
        <td className="px-4 py-3">
          <PatientChip name={patientName} />
        </td>

        {/* Amount */}
        <td className="px-4 py-3">
          <span className="text-sm font-semibold text-slate-800">₹{inv.amount.toFixed(2)}</span>
        </td>

        {/* Status */}
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <StatusBadge status={inv.status} onChange={onStatusChange} />
        </td>

        {/* Items count */}
        <td className="px-4 py-3">
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            {t('billing.itemCount', { count: inv.items.length })}
          </span>
        </td>

        {/* Actions */}
        <td className="px-4 py-3 pr-6 text-right" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {inv.status === 'Pending' && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                title="Edit invoice"
              >
                {Icons.edit} Edit
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title={t('billing.deleteInvoice')}
            >
              {Icons.trash}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded line items */}
      {expanded && (
        <tr>
          <td colSpan={6} className="px-6 pb-3 pt-0">
            <div className="ml-5 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
              {inv.items?.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-2 font-semibold text-slate-400 uppercase tracking-wide">Service</th>
                      <th className="text-center px-4 py-2 font-semibold text-slate-400 uppercase tracking-wide">Qty</th>
                      <th className="text-right px-4 py-2 font-semibold text-slate-400 uppercase tracking-wide">Unit Price</th>
                      <th className="text-right px-4 py-2 font-semibold text-slate-400 uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {inv.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 font-medium text-slate-700">{item.service_name}</td>
                        <td className="px-4 py-2 text-center text-slate-500">{item.quantity}</td>
                        <td className="px-4 py-2 text-right text-slate-500">₹{item.unit_price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-800">₹{(item.quantity * item.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-100/60">
                      <td colSpan={3} className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</td>
                      <td className="px-4 py-2 text-right text-sm font-bold text-slate-800">₹{inv.amount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="px-4 py-3 text-xs text-slate-400 italic">No line items recorded.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { t } = useTranslation()
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Invoice | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowCreate(true)
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('new')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  const [startDate, setStartDate] = useState(`${y}-${m}-01`)
  const [endDate, setEndDate] = useState(`${y}-${m}-${lastDay}`)

  const formattedStart = startDate ? `${startDate}T00:00:00` : undefined
  const formattedEnd = endDate ? `${endDate}T23:59:59` : undefined
  const { data: invoices, isLoading } = useInvoices(undefined, formattedStart, formattedEnd)
  const { data: patients } = usePatients()
  const updateStatus = useUpdateInvoiceStatus()
  const remove = useDeleteInvoice()
  const create = useCreateInvoice()
  const update = useUpdateInvoice()

  const patientMap: Record<number, string> =
    patients?.reduce((acc, p) => { acc[p.id] = `${p.first_name} ${p.last_name}`; return acc }, {} as Record<number, string>) ?? {}

  const displayed = filterStatus ? invoices?.filter(i => i.status === filterStatus) : invoices

  const totals = {
    all: invoices?.length ?? 0,
    Pending: invoices?.filter(i => i.status === 'Pending').length ?? 0,
    Paid: invoices?.filter(i => i.status === 'Paid').length ?? 0,
    Cancelled: invoices?.filter(i => i.status === 'Cancelled').length ?? 0,
  }
  const totalRevenue = invoices?.filter(i => i.status === 'Paid').reduce((s, i) => s + (i.amount ?? 0), 0) ?? 0
  const pendingAmount = invoices?.filter(i => i.status === 'Pending').reduce((s, i) => s + (i.amount ?? 0), 0) ?? 0

  const filterTabs: [string, string, number][] = [
    ['', t('billing.filterAll'), totals.all],
    ['Pending', t('status.pending'), totals.Pending],
    ['Paid', t('status.paid'), totals.Paid],
    ['Cancelled', t('status.cancelled'), totals.Cancelled],
  ]

  return (
    <div className="min-h-full bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t('billing.title')}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{t('billing.totalInvoices', { count: totals.all })}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm shadow-blue-200"
        >
          {Icons.plus} {t('billing.createInvoice')}
        </button>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: t('billing.filterAll'), value: totals.all, sub: 'invoices this period', cls: 'text-slate-800', bg: 'bg-white', border: 'border-slate-200' },
            { label: t('billing.collectedRevenue'), value: `₹${totalRevenue.toFixed(0)}`, sub: t('billing.paidInvoices', { count: totals.Paid }), cls: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: t('billing.outstanding'), value: `₹${pendingAmount.toFixed(0)}`, sub: t('billing.pendingInvoices', { count: totals.Pending }), cls: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
            { label: t('billing.cancelled'), value: totals.Cancelled, sub: t('billing.invoicesCancelled'), cls: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' },
          ].map(card => (
            <div key={card.label} className={`${card.bg} border ${card.border} rounded-xl px-4 py-3 shadow-sm`}>
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p className={`text-xl font-bold mt-1 ${card.cls}`}>{card.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Filter bar + date range */}
        <div className="flex items-center justify-between gap-4">
          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {filterTabs.map(([val, label, count]) => (
              <button
                key={val}
                onClick={() => setFilterStatus(val)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === val ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${
                  filterStatus === val ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-slate-400 shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="text-sm text-slate-700 bg-transparent focus:outline-none w-32"
            />
            <span className="text-slate-300 text-sm">–</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="text-sm text-slate-700 bg-transparent focus:outline-none w-32"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate('') }}
                className="ml-1 p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                title="Clear dates"
              >
                {Icons.x}
              </button>
            )}
          </div>
        </div>

        {/* Invoices table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {[t('billing.colInvoice'), t('billing.colPatient'), t('billing.colAmount'), t('settings.colStatus'), t('billing.colItems'), ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed?.map(inv => (
                  <InvoiceRow
                    key={inv.id}
                    inv={inv}
                    expanded={expandedId === inv.id}
                    patientName={patientMap[inv.patient_id] || t('billing.patientNum', { id: inv.patient_id })}
                    onToggle={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                    onStatusChange={status => updateStatus.mutate({ id: inv.id, status })}
                    onEdit={() => setEditingInvoice(inv)}
                    onDelete={() => setConfirmDelete(inv)}
                  />
                ))}
                {displayed?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                          {Icons.billing}
                        </div>
                        <p className="text-sm font-medium text-slate-500">{t('billing.noInvoices')}</p>
                        <p className="text-xs">{t('billing.noInvoicesSub')}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      {(showCreate || editingInvoice) && (
        <InvoiceModal
          patients={patients}
          invoice={editingInvoice || undefined}
          onClose={() => { setShowCreate(false); setEditingInvoice(null) }}
          onSave={async data => {
            if (editingInvoice) {
              await update.mutateAsync({ id: editingInvoice.id, data })
            } else {
              await create.mutateAsync(data)
            }
            setShowCreate(false)
            setEditingInvoice(null)
          }}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center mb-4 text-red-500">
              {Icons.trash}
            </div>
            <h3 className="text-base font-bold text-slate-900">{t('billing.deleteTitle')}</h3>
            <p className="text-sm text-slate-500 mt-1 mb-5">
              {t('billing.deleteConfirmPre')}{' '}
              <span className="font-semibold text-slate-700">#{confirmDelete.id}</span>{' '}
              {t('billing.deleteConfirmPost')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => { remove.mutate(confirmDelete.id); setConfirmDelete(null) }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
