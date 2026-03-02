# Fix Security Module - 7 TypeScript Errors

## Goal
修复 `src/services/security/` 和 `src/config/security.ts` 中的 7 个 TypeScript 编译错误。

## Error List

### B1: html-sanitizer.ts:207 — `string[]` not assignable to tag union array
- `HTML_SECURITY.SAFE_TAGS` is `as const` readonly tuple, spread becomes `string[]`
- Fix: Declare `allowedTags` as `string[]` type, use type assertion for DOMPurify

### B2-B3: html-sanitizer.ts:219-220 — `'style'` not in safe attrs union
- `HTML_SECURITY.SAFE_ATTRS` union doesn't include `'style'`
- Fix: Declare `allowedAttrs` as `string[]` type

### B4: html-sanitizer.ts:225 — attribute array type mismatch
- Same root cause as B1, spread operator converts readonly tuple to `string[]`
- Fix: Unified with B1

### B5-B6: policy-manager.ts:271,273 — `SecurityAuditEvent` incompatible with `Record<string, unknown>`
- `logger.warn/debug` expects `Record<string, unknown>`, but `SecurityAuditEvent` lacks index signature
- Fix: Use spread `{ ...event }` or type assertion `as Record<string, unknown>`

### B7: security.ts:434 — `true` not assignable to `false`
- `PASSWORD_POLICY` uses `as const`, `REQUIRE_SPECIAL` literal type is `false`
- `getPasswordPolicy()` returns `typeof PASSWORD_POLICY`, can't assign `true` to `false`
- Fix: Define a proper interface for PasswordPolicy return type

## Acceptance Criteria
- [ ] `npx vue-tsc --noEmit 2>&1 | grep "security"` returns zero output
- [ ] No new `any` types introduced
- [ ] DOMPurify sanitization still works correctly
- [ ] Security audit logging preserved

## Technical Notes
- Files: `inkforge/src/services/security/html-sanitizer.ts`, `inkforge/src/services/security/policy-manager.ts`, `inkforge/src/config/security.ts`
- Related types: `inkforge/src/services/security/types.ts`
