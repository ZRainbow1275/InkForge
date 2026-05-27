/**
 * Deeper trace: inspect raw HTML and MutationObserver capture to understand
 * how .typora-active-line ends up on every paragraph.
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const NPX_PW = 'C:/Users/HP/AppData/Local/npm-cache/_npx/0b9ff77863cb6e9f/node_modules/playwright'
const { chromium } = require(NPX_PW)
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const EVIDENCE_DIR = resolve(__dirname, '..', 'verification-evidence')
const ts = new Date().toISOString().replace(/[:.]/g, '-')
const JSON_PATH = resolve(EVIDENCE_DIR, `typewriter-class-source-${ts}.json`)
const URL = 'http://localhost:3005'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const consoleErrors = []
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()) })

  await page.goto(URL, { waitUntil: 'networkidle' })

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

  const heroPrimary = page.locator('.hero-empty-btn:not(.hero-empty-btn-secondary)').first()
  if (await heroPrimary.count() > 0) {
    await heroPrimary.click()
  }
  await page.waitForURL(/\/workstation/, { timeout: 8000 })
  await page.waitForSelector('.ProseMirror', { timeout: 8000 })
  await page.waitForTimeout(500)

  const paragraphs = []
  for (let i = 1; i <= 10; i++) {
    paragraphs.push(`第${i}段：内容。`)
  }

  await page.locator('.ProseMirror').click()
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
  await page.waitForTimeout(600)

  // Capture initial state BEFORE F9
  const stateBeforeF9 = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    return {
      activeLineCount: document.querySelectorAll('.typora-active-line').length,
      htmlSnippet: pm ? pm.innerHTML.slice(0, 600) : '',
    }
  })

  // Toggle typewriter
  await page.keyboard.press('F9')
  await page.waitForTimeout(400)

  const stateAfterF9 = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    return {
      activeLineCount: document.querySelectorAll('.typora-active-line').length,
      htmlSnippet: pm ? pm.innerHTML.slice(0, 600) : '',
    }
  })

  // Move cursor to paragraph 5
  await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return
    const blocks = Array.from(pm.children)
    const target = blocks[5]
    if (!target) return
    const range = document.createRange()
    range.selectNodeContents(target)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await page.waitForTimeout(500)

  const stateAfterCursor = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    return {
      activeLineCount: document.querySelectorAll('.typora-active-line').length,
      perBlockClasses: pm ? Array.from(pm.children).map((c, i) => ({ i, classes: c.className, dataset: { ...c.dataset } })) : [],
    }
  })

  // Move cursor to paragraph 8
  await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return
    const blocks = Array.from(pm.children)
    const target = blocks[8]
    if (!target) return
    const range = document.createRange()
    range.selectNodeContents(target)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await page.waitForTimeout(500)

  const stateAfterCursorMove = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    return {
      activeLineCount: document.querySelectorAll('.typora-active-line').length,
      perBlockClasses: pm ? Array.from(pm.children).map((c, i) => ({ i, classes: c.className, dataset: { ...c.dataset } })) : [],
    }
  })

  const report = {
    ts,
    consoleErrors,
    stateBeforeF9,
    stateAfterF9,
    stateAfterCursor,
    stateAfterCursorMove,
  }
  writeFileSync(JSON_PATH, JSON.stringify(report, null, 2))
  console.log('Before F9 active-line count:', stateBeforeF9.activeLineCount)
  console.log('After F9 active-line count:', stateAfterF9.activeLineCount)
  console.log('After cursor@5 active-line count:', stateAfterCursor.activeLineCount)
  console.log('After cursor@8 active-line count:', stateAfterCursorMove.activeLineCount)
  console.log('JSON:', JSON_PATH)

  await browser.close()
})().catch(err => {
  console.error(err)
  process.exit(1)
})
