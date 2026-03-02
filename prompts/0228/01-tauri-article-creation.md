# 01 - Tauri 文章创建修复

## 问题描述

在 Tauri 桌面端环境下，点击「新建文章」按钮无法成功创建文章，但在 Web (`pnpm dev`) 环境下运行正常。

## 根因分析方向

### 1. `crypto.randomUUID()` 可用性
- Tauri WebView 可能未处于 Secure Context（取决于协议和配置）
- `crypto.randomUUID()` 仅在 Secure Context 下可用
- 需要检查 `tauri.conf.json` 中的协议配置

### 2. FileManager 组件事件链
```
FileManager (UI) → articleStore.addArticle() → Dexie create() → articleStore.selectArticle()
                                                                → editorStore watches selectedArticleId
                                                                → loads/creates EditedContent
```
- 确认 FileManager.vue 中 `addArticle` 的调用是否正确触发
- 确认 Tauri 环境下 Dexie 初始化是否正常

### 3. IndexedDB 在 Tauri 中的行为
- Tauri 使用 WRY WebView，底层为系统 WebView2 (Windows) / WebKit (macOS/Linux)
- 需要确认 IndexedDB 在 Tauri WebView 中的可用性和持久化策略

## 调查步骤

### Step 1: 确认错误
```typescript
// 在 articleStore.addArticle() 中添加显式错误捕获
async addArticle(dto: CreateArticleDTO) {
  try {
    const validated = CreateArticleDTOSchema.parse(dto)
    const id = crypto.randomUUID()
    // ...
  } catch (error) {
    console.error('[ArticleStore] addArticle failed:', error)
    throw error // 确保错误冒泡
  }
}
```

### Step 2: 检查 crypto.randomUUID 可用性
```typescript
// 在 main.ts 或 App.vue onMounted 中
if (typeof crypto?.randomUUID !== 'function') {
  console.warn('crypto.randomUUID not available, using fallback')
}
```

### Step 3: 添加 UUID 回退方案
```typescript
// utils/uuid.ts
export function generateId(): string {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // RFC4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
```

## 修改文件清单

### 需要创建
| 文件 | 说明 |
|------|------|
| `src/utils/uuid.ts` | UUID 生成工具，含 fallback |

### 需要修改
| 文件 | 修改内容 |
|------|----------|
| `src/stores/article.ts` | 替换 `crypto.randomUUID()` 为 `generateId()` |
| `src/stores/editor.ts` | 替换 `crypto.randomUUID()` 为 `generateId()` |
| `src/components/file/FileManager.vue` | 添加错误处理和 loading 态 |
| `src/utils/db.ts` | 添加 Dexie 初始化健壮性检查 |
| `src-tauri/tauri.conf.json` | 确认 security 配置允许 IndexedDB |

### 依赖添加
- 无新依赖

## 验证标准

1. Tauri 桌面端可以成功创建新文章
2. 创建后文章出现在文件列表中
3. 创建后编辑器自动加载新文章
4. 重启应用后文章持久化存在
5. Web 端功能不受影响（回归测试）
6. 无 `console.error` 或未捕获异常

## 优先级

**P0** — 基础功能阻断，影响所有桌面端用户
