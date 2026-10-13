import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT_DIR = fileURLToPath(new URL('../..', import.meta.url))
export const CONTENT_DIR = path.join(ROOT_DIR, 'content')
export const GENERATED_DIR = path.join(ROOT_DIR, 'src', 'generated')
