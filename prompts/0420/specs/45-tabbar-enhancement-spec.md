---
id: 45-tabbar-enhancement-spec
title: TabBarEnhancement — TabBar 增强规范
version: 1.0.0
status: draft
created: 2026-04-21
source_decisions:
  - N-04=D（完整 IDE 级 TabBar：拖拽/中键/固定/悬停预览）
  - N-05=D（文档修改指示全栈：TabBar 圆点 + 关闭确认）
  - E-07=D（保存状态全景指示：TabBar 标记 + 失败明确提示）
  - L1-53=C（多窗口 + 标签跨窗口拖拽）
  - S-09=B（拖拽排序 + 中键关闭 + 右键菜单）
related_specs:
  - 48-session-restore-spec.md
  - 35-split-view-spec.md
---

# TabBarEnhancement — TabBar 增强规范

## 1. 概述与设计意图

TabBar 是 InkForge Workstation 的核心导航元件，管理用户同时打开的多个文档。本规范将 TabBar 从基础标签列表升级为 IDE 级完整实现，包括：

- 精确的未保存状态可视化
- 拖拽排序（支持跨窗口）
- 右键上下文菜单完整操作集
- 固定 Tab（Pin）
- 键盘快速切换
- 滚动溢出处理
- 悬停预览

设计哲学：**TabBar 是文档状态的信号面板**，用户在不打开文档的前提下，应能从 TabBar 读取所有必要状态信息（已保存、已修改、文档类型）。

---

## 2. Tab 的组成结构

### 2.1 视觉层级（从左到右）

```
┌─────────────────────────────────────────────────┐
│ [图标] [未保存圆点] [标题文本] ... [关闭按钮×] │
└─────────────────────────────────────────────────┘
```

| 元素 | 规格 | 出现条件 |
|------|------|---------|
| 文档图标 | 16px × 16px，`FileText`（lucide） | 始终显示；固定 Tab 时图标为主要内容 |
| 未保存圆点 | 8px 橙色圆点（`#F57C00`）位于图标右侧 | 文档有未保存修改时 |
| 标题文本 | 最长 20 个字符，超出用 `…` 省略 | 始终显示（固定 Tab 下隐藏） |
| 关闭按钮 | 16px × 16px，`X`（lucide） | hover Tab 时显示；固定 Tab 不显示 |

### 2.2 Tab 宽度规则

| Tab 状态 | 最小宽度 | 最大宽度 |
|---------|---------|---------|
| 普通 Tab | 120px | 220px |
| 固定 Tab（Pin） | 32px | 32px（仅图标） |

Tab 宽度自适应标题长度，超过 220px 时截断。所有 Tab 宽度在同一行内自适应，不强制等宽。

### 2.3 Tab 高度

固定 36px（与 Sidebar Tab 等高，保持水平对齐）。

---

## 3. 未保存状态指示（N-05=D）

### 3.1 视觉表现

| 状态 | 圆点显示 | 关闭按钮行为 |
|------|---------|------------|
| 已保存（clean） | 不显示圆点 | 直接关闭 Tab |
| 有未保存修改（dirty） | 显示橙色 8px 圆点 | 关闭前弹出确认对话框 |
| 保存中（saving） | 显示灰色旋转圆环（12px spinner） | 点击关闭：等待保存完成后执行关闭 |
| 保存失败（error） | 显示红色三角警告图标（`AlertTriangle`，12px） | 关闭前弹出确认，明确提示"上次保存失败" |

### 3.2 圆点动画

首次出现（文档状态从 clean 变为 dirty）：圆点以 200ms scale 从 0 → 1 动画出现。

自动保存成功（dirty → clean）：圆点以 200ms scale 从 1 → 0 动画消失。

### 3.3 关闭确认对话框

标题："关闭未保存文档"

内容："{文档名} 中有未保存的更改，是否在关闭前保存？"

操作按钮（三选一）：

```
[保存并关闭]   [不保存，关闭]   [取消]
```

- **保存并关闭**：触发手动保存，保存成功后关闭 Tab
- **不保存，关闭**：丢弃修改，直接关闭（不可撤销）
- **取消**：关闭对话框，Tab 保持原状

---

## 4. 拖拽排序

### 4.1 拖拽实现方式

使用 HTML5 原生 Drag & Drop API（`draggable="true"`）+ 自研拖拽状态管理，不依赖第三方库（避免 bundle size 增加）。

```typescript
interface DragState {
  draggedTabId: string;
  dragOverTabId: string | null;
  insertBefore: boolean;  // true: 插入到 dragOverTabId 之前，false: 之后
}
```

### 4.2 拖拽交互规格

| 阶段 | 视觉效果 | 时长 |
|------|---------|------|
| dragstart | 被拖拽 Tab 变半透明（opacity 0.5），产生拖拽虚影 | 即时 |
| dragover | 目标位置出现 2px 品牌色竖线（插入位置指示） | 实时 |
| dragend（成功） | Tab 移动到目标位置，动画 150ms ease | 150ms |
| dragend（失败/取消） | 被拖拽 Tab 恢复原位，opacity 1，150ms | 150ms |

### 4.3 插入线规格

竖线位置计算：鼠标在目标 Tab 左半部 → 竖线在目标 Tab 左侧；鼠标在右半部 → 竖线在目标 Tab 右侧。

竖线样式：2px 高 36px，品牌色 `var(--color-brand-primary)`，圆角 1px。

### 4.4 跨窗口拖拽（L1-53=C）

跨 Tauri 窗口拖拽时，需要通过 IPC 通信将 Tab 的 `docId` 传递到目标窗口：

```typescript
// 源窗口：dragstart 时注册拖拽数据
event.dataTransfer.setData('application/x-inkforge-tab', JSON.stringify({
  docId: tab.docId,
  sourceWindowId: getCurrentWindowId(),
}));

// 目标窗口：dragover 监听，接受来自其他窗口的 Tab
document.addEventListener('drop', async (event) => {
  const data = JSON.parse(event.dataTransfer.getData('application/x-inkforge-tab'));
  if (data.sourceWindowId !== getCurrentWindowId()) {
    await openDocInCurrentWindow(data.docId);
    await closeTabInWindow(data.docId, data.sourceWindowId);
  }
});
```

跨窗口拖拽时，目标文档异步加载（显示 loading 状态），不阻塞 UI。

---

## 5. 滚动溢出处理

### 5.1 触发条件

Tab 总宽度超过 TabBar 可见区域时，进入滚动模式。

### 5.2 左右箭头

TabBar 两端出现箭头按钮：

- 左箭头（`ChevronLeft`，lucide，20px）：向左滚动 200px
- 右箭头（`ChevronRight`，lucide，20px）：向右滚动 200px

箭头可见性：到达端点时对应箭头变灰禁用（`opacity 0.3`，`pointer-events: none`）。

箭头按钮固定在 TabBar 两端，不随 Tab 滚动。

### 5.3 鼠标横向滚动

TabBar 内鼠标滚轮事件默认劫持为横向滚动（`event.preventDefault()` + `scrollLeft += deltaY`），方向系数可配置（默认：向下滚 = 向右滚）。

### 5.4 Tab 溢出指示

若存在不可见 Tab（被遮挡），右箭头旁显示数字指示："还有 N 个标签"（小号灰色文字）。

### 5.5 活跃 Tab 自动滚动入视

切换到非可见区域的 Tab 时，TabBar 自动滚动使该 Tab 完整可见（`scrollIntoView`）。

---

## 6. 右键上下文菜单（Context Menu）

### 6.1 菜单项列表

右键点击任意 Tab 弹出菜单（`TabContextMenu`）：

| 菜单项 | 图标 | 快捷键 | 说明 |
|--------|------|--------|------|
| 关闭 | `X` | `Ctrl+W` | 关闭当前 Tab（若有未保存修改触发确认） |
| 关闭其他标签 | — | — | 关闭除当前外所有 Tab |
| 关闭右侧标签 | — | — | 关闭当前 Tab 右侧所有 Tab |
| 关闭左侧标签 | — | — | 关闭当前 Tab 左侧所有 Tab |
| 固定 / 取消固定 | `Pin` / `PinOff` | — | 切换固定状态（见第 7 节） |
| 在文件树中定位 | `FolderOpen` | — | 展开 FileManager 并高亮该文档 |
| 复制完整路径 | `Copy` | — | 复制文档绝对路径到剪贴板 |
| 在新窗口打开 | `ExternalLink` | — | 仅多窗口（L1-53=C）模式下显示 |

### 6.2 菜单动画

菜单出现：`opacity 0→1` + `translateY(-4px → 0)`，100ms ease-out。

菜单消失：`opacity 1→0`，80ms ease-in。

### 6.3 批量关闭未保存确认

"关闭其他标签"/ "关闭右侧标签"操作包含有未保存修改的 Tab 时：

弹出汇总确认框："以下文档有未保存更改：{文档 A}、{文档 B}，是否全部保存后关闭？"

操作按钮：[全部保存后关闭]  [不保存，全部关闭]  [取消]

---

## 7. 固定 Tab（Pin）

### 7.1 固定状态规格

| 属性 | 普通 Tab | 固定 Tab |
|------|---------|---------|
| 宽度 | 120px ~ 220px（自适应） | 固定 32px |
| 标题文本 | 显示 | 隐藏 |
| 关闭按钮 | hover 时显示 | 不显示（不可通过普通手势关闭） |
| 拖拽排序 | 可拖拽到任意位置 | 只能在固定 Tab 区域内拖拽 |
| 位置 | 正常顺序 | 始终在 TabBar 最左侧（固定区） |
| 关闭方式 | 点击 × / 中键 / 右键菜单 | 仅右键菜单"取消固定"后再关闭 |

### 7.2 固定区与普通区分隔

固定 Tab 区域以 1px 分隔线（`var(--color-border-subtle)`）与普通 Tab 区域隔开。

固定 Tab 不参与普通 Tab 排序，也不会因"关闭其他标签"被关闭。

### 7.3 固定状态持久化

固定 Tab 列表存储于 `session_state`（见 48-session-restore-spec.md），随会话恢复。

---

## 8. Tab 数量上限

### 8.1 上限配置

Settings > 通用 > 最大同时打开标签数，默认 **20**，范围 5 ~ 50。

### 8.2 超出处理策略

超出上限时，关闭**最久未访问的非固定 Tab**（LRU 策略，若有未保存修改则弹出确认）。

超出关闭前 Toast 提示："已达到标签上限（20），将自动关闭最早访问的标签"。

---

## 9. 中键关闭

TabBar 内鼠标中键点击任意 Tab：触发关闭（等同于点击关闭按钮，有未保存修改时弹出确认）。

---

## 10. 悬停预览

### 10.1 触发

鼠标悬停在 Tab 上 600ms 后显示预览 Tooltip（`TabHoverPreview`）。

### 10.2 Tooltip 内容

```
┌─────────────────────────────────┐
│ [文档图标大] 文档完整标题        │
│ 路径：/分类/子分类               │
│ 字数：1,234 字  阅读时长：3 分钟 │
│ 上次保存：2 分钟前               │
│ ─────────────────────────────── │
│ 内容预览（前 200 字纯文本）      │
└─────────────────────────────────┘
```

Tooltip 宽度 280px，最大高度 200px（超出内容省略），出现方向：Tab 下方（若空间不足则上方）。

### 10.3 动画

`opacity 0→1` + `translateY(-4px → 0)`，200ms ease-out，600ms hover 延迟。

鼠标离开 Tab：100ms 后消失（给鼠标移入 Tooltip 留出时间）。

---

## 11. 键盘快捷键

| 快捷键 | 行为 |
|--------|------|
| `Ctrl+Tab` | 切换到右侧 Tab（循环） |
| `Ctrl+Shift+Tab` | 切换到左侧 Tab（循环） |
| `Ctrl+1` ~ `Ctrl+9` | 切换到第 N 个 Tab（N=9 时切换到最后一个） |
| `Ctrl+W` | 关闭当前 Tab |
| `Ctrl+Shift+T` | 重新打开最近关闭的 Tab |

### 11.1 Ctrl+1~9 映射规则

Tab 计数从左到右，固定 Tab 从 1 开始计入。`Ctrl+9` 始终指向最后一个 Tab（即使 Tab 数量 < 9）。

### 11.2 最近关闭 Tab 恢复（Ctrl+Shift+T）

维护最近关闭 Tab 的历史列表（最多 10 条），`Ctrl+Shift+T` 每次恢复最近一条。

历史列表存于内存（Session 级），应用重启后清空（与 48-session-restore 的启动恢复逻辑解耦）。

---

## 12. 文档图标策略

| 文档类型/状态 | 图标 |
|-------------|------|
| 普通文档 | `FileText`（lucide） |
| 已归档文档 | `Archive`（lucide，灰色） |
| 草稿 | `FileEdit`（lucide，橙色） |
| 来自本地文件系统 | `FileCode`（lucide，带底部标记） |

图标颜色遵循文档状态机（11-document-lifecycle-spec）。

---

## 13. 与其他系统集成

### 13.1 SessionRestore（48-session-restore-spec）

Tab 列表（含顺序、固定状态、活跃 Tab）完整写入 `session_state`，启动时恢复。

### 13.2 AutoSave / DirtyState

AutoSave 成功后更新对应 Tab 的圆点状态（dirty → clean）。保存失败后更新为错误状态（`AlertTriangle`）。

### 13.3 FileManager

右键菜单"在文件树中定位"触发 `fileManagerStore.revealDocument(docId)`，FileManager 展开并高亮目标文档节点。

### 13.4 多窗口（TauriMultiWindow）

每个 Tauri 窗口维护独立的 Tab 列表。跨窗口拖拽通过 Tauri IPC 完成文档迁移。窗口关闭时将 Tab 列表写入 `session_state`（账户 + windowId 维度隔离）。

### 13.5 SplitView（35-split-view-spec）

Tab 切换时，若当前处于分栏状态，左栏切换文档，右栏根据模式决定是否跟随（见 35 规范第 14.3 节）。

---

## 14. 组件文件结构

```
src/components/layout/
├── TabBar/
│   ├── TabBar.vue                 # 顶层容器，管理 scroll/overflow
│   ├── TabBarScrollArrow.vue      # 左右滚动箭头
│   ├── TabItem.vue                # 单个 Tab 组件
│   ├── TabUnsavedDot.vue          # 未保存圆点（动画封装）
│   ├── TabContextMenu.vue         # 右键上下文菜单
│   ├── TabHoverPreview.vue        # 悬停预览 Tooltip
│   ├── TabCloseConfirmDialog.vue  # 关闭未保存确认对话框
│   └── TabDragManager.ts          # 拖拽状态管理（非 UI 组件）

src/composables/
├── useTabBarKeyboard.ts           # Ctrl+1~9, Ctrl+W 等快捷键
├── useTabBarScroll.ts             # 溢出检测 + 自动滚入视
└── useTabBarLRU.ts                # LRU 最久未访问策略

src/stores/
└── tabStore.ts                    # Tab 列表、活跃 Tab、固定状态
```

---

## 15. 状态数据结构

```typescript
interface TabItem {
  id: string;                    // Tab 唯一 ID（= docId）
  docId: string;                 // 对应文档 ID
  title: string;                 // 显示标题
  docType: 'article' | 'draft';  // 影响图标
  dirtyState: 'clean' | 'dirty' | 'saving' | 'error'; // 保存状态
  isPinned: boolean;             // 是否固定
  lastAccessedAt: number;        // 用于 LRU 策略（时间戳）
  scrollPosition: number;        // 滚动位置（用于恢复）
}

interface TabBarState {
  tabs: TabItem[];               // 有序 Tab 列表（固定 Tab 在前）
  activeTabId: string | null;    // 当前活跃 Tab ID
  recentlyClosed: TabItem[];     // 最近关闭的 Tab（Ctrl+Shift+T 恢复）
  maxTabs: number;               // 来自 Settings
}
```

---

## 16. 样式规范

### 16.1 Tab 激活状态

```css
.tab-item {
  background: var(--color-tab-bg);
  border-bottom: 2px solid transparent;
  transition: background 150ms ease, border-color 150ms ease;
}

.tab-item.active {
  background: var(--color-tab-active-bg);
  border-bottom-color: var(--color-brand-primary);
}

.tab-item:hover:not(.active) {
  background: var(--color-tab-hover-bg);
}
```

### 16.2 固定 Tab 样式

```css
.tab-item.pinned {
  width: 32px;
  flex-shrink: 0;
  justify-content: center;
}

.tab-item.pinned .tab-title { display: none; }
.tab-item.pinned .tab-close { display: none; }
```

### 16.3 TabBar 容器

```css
.tab-bar {
  display: flex;
  align-items: center;
  height: 36px;
  overflow: hidden;
  border-bottom: 1px solid var(--color-border-default);
}

.tab-bar-scroll-area {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none; /* 隐藏滚动条，使用自定义箭头 */
  flex: 1;
}
```

---

## 17. 测试矩阵

| # | 测试场景 | 预期结果 | 优先级 |
|---|---------|---------|--------|
| 1 | 打开新文档 | Tab 出现在 TabBar 末尾，自动滚入可见区 | P0 |
| 2 | 编辑文档内容（dirty） | 橙色圆点出现，200ms 动画 | P0 |
| 3 | 自动保存成功（clean） | 圆点消失，200ms 动画 | P0 |
| 4 | 保存失败 | 红色三角图标替换圆点 | P0 |
| 5 | 点击关闭有未保存修改的 Tab | 弹出三选一确认对话框 | P0 |
| 6 | 确认对话框"保存并关闭" | 触发保存，保存成功后关闭 Tab | P0 |
| 7 | 确认对话框"不保存，关闭" | 直接关闭，修改丢弃 | P0 |
| 8 | Tab 拖拽排序（同窗口） | Tab 移动到目标位置，150ms 动画 | P0 |
| 9 | 拖拽插入线显示正确位置 | 鼠标在左半 → 竖线在左；右半 → 竖线在右 | P1 |
| 10 | Tab 超过可见区域 → 箭头出现 | 左右箭头正确出现 | P0 |
| 11 | 点击右箭头 | 向右滚动 200px | P0 |
| 12 | 滚动到末端 → 右箭头禁用 | 右箭头变灰，pointer-events:none | P1 |
| 13 | 鼠标滚轮在 TabBar 区域 | 横向滚动 Tab | P1 |
| 14 | 右键菜单"关闭其他标签" | 关闭除当前 Tab 外的所有非固定 Tab | P0 |
| 15 | 右键菜单"在文件树中定位" | FileManager 展开并高亮目标文档 | P1 |
| 16 | 右键菜单"复制完整路径" | 路径复制到剪贴板，Toast 提示 | P1 |
| 17 | Pin Tab | Tab 收窄至 32px，移至左侧固定区 | P0 |
| 18 | 固定 Tab 无法被"关闭其他标签"关闭 | 固定 Tab 保留 | P0 |
| 19 | Ctrl+1 切换第 1 个 Tab | 正确切换 | P0 |
| 20 | Ctrl+9 当 Tab 数 < 9 | 切换到最后一个 Tab | P0 |
| 21 | Ctrl+W 关闭当前 Tab | 等同于点击关闭按钮 | P0 |
| 22 | Ctrl+Shift+T 恢复最近关闭 Tab | Tab 重新出现，文档重新加载 | P1 |
| 23 | 中键点击 Tab 关闭 | 等同于点击关闭按钮 | P1 |
| 24 | Tab 数量达到上限 20 | LRU Tab 被关闭，Toast 提示 | P1 |
| 25 | 暗色模式下 TabBar 全适配 | 无硬编码色值（截图对比） | P1 |

---

## 18. 性能要求

| 指标 | 要求 |
|------|------|
| Tab 切换响应 | < 50ms（不含文档加载） |
| 拖拽帧率 | ≥ 60fps（mousemove 回调 < 8ms） |
| 右键菜单出现延迟 | < 100ms |
| 悬停预览出现 | 600ms 延迟 + 200ms 动画 |
| TabBar 初始渲染（20 个 Tab） | < 100ms |

---

## 19. 验收标准

- [ ] 所有 P0 测试矩阵项通过，附截图证据
- [ ] 未保存圆点动画视频录制（出现/消失各 200ms）
- [ ] 拖拽排序视频录制（含插入线和 150ms 动画）
- [ ] 右键菜单所有菜单项功能验证截图
- [ ] 固定 Tab 在会话恢复后正确恢复（对比截图）
- [ ] Tab 数量上限 LRU 关闭测试（附 console 日志）
- [ ] 暗色模式无硬编码色值（CSS 审查截图）
- [ ] 键盘快捷键 Ctrl+1~9 全部验证通过

---

*本文档生成于 2026-04-21，依据 N-04/N-05/E-07/S-09 决策及 InkForge Ethereal Constructivism 设计语汇。*

---

## 20. 国际化（i18n）文本 key

| Key | 中文值 |
|-----|--------|
| `tabbar.close` | 关闭 |
| `tabbar.closeOthers` | 关闭其他标签 |
| `tabbar.closeRight` | 关闭右侧标签 |
| `tabbar.closeLeft` | 关闭左侧标签 |
| `tabbar.pin` | 固定 |
| `tabbar.unpin` | 取消固定 |
| `tabbar.revealInTree` | 在文件树中定位 |
| `tabbar.copyPath` | 复制完整路径 |
| `tabbar.openInNewWindow` | 在新窗口打开 |
| `tabbar.unsavedTitle` | 关闭未保存文档 |
| `tabbar.unsavedBody` | {docName} 中有未保存的更改，是否在关闭前保存？ |
| `tabbar.saveAndClose` | 保存并关闭 |
| `tabbar.discardAndClose` | 不保存，关闭 |
| `tabbar.lruClose` | 已达到标签上限（{max}），将自动关闭最早访问的标签 |
| `tabbar.pathCopied` | 路径已复制到剪贴板 |

---

## 21. 自动保存状态转换图

```
clean ──(用户输入)──▶ dirty
dirty ──(触发自动保存)──▶ saving
saving ──(保存成功)──▶ clean
saving ──(保存失败)──▶ error
error ──(重试成功)──▶ clean
error ──(用户输入)──▶ dirty  (重置为 dirty，清除错误标记)
```

各状态对应 Tab 圆点表现：

| 状态 | 视觉 | 颜色 |
|------|------|------|
| `clean` | 无圆点 | — |
| `dirty` | 实心圆点 8px | `#F57C00`（橙色） |
| `saving` | 旋转圆环 12px | `var(--color-text-tertiary)` |
| `error` | `AlertTriangle` 12px | `#D32F2F`（品牌红） |

---

## 22. TabBar 渲染优化

### 22.1 虚拟化

Tab 数量 ≤ 20（Settings 上限），无需虚拟列表。所有 Tab 实体渲染。

### 22.2 事件委托

TabBar 内的所有点击事件通过事件委托处理（在 TabBar 容器上注册 `click` / `auxclick` / `contextmenu`），不在每个 Tab 上注册独立监听器：

```typescript
tabBarEl.addEventListener('click', (e) => {
  const tabEl = (e.target as Element).closest('[data-tab-id]');
  if (!tabEl) return;
  const tabId = tabEl.getAttribute('data-tab-id')!;
  handleTabClick(tabId, e);
});
```

### 22.3 滚动状态计算

TabBar 溢出时，通过 `ResizeObserver` 监听 Tab 总宽度变化，动态计算是否需要显示箭头：

```typescript
const scrollObserver = new ResizeObserver(() => {
  const { scrollWidth, clientWidth } = scrollAreaEl;
  showLeftArrow.value = scrollAreaEl.scrollLeft > 0;
  showRightArrow.value = scrollAreaEl.scrollLeft < scrollWidth - clientWidth - 1;
});
scrollObserver.observe(scrollAreaEl);
```

---

## 23. 错误处理

| 场景 | 处理方式 |
|------|---------|
| 打开文档失败（DB 读取错误） | Tab 标题保留，内容区显示错误空状态，红色圆点 |
| 跨窗口拖拽 IPC 失败 | Toast 提示"跨窗口移动失败，请重试"，Tab 保留在源窗口 |
| Ctrl+Shift+T 恢复时文档已删除 | Toast 提示"文档已删除，无法恢复"，不创建空 Tab |
| 批量关闭保存超时（> 10s） | Toast 提示"保存超时，是否强制关闭？"，提供强制关闭选项 |

---

## 24. 实现优先级

### Phase 1（P0 核心）

- Tab 基础结构（图标 + 标题 + 关闭按钮）
- 未保存圆点（dirty / clean）
- 关闭未保存文档确认对话框
- Ctrl+W 关闭当前 Tab
- Tab 切换（Ctrl+Tab / Ctrl+1~9）

### Phase 2（P1 完整功能）

- 拖拽排序（同窗口）
- 右键上下文菜单（所有菜单项）
- 固定 Tab（Pin）
- 滚动溢出 + 左右箭头
- 悬停预览（TabHoverPreview）
- 中键关闭

### Phase 3（P2 细化）

- 跨窗口拖拽（L1-53=C）
- 保存中旋转圆环动画
- 保存失败红色三角图标
- Ctrl+Shift+T 最近关闭恢复
- LRU 超出上限自动关闭

---

## 25. 补充测试矩阵（Phase 2/3）

| # | 测试场景 | 预期结果 | 优先级 |
|---|---------|---------|--------|
| 26 | 拖拽 Tab 到最左侧 | Tab 成为第一个（固定区之后） | P1 |
| 27 | 固定 Tab 拖拽到普通区 | 保持在固定区，不允许移出 | P1 |
| 28 | 悬停 600ms 后 Tooltip 出现 | 内容包含标题、路径、字数、预览文本 | P1 |
| 29 | 鼠标快速掠过 Tab（< 600ms） | Tooltip 不出现 | P1 |
| 30 | Tab 数量 = 20 时新建文档 | 最久未访问 Tab 被 LRU 关闭 | P1 |
| 31 | 批量关闭含 3 个未保存 Tab | 汇总确认框列出 3 个文档名 | P1 |
| 32 | 跨窗口拖拽 Tab | 目标窗口新 Tab 出现，源窗口 Tab 消失 | P2 |
| 33 | 保存中状态（spinner） | 旋转动画正常，不影响 Tab 点击 | P2 |
| 34 | 保存失败状态（AlertTriangle） | 再次手动保存后恢复 clean | P2 |
| 35 | Ctrl+Shift+T 多次连续 | 每次恢复最近一条关闭历史 | P2 |

---

## 26. 已知约束与技术债务

### 26.1 HTML5 拖拽 API 在 Tauri WebView 的局限性

Tauri 内嵌的 WebView（基于 WKWebView / WebView2）对 HTML5 Drag & Drop 事件的实现存在差异：

- Windows（WebView2）：完整支持
- macOS（WKWebView）：`dragstart` 触发延迟约 100ms，`dataTransfer.getData` 在 `drop` 时可能清空

应对策略：将跨窗口拖拽的 Tab 数据通过 Tauri IPC 而非 `dataTransfer` 传递，DataTransfer 仅用于同窗口内排序。

### 26.2 固定 Tab 与 LRU 的交互

固定 Tab 不参与 LRU 淘汰，因此若用户将大量 Tab 固定（≥ maxTabs 个固定 Tab），LRU 无法关闭任何 Tab，新文档打开会失败。

处理方式：固定 Tab 数量 + 普通 Tab 数量 > maxTabs 时，阻止新增普通 Tab 并提示："请先取消固定部分标签，或增大最大标签数限制"。

### 26.3 SessionRestore 与 LRU 的顺序冲突

若 SessionRestore 恢复了 25 个 Tab（上次设置 maxTabs=25），但用户当前 Settings 中 maxTabs=20，恢复后立即触发 LRU 淘汰 5 个 Tab。

此行为是预期的：Settings 是当前权威，会话恢复不凌驾于设置之上。淘汰时优先淘汰最久未访问的 5 个 Tab（按 `lastAccessedAt` 排序）。

---

## 27. Tab 顺序持久化细节

### 27.1 顺序字段

`tabStore.tabs` 是有序数组，其顺序即 TabBar 从左到右的显示顺序。拖拽排序直接修改数组顺序，无需额外 `order` 字段（内存中的数组顺序即是权威顺序）。

### 27.2 SessionRestore 与 tabStore 的顺序同步

`session_state.tabs` 的数组顺序与 `tabStore.tabs` 一致（序列化时按数组顺序写入）。恢复时按 `session_state.tabs` 的顺序初始化 `tabStore.tabs`，固定 Tab 自动排到前面（由 `isPinned` 字段决定）。

### 27.3 Tab 顺序的变更追踪

Tab 排序变化（拖拽）触发 `sessionStore.isDirty = true`（与其他状态变化一样），在 30s 定时写入或关闭时写入 `session_state`。

---

## 28. 与 CommandPalette（EX-03）的集成

TabBar 的所有操作均注册为命令，可通过 CommandPalette 执行：

| 命令 ID | 名称 | 等同于 |
|---------|------|--------|
| `tab.close` | 关闭当前标签 | `Ctrl+W` |
| `tab.closeOthers` | 关闭其他标签 | 右键菜单 |
| `tab.pin` | 固定当前标签 | 右键菜单 > 固定 |
| `tab.revealInTree` | 在文件树中定位 | 右键菜单 |
| `tab.switchNext` | 下一个标签 | `Ctrl+Tab` |
| `tab.switchPrev` | 上一个标签 | `Ctrl+Shift+Tab` |
| `tab.reopenClosed` | 重新打开最近关闭的标签 | `Ctrl+Shift+T` |
