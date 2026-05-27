# PR3 Titlebar — Design Notes & Evidence

> Captured 2026-05-27, alongside `html-loading-snapshot.html`.

## Files Touched

- `inkforge/index.html` — inline CSS-only loading placeholder (seal + wordmark + caption)
- `inkforge/src-tauri/tauri.conf.json` — main window: `decorations: false` + `titleBarStyle: "Overlay"` + `hiddenTitle: true` (preserves PR2's `visible: false` + splash window block)
- `inkforge/src/services/window-controls.ts` — Tauri-guarded minimize / toggleMax / close / isMaximized + resize subscription
- `inkforge/src/components/chrome/TitleBar.vue` — new component, platform-branched layout
- `inkforge/src/App.vue` — mounts `<TitleBar :document-title="..." />` outside `<router-view>`; pads content by `--ink-titlebar-height`; recolors error-boundary close button (Tempera) and removes the stale `#0066cc` literal upstream
- `docs/inkforge-brand-identity.md` — added §11 Loading Placeholder + §12 Titlebar

## Two Platform Layouts

### Windows / Linux (32px tall)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [data-tauri-drag-region                                                 ] │
│                                                                          │
│  [seal]  「文档名 or 成为作者吧」               [_]    [□]    [×]       │
│                                                                          │
│ ──────────────────────────────────────────────────────────────────── ◀ Hairline (1px)
└──────────────────────────────────────────────────────────────────────────┘
```

- Seal: 16×16 Kiln rounded square + Graphite「铸」 (no ◇ row at this size).
- Title: `articleStore.selectedArticle?.title` (fallback to tagline `成为作者吧`), font-family from the brand serif chain, 12px / 600.
- Buttons (`lucide-vue-next`): `Minus` / `Square` (or `Copy` when maximized) / `X`. 46×32 each. Hover bg `rgba(217,91,63,0.10)` (Kiln @10%); close hover bg solid Kiln + white icon.
- Drag region: whole bar minus the buttons (via the inner `.ink-titlebar__drag`).

### macOS (28px inset)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ●  ●  ●     [data-tauri-drag-region: seal + 文档名 centered]            │
└──────────────────────────────────────────────────────────────────────────┘
```

- 80px left spacer reserves space for the system traffic light (Overlay style).
- No custom min/max/close buttons (system provides them via Overlay).
- Background remains transparent so the Overlay chrome shows through.

## Brand Integration Checklist

| Aspect | Status |
|---|---|
| Vellum / Char palette via CSS vars `--ink-titlebar-*` | done |
| Kiln hover bg on Win/Linux buttons | done |
| Close button hover → solid Kiln + white | done |
| Title-text font chain (Source Han Serif SC → Noto Serif SC → EB Garamond → Georgia) | done |
| Dark mode: `:root[data-theme='dark']` and `@media (prefers-color-scheme: dark)` | done |
| Truncate long titles with `text-overflow: ellipsis` + `max-width: 60vw` | done |
| `data-tauri-drag-region` only on the drag area (NOT on buttons) | done |
| `-webkit-app-region: no-drag` declared on buttons (WebKit WebView2 fallback) | done |
| Exposes `--ink-titlebar-height` for shell padding | done |

## Manual Verification Plan (post-merge)

Browser smoke is limited — full validation needs Tauri runtime. Recommended manual passes:

1. `cd inkforge && pnpm tauri:dev` on Windows
   - Verify min / max / restore / close all work
   - Resize via window edge → max icon swaps Square → Copy
   - Win+← / Win+→ snap still works
   - Double-click on drag area maximizes/restores
2. `pnpm tauri:dev` on macOS (when available)
   - Traffic light still visible at top-left
   - Drag region works (drag title area to move window)
   - Content padded down by 28px (no overlap with traffic light)
3. Light → dark mode toggle (Settings) → titlebar palette flips
4. Open / select a real article → title text replaces the tagline within one tick
5. Reload (F5) → HTML loading placeholder visible until Vue replaces `#app`

## Coordination With PR2

- `inkforge/src-tauri/tauri.conf.json` is shared. PR3 only adds three keys (`decorations`, `titleBarStyle`, `hiddenTitle`) to the **main** window object. PR2's `visible: false` on main + splash window block are preserved verbatim.
- PR2 owns `inkforge/src/services/app-lifecycle/notifyAppReady.ts` and the `onMounted` invocation. PR3's App.vue edit is limited to the `<template>` structure + an `activeArticleTitle` computed. The two edits do not overlap.
