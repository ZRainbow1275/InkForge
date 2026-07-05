# Fix Store Repository Parser - 5 TypeScript Errors

## Goal
修复 stores、repository 和 parser 模块中的 5 个 TypeScript 编译错误。

## Error List

### E1: category.ts:7 — `CreateCategoryDTO` unused import
- Remove unused type import

### E2: editor.ts:2 — `onScopeDispose` unused import
- Remove unused import from `vue`

### F1: repository.ts:118 — `Partial<T>` vs Dexie `UpdateSpec`
- Dexie v4 `Table.update()` signature changed, no longer accepts `Partial<T>` directly
- Fix: Import `UpdateSpec` type from Dexie or use type assertion

### F2: repository.ts:204 — `PaginationOptions` vs `Record<string, unknown>`
- `logger.error` third param expects `Record<string, unknown>`
- `PaginationOptions` interface lacks index signature
- Fix: Use spread `{ ...options }` or type assertion

### F3: parser/index.ts:24 — `calculateScore` unused import
- Import and re-export on separate lines
- Fix: Merge to `export { calculateScore } from './extractor'`

## Acceptance Criteria
- [ ] `npx vue-tsc --noEmit 2>&1 | grep -E "(category|editor\.ts|repository|parser)"` returns zero output
- [ ] No new `any` types introduced
- [ ] Dexie CRUD operations still work
- [ ] Parser scoring functionality preserved

## Technical Notes
- Files: `inkforge/src/stores/category.ts`, `inkforge/src/stores/editor.ts`, `inkforge/src/services/repository.ts`, `inkforge/src/services/parser/index.ts`

---

## Closeout evidence - 2026-07-05

This TypeScript repair task is closed by current repository verification:

- Command run from `D:/Desktop/Inkforge`: `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`.
- Result: exit code `0` with no TypeScript diagnostics.
- Because no source code changed in this closeout slice, no new `any` types or runtime behavior changes were introduced here.
- The original error paths recorded in this PRD are therefore absent from the current strict type-check output.

No product source code changes are required for this closeout; this archive records that the current codebase already satisfies the task acceptance criteria.
