export function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
      <div className="text-slate-300 mb-2">{icon}</div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {sub && <p className="text-xs mt-1">{sub}</p>}
    </div>
  )
}
