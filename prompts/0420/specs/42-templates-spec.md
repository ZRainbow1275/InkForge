> 版本: v2.1 | 状态: Draft | 关联决策: EX-08 / F-05 D / L1-09 D / L1-27 D | 依赖 Spec: 31-document-lifecycle-spec.md / 17-search-engine-spec.md / 22-command-palette-spec.md

# 文档模板系统技术规格说明

---

## 目录

1. 功能概述与设计哲学
2. 内置模板体系
3. 模板 Frontmatter Schema
4. 模板变量系统
5. 用户自定义模板
6. 模板管理页面
7. 模板导入与导出
8. 新建文档弹窗（模板选择步骤）
9. TemplateRepository
10. useTemplateStore
11. TypeScript 类型全量定义
12. 斜杠命令集成
13. 命令面板集成
14. 扩展 API
15. 性能要求
16. 无障碍（a11y）要求
17. 测试矩阵

---

## 1. 功能概述与设计哲学

### 1.1 决策来源

模板系统来源于 EX-08（v2.1 实现）和 F-05 D（草稿多入口创建）。文档模板系统旨在让用户快速创建具有预定义结构的文档，降低从空白文档开始的心理门槛。

### 1.2 核心设计原则

**模板即 Markdown**：所有模板以 Markdown 文件格式存储和传输，通过 YAML Frontmatter 携带模板元信息，保持内容可移植性。

**变量系统即时替换**：模板中的变量（`{{title}}`、`{{date}}`、`{{CURSOR}}` 等）在文档创建时立即替换，不留待编辑时处理。

**用户数据优先**：用户自定义模板优先级高于内置模板，用户可覆盖同名模板。

**轻量管理界面**：模板管理不做复杂的版本控制，以简洁的列表/搜索/导入导出为主。

### 1.3 模板系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    模板选择入口                          │
│  新建文档弹窗 / 斜杠命令 /template / 命令面板            │
└────────────────────────┬────────────────────────────────┘
                         │
               ┌─────────▼──────────┐
               │   TemplateService   │
               │  • 渲染模板变量     │
               │  • 创建文档副本     │
               │  • 触发 CURSOR 定位 │
               └─────────┬──────────┘
                         │
         ┌───────────────▼──────────────────┐
         │         TemplateRepository        │
         │  • 内置模板（只读，bundle 内置）  │
         │  • 用户模板（IndexedDB 存储）     │
         │  • 导入/导出（.md 文件交换）      │
         └──────────────────────────────────┘
```

---

## 2. 内置模板体系

### 2.1 内置模板列表（8 种）

| 编号 | 模板名称 | 描述 | 分类 |
|------|---------|------|------|
| 1 | 空白 | 没有任何预置内容，纯净写作起点 | 基础 |
| 2 | 日记 | 含日期/心情 frontmatter，适合每日记录 | 日常 |
| 3 | 周报 | 含本周目标/回顾/下周计划结构 | 工作 |
| 4 | 技术文档 | 含概述/API 描述/示例/注意事项骨架 | 技术 |
| 5 | 读书笔记 | 含书名/作者/评分/内容摘要结构 | 知识 |
| 6 | 会议记录 | 含会议时间/与会人/议程/行动项结构 | 工作 |
| 7 | 项目计划 | 含项目概述/里程碑表格/风险清单结构 | 工作 |
| 8 | Zettelkasten | 含永久笔记 ID/标签/关联笔记结构 | 知识 |

### 2.2 内置模板源文件（完整内容）

#### 模板 1：空白（blank）

```markdown
---
title: "{{title}}"
date: {{date:YYYY-MM-DD}}
tags: []
---

{{CURSOR}}
```

#### 模板 2：日记（diary）

```markdown
---
title: "{{date:YYYY年MM月DD日}} 日记"
date: {{date:YYYY-MM-DD}}
mood: neutral
tags: [日记]
---

# {{date:YYYY年MM月DD日}}

{{CURSOR}}

## 今日回顾

**发生了什么**


**感受**


**明日计划**

```

#### 模板 3：周报（weekly-report）

```markdown
---
title: "{{date:YYYY}} 第 {{weekNumber}} 周周报"
date: {{date:YYYY-MM-DD}}
week: {{weekNumber}}
tags: [周报, 工作]
---

# 第 {{weekNumber}} 周周报（{{date:MM/DD}}）

## 本周目标回顾

| 目标 | 完成情况 | 备注 |
|------|---------|------|
|      |         |      |

## 本周完成事项

{{CURSOR}}

## 遇到的问题与解决方案

## 下周计划

| 计划 | 优先级 | 预计完成日期 |
|------|--------|------------|
|      |        |            |

```

#### 模板 4：技术文档（tech-doc）

```markdown
---
title: "{{title}}"
author: "{{author}}"
date: {{date:YYYY-MM-DD}}
version: "1.0.0"
tags: [技术, 文档]
description: ""
---

# {{title}}

## 概述

{{CURSOR}}

## 功能说明

## API 参考

### 接口名称

**描述**：

**参数**：

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
|        |      |      |        |      |

**返回值**：

**示例**：

```typescript
// 代码示例
```

## 注意事项

## 更新日志

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| 1.0.0 | {{date:YYYY-MM-DD}} | 初始版本 |

```

#### 模板 5：读书笔记（book-notes）

```markdown
---
title: "《{{bookTitle}}》读书笔记"
date: {{date:YYYY-MM-DD}}
book_title: "{{bookTitle}}"
author: ""
rating: 0
tags: [读书笔记]
---

# 《{{bookTitle}}》读书笔记

**作者**：  
**豆瓣评分**：  
**我的评分**：{{rating}}/5  
**阅读完成日期**：{{date:YYYY-MM-DD}}

---

## 一句话概括

{{CURSOR}}

## 核心观点

## 精彩摘录

> 摘录内容

---

## 个人思考

## 行动要点

## 推荐人群

```

#### 模板 6：会议记录（meeting-notes）

```markdown
---
title: "{{title}} — 会议记录"
date: {{date:YYYY-MM-DD}}
time: ""
attendees: []
tags: [会议记录]
---

# {{title}}

**日期**：{{date:YYYY年MM月DD日}}  
**时间**：  
**与会人员**：  
**主持人**：

---

## 议程

1. 

## 讨论内容

{{CURSOR}}

## 决策与结论

## 行动项

| 行动项 | 负责人 | 截止日期 | 状态 |
|--------|--------|---------|------|
|        |        |         | 待处理 |

## 下次会议

**时间**：  
**议题**：

```

#### 模板 7：项目计划（project-plan）

```markdown
---
title: "{{title}} — 项目计划"
date: {{date:YYYY-MM-DD}}
status: 规划中
tags: [项目计划]
---

# {{title}} 项目计划

**项目负责人**：{{author}}  
**启动日期**：{{date:YYYY-MM-DD}}  
**预计完成**：  
**项目状态**：规划中

---

## 项目概述

{{CURSOR}}

## 目标与成功标准

### 目标

### 成功标准（OKR / KPI）

## 里程碑规划

| 里程碑 | 目标 | 截止日期 | 状态 |
|--------|------|---------|------|
| M1 |  |  | 未开始 |
| M2 |  |  | 未开始 |
| M3 |  |  | 未开始 |

## 主要任务分解

## 风险与应对

| 风险 | 可能性 | 影响 | 应对策略 |
|------|--------|------|---------|
|      |        |      |         |

## 资源需求

## 相关文档

```

#### 模板 8：Zettelkasten（zettelkasten）

```markdown
---
title: "{{title}}"
id: "{{uuid}}"
date: {{date:YYYY-MM-DD}}
tags: []
links: []
type: permanent
---

# {{title}}

**ID**：{{uuid}}  
**创建于**：{{date:YYYY-MM-DD}}  
**来源**：

---

## 核心思想

{{CURSOR}}

## 论据与证据

## 与其他笔记的关联

- [[]] — 
- [[]] — 

## 参考资料

```

---

## 3. 模板 Frontmatter Schema

### 3.1 模板元信息 Frontmatter

模板文件本身通过特殊的 Frontmatter 携带模板元信息（与文档 Frontmatter 区分）：

```typescript
interface TemplateFrontmatter {
  /** 模板显示名称 */
  title: string;
  /** 作者/创建者 */
  author?: string;
  /** 模板版本号 */
  version?: string;
  /** 模板变量声明列表 */
  variables?: TemplateVariable[];
  /** 标签列表（用于模板管理页面分类过滤） */
  tags?: string[];
  /** 模板简短描述 */
  description?: string;
  /** 缩略图路径（相对于模板文件，可选）*/
  thumbnail?: string;
  /** 分类（内置分类：基础/日常/工作/技术/知识） */
  category?: string;
  /** 是否为 InkForge 模板（标记字段，导入时识别） */
  inkforge_template?: boolean;
  /** 模板格式版本（用于向后兼容） */
  schema_version?: string;
}
```

### 3.2 内置模板的 Frontmatter 示例

```yaml
---
inkforge_template: true
schema_version: "1"
title: "周报"
author: "InkForge"
version: "1.0.0"
category: "工作"
description: "包含本周目标回顾和下周计划的周报模板"
tags: [工作, 周报]
variables:
  - name: title
    label: "文档标题"
    type: text
    required: false
    default: "周报"
  - name: date
    label: "日期"
    type: date
    format: YYYY-MM-DD
    required: true
    autoFill: true
  - name: weekNumber
    label: "周次"
    type: computed
    expression: "currentWeekNumber"
---
```

---

## 4. 模板变量系统

### 4.1 内置变量列表

| 变量语法 | 类型 | 说明 | 替换时机 |
|---------|------|------|---------|
| `{{title}}` | 用户输入 | 文档标题 | 新建文档时弹窗填写，默认为空白 |
| `{{date:YYYY-MM-DD}}` | 自动 | 当前日期，支持格式字符串 | 创建文档时自动填入 |
| `{{date:YYYY年MM月DD日}}` | 自动 | 中文日期格式 | 创建文档时自动填入 |
| `{{date:MM/DD}}` | 自动 | 短日期格式 | 创建文档时自动填入 |
| `{{author}}` | 账户 | 当前账户用户名 | 创建文档时从账户设置读取 |
| `{{CURSOR}}` | 特殊 | 光标初始位置 | 文档创建后，编辑器光标定位到此处 |
| `{{uuid}}` | 自动 | 生成随机 UUID（v4） | 创建文档时自动生成 |
| `{{weekNumber}}` | 自动 | 当前年内第几周（ISO 8601） | 创建文档时自动计算 |
| `{{bookTitle}}` | 用户输入 | 书名（读书笔记专用变量） | 新建文档时弹窗填写 |
| `{{rating}}` | 用户输入 | 评分（1-5，读书笔记专用） | 新建文档时弹窗填写 |

### 4.2 日期格式字符串

日期格式使用 Day.js 格式字符串规范：

| 格式字符 | 含义 | 示例 |
|---------|------|------|
| `YYYY` | 四位年份 | 2026 |
| `MM` | 两位月份 | 04 |
| `DD` | 两位日期 | 21 |
| `HH` | 两位小时（24h） | 15 |
| `mm` | 两位分钟 | 30 |

### 4.3 变量替换引擎

```typescript
// src/services/template/variable-engine.ts

interface VariableContext {
  /** 用户在弹窗中输入的变量值 */
  userInputs: Record<string, string>;
  /** 当前账户用户名 */
  authorName: string;
  /** 创建时间 */
  createdAt: Date;
}

class TemplateVariableEngine {
  /**
   * 将模板内容中的所有变量替换为实际值
   * @returns 替换后的文档内容 + CURSOR 位置偏移量
   */
  render(
    templateContent: string,
    context: VariableContext
  ): { content: string; cursorOffset: number | null };

  /**
   * 提取模板中所有需要用户输入的变量
   * （排除自动变量：date / author / uuid / weekNumber）
   */
  extractUserInputVariables(templateContent: string): TemplateVariable[];

  /**
   * 验证模板内容语法（检查未关闭的变量 {{...}}）
   */
  validate(templateContent: string): ValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: { message: string; position: number }[];
}
```

### 4.4 变量替换顺序

1. 替换 `{{CURSOR}}`：记录其在内容中的字符偏移位置，然后从内容中移除该标记（保留位置信息）
2. 替换所有自动变量：`{{date:*}}`、`{{uuid}}`、`{{weekNumber}}`
3. 替换账户变量：`{{author}}`
4. 替换用户输入变量：`{{title}}`、`{{bookTitle}}` 等

### 4.5 CURSOR 定位逻辑

```typescript
async function applyTemplateToEditor(
  editor: Editor,
  renderedContent: string,
  cursorOffset: number | null
): Promise<void> {
  // 设置编辑器内容（Markdown 解析后的 ProseMirror 文档）
  editor.commands.setContent(renderedContent);

  if (cursorOffset !== null) {
    // 将字符偏移转换为 ProseMirror 位置（pos）
    const pos = findProseMirrorPosFromOffset(editor, cursorOffset);
    editor.commands.setTextSelection(pos);
    editor.commands.focus();
  } else {
    // 无 CURSOR 标记时，光标定位到文档末尾
    editor.commands.focus('end');
  }
}
```

---

## 5. 用户自定义模板

### 5.1 「另存为模板」入口

用户可以将当前文档保存为模板，入口位于：
- **文档菜单**（TabBar 右键菜单 > "另存为模板"）
- **命令面板**：`document.saveAsTemplate`

### 5.2 另存为模板流程

```
用户触发"另存为模板"
        │
        ▼
弹出模板信息填写对话框
┌──────────────────────────────────┐
│  保存为模板                       │
│                                  │
│  模板名称：[输入框，必填]          │
│  描述：[输入框，选填，最多 100 字] │
│  分类：[下拉选择]                  │
│  标签：[标签输入，可多选]           │
│                                  │
│  [取消]            [保存模板]     │
└──────────────────────────────────┘
        │
        ▼
生成模板文件（Frontmatter 插入模板元信息）
        │
        ▼
存储到 IndexedDB `templates` store
        │
        ▼
Toast "模板已保存" + 跳转到模板管理入口
```

### 5.3 用户模板与内置模板的优先级

- 用户模板和内置模板在模板选择弹窗中并列展示
- 分类 Tab 中"我的模板"优先显示
- 若用户模板与内置模板同名，两者均展示，不自动覆盖

### 5.4 模板编辑

- 用户模板可在模板管理页面（Settings > 模板）中编辑
- 编辑器复用 InkForge 主编辑器（完整功能），但文档类型标记为"模板文件"
- 编辑完成后更新 IndexedDB 记录

### 5.5 模板删除

- 删除入口：模板管理页面，每个模板项的"删除"按钮
- 需要二次确认（L1-40 C 防呆）：
  ```
  确认删除模板"模板名称"？此操作不可撤销。
  [取消]  [删除]
  ```
- 内置模板不可删除

---

## 6. 模板管理页面

### 6.1 路由

```
路由：/settings/templates
组件：src/views/settings/TemplatesView.vue
```

### 6.2 页面布局

```
┌──────────────────────────────────────────────────────────────┐
│  设置 > 模板                                                  │
├──────────────────────────────────────────────────────────────┤
│  [搜索模板...]                      [导入模板] [新建模板]     │
├──────────────────────────────────────────────────────────────┤
│  Tab: [全部] [内置] [我的模板] [工作] [日常] [技术] [知识]    │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ [缩略图]    │  │ [缩略图]    │  │ [缩略图]    │       │
│  │ 模板名称    │  │ 模板名称    │  │ 模板名称    │       │
│  │ 简短描述    │  │ 简短描述    │  │ 简短描述    │       │
│  │ 内置 · 工作 │  │ 内置 · 日常 │  │ 我的 · 知识 │       │
│  │ [使用] […] │  │ [使用] […] │  │ [使用] [编辑][删除]│  │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├──────────────────────────────────────────────────────────────┤
│  导出选中模板                                                  │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 模板卡片规格

每个模板卡片展示：

| 字段 | 规格 |
|------|------|
| 缩略图 | 120px × 80px，若无缩略图则显示文字预览（模板内容前 50 字） |
| 模板名称 | 一行截断，最大 16 字 |
| 描述 | 两行截断 |
| 标签 | "内置" 或 "我的" 徽标 + 分类名 |
| 操作按钮 | 内置模板：[使用] [···]（···展开导出）；用户模板：[使用] [编辑] [删除] |

### 6.4 模板搜索

搜索范围：模板名称、描述、标签。实时过滤（150ms 防抖）。复用 MiniSearch（与帮助搜索同一库）。

---

## 7. 模板导入与导出

### 7.1 模板文件格式

模板交换格式为 `.md` 文件，Frontmatter 中必须包含 `inkforge_template: true` 标记：

```markdown
---
inkforge_template: true
schema_version: "1"
title: "我的自定义模板"
author: "{{author}}"
version: "1.0.0"
category: "工作"
description: "这是我的模板"
tags: [自定义]
variables:
  - name: title
    label: "文档标题"
    type: text
    required: false
---

# {{title}}

{{CURSOR}}

## 内容

```

### 7.2 导入流程

**触发方式**：
- 模板管理页面"导入模板"按钮 → 文件选择器（`.md` 文件）
- 拖拽 `.md` 文件到模板管理页面（拖拽区域提示）

**导入逻辑**：

```typescript
async function importTemplate(file: File): Promise<ImportResult> {
  const content = await file.text();
  
  // 解析 Frontmatter
  const { data: frontmatter, content: body } = parseFrontmatter(content);
  
  // 验证是否为 InkForge 模板
  if (!frontmatter.inkforge_template) {
    // 非标准模板文件，弹出询问对话框
    const confirmed = await confirmNonStandardImport(file.name);
    if (!confirmed) return { success: false, reason: 'user_cancelled' };
    // 用户确认后，以文件名为模板名，无 frontmatter 元信息
  }
  
  // 验证模板变量语法
  const validation = templateVariableEngine.validate(content);
  if (!validation.isValid) {
    return { success: false, reason: 'invalid_variables', errors: validation.errors };
  }
  
  // 存储到 IndexedDB
  const template = createUserTemplate(frontmatter, body);
  await templateRepository.create(template);
  
  return { success: true, templateId: template.id };
}
```

**导入结果**：
- 成功：Toast "模板已导入" + 跳转到模板管理
- 失败（无效格式）：Toast "导入失败：模板格式不正确" + 错误详情

### 7.3 导出流程

**触发方式**：
- 模板管理页面"导出选中模板"按钮（批量）
- 单个模板"···"菜单 > "导出此模板"

**导出格式**：
- 单个模板：下载 `{模板名称}.inkforge-template.md` 文件
- 多个模板：下载 `inkforge-templates-{timestamp}.zip`，每个模板为一个 `.md` 文件

**导出内容**：完整 Frontmatter（含所有元信息）+ 模板正文。不含用户个人数据（导出时将 `{{author}}` 保留为变量而非替换）。

---

## 8. 新建文档弹窗（模板选择步骤）

### 8.1 触发方式

| 触发方式 | 说明 |
|---------|------|
| Hub"新建文档"按钮 | 打开模板选择弹窗 |
| 文件管理器"新建"按钮 | 打开模板选择弹窗 |
| `Ctrl+N` | 打开模板选择弹窗 |
| 命令面板 `document.create` | 打开模板选择弹窗 |
| 斜杠命令 `/template` | 当前位置插入模板内容（另一种形态） |

### 8.2 弹窗结构

```
┌──────────────────────────────────────────────────────────────┐  ← 620px 宽
│  新建文档                                                     │
├──────────────────────────────────────────────────────────────┤
│  [搜索模板...]                                               │
├──────────────────────────────────────────────────────────────┤
│  [全部] [内置] [我的] [工作] [日常] [技术] [知识]             │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  空白    │  │  日记    │  │  周报    │  │  技术文档 │    │
│  │          │  │          │  │          │  │          │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ 读书笔记 │  │ 会议记录 │  │ 项目计划 │  │Zettel... │    │
│  │          │  │          │  │          │  │          │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
├──────────────────────────────────────────────────────────────┤
│  [取消]                                      [使用此模板]    │
└──────────────────────────────────────────────────────────────┘
```

### 8.3 弹窗交互规格

- 弹窗打开时默认选中"空白"模板（总是可用）
- 键盘导航：方向键在卡片间移动，Enter 使用选中模板，Esc 取消
- 单击卡片选中（不立即创建），双击立即创建
- 卡片 hover 时展示完整描述 Tooltip
- 搜索时实时过滤卡片（150ms 防抖）

### 8.4 变量填写步骤（若模板有用户输入变量）

当用户点击"使用此模板"，且该模板有需要用户输入的变量时，弹出变量填写步骤（内嵌在同一弹窗中）：

```
┌──────────────────────────────────────────────────────────────┐
│  填写模板信息 — 读书笔记                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  书名：[输入框]                                              │
│  评分：[1-5 星评分组件]                                      │
│                                                              │
│  [返回]                                      [创建文档]      │
└──────────────────────────────────────────────────────────────┘
```

**规格**：
- 仅展示需要用户输入的变量（自动变量不展示）
- 字段为空时允许直接创建（变量替换为空字符串）
- "创建文档"按钮不因字段为空而禁用（允许用空模板）

---

## 9. TemplateRepository

```typescript
// src/repositories/template.repository.ts

class TemplateRepository {
  /**
   * 获取所有模板（内置 + 用户自定义）
   */
  async getAll(): Promise<Template[]>;

  /**
   * 按分类获取模板
   */
  async getByCategory(category: TemplateCategory): Promise<Template[]>;

  /**
   * 按 id 获取模板
   */
  async getById(id: string): Promise<Template | null>;

  /**
   * 搜索模板
   */
  async search(query: string): Promise<Template[]>;

  /**
   * 创建用户自定义模板
   */
  async create(template: CreateTemplateInput): Promise<Template>;

  /**
   * 更新用户自定义模板（内置模板不可更新）
   */
  async update(id: string, updates: UpdateTemplateInput): Promise<Template>;

  /**
   * 删除用户自定义模板（内置模板不可删除）
   */
  async delete(id: string): Promise<void>;

  /**
   * 从模板创建文档（含变量替换）
   * @returns 新创建的文档 id
   */
  async createDocumentFromTemplate(
    templateId: string,
    userInputs: Record<string, string>,
    targetCategoryId?: string
  ): Promise<string>;

  /**
   * 将当前文档另存为模板
   */
  async saveDocumentAsTemplate(
    articleId: string,
    meta: TemplateMeta
  ): Promise<Template>;

  /**
   * 导入模板文件
   */
  async importFromFile(file: File): Promise<ImportResult>;

  /**
   * 导出模板为文件
   */
  async exportToFile(templateId: string): Promise<Blob>;

  /**
   * 批量导出为 ZIP
   */
  async exportBatchToZip(templateIds: string[]): Promise<Blob>;
}

interface CreateTemplateInput {
  title: string;
  content: string;          // 完整 Markdown 内容（含 Frontmatter）
  category?: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;       // base64 或文件路径
}

interface UpdateTemplateInput {
  title?: string;
  content?: string;
  category?: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
}

interface TemplateMeta {
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
}

interface ImportResult {
  success: boolean;
  templateId?: string;
  reason?: 'user_cancelled' | 'invalid_format' | 'invalid_variables' | 'db_error';
  errors?: { message: string; position?: number }[];
}
```

---

## 10. useTemplateStore

```typescript
// src/stores/templates.ts

interface TemplateStoreState {
  /** 全部模板列表（内置 + 用户） */
  templates: Template[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误状态 */
  error: Error | null;
  /** 当前搜索词 */
  searchQuery: string;
  /** 当前分类过滤 */
  activeCategory: TemplateCategory | 'all' | 'builtin' | 'user';
  /** 新建文档弹窗是否打开 */
  isNewDocModalOpen: boolean;
  /** 新建文档弹窗的当前步骤 */
  newDocStep: 'select-template' | 'fill-variables';
  /** 当前选中的模板 */
  selectedTemplateId: string | null;
  /** 用户在变量填写步骤的输入值 */
  variableInputs: Record<string, string>;
}

interface TemplateStoreActions {
  /** 加载所有模板 */
  loadAll(): Promise<void>;
  /** 刷新列表 */
  refresh(): Promise<void>;
  /** 设置搜索词 */
  setSearchQuery(query: string): void;
  /** 设置分类过滤 */
  setCategory(category: string): void;
  /** 打开新建文档弹窗 */
  openNewDocModal(): void;
  /** 关闭新建文档弹窗 */
  closeNewDocModal(): void;
  /** 选择模板 */
  selectTemplate(id: string): void;
  /** 进入变量填写步骤 */
  proceedToVariableFill(): void;
  /** 返回模板选择步骤 */
  backToTemplateSelect(): void;
  /** 更新变量输入 */
  setVariableInput(key: string, value: string): void;
  /** 使用选中模板创建文档 */
  createDocument(): Promise<string | null>;
  /** 从文档创建模板 */
  saveAsTemplate(articleId: string, meta: TemplateMeta): Promise<void>;
  /** 删除用户模板 */
  deleteTemplate(id: string): Promise<void>;
  /** 导入模板 */
  importTemplate(file: File): Promise<ImportResult>;
  /** 导出模板 */
  exportTemplate(id: string): Promise<void>;
}

interface TemplateStoreGetters {
  /** 过滤后的模板列表 */
  filteredTemplates: (state: TemplateStoreState) => Template[];
  /** 内置模板列表 */
  builtinTemplates: (state: TemplateStoreState) => Template[];
  /** 用户模板列表 */
  userTemplates: (state: TemplateStoreState) => Template[];
  /** 当前选中的模板对象 */
  selectedTemplate: (state: TemplateStoreState) => Template | null;
  /** 选中模板的用户输入变量列表 */
  selectedTemplateVariables: (state: TemplateStoreState) => TemplateVariable[];
  /** 是否需要用户输入变量（决定是否显示变量填写步骤） */
  needsVariableInput: (state: TemplateStoreState) => boolean;
}
```

---

## 11. TypeScript 类型全量定义

```typescript
// src/types/template.ts

export interface Template {
  id: string;
  /** 内置模板有固定 id（如 'blank', 'diary'），用户模板为 UUID */
  isBuiltin: boolean;
  title: string;
  content: string;         // 完整 Markdown（含 Frontmatter）
  category: string;
  description: string;
  tags: string[];
  thumbnail: string | null; // base64 或文件路径
  variables: TemplateVariable[];
  createdAt: number;
  updatedAt: number;
  /** 使用次数（用于"常用模板"排序） */
  useCount: number;
}

export interface TemplateVariable {
  /** 变量名（对应 {{name}} 语法中的 name） */
  name: string;
  /** 用于弹窗显示的标签 */
  label: string;
  /** 变量类型 */
  type: 'text' | 'date' | 'number' | 'computed';
  /** 日期格式（type === 'date' 时） */
  format?: string;
  /** 是否必填 */
  required: boolean;
  /** 默认值 */
  default?: string;
  /** 是否自动填充（不需要用户输入） */
  autoFill?: boolean;
  /** computed 类型的表达式 */
  expression?: 'currentWeekNumber' | 'currentYear' | 'currentMonth';
}

export enum TemplateCategory {
  Basic = 'basic',
  Daily = 'daily',
  Work = 'work',
  Tech = 'tech',
  Knowledge = 'knowledge',
}

export interface RenderedTemplate {
  /** 替换变量后的文档内容（不含模板 Frontmatter，转为文档 Frontmatter） */
  content: string;
  /** CURSOR 标记在内容中的字符偏移，null 表示无 CURSOR 标记 */
  cursorOffset: number | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: { message: string; position: number }[];
}

export interface ImportResult {
  success: boolean;
  templateId?: string;
  reason?: 'user_cancelled' | 'invalid_format' | 'invalid_variables' | 'db_error';
  errors?: { message: string; position?: number }[];
}

export class TemplateNotFoundError extends Error {
  constructor(id: string) {
    super(`Template "${id}" not found`);
    this.name = 'TemplateNotFoundError';
  }
}

export class BuiltinTemplateModificationError extends Error {
  constructor(id: string) {
    super(`Cannot modify or delete builtin template "${id}"`);
    this.name = 'BuiltinTemplateModificationError';
  }
}

export class TemplateVariableError extends Error {
  constructor(variableName: string, reason: string) {
    super(`Template variable "${variableName}": ${reason}`);
    this.name = 'TemplateVariableError';
  }
}
```

---

## 12. 斜杠命令集成

### 12.1 `/template` 斜杠命令

在编辑器内，用户可以通过 `/template` 斜杠命令将模板内容插入到光标位置。

**行为**：
- 输入 `/template` → 弹出模板选择浮层（非全屏弹窗，而是编辑器内浮层）
- 选择模板后，变量替换完成，内容插入到光标当前位置
- 若模板含 `{{CURSOR}}`，插入后光标定位到该位置；否则光标在插入内容末尾

**浮层规格**（与新建文档弹窗不同，此处是内联浮层）：
- 宽度 360px
- 最多显示 8 条模板
- 支持键盘导航（↑↓ + Enter + Esc）
- 搜索框实时过滤

### 12.2 斜杠命令注册

```typescript
// 在 SlashCommandExtension 中注册
{
  id: 'template',
  label: '从模板插入',
  keywords: ['template', '模板'],
  icon: 'LayoutTemplate',
  handler: () => {
    useTemplateStore().openInlineTemplateSelector();
  },
}
```

---

## 13. 命令面板集成

以下命令注册到 CommandRegistry（见 22-command-palette-spec.md）：

| command id | title | group |
|------------|-------|-------|
| `document.create` | 新建文档 | Document |
| `document.createFromTemplate` | 从模板新建文档 | Document |
| `document.saveAsTemplate` | 另存为模板 | Document |
| `settings.openTemplates` | 打开模板管理 | Settings |
| `hub.openTemplateGallery` | 模板库 | Hub |

---

## 14. 扩展 API

扩展可以通过 `templateRegistry.registerBuiltinTemplates` 注册额外的模板（声明 `document.write` 权限）：

```typescript
// 扩展注册额外模板
inkforgeAPI.templates.register({
  id: 'ext.my-plugin.code-review',
  title: 'Code Review 模板',
  content: `---
inkforge_template: true
title: "Code Review"
---
# PR Code Review

{{CURSOR}}

## 代码质量

## 测试覆盖

## 建议
`,
  category: 'tech',
  description: '代码审查记录模板',
  tags: ['代码', '审查'],
});
```

---

## 15. 性能要求

| 指标 | 目标 |
|------|------|
| 模板选择弹窗打开延迟 | ≤ 100ms |
| 模板列表渲染（8 张卡片） | ≤ 50ms |
| 变量替换执行时间（任意模板） | ≤ 5ms |
| 模板导入（单个文件） | ≤ 200ms |
| 模板搜索响应 | ≤ 50ms（150ms 防抖后） |
| 模板导出（ZIP 5 个） | ≤ 500ms |
| 内置模板加载（bundle 内置） | 同步，无异步等待 |

---

## 16. 无障碍（a11y）要求

- 新建文档弹窗：`role="dialog"` + `aria-modal="true"` + `aria-labelledby`
- 模板卡片：`role="option"` + `aria-selected` + `aria-label="<模板名称>"`
- 模板列表容器：`role="listbox"` + `aria-label="选择模板"`
- 变量填写步骤：表单字段有对应 `<label>` 标签（for/id 关联）
- 分类 Tab：`role="tablist"` + `role="tab"` + `aria-selected`
- 导入/导出操作：文件输入有 `aria-label`
- 键盘全程可操作：弹窗 Tab 导航、方向键切换卡片、Enter 确认、Esc 取消

---

## 17. 测试矩阵

| # | 测试类型 | 测试描述 | 预期结果 |
|---|----------|----------|----------|
| 1 | 单元 | `TemplateVariableEngine.render` 替换 `{{title}}` | 内容中 `{{title}}` 被用户输入替换 |
| 2 | 单元 | `render` 替换 `{{date:YYYY-MM-DD}}` | 返回当前日期字符串 |
| 3 | 单元 | `render` 替换 `{{uuid}}` | 返回有效 UUID v4 格式字符串 |
| 4 | 单元 | `render` 替换 `{{weekNumber}}` | 返回正确周次（ISO 8601） |
| 5 | 单元 | `render` 处理 `{{CURSOR}}` | 从内容中移除 `{{CURSOR}}`，返回偏移量 |
| 6 | 单元 | `render` 无 `{{CURSOR}}` | cursorOffset 返回 null |
| 7 | 单元 | `validate` 检测未关闭变量 `{{title` | 返回 isValid: false + 错误信息 |
| 8 | 单元 | `extractUserInputVariables` 正确提取 | 排除自动变量，仅返回用户输入变量 |
| 9 | 单元 | 内置模板不可删除（`BuiltinTemplateModificationError`） | 抛出正确异常 |
| 10 | 单元 | 用户模板 `create` 写入 IndexedDB | DB 中存在对应记录 |
| 11 | 集成 | 新建文档弹窗打开显示 8 种内置模板 | 所有内置模板卡片渲染 |
| 12 | 集成 | 选择"空白"模板创建文档 | 创建成功，文档 status=draft，内容为空 |
| 13 | 集成 | 选择"日记"模板，date 变量自动填入今日日期 | 文档内容含当日日期字符串 |
| 14 | 集成 | 选择"读书笔记"弹出变量填写步骤 | 弹窗进入 fill-variables 步骤 |
| 15 | 集成 | 变量填写后创建文档，书名正确替换 | 文档标题包含用户输入的书名 |
| 16 | 集成 | CURSOR 定位：文档打开后光标在 CURSOR 位置 | 编辑器光标偏移量正确 |
| 17 | 集成 | "另存为模板"弹出信息填写对话框 | 弹窗正确渲染 |
| 18 | 集成 | 另存为模板后，出现在"我的模板" Tab | 用户模板列表有该条目 |
| 19 | 集成 | 导出模板下载 `.inkforge-template.md` | 文件名和内容正确 |
| 20 | 集成 | 导入有效模板文件 | Toast"模板已导入"，列表刷新 |
| 21 | 集成 | 导入无 `inkforge_template: true` 的 `.md` | 弹出确认对话框询问是否导入 |
| 22 | 集成 | 导入含无效变量语法的模板 | Toast 报错，不创建模板 |
| 23 | 集成 | 删除用户模板弹出确认对话框 | 对话框 DOM 渲染 |
| 24 | 集成 | 确认删除后模板从列表消失 | IndexedDB 记录删除，列表刷新 |
| 25 | 集成 | 分类 Tab 过滤功能 | 点击"工作" Tab 只显示 category=work 的模板 |

---

*本文档覆盖文档模板系统完整技术规格，包含 8 种内置模板全量内容、变量系统、导入导出、弹窗规格、Repository、Store 及全量 TypeScript 类型，共计约 870 行，版本 v2.1 Draft。*

---

## 2026-05-02 Baseline Implementation Note

Baseline status: Pass for the compatible in-app Markdown template variable baseline. Full Spec 42 remains pending for user-template repository management, import/export UI, ZIP packaging, inline slash picker, extension API, and complete a11y/e2e matrices.

Implemented baseline coverage:

- `src/services/template/` now provides a strict TypeScript template variable runtime with `renderTemplateVariables`, `formatTemplateDate`, `extractUserInputVariables`, and `validateTemplateVariables`.
- Runtime rendering supports user input variables such as `{{title}}`, automatic `{{date:...}}`, `{{author}}`, `{{uuid}}`, `{{weekNumber}}`, and `{{CURSOR}}` removal with cursor offset reporting.
- Hub template creation now routes selected built-in templates through the template renderer before calling the existing real article draft creation path.
- Existing `ARTICLE_TEMPLATES`, `TemplatePicker`, Hub template-market cards, draft creation, routing, and article store behavior are preserved.
- No mock template records, fake draft creation, simulated success state, deleted built-in templates, or emoji glyph icons were introduced.

Validation evidence:

- `pnpm exec vitest run src/services/template/variable-engine.test.ts`: 1 file and 4 tests passed.
- `pnpm exec vue-tsc --noEmit`: passed.
- `pnpm exec eslint src/services/template src/views/HubView.vue --ext .ts,.vue --quiet`: passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`: passed.
- `pnpm exec vitest run`: 22 files and 154 tests passed.
- `pnpm build`: passed with existing non-blocking Vite dynamic/static import and chunk-size warnings only.
- Browser smoke verified the Hub template market creates a real `/workstation?id=...` draft from the `技术博客` template, renders real content, leaves no `{{...}}` template placeholders visible, and reports zero console errors.
- BOM scan, emoji scan, and `git diff --check` passed for the touched Spec 42 baseline files; Git only reported existing CRLF conversion warnings.
- GitNexus impact was attempted for `handleTemplateSelect`, but the MCP transport returned `Transport closed`; no GitNexus result is claimed for this baseline.

Pending full Spec 42 scope:

- IndexedDB-backed user template repository, template CRUD UI, frontmatter import/export, ZIP bundle export, variable-fill dialog, cursor positioning in the editor, slash-command insertion, command palette entry, extension API registration, full keyboard/a11y contract, packaged Tauri verification, and full Playwright e2e remain pending follow-up work.