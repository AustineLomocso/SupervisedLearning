// Fails when the production build breaks the spec's size budgets. Run after `npm run build`.
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { checkBudgets, initialScriptPaths } from './lib/sizeBudget.mjs'
import { GENERATED_DIR, ROOT_DIR } from './lib/paths.mjs'

const dist = path.join(ROOT_DIR, 'dist')
const htmlPath = path.join(dist, 'index.html')
if (!fs.existsSync(htmlPath)) {
  console.error('dist/index.html not found. Run `npm run build` first.')
  process.exit(1)
}

/** @param {string} file @returns {{ name: string, bytes: number }} gzipped size */
const measure = (file) => ({
  name: path.relative(dist, file).split(path.sep).join('/'),
  bytes: zlib.gzipSync(fs.readFileSync(file)).length,
})

const html = fs.readFileSync(htmlPath, 'utf8')
const base = /(?:src|href)="(\/[^"]*\/)assets\//.exec(html)?.[1] ?? '/'
const initialJs = initialScriptPaths(html, base).map((p) => measure(path.join(dist, p)))

const manifest = measure(path.join(GENERATED_DIR, 'manifest.json'))
manifest.name = 'manifest.json'

const contentDir = path.join(dist, 'assets', 'content')
const content = fs.existsSync(contentDir) ? fs.readdirSync(contentDir) : []
const chunks = (/** @type {RegExp} */ pattern) =>
  content.filter((name) => pattern.test(name)).map((name) => measure(path.join(contentDir, name)))
const indexes = chunks(/^[^.]+-index-[\w-]+[.]js$/)
const shards = chunks(/^[^.]+-[\d.]+-\d{3}-[\w-]+[.]js$/)

const { lines, errors } = checkBudgets({ initialJs, manifest, indexes, shards })
for (const line of lines) console.log(line)
for (const error of errors) console.error(`✗ ${error}`)
process.exit(errors.length > 0 ? 1 : 0)
