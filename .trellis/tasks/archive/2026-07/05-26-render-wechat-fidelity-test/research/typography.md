# Typography & CJK Review — `正文1.0-wechat.html` (preset=report, 29,919字)

**Verdict: ⚠️ CONCERNS** — Output is largely usable and CJK/Latin spacing works as advertised, but one **HIGH** issue (font-family chain leads with `Georgia`, a Latin serif, instead of a CJK family — visible to any reader on a desktop with Georgia installed) and one **MEDIUM** issue (21 `<ol>` decorator-injected Latin→CJK boundaries miss the thin space) need attention before production.

---

### 1. Font stack — ⚠️ CONCERN (HIGH)

The inline `font-family` on `<section id="nice">` reads:

> `Georgia, 'Noto Serif SC', 'Source Han Serif SC', 'Source Han Serif CN', STSong, 'Times New Roman', Times, serif`

This puts the Latin face **first**, so when Georgia is installed (default on macOS/iOS/Win), the browser uses Georgia to render every CJK glyph for which Georgia has no coverage — relying on per-character fallback. The result is acceptable but visually noisy: numerals and Latin tokens render as Georgia, CJK falls through to system substitute (often PingFang/Songti), and metric mismatch is visible at 16px. The persona spec at `preset-fonts.ts:26` correctly orders CJK first (`'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', 'STSong', 'SimSun', serif`) — something in the export pipeline reorders to put Latin first. WeChat strips webfonts, so on the published page **PingFang SC / Microsoft YaHei** would normally provide CJK; here PingFang isn't even listed for the `academic` persona — only serif faces — which is correct for 报告体 but means iOS/Android falls back to system serif. **Action: trace why `Georgia` ends up first; the persona's intent is `serif CJK → serif Latin`.**

### 2. Line-height — ✅ PASS

`line-height: 1.75` applied to every `<p>` (187 occurrences). For a 100-minute serif read with `font-size: 16px` this lands between doocs/md (1.75) and wewrite (1.8) and is appropriate; tighter would crowd CJK ascenders, looser would slow scan. No action needed.

### 3. CJK/Latin thin-space (U+202F) — ⚠️ CONCERN (MEDIUM)

434 U+202F insertions, all visually correct in samples (`e-CNY`, `mBridge`, `2025 年`, `SWIFT 体系`, `BIS 经典`, `7.3 万亿`). Full-width brackets `（）《》` are deliberately skipped — `e-CNY` *inside* `（e-CNY）` has no gap to the bracket, which is the right call (the bracket is already visually spaced). However, **23 boundaries miss the thin space**: 2 are `2025 年` next to `于` (cross-tag adjacency the tokenizer can't see), and 21 are ordered-list decorator artifacts: `01契约的"安抚条款"`, `02对外的"下一代"`, etc. The `decorateReportOlNumbers` decorator (themes.ts:514) injects a `<span>01</span>` directly adjacent to the `<p>` text without a thin space. **Action: in the OL decorator, emit `01 ` or `01 ` after the marker — currently it adds `margin-right:0.5em` but no whitespace, so `applyCjkLatinSpacing` sees the `1`/`契` boundary split across tags and skips it.**

### 4. Paragraph indentation — ✅ PASS

`isUseIndent: false` honored — zero `text-indent: 2em` in output, 187 `text-indent: 0` declarations. For a Western-style **报告体** with numbered H2 badges (`01`/`02`/`03`) and `<h3>` left-border markers, indent-off is correct. doocs/md's default `wechat-elegance` preset also disables indent for analytical content. Indent would compete with the H2/H3 vertical rhythm and the H1 left-bar. No action needed.

### 5. Punctuation — ✅ PASS

41 em-dashes (`——`) preserved as full-width; zero `--` double-hyphens (would indicate marked-it collapse). `「」《》（）` survive through the pipeline. The `**` markdown emphasis pairs that don't close cleanly (visible in lines 47, 54, 84, 92, 95 — `**"防御性备份系统"**`) cause **stray asterisks** to leak into the rendered body where the source has unbalanced bold. This is **not a typography bug** — it's a markdown authoring issue in `正文1.0.md` — but worth flagging to whoever owns the source. Action: no engine change needed; ask source author to fix.

### 6. Strong/em contrast — ✅ PASS

185 occurrences of the highlight `linear-gradient(180deg, transparent 60%, rgba(0,64,128,0.15) 60%)` survive post-processing. **Zero** `backdrop-filter` residue. The 60%/60% gradient produces a flat underline-band at ~40% of the line-box, which renders deterministically in WeChat (no blend-mode stripping). `<em>` correctly reorders font stack to Latin-first (`'EB Garamond', 'Crimson Pro', Georgia, …`) since em is typically used for Latin emphasis — though if an em wraps Chinese the Latin-first chain forces character-level fallback again (same root cause as §1). No action needed for the gradient; em font-stack inherits the §1 fix.

---

### Top 3 actionable fixes (impact order)

1. **Trace and fix the Latin-first font-family reorder** (`section#nice` resolves to `Georgia, 'Noto Serif SC', …`). Persona spec at `inkforge/src/services/export/preset-fonts.ts:26` puts CJK first; the export pipeline is reordering. Inspect `generatePersonaBaseCSS('academic')` callers and any `juice`/inline-css step that may sort by font-style heuristics. **Highest visual impact.**
2. **Patch `decorateReportOlNumbers`** (`inkforge/src/services/export/themes.ts:514` chain) to append U+202F or a regular space after the `01`/`02` marker span, OR feed the post-decorate HTML back through `applyCjkLatinSpacing` once more. Removes 21 missing-gap artifacts in numbered lists. **Medium visual impact, easy fix.**
3. **Document the `**…**` markdown unbalance issue** in the task PRD so the source `experiment/正文1.0.md` author can clean it up — stray `**` appear in rendered output around lines 47, 54, 84, 92, 95 of the HTML. **Not an engine bug, but it's the most jarring visible artifact on the published page.**
