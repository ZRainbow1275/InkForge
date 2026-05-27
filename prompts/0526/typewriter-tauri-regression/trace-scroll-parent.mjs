/**
 * Standalone Playwright trace for typewriter cursor-follow scroll bug.
 *
 * Goal: trace which element findScrollParent() lands on for the editor's
 * ProseMirror DOM, and whether scrollTop actually changes when the cursor
 * moves or when characters are typed.
 *
 * Writes evidence PNG + JSON report to prompts/0526/verification-evidence/.
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
const PNG_PATH = resolve(EVIDENCE_DIR, `typewriter-scroll-trace-${ts}.png`)
const JSON_PATH = resolve(EVIDENCE_DIR, `typewriter-scroll-trace-${ts}.json`)
const URL = 'http://localhost:3005'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const consoleErrors = []
  const consoleAll = []
  page.on('console', m => {
    consoleAll.push({ type: m.type(), text: m.text() })
    if (m.type() === 'error') consoleErrors.push(m.text())
  })

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

  // Click hero-empty primary CTA if visible
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

  // Type 30 CJK paragraphs (enough to need to scroll)
  const paragraphs = []
  for (let i = 1; i <= 30; i++) {
    paragraphs.push(`第${i}段：打字机模式滚动跟随验证内容，需要足够多的段落让编辑器视口必须滚动才能看到光标位置。`)
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

  // Snapshot DOM ancestors of .ProseMirror to identify which element is the
  // scroll parent.
  const ancestorReport = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return null
    function describe(el) {
      const cs = getComputedStyle(el)
      return {
        tag: el.tagName.toLowerCase(),
        cls: el.className && typeof el.className === 'string' ? el.className : '',
        id: el.id || '',
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        scrollable: el.scrollHeight > el.clientHeight,
        overflow: cs.overflow,
        overflowY: cs.overflowY,
        scrollTop: el.scrollTop,
      }
    }
    const chain = []
    let cur = pm
    while (cur && chain.length < 12) {
      chain.push(describe(cur))
      cur = cur.parentElement
    }

    // Replicate findScrollParent logic from TypewriterMode.ts
    function findScrollParent(element) {
      let current = element
      while (current) {
        const { overflow, overflowY } = getComputedStyle(current)
        if (
          overflow === 'auto' || overflow === 'scroll' ||
          overflowY === 'auto' || overflowY === 'scroll'
        ) {
          return current
        }
        current = current.parentElement
      }
      if (element.scrollHeight > element.clientHeight) return element
      return null
    }

    const sp = findScrollParent(pm)
    return {
      chain,
      scrollParent: sp ? describe(sp) : null,
      windowScrollY: window.scrollY,
      docElement: {
        scrollTop: document.documentElement.scrollTop,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      },
    }
  })

  // Toggle typewriter mode via F9
  await page.keyboard.press('F9')
  await page.waitForTimeout(400)

  // Snapshot scrollTop of likely scroll parents BEFORE jumping
  const measureScrollSurfaces = async () => page.evaluate(() => {
    function pick(sel) {
      const el = document.querySelector(sel)
      if (!el) return null
      return { sel, scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }
    }
    return {
      editorScroll: pick('.editor-scroll'),
      splitPaneLeft: pick('.split-pane-left'),
      editorWrapper: pick('.editor-wrapper'),
      panelEditor: pick('.panel-editor'),
      workstation: pick('.workstation'),
      mainContent: pick('.main-content'),
      window: { scrollY: window.scrollY, innerHeight: window.innerHeight },
      docHtml: { scrollTop: document.documentElement.scrollTop, scrollHeight: document.documentElement.scrollHeight },
    }
  })

  // Click on first paragraph to place cursor near top
  await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return
    const blocks = Array.from(pm.children)
    const target = blocks[0]
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
  const surfacesAtTop = await measureScrollSurfaces()

  // Now jump cursor to paragraph 25 by clicking it
  await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return
    const blocks = Array.from(pm.children)
    const target = blocks[25]
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
  await page.waitForTimeout(900)
  const surfacesAfterJump = await measureScrollSurfaces()

  // Try keyboard Ctrl+End to jump to absolute end (should trigger scroll)
  await page.locator('.ProseMirror').click()
  await page.keyboard.press('Control+End')
  await page.waitForTimeout(900)
  const surfacesAfterCtrlEnd = await measureScrollSurfaces()

  // Type 50 chars and see if scrollTop creeps up steadily
  const typeProgress = []
  for (let i = 0; i < 8; i++) {
    await page.keyboard.type('测', { delay: 40 })
    await page.waitForTimeout(100)
    typeProgress.push(await page.evaluate(() => {
      const el = document.querySelector('.editor-scroll')
      return el ? { scrollTop: el.scrollTop, time: Date.now() } : null
    }))
  }

  await page.screenshot({ path: PNG_PATH, fullPage: false })

  const report = {
    ts,
    url: page.url(),
    ancestorReport,
    surfacesAtTop,
    surfacesAfterJump,
    surfacesAfterCtrlEnd,
    typeProgress,
    consoleErrorCount: consoleErrors.length,
    consoleErrors: consoleErrors.slice(0, 20),
    typewriterDebugLogs: consoleAll
      .filter(m => m.text.includes('[typewriter]'))
      .slice(0, 30),
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
