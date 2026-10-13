// Full content report. Exit code 1 on errors, or on any warning with --strict.
import { CONTENT_DIR } from './lib/paths.mjs'
import { readContent } from './lib/readContent.mjs'
import { reportValidation } from './lib/report.mjs'
import { validateContent } from './lib/validate.mjs'

const strict = process.argv.includes('--strict')
const result = validateContent(await readContent(CONTENT_DIR))
const { lines, exitCode } = reportValidation(result, { strict })
for (const line of lines) console.log(line)
process.exitCode = exitCode
