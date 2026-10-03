import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addHistoryImmunization, addHistoryMedication } from '../api/clinicalHistory'
import { localDate } from '../utils/workflow'

export function ClinicalHistoryEntry({ patientId, kind }: { patientId: number; kind: 'medication' | 'immunization' }) {
  const [open, setOpen] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>({})
  const qc = useQueryClient()
  const mutation = useMutation({ mutationFn: () => kind === 'medication'
    ? addHistoryMedication(patientId, { drug_name: fields.name.trim(), dosage: fields.dosage || '', frequency: fields.frequency || '', route: fields.route || '', status: 'Active' })
    : addHistoryImmunization(patientId, { vaccine_name: fields.name.trim(), administered_date: fields.date, lot_number: fields.lot || '', site: fields.site || '', notes: fields.notes || '' }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['clinicalHistory', patientId] }); setFields({}); setOpen(false) },
  })
  const edit = (key: string, label: string, required = false, type = 'text') => <label key={key} className="text-xs text-slate-600">{label}<input type={type} required={required} max={type === 'date' ? localDate() : undefined} value={fields[key] || ''} onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 p-2 text-sm" /></label>
  return <div className="mt-3">
    {!open ? <button onClick={() => { mutation.reset(); setOpen(true) }} className="text-sm font-medium text-emerald-800">+ {kind === 'medication' ? 'Add medication history' : 'Record immunization'}</button>
      : <form onSubmit={e => { e.preventDefault(); mutation.mutate() }} className="rounded-lg bg-slate-50 p-3 space-y-3">
        <p className="text-xs text-slate-500">{kind === 'medication' ? 'Record a medication the patient reports taking.' : 'Record a vaccine already administered to this patient.'}</p>
        <fieldset disabled={mutation.isPending} className="grid grid-cols-1 sm:grid-cols-2 gap-3">{edit('name', kind === 'medication' ? 'Medicine name' : 'Vaccine name', true)}
          {kind === 'medication' ? <>{edit('dosage', 'Dosage')}{edit('frequency', 'Frequency')}{edit('route', 'Route')}</> : <>{edit('date', 'Administered date', true, 'date')}{edit('lot', 'Lot number')}{edit('site', 'Site')}{edit('notes', 'Notes')}</>}
        </fieldset>
        {mutation.isError && <p role="alert" className="text-xs text-red-700">Could not save this record. Please try again.</p>}
        <div className="flex gap-3 text-sm"><button disabled={mutation.isPending || !fields.name?.trim()} className="rounded-lg bg-emerald-700 px-3 py-2 text-white disabled:opacity-40">{mutation.isPending ? 'Saving…' : 'Save record'}</button><button type="button" disabled={mutation.isPending} onClick={() => setOpen(false)}>Cancel</button></div>
      </form>}
  </div>
}
