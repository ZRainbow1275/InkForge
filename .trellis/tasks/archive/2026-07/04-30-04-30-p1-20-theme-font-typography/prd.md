# P1-20 Theme Font Typography Baseline

## Goal

Implement a real compatible baseline for `prompts/0420/specs/20-theme-font-typography-spec.md` inside the existing InkForge app without deleting or replacing current UI, stores, editor behavior, export flows, or FTUE/help work.

This task advances Spec 20 by making the existing appearance and typography settings feed a centralized visual token pipeline, exposing usable typography presets and diagnostics in Settings, and documenting the remaining full-spec work as pending rather than shipping empty controls.

## Non-Negotiable Constraints

- No mock data, simulated operations, placeholder-only buttons, or fake import/export/font scans.
- No Emoji icons. Use text, CSS, SVG, or installed icon libraries only.
- Preserve existing paper-like writing style and Markdown-first philosophy.
- Preserve all existing settings, editor, export, FTUE, account, article, asset, and data-management behavior.
- Avoid broad refactors. Integrate with the existing `settings` store, `App.vue` CSS-variable sync, and `SettingsView.vue` appearance tab.
- Use runtime-validated settings values and strict TypeScript types. Do not introduce `any`.

## Scope

### Must Implement

1. Add a `visual-system` service that converts `AppearanceSettings` into CSS custom properties for the app chrome, paper surface, font stacks, and typography details.
2. Keep the existing root-level `data-theme` / `theme-*` class behavior, but centralize token calculation and remove duplicated font/color derivation from `App.vue`.
3. Map existing typography fields into real CSS variables:
   - `fontSize`
   - `lineHeight`
   - `paragraphSpacing`
   - `letterSpacing`
   - `paragraphIndent`
   - `headingStyle`
   - `blockquoteStyle`
4. Add real typography presets in Settings > Appearance that write the existing settings schema and immediately affect root CSS variables.
5. Add Settings > Appearance visual-system diagnostics that show active theme, active font, matched/custom typography preset, token count, frozen built-in brand token status, and no-mock implementation status.
6. Add baseline `.inkforge-theme` CSS hooks/fallback variables in the design system so future ThemeEngine work has a stable integration point.
7. Register the visual system setting in `SETTINGS_REGISTRY` so Settings search can route to the new panel.
8. Update `prompts/0420` docs and this Trellis task state after verification.

### Explicitly Pending From Full Spec 20

- Full `.inkforge-theme` JSON import/export with schema validation.
- User font file import, font-face loading, persistence, and license detection.
- Dedicated theme editor exposing every chrome/paper token.
- Multi-ambience writing modes beyond the baseline CSS hooks.
- Full built-in theme library beyond existing light/dark/system behavior.

These are intentionally not represented by empty UI controls in this baseline.

## Existing Code Facts

- `settings.ts` already has `AppearanceSchema` and `TypographySchema` with all baseline fields needed for typography controls.
- `App.vue` currently syncs `--accent-primary`, `--font-body`, `--font-size-body`, and `--line-height-body` manually.
- `SettingsView.vue` already contains Appearance tab controls for theme, font, font size, line height, accent color, sidebar width, and reduced motion.
- `WorkstationView.vue` already uses `useTypography()` for inspector-side typography controls.
- `constants/index.ts` already defines `FONT_STACKS` as a single source of truth.

## Acceptance Criteria

- Settings > Appearance shows typography preset controls and visual-system diagnostics.
- Applying a typography preset updates real settings values and root CSS variables, not just UI labels.
- Changing font, accent color, theme, or typography settings updates `document.documentElement` CSS variables.
- Existing theme class/data-theme and reduced-motion behavior continues working.
- `pnpm exec vue-tsc --noEmit` passes.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passes.
- `pnpm build` passes, allowing existing Vite chunk-size warnings.
- Browser smoke test confirms the Appearance panel works and console has no errors.
- `git diff --check` passes for touched files.
- Emoji presentation scan passes for touched files.
