/**
 * Standalone Playwright trace for typewriter background bleed.
 *
 * Hunts for ALL elements with non-transparent red backgrounds inside .ProseMirror,
 * dumps their class lists, computed styles, and bounding rects.
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
const PNG_PATH = resolve(EVIDENCE_DIR, `typewriter-bg-bleed-trace-${ts}.png`)
const JSON_PATH = resolve(EVIDENCE_DIR, `typewriter-bg-bleed-trace-${ts}.json`)
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
  for (let i = 1; i <= 30; i++) {
    paragraphs.push(`第${i}段：内容内容内容内容内容内容内容内容内容内容。`)
  }
  const payload = paragraphs.join('\n\n')

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

  await page.keyboard.press('F9')
  await page.waitForTimeout(400)

  // Place cursor inside paragraph index 11 (12th)
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
    target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  })
  await page.waitForTimeout(500)

  const trace = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return { error: 'no .ProseMirror' }

    function parseRgba(s) {
      const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i)
      if (!m) return null
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] != null ? +m[4] : 1 }
    }

    const elementsWithRedBg = []
    const allActiveElements = Array.from(document.querySelectorAll('.typewriter-block-active'))
    const allActiveLineElements = Array.from(document.querySelectorAll('.typora-active-line'))

    function walk(node) {
      if (!(node instanceof HTMLElement)) return
      const cs = getComputedStyle(node)
      const bg = cs.backgroundColor
      const bgImage = cs.backgroundImage
      const rgba = parseRgba(bg)
      const hasRedFlat = rgba && rgba.r > 150 && rgba.g < 120 && rgba.b < 120 && rgba.a > 0.005
      const hasRedGradient = /rgba?\(\s*21[01]\s*,\s*47\s*,\s*47/i.test(bgImage)
      if (hasRedFlat || hasRedGradient) {
        const rect = node.getBoundingClientRect()
        elementsWithRedBg.push({
          tag: node.tagName.toLowerCase(),
          classes: node.className || '',
          dataset: { ...node.dataset },
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          backgroundColor: bg,
          backgroundImage: bgImage,
          textPreview: (node.textContent || '').slice(0, 40),
        })
      }
      for (const c of node.children) walk(c)
    }
    walk(pm)

    const activeDump = allActiveElements.map(el => {
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        tag: el.tagName.toLowerCase(),
        classes: el.className,
        dataset: { ...el.dataset },
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage,
        textPreview: (el.textContent || '').slice(0, 40),
      }
    })
    const activeLineDump = allActiveLineElements.map(el => {
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return {
        tag: el.tagName.toLowerCase(),
        classes: el.className,
        dataset: { ...el.dataset },
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage,
        textPreview: (el.textContent || '').slice(0, 40),
      }
    })

    const allPMChildren = Array.from(pm.children).map((el, i) => {
      const cs = getComputedStyle(el)
      return {
        i,
        tag: el.tagName.toLowerCase(),
        classes: el.className,
        bg: cs.backgroundColor,
        bgImage: cs.backgroundImage.slice(0, 80),
        textPreview: (el.textContent || '').slice(0, 30),
      }
    })

    return {
      activeBlockActiveCount: allActiveElements.length,
      activeLineCount: allActiveLineElements.length,
      activeBlockActive: activeDump,
      activeLine: activeLineDump,
      redBgElements: elementsWithRedBg,
      pmChildren: allPMChildren,
    }
  })

  await page.screenshot({ path: PNG_PATH, fullPage: false })

  const report = { ts, url: page.url(), consoleErrors, trace }
  writeFileSync(JSON_PATH, JSON.stringify(report, null, 2))

  console.log('Red bg element count:', trace.redBgElements?.length ?? 'n/a')
  console.log('typewriter-block-active count:', trace.activeBlockActiveCount)
  console.log('typora-active-line count:', trace.activeLineCount)
  console.log('PNG:', PNG_PATH)
  console.log('JSON:', JSON_PATH)

  await browser.close()
})().catch(err => {
  console.error(err)
  process.exit(1)
})
