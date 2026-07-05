# Layout / Visual Hierarchy Review — 正文1.0-wechat.html

**Verdict: WARNING — CONCERNS (close to FAIL on chapter navigation)**

The report preset renders cleanly for body copy, but the article is built entirely from H3/H4 (no H1/H2), which collapses the preset's strongest visual moves (H1 left-bar + underline accent, H2 numbered badge) and leaves a 100-minute read with only two heading tiers — and those two tiers are too similar.

---

## 1. H3 / H4 differentiation — CONCERNS

H3 (line 41): `color:#1A3A5C; font-size:1.15em; font-weight:600; border-left:3px solid #004080; padding-left:0.7em`. H4 (line 85): `color:#36474F; font-size:0.92em; font-weight:600; text-transform:uppercase; letter-spacing:0.08em`. On paper the two tiers differ, but in practice every H3 AND H4 in this render also wraps its text in `<strong>` with `color:#004080; background:linear-gradient(... rgba(0,64,128,0.15))` — so both end up reading as "deep-blue highlighted bold text," and the 1.15em vs 0.92em delta is the only real signal at a glance. `text-transform:uppercase` is a no-op on CJK, so H4 loses its main intended distinguisher. **Action:** strip the `<strong>` wrapper inside H3/H4 during post-process (the preset already colors the heading) and/or raise H3 to 1.25em + drop weight on H4 to 500. Evidence: `output/正文1.0-wechat.html:41` (H3) vs `:85` (H4).

## 2. Section-of-50 navigation — FAIL

Source uses `### 第一部分…` through `### 第六部分…` as chapter breaks, but **第三部分 and 第四部分 are missing from the source entirely** (grep confirms only 4 hits: lines 41, 139, 330, 408) and the 4 that exist are styled identically to detail H3s like `1.1`, `1.2` — same color, same border-bar, same size. There are zero anchor TOC links, zero distinct chapter-mark glyphs, and at 100 min of read this is the single biggest UX problem. Only the very first H3 gets `margin-top:0` (line 41) — every other H3 (chapter or sub) has `margin-top:1.4em`. **Action:** the author should add the two missing part headings; the renderer should detect "第X部分" pattern in H3 and elevate to chapter style (larger top margin 2.4em, badge prefix, full-width tint background). No action from preset CSS will fix this without that detection — markdown-only structure cannot self-promote.

## 3. Blockquote — NOT EXERCISED

Zero `<blockquote>` in output (grep count: 0). The article uses `**bold**` and a couple of `*emphasis*` runs (2 `<em>` total) for what should arguably be pull-quotes — e.g. the 阶段三 table cell at line 77 has `**应对内外部挑战…**` mid-sentence which an editor would normally promote to a callout. **Action:** none for the renderer; flag to the author that long-form policy reports usually want 2-3 pull-quotes per part for rhythm. Preset's blockquote (`#F5F8FB` bg + 4px `#004080` border) is well-designed but unused here.

## 4. Table — CONCERNS (cosmetic + structural)

Single 3×3 table at line 56. Two issues. **(a) Style collision:** every `<th>` and `<td>` has TWO `style="..."` attributes inline (e.g. line 59) — first from preset CSS inlining via juice, second from `postProcessForWechat` step 9.1 at `wechat.ts:1005-1023`. Browsers honor the first; WeChat's sanitizer is unpredictable. Likely render: `padding:10px 12px; border:1px solid #D8E2EC; background:#F2F5F9; color:#1A3A5C; border-bottom:3px solid #004080`. Fine, but it's a code smell. **(b) Word-break:** cells use `<br>` for line breaks (e.g. `阶段一：内部威胁驱动<br>（约 2014-2018）`), so column widths auto-balance and the 阶段 col is narrow vs the 标志性事件 col which has 4-5 bullets. On 375px no `overflow-x:auto` wrapper visible — risk of horizontal squish or text-wrap chaos. The outer `<section>` with `box-shadow` (line 56) is a nice touch. **Action:** dedupe inline styles in post-process; consider `table-layout:fixed` + percent widths.

## 5. HR / 分割线 — PASS

Single `<hr>` at line 40 renders as `height:3px; linear-gradient(90deg, #004080, #004080 60px, #E6ECF2 60px, #E6ECF2); margin:2em 0` — a 60px solid blue tab on the left fading to a thin grey rail. Gradient survived juice (gradients aren't in WeChat's strip list). Visually subtle and on-brand. As a between-part divider it works, but since it appears only ONCE in the whole 100-min read, it can't do the chapter-break job alone.

## 6. Color saturation — CONCERNS

`#004080` appears 190 times. The strong-text accent `linear-gradient(180deg, transparent 60%, rgba(0,64,128,0.15) 60%)` is applied to **every `<strong>`** in the body — and the author bolds aggressively (visible in line 80, 84, table cells, every heading). On WeChat's `#ffffff` reader bg this reads as "highlighted in light blue" on roughly 1 in 4 lines of body text. Too dense for 100 min of reading. The headings on top of this saturate further. **Action:** consider downgrading the strong-highlight to `rgba(0,64,128,0.08)` or removing the gradient entirely and keeping only the color shift.

## 7. Whitespace rhythm — PASS

Body `<p>` (189 total) is `line-height:1.75; margin-bottom:0.95em; text-align:justify; text-indent:0` (line 80). At 15px base that's ~26px line-height with ~14px gap — slightly tight by long-form policy-report standards (Stratechery uses ~1.8 + 1.2em gap) but defensible for WeChat mobile. Sampled paragraphs 80-84 read fluidly; no cramped blocks observed.

---

## Top 3 actionable fixes

1. **Strip `<strong>` wrappers inside H3/H4 during postProcessForWechat** — the preset already styles the heading; the doubled emphasis collapses the H3 vs H4 distinction and saturates the page. (`wechat.ts` post-process, ~10 lines of regex.)
2. **Detect "第X部分" pattern in headings and promote to chapter style** — add a `decorateReportChapterHeading` injector in `preset-decorations.ts` that gives matching H3s a 2.4em top margin, a numbered badge (01/02/…), and the same `#F2F5F9` background-block treatment H1 gets in the preset. This fixes navigation without requiring source-markdown changes.
3. **Dedupe doubled inline styles on `<th>`/`<td>`** — `wechat.ts:1005-1023` should detect existing `style=` from juice and merge into it instead of appending a second attribute. Affects readability of DOM and reduces WeChat sanitizer ambiguity.
