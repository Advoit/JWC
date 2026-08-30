/**
 * Theme-Verwaltung. Drei Modi: `system` (folgt dem Betriebssystem), `light`
 * und `dark`. Der aufgelöste Modus wird als `data-theme` auf <html> gesetzt
 * und steuert die CSS-Variablen in style.css (inkl. grüner Sidebar).
 */
export type ThemeMode = 'system' | 'light' | 'dark'

const THEME_KEY = 'jwc.theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getStoredTheme(): ThemeMode {
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    return raw === 'light' || raw === 'dark' ? raw : 'system'
  } catch {
    return 'system'
  }
}

export function storeTheme(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* Kein localStorage – Theme bleibt für diese Sitzung aktiv. */
  }
}

/** Löst den gewählten Modus in ein konkretes Hell/Dunkel auf. */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return media().matches ? 'dark' : 'light'
}

/** Wendet den aufgelösten Modus auf <html data-theme> an. */
export function applyTheme(mode: ThemeMode): void {
  const resolved = resolveTheme(mode)
  document.documentElement.dataset.theme = resolved
  // Browser-Chrome-Farbe (mobile Adressleiste) an das Theme angleichen –
  // identisch zum PWA-Manifest (vite.config.ts).
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#1d3324' : '#32563b')
}

/** Wendet den gespeicherten Modus an (früher Aufruf in main.ts). */
export function applyStoredTheme(): void {
  applyTheme(getStoredTheme())
}

/** Reagiert auf System-Änderungen, solange der Modus `system` ist. */
export function watchSystemTheme(mode: () => ThemeMode): () => void {
  const mql = media()
  const onChange = () => {
    if (mode() === 'system') applyTheme('system')
  }
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}