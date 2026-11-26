import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePatients } from '../hooks/usePatients'
import { useMe } from '../hooks/useUsers'
import { can } from '../utils/workflow'

export function ConsultationPatientPicker() {
  const { data: me, isPending: userPending } = useMe()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const allowed = can(me, 'manage_clinical') && can(me, 'view_patients')
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])
  const patients = usePatients(query || undefined, { enabled: allowed })

  if (userPending) return <p role="status" className="p-6">Loading your permissions…</p>
  if (!allowed) return <p role="alert" className="p-6">You do not have permission to start consultations.</p>
  return <section className="workspace-page space-y-5">
    <div>
      <h1 className="workspace-heading">New Consultation</h1>
      <p className="mt-2 text-sm text-slate-600">Select a patient, then choose an appointment or create a walk-in to start their consultation.</p>
    </div>
    <label className="block text-sm font-medium text-slate-700">Search patients
      <input type="search" className="input mt-2 w-full" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name, OPD number or phone" />
    </label>
    {patients.isPending ? <p role="status">Loading patients…</p>
      : patients.isError ? <div role="alert">Could not load patients. <button type="button" className="underline" onClick={() => patients.refetch()}>Try again</button></div>
      : <ul className="card divide-y divide-slate-100">
        {patients.data?.map(patient => <li key={patient.id} className="flex items-center justify-between gap-4 p-4">
          <div><p className="font-semibold">{patient.first_name} {patient.last_name}</p><p className="text-xs text-slate-500">{patient.opd_number || `Patient #${patient.id}`}</p></div>
          <Link className="btn btn-primary" to={`/visits/new?patient_id=${patient.id}&doctor_id=${me?.id}`} aria-label={`Start consultation for ${patient.first_name} ${patient.last_name}`}>Start Consultation</Link>
        </li>)}
        {patients.data?.length === 0 && <li className="p-6">No patients match your search.{can(me, 'manage_patients') && <Link className="ml-2 underline" to="/patients?action=new">Register a new patient</Link>}</li>}
      </ul>}
    <Link to="/visits/new" className="text-sm underline">Back to daily consultations</Link>
  </section>
}
