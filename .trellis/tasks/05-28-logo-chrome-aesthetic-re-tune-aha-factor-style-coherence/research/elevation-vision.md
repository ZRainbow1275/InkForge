# InkForge Visual Elevation Spec — "The Quiet Press, Forged / 静谧刊印·锻造"

> Synthesized from a 4-direction read-only design workflow (wb4dt1qcg). Editorial
> warm-paper base · ember-as-live discipline · the mark forges itself in.
> Non-destructive: CSS + markup + lucide-icon-swap only. No store/service/router/
> TipTap logic. Converge on existing `tokens.css` + `design-system.css`. Dark mode
> and `prefers-reduced-motion` stay correct. e2e 11/11 (no asserted DOM selectors
> change).

## Chosen direction & why

P1 "Editorial Luxe / 静谧刊印" is the dominant grammar for always-on surfaces
(Hub hero, cards, empties), fused with P4 "Quiet Precision / 锻造的静默" for token
discipline + ember-as-live + the autosave heartbeat, plus P2 "Tactile Paper Craft"
only for the EditorEmptyState centerpiece (the literal `<ForgeNibMark>` forging
itself in). P3 "Ink & Fire Drama" is **demoted**: its dark-anvil hero is the
biggest risk to the existing dark-mode contract, so its drama is rationed to ONE
place — a single 2px molten ember-seam hairline as an opt-in echo, never a dark slab.

Three of four proposals independently converged on the same two non-negotiables:
1. Kill the flat-red `.card-hero` slab → warm 砚白 paper.
2. Ration 铸红 to a single live/active ember beat.

## 0. New tokens (additive) — `design-system.css`

Add to light `:root` AND mirror in the dark block. Only NEW tokens; everything
else reuses the canonical set.

Light:
```css
--paper-warm:   #F7F4EF;                 /* 砚白 — hero/empty field */
--ember:        #C9362C;                 /* 铸红 — the single live/active beat */
--ember-soft:   rgba(201, 54, 44, 0.08); /* ember tint surface */
--ember-border: rgba(201, 54, 44, 0.22); /* ember hairline on hover/active */
--glow-ember:   0 0 16px rgba(201, 54, 44, 0.30);
```
Dark:
```css
--paper-warm:   #1B2230;
--ember:        #E15A4E;
--ember-soft:   rgba(225, 90, 78, 0.16);
--ember-border: rgba(225, 90, 78, 0.34);
--glow-ember:   0 0 18px rgba(225, 90, 78, 0.40);
```

**Rule of use (the spine):** `--ember` appears at most TWICE per screen — once as
the today/active beat, once as the single primary CTA. Never as a fill field.

## Waves (ordered)

- **Wave 0** — Additive tokens (zero visual change, unblocks everything).
- **Wave 1** — Workstation `EditorEmptyState.vue` full rebuild (highest impact,
  lowest blast radius, fixes broken dark mode). Tokenized warm-paper centerpiece:
  `<ForgeNibMark :size=88 :tier=256 :reactive=false>`, serif 准备落墨, 72px --ember
  Forge Line, instruction in --text-secondary, --ember-soft live pill w/ dot, ◇◇◇
  colophon, vertically centered.
- **Wave 2** — Hub hero: kill flat-red slab → warm editorial paper. `.card-hero`
  → linear-gradient(168deg, --bg-surface, --paper-warm) + --hairline + --elev-2;
  `.hero-decor` → --ember-soft glow; serif `.hero-title` + `forge-line` keyframe
  (draws once); `.chart-bar` → ink wells, only `.active` = --ember; `.hero-continue-btn`
  → solid --ember CTA + --glow-ember hover + ArrowRight→ArrowUpRight + focus ring;
  rewrite dark override (:5342-5351).
- **Wave 3** — Hub empty states + category de-candy. `.recent-empty` serif italic
  invitation + ruled-paper motif; `.categories-empty` warm dashed --hairline on
  --bg-rice-paper + ◇ seal; calm `colorSchemes` (:473-485) to ~8% tinted-paper
  chips; delete redundant dark override (:5749-5750).
- **Wave 4** — Card/depth + token/motion convergence + brand-echo. Global
  `.bento-card` explicit transitions + translateY(-1px)+--elev-2+--ember-border
  hover; HubView `.bento-card` warm gradient; pull `.card-inspiration` watermark
  into body; kicker hairline rules; `.stats-primary-value` → --text-primary;
  converge stray durations onto --motion-*; retire literal red shadows; shared
  `.ink-cta` utility.

## Brand-echo system

- **EMBER (`--ember`)** = universal live/active mark: today's bar, autosave anneal
  pulse (TitleBar seal — already wired), one CTA per screen, empty-state pill dot.
- **NIB-ARROW ↗ (创作/发送)** = send/continue/publish glyph: ArrowRight→ArrowUpRight,
  diagonal up-right nudge on hover.
- **ANVIL / INK-ON-PAPER (铸)** = depth+texture: cards rest on warm paper with
  --elev-* contact shadows; body fractal-noise = ink-in-宣纸 substrate.
- **INK-DROP / 印章 (◇)** = hollow seal ornament: empty-state colophon, categories
  first-run mark, in --ember.
- **Shared `.ink-cta`** = one forged-pill class reused by hero/recent/editor CTAs.

## Signature motion / the "Aha"

1. Forge Line strike — hero title's red rule draws once over --motion-slow.
2. **Autosave annealing heartbeat (the Aha)** — REUSE existing ForgeNibMark
   `data-state="annealing"` (600ms ember pulse on editorStore.status saving→ready,
   ForgeNibMark.vue:104-118). Zero new logic. The one ember pulses when work is cast.
3. Card hover — 180ms paper-lift + hairline → --ember-border.
4. CTA hover — --glow-ember ramp + nib-arrow diagonal nudge.
5. Reduced motion — token-driven, collapses to 0ms automatically.

## Verification gate (every wave)

```bash
pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet
pnpm -C inkforge exec vue-tsc --noEmit
pnpm -C inkforge exec vitest run --reporter=default
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
# then cargo build + 11-spec e2e (tests/e2e/specs/visual.spec.cjs)
```
Real-route smoke at 1440px + 390px, light AND dark: clean console, no overflow,
no mojibake, no black scrollbar tracks. gitnexus_impact before EditorEmptyState;
gitnexus_detect_changes before commit.
