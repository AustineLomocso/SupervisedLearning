/**
 * Saves `data` as a pretty-printed JSON file through the browser's download flow.
 * @param {string} filename
 * @param {unknown} data
 */
export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Revoke later: some browsers read the blob asynchronously after click().
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

/**
 * Local calendar date for file names, e.g. "2026-10-14".
 * @param {number} [now] epoch ms
 * @returns {string}
 */
export function fileDateStamp(now = Date.now()) {
  const date = new Date(now)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
