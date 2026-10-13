import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { compareTaskCodes } from './order.mjs'

/**
 * @typedef {object} ShardFile
 * @property {string} task folder name, e.g. "1.1"
 * @property {string} file file name, e.g. "001.json"
 * @property {any} data parsed JSON, not yet validated
 */

/**
 * @typedef {object} LessonFile
 * @property {string} task
 * @property {string} text
 */

/**
 * @typedef {object} CertContent
 * @property {string} certId folder name, e.g. "clf-c02"
 * @property {any} blueprint parsed blueprint.json, or null when the file is missing
 * @property {any} references parsed references.json, or [] when the file is missing
 * @property {ShardFile[]} shards ordered by task, then file name
 * @property {LessonFile[]} lessons ordered by task
 */

/** @typedef {{ certs: CertContent[] }} Content */

/**
 * Reads every cert folder under `rootDir`. Missing folders and files come back empty so the
 * validator can explain what is missing; malformed JSON throws with the file path.
 * @param {string} rootDir
 * @returns {Promise<Content>}
 */
export async function readContent(rootDir) {
  const certIds = (await listDirNames(rootDir)).sort()
  return { certs: await Promise.all(certIds.map((id) => readCert(path.join(rootDir, id), id))) }
}

/**
 * @param {string} dir
 * @param {string} certId
 * @returns {Promise<CertContent>}
 */
async function readCert(dir, certId) {
  /** @type {ShardFile[]} */
  const shards = []
  for (const task of await listDirNames(path.join(dir, 'items'))) {
    for (const file of await listFileNames(path.join(dir, 'items', task), '.json')) {
      shards.push({ task, file, data: await readJson(path.join(dir, 'items', task, file)) })
    }
  }
  shards.sort((a, b) => compareTaskCodes(a.task, b.task) || a.file.localeCompare(b.file))

  /** @type {LessonFile[]} */
  const lessons = []
  for (const file of await listFileNames(path.join(dir, 'review'), '.md')) {
    const text = await readFile(path.join(dir, 'review', file), 'utf8')
    lessons.push({ task: file.slice(0, -'.md'.length), text })
  }
  lessons.sort((a, b) => compareTaskCodes(a.task, b.task))

  return {
    certId,
    blueprint: await readJson(path.join(dir, 'blueprint.json'), null),
    references: await readJson(path.join(dir, 'references.json'), []),
    shards,
    lessons,
  }
}

/** @param {string} dir */
async function listEntries(dir) {
  try {
    return await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (isMissing(error)) return []
    throw error
  }
}

/** @param {string} dir */
async function listDirNames(dir) {
  return (await listEntries(dir)).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
}

/**
 * @param {string} dir
 * @param {string} extension
 */
async function listFileNames(dir, extension) {
  return (await listEntries(dir))
    .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
    .map((entry) => entry.name)
    .sort()
}

/**
 * @param {string} file
 * @param {unknown} [fallback] returned when the file is missing; omit to require the file
 */
async function readJson(file, fallback) {
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch (error) {
    if (isMissing(error) && fallback !== undefined) return fallback
    throw error
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`Invalid JSON in ${file}: ${/** @type {Error} */ (error).message}`)
  }
}

/** @param {any} error */
function isMissing(error) {
  return error?.code === 'ENOENT'
}
