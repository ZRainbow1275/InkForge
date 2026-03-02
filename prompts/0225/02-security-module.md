# 模块 B：安全模块 (security/) 修复方案

## 错误清单

### B1: html-sanitizer.ts:207 — 标签数组类型不匹配
- **根因**: `HTML_SECURITY.SAFE_TAGS` 是 `as const` 的只读元组，扩展运算符后变成 `string[]`，不能赋值给 DOMPurify 期望的字面量联合类型数组。
- **修复**: 将 `allowedTags` 声明为 `string[]` 类型，并在赋值给 DOMPurify 时使用类型断言

### B2-B3: html-sanitizer.ts:219-220 — `'style'` 不在安全属性列表中
- **根因**: `HTML_SECURITY.SAFE_ATTRS` 的联合类型不包含 `'style'`（出于安全考虑不在默认白名单中），但代码逻辑中会动态添加。`includes` 和 `push` 操作需要兼容。
- **修复**: 将 `allowedAttrs` 声明为 `string[]` 类型

### B4: html-sanitizer.ts:225 — 属性数组类型不匹配
- **根因**: 同 B1，扩展运算符将 readonly 元组转为 `string[]`
- **修复**: 与 B1 统一处理

### B5-B6: policy-manager.ts:271,273 — `SecurityAuditEvent` 类型不兼容
- **根因**: `logger.warn/debug` 的第二个参数期望 `Record<string, unknown>`，但 `SecurityAuditEvent` 是 interface 没有 index signature。
- **修复**: 传参时使用 `{ ...event }` 展开或添加 `as Record<string, unknown>` 断言

### B7: security.ts:434 — `true` 不能赋值给 `false`
- **根因**: `PASSWORD_POLICY` 用 `as const` 声明，`REQUIRE_SPECIAL` 的类型是字面量 `false`。`getPasswordPolicy()` 返回 `typeof PASSWORD_POLICY`，展开后试图将 `REQUIRE_SPECIAL: true` 赋给 `false` 类型。
- **修复**: 修改返回类型或使用类型断言。最佳方案是让 `getPasswordPolicy` 返回更宽泛的类型接口。

## 验证

```bash
npx vue-tsc --noEmit 2>&1 | grep "security"
# 期望：零输出
```
