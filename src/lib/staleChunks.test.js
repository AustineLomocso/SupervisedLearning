import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useUiStore } from '../stores/useUiStore.js'
import { watchForStaleChunks } from './staleChunks.js'

let stop = () => {}

beforeEach(() => {
  useUiStore.setState({ updateAvailable: false })
})

afterEach(() => stop())

describe('watchForStaleChunks', () => {
  it('flags that a new version is available when a chunk fails to preload', () => {
    stop = watchForStaleChunks()
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(useUiStore.getState().updateAvailable).toBe(true)
  })

  it('leaves the event alone so the page can still show its own error', () => {
    stop = watchForStaleChunks()
    const event = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('stops listening when told to', () => {
    watchForStaleChunks()()
    window.dispatchEvent(new Event('vite:preloadError'))
    expect(useUiStore.getState().updateAvailable).toBe(false)
  })
})
