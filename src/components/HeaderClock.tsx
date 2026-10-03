import { useEffect, useId, useState } from 'react'

function ClockFace({ time, large = false }: { time: Date; large?: boolean }) {
  const faceId = useId().replace(/:/g, '')
  const seconds = time.getSeconds()
  const minutes = time.getMinutes() + seconds / 60
  const hours = time.getHours() % 12 + minutes / 60
  return <svg viewBox="0 0 100 100" aria-hidden="true" className={large ? 'size-40 drop-shadow-lg' : 'size-8'}>
    <defs><linearGradient id={faceId} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#243b43" /><stop offset="1" stopColor="#0b181e" /></linearGradient></defs>
    <circle cx="50" cy="50" r="48" fill={`url(#${faceId})`} stroke="#ffffff" strokeOpacity="0.15" strokeWidth="1" />
    {large && <circle cx="50" cy="50" r="44" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.5" />}
    {Array.from({ length: large ? 60 : 12 }, (_, index) => {
      const major = large ? index % 5 === 0 : true
      return <line key={index} x1="50" y1="9" x2="50" y2={major ? '13' : '10.5'} stroke={major ? '#d4e6e2' : '#6a8587'} strokeOpacity={major ? '0.75' : '0.45'} strokeWidth={major ? '1.4' : '0.6'} strokeLinecap="round" transform={`rotate(${index * (large ? 6 : 30)} 50 50)`} />
    })}
    {large && <g fill="#b1c8c8" fontSize="6.5" fontWeight="500" textAnchor="middle" dominantBaseline="central"><text x="50" y="22">12</text><text x="79" y="50">3</text><text x="50" y="79">6</text><text x="21" y="50">9</text></g>}
    <line x1="50" y1="52" x2="50" y2="28" stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round" transform={`rotate(${hours * 30} 50 50)`} />
    <line x1="50" y1="53" x2="50" y2="18" stroke="#e2e8f0" strokeWidth="1.8" strokeLinecap="round" transform={`rotate(${minutes * 6} 50 50)`} />
    <line x1="50" y1="58" x2="50" y2="15" stroke="#6ee7b7" strokeWidth="0.8" strokeLinecap="round" transform={`rotate(${seconds * 6} 50 50)`} />
    <circle cx="50" cy="50" r="2.5" fill="#6ee7b7" />
    <circle cx="50" cy="50" r="1" fill="#10252a" />
  </svg>
}

export default function HeaderClock() {
  const [time, setTime] = useState(() => new Date())
  const [pinned, setPinned] = useState(false)
  const tooltipId = useId()
  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const formatted = time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const zoneLabel = timeZone.split('/').pop()?.replace(/_/g, ' ') || timeZone
  return <div className="group relative shrink-0" onKeyDown={e => { if (e.key === 'Escape') { setPinned(false); (e.target as HTMLElement).blur() } }}>
    <button type="button" aria-label={`Current time: ${formatted}`} aria-describedby={tooltipId} onClick={() => setPinned(value => !value)} onBlur={() => setPinned(false)} className="flex size-10 items-center justify-center rounded-full border border-slate-200/80 bg-white shadow-sm transition duration-200 hover:border-emerald-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 motion-reduce:transition-none">
      <ClockFace time={time} />
    </button>
    <div id={tooltipId} role="tooltip" className={`absolute right-0 top-full z-50 origin-top-right pt-3 transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none ${pinned ? 'visible translate-y-0 scale-100 opacity-100' : 'invisible -translate-y-1 scale-95 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100'}`}>
      <div className="flex w-60 flex-col items-center gap-5 rounded-3xl border border-white/80 bg-white/95 p-5 shadow-[0_16px_48px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400"><span>Local time</span><span className="flex items-center gap-1.5 text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" />Live</span></div>
        <ClockFace time={time} large />
        <div className="text-center"><time dateTime={time.toISOString()} className="text-2xl font-medium tracking-tight tabular-nums text-slate-900">{formatted}</time><p className="mt-1 text-xs text-slate-500">{time.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</p></div>
        <div className="w-full border-t border-slate-100 pt-3 text-center text-[11px] font-medium text-slate-400" title={timeZone}>{zoneLabel}</div>
      </div>
    </div>
  </div>
}
