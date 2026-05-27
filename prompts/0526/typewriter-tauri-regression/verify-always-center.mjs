/**
 * Verification: typewriter mode keeps cursor centred at viewport mid-line for
 * ALL paragraph positions including the final paragraph.
 *
 * Tests 5 cursor positions in a 30-paragraph doc:
 *   p1, p8, p15, p23, p30
 *
 * Expectation: cursorRatio ∈ [0.45, 0.55] for every position. Pre-fix, p23
 * and especially p30 land near 0.85+ because scrollTop hits scrollHeight -
 * clientHeight before the cursor reaches centre.
 *
 * Post-fix: a 50vh `::after` spacer on `.ProseMirror[data-typewriter-active-mode="true"]`
 * extends scrollHeight so the cursor can always reach centre.
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
const URL = 'http://localhost:3005'

const TARGETS = [1, 8, 15, 23, 30]

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

  // 30 CJK paragraphs
  const paragraphs = []
  for (let i = 1; i <= 30; i++) {
    paragraphs.push(`第${i}段：内容内容内容内容内容内容内容内容内容内容内容内容内容内容。`)
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
  await page.waitForTimeout(1000)

  // Enable typewriter
  await page.keyboard.press('F9')
  await page.waitForTimeout(500)

  // Verify the data-typewriter-active-mode attr is on
  const attrCheck = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    return {
      activeMode: pm?.getAttribute('data-typewriter-active-mode'),
      // Capture computed style of ::after via getComputedStyle pseudo-element height
      afterHeight: pm ? getComputedStyle(pm, '::after').height : null,
      scrollHeight: pm?.scrollHeight ?? null,
      clientHeight: pm?.clientHeight ?? null,
    }
  })

  const measureAtParagraph = async (pIdx) => {
    // Place cursor at end of paragraph pIdx (1-based). The ProseMirror direct
    // child blocks are 0-based so index = pIdx - 1.
    await page.evaluate((zeroIdx) => {
      const pm = document.querySelector('.ProseMirror')
      if (!pm) return
      const blocks = Array.from(pm.children).filter(c => !c.matches('br'))
      const target = blocks[zeroIdx]
      if (!target) return
      target.scrollIntoView({ block: 'center' })
      const range = document.createRange()
      range.selectNodeContents(target)
      range.collapse(false)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
      // dispatch synthetic events so ProseMirror processes the new selection
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
      // Type a zero-width char then delete to nudge PM selection update
      pm.focus()
    }, pIdx - 1)
    // Nudge PM with an ArrowRight + ArrowLeft to ensure selection event fires
    await page.keyboard.press('End')
    await page.waitForTimeout(900) // wait for typewriter scroll animation

    return page.evaluate(() => {
      const split = document.querySelector('.split-pane-left')
      const pm = document.querySelector('.ProseMirror')
      const sel = window.getSelection()
      let cursorTop = null
      let cursorLeft = null
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
        cursorLeft = rect.left
      }
      const splitRect = split?.getBoundingClientRect()
      const pmRect = pm?.getBoundingClientRect()
      return {
        scrollTop: split?.scrollTop ?? null,
        splitScrollHeight: split?.scrollHeight ?? null,
        splitClientHeight: split?.clientHeight ?? null,
        splitTop: splitRect?.top ?? null,
        splitHeight: splitRect?.height ?? null,
        pmAfterHeight: pm ? getComputedStyle(pm, '::after').height : null,
        cursorTop,
        cursorLeft,
        cursorOffsetInSplit: splitRect && cursorTop != null ? cursorTop - splitRect.top : null,
        cursorRatio: splitRect && cursorTop != null ? (cursorTop - splitRect.top) / splitRect.height : null,
        pmHeight: pmRect?.height ?? null,
      }
    })
  }

  const results = []
  for (const pIdx of TARGETS) {
    const measurement = await measureAtParagraph(pIdx)
    const screenshotPath = resolve(EVIDENCE_DIR, `typewriter-always-center-p${pIdx}-${ts}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: false })
    results.push({ paragraph: pIdx, measurement, screenshot: screenshotPath })
  }

  // Now test typewriter OFF — toggle F9 and check attr is removed
  await page.keyboard.press('F9')
  await page.waitForTimeout(400)

  const offCheck = await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    return {
      activeMode: pm?.getAttribute('data-typewriter-active-mode'),
      afterHeight: pm ? getComputedStyle(pm, '::after').height : null,
      scrollHeight: pm?.scrollHeight ?? null,
    }
  })

  // Place cursor at last paragraph to show bottom layout in off-mode
  await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror')
    if (!pm) return
    const blocks = Array.from(pm.children).filter(c => !c.matches('br'))
    const target = blocks[blocks.length - 1]
    if (!target) return
    target.scrollIntoView({ block: 'end' })
    const range = document.createRange()
    range.selectNodeContents(target)
    range.collapse(false)
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    pm.focus()
  })
  await page.waitForTimeout(400)
  const offScreenshot = resolve(EVIDENCE_DIR, `typewriter-off-no-padding-${ts}.png`)
  await page.screenshot({ path: offScreenshot, fullPage: false })

  const pass = {
    activeModeAttrAttached: attrCheck.activeMode === 'true',
    afterSpacerHeightOnEnable: attrCheck.afterHeight,
    allCursorsCentered: results.every(r =>
      r.measurement.cursorRatio != null &&
      r.measurement.cursorRatio >= 0.45 &&
      r.measurement.cursorRatio <= 0.55,
    ),
    activeModeAttrRemovedOnDisable: offCheck.activeMode === null || offCheck.activeMode === undefined,
    afterSpacerRemovedOnDisable: offCheck.afterHeight === '0px' || offCheck.afterHeight === 'auto',
  }

  const report = {
    ts,
    enableAttrCheck: attrCheck,
    perParagraph: results.map(r => ({
      paragraph: r.paragraph,
      cursorRatio: r.measurement.cursorRatio,
      scrollTop: r.measurement.scrollTop,
      splitScrollHeight: r.measurement.splitScrollHeight,
      splitClientHeight: r.measurement.splitClientHeight,
      pmAfterHeight: r.measurement.pmAfterHeight,
      screenshot: r.screenshot,
    })),
    offCheck,
    offScreenshot,
    pass,
  }

  const jsonPath = resolve(EVIDENCE_DIR, `typewriter-always-center-${ts}.json`)
  writeFileSync(jsonPath, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  console.log('JSON:', jsonPath)

  await browser.close()
})().catch(err => {
  console.error(err)
  process.exit(1)
})
