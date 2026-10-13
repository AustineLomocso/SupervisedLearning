import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db.js'
import { markReviewComplete } from '../db/progress.js'
import { graded, makeAttempt } from '../test/factories.js'
import { resetDb } from '../test/resetDb.js'
import { useCertProgress } from './useCertProgress.js'

beforeEach(resetDb)

describe('useCertProgress', () => {
  it('is undefined while loading, then reports mastery and reviews', async () => {
    await db.attempts.add(
      makeAttempt({
        responses: { 'clf-c02-1.1-0001': graded(true, 10), 'clf-c02-1.1-0002': graded(false, 20) },
      }),
    )
    await markReviewComplete('clf-c02', 'clf-c02/1.1', 30)
    const { result } = renderHook(() => useCertProgress('clf-c02'))
    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current).toBeDefined())
    expect(result.current?.mastery.get('clf-c02/1.1')).toMatchObject({
      answered: 2,
      pct: 50,
      band: 'developing',
    })
    expect(result.current?.reviews.get('clf-c02/1.1')?.reviewCompletedAt).toBe(30)
    expect(result.current?.answeredCount).toBe(2)
    expect(result.current?.attempts).toHaveLength(1)
  })

  it('updates when a new attempt is saved', async () => {
    const { result } = renderHook(() => useCertProgress('clf-c02'))
    await waitFor(() => expect(result.current?.answeredCount).toBe(0))
    await db.attempts.add(makeAttempt({ responses: { 'clf-c02-2.1-0001': graded(true, 10) } }))
    await waitFor(() => expect(result.current?.mastery.get('clf-c02/2.1')?.pct).toBe(100))
  })

  it('ignores other certifications', async () => {
    await db.attempts.add(
      makeAttempt({
        certId: 'aif-c01',
        scopeId: 'aif-c01/1.1',
        responses: { 'aif-c01-1.1-0001': graded(true, 10) },
      }),
    )
    const { result } = renderHook(() => useCertProgress('clf-c02'))
    await waitFor(() => expect(result.current).toBeDefined())
    expect(result.current?.answeredCount).toBe(0)
  })
})
