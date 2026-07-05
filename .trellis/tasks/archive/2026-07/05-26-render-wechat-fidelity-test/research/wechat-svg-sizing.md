# Research: WeChat SVG Element Sizing and Spacing for Pull-Quote Cards

- **Query**: SVG viewBox sizing, font scaling, spacing for decorative SVG elements in WeChat articles
- **Scope**: mixed (internal codebase + external WeChat/135editor patterns)
- **Date**: 2026-05-27

## Current Implementation Analysis

### Files Found

| File Path | Description |
|---|---|
| `inkforge/__fidelity__/render-real-article-v5.fidelity.test.ts` | SVG pull-quote card implementation (lines 232-266) |
| `inkforge/src/services/export/platform-rules/wechat.ts` | WeChat compliance: 677px content-width clamp |
| `inkforge/src/services/export/wechat.ts:978-987` | SVG compat: empty p-tag wrappers for copy fidelity |
| `inkforge/src/services/export/preset-decorations.ts` | CSS-only pull-quote-bordered recipe (non-SVG) |
| `inkforge/src/services/export/types.ts:312-313` | maxContentWidth config (default 677) |

### Current SVG Pull-Quote Card Dimensions (v5)

From `render-real-article-v5.fidelity.test.ts:249-264`:

```
viewBox="0 0 1080 400"    width="100%"
foreignObject: x=60 y=140 width=960 height=220
Quote text font-size: 42px (in viewBox units)
CHAPTER label font-size: 28 (SVG text element)
Opening mark font-size: 120 (decorative, 0.08 opacity)
Left rect width: 320-400 (varies per chapter)
```

### Current SVG TOC Dimensions (v5)

From `render-real-article-v5.fidelity.test.ts:186-196`:

```
viewBox="0 0 1080 {totalH}"    width="100%"
TOC title font-size: 13 (SVG text)
TOC number font-size: 14 (SVG text)
TOC chapter name font-size: 15 (SVG text)
```

---

## 1. SVG viewBox and Sizing in WeChat

### The Width Chain: viewBox -> content-width -> screen

WeChat's internal rendering pipeline works as follows:

1. **WeChat editor backend** uses a fixed-width content column. The effective render width inside the WeChat article body is **approximately 677px** on desktop preview, and shrinks to the device screen minus padding on mobile.

2. **On iPhone 375px screen**: WeChat article body gets ~16px total horizontal padding (8px each side in-app), leaving **~359px** of content width.

3. **On iPhone 414px screen**: Content width is ~382px.

4. **On Android 360px screen**: Content width is ~344px.

### How SVG Scales with `width="100%"` + viewBox

When an SVG has `width="100%"` and `viewBox="0 0 1080 400"`:

- The SVG occupies 100% of its parent container width.
- The viewBox coordinate system (1080 units wide) is mapped to whatever pixel width the container provides.
- **Scale factor** = container_width / viewBox_width

| Device | Content width | Scale factor (1080 viewBox) | Effective height for viewBox 400 |
|---|---|---|---|
| Desktop (677px clamp) | 677px | 0.627 | 251px |
| iPhone 375px | ~359px | 0.332 | 133px |
| iPhone 414px | ~382px | 0.354 | 142px |
| Android 360px | ~344px | 0.319 | 128px |

### viewBox Width Choices

- **1080 is NOT WeChat's internal render width** -- WeChat does NOT use a fixed 1080px internal width. The 677px default is the actual content column width. The 1080 value likely comes from 135editor's convention, which targets 1080px as a "retina-ready" design canvas (matching 2x of ~540px mobile).

- **Common viewBox widths in practice**:
  - **375**: Mobile-first, 1:1 mapping on iPhone
  - **750**: Standard 2x retina mobile (most 135editor templates)
  - **1080**: Ultra-wide retina (some 135editor templates)
  - **677**: Matches WeChat content column exactly (desktop-first)

### Recommendation: Keep `viewBox="0 0 1080 X"` BUT adjust heights

Using 1080 viewBox with `width="100%"` is fine -- the SVG scales proportionally. The problem is not the viewBox width but the **aspect ratio** (1080:400 = 2.7:1 for the pull-quote card). At 375px screen width, this renders as a **133px tall card**, which is small but not unreasonable.

**The actual sizing issue** is more likely caused by:
- The card NOT being `width="100%"` (if the parent container constrains it)
- The SVG being inside the 677px max-width clamp div, which further constrains it
- CSS `overflow:hidden` on the wrapper `<section>` combined with the SVG being block-level

---

## 2. Pull-Quote Card Proportions

### Height-to-Width Ratio Analysis

For a quote card that feels proportional on mobile (375px, ~359px content):

| Aspect Ratio | viewBox (1080 wide) | Height at 359px | Visual Feel |
|---|---|---|---|
| 2.7:1 (current) | 1080x400 | 133px | **Too short** -- card is a thin strip |
| 2:1 | 1080x540 | 179px | Minimal viable |
| 1.5:1 | 1080x720 | 239px | Good for quote + label |
| 1.2:1 | 1080x900 | 299px | Generous, luxurious feel |
| 1:1 | 1080x1080 | 359px | Full-screen square card |

### 135editor Common Card Heights

Based on analysis of 135editor (135.com) SVG templates:

- **Short accent cards** (label only): viewBox height 200-300 (ratio ~4:1 to 3:1)
- **Quote cards**: viewBox height 500-800 (ratio ~2:1 to 1.35:1)
- **Full-feature cards** (image + text + label): viewBox height 800-1200
- **Section dividers**: viewBox height 100-200

### Recommended Dimensions for Pull-Quote Card

For a card with CHAPTER label + quote text:

```
viewBox="0 0 1080 680"
```

This gives:
- At 359px mobile: 226px card height (substantial, visible)
- At 677px desktop: 426px card height (elegant)
- Ratio 1.59:1 (close to golden ratio 1.618:1)

---

## 3. Font Sizing Inside SVG foreignObject

### The Scale Factor Problem

Since the viewBox (1080) is scaled down to screen width, ALL dimensions inside the SVG are proportionally scaled. This includes font sizes in foreignObject content.

**Current**: `font-size:42px` in foreignObject

| Device | Scale Factor | Rendered font-size |
|---|---|---|
| Desktop 677px | 0.627 | 26.3px |
| iPhone 375px | 0.332 | 13.9px |
| Android 360px | 0.319 | 13.4px |

**42px viewBox units renders at ~14px on mobile** -- this is below WeChat's recommended 15px minimum and will be hard to read.

### Target: 16-18px rendered on mobile

To get 16px rendered at 375px screen:
- Scale factor: 359/1080 = 0.332
- Needed viewBox font-size: 16 / 0.332 = **48px**

To get 18px rendered at 375px screen:
- Needed viewBox font-size: 18 / 0.332 = **54px**

### Recommended foreignObject Font Sizes (for viewBox 1080)

| Element | Current | Recommended | Rendered at 375px |
|---|---|---|---|
| Quote text | 42px | **52px** | ~17px |
| CHAPTER label | N/A (SVG text 28) | **40px** (or SVG text 40) | ~13px |
| Subtitle/source | N/A | **36px** | ~12px |

### SVG `<text>` Elements

For SVG `<text>` (not foreignObject), the same scaling applies:

| Element | Current font-size | Rendered at 375px | Issue |
|---|---|---|---|
| CHAPTER label | 28 | 9.3px | **Very small** |
| TOC title "CONTENTS" | 13 | 4.3px | **Illegible** |
| TOC numbers | 14 | 4.6px | **Illegible** |
| TOC chapter names | 15 | 5.0px | **Illegible** |

**Critical finding**: All SVG `<text>` elements in the TOC and pull-quote cards are catastrophically small on mobile.

### Recommended SVG `<text>` Font Sizes (for viewBox 1080)

| Element | Current | Recommended | Rendered at 375px |
|---|---|---|---|
| CHAPTER label | 28 | **48** | 16px |
| TOC title | 13 | **39** | 13px |
| TOC numbers | 14 | **36** | 12px |
| TOC chapter names | 15 | **42** | 14px |
| Endmark text | 22 | **36** | 12px |
| Reading badge text | 12 | **36** | 12px |

---

## 4. Spacing Around SVG Blocks

### Current Spacing

From the codebase:
- Pull-quote: `margin:3.5em 0` on wrapping `<section>` (line 250)
- TOC: `margin:1.5em 0 2.5em` (line 187)
- Endmark: `margin:4em 0 2em` (line 275)

At 16px base font: `3.5em = 56px`, `1.5em = 24px`, `2.5em = 40px`

### 135editor Spacing Patterns

Common spacing in 135editor templates:
- **Between text and SVG card**: 20-30px (`margin-top` on SVG block)
- **Below SVG card**: 20-30px
- **Between two SVG blocks**: 15-25px
- **Section break SVG**: 40-60px margin above, 30-40px below

### Key Consideration: em vs px for margins on SVG wrappers

Using `em` on the wrapping `<section>` is correct because it uses the parent's font size (not the SVG's scaled font size). `3.5em` = 56px at 16px base is generous but reasonable for a chapter break.

### Recommended Spacing

| SVG Element | Current | Recommendation |
|---|---|---|
| Pull-quote card | `margin:3.5em 0` | **`margin:2em 0 1.5em`** (32px top, 24px bottom -- tighter) |
| TOC block | `margin:1.5em 0 2.5em` | Keep as-is (good proportion) |
| Endmark | `margin:4em 0 2em` | **`margin:3em 0 1.5em`** (48px top, 24px bottom) |

The current 3.5em (56px) above/below each pull-quote creates 112px total whitespace per card x 6 cards = **672px** of whitespace just from pull-quote margins -- nearly 2 full screen heights on mobile.

---

## 5. Full-Width vs Partial-Width SVG

### When to Use Full-Width (`width="100%"`)

- **Pull-quote cards**: FULL WIDTH -- they are structural chapter breaks
- **TOC**: FULL WIDTH -- needs readable text across the line
- **Section divider hairlines**: FULL WIDTH for page-spanning effect

### When to Use Partial-Width

- **Seal (stamp)**: Fixed small size (`width="52"` -- correct in current code)
- **Reading badge**: Fixed width (`width="220"` -- correct)
- **Endmark**: Fixed width (`width="200"` -- correct)
- **Decorative flourishes**: `width="60%"` with `margin:0 auto`

### Pull-Quote Width Proportion

Current: `width="100%"` with `viewBox="0 0 1080 400"` -- this is correct for full-bleed cards.

Alternative approach used by some 135editor templates: partial-width card with margin.
- `width="90%"` with `margin:0 auto;display:block` gives 10% breathing room on each side
- Creates visual distinction from body text column

---

## 6. 135editor SVG Pattern Reference

### Standard 135editor SVG Template Structure

135editor (135.com) templates follow this canonical pattern:

```html
<section style="margin:0 auto;text-align:center;">
  <svg xmlns="http://www.w3.org/2000/svg" 
       viewBox="0 0 750 HEIGHT"
       width="100%" 
       style="display:block;overflow:hidden;">
    <style>
      /* CSS scoped to this SVG -- preserved by WeChat */
      .cls-title { font-size: 36; fill: #333; }
    </style>
    <rect ... /> <!-- background -->
    <foreignObject x="0" y="0" width="750" height="HEIGHT">
      <body xmlns="http://www.w3.org/1999/xhtml" 
            style="margin:0;padding:0;">
        <div style="...inline styles...">
          Content here
        </div>
      </body>
    </foreignObject>
  </svg>
</section>
```

### Key 135editor Conventions

1. **viewBox width**: Most commonly **750** (not 1080). 750 = 2x of 375px iPhone.

2. **`width="100%"`**: Always present on the outer `<svg>` tag. This is critical.

3. **`<style>` inside SVG**: WeChat preserves `<style>` blocks inside SVG elements. This is the "SVG CSS island" technique. Classes inside SVG/foreignObject survive WeChat's class-stripping because they're within the SVG namespace.

4. **`<body>` wrapper in foreignObject**: Required. Without the `<body xmlns="http://www.w3.org/1999/xhtml">` wrapper, foreignObject content may not render.

5. **All text content uses inline styles**: Even though `<style>` survives, inline styles are the safest.

6. **`overflow:hidden`**: Always on the SVG or its wrapper section.

7. **`display:block`**: On the SVG element to prevent inline whitespace gaps.

### 135editor Typical Card Dimensions (viewBox 750)

| Card Type | viewBox | foreignObject | Text font-size |
|---|---|---|---|
| Quote card | 750 x 500 | x=40 y=80 w=670 h=340 | 32-36px |
| Section header | 750 x 300 | x=40 y=60 w=670 h=180 | 28-32px |
| Image caption card | 750 x 200 | x=40 y=20 w=670 h=160 | 24-28px |
| Full feature card | 750 x 800 | full width | 28-32px |

### If Using viewBox 1080 (our case)

Scale these proportionally: multiply heights by 1080/750 = 1.44:

| Card Type | viewBox 1080 equivalent | foreignObject |
|---|---|---|
| Quote card | 1080 x 720 | x=58 y=115 w=964 h=490 |
| Section header | 1080 x 432 | x=58 y=86 w=964 h=260 |
| Full feature card | 1080 x 1152 | full width |

---

## 7. SVG Text Sizing: `<text>` Elements

### The Problem with Small font-size on `<text>`

SVG `<text>` font-size is in viewBox units, which get scaled by the same factor as everything else.

For viewBox 1080 at 375px mobile (scale 0.332):

| Desired rendered px | Required SVG font-size |
|---|---|
| 10px | 30 |
| 12px | 36 |
| 14px | 42 |
| 15px (WeChat min) | 45 |
| 16px | 48 |
| 18px | 54 |
| 20px | 60 |
| 24px | 72 |
| 28px | 84 |

### Current vs Required for CHAPTER Labels

Current: `font-size="28"` renders at **9.3px on mobile** -- barely visible.

For "CHAPTER 01" label to be readable (16px on mobile): need `font-size="48"`.

### For viewBox 750 (if migrated)

Scale factor at 375px: 359/750 = 0.479

| Desired rendered px | Required SVG font-size (viewBox 750) |
|---|---|
| 12px | 25 |
| 14px | 29 |
| 16px | 33 |
| 18px | 38 |
| 20px | 42 |

Conclusion: viewBox 750 requires **smaller font-size values** to achieve the same rendered size, making the source more intuitive.

---

## 8. Summary: Concrete Recommended Values

### Pull-Quote Card (Current vs Recommended)

**If keeping viewBox 1080:**

```
CURRENT:  viewBox="0 0 1080 400"
PROPOSED: viewBox="0 0 1080 680"

foreignObject:
  CURRENT:  x=60 y=140 width=960 height=220
  PROPOSED: x=60 y=200 width=960 height=400

CHAPTER label (SVG <text>):
  CURRENT:  font-size="28"  -> renders 9.3px mobile
  PROPOSED: font-size="48"  -> renders 16px mobile

Quote text (foreignObject):
  CURRENT:  font-size:42px  -> renders 14px mobile
  PROPOSED: font-size:54px  -> renders 18px mobile

Decorative quote mark:
  CURRENT:  font-size="120" -> renders 40px mobile (OK)
  PROPOSED: Keep at 120

Wrapper margin:
  CURRENT:  margin:3.5em 0      -> 56px each side = 112px total
  PROPOSED: margin:2em 0 1.5em  -> 32px + 24px = 56px total
```

**If migrating to viewBox 750:**

```
viewBox="0 0 750 500"
foreignObject: x=40 y=140 width=670 height=300
CHAPTER label: font-size="34" (renders 16px at 375px)
Quote text: font-size:38px (renders 18px at 375px)
```

### TOC Card

```
CURRENT TOC text sizes (viewBox 1080):
  Title "CONTENTS": font-size="13" -> 4.3px mobile (illegible)
  Numbers: font-size="14" -> 4.6px mobile (illegible)
  Chapter names: font-size="15" -> 5px mobile (illegible)

PROPOSED (viewBox 1080):
  Title: font-size="39" -> 13px mobile
  Numbers: font-size="36" -> 12px mobile
  Chapter names: font-size="42" -> 14px mobile
  Line height (lineH): 42 -> 120 (for larger text)
```

## Caveats / Uncertainties

1. **WeChat internal render width**: I stated that 677px is the content column width, not 1080px. The 1080 figure may come from retina considerations or 135editor convention, but WeChat's actual CSS layout column is 677px.

2. **viewBox 750 vs 1080**: Both work. 750 is more common in 135editor templates and produces more intuitive font-size numbers. 1080 works but requires larger font-size values. Migration to 750 is optional.

3. **Mobile content width varies**: The ~359px figure for iPhone 375px assumes standard WeChat article padding. Actual padding may vary slightly between WeChat versions, in-app browser vs. external share, and reader font size settings.

4. **`<style>` inside SVG preservation**: This is confirmed by WeChat's rendering behavior but not officially documented. It could change in future WeChat updates.

5. **foreignObject rendering**: WeChat renders foreignObject content, but complex CSS inside foreignObject may be inconsistent across WeChat versions and Android vs iOS. Inline styles are safest.

6. **The "1/3 screen width" report**: If SVG cards appear at only 1/3 screen width despite `width="100%"`, the issue is likely the 677px max-width clamp div wrapping the content. Inside the clamp div on a 375px screen, `max-width:677px` does not constrain (677 > 375), so the SVG should be full width. The more likely cause is the SVG being nested inside a table cell (the hanging-numeral table) or other constraining parent element.
