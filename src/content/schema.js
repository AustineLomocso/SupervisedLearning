import { z } from 'zod'

/** Hosts (and their subdomains) that curated references may point to. */
export const ALLOWED_REFERENCE_HOSTS = ['aws.amazon.com', 'd1.awsstatic.com', 'repost.aws']

/** Option ids, in the order options must appear. */
export const OPTION_IDS = /** @type {const} */ (['a', 'b', 'c', 'd', 'e', 'f'])

export const MAX_SHARD_ITEMS = 25

/**
 * True for https URLs on an allowed AWS host or one of its subdomains.
 * @param {string} value
 */
export function isAllowedReferenceUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  return ALLOWED_REFERENCE_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
  )
}

const text = z.string().trim().min(1)
const positiveInt = z.number().int().positive()
const taskCode = z.string().regex(/^\d+\.\d+$/, 'must look like "1.1"')
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
const awsUrl = z
  .string()
  .refine(isAllowedReferenceUrl, 'must be an https URL on an allowed AWS host')

/** A reference cited by an item. */
export const ReferenceSchema = z.strictObject({ url: awsUrl, title: text })

/** One entry of content/<cert>/references.json: a link-checked page and the tasks it supports. */
export const CuratedReferenceSchema = z.strictObject({
  url: awsUrl,
  title: text,
  tasks: z.array(taskCode).min(1),
})

export const ReferencesFileSchema = z.array(CuratedReferenceSchema)

export const BlueprintSchema = z.strictObject({
  schemaVersion: z.literal(1),
  certId: z.string().regex(/^[a-z]{3}-c\d{2}$/, 'must look like "clf-c02"'),
  code: z.string().regex(/^[A-Z]{3}-C\d{2}$/, 'must look like "CLF-C02"'),
  title: text,
  displayOrder: positiveInt,
  source: z.strictObject({ url: awsUrl, retrievedOn: isoDate }),
  exam: z.strictObject({
    questions: positiveInt,
    scored: positiveInt,
    minutes: positiveInt,
    passScaled: z.number().int().min(100).max(1000),
  }),
  itemTargets: z.strictObject({ seed: positiveInt, full: positiveInt }),
  domains: z
    .array(
      z.strictObject({
        no: positiveInt,
        title: text,
        weight: z.number().gt(0).lt(1),
        subdomains: z
          .array(z.strictObject({ code: taskCode, title: text, objectives: z.array(text).min(1) }))
          .min(1),
      }),
    )
    .min(1),
})

export const OptionSchema = z.strictObject({
  id: z.enum(OPTION_IDS),
  text,
  correct: z.boolean(),
  rationale: z.string().trim().min(20),
})

export const ItemSchema = z.strictObject({
  id: z.string().regex(/^[a-z]{3}-c\d{2}-\d+\.\d+-\d{4}$/, 'must look like "clf-c02-1.1-0001"'),
  version: positiveInt,
  type: z.enum(['single', 'multiple']),
  selectCount: positiveInt,
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  stem: z.string().trim().min(20),
  options: z.array(OptionSchema).min(4).max(6),
  explanation: z.string().trim().min(100),
  references: z.array(ReferenceSchema).min(1).max(3),
  retired: z.boolean().optional(),
})

export const ShardSchema = z.strictObject({
  schemaVersion: z.literal(1),
  subdomain: taskCode,
  items: z.array(ItemSchema).min(1).max(MAX_SHARD_ITEMS),
})
