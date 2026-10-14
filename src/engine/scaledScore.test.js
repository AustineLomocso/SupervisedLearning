import { describe, expect, it } from 'vitest'
import { PASS_SCALED, scaledScoreEstimate } from './scaledScore.js'

describe('scaledScoreEstimate', () => {
  it.each([
    [0, 100],
    [35, 400],
    [70, 700],
    [85, 850],
    [100, 1000],
  ])('%s%% scales to %s', (pct, scaled) => {
    expect(scaledScoreEstimate(pct)).toBe(scaled)
  })

  it('clamps out-of-range percentages', () => {
    expect(scaledScoreEstimate(-5)).toBe(100)
    expect(scaledScoreEstimate(130)).toBe(1000)
  })

  it('puts 69% just under the pass mark', () => {
    expect(scaledScoreEstimate(69)).toBeLessThan(PASS_SCALED)
  })
})
