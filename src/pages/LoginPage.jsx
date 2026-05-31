import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { getMe } from '../api/users'
import useAuthStore from '../store/authStore'
import { Icons } from '../components/Icons'

const DEMO_USERS = [
  { username: 'admin', password: 'admin123', role: 'Admin' },
  { username: 'doctor', password: 'doctor123', role: 'Doctor' },
  { username: 'frontdesk', password: 'frontdesk123', role: 'Front Desk' },
]

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(username, password)
      setTokens(data.access_token, data.refresh_token)
      const me = await getMe()
      setUser(me)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Incorrect username or password.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (u) => {
    setUsername(u.username)
    setPassword(u.password)
    setError('')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
              {Icons.heartbeat}
            </div>
            <div>
              <p className="text-white font-bold text-xl leading-none">MedEMR</p>
              <p className="text-slate-400 text-xs font-medium tracking-wide mt-0.5">Clinical Suite</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Better care starts<br />with better records.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            A unified platform for patient records, appointments, clinical notes, and billing — built for modern healthcare teams.
          </p>
        </div>

        <div className="relative grid grid-cols-2 gap-4">
          {[
            { label: 'Patients managed', value: '10,000+' },
            { label: 'Appointments scheduled', value: '50,000+' },
            { label: 'Clinical records', value: '200,000+' },
            { label: 'Uptime', value: '99.9%' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center text-white">
              {Icons.heartbeat}
            </div>
            <p className="text-slate-900 font-bold text-xl">MedEMR</p>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
          <p className="text-slate-500 text-sm mb-8">Sign in to your account to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="Enter your username"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-sm shadow-blue-200 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Demo accounts</p>
            <div className="space-y-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.username}
                  onClick={() => fillDemo(u)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-700">{u.username}</span>
                    <span className="text-xs text-slate-400 ml-2">{u.role}</span>
                  </div>
                  <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Click to fill →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
