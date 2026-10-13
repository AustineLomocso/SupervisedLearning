import { formatIssue } from './validate.mjs'

/**
 * Turns a validation result into printable lines and a process exit code.
 * @param {import('./validate.mjs').ValidationResult} result
 * @param {{ strict?: boolean }} [options] strict: warnings also fail
 * @returns {{ lines: string[], exitCode: number }}
 */
export function reportValidation({ errors, warnings }, { strict = false } = {}) {
  const summary = `${errors.length} error(s), ${warnings.length} warning(s)`
  const lines = [
    ...errors.map((issue) => `✗ ${formatIssue(issue)}`),
    ...warnings.map((issue) => `⚠ ${formatIssue(issue)}`),
    strict ? `${summary} (strict: warnings fail)` : summary,
  ]
  const failed = errors.length > 0 || (strict && warnings.length > 0)
  return { lines, exitCode: failed ? 1 : 0 }
}
