# 10 — Markdown 权威模型 Spec

> 文档类型: Spec
> 阶段: Phase 1（基础层 · 最核心）
> 依赖: 无（本 Spec 是全部上层的基础）
> 被依赖: 01 / 04 / 11 / 15 / 16 / 23 / 29 / 31 / 36 / 42 / 52 / 56 等全部内容相关 Spec
> 来源决策: Part 1 §4（域 B）B-01 ~ B-20、R-01、R-02、R-13、R-14
> 来源问卷: L1-05, L1-06, L1-07, L1-08, L1-09, L1-30, L1-31, L1-32, T01-05, T01-15, T04-01~15, X-06, X-09
> 权威来源: 混合（以最新日期决策文档为主 + 现有代码事实）
> 创建日期: 2026-04-21
> 最后更新: —
> 铁律遵循: R-01, R-02, R-13, R-14, R-15, R-16

---

## 2026-04-22 Wave 1 代码真相补注

- 当前运行时主链中，`EditedContent.body` 仍是 Workstation 编辑态的第一正文真值；`article.rawContent` 继续承担 Hub / FileManager / 搜索与列表摘要所依赖的文章快照职责。
- 自 2026-04-22 起，`stores/editor.ts` 已在加载已有内容、创建内容、更新正文、切换版本这些成功持久化边界同步回写 `article.rawContent/title`，使已落盘 Markdown 真值能够回流到 Hub 首页统计与摘要层。
- 这代表 0420 Wave 1 已先补齐“编辑态正文 -> 首页快照”的真实闭环，但 §3 / §5 中更完整的 `markdownSource / htmlCache / sourceHash` 分层 authority model 仍未全部落地，本 Spec 其余章节仍是后续实现合同而非当前代码现状。

---

## 目录

- §1 背景与目标
- §2 范围与边界
- §3 核心契约：双层权威模型
- §4 数据模型（DB Schema 契约）
- §5 内容真值流：写入 / 读取 / 恢复三路径
- §6 YAML Frontmatter 与 DB 镜像
- §7 Round-trip Fidelity 契约
- §8 19 元素清单与可移植性矩阵
- §9 非标 Markdown 扩展（InkForge 专属）
- §10 渲染契约：Markdown → 平台派生
- §11 Markdown AST 与 TipTap JSON 的关系
- §12 模块架构（`src/core/authority/`）
- §13 错误语义与降级契约
- §14 性能 SLO 对齐
- §15 测试策略（round-trip fuzz + 黄金样本）
- §16 验收矩阵
- §17 权威来源登记表

---

## §1 背景与目标

### 1.1 问题背景

InkForge v2.0 的事实：
- TipTap 内部使用 ProseMirror JSON 作为运行时状态
- IndexedDB `articles.content` 字段当前持久化为 **HTML 字符串**
- 导出链路（微信/HTML）从 HTML 派生
- Markdown 输入/输出走 `marked` 库但**不是真值源**

用户在问卷 L1-05 选 A（Markdown 是唯一权威源），L1-06 选 D（不切换权威模型），X-06 选 B（HTML 主存储）。三者表面矛盾。

### 1.2 目标

本 Spec 确立 **"表达权威 vs 运行时持久化权威" 双层模型**，解决上述矛盾，并为下列模块提供契约：
- TipTap 编辑器（01）
- 渲染引擎（04）与导出（15）
- 版本历史（31）
- 搜索索引（29）
- AI 集成（Part 2 域 H）
- 同步（23）

### 1.3 核心口号

> **"用户编辑的是 Markdown 意图，我们为了速度缓存 HTML 形态。真值永远是 Markdown。"**

---

## §2 范围与边界

### 2.1 本 Spec 覆盖

- Markdown 表达权威（authoritative representation）的定义
- HTML 运行时持久化缓存的定义与失效策略
- Frontmatter 的双写契约
- 19 种标准元素 + InkForge 专属增强语法的枚举与可移植性标记
- Round-trip 保真度契约（Typora / Source / Preview / Export 四态无损往返）
- Markdown → 平台派生链路的总约束
- 与 TipTap JSON 的转换契约

### 2.2 本 Spec 不覆盖（由其他 Spec 负责）

| 外包内容 | 负责 Spec |
|---|---|
| TipTap 扩展具体实现 | 01-spec-editor-typora |
| KaTeX/Mermaid/代码高亮渲染 | 04-spec-rendering-core |
| 平台 exporter（微信/小红书/知乎/HTML/Markdown） | 15-export-publish |
| 增强语法的 UI 行为 | 16-markdown-extensions |
| Frontmatter 的 UI 编辑器 | 02-spec-hub / 11-content-model |
| 版本包含哪些字段 | 31-version-bundle |
| 全文搜索索引结构 | 29-search-engine |

### 2.3 非目标（v2.1 明确不做）

- 将 HTML 完全去除持久化（保留 HTML 缓存是本轮决策）
- PDF 导出（P-05 A）
- Callout / Admonition（M-01 A 延后 v2.2+）
- Embed YouTube/CodePen/Tweet（M-07 A 延后）

---

## §3 核心契约：双层权威模型

### 3.1 定义

```
┌─────────────────────────────────────────────────────────────┐
│  表达权威 Authoritative Representation                       │
│  = Markdown 文本（含 YAML frontmatter）                      │
│  特性：                                                      │
│    - 用户意图的唯一真值来源                                    │
│    - 所有派生（HTML/PDF/发布/索引/AI）的输入                   │
│    - 版本历史的存储对象                                        │
│    - 可读、可人工编辑、可走 Git diff                           │
│    - 可移植（标准 Markdown 子集可被任何工具读取）              │
└─────────────────────────────────────────────────────────────┘
                          │  序列化
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  运行时持久化缓存 Runtime Persistence Cache                  │
│  = HTML 字符串（TipTap 生成 + sanitize 兜底）                │
│  特性：                                                      │
│    - IndexedDB articles.htmlCache 字段                       │
│    - 加速文档打开（跳过 Markdown 解析）                        │
│    - 加速 round-trip（无需重新渲染）                           │
│    - 带 sourceHash 字段用于校验一致性                          │
│    - hash 不匹配时必须 invalidate 并从 Markdown 重建           │
│    - 不是真值；损坏可从 Markdown 无损重建                      │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 MUST / MUST NOT

**MUST**：
- M-01 所有 exporter / renderer / 搜索索引器 / AI 调用**必须**以 Markdown 作为输入
- M-02 版本历史（31-version-bundle）**必须**以 Markdown 作为存储对象
- M-03 `articles.htmlCache` **必须**伴随 `sourceHash`；读取时若 hash 不匹配**必须**从 Markdown 重建并更新缓存
- M-04 任何写路径**必须**先更新 Markdown 再更新 HTML 缓存（先主后从）
- M-05 任何损坏恢复路径**必须**优先从 Markdown（或其版本历史）重建 HTML

**MUST NOT**：
- N-01 任何 exporter / 平台适配器**不得**修改 `articles.markdownSource`、`articles.htmlCache` 或任何版本历史
- N-02 任何下游模块**不得**以 HTML 作为上游输入（除非在明确标注的"HTML 兜底恢复"场景）
- N-03 **不得**跳过 Markdown 直接在 TipTap JSON 与 HTML 间做 round-trip
- N-04 **不得**在 HTML 缓存失效时静默丢弃正文（必须触发重建或告警）

### 3.3 "不反向污染" 铁律（R-13）

- 平台适配器（微信 / 小红书 / 知乎 / HTML / Markdown）**只能**从 Markdown 读
- 任何平台的 CSS/DOM 特殊需求**不得**反向改写 Markdown 权威源
- 若某平台要求特定结构（例如微信要求段落包裹特定 class），**只能**在该 exporter 的输出产物上加工，不得写回 DB

---

## §4 数据模型（DB Schema 契约）

### 4.1 `articles` 表扩展

```typescript
// src/db/schema.ts（扩展现有 articles 表）
interface Article {
  id: string
  profileId: string           // 多账户隔离（参见 26-multi-account-profile）

  // ===== 核心内容（双层权威） =====
  markdownSource: string      // 表达权威（新增，primary source of truth）
  htmlCache: string | null    // 运行时缓存（可为 null，表示待重建）
  sourceHash: string          // SHA-256(markdownSource)，用于校验缓存一致性
  cacheVersion: number        // HTML 缓存的渲染器版本号（渲染规则升级时自动失效）
  cacheGeneratedAt: number    // 缓存生成时间（ms）

  // ===== Frontmatter 镜像（详见 §6） =====
  title: string               // mirror from frontmatter.title
  summary: string | null      // mirror from frontmatter.summary
  coverImage: string | null   // mirror from frontmatter.cover
  status: LifecycleState      // mirror from frontmatter.status
  tags: string[]              // mirror from frontmatter.tags
  categoryId: string | null   // mirror from frontmatter.category
  createdAt: number           // mirror from frontmatter.created_at
  updatedAt: number           // mirror from frontmatter.updated_at
  publishedAt: number | null

  // ===== 其他运行时字段（不参与权威） =====
  isPinned: boolean
  isDeleted: boolean          // 软删除（参见 30-trash-recycle）
  deletedAt: number | null
  // ...
}
```

### 4.2 不变式（Invariants）

> 任何时刻，下列不变式**必须**成立：

- **I-01**：`sha256(markdownSource) === sourceHash`
- **I-02**：若 `htmlCache != null`，则 `htmlCache` 是 `markdownSource` 在 `cacheVersion` 下的无损渲染
- **I-03**：若 `htmlCache == null` 或 hash 不匹配或 cacheVersion 落后，**必须**触发重建；重建期间读请求可返回上次缓存并附带 `stale: true` 标志
- **I-04**：Frontmatter 镜像字段（title/summary/status/tags 等）**必须**与 markdownSource 中的 YAML frontmatter 完全一致；任何绕过 markdownSource 直接写 DB 字段的操作**禁止**

### 4.3 校验时机

- **启动时**：数据完整性 Worker（17-crash-recovery + R-05）批量校验
- **写入后**：服务层 `articleService.save()` 末尾同步校验（开发环境），生产环境异步校验
- **读取前**：`articleService.load()` 时若 hash 不匹配立即触发同步重建（用户必须感知加载稍慢但不会看到错误内容）

---

## §5 内容真值流：写入 / 读取 / 恢复三路径

### 5.1 写入路径（用户编辑 → 持久化）

```
用户在 Typora / Source / Preview 任一模式编辑
  ↓
TipTap 产生 new ProseMirror JSON（内存态）
  ↓
[A] 序列化: ProseMirror JSON → Markdown (权威)
  ↓
[B] 渲染: Markdown → HTML (缓存)
  ↓
[C] 计算 sha256(markdown) → sourceHash
  ↓
articleService.save({ markdownSource, htmlCache, sourceHash, cacheVersion })
  ↓
IndexedDB 持久化（事务保证 A/B/C 原子写入）
  ↓
Frontmatter 镜像字段同步更新（见 §6.3）
  ↓
写 activity_logs（R-17 审计）
```

**步骤 [A] 决定权威**。步骤 [B]/[C] 派生。步骤 [B] 失败不阻塞 [A]；HTML 缓存可为 null 等待后台重建。

### 5.2 读取路径（打开文档 → 编辑器呈现）

```
articleService.load(articleId)
  ↓
IndexedDB 取 { markdownSource, htmlCache, sourceHash, cacheVersion }
  ↓
校验 sha256(markdownSource) === sourceHash？
  ├─ 匹配 + cacheVersion 最新 + htmlCache != null → 直接用 htmlCache 启动 TipTap
  └─ 不匹配 → 触发同步重建:
        Markdown → HTML (新缓存)
        更新 DB
        启动 TipTap
  ↓
TipTap 反序列化为 ProseMirror JSON
  ↓
进入 Typora / Source / Preview 模式（默认 Typora）
```

### 5.3 恢复路径（缓存损坏 / 崩溃恢复 / 版本回滚）

```
触发条件之一:
  - HTML 缓存损坏（hash 不匹配）
  - 崩溃后 beforeunload 快照恢复
  - 用户从版本历史回滚
  - 灾难恢复（数据完整性 Worker 发现异常）
  ↓
真值来源优先级:
  1. markdownSource (DB 当前)
  2. beforeunload 快照（localStorage）
  3. 最近版本（article_versions 最新）
  4. 更早版本（article_versions 按时间倒序）
  ↓
选定真值后 → 与 §5.1 写入路径等价 → 重建 htmlCache
  ↓
告知用户恢复来源（"恢复自最近保存" / "恢复自版本 #42" / ...）
  ↓
写 activity_logs（恢复事件，R-16）
```

### 5.4 冲突恢复路径（Sync）

与 23-sync-provider 协同：
- Git 仓库 `.md` 文件是**从 DB 派生**（IndexedDB 为 primary）
- pull 时若本地 DB 更新时间 < 远端 commit 时间，按 §5.3 的 Markdown 真值恢复逻辑走
- 冲突三方合并在 **Markdown 层面**进行（不在 HTML 或 JSON 层），合并后写回 DB 并重建缓存

---

## §6 YAML Frontmatter 与 DB 镜像

### 6.1 Frontmatter 语法

```yaml
---
title: 示例文章
summary: 一段简短摘要，导出时用于 meta description
cover: /assets/cover.jpg
status: draft            # draft | writing | under_review | ready_to_publish | published | archived
category: "tech/frontend"
tags:
  - vue
  - markdown
  - inkforge
created_at: 2026-04-21T10:00:00Z
updated_at: 2026-04-21T11:30:00Z
published_at: null
inkforge:
  schema_version: 1       # 本文档所用的 frontmatter schema 版本
  authority: markdown     # 标记：本文以 markdown 为权威（v2.1 均如此）
  portability: mixed      # standard | mixed | inkforge-only（见 §9）
  extensions:             # 本文使用的 InkForge 专属扩展列表
    - highlight
    - wikilink
    - citation
---

# 文章正文
...
```

### 6.2 Frontmatter Schema（Zod）

```typescript
// src/core/authority/frontmatter-schema.ts
import { z } from 'zod'

export const FrontmatterSchema = z.object({
  title: z.string().min(1).max(500),
  summary: z.string().max(2000).nullable().optional(),
  cover: z.string().nullable().optional(),
  status: z.enum([
    'draft', 'writing', 'under_review',
    'ready_to_publish', 'published', 'archived'
  ]).default('draft'),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  published_at: z.string().datetime().nullable().optional(),
  inkforge: z.object({
    schema_version: z.literal(1).default(1),
    authority: z.literal('markdown').default('markdown'),
    portability: z.enum(['standard', 'mixed', 'inkforge-only']).default('standard'),
    extensions: z.array(z.string()).default([]),
  }).default({}),
})
export type Frontmatter = z.infer<typeof FrontmatterSchema>
```

### 6.3 双写契约（权威 + 镜像）

- **权威**：YAML frontmatter 内嵌在 `markdownSource` 头部
- **镜像**：DB 对应字段（title / summary / coverImage / status / tags / categoryId / createdAt / updatedAt / publishedAt）

**同步规则**：
- 修改 frontmatter 时**必须**同时更新 `markdownSource` 和 DB 镜像（事务）
- 绕过 `markdownSource` 直接写 DB 字段**禁止**（v2.1 代码 review 强制）
- 启动时数据完整性校验会对比两者，不一致时以 Markdown frontmatter 为准

### 6.4 未知字段策略（Forward Compatible）

- Frontmatter 中未在 Schema 中声明的顶层字段**保留**（向前兼容）
- `inkforge.extensions` 中列出的扩展名若当前版本不识别，**降级渲染**（占位 + 源码保留，详见 §13）

### 6.5 Frontmatter 缺失容错

- 若 `markdownSource` 没有 frontmatter 块（例如用户手动删除），**自动注入**默认 frontmatter 并使用 DB 镜像字段填充
- 注入时写 `activity_logs`（event: `frontmatter.auto_injected`）告知用户

---

## §7 Round-trip Fidelity 契约（R-02）

### 7.1 四态定义

```
                Typora 模式（NodeView 渲染态）
                       ↕
TipTap JSON ↔ Markdown ↔ Source 模式（vue-codemirror 显示源码）
                       ↕
                Preview 模式（HTML 渲染 + DOMPurify）
                       ↕
                Export 模式（各平台 exporter）
```

**四态无损往返**指：任何内容在 Typora/Source/Preview/Export 四种呈现间转换后，再转回原始表示（TipTap JSON → Markdown），**得到字节级相同的 Markdown**（忽略可忽略的空白差异）。

### 7.2 无损定义（严格）

Let `M₀` 为原始 Markdown。定义函数：
- `T = parse(M₀)` → TipTap JSON
- `M₁ = serialize(T)` → Markdown

**无损 ⇔ normalize(M₁) == normalize(M₀)**

其中 `normalize()`：
- 将 Tab/空格混合归一为 Spec 指定的缩进（默认 4 空格）
- 归一列表项标记（`-` / `*` / `+` 都按 `-`）
- 归一粗体/斜体标记（`**` / `__` 按 `**`；`*` / `_` 按 `*`）
- 去掉行尾多余空格（保留硬换行 `  \n`）
- 归一 YAML frontmatter 键顺序（按 §6 Schema 顺序）

**其余语义必须字节级相同**。

### 7.3 四态测试矩阵

| 起始 | → Typora | → Source | → Preview | → Export(5 平台) |
|---|---|---|---|---|
| 19 元素黄金样本 | 无损 | 支持 无损 | 语义无损 | 每平台按契约 |
| 全部增强语法 | 支持 | 支持 | 支持 | 支持（标准 MD 导出时按 §9 降级） |
| 边界样本（空 / 超大 / 嵌套深 / 多语言） | 支持 | 支持 | 支持 | 支持 |

### 7.4 Exporter 对 Markdown 导出的特殊约束

- Markdown exporter（`exporters/markdown/`）输出的 `.md` 必须与 `articles.markdownSource` **字节级相同**（含 frontmatter）
- 其他 exporter（wechat/zhihu/redbook/html）输出不要求 round-trip，但**必须语义保真**

---

## §8 19 元素清单与可移植性矩阵

### 8.1 19 种标准元素（T01-15 A，v2.1 一次性全覆盖）

| # | 元素 | TipTap Node | Markdown 语法 | 兼容性 |
|---|---|---|---|---|
| 1 | 段落 | paragraph | `...` | standard |
| 2 | 标题 H1~H6 | heading | `# ... ######` | standard |
| 3 | 粗体 | bold (mark) | `**...**` | standard |
| 4 | 斜体 | italic (mark) | `*...*` | standard |
| 5 | 删除线 | strike (mark) | `~~...~~` | standard (GFM) |
| 6 | 行内代码 | code (mark) | `` `...` `` | standard |
| 7 | 链接 | link (mark) | `[text](url)` | standard |
| 8 | 图片 | image | `![alt](url)` 或 Figure+Caption | standard |
| 9 | 无序列表 | bulletList + listItem | `- ...` | standard |
| 10 | 有序列表 | orderedList + listItem | `1. ...` | standard |
| 11 | 任务列表 | taskList + taskItem | `- [ ] ... / - [x] ...` | standard (GFM) |
| 12 | 引用块 | blockquote | `> ...` | standard |
| 13 | 代码块（带语言） | codeBlock | ` ```lang\n...\n``` ` | standard |
| 14 | 分隔线 | horizontalRule | `---` | standard |
| 15 | 表格 | table / tableRow / tableCell / tableHeader | GFM pipe `|...|` | standard (GFM) |
| 16 | 数学公式（行内 / 块级） | math-inline / math-block | `$...$` / `$$...$$` | mixed（Pandoc / Obsidian 兼容） |
| 17 | Mermaid 图 | code block lang=mermaid | ` ```mermaid\n...\n``` ` | mixed（GitHub / Obsidian 兼容） |
| 18 | 硬换行 | hardBreak | `  \n` 或 `\\` | standard |
| 19 | HTML 透传块（受限） | rawHtml | 直接 HTML 片段（sanitize 后保留） | standard（谨慎） |

> **注**：Callout / Admonition 不在 19 元素内（M-01 A 推后）。Embed 也不在（M-07 A 推后）。

### 8.2 InkForge 专属增强语法（Portability = inkforge-only 或 mixed）

| 语法 | Markdown 表示 | 兼容性 | 降级产物 |
|---|---|---|---|
| 多色高亮 | `==red:高亮==` / `==yellow:...==`（扩展 `==...==`）| inkforge-only | `==...==`（标准高亮）或裸文本 |
| 脚注 | `[^1]` + 引用块 `[^1]: ...` | standard (Pandoc) | standard |
| TOC 宏 | `[toc]` | inkforge-only | `<!-- TOC placeholder -->` 注释 |
| Details 折叠 | ``` :::details 标题\n...\n::: ``` | inkforge-only | HTML `<details>` 标签 |
| Emoji | `:smile:` | mixed（GitHub / Slack 兼容） | 直出 Unicode |
| WikiLink | `[[文章名]]` | inkforge-only（Obsidian 兼容） | `[文章名](link-to-doc)` |
| 引用来源（Citation） | `> [!cite source="URL"]` | inkforge-only | 普通 blockquote |
| 公式编号/交叉引用 | `$...$ {#eq:xxx}` / `@eq:xxx` | mixed（Pandoc-crossref） | 纯公式 + 普通文本 |
| Pangu 空格 | 渲染时自动处理 | 不入 Markdown（仅运行时） | — |
| 三层来源标注（事实/推断/手写） | `> [!fact]` / `> [!inferred]` / `> [!authored]` | inkforge-only | 普通 blockquote |

### 8.3 可移植性声明

每篇文章的 `inkforge.portability` 字段有三档：
- **standard**：只使用 19 标准元素；可被任何 Markdown 工具无损读取
- **mixed**：使用部分 Pandoc/GitHub 兼容扩展（如脚注、公式、Mermaid、Emoji）；主流工具可读取
- **inkforge-only**：使用 InkForge 专属扩展（高亮颜色 / TOC / Details / WikiLink / Citation / 来源标注）

**自动计算**：每次保存时扫描 AST 并更新 `portability` 字段（保存在 frontmatter + DB 镜像）。

**用户可见**：Hub / FileManager 可显示 portability 徽章；导出为标准 Markdown 时，inkforge-only 部分按 §9 降级。

---

## §9 非标 Markdown 扩展（InkForge 专属）

### 9.1 Typora 策略（L1-07 C + 补充）

参考 Typora 对扩展语法的处理：
- 所有专属扩展必须有**明确的 Markdown 语法表示**（不能仅存在于 TipTap JSON）
- 导出为标准 Markdown 时，**必须**有无损或显式降级的 fallback
- 降级必须用户可见（导出对话框显示"以下扩展将被降级"）

### 9.2 扩展声明文件

```typescript
// src/core/authority/extensions/spec.ts
export interface ExtensionSpec {
  id: string                  // 如 'highlight-color', 'wikilink'
  portability: 'standard' | 'mixed' | 'inkforge-only'
  markdownSyntax: string      // 语法描述（供文档使用）
  parser: (src: string) => TipTapNode | null
  serializer: (node: TipTapNode) => string
  fallback: {
    // 降级为标准 Markdown 时的输出
    toStandardMarkdown: (node: TipTapNode) => string
    // 目标平台无法渲染时的占位
    toPlaceholder: (node: TipTapNode) => string
  }
  // 平台兼容性矩阵（exporter 使用）
  platformCompat: {
    wechat: 'native' | 'rewrite' | 'fallback'
    zhihu: 'native' | 'rewrite' | 'fallback'
    redbook: 'native' | 'rewrite' | 'fallback'
    html: 'native' | 'rewrite' | 'fallback'
    markdown: 'native' | 'rewrite' | 'fallback'
  }
}
```

### 9.3 导出降级规则

- Markdown exporter 遇到 inkforge-only 扩展 → 使用 `fallback.toStandardMarkdown`
- 任何 exporter 遇到该平台 `platformCompat === 'fallback'` → 使用 `fallback.toPlaceholder`
- Exporter 必须在导出日志 `export_logs` 中记录所有降级项

### 9.4 扩展注册表

```typescript
// src/core/authority/extensions/registry.ts
export const EXTENSION_REGISTRY = new Map<string, ExtensionSpec>()

export function registerExtension(spec: ExtensionSpec): void { /* ... */ }
export function getExtension(id: string): ExtensionSpec | null { /* ... */ }
export function detectUsedExtensions(markdown: string): string[] { /* ... */ }
```

---

## §10 渲染契约：Markdown → 平台派生

### 10.1 统一输入

所有 renderer / exporter 的入口签名：

```typescript
type RenderInput = {
  markdown: string             // 权威源（含 frontmatter）
  frontmatter: Frontmatter
  options: PlatformOptions
}

type RenderOutput = {
  artifact: string | Blob      // 平台产物
  warnings: Warning[]          // 降级告警
  assetManifest: AssetManifest // 引用的资产清单
  durationMs: number
}

interface Renderer {
  readonly platform: PlatformId
  render(input: RenderInput): Promise<RenderOutput>
}
```

### 10.2 平台渲染链路独立（R-13）

```
                   Markdown (权威)
                        │
        ┌───────────┬───┴───┬───────────┬───────────┐
        │           │       │           │           │
   编辑器预览    微信 exporter  知乎    小红书   HTML/Markdown
   (TipTap)     (独立管道)    (独立)  (独立)   (独立)
     │              │           │       │           │
   HTML 缓存      微信产物     知乎产物  小红书产物  HTML/MD 产物
```

- 每平台**独立实现** `render(markdown) → artifact`
- 平台间**不共享中间 HTML**（除非从同一 Markdown 再渲染一次）
- **禁止**反向污染：exporter 不得修改 `markdownSource`、`htmlCache`、版本历史

### 10.3 平台独立的"合规优先级"

每平台 `PlatformOptions` 必须声明三档优先级之一（L1-31 C + B-07）：

- `fidelityPriority: 'visual'` → 视觉保真优先（必要时牺牲合规）
- `fidelityPriority: 'compliance'` → 平台合规优先（必要时牺牲样式）
- `fidelityPriority: 'semantic'` → 语义优先（保证结构，允许视觉降级）

| 平台 | 默认优先级 | 备注 |
|---|---|---|
| 微信公众号 | compliance | CSS 受限，Mermaid 必须回退图像 |
| 知乎 | semantic | 保留标题/代码/图片结构 |
| 小红书 | visual | 图片为主 |
| HTML | visual | 用户自托管 |
| Markdown | semantic | 用于 Git / 跨工具 |

### 10.4 公式 / Mermaid / 代码高亮 三端一致契约（R-14）

| 元素 | 编辑器 | 预览 | 导出（按平台独立） |
|---|---|---|---|
| KaTeX 公式 | Typora WYSIWYG（B-12）| SVG/MathML | 每平台：SVG / PNG / 源码（fallback） |
| Mermaid | Stage 面板（B-13） | SVG | 每平台：SVG / PNG 图像 / 源码（fallback） |
| 代码高亮 | Shiki 或 highlight.js（B-14） | 同编辑器 | 微信/知乎走富文本带色；HTML 走 inline CSS |

**失败降级三档**：
1. 源码保留（最基础）
2. 占位提示（用户可见）
3. 图像回退（Mermaid → PNG/SVG；公式 → SVG）

### 10.5 Exporter 签名规范

```typescript
// 禁止
function renderWeChat(html: string): string { /* ... */ }  // 输入不是 Markdown

// 必须
function renderWeChat(input: RenderInput): Promise<RenderOutput> { /* ... */ }  // 正确
```

---

## §11 Markdown AST 与 TipTap JSON 的关系

### 11.1 双转换桥

```
Markdown ───(md→ast)───> MD AST ───(ast→pm)───> ProseMirror JSON
            parser                  bridge

ProseMirror JSON ───(pm→ast)───> MD AST ───(ast→md)───> Markdown
            bridge                           serializer
```

### 11.2 三层架构

```
src/core/authority/
├── md-parser/              # Markdown → MD AST
│   ├── standard.ts         # 19 元素 parser（基于 marked 或 remark 的自研包装）
│   ├── extensions/         # 每个扩展一个 parser
│   └── frontmatter.ts      # YAML parser
├── md-serializer/          # MD AST → Markdown
│   ├── standard.ts         # 19 元素 serializer
│   ├── extensions/         # 每个扩展一个 serializer
│   └── frontmatter.ts      # YAML serializer（严格保序）
├── ast-bridge/             # MD AST ↔ ProseMirror JSON
│   ├── md-to-pm.ts
│   ├── pm-to-md.ts
│   └── node-map.ts         # 节点映射注册表
├── sync/                   # §5 三路径实现
│   ├── write-pipeline.ts
│   ├── read-pipeline.ts
│   └── recovery-pipeline.ts
└── integrity/              # 不变式校验
    ├── hash.ts
    └── validator.ts
```

### 11.3 TipTap 扩展注册

- 每个 TipTap NodeType / MarkType 对应一个 `node-map` 条目
- node-map 负责：名称 / 属性 schema / 转 MD AST 规则 / 从 MD AST 还原规则
- 新增扩展时**必须**同时更新 parser / serializer / node-map / extensions registry 四处（否则 round-trip 必挂）

---

## §12 模块架构（`src/core/authority/`）

### 12.1 职责划分

| 模块 | 职责 | 暴露 API |
|---|---|---|
| `md-parser/` | Markdown → MD AST | `parse(md: string): MdAst` |
| `md-serializer/` | MD AST → Markdown | `serialize(ast: MdAst): string` |
| `ast-bridge/` | MD AST ↔ ProseMirror JSON | `mdToPm(ast)` / `pmToMd(doc)` |
| `frontmatter/` | Frontmatter Schema + 双写 | `readFrontmatter` / `writeFrontmatter` / `mirrorToDb` |
| `sync/` | 写入/读取/恢复三路径 | `saveArticle` / `loadArticle` / `recoverArticle` |
| `integrity/` | 不变式 I-01~I-04 校验 | `verify(article)` / `repair(article)` |
| `extensions/` | 专属扩展注册表 | `registerExtension` / `detectUsedExtensions` |
| `portability/` | 可移植性标签计算 | `classifyPortability(ast)` |

### 12.2 对外暴露（给其他 Spec 消费）

```typescript
// src/core/authority/index.ts
export * from './sync'           // articleService 顶层 API
export * from './frontmatter'    // Frontmatter 类型 + 操作
export * from './extensions'     // Extension 注册
export * from './integrity'      // Integrity 校验

// 使用示例（15-export-publish）
import { loadArticle } from '@/core/authority'
const { markdownSource, frontmatter } = await loadArticle(id)
const artifact = await wechatExporter.render({ markdown: markdownSource, frontmatter, options })
```

---

## §13 错误语义与降级契约

### 13.1 错误分层（与 33-diagnostic-logging 的四层错误模型对齐）

| 层级 | 触发 | 行为 |
|---|---|---|
| 提示 | 缓存失效、自动重建成功 | StatusBar 短提示 |
| 可恢复 | Markdown 解析失败（用户输入非法语法） | Toast + 保留原文不渲染该节点（T01-19 B） |
| 阻断 | Markdown 为空 / Frontmatter schema 不合法 | Modal + 强制用户修复或放弃 |
| **数据风险** | Integrity I-01 失败 / Markdown 丢失 | 立即进入安全模式（17-crash-recovery）+ 告警 + 不接受写入 |

### 13.2 降级级联

```
读文档:
  尝试 htmlCache
    ├─ 成功 → 返回
    └─ 失败或 hash 不匹配
         └─ 从 markdownSource 重建
              ├─ 成功 → 更新缓存 + 返回 + 静默提示
              └─ Markdown 解析失败
                   └─ 启用"源码模式只读" + Modal 引导用户修复
                        └─ 用户放弃 → 从版本历史恢复
                             └─ 失败 → 进入安全模式
```

### 13.3 不变式违反的响应

- **I-01 失败（hash 不匹配 DB 里保存的值）**：说明 Markdown 被外部工具修改（如 Git 同步）→ 自动重算 hash + 重建缓存 + 写 `activity_logs: frontmatter.hash_recomputed`
- **I-02 失败（HTML 与 Markdown 不匹配）**：自动重建 HTML → 写日志
- **I-03 失败（缓存为空）**：正常情况（新建文档），按 §5.2 路径走
- **I-04 失败（DB 镜像与 Frontmatter 不一致）**：以 Frontmatter 为准，更新 DB 镜像 + 写日志

---

## §14 性能 SLO 对齐（R-15）

### 14.1 本 Spec 关心的性能点

| 操作 | SLO | 测试基准 |
|---|---|---|
| Markdown parse（900K 字符） | ≤ 300ms | Phase 2 基线 |
| Markdown serialize（900K 字符） | ≤ 200ms | Phase 2 基线 |
| HTML 缓存 invalidate + 重建 | ≤ 500ms（热路径）/ ≤ 2s（冷启动） | — |
| sha256(markdownSource) 计算 | ≤ 50ms（WebCrypto 异步） | — |
| Integrity 批量校验（50 账户 × 1000 文档） | ≤ 3s（后台 Worker）| 不影响前台 |

### 14.2 实现策略

- 大文档场景下 parse/serialize 必须可**增量**（只处理变更段）
- Parser 走 streaming pull model，避免一次 load 整篇 AST
- hash 计算走 Web Worker + WebCrypto
- Integrity 校验走 `workers/integrity-worker.ts`

### 14.3 缓存淘汰

- `htmlCache` 不做淘汰（每篇文档各一份，始终和 markdownSource 同生命周期）
- 但若 DB 大小超阈值（L1-35 × 1.5）触发清理建议，清理**不触及 markdownSource**

---

## §15 测试策略

### 15.1 单测（Vitest）

- `md-parser` 每个元素至少 3 个 happy path + 3 个 edge case
- `md-serializer` 同上
- `ast-bridge` 双向转换（TipTap JSON ↔ MD AST）
- Frontmatter Zod schema 全路径
- Integrity 四条不变式验证

### 15.2 Round-trip Fuzz 测试

```typescript
// tests/roundtrip/standard-elements.spec.ts
describe('round-trip 19 elements', () => {
  for (const element of ELEMENTS_19) {
    test(`${element.name} should round-trip losslessly`, () => {
      const m0 = element.goldenMarkdown
      const ast = parse(m0)
      const pm = mdToPm(ast)
      const ast2 = pmToMd(pm)
      const m1 = serialize(ast2)
      expect(normalize(m1)).toBe(normalize(m0))
    })
  }
})
```

### 15.3 Playwright E2E（19 元素 × 4 模式）

- Typora 模式编辑 → 切 Source → 切 Preview → 切 Export → 返回 Typora
- 每元素一个 E2E；每元素 4 个断言点
- 总计 76 个断言；CI 必须全绿

### 15.4 黄金样本

- `tests/fixtures/golden/` 存放：
  - `standard-19.md`（19 元素 happy path）
  - `standard-19-edge.md`（嵌套 / 极端长度）
  - `inkforge-extensions.md`（全部专属扩展）
  - `imported-from-typora.md`（Typora 导出的典型文件）
  - `imported-from-obsidian.md`（含 WikiLink）
  - `imported-from-vscode.md`
  - `big-document-900k.md`（性能基线）

### 15.5 模糊输入

- 非法 UTF-8、超长行、BOM、Windows/Unix 换行混用、frontmatter 损坏、YAML 注入尝试
- 所有模糊输入必须**不崩溃**（可以降级，但不能 throw unhandled）

---

## §16 验收矩阵

### 16.1 正向样本（Happy Path）

| # | 场景 | 验收点 |
|---|---|---|
| P-01 | 新建空文档 | markdownSource 含默认 frontmatter；htmlCache 为空；I-01 ~ I-04 全通过 |
| P-02 | 输入 19 元素内容并保存 | Markdown / HTML / hash / frontmatter 镜像 四者一致 |
| P-03 | Typora → Source → Typora | 内容字节级无损 |
| P-04 | 修改 frontmatter.title | DB articles.title 镜像立即更新 |
| P-05 | 导出为 Markdown | 产物与 markdownSource 字节级相同（含 frontmatter） |
| P-06 | 5 平台 exporter 运行 | 每平台产物按 compat 矩阵生成；所有 warnings 写入 export_logs |

### 16.2 失败样本（Failure Path）

| # | 场景 | 验收点 |
|---|---|---|
| F-01 | 非法 Markdown（未闭合）| T01-19 B：保留原文 + 局部不渲染 + Toast |
| F-02 | YAML frontmatter schema 不合法 | 阻断 + Modal 引导修复 |
| F-03 | hash 不匹配（外部工具改了 markdownSource） | 自动重算 + 重建缓存 + activity_logs |
| F-04 | htmlCache 损坏 | 从 markdownSource 重建 |
| F-05 | markdownSource 丢失 | 进入数据风险告警 + 从版本历史或 beforeunload 快照恢复 |
| F-06 | Frontmatter 与 DB 镜像不一致 | 以 frontmatter 为准覆盖 DB 镜像 |

### 16.3 恢复样本（Recovery Path）

| # | 场景 | 验收点 |
|---|---|---|
| R-01 | 崩溃后重启 | beforeunload 快照可恢复 + 告知用户恢复来源 |
| R-02 | 从版本历史回滚 | markdownSource / htmlCache / frontmatter 镜像三者原子更新 |
| R-03 | Git pull 冲突 | 走三方合并 UI（23-sync-provider），合并后写回 Markdown 层 |
| R-04 | 数据完整性 Worker 发现异常 | 自动修复或进入安全模式；文章不丢（R-16） |

### 16.4 边界样本（Boundary Path）

| # | 场景 | 验收点 |
|---|---|---|
| B-01 | 900K 字符文档 | parse ≤ 300ms；serialize ≤ 200ms；内存 < 500MB |
| B-02 | 1000 级嵌套列表 | parse 不栈溢出；serialize 正确 |
| B-03 | 纯 ASCII / 纯 CJK / Emoji / 混合多语言 | round-trip 无损 |
| B-04 | 空 frontmatter（仅 `---\n---\n`） | 自动注入默认 |
| B-05 | 只有 frontmatter 没有正文 | 合法（承认为草稿） |
| B-06 | 超大表格（1000 行 × 20 列） | round-trip 无损；序列化 ≤ 500ms |

### 16.5 Round-trip 四态矩阵

| 元素 | Typora↔Source | Source↔Preview | Preview→Export | Export(MD)→Typora |
|---|---|---|---|---|
| 段落 / 标题 / 列表 | 支持 | 支持 | 支持 | 支持 |
| 表格 / 代码块 / 公式 / Mermaid | 支持 | 支持 | 支持（按平台规则） | 支持 |
| 图片（含 caption）| 支持 | 支持 | 支持 | 支持 |
| 链接 / 行内代码 / 粗斜体 / 删除线 | 支持 | 支持 | 支持 | 支持 |
| 专属扩展（高亮/TOC/Details/WikiLink/Citation/三层来源）| 支持 | 支持 | 支持（按 §9 降级）| 支持或降级 |

### 16.6 CI 闸门

- Vitest 单测通过率 100%
- Round-trip Fuzz 测试通过率 100%
- Playwright 19×4 E2E 通过率 100%
- `vue-tsc --noEmit` 零错误
- Lighthouse Performance > 80

---

## §17 权威来源登记表

| 条目 | 权威来源 | 决策编号 | 问卷题号 |
|---|---|---|---|
| Markdown 表达权威唯一 | 决策 | Part 1 B-01 / R-01 | L1-05 A + 补充 |
| 双层权威模型（表达 vs 运行时） | 决策 | Part 1 B-02 | L1-06 D + 补充 |
| 非标扩展 Typora 策略 | 决策 | Part 1 B-03 / §9 | L1-07 C + 补充 |
| Round-trip 所有元素无损 | 决策 | Part 1 B-04 / R-02 | L1-08 C + 补充 |
| YAML Frontmatter + DB 镜像 | 决策 | Part 1 B-05 | L1-09 D + 补充 |
| 平台渲染链路独立 | 决策 | Part 1 B-06 / R-13 | L1-30 D + 补充 |
| 视觉保真 vs 合规 按平台 | 决策 | Part 1 B-07 | L1-31 C + 补充 |
| 公式/Mermaid/代码高亮 三端一致 + 降级 | 决策 | Part 1 B-08 / R-14 | L1-32 C + 补充 |
| TipTap JSON 为内部状态，Source 是投影 | 决策 | Part 1 C-07 | T01-05 B |
| 19 元素一次性覆盖 | 决策 | Part 1 C-18 | T01-15 A |
| HTML 主存储（运行时） | 决策 | Part 1 B-02 | X-06 B |
| DocumentVersionBundle 对象 | 决策 | Part 1 E-03 | X-09 D |
| Lighthouse > 80 + SLO | 决策 | Part 1 R-15 | X-05 C + 补充 |
| 数据底线文章不能丢 | 决策 | Part 1 R-16 | X-11 C + 补充 |
| Exporter 输入签名为 markdown | 决策 | 本 Spec §10.5（Part 1 R-13 派生） | 混合 |
| 现有 HTML 持久化沿用 | 代码 | — | X-06 B 与现有代码一致 |

---

## 完

> 本 Spec 是 InkForge v2.1 的**权威根基**。任何下游 Spec 与本 Spec 冲突时，以本 Spec 为准（且上溯到 Part 1 / Part 2 决策文档）。
>
> 本 Spec 变更必须走合议流程：任何修改双层权威契约、Round-trip 定义、19 元素清单、Frontmatter Schema 的 PR，必须由至少两位 reviewer 认可，且回归 Part 1 决策文档后再修订。

## 2026-04-30 Implementation Ledger

本轮完成 `10-markdown-authority-spec` 的可运行 baseline，不宣称覆盖本 Spec 全量 §7 / §15 / §16。

已落地内容：

- `ArticleSchema` 新增 `markdownSource`、`htmlCache`、`sourceHash`、`cacheVersion`、`cacheGeneratedAt`，并保留 `rawContent` 作为当前 UI body-only 兼容快照。
- 新增 `src/core/authority/`：`sha256Hex()` 使用浏览器 Web Crypto 计算 SHA-256；`renderMarkdownHtmlCache()` 使用 `marked.parse({ gfm: true, breaks: true })` 后经既有 `markdownRenderSanitizer` 清洗；`frontmatter` helper 支持默认 YAML/frontmatter、DB mirror 覆盖、简单数组与 `inkforge` nested metadata；`article` helper 提供生成、校验、legacy repair。
- `stores/article.ts` 在 URL 解析新增、手动创建、文件导入间接创建、编辑保存、分类移动、加载修复路径同步 authority 字段。
- `markdownSource` 与 `htmlCache` 已纳入 `SENSITIVE_FIELDS`；Article repository 注释与分类查询解密路径已同步更新。
- 真实浏览器验证覆盖 pure-function authority 与 Pinia/Dexie repository 链路，未使用 mock 数据或模拟 IndexedDB。

验证记录：

- `pnpm exec vue-tsc --noEmit` 通过。
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` 通过。
- `pnpm build` 通过，仍有既有大 chunk warning。
- `AUTHORITY_BROWSER_SELF_CHECK_OK`：frontmatter、body roundtrip、SHA-256、htmlCache、title/status/tags/category mirror 更新均通过。
- `AUTHORITY_STORE_REPOSITORY_SELF_CHECK_OK`：真实 browser Pinia store + Dexie repository 创建、读取、更新、校验、删除清理均通过。
- `P0_10_CODE_AND_DOCS_CLEAN_OK`：本轮目标代码与文档未发现 Emoji 图标或转义引号污染。

后续仍待完成：

- 19 元素黄金样本与 round-trip fuzz。
- 所有 exporter / renderer / search / AI 上游输入统一切换到 `markdownSource`。
- `activity_logs`、版本历史 `DocumentVersionBundle`、integrity worker、stale cache 标志与失败恢复 UI。
- 大文档性能 SLO 与完整 §16 验收矩阵。
