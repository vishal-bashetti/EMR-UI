import { NavLink, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { Suspense, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient, useIsMutating } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../store/authStore'
import { useMe } from '../hooks/useUsers'
import { useClinic } from '../hooks/useSettings'
import { Icons } from './Icons'
import LanguageSwitcher from './LanguageSwitcher'
import { useWebSocket } from '../hooks/useWebSocket'
import { cn } from '../utils/cn'
import { can } from '../utils/workflow'
import { GlobalSearchModal } from './GlobalSearchModal'
import { QuickAddMenu } from './QuickAddMenu'
import HeaderClock from './HeaderClock'
import { preloadWorkspacePage } from '../workspacePages'

export function Avatar({ name, size = 'md' }: { name?: string; size?: 'sm' | 'md' }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'
  return (
    <div className={cn(
      'rounded-xl flex items-center justify-center font-bold shrink-0',
      'bg-emerald-800/80 text-emerald-200 border border-emerald-700/60 shadow-xs',
      size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm'
    )}>
      {initials}
    </div>
  )
}

export function IndexRedirect() {
  const { data: me, isLoading } = useMe()
  if (isLoading) return <div role="status" className="p-8 text-slate-500">Loading your workspace…</div>
  if (can(me, 'view_appointments')) return <Navigate to="/today" replace />
  if (can(me, 'view_pharmacy')) return <Navigate to="/pharmacy" replace />
  return <Navigate to="/patients" replace />
}

interface NavItemDef {
  to: string
  label: string
  icon: ReactNode
  permission?: string
  exact?: boolean
}

interface NavGroupDef {
  title: string
  items: NavItemDef[]
}

const navGroups: NavGroupDef[] = [
  {
    title: 'Clinical',
    items: [
      { to: '/today', label: 'Dashboard', icon: Icons.dashboard, permission: 'view_appointments', exact: true },
      { to: '/appointments', label: 'Appointments', icon: Icons.calendar, permission: 'view_appointments' },
      { to: '/patients', label: 'Patients', icon: Icons.patients, permission: 'view_patients' },
      { to: '/visits/new', label: 'Consultation', icon: Icons.stethoscope, permission: 'manage_clinical' },
      { to: '/labs', label: 'Lab / Reports', icon: Icons.flask, permission: 'view_clinical' },
      { to: '/pharmacy', label: 'Prescriptions', icon: Icons.pill, permission: 'view_pharmacy' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { to: '/pharmacy?view=dispense', label: 'Pharmacy', icon: Icons.pill, permission: 'view_pharmacy' },
      { to: '/today?stage=followup', label: 'Follow-ups', icon: Icons.clock, permission: 'view_clinical' },
      { to: '/messages', label: 'Messages', icon: Icons.messages },
    ]
  },
  {
    title: 'Management',
    items: [
      { to: '/reports', label: 'Analytics', icon: Icons.activity, permission: 'view_billing' },
      { to: '/billing', label: 'Billing', icon: Icons.billing, permission: 'view_billing' },
      { to: '/settings?tab=users', label: 'Users', icon: Icons.user, permission: 'manage_users' },
      { to: '/settings', label: 'Settings', icon: Icons.settings, permission: 'manage_settings' },
    ]
  }
]

export default function WorkspaceLayout() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: me, isPending: loadingNavigation, isError: navigationFailed, refetch: reloadNavigation } = useMe()
  const { data: clinic } = useClinic()
  const queryClient = useQueryClient()
  const logout = useAuthStore(s => s.logout)
  const isMutating = useIsMutating()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const location = useLocation()
  useWebSocket()

  // Register Global Keyboard Shortcuts (Section 37)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Universal Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchOpen(prev => !prev)
      }
      // Alt + C: Jump to Consultation
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault()
        navigate('/visits/new')
      }
      // Alt + P: Jump to Prescriptions / Pharmacy
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        navigate('/pharmacy')
      }
    }
    window.addEventListener('keydown', handleGlobalShortcuts)
    return () => window.removeEventListener('keydown', handleGlobalShortcuts)
  }, [navigate])

  const handleLogout = () => {
    queryClient.clear()
    logout()
    navigate('/login')
  }

  const logo = clinic?.logo_path ? `/api/${clinic.logo_path.replace(/\\/g, '/')}` : '/logo.png'

  // Filter items based on user role and permissions
  const filterItem = (item: NavItemDef) => {
    if (!me) return false
    if (me.role?.name === 'Admin') return true
    if (item.permission && !can(me, item.permission as any)) return false
    if (me.visible_tabs !== undefined) {
      const cleanPath = item.to.split('?')[0].slice(1)
      if (cleanPath === 'today') return me.visible_tabs.includes('dashboard') || me.visible_tabs.includes('today')
      return me.visible_tabs.includes(cleanPath)
    }
    const role = me.role?.name?.toLowerCase() || ''
    if (item.to.includes('labs')) return role.includes('doctor') || role.includes('lab')
    if (item.to.includes('pharmacy')) return role.includes('doctor') || role.includes('pharmacist') || role.includes('frontdesk')
    if (['/settings', '/reports'].includes(item.to.split('?')[0])) return role !== 'frontdesk'
    return true
  }

  // Determine current section title
  const currentPath = location.pathname
  let currentTitle = 'Clinical Workspace'
  if (currentPath.startsWith('/today')) currentTitle = 'Dashboard — Today\'s Work'
  else if (currentPath.startsWith('/appointments')) currentTitle = 'Appointments Calendar'
  else if (currentPath.startsWith('/patients')) currentTitle = 'Patient Directory & Chart'
  else if (currentPath.startsWith('/visits')) currentTitle = new URLSearchParams(location.search).has('patient_id') ? 'Active Consultation' : 'Daily Consultations'
  else if (currentPath.startsWith('/labs')) currentTitle = 'Lab Orders & Results'
  else if (currentPath.startsWith('/pharmacy')) currentTitle = 'Prescription & Pharmacy Queue'
  else if (currentPath.startsWith('/billing')) currentTitle = 'Billing & Payments'
  else if (currentPath.startsWith('/reports')) currentTitle = 'Clinical Analytics & Reports'
  else if (currentPath.startsWith('/messages')) currentTitle = 'Clinical Communications'
  else if (currentPath.startsWith('/settings')) currentTitle = 'Clinic Settings & Administration'

  return (
    <div className="emr-shell flex h-dvh overflow-hidden bg-slate-100 text-slate-800 print:h-auto print:overflow-visible print:block font-sans">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:p-3 focus:rounded-lg shadow-lg">
        Skip to workspace
      </a>

      {/* ─── Premium Dark Navigation Shell (Section 3 & 33) ─── */}
      <aside
        className={cn(
          'emr-sidebar flex flex-col shrink-0 relative transition-all duration-200 z-30 select-none print:hidden',
          'gradient-dark-nav text-slate-300 border-r border-[#162e26] shadow-xl',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {/* Brand / Logo Header */}
        <div className={cn(
          'flex items-center gap-3 border-b border-[#162e26]/80 h-16 shrink-0 px-4',
          isCollapsed && 'justify-center px-2'
        )}>
          <div className="size-10 rounded-xl bg-gradient-to-br from-[#182d27] to-[#0c1814] border border-[#27463e] flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
            <img
              src={logo}
              onError={event => { if (!event.currentTarget.src.endsWith('/logo.png')) event.currentTarget.src = '/logo.png' }}
              alt="SKFB"
              className="size-8 object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white tracking-tight truncate leading-tight">
                {clinic?.name || 'SKFB EMR'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-400"></span>
                <p className="text-[11px] font-medium text-emerald-400/90 tracking-wide uppercase">
                  Clinical Shell
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Collapse / Expand Toggle Button */}
        <button
          type="button"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-20 z-40 size-6 items-center justify-center rounded-full border border-slate-700 bg-[#0f1c19] text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 shadow-md transition-colors cursor-pointer"
        >
          <span className={cn('text-xs transition-transform duration-150', !isCollapsed && 'rotate-180')}>
            {Icons.chevronRight}
          </span>
        </button>

        {/* Sidebar Navigation Groups */}
        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-5 scrollbar-thin">
          {loadingNavigation && (
            <div role="status" className="space-y-3 px-3">
              <span className="sr-only">Loading navigation…</span>
              {[1, 2, 3, 4, 5].map(row => <div key={row} aria-hidden="true" className="h-7 rounded-lg bg-emerald-900/40 motion-safe:animate-pulse" />)}
            </div>
          )}
          {navigationFailed && !me && (
            <button type="button" className="px-3 text-xs text-emerald-200 underline" onClick={() => void reloadNavigation()}>
              Retry loading navigation
            </button>
          )}
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(filterItem)
            if (!visibleItems.length) return null

            return (
              <div key={group.title} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {group.title}
                  </p>
                )}
                {isCollapsed && (
                  <div className="w-8 h-px bg-[#192b26] mx-auto my-2" />
                )}
                <div className="space-y-0.5">
                  {visibleItems.map(({ to, label, icon }) => {
                    const toPath = to.split('?')[0]
                    const isActive = currentPath === toPath || (toPath !== '/today' && currentPath.startsWith(toPath))
                    return (
                      <NavLink
                        key={to}
                        to={to}
                        onPointerEnter={() => preloadWorkspacePage(to)}
                        onFocus={() => preloadWorkspacePage(to)}
                        aria-label={label}
                        title={label}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all group cursor-pointer',
                          isCollapsed ? 'justify-center px-0 py-2.5' : 'justify-start',
                          isActive
                            ? 'bg-gradient-to-r from-emerald-500/25 via-emerald-600/15 to-emerald-500/5 text-emerald-300 font-semibold ring-1 ring-emerald-500/40 shadow-xs'
                            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                        )}
                      >
                        <span
                          className={cn(
                            'size-5 flex items-center justify-center shrink-0 transition-colors',
                            isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                          )}
                          aria-hidden="true"
                        >
                          {icon}
                        </span>
                        {!isCollapsed && (
                          <span className="truncate tracking-wide">{label}</span>
                        )}
                      </NavLink>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Sidebar User & System Footer */}
        <div className="border-t border-[#192b26] p-3 space-y-2 bg-[#09110f]">
          {!isCollapsed && (
            <div className="px-2">
              <LanguageSwitcher />
            </div>
          )}
          <div className={cn(
            'flex items-center gap-3 rounded-xl p-2 bg-[#121f1c]/70 border border-[#1f332e]',
            isCollapsed && 'justify-center p-1.5'
          )}>
            <Avatar name={me?.username} size="sm" />
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {me?.username || 'Doctor'}
                </p>
                <p className="text-[11px] text-emerald-400/80 truncate">
                  {me?.role?.name || 'Clinician'}
                </p>
              </div>
            )}
            {!isCollapsed && (
              <button
                type="button"
                onClick={handleLogout}
                aria-label={t('nav.signOut', 'Sign out')}
                title={t('nav.signOut', 'Sign out')}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              >
                {Icons.logout}
              </button>
            )}
          </div>
          {isCollapsed && (
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t('nav.signOut', 'Sign out')}
              title={t('nav.signOut', 'Sign out')}
              className="w-full flex justify-center py-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            >
              {Icons.logout}
            </button>
          )}
        </div>
      </aside>

      {/* ─── Global Workspace Canvas & Header ─── */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 min-h-0 flex flex-col print:overflow-visible print:block relative bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#f8fafc]">
        {/* Global Top Bar (Section 3) */}
        <header className="h-16 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 md:px-6 flex items-center justify-between gap-4 print:hidden z-20 shadow-2xs">
          {/* Breadcrumb & Section Name */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="hidden sm:inline text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
              SKFB
            </span>
            <span className="hidden sm:inline text-slate-300">/</span>
            <h1 className="text-sm font-bold text-slate-800 truncate">
              {currentTitle}
            </h1>
          </div>

          {/* Central Universal Search Bar (Ctrl+K trigger) */}
          <div className="flex-1 max-w-md mx-2 sm:mx-4">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-white hover:border-emerald-500/50 hover:shadow-xs text-xs text-slate-400 transition-all cursor-pointer group"
              aria-label="Search patients, OPD, phone, or records (Ctrl+K)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-400 group-hover:text-emerald-600 transition-colors">
                  {Icons.search}
                </span>
                <span className="truncate">Search patients, OPD, phone, Rx, appointments…</span>
              </div>
              <kbd className="hidden sm:inline-block rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 shadow-2xs group-hover:border-emerald-300">
                Ctrl K
              </kbd>
            </button>
          </div>

          {/* Right Header Utilities: Quick Add, Date, Status */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Quick Add Menu (+) */}
            <QuickAddMenu onOpenNewPatient={() => navigate('/patients?action=new')} />

            {/* Notification / Activity Alert */}
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => navigate('/today')}
              className="size-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-emerald-700 relative transition-colors cursor-pointer"
              title="Today's Worklist"
            >
              {Icons.calendar}
              <span className="absolute top-1 right-1 size-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
            </button>

            {/* Shift / Date Badge */}
            <div className="hidden xl:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">
                {new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
            <HeaderClock />
          </div>
        </header>

        {/* Global Mutation Saving Indicator */}
        {isMutating > 0 && (
          <div role="status" className="absolute right-6 top-18 z-40 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/95 backdrop-blur-xs px-3.5 py-2 text-xs font-semibold text-emerald-900 shadow-md animate-in fade-in slide-in-from-top-2 duration-150">
            <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
            Saving clinical changes…
          </div>
        )}

        {/* Dynamic Page Content Viewport */}
        <div className="emr-page-content flex-1 min-h-0 overflow-y-auto print:overflow-visible print:block">
          <Suspense fallback={<div role="status" className="p-8 text-sm text-slate-500">Loading page…</div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      {/* Universal Search Modal (Ctrl+K Command Palette) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenNewPatient={() => navigate('/patients?action=new')}
      />
    </div>
  )
}
