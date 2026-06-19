import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient, useIsMutating } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import useAuthStore from '../store/authStore'
import { useMe } from '../hooks/useUsers'
import { useClinic } from '../hooks/useSettings'
import { Icons } from './Icons'
import LanguageSwitcher from './LanguageSwitcher'
import { MessagesWidget } from './MessagesWidget'
import { useWebSocket } from '../hooks/useWebSocket'

const navItems: { to: string; key: string; icon: ReactNode }[] = [
  { to: '/dashboard', key: 'nav.dashboard', icon: Icons.dashboard },
  { to: '/patients', key: 'nav.patients', icon: Icons.patients },
  { to: '/appointments', key: 'nav.appointments', icon: Icons.appointments },
  { to: '/billing', key: 'nav.billing', icon: Icons.billing },
  { to: '/labs', key: 'nav.labs', icon: Icons.flask }, // Uses translation key or fallback
  { to: '/pharmacy', key: 'nav.pharmacy', icon: Icons.pill },
  { to: '/reports', key: 'nav.reports', icon: Icons.activity },
  { to: '/settings', key: 'nav.settings', icon: Icons.settings },
]

export function Avatar({ name, size = 'md' }: { name?: string; size?: 'sm' | 'md' }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sz} rounded-full bg-blue-500 flex items-center justify-center font-semibold text-white shrink-0`}>
      {initials}
    </div>
  )
}

export function IndexRedirect() {
  const { data: me, isLoading } = useMe()
  
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-blue-500">
        <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
      </div>
    )
  }
  
  if (me?.role?.name?.toLowerCase() === 'frontdesk') {
    return <Navigate to="/appointments" replace />
  }
  return <Navigate to="/dashboard" replace />
}

export default function Layout() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { data: me } = useMe()
  const { data: clinic } = useClinic()
  const queryClient = useQueryClient()
  const logout = useAuthStore((s) => s.logout)
  const isMutating = useIsMutating()
  const [isCollapsed, setIsCollapsed] = useState(false)
  useWebSocket()

  const handleLogout = () => {
    queryClient.clear()
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden print:h-auto print:overflow-visible print:block">
      {/* Sidebar */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 bg-slate-900 flex flex-col shrink-0 print:hidden relative`}>
        
        {/* Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-slate-800 text-slate-400 hover:text-white rounded-full p-1 border border-slate-700 z-20 shadow-md transition-colors hidden md:block"
        >
          {isCollapsed ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
          )}
        </button>

        {/* Logo */}
        <div className={`px-4 py-5 border-b border-slate-700/60 flex ${isCollapsed ? 'justify-center' : 'items-center gap-2.5'}`}>
          <div className="w-8 h-8 shrink-0 bg-blue-500 rounded-lg flex items-center justify-center text-white overflow-hidden">
            {clinic?.logo_path ? (
              <img src={`/api/${clinic.logo_path.replace(/\\/g, '/')}`} alt="Logo" className="w-full h-full object-cover bg-white" />
            ) : (
              Icons.heartbeat
            )}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-white font-bold text-base leading-none truncate">{clinic?.name || t('common.appName')}</p>
              <p className="text-slate-400 text-[10px] mt-0.5 font-medium tracking-wide uppercase truncate">{t('common.tagline')}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {!isCollapsed && <p className="text-slate-500 text-[10px] font-semibold tracking-widest uppercase px-3 mb-3">{t('nav.mainMenu')}</p>}
          {navItems.filter(item => {
            if (!me) return false
            const tabId = item.to.replace('/', '')
            
            // If the user has assigned tabs (even empty), use them strictly
            if (me.visible_tabs !== undefined) {
              return me.visible_tabs.includes(tabId)
            }
            
            // Fallback for safety (e.g., if a new user hasn't been assigned tabs yet, or migration failed)
            const role = me.role?.name?.toLowerCase() || ''
            if (item.to === '/labs') {
              return role.includes('doctor') || role.includes('lab') || role.includes('admin')
            }
            if (item.to === '/pharmacy') {
              return role.includes('doctor') || role.includes('admin') || role.includes('pharmacist') || role.includes('frontdesk')
            }
            if (item.to === '/dashboard' || item.to === '/settings' || item.to === '/reports') {
              return role !== 'frontdesk'
            }
            return true
          }).map(({ to, key, icon }) => {
            return (
            <NavLink
              key={to}
              to={to}
              title={isCollapsed ? (to === '/labs' ? 'Labs' : to === '/pharmacy' ? 'Pharmacy' : to === '/reports' ? 'Reports' : t(key)) : undefined}
              className={({ isActive }) =>
                `flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'} rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className="shrink-0">{icon}</span>
              {!isCollapsed && <span className="truncate">{to === '/labs' ? 'Labs' : to === '/pharmacy' ? 'Pharmacy' : to === '/reports' ? 'Reports' : t(key)}</span>}
            </NavLink>
          )})}
        </nav>

        {/* User + logout */}
        <div className={`px-3 pb-4 border-t border-slate-700/60 pt-4 space-y-2 flex flex-col ${isCollapsed ? 'items-center' : ''}`}>
          {!isCollapsed && <LanguageSwitcher />}
          
          {me && (
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-lg`}>
              <Avatar name={me.username} />
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{me.username}</p>
                  <p className="text-slate-400 text-xs truncate">{me.role?.name}</p>
                </div>
              )}
            </div>
          )}
          
          <MessagesWidget isCollapsed={isCollapsed} />
          
          <button
            onClick={handleLogout}
            title={isCollapsed ? t('nav.signOut') : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'} rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all duration-150`}
          >
            <span className="shrink-0">{Icons.logout}</span>
            {!isCollapsed && <span className="truncate">{t('nav.signOut')}</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto print:overflow-visible print:block relative">
        {isMutating > 0 && (
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-100 z-50 overflow-hidden">
            <div className="h-full bg-blue-500 animate-[pulse_1s_ease-in-out_infinite] w-1/3 rounded-r-full absolute -left-1/3 animate-[slide_1.5s_ease-in-out_infinite]" />
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
