/** Stems at or above this trigram similarity are reported as near-duplicates. */
export const NEAR_DUPLICATE_THRESHOLD = 0.8

/**
 * Character trigrams of the text, lower-cased with punctuation collapsed to spaces.
 * @param {string} text
 * @returns {Set<string>}
 */
export function trigrams(text) {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  const grams = new Set()
  for (let i = 0; i + 3 <= normalized.length; i++) grams.add(normalized.slice(i, i + 3))
  return grams
}

/**
 * Jaccard similarity of two sets: shared / union.
 * @param {Set<string>} a
 * @param {Set<string>} b
 */
export function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1
  let shared = 0
  for (const gram of a) if (b.has(gram)) shared++
  return shared / (a.size + b.size - shared)
}

/**
 * @param {string} a
 * @param {string} b
 */
export function stemSimilarity(a, b) {
  return jaccard(trigrams(a), trigrams(b))
}
