# Flagship Premium Upgrade — Implementation Architecture Decisions

> First-hand codebase wiring decisions (from reading the actual source). Complements
> `research/enhancement-brief.md` (design patterns). Implementer: merge both.
> User feedback driving this: current flagship output is "太素" — reads like a clean
> GitHub-markdown→WeChat conversion (thin green line-art only, zero solid color blocks).

## 0. Self-feedback loop (PROVEN, no user needed)
- Render real `markdownToWechat` artifact (`prompts/0601/evidence/wechat-paste/flagship-*.html`)
  in Playwright at **393px** viewport → fullPage screenshot → Read it myself.
- Calibrated against user's real phone screenshots: local 393px render == real WeChat body
  rendering for all current modules. So local render is a faithful design proxy.
- Caveat: local Chromium is lenient; WeChat-sanitizer quirks (e.g. the font-family bug below)
  do NOT reproduce locally → must also re-check on real WeChat (PC editor paste / preview URL).
- Regenerate artifacts after code change:
  `cd inkforge && pnpm exec vitest run src/services/export/__tests__/emit-flagship-artifacts.test.ts`

## 1. CORE PRINCIPLE
**SVG only for pure-graphic motifs** (cover banner, dividers, decorative quote glyph, vessel mark).
**Inline-styled HTML color BLOCKS for every text-bearing node** (H2/H3 headers, blockquote/quote
card, callout box, footer card, list markers). Reasons: SVG `<text>` is single-line, truncates long
CJK titles, can't reflow/select, fixed size. WeChat KEEPS inline `background-color/border/border-left/
border-radius/padding/margin/color` on `<section>/<div>/<p>/<blockquote>/<span>` — this is THE lever
premium accounts use and the current flagship system barely touches it.

The HTML-block decorator pattern already exists and is proven in `preset-decorations.ts`
(`decorateReportH2Badge` = "01" chip, `decorateCommentaryH2Bar` = solid bar, `h2BlockRibbon` =
filled block, `decorateReportOlNumbers` = number chips). Copy that pattern exactly:
regex-replace anchor → wrap with inline `style="..."` + sentinel `class="ink-..."` (class only for
idempotency + preview CSS; WeChat strips class, keeps inline style). Idempotent (skip if sentinel present).

**Difference from existing decorators:** flagship HTML-block decorators must run for BOTH `preview`
AND `wechat` (do NOT `if (target==='preview') return html`) — inline HTML renders identically in
both, giving true WYSIWYG. (Existing ones skip preview only because they pair with previewCSS
pseudo-elements; ours don't need pseudo-elements.)

## 2. P0 BUG FIX — SVG `<text>` font-family nested-quote
`primitives.ts attrs()` does NOT escape values: `font-family="${v}"`. Current stacks embed double
quotes → attribute terminates early → malformed markup.
- `headers.ts`  `CJK_DISPLAY = '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'`
- `covers.ts`   3× `'-apple-system, "PingFang SC", "Source Han Sans", sans-serif'` (+ cover-quote serif variant)
FIX: inner multi-word font names → **single quotes** (attr is `"`-wrapped):
`-apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`.
(quotes.ts SAFE_FONT_STACK already uses no quotes — fine, but normalize to single-quote form too.)
Re-verify on real WeChat (the cover title rendered on the user's phone, so this WeChat build is
lenient, but the markup is still invalid — fix for correctness + other WeChat clients).

## 3. SVG PLAN CHANGES (inject.ts `SvgInjectionPlan` per preset, in themes.ts)
Slim each flagship plan to graphics-only; move text nodes to HTML decorators (chained AFTER).
Keep ALL 26 SVG modules registered (no deletion) — flagship plans just stop wiring the text ones.

- `cover`: KEEP (enriched, see §5). composeSvgDecorate still consumes first `<h1>` for the banner.
- `replaceHr`: KEEP (divider = graphic). Enrich motif slightly per preset.
- `headings`: REMOVE from plan → handled by `decorateFlagshipH2/H3` (HTML).
- `blockquote`: REMOVE from plan → handled by `decorateFlagshipBlockquote` (HTML quote/callout).
- `endmark`: REMOVE from plan → handled by `decorateFlagshipFooterCard` (HTML card embedding the
  vessel SVG mark). (endmark-* SVG modules stay registered.)

New flagship plan shape (all three): `{ cover, replaceHr }` only.

## 4. NEW HTML-BLOCK DECORATORS (new file: `svg-modules/html-blocks.ts`, exported, factory style)
Each is a factory `(opts: {accent, accentTint, accentBorder, onAccent, ink, inkSoft, paperWarm,
hairline, persona}) => (html, target) => html`. Use brand palette via `deriveSvgPalette` + new tints.
All idempotent, inline-styled, WeChat-safe (no gradient/pseudo/position:absolute/transform).

1. **decorateFlagshipH2(opts, presetVariant)** — replace `<h2>…</h2>`:
   - kiln: solid filled bar — `background:accent;color:onAccent;padding:0.55em 0.9em;border-radius:6px;
     font-weight:700` + a tiny leading index number in onAccent.
   - tempera: number badge "01" (accent bg chip, onAccent text, rounded) + title (ink) + a 2px accent
     bottom rule (`border-bottom:2px solid accent;padding-bottom:0.35em`). Academic, restrained.
   - amber: left thick bar (`border-left:5px solid accent;padding-left:0.7em`) + small uppercase kicker
     line ("PART 01" in accent, 0.7em, letter-spacing) above title (ink, 700). Business.
   - Counter increments per H2; reset per document call.
2. **decorateFlagshipH3(opts)** — `<h3>`: left 3px accent bar + title (ink, 600) +
   subtle `color:accent` for the bar; small top margin. Same for all presets (smaller than H2).
3. **decorateFlagshipBlockquote(opts)** — `<blockquote>` branch on first-line marker:
   - CALLOUT if first text matches `/^\s*(\[!)?(提示|注意|重点|警告|小结|Note|Tip|Warning|Important)/i`:
     tinted box `background:accentTint;border-left:4px solid accent;border-radius:8px;padding:14px 16px`
     + an inline SVG icon (info "i" / "!" — drawn as path, NO emoji) + bold accent label + body text.
   - QUOTE CARD otherwise: `background:accentTint(very light)/paperWarm;border-left:4px solid accent;
     border-radius:8px;padding:18px 20px` + a large decorative open-quote `"` span (accent, opacity .25,
     serif, big) at top-left + reflow body + optional attribution line (inkSoft, right-aligned, "—").
   - Reflow real text (not SVG) → fixes the boxy fixed-wrap quote look.
4. **decorateFlagshipLists(opts)** — bullets & ordered:
   - `<ul>`: set `list-style:none;padding-left:0` on ul; prefix each top-level `<li>` with an inline
     accent marker span (small filled diamond/square: `display:inline-block;width:6px;height:6px;
     background:accent;border-radius:1px;margin-right:0.6em;vertical-align:middle` ; rotate via
     border trick or keep square). Add `margin-bottom:0.5em;line-height:1.8` to li.
   - `<ol>`: number chips per `<li>` (accent circle bg, onAccent number) like `decorateReportOlNumbers`
     but brand-colored + circular. Reset counter per `<ol>`.
5. **decorateFlagshipFooterCard(opts, brand)** — APPEND once (sentinel) at document end:
   centered card `margin:36px 0 8px;padding:26px 20px;background:paperWarm;border:1px solid hairline;
   border-radius:14px;text-align:center` containing:
   - the **vessel SVG mark** (reuse the `renderVessel` ding×nib×grid path geometry, ~64px, inline svg
     width/height fixed small, centered) — extract the vessel path builder so both endmark-vessel and
     footer card share it (DRY; do NOT delete endmark-vessel).
   - brand line "墨铸 · InkForge" (ink, letter-spacing), tagline "成为作者吧" (inkSoft, small).
   - a thin accent rule (short, centered) + "全文完" (inkSoft, letter-spacing) — folds in the endmark.
   Canonical brand naming per memory: 墨铸 + tagline 成为作者吧.
6. **(optional) key-sentence** — via exportCSS, not decorator: keep `strong` accent+bold, add a subtle
   highlight `background:accentTint;padding:0 .12em;border-radius:3px`. Render-test: if too noisy on
   every strong, drop the bg and keep just color+weight. Also consider a lead-paragraph standfirst:
   `#nice > p:first-of-type` slightly larger (17.5px) — low priority, test visually.

## 5. COVER ENRICHMENT (covers.ts)
- Fix font bug (§2).
- Add a **kicker/eyebrow chip**: a small filled rounded `rect` (accent) with onAccent label text
  (persona-derived: creative→"专栏" / academic→"深读" / business→"洞察", or pass via params; keep short)
  top-left above the title rule. Gives the "designed magazine" signal.
- Strengthen: tempera cover-title currently very empty → add a subtle paper texture (2–3 very low
  opacity accent hairlines or a faint corner motif) + move accent rule to interact with kicker.
- cover-grid (kiln) already has grid+dot — add kicker chip too; keep energetic.
- Differentiate per preset (see §6). Keep viewBox 1080×620; keep `fitCharsPerLine` overflow guard.

## 6. PER-PRESET DIFFERENTIATION (not just recolor)
- **flagship-kiln** (#D95B3F, creative): boldest. Solid filled H2 bars, grid cover + accent dot,
  energetic. Quote card with strong tint. Forge divider. "敢用色块".
- **flagship-tempera** (#3B7A6B, academic): refined/serif. Number-badge H2 + hairline rule, calm
  tinted quote card, diamond divider, generous whitespace. "克制但有结构".
- **flagship-amber** (#C19A56, business): structured/editorial. Left-bar H2 + uppercase kicker,
  grid divider, restrained tint, strong typographic hierarchy. "商务专业感".
- All three: enriched cover with kicker chip + unified premium footer card.

## 7. THEME PALETTE ADDITIONS (theme.ts deriveSvgPalette — additive, update SvgPalette type)
Add: `accentTint` = rgba(accent, persona creative/lifestyle ? 0.12 : 0.09) for card backgrounds;
`accentBorder` = rgba(accent, 0.30); `accentStrong` = accent (alias). Keep existing fields.
(HTML decorators receive a flat color bag derived the same way so preview==export.)

## 8. WIRING (themes.ts, each flagship preset `decorate`)
```
decorate: chainDecorators(
  composeSvgDecorate(flagshipXPlan /* {cover,replaceHr} */, { primaryColor, persona }),
  decorateFlagshipH2(htmlOpts, 'kiln'|'tempera'|'amber'),
  decorateFlagshipH3(htmlOpts),
  decorateFlagshipBlockquote(htmlOpts),
  decorateFlagshipLists(htmlOpts),
  decorateFlagshipFooterCard(htmlOpts, { brand:'墨铸 · InkForge', tagline:'成为作者吧' }),
)
```
`chainDecorators` already imported in themes.ts. `htmlOpts` built from `deriveSvgPalette(color, persona)`
+ new tints. composeSvgDecorate runs first (consumes h1→cover, hr→divider); HTML decorators then handle
h2/h3/blockquote/lists; footer appended last.

## 9. CONSTRAINTS (hard)
- WeChat-safe: inline styles only; NO gradient/defs/use/url()/clipPath/mask/filter; NO style="transform:";
  NO position:absolute; NO pseudo-elements/counters in export path; escape SVG font names with single quotes.
- NO emoji anywhere — icons are inline SVG paths only.
- Do NOT delete/rename any existing module (26 SVG modules + existing decorators stay).
- Brand colors locked (kiln #D95B3F / tempera #3B7A6B / amber #C19A56; paper #f7f4ef; ink #1a1a1a).
- Keep `assertWechatSafe` green for all SVG; add unit tests for new decorators; keep existing suites green.

## 10. VERIFY
- emit-flagship-artifacts test regenerates 3 HTML → render each at 393px → read → critique vs premium bar.
- assertWechatSafe + svg-modules tests + export tests + vue-tsc + eslint.
- Real WeChat: re-paste into PC editor (Playwright) + regenerate preview URL render at 375px.
