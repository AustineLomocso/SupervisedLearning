// Prints item and lesson progress per task against the blueprint targets.
// Usage: npm run content:stats [-- --target 50]   (--target adds a column for that per-task count)
import { CONTENT_DIR } from './lib/paths.mjs'
import { readContent } from './lib/readContent.mjs'
import { computeStats, formatStats } from './lib/stats.mjs'

const flag = process.argv.indexOf('--target')
const target = flag === -1 ? undefined : Number(process.argv[flag + 1])
if (target !== undefined && !Number.isInteger(target)) {
  console.error('--target needs a whole number, for example: --target 50')
  process.exit(1)
}

console.log(formatStats(computeStats(await readContent(CONTENT_DIR)), { target }))
