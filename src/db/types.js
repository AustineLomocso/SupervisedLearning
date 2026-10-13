/**
 * JSDoc types for every record persisted in IndexedDB.
 * Use from other files as: `@typedef {import('./types.js').Attempt} Attempt`
 */

/** @typedef {'pre' | 'post' | 'domain' | 'diagnostic' | 'full' | 'drill'} AttemptKind */
/** @typedef {'study' | 'exam'} AttemptMode */
/** @typedef {'in_progress' | 'submitted'} AttemptStatus */

/**
 * A learner's answer to one item within an attempt.
 * @typedef {object} ItemResponse
 * @property {string[]} selected option ids the learner chose
 * @property {boolean} submitted true once the answer is locked
 * @property {boolean | null} correct null until graded
 * @property {boolean} markedForReview exam-mode "mark for review"
 * @property {number | null} answeredAt epoch ms
 */

/** @typedef {{ correct: number, total: number }} Tally */

/**
 * @typedef {object} AttemptResult
 * @property {number} correct
 * @property {number} total
 * @property {number} pct percent correct, 0–100
 * @property {number} scaledEstimate estimated AWS scaled score, 100–1000
 * @property {boolean} passed scaledEstimate >= 700
 * @property {Record<string, Tally>} byDomain keyed by domain id ("clf-c02/d1")
 * @property {Record<string, Tally>} bySubdomain keyed by sub-domain id ("clf-c02/1.1")
 */

/**
 * @typedef {object} Attempt
 * @property {string} id uuid
 * @property {string} certId
 * @property {AttemptKind} kind
 * @property {string} scopeId sub-domain id (pre/post), domain id (domain), cert id (diagnostic/full/drill)
 * @property {AttemptMode} mode
 * @property {AttemptStatus} status
 * @property {number} startedAt epoch ms
 * @property {number | null} deadlineAt epoch ms; only for timed attempts
 * @property {number | null} submittedAt epoch ms
 * @property {string[]} itemIds in presentation order
 * @property {Record<string, string[]>} optionOrder per item, option ids in shuffled display order
 * @property {Record<string, ItemResponse>} responses keyed by item id
 * @property {number} currentIndex
 * @property {AttemptResult | null} result set on submit
 */

/**
 * @typedef {object} ItemStat
 * @property {string} itemId
 * @property {string} certId
 * @property {string} subdomainId
 * @property {number} itemVersion item version when last answered
 * @property {number} seenCount
 * @property {number} correctCount
 * @property {number} lastSeenAt epoch ms
 * @property {boolean} lastCorrect
 */

/** @typedef {{ subdomainId: string, certId: string, reviewCompletedAt: number | null }} SubdomainProgress */

/** @typedef {'wrong-answer' | 'unclear' | 'outdated' | 'typo' | 'other'} FlagReason */

/**
 * @typedef {object} Flag
 * @property {number} id auto-increment
 * @property {string} itemId
 * @property {number} itemVersion
 * @property {string} certId
 * @property {FlagReason} reason
 * @property {string} note
 * @property {number} createdAt epoch ms
 */

/** @typedef {{ key: string, value: unknown }} Setting */

export {}
