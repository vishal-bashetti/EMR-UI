import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { usePatient } from '../hooks/usePatients'
import { useVisitHistory } from '../hooks/useVisits'
import { useLabResults, useUpdateLabResult } from '../hooks/useLabResults'
import { useInvoices, useUpdateInvoiceStatus } from '../hooks/useBilling'
import { useMe } from '../hooks/useUsers'
import { Icons } from '../components/Icons'

const STATUS_LAB = {
  Pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Cancelled: 'bg-red-50 text-red-600 ring-1 ring-red-200',
}

const STATUS_INV = {
  Pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Cancelled: 'bg-red-50 text-red-600 ring-1 ring-red-200',
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  )
}

function LabResultUpdateModal({ lab, onClose, onSave }) {
  const [form, setForm] = useState({
    test_name: lab.test_name,
    result_value: lab.result_value || '',
    unit: lab.unit || '',
    reference_range: lab.reference_range || '',
    status: lab.status,
    notes: lab.notes || '',
    patient_id: lab.patient_id,
    encounter_id: lab.encounter_id,
    catalog_id: lab.catalog_id,
    cost: lab.cost,
    ordered_by: lab.ordered_by,
  })

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Update Lab Result</h2>
            <p className="text-xs text-slate-400 mt-0.5">{lab.test_name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            {Icons.x}
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Result Value</label>
              <input
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.result_value}
                onChange={e => setForm(f => ({ ...f, result_value: e.target.value }))}
                placeholder="e.g. 5.2"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Unit</label>
              <input
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="e.g. mg/dL"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reference Range</label>
            <input
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={form.reference_range}
              onChange={e => setForm(f => ({ ...f, reference_range: e.target.value }))}
              placeholder="e.g. 3.5–5.0"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
            <select
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              <option>Pending</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none min-h-[60px]"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes…"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button
              onClick={() => onSave(form)}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function VisitCard({ visit }) {
  const { encounter, vitals, complaints, diagnoses, treatments } = visit
  const dt = new Date(encounter.encounter_date)
  return (
    <div className="border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-slate-800">
            Visit #{encounter.visit_number}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &middot;{' '}
            {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          encounter.status === 'Open' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {encounter.status}
        </span>
      </div>
      {encounter.reason && (
        <p className="text-sm text-slate-600 mb-3 italic">"{encounter.reason}"</p>
      )}
      <div className="grid grid-cols-3 gap-3 mt-3">
        {vitals.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{Icons.heartbeat} Vitals</p>
            <div className="space-y-1">
              {vitals.map(v => (
                <p key={v.id} className="text-xs text-slate-600">
                  <span className="text-slate-400">—</span> {v.value}
                </p>
              ))}
            </div>
          </div>
        )}
        {complaints.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Complaints</p>
            <div className="space-y-1">
              {complaints.map(c => (
                <p key={c.id} className="text-xs text-slate-600">{c.complaint}</p>
              ))}
            </div>
          </div>
        )}
        {diagnoses.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Diagnoses</p>
            <div className="space-y-1">
              {diagnoses.map(d => (
                <p key={d.id} className="text-xs text-slate-600">{d.diagnosis}</p>
              ))}
            </div>
          </div>
        )}
      </div>
      {treatments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Treatments</p>
          <div className="flex flex-wrap gap-2">
            {treatments.map(t => (
              <span key={t.id} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                {t.treatment}
              </span>
            ))}
          </div>
        </div>
      )}
      {encounter.advice && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Advice</p>
          <p className="text-xs text-slate-600">{encounter.advice}</p>
        </div>
      )}
    </div>
  )
}

const TABS = ['Visit History', 'Lab Results', 'Billing']

export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const patientId = Number(id)
  const [activeTab, setActiveTab] = useState('Visit History')
  const [editingLab, setEditingLab] = useState(null)

  const { data: patient, isLoading: loadingPatient } = usePatient(patientId)
  const { data: visitHistory, isLoading: loadingVisits } = useVisitHistory(patientId, 20)
  const { data: labResults, isLoading: loadingLabs } = useLabResults(patientId)
  const { data: invoices, isLoading: loadingInvoices } = useInvoices(patientId)
  const { data: me } = useMe()
  const updateLab = useUpdateLabResult()
  const updateInvoiceStatus = useUpdateInvoiceStatus()

  const handleLabSave = async (form) => {
    await updateLab.mutateAsync({ id: editingLab.id, data: form })
    setEditingLab(null)
  }

  if (loadingPatient) return <Spinner />

  if (!patient) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-sm">Patient not found.</p>
        <button onClick={() => navigate('/patients')} className="mt-3 text-blue-600 text-sm">
          Back to Patients
        </button>
      </div>
    )
  }

  const patientName = `${patient.first_name} ${patient.last_name}`
  const age = patient.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div className="p-8 max-w-5xl">
      {/* Back */}
      <button
        onClick={() => navigate('/patients')}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-5 transition-colors"
      >
        {Icons.arrowLeft} Back to Patients
      </button>

      {/* Patient Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center text-white text-lg font-bold">
              {patientName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{patientName}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                {age !== null && <span>{age} yrs</span>}
                <span>{patient.gender}</span>
                {patient.blood_group && (
                  <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-bold">
                    {patient.blood_group}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                <span>{patient.contact_number}</span>
                {patient.email && <span>{patient.email}</span>}
              </div>
            </div>
          </div>
          <Link
            to={`/visits/new?patient_id=${patientId}&doctor_id=${me?.id || ''}`}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            {Icons.plus} New Visit
          </Link>
        </div>

        {patient.address && (
          <p className="text-xs text-slate-400 mt-4 border-t border-slate-100 pt-3">{patient.address}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Visit History Tab */}
      {activeTab === 'Visit History' && (
        <div>
          {loadingVisits ? (
            <Spinner />
          ) : visitHistory?.length > 0 ? (
            <div className="space-y-4">
              {visitHistory.map((visit, i) => (
                <VisitCard key={i} visit={visit} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
              {Icons.stethoscope}
              <p className="text-sm font-medium mt-3">No visits recorded yet</p>
              <p className="text-xs mt-1">Click "New Visit" to record the first visit.</p>
            </div>
          )}
        </div>
      )}

      {/* Lab Results Tab */}
      {activeTab === 'Lab Results' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loadingLabs ? (
            <Spinner />
          ) : labResults?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Test', 'Status', 'Result', 'Unit', 'Ref Range', 'Ordered', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {labResults.map(lab => (
                  <tr key={lab.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="px-5 py-4 pl-6 font-medium text-slate-800">{lab.test_name}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_LAB[lab.status] || 'bg-slate-100 text-slate-500'}`}>
                        {lab.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{lab.result_value || '—'}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{lab.unit || '—'}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{lab.reference_range || '—'}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {new Date(lab.ordered_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 pr-6 text-right">
                      <button
                        onClick={() => setEditingLab(lab)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              {Icons.flask}
              <p className="text-sm font-medium mt-3">No lab results</p>
              <p className="text-xs mt-1">Lab orders from visits will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'Billing' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loadingInvoices ? (
            <Spinner />
          ) : invoices?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Invoice #', 'Amount', 'Status', 'Items', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 pl-6 font-medium text-slate-800">#{inv.id}</td>
                    <td className="px-5 py-4 font-semibold text-slate-800">₹{inv.amount.toFixed(2)}</td>
                    <td className="px-5 py-4">
                      <div className="relative group w-fit">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${STATUS_INV[inv.status] || 'bg-slate-100 text-slate-500'}`}>
                          {inv.status}
                        </span>
                        <select
                          value={inv.status}
                          onChange={e => updateInvoiceStatus.mutate({ id: inv.id, status: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                        >
                          <option>Pending</option>
                          <option>Paid</option>
                          <option>Cancelled</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {inv.items?.length ?? 0} item{inv.items?.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-5 py-4 pr-6">
                      {inv.items?.length > 0 && (
                        <div className="text-xs text-slate-400">
                          {inv.items.map(item => (
                            <span key={item.id} className="block">{item.service_name}</span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              {Icons.billing}
              <p className="text-sm font-medium mt-3">No invoices</p>
              <p className="text-xs mt-1">Invoices are auto-generated when lab tests are completed.</p>
            </div>
          )}
        </div>
      )}

      {/* Lab Update Modal */}
      {editingLab && (
        <LabResultUpdateModal
          lab={editingLab}
          onClose={() => setEditingLab(null)}
          onSave={handleLabSave}
        />
      )}
    </div>
  )
}
