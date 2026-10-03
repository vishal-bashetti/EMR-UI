import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getMedications, getProblems } from '../api/clinicalHistory'

export function ConsultationContext({ patientId }: { patientId: number }) {
  const problems = useQuery({ queryKey: ['clinicalHistory', patientId, 'problems'], queryFn: () => getProblems(patientId) })
  const medications = useQuery({ queryKey: ['clinicalHistory', patientId, 'medications'], queryFn: () => getMedications(patientId) })
  const activeProblems = problems.data?.filter(item => item.status !== 'Resolved') ?? []
  const activeMedications = medications.data?.filter(item => item.status === 'Active') ?? []

  return <div aria-label="Patient context" className="space-y-4">
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Patient context</h2>
        <Link to={`/patients/${patientId}`} className="text-xs font-medium text-primary-700 hover:underline">Full chart</Link>
      </div>
      <p className="mt-1 text-xs text-slate-500">Review current records before completing the plan.</p>
    </div>
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Active problems</h3>
      {problems.isLoading ? <p className="mt-2 text-xs text-slate-500">Loading…</p>
        : problems.isError ? <p role="alert" className="mt-2 text-xs text-red-700">Could not load problems.</p>
        : activeProblems.length ? <ul className="mt-2 space-y-2">{activeProblems.slice(0, 6).map(item =>
          <li key={item.id} className="text-sm text-slate-700">{item.title}</li>)}</ul>
        : <p className="mt-2 text-xs text-slate-500">No active problems recorded.</p>}
    </section>
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Current medications</h3>
      {medications.isLoading ? <p className="mt-2 text-xs text-slate-500">Loading…</p>
        : medications.isError ? <p role="alert" className="mt-2 text-xs text-red-700">Could not load medications.</p>
        : activeMedications.length ? <ul className="mt-2 space-y-2">{activeMedications.slice(0, 6).map(item =>
          <li key={item.id} className="text-sm text-slate-700">
            <span className="font-medium">{item.drug_name}</span>
            {item.dosage && <span className="block text-xs text-slate-500">{item.dosage}</span>}
          </li>)}</ul>
        : <p className="mt-2 text-xs text-slate-500">No current medications recorded.</p>}
    </section>
  </div>
}
