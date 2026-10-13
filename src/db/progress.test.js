import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../test/resetDb.js'
import { getProgress, listProgressForCert, markReviewComplete } from './progress.js'

beforeEach(resetDb)

describe('progress', () => {
  it('marks a sub-domain review as complete', async () => {
    await markReviewComplete('clf-c02', 'clf-c02/1.1', 5_000)
    expect(await getProgress('clf-c02/1.1')).toEqual({
      subdomainId: 'clf-c02/1.1',
      certId: 'clf-c02',
      reviewCompletedAt: 5_000,
    })
  })

  it('returns undefined for a sub-domain with no progress', async () => {
    expect(await getProgress('clf-c02/4.3')).toBeUndefined()
  })

  it('lists progress for one cert only', async () => {
    await markReviewComplete('clf-c02', 'clf-c02/1.1', 1)
    await markReviewComplete('aif-c01', 'aif-c01/1.1', 2)
    expect((await listProgressForCert('clf-c02')).map((p) => p.subdomainId)).toEqual([
      'clf-c02/1.1',
    ])
  })
})
