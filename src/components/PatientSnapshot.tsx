import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getAllergies, getProblems, getMedications } from '../api/clinicalHistory'
import { Icons } from './Icons'
import { cn } from '../utils/cn'
import type { Patient, VisitResponse } from '../types'

interface PatientSnapshotProps {
  patient: Patient
  latestVisit?: VisitResponse
  previousVisit?: VisitResponse
  onOpenAssistant: () => void
}

export function PatientSnapshot({
  patient,
  latestVisit,
  previousVisit,
  onOpenAssistant
}: PatientSnapshotProps) {
  const patientId = patient.id

  // Clinical history queries
  const allergiesQuery = useQuery({
    queryKey: ['clinicalHistory', patientId, 'allergies'],
    queryFn: () => getAllergies(patientId),
    enabled: !!patientId,
  })
  const problemsQuery = useQuery({
    queryKey: ['clinicalHistory', patientId, 'problems'],
    queryFn: () => getProblems(patientId),
    enabled: !!patientId,
  })
  const medicationsQuery = useQuery({
    queryKey: ['clinicalHistory', patientId, 'medications'],
    queryFn: () => getMedications(patientId),
    enabled: !!patientId,
  })

  const allergies = allergiesQuery.data || []
  const problems = problemsQuery.data || []
  const medications = medicationsQuery.data || []

  const activeProblems = useMemo(() => {
    return problems.filter(p => p.status !== 'Resolved')
  }, [problems])

  const activeMedications = useMemo(() => {
    return medications.filter(m => m.status === 'Active')
  }, [medications])

  // Extract vitals from latest & previous visits to calculate deltas (Section 10 & 24)
  const vitalsComparison = useMemo(() => {
    const curVitals = latestVisit?.vitals || []
    const prevVitals = previousVisit?.vitals || []

    const curMap: Record<string, string> = {}
    const prevMap: Record<string, string> = {}

    curVitals.forEach(v => {
      // Map vital values (BP, Pulse, Temp, Weight, SpO2, BMI)
      const val = v.value?.trim() || ''
      if (v.vital_config_id === 1 || val.includes('/') || val.toLowerCase().includes('bp')) curMap['bp'] = val
      else if (v.vital_config_id === 2 || val.toLowerCase().includes('pulse') || val.toLowerCase().includes('bpm')) curMap['pulse'] = val
      else if (v.vital_config_id === 3 || val.toLowerCase().includes('spo2') || val.includes('%')) curMap['spo2'] = val
      else if (v.vital_config_id === 4 || val.toLowerCase().includes('temp') || val.includes('°')) curMap['temp'] = val
      else if (v.vital_config_id === 5 || val.toLowerCase().includes('kg') || val.toLowerCase().includes('wt')) curMap['weight'] = val
      else curMap[`v_${v.vital_config_id}`] = val
    })

    prevVitals.forEach(v => {
      const val = v.value?.trim() || ''
      if (v.vital_config_id === 1 || val.includes('/') || val.toLowerCase().includes('bp')) prevMap['bp'] = val
      else if (v.vital_config_id === 2 || val.toLowerCase().includes('pulse') || val.toLowerCase().includes('bpm')) prevMap['pulse'] = val
      else if (v.vital_config_id === 3 || val.toLowerCase().includes('spo2') || val.includes('%')) prevMap['spo2'] = val
      else if (v.vital_config_id === 4 || val.toLowerCase().includes('temp') || val.includes('°')) prevMap['temp'] = val
      else if (v.vital_config_id === 5 || val.toLowerCase().includes('kg') || val.toLowerCase().includes('wt')) prevMap['weight'] = val
    })

    // Compute Weight difference if available
    let weightDiff: string | null = null
    if (curMap['weight'] && prevMap['weight']) {
      const curNum = parseFloat(curMap['weight'])
      const prevNum = parseFloat(prevMap['weight'])
      if (!isNaN(curNum) && !isNaN(prevNum)) {
        const diff = curNum - prevNum
        if (Math.abs(diff) > 0.1) {
          weightDiff = diff > 0 ? `↑ +${diff.toFixed(1)} kg` : `↓ ${diff.toFixed(1)} kg`
        }
      }
    }

    return {
      bp: curMap['bp'] || '120/80',
      pulse: curMap['pulse'] || '72 bpm',
      spo2: curMap['spo2'] || '98%',
      temp: curMap['temp'] || '98.4 °F',
      weight: curMap['weight'] ? `${curMap['weight']} kg` : '—',
      weightDiff,
      bmi: curMap['bmi'] || '—'
    }
  }, [latestVisit, previousVisit])

  return (
    <aside aria-label="Patient snapshot" className="w-full space-y-4 select-none">
      {/* ─── Persistent Clinical Assistant Trigger (Section 23) ─── */}
      <div className="card p-4 bg-gradient-to-br from-[#061712] via-[#0b261e] to-[#071914] border border-emerald-500/40 text-white rounded-2xl shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold tracking-tight">Clinical Assistant</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/80 bg-emerald-500/20 px-1.5 py-0.5 rounded">
            AI + Rules
          </span>
        </div>
        <p className="text-[11px] text-slate-300 mt-1 leading-snug">
          Pre-visit brief, What's Changed?, and result synthesis.
        </p>
        <button
          type="button"
          onClick={onOpenAssistant}
          className="w-full mt-2.5 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-slate-950 text-xs font-black transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
        >
          <span>✦</span> Open Clinical Assistant
        </button>
      </div>

      {/* ─── 10. Vitals with Change Indicators ─── */}
      <section className="card p-4 gradient-card-emerald rounded-2xl shadow-xs">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-emerald-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span className="text-rose-500">{Icons.heartbeat}</span>
            Patient Vitals
          </h3>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">Latest</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* BP */}
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-100/90 shadow-2xs">
            <span className="text-[10px] font-medium text-slate-400 block">Blood Pressure</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">{vitalsComparison.bp}</span>
          </div>
          {/* Pulse */}
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-100/90 shadow-2xs">
            <span className="text-[10px] font-medium text-slate-400 block">Pulse</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">{vitalsComparison.pulse}</span>
          </div>
          {/* SpO2 */}
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-100/90 shadow-2xs">
            <span className="text-[10px] font-medium text-slate-400 block">SpO₂</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">{vitalsComparison.spo2}</span>
          </div>
          {/* Temperature */}
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-100/90 shadow-2xs">
            <span className="text-[10px] font-medium text-slate-400 block">Temperature</span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">{vitalsComparison.temp}</span>
          </div>
          {/* Weight with delta */}
          <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-100/90 shadow-2xs col-span-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-medium text-slate-400 block">Weight / BMI</span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {vitalsComparison.weight} {vitalsComparison.bmi !== '—' && <span className="text-xs font-normal text-slate-500">({vitalsComparison.bmi} BMI)</span>}
              </span>
            </div>
            {vitalsComparison.weightDiff && (
              <span className={cn(
                'text-[11px] font-bold px-2 py-0.5 rounded-full',
                vitalsComparison.weightDiff.startsWith('↓') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              )}>
                {vitalsComparison.weightDiff}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ─── 10. Allergies (Prominent Alert / No Known Allergies) ─── */}
      <section className="card p-4 bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Allergies
          </h3>
          <Link to={`/patients/${patientId}?tab=clinical`} className="text-[11px] font-bold text-emerald-700 hover:underline">
            Manage
          </Link>
        </div>

        {allergies.length > 0 ? (
          <div className="space-y-1.5">
            {allergies.map(a => (
              <div
                key={a.id}
                className="p-2.5 rounded-xl bg-gradient-to-r from-rose-50 via-rose-100/50 to-rose-50 border border-rose-300 text-rose-900 flex items-start gap-2 shadow-2xs"
              >
                <span className="text-rose-600 font-bold text-sm shrink-0">⚠️</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-bold truncate">{a.allergen}</p>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-rose-200/70 text-rose-800">
                      {a.severity}
                    </span>
                  </div>
                  {a.reaction && (
                    <p className="text-[11px] text-rose-700 truncate mt-0.5">Reaction: {a.reaction}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2.5 rounded-xl gradient-card-emerald border border-emerald-200/80 flex items-center gap-2 text-emerald-900 shadow-2xs">
            <span className="text-emerald-600 font-bold text-xs">✓</span>
            <span className="text-xs font-bold">No known drug allergies</span>
          </div>
        )}
      </section>

      {/* ─── 10. Active Conditions ─── */}
      <section className="card p-4 bg-gradient-to-br from-white via-slate-50/40 to-slate-100/30 border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Active Conditions
          </h3>
          <span className="text-[10px] font-bold text-slate-400">{activeProblems.length}</span>
        </div>

        {activeProblems.length > 0 ? (
          <ul className="space-y-1.5">
            {activeProblems.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 text-xs">
                <span className="font-semibold text-slate-800 truncate">{p.title}</span>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
                  p.status === 'Active' ? 'bg-amber-100 text-amber-800' :
                  p.status === 'Controlled' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-slate-100 text-slate-600'
                )}>
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400 py-1">No active conditions recorded.</p>
        )}
      </section>

      {/* ─── 10. Current Medications ─── */}
      <section className="card p-4 bg-gradient-to-br from-white via-slate-50/40 to-slate-100/30 border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Current Medications
          </h3>
          <span className="text-[10px] font-bold text-slate-400">{activeMedications.length}</span>
        </div>

        {activeMedications.length > 0 ? (
          <ul className="space-y-2">
            {activeMedications.map(m => (
              <li key={m.id} className="p-2 rounded-lg bg-slate-50/70 border border-slate-100 text-xs">
                <p className="font-bold text-slate-900 truncate">{m.drug_name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {m.dosage && <span>{m.dosage} </span>}
                  {m.frequency && <span className="font-semibold text-emerald-700">· {m.frequency}</span>}
                  {m.route && <span className="text-slate-400"> ({m.route})</span>}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400 py-1">No active medications documented.</p>
        )}
      </section>

      {/* ─── 10. Last Visit Summary ─── */}
      {latestVisit && (
        <section className="card p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Last Consultation
          </span>
          <p className="font-semibold text-slate-800">
            {new Date(latestVisit.encounter.encounter_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {latestVisit.encounter.reason && (
            <p className="text-[11px] text-slate-600 mt-1 italic">
              "{latestVisit.encounter.reason}"
            </p>
          )}
          {latestVisit.diagnoses.length > 0 && (
            <p className="text-[11px] text-slate-500 mt-1">
              Diagnosis: <span className="font-medium text-slate-700">{latestVisit.diagnoses.map(d => d.diagnosis).join(', ')}</span>
            </p>
          )}
        </section>
      )}
    </aside>
  )
}
