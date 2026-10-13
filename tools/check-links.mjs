// Fetches every URL in content/*/references.json. Manual tool (needs network); not run in CI.
import { checkUrls } from './lib/checkLinks.mjs'
import { CONTENT_DIR } from './lib/paths.mjs'
import { readContent } from './lib/readContent.mjs'

const content = await readContent(CONTENT_DIR)
const urls = [
  ...new Set(
    content.certs.flatMap((cert) =>
      Array.isArray(cert.references) ? cert.references.map((ref) => ref.url) : [],
    ),
  ),
]

console.log(`Checking ${urls.length} curated URL(s)…`)
const results = await checkUrls(urls)
for (const result of results) {
  if (result.ok && result.finalUrl) {
    console.log(
      `↪ ${result.url} redirects to ${result.finalUrl}; use the final URL in references.json`,
    )
  }
}
const failures = results.filter((result) => !result.ok)
for (const failure of failures) {
  console.log(`✗ ${failure.url} → ${failure.status || failure.error}`)
}
console.log(`${results.length - failures.length}/${results.length} OK`)
process.exitCode = failures.length > 0 ? 1 : 0
