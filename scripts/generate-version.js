#!/usr/bin/env node

/**
 * Update version constant in existing version.js file from package.json
 * This ensures version is embedded in source code rather than injected at build time
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read version from package.json
const packageJsonPath = resolve(__dirname, '../package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const version = packageJson.version

// Read existing version.js file
const versionFilePath = resolve(__dirname, '../src/utils/version.js')
let versionFileContent = readFileSync(versionFilePath, 'utf-8')

// Update the VERSION constant using regex
const versionConstantRegex = /export const VERSION = '[^']*'/
const newVersionConstant = `export const VERSION = '${version}'`

if (versionConstantRegex.test(versionFileContent)) {
  versionFileContent = versionFileContent.replace(versionConstantRegex, newVersionConstant)
  writeFileSync(versionFilePath, versionFileContent)
  console.log(`✓ Updated VERSION constant to ${version} in version.js`)
} else {
  console.error('❌ Could not find VERSION constant in version.js')
  process.exit(1)
}