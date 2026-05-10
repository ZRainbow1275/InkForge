# Evidence Log

## Environment

- Workspace: `D:\Desktop\Inkforge`
- App: `D:\Desktop\Inkforge\inkforge`
- Date: 2026-05-03
- Browser tool: Playwright MCP
- Runtime URL: `http://127.0.0.1:3005/`
- Runtime status: Vite dev server reused; `Invoke-WebRequest http://127.0.0.1:3005/` returned `200`.

## Commands And Observations

| Time | Action | Result |
| --- | --- | --- |
| 2026-05-03 16:16 CST | Static check: `pnpm -C inkforge exec vue-tsc --noEmit` | Passed. |
| 2026-05-03 16:16 CST | Static check: `pnpm -C inkforge exec eslint src/views/PublishView.vue --quiet` | First run caught `no-control-regex`; after replacing control-char regex with explicit `charCodeAt(0) < 32` filtering, re-run passed. |
| 2026-05-03 16:16 CST | Direct route smoke: opened `/publish` at 1440x900 | Page showed honest empty state: `暂无可发布正文`; `2024 年终总结`, `example.com`, and `createWithAI` absent; rich-text copy, code copy, and HTML download buttons disabled. |
| 2026-05-03 16:21 CST | Real state route smoke: `/workstation` -> command palette -> `publish.open` | Publish rendered real current content `Source Citation Test` / `正文带脚注`; stats showed `25` words and `1` minute; copy/download/code-copy buttons enabled; browser console had no `error` logs. |
| 2026-05-03 16:22 CST | Real download click: sidebar `下载HTML` | Visible toast reported `HTML 文件已生成并下载`; no console errors. |
| 2026-05-03 16:23 CST | Full lint: `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet` | Passed. |
| 2026-05-03 16:23 CST | Full type check: `pnpm -C inkforge exec vue-tsc --noEmit` | Passed. |
| 2026-05-03 16:23 CST | Whitespace check: `git diff --check -- inkforge/src/views/PublishView.vue 0503/ui-ux-manual-test/...` | Passed; Git only reported the existing Windows LF-to-CRLF warning for `PublishView.vue`. |
| 2026-05-03 16:24 CST | Production build: `$env:NODE_OPTIONS='--max-old-space-size=4096'; pnpm -C inkforge build` | Passed in 33.48s. Existing non-blocking warnings remain for mixed static/dynamic imports and large chunks. |
| 2026-05-03 16:24 CST | GitNexus `detect_changes(scope=all)` | Tool returned `fetch failed`; compensated with narrow diff review, full lint/typecheck/build, Playwright assertions, and console-error sweep. |
| 2026-05-03 16:03 CST | Workstation desktop width re-check | Active Source editor `.cm-content.cm-lineWrapping` measured around 256px; previous 72px collapsed editor finding no longer reproduced in the active editor mode. |
| 2026-05-03 16:48 CST | Runtime restart: `pnpm -C inkforge dev --host 127.0.0.1 --port 3005 --force` | Vite 6.4.1 started at `http://127.0.0.1:3005/` and forced dependency re-optimization. |
| 2026-05-03 16:49 CST | Fresh route smoke: `/settings?uiux=0503-final-force-reload` | Console logs after clearing old HMR output contained only InkForge cache-clearing logs and Vite connect logs; no `Module "path"/"fs"/"url"/"source-map-js" has been externalized` warnings and no errors. |
| 2026-05-03 16:51 CST | Direct route smoke: `/publish?uiux=0503-empty-final` | Empty state remained honest: no `2024 年终总结`, `example.com`, or `createWithAI`; `暂无可发布正文` shown; stats were `0/0/0/0`; HTML download and code-copy actions were unavailable; console had no errors. |
| 2026-05-03 17:00 CST | Real state route smoke: Workstation UI new draft -> Command Palette -> `publish.open` | Publish routed to `/publish` and rendered real local content `0503 发布链路真实验证`, the Vite official troubleshooting link, and `realPublishCheck` code block; stats were `77/1/0/1`; no sample content or empty state appeared; console had no errors. |
| 2026-05-03 17:01 CST | Real download click: sidebar `下载HTML` on the real local draft | Visible toast reported `HTML 文件已生成并下载`; Playwright error-log sweep returned no console errors. |
| 2026-05-03 17:02 CST | GitNexus final check: `impact(PublishView)`, `impact(renderMarkdownWithLazyOptionalEnhancements)`, `detect_changes(scope=all)` | All three GitNexus calls returned `fetch failed`; compensated with Playwright smoke tests, full lint, full type-check, production build, and `git diff --check`. |
| 2026-05-03 17:03 CST | Full lint: `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet` | Passed. |
| 2026-05-03 17:04 CST | Full type check: `pnpm -C inkforge exec vue-tsc --noEmit` | Passed. |
| 2026-05-03 17:05 CST | Production build: `$env:NODE_OPTIONS='--max-old-space-size=4096'; pnpm -C inkforge build` | Passed in 29.08s. Existing non-blocking warnings remain for mixed static/dynamic imports and chunks larger than 500 kB. |
| 2026-05-03 17:06 CST | Whitespace check: `git diff --check -- inkforge/src/views/PublishView.vue ... 0503/ui-ux-manual-test` | Passed; Git only reported existing Windows LF-to-CRLF warnings on touched tracked files. |
| 2026-05-03 17:10 CST | Hub desktop route smoke: `/?uiux=0503-route-hub-clean` | Visible, no mojibake, no Emoji text, no horizontal overflow, no externalized warnings, no console errors. |
| 2026-05-03 17:11 CST | Drafts desktop route smoke: `/drafts?uiux=0503-route-drafts` | Visible empty-state with real store counts, no mojibake, no horizontal overflow, no console errors. |
| 2026-05-03 17:14 CST | Themes desktop route smoke and no-mock repair | Initial sweep found pseudo-factual preview copy; after `ThemesView.vue` repair, `/themes?uiux=0503-route-themes-fixed` showed no forbidden pseudo-facts, no mojibake, no Emoji, no horizontal overflow, no console errors. |
| 2026-05-03 17:15 CST | Account desktop route smoke: `/account?uiux=0503-route-account` | Visible local-account boundary, no mojibake, no Emoji text, no horizontal overflow, no console errors. |
| 2026-05-03 17:16 CST | NotFound desktop route smoke: `/no-such-page?uiux=0503-route-notfound` | 404 recovery action visible, no mojibake, no Emoji text, no horizontal overflow, no console errors. |
| 2026-05-03 17:17 CST | Redirect smoke: `/editor`, `/client`, `/workspace`, `/cms`, `/nexus` | `/editor`, `/client`, and `/workspace` redirected to `/workstation`; `/cms` and `/nexus` redirected to `/`; no console errors. |
| 2026-05-03 17:18 CST | Mobile route smoke: `/drafts`, `/themes`, `/account`, `/publish`, `/settings`, `/no-such-page` at 390x844 | All visible, no horizontal overflow, no mojibake; Publish mobile had no sample content and showed honest empty state; Themes mobile had no forbidden pseudo-facts. |
| 2026-05-03 17:22 CST | Help/FTUE mobile entry smoke | Welcome overlay skip worked, help trigger opened Help Center, Markdown/shortcut content was visible, no mojibake, no horizontal overflow. |
| 2026-05-03 17:24 CST | Final lint after Themes repair: `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet` | Passed. |
| 2026-05-03 17:25 CST | Final type check after Themes repair: `pnpm -C inkforge exec vue-tsc --noEmit` | Passed. |
| 2026-05-03 17:26 CST | Final production build after Themes repair: `$env:NODE_OPTIONS='--max-old-space-size=4096'; pnpm -C inkforge build` | Passed in 26.63s. Existing non-blocking warnings remain for mixed static/dynamic imports and chunks larger than 500 kB. |
| 2026-05-03 17:27 CST | Final whitespace check: `git diff --check -- ... ThemesView.vue ... 0503/ui-ux-manual-test` | Passed; Git only reported existing Windows LF-to-CRLF warnings on touched tracked files. |
| 2026-05-03 17:27 CST | GitNexus final retry: `impact(ThemesView)` and `detect_changes(scope=all)` | Both calls returned `fetch failed`; local static/build/browser evidence was used as the authoritative verification path for this run. |

| 2026-05-04 02:10 CST | Workstation follow-up review before repair | Confirmed the core Workstation writing path was usable, but desktop visual review still found mixed English labels and a cramped all-panel writing surface. GitNexus `impact` and `detect_changes` retries returned `fetch failed`; compensated with Serena-targeted edits, local static checks, and browser verification. |
| 2026-05-04 02:20 CST | Workstation UI localization repair | Localized Workstation preview/split labels, Writing Assist controls, Pomodoro actions, ambient sound labels, Focus Session Summary copy, and duration formatting. No mock data, sample content, or fake publish state was added. |
| 2026-05-04 02:28 CST | Workstation writing-first layout repair | Adjusted first-run Typora layout to collapse the preview stage while preserving manager and inspector access; lowered default manager/stage/inspector widths and added 901-1440px responsive width caps to keep the editor visually primary. |
| 2026-05-04 09:19 CST | Workstation desktop critical screenshot before this repair | `0504-workstation-desktop-critical-pass-2026-05-04T01-19-10-829Z.png` still showed an inactive split shell leaving a blank right half and squeezing Source instant preview. DOM evidence: `.split-pane-left` was 470px inside a 939px shell and `.source-mode-layout` used `320px 280px` columns inside that 470px container. |
| 2026-05-04 09:24 CST | Workstation split/source layout repair | Updated inactive split CSS so the left pane takes full width when no split preview is mounted; updated Source layout to flexible columns and container-width collapse. `0504-workstation-desktop-after-tabbar-fix-2026-05-04T01-24-27-493Z.png` showed Source editor/preview as balanced columns and no mojibake. |
| 2026-05-04 09:27 CST | Workstation FileManager scrollbar repair | `0504-workstation-desktop-after-filemanager-scroll-fix-2026-05-04T01-27-00-609Z.png` removed the black horizontal scrollbar from the left manager. DOM evidence: `.panel-tabs` `scrollWidth === clientWidth`, `.fm-root` `overflowX=hidden`, page width stayed 1440px. |
| 2026-05-04 09:28 CST | Workstation mobile visual re-test | `0504-workstation-mobile-after-layout-fix-2026-05-04T01-27-44-858Z.png` and `0504-workstation-mobile-preview-after-layout-fix-2026-05-04T01-28-38-326Z.png` showed Source mode stacked correctly at 390px. DOM evidence: document width was 390px, Source grid was one 332px column, and console error logs were empty. |
| 2026-05-04 09:30 CST | Route sweep after Workstation repair | Desktop `/`, `/publish`, and `/settings` were reopened with Playwright. Hub, Publish, and Settings had no mojibake and no console errors; Publish had no forbidden sample content (`2024 年终总结`, `example.com`, `createWithAI`) and no horizontal overflow. Screenshots: `0504-hub-desktop-route-sweep-2026-05-04T01-29-43-051Z.png`, `0504-publish-desktop-route-sweep-2026-05-04T01-30-19-658Z.png`, `0504-settings-desktop-route-sweep-2026-05-04T01-30-42-343Z.png`. |
| 2026-05-04 09:31 CST | Targeted static validation | `pnpm -C inkforge exec eslint src/views/WorkstationView.vue src/components/editor/EditorPanel.vue src/components/file/FileManager.vue --ext .vue --quiet` passed; `pnpm -C inkforge exec vue-tsc --noEmit` passed. |
| 2026-05-04 09:32 CST | Production build validation | `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` passed. Non-blocking Vite warnings remained for existing mixed dynamic/static imports and chunks larger than 500 kB. |

| 2026-05-04 10:00 CST | Performance research and impact prep | Context7 `/websites/v6_vite_dev` and Grok Search confirmed Vite/Rollup guidance: use real code-splitting/manual chunks and avoid dynamic+static import mixing instead of hiding warnings with only `chunkSizeWarningLimit`. GitNexus `impact` calls for touched symbols returned `fetch failed`; compensated with Serena symbol/ref searches, narrow diffs, tests, build, and real browser evidence. |
| 2026-05-04 10:03 CST | Store import cleanup | Removed AI store dynamic imports of `article`/`editor`; kept functionality by using static store imports because no store-level reverse import of `ai` was found. Remaining `category -> article` warning was then replaced with a typed category-deleted event bridge to avoid the existing article/category store cycle. |
| 2026-05-04 10:05 CST | Highlight bundle cleanup | Replaced `import hljs from 'highlight.js'` in export utilities with `highlight.js/lib/core` and shared `INKFORGE_CODE_LANGUAGE_GRAMMARS`; `codeLanguages.ts` now reuses the same grammar registry for lowlight. This preserves existing supported code languages without loading the full highlight.js language bundle. |
| 2026-05-04 10:06 CST | Targeted lint | `pnpm -C inkforge exec eslint src/stores/ai.ts src/stores/category.ts src/stores/article.ts src/services/category-events.ts src/extensions/codeLanguageGrammars.ts src/extensions/codeLanguages.ts src/services/export/utils.ts vite.config.ts --ext .ts --quiet` passed. |
| 2026-05-04 10:07 CST | Full type check | `pnpm -C inkforge exec vue-tsc --noEmit` passed. |
| 2026-05-04 10:07 CST | Targeted tests | `pnpm -C inkforge exec vitest run src/services/export/citation-export.test.ts src/services/performance/performance.test.ts src/services/tag-system/tag-system.test.ts src/services/trash/trash.test.ts` passed: 4 files, 26 tests. |
| 2026-05-04 10:07 CST | Full lint | `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet` passed. |
| 2026-05-04 10:08 CST | Production build performance gate | `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build 2>&1 \| tee 0503/ui-ux-manual-test/0504-build-performance-pass-4.log` passed in 26.21s with no Vite warnings. `grep -E "\\(!\\)|warning|larger than|dynamically imported" 0504-build-performance-pass-4.log` returned no matches. Top chunk evidence saved to `0504-build-performance-chunk-top-pass-4.log`: largest JS chunk `editor-codemirror-core` 623.24 kB gzip 209.35 kB; `mermaid.core` 528.54 kB; `diagram-layout-engines` 493.31 kB; `markdown-rendering` 456.69 kB; `WorkstationView` 295.91 kB. |
| 2026-05-04 10:08 CST | Workstation desktop performance regression smoke | `0504-workstation-performance-desktop-fresh-2026-05-04T02-08-44-433Z.png`; DOM evidence: document width 1440/1440 no overflow, `.editor-split-shell` 939px, `.split-pane-left` 939px, `.source-mode-layout` columns `503.312px 372.021px`, FileManager overflow hidden, no mojibake, fresh console errors 0. |
| 2026-05-04 10:09 CST | Workstation mobile performance regression smoke | `0504-workstation-performance-mobile-2026-05-04T02-09-10-180Z.png`; DOM evidence: document width 390/390 no overflow, Source grid `332px`, editor/preview both 332px, FileManager overflow hidden, no mojibake, fresh console errors 0. |
| 2026-05-04 10:10 CST | Route smoke after performance split | Desktop `/`, `/publish`, and `/settings` reopened. Hub, Publish, and Settings had no console errors, no mojibake, and no horizontal overflow. Direct Publish honestly showed no selected article instead of sample content; embedded Workstation publish preview still rendered the real `0504 工作台真实验证` content during the Workstation smoke. |
| 2026-05-04 10:10 CST | GitNexus final check | `gitnexus_detect_changes(scope=all)` returned `fetch failed`; this limitation is recorded. Compensating gates completed: Serena searches, full lint, `vue-tsc`, targeted tests, warning-free production build, chunk stats, desktop/mobile screenshots, route console-error sweeps, and `git diff --check`. |

| 2026-05-04 11:09 CST | Platform rule research via Grok Search MCP | Reconfirmed current export constraints: WeChat draft content supports HTML but strips JS and requires article images from the official upload-image URL path; Zhihu should receive clean Markdown rather than HTML-dependent styling; Xiaohongshu should receive platform-native text with images/links/tables degraded to readable text. Sessions: `a03d06d36dcd`, `3b61d1fb0abc`, `ecaba69cc0a7`, official WeChat fetch `api_draft_add`. |
| 2026-05-04 11:00 CST | Regression test before sanitizer fix | `platform-export-rendering.test.ts` caught a real WeChat export failure: final HTML still contained `script`, `iframe`, `onclick`, and `javascript:` content. This was treated as a blocker, not a loose assertion. |
| 2026-05-04 11:04 CST | Targeted lint and export tests | `pnpm -C inkforge exec eslint src/services/export/wechat.ts src/services/export/xiaohongshu-text.ts src/services/export/platform-export-rendering.test.ts --quiet` passed; `pnpm -C inkforge exec vitest run src/services/export/citation-export.test.ts src/services/export/platform-export-rendering.test.ts --reporter=verbose` passed 2 files / 6 tests. |
| 2026-05-04 11:05 CST | Type check and production build | `pnpm -C inkforge exec vue-tsc --noEmit` passed. `NODE_OPTIONS='--max-old-space-size=4096' pnpm -C inkforge build` passed in 27.18s; log saved to `0504-platform-export-build-pass.log`; largest chunk remained below the 650 kB gate. |
| 2026-05-04 11:09 CST | Real browser platform export render verification | In the running Vite app, Playwright dynamically imported the real export service and rendered WeChat HTML, Xiaohongshu text, and Zhihu Markdown outputs. DOM assertions all passed: no forbidden WeChat tags/class/javascript links, WeChat inline styles present, Xiaohongshu had no Markdown/HTML leakage, Zhihu preserved Markdown code/link structure and removed hostile HTML styling. Console error sweep returned no matching logs. Screenshot: `0504-platform-export-real-rendering-final-pass-2026-05-04-2026-05-04T03-09-06-305Z.png`. |

| 2026-05-04 11:16 CST | GitNexus direct impact check via `http://127.0.0.1:8201/api/mcp` | Service initialized successfully. `detectZhihuIssues`, `detectQuality`, and `markdownToZhihuClean` returned LOW impact; `ZhihuMarkdownResult` returned MEDIUM, so no result-type expansion was made. |
| 2026-05-04 11:18 CST | Current platform-rule verification with Grok Search MCP | WeChat official docs confirmed HTML content, JS stripping, image upload URL requirements, and content limits. Zhihu search showed Markdown import exists but direct LaTeX behavior may vary by entry. Xiaohongshu search confirmed limited rich text, non-clickable external links, weak table/code support, and topic limits. Sessions: `9e3db1953745`, `e182e2d6923b`, `a826c01f6ffe`. |
| 2026-05-04 11:21 CST | Targeted code checks after Zhihu LaTeX preview repair | ESLint passed for export files; `vitest run src/services/export/citation-export.test.ts src/services/export/platform-export-rendering.test.ts --reporter=verbose` passed 2 files / 6 tests; `vue-tsc --noEmit` passed. |
| 2026-05-04 11:22 CST | Production build rerun | `NODE_OPTIONS=max-old-space-size=4096 pnpm -C inkforge build` passed in 24.05s; log saved to `0504-platform-export-build-pass-rerun.log`; largest chunk `editor-codemirror-core` stayed at 638.20 kB. |
| 2026-05-04 11:24 CST | Real browser platform export rerun | Playwright rendered WeChat HTML, Xiaohongshu text, and Zhihu Clean Markdown through the real export service in the running Vite app. DOM assertions passed: no forbidden WeChat tags/class/javascript links, inline style present, Xiaohongshu no Markdown/HTML leakage, Zhihu preserved Markdown and LaTeX, and `zhihu-latex-preview` was present. Conversion time was 164ms. Final console-error sweep returned no matching logs. Screenshot: `0504-platform-export-real-rendering-rerun-2026-05-04T03-24-46-885Z.png`. |

## Playwright Assertions

```json
{
  "settingsFreshConsole": {
    "url": "http://127.0.0.1:3005/settings?uiux=0503-final-force-reload",
    "visible": true,
    "externalizedWarnings": 0,
    "consoleErrors": 0
  },
  "directPublishEmpty": {
    "url": "http://127.0.0.1:3005/publish?uiux=0503-empty-final",
    "hasSampleYear": false,
    "hasExampleCom": false,
    "hasCreateWithAI": false,
    "hasEmptyState": true,
    "downloadDisabled": true,
    "codeCopyDisabled": true,
    "stats": ["0", "0", "0", "0"],
    "consoleErrors": 0
  },
  "workstationCommandPublish": {
    "url": "http://127.0.0.1:3005/publish",
    "hasRealTitle": true,
    "hasRealBody": true,
    "hasOfficialLink": true,
    "hasCode": true,
    "hasSampleYear": false,
    "hasExampleCom": false,
    "hasCreateWithAI": false,
    "hasEmptyState": false,
    "downloadDisabled": false,
    "codeCopyDisabled": false,
    "wordCountText": ["77", "1", "0", "1"],
    "downloadToast": true,
    "consoleErrors": 0
  },
  "workstation0504SourceLayout": {
    "url": "http://127.0.0.1:3005/workstation?uiux=0504-after-filemanager-scroll-fix",
    "desktopViewport": [1440, 960],
    "desktopDocumentWidth": 1440,
    "sourceColumns": [503, 372],
    "panelTabsOverflow": false,
    "mojibakeMarkers": [],
    "consoleErrors": 0,
    "mobileViewport": [390, 844],
    "mobileDocumentWidth": 390,
    "mobileSourceGrid": "332px"
  }
}
```

## Screenshots

- `0503-hub-mobile-2026-05-03T11-21-07-471Z.png`
- `0503-workstation-mobile-2026-05-03T11-21-35-106Z.png`
- `0503-workstation-desktop-after-text-2026-05-03T12-00-34-187Z.png`
- `0503-workstation-mobile-after-responsive-2026-05-03T15-49-31-084Z.png`
- `0503-hub-mobile-after-help-spacing-2026-05-03T15-52-27-623Z.png`
- `0503-hub-mobile-after-help-compact-2026-05-03T15-53-47-215Z.png`
- `0503-workstation-desktop-current-width-2026-05-03T16-03-35-027Z.png`
- `0503-publish-empty-after-no-sample-2026-05-03-2026-05-03T16-16-19-108Z.png`
- `0503-publish-real-content-after-command-route-2026-05-03-2026-05-03T16-21-55-213Z.png`
- `0503-settings-console-clean-after-force-2026-05-03T16-50-19-996Z.png`
- `0503-publish-empty-final-no-sample-2026-05-03T16-51-14-738Z.png`
- `0503-publish-real-content-final-command-route-2026-05-03T17-00-47-360Z.png`
- `0503-hub-desktop-final-route-smoke-2026-05-03T17-10-04-871Z.png`
- `0503-drafts-desktop-final-route-smoke-2026-05-03T17-10-52-773Z.png`
- `0503-themes-desktop-after-no-fake-preview-2026-05-03T17-14-37-878Z.png`
- `0503-account-desktop-final-route-smoke-2026-05-03T17-15-19-893Z.png`
- `0503-notfound-desktop-final-route-smoke-2026-05-03T17-16-05-404Z.png`
- `0503-drafts-mobile-final-route-smoke-2026-05-03T17-18-46-702Z.png`
- `0503-themes-mobile-after-no-fake-preview-2026-05-03T17-19-09-316Z.png`
- `0503-account-mobile-final-route-smoke-2026-05-03T17-19-39-461Z.png`
- `0503-publish-mobile-final-no-sample-2026-05-03T17-20-11-809Z.png`
- `0503-settings-mobile-final-route-smoke-2026-05-03T17-20-52-202Z.png`
- `0503-notfound-mobile-final-route-smoke-2026-05-03T17-21-16-963Z.png`
- `0503-help-mobile-final-entry-smoke-2026-05-03T17-22-50-442Z.png`
- `0504-workstation-desktop-critical-pass-2026-05-04T01-19-10-829Z.png`
- `0504-workstation-desktop-after-split-fix-2026-05-04T01-22-12-303Z.png`
- `0504-workstation-desktop-after-tabbar-fix-2026-05-04T01-24-27-493Z.png`
- `0504-workstation-desktop-after-filemanager-scroll-fix-2026-05-04T01-27-00-609Z.png`
- `0504-workstation-mobile-after-layout-fix-2026-05-04T01-27-44-858Z.png`
- `0504-workstation-mobile-preview-after-layout-fix-2026-05-04T01-28-38-326Z.png`
- `0504-hub-desktop-route-sweep-2026-05-04T01-29-43-051Z.png`
- `0504-publish-desktop-route-sweep-2026-05-04T01-30-19-658Z.png`
- `0504-settings-desktop-route-sweep-2026-05-04T01-30-42-343Z.png`
- `0504-workstation-performance-desktop-2026-05-04T02-08-03-949Z.png`
- `0504-workstation-performance-desktop-fresh-2026-05-04T02-08-44-433Z.png`
- `0504-workstation-performance-mobile-2026-05-04T02-09-10-180Z.png`
- `0504-platform-export-real-rendering-rerun-2026-05-04T03-24-46-885Z.png`

## Still Open

- No blocking `0503` findings remain open in this focused UI/UX repair slice. Broader route coverage in `test-matrix.md` still marks several pages as `pending` because they were outside the concentrated Workstation/Publish/Settings console pass.

## 2026-05-04 Second Manual Test Pass

### Scope

- Follow-up manual UI/UX pass requested after prior process interruption.
- Runtime reused: `http://127.0.0.1:3005/`.
- Focus: all primary routes, Hub/Drafts copy polish, Workstation image fallback, real export overlay, desktop and 390x844 mobile viewport checks.

### New Findings And Fixes

| ID | Result | Evidence |
| --- | --- | --- |
| UIUX-0504-008 | Fixed Hub mixed English labels and internal implementation terms in user-facing insight copy. | Before: `0504-manual-hub-localization-before-fix-2026-05-04T04-34-44-538Z.png`; after: `0504-manual-hub-localization-after-fix-2026-05-04T04-45-06-844Z.png`, mobile `0504-manual-hub-mobile-copy-after-fix-2026-05-04T04-46-29-273Z.png`. |
| UIUX-0504-009 | Fixed Drafts hero/result/empty copy so `draft` enum and `articleStore` do not leak into normal product UI. | Before: `0504-manual-drafts-second-pass-before-copy-fix-2026-05-04T04-36-32-371Z.png`; after: `0504-manual-drafts-copy-after-fix-2026-05-04T04-45-40-464Z.png`, mobile `0504-manual-drafts-mobile-copy-after-fix-2026-05-04T04-46-58-753Z.png`. |
| UIUX-0504-010 | Fixed Workstation image fallback English copy. | After: `0504-manual-workstation-image-fallback-after-fix-2026-05-04T04-51-09-562Z.png`; export overlay proof: `0504-manual-export-overlay-final-sweep-2026-05-04T04-55-31-870Z.png`. |

### Route Sweep Assertions

| Route | Checks | Result |
| --- | --- | --- |
| `/` | Visible page, no old English labels, no mojibake, no horizontal overflow. | Pass |
| `/workstation` | Visible Workstation, no old image fallback copy, no mojibake, no horizontal overflow. | Pass |
| `/drafts` | Visible Drafts, localized copy present, no `articleStore` / `draft` enum leakage, no overflow. | Pass |
| `/publish` | Direct route shows honest empty state when no article is selected; no sample content leak. | Pass |
| `/settings` | Settings visible; no mojibake or horizontal overflow. | Pass |
| `/themes` | Theme Center visible; no previously fixed pseudo-factual sample copy. | Pass |
| `/account` | Local account boundary visible; no fake remote-enable state. | Pass |
| `/no-such-page` | 404 recovery page visible; no mojibake or overflow. | Pass |

### Export Overlay Proof

Playwright opened `/workstation`, clicked the real `.publish-btn`, and verified:

```json
{
  "overlayOpen": true,
  "hasRealTitle": true,
  "hasNativeArtifact": true,
  "hasQualityCheck": true,
  "hasEnglishFallback": false,
  "hasSampleYear": false,
  "errorCountText": true,
  "scrollWidth": 1440,
  "clientWidth": 1440
}
```

### Console And Code Gates

| Check | Result |
| --- | --- |
| Final Playwright console-error sweep after route and export overlay checks | Pass: no console error logs. |
| Targeted ESLint for touched Vue files | Pass. |
| `pnpm -C inkforge exec vue-tsc --noEmit` | Pass. |
| `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build` | Pass; log: `0504-second-manual-pass-build.log`. |
| `gitnexus impact HubView -r Inkforge -d upstream --depth 2` | Pass: LOW, impactedCount 0. |
| `gitnexus impact DataInsightsSection/DraftsView/AssetImageNodeView` | Index could not locate those SFC symbols; changes were limited to user-facing copy and compensated by browser + lint + type + build checks. |
| MCP `gitnexus_detect_changes(scope=all)` | Still unavailable: returned `Session terminated`; compensated with route sweep, targeted diff scope review, lint/type/build, and browser evidence. |
