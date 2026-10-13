// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { checkUrls } from './checkLinks.mjs'

/**
 * A fake fetch. `routes` is keyed by "METHOD url"; an Error value makes the request throw;
 * unknown routes answer 404.
 * @param {Record<string, { status: number, redirectedTo?: string } | Error>} routes
 */
function fakeFetch(routes) {
  return vi.fn(async (/** @type {string} */ url, /** @type {RequestInit} */ init) => {
    const route = routes[`${init.method} ${url}`]
    if (route instanceof Error) throw route
    if (!route) return { ok: false, status: 404, redirected: false, url }
    return {
      ok: route.status >= 200 && route.status < 300,
      status: route.status,
      redirected: Boolean(route.redirectedTo),
      url: route.redirectedTo ?? url,
    }
  })
}

describe('checkUrls', () => {
  it('accepts a page that answers HEAD', async () => {
    const fetchImpl = fakeFetch({ 'HEAD https://a.test/': { status: 200 } })
    expect(await checkUrls(['https://a.test/'], { fetchImpl })).toEqual([
      { url: 'https://a.test/', ok: true, status: 200, finalUrl: null },
    ])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('falls back to GET when HEAD is rejected', async () => {
    const fetchImpl = fakeFetch({
      'HEAD https://a.test/': { status: 405 },
      'GET https://a.test/': { status: 200 },
    })
    const [result] = await checkUrls(['https://a.test/'], { fetchImpl })
    expect(result.ok).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('reports missing pages', async () => {
    const [result] = await checkUrls(['https://a.test/gone'], { fetchImpl: fakeFetch({}) })
    expect(result).toMatchObject({ ok: false, status: 404 })
  })

  it('reports where a redirect ends', async () => {
    const fetchImpl = fakeFetch({
      'HEAD https://a.test/': { status: 200, redirectedTo: 'https://b.test/' },
    })
    const [result] = await checkUrls(['https://a.test/'], { fetchImpl })
    expect(result).toMatchObject({ ok: true, finalUrl: 'https://b.test/' })
  })

  it('reports network errors', async () => {
    const fetchImpl = fakeFetch({ 'HEAD https://a.test/': new Error('ECONNRESET') })
    const [result] = await checkUrls(['https://a.test/'], { fetchImpl })
    expect(result).toMatchObject({ ok: false, status: 0, error: 'ECONNRESET' })
  })

  it('keeps result order and limits concurrency', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const fetchImpl = vi.fn(async (/** @type {string} */ url) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight--
      return { ok: true, status: 200, redirected: false, url }
    })
    const urls = [1, 2, 3, 4, 5].map((n) => `https://a.test/${n}`)
    const results = await checkUrls(urls, { fetchImpl, concurrency: 2 })
    expect(results.map((r) => r.url)).toEqual(urls)
    expect(maxInFlight).toBe(2)
  })
})
