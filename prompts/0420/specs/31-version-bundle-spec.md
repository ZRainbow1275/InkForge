> 版本: v2.1 | 状态: Draft | 关联决策: L1-17, L1-18, L1-19, EX-05 | 依赖 Spec: 17-crash-recovery-spec.md, 11-document-lifecycle-spec.md

# Spec 31 — 版本历史与版本包（VersionBundle）

---

## 目录

1. 概述与设计目标
2. 架构总览
3. TypeScript 类型系统
4. 版本快照策略
5. 版本数据模型（Schema）
6. 版本列表 UI
7. Diff 视图
8. 版本恢复
9. 里程碑（Milestone）
10. 存储策略与清理
11. 版本导出
12. Store 定义
13. Repository 定义
14. 键盘交互
15. 测试矩阵

---

## 1. 概述与设计目标

版本历史与版本包（VersionBundle）为 InkForge 文档提供完整的版本控制能力。每次快照生成一个不可变的版本记录，用户可通过时间轴 UI 浏览历史、查看 diff、有选择地恢复内容。

### 1.1 核心能力

- 自动触发快照（手动保存 / 5min 定时 / 关闭前 / 模式切换前）
- 版本时间轴 UI（按日期分组）
- Side-by-side Markdown diff（diff-match-patch 行级高亮）
- 双栏 diff/merge 视图恢复（铁律 6：恢复不直接覆盖，必须让用户决策）
- Milestone 标记（永久保留的重要版本点）
- 存储清理（最近 100 版或最近 30 天，Milestone 永久保留）
- 版本导出（下载 `.md` 文件）

### 1.2 产品铁律约束

- **铁律 6**（L1-18 D）：恢复版本必须走 diff/merge 双栏视图，不允许直接覆盖当前内容。
- **铁律 7**（L1-19 D）：自动保存失败时强制创建本地恢复点，失败完全可见 + 日志留痕。
- 版本数量：用户设置无上限（L1-17 C 补充），清理策略以内存占比和用户警告为主。

### 1.3 UI 位置

版本历史面板作为左侧 Sidebar 的一个 Tab（与文件管理器、TOC 并列，W-01 A + W-02 D 补充）。

---

## 2. 架构总览

```
VersionBundle
├── VersionRepository           — 数据访问层
├── useVersionStore             — Pinia Store
│
├── AutoSaveService             — 自动快照触发器
│   ├── ManualSaveTrigger       — Ctrl+S 触发
│   ├── IntervalTrigger         — 5min 定时触发（有变更时）
│   ├── BeforeCloseTrigger      — 文档关闭前触发
│   └── ModeSwitchTrigger       — 编辑模式切换前触发
│
├── VersionPanel                — 左侧 Sidebar 版本历史面板
│   ├── VersionTimeline         — 时间轴（日期分组）
│   │   └── VersionItem         — 单条版本记录
│   └── MilestoneLabel          — 里程碑标签
│
├── VersionDiffView             — Diff 视图（Modal 或 Split 面板）
│   ├── DiffToolbar             — 顶部工具栏（导航/关闭）
│   ├── HistorySide             — 左侧：历史版本
│   └── CurrentSide             — 右侧：当前版本（可编辑）
│
└── MilestoneDialog             — 里程碑标签输入弹窗
```

---

## 3. TypeScript 类型系统

```typescript
// src/types/version.ts

/** 版本记录 */
export interface Version {
  id: string;
  docId: string;
  /** 完整 Markdown 内容快照 */
  content: string;
  /** 可选：HTML 渲染快照（用于快速预览） */
  htmlSnapshot?: string;
  /** 字符增量（正数为新增，负数为删减） */
  deltaChars: number;
  /** 字数（快照时刻的纯文本字数） */
  wordCount: number;
  /** 里程碑标签（可选） */
  label?: string;
  /** 是否为里程碑（Milestone），里程碑不参与自动清理 */
  isMilestone: boolean;
  /** 触发原因 */
  trigger: VersionTrigger;
  authorId: string;
  createdAt: string;
}

/** 快照触发原因 */
export type VersionTrigger =
  | 'manual_save'      // Ctrl+S
  | 'interval'         // 定时触发
  | 'before_close'     // 关闭前
  | 'mode_switch'      // 编辑模式切换
  | 'crash_recovery';  // 崩溃恢复

/** 版本列表项（轻量，不含完整 content） */
export interface VersionListItem {
  id: string;
  deltaChars: number;
  wordCount: number;
  label?: string;
  isMilestone: boolean;
  trigger: VersionTrigger;
  createdAt: string;
  /** 距上一版本的时间间隔（毫秒） */
  elapsed?: number;
}

/** Diff 操作类型 */
export type DiffOpType = 'equal' | 'insert' | 'delete';

/** diff-match-patch 行级 Diff 结果 */
export interface DiffLine {
  type: DiffOpType;
  content: string;
  lineNumber?: number;
}

/** Diff 计算结果 */
export interface DiffResult {
  leftLines: DiffLine[];
  rightLines: DiffLine[];
  stats: {
    added: number;
    deleted: number;
    modified: number;
  };
}

/** 版本恢复操作类型 */
export type RestoreMode = 'full' | 'selection';

/** 版本导出参数 */
export interface VersionExportParams {
  versionId: string;
  includeTimestamp: boolean;
  includeVersionLabel: boolean;
}

/** 存储使用统计 */
export interface VersionStorageStats {
  totalVersions: number;
  totalSizeBytes: number;
  oldestVersionAt: string;
  milestoneCount: number;
}

/** 清理配置 */
export interface VersionCleanupConfig {
  maxVersions: number;
  maxAgeDays: number;
  keepMilestones: boolean;
}
```

---

## 4. 版本快照策略

### 4.1 触发条件

| 触发器 | 条件 | 策略 |
|--------|------|------|
| 手动保存（Ctrl+S） | 用户主动触发 | 立即创建快照 |
| 定时触发 | 每 5 分钟，且有内容变更 | 有 diff 才创建快照 |
| 关闭前 | 文档标签页关闭 / 应用关闭前 | 若有未保存内容则创建快照 |
| 模式切换前 | Typora → Source → Preview 切换 | 若有未保存内容则创建快照 |
| 崩溃恢复 | 应用异常退出后恢复 | 恢复时创建快照（trigger='crash_recovery'） |

### 4.2 去重策略

若上一次快照与当前内容完全相同（字符级完全一致），则不创建新快照（避免重复存储）：

```typescript
async createVersionIfChanged(docId: string, content: string, trigger: VersionTrigger): Promise<Version | null> {
  const lastVersion = await this.getLatestVersion(docId);

  if (lastVersion && lastVersion.content === content) {
    return null; // 内容无变化，不创建快照
  }

  const deltaChars = lastVersion
    ? content.length - lastVersion.content.length
    : content.length;

  return this.createVersion({ docId, content, deltaChars, trigger });
}
```

### 4.3 定时触发实现

```typescript
// src/services/AutoSaveService.ts

class IntervalTrigger {
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  start(docId: string, getContent: () => string): void {
    const timer = setInterval(async () => {
      const content = getContent();
      await versionRepository.createVersionIfChanged(docId, content, 'interval');
    }, 5 * 60 * 1000); // 5 分钟

    this.timers.set(docId, timer);
  }

  stop(docId: string): void {
    const timer = this.timers.get(docId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(docId);
    }
  }
}
```

---

## 5. 版本数据模型（Schema）

### 5.1 IndexedDB Schema

```typescript
// versions 表
interface VersionRecord {
  id: string;           // uuid v4
  docId: string;        // 关联文档 id（索引）
  content: string;      // 完整 Markdown 内容
  htmlSnapshot?: string; // HTML 渲染（可选，延迟生成）
  deltaChars: number;   // 字符增量
  wordCount: number;    // 纯文本字数
  label?: string;       // 里程碑标签
  isMilestone: boolean; // 是否为里程碑
  trigger: string;      // VersionTrigger
  authorId: string;
  createdAt: string;    // ISO 8601
}
```

**索引**：
- `versions.docId`：按文档查历史（最频繁的查询）
- `versions.createdAt`：时间范围查询（清理策略）
- `versions.isMilestone`：快速获取所有里程碑

### 5.2 版本大小估算

| 文档规模 | 内容大小 | 100 个版本占用 |
|---------|---------|--------------|
| 1 万字 | ~20KB | ~2MB |
| 10 万字 | ~200KB | ~20MB |
| 50 万字 | ~1MB | ~100MB |

50 万字文档 100 个版本约 100MB，触发清理警告阈值（用户可配置）。

---

## 6. 版本列表 UI

### 6.1 时间轴视图

```
版本历史
  ━━━━━━━━━━━━━━━━━━━━━━━
  今天
  ─────────────────────
  ● [Milestone] v1.0 草稿完成       14:32
    +1,234 字  手动保存
  
  ○ 14:01  +89 字   定时保存
  
  ○ 13:30  -234 字  手动保存
  ─────────────────────
  昨天
  ─────────────────────
  ○ 18:45  +567 字  手动保存
  
  ○ 12:00  +100 字  关闭前保存
  ─────────────────────
  本周
  ─────────────────────
  ○ 周一 09:00  +3,456 字  手动保存
  ...
  ─────────────────────
  更早
  ─────────────────────
  ○ 2026-04-10  初始版本
```

### 6.2 VersionItem 组件

```vue
<template>
  <div class="version-item" :class="{ 'is-milestone': version.isMilestone }">
    <!-- 时间线圆点 -->
    <div class="version-item__dot" :class="{ 'milestone-dot': version.isMilestone }">
      <component :is="version.isMilestone ? Flag : Circle" :size="12" />
    </div>

    <!-- 版本信息 -->
    <div class="version-item__content" @click="openDiff">
      <div class="version-item__header">
        <span v-if="version.label" class="version-item__label">{{ version.label }}</span>
        <span class="version-item__time">{{ formatTime(version.createdAt) }}</span>
        <TriggerBadge :trigger="version.trigger" />
      </div>
      <div class="version-item__stats">
        <span :class="deltaClass">{{ deltaText }}</span>
        <span class="word-count">{{ version.wordCount }} 字</span>
      </div>
    </div>

    <!-- 操作菜单 -->
    <VersionItemMenu :version="version" @milestone="markMilestone" @restore="openRestore" @export="exportVersion" />
  </div>
</template>
```

**deltaText 格式**：
- `+1,234 字`（绿色）：新增
- `-234 字`（红色）：减少
- `=`（灰色）：无变化（不应出现，去重策略已过滤）

### 6.3 VersionItem 操作菜单（右键/...按钮）

每个版本项右侧 `...` 按钮展开菜单：

1. 查看此版本（打开 Diff 视图）
2. 恢复此版本（打开 Diff/Merge 视图）
3. 标记为里程碑（若未标记）
4. 取消里程碑（若已标记）
5. 修改里程碑标签（若已标记）
6. 导出此版本
7. 删除此版本（仅非里程碑版本，红色）

---

## 7. Diff 视图

### 7.1 布局

Diff 视图以全屏 Modal 呈现（覆盖编辑器），side-by-side（左右两栏）：

```
┌──────────────────────────────────────────────────────────────┐
│ [←上一处] [↓下一处]  版本对比：昨天 14:32 vs 当前   [×关闭] │
├─────────────────────────┬────────────────────────────────────┤
│ 历史版本                │ 当前版本                           │
│ 2026-04-20 14:32        │ 2026-04-21 10:00（当前）           │
│ +1,234 字               │ 13,456 字                          │
├─────────────────────────┼────────────────────────────────────┤
│                         │                                    │
│ # 第一章 概述           │ # 第一章 概述                      │
│                         │                                    │
│ 这是原始内容...         │ 这是修改后的内容...                │
│                         │                                    │
│ [删除的内容]            │                                    │
│                         │ [新增的内容]                       │
│                         │                                    │
└─────────────────────────┴────────────────────────────────────┘
│ 差异统计：+123 行新增  -45 行删除  [复制历史内容] [恢复此版本] │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 diff-match-patch 集成

```typescript
// src/services/DiffService.ts
import { diff_match_patch } from 'diff-match-patch';

export class DiffService {
  private dmp = new diff_match_patch();

  computeDiff(oldText: string, newText: string): DiffResult {
    // 行级 diff（先按行切分，再 diff 行数组）
    const lineResult = this.dmp.diff_linesToChars_(oldText, newText);
    const diffs = this.dmp.diff_main(lineResult.chars1, lineResult.chars2, false);
    this.dmp.diff_charsToLines_(diffs, lineResult.lineArray);
    this.dmp.diff_cleanupSemantic(diffs);

    const leftLines: DiffLine[] = [];
    const rightLines: DiffLine[] = [];
    let added = 0;
    let deleted = 0;

    for (const [op, text] of diffs) {
      const lines = text.split('\n').filter((_, i, arr) => i < arr.length - 1 || text.endsWith('\n'));
      switch (op) {
        case 0: // EQUAL
          lines.forEach(l => {
            leftLines.push({ type: 'equal', content: l });
            rightLines.push({ type: 'equal', content: l });
          });
          break;
        case -1: // DELETE
          lines.forEach(l => {
            leftLines.push({ type: 'delete', content: l });
            rightLines.push({ type: 'equal', content: '' }); // 占位
            deleted++;
          });
          break;
        case 1: // INSERT
          lines.forEach(l => {
            leftLines.push({ type: 'equal', content: '' }); // 占位
            rightLines.push({ type: 'insert', content: l });
            added++;
          });
          break;
      }
    }

    return { leftLines, rightLines, stats: { added, deleted, modified: 0 } };
  }
}
```

### 7.3 高亮样式

```css
/* src/styles/version-diff.css */
.diff-line--insert {
  background-color: var(--diff-insert-bg, #22c55e20);
  border-left: 3px solid var(--accent-green);
}

.diff-line--delete {
  background-color: var(--diff-delete-bg, #ef444420);
  border-left: 3px solid var(--accent-red);
  text-decoration: line-through;
  opacity: 0.7;
}

.diff-line--equal {
  background-color: transparent;
}
```

### 7.4 Diff 导航

- `Alt+↓`：跳转到下一处差异
- `Alt+↑`：跳转到上一处差异
- 两栏同步滚动（用 scroll 事件联动）

---

## 8. 版本恢复

### 8.1 恢复流程（铁律 6 强制执行）

**禁止**：直接用历史版本内容覆盖当前文档。

**正确流程**：

```
用户点击"恢复此版本"
         │
         ▼
  DiffMergeView 打开
  左侧：历史版本（只读）
  右侧：当前版本（可编辑）
         │
  用户在右侧按需合并内容
  （可复制左侧片段到右侧）
         │
         ▼
  用户点击"完成恢复"按钮
         │
         ▼
  当前文档内容变更（版本快照自动触发）
  trigger = 'manual_save'，label = "恢复自 {日期}"
```

### 8.2 辅助工具

Diff 视图底部工具栏：
- **"全量恢复"**按钮：将右侧内容替换为左侧历史内容（仍在 Diff 视图中，用户可再次确认）
- **"复制左侧"**：将左侧高亮选中的文字复制到剪贴板
- **"将此段落替换到右侧"**：将光标所在的历史段落替换到右侧对应位置（智能定位）

### 8.3 恢复后的状态一致性

恢复操作完成后：
- 评论锚点：若锚定的文本在历史版本中存在，锚点随恢复自动移位（依赖漂移算法）
- 撤销栈：恢复操作作为一个整体 transaction 进入撤销栈（Ctrl+Z 可撤销整个恢复操作）
- 版本历史：自动生成新快照（trigger='manual_save', label='恢复自 {日期}'）

---

## 9. 里程碑（Milestone）

### 9.1 语义

里程碑是用户手动标记的"重要版本点"，例如：
- "审阅前版本"
- "发布前 v1.0"
- "导出前快照"
- "初稿完成"

里程碑永久保留，不受自动清理策略影响。

### 9.2 创建里程碑

**入口**：VersionItem 右键菜单 → "标记为里程碑"。

```
┌─────────────────────────────────┐
│  标记为里程碑                    │
│                                 │
│  为此版本添加标签（可选）：       │
│  [________________________________]│
│  例：审阅前版本、v1.0 草稿       │
│                                 │
│  [取消]    [标记]                │
└─────────────────────────────────┘
```

标签可以为空（仅标记为里程碑，不附加描述）。

### 9.3 里程碑 UI 标识

- 时间轴圆点变为 `Flag` 图标（lucide-vue-next），颜色为 `var(--accent-gold, #f59e0b)`
- 若有标签，以粗体显示在时间下方
- 版本列表中里程碑版本不可删除（删除按钮禁用或隐藏）

### 9.4 修改/取消里程碑

- 修改标签：点击"修改里程碑标签" → 弹出输入框，内容预填
- 取消里程碑：点击"取消里程碑" → 确认后 `isMilestone = false`，版本不删除，但可被后续清理

---

## 10. 存储策略与清理

### 10.1 清理规则（双条件取满足其一则触发清理）

| 条件 | 默认值 | 用户可配置 |
|------|--------|----------|
| 最大版本数（非里程碑） | 100 | Settings > Version History |
| 最大保留天数 | 30 天 | Settings > Version History |

**清理算法**：
```typescript
async cleanup(docId: string, config: VersionCleanupConfig): Promise<number> {
  const nonMilestones = await db.versions
    .where('docId').equals(docId)
    .filter(v => !v.isMilestone)
    .sortBy('createdAt');

  const cutoffDate = new Date(Date.now() - config.maxAgeDays * 86400000).toISOString();
  const toDelete: string[] = [];

  // 超出最大版本数的老版本
  if (nonMilestones.length > config.maxVersions) {
    const excess = nonMilestones.slice(0, nonMilestones.length - config.maxVersions);
    toDelete.push(...excess.map(v => v.id));
  }

  // 超过最大天数的版本（在最大版本数约束下）
  nonMilestones
    .filter(v => v.createdAt < cutoffDate && !toDelete.includes(v.id))
    .forEach(v => toDelete.push(v.id));

  await db.versions.bulkDelete(toDelete);
  return toDelete.length;
}
```

### 10.2 存储警告

- 当单文档版本历史 > 50MB 时：StatusBar 显示警告图标，点击打开"版本存储警告"对话框
- 对话框内容：当前占用 / 版本数量 / 里程碑数量 / "立即清理"按钮

### 10.3 里程碑永久保留

里程碑版本绕过所有自动清理规则。用户必须手动取消里程碑状态后，该版本才可能被清理。

### 10.4 清理调度

- 应用启动时执行一次清理检查（在 Worker 中执行，不阻塞 UI）
- 文档关闭时执行一次清理（仅当版本数量超出阈值时）
- 用户手动触发（Settings > Version History > "立即清理"）

---

## 11. 版本导出

### 11.1 导出格式

下载为 `.md` 文件，文件内容：

```markdown
---
title: 文档标题
version: 2026-04-21T14:32:00Z
version_label: v1.0 草稿完成
word_count: 12345
---

（原始 Markdown 内容）
```

### 11.2 导出文件名

```
{文档标题}_{YYYYMMDD-HHmmss}.md
```

例：`Vue3性能优化_20260421-143200.md`

### 11.3 导出实现

```typescript
async exportVersion(params: VersionExportParams): Promise<void> {
  const version = await this.getVersion(params.versionId);
  const doc = await documentRepository.getDoc(version.docId);

  let content = version.content;

  if (params.includeTimestamp || params.includeVersionLabel) {
    const frontmatter = [
      '---',
      `title: ${doc.title}`,
      params.includeTimestamp ? `version: ${version.createdAt}` : null,
      params.includeVersionLabel && version.label ? `version_label: ${version.label}` : null,
      `word_count: ${version.wordCount}`,
      '---',
      '',
    ].filter(Boolean).join('\n');
    content = frontmatter + content;
  }

  const filename = `${sanitizeFilename(doc.title)}_${formatDateForFilename(version.createdAt)}.md`;
  await tauriFs.save(content, { filename, filters: [{ name: 'Markdown', extensions: ['md'] }] });
}
```

---

## 12. Store 定义

```typescript
// src/stores/useVersionStore.ts
import { defineStore } from 'pinia';

export const useVersionStore = defineStore('version', {
  state: () => ({
    /** 当前查看的文档 id */
    activeDocId: null as string | null,

    /** 版本列表（轻量，不含 content） */
    versions: [] as VersionListItem[],

    /** 当前在 Diff 视图中的目标版本 id */
    diffTargetId: null as string | null,

    /** Diff 视图是否打开 */
    isDiffOpen: false,

    /** 版本列表加载状态 */
    isLoading: false,

    /** 存储统计 */
    storageStats: null as VersionStorageStats | null,

    /** 清理配置 */
    cleanupConfig: {
      maxVersions: 100,
      maxAgeDays: 30,
      keepMilestones: true,
    } as VersionCleanupConfig,
  }),

  getters: {
    /** 按日期分组的版本列表 */
    groupedVersions(state): Array<{ label: string; items: VersionListItem[] }> {
      return groupVersionsByDate(state.versions);
    },

    /** 当前 Diff 目标版本的完整数据（含 content） */
    diffTargetVersion: (state) => {
      // 需要异步加载，此处只存 id，content 由 action 单独 fetch
      return state.diffTargetId;
    },

    /** 里程碑列表 */
    milestones(state): VersionListItem[] {
      return state.versions.filter(v => v.isMilestone);
    },
  },

  actions: {
    /** 加载文档版本列表 */
    async loadVersions(docId: string): Promise<void>,

    /** 创建版本快照 */
    async createVersion(docId: string, content: string, trigger: VersionTrigger): Promise<Version | null>,

    /** 打开 Diff 视图 */
    async openDiff(versionId: string): Promise<void>,

    /** 关闭 Diff 视图 */
    closeDiff(): void,

    /** 标记/取消里程碑 */
    async setMilestone(versionId: string, label?: string): Promise<void>,
    async unsetMilestone(versionId: string): Promise<void>,
    async updateMilestoneLabel(versionId: string, label: string): Promise<void>,

    /** 删除版本（仅非里程碑） */
    async deleteVersion(versionId: string): Promise<void>,

    /** 导出版本 */
    async exportVersion(params: VersionExportParams): Promise<void>,

    /** 加载存储统计 */
    async loadStorageStats(docId: string): Promise<void>,

    /** 执行清理 */
    async runCleanup(docId: string): Promise<number>,

    /** 更新清理配置 */
    updateCleanupConfig(config: Partial<VersionCleanupConfig>): void,
  },
});
```

---

## 13. Repository 定义

```typescript
// src/repositories/VersionRepository.ts

interface VersionRepository {
  /** 获取文档版本列表（轻量，不含 content） */
  listVersions(docId: string): Promise<VersionListItem[]>;

  /** 获取单个版本完整数据（含 content） */
  getVersion(id: string): Promise<Version>;

  /** 获取最新版本 */
  getLatestVersion(docId: string): Promise<Version | null>;

  /** 创建版本（含去重检查） */
  createVersionIfChanged(
    docId: string,
    content: string,
    trigger: VersionTrigger,
    authorId: string
  ): Promise<Version | null>;

  /** 强制创建版本（不做去重，用于崩溃恢复） */
  forceCreateVersion(
    docId: string,
    content: string,
    trigger: VersionTrigger,
    authorId: string
  ): Promise<Version>;

  /** 设置里程碑 */
  setMilestone(id: string, label?: string): Promise<void>;

  /** 取消里程碑 */
  unsetMilestone(id: string): Promise<void>;

  /** 删除版本（仅非里程碑） */
  deleteVersion(id: string): Promise<void>;

  /** 删除文档所有版本（文档永久删除时调用） */
  deleteAllVersions(docId: string): Promise<void>;

  /** 获取存储统计 */
  getStorageStats(docId: string): Promise<VersionStorageStats>;

  /** 执行清理（返回删除数量） */
  cleanup(docId: string, config: VersionCleanupConfig): Promise<number>;

  /** 计算两个版本之间的 diff */
  computeDiff(versionId: string, compareContent: string): Promise<DiffResult>;
}
```

---

## 14. 键盘交互

| 快捷键 | 作用域 | 行为 |
|--------|--------|------|
| `Ctrl+Z` | 编辑器 | 撤销（与版本历史独立，只影响当前编辑状态） |
| `Alt+↓` | Diff 视图 | 跳转到下一处差异 |
| `Alt+↑` | Diff 视图 | 跳转到上一处差异 |
| `Escape` | Diff 视图 | 关闭 Diff 视图 |
| `Ctrl+S` | 编辑器 | 手动保存（触发快照） |
| `F2` | VersionItem（获得焦点时） | 修改里程碑标签 |
| `Delete` | VersionItem（非里程碑） | 删除该版本（含确认） |

---

## 15. 测试矩阵

### 15.1 单元测试

| # | 测试项 | 期望行为 |
|---|--------|----------|
| 1 | `createVersionIfChanged` 内容相同时返回 null | 不创建重复快照 |
| 2 | `createVersionIfChanged` 内容不同时创建新版本 | 返回新 Version 对象 |
| 3 | `deltaChars` 计算正确（新增） | 新内容比上版本长 100 字符，deltaChars = 100 |
| 4 | `deltaChars` 计算正确（删减） | 新内容比上版本短 50 字符，deltaChars = -50 |
| 5 | `DiffService.computeDiff` 识别新增行 | insert 类型行数与实际新增行数一致 |
| 6 | `DiffService.computeDiff` 识别删除行 | delete 类型行数与实际删除行数一致 |
| 7 | `DiffService.computeDiff` 处理空文档 | 不抛异常，返回全量新增 |
| 8 | `cleanup` 保留里程碑版本 | `isMilestone=true` 的版本不被删除 |
| 9 | `cleanup` 按版本数限制清理旧版本 | 保留最近 100 个非里程碑版本 |
| 10 | `cleanup` 按天数限制清理过期版本 | 30 天前（非里程碑）版本被删除 |
| 11 | `setMilestone` 后版本不被 cleanup 清除 | 即使超出 100 版限制，里程碑仍保留 |
| 12 | `deleteVersion` 里程碑版本抛错 | 抛出 `CannotDeleteMilestoneError` |
| 13 | `groupVersionsByDate` 今天/昨天/本周分组正确 | 今天的版本在"今天"组，昨天的在"昨天"组 |
| 14 | `exportVersion` 文件名包含日期时间 | 格式为 `{title}_YYYYMMDD-HHmmss.md` |
| 15 | `exportVersion` 内容包含 frontmatter | 文件开头有 `---` 包裹的元数据 |

### 15.2 集成测试

| # | 测试项 | 期望行为 |
|---|--------|----------|
| 16 | 手动保存（Ctrl+S）触发快照，版本列表更新 | VersionPanel 实时显示新版本 |
| 17 | 5 分钟定时触发快照（内容有变更） | 版本记录 trigger='interval' |
| 18 | 内容无变更时定时触发不创建快照 | 版本列表无新增 |
| 19 | 软删除文档时版本历史保留（回收站恢复后可查看） | 版本列表完整 |
| 20 | 永久删除文档时版本历史同步删除 | `deleteAllVersions` 被调用，IndexedDB 中无残留 |
| 21 | 恢复操作后自动创建新版本（label 包含"恢复自"） | 新版本 label 格式正确 |
| 22 | 100 版以上的非里程碑版本被自动清理 | 只保留最近 100 个 + 所有里程碑 |
| 23 | Diff 视图双栏同步滚动 | 左右两栏滚动位置保持同步 |
| 24 | 存储统计准确反映实际数据量 | totalVersions 与实际 IndexedDB 记录数一致 |
| 25 | 崩溃恢复版本使用 forceCreateVersion（不做去重） | 即使内容相同也创建新快照（trigger='crash_recovery'） |

---

*本 Spec 由 InkForge v2.1 Spec 工程师生成，基于 L1-17 C、L1-18 D、L1-19 D、EX-05 决策综合制定。*

---

## 16. 2026-05-02 Baseline Implementation Note

Baseline status: compatible service/store baseline completed. Full Spec 31 remains partially pending until the dedicated version timeline, diff, merge, and desktop trigger UI is wired.

Accepted baseline coverage:

- `VersionSchema` now accepts optional snapshot metadata while preserving legacy embedded version rows.
- `src/services/version-bundle/*` provides repository-backed snapshot creation, forced crash-recovery checkpoints, milestone protection, bounded cleanup, safe restore proposals, Markdown export, and line-level diff calculation.
- `src/stores/versionBundle.ts` exposes service-backed Pinia state with loading, mutation, error, restore proposal, and export state. It does not seed fake version rows.
- `useEditorStore.createContent()` and `useEditorStore.createVersion()` now write metadata-rich embedded snapshots through the shared snapshot builder while preserving existing editor flows.
- `useVersionManager.performAutoSnapshot()` now records `trigger='interval'` snapshots without replacing the existing autosave/prune behavior.
- Restore baseline is fail-safe: `buildRestoreProposal()` returns proposed content and diff data but does not overwrite the current editor body.
- Delete baseline is fail-closed: milestone versions, current versions, and the last remaining version cannot be deleted.
- Cleanup baseline preserves all milestones, the current version, bounded newest non-milestone versions, and non-expired versions.

Validation evidence:

- `pnpm exec vitest run src/services/version-bundle/version-bundle.test.ts` passed with 6 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm exec vitest run` passed with 12 files and 78 tests.
- `pnpm build` passed with only existing non-blocking Vite warnings.
- Browser smoke used the real Vite runtime and IndexedDB `contents` store to create, cleanup, propose restore, export Markdown, and remove a VersionBundle record. It verified no body mutation during restore proposal and zero runtime errors.
- Post-smoke cleanup closed Playwright and stopped the clean Vite smoke listener on `127.0.0.1:5183`; port verification returned `TcpTestSucceeded: False` for both `5183` and `5184`.

Pending for full Spec 31 pass:

- Dedicated `VersionPanel` timeline, diff, merge, and restore-confirmation UI.
- Two-column restore editor, export download button, and keyboard navigation for diff rows.
- Tauri before-close, mode-switch, and native crash-recovery trigger integration.
- Optional normalized `article_versions` table, hash-chain integrity checker, and large-history benchmark.
- Full E2E, accessibility, and packaged desktop validation matrix.

