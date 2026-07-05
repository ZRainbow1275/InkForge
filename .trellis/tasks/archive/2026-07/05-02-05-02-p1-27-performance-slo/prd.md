# P1 Performance SLO Baseline PRD

## Goal

Implement the first real Performance SLO baseline for Spec 27 without fabricating lab results, Lighthouse scores, or synthetic success states. The baseline must provide runtime-measured browser telemetry, explicit SLO thresholds, durable local evidence, and a user-visible Settings surface that explains unsupported browser capabilities honestly.

## Source Specs

- `prompts/0420/specs/27-performance-slo-spec.md` is the primary product contract.
- `prompts/0420/specs/24-permission-audit-spec.md` defines audit requirements for high-risk or degradation events.
- `prompts/0420/specs/33-diagnostic-logging-spec.md` defines diagnostic evidence expectations.
- `prompts/0420/specs/07-settings-full-spec.md` defines Settings registry and Advanced/About surfaces.
- Existing Settings performance sampling is a starting point, not a full SLO ledger.

## Non-Negotiable Constraints

- No mock performance data, fake Lighthouse score, fake browser support, fake worker status, or seeded sample metrics.
- Do not block writing or primary UI flows when telemetry persistence fails.
- Do not delete existing Settings, audit, sync, profile, editor, or diagnostics functionality.
- Do not add emoji glyphs. Status indicators must use text, CSS, or existing icon systems.
- Browser APIs must be feature-detected. Unsupported `PerformanceObserver` entry types, memory APIs, or reduced-motion state must be reported as real unsupported/limited capability.
- Metrics collection must avoid doing heavy work in PerformanceObserver callbacks.

## Baseline Scope

### 1. SLO Contracts and Thresholds

- Add strict TypeScript/Zod contracts for SLO metric kinds, capability tiers, thresholds, support state, degradation levels, samples, and summary status.
- Define baseline thresholds for real measurable local signals: long task duration, input/event duration, route/navigation duration, FPS floor, IndexedDB read latency, settings write latency, and memory availability.
- Keep Lighthouse and full 90万字 export/input matrices as pending external lab gates unless a real tool run is executed.

### 2. Durable Local Evidence

- Add Dexie schema support for performance samples and degradation events.
- Persist only summarized metric values, thresholds, timestamps, route/context, and support metadata. Do not persist document content or secrets.
- Retain bounded recent samples/events so the ledger is useful but does not grow without control.

### 3. Runtime Collector

- Implement a browser-only collector that uses real APIs where available:
  - `PerformanceObserver` for `longtask`, `event`, and `layout-shift` if supported.
  - `performance.getEntriesByType('navigation')` for page navigation timing.
  - `requestAnimationFrame` for FPS sampling.
  - Dexie/localStorage probes for local storage latency.
  - `measureUserAgentSpecificMemory` or `performance.memory` only when genuinely available.
  - `matchMedia('(prefers-reduced-motion: reduce)')` for motion boundary state.
- Unsupported APIs should create limited support evidence rather than fake values.

### 4. Degradation and Audit Integration

- Derive SLO pass/warn/breach status from thresholds.
- Record degradation events when a measured metric breaches its threshold.
- Write audit evidence for real degradation events using existing audit service paths when available.
- Keep audit failures non-blocking and visible in service return data.

### 5. Store and Settings UI

- Add a Pinia performance store that can start/stop collection, refresh snapshots, expose summary status, recent samples, recent events, support matrix, reduced-motion state, and action messages.
- Extend the existing Settings performance panel instead of creating a detached page.
- Show real SLO status, thresholds, support limitations, degradation events, and no-Lighthouse-yet boundary text.

### 6. Tests and Validation

- Unit-test threshold evaluation, support-state generation, repository persistence, sample retention, degradation event creation, and unsupported API handling.
- Run targeted tests, full Vitest suite, type-check, lint, production build, Trellis validation, touched-file whitespace/newline/emoji scans, and a browser smoke if code changes affect visible Settings UI.

## Acceptance Criteria

- Opening Settings can collect a real performance snapshot without seeded metrics.
- If `PerformanceObserver` entry types are unsupported, Settings reports limited support instead of success.
- A metric above threshold creates a durable degradation event and does not store document content.
- The Settings performance panel shows SLO thresholds, current status, recent samples/events, reduced-motion state, and explicit pending lab gates.
- Existing `performance-metrics` feature flag remains respected.
- All validation commands in the final report pass, or unavailable tooling is documented with real error output.

## Out of Scope for This Baseline

- Claiming Lighthouse Performance > 80 without running Lighthouse.
- Full Playwright 90万字 input latency matrix.
- Full export 90万字 + 2000 attachment benchmark.
- Worker migration of every heavy module.
- Remote telemetry upload or hosted APM.

## Implementation Notes

- This baseline makes performance observable and enforceable locally. It prepares Spec 27 gates without pretending that every lab-scale matrix has already passed.
- SLO events should be bounded, sanitized, and local-first.
