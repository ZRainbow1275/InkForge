# XHS Raster Evidence — Browser Canvas

Date: 2026-06-08

Purpose: AC6 proof that InkForge's actual `renderXhsPosterCard()` / `rasterizeSvg()` path can
turn a wrapped `data-ink-svg` module into a real PNG in a browser DOM/canvas environment.

Environment:

- Vite dev server: `http://127.0.0.1:3005/`
- Browser: Playwright Chromium
- Imported module: `/src/services/export/svg-modules/index.ts`
- Source module: `cover-grid`
- Target ratio: `3:4`
- Source wrapper: `coverModule.render(...)` returned a real `data-ink-svg="cover-grid"` section

Probe result:

```json
{
  "hasDom": true,
  "sourceModule": "cover-grid",
  "ratio": "3:4",
  "naturalWidth": 1080,
  "naturalHeight": 1440,
  "byteLength": 99114,
  "sha256": "1132933ecec1828c0129e8e92ec2553b4c54264ecda70ad228f15e7c62db101d",
  "prefix": "data:image/png;base64,",
  "sourceSvgContainsInkSvg": true
}
```

Evidence file:

- `xhs-raster-cover-grid-browser-2026-06-08-2026-06-07T23-38-29-127Z.png`

## Cover Hook Raster Evidence - 2026-06-21

Purpose: local `xhs-cover-hook` proof that InkForge can turn a source-owned cover SVG module into
a real XHS 3:4 PNG through the local browser canvas path before any platform upload or publish
claim.

Browser route:

- CloakBrowser opened the local Vite app.
- Imported module: `/src/services/export/svg-modules/index.ts`.
- Source module: `cover-title`.
- Render path: `cover.render(...)` -> `renderXhsPosterCard(svgHtml, '3:4', '#fff7ed')`.
- Target: `xhs`; `allowMotion=false`.

Probe result:

```json
{
  "sourceModule": "cover-title",
  "ratio": "3:4",
  "naturalWidth": 1080,
  "naturalHeight": 1440,
  "byteLength": 92316,
  "sha256": "c7200947079cda16ccafc51b5c56bfd840355da199da48b790b6725233af2d32",
  "sourceSvgContainsInkSvg": true
}
```

Evidence files:

- `xhs-raster-cover-hook-browser-2026-06-21.png`
- `xhs-raster-cover-hook-browser-2026-06-21.json`

Visual QA:

- The first two generated variants had a subtitle ellipsis. The committed PNG uses the shorter
  subtitle `InkForge 本地验证` and was visually checked to avoid truncation.

Finding fixed during this probe:

- `buildSvgDataUri()` previously passed a full `<section>...<svg>...</svg></section>` HTML
  fragment into `data:image/svg+xml`, which caused browser image loading to fail.
- The raster boundary now extracts the first `<svg>...</svg>` document before injecting
  fixed PNG dimensions. Bare SVG input and raw shape fragments still work.
