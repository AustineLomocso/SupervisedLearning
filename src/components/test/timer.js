/**
 * "1:30:00" for 90 minutes, "59:05" under an hour. Rounds up, so the display reads 0:00
 * only when time is really up.
 * @param {number} ms
 */
export function formatRemaining(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}

/** Warnings, closest to zero first. */
export const WARNINGS = [
  { atMs: 60_000, message: 'Less than 1 minute remaining' },
  { atMs: 10 * 60_000, message: 'Less than 10 minutes remaining' },
]

/**
 * The tightest warning that applies at `ms` remaining, or null.
 * @param {number} ms
 */
export function warningFor(ms) {
  return WARNINGS.find((warning) => ms <= warning.atMs) ?? null
}
