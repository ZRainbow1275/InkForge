# Browser Evidence - 2026-05-14

Task: `.trellis/tasks/05-06-app-visual-overhaul`

Runtime:
- Dev server: `http://localhost:3005/` returned HTTP 200.
- Browser: Playwright Chromium, headless.
- App root: `D:\Desktop\Inkforge\inkforge`.
- Local data setup: articles were created through the real Hub/FileManager UI only. No IndexedDB or localStorage rows were injected as proof.

## Final Screenshots

- `final-hub-1366x768-2026-05-13T17-22-11-407Z.png`
- `final-hub-1440x900-2026-05-13T17-22-35-309Z.png`
- `final-hub-1920x1080-2026-05-13T17-23-07-810Z.png`
- `final-hub-2560x1440-2026-05-13T17-23-35-851Z.png`
- `final-hub-avatar-popover-2560x1440-2026-05-13T17-25-19-995Z.png`
- `final-hub-flow-popup-2560x1440-2026-05-13T17-26-04-076Z.png`
- `final-hub-insights-2560x1440-2026-05-13T17-26-37-040Z.png`
- `final-hub-waterfall-2560x1440-2026-05-13T17-27-11-651Z.png`
- `final-workstation-quick-access-1440x900-2026-05-13T17-52-50-933Z.png`
- `final-workstation-search-focus-1440x900-2026-05-13T17-53-11-551Z.png`
- `final-workstation-source-1440x900-2026-05-13T17-30-49-070Z.png`
- `final-settings-statusbar-toggle-1440x900-2026-05-13T17-31-37-198Z.png`

## Hub Measurements

AC-G1.1 spacing:

| Viewport | `.hub-header` left/right/width | `.bento-container` left/right/width | `.hub-secondary-grid` left/right/width |
|---|---:|---:|---:|
| 1366x768 | 32 / 64 / 1270 | 32 / 88 / 1246 | 48 / 48 / 1270 |
| 1440x900 | 32 / 64 / 1344 | 32 / 88 / 1320 | 48 / 48 / 1344 |
| 1920x1080 | 32 / 64 / 1824 | 32 / 88 / 1800 | 48 / 48 / 1824 |
| 2560x1440 | 32 / 64 / 2464 | 32 / 88 / 2440 | 48 / 48 / 2464 |

Scroll snap:
- `.hub-page` computed `scroll-snap-type`: `y mandatory`.
- Region heights match viewport height at each tested viewport.
- One wheel action at 2560x1440 moved from `scrollTop=0` to `scrollTop=1440`; expected second region offset was `1440`.
- After animated dot navigation / wheel handling, `.hub-page` inline `style` was empty, so temporary `scroll-snap-type: none` did not leak.

Hub interactions:
- Header buttons included help `icon-btn` with `aria-label="打开帮助中心"` and settings `icon-btn`.
- Avatar trigger: `40x40`, `border-radius: 50%`, popover text: `本地账户 本地账户 账户管理 设置 切换账户 退出`.
- Writing flow bars: 7 `.chart-bar` elements. Clicking a bar showed `day-popup-card day-popup-floating` with empty-day text `今日尚无创作`.
- No default modal/onboarding dialog was visible after refresh.
- No bottom-right FAB/control was visible in the tested Hub state.

Insights and waterfall:
- Insights visible text had no forbidden development explanation hits for `开发`, `解释`, `为什么`, `链路`, `mock`, `Mock`.
- Tag cloud visible labels: `草稿`, `已发布`, `灵感`, `笔记`, `待整理`; no `[A-Za-z]` matches.
- Waterfall region at 2560x1440: region height `1440`, `.waterfall-grid` left/right/width `32 / 88 / 2440`, `column-count: 4`, `column-width: 280px`, `columns: 280px 4`.
- Waterfall card evidence: 1 real article card, with `.card-cover`, `.status-badge`, `.card-title`, `.card-excerpt`, `.card-meta`; measured height `329`.

## Workstation Measurements

Default Workstation at 1440x900:
- Root class: `workstation mode-typora app-route-shell`.
- Inspector before magnetism: `panel panel-inspector collapsed`, width `12`, right `0`.
- Top status indicators: one group, text `已同步 · 已保存`.
- Status bar: visible, width `1135`, height `32`.
- `.layout-presets` / `.layout-preset-btn`: `0`.
- Visible mode-label selectors (`.mode-label`, `.mode-chip`, `.mode-tab`, `.layout-preset-btn`): `[]`.
- Red editor decoration scan: no red left/right border hits on editor shell/content/page/ProseMirror candidates.
- Horizontal overflow: `0`.

W2/W3 FileManager:
- Search focus: input/wrapper width changed from `193px` to `487px`, transform `matrix(1.015, 0, 0, 1.015, 0, 0)`.
- Quick access appeared from real articles: text sample `快速访问1进行中1未命名文章草稿42分钟前`, then `2` items after creating a second article through FileManager UI.
- Quick access section `overflow-y: hidden`, `scrollHeight=108`, `clientHeight=108` in the one-item state.
- Quick access items have `draggable="true"`.
- Drag reorder smoke after real UI article creation:
  - before: `无标题文章草稿刚刚`, `未命名文章草稿46分钟前`
  - after: `未命名文章草稿46分钟前`, `无标题文章草稿刚刚`
  - persisted key: `inkforge:file-manager:quick-access-order:v1`.

Inspector magnetism:
- Before right-edge mousemove: `panel panel-inspector collapsed`, width `12`.
- After repeated mousemove at `clientX = width - 8` and wait: `panel panel-inspector`, width `260`, left `1180`.
- Inspector text included `排版风格`, `版心宽度`, `字号`, `行高`.
- After moving mouse away past the threshold and waiting: `panel panel-inspector collapsed`, width `12`.

Source mode:
- Pressing `Control+\` changed root class to `workstation mode-source app-route-shell`.
- Visible `.source-mode-layout`: `1`.
- Visible `.source-pane`: one pane, class `source-pane source-pane-editor`, width `1147`.

Settings:
- Navigating to `/settings?tab=workstation` and selecting `编辑器` exposed `input[aria-label="显示工作台状态栏"]`.
- Toggle exists and was checked.
- Visible text included `显示工作台状态栏` and `关闭后获得最干净的写作画面`.

Console:
- Playwright console log check after final browser smokes: no `error` logs and no `warning` logs.

## Quality Gates

- `rg -n "真实创建链路|不再绕路|不新增任何空壳|这里展示的所有动作都已经在 Hub|不再复制第四条路径|开发链路|创作工具信号|真实快速操作" inkforge/src`: 0 lines; command exited `1` as expected for no matches.
- `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet`: passed.
- `pnpm -C inkforge exec vue-tsc --noEmit`: passed.
- `pnpm -C inkforge exec vitest run --reporter=default`: passed, 52 files / 458 tests.
- `git diff --check`: passed; Windows CRLF warnings only.
- `npx gitnexus status`: current index up to date at commit `9e3c463`.
- `npx gitnexus impact --repo Inkforge --direction upstream --depth 2 FileManager.vue`: LOW, 0 upstream impact.
- `npx gitnexus detect_changes --repo Inkforge --scope all`: unavailable in installed CLI, returned `unknown command 'detect_changes'`; compensated with impact/status, narrow diff review, full lint/type/test/build/Tauri gates, and browser evidence.
- `pnpm -C inkforge tauri:build`: passed on the final code state. It ran `pnpm build`, compiled the Rust release target, and produced `D:\Desktop\Inkforge\inkforge\src-tauri\target\release\bundle\msi\InkForge_0.1.0_x64_en-US.msi` (5,050,368 bytes, LastWriteTime 2026-05-14 01:57:00).

## Tool Boundaries

- Serena `read_file` drifted to `/workspaces/d/Desktop/LawSaw/...` while the active config reported `Inkforge`; code reads for this task therefore used local shell line slices, and edits used `apply_patch`.
- GitNexus MCP `detect_changes` was not exposed in this session, and the installed CLI has no `detect_changes` subcommand. This is recorded explicitly instead of being treated as green graph coverage.
