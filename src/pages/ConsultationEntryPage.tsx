import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import ConsultationsPage from './ConsultationsPage'

const NewVisitPage = lazy(() => import('./NewVisitPage'))

export default function ConsultationEntryPage() {
  const [params] = useSearchParams()
  return params.has('patient_id')
    ? <Suspense fallback={<div role="status" className="p-8 text-slate-500">Loading consultation…</div>}><NewVisitPage /></Suspense>
    : <ConsultationsPage />
}
