import { useState, useRef, useEffect } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { usePatient } from '../hooks/usePatients'
import { useVitalConfigs, useCreateVisit, useUpdateVisit } from '../hooks/useVisits'
import { useAppointmentStatuses } from '../hooks/useAppointments'
import { useLabCatalog, useLatestLabResults } from '../hooks/useLabResults'
import { useDrugs, useCreateDrug } from '../hooks/useDrugs'
import { getLastVisit } from '../api/visits'
import { Icons } from '../components/Icons'
import type { Drug, PrescriptionInput, VisitPayload } from '../types'

const inputCls = 'w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow'
const smallInputCls = 'border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white'

interface ComplaintRow { complaint: string; from_date: string; duration: string }
interface DiagnosisRow { diagnosis: string; date: string }
interface TreatmentRow { treatment: string; due_date: string }

type CarryStatus = 'loading' | 'loaded' | 'none' | 'error' | null

function SectionCard({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-slate-300">
      <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 via-slate-50/30 to-white flex items-center gap-3">
        {icon && (
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white shadow-sm border border-slate-100/80 text-blue-600">
            {icon}
          </div>
        )}
        <h3 className="text-[13px] font-extrabold text-slate-800 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
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
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const patientId = Number(searchParams.get('patient_id'))
  const doctorId = Number(searchParams.get('doctor_id'))
  const appointmentId = searchParams.get('appointment_id') ? Number(searchParams.get('appointment_id')) : null

  const { data: patient } = usePatient(patientId)
  const { data: vitalConfigs } = useVitalConfigs()
  const { data: statuses } = useAppointmentStatuses()
  const { data: lastLabReports } = useLatestLabResults(patientId)
  const createVisit = useCreateVisit()
  const updateVisit = useUpdateVisit()
  const createDrug = useCreateDrug()

  const [editingEncounterId, setEditingEncounterId] = useState<number | null>(null)
  const [status, setStatus] = useState<string>('Open')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [quickNotes, setQuickNotes] = useState('')
  const [advice, setAdvice] = useState('')
  const [vitals, setVitals] = useState<Record<number, string>>({})
  const [complaints, setComplaints] = useState<ComplaintRow[]>([])
  const [diagnoses, setDiagnoses] = useState<DiagnosisRow[]>([])
  const [treatments, setTreatments] = useState<TreatmentRow[]>([])
  const [selectedLabItems, setSelectedLabItems] = useState<any[]>([])
  const [prescriptions, setPrescriptions] = useState<PrescriptionInput[]>([])

  const [carryStatus, setCarryStatus] = useState<CarryStatus>(null)

  const handleCarryForward = async () => {
    setCarryStatus('loading')
    try {
      const data = await getLastVisit(patientId)
      const enc = data.encounter
      
      if (enc.status !== 'Completed') {
        setEditingEncounterId(enc.id)
      } else {
        setEditingEncounterId(null)
      }

      setStatus(enc.status || 'Open')
      setReason(enc.reason || '')
      setNotes(enc.notes || '')
      setQuickNotes(enc.quick_notes || '')
      setAdvice(enc.advice || '')
      setVitals(
        data.vitals.reduce<Record<number, string>>((acc, v) => ({ ...acc, [v.vital_config_id]: v.value || '' }), {})
      )
      setComplaints(data.complaints.map((c) => ({ complaint: c.complaint, from_date: c.from_date || '', duration: c.duration || '' })))
      setDiagnoses(data.diagnoses.map((d) => ({ diagnosis: d.diagnosis, date: d.date || '' })))
      setTreatments(data.treatments.map((t) => ({ treatment: t.treatment, due_date: t.due_date || '' })))
      setPrescriptions(data.prescriptions || [])
      setCarryStatus('loaded')
    } catch (e) {
      setCarryStatus(isAxiosError(e) && e.response?.status === 404 ? 'none' : 'error')
    }
  }

  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      handleCarryForward()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [drugSearch, setDrugSearch] = useState('')
  const [showDrugDropdown, setShowDrugDropdown] = useState(false)
  const drugSearchRef = useRef<HTMLDivElement>(null)
  const { data: drugResults } = useDrugs(drugSearch)

  const [labSearch, setLabSearch] = useState('')
  const [showLabDropdown, setShowLabDropdown] = useState(false)
  const [showLastLabReport, setShowLastLabReport] = useState(false)
  const labSearchRef = useRef<HTMLDivElement>(null)
  const { data: labCatalog } = useLabCatalog(labSearch)

  const lastComputedVitals = useRef<Record<number, string>>({});

  // Compute vitals with formulas
  useEffect(() => {
    if (!vitalConfigs) return;
    
    let updated = false;
    const newVitals = { ...vitals };
    
    vitalConfigs.forEach(vc => {
      if (vc.data_type === 'computed' && vc.formula) {
        let expression = vc.formula;
        // Replace variable names with actual values
        vitalConfigs.forEach(innerVc => {
           if (innerVc.data_type !== 'computed') {
              const val = parseFloat(newVitals[innerVc.id] || '0') || 0;
              const regex = new RegExp(innerVc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
              expression = expression.replace(regex, val.toString());
           }
        });
        
        try {
          const result = new Function(`return ${expression}`)();
          const computedValue = (isNaN(result) || !isFinite(result) || result === 0) ? '' : result.toFixed(2);
          
          if (computedValue !== lastComputedVitals.current[vc.id]) {
            newVitals[vc.id] = computedValue;
            lastComputedVitals.current[vc.id] = computedValue;
            updated = true;
          }
        } catch {
          // ignore error, keep existing value
        }
      }
    });

    if (updated) {
      setVitals(newVitals);
    }
  }, [vitals, vitalConfigs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (drugSearchRef.current && !drugSearchRef.current.contains(e.target as Node)) {
        setShowDrugDropdown(false)
      }
      if (labSearchRef.current && !labSearchRef.current.contains(e.target as Node)) {
        setShowLabDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addComplaint = () => setComplaints((c) => [...c, { complaint: '', from_date: '', duration: '' }])
  const removeComplaint = (i: number) => setComplaints((c) => c.filter((_, j) => j !== i))
  const updateComplaint = (i: number, field: keyof ComplaintRow, val: string) =>
    setComplaints((c) => c.map((item, j) => (j === i ? { ...item, [field]: val } : item)))

  const addDiagnosis = () => setDiagnoses((d) => [...d, { diagnosis: '', date: '' }])
  const removeDiagnosis = (i: number) => setDiagnoses((d) => d.filter((_, j) => j !== i))
  const updateDiagnosis = (i: number, field: keyof DiagnosisRow, val: string) =>
    setDiagnoses((d) => d.map((item, j) => (j === i ? { ...item, [field]: val } : item)))

  const addTreatment = () => setTreatments((t) => [...t, { treatment: '', due_date: '' }])
  const removeTreatment = (i: number) => setTreatments((t) => t.filter((_, j) => j !== i))
  const updateTreatment = (i: number, field: keyof TreatmentRow, val: string) =>
    setTreatments((t) => t.map((item, j) => (j === i ? { ...item, [field]: val } : item)))

  const addLabItem = (item: any) => {
    if (!selectedLabItems.find((l) => l.id === item.id)) {
      setSelectedLabItems((prev) => [...prev, item])
    }
    setLabSearch('')
    setShowLabDropdown(false)
  }
  const removeLabItem = (id: number) => setSelectedLabItems((l) => l.filter((x) => x.id !== id))

  const addDrug = (drugName: string) => {
    setPrescriptions((p) => [
      ...p,
      { name: drugName, morning: '', afternoon: '', evening: '', night: '', when: '', details: '' },
    ])
    setDrugSearch('')
    setShowDrugDropdown(false)
  }

  const handleCreateAndAddDrug = async (drugName: string) => {
    try {
      await createDrug.mutateAsync({ name: drugName, is_active: true })
      addDrug(drugName)
    } catch {
      alert('Failed to create drug.')
    }
  }

  const handleSaveDrugToCatalog = async (drugName: string) => {
    if (window.confirm(`Do you want to save "${drugName}" to the drug catalog for future use?`)) {
      try {
        await createDrug.mutateAsync({ name: drugName, is_active: true })
        alert('Saved to catalog!')
      } catch {
        alert('Failed to save drug to catalog.')
      }
    }
  }
  const removePrescription = (i: number) => setPrescriptions((p) => p.filter((_, j) => j !== i))
  const updatePrescription = (i: number, field: keyof PrescriptionInput, val: string) =>
    setPrescriptions((p) => p.map((item, j) => (j === i ? { ...item, [field]: val } : item)))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const payload: VisitPayload = {
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_id: appointmentId,
      status: status,
      reason: reason || null,
      notes: notes || null,
      quick_notes: quickNotes || null,
      advice: advice || null,
      vitals: Object.entries(vitals)
        .filter(([, v]) => v !== '')
        .map(([id, value]) => ({ vital_config_id: Number(id), value })),
      complaints: complaints.filter((c) => c.complaint.trim()),
      diagnoses: diagnoses.filter((d) => d.diagnosis.trim()),
      treatments: treatments.filter((t) => t.treatment.trim()),
      lab_test_catalogs: selectedLabItems.map((l) => l.id),
      prescriptions: prescriptions.filter((p) => p.name.trim()),
    }
    try {
      if (editingEncounterId) {
        await updateVisit.mutateAsync({ id: editingEncounterId, data: payload })
      } else {
        await createVisit.mutateAsync(payload)
      }
      navigate(`/patients/${patientId}`)
    } catch {
      // error displayed inline
    }
  }

  if (!patientId || !doctorId) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-slate-400">
        <p className="text-sm">{t('visit.missingInfo')}</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-blue-600 text-sm">{t('visit.goBack')}</button>
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
          {Icons.arrowLeft} {t('common.back')}
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('visit.recordVisit')}</h1>
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
              {t('visit.loadLastVisit')}
            </button>
            {carryStatus === 'loaded' && (
              <p className="text-xs text-emerald-600 font-medium">{t('visit.previousLoaded')}</p>
            )}
            {carryStatus === 'none' && (
              <p className="text-xs text-slate-400">{t('visit.noPrevious')}</p>
            )}
            {carryStatus === 'error' && (
              <p className="text-xs text-red-500">{t('visit.couldNotLoadLast')}</p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Visit Overview */}
        <SectionCard title={t('visit.overview')} icon={Icons.stethoscope}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Visit Status
              </label>
              <select
                className={inputCls}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {statuses?.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {t('visit.reason')}
              </label>
              <input
                className={inputCls}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('visit.reasonPlaceholder')}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('visit.notes')}</label>
              <textarea
                className={`${inputCls} min-h-[80px] resize-y`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('visit.notesPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('visit.quickNotes')}</label>
              <textarea
                className={`${inputCls} min-h-[70px] resize-y`}
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder={t('visit.quickNotesPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('visit.advice')}</label>
              <textarea
                className={`${inputCls} min-h-[70px] resize-y`}
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder={t('visit.advicePlaceholder')}
              />
            </div>
          </div>
        </SectionCard>

        {/* Vitals */}
        {vitalConfigs && vitalConfigs.length > 0 && (
          <SectionCard title={t('visit.vitals')} icon={Icons.heartbeat}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {vitalConfigs.map((vc) => (
                <div key={vc.id}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>{vc.name}</span>
                    {vc.data_type === 'computed' && <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">Auto</span>}
                  </label>
                  <input
                    className={inputCls}
                    type={['float', 'integer', 'number'].includes(vc.data_type) ? 'number' : 'text'}
                    value={vitals[vc.id] || ''}
                    onChange={(e) => setVitals((v) => ({ ...v, [vc.id]: e.target.value }))}
                    placeholder={vc.name}
                    step={vc.data_type === 'float' ? 'any' : undefined}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Complaints */}
        <SectionCard title={t('visit.complaints')} icon={Icons.clipboard}>
          {complaints.length > 0 && (
            <div className="mb-1 space-y-2">
              <div className="grid grid-cols-[1fr_140px_120px_24px] gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('visit.complaint')}</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('visit.fromDate')}</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('visit.duration')}</span>
                <span />
              </div>
              {complaints.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_140px_120px_24px] gap-2 items-center">
                  <input
                    className={`${smallInputCls} w-full`}
                    value={c.complaint}
                    onChange={(e) => updateComplaint(i, 'complaint', e.target.value)}
                    placeholder={t('visit.complaintPlaceholder')}
                  />
                  <input
                    className={`${smallInputCls} w-full`}
                    type="date"
                    value={c.from_date}
                    onChange={(e) => updateComplaint(i, 'from_date', e.target.value)}
                  />
                  <input
                    className={`${smallInputCls} w-full`}
                    value={c.duration}
                    onChange={(e) => updateComplaint(i, 'duration', e.target.value)}
                    placeholder={t('visit.durationPlaceholder')}
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
            <p className="text-sm text-slate-400 mb-1">{t('visit.noComplaints')}</p>
          )}
          <AddRowButton onClick={addComplaint} label={t('visit.addComplaint')} />
        </SectionCard>

        {/* Diagnoses */}
        <SectionCard title={t('visit.diagnoses')} icon={Icons.diagnosis}>
          {diagnoses.length > 0 && (
            <div className="mb-1 space-y-2">
              <div className="grid grid-cols-[1fr_160px_24px] gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('visit.diagnosis')}</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('visit.date')}</span>
                <span />
              </div>
              {diagnoses.map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_160px_24px] gap-2 items-center">
                  <input
                    className={`${smallInputCls} w-full`}
                    value={d.diagnosis}
                    onChange={(e) => updateDiagnosis(i, 'diagnosis', e.target.value)}
                    placeholder={t('visit.diagnosisPlaceholder')}
                  />
                  <input
                    className={`${smallInputCls} w-full`}
                    type="date"
                    value={d.date}
                    onChange={(e) => updateDiagnosis(i, 'date', e.target.value)}
                  />
                  <button type="button" onClick={() => removeDiagnosis(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                    {Icons.x}
                  </button>
                </div>
              ))}
            </div>
          )}
          {diagnoses.length === 0 && <p className="text-sm text-slate-400 mb-1">{t('visit.noDiagnoses')}</p>}
          <AddRowButton onClick={addDiagnosis} label={t('visit.addDiagnosis')} />
        </SectionCard>

        {/* Treatments */}
        <SectionCard title={t('visit.treatments')} icon={Icons.treatment}>
          {treatments.length > 0 && (
            <div className="mb-1 space-y-2">
              <div className="grid grid-cols-[1fr_160px_24px] gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('visit.treatment')}</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('visit.dueDate')}</span>
                <span />
              </div>
              {treatments.map((tr, i) => (
                <div key={i} className="grid grid-cols-[1fr_160px_24px] gap-2 items-center">
                  <input
                    className={`${smallInputCls} w-full`}
                    value={tr.treatment}
                    onChange={(e) => updateTreatment(i, 'treatment', e.target.value)}
                    placeholder={t('visit.treatmentPlaceholder')}
                  />
                  <input
                    className={`${smallInputCls} w-full`}
                    type="date"
                    value={tr.due_date}
                    onChange={(e) => updateTreatment(i, 'due_date', e.target.value)}
                  />
                  <button type="button" onClick={() => removeTreatment(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                    {Icons.x}
                  </button>
                </div>
              ))}
            </div>
          )}
          {treatments.length === 0 && <p className="text-sm text-slate-400 mb-1">{t('visit.noTreatments')}</p>}
          <AddRowButton onClick={addTreatment} label={t('visit.addTreatment')} />
        </SectionCard>

        {/* Lab Orders */}
        <SectionCard title="Lab Orders" icon={Icons.flask}>
          {lastLabReports && lastLabReports.length > 0 && (
            <div className="mb-4 bg-emerald-50 rounded-xl border border-emerald-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowLastLabReport(!showLastLabReport)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-emerald-800 hover:bg-emerald-100/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-200 text-emerald-800 rounded-full p-1">{Icons.flask}</span>
                  Latest Lab Report ({new Date(lastLabReports[0].ordered_date).toLocaleDateString()}) - {lastLabReports.length} test{lastLabReports.length > 1 ? 's' : ''}
                </div>
                <span className={`transform transition-transform ${showLastLabReport ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {showLastLabReport && (
                <div className="p-4 border-t border-emerald-100 bg-white m-2 rounded-lg text-sm text-slate-700 space-y-4">
                  {lastLabReports.map((report) => (
                    <div key={report.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-slate-900">{report.test_name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700`}>
                          {report.status}
                        </span>
                      </div>
                      <p className="mb-1"><span className="font-medium">Result:</span> {report.result_value || 'Pending'} {report.unit || ''}</p>
                      {report.reference_range && <p className="mb-1"><span className="font-medium">Reference:</span> {report.reference_range}</p>}
                      {report.notes && <p><span className="font-medium">Notes:</span> {report.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div ref={labSearchRef} className="relative mb-4">
            <input
              className={inputCls}
              value={labSearch}
              onChange={(e) => { setLabSearch(e.target.value); setShowLabDropdown(true) }}
              onFocus={() => labSearch.length >= 1 && setShowLabDropdown(true)}
              placeholder="Search lab tests…"
            />
            {showLabDropdown && labCatalog && labCatalog.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto">
                {labCatalog.map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between gap-4 border-b border-slate-50 last:border-0"
                    onClick={() => addLabItem(item)}
                  >
                    <span className="font-medium text-slate-800">{item.name}</span>
                    {item.price > 0 && <span className="text-xs text-slate-400">₹{item.price.toFixed(2)}</span>}
                  </button>
                ))}
              </div>
            )}
            {showLabDropdown && labSearch.length >= 1 && labCatalog?.length === 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl px-4 py-3 text-sm text-slate-400">
                No lab tests found for "{labSearch}"
              </div>
            )}
          </div>

          {selectedLabItems.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedLabItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 text-sm font-medium">
                  {item.name}
                  <button type="button" onClick={() => removeLabItem(item.id)} className="text-blue-400 hover:text-blue-600">
                    {Icons.x}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No lab tests selected.</p>
          )}
        </SectionCard>

        {/* Prescriptions */}
        <SectionCard title={t('visit.prescriptions')} icon={Icons.pill}>
          <div ref={drugSearchRef} className="relative mb-4">
            <input
              className={inputCls}
              value={drugSearch}
              onChange={(e) => { setDrugSearch(e.target.value); setShowDrugDropdown(true) }}
              onFocus={() => drugSearch.length >= 1 && setShowDrugDropdown(true)}
              placeholder={t('visit.drugSearchPlaceholder')}
            />
            {showDrugDropdown && drugResults && drugResults.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-52 overflow-y-auto">
                {drugResults.map((drug) => (
                  <button
                    key={drug.id}
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center justify-between gap-4 border-b border-slate-50 last:border-0"
                    onClick={() => addDrug(drug.name)}
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
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl px-4 py-3 text-sm flex items-center justify-between">
                <span className="text-slate-500">No drugs found for "{drugSearch}"</span>
                <button 
                  type="button" 
                  onClick={() => handleCreateAndAddDrug(drugSearch)}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                >
                  Create & Add
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Drug', 'Morning', 'Afternoon', 'Evening', 'Night', 'When', 'Details', ''].map((h) => (
                    <th key={h} className="text-left py-2 px-2 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {prescriptions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      Search and select drugs above to add to the prescription.
                    </td>
                  </tr>
                ) : (
                  prescriptions.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2 whitespace-nowrap group">
                        <div className="flex items-center gap-1">
                          <input
                            className="w-32 border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            value={p.name}
                            onChange={(e) => updatePrescription(i, 'name', e.target.value)}
                          />
                          <button
                            type="button"
                            title="Save to Catalog"
                            onClick={() => handleSaveDrugToCatalog(p.name)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-600 transition-all p-1"
                          >
                            {Icons.plus}
                          </button>
                        </div>
                      </td>
                      {(['morning', 'afternoon', 'evening', 'night'] as const).map((field) => (
                        <td key={field} className="py-2 px-1">
                          <input
                            className="w-14 border border-slate-200 rounded-lg px-2 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                            value={p[field]}
                            onChange={(e) => updatePrescription(i, field, e.target.value)}
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="py-2 px-1">
                        <select
                          className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          value={p.when}
                          onChange={(e) => updatePrescription(i, 'when', e.target.value)}
                        >
                          <option value="">{t('common.dash')}</option>
                          <option value="Before food">{t('visit.whenBeforeFood')}</option>
                          <option value="After food">{t('visit.whenAfterFood')}</option>
                          <option value="With food">{t('visit.whenWithFood')}</option>
                          <option value="At bedtime">{t('visit.whenAtBedtime')}</option>
                          <option value="SOS">{t('visit.whenSos')}</option>
                        </select>
                      </td>
                      <td className="py-2 px-1">
                        <input
                          className="w-36 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                          value={p.details}
                          onChange={(e) => updatePrescription(i, 'details', e.target.value)}
                          placeholder={t('visit.detailsPlaceholder')}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Error */}
        {createVisit.isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {t('visit.failedSave')}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={createVisit.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
          >
            {createVisit.isPending ? t('common.saving') : t('visit.saveVisit')}
          </button>
        </div>
      </form>
    </div>
  )
}
