---
id: 48-session-restore-spec
title: SessionRestore — 会话恢复规范
version: 1.0.0
status: draft
created: 2026-04-21
source_decisions:
  - S-15=D（每标签完整状态 + 账户/工作区隔离，恢复延迟优于 Word/Office，降级不触及正文）
  - N-04=D（TabBar 增强，含 Tab 顺序/固定状态）
  - W-03=C（布局随编辑模式记忆）
  - X-11=C（灾难恢复：文章不能丢）
related_specs:
  - 45-tabbar-enhancement-spec.md
  - 35-split-view-spec.md
  - 38-toc-system-spec.md
---

# SessionRestore — 会话恢复规范

## 1. 概述与设计意图

会话恢复（SessionRestore）系统确保用户关闭并重新打开 InkForge 后，能够精确回到上次工作状态。

核心性能要求（来自 S-15=D 补充）：

> "恢复延迟必须要优于 Microsoft Word 以及 Office 类软件，降级不可以触及正文内容"

这确立了两条硬性约束：

1. **速度**：恢复流程必须快于 Word 的会话恢复体验（≤ 2 秒内完成 Tab 列表渲染）
2. **安全**：任何降级策略（文档缺失、数据损坏）都不能以删除或替换正文内容为代价

设计哲学：**先渲染骨架，再补充细节**。用户看到的第一帧是完整的 Tab 列表和布局，文档内容异步填充。

---

## 2. 会话记录的内容（完整状态）

### 2.1 全局会话状态

```typescript
interface SessionState {
  version: number;                    // schema 版本，用于迁移
  accountId: string;                  // 会话归属账户
  workspaceId: string | null;         // 会话归属工作区（若有）
  createdAt: number;                  // 会话写入时间戳
  tabs: SessionTab[];                 // Tab 列表（有序，固定 Tab 在前）
  activeTabId: string | null;         // 当前活跃 Tab ID
  pinnedTabIds: string[];             // 固定 Tab 的 docId 列表
  editorMode: 'typora' | 'source' | 'preview'; // 全局编辑模式
  sidebarState: SessionSidebarState;  // 左侧 Sidebar 状态
  splitViewState: SessionSplitViewState; // 分栏状态（见 35 规范）
  tocExpandedIds: string[];           // TOC 手动展开的节点 ID 列表
}
```

### 2.2 单个 Tab 状态

```typescript
interface SessionTab {
  tabId: string;                      // Tab 唯一 ID
  docId: string;                      // 对应文档 ID
  scrollPosition: number;             // 编辑器滚动位置（scrollTop，像素）
  cursorPos: number | null;           // ProseMirror 光标位置（文档内偏移）
  selectionFrom: number | null;       // 选区起始（若有）
  selectionTo: number | null;         // 选区结束（若有）
  foldedSections: string[];           // 折叠的章节 heading ID 列表（若支持折叠）
  previewScrollPosition: number;      // 右栏 Preview 的滚动位置
  fontScale: number;                  // 该 Tab 的字体缩放系数
  lastAccessedAt: number;             // 最后访问时间戳（用于 LRU 排序）
}
```

### 2.3 Sidebar 状态

```typescript
interface SessionSidebarState {
  visible: boolean;                   // 是否可见
  width: number;                      // 当前宽度（px）
  activeTab: 'files' | 'toc' | 'history'; // 当前激活的 Sidebar Tab
}
```

### 2.4 分栏视图状态

复用 `LayoutSplitViewState`（见 35-split-view-spec.md 第 10 节），完整记录。

---

## 3. 存储机制

### 3.1 存储位置

存储于 **IndexedDB** 的 `session_state` 表，键为 `accountId + workspaceId`（复合键）。

使用 Dexie.js 操作（与其他 IndexedDB 操作一致）：

```typescript
// schema 定义
db.version(N).stores({
  session_state: '[accountId+workspaceId], createdAt',
});

// 读取
const session = await db.session_state.get([accountId, workspaceId]);

// 写入
await db.session_state.put(sessionState);
```

### 3.2 为什么选择 IndexedDB 而非 localStorage

| 比较维度 | localStorage | IndexedDB |
|---------|-------------|-----------|
| 存储上限 | 5MB（各浏览器不同） | 通常 ≥ 50MB |
| 写入方式 | 同步（阻塞主线程） | 异步 |
| 结构化数据 | 需序列化/反序列化 | 原生支持 |
| 账户隔离 | 需手动前缀管理 | 复合索引天然隔离 |

Tab 状态可能包含多个文档的滚动位置、折叠状态等，数据量超过 localStorage 可靠上限，因此选择 IndexedDB。

---

## 4. 写入时机

### 4.1 定时写入

每 **30 秒**后台写入一次（若 30 秒内有状态变化）：

```typescript
const SESSION_WRITE_INTERVAL = 30_000; // ms

function startSessionPersistence(): void {
  setInterval(async () => {
    if (sessionStore.isDirty) {
      await sessionStore.persist();
      sessionStore.isDirty = false;
    }
  }, SESSION_WRITE_INTERVAL);
}
```

`isDirty` 由任何状态变化（Tab 切换、滚动、光标移动等）置为 `true`。

### 4.2 窗口关闭前写入（beforeunload）

```typescript
window.addEventListener('beforeunload', () => {
  // 使用同步写入（Dexie 的 queueMicrotask 可能来不及）
  // 改用 navigator.sendBeacon 或 Tauri 的 onBeforeClose 事件
  sessionStore.persistSync(); // 同步序列化 + 写入
});
```

在 Tauri 环境下，使用 `onBeforeClose` 事件（Tauri 提供，比 `beforeunload` 更可靠）：

```typescript
import { onBeforeClose } from '@tauri-apps/api/window';

await onBeforeClose(async () => {
  await sessionStore.persist();
  return false; // 允许窗口关闭
});
```

### 4.3 触发状态更新的事件

以下事件触发 `isDirty = true`（不立即写入，等待 30s 定时或关闭时写入）：

- Tab 切换
- 新 Tab 打开 / 关闭
- Tab 排序变化（拖拽）
- Tab 固定 / 取消固定
- 编辑器滚动位置变化（throttle 5s，避免过频）
- 编辑器模式切换
- Sidebar 状态变化
- 分栏状态变化

---

## 5. 读取与恢复时机

### 5.1 启动时序

```
应用启动
  ↓
useSessionStore.init()
  ↓
从 IndexedDB 读取 session_state（async）
  ↓
渲染 Tab 列表骨架（仅 Tab 标题，无内容）← 第一帧，目标 < 500ms
  ↓
恢复全局布局（Sidebar、分栏、编辑模式）
  ↓
激活 activeTab（加载并渲染其文档内容）← 主路径，目标 < 1500ms
  ↓
后台异步加载其余 Tab 的文档内容（懒加载）← 后台，不阻塞
  ↓
恢复 activeTab 的滚动位置和光标位置
```

### 5.2 第一帧目标

用户打开应用后，**500ms 内**必须能看到：

- 完整的 TabBar（Tab 标题、固定状态）
- Sidebar 布局（宽度、可见性、激活 Tab）
- 分栏布局骨架

文档内容在 **1500ms 内**完成主文档（activeTab）的加载和渲染。

其余 Tab 的文档内容可延迟到主文档渲染完成后开始加载。

---

## 6. 恢复策略细节

### 6.1 活跃 Tab 优先加载

```typescript
async function restoreSession(session: SessionState): Promise<void> {
  // 1. 立即渲染 Tab 列表骨架
  tabStore.setTabsSkeleton(session.tabs);

  // 2. 恢复全局布局
  layoutStore.restore(session.sidebarState, session.splitViewState);
  editorStore.setMode(session.editorMode);

  // 3. 优先加载 activeTab
  if (session.activeTabId) {
    await loadTabContent(session.activeTabId, session);
    tabStore.setActiveTab(session.activeTabId);
  }

  // 4. 后台懒加载其余 Tab
  const otherTabs = session.tabs.filter(t => t.tabId !== session.activeTabId);
  for (const tab of otherTabs) {
    // 利用 requestIdleCallback 在浏览器空闲时加载
    requestIdleCallback(() => loadTabContent(tab.tabId, session));
  }
}
```

### 6.2 文档加载后恢复光标和滚动

```typescript
async function restoreTabViewState(
  editor: Editor,
  tab: SessionTab,
  scrollContainer: HTMLElement
): Promise<void> {
  // 等待编辑器内容加载完成
  await nextTick();

  // 恢复光标位置
  if (tab.cursorPos !== null) {
    const docSize = editor.state.doc.content.size;
    const safePos = Math.min(tab.cursorPos, docSize - 1);
    editor.commands.setTextSelection(safePos);
  }

  // 恢复滚动位置
  scrollContainer.scrollTop = tab.scrollPosition;
}
```

### 6.3 文档已删除的处理

恢复 Tab 时，若对应文档在数据库中不存在（已删除）：

1. 从 Tab 列表中移除该 Tab（不创建空 Tab）
2. Toast 提示："文档"{标题}"已被删除，已从标签栏移除"
3. 若被删除的是 activeTab，切换到相邻 Tab（右侧优先，无则左侧）

**严禁**因文档删除清空其他 Tab 的内容（降级不触及正文原则）。

### 6.4 数据损坏的处理

读取 `session_state` 时若 JSON 解析失败或字段缺失：

1. 使用默认值（空 Tab 列表，默认布局）启动
2. Toast 警告："上次会话状态恢复失败，已使用默认布局"
3. 不抛出异常，不阻断启动流程

---

## 7. 配置项

位于 Settings > 通用 > 启动行为：

| 配置项 | 控件 | 默认值 | 说明 |
|--------|------|--------|------|
| 启动时恢复上次会话 | Toggle | 开启 | 关闭后，启动时进入空白状态 |
| 每次启动恢复的最大 Tab 数 | Input（数字） | 20 | 超出时，保留最近访问的 N 个 Tab |

---

## 8. 账户与工作区隔离

每个 `(accountId, workspaceId)` 对应独立的 `session_state` 记录：

- 切换账户时，读取新账户的 `session_state`（之前账户的会话状态保留，不清除）
- 切换工作区时，同理，工作区级别隔离

若 `workspaceId` 为 `null`（未使用工作区），键为 `(accountId, '')`。

---

## 9. 与灾难恢复的协同（X-11=C）

`session_state` 是会话恢复的数据源，`CrashRecovery`（17-crash-recovery-spec）是异常退出的恢复机制。两者协同：

| 场景 | 主要机制 | 辅助机制 |
|------|---------|---------|
| 正常关闭 + 重开 | SessionRestore（beforeunload 写入） | — |
| 崩溃后重开 | CrashRecovery（localStorage 紧急保存） | SessionRestore（30s 快照） |
| 数据库损坏 | DataIntegrity（安全模式） | 空白状态启动 |

崩溃恢复成功后，SessionRestore 更新 `session_state` 为恢复后的正确状态，避免下次启动再次进入恢复向导。

---

## 10. 组件文件结构

```
src/services/session-store/
├── SessionStore.ts              # 主服务（读写 IndexedDB）
├── session-serializer.ts        # 状态序列化/反序列化
├── session-migrator.ts          # schema 版本迁移
└── session-validator.ts         # 字段完整性校验

src/composables/
├── useSessionRestore.ts         # 恢复流程编排（启动时调用）
└── useSessionPersistence.ts     # 定时写入 + beforeunload 写入

src/stores/
└── sessionStore.ts              # Pinia store（isDirty 标记、当前 session）
```

---

## 11. 测试矩阵

| # | 测试场景 | 预期结果 | 优先级 |
|---|---------|---------|--------|
| 1 | 正常关闭后重开应用 | 500ms 内 Tab 列表出现，1500ms 内主文档内容恢复 | P0 |
| 2 | 多 Tab 状态恢复 | 所有 Tab 标题正确，顺序正确，固定 Tab 在左侧 | P0 |
| 3 | 活跃 Tab 内容优先加载 | 活跃 Tab 文档内容先渲染，其余 Tab 后台加载 | P0 |
| 4 | 滚动位置恢复 | 主文档恢复后 scrollTop 与关闭前一致 | P0 |
| 5 | 光标位置恢复 | 光标恢复到关闭前位置 | P1 |
| 6 | 分栏状态恢复 | 分栏布局、比例、右栏模式全部正确 | P0 |
| 7 | Sidebar 状态恢复 | 可见性、宽度、激活 Tab 正确 | P0 |
| 8 | 文档已删除场景 | 对应 Tab 被移除，Toast 提示，其余 Tab 正常 | P0 |
| 9 | 多个文档已删除 | 每个删除文档独立 Toast，主 Tab 正确切换 | P1 |
| 10 | session_state 数据损坏 | 空白状态启动，Toast 警告，无崩溃 | P0 |
| 11 | 账户切换后会话隔离 | 账户 A 和账户 B 各自恢复独立状态 | P0 |
| 12 | Settings 关闭会话恢复 | 重开后进入空白状态（无 Tab） | P1 |
| 13 | 30s 定时写入验证 | 修改状态后 30s 内写入 IndexedDB（可通过 DevPanel 验证） | P1 |
| 14 | beforeunload 写入验证 | 关闭前最后状态（含 1s 内的滚动）正确恢复 | P0 |
| 15 | 20+ Tab 数量场景 | 全部恢复，不超过 Settings 配置上限 | P1 |

---

## 12. 性能要求

| 指标 | 要求 | 说明 |
|------|------|------|
| IndexedDB 读取延迟 | < 100ms | session_state 单条记录读取 |
| Tab 列表骨架渲染 | < 500ms（含读取） | 用户第一帧看到 Tab 列表 |
| 主文档加载 + 渲染 | < 1500ms | 优于 Word/Office 恢复体验 |
| 其余 Tab 懒加载 | 不阻塞主线程 | 利用 requestIdleCallback |
| beforeunload 写入 | < 500ms | 不触发"页面未响应"警告 |

---

## 13. 验收标准

- [ ] P0 测试矩阵全部通过，附时间戳截图（Tab 列表出现时间 < 500ms）
- [ ] 主文档恢复演示视频（时间轴标注各阶段完成时刻）
- [ ] 账户隔离测试截图（账户 A/B 各自正确恢复）
- [ ] 文档删除场景截图（Toast 提示 + 其余 Tab 不受影响）
- [ ] 数据损坏降级测试（手动破坏 IndexedDB 记录后验证）
- [ ] beforeunload 写入测试（1 秒内改动后立即关闭，验证恢复准确）

---

*本文档生成于 2026-04-21，依据 S-15/N-04/W-03 决策及 InkForge Ethereal Constructivism 设计语汇。*

---

## 14. 会话状态 schema 迁移

### 14.1 schema 版本化

`session_state.version` 字段记录当前 schema 版本（整数，从 1 开始）。

读取时若版本低于当前代码期望的版本，调用 `SessionMigrator.migrate(session, fromVersion)`：

```typescript
class SessionMigrator {
  migrate(raw: Partial<SessionState>, fromVersion: number): SessionState {
    let state = raw as SessionState;
    if (fromVersion < 2) state = this.migrateV1toV2(state);
    if (fromVersion < 3) state = this.migrateV2toV3(state);
    return state;
  }

  private migrateV1toV2(state: SessionState): SessionState {
    // V1 → V2：新增 splitViewState 字段（默认值）
    return {
      ...state,
      splitViewState: { enabled: false, ratio: 0.5, rightMode: 'preview', syncScrollEnabled: true },
    };
  }
}
```

迁移失败时降级到空白状态启动（同数据损坏处理路径）。

### 14.2 字段向后兼容

新增字段始终提供默认值，绝不要求旧版数据包含新字段（防御性读取）：

```typescript
const syncScrollEnabled = session.splitViewState?.syncScrollEnabled ?? true;
```

---

## 15. 多标签会话恢复的性能优化

### 15.1 懒加载文档内容

除 activeTab 外，其余 Tab 的文档内容**不在启动时加载**。Tab 骨架（标题、脏标记状态）立即渲染，内容等用户切换到该 Tab 时才从 IndexedDB 读取。

```typescript
// 用户切换到某 Tab 时
async function activateTab(tabId: string): Promise<void> {
  const tab = tabStore.getTab(tabId);
  if (!tab.contentLoaded) {
    await loadTabContent(tabId);
    tab.contentLoaded = true;
  }
  tabStore.setActiveTab(tabId);
}
```

### 15.2 预加载策略

activeTab 加载完成后，利用 `requestIdleCallback` 按"最近访问时间"顺序预加载最多 3 个非活跃 Tab 的内容，提升用户切换速度：

```typescript
requestIdleCallback(() => {
  const preloadCandidates = tabStore.tabs
    .filter(t => !t.contentLoaded && t.tabId !== activeTabId)
    .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
    .slice(0, 3);
  preloadCandidates.forEach(t => loadTabContent(t.tabId));
});
```

### 15.3 IndexedDB 批量读取

若需同时加载多个文档，使用 Dexie 的 `bulkGet` 而非逐条读取：

```typescript
const docs = await db.articles.bulkGet(docIds);
```

---

## 16. 与 AutoSave 的协同

SessionRestore 的滚动位置写入（每 30s）和 AutoSave 的文档内容写入是**独立的两条数据流**：

- AutoSave 写入 `articles.content`（文档正文）
- SessionRestore 写入 `session_state`（位置、布局等元数据）

两者不互相阻塞，可并发执行（IndexedDB 支持并发事务）。

崩溃场景下，`articles.content` 由 CrashRecovery 的 `beforeunload` 紧急保存保护，`session_state` 的 30s 快照提供位置参考。即使 `session_state` 落后 30s，正文内容也已由 AutoSave 保护（两者独立互补）。

---

## 17. 国际化（i18n）文本 key

| Key | 中文值 |
|-----|--------|
| `session.restoreFailed` | 上次会话状态恢复失败，已使用默认布局 |
| `session.docDeleted` | 文档"{title}"已被删除，已从标签栏移除 |
| `session.restoring` | 正在恢复上次会话… |

---

## 18. 实现优先级

### Phase 1（核心）

- IndexedDB `session_state` 表设计
- Tab 列表 + activeTabId 写入 / 读取
- beforeunload 写入
- activeTab 优先加载
- 文档删除降级处理

### Phase 2（完整功能）

- 完整 SessionTab 字段（光标位置、滚动位置、分栏状态）
- 账户/工作区隔离键
- 30s 定时写入
- schema 版本迁移（SessionMigrator）
- Settings 开关（启动时恢复上次会话）

### Phase 3（细化）

- 非活跃 Tab 预加载（requestIdleCallback 3 条）
- 超过 maxTabs 时 LRU 截断（恢复时只恢复最近 maxTabs 条）
- 会话恢复进度指示（启动时骨架阶段显示 loading 文案）
