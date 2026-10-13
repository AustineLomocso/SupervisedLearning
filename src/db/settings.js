import { db } from './db.js'

/**
 * @template T
 * @param {string} key
 * @param {T} fallback returned when the setting has never been saved
 * @returns {Promise<T>}
 */
export async function getSetting(key, fallback) {
  const row = await db.settings.get(key)
  return row === undefined ? fallback : /** @type {T} */ (row.value)
}

/**
 * @param {string} key
 * @param {unknown} value any structured-cloneable value
 */
export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}
