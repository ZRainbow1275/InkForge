# Codebase Gap Analysis — preset-style-tab-differentiation

- **Query**: What did 05-23-preset-typography-overhaul actually deliver? Where do gaps remain that cause user-reported "all preset cards look identical"?
- **Scope**: internal (READ + GREP only, no edits)
- **Date**: 2026-05-25

---

## 1. Preset Definitions Completeness

`inkforge/src/services/export/themes.ts` defines **12 wechat presets** (PRD's `17 preset` count is stale — only 12 wechat + 5 xhs + 3 zhihu = 20 in current code).

### Wechat (themes.ts:334-842)

| id | previewCSS | exportCSS | decorate | distinct font (vs default `-apple-system`) | distinct color (primaryColor) |
|---|---|---|---|---|---|
| `thesis` | ✓ | ✓ | ✓ thesisRecipesExport (cjk-decimal-h2 + h2-underline-fine) | ✓ academic (SourceHanSerif+EBGaramond) | ✓ `#5a4a3c` ink-brown |
| `legal` | ✓ | ✓ | ✓ legalRecipesExport (cjk-decimal-h2 + numbered-list-roman) | ✓ academic | ✓ `#1a1a2e` near-black |
| `report` | ✓ | ✓ | ✓ reportRecipesExport (h2-underline-fine + pull-quote-bordered) | ✓ academic | ✓ `#004080` business-blue |
| `commentary` | ✓ | ✓ | ✓ commentaryRecipesExport (large-quote + h3-vertical-accent) | ✓ business (SourceHanSans+Inter) | ✓ `#c0392b` blood-red |
| `aigc` | ✓ | ✓ | ✓ aigcRecipesExport (h3-vertical-accent + ornament-hr) | ✓ business | ✓ `#2563eb` tech-blue |
| `code` | ✓ | ✓ | ✓ codeRecipesExport (h2-underline + pull-quote + numbered-list-roman) | ✓ creative (overrides to JetBrainsMono) | ✓ `#16a34a` terminal-green |
| `notes` | ✓ | ✓ | ✓ notesRecipesExport (cjk-drop-cap + ornament-hr + pull-quote-bordered) | ✓ lifestyle (LXGWWenKai+Fraunces) | ✓ `#d2691e` cream-orange |
| `news` | ✓ | ✓ | ✓ newsRecipesExport (large-quote + pull-quote-bordered + h2-underline) | ✓ creative | ✓ `#0f172a` slate-black |
| `meme` | ✓ | ✓ | ✓ memeRecipesExport (h3-vertical-accent + ornament-hr + h2-block-ribbon) | ✓ creative (h1 forces SmileySans inline) | ✓ `#ff006e` hot-pink |
| `life` | ✓ | ✓ | ✓ lifeRecipesExport (cjk-drop-cap + large-quote + ornament-hr) | ✓ lifestyle | ✓ `#a0522d` warm-brown |
| `elegant` | ✓ | ✓ | ✓ elegantRecipesExport (cjk-drop-cap + large-quote + cjk-decimal-h2 + h3-vertical-accent) | ✓ lifestyle base + academic fonts override | ✓ `#4a3c5a` deep-purple |
| `tech` | ✓ | ✓ | ✓ techRecipesExport (h2-block-ribbon + h3-vertical-accent) | ✓ creative | ✓ `#6366f1` indigo |

### Xhs (xiaohongshu.ts:258-408) — 5 presets

| id | previewCSS | exportCSS | decorate | persona font | primaryColor |
|---|---|---|---|---|---|
| `xhs-fresh` | ✓ (uses `#xhs-note`) | ✓ | ✓ xhsFreshRecipesExport | creative | `#FF2442` |
| `xhs-simple` | ✓ (uses `#xhs-note`) | ✓ | ✓ xhsSimpleRecipesExport | business | `#1A1A1A` |
| `xhs-warm` | ✓ (uses `#xhs-note`) | ✓ | ✓ xhsWarmRecipesExport | lifestyle | `#D4A574` |
| `xhs-tech` | ✓ (uses `#xhs-note`) | ✓ | ✓ xhsTechRecipesExport | business | `#4F46E5` |
| `xhs-nature` | ✓ (uses `#xhs-note`) | ✓ | ✓ xhsNatureRecipesExport | lifestyle | `#059669` |

### Zhihu (zhihu.ts:58-132) — 3 presets

| id | previewCSS | exportCSS | decorate | persona font | primaryColor |
|---|---|---|---|---|---|
| `zhihu-academic` | ✓ (uses `#zhihu-answer`) | ✓ | ✓ zhihuAcademicRecipesExport | academic | `#0066ff` |
| `zhihu-tech` | ✓ (uses `#zhihu-answer`) | ✓ | ✓ zhihuTechRecipesExport | business | `#1a1a2e` |
| `zhihu-insight` | ✓ (uses `#zhihu-answer`) | ✓ | ✓ zhihuInsightRecipesExport | academic | `#2d3436` |

**Conclusion**: Schema-wise, all 20 presets have the quartet (previewCSS / exportCSS / decorations / distinct font / distinct color). On paper PRD AC-4 is satisfied. The problem is downstream: see §3 + §4.

---

## 2. Font Assets Shipping

`inkforge/public/fonts/` content:

```
.gitkeep         (empty placeholder)
manifest.json    (declares 13 woff2 entries, every one with shipped: false)
```

**No woff2 file is actually shipped.** Manifest at line 5-71 lists all 13 fonts with `"shipped": false` and a `note` saying "Fonts gracefully fall back to system fonts when missing."

Practical impact: every CJK rule like `font-family: 'Source Han Serif SC', 'EB Garamond', ...` falls through to whatever the OS happens to have. On a clean Windows 11 install (the user's platform per memory), Source Han Serif SC is NOT pre-installed; the cascade lands on `serif` generic, which Edge WebView2 maps to a default Han font — **identical regardless of preset**. The "academic / business / lifestyle / creative" font differentiation that PRD §Q1 promised "self-hosted woff2" for **never landed**.

The fall-back ladder per `preset-fonts.ts` will collapse `thesis` (Source Han Serif → EB Garamond → serif) and `commentary` (Source Han Sans → Inter → sans-serif) onto whatever the system serif/sans is. On Windows that is usually Microsoft YaHei / Times New Roman — making CJK glyphs nearly indistinguishable between presets.

---

## 3. Platform Fallback Behavior

### xhs branch (`usePreviewRenderer.ts:145-175`)

1. Renderer detects `platform === 'xiaohongshu'`, calls `markdownToXiaohongshuText(body)` → produces **plain text only** (no HTML markup).
2. Calls `renderXhsMockHtml(textArtifact, { presetId: stripXhsPresetPrefix(presetId), primaryColor })`.
3. `stripXhsPresetPrefix` at lines 245-251 only matches `^xhs-(fresh|simple|warm|tech|nature)$`. For a wechat preset like `'report'` it returns **`undefined`**.
4. `renderXhsMockHtml` at line 128: `const presetId: XhsMockPresetId = options.presetId ?? 'fresh'` → falls back to **`fresh`**.
5. Looks up `PRESET_TOKENS[presetId] ?? PRESET_TOKENS.fresh` (xiaohongshu-mock.ts:62-88) → resolves to **`fresh` tokens** (primaryColor `#2BBF7C`, fontFamily generic `PingFang SC` stack, background `#FAFFFB`).
6. The full mock card is then wrapped in a `<section class="xhs-mock">` with hardcoded `border-top: 3px solid <primary>` and a single `<article>` containing **escaped plain text**.

**Consequence**: When platform=xhs and user selects ANY wechat-style preset card (`report`, `thesis`, `commentary`, etc.), they always see **the `fresh` mock card with green border**. Even when they select genuine `xhs-*` ids, all 5 produce visually near-identical cards differing only in primary color (3px top border + tag pill tint) — no font, no decoration. The xhs preset's `previewCSS` block (selector `#xhs-note { … }`) is NEVER applied because `renderXhsMockHtml` never renders a `#xhs-note` element and never injects `preset.previewCSS` into the document. The CSS in `xiaohongshu.ts:258-408` is dead code on the preview path.

### zhihu branch (`usePreviewRenderer.ts:176-203`)

Mirror story. `stripZhihuPresetPrefix` matches only `zhihu-(academic|tech|insight)`. Anything else → undefined → `renderZhihuMockHtml` falls back to `academic`. Tokens lookup (`zhihu-mock.ts:70-89`) yields a 3-preset map with only `primaryColor + fontFamily + fontSize + background`. The mock applies a hardcoded inline-style sweep (`applyInlineThemeAccents` zhihu-mock.ts:183-242) — preset's `#zhihu-answer { … }` previewCSS (zhihu.ts:69-128) is NEVER applied. The CSS only flows through the EXPORT pipeline (`convertToZhihu` zhihu.ts:531-548 calls juice with `preset.exportCSS`).

**Bottom line**: On xhs and zhihu tabs the user sees ZERO preset-differentiation beyond a single accent color line + a watermark string — even when picking the platform-native preset ids.

---

## 4. Inspector Preset Cards

**File**: `inkforge/src/views/WorkstationView.vue:2916-2941` (`.preset-strip`, 5554-line file)

Data source: `topPresets` computed at lines 997-1006:

```ts
const topPresets = computed(() => {
  const presets = getPlatformPresets(selectedPlatform.value)
  return presets.map(p => ({ id, name, icon, description, persona }))
})
```

Where `getPlatformPresets` is in `inkforge/src/services/export/index.ts:434-447`:

```ts
case 'wechat': return themePresets        // 12 items
case 'xiaohongshu': return getXiaohongshuPresets()   // 5 items
case 'zhihu': return getZhihuPresets()    // 3 items
```

**Platform-filtered: yes.** The inspector preset strip IS already platform-aware. The user's screenshot showing 11 cards (论文翻译/法学研讨/行业研报/时事点评/AIGC/编程创造/学习笔记/新闻/整活/人生感悟/优雅/科技) matches the 12 wechat preset names — they were captured on the wechat tab, with one card likely scrolled off.

A duplicate rendering of the same data source exists in `inkforge/src/components/export/ExportModal.vue:136-138` (`currentPresets` → `preset-card` grid line 745-767). Same `getPlatformPresets(selectedPlatform.value)` driver.

There is ALSO a third, separate, older `ARTICLE_PRESETS` list inside `inkforge/src/stores/theme.ts:34-175` — a parallel **10-item** definition (no `aigc` distinct from current naming, no `tech`, no `elegant`, different primary colors like `#8B0000` for thesis). This list is consumed by `inkforge/src/components/editor/ThemePanel.vue` line 57, `inkforge/src/views/ThemesView.vue` line 56, `inkforge/src/views/PublishView.vue` line 44, `inkforge/src/components/cms/CMSTools.vue` line 8 — but **not by the inspector strip seen in the screenshot**.

---

## 5. Orphan Presets

Cross-checking the wechat preset ids in `themePresets` (themes.ts) against the platform mock token maps:

| themes.ts id | xhs PRESET_TOKENS | zhihu PRESET_TOKENS | Reachable via xhs preview? | Reachable via zhihu preview? |
|---|---|---|---|---|
| thesis / legal / report / commentary / aigc / code / notes / news / meme / life / elegant / tech | — | — | n/a (wechat-only) | n/a (wechat-only) |

| xhs id | mock map key match (after strip) | reachable? |
|---|---|---|
| `xhs-fresh` | ✓ `fresh` | ✓ |
| `xhs-simple` | ✓ `simple` | ✓ |
| `xhs-warm` | ✓ `warm` | ✓ |
| `xhs-tech` | ✓ `tech` | ✓ |
| `xhs-nature` | ✓ `nature` | ✓ |

| zhihu id | mock map key match (after strip) | reachable? |
|---|---|---|
| `zhihu-academic` | ✓ `academic` | ✓ |
| `zhihu-tech` | ✓ `tech` | ✓ |
| `zhihu-insight` | ✓ `insight` | ✓ |

**No truly orphan preset id** — every id can be selected and resolves to a token. But the previewCSS / decorate quartet for xhs + zhihu IS effectively orphaned: those fields are read only by the export pipeline (`convertToXiaohongshu`, `convertToZhihu`) and never reach the preview renderer. From the user's POV the preview is what they see when they click a card, so this is the actual gap.

Additionally, `ARTICLE_PRESETS` in `stores/theme.ts:34-175` is a **parallel orphan list** — 10 items with different primary colors than `themePresets`, not synced, consumed by 5 legacy views (ThemePanel, ThemesView, PublishView, CMSTools). Not visible in the inspector strip but a confounding source of truth.

---

## 6. gitnexus Execution Flows

Running `npx gitnexus query --repo Inkforge "preset apply"`:

- **No matching `processes` (execution flows) returned for "preset apply"** — the preset-apply path is structured as a few isolated function calls (`applyPreset` setter → `defaultPresetId` write → `usePreviewRenderer` watcher → `renderPreview` async) rather than a tracked multi-step process.
- Symbol definitions returned: `applyPreset` (`stores/theme.ts:221`), `applyPreset` (WorkstationView.vue:1008), `selectPreset` (ExportModal.vue), plus several `normalizeAccentColor` / `resolveThemeMode` (visual-system) hits.

Running `npx gitnexus query --repo Inkforge "platform switch xhs zhihu"`:

- One process: **`proc_279_tauriinvoke`** (`TauriInvoke → HasTauriGlobal`) — only `detectPlatform` (utils/platform.ts:17-25) is part of it, and it's the **OS/web platform detection**, not the export-platform tab switching. Not relevant to this gap.
- Symbol hits: `usePreviewRenderer.ts` (interfaces + composable), `mapSettingsFontToPresetFont`, `RenderOverrides` — all the relevant code lives in `composables/usePreviewRenderer.ts` and `services/export/index.ts`, no dedicated execution flow.

**Takeaway**: gitnexus has not bound preset apply / platform switch into named processes. Investigation must rely on file:line evidence above.

---

## Synthesis: where is the actual gap?

The 05-23 PRD's plumbing is in place — every preset has the `previewCSS / exportCSS / decorate / persona / fonts` quartet declared. What's missing is the **delivery surface for xhs and zhihu previews**:

1. **xhs preview CSS is never injected.** `xiaohongshu-mock.ts:124-199` renders `<section class="xhs-mock">…<article>{plain text}</article>` and **never reads** `preset.previewCSS`. The 5 xhs presets' `#xhs-note { … }` blocks (`xiaohongshu.ts:269-407`) are dead on the preview path. — *Evidence: `xiaohongshu-mock.ts` has zero references to `previewCSS`, and Grep finds no `xhs-note` occurrence anywhere in the fidelity module.*

2. **zhihu preview CSS is never injected.** Same shape: `zhihu-mock.ts:119-157` renders `<section class="zhihu-mock">` with `applyInlineThemeAccents` hardcoded inline styles. The `#zhihu-answer { … }` previewCSS (`zhihu.ts:69-128`) is only consumed by the EXPORT path (`convertToZhihu` at zhihu.ts:531-548). — *Evidence: `zhihu-mock.ts` has zero references to `previewCSS` or `zhihu-answer`.*

3. **Cross-platform fallback silently collapses identity.** When user selects a wechat preset id (e.g., `'report'`) while on the xhs tab, `stripXhsPresetPrefix` returns undefined and the mock card defaults to `fresh` (`usePreviewRenderer.ts:162` + `xiaohongshu-mock.ts:128-129`). User has no visible feedback that the preset is being ignored — they see the same "green xhs card" regardless of which wechat preset they pick. Same for zhihu collapsing to `academic`. — *Evidence: `usePreviewRenderer.ts:245-259`, `xiaohongshu-mock.ts:128-129`, `zhihu-mock.ts:92`.*

4. **Font self-hosting never landed.** All 13 woff2 files in `inkforge/public/fonts/manifest.json` have `"shipped": false`. CJK font cascades collapse to system serif/sans on Windows, erasing the academic/business/lifestyle/creative font differentiation that the PRD's persona system depends on. — *Evidence: `inkforge/public/fonts/` contains only `.gitkeep` and `manifest.json`; no woff2 file.*

5. **Inspector preset strip IS platform-aware, but the data it shows on xhs/zhihu tabs is misleading.** `getPlatformPresets` correctly returns 5 xhs / 3 zhihu items, but since their `previewCSS` is ignored, clicking through them on the preview only re-tints the same card — failing PRD AC-1 ("任意 preset 渲染同一段 markdown，3 秒内能视觉区分") on xhs and zhihu tabs even though `themes-migration.test.ts` and PR5 evidence claim AC-1 verified (those tests only sample wechat presets). — *Evidence: WorkstationView.vue:997-1006 + xhs/zhihu mock files above.*
