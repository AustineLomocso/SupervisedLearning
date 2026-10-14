import { allocateByWeight } from './blueprint.js'
import { shuffle } from './rng.js'
import { pickUnseenFirst } from './selectItems.js'

/** @typedef {import('./rng.js').Rng} Rng */
/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../db/types.js').ItemStat} ItemStat */
/** @typedef {import('./mastery.js').Mastery} Mastery */

/**
 * Weak-Area Drill: about half previously missed questions, the rest drawn from the weakest
 * tasks in proportion to (1 − mastery) × domain weight. A task with no answers counts as 0%.
 * @param {object} options
 * @param {Rng} options.rng
 * @param {CertSummary} options.cert
 * @param {number} options.length
 * @param {Record<string, string[]>} options.pools active item ids per task code
 * @param {Map<string, ItemStat>} options.stats
 * @param {Map<string, Mastery>} options.mastery keyed by sub-domain id
 * @returns {string[]} item ids in presentation order
 */
export function selectDrill({ rng, cert, length, pools, stats, mastery }) {
  const tasks = cert.domains.flatMap((domain) => domain.subdomains.map((sub) => ({ sub, domain })))
  /** @type {Set<string>} */
  const chosen = new Set()

  const missed = shuffle(
    rng,
    tasks.flatMap(({ sub }) =>
      (pools[sub.code] ?? []).filter((id) => stats.get(id)?.lastCorrect === false),
    ),
  )
  for (const id of missed.slice(0, Math.ceil(length / 2))) chosen.add(id)

  const priorities = tasks.map(
    ({ sub, domain }) => (1 - (mastery.get(sub.id)?.pct ?? 0) / 100) * domain.weight,
  )
  // Everything mastered: fall back to plain domain weights so the drill still has a spread.
  const weights = priorities.some((value) => value > 0)
    ? priorities
    : tasks.map(({ domain }) => domain.weight)

  const shares = allocateByWeight(length - chosen.size, weights)
  tasks.forEach(({ sub }, i) => {
    for (const id of pickUnseenFirst(rng, pools[sub.code] ?? [], shares[i], stats, chosen)) {
      chosen.add(id)
    }
  })

  // A weak task with too few questions leaves a gap: fill it, weakest tasks first.
  if (chosen.size < length) {
    const byPriority = tasks.map((_, i) => i).sort((a, b) => weights[b] - weights[a])
    for (const i of byPriority) {
      if (chosen.size >= length) break
      const more = pickUnseenFirst(
        rng,
        pools[tasks[i].sub.code] ?? [],
        length - chosen.size,
        stats,
        chosen,
      )
      for (const id of more) chosen.add(id)
    }
  }
  return shuffle(rng, [...chosen])
}
