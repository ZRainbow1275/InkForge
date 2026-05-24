# Preset Screenshot Evidence — Manual Capture Guide

Playwright is **not** installed in `inkforge/package.json` as of PR5. This file
documents how to capture the 25 preset screenshots (17 wechat + 5 xhs + 3 zhihu)
required by AC-8.

## Why Option C (manual)

Option A (Playwright suite) and Option B (standalone Node script) were both
rejected because:

1. Playwright is not a current dependency; adding `playwright` + `npx playwright
   install chromium` would pull ~300 MB of binaries (Chromium + driver +
   headless browsers) and modify `package.json` / `pnpm-lock.yaml`.
2. PR5 boundary forbids introducing new heavy dependencies.
3. Tauri's webview is already the target rendering surface — for visual
   evidence the safest source of truth is the running Tauri dev session, not a
   headless Chromium.

## How to run the screenshot pass

### Step 1 — start the app

```bash
cd D:/Desktop/Inkforge/inkforge
pnpm dev
```

Open the URL Vite prints (typically `http://localhost:5173`). Maximize the
window or set viewport to **1920 x 1080**.

### Step 2 — load sample content

The `PreviewPanel` automatically renders sample markdown when the article body
is empty. To trigger it, open any article from the Hub (`HubView`) without
typing anything in the editor, OR clear the editor body. The
`.preview-sample-hint` badge in the top-right of the preview frame confirms
sample mode.

### Step 3 — capture each preset

For each platform (wechat / xiaohongshu / zhihu):

1. Click the platform pill in `PreviewPanel`.
2. For each preset chip in `.preset-grid`, click it.
3. Wait ~250 ms for the `.preset-fade` crossfade to settle.
4. Screenshot the `.preview-frame` rectangle (Win + Shift + S, then drag).
5. Save as `evidence/{platform}-{preset-id}.png` in this folder.

### Step 4 — expected filenames

```
evidence/wechat-thesis.png
evidence/wechat-legal.png
evidence/wechat-report.png
evidence/wechat-commentary.png
evidence/wechat-aigc.png
evidence/wechat-code.png
evidence/wechat-notes.png
evidence/wechat-news.png
evidence/wechat-meme.png
evidence/wechat-life.png
evidence/wechat-elegant.png
evidence/wechat-tech.png
evidence/xhs-fresh.png
evidence/xhs-simple.png
evidence/xhs-warm.png
evidence/xhs-tech.png
evidence/xhs-nature.png
evidence/zhihu-academic.png
evidence/zhihu-tech.png
evidence/zhihu-insight.png
```

## Optional: automate later with Playwright

If you want to automate this in a future PR, the script skeleton is:

```ts
// inkforge/tests/e2e/preset-screenshot.spec.ts
import { test } from '@playwright/test'

const PRESETS: Array<{ platform: string; id: string }> = [
  { platform: 'wechat', id: 'thesis' },
  // ... (full list above)
]

for (const { platform, id } of PRESETS) {
  test(`screenshot ${platform}-${id}`, async ({ page }) => {
    await page.goto('http://localhost:5173')
    await page.setViewportSize({ width: 1920, height: 1080 })
    // Open an article, clear body to trigger sample content
    await page.click(`[data-platform="${platform}"]`)
    await page.click(`[data-preset-id="${id}"]`)
    await page.waitForTimeout(250) // crossfade
    await page.locator('.preview-frame').screenshot({
      path: `.trellis/tasks/05-23-preset-typography-overhaul/evidence/${platform}-${id}.png`,
    })
  })
}
```

This would require adding `playwright` to `devDependencies` and running
`npx playwright install chromium` first (~300 MB binary download).
