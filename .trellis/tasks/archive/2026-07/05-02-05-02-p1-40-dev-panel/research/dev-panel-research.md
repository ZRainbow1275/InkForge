# Dev Panel Research Notes

## Local Specification Sources

- prompts/0420/specs/40-dev-panel-spec.md defines hidden activation, seven tabs, dynamic import, production retention, ActivityLogger events, performance constraints, and safety requirements.
- prompts/0420/specs/33-diagnostic-logging-spec.md provides the persisted ActivityLogger and diagnostic export contract.
- prompts/0420/specs/27-performance-slo-spec.md provides the performance sample/degradation schema and collector boundaries.
- Existing stores diagnostics, performance, settings, and command-palette already expose real runtime state and should be reused instead of duplicated.

## External Findings

- Grok Search current-practice pass: production diagnostics panels should be hidden, lazy-loaded, bounded by ring buffers, and measured for inactive/active overhead. This maps to Spec 40 dynamic import and fixed in-memory network/event buffers.
- Grok Search privacy pass: browser diagnostics must avoid logging secrets at source, redact URL query tokens/credentials, and treat HAR/body export as sensitive. This maps to showing only method/url/status/size/duration and redacted metadata in Network tab.
- Context7 Tiptap docs confirm editor.on('update'), editor.on('selectionUpdate'), and editor.on('transaction') are valid runtime event hooks, and editor.getJSON() / editor.state provide the required data surfaces.
- Context7 Pinia docs confirm root state can be read from pinia.state.value; the DevPanel Store tab should inspect that state rather than trying to duplicate every store implementation.

## MCP Availability

- MetaMCP Serena, GitNexus, ABCoder, Exa, and DeepWiki calls returned Transport closed in this session. Impact/detect-changes must be recorded as attempted but unavailable; verification must rely on local tests, type-check, lint, build, and browser smoke.

## Design Decisions

- The panel is app-specific and does not reimplement Vue DevTools. It inspects InkForge business/runtime state only.
- Destructive IndexedDB edit/delete remains read-only in the baseline because safe mutation needs per-table schema validation and confirmation UX. Browsing/exporting/counting is real and non-mutating.
- The event stream adds a small ActivityLogger publish hook so DevPanel can subscribe to records without polling, while preserving existing persistence and fallback behavior.
- Network diagnostics install a bounded global fetch wrapper only after dev tools runtime initialization. It records metadata and never stores request or response bodies.
