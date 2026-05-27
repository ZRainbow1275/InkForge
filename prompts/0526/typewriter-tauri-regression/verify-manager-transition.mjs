/**
 * Verify Bug 1 fix: panel-manager collapse/expand transition smoothness.
 *
 * Captures three frames: expanded, mid-transition, collapsed. Records the
 * actual computed `transition-property` and `transition-duration` on
 * .panel-manager so we can confirm the rule applies.
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
const PNG_PATH = resolve(EVIDENCE_DIR, `manager-transition-smooth-${ts}.png`)
const JSON_PATH = resolve(EVIDENCE_DIR, `manager-transition-smooth-${ts}.json`)
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

  // Enter workstation via hero CTA
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
  await page.waitForSelector('.panel-manager', { timeout: 8000 })
  await page.waitForTimeout(600)

  // Read computed transition on manager + inspector for comparison
  const transitionInfo = await page.evaluate(() => {
    function read(sel) {
      const el = document.querySelector(sel)
      if (!el) return null
      const cs = getComputedStyle(el)
      return {
        sel,
        transitionProperty: cs.transitionProperty,
        transitionDuration: cs.transitionDuration,
        transitionTimingFunction: cs.transitionTimingFunction,
        width: cs.width,
        minWidth: cs.minWidth,
        bbox: el.getBoundingClientRect().width,
      }
    }
    return {
      manager: read('.panel-manager'),
      inspector: read('.panel-inspector'),
    }
  })

  // First make sure manager is expanded (it starts collapsed by default in user pref).
  // If collapsed, click the collapsed-bar to expand.
  const collapsedInitially = await page.locator('.panel-manager.collapsed').count() > 0
  if (collapsedInitially) {
    await page.evaluate(() => {
      const bar = document.querySelector('.manager-collapsed-bar')
      bar?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await page.waitForTimeout(500)
  }
  const expandedBbox = await page.evaluate(() => {
    const el = document.querySelector('.panel-manager')
    return el?.getBoundingClientRect().width ?? null
  })

  // Screenshot expanded state
  const expandedPng = PNG_PATH.replace('.png', '-expanded.png')
  await page.screenshot({ path: expandedPng, clip: { x: 0, y: 60, width: 400, height: 700 } })

  // Trigger collapse via a header button or keyboard shortcut.
  // Easier: find the toggle. Look at WorkstationView for the toggle UI.
  // Try the layout preset buttons or any element that calls toggleManagerCollapsed.
  // Fallback: click on any element with title containing "管理" / "manager".

  // Mid-transition capture using requestAnimationFrame: trigger collapse via
  // direct ref to managerCollapsed (via Vue devtools is overkill). We'll click
  // a focus-mode preset or a known toggle if present.

  // Look for known IDs in the DOM that toggle manager
  const togglers = await page.evaluate(() => {
    // Find any clickable that has aria-label/title hinting at "管理" or "manager"
    const cands = Array.from(document.querySelectorAll('button, [role="button"]')).map(b => ({
      tag: b.tagName.toLowerCase(),
      cls: b.className,
      title: b.title || '',
      aria: b.getAttribute('aria-label') || '',
      text: b.textContent.trim().slice(0, 40),
    }))
    return cands.filter(c => /manager|管理|侧栏|stage|inspector|布局|focus|专注|默认/i.test(c.title + c.aria + c.text))
  })

  // Simulate a real user toggle: open the layout preset "默认 / 写作 / 审阅 / 专注"
  // — "专注" turns manager off. Look for preset chips:
  const focusPresetClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const target = buttons.find(b => b.textContent.trim() === '专注')
    if (!target) return false
    target.click()
    return true
  })

  // Capture frames during transition
  const frames = []
  const start = Date.now()
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(40)
    const w = await page.evaluate(() => {
      const el = document.querySelector('.panel-manager')
      return el?.getBoundingClientRect().width ?? null
    })
    frames.push({ t: Date.now() - start, width: w })
  }

  // Wait for transition to settle
  await page.waitForTimeout(500)
  const collapsedBbox = await page.evaluate(() => {
    const el = document.querySelector('.panel-manager')
    return el?.getBoundingClientRect().width ?? null
  })

  const collapsedPng = PNG_PATH.replace('.png', '-collapsed.png')
  await page.screenshot({ path: collapsedPng, clip: { x: 0, y: 60, width: 400, height: 700 } })

  // Now expand again to verify smoothness in the other direction
  // Trigger by clicking the collapsed bar
  const expandedAgain = await page.evaluate(() => {
    const bar = document.querySelector('.manager-collapsed-bar')
    if (!bar) return false
    bar.click()
    return true
  })
  const expandFrames = []
  const start2 = Date.now()
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(40)
    const w = await page.evaluate(() => {
      const el = document.querySelector('.panel-manager')
      return el?.getBoundingClientRect().width ?? null
    })
    expandFrames.push({ t: Date.now() - start2, width: w })
  }

  await page.waitForTimeout(500)
  await page.screenshot({ path: PNG_PATH, clip: { x: 0, y: 60, width: 400, height: 700 } })

  const report = {
    ts,
    transitionInfo,
    expandedBbox,
    collapsedBbox,
    focusPresetClicked,
    collapseFrames: frames,
    expandedAgain,
    expandFrames,
    togglers: togglers.slice(0, 10),
    expectation: {
      transitionInfo: '.panel-manager transition-property should contain `width, min-width`, duration ~0.25s',
      collapseFrames: 'widths should monotonically decrease from expanded to ~12px over ~250ms',
      expandFrames: 'widths should monotonically increase back from ~12px',
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
