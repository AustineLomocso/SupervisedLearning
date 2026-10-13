import { afterEach, describe, expect, it, vi } from 'vitest'
import { restoreStorage, stubStorage } from '../test/stubStorage.js'
import { getPersistenceStatus, requestPersistence } from './persist.js'

afterEach(restoreStorage)

describe('getPersistenceStatus', () => {
  it('is unsupported when the Storage API is missing', async () => {
    stubStorage(undefined)
    expect(await getPersistenceStatus()).toBe('unsupported')
  })

  it('reports persisted or best-effort', async () => {
    stubStorage({ persisted: async () => true })
    expect(await getPersistenceStatus()).toBe('persisted')
    stubStorage({ persisted: async () => false })
    expect(await getPersistenceStatus()).toBe('best-effort')
  })
})

describe('requestPersistence', () => {
  it('is unsupported when the Storage API is missing', async () => {
    stubStorage(undefined)
    expect(await requestPersistence()).toBe('unsupported')
  })

  it('does not ask again when already persisted', async () => {
    const persist = vi.fn(async () => true)
    stubStorage({ persisted: async () => true, persist })
    expect(await requestPersistence()).toBe('persisted')
    expect(persist).not.toHaveBeenCalled()
  })

  it('returns the browser decision', async () => {
    stubStorage({ persisted: async () => false, persist: async () => true })
    expect(await requestPersistence()).toBe('persisted')
    stubStorage({ persisted: async () => false, persist: async () => false })
    expect(await requestPersistence()).toBe('best-effort')
  })
})
