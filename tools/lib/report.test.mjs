// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { reportValidation } from './report.mjs'

/** @param {string} message */
const issue = (message) => ({ file: 'content/x/blueprint.json', message })

describe('reportValidation', () => {
  it('passes clean content', () => {
    expect(reportValidation({ errors: [], warnings: [] })).toEqual({
      lines: ['0 error(s), 0 warning(s)'],
      exitCode: 0,
    })
  })

  it('fails on errors and lists errors before warnings', () => {
    const { lines, exitCode } = reportValidation({
      errors: [issue('bad')],
      warnings: [issue('meh')],
    })
    expect(exitCode).toBe(1)
    expect(lines.slice(0, 2)).toEqual([
      '✗ content/x/blueprint.json: bad',
      '⚠ content/x/blueprint.json: meh',
    ])
  })

  it('lets warnings pass by default', () => {
    expect(reportValidation({ errors: [], warnings: [issue('meh')] }).exitCode).toBe(0)
  })

  it('fails on warnings in strict mode', () => {
    const { lines, exitCode } = reportValidation(
      { errors: [], warnings: [issue('meh')] },
      { strict: true },
    )
    expect(exitCode).toBe(1)
    expect(lines.at(-1)).toContain('strict')
  })
})
