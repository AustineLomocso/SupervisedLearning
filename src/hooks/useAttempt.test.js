import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAttempt } from '../db/attempts.js'
import { resetDb } from '../test/resetDb.js'
import { useAttempt } from './useAttempt.js'

beforeEach(resetDb)

describe('useAttempt', () => {
  it('loads the attempt and its items in order', async () => {
    const ids = ['clf-c02-1.1-0002', 'clf-c02-1.1-0001']
    const attempt = await createAttempt({
      certId: 'clf-c02',
      kind: 'pre',
      scopeId: 'clf-c02/1.1',
      mode: 'study',
      itemIds: ids,
      optionOrder: {},
    })
    const { result } = renderHook(() => useAttempt(attempt.id))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
    const ready = /** @type {{ status: 'ready', attempt: any, items: any[] }} */ (result.current)
    expect(ready.attempt.id).toBe(attempt.id)
    expect(ready.items.map((item) => item.id)).toEqual(ids)
    expect(ready.items[0]).toMatchObject({ certId: 'clf-c02', taskCode: '1.1' })
  })

  it('reports an unknown attempt as missing', async () => {
    const { result } = renderHook(() => useAttempt('nope'))
    await waitFor(() => expect(result.current.status).toBe('missing'))
  })
})
