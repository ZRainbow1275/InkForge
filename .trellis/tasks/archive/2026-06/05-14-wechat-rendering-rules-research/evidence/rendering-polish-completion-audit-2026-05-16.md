# Rendering Polish Completion Audit - 2026-05-16

## Objective Restatement

User objective: current WeChat rendering is still not attractive enough, and
Inkforge should reference the doocs/md capability model that has Format, Insert,
Style, and related article-rendering controls.

Concrete deliverables for this slice:

- Improve WeChat article rendering visual hierarchy.
- Add real style controls for WeChat export.
- Separate style controls from format controls in ExportModal.
- Map doocs/md Format / Insert / Style into Inkforge without copying source.
- Add a real insert entry point where the current editor can support it.
- Verify with tests, build, and real browser smoke.

## Prompt-to-Artifact Checklist

| Requirement | Artifact | Evidence |
| --- | --- | --- |
| Rendering should be better looking | `inkforge/src/services/export/themes.ts` | `baseCSS` now uses stronger heading, quote, image, figure, table, and spacing defaults; `generateThemeCSS()` applies preset font size and primary-color accents to headings, quotes, inline code, and table headers. |
| Style controls should exist like doocs/md | `inkforge/src/components/export/ExportModal.vue` | ExportModal now has a dedicated `样式` section with font family, font size, primary-color swatches, code theme, and Mac code block controls. |
| Format controls should be separated | `inkforge/src/components/export/ExportModal.vue` | ExportModal now has a dedicated `格式` section for reading time, enhanced table, alert block, line numbers, and external-link footnotes. |
| Style controls must affect real renderer | `inkforge/src/services/export/types.ts`, `inkforge/src/services/export/wechat.ts` | `ExportOptions` has typed `fontFamily`, `fontSize`, and `primaryColor`; `convertToWechatWithStats()` clones the preset through `applyWechatStyleOptions()` and passes the effective preset into CSS, heading decoration, table enhancement, and WeChat post-processing. |
| Unsafe style input must not become CSS injection | `inkforge/src/services/export/wechat.ts`, `platform-export-rendering.test.ts` | `normalizeExportPrimaryColor()` only accepts 6-digit HEX colors; test verifies a malicious `primaryColor` string is ignored and does not appear in output. |
| Insert model should be real, not fake | `inkforge/src/components/editor/FloatingToolbar.vue`, `inkforge/src/components/editor/EditorPanel.vue` | FloatingToolbar now exposes an `插入图片` button that emits `requestImage`; EditorPanel wires it to the existing `requestImageFileInsert()` Asset Pipeline upload path. |
| Reference doocs/md model | `research/doocs-md-format-insert-style-reference.md`, `prd.md` | Research maps doocs/md Format / Insert or Edit / Style controls to Inkforge surfaces and records deferred boundaries. |
| Do not fake WeChat backend-native components | `research/doocs-md-format-insert-style-reference.md`, `prd.md` | Both artifacts state that mini-program cards, voting, video account cards, official-account cards, and similar backend-native components remain checklist/deferred items, not fake HTML generation. |
| Real browser smoke | Evidence screenshots and DOM probe | ExportModal screenshot: `evidence/inkforge-wechat-rendering-polish-format-style-2026-05-16-2026-05-16T11-32-51-507Z.png`; editor toolbar screenshot: `evidence/inkforge-editor-floating-toolbar-insert-image-2026-05-16-2026-05-16T11-35-24-033Z.png`. DOM probe confirmed active style controls `等宽`, `17`, `翡翠绿`; `#nice` style included `font-size:17px`, `JetBrains Mono`, and `#0F766E`; console error logs were empty. |

## Verification Commands

- `npx gitnexus impact --repo Inkforge --direction upstream generateThemeCSS`
  - Result: LOW risk, direct caller `convertToWechatWithStats`.
- `npx gitnexus impact --repo Inkforge --direction upstream convertToWechatWithStats`
  - Result: LOW risk, direct caller `convertToWechat`, affected process `renderPreview`.
- `npx gitnexus impact --repo Inkforge --direction upstream WechatExportOptions`
  - Result: MEDIUM risk, 10 direct importing export files.
- `npx gitnexus impact --repo Inkforge --direction upstream FloatingToolbar`
  - Result: target not found.
- `npx gitnexus impact --repo Inkforge --direction upstream requestImageFileInsert`
  - Result: target not found.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  - Result: 19 tests passed.
- `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/wechat-publish.test.ts --reporter=default`
  - Result: 37 tests passed.
- `pnpm -C inkforge exec eslint src/services/export/types.ts src/services/export/themes.ts src/services/export/wechat.ts src/services/export/index.ts src/components/export/ExportModal.vue src/components/editor/FloatingToolbar.vue src/components/editor/EditorPanel.vue src/services/export/platform-export-rendering.test.ts src/constants/index.ts --ext .ts,.vue --quiet`
  - Result: passed.
- `pnpm -C inkforge typecheck`
  - Result: passed.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`
  - Result: passed, Vite built successfully in 1m 8s.
- `git diff --check -- <touched files>`
  - Result: passed; only normal Windows LF-to-CRLF warnings were printed.
- `npx gitnexus status`
  - Result: index up-to-date at commit `9e3c463`.
- `npx gitnexus detect_changes --repo Inkforge`
  - Result: unavailable in this CLI (`unknown command 'detect_changes'`); compensated with the impact calls above, targeted tests, lint, typecheck, build, screenshots, and DOM probes.

## Browser Smoke

URL:

- `http://127.0.0.1:3005/workstation?id=c6a66bd5-0457-46a5-9308-ca07350fe362`

Observed:

- Export modal opens from the real Workstation header.
- WeChat tab is active.
- `样式` and `格式` sections are visible.
- Swatch `翡翠绿`, font `等宽`, and size `17` can be selected.
- Preview `#nice` exists and is non-empty.
- Preview DOM after style changes includes:
  - `font-family:'Fira Code', 'JetBrains Mono', Menlo, Monaco, Consolas, 'Courier New', monospace`
  - `font-size:17px`
  - `#0F766E`
- Floating toolbar appears after a real editor selection.
- Floating toolbar includes `插入图片`, `链接`, and `插入表格` buttons.
- Browser console error logs: none.

## Remaining Boundaries

- This slice does not build a full doocs/md-style permanent top editor menubar.
- This slice does not add ExportModal custom CSS editing; that needs a separate
  sandbox and UX pass.
- This slice does not automate WeChat backend-native components. Those remain
  out of scope unless a stable WeChat API contract is available.
