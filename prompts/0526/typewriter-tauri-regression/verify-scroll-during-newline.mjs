/**
 * Final verification: type Enter + content while in typewriter mode and confirm
 * .split-pane-left.scrollTop adjusts so the cursor stays near 50% of viewport.
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
const PNG_PATH = resolve(EVIDENCE_DIR, `typewriter-scroll-follow-newlines-${ts}.png`)
const JSON_PATH = resolve(EVIDENCE_DIR, `typewriter-scroll-follow-newlines-${ts}.json`)
const URL = 'http://localhost:3005'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()

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
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(800)

  const heroPrimary = page.locator('.hero-empty-btn:not(.hero-empty-btn-secondary)').first()
  if (await heroPrimary.count() > 0) {
    await heroPrimary.click()
  } else {
    await page.evaluate(() => {
      const btn = document.querySelector('.new-action-btn')
      btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }
  await page.waitForURL(/\/workstation/, { timeout: 8000 })
  await page.waitForSelector('.ProseMirror', { timeout: 8000 })
  await page.waitForTimeout(800)

  // Build 10 paragraphs (enough to require scroll)
  const paragraphs = []
  for (let i = 1; i <= 10; i++) {
    paragraphs.push(`第${i}段：内容内容内容内容内容内容内容内容内容内容内容。`)
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
  await page.waitForTimeout(800)

  // Enable typewriter
  await page.keyboard.press('F9')
  await page.waitForTimeout(400)

  const snap = async () => page.evaluate(() => {
    const split = document.querySelector('.split-pane-left')
    const sel = window.getSelection()
    let cursorTop = null
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0).cloneRange()
      r.collapse(true)
      let rect = r.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) {
        const span = document.createElement('span')
        span.textContent = '​'
        r.insertNode(span)
        rect = span.getBoundingClientRect()
        span.remove()
      }
      cursorTop = rect.top
    }
    const splitRect = split?.getBoundingClientRect()
    return {
      scrollTop: split?.scrollTop ?? null,
      splitTop: splitRect?.top ?? null,
      splitHeight: splitRect?.height ?? null,
      cursorTop,
      cursorOffsetInSplit: splitRect && cursorTop != null ? cursorTop - splitRect.top : null,
      cursorRatio: splitRect && cursorTop != null ? (cursorTop - splitRect.top) / splitRect.height : null,
    }
  })

  // Place cursor at end of paragraph 5
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
  await page.waitForTimeout(800)
  const initial = await snap()

  // Type 8 new paragraphs via Enter + content to force scroll
  const series = [initial]
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Enter')
    await page.waitForTimeout(80)
    await page.keyboard.type(`新段${i + 1} 内容内容内容。`, { delay: 30 })
    await page.waitForTimeout(220)
    series.push(await snap())
  }

  await page.screenshot({ path: PNG_PATH, fullPage: false })

  const finalCursorRatio = series[series.length - 1]?.cursorRatio
  const initialCursorRatio = series[0]?.cursorRatio

  const report = {
    ts,
    series,
    initialCursorRatio,
    finalCursorRatio,
    expectation: {
      cursorRatio: 'Every series entry should have cursorRatio near 0.5 (typewriter keeps cursor centered)',
      scrollTopProgression: 'scrollTop should monotonically increase as we add paragraphs',
    },
    pass: {
      cursorStaysCentered: series.every(s => s.cursorRatio != null && Math.abs(s.cursorRatio - 0.5) < 0.15),
      scrollProgressed: series[series.length - 1].scrollTop > series[0].scrollTop,
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
