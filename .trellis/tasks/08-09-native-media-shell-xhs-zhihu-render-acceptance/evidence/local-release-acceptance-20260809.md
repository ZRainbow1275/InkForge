# Local Release Acceptance — updated 2026-08-10 (`local`)

## Scope

This receipt proves the current Windows release application's local native-shell lifecycle and its visible
Xiaohongshu/Zhihu artifact-writing paths. It does not prove an authenticated platform-editor readback,
WeChat live draft round trip, phone preview, sync, schedule, group send, or publication.

## Current release identity

- Executable: `InkForge.exe`
- Executable bytes: `17,797,632`
- Executable SHA-256: `524b72a5fa1b4b72832aff88460a7487fbffbed8024035fb4221b29966e32791`
- Artifact producer: `export-source-set-v1:62`
- Producer SHA-256: `88c35464733fb2f309e895dad536a8a9575c6292f61043f87a5de5a1f3440cf3`
- The release binary is newer than every task product source. Changes after the release build are limited to
  E2E acceptance code and documentation.

All earlier executable/producer hash pairs remain invalidated and are retained only in `implement.md`
as historical audit context.

## Native shell receipt

The release WDIO harness started the exact executable above through `tauri-driver` and WebView2, verified the
launched release identity, used isolated WebView data, and removed its dedicated OS credential after each run.

- Default Windows animation state: `1 passing / 1 conditionally skipped`.
- OS-only reduced motion: `2 passing`; `matchMedia('(prefers-reduced-motion: reduce)')` was true while the
  product setting remained off.
- Windows client-area animation was read as `True`, temporarily set to `False` through
  `SystemParametersInfoW`, then restored and independently read back as `True` in `finally`.
- Runtime capability table: 3 panels (`manager`, `stage`, `inspector`) and 3 live widgets (`平台预览`,
  `引用链接`, `文稿统计`).
- Every panel completed real collapse/expand input and focus recovery.
- Every widget completed dock, in-app float, native utility window, close, reopen, and redock through its
  runtime-advertised controls; all final placements returned to `docked`.
- Unpinned Inspector hover reveal preserved editor geometry and withdrew before an obscured target was used.
- Pointer, Tab/Shift+Tab, Enter/Space, Escape, focus restoration, zero-duration motion, default motion, product
  reduced motion, OS-only reduced motion, and ten rapid state toggles passed.
- A real Win32 `WM_SYSCOMMAND/SC_CLOSE` closed the first native utility window; placement read back as `closed` and
  source focus returned to `.inspector-widget-menu-trigger`.
- A real release process restart changed the process ID and restored 3 panel rows, Inspector pin state, one
  native widget window, and two closed widget states; all 7 restart rows were `local`.
- Receipt: `fullAcceptance=true`, `published=false`.

## Production artifact receipt

`platform-artifact-release.spec.cjs` imported the acceptance Markdown and source PNG through the release UI,
opened visible full-export controls and native file/directory dialogs, wrote the bundles, and read every output
byte back. The receipt binds these bytes to the current executable and producer hashes above.

### Xiaohongshu

- Manifest: 2,173 bytes;
  `076cd021d1c7a52ef356809a7c37c2bed9a9bae076f68c44cfb40719c646dfa3`
- Plain-text post: 932 bytes;
  `b155c1be1cd375401234ee19fb24f62c2b55a2229de4ce4daa23106cc250c3ce`
- Raster pages: 6 PNG files, each 1080×1440, `cropStatus=ok`, body-referenced, and ordered as follows:
  1. `bbdafe6e49cda23bed3cd44f790b15d46f69423c0359d156c64c4fb9dc4be633` (cover)
  2. `0f271e0830688d187cbf21c6f7f73ae37bb195de559973b61ccc5ccafbf9936d`
  3. `373112853f71a26c3f1fc11746c6ceed03199cb658f7e7599d68b10e5bceabbf`
  4. `df60f6a034ab7a0f449ee91e7b5d6a3d53042535d50b3f71da5435c4bdb67efd`
  5. `a4b94648ef069300ebf98c195cf667ac4c72fafe1d72a39539f35da65bf9bd79`
  6. `dc780d1aa44c1d3a404fb9e282a42254cb9ad04be1ebccd42f13afe0eb70b0bc`

### Zhihu

- Manifest: 611 bytes;
  `c8c7852827f2cdc9a5ff03cf961b93156d6c53c75d58e8a7a567526bac66721b`
- Clean Markdown: 948 bytes;
  `1fa72f5ce2cb88fae7b1e5815a6b709d7d04ff4f6d14721f22cbda3554fef7eb`
- Image fallback: PNG, 512×512, 31,758 bytes, referenced by Markdown;
  `ec465df6a8fa56299f74d597f7d7f9bb8b90013ec4914ef315c76e09ef8cfaa5`

The emitted Zhihu manifest keeps `requirePlatformUpload=true`, `uploaded=false`, and
`hostStatus=local-only`. A non-persisted relaxed clone is used only by the factory while constructing and validating
local metadata and bytes. `convertToNativeFormat()`, the returned `nativeResult`, the emitted manifest, and all
publish/platform gates receive the strict manifest.

For both platforms, `platformReadbackReceipt.status=not-run` and `published=false`.

## Current verification

- Full Vitest: `145 files / 2156 tests` passed, serial execution.
- Full export Vitest: `51 files / 1503 tests` passed, serial execution.
- Exact changed-file ESLint: passed.
- `vue-tsc --noEmit --pretty false`: passed.
- E2E CJS syntax checks: passed.
- Native host/WebView bounds test: `1 passed`.
- Application preflight: `applicationReady=true`; 27 SVG modules, 7 families, 4 personas, 108 rendered
  module/persona pairs, and 0 local application issues. It correctly keeps
  `canClaimReleaseComplete=false` because external gates remain.
- Rust: `cargo fmt --check` and `cargo check` passed; WeChat command tests were `31 passed` and desktop
  command tests were `6 passed`.
- Current release build and packaging include the final local/platform-upload boundary correction; no task product
  source is newer than the accepted executable.
- Release packages: MSI 225,366,016 bytes,
  `13f75d77b83c1ca6645ccdbd67336fdb2e2305fbd98e33a0e985a5d41ac78488`; NSIS 226,884,560 bytes,
  `c5e74cdfa2c620b6b246dbae3857c7a397746055c905179df13160ff144be660`.
- Sanitized machine receipt: `final-machine-receipts-20260810.json`.
- GitNexus was rebuilt to 23,059 nodes / 42,203 edges / 1,201 clusters / 300 flows.
  Repository-wide `detect_changes(scope=all)` reports 185 dirty files, 1,136 changed symbols, 111 affected
  processes, and `critical` risk; this is the combined long-lived dirty worktree, not a task-isolated diff.
  `buildZhihuArtifactBundle` had exact `LOW` pre-edit impact with one direct caller and one affected local export
  process; `waitForWidgetPlacement` and `interactWithOwnedNativeDialog` had `LOW` impact and zero affected
  processes.

## Cannot claim

- No authenticated `platformReadbackReceipt` exists for Xiaohongshu or Zhihu.
- No current-release WeChat native song/profile/media target-editor readback exists.
- No `wechatApiLiveReceipt` exists; no live add/get/delete/absence operation was attempted.
- No upload, save, phone preview, sync, schedule, group send, or publish action was performed.
- `published=false` is a boundary, not evidence of platform rendering success.
