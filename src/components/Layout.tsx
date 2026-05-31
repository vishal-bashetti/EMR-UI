import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import useAuthStore from '../store/authStore'
import { useMe } from '../hooks/useUsers'
import { Icons } from './Icons'

const navItems: { to: string; label: string; icon: ReactNode }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: Icons.dashboard },
  { to: '/patients', label: 'Patients', icon: Icons.patients },
  { to: '/appointments', label: 'Appointments', icon: Icons.appointments },
  { to: '/billing', label: 'Billing', icon: Icons.billing },
  { to: '/settings', label: 'Settings', icon: Icons.settings },
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

export default function Layout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { data: me } = useMe()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
              {Icons.heartbeat}
            </div>
            <div>
              <p className="text-white font-bold text-base leading-none">MedEMR</p>
              <p className="text-slate-400 text-[10px] mt-0.5 font-medium tracking-wide uppercase">Clinical Suite</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-slate-500 text-[10px] font-semibold tracking-widest uppercase px-3 mb-3">Main Menu</p>
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 pb-4 border-t border-slate-700/60 pt-4 space-y-1">
          {me && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
              <Avatar name={me.username} />
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{me.username}</p>
                <p className="text-slate-400 text-xs truncate">{me.role?.name}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all duration-150"
          >
            {Icons.logout}
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
