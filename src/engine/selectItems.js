import { allocateByWeight, spreadEvenly } from './blueprint.js'
import { shuffle } from './rng.js'
import { isExamKind } from './testConfig.js'

/** @typedef {import('./rng.js').Rng} Rng */
/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../db/types.js').AttemptKind} AttemptKind */
/** @typedef {import('../db/types.js').ItemStat} ItemStat */
/** @typedef {Record<string, string[]>} Pools active item ids per task code */

/**
 * Picks up to `count` ids, unseen ones first (random order), then seen ones starting with
 * the least recently seen. Never returns duplicates or excluded ids.
 * @param {Rng} rng
 * @param {string[]} ids
 * @param {number} count
 * @param {Map<string, Pick<ItemStat, 'lastSeenAt'>>} stats
 * @param {Set<string>} [exclude]
 * @returns {string[]}
 */
export function pickUnseenFirst(rng, ids, count, stats, exclude = new Set()) {
  const candidates = [...new Set(ids)].filter((id) => !exclude.has(id))
  const unseen = shuffle(
    rng,
    candidates.filter((id) => !stats.has(id)),
  )
  const seen = candidates
    .filter((id) => stats.has(id))
    .sort((a, b) => (stats.get(a)?.lastSeenAt ?? 0) - (stats.get(b)?.lastSeenAt ?? 0))
  return [...unseen, ...seen].slice(0, count)
}

/**
 * Task codes a test draws from, read from its scope id: "<cert>/1.1" (a task),
 * "<cert>/d3" (a domain) or "<cert>" (everything).
 * @param {CertSummary} cert
 * @param {AttemptKind} kind
 * @param {string} scopeId
 * @returns {string[]}
 */
function scopeTasks(cert, kind, scopeId) {
  const key = scopeId.slice(cert.id.length + 1)
  if (kind === 'pre' || kind === 'post') return [key]
  if (kind === 'domain') {
    const domain = cert.domains.find((candidate) => `d${candidate.no}` === key)
    return domain ? domain.subdomains.map((sub) => sub.code) : []
  }
  return cert.domains.flatMap((domain) => domain.subdomains.map((sub) => sub.code))
}

/**
 * Spreads `count` evenly across tasks, unseen-first inside each, skipping ids already chosen.
 * @param {Rng} rng
 * @param {string[]} tasks
 * @param {number} count
 * @param {Pools} pools
 * @param {Map<string, Pick<ItemStat, 'lastSeenAt'>>} stats
 * @param {Set<string>} chosen
 * @returns {string[]}
 */
function pickAcross(rng, tasks, count, pools, stats, chosen) {
  const capacities = tasks.map((task) => (pools[task] ?? []).filter((id) => !chosen.has(id)).length)
  const counts = spreadEvenly(rng, count, capacities)
  return tasks.flatMap((task, i) =>
    pickUnseenFirst(rng, pools[task] ?? [], counts[i], stats, chosen),
  )
}

/**
 * Chooses the questions for a Pre-Test, Post-Test, Domain Assessment, Diagnostic or Full
 * exam. (Weak-Area Drill has its own selector in drill.js.)
 * @param {object} options
 * @param {Rng} options.rng
 * @param {CertSummary} options.cert
 * @param {AttemptKind} options.kind
 * @param {string} options.scopeId
 * @param {number} options.length
 * @param {Pools} options.pools
 * @param {Map<string, Pick<ItemStat, 'lastSeenAt'>>} options.stats
 * @returns {string[]} item ids in presentation order
 */
export function selectForTest({ rng, cert, kind, scopeId, length, pools, stats }) {
  const tasks = scopeTasks(cert, kind, scopeId)
  /** @type {Set<string>} */
  const chosen = new Set()

  if (isExamKind(kind)) {
    const shares = allocateByWeight(
      length,
      cert.domains.map((domain) => domain.weight),
    )
    cert.domains.forEach((domain, i) => {
      const codes = domain.subdomains.map((sub) => sub.code)
      for (const id of pickAcross(rng, codes, shares[i], pools, stats, chosen)) chosen.add(id)
    })
  } else {
    for (const id of pickAcross(rng, tasks, length, pools, stats, chosen)) chosen.add(id)
  }

  // A task or domain with too few questions leaves a gap: fill it from the rest of the scope.
  if (chosen.size < length) {
    for (const id of pickAcross(rng, tasks, length - chosen.size, pools, stats, chosen)) {
      chosen.add(id)
    }
  }
  return shuffle(rng, [...chosen])
}
