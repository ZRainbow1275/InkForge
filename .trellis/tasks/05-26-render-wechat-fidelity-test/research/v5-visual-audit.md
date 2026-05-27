# v5 Visual Audit — `正文1.0-wechat-v5.html` @ 375px

**Audit date:** 2026-05-27
**Source file:** `D:/Desktop/Inkforge/experiment/正文1.0-wechat-v5.html` (298 KB)
**Viewport:** 375 x 812 (iPhone-class)
**DPR:** 1.0
**Total document height:** 53,077 px (very long-form)
**Inventory:** 1 badge, 1 seal, 1 TOC master, 6 TOC chapters, 6 hanging numerals, 6 pull-quotes, 1 endmark, 0 image frames (user note: image frame absent)

**Methodology:** Playwright headless Chromium, file:// URL, evaluated DOM metrics via `getBoundingClientRect`, `getBBox`, and `Range.getClientRects`. Screenshots saved to `experiment/audit-v5/audit-v5/` (timestamp suffixed, latest run 2026-05-27T14:20Z+).

---

## Summary verdict

The user's complaints are **fully validated by measurement**. Three of four named problems are real and severe:

| Complaint | Status | Severity |
|---|---|---|
| TOC chapter cards empty after header | **CONFIRMED — 75% of card height is invisible animation payload** | CRITICAL |
| Pull-quote SVGs mostly empty | **CONFIRMED — body text occupies ~4% of card area** | CRITICAL |
| Hanging "01." formatting | Single-line OK, but visual hierarchy weak (19.6px numeral vs 14px title = 1.4x ratio, no anchor) | MEDIUM |
| Sizes don't match hierarchy | **CONFIRMED — H1 24px / H2 22px = 1.09x ratio, numerals smaller than H2** | HIGH |

Root cause for the two CRITICAL items is identical: **viewBox tall, content short**. The SVGs declare `viewBox="0 0 1080 760"` (or similar) but only paint ink in the top ~190 viewBox units. The remaining 75% of the SVG box renders blank because either (a) the content is inside an `<g opacity="0">` waiting for a `click` animation that never fires in WeChat / static export, or (b) the `foreignObject` text shrinks to 31% of declared CSS size after the SVG `preserveAspectRatio` scaling.

---

## 1. Reading badge

- **Selector:** `div[data-ink-badge="1"]`
- **Screenshot:** `experiment/audit-v5/audit-v5/01-badge-2026-05-27T14-20-04-323Z.png` (selector-screenshot returned full-page; useful crop visible in `00-hero-region-2026-05-27T14-24-01-632Z.png`)
- **Mobile dimensions:** 220 x 28 px (SVG is fixed `width="220"`, NOT 100%)
- **viewBox:** `0 0 220 28`
- **Text content:** `101 min read · 30,106 字 · 6 chapters`
- **Density rating:** POOR
- **Issues found:**
  - **Text overflow:** SVG `getBBox` reports text right-edge at x=243 in viewBox space — **23 px beyond viewBox width (220)**, i.e. 10.6% overflow. Visible viewport shows truncation: "6 chap" cut off.
  - SVG width is fixed `220` not `100%`, so it does not scale up with parent container. Wasted right gutter ~115 px next to it (parent container is 335 wide).
  - Icon (clock) at cx=18 r=5 is fine, but no visual relationship to the cropped text.
- **Specific fix needed:**
  - Either widen viewBox to 320+ (and use `width="100%"`), or shorten text to "101 min · 30,106 字 · 6 ch.".
  - Switch SVG to `width="100%"` and increase viewBox width to 360 so the text fully fits and the pill stretches to match parent column.

---

## 2. Seal "锻"

- **Selector:** `div[data-ink-seal="1"]`
- **Screenshot:** visible in `00-hero-region-2026-05-27T14-24-01-632Z.png` (top-right of hero)
- **Mobile dimensions:** 52 x 72 px
- **viewBox:** `0 0 52 72`
- **Text positioning:** "锻" at x=26 y=36 font-size=28 — centered, rendered glyph box (35 x 35) at (312, 318) — correct.
- **Density rating:** GOOD
- **Issues found:** None visual. Off-balance placement (right edge, near title) reads as a sigil/stamp — works as intended.
- **Specific fix needed:** none.

---

## 3. TOC master header

- **Selector:** `section[data-ink-toc="1"]`
- **Screenshot:** see top of `00-toc-region-strip-2026-05-27T14-23-08-582Z.png`
- **Mobile dimensions:** 335 x 68 px
- **viewBox:** `0 0 1080 220`
- **Density rating:** OKAY (header card is functional, hint "点击每章可展开子目录" reads as a UI affordance that the chapter cards do NOT fulfill — see TOC chapter audit)
- **Text inventory inside SVG:**
  - "CONTENTS" 36px (eyebrow) at vb(80,90)
  - "目　录" 56px (title) at vb(80,155) — actually rendered 25px tall (scale 0.31)
  - "6 CHAPTERS" 32px at vb(990,155) — right-aligned, accent color
  - "点击每章可展开子目录" 26px (hint text) at vb(80,215) — renders at ~8px on mobile, near-illegible
- **Issues found:**
  - Hint subtitle "点击每章可展开子目录" renders at ~8px — too small to read; promises an interaction the cards do not deliver in static WeChat export.
  - Inner padding fine, but the divider line at y=190 is 1px stroke scaled to 0.31px (sub-pixel) — invisible on standard DPR=1.
- **Specific fix needed:**
  - Bump hint text font-size to 36+ in viewBox units (~11px rendered).
  - Make divider stroke-width=2 minimum so it survives scale.
  - Reconsider the "可展开" promise — see TOC chapter section.

---

## 4. TOC chapter cards 01–06 (CRITICAL ISSUE)

Each chapter is a separate `<section data-ink-toc-chapter="NN">` containing one SVG.

| # | viewBox | rendered | header static h | invisible h (sections payload) | empty ratio |
|---|---|---|---|---|---|
| 01 | 1080 x 760 | 335 x 236 | ~59 px | ~177 px | **75%** |
| 02 | 1080 x 1070 | 335 x 332 | ~59 px | ~273 px | **82%** |
| 03 | 1080 x 570 | 335 x 177 | ~59 px | ~118 px | **67%** |
| 04 | 1080 x 910 | 335 x 282 | ~59 px | ~223 px | **79%** |
| 05 | 1080 x 1110 | 335 x 344 | ~59 px | ~285 px | **83%** |
| 06 | 1080 x 480 | 335 x 149 | ~59 px | ~90 px | **60%** |

### Root cause

Each chapter SVG contains **two layers**:

```
<svg viewBox="0 0 1080 760">
  <g>
    <!-- Header layer (always visible): vb y 0..190 -->
    <rect ... fill="#EDE7DB" opacity="0.3"/>  <!-- full-bleed bg -->
    <text x=70 y=120 font-size=100>01</text>
    <text x=250 y=100 font-size=50>架构蓝图</text>
    <text x=250 y=155 font-size=30>数字人民币的设计哲学与战略意图</text>
    <text x=990 y=178 font-size=28>4 SECTIONS ▼</text>
    <line ... y=190 />  <!-- divider -->

    <!-- Section list layer (HIDDEN by opacity=0): vb y 240..760 -->
    <g opacity="0" transform="translate(60 240)">
      <animate begin="click" .../>          <!-- never fires in WeChat -->
      <animateTransform begin="click" .../>  <!-- WeChat strips animations -->
      <text x=135 y=28 font-size=34>1.1</text>
      <text x=225 y=28 font-size=38>十年磨一剑：从"防御备份"...</text>
      ...
    </g>
  </g>
</svg>
```

The hidden `<g opacity="0">` is positioned in viewBox space (translate 60 240, content extends to y=440+), which forces the SVG's viewBox height to 760. WeChat strips `<animate>` elements and may strip CSS interactivity, so `begin="click"` never triggers. The result: a card whose declared height accommodates content that never renders.

### Per-card detail

#### 4.1 Chapter 01 "架构蓝图"
- **Screenshot:** see `00-toc-region-strip` top card and `00-hero-region`
- **Header content (top 25%):** "01" 100/vb (=31px rendered), "架构蓝图" 50/vb (=15px), subtitle "数字人民币的设计哲学与战略意图" 30/vb (=9px), "4 SECTIONS ▼" 28/vb (=9px) right-aligned
- **Hidden payload (bottom 75%):** 4 section labels (1.1, 1.2, 1.3, 1.4) with sub-points for 1.2
- **Density rating:** POOR — 177 px of pure white space on a 236 px card
- **Issues:**
  - Largest visible feature is the **emptiness** itself
  - Subtitle 9px is near unreadable
  - "4 SECTIONS ▼" is a UI affordance promising interaction that doesn't work
  - The left red vertical bar (6x760 viewBox) stretches the full empty height, drawing attention TO the void
- **Specific fix:** Either render the section list statically (no opacity=0), or compress viewBox to header-only (1080 x 220) and let the static export ship a linkable text-list below the SVG.

#### 4.2 Chapter 02 "从试点到实践" — 82% empty, same pattern
#### 4.3 Chapter 03 "全球范式革命" — 67% empty (3 sections, shorter)
#### 4.4 Chapter 04 "沪港双城" — 79% empty
#### 4.5 Chapter 05 "模式之争" — **83% empty** (worst offender, 4 sections + 12 sub-points hidden)
#### 4.6 Chapter 06 "结论与战略展望" — 60% empty (only 2 sections)

### Specific fix needed (applies to all 6)

**Option A — Static expansion (recommended):**
Remove `opacity="0"` and `<animate>` elements. Render sections always-visible. Viewport will simply be taller per card, but every pixel is informative.

**Option B — Header-only collapsed:**
Strip the section payload from SVG. Re-emit viewBox as `0 0 1080 220`. Provide section list as plain HTML `<ul>` below the SVG if needed.

**Option C — Native `<details>/<summary>`:**
Wrap entire card in `<details><summary>...header SVG...</summary><ul>...sections...</ul></details>`. Works in WeChat (browser-native collapsible). Drop the SVG animation layer entirely.

Either way: the current "render but invisible" pattern is the worst of all worlds — WeChat doesn't get interactivity, and the empty boxes look broken.

---

## 5. Hanging numerals "01."–"06."

- **Selector:** `table[data-ink-num="N"]`
- **Screenshots:** `05-hangingnum-01-context-2026-05-27T14-24-30-206Z.png` (with chapter title visible)
- **Implementation:** `<table>` with 2 cells, first cell holds the numeral, second cell holds the chapter title

| # | Numeral | Title (truncated) | Number cell w | Number cell line count | Table h |
|---|---|---|---|---|---|
| 1 | "01." | 架构蓝图——数字人民币的设计哲学与战略意图 | 44px | **1** | 117px (4-line title) |
| 2 | "02." | 从试点到实践：解析数字人民币的国内推行 | 44px | **1** | 87px |
| 3 | "03." | 全球范式革命——重构跨境金融基础设施 | 44px | **1** | 87px |
| 4 | "04." | 沪港双城——一国两制下的战略二元论 | 44px | **1** | 87px |
| 5 | "05." | 模式之争——中美数字货币的战略分岔 | 44px | **1** | 87px |
| 6 | "06." | 结论与战略展望 | 44px | **1** | 58px |

- **Numeral font-size:** 19.6px (computed)
- **Title font-size:** 14px (computed)
- **Visual hierarchy ratio:** 19.6 / 14 = **1.4x** — too weak for a hanging-numeral design
- **Density rating:** OKAY (geometry works, hierarchy weak)
- **Issues found:**
  - **GOOD news:** "01." no longer wraps to two lines (the earlier "01" + "." regression is fixed).
  - **BUT** the numeral is visually subordinate to surrounding H2 chapter heads (22px). A hanging numeral should be 1.5-2.5x larger than the headline, not 0.9x.
  - 19.6px numeral does not visually "anchor" the section — it reads as inline number, not a typographic flourish.
  - Numbers are sans-default (no serif font specified for the numeral cell), so they don't echo the serif aesthetic of the rest of the design.
- **Specific fix needed:**
  - Bump numeral font-size to **48-60px** (with line-height tight) for proper hanging effect.
  - Apply `font-family: 'EB Garamond', Georgia, serif; font-weight: 300;` to match the badge/seal/quote serif treatment.
  - Bump number cell `width` to ~68px to accommodate the larger glyph without breaking the 92px text indent.
  - Optional: add color `#D95B3F` (brand accent) to make the numeral a chapter marker, not just a number.

---

## 6. Pull-quote cards `[data-ink-pq]` (CRITICAL ISSUE)

- **All 6 cards:** identical viewBox `0 0 1080 580`, rendered 335 x 180 px (aspect 1.86:1)
- **Screenshot:** `06-pq-01-context-2026-05-27T14-23-42-960Z.png` (with surrounding paragraphs)
- **Density rating:** **POOR**
- **Structure (all 6 are identical pattern, only text differs):**

```
<svg viewBox="0 0 1080 580">
  <rect x=0 y=0 w=410 h=580 fill="#252933" opacity=0.04 />  <!-- LEFT GRAY PANEL -->
  <line x1=410 y1=30 x2=410 y2=550 stroke="#DED7CA" opacity=0.5 />  <!-- vertical divider -->
  <text x=60 y=120 font-size=48 letter-spacing=12 opacity=0.7>CHAPTER 01</text>
  <text x=40 y=280 font-size=200 fill="#D95B3F" opacity=0.06>「</text>  <!-- ghost quote, almost invisible -->
  <foreignObject x=60 y=200 w=960 h=340>
    <p style="font-size:54px;font-style:italic">十年磨一剑。</p>
  </foreignObject>
</svg>
```

### Root cause

The `<foreignObject>` declares `width=960 height=340` in viewBox units. The `<p>` inside declares `font-size:54px` in CSS px. **BUT** the SVG renders at width=335 (scaled to 31% of viewBox), so the foreignObject (960 vb units wide) renders as 298 CSS-px wide AND the `54px` font scales to **~16.8px rendered glyph height** (54 * 335/1080).

### Per-quote text content & coverage

| # | Quote text | Chars | Rendered text h | Card h | Text vs card area |
|---|---|---|---|---|---|
| 1 | 十年磨一剑。 | 6 | 25px | 180px | **~4%** |
| 2 | 试点不是答案，是问题的具体化。 | 15 | 25px | 180px | ~4% |
| 3 | 重构跨境支付的未来。 | 10 | 25px | 180px | ~4% |
| 4 | 用一国两制建设战略纵深。 | 12 | 25px | 180px | ~4% |
| 5 | 模式之争的本质，是选择何种风险的战略决断。 | 21 | **50px** (2 lines) | 180px | ~7% |
| 6 | 共同构筑21世纪最核心的国家竞争力。 | 20 | 50px (2 lines) | 180px | ~7% |

### Issues found

- **Text occupies 4-7% of card area.** The other 93-96% is decorative background (gray block left, white right).
- "CHAPTER NN" header at 48vb (=15px rendered) is more prominent than the actual quote (italic, ~17px on the longest lines, ~17px on short ones with sparse coverage).
- The "「" guillemet at vb(40, 280) font-size=200 opacity=0.06 is almost invisible (opacity 6%) — intended as a ghost typographic flourish but visually it's nothing.
- The left gray panel is 410/1080 (=38%) of card width — declares a visual zone but contains nothing meaningful except the small "CHAPTER NN" eyebrow.
- The right portion of the card (62% of width) contains NOTHING — just the implied territory for the quote which renders as one short line at the top.
- The vertical divider line at x=410 vb (=127px rendered) separates two empty zones from each other.
- Bottom 70-90% of card height: completely blank.

### Visual hierarchy inversion

Looking at the pq-01 screenshot:
1. **Most prominent visual element:** the gray background rectangle (largest area)
2. **Next:** "CHAPTER 01" eyebrow (letter-spaced caps, high contrast against gray)
3. **Next:** vertical divider line
4. **Last:** the actual quote "十年磨一剑。" (italic, smaller, fades into the off-white right zone)

The quote — supposedly the centerpiece — is the LEAST visually weighty element.

### Specific fix needed

Two viable approaches:

**Option A — Shrink to content:**
- Change viewBox to `0 0 1080 220` (or compute per-quote based on text length × estimated glyph height).
- Remove the giant ghost "「" or move it to be visible (opacity 0.15+, smaller, properly positioned).
- Remove the vertical divider — there are no two zones to separate.
- Quote text should fill the height: bump `font-size` to 96-120vb units (= 30-37px rendered) and let it span the card.

**Option B — Use the space:**
- Add author attribution / chapter reference / source under the quote
- Add ornamental rule above/below quote (real lines, not invisible ones)
- Make the "「" actually visible at opacity 0.3+ as a decorative element

The current design is the worst-case: an editorial "pull quote" callout where the actual quote is the smallest, weakest element on the card.

---

## 7. Endmark "完"

- **Selector:** `section[data-ink-end="1"]`
- **Screenshot:** `07-endmark-context-2026-05-27T14-24-16-626Z.png`
- **Mobile dimensions:** 200 x 60 px (SVG fixed width, centered in 335 column)
- **viewBox:** `0 0 200 60`
- **Text:** "完" at x=100 y=38 font-size=22 (rendered as 27px tall — looks correct because viewBox aspect matches render)
- **Density rating:** GOOD
- **Issues found:** None significant. Stamp is small, centered, frames the article close.
- **Specific fix needed:** none.

---

## 8. Image frame

- **Selector:** `div[data-ink-img="1"]`
- **Found:** **0 instances** in the document
- **Status:** N/A — element does not exist in v5 output. Either intentional (no image in source markdown) or rendering pipeline doesn't emit it. Not assessable.

---

## Bonus: Document typography hierarchy

| Element | font-size | font-weight | Used for |
|---|---|---|---|
| `[data-ink-h1]` | **24px** | 700 | "中国数字人民币战略全景报告" |
| `h2` | **22px** | 700 | "架构蓝图——数字人民币的设计哲学与战略意图" |
| `h3` | **18px** | 700 | "1.1 十年磨一剑：从…" |
| `[data-ink-subtitle]` | 15.2px | 400 | "——从内部威胁到全球范式革命…" |
| `[data-ink-dc]` (dropcap) | 51.2px | 600 | "2" (start of body) — **works well** |
| Hanging numeral | 19.6px | (default) | "01." / "02." etc |
| Body `<p>` | 14px (effective) | 400 | All prose |

### Hierarchy issues

- **H1 vs H2 = 1.09x ratio:** 24px vs 22px is visually indistinguishable. H1 should be 32-40px on mobile.
- **H2 vs body = 1.57x ratio:** 22px vs 14px is OK but conservative.
- **Hanging numeral 19.6px is SMALLER than H2 22px** — numeral should be biggest "drop-cap-like" element in section.
- **Dropcap 51.2px works** — proves the design language CAN sustain big typography; the rest of the hierarchy under-uses scale.

---

## Recommended fix priority

1. **P0 — TOC chapter cards "75% empty":** strip the `opacity=0` section payload OR compress viewBox to header-only OR convert to native `<details>`. Choose based on whether the static export is the only deliverable (yes for WeChat).
2. **P0 — Pull-quote cards "96% empty":** shrink viewBox height to match content, bump quote font-size to actually fill the card, remove invisible divider/quote-glyph or make them visible.
3. **P1 — Hanging numeral hierarchy:** bump to 48-60px serif italic to act as proper typographic anchor.
4. **P1 — H1 size:** bump to 32-40px to differentiate from H2.
5. **P2 — Badge text overflow:** widen viewBox or shorten label.
6. **P2 — TOC master hint "点击每章可展开子目录":** either grow text or remove the false promise if cards aren't actually clickable.
