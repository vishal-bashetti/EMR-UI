import { useState, useEffect } from 'react'
import { Patient, VisitResponse, Clinic, User } from '../types'
import api from '../api/axios'

interface Props {
  visit: VisitResponse
  patient: Patient
  clinic?: Clinic
  doctor?: User
  type: 'prescription' | 'report' | null
  onReady?: () => void
}

export function PrintableVisit({ visit, patient, clinic, doctor, type, onReady }: Props) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null;
    if (doctor?.id && doctor?.signature_path) {
      api.get(`/users/${doctor.id}/signature/image`, { responseType: 'blob' })
        .then(res => {
          objectUrl = URL.createObjectURL(res.data)
          setSignatureUrl(objectUrl)
          setTimeout(() => onReady?.(), 100)
        })
        .catch(err => {
          console.error('Failed to load signature:', err)
          setTimeout(() => onReady?.(), 100)
        })
    } else {
      setTimeout(() => onReady?.(), 100)
    }
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [doctor?.id, doctor?.signature_path])

  if (!type) return null

  const dt = new Date(visit.encounter.encounter_date)
  const prescriptionItems = visit.prescriptions?.flatMap((p) => p.items || []) || []
  const c = clinic as any

  return (
    <div className="print-area hidden print:block bg-white text-slate-900 w-full min-h-screen px-4 py-4">

      {/* ───── Clinic Letterhead ───── */}
      <div className="flex items-start border-b-2 border-slate-800 pb-5 mb-6">
        {c?.logo_path && (
          <div className="shrink-0 mr-5">
            <img src={`/api/${c.logo_path.replace(/\\/g, '/')}`} alt="Logo" className="w-20 h-20 object-contain" />
          </div>
        )}
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-slate-900">{c?.name || 'Clinic'}</h1>
          {c?.address && <p className="text-sm text-slate-600 mt-1">{c.address}</p>}
          {(c?.phone || c?.support_email) && (
            <p className="text-xs text-slate-500 mt-1">
              {[
                c?.phone ? `Phone: ${c.phone}` : null,
                c?.support_email ? `Email: ${c.support_email}` : null,
              ].filter(Boolean).join('  |  ')}
            </p>
          )}
        </div>
        {/* spacer to balance logo on left */}
        {c?.logo_path && <div className="w-20 shrink-0" />}
      </div>

      {/* ───── Patient Info Bar ───── */}
      <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Patient</p>
          <p className="font-bold text-lg text-slate-800">{patient.first_name} {patient.last_name}</p>
          <p className="text-sm text-slate-600 mt-0.5">
            {[
              patient.gender,
              patient.dob ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()} yrs` : null,
              patient.blood_group
            ].filter(Boolean).join(' • ')}
          </p>
          {patient.opd_number && <p className="text-xs font-mono text-slate-500 mt-1">OPD: {patient.opd_number}</p>}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Visit Date</p>
          <p className="font-bold text-lg text-slate-800">{dt.toLocaleDateString('en-GB')}</p>
          <p className="text-sm text-slate-500 mt-0.5">{dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MEDICAL REPORT LAYOUT
      ═══════════════════════════════════════════ */}
      {type === 'report' && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 uppercase tracking-wide">Medical Report</h2>
          
          {visit.vitals && visit.vitals.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Vitals</h3>
              <div className="grid grid-cols-4 gap-3">
                {visit.vitals.map((v: any, i: number) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-3 bg-white">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{v.name || `Vital ${v.vital_config_id}`}</p>
                    <p className="font-bold text-lg text-slate-800 mt-1">{v.value} <span className="text-xs text-slate-400 font-normal">{v.unit || ''}</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visit.complaints && visit.complaints.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Chief Complaints</h3>
              <ul className="list-disc pl-5 space-y-1">
                {visit.complaints.map((c, i) => (
                  <li key={i} className="text-slate-800">{c.complaint} <span className="text-slate-500">{c.duration ? `(${c.duration})` : ''}</span></li>
                ))}
              </ul>
            </div>
          )}

          {visit.diagnoses && visit.diagnoses.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Diagnosis</h3>
              <ul className="list-disc pl-5 space-y-1">
                {visit.diagnoses.map((d: any, i: number) => (
                  <li key={i} className="text-slate-800 font-medium">{d.diagnosis} <span className="text-slate-500 font-normal">{d.type ? `[${d.type}]` : ''}</span></li>
                ))}
              </ul>
            </div>
          )}
          
          {visit.encounter.quick_notes && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Clinical Notes</h3>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{visit.encounter.quick_notes}</p>
            </div>
          )}

          {visit.encounter.advice && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Advice</h3>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{visit.encounter.advice}</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PRESCRIPTION LAYOUT
      ═══════════════════════════════════════════ */}
      {type === 'prescription' && (
        <div>
          <div className="flex items-baseline gap-4 mb-6">
            <span className="text-5xl font-serif text-slate-300 italic leading-none">Rx</span>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">Prescription</h2>
          </div>
          
          {prescriptionItems.length > 0 ? (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="py-3 px-4 font-bold text-slate-700 uppercase tracking-wider text-xs w-8">#</th>
                  <th className="py-3 px-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Medicine</th>
                  <th className="py-3 px-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Dosage (M-A-E-N)</th>
                  <th className="py-3 px-4 font-bold text-slate-700 uppercase tracking-wider text-xs">When</th>
                  <th className="py-3 px-4 font-bold text-slate-700 uppercase tracking-wider text-xs">Notes</th>
                </tr>
              </thead>
              <tbody>
                {prescriptionItems.map((p, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 px-4 text-slate-400 font-medium">{i + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{p.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                      {[p.morning, p.afternoon, p.evening, p.night].map(v => v || '0').join(' - ')}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.when || 'As directed'}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{p.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
              No prescriptions recorded for this visit.
            </div>
          )}

          {visit.encounter.advice && (
            <div className="mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Advice &amp; Instructions</h3>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{visit.encounter.advice}</p>
            </div>
          )}
        </div>
      )}

      {/* ───── Doctor Signature ───── */}
      <div className="mt-20 pt-6 flex justify-end">
        <div className="text-center w-64">
          {signatureUrl ? (
            <div className="h-16 flex items-end justify-center mb-2">
              <img src={signatureUrl} alt="Signature" className="max-h-full object-contain mix-blend-multiply" />
            </div>
          ) : (
            <div className="h-16 mb-2 border-b border-dashed border-slate-300 w-full"></div>
          )}
          <p className="font-bold text-slate-900">Dr. {doctor?.username || 'Attending Doctor'}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Medical Practitioner</p>
        </div>
      </div>

      {/* ───── Footer with Contact Details ───── */}
      <div className="mt-10 pt-4 border-t border-slate-300 text-center text-[10px] text-slate-400 space-x-3">
        {c?.phone && <span>Phone: {c.phone}</span>}
        {c?.whatsapp && <span>WhatsApp: {c.whatsapp}</span>}
        {c?.support_email && <span>Email: {c.support_email}</span>}
        {c?.website && <span>Website: {c.website}</span>}
      </div>
    </div>
  )
}
