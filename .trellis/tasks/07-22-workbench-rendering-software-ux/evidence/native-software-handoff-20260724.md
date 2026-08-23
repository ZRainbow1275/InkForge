# InkForge packaged desktop handoff — 2026-07-24

## Acceptance authority

- Product acceptance was performed against the packaged Windows Release
  executable, not a browser page and not a Vite development endpoint.
- The accepted process was
  `D:\Desktop\InkForge-0.1.0-Windows-20260724\InkForge.exe`.
- Windows UI Automation, Win32 window geometry/capture, Tauri commands, file
  readback, artifact hashes, and durable application state supplied the runtime
  evidence.
- After the native session closed:
  `InkForgeProcess=none` and `Port3005Listener=none`.
- CloakBrowser remains external-editor research infrastructure only. No browser
  screenshot closes an InkForge product requirement.

## Windows delivery artifacts

Handoff directory:

`D:\Desktop\InkForge-0.1.0-Windows-20260724`

| Artifact | Purpose | Size | SHA-256 | Authenticode |
| --- | --- | ---: | --- | --- |
| `InkForge.exe` | Direct Release executable for immediate local testing | 17,696,768 bytes (16.88 MiB) | `F3490592D5AEE56CBD298752D77F6B7CF058F1A9BCD52F26F57C2E45F5BB13E6` | `NotSigned` |
| `InkForge_0.1.0_x64-setup.exe` | Recommended NSIS installer | 220,976,733 bytes (210.74 MiB) | `256C14E8080DF7ABE0E3546374A56DDD32E1524F54E867D911C83EE2E7837B40` | `NotSigned` |
| `InkForge_0.1.0_x64_en-US.msi` | Windows Installer / managed deployment package | 219,525,120 bytes (209.36 MiB) | `D26DEEB20C0BF1916D157636555EA8159E454C0FD809ABE17ADA909652522940` | `NotSigned` |

The copied artifacts were hashed independently after handoff. The same values
are recorded in `SHA256SUMS.txt`. Both installers include the offline Microsoft
Edge WebView2 Runtime, so the installed application does not require Vite,
`localhost:3005`, Node.js, or a separately downloaded runtime.

## Packaged desktop build

Command:

```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm -C inkforge tauri build
```

Result:

- Frontend Release build: 5,570 modules transformed.
- Rust `release` profile: passed.
- Windows bundles: WiX MSI and NSIS installer both generated.
- Build log: `final-tauri-build-20260724.log`.

The Release application was launched from the copied handoff directory. Native
inspection identified a visible `InkForge` top-level window at 2,100 × 1,350
physical pixels under 144 DPI. The accessibility document exposed
`InkForge - 首页`, then `InkForge - 工作站`, and finally
`InkForge - 发布` as real route states.

## Native interaction evidence

### Home and Workstation

- `native-release-home-20260724.png/.meta.txt` shows the complete persisted Hub
  using a real saved article and category.
- The native `继续创作` action opened the real article in Workstation.
- `native-release-workstation-20260724.png/.meta.txt` and
  `native-release-workstation-uia-20260724.txt` show the manager, editor,
  writing-focus controls, WeChat/XHS/Zhihu switch, Export, and Publish in one
  packaged desktop window.
- The preceding native manager sequence proves explicit collapse/reopen,
  removal of the hidden hover latch, and preservation of the visible paragraph
  anchor across the width transition.

### Publish and source inspection

- Native Publish exposes all 16 WeChat choices:
  论文翻译、法学研讨、行业研报、时事点评、AIGC、编程创造、学习笔记、新闻、
  整活、人生感悟、优雅、科技、赤陶旗舰、赤陶兼容旗舰、铜绿旗舰、黄铜旗舰。
- `native-release-publish-20260724.png/.meta.txt` and
  `native-release-publish-uia-20260724.txt` show the real platform preview,
  reading-time control, CC license, song, image, link, related-article, and
  contact-card inputs.
- The native `查看源码` action opened the independent source surface.
  `native-release-publish-source-20260724.png/.meta.txt` shows the generated,
  inline WeChat HTML in a large scrollable panel with copy and collapse
  controls; it is not squeezed into the former footer slot.

### SVG application

- The native Release UI enabled the five application slots and reported:
  `已启用 5 个发布中心注入位；全量试用位覆盖 27 个 SVG 模块 / 7 个家族。`
- `native-release-svg-enabled-20260724.png/.meta.txt` and
  `native-release-svg-enabled-uia-20260724.txt` show the real WeChat preview
  with the selected cover, numbered H2, divider, and ending modules.
- The proof toggle was then restored to its default-off state without changing
  the article. `native-release-svg-restored-20260724.txt` confirms the five
  SVG slot comboboxes are all `Enabled:false`.

## Verification gates

| Gate | Result |
| --- | --- |
| Focused current-round regression | 25 files / 185 tests passed |
| Complete export-service regression | 45 files / 1,395 tests passed |
| Complete Vitest suite | 128 files / 1,981 tests passed |
| Exact changed TS/Vue ESLint set | 97 files passed |
| Vue type check | `vue-tsc --noEmit --pretty false` passed |
| Production frontend build | 5,570 modules transformed |
| Rust static check | `cargo check` passed |
| Rust tests | 28 passed / 0 failed |
| Current-round style proof | `application-acceptance-ready`; local target `current-round-ready`; zero actionable local rows |
| GitNexus incremental index | 22,175 nodes / 39,917 edges / 300 flows |
| GitNexus worktree detection | 616 changed symbols / 140 files / 39 affected processes / aggregate `critical` |
| Diff integrity | `git diff --check` and `git diff --cached --check` passed |

The style-proof result is intentionally application-scoped:
`canClaimApplicationReady=true` and `canClaimReleaseComplete=false`.
It proves local SVG/style application and cannot be promoted into phone,
credentialed channel, or publication evidence.

The GitNexus risk is worktree-wide. It includes the pre-existing 140-file dirty
surface and does not override the exact pre-edit impact checks for this task's
production roots. No aggregate commit is planned; any future commit requires an
exact staged scope and another staged-only change audit.

## Runtime boundary

InkForge 0.1.0 is a Tauri 1 Windows desktop application. Its window, process,
installer, file operations, clipboard, dialogs, local delivery, settings,
keychain boundary, and native command surface are desktop-owned. Its UI is
rendered by the system Microsoft Edge WebView2 Runtime. Requiring a rendering
engine that is not Chromium-derived would be a separate WinUI/WPF/Qt migration,
not a truthful description of the current architecture.

Two fail-closed optional-asset lookups were visible only on the captured stderr
stream: `favicon.ico` and `config/enterprise.json`. The branded native icon
rendered correctly, and the absent optional enterprise policy resolves to the
documented updater default. Neither lookup crashed the process, opened a
development endpoint, or prevented native interaction.

## External/manual boundary

- The user owns the final WeChat Official Account editor paste, phone preview,
  mobile Dark Mode/interaction, cover acceptance, credentialed draft/sync, and
  publication checks.
- XHS and Zhihu account upload/publication automation is cancelled by user
  direction; their final checks are manual.
- A successful Pi request requires a user-configured Pi-compatible endpoint and
  credential.
- A successful remote Sync run requires a user-owned WebDAV, Git, or SelfHosted
  target and credential.
- The current Windows binaries are unsigned until a production code-signing
  certificate is configured.

These boundaries do not block immediate local software installation and
rendering tests. They remain explicitly unclaimed rather than simulated.
