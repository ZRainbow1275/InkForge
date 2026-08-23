# Final Release Receipts — 2026-08-10

## Release identity

- `InkForge.exe`: 17,797,632 bytes;
  SHA-256 `524b72a5fa1b4b72832aff88460a7487fbffbed8024035fb4221b29966e32791`.
- Artifact producer: `export-source-set-v1:62`;
  SHA-256 `88c35464733fb2f309e895dad536a8a9575c6292f61043f87a5de5a1f3440cf3`.
- MSI: 225,366,016 bytes;
  SHA-256 `13f75d77b83c1ca6645ccdbd67336fdb2e2305fbd98e33a0e985a5d41ac78488`.
- NSIS: 226,884,560 bytes;
  SHA-256 `c5e74cdfa2c620b6b246dbae3857c7a397746055c905179df13160ff144be660`.

All native release runs verified the executable and producer identity before interacting with the product.

## Native shell lifecycle

- Default Windows motion: `1 passing / 1 conditionally skipped` in 1 minute 14.2 seconds.
- OS-only reduced motion: `2 passing` in 52 seconds.
- The Windows client-area animation setting was read as `True`, temporarily changed to `False`, and restored with
  `RESTORE_CODE=0`; the final independent readback was `True`.
- Runtime receipt: 3 panels and 3 live widgets.
- Panel collapse/expand, keyboard controls, focus recovery, hover geometry, dock/float/native/close/redock, ten rapid
  toggles, and real process restart restoration passed.
- The first native utility window was closed by a real Win32 `WM_SYSCOMMAND/SC_CLOSE`; the window disappeared,
  placement read back as `closed`, and focus returned to `.inspector-widget-menu-trigger`.
- Article A to article B reused the same native utility window, preserved the initial route, and read article B from
  live context: `sameWindow=true`, `initialRoutePreserved=true`, `liveReadbackMatchesArticleB=true`,
  `contextSource=live`.
- Receipt boundary: `fullAcceptance=true`, `published=false`.

## Platform artifact release path

The final release UI opened the visible full-export controls and native file/directory dialogs, wrote each artifact,
and read the output bytes back.

### Xiaohongshu

- Manifest: 2,173 bytes;
  SHA-256 `076cd021d1c7a52ef356809a7c37c2bed9a9bae076f68c44cfb40719c646dfa3`.
- Plain-text post: 932 bytes;
  SHA-256 `b155c1be1cd375401234ee19fb24f62c2b55a2229de4ce4daa23106cc250c3ce`.
- Six ordered PNG pages passed exact byte readback; every page is 1080×1440 and has `cropStatus=ok`.

### Zhihu

- Manifest: 611 bytes;
  SHA-256 `c8c7852827f2cdc9a5ff03cf961b93156d6c53c75d58e8a7a567526bac66721b`.
- Clean Markdown: 948 bytes;
  SHA-256 `1fa72f5ce2cb88fae7b1e5815a6b709d7d04ff4f6d14721f22cbda3554fef7eb`.
- Referenced PNG fallback: 512×512, 31,758 bytes;
  SHA-256 `ec465df6a8fa56299f74d597f7d7f9bb8b90013ec4914ef315c76e09ef8cfaa5`.
- The emitted manifest remains strict: `requirePlatformUpload=true`, `uploaded=false`, and
  `hostStatus=local-only`.
- The factory used a non-persisted `requirePlatformUpload=false` clone only to materialize and validate local image
  metadata/bytes. `convertToNativeFormat()`, its returned `nativeResult`, the emitted manifest, bundle report, and
  every platform/publish gate received the strict manifest.

For both platforms, `platformReadbackReceipt.status=not-run` and `published=false`.

## Verification

- Full export Vitest: `51 files / 1503 tests` passed serially.
- Full repository Vitest: `145 files / 2156 tests` passed serially.
- Exact ESLint, `vue-tsc --noEmit`, production build, Tauri release build, packaging, Rust checks, and task-scoped E2E
  passed.
- Sanitized machine-readable receipts: `final-machine-receipts-20260810.json`.
- Independent review reconciliation: `reviewer-reconciliation-20260810.md`.

## Cannot claim

- No authenticated Xiaohongshu or Zhihu editor readback was performed.
- No current-release WeChat native song/profile/media editor readback was performed.
- No WeChat live draft add/get/delete round trip was performed.
- No upload, save, phone preview, sync, schedule, group send, or publish action was performed.
