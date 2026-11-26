import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { login } from '../api/auth'
import { getMe } from '../api/users'
import { useClinic } from '../hooks/useSettings'
import useAuthStore from '../store/authStore'
import { Icons } from '../components/Icons'


export default function LoginPage() {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setTokens, setUser } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: clinic } = useClinic()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(username, password)
      setTokens(data.access_token, data.refresh_token)
      const me = await getMe()
      setUser(me)
      queryClient.clear()
      queryClient.setQueryData(['me'], me)
      navigate('/')
    } catch (err) {
      const detail = isAxiosError(err)
        ? (err.response?.data as { detail?: string } | undefined)?.detail
        : undefined
      setError(detail || t('login.error'))
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-dvh flex bg-slate-50">
      {/* Left panel – brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 flex-col justify-between p-12 xl:p-16 relative overflow-hidden">


        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-primary-600 rounded-md flex items-center justify-center text-white overflow-hidden shrink-0">
              {clinic?.logo_path ? (
                <img src={`/api/${clinic.logo_path.replace(/\\/g, '/')}`} alt="Logo" className="w-full h-full object-cover bg-white" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <img src="/logo.png" alt="SKFB logo" className="w-full h-full object-contain bg-white" />
              )}
            </div>
            <div>
              <p className="text-white font-bold text-xl leading-none">{clinic?.name || t('common.appName')}</p>
              <p className="text-slate-400 text-xs font-medium tracking-wide mt-0.5 truncate max-w-[250px]">
                {clinic?.address || clinic?.phone || t('common.tagline')}
              </p>
            </div>
          </div>

          <h2 className="text-4xl xl:text-5xl font-semibold text-white leading-tight mb-5 text-balance">
            More focus on care.<br />Everything else, connected.
          </h2>
          <p className="text-primary-100 text-base leading-relaxed max-w-md text-pretty">
            A shared workspace for your clinic. Bring patient records, consultations, orders, and follow-up into one clear flow.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-4">
          {[
            { label: 'A complete patient history', value: 'Review' },
            { label: 'Focused clinical documentation', value: 'Consult' },
            { label: 'Connected orders and results', value: 'Coordinate' },
            { label: 'Continuity beyond the visit', value: 'Follow up' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl p-5 border border-primary-700 bg-primary-800">
              <p className="text-lg font-semibold text-white">{value}</p>
              <p className="text-primary-100 text-xs mt-2">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-9 h-9 bg-primary-600 rounded-md flex items-center justify-center text-white overflow-hidden shrink-0">
              {clinic?.logo_path ? (
                <img src={`/api/${clinic.logo_path.replace(/\\/g, '/')}`} alt="Logo" className="w-full h-full object-cover bg-white" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              ) : (
                <img src="/logo.png" alt="SKFB logo" className="w-full h-full object-contain bg-white" />
              )}
            </div>
            <p className="text-slate-900 font-bold text-xl truncate">{clinic?.name || t('common.appName')}</p>
          </div>

          <p className="workspace-eyebrow">Your clinic, connected</p>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2 text-balance">{t('login.welcomeBack')}</h1>
          <p className="text-slate-500 text-sm mb-8">{t('login.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-slate-700 mb-1.5">{t('login.username')}</label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                placeholder={t('login.usernamePlaceholder')}
                className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow bg-white"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1.5">{t('login.password')}</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder={t('login.passwordPlaceholder')}
                className="w-full border border-border rounded-md px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow bg-white"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 disabled:opacity-60 text-white font-semibold py-3 rounded-md transition-colors text-sm mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                  {t('login.signingIn')}
                </span>
              ) : t('login.signIn')}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}
