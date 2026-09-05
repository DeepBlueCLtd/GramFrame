import { chromium, webkit } from '@playwright/test'
import http from 'node:http'; import { readFileSync } from 'node:fs'; import path from 'node:path'
const dir = process.cwd()
async function run(url, browserType, label) {
  const browser = await browserType.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
  const page = await browser.newPage()
  const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })
  await page.goto(url)
  await page.waitForFunction(() => document.getElementById('out').textContent.includes('"done"'), null, { timeout: 120000 })
  const out = await page.locator('#out').textContent()
  console.log(`\n===== ${label}\n${out}\nconsole errors: ${JSON.stringify(errors, null, 1)}`)
  await browser.close()
}
const server = http.createServer((req, res) => { try { const f = path.join(dir, decodeURIComponent(req.url.split('?')[0])); res.end(readFileSync(f)) } catch { res.statusCode = 404; res.end() } }).listen(8765)
await run(`file://${dir}/exp.html`, chromium, 'chromium file://')
await run('http://localhost:8765/exp.html', chromium, 'chromium http://')
if (process.argv.includes('--webkit')) await run(`file://${dir}/exp.html`, webkit, 'webkit file://')
server.close()
