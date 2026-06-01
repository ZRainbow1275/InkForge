# Research: Premium WeChat 公众号 Title / Cover / Kicker Card Pattern Catalog

- **Query**: Premium WeChat 公众号 editorial TITLE / opening cards & kicker labels — designed H1 blocks (solid color blocks, label chip, rule, reading-meta row) using inline styles that survive WeChat paste. Enhance InkForge svg-modules.
- **Scope**: mixed (external design knowledge + verified WeChat-survival facts from prior internal research)
- **Date**: 2026-06-02

---

## Why this matters — the core gap (verified)

Prior teardown of a real premium account article (`赛博禅心`, mp.weixin.qq.com/s/b6ONEqMjKfOTl-YrZzj0cg) proved the operating model of top accounts:

> The whole article had **ONE** inline SVG (the emotional hero). **Every** other "designed" moment — kicker label, call-out panels, pull-quote, section breaks, key-sentence highlight — was **plain HTML `<section>`/`<p>` with inline `background-color` / `border-left` / `border-radius` / `padding`**. No SVG decoration at all.
> — `.trellis/tasks/05-26-render-wechat-fidelity-test/research/mhtml-reference-svg-patterns.md` §7

InkForge's current 26 svg-modules do the **opposite**: each renders a fixed 1080-wide `<svg>` viewBox with hard-wrapped `<text>` (does not reflow, text is non-selectable, fixed font sizes). They have NO inline-styled HTML block-container modules. That is the gap this catalog fills.

**Decision rule for which technique to use:**
- A **title / kicker / meta-row / section-header / callout / key-sentence / footer card** = inline-styled HTML `<section>`/`<p>` (live reflowing text, selectable, scales with reader font setting). ← THIS catalog.
- A **geometric signature / decorative diamond / interactive hero** = inline SVG (existing modules). Keep as-is.

---

## WeChat-survival facts these recipes rely on (verified)

From `.trellis/tasks/05-14-wechat-rendering-rules-research/research/wechat-css-svg-rules.md` and the MHTML teardown (real published article markup):

**KEPT after paste/publish (use freely, inline only):**
- `background` / `background-color` (solid colors, rgba)
- `border`, `border-left`, `border-top`, `border-bottom`
- `border-radius` (incl. asymmetric `0 6px 6px 0`)
- `padding`, `margin`
- `color`, `font-size`, `font-weight`, `font-family`, `font-style`
- `line-height`, `letter-spacing`, `text-align`, `word-break`
- `display:inline-block`, `box-shadow`, `opacity`
- `<section>`, `<p>`, `<span>` containers (NOT `<div>` — WeChat rewrites it)

**STRIPPED / unreliable (never use):**
- `class`, `id`, `<style>` blocks, external CSS, pseudo-classes
- `var(--…)`, `calc()`, `clamp()`, media queries, `@keyframes`
- CSS `transform:`, `transition:`, `animation:`, `filter:`
- linear/radial gradients as the ONLY carrier (community-risky; never load-bearing)
- `position: fixed/sticky/absolute`, flex/grid as primary layout
- emoji-as-icon (banned by brand) — icons MUST be inline `<svg><path>` only

**Real markup proof (from the live `赛博禅心` article, verbatim):**
```html
<!-- kicker label (their "STORY" eyebrow) -->
<section style="max-width:640px;margin:0 auto;font-family:JetBrains Mono;
  font-size:12px;color:#cf4436;letter-spacing:2px;">STORY</section>

<!-- callout panel -->
<section style="background:rgba(207,68,54,0.06);border-radius:8px;
  padding:16px 20px;margin:0 0 14px;">
  <p style="font-size:15px;color:#cf4436;line-height:1.9;margin:0;
    text-align:center;word-break:break-all;">…</p>
</section>

<!-- pull-quote -->
<section style="background:rgba(255,255,255,0.12);border-left:3px solid #cf4436;
  padding:16px 20px;margin:0 0 14px;border-radius:0 6px 6px 0;">
  <p style="font-size:14px;color:#4a4a45;line-height:1.8;margin:0;">…</p>
</section>

<!-- hairline divider -->
<section style="border-top:1px solid rgba(120,120,112,0.18);height:0;"></section>

<!-- inline key-sentence (whole paragraph red+bold, no box) -->
<p style="font-size:15px;color:#cf4436;font-weight:700;line-height:1.9;
  margin:0 0 14px;word-break:break-all;">…</p>
```
Every value above is an inline style on `<section>`/`<p>`. This is the literal vocabulary premium accounts use.

---

## Brand color tokens (LOCKED — use these exact values)

| Token | Hex | Tint (solid lightened, for block bg) |
|---|---|---|
| tempera (primary green) | `#3B7A6B` | `rgba(59,122,107,0.08)` |
| kiln (ember red — ≤2/screen) | `#D95B3F` | `rgba(217,91,63,0.08)` |
| amber | `#C19A56` | `rgba(193,154,86,0.10)` |
| warm paper | `#f7f4ef` | (already a surface) |
| ink | `#1a1a1a` | — |
| muted ink | `rgba(26,26,26,0.55)` | — |
| hairline | `rgba(26,26,26,0.12)` | — |

Note: tints are written as solid `rgba()` over white, NOT gradients. `onAccent` text = `#ffffff` on tempera/kiln, `#1a1a1a` on amber/paper.

---

# THE PATTERN CATALOG

Each pattern: **name · look · WeChat-safe recipe (brand-color markup) · when to apply**.
All recipes are inline-styled HTML — they reflow, are selectable, and survive paste. NEW modules unless noted as ENHANCE.

---

## Pattern 1 — Kicker / Eyebrow Label Chip (栏目标签)

**ADD** new module family `title-kicker`. The single highest-leverage, lowest-risk pattern.

**Look:** A small (11–12px) uppercase, wide-tracked label sitting above the H1. Two tasteful variants: (a) **bare tracked text** in tempera (most restrained — what 单读/三联-tier use), (b) **solid filled chip** — small reversed-out block (kiln/tempera bg, white text).

**Recipe (a) — bare tracked label (default, quietest):**
```html
<p style="margin:0 0 12px;font-size:12px;font-weight:600;
  letter-spacing:3px;color:#3B7A6B;line-height:1;
  font-family:-apple-system,'PingFang SC',sans-serif;">墨 · 专栏</p>
```

**Recipe (b) — solid filled chip (slightly louder, for feature pieces):**
```html
<p style="margin:0 0 14px;line-height:1;">
  <span style="display:inline-block;background-color:#3B7A6B;color:#ffffff;
    font-size:12px;font-weight:600;letter-spacing:2px;
    padding:5px 12px;border-radius:3px;
    font-family:-apple-system,'PingFang SC',sans-serif;">深度</span>
</p>
```

**When:** Above every designed H1 / cover. Variant (a) is the default (counts toward 0 ember). Variant (b) only when the kicker carries real taxonomy weight (栏目名 / 专题). Kiln-filled chip counts as 1 of the ≤2 ember uses per screen — prefer tempera.

---

## Pattern 2 — Color-Block Title Banner (实色标题块 H1)

**ADD** module `title-block` (HTML sibling to the existing SVG `header-ribbon` — this one keeps live reflowing text).

**Look:** A full-width solid-color `<section>` with the headline reversed out in white, generous padding, optional kicker inside. The signature "this is a designed feature" move. Restraint = ONE solid block, no gradient, no shadow stack.

**Recipe — tempera solid banner:**
```html
<section style="background-color:#3B7A6B;border-radius:6px;
  padding:28px 24px;margin:0 0 24px;">
  <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:3px;
    color:rgba(255,255,255,0.75);line-height:1;">墨 · 专栏</p>
  <h1 style="margin:0;font-size:26px;font-weight:700;line-height:1.4;
    color:#ffffff;letter-spacing:1px;
    font-family:-apple-system,'PingFang SC','Source Han Sans',sans-serif;">
    标题在此一行或两行</h1>
</section>
```

**Quiet-press variant — warm-paper block + ink title + thin tempera rule** (less assertive, more 单读-like):
```html
<section style="background-color:#f7f4ef;border-radius:6px;
  padding:28px 24px;margin:0 0 24px;">
  <p style="margin:0 0 10px;font-size:12px;font-weight:600;letter-spacing:3px;
    color:#3B7A6B;line-height:1;">墨 · 专栏</p>
  <h1 style="margin:0 0 14px;font-size:26px;font-weight:700;line-height:1.4;
    color:#1a1a1a;letter-spacing:1px;">标题在此</h1>
  <p style="margin:0;border-top:2px solid #3B7A6B;width:48px;height:0;
    font-size:0;line-height:0;">&nbsp;</p>
</section>
```

**When:** Top of feature articles where a cover SVG is NOT used, or as a lighter alternative to a full SVG cover. Solid tempera = confident; warm-paper = restrained. Use ONE accent. Never both a solid title block and a heavy SVG cover in the same article.

---

## Pattern 3 — Hairline-Rule Title Lockup (细线标题锁版)

**ADD** module `title-rule`. The most "editorial / quiet press" title — no fill at all.

**Look:** Kicker → big ink headline → a short thin accent rule (the "刊印" hairline). Pure typographic hierarchy, maximum whitespace. This is the `单读/三联`-tier default.

**Recipe:**
```html
<section style="margin:0 0 28px;padding:0;">
  <p style="margin:0 0 14px;font-size:12px;font-weight:600;letter-spacing:3px;
    color:#3B7A6B;line-height:1;">READING · 阅读</p>
  <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;line-height:1.45;
    color:#1a1a1a;letter-spacing:1px;
    font-family:-apple-system,'PingFang SC','Source Han Serif SC',serif;">
    一个克制而有力的标题</h1>
  <section style="border-top:2px solid #3B7A6B;width:56px;height:0;
    margin:0;font-size:0;line-height:0;">&nbsp;</section>
</section>
```
Trick: the short rule is a `<section>` with `border-top` + fixed `width` + `height:0` + `font-size:0` (the `&nbsp;` keeps WeChat from collapsing an empty node). This is exactly how the reference article drew its full-width hairlines.

**When:** Default title for literary / essay / long-form content. The serif font-family on the H1 signals "literary"; swap to sans for design/tech pieces.

---

## Pattern 4 — Reading-Meta Row (作者 · 字数 · 时长 · 日期)

**ADD** module `title-meta`. Sits directly under the title lockup.

**Look:** A single quiet row of muted-ink metadata, items separated by a thin middot or a 1px vertical hairline. Small (12–13px), wide-ish tracking, never bold. The "刊物版权页" feel.

**Recipe — middot separated (simplest, always survives):**
```html
<p style="margin:0 0 24px;font-size:13px;color:rgba(26,26,26,0.55);
  letter-spacing:1px;line-height:1.6;
  font-family:-apple-system,'PingFang SC',sans-serif;">
  墨问 <span style="color:rgba(26,26,26,0.25);">·</span>
  2&nbsp;800&nbsp;字 <span style="color:rgba(26,26,26,0.25);">·</span>
  约&nbsp;7&nbsp;分钟 <span style="color:rgba(26,26,26,0.25);">·</span>
  2026.06.02</p>
```

**Recipe — with a tiny inline accent dot before author (no emoji, pure span):**
```html
<p style="margin:0 0 24px;font-size:13px;color:rgba(26,26,26,0.55);letter-spacing:1px;">
  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;
    background-color:#C19A56;margin-right:8px;vertical-align:middle;"></span>墨问
  <span style="color:rgba(26,26,26,0.25);"> · </span>约 7 分钟阅读</p>
```
The accent dot is a 6×6 `inline-block` span with `border-radius:50%` + solid amber — a WeChat-safe icon substitute (no emoji, no SVG needed).

**When:** Under every title lockup that has author/length data. Keep it ONE line; let it wrap gracefully on mobile. Use amber (not ember) for the dot to preserve the ember budget.

---

## Pattern 5 — Section-Header Bar (章节标题条 / H2 替代)

**ADD** module `sec-header` (HTML counterpart to existing SVG `header-vrule` / `header-ribbon`, but reflowing + selectable). Two variants.

**Look (a) — left accent bar:** an H2 with a solid `border-left` accent bar and a tinted background panel. The single most common premium section-break device.
**Look (b) — reversed solid bar:** short solid-color block with white heading text (louder; for major part dividers).

**Recipe (a) — left-bar tinted header (default):**
```html
<section style="background-color:rgba(59,122,107,0.08);
  border-left:4px solid #3B7A6B;border-radius:0 6px 6px 0;
  padding:12px 16px;margin:28px 0 18px;">
  <h2 style="margin:0;font-size:19px;font-weight:700;line-height:1.4;
    color:#1a1a1a;letter-spacing:1px;
    font-family:-apple-system,'PingFang SC',sans-serif;">这一节讲什么</h2>
</section>
```

**Recipe (b) — reversed solid bar (major divisions only):**
```html
<section style="display:inline-block;background-color:#3B7A6B;
  border-radius:4px;padding:8px 16px;margin:28px 0 18px;">
  <h2 style="margin:0;font-size:18px;font-weight:700;line-height:1.4;
    color:#ffffff;letter-spacing:2px;">第一章 · 起</h2>
</section>
```
(b) uses `display:inline-block` so the block hugs the text width instead of full-bleed — looks designed, not banner-y.

**When:** (a) for every H2 in a structured article. (b) only for top-level part dividers (第一章/第二章). Combine with a numbered amber chip (Pattern 6) for a "刊物目录" feel. Keep ember out of these — use tempera or amber.

---

## Pattern 6 — Numbered Section Chip + Title (编号章节)

**ADD** module `sec-numbered`. Inline-block number badge beside the heading — HTML twin of SVG `header-badge-num`, but live text.

**Look:** A small solid square/circle carrying the section number, then the heading text. Quiet-press version uses a thin-outlined square (not filled) to feel like a printed index.

**Recipe — outlined amber number + heading:**
```html
<section style="margin:28px 0 18px;line-height:1.4;">
  <span style="display:inline-block;min-width:30px;height:30px;line-height:30px;
    text-align:center;border:1.5px solid #C19A56;border-radius:4px;
    color:#C19A56;font-size:15px;font-weight:700;margin-right:12px;
    vertical-align:middle;font-family:'Georgia',serif;">01</span>
  <span style="font-size:19px;font-weight:700;color:#1a1a1a;
    letter-spacing:1px;vertical-align:middle;">章节标题</span>
</section>
```

**Recipe — filled tempera circle number (slightly louder):**
```html
<section style="margin:28px 0 18px;line-height:1.4;">
  <span style="display:inline-block;width:30px;height:30px;line-height:30px;
    text-align:center;background-color:#3B7A6B;border-radius:50%;
    color:#ffffff;font-size:14px;font-weight:700;margin-right:12px;
    vertical-align:middle;">1</span>
  <span style="font-size:19px;font-weight:700;color:#1a1a1a;vertical-align:middle;">章节标题</span>
</section>
```

**When:** Listicles, multi-part essays, "三件事/五个理由" structures. Outlined amber = literary index feel; filled tempera = clearer wayfinding. Pick one per article for consistency.

---

## Pattern 7 — Lead-In / Opening Card (导语卡)

**ENHANCE-adjacent** new module `lead-card` (HTML twin of SVG `cover-quote`, but reflowing). The first paragraph framed as an editorial standfirst.

**Look:** A warm-paper or tinted panel holding the opening paragraph at slightly larger size, left tempera bar OR a small corner mark, often italic or serif. Signals "this is the 导语, read me first."

**Recipe — warm-paper standfirst with left bar:**
```html
<section style="background-color:#f7f4ef;border-left:4px solid #C19A56;
  border-radius:0 6px 6px 0;padding:18px 22px;margin:0 0 28px;">
  <p style="margin:0;font-size:16px;line-height:1.9;color:#1a1a1a;
    font-family:-apple-system,'PingFang SC','Source Han Serif SC',serif;">
    这是导语段落。比正文略大、行距更松，用一句话立住全文的调子与问题。</p>
</section>
```

**When:** Directly after the title block, before the body. ONE per article. Amber bar keeps it warm and distinct from green section-headers and red key-sentences (color-codes the hierarchy: amber=导语/leadin, tempera=结构, kiln=高潮).

---

## Pattern 8 — Footer Signature Card (落款 / 关注卡)

**ADD** module `footer-card` (HTML twin of existing SVG endmark family, but reflowing + holds CTA text).

**Look:** A quiet closing block — thin top rule, author line, one-line tagline, optionally a small tempera-outlined "关注" pill. The "刊末版权" feel, not a gaudy QR-spam footer.

**Recipe:**
```html
<section style="margin:36px 0 8px;padding:20px 0 0;
  border-top:1px solid rgba(26,26,26,0.12);text-align:center;">
  <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#1a1a1a;
    letter-spacing:1px;">墨铸 · 成为作者吧</p>
  <p style="margin:0 0 14px;font-size:13px;color:rgba(26,26,26,0.55);
    letter-spacing:1px;">文字 / 墨问　编辑 / 砚白</p>
  <p style="margin:0;line-height:1;">
    <span style="display:inline-block;border:1.5px solid #3B7A6B;color:#3B7A6B;
      font-size:13px;font-weight:600;letter-spacing:2px;padding:6px 18px;
      border-radius:18px;">关注 · 墨铸</span></p>
</section>
```

**When:** End of every article (replaces or accompanies the SVG endmark). The outlined pill is a print-style CTA, not a clickable button (WeChat strips interactivity anyway — it's purely visual affordance). Use tempera outline, no fill, to stay quiet.

---

## Pattern 9 — Key-Sentence Highlight (金句 / 高潮句)

**ADD** module `key-line`. Two forms, both verified in the reference article.

**Look (a):** an entire paragraph rendered in kiln-red + bold, NO box (the reference's "punchline" device, used 3× max per article).
**Look (b):** a centered tinted callout panel for the single biggest line.

**Recipe (a) — bare red-bold paragraph:**
```html
<p style="margin:0 0 18px;font-size:16px;font-weight:700;line-height:1.9;
  color:#D95B3F;letter-spacing:0.5px;word-break:break-all;">
  这一句是这一节的高潮，整段红加粗，不加框。</p>
```

**Recipe (b) — centered kiln-tint callout (≤1 per article):**
```html
<section style="background-color:rgba(217,91,63,0.08);border-radius:8px;
  padding:18px 22px;margin:0 0 22px;">
  <p style="margin:0;font-size:16px;font-weight:600;line-height:1.9;
    color:#D95B3F;text-align:center;word-break:break-all;
    letter-spacing:0.5px;">全文最重的一句话，居中、淡红底。</p>
</section>
```

**When:** The emotional peak of a section. **This is where the ember budget goes** — (a) up to a few times, (b) at most once per article. Everything else stays tempera/amber so the red genuinely punches when it lands.

---

## Cross-cutting implementation notes for InkForge

1. **New HTML-block modules, not SVG.** These belong in a new `text-cards.ts` (or extend `headers.ts`/`covers.ts` with HTML-emitting variants). They emit `<section>`/`<p>` with inline style — NOT `svgSection()`. Do NOT route them through the SVG `<text>` hard-wrap path; the whole point is live reflowing text.
2. **`wechat-safe.ts` validator gap:** the current `RULES` array assumes SVG output (`no-fixed-svg-width`, `no-id-referenced`, etc.) and bans `<div>`. These HTML-block modules are already compliant (they use `<section>`, inline styles, no class/id/style-block/transform), but they have no SVG to validate. ENHANCE `wechat-safe.ts` with a parallel HTML-block check (assert: only `<section>/<p>/<span>/<h1-6>`; no `class=`/`id=`/`<style>`; no `transform:`/`transition:`/`animation:`/`var(`/`calc(` in inline style) rather than reusing SVG rules wholesale. Do NOT delete existing SVG rules.
3. **Color-coded hierarchy (quiet-press discipline):** amber = 导语/meta accents, tempera = structure (kicker/section/footer), kiln = key-sentence peak ONLY. Enforce the existing "ember ≤2/screen" rule by counting kiln uses (Pattern 1b chip, Pattern 9) — keep tempera the workhorse.
4. **`onAccent` reuse:** `theme.ts` already derives `onAccent` (white vs ink by WCAG luminance). Reuse it for reversed-out text in Patterns 1b/2/5b instead of hardcoding `#ffffff`.
5. **Empty-node collapse trap:** WeChat collapses truly empty `<section>`/`<p>`. For pure-rule elements (Pattern 3 hairline, Pattern 2 rule) include `font-size:0;line-height:0;` + a `&nbsp;`, exactly as the reference article does (`<span leaf=""><br></span>`).
6. **`word-break:break-all`** on any panel holding long unbroken strings (URLs, English) — the reference uses it on every callout/quote `<p>`.
7. **Injection seam:** `inject.ts` `composeSvgDecorate` already replaces `<h1>`/`<h2>`/`<blockquote>` via regex. These HTML-block modules slot into the same `headings`/`cover`/`blockquote` plan keys with zero pipeline change — just emit HTML strings instead of SVG strings. The `data-ink-svg` sentinel idempotency still works (rename to `data-ink-card` for clarity if desired, but keep the SVG sentinel intact).

---

## Caveats / Not Found

- **No live web-search tool** was available in this environment (no WebSearch/exa). External grounding therefore comes from a **verified real-account teardown** (`赛博禅心` published article MHTML, dissected in `mhtml-reference-svg-patterns.md`) plus the prior WeChat CSS/SVG capability research — both are primary-source evidence of what actually survives WeChat paste. The CSS-property survival list is high-confidence (drawn from live published markup + doocs/md community implementation). Specific px/letter-spacing values in the recipes are **design proposals** in the quiet-press idiom, not measurements from named accounts.
- **Could not independently verify** the exact inline-CSS of 单读/新世相/三联/GQ实验室 article-by-article (would require fetching live mp.weixin.qq.com pages). The techniques are confirmed against the `赛博禅心` reference and the documented WeChat capability boundary; treat named-account attributions as illustrative of the genre, not exact reproductions.
- **WeChat editor re-paste behavior** can still mutate `<section>` nesting and inject `<span leaf="">`/`visibility:visible` on its own — recipes avoid relying on structure WeChat would rewrite (no flex/grid, no nesting-dependent layout). Final validation must be a real公众号 preview screenshot, per prior research's standing rule.
- **Gradient fallback:** none of these recipes use gradients (per hard constraint). If a future variant wants a gradient sheen, it MUST keep a solid-color fallback as the load-bearing layer.
