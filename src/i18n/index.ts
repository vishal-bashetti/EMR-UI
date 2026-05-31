import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './locales/en.json'
// Kannada (ಕನ್ನಡ) is scaffolded for the roadmap. To enable it:
//   1. fill in src/i18n/locales/kn.json,
//   2. import it here and add `kn: { translation: kn }` to `resources`,
//   3. add `{ code: 'kn', label: 'ಕನ್ನಡ' }` to SUPPORTED_LANGUAGES below.
// Missing keys automatically fall back to English.

export interface Language {
  code: string
  label: string
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', label: 'English' },
]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
