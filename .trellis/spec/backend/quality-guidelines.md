# Quality Guidelines

> Code quality standards for backend development.

---

## Overview

Inkforge does not currently have a separate server package for all product
capabilities. Some backend-like deterministic contracts live in service modules
under `inkforge/src/services/**`. These modules must be treated as production
capability layers: they need explicit input/output contracts, deterministic
fallbacks, honest unsupported states, and focused tests.

---

## Forbidden Patterns

### Do Not Count Preview or Stub Code as Real Capability

Preview fidelity renderers and uploader stubs are useful, but they are not proof
of live platform ability.

Wrong:

```typescript
// A local preview renderer or a class named "*Stub" is reported as platform
// publishing support.
```

Correct:

```typescript
// Native export transforms are tested as real deterministic output.
// Uploaders without credentials/API contracts throw NotImplementedError and
// are documented as unsupported.
```

### Do Not Let Platform Output Depend on Stripped Styling

When a target platform strips classes, style blocks, or external CSS, the final
service output must not depend on those features.

Wrong:

```typescript
// WeChat output still needs KaTeX classes or a <style> block to look correct.
```

Correct:

```typescript
// WeChat output is pasteable HTML with inline styles, no class attributes, and
// formula content degraded to readable self-contained text when real equation
// image upload is unavailable.
```

### Do Not Over-Escape Regex Strings Used to Build RegExp

When a string is passed to `new RegExp(...)`, regex metacharacters need one
TypeScript string escape level. Over-escaping silently changes behavior.

Wrong:

```typescript
new RegExp('display:\\\\s*flex')
```

Correct:

```typescript
new RegExp('display:\\s*flex')
```

---

## Required Patterns

### Export Service Capability Classification

Every export/platform capability under `inkforge/src/services/export/**` should
be classified when audited:

- `real`: deterministic implementation covered by tests or runnable commands.
- `partial`: implemented but missing live integration, credentials, validation,
  or a verified edge case.
- `preview-only`: local fidelity/simulation output only.
- `stub`: deliberately throws or stands in for a future integration.
- `dead/stale`: referenced but not reachable or no longer present.

### Native Platform Output Contracts

- WeChat native output is pasteable HTML. Final output must avoid `<style>`,
  `class=`, JavaScript URLs, unsafe tags, unresolved CSS variables, and
  unsupported CSS that the service knows how to remove.
- Xiaohongshu native output is plain text. It must not leak raw HTML or Markdown
  as the publishable artifact.
- Zhihu native output is Markdown-compatible. Code fences, formulas, tables, and
  unsupported blocks need deterministic preserve/convert/downgrade behavior.

### Unsupported Integrations

If real credentials, OAuth setup, or platform upload API contracts are missing,
the integration should fail explicitly with a typed unsupported error instead of
returning fake success.

---

## Testing Requirements

For export service changes:

- Add a focused regression test for each fixed platform rule.
- Test final output, not only intermediate warnings.
- Include negative assertions for stripped or unsupported platform features.
- Run non-mutating lint commands; do not use package scripts that include
  `--fix` as proof of verification.

Expected commands for this package:

```bash
pnpm -C inkforge exec vitest run src/services/export --reporter=default
pnpm -C inkforge exec eslint src/services/export --ext .ts --quiet
pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet
pnpm -C inkforge exec vue-tsc --noEmit
```

If repo-wide lint or typecheck is blocked by files outside the task scope,
record the exact failing paths and still run the narrower service-layer checks.

---

## Code Review Checklist

- Does the changed service output map to a real user-facing capability rather
  than preview-only or stub behavior?
- Are unsupported integrations explicit and test-covered?
- Are platform limits enforced in output, not only reported as suggestions?
- Does WeChat output remain self-contained after class/style stripping?
- Does Xiaohongshu output remain plain text?
- Does Zhihu output remain Markdown-compatible?
- Were scoped tests and non-mutating lint run?
- If full gates failed, are the failures outside the task scope and documented
  with exact file paths?
