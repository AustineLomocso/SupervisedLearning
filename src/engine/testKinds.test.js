import { describe, expect, it } from 'vitest'
import { isTestKind, TEST_KIND_LABELS } from './testKinds.js'

describe('testKinds', () => {
  it('accepts every known kind', () => {
    for (const kind of ['pre', 'post', 'domain', 'diagnostic', 'full', 'drill']) {
      expect(isTestKind(kind)).toBe(true)
    }
  })

  it('rejects unknown or missing kinds', () => {
    expect(isTestKind('quiz')).toBe(false)
    expect(isTestKind('toString')).toBe(false)
    expect(isTestKind(null)).toBe(false)
  })

  it('labels each kind for display', () => {
    expect(TEST_KIND_LABELS.diagnostic).toBe('Diagnostic Exam')
    expect(TEST_KIND_LABELS.full).toBe('Full Practice Exam')
  })
})
