import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { Icons } from '../components/Icons'

type TimeFilter = 'today' | 'this_week' | 'this_month'

function StatCard({ title, value, subtitle, icon, bgClass, textClass }: { title: string; value: string | number; subtitle?: string; icon: React.ReactNode; bgClass: string; textClass: string }) {
  return (
    <div className={`rounded-2xl p-6 border ${bgClass} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-semibold uppercase tracking-wider mb-2 ${textClass}`}>{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-slate-800">{value}</p>
            {subtitle && <p className="text-sm font-medium text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${textClass} bg-white/60`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const { data: stats, isLoading } = useDashboardStats()
  const [filter, setFilter] = useState<TimeFilter>('today')

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin text-blue-500 w-8 h-8">
          <svg viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const currentStats = stats[filter]
  const totalRevenue = currentStats.consultations.revenue + currentStats.blood_tests.revenue + (currentStats.others?.revenue || 0)

  return (
    <div className="min-h-full bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-slate-500 mt-1 text-sm">Overview of clinic performance and patient flow.</p>
          </div>
          
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-fit overflow-x-auto">
            {(['today', 'this_week', 'this_month'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  filter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f === 'today' ? 'Today' : f === 'this_week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        {/* Top Level Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Unique Patients"
            value={currentStats.total_patients}
            icon={Icons.patients}
            bgClass="bg-blue-50 border-blue-100"
            textClass="text-blue-600"
          />
          <StatCard
            title="Appointments"
            value={currentStats.consultations.total_appointments || 0}
            subtitle={`(${currentStats.consultations.patients} unique)`}
            icon={Icons.stethoscope}
            bgClass="bg-indigo-50 border-indigo-100"
            textClass="text-indigo-600"
          />
          <StatCard
            title="Lab Tests"
            value={currentStats.blood_tests.total_tests || 0}
            subtitle={`(${currentStats.blood_tests.patients} unique)`}
            icon={Icons.flask}
            bgClass="bg-emerald-50 border-emerald-100"
            textClass="text-emerald-600"
          />
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 md:p-6 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="text-slate-400">{Icons.billing}</span> Revenue Breakdown
              </h2>
            </div>
            <div className="p-5 md:p-6 flex-1 flex flex-col justify-center">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-600">Consultations</span>
                    <span className="text-lg font-bold text-slate-900">₹{currentStats.consultations.revenue.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className="bg-indigo-500 h-2.5 rounded-full transition-all" style={{ width: `${Math.max(2, (currentStats.consultations.revenue / Math.max(1, totalRevenue)) * 100 || 0)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-600">Blood Tests</span>
                    <span className="text-lg font-bold text-slate-900">₹{currentStats.blood_tests.revenue.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${Math.max(2, (currentStats.blood_tests.revenue / Math.max(1, totalRevenue)) * 100 || 0)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-600">Other (Medications, etc.)</span>
                    <span className="text-lg font-bold text-slate-900">₹{(currentStats.others?.revenue || 0).toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className="bg-amber-500 h-2.5 rounded-full transition-all" style={{ width: `${Math.max(2, ((currentStats.others?.revenue || 0) / Math.max(1, totalRevenue)) * 100 || 0)}%` }}></div>
                  </div>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-base font-bold text-slate-800">Total Revenue</span>
                  <span className="text-2xl font-bold text-blue-600">₹{totalRevenue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg border border-slate-700 overflow-hidden text-white flex flex-col justify-center p-6 md:p-8">
             <div className="w-14 h-14 md:w-16 md:h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-7 h-7 md:w-8 md:h-8 text-blue-400"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
             </div>
             <h3 className="text-lg md:text-xl font-bold text-white mb-3">Performance Summary</h3>
             <p className="text-slate-300 leading-relaxed text-sm">
               In the selected period ({filter.replace('_', ' ')}), the clinic handled a total of <b className="text-white">{currentStats.total_patients}</b> unique patients across <b className="text-white">{currentStats.consultations.total_appointments}</b> appointments, generating a total revenue of <b className="text-white">₹{totalRevenue.toFixed(2)}</b>.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
