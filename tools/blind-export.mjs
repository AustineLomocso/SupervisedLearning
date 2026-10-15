// Writes a task's questions without the answer key, for a blind-solve review.
// Usage: npm run blind:export -- <cert> <task> [--from <itemId>] [--out <file>]
//   --from  only items numbered from this id on (the new batch); default is every active item
//   --out   write JSON to a file instead of printing it
import fs from 'node:fs'
import { activeTaskItems, itemsFrom, toBlindItems } from './lib/blindSolve.mjs'
import { CONTENT_DIR } from './lib/paths.mjs'
import { readContent } from './lib/readContent.mjs'

const args = process.argv.slice(2)
/** @param {string} name */
const option = (name) => {
  const at = args.indexOf(name)
  return at === -1 ? undefined : args[at + 1]
}
const [certId, task] = args

if (!certId || !task || certId.startsWith('--') || task.startsWith('--')) {
  console.error('Usage: npm run blind:export -- <cert> <task> [--from <itemId>] [--out <file>]')
  process.exit(1)
}

try {
  const items = itemsFrom(
    activeTaskItems(await readContent(CONTENT_DIR), certId, task),
    option('--from'),
  )
  if (items.length === 0) throw new Error('No questions match --from')
  const json = JSON.stringify(toBlindItems(items), null, 2)
  const out = option('--out')
  if (out) {
    fs.writeFileSync(out, `${json}\n`)
    console.log(`Wrote ${items.length} questions to ${out}`)
  } else {
    console.log(json)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
