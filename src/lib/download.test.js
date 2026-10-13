import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadJson, fileDateStamp } from './download.js'

/** @type {Blob[]} */
let blobs = []

beforeEach(() => {
  blobs = []
  vi.useFakeTimers()
  // jsdom has no object URLs.
  URL.createObjectURL = vi.fn((blob) => {
    blobs.push(blob)
    return 'blob:test'
  })
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('downloadJson', () => {
  it('saves pretty-printed JSON under the given file name', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadJson('report.json', { a: 1 })
    const link = click.mock.contexts[0]
    expect(link.download).toBe('report.json')
    expect(link.href).toBe('blob:test')
    expect(link.isConnected).toBe(false)
    expect(blobs[0].type).toBe('application/json')
    expect(await blobs[0].text()).toBe('{\n  "a": 1\n}')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})

describe('fileDateStamp', () => {
  it('uses the local calendar date', () => {
    expect(fileDateStamp(new Date(2026, 9, 4, 12).getTime())).toBe('2026-10-04')
  })
})
