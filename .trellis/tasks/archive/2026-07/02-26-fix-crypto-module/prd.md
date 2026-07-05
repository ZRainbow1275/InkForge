# Fix Crypto Module - 6 TypeScript Errors

## Goal
修复 `src/utils/crypto/` 模块中的 6 个 TypeScript 编译错误，确保零 TS 错误且不引入新的 `any` 类型。

## Error List

### A1: key-management.ts:12 — `CRYPTO_SECURITY` unused import
- Remove `CRYPTO_SECURITY` from import statement

### A2: key-management.ts:13 — `ENABLE_ENCRYPTION` unused import
- Remove `ENABLE_ENCRYPTION` from import statement

### A3: key-management.ts:18 — `getCachedWrappingKey` unused import
- Remove `getCachedWrappingKey` from import statement

### A4-A5: sensitive-fields.ts:11 — `EncryptedData`/`UnencryptedData` unused type imports
- Remove both unused type imports

### A6: sensitive-fields.ts:81 — Expression not callable (void type)
- Check `isUnencryptedData` implementation in types.ts
- Fix function signature to return `boolean` instead of `void`
- Or fix the call site if the function is a type guard

## Acceptance Criteria
- [ ] `npx vue-tsc --noEmit 2>&1 | grep "crypto"` returns zero output
- [ ] No new `any` types introduced
- [ ] All existing crypto functionality preserved
- [ ] Clean unused imports removed

## Technical Notes
- Files: `inkforge/src/utils/crypto/key-management.ts`, `inkforge/src/utils/crypto/sensitive-fields.ts`
- Related: `inkforge/src/utils/crypto/types.ts`, `inkforge/src/utils/crypto/config.ts`, `inkforge/src/utils/crypto/lifecycle.ts`

---

## Closeout evidence - 2026-07-05

This TypeScript repair task is closed by current repository verification:

- Command run from `D:/Desktop/Inkforge`: `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`.
- Result: exit code `0` with no TypeScript diagnostics.
- Because no source code changed in this closeout slice, no new `any` types or runtime behavior changes were introduced here.
- The original error paths recorded in this PRD are therefore absent from the current strict type-check output.

No product source code changes are required for this closeout; this archive records that the current codebase already satisfies the task acceptance criteria.
