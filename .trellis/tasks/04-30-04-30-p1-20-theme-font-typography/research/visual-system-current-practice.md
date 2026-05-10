# Visual System Current Practice Notes

Date: 2026-04-30

## Sources Consulted

- Grok Search query: `Vue 3 runtime theming CSS custom properties root data-theme best practices 2026`
- Exa query: `Vue 3 application dynamic theme CSS custom properties data-theme best practices`
- Local code: `App.vue`, `settings.ts`, `SettingsView.vue`, `constants/index.ts`, `useTypography.ts`, `design-system.css`
- Context7 was attempted for Vue.js but the account quota was exhausted, so it could not provide additional docs in this run.

## Decision

Continue using root-level CSS custom properties plus `html[data-theme]`/`html.theme-*` classes. This matches the current InkForge implementation and current Vue theming practice without adding a new theme library or large app-level rewrite.

## Implementation Guidance

- Keep `document.documentElement` as the single runtime write target for global visual tokens.
- Generate token maps from validated settings instead of scattering `root.style.setProperty` calls.
- Preserve semantic tokens already used by the app (`--accent-primary`, `--font-body`, `--font-size-body`, `--line-height-body`).
- Add new chrome/paper/typography tokens in parallel so future ThemeEngine work can adopt them gradually.
- Use existing `FONT_STACKS` rather than redefining font stacks in every consumer.
- Do not ship controls for font import, license scans, or theme import/export until the full persistence and validation flow exists.
