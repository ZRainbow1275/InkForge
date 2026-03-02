# InkForge 技术债整改总览

## 日期：2025-02-25
## 状态：进行中

---

## 错误清单（22个 TypeScript 编译错误）

### 模块 A：加密模块 (crypto/) — 6 个错误
| 文件 | 行号 | 错误码 | 描述 |
|------|------|--------|------|
| key-management.ts | 12 | TS6133 | `CRYPTO_SECURITY` 导入未使用 |
| key-management.ts | 13 | TS6133 | `ENABLE_ENCRYPTION` 导入未使用 |
| key-management.ts | 18 | TS6133 | `getCachedWrappingKey` 导入未使用 |
| sensitive-fields.ts | 11 | TS6196 | `EncryptedData` 类型导入未使用 |
| sensitive-fields.ts | 11 | TS6196 | `UnencryptedData` 类型导入未使用 |
| sensitive-fields.ts | 81 | TS2349 | 表达式不可调用（`void` 类型无调用签名）|

### 模块 B：安全模块 (security/) — 6 个错误
| 文件 | 行号 | 错误码 | 描述 |
|------|------|--------|------|
| html-sanitizer.ts | 207 | TS2322 | `string[]` 不能赋值给标签联合类型数组 |
| html-sanitizer.ts | 219 | TS2345 | `'style'` 不在属性联合类型中 |
| html-sanitizer.ts | 220 | TS2345 | `'style'` 不在属性联合类型中 |
| html-sanitizer.ts | 225 | TS2322 | `string[]` 不能赋值给属性联合类型数组 |
| policy-manager.ts | 271 | TS2345 | `SecurityAuditEvent` 不能赋值给 `Record<string, unknown>` |
| policy-manager.ts | 273 | TS2345 | `SecurityAuditEvent` 不能赋值给 `Record<string, unknown>` |
| security.ts | 434 | TS2322 | `true` 不能赋值给 `false` 类型 |

### 模块 C：平台类型 (platform.ts) — 2 个错误
| 文件 | 行号 | 错误码 | 描述 |
|------|------|--------|------|
| platform.ts | 93 | TS2687 | `__TAURI__` 声明修饰符不一致 |
| platform.ts | 93 | TS2717 | `__TAURI__` 后续声明类型不同 |

### 模块 D：编辑器组件 — 2 个错误
| 文件 | 行号 | 错误码 | 描述 |
|------|------|--------|------|
| EditorPanel.vue | 81 | TS2322 | `Extension<any,any>` 不可赋值给 `AnyExtension` |
| MarkdownEditor.vue | 69 | TS2322 | `ready` 事件回调签名不匹配 |

### 模块 E：Store 清理 — 2 个错误
| 文件 | 行号 | 错误码 | 描述 |
|------|------|--------|------|
| category.ts | 7 | TS6133 | `CreateCategoryDTO` 导入未使用 |
| editor.ts | 2 | TS6133 | `onScopeDispose` 导入未使用 |

### 模块 F：Repository + Parser — 3 个错误
| 文件 | 行号 | 错误码 | 描述 |
|------|------|--------|------|
| repository.ts | 118 | TS2345 | `Partial<T>` 不能赋值给 Dexie `UpdateSpec<T>` |
| repository.ts | 204 | TS2345 | `PaginationOptions` 不能赋值给 `Record<string, unknown>` |
| parser/index.ts | 24 | TS6133 | `calculateScore` 导入未使用 |

---

## 修复策略

每个模块对应一份详细修复文档（01-06），包含：
1. 根因分析
2. 修复方案（精确到行号）
3. 验证标准

## 验证标准

- `npx vue-tsc --noEmit` 零错误
- 所有现有功能不受影响
- 无新增 `any` 类型
