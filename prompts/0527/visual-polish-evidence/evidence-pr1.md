# PR1 Evidence — Brand Assets Foundation

Visual regression evidence for PR1 of `05-27-visual-polish-pass`. All files are
rendered from a single source of truth (`inkforge/src-tauri/icons/master.svg` for
app icons; `inkforge/public/favicon.svg` for the browser favicon) via
`inkforge/scripts/build-icons.mjs` plus an ephemeral helper for the missing
1024 / 16 sizes.

## Files

| File | Source | Description |
|---|---|---|
| `master-svg.svg` | `inkforge/src-tauri/icons/master.svg` | Logo source of truth (1024×1024 viewBox, 22% safe padding, Kiln seal + Graphite「铸」+ ◇ row) |
| `app-icon-1024.png` | rendered from master.svg | Largest raster size for visual reference / store listings |
| `app-icon-512.png` | `icons/512x512.png` | Linux DE high-DPI |
| `app-icon-256.png` | `icons/256x256.png` | Largest entry inside `icon.ico` (Windows taskbar high-DPI) |
| `app-icon-128.png` | `icons/128x128.png` | macOS Finder default + Linux 128 |
| `app-icon-64.png` | `icons/64x64.png` | Windows medium-DPI |
| `app-icon-32.png` | `icons/32x32.png` | Tauri canonical size + Windows small icon |
| `app-icon-16.png` | rendered from master.svg | Smallest .ico entry (taskbar / Alt-Tab) |
| `favicon-preview.png` | rendered from `public/favicon.svg` | Browser tab favicon (reduced padding for legibility at small size) |

## Pipeline Summary

- Generated set: Win `.ico` (7 sizes: 16/24/32/48/64/128/256), macOS `.icns`
  (8 entries: 16/32/64/128/256/512/1024 + 1024@2x = 2048), Linux PNG
  (32/64/128/256/512), Tauri-named PNGs (`32x32.png`, `128x128.png`, `128x128@2x.png`).
- Rebuild: `cd inkforge && pnpm run icons:build`.
- Verification: at 16×16 the Kiln seal + Graphite「铸」character remains
  recognizable (430 bytes PNG); Win11 ~22% squircle crop preserves the seal
  body thanks to the master's 22% safe-area padding.

## Other PR1 Deliverables Not Captured as Images

- `inkforge/index.html` — `<link rel="icon">` now points at `/favicon.svg`,
  `<title>` is `InkForge - 墨铸编辑器`.
- `inkforge/src/App.vue` error boundary — palette migrated to brand tokens
  (Vellum/Hearth background, Graphite/Ash/Smoke text, Kiln primary button,
  Hearth/Hairline secondary button). Zero remaining `#0066cc`/`#0052a3`/
  `#f5f7fa`/`#1a1a1a`/`#666666`/`#999999`/`#333333`/`#f0f0f0`/`#e0e0e0` in App.vue.
- `inkforge/package.json` — added `icons:build` script + `sharp` + `png-to-ico`
  devDependencies.
- `inkforge/src-tauri/tauri.conf.json` — `bundle.icon` array already references
  the canonical five names; no edit needed once the generator wrote real
  multi-resolution files.
- `docs/inkforge-brand-identity.md` — every `墨锻` rewritten to `墨铸` (2 sites)
  + new §9 Logo Mark section (intent, SVG master, sizing rules, platform
  squircle handling, generated asset pipeline).
