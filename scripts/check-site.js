#!/usr/bin/env node
/**
 * Check an assembled GitHub Pages tree for dead links and unreachable pages.
 *
 * This exists because of a specific failure. The trial harness was copied into
 * the site by both deploy jobs and listed by neither landing page, so it was
 * published, correct, and reachable only by typing its URL. Nothing failed: a
 * deploy that copies files cannot notice that nobody links to one.
 *
 * Two rules, both checked against the tree `scripts/build-site.sh` produces:
 *
 *   1. Every local link resolves to a file that exists.
 *   2. Every page the site presents as its own is reachable from index.html.
 *
 * Rule 2 is scoped to the site root and demo/ -- the pages the landing page
 * curates. sample/ and src/ are copied wholesale from the repository as raw
 * material for the developer pages; they are a mirror of a directory, not a
 * list someone maintains, so "unreachable" says nothing useful about them.
 *
 * Usage: node scripts/check-site.js [site-dir]   (default: _site)
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative, resolve, posix } from 'path'

/** Directories that are a raw mirror rather than curated pages (see rule 2). */
const UNCURATED = ['sample', 'src']

/**
 * Every HTML file under `dir`, as paths relative to it, with POSIX separators.
 * @param {string} dir
 * @returns {string[]}
 */
function htmlFiles(dir) {
  /** @type {string[]} */
  const found = []
  /** @param {string} current */
  const walk = (current) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
      } else if (entry.endsWith('.html')) {
        found.push(relative(dir, full).split(/[\\/]/).join('/'))
      }
    }
  }
  walk(dir)
  return found.sort()
}

/**
 * The link targets in one page: href and src attributes, in document order.
 * A regex rather than a DOM parser because the project carries no runtime
 * dependencies and these are hand-written pages, not arbitrary HTML.
 * @param {string} html
 * @returns {string[]}
 */
function linkTargets(html) {
  /** @type {string[]} */
  const targets = []
  const pattern = /(?:href|src)\s*=\s*"([^"]*)"/gi
  for (;;) {
    const match = pattern.exec(html)
    if (match === null) break
    targets.push(match[1])
  }
  return targets
}

/**
 * Resolve a link to a site-relative path, or null if it points off-site.
 * @param {string} from Page holding the link, relative to the site root.
 * @param {string} target Raw attribute value.
 * @returns {string | null}
 */
function resolveTarget(from, target) {
  const trimmed = target.trim()
  if (trimmed === '') return null
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(trimmed)) return null

  const withoutFragment = trimmed.split('#')[0].split('?')[0]
  if (withoutFragment === '') return null

  const base = withoutFragment.startsWith('/')
    ? withoutFragment.slice(1)
    : posix.join(posix.dirname(from), withoutFragment)
  const normalised = posix.normalize(base)
  // A directory link ("../" or "demo/") is served as its index.html.
  return normalised.endsWith('/') || normalised === '.'
    ? posix.join(normalised, 'index.html')
    : normalised
}

/** @param {string} path @returns {boolean} */
function isUncurated(path) {
  return UNCURATED.some((dir) => path === dir || path.startsWith(`${dir}/`))
}

/**
 * Is this page a redirect kept alive for old bookmarks?
 *
 * Such a page is unlinked on purpose -- its callers are URLs people already
 * hold, which no crawl of the tree can see -- so rule 2 does not apply to it.
 * Its own links are still checked, so a redirect pointing nowhere still fails.
 * @param {string} html
 * @returns {boolean}
 */
function isRedirect(html) {
  return /<meta\s[^>]*http-equiv\s*=\s*"refresh"/i.test(html)
}

const siteDir = resolve(process.argv[2] ?? '_site')
let siteStat
try {
  siteStat = statSync(siteDir)
} catch {
  console.error(`check-site: ${siteDir} does not exist -- run scripts/build-site.sh first`)
  process.exit(1)
}
if (!siteStat.isDirectory()) {
  console.error(`check-site: ${siteDir} is not a directory`)
  process.exit(1)
}

const pages = htmlFiles(siteDir)
if (!pages.includes('index.html')) {
  console.error('check-site: no index.html at the site root')
  process.exit(1)
}

/** @type {string[]} */
const deadLinks = []
/** @type {Map<string, string[]>} */
const pageLinks = new Map()
/** @type {Set<string>} */
const redirects = new Set()

for (const page of pages) {
  const html = readFileSync(join(siteDir, page), 'utf8')
  if (isRedirect(html)) redirects.add(page)
  /** @type {string[]} */
  const outbound = []
  for (const raw of linkTargets(html)) {
    const target = resolveTarget(page, raw)
    if (target === null) continue
    let exists = false
    try {
      exists = statSync(join(siteDir, target)).isFile()
    } catch {
      exists = false
    }
    if (!exists) {
      deadLinks.push(`${page} -> ${raw}`)
    } else if (target.endsWith('.html')) {
      outbound.push(target)
    }
  }
  pageLinks.set(page, outbound)
}

// Rule 2: walk the curated pages from index.html.
/** @type {Set<string>} */
const reached = new Set(['index.html'])
/** @type {string[]} */
const queue = ['index.html']
while (queue.length > 0) {
  const page = /** @type {string} */ (queue.shift())
  for (const next of pageLinks.get(page) ?? []) {
    if (!reached.has(next)) {
      reached.add(next)
      queue.push(next)
    }
  }
}
const orphans = pages.filter(
  (page) => !reached.has(page) && !isUncurated(page) && !redirects.has(page)
)

let failed = false
if (deadLinks.length > 0) {
  failed = true
  console.error(`\n✘ Dead links (${deadLinks.length}):`)
  for (const link of deadLinks) console.error(`    ${link}`)
}
if (orphans.length > 0) {
  failed = true
  console.error(`\n✘ Pages not reachable from index.html (${orphans.length}):`)
  for (const page of orphans) console.error(`    ${page}`)
  console.error('\n  A published page nothing links to is a page nobody finds.')
  console.error('  Add it to the list in index.html, or stop publishing it.')
}

if (failed) {
  process.exit(1)
}

const curated = pages.filter((page) => !isUncurated(page) && !redirects.has(page))
console.log(
  `✔ Site check passed: ${curated.length} curated pages, all reachable ` +
    `from index.html; no dead links across ${pages.length} pages ` +
    `(${redirects.size} redirect, ${pages.length - curated.length - redirects.size} uncurated).`
)
