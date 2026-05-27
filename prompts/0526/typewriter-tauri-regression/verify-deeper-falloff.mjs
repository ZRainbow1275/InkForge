/**
 * Standalone Playwright verification for typewriter gradient deeper falloff.
 *
 * Not a test runner asset — invoked directly via node, writes evidence PNG
 * + JSON report to prompts/0526/verification-evidence/.
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
// Resolve playwright from npx cache (no project install)
const NPX_PW = 'C:/Users/HP/AppData/Local/npm-cache/_npx/0b9ff77863cb6e9f/node_modules/playwright'
const { chromium } = require(NPX_PW)
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const EVIDENCE_DIR = resolve(__dirname, '..', 'verification-evidence')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
const PNG_PATH = resolve(EVIDENCE_DIR, `typewriter-gradient-deeper-falloff-${ts}.png`)
const JSON_PATH = resolve(EVIDENCE_DIR, `typewriter-gradient-deeper-falloff-${ts}.json`)
const URL = 'http://localhost:3005'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const consoleErrors = []
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })

  await page.goto(URL, { waitUntil: 'networkidle' })

  // Clear local persistence so we always start fresh
  await page.evaluate(async () => {
    localStorage.clear()
    sessionStorage.clear()
    const dbs = await indexedDB.databases?.()
    if (dbs) {
      await Promise.all(dbs.map(d => new Promise(res => {
        const req = indexedDB.deleteDatabase(d.name)
        req.onsuccess = req.onerror = req.onblocked = () => res()
      })))
    }
  })

  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  // Click empty-state primary CTA: hero-empty-btn (not -secondary)
  // Wait for it to appear; could be replaced by other affordances if data exists.
  const heroPrimary = page.locator('.hero-empty-btn:not(.hero-empty-btn-secondary)').first()
  if (await heroPrimary.count() === 0) {
    // Already has articles; route directly to a fresh workstation via the quick FAB
    // Fallback: navigate via the bottom-right quick action menu.
    await page.evaluate(() => {
      // Trigger a synthetic "open quick action" by simulating click on visible new buttons.
      const btn = document.querySelector('.new-action-btn')
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  } else {
    await heroPrimary.click()
  }

  await page.waitForURL(/\/workstation/, { timeout: 8000 })
  await page.waitForSelector('.ProseMirror', { timeout: 8000 })
  await page.waitForTimeout(500)

  // Build 23 CJK paragraphs (real DOM input — type would be slow, use clipboard paste)
  const paragraphs = []
  for (let i = 1; i <= 23; i++) {
    paragraphs.push(`这是第${i}段，用于打字机模式渐变远段衰减验证。注意每段都需要含足够的中文字符以触发段落装饰。`)
  }
  const payload = paragraphs.join('\n\n')

  // Focus editor and paste
  await page.locator('.ProseMirror').click()
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text)
  }, payload).catch(() => {})

  // Some browsers in headless deny clipboard; fall back to direct insert via execCommand
  const inserted = await page.evaluate((text) => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return false
    pm.focus()
    // Use document.execCommand insertText — handled by ProseMirror as a real input.
    return document.execCommand('insertText', false, text)
  }, payload)

  if (!inserted) {
    // As a stronger fallback, dispatch beforeinput with insertParagraph between blocks
    await page.evaluate((paragraphs) => {
      const pm = document.querySelector('.ProseMirror')
      if (!pm) return
      pm.focus()
      paragraphs.forEach((para, idx) => {
        document.execCommand('insertText', false, para)
        if (idx < paragraphs.length - 1) {
          document.execCommand('insertParagraph')
        }
      })
    }, paragraphs)
  }

  await page.waitForTimeout(600)

  // Toggle typewriter mode via F9
  await page.keyboard.press('F9')
  await page.waitForTimeout(400)

  // Move cursor into paragraph index 11 (12th paragraph, 0-indexed)
  // Set selection in ProseMirror by clicking the corresponding child block.
  await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return
    const blocks = Array.from(pm.children)
    const target = blocks[11]
    if (!target) return
    const range = document.createRange()
    range.selectNodeContents(target)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    // Trigger ProseMirror to register selection
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    target.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
  })

  await page.waitForTimeout(500)

  // Collect per-block opacities
  const opacities = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return []
    return Array.from(pm.children).map((b, i) => ({
      i,
      opacity: parseFloat(getComputedStyle(b).opacity).toFixed(3),
      classes: b.className,
    }))
  })

  // Identify active block index (whichever has class typewriter-block-active)
  const activeIdx = opacities.findIndex(o => o.classes.includes('typewriter-block-active'))

  await page.screenshot({ path: PNG_PATH, fullPage: false })

  const report = {
    ts,
    url: page.url(),
    blockCount: opacities.length,
    activeBlockIndex: activeIdx,
    opacities,
    consoleErrors,
    expectations: {
      'd=1':  '~0.93',
      'd=2':  '~0.86',
      'd=3':  '~0.79',
      'd=5':  '~0.65',
      'd=10': '~0.30',
      'd=12+': '0.18 (floor)',
    },
  }
  writeFileSync(JSON_PATH, JSON.stringify(report, null, 2))

  console.log(JSON.stringify(report, null, 2))
  console.log('PNG:', PNG_PATH)
  console.log('JSON:', JSON_PATH)

  await browser.close()
})().catch(err => {
  console.error(err)
  process.exit(1)
})
