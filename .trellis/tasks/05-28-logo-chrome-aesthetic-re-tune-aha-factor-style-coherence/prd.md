# Logo + chrome aesthetic re-tune — Aha factor + style coherence

**Created**: 2026-05-28
**Owner**: ZRainbow1275
**Status**: planning

## Goal

User feedback after the 05-28 visual elevation sweep: "外表 + logo 不够匹配 InkForge 整体风格, 没有 Aha 感受." The 3-PR sweep (tokens / Inkstone Glass titlebar / Hub / Workstation / Settings / dark mode) raised the bar across surfaces, but the brand mark (Forge Nib) and overall chrome aesthetic still feel **functional, not emotionally hooked**. This task redesigns logo + chrome ornament to deliver a moment of recognition the user has been missing.

## What I already know

### Current Forge Nib (master.svg, ForgeNibMark.vue, favicon.svg)

- **Geometry**: Kiln rounded square (radial gradient) + solid Graphite ◆ filling ~70% of seal + Vellum slit (12×260 rect) + Amber forge line (200×10 rect)
- **Per brand doc §9.1**: "Kiln 熔铸炉 + Graphite 笔尖 + Vellum 金属切口 + Amber 冷却火痕" — the narrative IS the four-element forging story
- **Color**: Kiln `#D95B3F` + Graphite `#252933` + Vellum `#F5F0E6` + Amber `#C19A56`. **Tempera `#3B7A6B` (brand's "signature cool-hot DNA") is absent**.
- **Style**: pure geometric, 0 font dependency, symmetric, no calligraphic stroke / organic touch
- **Hover**: scale(1.06) + Kiln drop-shadow 8px

### Brand spec & promises (docs/inkforge-brand-identity.md)

- **Personality (§1)**: 温暖的精确 / 东西桥接 / 匠人品质 / 沉稳自信. NOT 工业批量感, NOT 冷冰技术感.
- **Color DNA (§2.4)**: "Kiln + Tempera 冷热对比是 InkForge 品牌的视觉 DNA. 市面上没有任何编辑器或内容平台使用这一组合."
- **Seal ornament (§4.1)**: 空心 ◇ NOT 实心 ◆ — but only for article ornaments, not the app logo (§9 explicitly prescribes 实心 ◆ as the nib).
- **Asymmetry (§4.2, §4.9)**: "匠人的不对称美学" — Forge Line is left-aligned not centered; image frame is bottom+right only. Logo IS perfectly symmetric.
- **Narrative weight**: brand story is "锻造 / Markdown → 精致排版 / 矿石成钢, 墨迹成字"

### Diagnostic — why current logo may not click

1. **Spec-narrative gap**: §9.1's four-element story is beautiful in PRD but invisible at glance — viewer sees "rounded square + black diamond + line", not "forge → nib → slit → forge mark".
2. **DNA dropout**: brand DNA is Kiln × Tempera cool-hot duotone (§2.4). Logo uses Kiln + Graphite + Amber. Tempera = 0%. The single most differentiating color is missing from the highest-visibility surface.
3. **Symmetry violates "匠人不对称"**: rest of brand system (Forge Line, image frames, table headers) embraces asymmetry. Logo doesn't carry this DNA.
4. **No East-West bridge in the mark**: brand claims 东西桥接 but the silhouette reads pure Western (rounded square = iOS app icon; diamond = abstract geometric). No 印章 / 篆刻 / 书法 / 宣纸 textural hook.
5. **Static, not living**: app marks that feel Aha often have state (Arc icon morphs, Raycast logo shifts, Linear has motion identity). Forge Nib is one static glyph.
6. **Chrome ornament mismatch**: the Inkstone Glass titlebar uses a 14px Forge Nib mark + "InkForge" wordmark + ember shadow line. If the seal itself underperforms, the chrome inherits that flatness.

## Assumptions (to validate via brainstorm)

- User's "整体风格" reference = brand doc §1 personality + §2.4 cool-hot DNA + §4 asymmetric craftsmanship (NOT another arbitrary aesthetic).
- "Aha" target = the moment a new user opens the app and thinks "oh, this is different / this feels considered" — measured by surprise + hidden cleverness + memorable silhouette.
- Re-tune is permissible to break §9 spec (i.e. redesign the Forge Nib geometry itself), if a better mark scores higher on coherence + Aha. The brand doc §9 is editable.
- Tempera reintroduction is on the table.

## Open Questions — RESOLVED

All open questions converged via 5-step single-question brainstorm:

* ~~Q2: How far?~~ → **Approach C** (印×笔 inverted seal)
* ~~Q1: Aha reference?~~ → research files surfaced 闻献 + 江小白 + 观夏 + Bear + FedEx; user picked elements from each
* ~~Q3: Scope?~~ → all 5 mount sites + 5-tier raster pipeline + splash + brand doc §9-10
* ~~Q4: East / West / hybrid?~~ → **explicit hybrid**: 镇尺+篆体 (东) × 笔锋+Latin (西)
* ~~Q5: Motion?~~ → **phase + hover + launch** (max living-state)
* ~~Silhouette?~~ → **笔锋** calligraphy nib split-tip
* ~~Frame?~~ → **镇尺** horizontal paperweight ~16:9
* ~~Wordmark?~~ → **canonical + 篆体「铸」 co-mark** (闻献 precedent, SVG outline)
* ~~Imperfection?~~ → **笔锋 cut right-edge 飞白** (single-mechanic)
* ~~16px strategy?~~ → **progressive 5-tier** master SVGs

## Research Notes — Convergence Across 3 Files

All three research angles independently converge on the same 4 mandates:

1. **Tempera reintroduction** — `#3B7A6B` is §2.4 stated brand DNA but 0% present in the current logo. All three files flag this as the single highest-leverage missing element.
2. **Single mechanic > 4-element composition** — Premium marks (Bear / Cursor / Linear / Nike) win on one extreme device, not four competing. Current mark has 4 (kiln + diamond + slit + amber bar + bevel highlight).
3. **Asymmetry** — §4.2 「匠人不对称」 is brand spec but the logo violates it. Premium-marks file lists this as anti-pattern #3 (warm-warm-warm with no temperature break); aha file ranks asymmetric-tension 13/15.
4. **Cultural-blend / 东西桥接** — `aha-trigger-visual-identity.md` flags this as the *only* mechanism that simultaneously delivers Aha AND closes an unfulfilled §1 brand spec promise (current silhouette reads pure Western iOS-app-icon).

Trap to dodge (chinese-seal file): vermilion stamp / 水墨 splatter / KaiTi default. Trap to dodge (premium-marks file): container-glyph sandwich, ≥3 competing devices, color-on-color with no temperature contrast.

## Feasible Approaches (Q2 options)

### Approach A — 一笔铸字 "Single-Stroke Dual-Read" (Recommended)

**How**: Drop the rounded-square container entirely. Mark = one asymmetric calligraphic stroke that reads simultaneously as (a) a Western calligraphy nib tip AND (b) an Eastern 篆刻 radical / molten ingot pour. Stroke carries a Kiln→Tempera anneal gradient along its length (cool head, hot tail). One 飞白 dry-brush imperfection on one edge. Forge line retired — the stroke IS the forge.

**Hits**: cultural-blend ✓ single-gesture-economy ✓ asymmetric ✓ Tempera-DNA ✓ material-anneal ✓
**Echoes**: Bear (one calligraphic stroke) + 江小白 (calligraphy replaces seal) + Nike (single curve = noun + verb) + Cursor (dual-read silhouette)

* Pros:
  - Maximum Aha — collapses two top-ranked mechanisms (single-gesture + cultural-blend) into one mark
  - Survives 16px favicon (single stroke is scale-robust)
  - Encodes the verb "铸" not the object — directly narrates the product name 「墨铸」
  - Closes 东西桥接 (§1) + Tempera DNA (§2.4) + 匠人不对称 (§4.2) simultaneously
* Cons:
  - Maximum redesign cost — breaks §9 spec entirely (Kiln seal + Graphite diamond + Vellum slit + Amber bar → 1 stroke)
  - All 5 mount sites (TitleBar / Hub / Workstation / Settings / WelcomeModal) + 4 raster pipelines (favicon / .ico / .icns / Linux PNG) + splash.html + brand doc §9-10 rewrite required
  - e2e `visual.spec.cjs` polygon-count assertion (= 1) must be updated to path-based (no polygon)
  - Hardest to lock without 2-3 SVG iterations to find the silhouette
* Risk: stroke may end up reading as "just a swoosh" if the dual-read isn't tight; needs 2-3 sketch iterations

### Approach B — 半侧锻台 "Asymmetric Forge with Tempera Anneal"

**How**: Keep the Forge Nib family recognizable; refactor balance:
- Tilt the Graphite diamond ~7° and shift it off-center toward upper-left (§4.2 asymmetry)
- Add a Tempera 冷却光晕 (cool annealing glow) on the right edge of the seal only
- Move the Amber Forge Line from "shelf below seal" to "crossing through the nib at casting line"
- Replace the symmetric Vellum slit with asymmetric carved bevel (left edge Vellum light catch + right edge Graphite deep shadow)

**Hits**: asymmetric ✓ Tempera ✓ material-tactile ✓
**Misses**: cultural-blend ✗ (still pure Western), single-gesture-economy ✗ (still 4 elements)

* Pros:
  - Lowest risk — preserves current Forge Nib equity at favicon scale
  - Smallest code/doc churn — `master.svg` + `ForgeNibMark.vue` + `favicon.svg` edits stay surgical
  - e2e polygon-count = 1 still holds
  - Brand doc §9 lightly amended, not rewritten
* Cons:
  - Still container-glyph sandwich (premium-marks anti-pattern #1)
  - Still 4+ competing devices fighting for the eye
  - East-West bridge (§1) remains 0% expressed
  - Aha potency: 6/10 — "polish pass" not "moment of recognition"
* Risk: user reaction may be "looks nicer, still doesn't Aha"

### Approach C — 印×笔 "Inverted Seal: 印 carves out the nib"

**How**: Invert figure-ground. The container itself becomes Tempera 铜绿 印体 (cool seal body); the 印章-cut marks carve OUT a Western nib silhouette in negative space, revealing Kiln 朱砂 underneath through the cuts. Mark is literally a 印 (seal) at the logo layer — redeeming §4.1's hollow-diamond language at the chrome surface. Stamp imperfection on one corner (匠人手作 not laser-cut).

**Hits**: cultural-blend ✓ negative-space-wordplay ✓ Tempera ✓ asymmetric ✓ material (carved stone) ✓
**Echoes**: 观夏 (intaglio ceramic) + FedEx (negative-space wordplay) + 闻献 (seal as accent, not headline)

* Pros:
  - Strongest "this is a 印章" cultural reading at hero scale
  - Preserves the "seal" identity from §9 while inverting its grammar
  - Tempera becomes the *primary* color (cool DNA finally dominant)
  - Restores §4.1 hollow ◇ language to the chrome layer (currently solid ◆)
* Cons:
  - 16px favicon risk — cut-mark complexity may collapse into mud at small sizes (research caveat: dies under 24px)
  - Full redesign cost, similar churn to Approach A but without the single-gesture economy benefit
  - Risk of reading as "Chinese-only" — Western half of 东西桥接 thinner than Approach A
* Risk: scale-survival at 16px must be verified before lock

---

## Requirements

### R1 — Mark geometry (印×笔 inverted seal)
1. Container is Tempera `#3B7A6B` 镇尺 rectangle, ~16:9 aspect, short ends rounded (radius proportional to height ~12%).
2. Inside Tempera body: centered 笔锋 split-tip nib silhouette carved as negative-space cutout, revealing Kiln `#D95B3F` underneath.
3. Cutout RIGHT edge carries 0.5-1px Vellum `#F5F0E6` dust 飞白 (asymmetric, single-mechanic imperfection).
4. Wordmark zone to the right of 镇尺: `InkForge · 墨铸` in Latin EB Garamond + 简体 Source Han Serif inline (per §9.2 0-font-dep — already in app's font stack).
5. Right-flush 篆体「铸」 co-mark, SVG outline path (NOT a font reference — 0 字体依赖 maintained per §9.2). Sized at ~0.6× height of 镇尺 cell so 篆体 doesn't dominate Latin.

### R2 — Progressive 5-tier master SVGs
Each tier shows decreasing complexity for smaller display:

| Master | Detail level |
|---|---|
| `master-16.svg` (16-32 raster) | 印体 cell only, clean nib triangle, NO split-tip, NO 飞白 dust |
| `master-32.svg` (32-48 raster) | 印体 cell, split-tip nib visible, NO 飞白 |
| `master-64.svg` (64-128 raster) | 印体 cell, split-tip, 飞白 edge dust |
| `master-256.svg` (256-512 raster) | 印体 cell, split-tip, 飞白, crystal grain Tempera texture |
| `master-1024.svg` (768+, hero, splash, About) | Full lockup: 镇尺 + 笔锋 + Latin wordmark + 篆体「铸」 co-mark |

Old `master.svg` (1024 viewBox) deprecated. `inkforge/scripts/build-icons.mjs` reads tier-appropriate master.

### R3 — 5 mount sites updated coherently
- `inkforge/src/components/chrome/ForgeNibMark.vue` — inline 32 viewBox; chooses `master-32` geometry by default; accepts `--size` CSS var to switch to larger tier
- `inkforge/src/components/chrome/TitleBar.vue` — uses ForgeNibMark; titlebar layout now naturally aligns with 镇尺 horizontal frame
- `inkforge/src/views/Hub.vue` welcome section — `master-256` SVG inline
- `inkforge/src/views/Workstation.vue` header — `master-64` SVG inline
- `inkforge/src/views/Settings.vue` About — `master-1024` lockup (with wordmark + 篆体「铸」)
- `inkforge/src/components/modals/WelcomeModal.vue` — `master-256` SVG inline
- `inkforge/index.html` boot placeholder — `master-1024` lockup inline
- `inkforge/public/favicon.svg` — replaced by build-icons output from `master-32`
- `inkforge/src-tauri/icons/{32,128,128@2x,256}*.png` + `icon.ico` + `icon.icns` — regenerated from progressive masters via `pnpm run icons:build`

### R4 — Motion (phase + hover + launch)
- **Idle**: static
- **Hover** (on `.forge-nib-mark--interactive`): Kiln inside cuts brightens from 90% → 100% lightness, `var(--motion-base)` = 180ms `var(--ease-out-quart)`. Current `scale(1.06)` + Kiln drop-shadow REMOVED — replaced by inside-cut Kiln glow.
- **Autosave** (subscribe to editor save event): mark gains `data-state="annealing"` for 600ms; Kiln inside cuts pulses 100% → 120% lightness → 100% (single warmth flare). Then state cleared.
- **Launch (splash)**: `inkforge/splash.html` static identity inside the drop→squish→bleed sequence is replaced with new 镇尺 lockup (`master-1024`). **Existing drop/squish/bleed timing is preserved as-is** — only the static mark inside the bleed changes.

### R5 — Brand doc §9-10 rewritten
- §9 (Forge Nib) replaced with **§9 印×笔 镇尺 Lockup** spec
- §10 (animation / hover) updated to match R4 motion spec
- §2.4 cool-hot DNA stays — the new logo IS this DNA made literal at chrome layer
- §4.1 hollow-ornament ◇ language stays — chrome layer now uses same hollow grammar via 笔锋 cutout, eliminating prior solid-vs-hollow inconsistency

### R6 — e2e harness updated in same PR
- `inkforge/tests/e2e/specs/visual.spec.cjs` brand-mark spec rewritten:
  - DROP: `polygons === 1` assertion (Graphite diamond no longer exists)
  - ADD: assert at least 1 `rect` element with Tempera fill (镇尺 body)
  - ADD: assert nib silhouette path exists (negative-space cutout)
  - ADD: assert 篆体「铸」 co-mark path exists at 1024-tier
- `pnpm test:e2e` must stay green against rebuilt binary

## Acceptance Criteria

### Geometry
* [ ] Mark renders crisp at 16 / 32 / 64 / 128 / 256 / 1024px from progressive 5-tier master SVGs
* [ ] Tempera `#3B7A6B` is the **primary** color of 印体 cell (>50% mark area)
* [ ] Kiln `#D95B3F` reveals through 笔锋 cutout (Kiln-through-Tempera = §2.4 cool-hot DNA literal)
* [ ] Vellum `#F5F0E6` 飞白 dust appears on 笔锋 cut RIGHT edge only (asymmetric per §4.2)
* [ ] 篆体「铸」 co-mark at 1024-tier renders from SVG outline path — no font dependency triggered
* [ ] Mark embodies all 4 §1 brand personality traits: 温暖精确 (镇尺 craft) / 东西桥接 (镇尺+篆 × 笔锋+Latin) / 匠人品质 (飞白 imperfection) / 沉稳自信 (Tempera primary, no flashy red)

### Mount sites
* [ ] TitleBar / Hub welcome / Workstation header / Settings About / WelcomeModal — all 5 show the new mark with tier-appropriate detail
* [ ] `inkforge/index.html` boot placeholder updated
* [ ] `inkforge/splash.html` static mark replaced; existing drop→squish→bleed timing preserved
* [ ] `inkforge/public/favicon.svg` regenerated from `master-32.svg`
* [ ] `pnpm run icons:build` regenerates `.ico` + `.icns` + `*.png` matrix from progressive masters

### Motion
* [ ] Hover state: Kiln inside cuts brightens 90→100, 180ms ease-out-quart, NO scale transform
* [ ] Autosave event: mark gains `data-state="annealing"` 600ms with Kiln warmth pulse
* [ ] Launch: splash 镇尺 stamps down using EXISTING drop/squish/bleed timing (no timing recalibration)

### Quality gates
* [ ] User confirms "this feels Aha" in live Tauri screenshot review (acceptance test from §3 Goal)
* [ ] `pnpm test:e2e` green — brand-mark spec rewritten to match new geometry (polygons === 1 dropped; Tempera rect + nib path asserted)
* [ ] Brand doc §9 + §10 rewritten to match locked spec
* [ ] No 1px-perfect alignment regression — Kiln focus ring + motion ladder + type rhythm tokens untouched (verified by other 7 e2e specs staying green)
* [ ] Evidence PNGs in `prompts/0528/logo-aha-evidence/` cover all 5 mount sites in light + dark themes, plus splash sequence

## Definition of Done

* New mark committed; build-icons pipeline regenerated for 5-tier progressive masters
* `pnpm test:e2e` 9/9 green (8 existing specs untouched + brand-mark spec rewritten)
* Brand doc §9 / §10 fully rewritten to match locked spec
* Evidence PNGs in `prompts/0528/logo-aha-evidence/`:
  - 5 mount sites (TitleBar / Hub / Workstation / Settings / WelcomeModal) × 2 themes (light/dark)
  - Splash sequence (drop / squish / bleed / settled)
  - Favicon at 16px (browser tab + Windows taskbar)
  - Hover state (Kiln glow active vs idle)
  - Autosave anneal pulse (3-frame timeline)

## Implementation Plan (3 small PRs)

### PR1 — Foundation (assets + brand doc)
**Scope**: design lock, no user-facing visual change yet
- Author 5 master SVGs (`master-16.svg` → `master-1024.svg`) per R2 spec
- Update `inkforge/scripts/build-icons.mjs` to select tier by output size
- Regenerate raster matrix: `pnpm run icons:build` → `.ico` / `.icns` / `*.png`
- Rewrite `docs/inkforge-brand-identity.md` §9 (印×笔 镇尺 Lockup) + §10 (motion)
- Verify all PNG/ICO outputs render correctly across 16-1024 size range
- NO Vue file changes; app still shows old mark
- **CI gate**: build-icons.mjs succeeds; no missing tier; SVG XML validates

### PR2 — Cascade (swap mount sites live)
**Scope**: visual swap goes live
- Rewrite `inkforge/src/components/chrome/ForgeNibMark.vue` to render new geometry with tier selection
- Update 5 mount sites to pass tier-appropriate prop
- Replace `inkforge/public/favicon.svg`, `inkforge/index.html` boot placeholder, `inkforge/splash.html` static identity
- Reuse existing splash drop/squish/bleed timing as-is
- **Visual gate**: `pnpm tauri:dev` shows new mark in TitleBar + Hub + Workstation + Settings + WelcomeModal
- **e2e**: existing brand-mark spec WILL fail (polygons === 1 assertion broken) — flagged for PR3

### PR3 — Motion + e2e + evidence
**Scope**: living-state + verification
- Implement hover Kiln-inside-cut glow (CSS) replacing scale(1.06) + Kiln drop-shadow
- Wire autosave event → `data-state="annealing"` 600ms pulse
- Rewrite e2e `visual.spec.cjs` brand-mark spec per R6
- Run `pnpm build && cd src-tauri && cargo build && pnpm test:e2e` — 9/9 green
- Capture all evidence PNGs to `prompts/0528/logo-aha-evidence/`
- **User acceptance**: live Tauri screenshot review, user confirms "Aha"

## Out of Scope (explicit)

* Editor canvas (TipTap) styling
* Article-rendering ornaments (◇ ornament, Forge Line, drop cap, etc — those are export-side §4.x, not chrome)
* WeChat export preset
* Performance / motion-token timing recalibration (locked from prior task)

## Technical Notes

* Forge Nib renders from 4 sources kept in sync: `master.svg` (1024 viewBox) → `favicon.svg` (32 viewBox) → `ForgeNibMark.vue` (32 viewBox inline) → `index.html` boot placeholder (1024 viewBox inline) → `splash.html` (572-cropped viewBox inline). Any redesign must touch all five.
* Raster generation: `inkforge/scripts/build-icons.mjs` consumes `master.svg` → `.ico` / `.icns` / `.png` matrix. Rebuild via `pnpm run icons:build`.
* Splash animation timing (drop → squish → bleed) is locked but the static identity inside is free to change.
* Hover micro-interaction on `ForgeNibMark--interactive` (scale 1.06 + Kiln glow) survives if visually still appropriate.
* Existing e2e spec asserts on `polygon` count (= 1 expected — the Graphite diamond). If geometry changes to non-polygon (e.g. stroked path), e2e must be updated in same PR.

## Research References

* [`research/premium-writing-tool-brand-marks.md`](research/premium-writing-tool-brand-marks.md) — 10-mark survey (iA Writer / Bear / Obsidian / Linear / Arc / Raycast / Cursor / Ghost / Things 3 / Day One); 5 Aha patterns; current InkForge mark exhibits 2/3 anti-patterns; highest-leverage single change = Tempera reintroduction
* [`research/modern-chinese-seal-design.md`](research/modern-chinese-seal-design.md) — 9 neo-Chinese brands (观夏 / 闻献 / 江小白 / 三顿半 / 钟薛高 / 内外 / HEYTEA / 故宫文创 / 单向空间); 5 modernization tactics + 3 traps; 闻献-style 篆体 co-mark + 观夏 horizontal tablet directly informed decision
* [`research/aha-trigger-visual-identity.md`](research/aha-trigger-visual-identity.md) — 6 Aha mechanisms ranked by DNA-fit × potency × 16px-feasibility; cultural-blend-unexpected-pairing identified as uniquely closing unfulfilled §1 东西桥接 spec promise

## Decision (ADR-lite)

**Context**: Three converging research files (premium-marks / chinese-seal / aha-trigger) flagged the same 4 mandates — Tempera DNA absent, single mechanic > 4 elements, asymmetry violated, 东西桥接 unfulfilled. Three approaches offered (A: 一笔铸字 single-stroke / B: 半侧锻台 polish / C: 印×笔 inverted seal). User progressively locked design through 5 single-question converging steps.

**Decision: 印×笔 Inverted Seal — Final spec**

| Axis | Locked value |
|---|---|
| **Approach** | C — 印×笔 inverted seal |
| **Negative-space silhouette** | 笔锋 calligraphy nib (split-tip Western pen point), centered |
| **Frame proportion** | 镇尺 paperweight horizontal (~16:9), rounded short ends |
| **印章 grammar** | 阴刻 — Tempera 铜绿 印体 primary, Kiln 朱砂 peeks through cuts |
| **Wordmark zone** | `[镇尺 印体]` + `InkForge · 墨铸` Latin/简体 inline + `[篆体 印记「铸」]` right-flush co-mark (SVG outline path, 0 字体依赖) |
| **Imperfection** | 笔锋 cut RIGHT edge 0.5-1px Vellum dust 飞白, asymmetric, single-mechanic |
| **16px favicon strategy** | Progressive detail — 5 master SVGs at break sizes (16/32/64/256/1024) |
| **Motion** | Phase + hover + launch — splash 镇尺 stamps down (reuse drop→squish→bleed timing) + idle static + hover Kiln-cut brighten 90→100 + autosave Kiln anneal pulse 600ms |

**Consequences**:
- *Wins*: cultural-blend ✓ negative-space wordplay ✓ Tempera primary ✓ asymmetric ✓ carved-stone material ✓ single-gesture (frame=印, cut=笔锋) ✓ encode-verb (篆体「铸」) ✓ living-state ✓ — all 5 Aha mechanisms from research file 3 active; closes §1 东西桥接 + §2.4 cool-hot DNA + §4.1 hollow ornament + §4.2 不对称 simultaneously.
- *Costs*: Full redesign of `master.svg` + `ForgeNibMark.vue` + `favicon.svg` + `index.html` boot placeholder + `splash.html`. 5-tier progressive SVG masters (`master-16.svg` / `master-32.svg` / `master-64.svg` / `master-256.svg` / `master-1024.svg`). All 5 mount sites + 4 raster pipelines (`pnpm run icons:build` updated for 5-tier). Brand doc §9-10 fully rewritten. e2e `visual.spec.cjs` polygon-count assertion (currently `polygons === 1` for Graphite diamond) must be replaced with new SVG geometry assertions for 印×笔 grammar.
- *Splash impact*: existing splash drop→squish→bleed timing is **reused as-is**. Only the static mark identity inside the bleed changes (镇尺 lockup replaces current Forge Nib seal).
- *Pipeline impact*: `inkforge/scripts/build-icons.mjs` must be updated to consume tier-appropriate master based on output size (16/32 → `master-32.svg`; 48/64 → `master-64.svg`; 128/256 → `master-256.svg`; 512/1024 → `master-1024.svg`).

