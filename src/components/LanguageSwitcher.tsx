import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../i18n'

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = (i18n.language || 'en').split('-')[0]

  return (
    <div className="px-3 py-2">
      <label className="text-slate-500 text-[10px] font-semibold tracking-widest uppercase block mb-1.5">
        {t('language.label')}
      </label>
      <select
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="w-full bg-slate-800 text-slate-200 text-sm rounded-lg px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  )
}
