import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppointments } from '../hooks/useAppointments'
import { suggestBill } from '../api/billing'
import { Icons } from './Icons'
import { ItemAutocomplete } from './ItemAutocomplete'
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

export function InvoiceModal({ patients, invoice, defaultPatientId, defaultAppointmentId, onClose, onSave }: {
  patients?: Patient[]
  invoice?: Invoice
  defaultPatientId?: number
  defaultAppointmentId?: number
  onClose: () => void
  onSave: (data: InvoiceInput) => Promise<void> | void
}) {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState<InvoiceFormState>(
    invoice ? {
      patient_id: String(invoice.patient_id),
      appointment_id: invoice.appointment_id ? String(invoice.appointment_id) : '',
      items: invoice.items.length
        ? invoice.items.map(i => ({ service_name: i.service_name, quantity: i.quantity, unit_price: i.unit_price }))
        : [{ service_name: '', quantity: 1, unit_price: '' }],
    } : {
      ...EMPTY_INVOICE,
      patient_id: defaultPatientId ? String(defaultPatientId) : searchParams.get('patient_id') || '',
      appointment_id: defaultAppointmentId ? String(defaultAppointmentId) : searchParams.get('appointment_id') || ''
    }
  )
  const [suggesting, setSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState('')

  const validItems = form.items.filter(i => String(i.service_name).trim() !== '')
  const totalAmount = validItems.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.unit_price) || 0), 0)

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { service_name: '', quantity: 1, unit_price: '' }] }))
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) }))
  const updateItem = (i: number, field: keyof ItemRow, val: string) =>
    setForm(f => ({ ...f, items: f.items.map((item, j) => j === i ? { ...item, [field]: val } : item) }))

  const handlePatientChange = (pid: string) => setForm(f => ({ ...f, patient_id: pid, appointment_id: '' }))

  const patientIdNum = form.patient_id ? Number(form.patient_id) : undefined
  const { data: patientAppointments, isFetching: isFetchingAppointments } = useAppointments(patientIdNum ? { patient_id: patientIdNum } : undefined)

  useEffect(() => {
    if (!invoice && form.patient_id && !form.appointment_id && patientAppointments && patientAppointments.length > 0) {
      const latest = [...patientAppointments].sort((a, b) => new Date(b.appointment_time).getTime() - new Date(a.appointment_time).getTime())[0]
      if (latest && !searchParams.get('appointment_id') && !defaultAppointmentId) setForm(f => ({ ...f, appointment_id: String(latest.id) }))
    }
  }, [form.patient_id, patientAppointments, invoice, form.appointment_id, searchParams, defaultAppointmentId])

  const loadSuggestion = async () => {
    const apptId = Number(form.appointment_id)
    if (!apptId) { setSuggestError(t('billing.suggestErrorNoId')); return }
    setSuggesting(true)
    setSuggestError('')
    try {
      const suggestion = await suggestBill(apptId)
      setForm(f => ({
        ...f,
        patient_id: String(suggestion.patient_id),
        items: suggestion.items.length ? suggestion.items : [{ service_name: '', quantity: 1, unit_price: '' }]
      }))
    } catch (e) {
      setSuggestError(t('billing.suggestErrorFailed'))
    } finally {
      setSuggesting(false)
    }
  }

  useEffect(() => {
    if (searchParams.get('auto_suggest') === 'true' && form.appointment_id && !invoice && !suggesting && form.items.length === 1 && form.items[0].service_name === '') {
      loadSuggestion()
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('auto_suggest')
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, form.appointment_id, invoice])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSave({
      patient_id: Number(form.patient_id),
      appointment_id: form.appointment_id ? Number(form.appointment_id) : undefined,
      amount: totalAmount,
      status: invoice ? invoice.status : 'Pending',
      items: form.items
        .filter(i => String(i.service_name).trim())
        .map(i => ({ service_name: i.service_name, quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
    })
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${invoice ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {invoice ? Icons.edit : Icons.plus}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {invoice ? `Edit Invoice #${invoice.id}` : 'Create Invoice'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {invoice
                  ? `Current total ₹${invoice.amount.toFixed(2)} · ${invoice.status}`
                  : 'Add billing items for this patient'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors">
            {Icons.x}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Patient <span className="text-red-400">*</span>
            </label>
            <select required className={inputCls} value={form.patient_id} onChange={e => handlePatientChange(e.target.value)}>
              <option value="">Select patient…</option>
              {patients?.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              {t('billing.appointmentId')} <span className="text-slate-300 font-normal">{t('common.optional')}</span>
            </label>
            <div className="flex gap-2">
              <input
                className={inputCls}
                type={isFetchingAppointments ? 'text' : 'number'}
                value={isFetchingAppointments ? '' : form.appointment_id}
                onChange={e => setForm(f => ({ ...f, appointment_id: e.target.value }))}
                placeholder={isFetchingAppointments ? 'Loading…' : 'e.g. 12'}
                disabled={isFetchingAppointments}
              />
              <button
                type="button"
                onClick={loadSuggestion}
                disabled={suggesting || !form.appointment_id}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 rounded-xl transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.9"/></svg>
                {suggesting ? t('common.loading') : t('billing.suggestItems')}
              </button>
            </div>
            {suggestError && <p className="text-xs text-red-500 mt-1.5">{suggestError}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">{t('billing.lineItems')}</label>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                {Icons.plus} {t('billing.addItem')}
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
              <div className="grid grid-cols-[1fr_56px_88px_24px] gap-2 px-3 py-2 border-b border-slate-100">
                {[t('billing.service'), t('billing.qty'), t('billing.unitPrice'), ''].map((h, i) => (
                  <span key={i} className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-slate-100">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_56px_88px_24px] gap-2 px-3 py-2 items-center">
                    <ItemAutocomplete
                      className={`${smallInputCls} w-full`}
                      value={item.service_name}
                      onChange={val => updateItem(i, 'service_name', val)}
                      onSelect={(name, price) => { updateItem(i, 'service_name', name); updateItem(i, 'unit_price', String(price)) }}
                      placeholder="Service name"
                    />
                    <input className={`${smallInputCls} w-full text-center`} type="number" min="1"
                      value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                    <input className={`${smallInputCls} w-full`} type="number" step="0.01"
                      value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} placeholder="0.00" />
                    {form.items.length > 1 ? (
                      <button type="button" onClick={() => removeItem(i)}
                        className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        {Icons.x}
                      </button>
                    ) : <span />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2.5 bg-blue-50 rounded-xl border border-blue-100">
            <span className="text-sm font-semibold text-blue-700">{t('common.total')}</span>
            <span className="text-lg font-bold text-blue-800">₹{totalAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              {invoice ? 'Save Changes' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
