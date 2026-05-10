# P1-19 FTUE Help Baseline PRD

## Scope
Implement a compatible baseline for `prompts/0420/specs/19-ftue-help-spec.md` without claiming the full Spec 19 matrix is complete.

## Product Rules
- Show a lightweight WelcomeModal once for a fresh local installation.
- Never create sample documents, accounts, assets, or mocked records during FTUE.
- Keep all existing features visible immediately; no progressive unlocking, no forced tour.
- Provide an always-available Help Center with Markdown cheatsheet, real shortcut bindings, topic cards, and search.
- Provide a Settings > About reset entry that clears only FTUE/help state.
- Do not use Emoji. UI icons must be text, CSS, SVG, or existing icon library if needed.

## Data Contract
- Persist FTUE records in real IndexedDB via Dexie `InkForgeDB.ftue`.
- Add Dexie schema version 6 while preserving all v1-v5 stores.
- `state` record tracks step, timestamps, and onboarding path.
- `help` records track acknowledged help keys.
- Reset clears only `db.ftue`, then rewrites the default state.

## Implementation Targets
- `inkforge/src/services/ftue/types.ts`
- `inkforge/src/services/ftue/content.ts`
- `inkforge/src/services/ftue/index.ts`
- `inkforge/src/stores/ftue.ts`
- `inkforge/src/components/help/WelcomeModal.vue`
- `inkforge/src/components/help/HelpCenter.vue`
- `inkforge/src/utils/db.ts`
- `inkforge/src/App.vue`
- `inkforge/src/stores/settings.ts`
- `inkforge/src/views/SettingsView.vue`

## Acceptance
- First app load shows WelcomeModal when `ftue.state` is missing or `not_started`.
- Skipping WelcomeModal persists `skipped` in IndexedDB and does not generate sample data.
- Choosing create/import persists `completed` with `onboardingPath` and routes to existing real screens.
- `Ctrl+/` and the fixed help trigger open Help Center unless focus is inside editable input.
- Shortcut help is derived from `settings.shortcuts`, `SHORTCUT_GROUPS`, and `SHORTCUT_DEFINITIONS`.
- Settings About section can reset FTUE state and reports seen-help count.
- `vue-tsc`, ESLint, build, and a real browser smoke test pass.

## Deferred Full-Spec Items
- Floating contextual help bubbles for every feature surface.
- Full i18n help document catalog.
- Rich Markdown live preview inside cheatsheet examples.
- Dedicated activity logger event for `ftue.reset` if no existing logger contract is present.
- Exhaustive a11y matrix and unit tests for every Spec 19 row.