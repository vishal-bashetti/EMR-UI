import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { getDocumentationStatus, prepareDocumentation, type DocumentationInput, type DocumentationDraft } from '../api/aiDocumentation'

export function ClinicalAiAssistant({ data, onApply, disabled }: { data: DocumentationInput; onApply: (text: string) => void; disabled?: boolean }) {
  const status = useQuery({ queryKey: ['aiDocumentationStatus'], queryFn: getDocumentationStatus, enabled: !disabled })
  const [draft, setDraft] = useState<DocumentationDraft | null>(null)
  const [draftText, setDraftText] = useState('')
  const [source, setSource] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [applied, setApplied] = useState(false)
  const snapshot = JSON.stringify(data)
  const stale = !!draft && source !== snapshot && !applied
  const generate = async () => {
    setPending(true); setError('')
    const requestedSource = snapshot
    try {
      const result = await prepareDocumentation(data)
      setDraft(result); setSource(requestedSource); setApplied(false)
      setDraftText(`Subjective\n${result.subjective}\n\nObjective\n${result.objective}\n\nAssessment\n${result.assessment}\n\nPlan\n${result.plan}`)
    } catch (failure) { setError(isAxiosError(failure) ? failure.response?.data?.detail || 'Could not prepare the note. Retry or document directly.' : 'Could not prepare the note.') }
    finally { setPending(false) }
  }
  return <section id="visit-section-assistant" className="rounded-xl border border-primary-200 bg-white overflow-hidden scroll-mt-4" aria-labelledby="ai-note-title">
    <div className="border-b border-primary-100 bg-primary-50/50 p-5 flex items-start justify-between gap-3"><div><h2 id="ai-note-title" className="font-semibold text-slate-900 text-balance">Documentation assistant</h2><p className="mt-1 text-sm text-slate-500 text-pretty">Organize the facts you entered into a structured note.</p></div><span className="text-xs font-medium text-primary-700 bg-primary-100 rounded-md px-2 py-1 shrink-0">{status.data?.configured ? 'AI assisted' : 'Template mode'}</span></div>
    <div className="p-5 space-y-4">
      <p className="text-xs text-slate-500 text-pretty">{status.data?.configured ? 'Prepare note sends the entered clinical documentation to your configured AI provider. Review the draft before adding it to the record.' : 'AI is not configured. You can still organize the entered facts into a note using the local template.'}</p>
      <button type="button" onClick={generate} disabled={pending || disabled || status.isLoading} className="btn btn-secondary">{pending ? 'Preparing note…' : draft ? 'Prepare again' : 'Prepare note'}</button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {draft && <div className="space-y-3">
        <div className="flex flex-wrap justify-between gap-2 text-xs"><span className="font-medium text-slate-600">{draft.mode === 'ai' ? 'AI draft · clinician review required' : 'Local template · no AI generation'}</span><span className="text-slate-500">Not added to the record until you choose Add</span></div>
        {draft.missing_sections.length > 0 && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">Not documented in the supplied facts: {draft.missing_sections.join(', ')}. Add information only if assessed.</p>}
        <label htmlFor="ai-draft-note" className="block text-sm font-medium text-slate-700">Review and edit the draft</label>
        <textarea id="ai-draft-note" rows={12} value={draftText} onChange={event => setDraftText(event.target.value)} className="input-field w-full resize-y" disabled={applied} />
        {stale && <p role="status" className="text-sm text-amber-800">The consultation changed after this draft was prepared. Prepare it again before adding.</p>}
        <button type="button" disabled={stale || applied || !draftText.trim() || disabled} className="btn btn-primary" onClick={() => { onApply(draftText); setApplied(true) }}>{applied ? 'Added to clinical notes' : 'Add reviewed draft to notes'}</button>
        <p className="text-xs text-slate-500">This appends to your existing note. Diagnoses, prescriptions, orders and signing remain separate clinician actions.</p>
      </div>}
    </div>
  </section>
}
