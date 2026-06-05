import { useState, useEffect } from 'react'
import { Patient, VisitResponse, Clinic, User } from '../types'
import api from '../api/axios'

interface Props {
  visit: VisitResponse
  patient: Patient
  clinic?: Clinic
  doctor?: User
  type: 'prescription' | 'report' | null
}

export function PrintableVisit({ visit, patient, clinic, doctor, type }: Props) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null;
    if (doctor?.id && doctor?.signature_path) {
      api.get(`/users/${doctor.id}/signature/image`, { responseType: 'blob' })
        .then(res => {
          objectUrl = URL.createObjectURL(res.data)
          setSignatureUrl(objectUrl)
        })
        .catch(err => console.error('Failed to load signature:', err))
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [doctor?.id, doctor?.signature_path])

  if (!type) return null

  const dt = new Date(visit.encounter.encounter_date)
  const prescriptionItems = visit.prescriptions?.flatMap((p) => p.items || []) || []
  
  // Safe extraction for potential clinic fields
  const c = clinic as any

  return (
    <div className="print-area hidden print:block bg-white text-slate-900 w-full min-h-screen px-4 py-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex items-center gap-6">
          {c?.logo_path && (
            <img src={`/api/${c.logo_path.replace(/\\/g, '/')}`} alt="Clinic Logo" className="w-20 h-20 object-contain" />
          )}
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wide text-slate-900">{c?.name || 'Clinic'}</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-md">{c?.address || ''}</p>
          </div>
        </div>
        <div className="text-right text-sm text-slate-600">
          {c?.support_email && <p>{c.support_email}</p>}
          {c?.phone && <p>{c.phone}</p>}
        </div>
      </div>

      {/* Patient Details */}
      <div className="grid grid-cols-2 gap-4 mb-10 bg-slate-50 p-5 rounded-2xl border border-slate-200">
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Patient</p>
          <p className="font-bold text-xl text-slate-800">{patient.first_name} {patient.last_name}</p>
          <p className="text-sm text-slate-600 mt-1">
            {[
              patient.gender,
              patient.dob ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs` : null,
              patient.blood_group
            ].filter(Boolean).join(' • ')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Visit Details</p>
          <p className="font-bold text-lg text-slate-800">{dt.toLocaleDateString('en-GB')} {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
          {patient.opd_number && <p className="text-sm font-mono text-slate-600 mt-1">OPD: {patient.opd_number}</p>}
        </div>
      </div>

      {/* Report Layout */}
      {type === 'report' && (
        <div className="space-y-8">
          <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">Medical Report</h2>
          
          {visit.vitals && visit.vitals.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Vitals</h3>
              <div className="grid grid-cols-4 gap-4">
                {visit.vitals.map((v, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{v.name}</p>
                    <p className="font-bold text-xl text-slate-800 mt-1">{v.value} <span className="text-sm text-slate-400 font-normal">{v.unit}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visit.complaints && visit.complaints.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Chief Complaints</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                {visit.complaints.map((c, i) => (
                  <li key={i} className="text-slate-800">{c.complaint} <span className="text-slate-500">{c.duration ? `(${c.duration})` : ''}</span></li>
                ))}
              </ul>
            </div>
          )}

          {visit.diagnoses && visit.diagnoses.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Diagnosis</h3>
              <ul className="list-disc pl-5 space-y-1.5">
                {visit.diagnoses.map((d, i) => (
                  <li key={i} className="text-slate-800 font-medium">{d.diagnosis} <span className="text-slate-500 font-normal">{d.type ? `[${d.type}]` : ''}</span></li>
                ))}
              </ul>
            </div>
          )}
          
          {visit.encounter.quick_notes && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</h3>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{visit.encounter.quick_notes}</p>
            </div>
          )}

          {visit.encounter.advice && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Advice</h3>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{visit.encounter.advice}</p>
            </div>
          )}
        </div>
      )}

      {/* Prescription Layout */}
      {type === 'prescription' && (
        <div className="space-y-6">
          <div className="text-6xl font-serif text-slate-200 mb-6 italic px-2">Rx</div>
          
          {prescriptionItems.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-5 font-bold text-slate-600 uppercase tracking-wider text-xs">Medicine</th>
                    <th className="py-4 px-5 font-bold text-slate-600 uppercase tracking-wider text-xs">Dosage (M-A-E-N)</th>
                    <th className="py-4 px-5 font-bold text-slate-600 uppercase tracking-wider text-xs">Timing</th>
                    <th className="py-4 px-5 font-bold text-slate-600 uppercase tracking-wider text-xs">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescriptionItems.map((p, i) => (
                    <tr key={i} className="bg-white">
                      <td className="py-4 px-5 font-bold text-slate-800">{p.name}</td>
                      <td className="py-4 px-5 font-mono text-slate-600 font-medium">
                        {[p.morning, p.afternoon, p.evening, p.night].map(v => v || '0').join(' - ')}
                      </td>
                      <td className="py-4 px-5 text-slate-600">{p.timing || 'As directed'}</td>
                      <td className="py-4 px-5 text-slate-600">{p.duration || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
              <p className="text-slate-500 font-medium">No prescriptions recorded for this visit.</p>
            </div>
          )}

          {visit.encounter.advice && (
            <div className="mt-10 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">Advice & Instructions</h3>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{visit.encounter.advice}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer / Signature */}
      <div className="mt-20 pt-8 flex justify-end">
        <div className="text-center w-64">
          {signatureUrl ? (
            <div className="h-20 flex items-end justify-center mb-3">
              <img src={signatureUrl} alt="Doctor Signature" className="max-h-full object-contain mix-blend-multiply" />
            </div>
          ) : (
            <div className="h-20 mb-3 border-b border-dashed border-slate-300 w-full"></div>
          )}
          <p className="font-bold text-slate-900 text-lg">Dr. {doctor?.username || 'Attending Doctor'}</p>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Medical Practitioner</p>
        </div>
      </div>
    </div>
  )
}
