import { getSubdomainItemIds, loadItems } from '../content/loadItems.js'
import { createAttempt, listAttempts } from '../db/attempts.js'
import { getStatsForCert } from '../db/itemStats.js'
import { selectDrill } from './drill.js'
import { collectAnswers, masteryBySubdomain } from './mastery.js'
import { createRng, randomSeed, shuffle } from './rng.js'
import { selectForTest } from './selectItems.js'
import { isExamKind } from './testConfig.js'

/** @typedef {import('../content/certs.js').CertSummary} CertSummary */
/** @typedef {import('../db/types.js').AttemptKind} AttemptKind */
/** @typedef {import('../db/types.js').AttemptMode} AttemptMode */
/** @typedef {import('./rng.js').Rng} Rng */

/**
 * Picks the questions for a test, loads only the shards it needs, shuffles each question's
 * options, and stores the new attempt.
 * @param {object} options
 * @param {CertSummary} options.cert
 * @param {AttemptKind} options.kind
 * @param {string} options.scopeId from resolveTestScope()
 * @param {number} options.length ignored for Diagnostic/Full, which use the real exam length
 * @param {AttemptMode} options.mode only Diagnostic/Full can be "exam"
 * @param {Rng} [options.rng] seeded in tests
 * @returns {Promise<import('../db/types.js').Attempt>}
 */
export async function startTest({
  cert,
  kind,
  scopeId,
  length,
  mode,
  rng = createRng(randomSeed()),
}) {
  const codes = cert.domains.flatMap((domain) => domain.subdomains.map((sub) => sub.code))
  const lists = await Promise.all(codes.map((code) => getSubdomainItemIds(cert.id, code)))
  /** @type {Record<string, string[]>} */
  const pools = Object.fromEntries(codes.map((code, i) => [code, lists[i]]))
  const stats = new Map((await getStatsForCert(cert.id)).map((row) => [row.itemId, row]))

  const exam = isExamKind(kind)
  const count = exam ? cert.exam.questions : length
  const itemIds =
    kind === 'drill'
      ? selectDrill({
          rng,
          cert,
          length: count,
          pools,
          stats,
          mastery: masteryBySubdomain(collectAnswers(await listAttempts(cert.id))),
        })
      : selectForTest({ rng, cert, kind, scopeId, length: count, pools, stats })
  if (itemIds.length === 0) throw new Error('There are no questions available for this test yet.')

  const items = await loadItems(cert.id, itemIds)
  const optionOrder = Object.fromEntries(
    items.map((item) => [
      item.id,
      shuffle(
        rng,
        item.options.map((option) => option.id),
      ),
    ]),
  )
  const chosenMode = exam ? mode : 'study'
  return createAttempt({
    certId: cert.id,
    kind,
    scopeId,
    mode: chosenMode,
    itemIds,
    optionOrder,
    timeLimitSec: exam && chosenMode === 'exam' ? cert.exam.minutes * 60 : null,
  })
}
