// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  makeContent,
  makeCuratedReference,
  makeItem,
  makeLesson,
  makeMultipleItem,
  makeOptions,
  makeShard,
  REF_URL,
  REF_URL_2,
  STEMS,
} from '../__fixtures__/contentBuilders.mjs'
import { formatIssue, validateContent } from './validate.mjs'

/** @param {(cert: any) => void} [edit] */
function run(edit) {
  const { errors, warnings } = validateContent(makeContent(edit))
  return { errors: errors.map(formatIssue), warnings: warnings.map(formatIssue) }
}

/**
 * @param {string[]} list
 * @param {string} text
 */
function expectMessage(list, text) {
  expect(list).toContainEqual(expect.stringContaining(text))
}

/** @param {any} cert */
const firstItem = (cert) => cert.shards[0].data.items[0]

describe('validateContent', () => {
  it('passes valid content with no errors or warnings', () => {
    expect(run()).toEqual({ errors: [], warnings: [] })
  })

  describe('blueprint', () => {
    it('reports a missing blueprint', () => {
      expectMessage(run((c) => (c.blueprint = null)).errors, 'blueprint.json: file is missing')
    })

    it('reports schema problems with their path', () => {
      expectMessage(run((c) => (c.blueprint.exam.minutes = 'ninety')).errors, 'exam.minutes')
    })

    it('requires certId to match the folder', () => {
      expectMessage(run((c) => (c.blueprint.certId = 'oth-c01')).errors, 'must match its folder')
    })

    it('requires weights to sum to 1', () => {
      expectMessage(
        run((c) => (c.blueprint.domains[0].weight = 0.5)).errors,
        'weights must sum to 1',
      )
    })

    it('rejects a seed target above the full target', () => {
      expectMessage(
        run((c) => (c.blueprint.itemTargets = { seed: 10, full: 5 })).errors,
        'itemTargets.seed (10) must not exceed itemTargets.full (5)',
      )
    })

    it('requires task codes to follow their domain', () => {
      expectMessage(
        run((c) => (c.blueprint.domains[1].subdomains[0].code = '3.1')).errors,
        'should be "2.1"',
      )
    })
  })

  describe('references', () => {
    it('rejects duplicate URLs', () => {
      expectMessage(run((c) => c.references.push(makeCuratedReference())).errors, 'duplicate URL')
    })

    it('rejects hosts outside AWS', () => {
      const ref = makeCuratedReference({ url: 'https://example.com/x' })
      expectMessage(run((c) => c.references.push(ref)).errors, 'allowed AWS host')
    })

    it('rejects tasks that are not in the blueprint', () => {
      const ref = makeCuratedReference({ url: 'https://aws.amazon.com/s3/', tasks: ['9.9'] })
      expectMessage(run((c) => c.references.push(ref)).errors, 'unknown task "9.9"')
    })
  })

  describe('shards', () => {
    it('rejects folders that are not blueprint tasks', () => {
      const shard = makeShard('9.9', [makeItem({ id: 'tst-c01-9.9-0001' })])
      expectMessage(
        run((c) => c.shards.push({ task: '9.9', file: '001.json', data: shard })).errors,
        '"9.9" is not a task',
      )
    })

    it('requires contiguous shard numbering', () => {
      expectMessage(run((c) => (c.shards[0].file = '002.json')).errors, 'expected 001.json')
    })

    it('requires every shard but the last to be full', () => {
      const extra = makeShard('1.1', [makeItem({ id: 'tst-c01-1.1-0003', stem: STEMS[5] })])
      expectMessage(
        run((c) => c.shards.splice(1, 0, { task: '1.1', file: '002.json', data: extra })).errors,
        'every shard except the last must hold 25',
      )
    })

    it('requires the subdomain field to match the folder', () => {
      expectMessage(
        run((c) => (c.shards[0].data.subdomain = '1.2')).errors,
        'subdomain "1.2" must match',
      )
    })
  })

  describe('items', () => {
    it('reports schema problems with the item path', () => {
      expectMessage(run((c) => (firstItem(c).difficulty = 5)).errors, 'items.0.difficulty')
    })

    it('requires ids to carry the cert and task', () => {
      expectMessage(
        run((c) => (firstItem(c).id = 'tst-c01-1.2-0009')).errors,
        'must start with "tst-c01-1.1-"',
      )
    })

    it('rejects duplicate ids across shards', () => {
      expectMessage(
        run((c) => (c.shards[1].data.items[0].id = 'tst-c01-1.1-0001')).errors,
        'duplicate id',
      )
    })

    it('requires exactly one correct option for single-answer items', () => {
      expectMessage(
        run((c) => (firstItem(c).options[1].correct = true)).errors,
        'exactly 1 correct option (found 2)',
      )
    })

    it('requires the number of correct options to equal selectCount', () => {
      expectMessage(
        run((c) => (c.shards[0].data.items[0] = makeMultipleItem({ selectCount: 3 }))).errors,
        'selectCount is 3 but 2 options are correct',
      )
    })

    it('requires enough options for multiple response', () => {
      const item = makeMultipleItem({ options: makeOptions(['a', 'c'], 4) })
      expectMessage(run((c) => (c.shards[0].data.items[0] = item)).errors, 'need 5 or 6 options')
    })

    it('requires option ids in order', () => {
      expectMessage(
        run((c) => {
          const options = firstItem(c).options
          options[0].id = 'b'
          options[1].id = 'a'
        }).errors,
        'must have id "a"',
      )
    })

    it('bans "all of the above"', () => {
      expectMessage(
        run((c) => (firstItem(c).options[3].text = 'All of the above')).errors,
        'banned phrase',
      )
    })

    it('keeps select-count text out of the stem', () => {
      expectMessage(run((c) => (firstItem(c).stem += ' (Select TWO.)')).errors, 'remove "(Select')
    })

    it.each([
      '(Select all that apply)',
      '(Select the TWO best)',
      '(Pick two)',
      '(Choose six.)',
      'Select TWO.',
      'Choose THREE.',
      'Pick 2',
    ])('flags select-count text "%s" in the stem', (suffix) => {
      expectMessage(run((c) => (firstItem(c).stem += ` ${suffix}`)).errors, 'remove "(Select')
    })

    it.each(['(select an option from the list)', 'Select the service that stores objects.'])(
      'does not flag "%s" in the stem',
      (suffix) => {
        const { errors } = run((c) => (firstItem(c).stem += ` ${suffix}`))
        expect(errors.filter((e) => e.includes('remove "(Select'))).toEqual([])
      },
    )

    it('does not flag a stem that starts with "Select the service"', () => {
      const { errors } = run((c) => (firstItem(c).stem = 'Select the service that stores objects?'))
      expect(errors.filter((e) => e.includes('remove "(Select'))).toEqual([])
    })

    it.each([
      'All of these',
      'None of these',
      'All of the answers',
      'None of the choices',
      'A and B',
      'Both A and C.',
    ])('bans option "%s"', (text) => {
      expectMessage(run((c) => (firstItem(c).options[3].text = text)).errors, 'banned phrase')
    })

    it('does not ban ordinary options containing "and"', () => {
      const { errors } = run((c) => (firstItem(c).options[3].text = 'Amazon S3 and Amazon EBS'))
      expect(errors.filter((e) => e.includes('banned phrase'))).toEqual([])
    })

    it('only allows curated references', () => {
      const ref = { url: 'https://docs.aws.amazon.com/other.html', title: 'Other' }
      expectMessage(
        run((c) => (firstItem(c).references = [ref])).errors,
        'is not in references.json',
      )
    })
  })

  describe('lessons', () => {
    it('requires a level-1 heading', () => {
      expectMessage(
        run((c) => (c.lessons[0].text = makeLesson().replace('# ', '## '))).errors,
        'level-1 heading',
      )
    })

    it('rejects an unclosed code fence', () => {
      expectMessage(
        run((c) => (c.lessons[0].text = makeLesson('T', '```mermaid\ngraph TD'))).errors,
        'unclosed',
      )
    })

    it('only allows curated links', () => {
      expectMessage(
        run(
          (c) =>
            (c.lessons[0].text = makeLesson('T', '[x](https://docs.aws.amazon.com/nope.html)')),
        ).errors,
        'link https://docs.aws.amazon.com/nope.html',
      )
    })

    it.each([
      '[x](https://docs.aws.amazon.com/nope.html "Title")',
      '<https://docs.aws.amazon.com/nope.html>',
      '[ref]: https://docs.aws.amazon.com/nope.html',
      '<a href="https://docs.aws.amazon.com/nope.html">x</a>',
      'See HTTPS://docs.aws.amazon.com/nope.html.',
    ])('checks every URL form: %s', (extra) => {
      expectMessage(run((c) => (c.lessons[0].text = makeLesson('T', extra))).errors, 'link ')
    })

    it('accepts anchored and slash-variant links to curated pages', () => {
      const extra = `[a](${REF_URL}#intro "T")\n\n<${REF_URL_2.replace(/\/$/, '')}>\n\n[b](${REF_URL_2}).`
      expect(run((c) => (c.lessons[0].text = makeLesson('T', extra))).errors).toEqual([])
    })

    it('ignores a leading BOM before the heading', () => {
      expect(run((c) => (c.lessons[0].text = `﻿${makeLesson()}`)).errors).toEqual([])
    })

    it('accepts curated links and closed diagrams', () => {
      const extra = `[Overview](${REF_URL})\n\n\`\`\`mermaid\ngraph TD\n  A-->B\n\`\`\``
      expect(run((c) => (c.lessons[0].text = makeLesson('T', extra))).errors).toEqual([])
    })
  })

  describe('warnings', () => {
    it('flags a missing lesson', () => {
      expectMessage(run((c) => c.lessons.pop()).warnings, 'review/2.1.md: lesson is missing')
    })

    it('flags tasks below the seed target', () => {
      expectMessage(
        run((c) => c.shards[2].data.items.pop()).warnings,
        'has 1 items; the seed target is 2',
      )
    })

    it('flags near-duplicate stems', () => {
      expectMessage(
        run((c) => (c.shards[0].data.items[1].stem = `${STEMS[0]} Explain.`)).warnings,
        'near-duplicate stems',
      )
    })

    it('flags an unbalanced multiple-response share', () => {
      const items = Array.from({ length: 10 }, (_, n) =>
        makeItem({ id: `tst-c01-1.1-${String(n + 1).padStart(4, '0')}`, stem: STEMS[n % 6] }),
      )
      expectMessage(
        run((c) => (c.shards[0].data.items = items)).warnings,
        'multiple-response share is 0%',
      )
    })

    it('flags lessons outside the word range', () => {
      expectMessage(
        run((c) => (c.lessons[0].text = '# Short\n\nToo short.')).warnings,
        'has 4 words',
      )
    })

    it('counts retired items toward id uniqueness', () => {
      const result = run((c) => {
        firstItem(c).retired = true
        c.shards[0].data.items.push(makeItem({ id: 'tst-c01-1.1-0001', stem: STEMS[4] }))
      })
      expectMessage(result.errors, 'duplicate id')
    })

    it('does not count retired items toward the seed target', () => {
      expectMessage(run((c) => (firstItem(c).retired = true)).warnings, 'items/1.1: has 1 items')
    })
  })
})
