/**
 * Blind-solve review: a reviewer answers questions with the key stripped out, and any
 * disagreement with the key is investigated before the questions ship.
 */

/** @typedef {import('../../src/content/types.js').Item} Item */
/** @typedef {{ answer?: unknown, note?: string }} ReviewerAnswer */
/** @typedef {{ id: string, key: string[], answer: string[], note: string }} Disagreement */
/**
 * @typedef {object} Comparison
 * @property {Disagreement[]} disagreements
 * @property {string[]} missing question ids with no answer at all
 * @property {string[]} invalid question ids whose answer is not a list of option ids
 */

/**
 * The questions as a reviewer sees them: no key, rationales or explanation.
 * @param {Item[]} items
 */
export function toBlindItems(items) {
  return items.map((item) => ({
    id: item.id,
    stem: item.stem,
    selectCount: item.selectCount,
    options: item.options.map((option) => ({ id: option.id, text: option.text })),
  }))
}

/**
 * A task's active (non-retired) items, in shard order.
 * @param {import('./readContent.mjs').Content} content
 * @param {string} certId
 * @param {string} task e.g. "1.1"
 * @returns {Item[]}
 */
export function activeTaskItems(content, certId, task) {
  const cert = content.certs.find((candidate) => candidate.certId === certId)
  if (!cert) throw new Error(`Unknown cert: ${certId}`)
  const items = cert.shards
    .filter((shard) => shard.task === task)
    .flatMap((shard) => shard.data.items)
    .filter((item) => !item.retired)
  if (items.length === 0) throw new Error(`No items for task ${task} in ${certId}`)
  return items
}

/** @param {string} id the trailing number of an item id, e.g. "clf-c02-1.1-0042" → 42 */
const numberOf = (id) => Number(id.slice(id.lastIndexOf('-') + 1))

/**
 * Items from `fromId` onward (by their trailing number), or all of them without it.
 * @template {{ id: string }} T
 * @param {T[]} items
 * @param {string} [fromId]
 * @returns {T[]}
 */
export function itemsFrom(items, fromId) {
  if (!fromId) return items
  const start = numberOf(fromId)
  return items.filter((item) => numberOf(item.id) >= start)
}

/**
 * @param {Item[]} items the batch, with its real key
 * @param {Record<string, ReviewerAnswer>} answers the reviewer's answers by item id
 * @returns {Comparison}
 */
export function compareAnswers(items, answers) {
  /** @type {Comparison} */
  const result = { disagreements: [], missing: [], invalid: [] }
  for (const item of items) {
    const given = answers[item.id]
    if (given === undefined) {
      result.missing.push(item.id)
      continue
    }
    const answer = given.answer
    if (!Array.isArray(answer) || answer.some((entry) => typeof entry !== 'string')) {
      result.invalid.push(item.id)
      continue
    }
    const key = item.options
      .filter((option) => option.correct)
      .map((option) => option.id)
      .sort()
    const chosen = [...new Set(answer)].sort()
    const same = key.length === chosen.length && key.every((id, i) => id === chosen[i])
    if (!same)
      result.disagreements.push({ id: item.id, key, answer: chosen, note: given.note ?? '' })
  }
  return result
}

/**
 * @param {Comparison} comparison
 * @param {number} total questions in the batch
 * @returns {{ lines: string[], exitCode: number }}
 */
export function formatComparison(comparison, total) {
  const { disagreements, missing, invalid } = comparison
  const problems = disagreements.length + missing.length + invalid.length
  if (problems === 0) return { lines: [`${total} of ${total} answers match the key.`], exitCode: 0 }
  const lines = [
    ...disagreements.map((d) => {
      const note = d.note ? ` Reviewer: ${d.note}` : ''
      return `✗ ${d.id}: key ${d.key.join(',')}, reviewer ${d.answer.join(',')}.${note}`
    }),
    ...missing.map((id) => `✗ ${id}: no answer`),
    ...invalid.map((id) => `✗ ${id}: answer must be a list of option ids`),
    `${disagreements.length} disagreement${disagreements.length === 1 ? '' : 's'}, ${missing.length} missing, ${invalid.length} invalid out of ${total}.`,
  ]
  return { lines, exitCode: 1 }
}
