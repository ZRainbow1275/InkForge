# 模块 E & F：Store/Repository/Parser 清理

## Store 清理

### E1: category.ts:7 — `CreateCategoryDTO` 未使用
- **根因**: 类型 import 在代码中未引用
- **修复**: 移除未使用的导入

### E2: editor.ts:2 — `onScopeDispose` 未使用
- **根因**: 从 `vue` 导入但未在 store 中使用
- **修复**: 移除未使用的导入

## Repository 类型

### F1: repository.ts:118 — `Partial<T>` vs Dexie `UpdateSpec`
- **根因**: Dexie v4 的 `Table.update()` 方法签名变更，不再直接接受 `Partial<T>`
- **修复**: 使用类型断言 `as any`（Dexie 运行时兼容）或导入 `UpdateSpec` 类型

### F2: repository.ts:204 — `PaginationOptions` vs `Record<string, unknown>`
- **根因**: `logger.error` 第三个参数期望 `Record<string, unknown>`，而 `PaginationOptions` interface 缺少 index signature
- **修复**: 使用展开运算符 `{ ...options }` 或类型断言

## Parser 清理

### F3: parser/index.ts:24 — `calculateScore` 未使用
- **根因**: `calculateScore` 已经在 line 28 通过 `export { calculateScore }` 重新导出，但 line 24 的 import 被标记为未使用（因为不是直接引用而是 re-export）
- **修复**: 将 import 和 export 合并为 `export { calculateScore } from './extractor'`

## 验证

```bash
npx vue-tsc --noEmit 2>&1 | grep -E "(category|editor\.ts|repository|parser)"
# 期望：零输出
```
