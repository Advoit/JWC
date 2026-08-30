import { createI18n } from 'vue-i18n'
import de from './locales/de'

// Verfügbare Sprachen. Deutsch ist Standard. Weitere Sprachen lassen sich hier
// ergänzen (z. B. `en`, `fr`) und werden von der App-Einstellung gewechselt.
export const availableLocales = ['de'] as const
export const STORAGE_LANG_KEY = 'jwc.lang'

export type AppLocale = (typeof availableLocales)[number]

function detectLanguage(): AppLocale {
  if (typeof window === 'undefined') return 'de'
  try {
    const stored = window.localStorage.getItem(STORAGE_LANG_KEY) as AppLocale | null
    if (stored && (availableLocales as readonly string[]).includes(stored)) return stored
  } catch {
    /* localStorage nicht verfügbar – Fallback */
  }
  return 'de'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLanguage(),
  fallbackLocale: 'de',
  messages: { de },
})