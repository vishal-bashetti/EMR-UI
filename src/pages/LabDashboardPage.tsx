import { useState } from 'react'
import { usePatients } from '../hooks/usePatients'
import { 
  useLabCatalog, 
  useComboCatalog, 
  useLabQueue, 
  useCreateLabResult, 
  useOrderCombo, 
  useUpdateLabResult,
  useLabResults,
  useLabResultsByDate
} from '../hooks/useLabResults'
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
  const [activeTab, setActiveTab] = useState<'create' | 'queue' | 'reports'>('create')

  // Create Order State
  const [searchQuery, setSearchQuery] = useState('')
  const { data: patients } = usePatients(searchQuery)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  
  const { data: labCatalog } = useLabCatalog()
  const { data: comboCatalog } = useComboCatalog()
  
  const createLab = useCreateLabResult()
  const orderCombo = useOrderCombo()

  // Fulfillment State
  const { data: queue } = useLabQueue()
  const updateLab = useUpdateLabResult()
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">1. Select Patient</h2>
            <input 
              type="text" 
              placeholder="Search patients by name..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={inputCls}
            />
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {patients?.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedPatientId(p.id)}
                  className={`p-3 rounded-xl cursor-pointer border ${selectedPatientId === p.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
                >
                  <p className="text-sm font-bold text-slate-800">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">ID: {p.id} | {p.contact_number}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-sm ${!selectedPatientId ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">2. Order Tests</h2>
            
            <h3 className="text-xs font-semibold text-slate-500 uppercase mt-4 mb-2">Combo Profiles</h3>
            <div className="space-y-2 mb-6">
              {comboCatalog?.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.description}</p>
                  </div>
                  <button onClick={() => handleOrderCombo(c.id)} className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200">
                    Order Combo
                  </button>
                </div>
              ))}
            </div>

            <h3 className="text-xs font-semibold text-slate-500 uppercase mt-4 mb-2">Individual Tests</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {labCatalog?.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                  <button onClick={() => handleOrderSingle(c.id, c.name)} className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200">
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
                    print:border-none print:shadow-none print:p-0`}
                >
                  <div className="text-center mb-8 border-b pb-6">
                    <h2 className="text-2xl font-bold text-slate-900">Laboratory Report</h2>
                    <p className="text-slate-600">Patient ID: {patient.id} | Patient Name: {patient.first_name} {patient.last_name}</p>
                    {!selectedReportPatientId && (
                      <p className="text-slate-500 text-sm mt-1">Date: {new Date(reportDate).toLocaleDateString('en-GB')}</p>
                    )}
                  </div>

                  {Object.entries(dates)
                    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                    .map(([dateStr, dateResults]) => (
                      <div key={dateStr} className="mb-8">
                        {selectedReportPatientId && (
                          <h3 className="text-lg font-bold text-slate-800 mb-3 border-b-2 border-slate-100 pb-2">Results on {dateStr}</h3>
                        )}
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-sm text-slate-500 uppercase tracking-wider">
                              <th className="py-3 font-semibold">Test Name</th>
                              <th className="py-3 font-semibold">Result</th>
                              <th className="py-3 font-semibold">Reference Range</th>
                              <th className="py-3 font-semibold">Unit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {dateResults.map(r => {
                                const outOfRange = isOutOfRange(r.result_value, r.reference_range)
                                return (
                                  <tr key={r.id}>
                                    <td className="py-4 text-sm text-slate-800 font-semibold">{r.test_name}</td>
                                    <td className={`py-4 text-sm ${outOfRange ? 'font-bold text-red-600 print:text-black print:font-black' : 'text-slate-600'}`}>
                                      {r.result_value} {outOfRange && '*'}
                                    </td>
                                    <td className="py-4 text-sm text-slate-500">{r.reference_range}</td>
                                    <td className="py-4 text-sm text-slate-500">{r.unit}</td>
                                  </tr>
                                )
                            })}
                          </tbody>
                        </table>
                      </div>
                  ))}
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
