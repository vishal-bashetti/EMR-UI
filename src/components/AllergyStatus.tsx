import type { AllergyRecord } from '../api/clinicalHistory'

export interface AllergyStatusProps {
  records?: AllergyRecord[]
  isPending?: boolean
  isError?: boolean
}

// The API stores allergy records, but no explicit negative-allergy review.
// An empty list must never be interpreted as confirmed no-known allergies.
export function AllergyStatus({ records, isPending, isError }: AllergyStatusProps) {
  if (isPending) return <span role="status">Checking allergy records…</span>
  if (isError) return <span role="status">Allergy records unavailable. Confirm directly before prescribing.</span>
  const active = records?.filter(record => record.status === 'Active') ?? []
  return <span role="status">{active.length
    ? `Active allergies: ${active.map(record => `${record.allergen} (${record.severity})`).join(', ')}. Review before prescribing.`
    : 'Allergy status has not been explicitly reviewed. Confirm before prescribing.'}</span>
}
