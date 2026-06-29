import { describe, it, expect, beforeEach } from 'vitest'
import { applyTheme, getStoredTheme, resolveTheme } from './theme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
})

describe('getStoredTheme', () => {
  it('defaults to "system" when nothing is stored', () => {
    expect(getStoredTheme()).toBe('system')
  })

  it('returns a previously stored preference', () => {
    localStorage.setItem('carb-tracker-theme', 'dark')
    expect(getStoredTheme()).toBe('dark')
  })

  it('ignores invalid stored values', () => {
    localStorage.setItem('carb-tracker-theme', 'neon')
    expect(getStoredTheme()).toBe('system')
  })
})

describe('resolveTheme', () => {
  it('passes through explicit preferences', () => {
    expect(resolveTheme('dark')).toBe('dark')
    expect(resolveTheme('light')).toBe('light')
  })

  it('falls back to light for "system" when matchMedia is unavailable', () => {
    // jsdom has no matchMedia, so systemPrefersDark() is false.
    expect(resolveTheme('system')).toBe('light')
  })
})

describe('applyTheme', () => {
  it('persists the preference and sets data-theme to the resolved value', () => {
    applyTheme('dark')
    expect(getStoredTheme()).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
