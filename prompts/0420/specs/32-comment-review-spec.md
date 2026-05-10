# Spec 32 — 评论、批注与审阅模式

| 字段 | 值 |
|---|---|
| Spec ID | 32 |
| 标题 | 评论、批注与审阅模式（Track Changes） |
| 状态 | 草稿 |
| 优先级 | P1 |
| 关联决策 | L1-14(C) / L1-15(C + "跨版本漂移") / L1-16(C) |
| 关联 Spec | 01-spec-editor-typora / 11-document-lifecycle-spec / 24-permission-audit-spec |
| 作者 | InkForge Spec Engineer |
| 创建日期 | 2026-04-20 |

---

## 1. 背景与决策依据

### 1.1 铁律来源

- **L1-14 C**：v2.1 进入"基础审阅闭环"（评论 + 回复 + 关闭 + 状态机），但不做多人协作同时审阅——单人场景下的自审/批注工具。
- **L1-15 C + 补充**：行内范围评论（字符级精确锚定），必须允许跨版本漂移——最大程度保证锚点不会失效。
- **L1-16 C**：正式三态审阅状态机（Comment / Request Changes / Approve），审阅责任制留到远期。

### 1.2 功能范围

| 功能 | v2.1 状态 | 说明 |
|---|---|---|
| 行内范围评论（精确字符锚定） | 实装 | L1-15 C |
| 评论回复 | 实装 | |
| 三态状态机（pending/resolved/deleted） | 实装 | L1-16 C 框架 |
| 跨版本锚点漂移算法 | 实装 | L1-15 补充 |
| Comment / Request Changes / Approve 审阅模式 | 实装框架 | L1-16 C |
| @mention 本地账户 | 实装 | 仅本地 Profile |
| 评论内容 Markdown 内联格式 | 实装 | |
| 审阅模式（Track Changes） | 实装 | |
| 批注（Margin Note） | 实装 | |
| 评论导出（PDF 旁注） | 实装 | pdfmake |
| 多人协作同时审阅 | 远期 | B 选项推迟 |
| 责任指派 / 截止时间 | 远期 | |

---

## 2. 评论数据模型

### 2.1 核心类型定义

```typescript
// src/services/comments/types.ts

export type CommentStatus = 'pending' | 'resolved' | 'deleted';
export type ReviewDecision = 'comment' | 'request-changes' | 'approve';

export interface CommentAnchor {
  /** TipTap 文档中的字符起始位置 */
  from: number;
  /** TipTap 文档中的字符结束位置 */
  to: number;
  /** 锚定时的原始文本片段（用于漂移验证） */
  text: string;
  /** 锚点创建时的文档版本 ID */
  versionId: string;
  /** 锚点状态：精确 / 漂移（位置已移动但仍有效）/ 失效（找不到原始文本） */
  anchorStatus: 'exact' | 'drifted' | 'invalid';
  /** 漂移后的调整位置（若 anchorStatus = 'drifted'） */
  driftedFrom?: number;
  driftedTo?: number;
}

export interface CommentReply {
  id: string;
  authorId: string;
  content: string;                  // Markdown 格式
  createdAt: number;
  updatedAt?: number;
  mentions: string[];               // 被 @ 的 Profile ID 列表
}

export interface Comment {
  id: string;                       // nanoid
  docId: string;
  anchor: CommentAnchor;
  content: string;                  // Markdown 格式
  status: CommentStatus;
  authorId: string;                 // Profile ID
  reviewDecision?: ReviewDecision;  // 当评论代表正式审阅决策时
  createdAt: number;
  updatedAt?: number;
  resolvedAt?: number;
  resolvedBy?: string;              // Profile ID
  deletedAt?: number;
  replies: CommentReply[];
  mentions: string[];
}

/** Margin Note（页边批注，无锚点） */
export interface MarginNote {
  id: string;
  docId: string;
  content: string;                  // Markdown 格式
  authorId: string;
  /** 批注关联的段落索引（用于页面定位，无精确字符锚点） */
  paragraphIndex: number;
  createdAt: number;
  updatedAt?: number;
}

/** Track Changes 审阅变更记录 */
export interface TrackChange {
  id: string;
  docId: string;
  kind: 'insert' | 'delete' | 'format';
  from: number;
  to: number;
  /** 插入内容（kind=insert）或删除的原始内容（kind=delete） */
  content?: string;
  /** 格式变更属性（kind=format） */
  markAttrs?: Record<string, unknown>;
  authorId: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'rejected';
}
```

---

## 3. 评论锚点漂移算法

### 3.1 漂移问题

当评论创建后，用户继续编辑文档，原始锚定位置（`from/to`）会因为文本增删而失效。必须实现"锚点漂移"算法，使锚点跟随文本移动。

### 3.2 基于 diff-match-patch 的漂移实现

```typescript
// src/services/comments/anchorDrift.ts

import { diff_match_patch } from 'diff-match-patch';

export class AnchorDriftTracker {
  private dmp = new diff_match_patch();

  /**
   * 根据文档内容变化更新锚点位置
   * @param anchor 原始锚点
   * @param oldContent 变化前的文档纯文本
   * @param newContent 变化后的文档纯文本
   * @returns 更新后的锚点
   */
  updateAnchor(
    anchor: CommentAnchor,
    oldContent: string,
    newContent: string
  ): CommentAnchor {
    // 1. 计算 diff
    const diffs = this.dmp.diff_main(oldContent, newContent);
    this.dmp.diff_cleanupSemantic(diffs);

    // 2. 构建偏移映射
    const offsetMap = this.buildOffsetMap(diffs);

    // 3. 映射旧位置到新位置
    const newFrom = offsetMap.get(anchor.from) ?? this.findNearestOffset(offsetMap, anchor.from);
    const newTo = offsetMap.get(anchor.to) ?? this.findNearestOffset(offsetMap, anchor.to);

    // 4. 验证新位置的文本是否仍与原始 anchor.text 匹配
    const newAnchorText = newContent.slice(newFrom, newTo);
    const exact = newAnchorText === anchor.text;

    // 5. 若完全不一致，尝试在新文档中搜索原始文本
    if (!exact) {
      const foundPos = newContent.indexOf(anchor.text);
      if (foundPos !== -1) {
        return {
          ...anchor,
          from: foundPos,
          to: foundPos + anchor.text.length,
          anchorStatus: 'drifted',
          driftedFrom: foundPos,
          driftedTo: foundPos + anchor.text.length,
        };
      }
      // 找不到原始文本 → 失效
      return { ...anchor, anchorStatus: 'invalid' };
    }

    return {
      ...anchor,
      from: newFrom,
      to: newTo,
      anchorStatus: newFrom === anchor.from ? 'exact' : 'drifted',
      driftedFrom: newFrom !== anchor.from ? newFrom : undefined,
      driftedTo: newTo !== anchor.to ? newTo : undefined,
    };
  }

  /**
   * 构建旧位置 → 新位置的偏移映射表
   */
  private buildOffsetMap(diffs: [number, string][]): Map<number, number> {
    const map = new Map<number, number>();
    let oldPos = 0;
    let newPos = 0;

    for (const [op, text] of diffs) {
      if (op === 0) {
        // 相同：逐字符映射
        for (let i = 0; i < text.length; i++) {
          map.set(oldPos + i, newPos + i);
        }
        oldPos += text.length;
        newPos += text.length;
      } else if (op === -1) {
        // 删除：旧位置无对应新位置（映射到删除点的新位置）
        for (let i = 0; i < text.length; i++) {
          map.set(oldPos + i, newPos);
        }
        oldPos += text.length;
      } else if (op === 1) {
        // 插入：不占旧位置
        newPos += text.length;
      }
    }

    return map;
  }

  private findNearestOffset(map: Map<number, number>, pos: number): number {
    // 查找最近的已映射位置
    let nearest = pos;
    let minDist = Infinity;
    for (const [oldPos, newPos] of map) {
      const dist = Math.abs(oldPos - pos);
      if (dist < minDist) {
        minDist = dist;
        nearest = newPos;
      }
    }
    return nearest;
  }
}
```

### 3.3 漂移触发时机

```typescript
// src/editor/plugins/anchorDriftPlugin.ts

/**
 * TipTap 插件：监听文档变化，更新所有评论锚点
 * 使用防抖（500ms）避免高频更新
 */
export const AnchorDriftPlugin = Extension.create({
  name: 'anchorDrift',

  addProseMirrorPlugins() {
    const tracker = new AnchorDriftTracker();
    let previousContent = '';

    return [
      new Plugin({
        key: anchorDriftPluginKey,
        state: {
          init(_, state) {
            previousContent = state.doc.textContent;
            return { drifted: false };
          },
          apply(tr, prev) {
            if (!tr.docChanged) return prev;
            return { drifted: true };
          },
        },
        view() {
          let driftTimer: ReturnType<typeof setTimeout> | null = null;
          return {
            update(view, prevState) {
              if (!view.state.doc.eq(prevState.doc)) {
                if (driftTimer) clearTimeout(driftTimer);
                driftTimer = setTimeout(async () => {
                  const newContent = view.state.doc.textContent;
                  await useCommentStore().updateAllAnchors(previousContent, newContent);
                  previousContent = newContent;
                }, 500);
              }
            },
          };
        },
      }),
    ];
  },
});
```

---

## 4. TipTap 评论 Decoration

### 4.1 评论高亮 Decoration

```typescript
// src/editor/extensions/Comment/CommentDecoration.ts

import { Decoration, DecorationSet } from 'prosemirror-view';
import { Plugin, PluginKey } from 'prosemirror-state';

const commentDecorationKey = new PluginKey('commentDecoration');

export function createCommentDecorations(comments: Comment[]): DecorationSet {
  const decorations: Decoration[] = [];

  for (const comment of comments) {
    if (comment.status === 'deleted') continue;
    const { from, to, anchorStatus } = comment.anchor;
    if (anchorStatus === 'invalid') continue;

    const actualFrom = comment.anchor.driftedFrom ?? from;
    const actualTo = comment.anchor.driftedTo ?? to;

    decorations.push(
      Decoration.inline(actualFrom, actualTo, {
        class: [
          'comment-highlight',
          `comment-status-${comment.status}`,
          anchorStatus === 'drifted' ? 'comment-drifted' : '',
        ].filter(Boolean).join(' '),
        'data-comment-id': comment.id,
      })
    );
  }

  return DecorationSet.create(/* doc */, decorations);
}
```

### 4.2 高亮样式

```css
/* src/styles/comments.css */

/* 待处理评论：琥珀色下划线 */
.comment-highlight.comment-status-pending {
  background-color: rgba(245, 158, 11, 0.15);
  border-bottom: 2px solid rgba(245, 158, 11, 0.6);
  cursor: pointer;
}

/* 已解决评论：不再高亮，仅保留极轻微的灰色提示（悬停时可见） */
.comment-highlight.comment-status-resolved {
  border-bottom: 1px solid rgba(156, 163, 175, 0.3);
  cursor: pointer;
}

/* 漂移的锚点：虚线下划线提示位置已移动 */
.comment-highlight.comment-drifted {
  border-bottom-style: dashed;
}

/* 悬停时加深 */
.comment-highlight:hover {
  background-color: rgba(245, 158, 11, 0.25);
}
```

---

## 5. 评论面板

### 5.1 面板布局

```
编辑区                          │  评论面板（宽 280px，固定在右侧）
────────────────────────────── │ ──────────────────────────────────
                                │  [评论] [Track Changes]  [+ 新评论]
  文章内容...                   │
  [━━━━] 高亮区域 [━━━━━]      │  ┌────────────────────────────────┐
  ...更多内容...                │  │  [UserCircle] ZRainbow          │
                                │  │  2026-04-20 10:30              │
                                │  │  这段描述不够清晰，建议重写     │
                                │  │                                │
                                │  │  [Reply] [Resolve] [More...]   │
                                │  │                                │
                                │  │  ─── 回复 ───                  │
                                │  │  [UserSquare] 我               │
                                │  │  好的，我来修改                 │
                                │  └────────────────────────────────┘
                                │
                                │  ┌────────────────────────────────┐
                                │  │  [Badge] ZRainbow（已解决）     │
                                │  │  2026-04-20 09:15  [已解决标签] │
                                │  │  格式有问题                     │
                                │  │  [展开查看历史]                 │
                                │  └────────────────────────────────┘
```

### 5.2 评论面板与编辑器同步滚动

评论卡片的竖向位置与对应锚点在编辑器中的垂直位置对齐：

```typescript
// src/components/comments/CommentPanel.vue

function syncCommentPositions(): void {
  const editorView = editorStore.view;
  if (!editorView) return;

  for (const comment of visibleComments.value) {
    const { from } = comment.anchor;
    const actualFrom = comment.anchor.driftedFrom ?? from;

    try {
      // 获取锚点在编辑器中的 DOM 坐标
      const coords = editorView.coordsAtPos(actualFrom);
      const panelScrollTop = panelRef.value?.scrollTop ?? 0;
      const editorScrollTop = editorContainer.value?.scrollTop ?? 0;

      // 计算评论卡片应该在面板中的 top 偏移
      const targetTop = coords.top - editorContainer.value!.getBoundingClientRect().top
        + editorScrollTop - panelScrollTop;

      commentCardRefs.value[comment.id]?.style.setProperty('--comment-top', `${targetTop}px`);
    } catch {
      // coordsAtPos 可能因文档渲染延迟抛出，静默忽略
    }
  }
}
```

### 5.3 评论面板 Tab 切换

| Tab | 内容 |
|---|---|
| 评论 | 所有 pending + resolved 评论（resolved 可折叠） |
| Track Changes | 所有待处理的文档变更（按位置排序） |

---

## 6. 评论操作

### 6.1 创建评论

**触发方式**：
1. 选中文本 → 浮动工具栏显示"[Comment 图标] 添加评论"按钮
2. 选中文本 → 右键菜单 > "添加评论"

**创建流程**：
```
1. 用户选中文本（from, to）
2. 点击添加评论
3. 评论面板中弹出 inline 输入框（聚焦到文本区域）
4. 用户输入内容（支持 @mention）
5. 按 Ctrl+Enter 或点击"添加"按钮
6. 创建 Comment 记录：anchor.text = 选中文本，anchor.anchorStatus = 'exact'
7. 更新 Decoration，高亮显示
8. 写入审计日志：comment.create
```

### 6.2 @mention 输入

```typescript
// src/components/comments/CommentInput.vue

// 当用户在评论输入框中输入 @ 时
function handleMentionTrigger(searchText: string): Profile[] {
  const profiles = useProfileStore().sortedProfiles;
  return profiles.filter(p =>
    p.name.toLowerCase().includes(searchText.toLowerCase())
  );
}

// mention 选择后插入格式：@{profileName}（存储为 {profileId}）
function insertMention(profile: Profile): void {
  const mentionText = `@${profile.name}`;
  insertAtCursor(mentionText);
  currentMentions.value.push(profile.id);
}
```

**@ 触发 UI**：
- 输入 `@` 后弹出 Profile 列表（最多显示 5 个，支持继续输入过滤）
- 列表项：`[头像图标] Profile 名称`
- 方向键导航 + Enter 选择 + Escape 关闭

### 6.3 评论内容格式（Markdown 内联）

评论内容支持以下 Markdown 内联格式：

| 语法 | 效果 | 示例 |
|---|---|---|
| `**文字**` | 加粗 | **加粗文字** |
| `_文字_` | 斜体 | _斜体文字_ |
| `` `代码` `` | 行内代码 | `code` |
| `@名称` | @mention（渲染为带颜色的徽章） | @ZRainbow1275 |

渲染：使用轻量级 Markdown 渲染器（如 `marked` 仅启用 inline 规则），在评论卡片显示区渲染 HTML。

### 6.4 解决评论

```typescript
async function resolveComment(commentId: string): Promise<void> {
  await commentStore.resolve(commentId, currentProfileId);
  await auditLog('comment.resolve', {
    actorId: currentProfileId,
    profileId: currentProfileId,
    docId: currentDocId,
    resourceId: commentId,
    resourceKind: 'comment',
    payload: { commentId },
  });
}
```

解决后：
- `status` 变为 `resolved`，`resolvedAt` 和 `resolvedBy` 记录
- 高亮从琥珀色变为极淡灰色
- 评论卡片折叠（但可点击"展开"查看历史）

---

## 7. 审阅状态机（L1-16 C）

### 7.1 三态定义

| 状态 | 语义 | 颜色 | 图标（lucide） |
|---|---|---|---|
| `comment` | 普通评论，仅留言 | 琥珀色 | MessageSquare |
| `request-changes` | 请求更改，需要作者回应 | 橙红色 | AlertCircle |
| `approve` | 批准，认为内容没有问题 | 绿色 | CheckCircle |

### 7.2 审阅决策入口

评论面板顶部的审阅状态栏（v2.1 单用户模式下，仅 Owner 自己使用）：

```
┌──────────────────────────────────────────────────────────────┐
│  文档审阅状态：[待审阅]    [提交评论] [请求更改] [批准]      │
│                                                              │
│  待处理评论：3 个   已解决：12 个                            │
└──────────────────────────────────────────────────────────────┘
```

提交审阅决策时：
- 创建一个特殊的 `Comment`（`reviewDecision` 字段有值）
- 写入审计日志：`review.approve` / `review.request_changes`

---

## 8. 审阅模式（Track Changes）

### 8.1 开启与关闭

```
编辑器顶部工具栏右侧 → [审阅模式] Toggle 按钮（GitCompare 图标）
- 开启：按钮高亮，编辑器顶部显示"审阅模式"标识条
- 关闭：关闭前若有未处理变更，显示确认弹框
```

### 8.2 变更记录机制

```typescript
// src/editor/extensions/TrackChanges/TrackChangesExtension.ts

export const TrackChangesExtension = Extension.create({
  name: 'trackChanges',

  addOptions() {
    return { enabled: false };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        filterTransaction(tr, state) {
          if (!this.options.enabled) return true;
          if (!tr.docChanged) return true;

          // 拦截文档变更，转换为 TrackChange 记录
          for (const step of tr.steps) {
            const change = buildTrackChange(step, state, tr.doc);
            useCommentStore().addTrackChange(change);
          }

          // 替换原始 transaction，加入视觉标记（不实际应用原始变更到文档内容）
          return applyWithVisualMarkers(tr, state);
        },
      }),
    ];
  },
});
```

### 8.3 变更视觉表现

| 变更类型 | 视觉效果 |
|---|---|
| 插入文字 | 绿色背景 + 绿色下划线 |
| 删除文字 | 红色文字 + 红色删除线（文本保留在文档中） |
| 格式变更 | 黄色高亮（边框变为黄色） |

```css
/* src/styles/track-changes.css */

.track-insert {
  background-color: rgba(34, 197, 94, 0.15);
  text-decoration: underline;
  text-decoration-color: rgba(34, 197, 94, 0.8);
  color: inherit;
}

.track-delete {
  color: rgba(239, 68, 68, 0.9);
  text-decoration: line-through;
  background-color: rgba(239, 68, 68, 0.08);
}

.track-format {
  outline: 2px solid rgba(234, 179, 8, 0.6);
  outline-offset: 1px;
}
```

### 8.4 接受/拒绝操作

**单条变更操作**（悬停时在变更上方显示工具条）：

```
[接受] [拒绝]
```

**批量操作**（Track Changes 面板顶部）：

```
[接受全部] [拒绝全部] (共 N 个待处理变更)
```

```typescript
// src/services/comments/trackChanges.ts

async function acceptChange(changeId: string): Promise<void> {
  const change = useCommentStore().getTrackChange(changeId);
  if (!change) return;

  // 应用变更到文档
  if (change.kind === 'delete') {
    // 删除文字：从文档中真正移除
    editorStore.executeCommand('removeTrackedDeletion', { changeId });
  } else if (change.kind === 'insert') {
    // 插入文字：移除插入标记，变为普通文本
    editorStore.executeCommand('acceptTrackedInsertion', { changeId });
  }

  await useCommentStore().markChangeAccepted(changeId);
}

async function rejectChange(changeId: string): Promise<void> {
  const change = useCommentStore().getTrackChange(changeId);
  if (!change) return;

  if (change.kind === 'insert') {
    // 插入文字：从文档中移除
    editorStore.executeCommand('rejectTrackedInsertion', { changeId });
  } else if (change.kind === 'delete') {
    // 删除文字：恢复原始文本
    editorStore.executeCommand('rejectTrackedDeletion', { changeId });
  }

  await useCommentStore().markChangeRejected(changeId);
}
```

---

## 9. 批注（Margin Note）

### 9.1 特性定义

- 无精确字符锚点，关联到段落索引
- 在编辑器右侧边距显示小图标（MessageCircle）
- 鼠标悬停时弹出内容气泡
- 点击图标打开编辑 Modal

### 9.2 段落索引关联

```typescript
// 获取当前光标所在段落的索引
function getCurrentParagraphIndex(view: EditorView): number {
  const { $from } = view.state.selection;
  let index = 0;
  view.state.doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph') {
      if (pos <= $from.pos && $from.pos <= pos + node.nodeSize) {
        return false; // 找到了，停止遍历
      }
      index++;
    }
  });
  return index;
}
```

### 9.3 边距图标渲染

```typescript
// src/editor/extensions/MarginNote/MarginNoteDecoration.ts

// 在每个有批注的段落末尾添加 widget decoration
decorations.push(
  Decoration.widget(paragraphEndPos, () => {
    const icon = document.createElement('span');
    icon.className = 'margin-note-indicator';
    icon.dataset.noteId = note.id;
    // 使用 lucide MessageCircle 图标 SVG
    icon.innerHTML = MessageCircleIconSVG;
    icon.addEventListener('mouseenter', (e) => showNoteTooltip(note, e));
    icon.addEventListener('mouseleave', hideNoteTooltip);
    icon.addEventListener('click', () => openNoteModal(note.id));
    return icon;
  })
);
```

---

## 10. 评论导出（PDF 旁注）

### 10.1 pdfmake 注释实现

通过 `pdfmake` 的 annotation 功能将评论转换为 PDF 旁注：

```typescript
// src/services/export/commentExporter.ts

export function buildPdfAnnotations(
  comments: Comment[],
  docContent: string
): PdfAnnotation[] {
  return comments
    .filter(c => c.status !== 'deleted')
    .map(comment => ({
      // pdfmake annotation 格式
      type: 'text',
      x: 480,  // 右边距位置
      y: calculatePageY(comment.anchor.from, docContent),
      w: 100,
      h: 50,
      title: `评论 (${new Date(comment.createdAt).toLocaleDateString('zh-CN')})`,
      contents: stripMarkdown(comment.content),
      open: false,  // 默认折叠
      color: comment.status === 'resolved' ? '#9CA3AF' : '#F59E0B',
    }));
}

function calculatePageY(charPos: number, content: string): number {
  // 根据字符位置估算在 PDF 页面中的垂直位置
  // 使用简单的行数估算（每行约 80 字符，每行 14pt）
  const lineIndex = Math.floor(charPos / 80);
  const pageHeight = 842; // A4 高度（pt）
  const topMargin = 72;
  const lineHeight = 14;
  return topMargin + (lineIndex * lineHeight) % (pageHeight - topMargin * 2);
}

function stripMarkdown(md: string): string {
  // 去除 Markdown 标记，只保留纯文本用于 PDF 注释
  return md.replace(/\*\*(.+?)\*\*/g, '$1')
           .replace(/_(.+?)_/g, '$1')
           .replace(/`(.+?)`/g, '$1')
           .replace(/@(\S+)/g, '@$1');
}
```

---

## 11. Store 定义

```typescript
// src/stores/comment.ts

interface CommentStoreState {
  comments: Comment[];
  marginNotes: MarginNote[];
  trackChanges: TrackChange[];
  reviewMode: boolean;
  activeCommentId: string | null;
  panelVisible: boolean;
  panelTab: 'comments' | 'track-changes';
}

export const useCommentStore = defineStore('comment', {
  state: (): CommentStoreState => ({
    comments: [],
    marginNotes: [],
    trackChanges: [],
    reviewMode: false,
    activeCommentId: null,
    panelVisible: true,
    panelTab: 'comments',
  }),

  getters: {
    pendingComments: (state) =>
      state.comments.filter(c => c.status === 'pending'),

    resolvedComments: (state) =>
      state.comments.filter(c => c.status === 'resolved'),

    pendingCount: (state) =>
      state.comments.filter(c => c.status === 'pending').length,

    pendingTrackChanges: (state) =>
      state.trackChanges.filter(c => c.status === 'pending'),

    trackChangeCount: (state) =>
      state.trackChanges.filter(c => c.status === 'pending').length,

    getCommentsByAnchorRange: (state) => (from: number, to: number) =>
      state.comments.filter(c =>
        c.anchor.anchorStatus !== 'invalid' &&
        (c.anchor.driftedFrom ?? c.anchor.from) >= from &&
        (c.anchor.driftedTo ?? c.anchor.to) <= to
      ),
  },

  actions: {
    async loadComments(docId: string): Promise<void> {
      const repo = new CommentRepository();
      this.comments = await repo.getByDoc(docId);
      this.marginNotes = await repo.getMarginNotesByDoc(docId);
      this.trackChanges = await repo.getTrackChangesByDoc(docId);
    },

    async addComment(comment: Omit<Comment, 'id' | 'createdAt' | 'replies'>): Promise<Comment> {
      const newComment: Comment = {
        ...comment,
        id: nanoid(),
        createdAt: Date.now(),
        replies: [],
      };
      this.comments.push(newComment);
      await new CommentRepository().save(newComment);
      return newComment;
    },

    async resolve(commentId: string, byProfileId: string): Promise<void> {
      const comment = this.comments.find(c => c.id === commentId);
      if (comment) {
        comment.status = 'resolved';
        comment.resolvedAt = Date.now();
        comment.resolvedBy = byProfileId;
        await new CommentRepository().update(commentId, {
          status: 'resolved',
          resolvedAt: comment.resolvedAt,
          resolvedBy: byProfileId,
        });
      }
    },

    async addReply(commentId: string, reply: Omit<CommentReply, 'id' | 'createdAt'>): Promise<void> {
      const comment = this.comments.find(c => c.id === commentId);
      if (comment) {
        const newReply: CommentReply = { ...reply, id: nanoid(), createdAt: Date.now() };
        comment.replies.push(newReply);
        await new CommentRepository().update(commentId, { replies: comment.replies });
      }
    },

    async updateAllAnchors(oldContent: string, newContent: string): Promise<void> {
      const tracker = new AnchorDriftTracker();
      const repo = new CommentRepository();

      for (const comment of this.comments) {
        if (comment.status === 'deleted') continue;
        const updatedAnchor = tracker.updateAnchor(comment.anchor, oldContent, newContent);
        if (JSON.stringify(updatedAnchor) !== JSON.stringify(comment.anchor)) {
          comment.anchor = updatedAnchor;
          await repo.update(comment.id, { anchor: updatedAnchor });
        }
      }
    },

    addTrackChange(change: TrackChange): void {
      this.trackChanges.push(change);
    },

    async markChangeAccepted(changeId: string): Promise<void> {
      const change = this.trackChanges.find(c => c.id === changeId);
      if (change) {
        change.status = 'accepted';
        await new CommentRepository().updateTrackChange(changeId, { status: 'accepted' });
      }
    },

    async markChangeRejected(changeId: string): Promise<void> {
      const change = this.trackChanges.find(c => c.id === changeId);
      if (change) {
        change.status = 'rejected';
        await new CommentRepository().updateTrackChange(changeId, { status: 'rejected' });
      }
    },

    toggleReviewMode(): void {
      this.reviewMode = !this.reviewMode;
    },
  },
});
```

---

## 12. Repository 定义

```typescript
// src/repositories/CommentRepository.ts

export class CommentRepository {
  async getByDoc(docId: string): Promise<Comment[]> {
    return db.comments.where('docId').equals(docId).toArray();
  }

  async save(comment: Comment): Promise<void> {
    await db.comments.add(comment);
  }

  async update(id: string, partial: Partial<Comment>): Promise<void> {
    await db.comments.update(id, { ...partial, updatedAt: Date.now() });
  }

  async softDelete(id: string): Promise<void> {
    await db.comments.update(id, {
      status: 'deleted',
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  async getMarginNotesByDoc(docId: string): Promise<MarginNote[]> {
    return db.margin_notes.where('docId').equals(docId).toArray();
  }

  async saveMarginNote(note: MarginNote): Promise<void> {
    await db.margin_notes.add(note);
  }

  async getTrackChangesByDoc(docId: string): Promise<TrackChange[]> {
    return db.track_changes.where('docId').equals(docId).toArray();
  }

  async saveTrackChange(change: TrackChange): Promise<void> {
    await db.track_changes.add(change);
  }

  async updateTrackChange(id: string, partial: Partial<TrackChange>): Promise<void> {
    await db.track_changes.update(id, partial);
  }
}
```

---

## 13. IndexedDB 表结构（新增）

```typescript
// src/db/schema.ts

// comments: 评论
// 主键：id
// 索引：docId, status, createdAt, authorId

// margin_notes: 页边批注
// 主键：id
// 索引：docId, paragraphIndex

// track_changes: 审阅变更记录
// 主键：id
// 索引：docId, status, createdAt
```

---

## 14. 性能约束

| 指标 | 目标值 | 说明 |
|---|---|---|
| 评论加载（100 条）| ≤ 100ms | 打开文档时并行加载 |
| 锚点漂移更新（100 条评论）| ≤ 200ms（防抖后） | 编辑时防抖 500ms |
| 评论面板同步滚动 | 无明显卡顿（60fps） | 使用 rAF 节流 |
| Track Changes 接受全部（100 条）| ≤ 1s | 批量 DB 写入 |

---

## 15. 测试矩阵（≥ 25 条）

| 编号 | 类型 | 测试场景 | 预期结果 |
|---|---|---|---|
| T-01 | 单元 | `AnchorDriftTracker.updateAnchor`：无变化文档 | anchorStatus = 'exact'，位置不变 |
| T-02 | 单元 | 锚点漂移：锚前插入文本 | from/to 右移，anchorStatus = 'drifted' |
| T-03 | 单元 | 锚点漂移：锚前删除文本 | from/to 左移，anchorStatus = 'drifted' |
| T-04 | 单元 | 锚点失效：原始文本被完全删除 | anchorStatus = 'invalid' |
| T-05 | 单元 | 锚点漂移：文本移动到其他位置 | 找到新位置，anchorStatus = 'drifted' |
| T-06 | 单元 | `buildOffsetMap` 只读操作（插入）映射 | 新位置 = 旧位置 + 插入长度 |
| T-07 | 单元 | `buildOffsetMap` 只读操作（删除）映射 | 被删除位置映射到删除点 |
| T-08 | 单元 | Comment 状态机：pending → resolved | status = 'resolved'，resolvedAt 有值 |
| T-09 | 单元 | Comment 状态机：resolved 不可再 resolved | 操作被忽略或报错 |
| T-10 | 单元 | @mention 插入：mentions 数组更新 | mentions 包含 profileId |
| T-11 | 单元 | Markdown 内联渲染：**加粗** → `<strong>` | HTML 包含 strong 标签 |
| T-12 | 单元 | `stripMarkdown`：去除加粗/斜体/代码标记 | 返回纯文本 |
| T-13 | 集成 | 创建评论：IndexedDB 写入成功 | comments 表存在记录 |
| T-14 | 集成 | 创建评论：审计日志 comment.create 写入 | 审计日志可查询 |
| T-15 | 集成 | 解决评论：审计日志 comment.resolve 写入 | 审计日志可查询 |
| T-16 | 集成 | 添加回复：replies 数组更新 | 评论记录 replies 长度 +1 |
| T-17 | 集成 | 创建 Margin Note：margin_notes 表写入 | 记录存在 |
| T-18 | 集成 | Track Changes 接受：变更移除标记 | trackChange.status = 'accepted' |
| T-19 | 集成 | Track Changes 拒绝：内容恢复原始 | 文档内容恢复 |
| T-20 | E2E | 选中文本 → 添加评论 → 高亮显示 | 锚定区域有琥珀色高亮 |
| T-21 | E2E | 评论面板与编辑器同步滚动对齐 | 卡片位置与锚点垂直对齐 |
| T-22 | E2E | 解决评论后高亮变为灰色 | 高亮颜色从琥珀色变淡 |
| T-23 | E2E | 开启审阅模式后插入文字显示绿色下划线 | 绿色 insert 样式可见 |
| T-24 | E2E | 开启审阅模式后删除文字显示红色删除线 | 红色 delete 样式可见，文本保留 |
| T-25 | E2E | 接受全部变更后文档内容正确 | 无 track-* 样式残留 |
| T-26 | E2E | 批注悬停显示内容气泡 | 悬停后气泡出现 |
| T-27 | E2E | 评论导出 PDF 包含旁注 | PDF 文件可打开，注释可见 |
| T-28 | 性能 | 100 条评论加载 | ≤ 100ms |
| T-29 | 性能 | 锚点漂移更新（100 条）| ≤ 200ms（防抖后） |

---

## 16. 落地文件索引

| 文件路径 | 说明 |
|---|---|
| `src/services/comments/types.ts` | Comment / MarginNote / TrackChange 类型定义 |
| `src/services/comments/anchorDrift.ts` | 锚点漂移算法 |
| `src/services/comments/trackChanges.ts` | 接受/拒绝变更逻辑 |
| `src/repositories/CommentRepository.ts` | 数据访问层 |
| `src/stores/comment.ts` | Pinia Store |
| `src/editor/extensions/Comment/CommentDecoration.ts` | 评论高亮 Decoration |
| `src/editor/extensions/Comment/CommentExtension.ts` | TipTap 扩展入口 |
| `src/editor/extensions/TrackChanges/TrackChangesExtension.ts` | Track Changes TipTap 扩展 |
| `src/editor/extensions/MarginNote/MarginNoteDecoration.ts` | 批注边距图标 |
| `src/editor/plugins/anchorDriftPlugin.ts` | 漂移触发 ProseMirror 插件 |
| `src/components/comments/CommentPanel.vue` | 评论面板主组件 |
| `src/components/comments/CommentCard.vue` | 单个评论卡片 |
| `src/components/comments/CommentInput.vue` | 评论输入框（含 @mention） |
| `src/components/comments/TrackChangesPanel.vue` | Track Changes 面板 |
| `src/components/comments/MarginNoteTooltip.vue` | 批注悬停气泡 |
| `src/services/export/commentExporter.ts` | 评论导出（PDF 旁注） |
| `src/styles/comments.css` | 评论高亮样式 |
| `src/styles/track-changes.css` | Track Changes 样式 |

---

## 17. 2026-05-02 Baseline Implementation Note

Baseline status: compatible local-first service/store baseline completed. Full Spec 32 remains partially pending until the live Tiptap decorations, review panel UI, Track Changes editor plugin, margin-note tooltip, and PDF side-note export are fully wired.

Accepted baseline coverage:

- `src/utils/db.ts` adds Dexie v14 stores for `comments`, `marginNotes`, and `trackChanges` without deleting or replacing existing tables.
- `src/services/comment-review/types.ts` defines zod-validated Comment, Reply, Anchor, MarginNote, and TrackChange records.
- `src/services/comment-review/anchorDrift.ts` implements deterministic exact, drifted, and invalid anchor states with text and context fallback.
- `src/services/comment-review/repository.ts` persists comments, replies, margin notes, and track changes through real Dexie tables and writes existing audit actions for comment/review events.
- `src/services/comment-review/markdown.ts` extracts local mentions, strips inline Markdown, and renders sanitized inline review HTML without external fake profile data.
- `src/services/comment-review/trackChanges.ts` provides explicit accept/reject text application helpers for pending track-change records.
- `src/stores/commentReview.ts` exposes service-backed Pinia loading, mutation, error, summary, comments, margin notes, and track changes state.

Validation evidence:

- `python ./.trellis/scripts/task.py validate .trellis/tasks/05-02-05-02-p1-32-comment-review` passed.
- `pnpm exec vitest run src/services/comment-review/comment-review.test.ts` passed with 7 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm exec vitest run` passed with 13 files and 85 tests.
- `pnpm build` passed with only existing non-blocking Vite warnings.
- Browser smoke used the real Vite runtime and IndexedDB v14 to create a comment, reply, margin note, track change, audit rows, anchor drift update, Markdown render/strip, track-change text application, and cleanup. Console errors were 0, and ports `5183` and `5184` were closed after the smoke.

Pending for full Spec 32 pass:

- Live Tiptap/ProseMirror DecorationSet extension mapping through transactions.
- CommentPanel, CommentCard, CommentInput, TrackChangesPanel, and MarginNoteTooltip UI wired to the store.
- Floating toolbar and context-menu entry points for selected text comments.
- PDF side-note export and full review-mode export path.
- Multi-user review assignment, deadlines, CRDT/Yjs remote position mapping, semantic reanchoring, 100-comment performance benchmark, E2E, and accessibility matrix.

