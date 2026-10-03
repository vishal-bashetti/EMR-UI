import { useState, useMemo } from 'react'
import { Icons } from './Icons'
import { cn } from '../utils/cn'
import type { Patient, VisitResponse, LabResult } from '../types'
import { getAllergies, getProblems, getMedications } from '../api/clinicalHistory'
import { useQuery } from '@tanstack/react-query'

interface ClinicalAssistantDrawerProps {
  isOpen: boolean
  onClose: () => void
  patient: Patient
  visits?: VisitResponse[]
  labs?: LabResult[]
  onApplyDraft?: (text: string) => void
}

type AssistantTab = 'brief' | 'changes' | 'results' | 'note' | 'ask'

export function ClinicalAssistantDrawer({
  isOpen,
  onClose,
  patient,
  visits = [],
  labs = [],
  onApplyDraft
}: ClinicalAssistantDrawerProps) {
  const [activeTab, setActiveTab] = useState<AssistantTab>('brief')
  const [question, setQuestion] = useState('')
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])
  const [isAsking, setIsAsking] = useState(false)

  const patientId = patient.id
  const allergiesQuery = useQuery({ queryKey: ['clinicalHistory', patientId, 'allergies'], queryFn: () => getAllergies(patientId), enabled: isOpen })
  const problemsQuery = useQuery({ queryKey: ['clinicalHistory', patientId, 'problems'], queryFn: () => getProblems(patientId), enabled: isOpen })
  const medsQuery = useQuery({ queryKey: ['clinicalHistory', patientId, 'medications'], queryFn: () => getMedications(patientId), enabled: isOpen })

  const allergies = allergiesQuery.data || []
  const problems = problemsQuery.data || []
  const medications = medsQuery.data || []

  const latestVisit = visits[0]
  const previousVisit = visits[1]

  // ─── 24. Deterministic "What's Changed?" Engine (Section 24 & 27) ───
  const changes = useMemo(() => {
    const list: Array<{ title: string; prev: string; curr: string; trend: 'better' | 'worse' | 'neutral'; detail?: string }> = []

    if (!latestVisit) return list

    // Extract vitals
    const curVitals = latestVisit.vitals || []
    const prevVitals = previousVisit?.vitals || []

    const getVitalVal = (vList: typeof curVitals, cfgId: number) => vList.find(v => v.vital_config_id === cfgId)?.value?.trim() || ''

    // BP Change
    const curBP = getVitalVal(curVitals, 1)
    const prevBP = getVitalVal(prevVitals, 1)
    if (curBP && prevBP && curBP !== prevBP) {
      const curSystolic = parseInt(curBP.split('/')[0]) || 0
      const prevSystolic = parseInt(prevBP.split('/')[0]) || 0
      list.push({
        title: 'Blood Pressure',
        prev: prevBP,
        curr: curBP,
        trend: curSystolic > prevSystolic ? 'worse' : 'better',
        detail: curSystolic > prevSystolic ? 'Systolic increased' : 'Systolic improved'
      })
    }

    // Weight Change
    const curWt = getVitalVal(curVitals, 5) || ''
    const prevWt = getVitalVal(prevVitals, 5)
    if (curWt && prevWt && curWt !== prevWt) {
      const c = parseFloat(curWt)
      const p = parseFloat(prevWt)
      if (!isNaN(c) && !isNaN(p)) {
        const diff = (c - p).toFixed(1)
        list.push({
          title: 'Weight',
          prev: `${p} kg`,
          curr: `${c} kg`,
          trend: 'neutral',
          detail: `${diff} kg change`
        })
      }
    }

    // Medication changes between visits
    const curMeds = latestVisit.prescriptions?.flatMap(p => p.items || []) || []
    const prevMeds = previousVisit?.prescriptions?.flatMap(p => p.items || []) || []

    curMeds.forEach(cm => {
      const pm = prevMeds.find(p => p.name?.toLowerCase() === cm.name?.toLowerCase())
      if (!pm) {
        list.push({
          title: `New Medication: ${cm.name}`,
          prev: 'Not prescribed',
          curr: `${[cm.morning, cm.afternoon, cm.evening, cm.night].filter(Boolean).join('-')}`,
          trend: 'neutral',
          detail: 'Added in last prescription'
        })
      }
    })

    // Lab changes
    if (labs.length >= 2) {
      const recentLab = labs[0]
      list.push({
        title: `Latest Lab Result: ${recentLab.test_name}`,
        prev: 'Previous record',
        curr: `${recentLab.result_value} ${recentLab.unit || ''}`,
        trend: recentLab.status === 'Completed' ? 'better' : 'neutral',
        detail: recentLab.reference_range ? `Ref range: ${recentLab.reference_range}` : undefined
      })
    }

    return list
  }, [latestVisit, previousVisit, patient, labs])

  // ─── 25. Pre-Visit Brief (Readable in 5–10 seconds) ───
  const age = patient.dob
    ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 'Unknown age'

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    const userText = question.trim()
    setConversation(prev => [...prev, { role: 'user', text: userText }])
    setQuestion('')
    setIsAsking(true)

    // Answer with structured patient facts
    setTimeout(() => {
      let reply = `Based on ${patient.first_name}'s medical record:\n`
      if (userText.toLowerCase().includes('allerg')) {
        reply += allergies.length ? `• Documented Allergies: ${allergies.map(a => `${a.allergen} (${a.severity})`).join(', ')}` : '• No known drug allergies documented.'
      } else if (userText.toLowerCase().includes('med') || userText.toLowerCase().includes('drug')) {
        reply += medications.length ? `• Active Medications: ${medications.map(m => `${m.drug_name} ${m.dosage || ''} ${m.frequency || ''}`).join(', ')}` : '• No active medications recorded.'
      } else if (userText.toLowerCase().includes('condition') || userText.toLowerCase().includes('diagnos')) {
        reply += problems.length ? `• Known Conditions: ${problems.map(p => `${p.title} (${p.status})`).join(', ')}` : '• No active conditions recorded.'
      } else {
        reply += `• Age: ${age} · Gender: ${patient.gender || '—'}\n• Conditions: ${problems.map(p => p.title).join(', ') || 'None'}\n• Latest visit reason: "${latestVisit?.encounter.reason || 'Routine'}"`
      }
      setConversation(prev => [...prev, { role: 'assistant', text: reply }])
      setIsAsking(false)
    }, 400)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-emerald-950/60 bg-gradient-to-r from-[#061712] via-[#0d2820] to-[#071913] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-500/30 to-teal-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm shadow-2xs">
              ✦
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight leading-tight">
                Clinical Assistant
              </h2>
              <p className="text-[11px] text-emerald-400 font-medium">
                {patient.first_name} {patient.last_name} · {patient.opd_number || `PT-${patient.id}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Assistant Drawer"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {Icons.x}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-gradient-to-r from-slate-50 via-emerald-50/15 to-slate-50 text-xs font-semibold text-slate-600 px-2 overflow-x-auto">
          {[
            { key: 'brief', label: 'Pre-Visit Brief' },
            { key: 'changes', label: `What's Changed (${changes.length})` },
            { key: 'results', label: 'Review Results' },
            { key: 'ask', label: 'Ask Assistant' },
          ].map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key as AssistantTab)}
              className={cn(
                'py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors cursor-pointer',
                activeTab === t.key
                  ? 'border-emerald-600 text-emerald-900 font-bold bg-gradient-to-t from-emerald-50/70 to-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* TAB 1: PRE-VISIT BRIEF (Section 25) */}
          {activeTab === 'brief' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white border border-emerald-200/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                  5-Second Clinical Summary
                </span>
                <p className="text-sm font-bold text-slate-900">
                  {age} yrs · {patient.gender || 'Patient'}
                </p>
                <div className="mt-2 space-y-1 text-slate-700">
                  <p>
                    <span className="font-semibold text-slate-900">Known Conditions:</span>{' '}
                    {problems.length ? problems.map(p => p.title).join(', ') : 'None documented'}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Active Meds:</span>{' '}
                    {medications.length ? medications.map(m => `${m.drug_name} ${m.dosage || ''}`).join(', ') : 'None documented'}
                  </p>
                  {allergies.length > 0 && (
                    <p className="text-rose-700 font-bold">
                      ⚠️ Allergy: {allergies.map(a => `${a.allergen} (${a.severity})`).join(', ')}
                    </p>
                  )}
                  {latestVisit?.encounter.reason && (
                    <p>
                      <span className="font-semibold text-slate-900">Visit Reason:</span>{' '}
                      {latestVisit.encounter.reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Highlights since last visit */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                  Since Last Visit
                </h4>
                {changes.length > 0 ? (
                  <ul className="space-y-2">
                    {changes.map((c, i) => (
                      <li key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">{c.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{c.prev} → <span className="font-bold text-slate-900">{c.curr}</span></p>
                        </div>
                        {c.detail && (
                          <span className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded',
                            c.trend === 'better' ? 'bg-emerald-100 text-emerald-800' :
                            c.trend === 'worse' ? 'bg-rose-100 text-rose-800' :
                            'bg-slate-200 text-slate-700'
                          )}>
                            {c.detail}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-400 italic">No previous visit delta detected.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WHAT'S CHANGED? (Section 24) */}
          {activeTab === 'changes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Deterministic Delta Comparison
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                  Visit-to-Visit
                </span>
              </div>

              {changes.length > 0 ? (
                <div className="space-y-2.5">
                  {changes.map((ch, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{ch.title}</span>
                        <span className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full',
                          ch.trend === 'better' ? 'bg-emerald-50 text-emerald-700' :
                          ch.trend === 'worse' ? 'bg-amber-50 text-amber-800' :
                          'bg-slate-100 text-slate-600'
                        )}>
                          {ch.trend === 'better' ? 'Improved' : ch.trend === 'worse' ? 'Attention' : 'Observed'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs font-mono">
                        <span className="text-slate-400">{ch.prev}</span>
                        <span className="text-slate-300">→</span>
                        <span className="font-bold text-slate-800">{ch.curr}</span>
                      </div>
                      {ch.detail && (
                        <p className="text-[11px] text-slate-500 mt-1">{ch.detail}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">
                  No previous consultation record to compare against.
                </p>
              )}
            </div>
          )}

          {/* TAB 3: REVIEW RESULTS */}
          {activeTab === 'results' && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Laboratory & Diagnostic Findings
              </h4>
              {labs.length > 0 ? (
                <div className="space-y-2">
                  {labs.map(l => (
                    <div key={l.id} className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-slate-900">{l.test_name}</p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {l.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-800">
                        {l.result_value || 'Pending'} <span className="text-xs font-normal text-slate-400">{l.unit}</span>
                      </p>
                      {l.reference_range && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Reference: {l.reference_range}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">No laboratory results recorded.</p>
              )}
            </div>
          )}

          {/* TAB 4: ASK ABOUT THIS PATIENT (Section 23) */}
          {activeTab === 'ask' && (
            <div className="flex flex-col h-full space-y-3">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 text-[11px]">
                ✦ Context-aware clinical assistant using structured patient records (Demographics, Conditions, Meds, Allergies).
              </div>

              {/* Chat history */}
              <div className="flex-1 space-y-2 min-h-[220px]">
                {conversation.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <p className="font-medium text-slate-600">Ask any clinical question</p>
                    <p className="text-[11px] mt-1">E.g., "What are the active medications?" or "Are there any penicillin allergies?"</p>
                  </div>
                ) : (
                  conversation.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-2.5 rounded-xl max-w-[90%] whitespace-pre-wrap leading-relaxed',
                        msg.role === 'user'
                          ? 'ml-auto bg-emerald-600 text-white font-medium'
                          : 'mr-auto bg-slate-100 text-slate-800 border border-slate-200'
                      )}
                    >
                      {msg.text}
                    </div>
                  ))
                )}
                {isAsking && (
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 animate-pulse">
                    Synthesizing patient context…
                  </div>
                )}
              </div>

              {/* Input box */}
              <form onSubmit={handleAskQuestion} className="flex gap-2 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="Ask about this patient..."
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!question.trim() || isAsking}
                  className="btn btn-primary bg-emerald-600 text-white text-xs px-3 py-2"
                >
                  Ask
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Patient Context Engine v1.0</span>
          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  )
}
