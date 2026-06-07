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

Finding fixed during this probe:

- `buildSvgDataUri()` previously passed a full `<section>...<svg>...</svg></section>` HTML
  fragment into `data:image/svg+xml`, which caused browser image loading to fail.
- The raster boundary now extracts the first `<svg>...</svg>` document before injecting
  fixed PNG dimensions. Bare SVG input and raw shape fragments still work.
