import { useQuery } from '@tanstack/react-query'
import { getAllergies, getImmunizations, getMedications, getProblems, getHistoryPrescriptions } from '../api/clinicalHistory'
import { ClinicalHistoryEntry } from './ClinicalHistoryEntry'
import { useMe } from '../hooks/useUsers'
import { can } from '../utils/workflow'

function HistorySection({ title, loading, error, empty, children, action }: {
  title: string
  loading: boolean
  error: boolean
  empty: boolean
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
    {loading ? <p className="mt-3 text-sm text-slate-500">Loading…</p>
      : error ? <p role="alert" className="mt-3 text-sm text-red-700">Could not load this section.</p>
      : empty ? <p className="mt-3 text-sm text-slate-500">No records documented. Review with the patient.</p>
      : <div className="mt-3 divide-y divide-slate-100">{children}</div>}
    {action}
  </section>
}

export function ClinicalHistory({ patientId }: { patientId: number }) {
  const { data: me } = useMe()
  const prescriptions = useQuery({ queryKey: ['historyPrescriptions', patientId], queryFn: () => getHistoryPrescriptions(patientId) })
  const allergies = useQuery({ queryKey: ['clinicalHistory', patientId, 'allergies'], queryFn: () => getAllergies(patientId) })
  const problems = useQuery({ queryKey: ['clinicalHistory', patientId, 'problems'], queryFn: () => getProblems(patientId) })
  const medications = useQuery({ queryKey: ['clinicalHistory', patientId, 'medications'], queryFn: () => getMedications(patientId) })
  const immunizations = useQuery({ queryKey: ['clinicalHistory', patientId, 'immunizations'], queryFn: () => getImmunizations(patientId) })
  const activeAllergies = allergies.data?.filter(item => item.status === 'Active') ?? []
  const activeProblems = problems.data?.filter(item => item.status !== 'Resolved') ?? []
  const activeMedications = medications.data?.filter(item => item.status === 'Active') ?? []

  return <div className="space-y-4" aria-label="Clinical history">
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {allergies.isLoading ? 'Checking allergy records…'
        : allergies.isError ? 'Allergy records could not be loaded. Confirm directly with the patient.'
        : activeAllergies.length ? `${activeAllergies.length} active allergy record${activeAllergies.length === 1 ? '' : 's'}. Review before prescribing.`
        : 'Allergy status has not been explicitly reviewed. No recorded allergy does not mean no known allergies.'}
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <HistorySection title="Allergies" loading={allergies.isLoading} error={allergies.isError} empty={!allergies.data?.length}>
        {allergies.data?.map(item => <div key={item.id} className="py-3">
          <div className="flex justify-between gap-3"><strong className="text-sm text-slate-900">{item.allergen}</strong><span className="text-xs text-slate-500">{item.status} · {item.severity}</span></div>
          {item.reaction && <p className="text-sm text-slate-600">Reaction: {item.reaction}</p>}
        </div>)}
      </HistorySection>
      <HistorySection title="Medical problems" loading={problems.isLoading} error={problems.isError} empty={!problems.data?.length}>
        {problems.data?.map(item => <div key={item.id} className="py-3">
          <div className="flex justify-between gap-3"><strong className="text-sm text-slate-900">{item.title}</strong><span className="text-xs text-slate-500">{item.status}</span></div>
          {(item.icd_code || item.onset_date) && <p className="text-xs text-slate-500">{[item.icd_code, item.onset_date].filter(Boolean).join(' · ')}</p>}
        </div>)}
        {activeProblems.length === 0 && <p className="text-xs text-slate-500">No active problem is recorded.</p>}
      </HistorySection>
      <HistorySection title="Medication history" loading={medications.isLoading} error={medications.isError} empty={!medications.data?.length} action={can(me, 'manage_clinical') && <ClinicalHistoryEntry key={`medication-${patientId}`} patientId={patientId} kind="medication" />}>
        {medications.data?.map(item => <div key={item.id} className="py-3">
          <div className="flex justify-between gap-3"><strong className="text-sm text-slate-900">{item.drug_name}</strong><span className="text-xs text-slate-500">{item.status}</span></div>
          <p className="text-sm text-slate-600">{[item.dosage, item.route, item.frequency].filter(Boolean).join(' · ')}</p>
        </div>)}
        {activeMedications.length === 0 && <p className="text-xs text-slate-500">No active medication is recorded.</p>}
      </HistorySection>
      <HistorySection title="Immunizations" loading={immunizations.isLoading} error={immunizations.isError} empty={!immunizations.data?.length} action={can(me, 'manage_clinical') && <ClinicalHistoryEntry key={`immunization-${patientId}`} patientId={patientId} kind="immunization" />}>
        {immunizations.data?.map(item => <div key={item.id} className="py-3 flex justify-between gap-3">
          <strong className="text-sm text-slate-900">{item.vaccine_name}</strong>
          <span className="text-xs text-slate-500">{item.administered_date}</span>
        </div>)}
      </HistorySection>
      <div className="xl:col-span-2"><HistorySection title="Consultation prescriptions" loading={prescriptions.isLoading} error={prescriptions.isError} empty={!prescriptions.data?.some(p => p.items.length)}>
        <p className="pb-3 text-xs text-slate-500">Prescription history from consultations. Confirm current use with the patient.</p>
        {[...(prescriptions.data || [])].sort((a, b) => b.date_prescribed.localeCompare(a.date_prescribed) || b.id - a.id).filter(p => p.items.length).map(p => <div key={p.id} className="py-3">
          <div className="mb-2 text-xs font-semibold text-slate-500">{new Date(p.date_prescribed).toLocaleDateString('en-GB')} · Prescription #{p.id}{p.status && ` · ${p.status}`}</div>
          {p.items.map(item => <div key={item.id} className="py-2"><strong className="text-sm text-slate-900">{item.molecule || item.name || 'Unnamed medicine'}</strong>
            <p className="text-sm text-slate-600">{[['Morning', item.morning], ['Afternoon', item.afternoon], ['Evening', item.evening], ['Night', item.night]].filter(([, value]) => value && value !== '0').map(([label, value]) => `${label}: ${value}`).join(' · ')}</p>
            {(item.when || item.details) && <p className="text-xs text-slate-500">{[item.when, item.details].filter(Boolean).join(' · ')}</p>}
          </div>)}
        </div>)}
      </HistorySection></div>
    </div>
  </div>
}
