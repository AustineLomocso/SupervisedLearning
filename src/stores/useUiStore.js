import { create } from 'zustand'

/** Keep in sync with the inline theme script in index.html. */
export const THEME_STORAGE_KEY = 'theme'

/** @typedef {'light' | 'dark' | 'system'} Theme */

/** @returns {Theme} */
export function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

/** @param {Theme} theme */
export function applyTheme(theme) {
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', dark)
}

/**
 * Re-applies the theme when the OS preference changes while "system" is selected.
 * @returns {() => void} unsubscribe
 */
export function watchSystemTheme() {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (useUiStore.getState().theme === 'system') applyTheme('system')
  }
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

/**
 * @typedef {object} UiState
 * @property {Theme} theme
 * @property {boolean} storageError true when IndexedDB could not be opened
 * @property {boolean} updateAvailable true when a deploy has replaced this tab's files
 * @property {(theme: Theme) => void} setTheme
 */

/** @type {import('zustand').UseBoundStore<import('zustand').StoreApi<UiState>>} */
export const useUiStore = create((set) => ({
  theme: readStoredTheme(),
  storageError: false,
  updateAvailable: false,
  setTheme: (theme) => {
    try {
      if (theme === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Storage unavailable: the theme still applies for this session.
    }
    applyTheme(theme)
    set({ theme })
  },
}))
