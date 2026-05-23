# Static Control Inventory

Generated from the first static extraction pass over `inkforge/src/views/**/*.vue` and `inkforge/src/components/**/*.vue`.

Pattern:

```text
<button|<input|<select|<textarea|@click|@submit|@change|@input|@keydown|role="button"
```

This is a coverage input, not pass evidence. A line count means the file has controls or interaction handlers that must be mapped to `audit-matrix.md` rows and browser/test evidence.

## Summary

- Vue files with static control matches: 53.
- Total matched control/interaction markers: 1117.
- Highest-risk dense files:
  - `inkforge/src/views/SettingsView.vue`: 203 markers.
  - `inkforge/src/views/WorkstationView.vue`: 83 markers.
  - `inkforge/src/views/HubView.vue`: 68 markers.
  - `inkforge/src/components/file/FileManager.vue`: 68 markers.
  - `inkforge/src/components/editor/FloatingToolbar.vue`: 63 markers.
  - `inkforge/src/views/DraftsView.vue`: 58 markers.

## File Counts

| File | Matches | Matrix Coverage |
| --- | ---: | --- |
| `inkforge/src/views/SettingsView.vue` | 203 | `RTE-005`, `SET-*`, `DEV-001`, `DSK-*` |
| `inkforge/src/views/WorkstationView.vue` | 83 | `RTE-002`, `CMP-WORKSTATION-001`, `CMP-EDITOR-001` |
| `inkforge/src/views/HubView.vue` | 68 | `RTE-001`, `CMP-HUB-001` |
| `inkforge/src/components/file/FileManager.vue` | 68 | `CMP-FILE-001`, `CMP-CATEGORY-001` |
| `inkforge/src/components/editor/FloatingToolbar.vue` | 63 | `CMP-EDITOR-001` |
| `inkforge/src/views/DraftsView.vue` | 58 | `RTE-003` |
| `inkforge/src/views/AccountWelcome.vue` | 37 | `RTE-006` |
| `inkforge/src/components/asset/AssetManager.vue` | 36 | `CMP-ASSET-001` |
| `inkforge/src/components/editor/AssetImageNodeView.vue` | 33 | `CMP-ASSET-001`, `CMP-EDITOR-001` |
| `inkforge/src/views/PublishView.vue` | 32 | `RTE-004`, `CMP-EXPORT-001` |
| `inkforge/src/components/editor/EditorContextMenu.vue` | 30 | `CMP-EDITOR-001` |
| `inkforge/src/views/dev/DevPanel.vue` | 28 | `DEV-004` |
| `inkforge/src/components/editor/TableFloatingToolbar.vue` | 28 | `CMP-EDITOR-001` |
| `inkforge/src/components/editor/WritingAssistPanel.vue` | 20 | `CMP-EDITOR-001` |
| `inkforge/src/components/export/ExportModal.vue` | 19 | `CMP-EXPORT-001` |
| `inkforge/src/components/tag-system/TagManagerModal.vue` | 17 | `CMP-TAGS-001` |
| `inkforge/src/components/editor/FindReplace.vue` | 16 | `CMP-EDITOR-001` |
| `inkforge/src/components/article/ArticlePanel.vue` | 14 | `CMP-FILE-001`, legacy article panel coverage |
| `inkforge/src/components/ai/AIPanel.vue` | 14 | `SET-AI-*`, AI panel coverage |
| `inkforge/src/components/version/VersionPanel.vue` | 14 | `CMP-VERSION-001` |
| `inkforge/src/components/tag-system/TagBrowser.vue` | 14 | `CMP-TAGS-001` |
| `inkforge/src/components/help/WelcomeModal.vue` | 13 | `CMP-HELP-001`, `SET-ABOUT-008` |
| `inkforge/src/components/settings/UpdateCard.vue` | 12 | `SET-ABOUT-001`, `DSK-010` |
| `inkforge/src/components/editor/EditorStatusBar.vue` | 12 | `CMP-EDITOR-001`, Workstation status coverage |
| `inkforge/src/components/category/CategoryPanel.vue` | 11 | `CMP-CATEGORY-001` |
| `inkforge/src/components/help/HelpCenter.vue` | 11 | `CMP-HELP-001` |
| `inkforge/src/components/editor/ThemePanel.vue` | 11 | `SET-APPEARANCE-*`, editor theme coverage |
| `inkforge/src/components/category/AddCategoryModal.vue` | 10 | `CMP-CATEGORY-001` |
| `inkforge/src/components/hub/UserAvatarPopover.vue` | 10 | `RTE-001`, `RTE-006` |
| `inkforge/src/components/template/TemplatePicker.vue` | 10 | `RTE-001`, template coverage |
| `inkforge/src/components/cms/CMSTools.vue` | 10 | hidden/legacy CMS coverage |
| `inkforge/src/views/ThemesView.vue` | 9 | `RTE-007` |
| `inkforge/src/components/settings/UpdateDetailsModal.vue` | 9 | `SET-ABOUT-001`, `DSK-010` |
| `inkforge/src/components/asset/AssetUploader.vue` | 8 | `CMP-ASSET-001`, `DSK-003` |
| `inkforge/src/components/workstation/WorkstationTabBar.vue` | 8 | `CMP-WORKSTATION-001` |
| `inkforge/src/components/preview/PreviewPanel.vue` | 8 | `CMP-EDITOR-001` |
| `inkforge/src/components/tag-system/TagInput.vue` | 8 | `CMP-TAGS-001` |
| `inkforge/src/components/hub/TemplateMarketGrid.vue` | 6 | `RTE-001`, template coverage |
| `inkforge/src/components/settings/UpdateToast.vue` | 6 | `SET-ABOUT-001`, updater notification coverage |
| `inkforge/src/components/version/VersionDiffModal.vue` | 5 | `CMP-VERSION-001` |
| `inkforge/src/components/hub/WritingFlowDayPopup.vue` | 5 | `CMP-HUB-001` |
| `inkforge/src/components/tag-system/TagBadge.vue` | 5 | `CMP-TAGS-001` |
| `inkforge/src/components/editor/FocusSessionSummaryModal.vue` | 4 | `CMP-EDITOR-001` |
| `inkforge/src/components/cms/CMSFeed.vue` | 3 | hidden/legacy CMS coverage |
| `inkforge/src/components/outline/OutlineTreeNode.vue` | 3 | `CMP-WORKSTATION-001` |
| `inkforge/src/components/settings/ShortcutInput.vue` | 3 | `SET-SHORTCUTS-001` |
| `inkforge/src/components/asset/AssetCard.vue` | 2 | `CMP-ASSET-001` |
| `inkforge/src/views/NotFoundView.vue` | 2 | `RTE-008` |
| `inkforge/src/components/hub/SectionDots.vue` | 2 | `RTE-001` |
| `inkforge/src/components/editor/CodeBlockView.vue` | 2 | `CMP-EDITOR-001` |
| `inkforge/src/components/editor/SlashCommandMenu.vue` | 2 | `CMP-EDITOR-001` |
| `inkforge/src/components/editor/MarkdownEditor.vue` | 1 | `CMP-EDITOR-001` |

## Next Use

- Browser audit must prioritize dense files first: Settings, Workstation, Hub, FileManager, FloatingToolbar, Drafts, Account, AssetManager.
- Hidden/legacy CMS components are included because the user selected full hidden/dev/experimental blocking scope.
- The static inventory must be reconciled against browser-visible controls; static-only hidden controls still need an explicit unreachable/blocked/pass classification.
- Supplemental app-shell scan added `inkforge/src/App.vue` after Command Palette / DevPanel audit found two error-boundary buttons outside the original `views` / `components` extraction scope. After repair, `App.vue` returned `missingType: 0`.
