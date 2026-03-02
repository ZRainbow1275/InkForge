# 模块 C：平台类型 (platform.ts) 修复方案

## 错误清单

### C1-C2: platform.ts:93 — `__TAURI__` 声明冲突
- **根因**: `platform.ts` 中的 `declare global { interface Window { __TAURI__?: ... } }` 与 `@tauri-apps/api` 或 `vite-env.d.ts` 中的现有声明冲突。两次声明的类型结构不同：
  - 已有声明: `{ convertFileSrc: ... }`
  - 本文件声明: `{ invoke: ... } | undefined`
- **修复**: 合并为统一的 Tauri Window 类型声明，同时包含 `invoke` 和 `convertFileSrc`。或者移除自定义声明，依赖 `@tauri-apps/api` 提供的类型。

## 修复方案

检查 `vite-env.d.ts` 中是否已有 `__TAURI__` 声明，然后：

**方案 A（推荐）**: 移除 platform.ts 底部的 declare global，改用 `(window as any).__TAURI__` 的类型安全封装
**方案 B**: 创建统一的 `tauri.d.ts` 声明文件

## 验证

```bash
npx vue-tsc --noEmit 2>&1 | grep "platform"
# 期望：零输出
```
