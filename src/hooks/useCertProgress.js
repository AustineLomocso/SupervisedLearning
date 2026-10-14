import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { listAttempts } from '../db/attempts.js'
import { listProgressForCert } from '../db/progress.js'
import { collectAnswers, masteryBySubdomain } from '../engine/mastery.js'

/** @typedef {import('../db/types.js').Attempt} Attempt */
/** @typedef {import('../db/types.js').SubdomainProgress} SubdomainProgress */
/** @typedef {import('../engine/mastery.js').Mastery} Mastery */

/**
 * @typedef {object} CertProgress
 * @property {Attempt[]} attempts newest first
 * @property {Map<string, SubdomainProgress>} reviews keyed by sub-domain id
 * @property {Map<string, Mastery>} mastery keyed by sub-domain id
 * @property {number} answeredCount graded answers in the cert's whole history
 */

/**
 * Live view of one cert's progress. Re-renders whenever attempts or review marks change.
 * @param {string} certId
 * @returns {CertProgress | undefined} undefined while loading
 */
export function useCertProgress(certId) {
  const data = useLiveQuery(async () => {
    try {
      const [attempts, reviews] = await Promise.all([
        listAttempts(certId),
        listProgressForCert(certId),
      ])
      return { attempts, reviews }
    } catch (error) {
      // Storage blocked (StorageWarning already says so): show the page with no progress.
      console.error('Failed to read progress', error)
      return { attempts: [], reviews: [] }
    }
  }, [certId])

  return useMemo(() => {
    if (!data) return undefined
    const answers = collectAnswers(data.attempts)
    return {
      attempts: data.attempts,
      reviews: new Map(data.reviews.map((row) => [row.subdomainId, row])),
      mastery: masteryBySubdomain(answers),
      answeredCount: answers.length,
    }
  }, [data])
}
