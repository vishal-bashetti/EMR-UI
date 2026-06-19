import { useState, useEffect } from 'react'
import { usePatients } from '../hooks/usePatients'
import { 
  useLabCatalog, 
  useComboCatalog, 
  useLabQueue, 
  useCreateLabResult, 
  useOrderCombo, 
  useUpdateLabResult,
  useLabResults,
  useLabResultsByDate,
  useDeleteLabResult
} from '../hooks/useLabResults'
import { useClinic } from '../hooks/useSettings'
import { useMe } from '../hooks/useUsers'
import type { LabResult } from '../types'
import { Icons } from '../components/Icons'

const inputCls = 'w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'

function isOutOfRange(valStr: string | null, refStr: string | null): boolean {
  if (!valStr || !refStr) return false
  const val = parseFloat(valStr)
  if (isNaN(val)) return false // if result isn't numeric, we can't reliably compare

  // Handle "min - max" format
  if (refStr.includes('-')) {
    const parts = refStr.split('-')
    if (parts.length >= 2) {
      const min = parseFloat(parts[0].replace(/[^\d.-]/g, ''))
      const max = parseFloat(parts[1].replace(/[^\d.-]/g, ''))
      if (!isNaN(min) && !isNaN(max)) {
        return val < min || val > max
      }
    }
  }
  // Handle "< max" format
  if (refStr.includes('<')) {
    const max = parseFloat(refStr.replace(/[^\d.-]/g, ''))
    if (!isNaN(max)) return val >= max
  }
  // Handle "> min" format
  if (refStr.includes('>')) {
    const min = parseFloat(refStr.replace(/[^\d.-]/g, ''))
    if (!isNaN(min)) return val <= min
  }
  
  return false
}

export default function LabDashboardPage() {
  const { data: clinic } = useClinic()
  const [activeTab, setActiveTab] = useState<'create' | 'queue' | 'reports'>('create')

  const [searchQuery, setSearchQuery] = useState('')
  const { data: patients } = usePatients(searchQuery)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  
  const [page, setPage] = useState(1)
  const itemsPerPage = 5

  useEffect(() => {
    setPage(1)
  }, [searchQuery])

  const paginatedPatients = patients?.slice((page - 1) * itemsPerPage, page * itemsPerPage)
  const totalPages = patients ? Math.ceil(patients.length / itemsPerPage) : 0

  const { data: labCatalog } = useLabCatalog()
  const { data: comboCatalog } = useComboCatalog()
  
  const createLab = useCreateLabResult()
  const orderCombo = useOrderCombo()

  // Fulfillment State
  const { data: queue } = useLabQueue()
  const updateLab = useUpdateLabResult()
  const deleteLab = useDeleteLabResult()
  const { data: me } = useMe()
  const isAdmin = me?.role?.name?.toLowerCase() === 'admin'

  const [bulkLabValues, setBulkLabValues] = useState<Record<number, { result_value: string, unit: string, reference_range: string }>>({})
  const [savingProgress, setSavingProgress] = useState<{ patientId: number, current: number, total: number } | null>(null)

  // Reports State
  const [reportSearchQuery, setReportSearchQuery] = useState('')
  const { data: reportPatients } = usePatients(reportSearchQuery)
  const [selectedReportPatientId, setSelectedReportPatientId] = useState<number | null>(null)
  const { data: patientLabResults } = useLabResults(selectedReportPatientId || undefined)
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const { data: dateLabResults } = useLabResultsByDate(!selectedReportPatientId && reportDate ? reportDate : undefined)
  const [printingPatientId, setPrintingPatientId] = useState<number | null>(null)

  const pendingQueue = queue?.filter(q => q.lab_result.status === 'Pending') || []
  const completedReports: LabResult[] = selectedReportPatientId
    ? patientLabResults?.filter((r: LabResult) => r.status === 'Completed') || []
    : dateLabResults?.filter(r => r.lab_result.status === 'Completed').map(r => ({ ...r.lab_result, patient: r.patient })) || []

  const handleOrderSingle = (catalogId: number, testName: string) => {
    if (!selectedPatientId) return
    createLab.mutate({
      patient_id: selectedPatientId,
      catalog_id: catalogId,
      test_name: testName,
      status: 'Pending',
    }, {
      onSuccess: () => alert('Test ordered successfully!')
    })
  }

  const handleOrderCombo = (comboId: number) => {
    if (!selectedPatientId) return
    orderCombo.mutate({ patient_id: selectedPatientId, combo_id: comboId }, {
      onSuccess: () => alert('Combo ordered successfully!')
    })
  }

  const groupedPending = Object.values(pendingQueue.reduce((acc, curr) => {
    if (!acc[curr.patient.id]) acc[curr.patient.id] = { patient: curr.patient, tests: [] }
    acc[curr.patient.id].tests.push(curr)
    return acc
  }, {} as Record<number, { patient: typeof pendingQueue[0]['patient'], tests: typeof pendingQueue }>))

  const handleBulkSave = async (patientId: number, tests: typeof pendingQueue) => {
    const testsToSave = tests.filter(t => bulkLabValues[t.lab_result.id]?.result_value)
    if (testsToSave.length === 0) return alert('No results entered to save.')

    setSavingProgress({ patientId, current: 0, total: testsToSave.length })

    for (let i = 0; i < testsToSave.length; i++) {
      const t = testsToSave[i]
      const vals = bulkLabValues[t.lab_result.id]
      const catItem = labCatalog?.find(c => c.id === t.lab_result.catalog_id)
      const unit = catItem?.unit || ''
      const reference_range = catItem && catItem.min_value !== null && catItem.max_value !== null 
        ? `${catItem.min_value} - ${catItem.max_value}` 
        : ''

      try {
        await updateLab.mutateAsync({
          id: t.lab_result.id,
          data: {
            ...vals,
            unit,
            reference_range,
            status: 'Completed',
            test_name: t.lab_result.test_name,
            patient_id: patientId,
          }
        })
        setSavingProgress({ patientId, current: i + 1, total: testsToSave.length })
      } catch (err) {
        console.error('Failed to update lab test', t.lab_result.id, err)
      }
    }

    setSavingProgress(null)
    setBulkLabValues(prev => {
      const next = { ...prev }
      testsToSave.forEach(t => delete next[t.lab_result.id])
      return next
    })
  }

  const handlePrintPatient = (patientId: number) => {
    setPrintingPatientId(patientId)
    setTimeout(() => {
      window.print()
      setPrintingPatientId(null)
    }, 100)
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laboratory Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage lab orders, results, and reports.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200 mb-6 print:hidden">
        <button
          onClick={() => setActiveTab('create')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'create' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Create Order
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'queue' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Fulfillment Queue
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reports' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Reports & Printing
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                {Icons.users}
              </div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">1. Select Patient</h2>
            </div>
            <input 
              type="text" 
              placeholder="Search patients by name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all bg-slate-50 focus:bg-white"
            />
            <div className="mt-5 space-y-3 max-h-72 overflow-y-auto pr-1 pb-1">
              {paginatedPatients?.map(p => {
                const isSelected = selectedPatientId === p.id;
                return (
                  <div 
                    key={p.id} 
                    onClick={() => setSelectedPatientId(p.id)}
                    className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                      isSelected 
                        ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-sm' 
                        : 'bg-white border-2 border-slate-100 hover:border-blue-200 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700'
                      }`}>
                        {p.first_name[0]}{p.last_name[0]}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {p.first_name} {p.last_name}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className="font-semibold text-slate-600">ID: {p.id}</span> 
                          <span>•</span>
                          <span>📞 {p.contact_number}</span>
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  &larr; Prev
                </button>
                <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  {page} <span className="text-slate-400 font-medium">/ {totalPages}</span>
                </span>
                <button 
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>

          <div className={`bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-opacity duration-300 ${!selectedPatientId ? 'opacity-50 pointer-events-none grayscale-[50%]' : ''}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                {Icons.flask}
              </div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">2. Order Tests</h2>
            </div>
            
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Combo Profiles</h3>
            <div className="space-y-3 mb-8">
              {comboCatalog?.map(c => (
                <div key={c.id} className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-100 hover:border-purple-200 hover:shadow-md transition-all gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-purple-700 transition-colors">{c.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{c.description}</p>
                  </div>
                  <button onClick={() => handleOrderCombo(c.id)} className="w-full sm:w-auto text-xs font-bold bg-purple-50 text-purple-700 px-4 py-2 rounded-xl hover:bg-purple-600 hover:text-white transition-all shadow-sm shrink-0">
                    Order Combo
                  </button>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Individual Tests</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 pb-1">
              {labCatalog?.map(c => (
                <div key={c.id} className="group flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-100 hover:border-blue-200 hover:shadow-md transition-all">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{c.name}</p>
                  <button onClick={() => handleOrderSingle(c.id, c.name)} className="text-xs font-bold bg-blue-50 text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                    Order Single
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'queue' && (
        <div className="space-y-6 print:hidden">
          {groupedPending.map(({ patient, tests }) => (
            <div key={patient.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{patient.first_name} {patient.last_name}</h3>
                  <p className="text-sm text-slate-500">Patient ID: {patient.id} • {tests.length} pending tests</p>
                </div>
                {savingProgress?.patientId === patient.id ? (
                  <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold border border-blue-100">
                    {Icons.clock} Saving {savingProgress.current} of {savingProgress.total}...
                  </div>
                ) : (
                  <button 
                    onClick={() => handleBulkSave(patient.id, tests)}
                    className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    Save All Results
                  </button>
                )}
              </div>
              <div className="p-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="pb-3 font-semibold w-1/3">Test Name</th>
                      <th className="pb-3 font-semibold">Result Value</th>
                      <th className="pb-3 font-semibold">Unit</th>
                      <th className="pb-3 font-semibold">Ref Range</th>
                      {isAdmin && <th className="pb-3 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tests.map(t => {
                      const vals = bulkLabValues[t.lab_result.id] || { result_value: '', unit: '', reference_range: '' }
                      const catItem = labCatalog?.find(c => c.id === t.lab_result.catalog_id)
                      const unit = catItem?.unit || '-'
                      const refRange = catItem && catItem.min_value !== null && catItem.max_value !== null 
                        ? `${catItem.min_value} - ${catItem.max_value}` 
                        : '-'

                      return (
                        <tr key={t.lab_result.id} className="group">
                          <td className="py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {t.lab_result.test_name}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                              Ordered: {new Date(t.lab_result.ordered_date).toLocaleDateString('en-GB')}
                            </p>
                          </td>
                          <td className="py-4 pr-4">
                            <input 
                              placeholder="e.g. 15.5" 
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              value={vals.result_value}
                              onChange={e => setBulkLabValues({...bulkLabValues, [t.lab_result.id]: {...vals, result_value: e.target.value}})}
                            />
                          </td>
                          <td className="py-4 pr-4 text-sm text-slate-700 font-medium">
                            {unit}
                          </td>
                          <td className="py-4 text-sm text-slate-700 font-medium">
                            {refRange}
                          </td>
                          {isAdmin && (
                            <td className="py-4 text-right">
                              <button 
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to delete this ordered test?')) {
                                    deleteLab.mutate(t.lab_result.id)
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                title="Delete Test"
                              >
                                {Icons.trash}
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {groupedPending.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
              <div className="flex justify-center mb-3 opacity-30">{Icons.flask}</div>
              No pending lab orders found across any patients.
            </div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm print:hidden">
            <div className="flex gap-4 mb-4 relative">
              <div className="flex-1">
                <input 
                  type="text" 
                  placeholder="Search patient to view reports..." 
                  value={reportSearchQuery}
                  onChange={e => setReportSearchQuery(e.target.value)}
                  className={inputCls}
                />
                {reportSearchQuery.length > 0 && reportPatients && reportPatients.length > 0 && !selectedReportPatientId && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {reportPatients.slice(0, 10).map(p => (
                      <button 
                        key={p.id} 
                        onClick={() => {
                          setSelectedReportPatientId(p.id)
                          setReportSearchQuery('')
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-sm"
                      >
                        <span className="font-medium text-slate-800">{p.first_name} {p.last_name}</span>
                        <span className="ml-2 text-xs text-slate-400">ID: {p.id}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="w-48 shrink-0">
                <input
                  type="date"
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                  className={inputCls}
                  disabled={!!selectedReportPatientId}
                />
              </div>
            </div>
            {selectedReportPatientId && (
              <p className="text-sm text-blue-600 font-medium">
                Viewing reports for Patient ID: {selectedReportPatientId} 
                <button onClick={() => setSelectedReportPatientId(null)} className="ml-3 text-slate-400 hover:text-slate-600 underline">Change Patient</button>
              </p>
            )}
          </div>

          {(selectedReportPatientId || reportDate) && completedReports.length > 0 && (
            <div className="space-y-8">
              {Object.values(
                completedReports.reduce((acc, curr) => {
                  const pId = curr.patient_id || curr.patient?.id
                  if (!pId) return acc
                  if (!acc[pId]) {
                    const patientInfo = curr.patient || reportPatients?.find(p => p.id === pId) || { id: pId, first_name: 'Unknown', last_name: 'Patient' }
                    acc[pId] = {
                      patient: patientInfo,
                      dates: {}
                    }
                  }
                  
                  const dateStr = new Date(curr.result_date || curr.ordered_date).toLocaleDateString('en-GB')
                  if (!acc[pId].dates[dateStr]) acc[pId].dates[dateStr] = []
                  acc[pId].dates[dateStr].push(curr)
                  
                  return acc
                }, {} as Record<number, { patient: any, dates: Record<string, LabResult[]> }>)
              ).map(({ patient, dates }) => (
                <div 
                  key={patient.id} 
                  className={`bg-white rounded-2xl border border-slate-200 p-8 
                    ${printingPatientId && printingPatientId !== patient.id ? 'print:hidden' : 'print:block'} 
                    ${printingPatientId === patient.id ? 'print-area' : ''}
                    print:border-none print:shadow-none print:p-0 print:rounded-none`}
                >
                  {/* ── Print-only: Clinic Letterhead ── */}
                  <div className="hidden print:block mb-6 border-b-2 border-slate-800 pb-4">
                    <div className="flex items-start">
                      {clinic?.logo_path && (
                        <div className="shrink-0 mr-5">
                          <img src={`/api/${clinic.logo_path.replace(/\\/g, '/')}`} alt="Logo" className="w-20 h-20 object-contain" />
                        </div>
                      )}
                      <div className="flex-1 text-center">
                        <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">{clinic?.name || 'Laboratory'}</h1>
                        {clinic?.address && <p className="text-sm text-slate-600 mt-1">{clinic.address}</p>}
                      </div>
                      {clinic?.logo_path && <div className="w-20 shrink-0" />}
                    </div>
                  </div>

                  {/* ── Print-only: "Laboratory Report" title ── */}
                  <div className="hidden print:block text-center mb-4">
                    <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Laboratory Report</h2>
                  </div>

                  {/* ── Patient Info Bar (visible on screen + print) ── */}
                  <div className="flex justify-between w-full bg-slate-50 p-5 rounded-xl border border-slate-100 mb-6 print:rounded-lg print:border-slate-200">
                    <div className="text-left">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Patient Details</p>
                      <p className="font-bold text-slate-900 text-lg">{patient.first_name} {patient.last_name}</p>
                      <p className="text-slate-600 text-sm font-medium">ID: {patient.id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Date</p>
                      <p className="text-slate-900 text-lg font-bold">
                        {!selectedReportPatientId ? new Date(reportDate).toLocaleDateString('en-GB') : Object.keys(dates)[0]}
                      </p>
                    </div>
                  </div>

                  {/* ── Lab Results Table ── */}
                  {Object.entries(dates)
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .map(([dateStr, dateResults]) => (
                      <div key={dateStr} className="mb-6">
                        {selectedReportPatientId && (
                          <h3 className="text-lg font-bold text-slate-800 mb-3 border-b-2 border-slate-100 pb-2">Results on {dateStr}</h3>
                        )}
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b-2 border-slate-300 text-xs text-slate-500 uppercase tracking-wider">
                              <th className="py-3 px-2 font-semibold">Test Name</th>
                              <th className="py-3 px-2 font-semibold">Result</th>
                              <th className="py-3 px-2 font-semibold">Reference Range</th>
                              <th className="py-3 px-2 font-semibold">Unit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dateResults.map(r => {
                                const outOfRange = isOutOfRange(r.result_value, r.reference_range)
                                return (
                                  <tr key={r.id} className={`border-b border-slate-100 ${outOfRange ? 'bg-red-50/60 print:bg-red-50' : ''}`}>
                                    <td className="py-3 px-2 text-sm text-slate-800 font-semibold">{r.test_name}</td>
                                    <td className={`py-3 px-2 text-sm ${outOfRange ? 'font-bold text-red-600' : 'text-slate-600'}`}>
                                      {r.result_value} {outOfRange && <span className="text-red-500">*</span>}
                                    </td>
                                    <td className="py-3 px-2 text-sm text-slate-500">{r.reference_range}</td>
                                    <td className="py-3 px-2 text-sm text-slate-500">{r.unit}</td>
                                  </tr>
                                )
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}

                  {/* ── Print-only: Footer with Contact Details ── */}
                  <div className="hidden print:block mt-12 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-400 space-x-3">
                    {clinic?.phone && <span>Phone: {clinic.phone}</span>}
                    {clinic?.whatsapp && <span>WhatsApp: {clinic.whatsapp}</span>}
                    {clinic?.support_email && <span>Email: {clinic.support_email}</span>}
                    {clinic?.website && <span>Website: {clinic.website}</span>}
                  </div>

                  {/* ── Screen-only: Print Button ── */}
                  <div className="mt-4 text-right print:hidden">
                    <button onClick={() => handlePrintPatient(patient.id)} className="bg-slate-900 text-white px-5 py-2 rounded-xl font-medium text-sm inline-flex items-center gap-2 hover:bg-slate-800 shadow-sm">
                      Print Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(selectedReportPatientId || reportDate) && completedReports.length === 0 && (
            <div className="text-center p-10 text-slate-500 print:hidden">
              No completed reports found for {selectedReportPatientId ? 'this patient' : 'this date'}.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
