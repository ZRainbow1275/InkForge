# Profiled Research: Performance SLO Baseline

## Browser API Findings

Grok Search and current browser API references confirm that `PerformanceObserver` remains the appropriate non-blocking browser primitive for real frontend performance telemetry. The API can observe entries such as `longtask`, `event`, `layout-shift`, `navigation`, `paint`, and `resource`, but support varies by entry type. The implementation must therefore feature-detect supported entry types and report unsupported states honestly.

Implementation implications:

- Use `PerformanceObserver.supportedEntryTypes` before observing optional entries.
- Keep observer callbacks lightweight and persist summarized data outside the callback path.
- Use `buffered: true` when supported so page-load entries are not missed.
- Treat `longtask` support as Chromium-heavy and not guaranteed.
- Treat memory measurement as limited/experimental. Prefer `measureUserAgentSpecificMemory` when present, fall back to Chromium `performance.memory`, otherwise report unsupported.
- Use `matchMedia('(prefers-reduced-motion: reduce)')` for accessibility/performance boundary state.
- Do not claim Lighthouse or INP/CLS pass without a real lab/browser run and enough samples.

## Dexie API Findings

Context7 Dexie documentation confirms this project can continue using typed Dexie tables, schema `version().stores()`, explicit open/close lifecycle, static `Dexie.delete(name)`, `Dexie.exists(name)`, and `Dexie.getDatabaseNames()` when available. For this task, adding global performance tables to `InkForgeDB` is the lowest-risk storage path.

## Local Code Findings

- `SettingsView.vue` already has a real `performance-metrics` feature flag and a basic runtime performance panel using requestAnimationFrame, Dexie read probes, localStorage write probes, navigation timing, and browser memory APIs.
- The existing panel is not yet a Spec 27 SLO ledger: it does not persist samples/events, does not expose threshold evaluation, and does not report PerformanceObserver support as a structured matrix.
- `utils/db.ts` currently uses Dexie schema v10. Spec 27 baseline can add v11 tables without removing existing data.
- Audit service exists and can record sanitized lifecycle/degradation evidence, but telemetry persistence must remain non-blocking.

## Baseline Decision

Implement a compatible local SLO ledger and Settings integration first. Leave Lighthouse, 90万字 input/export performance matrices, and full worker offloading as pending gates because they require dedicated benchmark fixtures and lab runs.
