# Acceptance Evidence — 2026-07-28

## Scope

- Restore the Inspector as the independent right rail.
- Restore complete WeChat article semantics, 375px reading density, real-data masthead, and preset differentiation.
- Localize the editor context menu.
- Expose the writing component library from Stage and `/组件`, with strict JSX/TipTap round-trip.
- Verify Xiaohongshu and Zhihu only through local safe fallbacks. Account publication is performed manually by the user.

## Automated verification

| Gate | Command / scope | Result |
| --- | --- | --- |
| Focused component/render regressions | 17 focused Vitest files | PASS — 17 files / 139 tests |
| Follow-up component regressions | 3 focused Vitest files | PASS — 3 files / 31 tests |
| Updated typography/export contracts | `pnpm exec vitest run src/services/export/preset-decorations.test.ts src/services/export/themes-migration.test.ts src/services/export/wechat-svg-options.test.ts src/services/export/platform-export-rendering.test.ts --reporter=default` | PASS — 4 files / 700 tests |
| Complete export domain | `pnpm exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism` | PASS — 47 files / 1428 tests |
| Type safety | `pnpm exec vue-tsc --noEmit --pretty false` | PASS |
| Production frontend | `NODE_OPTIONS=--max-old-space-size=4096 pnpm build` | PASS — 5576 modules transformed |
| Exact lint | Changed runtime and focused test files | PASS |
| Release preflight | `pnpm exec vitest run scripts/style-proof-release-preflight.test.ts --reporter=default` plus application preflight | PASS — 7 tests; 27 SVG modules, 108 module/persona pairs, 0 local violations |
| Final post-E2E recheck | Exact ESLint, 6 focused Vitest files, and `vue-tsc --noEmit --pretty false` | PASS — 6 files / 35 tests; lint and type-check clean |

## Native software verification

- `pnpm tauri build` completed against the production frontend and generated the release executable,
  MSI, and NSIS installer.
- Direct WebDriver interaction against the rebuilt `InkForge.exe` and its real WebView2 runtime
  passed 8/8 native checks:
  - Inspector is the final independent right rail, is not absolute/fixed, and does not overlap the
    editor or Stage.
  - The writing surface remains usable without Inspector overlap at narrow, maximized, and restored
    native window sizes.
  - The complete context menu is visible in the viewport and all 15 checked labels are Chinese.
  - Stage insertion creates a real `TipBlock`; Source mode contains the exact JSX and fields; the
    second `Ctrl+\` returns to the Typora component card.
  - `/组件` opens the same component library.
  - KaTeX has one visible HTML layer while its MathML accessibility layer remains clipped to 1×1.
  - A 360px/16px pure-CJK Range measurement yields 22 characters on every complete line.
  - All 16 WeChat presets render, expose at least three signature dimensions, retain the article
    masthead, and have neither horizontal nor SVG overflow.
- The repository-native focused WebView2 line-density test also passed independently: 1 test,
  measured line counts `22,22,22,22,22,22,22,22,16`.
- Visual review of the native window confirmed the independent rail, Chinese menu, Stage component
  entry, component card, masthead, SVG decoration, semantic body, and preset controls. No browser or
  Vite frame is counted as software evidence.

## Release artifacts

| Artifact | Size | SHA-256 | Authenticode |
| --- | ---: | --- | --- |
| `src-tauri/target/release/inkforge.exe` | 16.86 MiB | `F40C0CD8339F18742ABCE68B8D2DA60CCB12F903326E220D4BDB1EBA5D96FB3E` | `NotSigned` |
| `src-tauri/target/release/bundle/msi/InkForge_0.1.0_x64_en-US.msi` | 209.30 MiB | `7FC0E090FEC90C9CDFD73D0349FD3595A4C241C38744607F151DE80A68666305` | `NotSigned` |
| `src-tauri/target/release/bundle/nsis/InkForge_0.1.0_x64-setup.exe` | 210.68 MiB | `C42E205D8AF0C3A40330D98A496A2EE7018C28C3F7BBADCD0929E7369B5BA5AD` | `NotSigned` |

- The release files are reproducible local handoff artifacts, but they are not code-signed. Public
  distribution signing is therefore not claimed in this round.

## Change-impact review

- A task-scoped temporary Git index isolated the current task from the repository's unrelated dirty
  tree. GitNexus mapped 50 scoped files to 577 symbols and 15 execution flows and classified the
  combined scope as `HIGH`.
- No production symbol was changed after that result. The risk is covered by the focused component
  regressions, the complete serial export suite, type/lint/build gates, and direct release-binary
  acceptance above. The unrelated full working tree remains outside this task and was not staged,
  restored, or claimed.

## External boundary

- No real Xiaohongshu or Zhihu publish action was executed or claimed.
- No WeChat publish, scheduled send, credentialed sync, phone preview, or account readback was executed or claimed.
- The user will perform final external platform publication tests.
