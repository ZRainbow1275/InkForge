# External Research Notes

## Browser Lifecycle and IndexedDB

- Grok Search session `6fce53aa7dfa` confirms current browser guidance: use debounced/incremental saves to IndexedDB, and pair them with `visibilitychange` plus `pagehide` for final persistence.
- `beforeunload` is not reliable for async IndexedDB transactions and should not be the only persistence trigger.
- Pinia store state should remain memory/UI state, while IndexedDB stores durable restore snapshots. Failures should degrade to default layout without blocking document content.

## Project Tooling Reality

- `serena__activate_project`, `gitnexus__impact`, and `gitnexus__detect_changes` returned `Transport closed` during Spec 47 and at the start of Spec 48.
- Impact analysis cannot be honestly reported as successful until those transports recover.
- Compensation plan: reuse existing layout/session code, keep diffs narrow, run targeted tests, full static gates, build, and real browser smoke.

## Runtime Follow-up

- Current Grok Search retry session `e32bf0f04202` returned empty content and zero sources for the page lifecycle query, matching the local search stack's known intermittent empty-result behavior. The implementation therefore preserved the already-recorded lifecycle conclusion and verified behavior through app-level browser smoke.
- Context7 Dexie lookup failed once with `fetch failed`; Context7 Pinia lookup succeeded and confirmed setup stores expose refs as state and functions as actions, which matches the chosen store-level `serializeForLayout` / `restoreFromLayout` API shape.
- Browser smoke used real UI-created articles and read IndexedDB only as evidence. No IndexedDB rows were injected or mutated manually during validation.
