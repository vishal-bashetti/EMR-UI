import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

type LinkedLabReport = {
  id: string
  accessionNumber: string
  version: number
  releasedAt: string
  resultsSnapshot: {
    testName: string
    value: string | number | null
    unit: string | null
    referenceRange: string | null
    flag: string | null
    reviewerComment: string | null
  }[]
}

export function LinkedLabReports({ patientId, accessionNumber }: { patientId: number; accessionNumber?: string }) {
  const title = accessionNumber ? 'LIS report for this visit' : 'Released LIS reports'
  const reports = useQuery({
    queryKey: ['linkedLabReports', patientId, accessionNumber],
    queryFn: async ({ signal }) => {
      const { data } = await api.get<LinkedLabReport[]>(`/integrations/lis/patients/${patientId}/reports`, {
        signal,
        params: accessionNumber ? { accession_number: accessionNumber } : undefined,
      })
      return data
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
    gcTime: 0,
    retry: false,
  })

  return (
    <section aria-label={title} className="border-b border-slate-100 pb-4 mb-4 space-y-2">
      <h4 className="text-xs font-semibold text-slate-700">{title}</h4>
      {reports.isPending && <p role="status" className="text-xs text-slate-500">Loading LIS reports…</p>}
      {reports.isError && (
        <div role="alert" className="text-xs text-rose-700">
          Could not load the latest LIS reports.
          <button type="button" className="ml-2 underline" onClick={() => void reports.refetch()}>Retry</button>
        </div>
      )}
      {reports.isSuccess && reports.data.length === 0 && (
        <p className="text-xs text-slate-500">{accessionNumber
          ? 'Waiting for the laboratory to release this report.'
          : 'No released LIS reports for this patient.'}</p>
      )}
      {reports.isSuccess && reports.data.map((report, index) => (
        <details key={report.id} open={index === 0} className="rounded-lg border border-slate-200 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-800">
            {report.accessionNumber} · Version {report.version} · {new Date(report.releasedAt).toLocaleString()}
          </summary>
          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr className="border-b border-slate-100">
                  <th scope="col" className="p-2">Test</th>
                  <th scope="col" className="p-2">Result</th>
                  <th scope="col" className="p-2">Reference range</th>
                  <th scope="col" className="p-2">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.resultsSnapshot.map((result, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="p-2 font-medium">
                      {result.testName}
                      {result.reviewerComment && <div className="font-normal text-slate-600">{result.reviewerComment}</div>}
                    </td>
                    <td className="p-2">{result.value ?? '—'} {result.unit}</td>
                    <td className="p-2">{result.referenceRange || '—'}</td>
                    <td className="p-2">{result.flag || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </section>
  )
}
