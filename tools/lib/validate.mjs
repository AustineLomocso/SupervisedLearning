import {
  BlueprintSchema,
  MAX_SHARD_ITEMS,
  OPTION_IDS,
  ReferencesFileSchema,
  ShardSchema,
} from '../../src/content/schema.js'
import { objectiveSpreadIssues } from './objectives.mjs'
import { jaccard, NEAR_DUPLICATE_THRESHOLD, trigrams } from './similarity.mjs'

/** @typedef {import('./readContent.mjs').Content} Content */
/** @typedef {import('./readContent.mjs').CertContent} CertContent */
/** @typedef {import('../../src/content/types.js').Blueprint} Blueprint */
/** @typedef {import('../../src/content/types.js').Item} Item */
/** @typedef {{ file: string, message: string }} Issue */
/** @typedef {{ errors: Issue[], warnings: Issue[] }} ValidationResult */
/** @typedef {(file: string, message: string) => void} Report */

/** Multiple-response share (of active items) that tasks with 10+ items should stay within. */
export const MR_SHARE_RANGE = [0.15, 0.3]
export const LESSON_WORD_RANGE = [400, 1200]

const BANNED_OPTION =
  /\b(?:(?:all|none|both|neither) of the (?:above|options|answers|choices)|(?:all|none) of these)\b|^(?:both\s+)?[a-f]\s+and\s+[a-f]\.?$/i
const SELECT_COUNT_IN_STEM = new RegExp(
  [
    /\((?:select|choose|pick)\s+(?:all|the|one|two|three|four|five|six|\d)\b[^)]*\)/.source,
    /(?:^|[.?!]\s+)(?:select|choose|pick)\s+(?:one|two|three|four|five|six|\d)\.?\s*$/.source,
  ].join('|'),
  'i',
)
const URL_IN_TEXT = /https?:\/\/[^\s<>"'`]+/gi

/**
 * Strips trailing punctuation from a URL found in prose.
 * @param {string} url
 */
function trimUrl(url) {
  return url.replace(/[.,;:)"'>\]]+$/, '')
}

/**
 * Drops a trailing #fragment and trailing slash so equivalent URLs compare equal.
 * @param {string} url
 */
function normalizeUrl(url) {
  return url.replace(/#.*$/, '').replace(/\/$/, '')
}

/** @param {Issue} issue */
export function formatIssue(issue) {
  return `${issue.file}: ${issue.message}`
}

/**
 * Checks all content. Errors make content unusable (build:index refuses to run); warnings
 * flag coverage or quality gaps that `validate:content --strict` also treats as failures.
 * @param {Content} content
 * @returns {ValidationResult}
 */
export function validateContent(content) {
  /** @type {ValidationResult} */
  const result = { errors: [], warnings: [] }
  for (const cert of content.certs) validateCert(cert, result)
  return result
}

/**
 * @param {CertContent} cert
 * @param {ValidationResult} result
 */
function validateCert(cert, result) {
  const base = `content/${cert.certId}`
  /** @type {Report} */
  const error = (file, message) => result.errors.push({ file: `${base}/${file}`, message })
  /** @type {Report} */
  const warn = (file, message) => result.warnings.push({ file: `${base}/${file}`, message })

  const blueprint = checkBlueprint(cert, error)
  if (!blueprint) return
  const taskCodes = new Set(blueprint.domains.flatMap((d) => d.subdomains.map((s) => s.code)))
  const curated = checkReferences(cert.references, taskCodes, error)

  /** @type {Map<string, Item[]>} */
  const activeByTask = new Map([...taskCodes].map((code) => [code, []]))
  checkShards(cert, taskCodes, curated, activeByTask, error)
  const lessonTasks = checkLessons(cert, taskCodes, curated, error, warn)
  checkCoverage(blueprint, activeByTask, lessonTasks, warn)
}

/**
 * @param {import('zod').ZodError} zodError
 * @param {string} file
 * @param {Report} error
 */
function reportZod(zodError, file, error) {
  for (const issue of zodError.issues) {
    const where = issue.path.join('.')
    error(file, where ? `${where}: ${issue.message}` : issue.message)
  }
}

/**
 * @param {CertContent} cert
 * @param {Report} error
 * @returns {Blueprint | null}
 */
function checkBlueprint(cert, error) {
  if (cert.blueprint === null) {
    error('blueprint.json', 'file is missing')
    return null
  }
  const parsed = BlueprintSchema.safeParse(cert.blueprint)
  if (!parsed.success) {
    reportZod(parsed.error, 'blueprint.json', error)
    return null
  }
  const blueprint = parsed.data
  if (blueprint.certId !== cert.certId) {
    error('blueprint.json', `certId "${blueprint.certId}" must match its folder "${cert.certId}"`)
  }
  const totalWeight = blueprint.domains.reduce((sum, domain) => sum + domain.weight, 0)
  if (Math.abs(totalWeight - 1) > 0.001) {
    error('blueprint.json', `domain weights must sum to 1 (got ${totalWeight.toFixed(3)})`)
  }
  if (blueprint.itemTargets.seed > blueprint.itemTargets.full) {
    error(
      'blueprint.json',
      `itemTargets.seed (${blueprint.itemTargets.seed}) must not exceed itemTargets.full (${blueprint.itemTargets.full})`,
    )
  }
  blueprint.domains.forEach((domain, d) => {
    if (domain.no !== d + 1) {
      error('blueprint.json', `domain ${d + 1} is numbered ${domain.no}; number domains 1, 2, 3…`)
    }
    domain.subdomains.forEach((sub, s) => {
      const expected = `${domain.no}.${s + 1}`
      if (sub.code !== expected) {
        error(
          'blueprint.json',
          `task "${sub.code}" should be "${expected}" (tasks are numbered within their domain)`,
        )
      }
    })
  })
  return blueprint
}

/**
 * @param {unknown} references
 * @param {Set<string>} taskCodes
 * @param {Report} error
 * @returns {Set<string>} curated URLs
 */
function checkReferences(references, taskCodes, error) {
  const parsed = ReferencesFileSchema.safeParse(references)
  if (!parsed.success) {
    reportZod(parsed.error, 'references.json', error)
    return new Set()
  }
  const urls = new Set()
  for (const ref of parsed.data) {
    if (urls.has(ref.url)) error('references.json', `duplicate URL ${ref.url}`)
    urls.add(ref.url)
    for (const task of ref.tasks) {
      if (!taskCodes.has(task)) error('references.json', `${ref.url} lists unknown task "${task}"`)
    }
  }
  return urls
}

/**
 * @param {CertContent} cert
 * @param {Set<string>} taskCodes
 * @param {Set<string>} curated
 * @param {Map<string, Item[]>} activeByTask
 * @param {Report} error
 */
function checkShards(cert, taskCodes, curated, activeByTask, error) {
  const seenIds = new Set()
  const objectiveCounts = objectiveCountsByTask(cert)
  for (const [task, shards] of Map.groupBy(cert.shards, (shard) => shard.task)) {
    const folder = `items/${task}`
    if (!taskCodes.has(task)) {
      error(folder, `"${task}" is not a task in blueprint.json`)
      continue
    }
    shards.forEach((shard, s) => {
      const file = `${folder}/${shard.file}`
      const expectedName = `${String(s + 1).padStart(3, '0')}.json`
      if (shard.file !== expectedName) {
        error(file, `shard files must be numbered 001.json, 002.json… (expected ${expectedName})`)
      }
      const parsed = ShardSchema.safeParse(shard.data)
      if (!parsed.success) {
        reportZod(parsed.error, file, error)
        return
      }
      const { subdomain, items } = parsed.data
      if (subdomain !== task)
        error(file, `subdomain "${subdomain}" must match its folder "${task}"`)
      if (s < shards.length - 1 && items.length !== MAX_SHARD_ITEMS) {
        error(
          file,
          `holds ${items.length} items; every shard except the last must hold ${MAX_SHARD_ITEMS}`,
        )
      }
      items.forEach((item, n) => {
        /** @param {string} message */
        const say = (message) => error(file, `items.${n} (${item.id}): ${message}`)
        if (seenIds.has(item.id)) say('duplicate id')
        seenIds.add(item.id)
        checkItem(item, `${cert.certId}-${task}-`, curated, say)
        const objectiveCount = objectiveCounts.get(task) ?? 0
        if (item.objective !== undefined && item.objective >= objectiveCount) {
          say(
            `objective ${item.objective} is out of range (task ${task} has ${objectiveCount} objectives, numbered from 0)`,
          )
        }
        if (!item.retired) activeByTask.get(task)?.push(item)
      })
    })
  }
}

/**
 * How many objectives the blueprint lists per task. Tolerates a broken blueprint (it is
 * reported elsewhere): unreadable entries just count as zero.
 * @param {CertContent} cert
 * @returns {Map<string, number>}
 */
function objectiveCountsByTask(cert) {
  /** @type {Map<string, number>} */
  const counts = new Map()
  const domains = Array.isArray(cert.blueprint?.domains) ? cert.blueprint.domains : []
  for (const domain of domains) {
    for (const sub of Array.isArray(domain?.subdomains) ? domain.subdomains : []) {
      counts.set(sub.code, Array.isArray(sub.objectives) ? sub.objectives.length : 0)
    }
  }
  return counts
}

/**
 * @param {Item} item
 * @param {string} idPrefix
 * @param {Set<string>} curated
 * @param {(message: string) => void} say
 */
function checkItem(item, idPrefix, curated, say) {
  if (!item.id.startsWith(idPrefix)) say(`id must start with "${idPrefix}"`)
  item.options.forEach((option, i) => {
    if (option.id !== OPTION_IDS[i]) {
      say(`option ${i + 1} must have id "${OPTION_IDS[i]}" (ids run a, b, c… in order)`)
    }
    if (BANNED_OPTION.test(option.text)) {
      say(`option ${option.id} uses a banned phrase ("all/none of the above")`)
    }
  })
  const correct = item.options.filter((option) => option.correct).length
  if (item.type === 'single') {
    if (item.options.length !== 4) say('single-answer items need exactly 4 options')
    if (item.selectCount !== 1) say('single-answer items need selectCount 1')
    if (correct !== 1) say(`single-answer items need exactly 1 correct option (found ${correct})`)
  } else {
    if (item.options.length < 5) say('multiple-response items need 5 or 6 options')
    if (item.selectCount < 2) say('multiple-response items need selectCount of at least 2')
    if (correct !== item.selectCount) {
      say(`selectCount is ${item.selectCount} but ${correct} options are correct`)
    }
    if (item.options.length < item.selectCount + 3) {
      say(`needs at least ${item.selectCount + 3} options for selectCount ${item.selectCount}`)
    }
  }
  if (SELECT_COUNT_IN_STEM.test(item.stem)) {
    say('remove "(Select …)" from the stem; the app shows it from selectCount')
  }
  for (const ref of item.references) {
    if (!curated.has(ref.url)) say(`reference ${ref.url} is not in references.json`)
  }
}

/**
 * @param {CertContent} cert
 * @param {Set<string>} taskCodes
 * @param {Set<string>} curated
 * @param {Report} error
 * @param {Report} warn
 * @returns {Set<string>} tasks that have a lesson
 */
function checkLessons(cert, taskCodes, curated, error, warn) {
  const lessonTasks = new Set()
  const curatedNormalized = new Set([...curated].map(normalizeUrl))
  const [minWords, maxWords] = LESSON_WORD_RANGE
  for (const lesson of cert.lessons) {
    const file = `review/${lesson.task}.md`
    if (!taskCodes.has(lesson.task)) {
      error(file, `"${lesson.task}" is not a task in blueprint.json`)
      continue
    }
    lessonTasks.add(lesson.task)
    const text = lesson.text.replace(/^﻿/, '')
    const lines = text.split(/\r?\n/)
    const firstLine = lines.find((line) => line.trim() !== '') ?? ''
    if (!firstLine.startsWith('# ')) error(file, 'must start with a level-1 heading ("# Title")')
    const fences = lines.filter((line) => line.trimStart().startsWith('```')).length
    if (fences % 2 !== 0) error(file, 'has an unclosed ``` code fence')
    for (const [match] of text.matchAll(URL_IN_TEXT)) {
      const url = trimUrl(match)
      if (!curatedNormalized.has(normalizeUrl(url))) {
        error(file, `link ${url} is not in references.json`)
      }
    }
    const words = text.split(/\s+/).filter(Boolean).length
    if (words < minWords || words > maxWords) {
      warn(file, `has ${words} words; aim for ${minWords}–${maxWords}`)
    }
  }
  return lessonTasks
}

/**
 * @param {Blueprint} blueprint
 * @param {Map<string, Item[]>} activeByTask
 * @param {Set<string>} lessonTasks
 * @param {Report} warn
 */
function checkCoverage(blueprint, activeByTask, lessonTasks, warn) {
  const [minShare, maxShare] = MR_SHARE_RANGE
  const objectiveCounts = new Map(
    blueprint.domains.flatMap((domain) =>
      domain.subdomains.map((sub) => [sub.code, sub.objectives.length]),
    ),
  )
  for (const [task, items] of activeByTask) {
    const folder = `items/${task}`
    for (const issue of objectiveSpreadIssues(items, objectiveCounts.get(task) ?? 0)) {
      warn(folder, issue)
    }
    if (!lessonTasks.has(task)) warn(`review/${task}.md`, 'lesson is missing')
    if (items.length < blueprint.itemTargets.seed) {
      warn(folder, `has ${items.length} items; the seed target is ${blueprint.itemTargets.seed}`)
    }
    if (items.length >= 10) {
      const share = items.filter((item) => item.type === 'multiple').length / items.length
      if (share < minShare || share > maxShare) {
        warn(
          folder,
          `multiple-response share is ${Math.round(share * 100)}%; aim for ${Math.round(minShare * 100)}–${Math.round(maxShare * 100)}%`,
        )
      }
    }
    const grams = items.map((item) => trigrams(item.stem))
    for (let a = 0; a < items.length; a++) {
      for (let b = a + 1; b < items.length; b++) {
        if (jaccard(grams[a], grams[b]) >= NEAR_DUPLICATE_THRESHOLD) {
          warn(folder, `${items[a].id} and ${items[b].id} have near-duplicate stems`)
        }
      }
    }
  }
}
