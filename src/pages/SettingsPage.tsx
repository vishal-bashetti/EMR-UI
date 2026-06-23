import { useState, useRef } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUploadSignature,
  useRoles, useCreateRole, useUpdateRole, useDeleteRole,
  usePermissions, useCreatePermission, useUpdateUserTabs
} from '../hooks/useUsers'
import { useAllDrugs, useCreateDrug, useUpdateDrug } from '../hooks/useDrugs'
import { useLabCatalog, useCreateLabCatalogItem, useUpdateLabCatalogItem, useDeleteLabCatalogItem, useComboCatalog, useCreateComboCatalogItem, useUpdateComboCatalogItem, useDeleteComboCatalogItem } from '../hooks/useLabResults'
import { useAppointmentStatuses, useCreateAppointmentStatus } from '../hooks/useAppointments'
import { useClinic, useUpdateClinic, useUploadClinicLogo, useLoginMessagingProvider, useLogoutMessagingProvider } from '../hooks/useSettings'
import { Icons } from '../components/Icons'
import SignatureCanvas from 'react-signature-canvas'
import type { DrugInput, Role, ClinicInput, User } from '../types'

const inputCls = 'w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <svg className="animate-spin w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
    </div>
  )
}

function SectionCard({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        {action}
      </div>
      <div>{children}</div>
    </div>
  )
}

function TableRow({ cells, actions }: { cells: ReactNode[]; actions?: ReactNode }) {
  return (
    <tr className="hover:bg-slate-50/70 transition-colors group border-b border-slate-50 last:border-0">
      {cells.map((cell, i) => (
        <td key={i} className="px-5 py-3.5 text-sm text-slate-700 first:pl-6 last:pr-6">{cell}</td>
      ))}
      {actions && <td className="px-5 py-3.5 pr-6 text-right">{actions}</td>}
    </tr>
  )
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const { t } = useTranslation()
  const [showAdd, setShowAdd] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [form, setForm] = useState({ username: '', email: '', password: '', role_id: '' })
  const { data: users, isLoading } = useUsers()
  const { data: roles } = useRoles()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (editingUserId) {
      await updateUser.mutateAsync({ id: editingUserId, data: { ...form, role_id: form.role_id ? Number(form.role_id) : null, is_active: true } })
    } else {
      await createUser.mutateAsync({ ...form, role_id: form.role_id ? Number(form.role_id) : null, is_active: true })
    }
    setForm({ username: '', email: '', password: '', role_id: '' })
    setShowAdd(false)
    setEditingUserId(null)
  }

  const [signatureUser, setSignatureUser] = useState<User | null>(null)
  const uploadSignature = useUploadSignature()
  const sigCanvas = useRef<any>(null)

  const handleSaveSignature = async () => {
    if (!sigCanvas.current || !signatureUser) return
    if (sigCanvas.current.isEmpty()) {
      alert("Please draw a signature first!")
      return
    }
    
    try {
      const canvas = sigCanvas.current.getCanvas()
      const dataUrl = canvas.toDataURL('image/png')
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      
      const file = new File([blob], `signature_${signatureUser.id}.png`, { type: 'image/png' })
      uploadSignature.mutate({ id: signatureUser.id, file }, {
        onSuccess: () => setSignatureUser(null)
      })
    } catch (e) {
      console.error("Failed to process signature canvas", e)
    }
  }

  // Manage Tabs
  const [tabsUser, setTabsUser] = useState<User | null>(null)
  const [selectedTabs, setSelectedTabs] = useState<string[]>([])
  const updateTabs = useUpdateUserTabs()
  const ALL_TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'patients', label: 'Patients' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'billing', label: 'Billing' },
    { id: 'labs', label: 'Labs' },
    { id: 'pharmacy', label: 'Pharmacy' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' }
  ]

  const handleSaveTabs = async () => {
    if (!tabsUser) return
    await updateTabs.mutateAsync({ id: tabsUser.id, tabs: selectedTabs })
    setTabsUser(null)
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title={t('settings.usersCount', { count: users?.length ?? 0 })}
        action={
          <button onClick={() => { setShowAdd((v) => !v); setEditingUserId(null); setForm({ username: '', email: '', password: '', role_id: '' }) }} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
            {Icons.plus} {t('settings.addUser')}
          </button>
        }
      >
        {showAdd && (
          <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-slate-100 bg-blue-50/40 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.username')} *</label>
              <input required className={inputCls} value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="johndoe" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.email')} *</label>
              <input required type="email" className={inputCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@clinic.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.password')} {!editingUserId && '*'}</label>
              <input required={!editingUserId} type="password" className={inputCls} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={editingUserId ? "(Leave blank to keep current)" : "••••••••"} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.role')}</label>
              <select className={inputCls} value={form.role_id} onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}>
                <option value="">{t('settings.noRole')}</option>
                {roles?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowAdd(false); setEditingUserId(null) }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">{t('common.cancel')}</button>
              <button type="submit" disabled={createUser.isPending || updateUser.isPending} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-60">
                {createUser.isPending || updateUser.isPending ? t('common.saving', 'Saving...') : (editingUserId ? t('common.save', 'Save Changes') : t('settings.addUser'))}
              </button>
            </div>
          </form>
        )}
        {isLoading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {[t('settings.username'), t('settings.email'), t('settings.role'), t('settings.colStatus'), ''].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6 last:pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <TableRow
                  key={u.id}
                  cells={[
                    <span className="font-medium text-slate-800">{u.username}</span>,
                    u.email,
                    u.role?.name ?? <span className="text-slate-300">—</span>,
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {u.is_active ? t('common.active') : t('common.inactive')}
                    </span>,
                  ]}
                  actions={
                    <div className="flex justify-end gap-3">
                      <button onClick={() => {
                        setEditingUserId(u.id)
                        setForm({ username: u.username, email: u.email || '', password: '', role_id: u.role_id ? String(u.role_id) : '' })
                        setShowAdd(true)
                      }} className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                        {t('common.edit', 'Edit')}
                      </button>
                      <button onClick={() => { setTabsUser(u); setSelectedTabs(u.visible_tabs || []) }} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
                        Manage Tabs
                      </button>
                      {(u.role?.name?.toLowerCase().includes('doctor') || u.role?.name?.toLowerCase().includes('lab')) && (
                        <button onClick={() => setSignatureUser(u)} className="text-xs text-blue-500 hover:text-blue-700 font-medium">
                          {u.signature_path ? 'Edit Signature' : 'Add Signature'}
                        </button>
                      )}
                      <button onClick={() => deleteUser.mutate(u.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">
                        {t('settings.deactivate')}
                      </button>
                    </div>
                  }
                />
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      {/* Signature Modal */}
      {signatureUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Draw Signature - {signatureUser.username}</h2>
              <button onClick={() => setSignatureUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 flex flex-col items-center justify-center bg-slate-50">
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden shadow-sm">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  canvasProps={{ width: 350, height: 150, className: 'sigCanvas cursor-crosshair' }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-3 text-center px-4">
                Please draw the signature inside the box. It will be cropped tightly around the edges to minimize size.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-between">
              <button
                type="button"
                onClick={() => sigCanvas.current?.clear()}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-xl bg-slate-100 transition-colors"
              >
                Clear
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSignatureUser(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSignature}
                  disabled={uploadSignature.isPending}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-60 transition-colors"
                >
                  {uploadSignature.isPending ? 'Saving...' : 'Save Signature'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Tabs Modal */}
      {tabsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Manage Tabs - {tabsUser.username}</h2>
              <button onClick={() => setTabsUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">Select which navigation tabs are visible to this user.</p>
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {ALL_TABS.map(tab => (
                  <label key={tab.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedTabs.includes(tab.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={selectedTabs.includes(tab.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTabs(prev => [...prev, tab.id])
                        else setSelectedTabs(prev => prev.filter(t => t !== tab.id))
                      }}
                    />
                    <span className={`text-sm font-medium ${selectedTabs.includes(tab.id) ? 'text-blue-700' : 'text-slate-700'}`}>
                      {tab.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTabsUser(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTabs}
                disabled={updateTabs.isPending}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-60 transition-colors"
              >
                {updateTabs.isPending ? 'Saving...' : 'Save Tabs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Roles & Permissions Tab ──────────────────────────────────────────────────
function RolesTab() {
  const { t } = useTranslation()
  const [showAddPerm, setShowAddPerm] = useState(false)
  const [showAddRole, setShowAddRole] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [permForm, setPermForm] = useState({ name: '', description: '' })
  const [roleForm, setRoleForm] = useState<{ name: string; permission_ids: number[] }>({ name: '', permission_ids: [] })

  const { data: permissions, isLoading: loadingPerms } = usePermissions()
  const { data: roles, isLoading: loadingRoles } = useRoles()
  const createPerm = useCreatePermission()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()

  const togglePerm = (id: number) => {
    setRoleForm((f) => ({
      ...f,
      permission_ids: f.permission_ids.includes(id)
        ? f.permission_ids.filter((x) => x !== id)
        : [...f.permission_ids, id],
    }))
  }

  const handleAddPerm = async (e: FormEvent) => {
    e.preventDefault()
    await createPerm.mutateAsync(permForm)
    setPermForm({ name: '', description: '' })
    setShowAddPerm(false)
  }

  const handleAddRole = async (e: FormEvent) => {
    e.preventDefault()
    if (editingRole) {
      await updateRole.mutateAsync({ id: editingRole.id, data: roleForm })
      setEditingRole(null)
    } else {
      await createRole.mutateAsync(roleForm)
    }
    setRoleForm({ name: '', permission_ids: [] })
    setShowAddRole(false)
  }

  const startEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleForm({ name: role.name, permission_ids: role.permissions.map((p) => p.id) })
    setShowAddRole(true)
  }

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Permissions */}
      <SectionCard
        title={t('settings.permissionsCount', { count: permissions?.length ?? 0 })}
        action={
          <button onClick={() => setShowAddPerm((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
            {Icons.plus} {t('common.add')}
          </button>
        }
      >
        {showAddPerm && (
          <form onSubmit={handleAddPerm} className="px-4 py-3 border-b border-slate-100 bg-blue-50/40 space-y-2">
            <input required className={inputCls} value={permForm.name} onChange={(e) => setPermForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('settings.permNamePlaceholder')} />
            <input className={inputCls} value={permForm.description} onChange={(e) => setPermForm((f) => ({ ...f, description: e.target.value }))} placeholder={t('settings.permDescPlaceholder')} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddPerm(false)} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">{t('common.cancel')}</button>
              <button type="submit" disabled={createPerm.isPending} className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-60">
                {createPerm.isPending ? t('common.adding') : t('common.add')}
              </button>
            </div>
          </form>
        )}
        {loadingPerms ? <Spinner /> : (
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {permissions?.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-mono font-semibold text-slate-700">{p.name}</p>
                  {p.description && <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>}
                </div>
              </div>
            ))}
            {permissions?.length === 0 && (
              <p className="px-5 py-4 text-sm text-slate-400">{t('settings.noPermissions')}</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Roles */}
      <SectionCard
        title={t('settings.rolesCount', { count: roles?.length ?? 0 })}
        action={
          <button onClick={() => { setShowAddRole((v) => !v); setEditingRole(null); setRoleForm({ name: '', permission_ids: [] }) }} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
            {Icons.plus} {t('settings.addRole')}
          </button>
        }
      >
        {showAddRole && (
          <form onSubmit={handleAddRole} className="px-4 py-3 border-b border-slate-100 bg-blue-50/40 space-y-3">
            <input required className={inputCls} value={roleForm.name} onChange={(e) => setRoleForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('settings.roleNamePlaceholder')} />
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">{t('settings.permissions')}</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {permissions?.map((p) => (
                  <label key={p.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                    roleForm.permission_ids.includes(p.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                    <input type="checkbox" className="hidden" checked={roleForm.permission_ids.includes(p.id)} onChange={() => togglePerm(p.id)} />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowAddRole(false); setEditingRole(null) }} className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg">{t('common.cancel')}</button>
              <button type="submit" className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                {editingRole ? t('settings.updateRoleBtn') : t('settings.createRoleBtn')}
              </button>
            </div>
          </form>
        )}
        {loadingRoles ? <Spinner /> : (
          <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
            {roles?.map((role) => (
              <div key={role.id} className="px-5 py-3 group flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{role.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {role.permissions.map((p) => (
                      <span key={p.id} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                        {p.name}
                      </span>
                    ))}
                    {role.permissions.length === 0 && <span className="text-xs text-slate-300">{t('settings.noPermissionsAssigned')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                  <button onClick={() => startEditRole(role)} className="text-xs text-blue-500 hover:text-blue-700">{t('common.edit')}</button>
                  <button onClick={() => deleteRole.mutate(role.id)} className="text-xs text-red-400 hover:text-red-600">{t('common.delete')}</button>
                </div>
              </div>
            ))}
            {roles?.length === 0 && (
              <p className="px-5 py-4 text-sm text-slate-400">{t('settings.noRoles')}</p>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ─── Drugs Tab ────────────────────────────────────────────────────────────────
const EMPTY_DRUG: DrugInput = { name: '', generic_name: '', form: '', strength: '', manufacturer: '', is_active: true }
type DrugTextField = 'name' | 'generic_name' | 'form' | 'strength' | 'manufacturer'

function DrugsTab() {
  const { t } = useTranslation()
  const [showAdd, setShowAdd] = useState(false)
  const [editingDrugId, setEditingDrugId] = useState<number | null>(null)
  const [form, setForm] = useState<DrugInput>(EMPTY_DRUG)
  const { data: drugs, isLoading } = useAllDrugs()
  const createDrug = useCreateDrug()
  const updateDrug = useUpdateDrug()

  const set = (k: DrugTextField) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (editingDrugId) {
      await updateDrug.mutateAsync({ id: editingDrugId, data: form })
    } else {
      await createDrug.mutateAsync(form)
    }
    setForm(EMPTY_DRUG)
    setShowAdd(false)
    setEditingDrugId(null)
  }

  return (
    <SectionCard
      title={t('settings.drugCatalogCount', { count: drugs?.length ?? 0 })}
      action={
        <button onClick={() => { setShowAdd((v) => !v); setEditingDrugId(null); setForm(EMPTY_DRUG); }} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
          {Icons.plus} {t('settings.addDrug')}
        </button>
      }
    >
      {showAdd && (
        <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-slate-100 bg-blue-50/40 grid grid-cols-3 gap-3">
          <div className="col-span-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.drugName')} *</label>
            <input required className={inputCls} value={form.name} onChange={set('name')} placeholder="e.g. Tylenol" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.genericName')}</label>
            <input className={inputCls} value={form.generic_name} onChange={set('generic_name')} placeholder="e.g. Acetaminophen" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.form')}</label>
            <select className={inputCls} value={form.form} onChange={set('form')}>
              <option value="">{t('settings.selectForm')}</option>
              {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops', 'Cream', 'Ointment', 'Inhaler', 'Patch'].map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.strength')}</label>
            <input className={inputCls} value={form.strength} onChange={set('strength')} placeholder="e.g. 500mg" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.manufacturer')}</label>
            <input className={inputCls} value={form.manufacturer} onChange={set('manufacturer')} placeholder="e.g. J&J" />
          </div>
          <div className="col-span-3 flex justify-end gap-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingDrugId(null); setForm(EMPTY_DRUG); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">{t('common.cancel')}</button>
            <button type="submit" disabled={createDrug.isPending || updateDrug.isPending} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-60">
              {createDrug.isPending || updateDrug.isPending ? t('common.saving', 'Saving...') : (editingDrugId ? t('common.save', 'Save Changes') : t('settings.addDrug'))}
            </button>
          </div>
        </form>
      )}
      {isLoading ? <Spinner /> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {[t('settings.colName'), t('settings.colGeneric'), t('settings.colForm'), t('settings.colStrength'), t('settings.colManufacturer'), ''].map((h, i) => (
                <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6 last:pr-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {drugs?.map((d) => (
              <TableRow
                key={d.id}
                cells={[
                  <span className="font-medium text-slate-800">{d.name}</span>,
                  d.generic_name || <span className="text-slate-300">—</span>,
                  d.form || <span className="text-slate-300">—</span>,
                  d.strength || <span className="text-slate-300">—</span>,
                  d.manufacturer || <span className="text-slate-300">—</span>,
                ]}
                actions={
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingDrugId(d.id)
                        setForm({
                          name: d.name,
                          generic_name: d.generic_name || '',
                          form: d.form || '',
                          strength: d.strength || '',
                          manufacturer: d.manufacturer || '',
                          is_active: d.is_active,
                        })
                        setShowAdd(true)
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      {t('common.edit', 'Edit')}
                    </button>
                    <button
                      onClick={() => updateDrug.mutate({
                        id: d.id,
                        data: {
                          name: d.name,
                          generic_name: d.generic_name ?? '',
                          form: d.form ?? '',
                          strength: d.strength ?? '',
                          manufacturer: d.manufacturer ?? '',
                          is_active: !d.is_active,
                        },
                      })}
                      className={`text-xs ${d.is_active ? 'text-red-400 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-700'}`}
                    >
                      {d.is_active ? t('settings.deactivate') : t('settings.activate')}
                    </button>
                  </div>
                }
              />
            ))}
            {drugs?.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-sm text-slate-400 text-center">{t('settings.noDrugs')}</td></tr>
            )}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}

// ─── Lab Catalog Tab ──────────────────────────────────────────────────────────
function LabCatalogTab() {
  const { t } = useTranslation()
  const [showAdd, setShowAdd] = useState(false)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', description: '', price: '' })
  const { data: catalog, isLoading } = useLabCatalog()
  const createItem = useCreateLabCatalogItem()
  const updateItem = useUpdateLabCatalogItem()
  const deleteItem = useDeleteLabCatalogItem()

  const [showAddCombo, setShowAddCombo] = useState(false)
  const [editingComboId, setEditingComboId] = useState<number | null>(null)
  const [comboForm, setComboForm] = useState<{name: string, price: string, test_ids: number[]}>({ name: '', price: '', test_ids: [] })
  const { data: comboCatalog, isLoading: isComboLoading } = useComboCatalog()
  const createCombo = useCreateComboCatalogItem()
  const updateCombo = useUpdateComboCatalogItem()
  const deleteCombo = useDeleteComboCatalogItem()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (editingItemId) {
      await updateItem.mutateAsync({ id: editingItemId, data: { name: form.name, description: form.description || null, price: Number(form.price) || 0, is_active: true } })
    } else {
      await createItem.mutateAsync({ name: form.name, description: form.description || null, price: Number(form.price) || 0, is_active: true })
    }
    setForm({ name: '', description: '', price: '' })
    setShowAdd(false)
    setEditingItemId(null)
  }

  const handleComboSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (editingComboId) {
      await updateCombo.mutateAsync({ id: editingComboId, data: { name: comboForm.name, price: Number(comboForm.price) || 0, test_ids: comboForm.test_ids, is_active: true } })
    } else {
      await createCombo.mutateAsync({ name: comboForm.name, price: Number(comboForm.price) || 0, test_ids: comboForm.test_ids, is_active: true })
    }
    setComboForm({ name: '', price: '', test_ids: [] })
    setShowAddCombo(false)
    setEditingComboId(null)
  }

  return (
    <div className="space-y-6">
      <SectionCard
      title={t('settings.labCatalogCount', { count: catalog?.length ?? 0 })}
      action={
        <button onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
          {Icons.plus} {t('settings.addTest')}
        </button>
      }
    >
      {showAdd && (
        <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-slate-100 bg-blue-50/40 grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.testName')} *</label>
            <input required className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Complete Blood Count" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.price')}</label>
            <input type="number" step="0.01" className={inputCls} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.description')}</label>
            <input className={inputCls} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder={t('settings.descriptionPlaceholder')} />
          </div>
          <div className="col-span-3 flex justify-end gap-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingItemId(null); setForm({ name: '', description: '', price: '' }); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">{t('common.cancel')}</button>
            <button type="submit" disabled={createItem.isPending || updateItem.isPending} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-60">
              {createItem.isPending || updateItem.isPending ? t('common.saving', 'Saving...') : (editingItemId ? t('common.save', 'Save Changes') : t('settings.addTest'))}
            </button>
          </div>
        </form>
      )}
      {isLoading ? <Spinner /> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {[t('settings.colTestName'), t('settings.colDescription'), t('settings.colPrice'), t('settings.colStatus')].map((h, i) => (
                <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catalog?.map((item) => (
              <TableRow
                key={item.id}
                cells={[
                  <span className="font-medium text-slate-800">{item.name}</span>,
                  item.description || <span className="text-slate-300">—</span>,
                  item.price > 0 ? `₹${item.price.toFixed(2)}` : <span className="text-slate-300">{t('common.free')}</span>,
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {item.is_active ? t('common.active') : t('common.inactive')}
                  </span>,
                ]}
                actions={
                  <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingItemId(item.id)
                        setForm({
                          name: item.name,
                          description: item.description || '',
                          price: item.price ? String(item.price) : '',
                        })
                        setShowAdd(true)
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      {t('common.edit', 'Edit')}
                    </button>
                    <button
                      onClick={() => updateItem.mutate({
                        id: item.id,
                        data: {
                          name: item.name,
                          description: item.description || null,
                          price: item.price || 0,
                          is_active: !item.is_active,
                        },
                      })}
                      className={`text-xs ${item.is_active ? 'text-red-400 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-700'}`}
                    >
                      {item.is_active ? t('settings.deactivate', 'Deactivate') : t('settings.activate', 'Activate')}
                    </button>
                  </div>
                }
              />
            ))}
              {catalog?.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-sm text-slate-400 text-center">{t('settings.noLabTests')}</td></tr>
              )}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard
        title={`Combo Lab Tests (${comboCatalog?.length ?? 0})`}
        action={
          <button onClick={() => setShowAddCombo((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
            {Icons.plus} Add Combo Test
          </button>
        }
      >
        {showAddCombo && (
          <form onSubmit={handleComboSubmit} className="px-6 py-4 border-b border-slate-100 bg-blue-50/40 grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Combo Name *</label>
              <input required className={inputCls} value={comboForm.name} onChange={(e) => setComboForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. General Health Panel" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.price')}</label>
              <input type="number" step="0.01" className={inputCls} value={comboForm.price} onChange={(e) => setComboForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="col-span-3 flex flex-col gap-1.5 mt-2">
              <label className="block text-xs font-semibold text-slate-600">Select Individual Tests</label>
              <div className="flex flex-wrap gap-2">
                {catalog?.map(test => (
                  <label key={test.id} className="flex items-center gap-1.5 text-sm text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" checked={comboForm.test_ids.includes(test.id)} onChange={(e) => {
                      setComboForm(f => ({
                        ...f,
                        test_ids: e.target.checked ? [...f.test_ids, test.id] : f.test_ids.filter(id => id !== test.id)
                      }))
                    }} className="accent-blue-600" />
                    {test.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-3 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => { setShowAddCombo(false); setEditingComboId(null); setComboForm({ name: '', price: '', test_ids: [] }); }} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">{t('common.cancel')}</button>
              <button type="submit" disabled={createCombo.isPending || updateCombo.isPending || comboForm.test_ids.length === 0} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-60">
                {createCombo.isPending || updateCombo.isPending ? t('common.saving', 'Saving...') : (editingComboId ? t('common.save', 'Save Changes') : 'Add Combo Test')}
              </button>
            </div>
          </form>
        )}
        {isComboLoading ? <Spinner /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6">Combo Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Price</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {comboCatalog?.map((item) => (
                <TableRow
                  key={item.id}
                  cells={[
                    <span className="font-medium text-slate-800">{item.name}</span>,
                    item.price > 0 ? `₹${item.price.toFixed(2)}` : <span className="text-slate-300">{t('common.free')}</span>,
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {item.is_active ? t('common.active') : t('common.inactive')}
                    </span>,
                  ]}
                  actions={
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingComboId(item.id)
                          setComboForm({
                            name: item.name,
                            price: item.price ? String(item.price) : '',
                            test_ids: item.test_ids,
                          })
                          setShowAddCombo(true)
                        }}
                        className="text-xs text-blue-500 hover:text-blue-700"
                      >
                        {t('common.edit', 'Edit')}
                      </button>
                      <button
                        onClick={() => updateCombo.mutate({
                          id: item.id,
                          data: {
                            name: item.name,
                            price: item.price || 0,
                            test_ids: item.test_ids,
                            is_active: !item.is_active,
                          },
                        })}
                        className={`text-xs ${item.is_active ? 'text-red-400 hover:text-red-600' : 'text-emerald-500 hover:text-emerald-700'}`}
                      >
                        {item.is_active ? t('settings.deactivate', 'Deactivate') : t('settings.activate', 'Activate')}
                      </button>
                    </div>
                  }
                />
              ))}
              {comboCatalog?.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-sm text-slate-400 text-center">No combo tests found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  )
}

// ─── Appointment Statuses Tab ─────────────────────────────────────────────────
function ApptStatusesTab() {
  const { t } = useTranslation()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', color: '#3b82f6' })
  const { data: statuses, isLoading } = useAppointmentStatuses()
  const createStatus = useCreateAppointmentStatus()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    await createStatus.mutateAsync({ name: form.name, color: form.color, is_active: 1 })
    setForm({ name: '', color: '#3b82f6' })
    setShowAdd(false)
  }

  return (
    <SectionCard
      title={t('settings.statusesCount', { count: statuses?.length ?? 0 })}
      action={
        <button onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
          {Icons.plus} {t('settings.addStatus')}
        </button>
      }
    >
      {showAdd && (
        <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-slate-100 bg-blue-50/40 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.statusName')} *</label>
            <input required className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('settings.statusNamePlaceholder')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.color')}</label>
            <input type="color" className="h-10 w-16 border border-slate-300 rounded-xl cursor-pointer" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
          </div>
          <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">{t('common.cancel')}</button>
          <button type="submit" disabled={createStatus.isPending} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-60">
            {createStatus.isPending ? t('common.adding') : t('common.add')}
          </button>
        </form>
      )}
      {isLoading ? <Spinner /> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {[t('settings.colStatusName'), t('settings.colColor'), t('settings.colActive')].map((h, i) => (
                <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statuses?.map((s) => (
              <TableRow
                key={s.id}
                cells={[
                  <span className="font-medium text-slate-800">{s.name}</span>,
                  s.color ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ background: s.color }} />
                      <span className="text-xs text-slate-400 font-mono">{s.color}</span>
                    </span>
                  ) : <span className="text-slate-300">—</span>,
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {s.is_active ? t('common.active') : t('common.inactive')}
                  </span>,
                ]}
              />
            ))}
            {statuses?.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-8 text-sm text-slate-400 text-center">{t('settings.noStatuses')}</td></tr>
            )}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
type TabKey = 'users' | 'roles' | 'drugs' | 'lab' | 'statuses' | 'clinic'

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'users', labelKey: 'settings.tabUsers' },
  { key: 'roles', labelKey: 'settings.tabRoles' },
  { key: 'drugs', labelKey: 'settings.tabDrugs' },
  { key: 'lab', labelKey: 'settings.tabLab' },
  { key: 'statuses', labelKey: 'settings.tabStatuses' },
  { key: 'clinic', labelKey: 'settings.tabClinic' },
]

export default function SettingsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabKey>('users')

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900">{t('settings.title')}</h1>
        <p className="text-sm text-slate-400 mt-0.5">{t('settings.subtitle')}</p>
      </div>

      <div className="flex items-center gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'roles' && <RolesTab />}
      {activeTab === 'drugs' && <DrugsTab />}
      {activeTab === 'lab' && <LabCatalogTab />}
      {activeTab === 'statuses' && <ApptStatusesTab />}
      {activeTab === 'clinic' && <ClinicTab />}
    </div>
  )
}

// ─── Clinic Settings Tab ────────────────────────────────────────────────────────
function ClinicTab() {
  const { t } = useTranslation()
  const { data: clinic, isLoading } = useClinic()
  const updateClinic = useUpdateClinic()
  const uploadLogo = useUploadClinicLogo()
  const loginMessaging = useLoginMessagingProvider()
  const logoutMessaging = useLogoutMessagingProvider()

  const [form, setForm] = useState<ClinicInput | null>(null)
  
  // Messaging auth form state
  const [messagingEmail, setMessagingEmail] = useState('')
  const [messagingPassword, setMessagingPassword] = useState('')
  const [messagingExpiresIn, setMessagingExpiresIn] = useState('30d')

  // Initialize form when clinic data arrives
  if (clinic && form === null) {
    setForm({
      name: clinic.name || '',
      address: clinic.address || '',
      support_email: clinic.support_email || '',
      phone: clinic.phone || '',
      whatsapp: clinic.whatsapp || '',
      website: clinic.website || '',
      app_link: clinic.app_link || '',
      notification_settings: clinic.notification_settings || {
        send_prescription: { whatsapp: false },
        send_followup_reminder: { sms: false, whatsapp: false, days_early: 1 },
        send_lab_report: { whatsapp: false },
        appointment_schedule: { sms: false, whatsapp: false },
        next_appointment_schedule: { sms: false, whatsapp: false },
        treatment_reminder: { sms: false, whatsapp: false }
      }
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    await updateClinic.mutateAsync(form)
    alert(t('common.saved', 'Saved successfully'))
  }

  const setField = (field: keyof ClinicInput) => (e: ChangeEvent<HTMLInputElement>) => {
    if (form) setForm({ ...form, [field]: e.target.value })
  }

  const setNestedField = (category: keyof NonNullable<ClinicInput['notification_settings']>, field: string, value: any) => {
    if (form) {
      const currentSettings: any = form.notification_settings || {
        send_prescription: { whatsapp: false },
        send_followup_reminder: { sms: false, whatsapp: false, days_early: 1 },
        send_lab_report: { whatsapp: false },
        appointment_schedule: { sms: false, whatsapp: false },
        next_appointment_schedule: { sms: false, whatsapp: false },
        treatment_reminder: { sms: false, whatsapp: false }
      }
      setForm({
        ...form,
        notification_settings: {
          ...currentSettings,
          [category]: {
            ...(currentSettings[category] || {}),
            [field]: value
          }
        }
      })
    }
  }

  const Toggle = ({ checked, onChange, label }: { checked: boolean, onChange: (val: boolean) => void, label: string }) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className="relative inline-flex items-center">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </label>
  )

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              reject(new Error('Compression failed'));
            }
          }, 'image/jpeg', 0.8);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressedFile = await compressImage(file)
      await uploadLogo.mutateAsync(compressedFile)
      alert(t('common.saved', 'Logo uploaded successfully'))
    } catch (err) {
      alert(t('common.error', 'Failed to upload logo'))
    }
  }

  if (isLoading || !form) return <Spinner />

  return (
    <SectionCard title={t('settings.clinicDetails', 'Clinic Details')}>
      <div className="p-6 border-b border-slate-100 flex items-center gap-6">
        <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
          {clinic?.logo_path ? (
            <img src={`/api/${clinic.logo_path.replace(/\\/g, '/')}`} alt="Clinic Logo" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <div className="text-slate-400 w-10 h-10">{Icons.heartbeat}</div>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-800">{t('settings.clinicLogo', 'Clinic Logo')}</h4>
          <p className="text-xs text-slate-500 mt-1 mb-3 max-w-sm">
            {t('settings.clinicLogoHelp', 'Upload a logo to display in the application header and on printed reports.')}
          </p>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            {uploadLogo.isPending ? t('common.uploading', 'Uploading...') : t('settings.uploadLogo', 'Upload Logo')}
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={uploadLogo.isPending} />
          </label>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.clinicName', 'Clinic Name')}</label>
            <input required className={inputCls} value={form.name} onChange={setField('name')} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.address', 'Address')}</label>
            <input required className={inputCls} value={form.address} onChange={setField('address')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.supportEmail', 'Support Email')}</label>
            <input type="email" className={inputCls} value={form.support_email} onChange={setField('support_email')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.phone', 'Phone')}</label>
            <input type="tel" className={inputCls} value={form.phone} onChange={setField('phone')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.whatsapp', 'WhatsApp')}</label>
            <input type="tel" className={inputCls} value={form.whatsapp} onChange={setField('whatsapp')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.website', 'Website')}</label>
            <input type="url" className={inputCls} value={form.website} onChange={setField('website')} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.appLink', 'App Link')}</label>
            <input type="url" className={inputCls} value={form.app_link} onChange={setField('app_link')} />
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-800">{t('settings.notificationSettings', 'Notification Settings')}</h4>
            {clinic?.is_messaging_authenticated && (
              <button 
                type="button" 
                onClick={async () => {
                  if (confirm(t('settings.confirmDisconnect', 'Are you sure you want to disconnect the messaging provider?'))) {
                    await logoutMessaging.mutateAsync()
                    alert(t('settings.disconnected', 'Messaging provider disconnected'))
                  }
                }}
                disabled={logoutMessaging.isPending}
                className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                {logoutMessaging.isPending ? t('common.disconnecting', 'Disconnecting...') : t('settings.disconnectProvider', 'Disconnect Provider')}
              </button>
            )}
          </div>
          
          {!clinic?.is_messaging_authenticated ? (
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-4 max-w-md">
              <h5 className="text-sm font-semibold text-slate-800">{t('settings.connectProvider', 'Connect Messaging Provider')}</h5>
              <p className="text-xs text-slate-500">{t('settings.connectProviderDesc', 'Please login to enable SMS and WhatsApp notifications.')}</p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('common.email', 'Email')}</label>
                  <input type="email" required className={inputCls} value={messagingEmail} onChange={e => setMessagingEmail(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('common.password', 'Password')}</label>
                  <input type="password" required className={inputCls} value={messagingPassword} onChange={e => setMessagingPassword(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('settings.expiresIn', 'Expires In')}</label>
                  <select className={inputCls} value={messagingExpiresIn} onChange={e => setMessagingExpiresIn(e.target.value)}>
                    <option value="30d">30 Days</option>
                    <option value="1y">1 Year</option>
                    <option value="never">Never Expires</option>
                  </select>
                </div>
                <button 
                  type="button"
                  disabled={loginMessaging.isPending || !messagingEmail || !messagingPassword}
                  onClick={async () => {
                    try {
                      await loginMessaging.mutateAsync({ email: messagingEmail, password: messagingPassword, expires_in: messagingExpiresIn })
                      alert(t('settings.connected', 'Messaging provider connected successfully'))
                    } catch (err: any) {
                      alert(err.response?.data?.detail || t('common.error', 'Failed to connect'))
                    }
                  }}
                  className="w-full px-4 py-2 mt-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-60 transition-colors"
                >
                  {loginMessaging.isPending ? t('common.connecting', 'Connecting...') : t('settings.connect', 'Connect')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <span className="text-sm font-semibold text-slate-700">Send Prescription</span>
              <div className="flex items-center gap-6">
                <Toggle checked={form.notification_settings?.send_prescription?.whatsapp || false} onChange={(v) => setNestedField('send_prescription', 'whatsapp', v)} label="WhatsApp" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <span className="text-sm font-semibold text-slate-700">Followup Reminder</span>
              <div className="flex flex-wrap items-center gap-6">
                <Toggle checked={form.notification_settings?.send_followup_reminder?.sms || false} onChange={(v) => setNestedField('send_followup_reminder', 'sms', v)} label="SMS" />
                <Toggle checked={form.notification_settings?.send_followup_reminder?.whatsapp || false} onChange={(v) => setNestedField('send_followup_reminder', 'whatsapp', v)} label="WhatsApp" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">Days early:</span>
                  <input type="number" min="1" max="30" className="w-16 border border-slate-300 rounded px-2 py-1 text-sm bg-white" value={form.notification_settings?.send_followup_reminder?.days_early || 1} onChange={(e) => setNestedField('send_followup_reminder', 'days_early', Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <span className="text-sm font-semibold text-slate-700">Lab Report</span>
              <div className="flex items-center gap-6">
                <Toggle checked={form.notification_settings?.send_lab_report?.whatsapp || false} onChange={(v) => setNestedField('send_lab_report', 'whatsapp', v)} label="WhatsApp" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <span className="text-sm font-semibold text-slate-700">Appointment Schedule</span>
              <div className="flex items-center gap-6">
                <Toggle checked={form.notification_settings?.appointment_schedule?.sms || false} onChange={(v) => setNestedField('appointment_schedule', 'sms', v)} label="SMS" />
                <Toggle checked={form.notification_settings?.appointment_schedule?.whatsapp || false} onChange={(v) => setNestedField('appointment_schedule', 'whatsapp', v)} label="WhatsApp" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <span className="text-sm font-semibold text-slate-700">Next Appointment Schedule Date</span>
              <div className="flex items-center gap-6">
                <Toggle checked={form.notification_settings?.next_appointment_schedule?.sms || false} onChange={(v) => setNestedField('next_appointment_schedule', 'sms', v)} label="SMS" />
                <Toggle checked={form.notification_settings?.next_appointment_schedule?.whatsapp || false} onChange={(v) => setNestedField('next_appointment_schedule', 'whatsapp', v)} label="WhatsApp" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
              <span className="text-sm font-semibold text-slate-700">Treatment Reminder (If Due)</span>
              <div className="flex items-center gap-6">
                <Toggle checked={form.notification_settings?.treatment_reminder?.sms || false} onChange={(v) => setNestedField('treatment_reminder', 'sms', v)} label="SMS" />
                <Toggle checked={form.notification_settings?.treatment_reminder?.whatsapp || false} onChange={(v) => setNestedField('treatment_reminder', 'whatsapp', v)} label="WhatsApp" />
              </div>
            </div>
          </div>
          )}
        </div>

        <div className="pt-4 flex justify-end">
          <button type="submit" disabled={updateClinic.isPending} className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-60">
            {updateClinic.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save Changes')}
          </button>
        </div>
      </form>
    </SectionCard>
  )
}
