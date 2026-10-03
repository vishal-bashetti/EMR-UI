import { useState, useEffect, useRef } from 'react'
import { askPGAssistant, type PGResponse, type TraceableSource } from '../api/patientBrain'
import { Icons } from './Icons'
import { cn } from '../utils/cn'

interface PGAssistantDrawerProps {
  isOpen: boolean
  onClose: () => void
  patientId: number
  patientName: string
  opdNumber?: string | null
  initialQuestion?: string
}

interface MessageItem {
  id: string
  role: 'user' | 'assistant'
  text?: string
  response?: PGResponse
  timestamp: string
}

export function PGAssistantDrawer({
  isOpen,
  onClose,
  patientId,
  patientName,
  opdNumber,
  initialQuestion,
}: PGAssistantDrawerProps) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && initialQuestion) {
      handleAsk(initialQuestion)
    }
  }, [isOpen, initialQuestion])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleAsk = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return
    const userQ = textToSend.trim()
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const userMsg: MessageItem = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: userQ,
      timestamp: now,
    }

    setMessages(prev => [...prev, userMsg])
    setQuestion('')
    setIsLoading(true)

    try {
      const resp = await askPGAssistant(patientId, userQ)
      const assistantMsg: MessageItem = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        response: resp,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      const errorMsg: MessageItem = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        text: 'Unable to reach clinical intelligence service. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const quickPrompts = [
    'What changed since last visit?',
    'Why was amlodipine stopped?',
    'What clinical actions are pending?',
    'Summarize recent lab trends',
    'How has glycemic control been?',
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-2xs flex justify-end animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#061712] via-[#0d2820] to-[#071913] text-white flex items-center justify-between border-b border-emerald-950/60 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-base shadow-2xs">
              ✦
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">PG Assistant</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/30">
                  Clinical Intelligence
                </span>
              </div>
              <p className="text-xs text-emerald-400/90 mt-0.5">
                {patientName} {opdNumber && `· ${opdNumber}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {Icons.x}
          </button>
        </div>

        {/* Quick Action Chips (Section 36) */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 overflow-x-auto flex gap-1.5 scrollbar-none">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAsk(p)}
              disabled={isLoading}
              className="text-[11px] whitespace-nowrap font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-3">
              <div className="size-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-xl shadow-2xs">
                ✦
              </div>
              <div className="max-w-xs mx-auto">
                <p className="font-bold text-slate-800 text-sm">Clinical Assistant Ready</p>
                <p className="text-xs text-slate-500 mt-1">
                  Ask about changes, medication rationales, lab evolutions, or pending loops. Answers are grounded directly in structured records.
                </p>
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={cn("flex flex-col space-y-1.5", msg.role === 'user' ? "items-end" : "items-start")}>
                {msg.role === 'user' ? (
                  <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-2xl rounded-tr-xs px-3.5 py-2 max-w-[85%] shadow-xs font-medium">
                    {msg.text}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl rounded-tl-xs border border-slate-200 p-4 max-w-[95%] shadow-sm space-y-3">
                    {msg.response ? (
                      <>
                        {/* 1. FACT Section (Section 20) */}
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                            <span className="size-2 rounded-full bg-blue-500 inline-block"></span>
                            <span>Verified Fact{msg.response.facts.length > 1 ? 's' : ''}</span>
                          </div>
                          <ul className="space-y-1 bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-slate-800 font-mono text-[11px]">
                            {msg.response.facts.map((f, i) => (
                              <li key={i} className="leading-relaxed">{f}</li>
                            ))}
                          </ul>
                        </div>

                        {/* 2. PG Observation Section (Section 20) */}
                        {msg.response.pg_observations.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                              <span className="size-2 rounded-full bg-emerald-500 inline-block"></span>
                              <span>PG Observation</span>
                            </div>
                            <div className="text-slate-800 font-sans text-xs bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100/80 leading-relaxed">
                              {msg.response.pg_observations.join(' ')}
                            </div>
                          </div>
                        )}

                        {/* 3. Source-Linked Traceability (Section 19) */}
                        {msg.response.sources.length > 0 && (
                          <div className="pt-1 border-t border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                              Source Records:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {msg.response.sources.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[10px] border border-slate-200 transition-colors"
                                >
                                  <span>📄</span>
                                  <span>{s.label}</span>
                                  {s.date && <span className="text-slate-400">({s.date})</span>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Telemetry and Audit Stats (Section 14 & 34) */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>Intent: {msg.response.intent}</span>
                          <span>
                            {msg.response.tokens_used} tokens · {msg.response.latency_ms}ms · ${msg.response.estimated_cost.toFixed(4)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-700">{msg.text}</p>
                    )}
                  </div>
                )}
                <span className="text-[10px] text-slate-400 px-1">{msg.timestamp}</span>
              </div>
            ))
          )}

          {isLoading && (
            <div className="bg-white rounded-2xl rounded-tl-xs border border-slate-200 p-3 max-w-[70%] shadow-2xs flex items-center gap-2 text-slate-500">
              <span className="animate-spin text-emerald-600">✦</span>
              <span>Querying clinical records…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault()
            handleAsk(question)
          }}
          className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask about this patient (e.g. Why was amlodipine stopped?)..."
            disabled={isLoading}
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-slate-50/50"
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-xs disabled:opacity-40 transition-all cursor-pointer"
          >
            Ask
          </button>
        </form>
      </div>
    </div>
  )
}
