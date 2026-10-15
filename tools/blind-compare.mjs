// Compares a reviewer's blind answers with the key and exits 1 on any disagreement.
// Usage: npm run blind:compare -- <cert> <task> <answers.json> [--from <itemId>]
// answers.json: { "<itemId>": { "answer": ["a"], "note": "optional" }, ... }
import fs from 'node:fs'
import { activeTaskItems, compareAnswers, formatComparison, itemsFrom } from './lib/blindSolve.mjs'
import { CONTENT_DIR } from './lib/paths.mjs'
import { readContent } from './lib/readContent.mjs'

const args = process.argv.slice(2)
const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : undefined
const [certId, task, answersFile] = args

if (
  !certId ||
  !task ||
  !answersFile ||
  [certId, task, answersFile].some((a) => a.startsWith('--'))
) {
  console.error('Usage: npm run blind:compare -- <cert> <task> <answers.json> [--from <itemId>]')
  process.exit(1)
}

try {
  const items = itemsFrom(activeTaskItems(await readContent(CONTENT_DIR), certId, task), from)
  const answers = JSON.parse(fs.readFileSync(answersFile, 'utf8'))
  const { lines, exitCode } = formatComparison(compareAnswers(items, answers), items.length)
  for (const line of lines) console.log(line)
  process.exit(exitCode)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
