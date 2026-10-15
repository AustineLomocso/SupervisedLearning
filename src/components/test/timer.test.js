import { describe, expect, it } from 'vitest'
import { formatRemaining, warningFor } from './timer.js'

describe('formatRemaining', () => {
  it.each([
    [90 * 60_000, '1:30:00'],
    [59 * 60_000 + 5_000, '59:05'],
    [61_000, '1:01'],
    [999, '0:01'],
    [0, '0:00'],
    [-500, '0:00'],
  ])('%s ms is %s', (ms, text) => {
    expect(formatRemaining(ms)).toBe(text)
  })
})

describe('warningFor', () => {
  it('warns at 10 minutes and at 1 minute, using the closest threshold', () => {
    expect(warningFor(20 * 60_000)).toBeNull()
    expect(warningFor(10 * 60_000)?.message).toBe('Less than 10 minutes remaining')
    expect(warningFor(5 * 60_000)?.message).toBe('Less than 10 minutes remaining')
    expect(warningFor(60_000)?.message).toBe('Less than 1 minute remaining')
  })
})
