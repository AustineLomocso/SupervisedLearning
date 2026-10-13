// Prints item and lesson progress per task against the blueprint targets.
import { CONTENT_DIR } from './lib/paths.mjs'
import { readContent } from './lib/readContent.mjs'
import { computeStats, formatStats } from './lib/stats.mjs'

console.log(formatStats(computeStats(await readContent(CONTENT_DIR))))
