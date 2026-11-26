import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'

type Slot = { start: string; duration: number; capacity: number }
type Schedule = { slots: Slot[] }

export default function PickupScheduleSettings() {
  const client = useQueryClient()
  const [draft, setDraft] = useState<Slot[] | null>(null)
  const schedule = useQuery({
    queryKey: ['pickup-schedule'],
    queryFn: async () => (await api.get<Schedule>('/clinic/pickup-schedule')).data,
  })
  const slots = draft ?? schedule.data?.slots ?? []
  const save = useMutation({
    mutationFn: async (items: Slot[]) => (await api.put<Schedule>('/clinic/pickup-schedule', { slots: items })).data,
    onSuccess: (data) => {
      client.setQueryData(['pickup-schedule'], data)
      setDraft(null)
    },
  })

  if (schedule.isPending) return <p role="status">Loading pickup schedule…</p>
  if (schedule.isError) return <button type="button" onClick={() => void schedule.refetch()}>Retry loading pickup schedule</button>

  const updateSlot = (index: number, changes: Partial<Slot>) =>
    setDraft(slots.map((slot, position) => position === index ? { ...slot, ...changes } : slot))
  const input = 'w-full rounded-md border border-slate-300 px-2 py-1.5'

  return (
    <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
      onSubmit={(event) => { event.preventDefault(); save.mutate(slots) }}>
      <h2 className="font-bold text-slate-900">Home sample pickup slots</h2>
      <p className="text-sm text-slate-600">Slots repeat on clinic working days and use the clinic’s local time.</p>
      <fieldset disabled={save.isPending} className="space-y-3">
        {slots.map((slot, index) => (
          <div key={index} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <label className="text-sm">Start time<input className={input} type="time" required value={slot.start} onChange={e => updateSlot(index, { start: e.target.value })} /></label>
            <label className="text-sm">Minutes<input className={input} type="number" min={5} max={720} required value={slot.duration || ''} onChange={e => updateSlot(index, { duration: Number(e.target.value) })} /></label>
            <label className="text-sm">Max collections<input className={input} type="number" min={1} max={1000} required value={slot.capacity || ''} onChange={e => updateSlot(index, { capacity: Number(e.target.value) })} /></label>
            <button type="button" className="btn btn-secondary" aria-label={`Remove slot ${index + 1}`} onClick={() => setDraft(slots.filter((_, position) => position !== index))}>Remove</button>
          </div>
        ))}
        {slots.length === 0 && <p className="text-sm text-slate-500">Home pickup has no bookable times.</p>}
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary" disabled={slots.length >= 48}
            onClick={() => setDraft([...slots, { start: '', duration: 60, capacity: 1 }])}>Add slot</button>
          <button type="submit" className="btn btn-primary" disabled={!draft || save.isPending}>Save schedule</button>
        </div>
      </fieldset>
      {save.isError && <p role="alert" className="text-sm text-red-700">Could not save. Check that slots have valid times and do not overlap.</p>}
      {save.isSuccess && !draft && <p role="status" className="text-sm text-emerald-700">Schedule saved.</p>}
    </form>
  )
}
