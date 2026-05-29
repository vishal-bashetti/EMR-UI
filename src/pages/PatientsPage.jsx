import { useState } from 'react'
import { usePatients, useCreatePatient, useDeletePatient } from '../hooks/usePatients'

const emptyForm = {
  first_name: '', last_name: '', dob: '', gender: 'Male',
  contact_number: '', email: '', blood_group: '', address: '',
}

export default function PatientsPage() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const { data: patients, isLoading } = usePatients(search || undefined)
  const create = useCreatePatient()
  const remove = useDeletePatient()

  const handleSubmit = async (e) => {
    e.preventDefault()
    await create.mutateAsync(form)
    setForm(emptyForm)
    setShowForm(false)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Patients</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Patient
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name, phone or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'DOB', 'Gender', 'Contact', 'Blood Group', 'Actions'].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {patients?.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">{p.first_name} {p.last_name}</td>
                <td className="px-5 py-3 text-gray-500">{p.dob}</td>
                <td className="px-5 py-3 text-gray-500">{p.gender}</td>
                <td className="px-5 py-3 text-gray-500">{p.contact_number}</td>
                <td className="px-5 py-3 text-gray-500">{p.blood_group || '—'}</td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => remove.mutate(p.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {patients?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-gray-400">No patients found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Patient Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-5">New Patient</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              {[
                { key: 'first_name', label: 'First Name' },
                { key: 'last_name', label: 'Last Name' },
                { key: 'dob', label: 'Date of Birth', type: 'date' },
                { key: 'contact_number', label: 'Contact Number' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'blood_group', label: 'Blood Group' },
                { key: 'address', label: 'Address' },
              ].map(({ key, label, type = 'text' }) => (
                <div key={key} className={key === 'address' ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required={['first_name', 'last_name', 'dob', 'contact_number'].includes(key)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="col-span-2 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {create.isPending ? 'Saving…' : 'Save Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
