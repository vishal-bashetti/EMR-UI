import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { usePatients, useCreatePatient, useDeletePatient } from '../hooks/usePatients'
import { Icons } from '../components/Icons'
import type { Patient } from '../types'

interface PatientFormState {
  first_name: string
  last_name: string
  dob: string
  gender: string
  contact_number: string
  email: string
  blood_group: string
  address: string
  language: string
}

const EMPTY_FORM: PatientFormState = {
  first_name: '', last_name: '', dob: '', gender: 'Male',
  contact_number: '', email: '', blood_group: '', address: '', language: ''
}

function Avatar({ name }: { name: string }) {
  const colors = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500']
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  const initials = name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?'
  return (
    <div className={`w-9 h-9 ${colors[idx]} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
      {initials}
    </div>
  )
}

function Field({ label, children, required, col2 }: { label: string; children: ReactNode; required?: boolean; col2?: boolean }) {
  return (
    <div className={col2 ? 'col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow'

export default function PatientsPage() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<PatientFormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null)

  const { data: patients, isLoading } = usePatients(search || undefined)
  const create = useCreatePatient()
  const remove = useDeletePatient()

  const set = (key: keyof PatientFormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    try {
      await create.mutateAsync(form)
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      const detail = isAxiosError(err) ? (err.response?.data as { detail?: string } | undefined)?.detail : undefined
      setFormError(detail || t('patients.failedCreate'))
    }
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('patients.title')}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {t('patients.activeRecords', { count: patients?.length ?? 0 })}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-blue-200"
        >
          {Icons.plus} {t('patients.newPatient')}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{Icons.search}</span>
        <input
          type="text"
          placeholder={t('patients.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[t('patients.colPatient'), t('patients.colDob'), t('patients.colGender'), t('patients.colContact'), t('patients.colBloodGroup'), ''].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6 last:pr-6">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {patients?.map((p) => {
                const name = `${p.first_name} ${p.last_name}`
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar name={name} />
                        <div>
                          <p className="font-semibold text-slate-800">{name}</p>
                          <p className="text-xs text-slate-400">{p.email || t('common.noEmail')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{p.dob}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.gender === 'Male' ? 'bg-blue-50 text-blue-700' :
                        p.gender === 'Female' ? 'bg-pink-50 text-pink-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {p.gender}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{p.contact_number}</td>
                    <td className="px-5 py-4">
                      {p.blood_group ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-bold">
                          {p.blood_group}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/patients/${p.id}`}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('patients.viewPatient')}
                        >
                          {Icons.eye}
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(p)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('patients.deletePatient')}
                        >
                          {Icons.trash}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {patients?.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center text-slate-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-3 opacity-40">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      <p className="text-sm font-medium">{t('patients.noneFound')}</p>
                      <p className="text-xs mt-1">{t('patients.noneFoundSub')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Patient Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">{t('patients.modalTitle')}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t('patients.modalSubtitle')}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                {Icons.x}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
              <Field label={t('patients.firstName')} required>
                <input className={inputCls} value={form.first_name} onChange={set('first_name')} required placeholder="John" />
              </Field>
              <Field label={t('patients.lastName')} required>
                <input className={inputCls} value={form.last_name} onChange={set('last_name')} required placeholder="Doe" />
              </Field>
              <Field label={t('patients.dob')} required>
                <input className={inputCls} type="date" value={form.dob} onChange={set('dob')} required />
              </Field>
              <Field label={t('patients.colGender')}>
                <select className={inputCls} value={form.gender} onChange={set('gender')}>
                  <option value="Male">{t('gender.male')}</option>
                  <option value="Female">{t('gender.female')}</option>
                  <option value="Other">{t('gender.other')}</option>
                </select>
              </Field>
              <Field label={t('patients.contactNumber')} required>
                <input className={inputCls} value={form.contact_number} onChange={set('contact_number')} required placeholder="+1 555 0000" />
              </Field>
              <Field label={t('patients.email')}>
                <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="john@example.com" />
              </Field>
              <Field label={t('patients.bloodGroup')}>
                <select className={inputCls} value={form.blood_group} onChange={set('blood_group')}>
                  <option value="">{t('common.select')}</option>
                  {['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'].map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Address">
                <input className={inputCls} value={form.address} onChange={set('address')} placeholder="123 Main St, City" />
              </Field>
              <Field label="Language">
                <input className={inputCls} value={form.language} onChange={set('language')} placeholder="e.g. English, Spanish" />
              </Field>

              {formError && (
                <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-600">
                  {formError}
                </div>
              )}
              <div className="col-span-2 flex justify-end gap-3 pt-2 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => { setShowForm(false); setFormError('') }}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={create.isPending}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                  {create.isPending ? t('common.saving') : t('patients.savePatient')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4 text-red-500">
              {Icons.trash}
            </div>
            <h3 className="text-base font-bold text-slate-900">{t('patients.deleteTitle')}</h3>
            <p className="text-sm text-slate-500 mt-1 mb-5">
              {t('patients.deleteConfirm', { name: `${confirmDelete.first_name} ${confirmDelete.last_name}` })}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => { remove.mutate(confirmDelete.id); setConfirmDelete(null) }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
