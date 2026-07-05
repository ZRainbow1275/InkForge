# P1 Extension Plugin Baseline

## Goal

Implement a compatible baseline for `prompts/0420/specs/25-extension-plugin-spec.md` that gives InkForge a real local-first extension/plugin registry with strict manifest validation, explicit permissions, profile-scoped persistence, namespaced storage, audit-backed lifecycle actions, and safe integration with the existing Command Registry. The baseline must not execute untrusted plugin code unless a real sandbox path is present, and must not present a fake online marketplace or fake successful plugin runtime.

## Source Of Truth

- `prompts/0420/specs/25-extension-plugin-spec.md`
- `prompts/0420/acceptance-matrix.md`
- `prompts/0420/specs/22-command-palette-spec.md`
- `prompts/0420/specs/24-permission-audit-spec.md`
- `.trellis/spec/backend/database-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/tasks/05-01-05-01-p1-25-extension-plugin/research/extension-plugin-practices.md`

## Baseline Scope

1. Add strict TypeScript/Zod extension manifest types for local `inkforge-plugin.json` manifests: id, name, version, author, description, entry, compatible app version, declared permissions, granted permissions, sandbox level, optional network policy and config snapshots.
2. Add Dexie-backed extension registry tables and storage namespace records while preserving existing data and schemas.
3. Add an `ExtensionRepository` for install/upsert, enable/disable, uninstall, error recording, and per-extension storage get/set/delete/list/clear, scoped by profile and extension id.
4. Add an `ExtensionHost` / service layer that validates manifests, refuses runtime activation when worker execution is unavailable, writes Spec 24 audit records, and exposes safe command contribution registration through existing `CommandRegistry.registerExtension()`.
5. Add a Pinia extension store with real installed/enabled/error state and Settings registry entry for an Extensions tab or visible extension section.
6. Add Settings UI baseline that lists installed local extensions, shows permissions and errors, supports enable/disable/uninstall on real local records, and clearly states that online marketplace/runtime execution are not mocked.
7. Add automated tests for manifest validation, permission rejection, storage namespace isolation, lifecycle audit behavior, and command registration permission gating.
8. Update specs/docs/acceptance notes with implemented baseline and remaining full-pass gaps.

## Non-Goals For This Compatible Baseline

- No fake online extension marketplace.
- No executing arbitrary third-party plugin JS without a real Worker sandbox and message protocol.
- No broad network wildcard permission.
- No plugin signing claim unless signature verification is actually implemented.
- No deletion or rewrite of the existing Command Palette, Settings, audit, permission, or sync architecture.

## Acceptance Evidence Required

- Type-check passes: `pnpm exec vue-tsc --noEmit`
- Targeted extension tests pass: `pnpm exec vitest run <extension tests>`
- Full Vitest suite passes: `pnpm exec vitest run`
- ESLint passes: `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`
- Production build passes with known heap setting: `NODE_OPTIONS=--max-old-space-size=4096 pnpm build`
- Touched-file diff/whitespace/no-emoji checks pass
- Browser smoke for Settings extension entry if UI is changed.

## Completion Note

This task may be marked complete only after code, tests, validation, and docs/spec updates are all done. Full Spec 25 remains pending if real Worker runtime activation, sandboxed iframe modal rendering, extension package unzip/copy, signature verification, hot reload, or online marketplace are not implemented.
