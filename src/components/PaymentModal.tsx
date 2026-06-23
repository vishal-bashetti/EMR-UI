import { useState } from 'react'
import { Icons } from './Icons'

export function PaymentModal({
  invoiceId, onClose, onSave
}: {
  invoiceId: number
  onClose: () => void
  onSave: (data: { status: string; payment_mode: string; transaction_id: string }) => void
}) {
  const [mode, setMode] = useState('Cash')
  const [txn, setTxn] = useState('')
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={e => e.stopPropagation()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-900">Payment Details</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition-colors">
            {Icons.x}
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mode of Payment *</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={mode}
              onChange={e => setMode(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="UPI">UPI</option>
              <option value="Insurance">Insurance</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Transaction ID / Cheque No (Optional)</label>
            <input
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={txn}
              onChange={e => setTxn(e.target.value)}
              placeholder="e.g. TXN123456789"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium">Cancel</button>
            <button onClick={() => onSave({ status: 'Paid', payment_mode: mode, transaction_id: txn })} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl">Confirm Payment</button>
          </div>
        </div>
      </div>
    </div>
  )
}
