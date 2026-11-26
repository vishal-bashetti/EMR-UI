import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import ConsultationsPage from './ConsultationsPage'
import { ConsultationPatientPicker } from '../components/ConsultationPatientPicker'

const NewVisitPage = lazy(() => import('./NewVisitPage'))

export default function ConsultationEntryPage() {
  const [params] = useSearchParams()
  if (!params.has('patient_id') && params.get('action') === 'start') return <ConsultationPatientPicker />
  return params.has('patient_id')
    ? <Suspense fallback={<div role="status" className="p-8 text-slate-500">Loading consultation…</div>}><NewVisitPage /></Suspense>
    : <ConsultationsPage />
}
