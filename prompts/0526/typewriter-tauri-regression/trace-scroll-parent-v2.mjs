/**
 * v2 Playwright trace for typewriter cursor-follow scroll bug — after fix.
 *
 * Replicates the FIXED findScrollParent (requires scrollHeight > clientHeight)
 * and measures the real scrollable ancestor (.split-pane-left) during typing.
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
const PNG_PATH = resolve(EVIDENCE_DIR, `typewriter-scroll-follow-${ts}.png`)
const JSON_PATH = resolve(EVIDENCE_DIR, `typewriter-scroll-follow-${ts}.json`)
const URL = 'http://localhost:3005'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const consoleErrors = []
  page.on('console', m => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })

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

  // Hard reload so updated TypewriterMode.ts is fetched
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

  // Apply the FIXED findScrollParent to see what gets chosen now.
  const detectedScrollParent = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return null
    function findScrollParent(element) {
      let current = element
      while (current) {
        const { overflow, overflowY } = getComputedStyle(current)
        const overflowAllowsScroll =
          overflow === 'auto' || overflow === 'scroll' ||
          overflowY === 'auto' || overflowY === 'scroll'
        if (overflowAllowsScroll && current.scrollHeight > current.clientHeight) {
          return current
        }
        current = current.parentElement
      }
      if (element.scrollHeight > element.clientHeight) return element
      return null
    }
    const sp = findScrollParent(pm)
    if (!sp) return null
    return {
      tag: sp.tagName.toLowerCase(),
      cls: sp.className,
      scrollHeight: sp.scrollHeight,
      clientHeight: sp.clientHeight,
      scrollTop: sp.scrollTop,
    }
  })

  // Toggle typewriter
  await page.keyboard.press('F9')
  await page.waitForTimeout(400)

  const snapshotSplit = async () => page.evaluate(() => {
    const el = document.querySelector('.split-pane-left')
    if (!el) return null
    return { scrollTop: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }
  })

  // Click first paragraph
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
  await page.waitForTimeout(700)
  const splitAtTop = await snapshotSplit()

  // Click paragraph 25
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
  const splitAfterJumpDown = await snapshotSplit()

  // Jump back to top with click on paragraph 0
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
  await page.waitForTimeout(900)
  const splitAfterJumpBack = await snapshotSplit()

  // Click middle paragraph to set cursor at end of paragraph 12 then type 10 chars
  await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return
    const blocks = Array.from(pm.children)
    const target = blocks[12]
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
  await page.waitForTimeout(600)
  const splitBeforeTyping = await snapshotSplit()

  const typeProgress = []
  for (let i = 0; i < 12; i++) {
    await page.keyboard.type('测', { delay: 50 })
    await page.waitForTimeout(150)
    const snap = await snapshotSplit()
    typeProgress.push(snap)
  }

  // Final screenshot
  await page.screenshot({ path: PNG_PATH, fullPage: false })

  // Visual judgment: get cursor's current viewport y relative to .split-pane-left.
  const cursorViewportPos = await page.evaluate(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const range = sel.getRangeAt(0).cloneRange()
    range.collapse(true)
    let rect = range.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) {
      // collapsed range with zero rect — use a tiny test text
      const span = document.createElement('span')
      span.textContent = '​'
      range.insertNode(span)
      rect = span.getBoundingClientRect()
      span.remove()
    }
    const split = document.querySelector('.split-pane-left')
    const splitRect = split?.getBoundingClientRect()
    return {
      cursor: { top: rect.top, height: rect.height },
      splitTop: splitRect?.top ?? null,
      splitHeight: splitRect?.height ?? null,
      offsetFromTop: splitRect ? rect.top - splitRect.top : null,
      offsetRatio: splitRect ? (rect.top - splitRect.top) / splitRect.height : null,
    }
  })

  const report = {
    ts,
    url: page.url(),
    detectedScrollParent,
    splitAtTop,
    splitAfterJumpDown,
    splitAfterJumpBack,
    splitBeforeTyping,
    typeProgress,
    cursorViewportPos,
    consoleErrorCount: consoleErrors.length,
    consoleErrors: consoleErrors.slice(0, 20),
    expectation: {
      detectedScrollParent: 'Should be .split-pane-left (not .editor-scroll) after fix',
      splitAfterJumpDown: 'scrollTop should be significantly > splitAtTop',
      splitAfterJumpBack: 'scrollTop should be near 0 after jumping back to top',
      typeProgress: 'scrollTop should change as cursor enters new line(s) at viewport bottom',
      cursorViewportPos: 'offsetRatio should be near 0.5 (cursorPosition default)',
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
