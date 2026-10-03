import { useState, useRef, useEffect } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  useUsers, useCreateUser, useUpdateUser, useDeleteUser, useUploadSignature,
  useRoles, useCreateRole, useUpdateRole, useDeleteRole,
  usePermissions, useCreatePermission, useUpdateUserTabs
} from '../hooks/useUsers'
import { useAllDrugs, useCreateDrug, useUpdateDrug } from '../hooks/useDrugs'
import { useLabCatalog, useCreateLabCatalogItem, useUpdateLabCatalogItem, useDeleteLabCatalogItem, useComboCatalog, useCreateComboCatalogItem, useUpdateComboCatalogItem, useDeleteComboCatalogItem } from '../hooks/useLabResults'
import { useAppointmentStatuses, useCreateAppointmentStatus } from '../hooks/useAppointments'
import { useClinic, useUpdateClinic, useUploadClinicLogo, useLoginMessagingProvider, useLogoutMessagingProvider, useSyncTemplates, useTemplates, useMessageBalance } from '../hooks/useSettings'
import { useConnectLIS, useDisconnectLIS, useLISStatus, useCheckLISHealth } from '../hooks/useLISIntegration'
import { Icons } from '../components/Icons'
import SignatureCanvas from 'react-signature-canvas'
import ClinicHolidaysSettings from '../components/ClinicHolidaysSettings'
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
  const lisStatus = useLISStatus()
  const lisConnected = !!lisStatus.data?.connected
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
        !lisConnected && <button onClick={() => setShowAdd((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
          {Icons.plus} {t('settings.addTest')}
        </button>
      }
    >
      {lisConnected && <p className="mx-6 mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">This catalog is provided by the connected LIS. Manage tests and combos in the LIS.</p>}
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
                actions={!lisConnected && (
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
                )}
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
          !lisConnected && <button onClick={() => setShowAddCombo((v) => !v)} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
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
                  actions={!lisConnected && (
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
                  )}
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
type TabKey = 'users' | 'roles' | 'drugs' | 'lab' | 'statuses' | 'clinic' | 'lis' | 'holidays'

const TABS: { key: TabKey; labelKey: string }[] = [
  { key: 'users', labelKey: 'settings.tabUsers' },
  { key: 'roles', labelKey: 'settings.tabRoles' },
  { key: 'drugs', labelKey: 'settings.tabDrugs' },
  { key: 'lab', labelKey: 'settings.tabLab' },
  { key: 'statuses', labelKey: 'settings.tabStatuses' },
  { key: 'holidays', labelKey: 'Holidays & Weekly Days Off' },
  { key: 'clinic', labelKey: 'settings.tabClinic' },
  { key: 'lis', labelKey: 'settings.tabLis' },
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
      {activeTab === 'holidays' && <ClinicHolidaysSettings />}
      {activeTab === 'clinic' && <ClinicTab />}
      {activeTab === 'lis' && <LisIntegrationTab />}
    </div>
  )
}

function LisIntegrationTab() {
  const status = useLISStatus()
  const connect = useConnectLIS()
  const disconnect = useDisconnectLIS()
  const checkHealth = useCheckLISHealth()
  const [form, setForm] = useState({ host: '', api_key: '' })
  const [keyValidation, setKeyValidation] = useState<string | null>(null)

  useEffect(() => {
    if (status.data?.host) setForm(current => ({ ...current, host: status.data!.host! }))
  }, [status.data?.host])

  const handleApiKeyChange = (value: string) => {
    const trimmed = value.trim()
    setForm(current => ({ ...current, api_key: trimmed }))
    if (!trimmed) {
      setKeyValidation(null)
    } else if (trimmed.startsWith('ey') || (trimmed.match(/\./g) || []).length >= 2) {
      setKeyValidation('JWT token detected. Please paste the dedicated integration API key (starts with "lis_"), not a user JWT token.')
    } else if (!trimmed.startsWith('lis_')) {
      setKeyValidation('Invalid key format. An integration API key must start with "lis_".')
    } else {
      setKeyValidation(null)
    }
  }

  const handleConnect = async (event: FormEvent) => {
    event.preventDefault()
    if (keyValidation) return
    await connect.mutateAsync(form)
    setForm(current => ({ ...current, api_key: '' }))
  }

  const renderStatusBadge = () => {
    if (!status.data) return null
    const s = status.data.status
    if (s === 'CONNECTED' || status.data.connected) {
      return (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <strong>Connected to LIS</strong>
            </div>
            <button
              type="button"
              disabled={checkHealth.isPending}
              onClick={() => checkHealth.mutate()}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors disabled:opacity-50"
            >
              {checkHealth.isPending ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
          <div className="mt-2 text-xs space-y-1 text-emerald-700">
            <div><span className="font-semibold">Host:</span> <span className="font-mono">{status.data.host}</span></div>
            {status.data.account && <div><span className="font-semibold">Account / Clinic:</span> {status.data.account}</div>}
            {status.data.last_checked && <div><span className="font-semibold">Last Checked:</span> {new Date(status.data.last_checked).toLocaleTimeString()}</div>}
          </div>
        </div>
      )
    }
    if (s === 'TEMPORARILY_UNAVAILABLE') {
      return (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <strong>LIS Temporarily Unavailable</strong>
            </div>
            <button
              type="button"
              disabled={checkHealth.isPending}
              onClick={() => checkHealth.mutate()}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors disabled:opacity-50"
            >
              {checkHealth.isPending ? 'Retesting...' : 'Test Connection'}
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-700">
            Configured host is currently unreachable. Network timeout or LIS service down. Existing patient links and orders are safely preserved.
          </p>
        </div>
      )
    }
    if (s === 'KEY_REJECTED') {
      return (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="status">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <strong>Integration Key Rejected</strong>
          </div>
          <p className="mt-2 text-xs text-rose-700">
            Key has been revoked or expired. Please generate a new key in LIS Settings → EMR Integration and update credentials below. Existing patient mappings are safely preserved.
          </p>
        </div>
      )
    }
    if (s === 'INCOMPATIBLE') {
      return (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="status">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <strong>Incompatible LIS Version</strong>
          </div>
          <p className="mt-2 text-xs text-rose-700">
            Connected LIS capabilities do not satisfy minimum requirements for order fulfillment and package catalog.
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="max-w-3xl space-y-5">
      <SectionCard title="Connect a Laboratory Information System (LIS)">
        <p className="text-sm text-slate-500 mb-5">
          Enter the LIS host and a long-lived integration API key. Create the key in LIS Settings → EMR Integration. The EMR stores it encrypted and loads the lab’s catalog automatically.
        </p>

        {renderStatusBadge()}

        <form onSubmit={handleConnect} className="space-y-5">
          <label className="block text-sm font-medium text-slate-700">LIS host
            <input type="url" required value={form.host} onChange={event => setForm({ ...form, host: event.target.value })} placeholder="https://lis.yourclinic.com" className={`${inputCls} mt-1`} />
            <span className="block mt-1 text-xs text-slate-400">Enter the LIS website host. The API address is detected automatically.</span>
          </label>
          <label className="block text-sm font-medium text-slate-700">LIS integration API key
            <input
              type="password"
              required
              autoComplete="new-password"
              value={form.api_key}
              onChange={event => handleApiKeyChange(event.target.value)}
              className={`${inputCls} mt-1 font-mono ${keyValidation ? 'border-rose-400 focus:ring-rose-400' : ''}`}
            />
            {keyValidation ? (
              <span className="block mt-1 text-xs text-rose-600 font-medium">{keyValidation}</span>
            ) : (
              <span className="block mt-1 text-xs text-slate-400">Must start with <code className="text-slate-600 font-mono">lis_</code>. Revoke or rotate the key from LIS Settings whenever access should change.</span>
            )}
          </label>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">Safe Rotation & Disconnection:</span> Disconnecting will remove the active connection. Saved external patient mappings and past orders are retained, so reconnecting with a valid key will restore full functionality without re-mapping patients.
          </div>

          <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4">
            {status.data?.connected ? (
              <Link to="/labs" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Continue to Lab Results
              </Link>
            ) : <span />}
            <div className="flex gap-2">
              {status.data?.configured && (
                <button
                  type="button"
                  disabled={disconnect.isPending}
                  onClick={() => disconnect.mutate()}
                  className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  {disconnect.isPending ? 'Disconnecting…' : 'Disconnect LIS'}
                </button>
              )}
              <button
                type="submit"
                disabled={connect.isPending || !!keyValidation}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {connect.isPending ? 'Verifying connection…' : status.data?.configured ? 'Update Key / Reconnect' : 'Connect LIS'}
              </button>
            </div>
          </div>
          {connect.isError && <p role="alert" className="text-sm text-rose-600">{(connect.error as any)?.response?.data?.detail || 'Could not connect to LIS. Verify the host, login, and network access.'}</p>}
          {status.isError && <p role="alert" className="text-sm text-rose-600">Could not load LIS connection status.</p>}
        </form>
      </SectionCard>
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
  const syncTemplates = useSyncTemplates()
  const { data: templates } = useTemplates(!!clinic?.is_messaging_authenticated)
  const { data: balanceData } = useMessageBalance(!!clinic?.is_messaging_authenticated)

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
    setForm(prev => prev ? { ...prev, [field]: e.target.value } : prev)
  }

  const setNestedField = (category: keyof NonNullable<ClinicInput['notification_settings']> | 'sms_sender_id', field: string, value: any) => {
    setForm(prev => {
      if (!prev) return prev;
      if (category === 'sms_sender_id') {
        return {
          ...prev,
          notification_settings: {
            ...(prev.notification_settings || {}),
            sms_sender_id: value
          }
        }
      }

      const currentSettings: any = prev.notification_settings || {
        send_prescription: { whatsapp: false },
        send_followup_reminder: { sms: false, whatsapp: false, days_early: 1 },
        send_lab_report: { whatsapp: false },
        appointment_schedule: { sms: false, whatsapp: false },
        next_appointment_schedule: { sms: false, whatsapp: false },
        treatment_reminder: { sms: false, whatsapp: false }
      }
      return {
        ...prev,
        notification_settings: {
          ...currentSettings,
          [category]: {
            ...(currentSettings[category] || {}),
            [field]: value
          }
        }
      }
    })
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

  const AVAILABLE_INTERNAL_FIELDS = [
    { value: 'patient_name', label: 'Patient Name' },
    { value: 'doctor_name', label: 'Doctor Name' },
    { value: 'clinic_name', label: 'Clinic Name' },
    { value: 'appointment_date', label: 'Appointment Date' },
    { value: 'appointment_time', label: 'Appointment Time' },
    { value: 'followup_date', label: 'Follow-up Date' },
    { value: 'prescription_pdf_url', label: 'Prescription PDF Link' },
    { value: 'lab_report_pdf_url', label: 'Lab Report PDF Link' },
  ]

  const TemplateSettings = ({ title, category, showSms = true, showWhatsapp = true, extraContent = null }: any) => {
    const currentSettings = form?.notification_settings?.[category] || {}

    const handleMapChange = (templateVar: string, internalField: string) => {
      const currentMap = currentSettings.whatsapp_variable_map || {}
      setNestedField(category, 'whatsapp_variable_map', { ...currentMap, [templateVar]: internalField })
    }

    let waTemplateVars: string[] = []
    if (currentSettings.whatsapp_template_id && templates?.whatsapp) {
      const t = (Array.isArray(templates.whatsapp) ? templates.whatsapp : templates.whatsapp.data || []).find((x: any) => String(x.template_id || x.id) === String(currentSettings.whatsapp_template_id))
      if (t?.body || t?.content) {
        const bodyText = t.body || t.content
        const matches = bodyText.match(/\{\{([^}]+)\}\}/g)
        if (matches) {
          waTemplateVars = [...new Set(matches.map((m: string) => m.replace(/[{}]/g, '')))] as string[]
        }
      }
    }

    const smsTemplatesList = Array.isArray(templates?.sms?.data)
      ? templates.sms.data.flatMap((sender: any) => sender.templates || [])
      : []
    const waTemplatesList = Array.isArray(templates?.whatsapp) ? templates.whatsapp : templates?.whatsapp?.data || templates?.whatsapp?.templates || []

    return (
      <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          {extraContent}
        </div>

        {showSms && (
          <div className="flex flex-col gap-3 p-3 bg-white border border-slate-200 rounded-lg">
            <Toggle checked={currentSettings.sms || false} onChange={(v) => setNestedField(category, 'sms', v)} label="Enable SMS" />
            {currentSettings.sms && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">SMS Template</label>
                  <select className={inputCls} value={currentSettings.sms_template_id || ''} onChange={(e) => {
                    const val = e.target.value
                    setNestedField(category, 'sms_template_id', val)
                    const selectedTmpl = smsTemplatesList.find((t: any) => (t.uuid || String(t.message_id)) === val)
                    if (selectedTmpl && selectedTmpl.message_id) {
                      setNestedField(category, 'sms_message_id', String(selectedTmpl.message_id))
                    }
                  }}>
                    <option value="">Select Template...</option>
                    {smsTemplatesList.map((t: any) => {
                      const val = t.uuid || String(t.message_id);
                      const label = t.message ? (t.message.length > 50 ? t.message.substring(0, 50) + '...' : t.message) : val;
                      return <option key={val} value={val}>{t.message_id ? `${t.message_id} - ` : ''}{label}</option>
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Message ID</label>
                  <input type="text" className={inputCls} value={currentSettings.sms_message_id || ''} onChange={(e) => setNestedField(category, 'sms_message_id', e.target.value)} placeholder="e.g. 12564" />
                </div>
              </div>
            )}
          </div>
        )}

        {showWhatsapp && (
          <div className="flex flex-col gap-3 p-3 bg-white border border-slate-200 rounded-lg">
            <Toggle checked={currentSettings.whatsapp || false} onChange={(v) => setNestedField(category, 'whatsapp', v)} label="Enable WhatsApp" />
            {currentSettings.whatsapp && (
              <div className="mt-2 flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp Template</label>
                  <select className={inputCls} value={currentSettings.whatsapp_template_id || ''} onChange={(e) => {
                    setNestedField(category, 'whatsapp_template_id', e.target.value)
                    setNestedField(category, 'whatsapp_variable_map', {})
                  }}>
                    <option value="">Select Template...</option>
                    {waTemplatesList.map((t: any) => {
                      const val = t.template_id || t.id;
                      return <option key={val} value={val}>{t.name} ({t.language})</option>
                    })}
                  </select>
                </div>

                {currentSettings.whatsapp_template_id && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Media URL (Optional)</label>
                    <select className={inputCls} value={currentSettings.whatsapp_media_url || ''} onChange={(e) => setNestedField(category, 'whatsapp_media_url', e.target.value)}>
                      <option value="">None</option>
                      {AVAILABLE_INTERNAL_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {waTemplateVars.length > 0 && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2">
                    <span className="text-xs font-semibold text-slate-600">Map Template Variables</span>
                    {waTemplateVars.map((v: string) => (
                      <div key={v} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-24 whitespace-nowrap overflow-hidden text-ellipsis font-mono">{`{{${v}}}`}</span>
                        <select className={`${inputCls} !py-1 !text-xs`} value={currentSettings.whatsapp_variable_map?.[v] || ''} onChange={(e) => handleMapChange(v, e.target.value)}>
                          <option value="">Select Field...</option>
                          {AVAILABLE_INTERNAL_FIELDS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

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
            <img src="/logo.png" alt="Default SKFB logo" className="w-full h-full object-contain" />
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
              <div className="flex items-center gap-3">
                {balanceData && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700">
                    Balance: {balanceData.remaining_messages ?? balanceData.balance ?? balanceData.credits ?? JSON.stringify(balanceData)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await syncTemplates.mutateAsync()
                      alert('Templates synced successfully')
                    } catch (err) {
                      alert('Failed to sync templates')
                    }
                  }}
                  disabled={syncTemplates.isPending}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {syncTemplates.isPending ? 'Syncing...' : 'Sync Templates'}
                </button>
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
              </div>
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

              <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Global SMS Sender ID</label>
                <input
                  type="text"
                  className={inputCls}
                  value={form.notification_settings?.sms_sender_id || ''}
                  onChange={(e) => setNestedField('sms_sender_id', '', e.target.value)}
                  placeholder="e.g. SKFBMR"
                />
                <p className="text-xs text-slate-500 mt-1">Required for DLT SMS routes.</p>
              </div>

              <TemplateSettings title="Appointment Schedule" category="appointment_schedule" />
              <TemplateSettings title="Send Prescription" category="send_prescription" />
              <TemplateSettings title="Lab Report" category="send_lab_report" />

              <TemplateSettings
                title="Followup Reminder"
                category="send_followup_reminder"
                extraContent={
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-600">Days early:</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-sm bg-white"
                      value={form.notification_settings?.send_followup_reminder?.days_early || 1}
                      onChange={(e) => setNestedField('send_followup_reminder', 'days_early', Number(e.target.value))}
                    />
                  </div>
                }
              />

              <TemplateSettings title="Next Appointment Schedule Date" category="next_appointment_schedule" />
              <TemplateSettings title="Treatment Reminder (If Due)" category="treatment_reminder" />

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
