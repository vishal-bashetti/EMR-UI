import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { usePatient } from '../hooks/usePatients'
import { useVitalConfigs, useCreateVisit } from '../hooks/useVisits'
import { useLabCatalog } from '../hooks/useLabResults'
import { useDrugs } from '../hooks/useDrugs'
import { getLastVisit } from '../api/visits'
import { Icons } from '../components/Icons'

const inputCls = 'w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow'
const smallInputCls = 'border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white'

function SectionCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function AddRowButton({ onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 mt-3"
    >
      {Icons.plus} {label}
    </button>
  )
}

export default function NewVisitPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const patientId = Number(searchParams.get('patient_id'))
  const doctorId = Number(searchParams.get('doctor_id'))
  const appointmentId = searchParams.get('appointment_id') ? Number(searchParams.get('appointment_id')) : null

  const { data: patient } = usePatient(patientId)
  const { data: vitalConfigs } = useVitalConfigs()
  const { data: labCatalog } = useLabCatalog()
  const createVisit = useCreateVisit()

  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [quickNotes, setQuickNotes] = useState('')
  const [advice, setAdvice] = useState('')
  const [vitals, setVitals] = useState({})
  const [complaints, setComplaints] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [treatments, setTreatments] = useState([])
  const [selectedLabs, setSelectedLabs] = useState([])
  const [prescriptions, setPrescriptions] = useState([])

  const [carryStatus, setCarryStatus] = useState(null) // null | 'loading' | 'loaded' | 'none' | 'error'

  const handleCarryForward = async () => {
    setCarryStatus('loading')
    try {
      const data = await getLastVisit(patientId)
      const enc = data.encounter
      setReason(enc.reason || '')
      setNotes(enc.notes || '')
      setQuickNotes(enc.quick_notes || '')
      setAdvice(enc.advice || '')
      setVitals(
        data.vitals.reduce((acc, v) => ({ ...acc, [v.vital_config_id]: v.value || '' }), {})
      )
      setComplaints(data.complaints.map(c => ({ complaint: c.complaint, from_date: c.from_date || '', duration: c.duration || '' })))
      setDiagnoses(data.diagnoses.map(d => ({ diagnosis: d.diagnosis, date: d.date || '' })))
      setTreatments(data.treatments.map(t => ({ treatment: t.treatment, due_date: t.due_date || '' })))
      setCarryStatus('loaded')
    } catch (e) {
      setCarryStatus(e?.response?.status === 404 ? 'none' : 'error')
    }
  }

  const [drugSearch, setDrugSearch] = useState('')
  const [showDrugDropdown, setShowDrugDropdown] = useState(false)
  const drugSearchRef = useRef(null)
  const { data: drugResults } = useDrugs(drugSearch)

  useEffect(() => {
    const handler = (e) => {
      if (drugSearchRef.current && !drugSearchRef.current.contains(e.target)) {
        setShowDrugDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addComplaint = () => setComplaints(c => [...c, { complaint: '', from_date: '', duration: '' }])
  const removeComplaint = (i) => setComplaints(c => c.filter((_, j) => j !== i))
  const updateComplaint = (i, field, val) =>
    setComplaints(c => c.map((item, j) => j === i ? { ...item, [field]: val } : item))

  const addDiagnosis = () => setDiagnoses(d => [...d, { diagnosis: '', date: '' }])
  const removeDiagnosis = (i) => setDiagnoses(d => d.filter((_, j) => j !== i))
  const updateDiagnosis = (i, field, val) =>
    setDiagnoses(d => d.map((item, j) => j === i ? { ...item, [field]: val } : item))

  const addTreatment = () => setTreatments(t => [...t, { treatment: '', due_date: '' }])
  const removeTreatment = (i) => setTreatments(t => t.filter((_, j) => j !== i))
  const updateTreatment = (i, field, val) =>
    setTreatments(t => t.map((item, j) => j === i ? { ...item, [field]: val } : item))

  const toggleLab = (id) =>
    setSelectedLabs(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])

  const addDrug = (drug) => {
    setPrescriptions(p => [
      ...p,
      { molecule: drug.name, morning: '', afternoon: '', evening: '', night: '', when: '', details: '' },
    ])
    setDrugSearch('')
    setShowDrugDropdown(false)
  }
  const removePrescription = (i) => setPrescriptions(p => p.filter((_, j) => j !== i))
  const updatePrescription = (i, field, val) =>
    setPrescriptions(p => p.map((item, j) => j === i ? { ...item, [field]: val } : item))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_id: appointmentId,
      reason: reason || null,
      notes: notes || null,
      quick_notes: quickNotes || null,
      advice: advice || null,
      vitals: Object.entries(vitals)
        .filter(([, v]) => v !== '')
        .map(([id, value]) => ({ vital_config_id: Number(id), value })),
      complaints: complaints.filter(c => c.complaint.trim()),
      diagnoses: diagnoses.filter(d => d.diagnosis.trim()),
      treatments: treatments.filter(t => t.treatment.trim()),
      lab_test_catalogs: selectedLabs,
      prescriptions: prescriptions.filter(p => p.molecule.trim()),
    }
    try {
      await createVisit.mutateAsync(payload)
      navigate(`/patients/${patientId}`)
    } catch {
      // error displayed inline
    }
  }

  if (!patientId || !doctorId) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-slate-400">
        <p className="text-sm">Missing patient or doctor information.</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-blue-600 text-sm">Go back</button>
      </div>
    )
  }

  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : '…'

  return (
    <div className="p-8 max-w-4xl pb-16">
      {/* Header */}
      <div className="mb-7">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-3 transition-colors"
        >
          {Icons.arrowLeft} Back
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Record Visit</h1>
            {patient && (
              <p className="text-sm text-slate-400 mt-0.5">
                {patientName} &middot; {patient.dob} &middot; {patient.gender}
                {patient.blood_group && ` · ${patient.blood_group}`}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={handleCarryForward}
              disabled={carryStatus === 'loading'}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 hover:border-blue-400 hover:text-blue-600 rounded-xl transition-all bg-white disabled:opacity-60"
            >
              {carryStatus === 'loading' ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                </svg>
              ) : Icons.arrowLeft}
              Load Last Visit
            </button>
            {carryStatus === 'loaded' && (
              <p className="text-xs text-emerald-600 font-medium">Previous visit loaded</p>
            )}
            {carryStatus === 'none' && (
              <p className="text-xs text-slate-400">No previous visits found</p>
            )}
            {carryStatus === 'error' && (
              <p className="text-xs text-red-500">Could not load last visit</p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Visit Overview */}
        <SectionCard title="Visit Overview" icon={Icons.stethoscope}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Reason for Visit
              </label>
              <input
                className={inputCls}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Chief reason for this visit…"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
              <textarea
                className={`${inputCls} min-h-[80px] resize-y`}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Clinical history, observations…"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quick Notes</label>
              <textarea
                className={`${inputCls} min-h-[70px] resize-y`}
                value={quickNotes}
                onChange={e => setQuickNotes(e.target.value)}
                placeholder="Brief summary for quick reference…"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Advice</label>
              <textarea
                className={`${inputCls} min-h-[70px] resize-y`}
                value={advice}
                onChange={e => setAdvice(e.target.value)}
                placeholder="Diet, activity, follow-up instructions…"
              />
            </div>
          </div>
        </SectionCard>

        {/* Vitals */}
        {vitalConfigs?.length > 0 && (
          <SectionCard title="Vitals" icon={Icons.heartbeat}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {vitalConfigs.map(vc => (
                <div key={vc.id}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    {vc.name}
                  </label>
                  <input
                    className={inputCls}
                    type={vc.data_type === 'number' ? 'number' : 'text'}
                    value={vitals[vc.id] || ''}
                    onChange={e => setVitals(v => ({ ...v, [vc.id]: e.target.value }))}
                    placeholder={vc.name}
                    step={vc.data_type === 'number' ? 'any' : undefined}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Complaints */}
        <SectionCard title="Chief Complaints" icon={Icons.clipboard}>
          {complaints.length > 0 && (
            <div className="mb-1 space-y-2">
              <div className="grid grid-cols-[1fr_140px_120px_24px] gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Complaint</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">From Date</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Duration</span>
                <span />
              </div>
              {complaints.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_140px_120px_24px] gap-2 items-center">
                  <input
                    className={`${smallInputCls} w-full`}
                    value={c.complaint}
                    onChange={e => updateComplaint(i, 'complaint', e.target.value)}
                    placeholder="e.g. Headache"
                  />
                  <input
                    className={`${smallInputCls} w-full`}
                    type="date"
                    value={c.from_date}
                    onChange={e => updateComplaint(i, 'from_date', e.target.value)}
                  />
                  <input
                    className={`${smallInputCls} w-full`}
                    value={c.duration}
                    onChange={e => updateComplaint(i, 'duration', e.target.value)}
                    placeholder="e.g. 3 days"
                  />
                  <button
                    type="button"
                    onClick={() => removeComplaint(i)}
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
                    {Icons.x}
                  </button>
                </div>
              ))}
            </div>
          )}
          {complaints.length === 0 && (
            <p className="text-sm text-slate-400 mb-1">No complaints added yet.</p>
          )}
          <AddRowButton onClick={addComplaint} label="Add Complaint" />
        </SectionCard>

        {/* Diagnoses */}
        <SectionCard title="Diagnoses" icon={Icons.diagnosis}>
          {diagnoses.length > 0 && (
            <div className="mb-1 space-y-2">
              <div className="grid grid-cols-[1fr_160px_24px] gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Diagnosis</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</span>
                <span />
              </div>
              {diagnoses.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_160px_24px] gap-2 items-center">
                  <input
                    className={`${smallInputCls} w-full`}
                    value={d.diagnosis}
                    onChange={e => updateDiagnosis(i, 'diagnosis', e.target.value)}
                    placeholder="e.g. Hypertension"
                  />
                  <input
                    className={`${smallInputCls} w-full`}
                    type="date"
                    value={d.date}
                    onChange={e => updateDiagnosis(i, 'date', e.target.value)}
                  />
                  <button type="button" onClick={() => removeDiagnosis(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                    {Icons.x}
                  </button>
                </div>
              ))}
            </div>
          )}
          {diagnoses.length === 0 && <p className="text-sm text-slate-400 mb-1">No diagnoses added yet.</p>}
          <AddRowButton onClick={addDiagnosis} label="Add Diagnosis" />
        </SectionCard>

        {/* Treatments */}
        <SectionCard title="Treatments" icon={Icons.treatment}>
          {treatments.length > 0 && (
            <div className="mb-1 space-y-2">
              <div className="grid grid-cols-[1fr_160px_24px] gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Treatment</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Due Date</span>
                <span />
              </div>
              {treatments.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_160px_24px] gap-2 items-center">
                  <input
                    className={`${smallInputCls} w-full`}
                    value={t.treatment}
                    onChange={e => updateTreatment(i, 'treatment', e.target.value)}
                    placeholder="e.g. Physical therapy"
                  />
                  <input
                    className={`${smallInputCls} w-full`}
                    type="date"
                    value={t.due_date}
                    onChange={e => updateTreatment(i, 'due_date', e.target.value)}
                  />
                  <button type="button" onClick={() => removeTreatment(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                    {Icons.x}
                  </button>
                </div>
              ))}
            </div>
          )}
          {treatments.length === 0 && <p className="text-sm text-slate-400 mb-1">No treatments added yet.</p>}
          <AddRowButton onClick={addTreatment} label="Add Treatment" />
        </SectionCard>

        {/* Lab Orders */}
        <SectionCard title="Lab Orders" icon={Icons.flask}>
          {labCatalog?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {labCatalog.map(item => (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedLabs.includes(item.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedLabs.includes(item.id)}
                    onChange={() => toggleLab(item.id)}
                    className="w-4 h-4 text-blue-600 rounded accent-blue-600"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                    {item.price > 0 && (
                      <p className="text-xs text-slate-400">₹{item.price.toFixed(2)}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No lab tests in catalog.</p>
          )}
        </SectionCard>

        {/* Prescriptions */}
        <SectionCard title="Prescriptions" icon={Icons.pill}>
          <div ref={drugSearchRef} className="relative mb-4">
            <input
              className={inputCls}
              value={drugSearch}
              onChange={e => { setDrugSearch(e.target.value); setShowDrugDropdown(true) }}
              onFocus={() => drugSearch.length >= 1 && setShowDrugDropdown(true)}
              placeholder="Search drug by name or generic name…"
            />
            {showDrugDropdown && drugResults?.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto">
                {drugResults.map(drug => (
                  <button
                    key={drug.id}
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between gap-4 border-b border-slate-50 last:border-0"
                    onClick={() => addDrug(drug)}
                  >
                    <div>
                      <span className="font-medium text-slate-800">{drug.name}</span>
                      {drug.generic_name && (
                        <span className="text-slate-400 ml-2 text-xs">{drug.generic_name}</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {[drug.form, drug.strength].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {showDrugDropdown && drugSearch.length >= 1 && drugResults?.length === 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl px-4 py-3 text-sm text-slate-400">
                No drugs found for "{drugSearch}"
              </div>
            )}
          </div>

          {prescriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Drug', 'Morning', 'Afternoon', 'Evening', 'Night', 'When', 'Details', ''].map(h => (
                      <th key={h} className="text-left py-2 px-2 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {prescriptions.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 font-medium text-slate-800 whitespace-nowrap">{p.molecule}</td>
                      {['morning', 'afternoon', 'evening', 'night'].map(field => (
                        <td key={field} className="py-2 px-1">
                          <input
                            className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            value={p[field]}
                            onChange={e => updatePrescription(i, field, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="py-2 px-1">
                        <select
                          className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          value={p.when}
                          onChange={e => updatePrescription(i, 'when', e.target.value)}
                        >
                          <option value="">—</option>
                          <option>Before food</option>
                          <option>After food</option>
                          <option>With food</option>
                          <option>At bedtime</option>
                          <option>SOS</option>
                        </select>
                      </td>
                      <td className="py-2 px-1">
                        <input
                          className="w-36 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          value={p.details}
                          onChange={e => updatePrescription(i, 'details', e.target.value)}
                          placeholder="Additional details…"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <button
                          type="button"
                          onClick={() => removePrescription(i)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          {Icons.x}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-3">
              Search and select drugs above to add to the prescription.
            </p>
          )}
        </SectionCard>

        {/* Error */}
        {createVisit.isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            Failed to save visit. Please check your inputs and try again.
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createVisit.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            {createVisit.isPending ? 'Saving…' : 'Save Visit'}
          </button>
        </div>
      </form>
    </div>
  )
}
