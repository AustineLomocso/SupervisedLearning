/**
 * @typedef {object} LinkResult
 * @property {string} url
 * @property {boolean} ok
 * @property {number} status HTTP status, or 0 when the request failed outright
 * @property {string | null} finalUrl where a redirect ended, else null
 * @property {string} [error]
 */

/**
 * Checks each URL with HEAD, falling back to GET because some servers reject HEAD.
 * @param {string[]} urls
 * @param {{ fetchImpl?: (url: string, init: RequestInit) => Promise<any>, concurrency?: number, timeoutMs?: number }} [options]
 * @returns {Promise<LinkResult[]>} in the same order as `urls`
 */
export async function checkUrls(
  urls,
  { fetchImpl = fetch, concurrency = 5, timeoutMs = 15_000 } = {},
) {
  /** @type {LinkResult[]} */
  const results = new Array(urls.length)
  let next = 0
  async function worker() {
    while (next < urls.length) {
      const i = next++
      results[i] = await checkUrl(urls[i], fetchImpl, timeoutMs)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))
  return results
}

/**
 * @param {string} url
 * @param {(url: string, init: RequestInit) => Promise<any>} fetchImpl
 * @param {number} timeoutMs
 * @returns {Promise<LinkResult>}
 */
async function checkUrl(url, fetchImpl, timeoutMs) {
  /** @param {string} method */
  const request = (method) =>
    fetchImpl(url, { method, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) })
  try {
    let response = await request('HEAD')
    if (!response.ok) response = await request('GET')
    return {
      url,
      ok: response.ok,
      status: response.status,
      finalUrl: response.redirected ? response.url : null,
    }
  } catch (error) {
    return {
      url,
      ok: false,
      status: 0,
      finalUrl: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
