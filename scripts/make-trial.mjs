#!/usr/bin/env node
/**
 * Assemble the zip-ready trial folder (`trial-package/`).
 *
 * The trial is a stakeholder-facing package: the standalone bundle, the picker
 * page and the README, and nothing else. It is built rather than committed so
 * the bundle is never a stale copy of `src/`.
 *
 *   yarn build:standalone && node scripts/make-trial.mjs
 */

import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'trial-package')

const bundle = resolve(root, 'dist/gramframe.bundle.js')
if (!existsSync(bundle)) {
  console.error('dist/gramframe.bundle.js not found — run `yarn build:standalone` first.')
  process.exit(1)
}

mkdirSync(out, { recursive: true })
for (const [from, to] of [
  [bundle, 'gramframe.bundle.js'],
  [resolve(root, 'trial/index.html'), 'index.html'],
  [resolve(root, 'trial/README.md'), 'README.md']
]) {
  copyFileSync(from, resolve(out, to))
  console.log(`${to}: ${(statSync(resolve(out, to)).size / 1024).toFixed(0)} KB`)
}
console.log(`\nTrial folder ready: ${out}`)
