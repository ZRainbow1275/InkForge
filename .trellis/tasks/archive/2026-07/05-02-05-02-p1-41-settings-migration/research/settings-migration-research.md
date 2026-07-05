# Settings Migration Research Notes

## External checks

- Grok Search query: `client-side localStorage schema migration Zod validation rollback settings best practices Vue Pinia 2026`.
- Relevant pattern confirmed: persisted client-side settings should carry an explicit version, migrate sequentially, validate unknown JSON through non-throwing schema validation, and keep a backup/rollback point before destructive apply.
- Context7 `/colinhacks/zod` query confirmed `.safeParse(data: unknown)` returns a discriminated union and is the correct boundary for unknown JSON validation without throwing.

## Local application

- Inkforge already uses a custom Pinia settings store and localStorage persistence, so the implementation should not introduce a new persistence plugin.
- The migration service stays independent from Pinia and accepts a normalizer plus validator callback; this keeps the engine unit-testable while reusing the existing `SettingsSchema` and `buildSettingsCandidate` in the store.
- The first baseline migration chain maps legacy root fields (`theme`, `font`, `paperWidth`, `legacyMode`), legacy shortcut names (`zoomIn`, `zoomOut`), and `advanced.devtoolsEnabled` into the current schema before Zod validation.

## MCP availability

- Serena, GitNexus, ABCoder, and DeepWiki calls were attempted during this continuation and returned `Transport closed` through `metamcp`; this is recorded as an environment limitation, not as a passed impact analysis.
- Compensation path: targeted Vitest, `vue-tsc`, ESLint, full Vitest, build, diff check, and emoji scan.
