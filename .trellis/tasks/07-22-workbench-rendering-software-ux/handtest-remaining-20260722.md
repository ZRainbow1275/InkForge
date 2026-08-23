# Remaining Native Hand Test — 2026-07-22

Use the running Tauri application and the existing real `IF0722-ARTICLE-A`. Do not restore the recovery banner, clear IndexedDB, publish to XHS/Zhihu, or infer external success. Record each row independently.

## Newly implemented retest

- [ ] **R-02**: open Tags at the default manager width and once more at a narrow usable width. Confirm the article-tag input is two compact rows rather than a native-looking three-row form: search first, then styled color choice plus compact red Create. Confirm “任一匹配 / 全部匹配” form one segmented choice, “应用筛选 / 清除” form a separate action row, disabled/focus states are clear, no control is clipped, and Dark mode remains readable. Complete one real create → assign → select → apply → clear cycle without direct Store or IndexedDB mutation.
- [ ] **R-13**: the collapsible advanced-pane repair is now running. Confirm the style selector appears once, “高级排版参数” starts closed, opens and closes by mouse and keyboard, and retains width, font, size, line height, letter spacing, paragraph spacing, indent, heading, and quote controls. Tab through every control: focus must remain visible, selected buttons must expose a stable pressed state, the color check/font icon must be coherent, and clicking the “首行缩进” row must not trigger an unrelated form action. In Export, confirm both “渲染诊断与证据” and “质量与导出预检” start closed, remain keyboard reachable, and reveal all retained diagnostics without permanently occupying the normal export flow.

## Workstation geometry and rendering

1. **R-01 manager navigation group**
   - [ ] At the default manager width, restored/maximized windows, and a narrow usable width, confirm 文件/版本/大纲/标签/对话 occupy five equal compact slots with a Lucide icon above a complete two-character label; no label may overlap, clip, ellipsize, or push the collapse action outside the panel.
   - [ ] Activate all five entries by pointer and keyboard. Each selected state must follow the real panel content, expose a visible focus ring, and remain readable in Light and Dark themes. Collapse and reopen the manager and confirm the same active destination returns without content or state loss.
   - [ ] Related shell regression only: verify back/document identity, copy/export/fullscreen, Default/Write/Review/Split, and Publish remain aligned. At `≤900px`, Back + document identity occupy row one and actions occupy row two. This command-bar check supports R-04/R-10 and must not substitute for the five-tab R-01 proof.

2. **R-09 focus-mode exit**
   - [ ] Enter focus mode at Windows 150% scaling in restored and maximized windows.
   - [ ] Confirm the exit action remains below the native title-bar controls, never overlaps minimize/maximize/close, and is keyboard reachable.

3. **R-12 split view**
   - [ ] Enter Split and confirm a real editable-left/rendered-right layout appears.
   - [ ] With normal width, confirm the Split entry is both selected and expanded. At insufficient width, confirm it remains selected/requested while the actual preview is collapsed and the explicit space-warning state is shown; widening the usable area must restore the pane without a second click.
   - [ ] In the right toolbar, confirm linked/unlinked sync icons change with the real switch, the close action has a readable keyboard/accessibility name, and Tab/Enter/Space can operate both actions.
   - [ ] Drag and keyboard-adjust the divider; toggle synchronized scrolling; switch platform/style and confirm the right pane updates.
   - [ ] Reload and confirm split state/ratio return; close Split and confirm the prior editor layout returns.
   - [ ] Narrow the window and confirm the explicit “分栏空间不足” state appears without discarding the requested split state.

4. **R-05 shared typography**
   - [ ] On one paragraph-rich article, change font size, line height, letter spacing, paragraph spacing, first-line indent, heading style, and quote style one at a time.
   - [ ] Select one flagship preset (`flagship-kiln`, `flagship-kiln-paste-safe`, `flagship-tempera`, or `flagship-amber`); switch heading style and quote style independently and confirm both visibly override the generated flagship block rather than being swallowed by it.
   - [ ] Turn first-line indent ON and inspect three distinct nodes: the first ordinary paragraph and second ordinary paragraph must both use `2em`, while a paragraph inside a quote remains unindented. Turn it OFF and confirm all three are unindented.
   - [ ] Confirm each control now changes the Workstation preview, Export artifact, and WeChat Publish artifact through the completed canonical renderer-selection handoff; confirm no second control writes a conflicting value and no visible control is a no-op.

5. **R-14 WeChat personas**
    - [ ] Open `r14-r15-real-article-platform-gallery-20260722.html` for the paragraph-rich side-by-side baseline generated from the running `IF0722-ARTICLE-A`; pair it with `r14-persona-visual-signature-audit-20260723.txt`, whose rich heading/quote/list/code/table fixture proves 16/16 metadata-free, color-normalized WeChat final outputs remain unique. Neither artifact replaces visual review.
    - [ ] Keep the unpinned Inspector open and confirm 微信 / 小红书 / 知乎 plus the Stage actions remain fully visible above it. Switch WeChat → XHS → Zhihu → WeChat before choosing anything; every platform must immediately show exactly one active preset and a matching preview, never an unselected strip or a silent fallback from the previous platform.
    - [ ] Choose a non-default preset on each platform, switch away and back, and confirm the current-session platform choice is retained.
    - [ ] Open Export and then Publish from each non-default choice; the same platform/preset pair must remain selected and produce the matching artifact instead of resetting to a fixed or legacy default.
    - [ ] Select all 16 visible WeChat recipes against the same article.
   - [ ] Confirm every recipe has a visibly distinct structural/typographic result, not only a renamed card or accent strip.

6. **R-15 XHS and Zhihu local outputs**
   - [ ] Review the same local gallery: it contains 5/5 unique XHS and 3/3 unique Zhihu outputs from the real article. Confirm the differences are readable and intentional, not merely hash differences.
   - [ ] Select every visible XHS and Zhihu preset and confirm the preview changes through that platform's own renderer.
   - [ ] Compare the app export against `r15-native-artifacts-20260722/manifest.json`: the real 1-17 paragraph XHS text and full 20-paragraph Zhihu Markdown are clean local baselines. The full XHS text is intentionally blocked at 1171 characters rather than silently shortened.
   - [x] Inspect all 10 compacted XHS card pages under `r15-native-artifacts-20260722/xhs-cards-full-article/`: all 20 source markers are present, paragraphs stay intact, prose has no false list bullets, title/subtitle/body do not overlap, and the exact manifest passes the current 18-page local checklist with zero quality issues.
   - [ ] Export one XHS text/raster artifact and one Zhihu Markdown/preview artifact through the running app; verify the files are non-empty and do not contain WeChat-only wrappers.
   - [ ] Account upload/publication remains user-manual and is outside this local pass.

7. **R-16 Export versus Publish**
   - [ ] Export opens only local copy/save/folder/blog artifact actions.
   - [ ] In Export, confirm there is exactly one pinned copy/download pair and no second pair inside “平台原生产物”. WeChat must say HTML, XHS must say 纯文本, and Zhihu must say Markdown without wrapping; each action must use the matching native bytes rather than preview HTML.
   - [ ] Publish opens the channel/account/draft/manual-handoff center, retains source view/copy, has no `下载预览 HTML` local-file action, and does not claim a local write is platform publication.
   - [ ] Workstation, Export, and Publish consume the same current platform/preset pair and canonical typography overrides while retaining their distinct delivery responsibilities.
   - [ ] After a verified local write, Settings history shows `本地交付 / 本地写入并回读`, not WeChat/XHS/Zhihu success.

## Settings

8. **R-19 control consistency**
   - [ ] Check extension refresh, native file-picker cancel and select, switches, disabled actions, focus rings, and long labels at normal and narrow widths.
   - [ ] No raw file input, wrapped refresh label, uneven row height, or inaccessible disabled/focus state may appear.

## Hub

9. **R-21 creation-entry deduplication**
   - [ ] Confirm “最近编辑” now reads as a prominent card heading rather than a small eyebrow.
   - [ ] Confirm only Start and the bottom-right red creation menu remain; Recent/Hero/article-empty have no blank/template/new-article actions, the former header plus is absent, and the template market contains only real template cards—no extra plus/new-template card or empty grid slot.
   - [ ] Exercise blank, template, import, shortcut, close, and focus return through the retained routes.

10. **R-22 daily inspiration**
    - [ ] In Local mode edit text/author, reload, and confirm persistence without a network call.
    - [ ] In AI mode verify unconfigured, loading, failure, retry, and configured-provider success states when a real provider is available.

11. **R-23 Hub search**
    - [ ] Search the real `IF0722-ARTICLE-A`, navigate results with Arrow keys, open with Enter, return, clear, and verify an honest no-result state.
    - [ ] Put focus in the Local inspiration text/author field, press Ctrl/Cmd+F, and confirm InkForge search receives focus instead of any WebView find surface.
    - [ ] Tab from the search input into a real result, press Escape, and confirm the panel closes and focus returns to the search input.
    - [ ] Reload and repeat once to ensure the result surface is driven by persisted real articles rather than transient UI state.

## Completion rule

A checked row needs a current native observation or artifact specific to that requirement. Automated tests, neighboring screenshots, local artifact generation, and successful application startup do not substitute for a missing visible interaction.
