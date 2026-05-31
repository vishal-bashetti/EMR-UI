import { useState } from 'react'
import { useInvoices, useUpdateInvoiceStatus, useDeleteInvoice, useCreateInvoice } from '../hooks/useBilling'
import { usePatients } from '../hooks/usePatients'
import { Icons } from '../components/Icons'

const inputCls = 'w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white'
const smallInputCls = 'border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white'

const EMPTY_INVOICE = { patient_id: '', appointment_id: '', items: [{ service_name: '', quantity: 1, unit_price: '' }] }

function CreateInvoiceModal({ patients, onClose, onCreate }) {
  const [form, setForm] = useState(EMPTY_INVOICE)

  const totalAmount = form.items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price) || 0), 0)

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { service_name: '', quantity: 1, unit_price: '' }] }))
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))
  const updateItem = (i, field, val) =>
    setForm(f => ({ ...f, items: f.items.map((item, j) => j === i ? { ...item, [field]: val } : item) }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onCreate({
      patient_id: Number(form.patient_id),
      appointment_id: form.appointment_id ? Number(form.appointment_id) : undefined,
      amount: totalAmount,
      status: 'Pending',
      items: form.items
        .filter(i => i.service_name.trim())
        .map(i => ({ service_name: i.service_name, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
    })
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Create Invoice</h2>
            <p className="text-xs text-slate-400 mt-0.5">Add billing items for this patient</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            {Icons.x}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Patient <span className="text-red-400">*</span></label>
              <select required className={inputCls} value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}>
                <option value="">Select patient…</option>
                {patients?.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Appointment ID <span className="text-slate-300">(optional)</span></label>
              <input className={inputCls} type="number" value={form.appointment_id} onChange={e => setForm(f => ({ ...f, appointment_id: e.target.value }))} placeholder="e.g. 12" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Line Items</label>
              <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                {Icons.plus} Add item
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_60px_90px_20px] gap-2 px-1">
                <span className="text-xs text-slate-400">Service</span>
                <span className="text-xs text-slate-400">Qty</span>
                <span className="text-xs text-slate-400">Unit Price</span>
                <span />
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_90px_20px] gap-2 items-center">
                  <input className={`${smallInputCls} w-full`} value={item.service_name} onChange={e => updateItem(i, 'service_name', e.target.value)} placeholder="Service name" />
                  <input className={`${smallInputCls} w-full text-center`} type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                  <input className={`${smallInputCls} w-full`} type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} placeholder="0.00" />
                  {form.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500">{Icons.x}</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-lg font-bold text-slate-800">₹{totalAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancel</button>
            <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Cancelled: 'bg-red-50 text-red-600 ring-1 ring-red-200',
}

function StatusBadge({ status, onChange }) {
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-500'
  return (
    <div className="relative group w-fit">
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${cls}`}>
        {status}
      </span>
      <select
        value={status}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
      >
        <option>Pending</option>
        <option>Paid</option>
        <option>Cancelled</option>
      </select>
    </div>
  )
}

export default function BillingPage() {
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data: invoices, isLoading } = useInvoices()
  const { data: patients } = usePatients()
  const updateStatus = useUpdateInvoiceStatus()
  const remove = useDeleteInvoice()
  const create = useCreateInvoice()

  const patientMap = patients?.reduce((acc, p) => {
    acc[p.id] = `${p.first_name} ${p.last_name}`
    return acc
  }, {}) ?? {}

  const displayed = filterStatus
    ? invoices?.filter(i => i.status === filterStatus)
    : invoices

  const totals = {
    all: invoices?.length ?? 0,
    Pending: invoices?.filter(i => i.status === 'Pending').length ?? 0,
    Paid: invoices?.filter(i => i.status === 'Paid').length ?? 0,
    Cancelled: invoices?.filter(i => i.status === 'Cancelled').length ?? 0,
  }

  const totalRevenue = invoices
    ?.filter(i => i.status === 'Paid')
    .reduce((sum, i) => sum + (i.amount ?? 0), 0) ?? 0

  const pendingAmount = invoices
    ?.filter(i => i.status === 'Pending')
    .reduce((sum, i) => sum + (i.amount ?? 0), 0) ?? 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="text-sm text-slate-400 mt-0.5">{totals.all} total invoices</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
        >
          {Icons.plus} Create Invoice
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-50 rounded-2xl p-5 border border-white shadow-sm">
          <p className="text-sm font-medium text-slate-500">Collected Revenue</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">₹{totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">{totals.Paid} paid invoices</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-5 border border-white shadow-sm">
          <p className="text-sm font-medium text-slate-500">Outstanding</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">₹{pendingAmount.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">{totals.Pending} pending invoices</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-5 border border-white shadow-sm">
          <p className="text-sm font-medium text-slate-500">Cancelled</p>
          <p className="text-2xl font-bold text-slate-600 mt-1">{totals.Cancelled}</p>
          <p className="text-xs text-slate-400 mt-1">invoices cancelled</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        {[['', 'All', totals.all], ['Pending', 'Pending', totals.Pending], ['Paid', 'Paid', totals.Paid], ['Cancelled', 'Cancelled', totals.Cancelled]].map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => setFilterStatus(val)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterStatus === val
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
              filterStatus === val ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Invoice #', 'Patient', 'Amount', 'Status', 'Items', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed?.map(inv => (
                  <>
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                    >
                      <td className="px-5 py-4 pl-6 font-semibold text-slate-800">#{inv.id}</td>
                      <td className="px-5 py-4 text-slate-700">{patientMap[inv.patient_id] || `Patient #${inv.patient_id}`}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">₹{inv.amount.toFixed(2)}</td>
                      <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                        <StatusBadge
                          status={inv.status}
                          onChange={status => updateStatus.mutate({ id: inv.id, status })}
                        />
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {inv.items?.length ?? 0} item{inv.items?.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-5 py-4 pr-6 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setConfirmDelete(inv)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete invoice"
                        >
                          {Icons.trash}
                        </button>
                      </td>
                    </tr>
                    {expandedId === inv.id && inv.items?.length > 0 && (
                      <tr key={`${inv.id}-expand`}>
                        <td colSpan={6} className="px-8 pb-4 pt-0 bg-slate-50/50">
                          <div className="border-l-2 border-blue-200 pl-4 space-y-1">
                            {inv.items.map(item => (
                              <div key={item.id} className="flex items-center justify-between text-xs text-slate-600">
                                <span>{item.service_name}</span>
                                <span className="text-slate-400">
                                  {item.quantity} &times; ₹{item.unit_price.toFixed(2)} = ₹{(item.quantity * item.unit_price).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                {displayed?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center text-slate-400">
                        {Icons.billing}
                        <p className="text-sm font-medium mt-3">No invoices</p>
                        <p className="text-xs mt-1">Invoices appear here when lab tests are completed.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreate && (
        <CreateInvoiceModal
          patients={patients}
          onClose={() => setShowCreate(false)}
          onCreate={async (data) => {
            await create.mutateAsync(data)
            setShowCreate(false)
          }}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4 text-red-500">
              {Icons.trash}
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Invoice?</h3>
            <p className="text-sm text-slate-500 mt-1 mb-5">
              This will permanently delete invoice{' '}
              <span className="font-medium text-slate-700">#{confirmDelete.id}</span>{' '}
              and all its line items.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { remove.mutate(confirmDelete.id); setConfirmDelete(null) }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
