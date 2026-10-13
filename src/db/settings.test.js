import { beforeEach, describe, expect, it } from 'vitest'
import { resetDb } from '../test/resetDb.js'
import { getSetting, setSetting } from './settings.js'

beforeEach(resetDb)

describe('settings', () => {
  it('returns the fallback when a setting is missing', async () => {
    expect(await getSetting('testLengths', { pre: 10 })).toEqual({ pre: 10 })
  })

  it('stores and reads back structured values', async () => {
    await setSetting('testLengths', { pre: 15, post: 20 })
    expect(await getSetting('testLengths', null)).toEqual({ pre: 15, post: 20 })
  })
})
