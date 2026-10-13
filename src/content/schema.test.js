import { describe, expect, it } from 'vitest'
import {
  makeBlueprint,
  makeCuratedReference,
  makeItem,
  makeMultipleItem,
  makeShard,
} from '../../tools/__fixtures__/contentBuilders.mjs'
import {
  BlueprintSchema,
  isAllowedReferenceUrl,
  ItemSchema,
  ReferencesFileSchema,
  ShardSchema,
} from './schema.js'

describe('isAllowedReferenceUrl', () => {
  it.each([
    'https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html',
    'https://aws.amazon.com/what-is-cloud-computing/',
    'https://d1.awsstatic.com/whitepapers/aws-overview.pdf',
    'https://repost.aws/knowledge-center',
  ])('accepts %s', (url) => {
    expect(isAllowedReferenceUrl(url)).toBe(true)
  })

  it.each([
    'http://docs.aws.amazon.com/page.html',
    'https://example.com/aws',
    'https://aws.amazon.com.evil.example/page',
    'not a url',
  ])('rejects %s', (url) => {
    expect(isAllowedReferenceUrl(url)).toBe(false)
  })
})

describe('ItemSchema', () => {
  it('accepts valid single-answer and multiple-response items', () => {
    expect(ItemSchema.safeParse(makeItem()).success).toBe(true)
    expect(ItemSchema.safeParse(makeMultipleItem()).success).toBe(true)
  })

  it('rejects unknown keys so typos are caught', () => {
    expect(ItemSchema.safeParse({ ...makeItem(), explaination: 'typo' }).success).toBe(false)
  })

  it.each([
    ['difficulty out of range', { difficulty: 4 }],
    ['malformed id', { id: 'item-1' }],
    ['no references', { references: [] }],
    ['four references', { references: Array(4).fill(makeItem().references[0]) }],
    ['short explanation', { explanation: 'Too short.' }],
  ])('rejects %s', (_label, overrides) => {
    expect(ItemSchema.safeParse(makeItem(overrides)).success).toBe(false)
  })
})

describe('ShardSchema', () => {
  it('accepts up to 25 items and rejects 26', () => {
    expect(ShardSchema.safeParse(makeShard('1.1', Array(25).fill(makeItem()))).success).toBe(true)
    expect(ShardSchema.safeParse(makeShard('1.1', Array(26).fill(makeItem()))).success).toBe(false)
  })
})

describe('BlueprintSchema', () => {
  it('accepts a valid blueprint', () => {
    expect(BlueprintSchema.safeParse(makeBlueprint()).success).toBe(true)
  })

  it('rejects a malformed task code', () => {
    const blueprint = makeBlueprint()
    blueprint.domains[0].subdomains[0].code = 'one'
    expect(BlueprintSchema.safeParse(blueprint).success).toBe(false)
  })
})

describe('ReferencesFileSchema', () => {
  it('rejects a reference on a disallowed host', () => {
    const refs = [makeCuratedReference({ url: 'https://example.com/page' })]
    expect(ReferencesFileSchema.safeParse(refs).success).toBe(false)
  })

  it('requires each curated reference to name at least one task', () => {
    expect(ReferencesFileSchema.safeParse([makeCuratedReference({ tasks: [] })]).success).toBe(
      false,
    )
  })
})
