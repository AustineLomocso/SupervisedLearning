import { describe, expect, it } from 'vitest'
import { describeMastery, formatDate, formatPct, formatWeight } from './format.js'

describe('format', () => {
  it('formats percentages, with a dash for no data', () => {
    expect(formatPct(85)).toBe('85%')
    expect(formatPct(null)).toBe('—')
  })

  it('formats domain weights as whole percentages', () => {
    expect(formatWeight(0.34)).toBe('34%')
    expect(formatWeight(0.3)).toBe('30%')
  })

  it('formats dates with the year', () => {
    expect(formatDate(new Date(2026, 9, 14).getTime())).toMatch(/2026/)
  })

  it('describes pooled mastery', () => {
    expect(describeMastery({ pct: null, practiced: 0 }, 19)).toBe('Not started yet')
    expect(describeMastery({ pct: 50, practiced: 1 }, 19)).toBe(
      'Mastery 50% · 1 of 19 tasks practiced',
    )
  })
})
