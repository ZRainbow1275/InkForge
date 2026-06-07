# Workstation Live WeChat Preview Audit - 2026-05-17

## Objective Restatement

User objective: the WeChat rendering still was not attractive enough, and the
Workstation should visibly reference the doocs/md capability model with Format,
Insert, Style, and a real preview rendering surface.

Concrete deliverables for this continuation:

- Keep the Workstation-level Format / Insert / Style controls visible.
- Keep the right-side WeChat rendering preview visible in the Workstation, not
  only inside ExportModal.
- Wire the Workstation preview to the current editor Markdown before autosave,
  so the preview is live and not stale.
- Keep insert actions connected to the real editor / Asset Pipeline boundary.
- Verify with focused tests, lint/typecheck/build, GitNexus, and real browser
  smoke.

## Prompt-to-Artifact Checklist

| Requirement | Artifact | Evidence |
| --- | --- | --- |
| Workstation has a preview rendering interface | `inkforge/src/views/WorkstationView.vue` | `.wechat-composer-strip` is visible above the editor and the split pane renders `.inline-render-preview #nice` through `usePreviewRenderer -> convertToPlatform`. |
| Format / Insert / Style are visible like doocs/md | `inkforge/src/views/WorkstationView.vue` | Browser DOM showed groups `格式`, `插入`, and `样式`, with Format actions `B/I/S/Code/链接/H1/H2/H3/无序/有序`, Insert actions `图片/表格/提示块`, and Style actions preset chips, color swatches, font-size chips, and `Mac 代码块`. |
| Preview is live, not waiting for autosave | `EditorPanel.vue`, `WorkstationView.vue` | `EditorPanel` emits typed `content-change` with current Markdown on rich-editor updates, Source-mode updates, hydration, idle reset, and flush. `WorkstationView` stores `editorLiveBody` and uses it before persisted `currentContent.body`. Browser DOM confirmed `实时追加验证 ABC123` appeared in `.inline-render-preview #nice` while save status was still `同步中`. |
| Style controls affect the rendered article | `WorkstationView.vue`, `usePreviewRenderer.ts` existing renderer | Browser DOM after clicking `Swiss Blue`, `18`, and `行业研报`: active controls matched those selections; `#nice` style included `font-size: 18px`; rendered HTML contained `#1565C0`; the preview remained non-empty. |
| Insert is real, not fake component HTML | `EditorPanel.vue`, `FloatingToolbar.vue`, `WorkstationView.vue` | Workstation Insert `图片` calls exposed `requestImageInsert()`, which delegates to `requestImageFileInsert()` and the existing Asset Pipeline upload path; backend-native WeChat components remain outside this HTML path. |
| Regression coverage exists for live preview updates | `inkforge/src/composables/usePreviewRenderer.test.ts` | Added `wechat: refreshes preview when live editor body changes`, verifying a changed body ref re-renders a WeChat `<section id="nice">` with the new title/body. |
| Real browser smoke evidence exists | Screenshot and DOM probe | Screenshot: `evidence/inkforge-workstation-wechat-live-preview-format-insert-style-2026-05-17-2026-05-16T20-23-48-153Z.png`. Browser URL: `http://127.0.0.1:3005/workstation?id=28668e2f-06c6-4ce0-8a87-1571a845a3c8`. |

## Verification Commands

- `pnpm -C inkforge exec vitest run src/composables/usePreviewRenderer.test.ts src/services/export/platform-export-rendering.test.ts --reporter=default`
  - Result: 2 files passed, 24 tests passed.
- `pnpm -C inkforge exec eslint src/views/WorkstationView.vue src/components/editor/EditorPanel.vue src/composables/usePreviewRenderer.test.ts --ext .ts,.vue --quiet`
  - Result: passed.
- `pnpm -C inkforge typecheck`
  - Result: passed.
- `pnpm -C inkforge build`
  - Result: passed; Vite built successfully in 36.82s.
- `git diff --check -- inkforge/src/components/editor/EditorPanel.vue inkforge/src/views/WorkstationView.vue inkforge/src/composables/usePreviewRenderer.test.ts .trellis/tasks/05-14-wechat-rendering-rules-research/evidence`
  - Result: passed; only normal Windows LF-to-CRLF warnings were printed.
- `gitnexus impact --repo Inkforge --direction upstream usePreviewRenderer`
  - Result: LOW risk, one direct test caller and no affected execution processes.
- `gitnexus detect_changes --repo Inkforge --scope unstaged`
  - Result: available, but repo-wide dirty tree has 55 changed files / 218 changed symbols and reports high global risk. This is not attributable only to this continuation slice; it includes pre-existing unrelated dirty work such as Tauri, Hub, tag-system, and earlier export changes.

## Browser Smoke

Observed in Chromium at `1440x1000`:

- Real Workstation opened through `http://127.0.0.1:3005/workstation`.
- Created a real local article via FileManager `新建空白文章`.
- Workstation toolbar showed `格式`, `插入`, and `样式`.
- Split preview pane showed `.inline-render-preview #nice`.
- After clicking `Swiss Blue`, `18`, and `行业研报`, DOM showed:
  - active preset: `行业研报`
  - active size: `18`
  - active color: `Swiss Blue`
  - `#nice` style includes `font-size: 18px`
  - rendered HTML includes `#1565C0`
- After inserting `实时追加验证 ABC123` into the real editor, DOM showed:
  - `.inline-render-preview #nice` contains `实时追加验证 ABC123`
  - save status at probe time was `同步中`, proving preview updated before autosave completion.

## Remaining Boundaries

- This continuation does not automate WeChat backend-native components such as
  mini-program cards, votes, official-account cards, or video account cards.
- The Workstation Format / Insert / Style strip is a practical Inkforge mapping,
  not a full doocs/md clone.
- The visual smoke uses local Workstation browser rendering; final WeChat
  backend/editor preview still requires real account credentials and backend
  preview access.
