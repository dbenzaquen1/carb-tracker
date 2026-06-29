export type ThemePref = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'carb-tracker-theme'

/** The user's saved theme preference (defaults to following the system). */
export function getStoredTheme(): ThemePref {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value
    }
  } catch {
    // localStorage unavailable (e.g. private mode) — fall through.
  }
  return 'system'
}

/** Whether the OS currently prefers a dark color scheme. */
export function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

/** Resolve a preference to the concrete theme to apply. */
export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'dark') return 'dark'
  if (pref === 'light') return 'light'
  return systemPrefersDark() ? 'dark' : 'light'
}

/**
 * Persist the preference and apply the resolved theme by setting `data-theme`
 * on the document root (the CSS keys off that attribute).
 */
export function applyTheme(pref: ThemePref): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // Ignore persistence failures.
  }
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolveTheme(pref))
  }
}
