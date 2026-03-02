# 模块 A：加密模块 (crypto/) 修复方案

## 错误清单

### A1: key-management.ts:12 — `CRYPTO_SECURITY` 未使用
- **根因**: `CRYPTO_SECURITY` 从 `@/config/security` 导入但未在代码中引用。密码验证使用的是 `assertPasswordValid`，加密配置使用的是本模块的 `CRYPTO_CONFIG`。
- **修复**: 从 import 语句中移除 `CRYPTO_SECURITY`

### A2: key-management.ts:13 — `ENABLE_ENCRYPTION` 未使用
- **根因**: `ENABLE_ENCRYPTION` 从 `./config` 导入但在 key-management 模块中未引用。加密启用检查在 sensitive-fields.ts 中使用。
- **修复**: 从 import 语句中移除 `ENABLE_ENCRYPTION`

### A3: key-management.ts:18 — `getCachedWrappingKey` 未使用
- **根因**: `getCachedWrappingKey` 从 lifecycle 导入但未在 key-management 中直接调用。只使用了 `setCachedWrappingKey`。
- **修复**: 从 import 语句中移除 `getCachedWrappingKey`

### A4-A5: sensitive-fields.ts:11 — `EncryptedData`/`UnencryptedData` 类型未使用
- **根因**: 这两个类型只用于 `isEncryptedData()` 和 `isUnencryptedData()` 类型守卫的返回值推断，不需要显式导入。
- **修复**: 从 import type 语句中移除这两个类型

### A6: sensitive-fields.ts:81 — 表达式不可调用
- **根因**: `isUnencryptedData` 可能返回 `void` 而非 `boolean`，需要检查其实现。
- **修复**: 需要读取 types.ts 确认 `isUnencryptedData` 的函数签名

## 验证

```bash
npx vue-tsc --noEmit 2>&1 | grep "crypto"
# 期望：零输出
```
