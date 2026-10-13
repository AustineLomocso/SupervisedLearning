// Validates content (errors are fatal), then writes src/generated/manifest.json and one
// <certId>.index.json per cert. Runs automatically before dev, build, test and typecheck.
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildCertIndex, buildManifest } from './lib/buildIndex.mjs'
import { CONTENT_DIR, GENERATED_DIR } from './lib/paths.mjs'
import { readContent } from './lib/readContent.mjs'
import { formatIssue, validateContent } from './lib/validate.mjs'

const content = await readContent(CONTENT_DIR)
const { errors, warnings } = validateContent(content)

if (errors.length > 0) {
  console.error(`build:index: content has ${errors.length} error(s):`)
  for (const issue of errors) console.error(`  ✗ ${formatIssue(issue)}`)
  process.exit(1)
}

await rm(GENERATED_DIR, { recursive: true, force: true })
await mkdir(GENERATED_DIR, { recursive: true })
await writeFile(
  path.join(GENERATED_DIR, 'manifest.json'),
  `${JSON.stringify(buildManifest(content))}\n`,
)
for (const cert of content.certs) {
  const file = path.join(GENERATED_DIR, `${cert.certId}.index.json`)
  await writeFile(file, `${JSON.stringify(buildCertIndex(cert))}\n`)
}

const note =
  warnings.length > 0 ? ` (${warnings.length} warning(s); see npm run validate:content)` : ''
console.log(
  `build:index: wrote manifest.json and ${content.certs.length} cert index file(s)${note}`,
)
