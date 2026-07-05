# Directory Structure

> How backend code is organized in this project.

---

## Overview

Inkforge currently has no standalone server package. Backend-like behavior is
implemented in the nested app package under `inkforge/src/services/**`,
`inkforge/src/utils/db.ts`, `inkforge/src/schemas/**`, and Pinia stores that
coordinate service calls. Treat these modules as production service boundaries:
they own persistence, validation, external provider calls, security transforms,
diagnostics, and deterministic export/rendering contracts.

---

## Directory Layout

```
inkforge/src/
├── schemas/              # Zod schemas and DTO input contracts
├── services/             # Service modules, providers, repositories, validators
│   ├── export/           # Platform export/rendering engines and tests
│   ├── sync/             # Sync engine, provider contracts, remote providers
│   ├── tag-system/       # Tag repository, types, relation repair logic
│   ├── activity-logger/  # Durable diagnostic/event logging
│   ├── audit/            # Audit ledger and integrity helpers
│   └── security/         # Sanitizers and security helpers
├── stores/               # Pinia orchestration layer for UI-facing state/actions
├── utils/db.ts           # Dexie schema and database table authority
├── utils/crypto/         # Local crypto helpers and sensitive storage utilities
├── core/                 # Cross-service domain authority and lifecycle helpers
└── types/                # Shared type re-exports and UI-facing type surfaces
```

---

## Module Organization

- Put durable business rules in `src/services/<feature>/`, not inside Vue
  components.
- Put IndexedDB table declarations and versioned schema upgrades in
  `src/utils/db.ts`. Feature modules may define record types, but the Dexie
  table authority stays in `db.ts`.
- Put runtime input schemas in `src/schemas/**` for core article/category DTOs
  or in the feature service module when the schema is feature-specific, such as
  `src/services/tag-system/types.ts`.
- Put UI coordination in `src/stores/<feature>.ts`. Stores may call services,
  repositories, audit logging, and sync dirty tracking, but should not duplicate
  repository validation rules.
- Put external provider implementations under a provider subdirectory, as in
  `src/services/sync/providers/webdav.ts`.
- Put tests next to the service/module they verify, using `*.test.ts` or a local
  `__tests__/` directory.

---

## Naming Conventions

- Feature directories use kebab-case: `tag-system`, `activity-logger`,
  `layout-persistence`, `version-bundle`.
- Store files use camelCase or feature names matching the exported store:
  `stores/article.ts`, `stores/workstationTabs.ts`.
- Repository-style classes end in `Repository`; provider implementations end in
  `Provider`, for example `TagRepository` and `WebDAVProvider`.
- Feature type files are named `types.ts`; public barrels are named `index.ts`.
- Explicit unsupported implementations should be named honestly, for example
  `uploaders/xhs-stub.ts`, and must throw a typed unsupported error.
- Once an integration starts calling a real service/API bridge, drop the
  `-stub` suffix. Example: the WeChat uploader now lives at
  `uploaders/wechat.ts` because it delegates to the real publish service layer.

---

## Examples

- `inkforge/src/services/export/`: deterministic platform export service with
  native format engines, platform rules, preview-only fidelity renderers, image
  pipeline contracts, and focused tests.
- `inkforge/src/services/tag-system/`: Zod-validated feature records, typed
  domain errors, repository transactions, and relation repair helpers.
- `inkforge/src/services/sync/`: provider interface plus concrete providers;
  missing provider or remote failure is represented as a real paused/error
  state, not fake success.
- `inkforge/src/stores/article.ts`: Pinia orchestration around repository
  writes, Zod DTO validation, audit log, sync dirty tracking, and wiki-link
  repair.

---

## 2026-07-05 executable examples and anti-patterns

### Real code examples from the current tree

```ts
// inkforge/src/services/repository.ts
import { db } from '@/utils/db'
import { logger, ErrorCode, AppError } from './error'
import { encryptSensitiveFields, decryptSensitiveFields } from '@/utils/crypto'
```

```ts
// inkforge/src/services/security/html-sanitizer.ts
import DOMPurify, { type Config } from 'dompurify'
import { HTML_SECURITY } from '@/config/security'
import { TimeoutMutex } from '@/utils/async-manager'
```

### Anti-patterns

```ts
// Bad: a store reaches into low-level crypto and Dexie details.
await db.articles.add(await encryptSensitiveFields(article))

// Good: a store calls a repository/service boundary.
await articleRepository.create(article)
```

`utils/` contains shared primitives; `services/` owns workflows, security, persistence, export, and parser boundaries; stores call service/repository contracts.
