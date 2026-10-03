import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../i18n'

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = (i18n.language || 'en').split('-')[0]

  return (
    <div className="px-3 py-2">
      <label htmlFor="workspace-language" className="text-slate-500 text-xs font-medium block mb-1.5">
        {t('language.label')}
      </label>
      <select
        id="workspace-language"
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="w-full bg-white text-slate-600 text-sm rounded-lg px-2.5 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  )
}
