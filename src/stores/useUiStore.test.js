import { beforeEach, describe, expect, it } from 'vitest'
import { readStoredTheme, THEME_STORAGE_KEY, useUiStore } from './useUiStore.js'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  useUiStore.setState({ theme: 'system', storageError: false })
})

describe('readStoredTheme', () => {
  it('defaults to system when nothing is stored', () => {
    expect(readStoredTheme()).toBe('system')
  })

  it('returns a stored explicit theme', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('ignores unexpected stored values', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'purple')
    expect(readStoredTheme()).toBe('system')
  })
})

describe('setTheme', () => {
  it('applies and remembers dark mode', () => {
    useUiStore.getState().setTheme('dark')
    expect(useUiStore.getState().theme).toBe('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('switching to light removes the dark class', () => {
    useUiStore.getState().setTheme('dark')
    useUiStore.getState().setTheme('light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('system clears the stored preference and follows the device (light in jsdom)', () => {
    useUiStore.getState().setTheme('dark')
    useUiStore.getState().setTheme('system')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
