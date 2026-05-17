# Workstation UI Rollback Evidence - 2026-05-17

## Reason

The previous Workstation pass incorrectly embedded WeChat-specific format/insert/style controls into the primary Workstation shell and changed Workstation defaults. That approach was rejected because it damaged the existing Workstation UI/UX and changed the information architecture beyond the scope of the isolated WeChat rendering task.

## Corrective Changes

- Removed the permanent Workstation `wechat-composer-strip`.
- Restored Workstation layout presets: `默认`, `写作`, `审阅`, `专注`.
- Restored default Workstation state so split preview is not forced on.
- Restored the right inspector to collapsed/unpinned defaults.
- Restored split preview and preview mode to the original `MarkdownPreview` component.
- Kept only the non-invasive live editor body data path so preview/export consumers can read unsaved editor text without changing the Workstation UI.
- Added cleanup for the rejected inline-rendering localStorage keys:
  - `inkforge.workstation.inlineRenderingLayout.v1`
  - `inkforge.workstation.inspectorPinned`

## Verification

Commands:

```bash
pnpm -C inkforge exec eslint src/views/WorkstationView.vue src/components/editor/EditorPanel.vue --ext .ts,.vue --quiet
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
pnpm -C inkforge exec vitest run src/composables/usePreviewRenderer.test.ts --reporter=default
git diff --check -- inkforge/src/views/WorkstationView.vue inkforge/src/components/editor/EditorPanel.vue
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
```

Results:

- ESLint passed for touched Workstation/editor files.
- TypeScript check passed.
- `usePreviewRenderer.test.ts` passed: 5 tests.
- `git diff --check` passed for touched files.
- Production build passed.
- GitNexus MCP `detect_changes` was unavailable because the MCP transport returned `Transport closed`; the local CLI also has no `detect_changes` command. Compensating checks are the targeted lint/type/test gates, production build, and browser DOM/screenshot smoke below.

Browser smoke at `http://127.0.0.1:3005/workstation`:

- `.wechat-composer-strip`: absent.
- Layout preset buttons: `默认`, `写作`, `审阅`, `专注`.
- Active layout preset: `默认`.
- Default split view: inactive.
- Default right split pane: absent.
- Inspector: collapsed.
- Inspector pin: inactive.
- Legacy localStorage keys: removed.
- Console errors: none.

Split-view smoke:

- Manual split activation works.
- Right pane root is `.markdown-preview.theme-default`.
- `.inline-render-preview`: absent.
- `.wechat-composer-strip`: absent.

Screenshot:

- `inkforge-workstation-ui-restored-2026-05-17-2026-05-17T04-46-25-302Z.png`

## Follow-up Boundary

Future WeChat/md-format style work must stay in export/publish or an explicitly separate preview surface. It must not override Workstation defaults or replace the primary Workstation preview without a dedicated product decision.
