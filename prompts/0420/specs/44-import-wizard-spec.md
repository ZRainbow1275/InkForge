> 版本: v2.1.0-draft
> 阶段: Phase 2（内容组织层）
> 依赖: 10-markdown-authority-spec / 12-file-manager-spec / 28-asset-pipeline-spec / 18-tauri-desktop-spec
> 被依赖: 12-file-manager-spec / 43-drafts-box-spec
> 来源决策: T05-11 D / F-04 C+补充 / L1-54 D / EX-01
> 权威来源: 混合（最新日期决策文档 + 0408 问卷）
> 创建日期: 2026-04-21
> 铁律遵循: R-01, R-02, R-05, R-14, R-15

# 44 — Import Wizard Spec

## 目录

- §1 背景与目标
- §2 范围与边界
- §3 触发入口
- §4 支持格式与格式检测
- §5 导入向导五步流程
- §6 格式转换管道
- §7 图片资产处理
- §8 后台任务队列（ImportJobQueue）
- §9 错误处理与容错
- §10 Obsidian / Notion 专项处理
- §11 Roam Research / Bear 专项处理
- §12 冲突解决策略
- §13 TypeScript 类型定义
- §14 模块架构
- §15 性能 SLO
- §16 测试矩阵
- §17 验收标准

---

## §1 背景与目标

### 1.1 问题背景

InkForge v2.0 不提供导入能力，用户只能手动复制粘贴或在文件管理器中直接打开 `.md` 文件（由 L1-54 D 决策覆盖）。
随着 v2.1 的目标用户扩展到从 Notion、Obsidian、Roam Research 迁移的存量用户，批量导入能力成为留存门槛。

来源决策：
- T05-11 D：所有进入方式（拖放/粘贴/选择/文件夹）都先过资源清洗、命名、去重管线
- F-04 C+补充：素材关联追踪、孤儿检测、存储统计
- L1-54 D：支持打开本地 `.md`、监控文件夹、冲突检测

### 1.2 目标

1. 提供统一的图形化导入向导（Import Wizard），覆盖 8 种来源格式。
2. 所有来源路径（拖放/按钮/文件夹）都进入同一转换管道。
3. 导入后文档在 FileManager 中可见并带正确分类、标签、状态。
4. 图片资产自动提取到 `AssetPipeline`，注册 `asset_id`，与文档关联。
5. 大批量导入不阻塞 UI，通过后台 `ImportJobQueue` 异步执行。

### 1.3 范围约定

本 Spec **不覆盖**：
- 导出管线（→ 15-export-publish-spec）
- 文件监控（→ 18-tauri-desktop-spec §TauriFileBridge）
- Asset 去重/孤儿检测（→ 28-asset-pipeline-spec）
- 账户隔离（→ 26-multi-account-profile-spec）

---

## §2 范围与边界

### 2.1 本 Spec 覆盖

| 能力 | 说明 |
|---|---|
| 格式检测 | 自动识别文件类型（MIME + 扩展名 + 魔术字节） |
| 格式转换管道 | docx/html/notion/obsidian/roam/bear → Markdown |
| 导入向导 UI | 五步骤 Wizard 组件 |
| 冲突解决 | 跳过/重命名/覆盖三策略 |
| 后台队列 | ImportJobQueue + 进度事件 |
| 图片提取 | 内嵌 base64/附件图片 → AssetPipeline |
| 完成报告 | 成功/跳过/失败统计 |

### 2.2 非目标（v2.1 明确不做）

- Word 模板（.dotx）、Excel（.xlsx）导入
- 双向实时同步（监控文件夹另起 Spec）
- 在线 URL 抓取导入（v2.2+ 候选）
- PDF 导入（P-05 A 不做 PDF）

---

## §3 触发入口

### 3.1 入口枚举

| 入口 | 位置 | 触发方式 |
|---|---|---|
| Hub 导入按钮 | Hub 页面顶部工具栏 | 点击 `Import` 按钮 |
| 菜单栏 | `File > Import...` | 菜单点击 |
| 拖放文件到 Hub | Hub 文件列表区域 | dragover + drop |
| 拖放文件到 FileManager | 左侧 FileManager 面板 | dragover + drop |
| 拖放文件夹 | Hub 或 FileManager | drop 含目录 |
| 命令面板 | `Ctrl+Shift+P` 搜索"import" | 命令执行 |

### 3.2 拖放预填规则

当用户拖放文件或文件夹时，向导直接跳到步骤 2（格式检测 + 预览），步骤 1 的文件选择结果由拖放提供。
步骤 1 界面仍可追加更多文件。

### 3.3 入口统一性原则

所有入口最终收束到同一个 `ImportWizard.vue` 组件，通过 `initialFiles?: File[]` prop 传入预填内容。
命令面板触发时 `initialFiles` 为空，向导从步骤 1 开始。

---

## §4 支持格式与格式检测

### 4.1 支持格式表

| 格式 | 扩展名 | MIME | 检测方式 | 注记 |
|---|---|---|---|---|
| Markdown | `.md` `.markdown` | `text/markdown` | 扩展名 | 最高优先级 |
| 纯文本 | `.txt` | `text/plain` | 扩展名 | 无格式转换 |
| HTML | `.html` `.htm` | `text/html` | 扩展名 + 魔术字节 `<!` |  |
| Word | `.docx` | `application/vnd.openxmlformats...` | 魔术字节 `PK` + 内部 `word/` 目录 | via mammoth.js |
| Notion 导出 | `.zip`（含 `*.md`） | `application/zip` | zip 内路径特征 `Notion_DB/` 或 `.csv` |  |
| Obsidian Vault | `.zip`（含 `*.md` + `.obsidian/`） | `application/zip` | zip 内含 `.obsidian/` 目录 |  |
| Roam Research | `.json` | `application/json` | JSON 顶层含 `["uid","string","children"]` 结构 |  |
| Bear 导出 | `.bearbundle` 或 `.zip`（含 `.textbundle`） | `application/zip` | zip 内含 `.textbundle/` 目录 |  |

### 4.2 检测优先级

```
1. 扩展名匹配（覆盖 80% 场景）
2. MIME type（浏览器/Tauri 提供）
3. 魔术字节 / zip 内容探测（处理扩展名错误的场景）
4. 无法识别 → 提示用户手动指定格式或跳过
```

### 4.3 检测实现

```typescript
// src/services/importer/formatDetector.ts
export type ImportFormat =
  | 'markdown'
  | 'plaintext'
  | 'html'
  | 'docx'
  | 'notion-zip'
  | 'obsidian-zip'
  | 'roam-json'
  | 'bear-bundle';

export interface DetectionResult {
  format: ImportFormat | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export async function detectFormat(file: File): Promise<DetectionResult>;
```

### 4.4 批量检测

当用户选择多个文件或一个文件夹时，对每个文件独立执行 `detectFormat`，并聚合结果：
- 全部为 Markdown → "纯 Markdown 批量导入"路径（最简配置页）
- 混合格式 → 按格式分组显示，允许用户对每组指定目标文件夹

---

## §5 导入向导五步流程

### 5.1 步骤总览

```
Step 1: 选择文件/文件夹
Step 2: 格式检测 + 预览
Step 3: 选项配置
Step 4: 进度（后台执行）
Step 5: 完成报告
```

### 5.2 Step 1 — 选择文件/文件夹

**组件**: `ImportStep1FileSelect.vue`

**布局**:
```
┌──────────────────────────────────────────┐
│  拖放文件或文件夹到此处，或点击选择      │
│                                          │
│         [选择文件]  [选择文件夹]         │
│                                          │
│  支持格式：Markdown / TXT / HTML /       │
│  DOCX / Notion ZIP / Obsidian ZIP /      │
│  Roam JSON / Bear Bundle                 │
└──────────────────────────────────────────┘
│  已选文件（0）                            │
└──────────────────────────────────────────┘
```

**行为**:
- 使用 Tauri `open()` 对话框（`multiple: true, directory: false/true`）
- 拖放通过 `dragover`/`drop` 事件收集 `File` 对象
- 已选文件列表：文件名 + 大小 + 可点击移除（×）
- 选择文件夹时：递归展开，过滤非支持扩展名，显示文件数摘要
- 至少选择 1 个文件才能点击"下一步"

**校验**:
- 单文件最大 100MB（超过提示但不强制阻止，用户确认后继续）
- 总批量最大 500 个文件（超过分批提示）

### 5.3 Step 2 — 格式检测 + 预览

**组件**: `ImportStep2Preview.vue`

**布局**:
```
┌─────────────────────────────────────────────┐
│ 文件名          格式        状态             │
│─────────────────────────────────────────────│
│ notes.md        Markdown    已识别           │
│ report.docx     Word        已识别           │
│ export.zip      Notion ZIP  已识别 (34 个文件)│
│ unknown.xyz     未知        请手动指定 ↓     │
│                             [Markdown ▼]    │
└─────────────────────────────────────────────┘
│ 预览（选中文件的前 500 字）                  │
│ ─────────────────────────────────────────── │
│ # 我的笔记                                   │
│ 今天的工作...                                │
└─────────────────────────────────────────────┘
```

**行为**:
- 对每个文件异步执行 `detectFormat`，结果实时填入表格
- 检测进行中显示 spinner
- 未识别格式：下拉菜单手动指定，或勾选"跳过此文件"
- ZIP 类型：展开内部文件树（仅显示前 50 条，超过折叠）
- 预览区：点击表格行切换预览内容

### 5.4 Step 3 — 选项配置

**组件**: `ImportStep3Options.vue`

**字段**:

| 字段 | 类型 | 说明 |
|---|---|---|
| 目标文件夹 | folder picker | 导入后放入哪个分类（默认：根目录） |
| 标签 | tag input | 为本次导入的所有文件添加标签（可选） |
| 文档状态 | select | 导入后文档的初始状态（默认：Draft） |
| 冲突策略 | radio | 跳过 / 重命名（自动加后缀）/ 覆盖 |
| 图片处理 | checkbox | 提取内嵌图片到 assets/（默认开启） |
| 元数据保留 | checkbox | 保留原始 frontmatter / Notion 属性（默认开启） |
| 时间戳保留 | checkbox | 使用原文件的创建/修改时间（默认开启，Tauri fs.stat） |

**冲突策略说明**:
- **跳过**: 同名文档已存在则不导入，跳过计数 +1
- **重命名**: 自动添加后缀 `_1`, `_2`...（最多 99 次）
- **覆盖**: 用导入内容覆盖现有文档（写入前创建版本快照）

### 5.5 Step 4 — 进度

**组件**: `ImportStep4Progress.vue`

**布局**:
```
┌──────────────────────────────────────────┐
│ 正在导入 34 个文件...                    │
│                                          │
│ ████████████████░░░░░░░  18 / 34         │
│                                          │
│ 实时日志                                  │
│ ─────────────────────────────────────────│
│ [OK]    notes.md                         │
│ [OK]    chapter-1.md                     │
│ [SKIP]  duplicate.md（已存在，已跳过）    │
│ [WARN]  large-image.png（>5MB，已压缩）   │
│ [ERR]   malformed.docx（解析失败）        │
└──────────────────────────────────────────┘
│ [在后台继续] [取消]                       │
└──────────────────────────────────────────┘
```

**行为**:
- 进度条实时更新（`ImportJobQueue` 事件驱动）
- "在后台继续"：关闭 Wizard 弹窗，导入继续，Hub 右下角显示小进度条
- 后台模式下完成后自动触发步骤 5 的通知（Toast）
- "取消"：软停止（当前正在处理的文件完成后停止，已导入文件保留）
- 日志可滚动，最多保留 500 条

### 5.6 Step 5 — 完成报告

**组件**: `ImportStep5Report.vue`

**布局**:
```
┌──────────────────────────────────────────┐
│ 导入完成                                 │
│                                          │
│  成功  ████  28 个文件                   │
│  跳过  ░░░░   4 个文件（冲突）           │
│  失败  ░░░░   2 个文件（解析错误）       │
│                                          │
│ 失败文件:                                │
│ • malformed.docx — 无法解析 Word 结构   │
│ • corrupt.zip — zip 文件损坏            │
│                                          │
│  [下载错误日志]  [打开目标文件夹]  [完成]│
└──────────────────────────────────────────┘
```

**行为**:
- "打开目标文件夹"：FileManager 跳转到目标分类并高亮新导入文件
- "下载错误日志"：生成 `.txt` 错误报告，通过 Tauri `save()` 对话框保存
- 点击"完成"关闭 Wizard

---

## §6 格式转换管道

### 6.1 总体架构

```
原始文件
    │
    ▼
FormatDetector
    │
    ├─── .md / .txt    → MarkdownPassthrough
    ├─── .html         → HtmlToMarkdown
    ├─── .docx         → DocxToMarkdown
    ├─── Notion ZIP    → NotionToMarkdown
    ├─── Obsidian ZIP  → ObsidianPassthrough
    ├─── Roam JSON     → RoamToMarkdown
    └─── Bear Bundle   → BearToMarkdown
              │
              ▼
        MarkdownNormalizer（统一换行、标准化语法）
              │
              ▼
        AssetExtractor（提取图片 → AssetPipeline）
              │
              ▼
        FrontmatterMerger（合并元数据到 YAML frontmatter）
              │
              ▼
        DocumentWriter（写入 IndexedDB / 文件系统）
```

### 6.2 MarkdownPassthrough（.md / .txt）

`.md`：直接进入 `MarkdownNormalizer`，不做语法转换。

`.txt`：
- 检测是否含 Markdown 语法特征（`#`, `*`, `` ` ``）
- 若含：按 Markdown 处理
- 若不含：包裹为纯文本段落，保留换行

### 6.3 HtmlToMarkdown（.html）

使用 `turndown`（`npm: turndown@7.x`）将 HTML 转为 Markdown。

配置:
```typescript
const td = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});
// 保留 <table> 结构
td.addRule('table', { ... });
// 移除 <script> / <style>
td.remove(['script', 'style', 'meta', 'link']);
```

已知限制：
- 复杂 CSS 布局不保留（降级为纯文本块）
- `<iframe>` 移除
- 内联 SVG 移除（单独保存为 asset）

### 6.4 DocxToMarkdown（.docx）

```
.docx
  └─ mammoth.js → HTML（保留样式映射）
  └─ turndown   → Markdown
```

mammoth.js 配置：
```typescript
import mammoth from 'mammoth';
const result = await mammoth.convertToHtml(
  { arrayBuffer },
  {
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Code']      => pre > code:fresh",
      "r[style-name='Strong']    => strong",
      "r[style-name='Emphasis']  => em",
    ],
    convertImage: mammoth.images.inline(async (element) => {
      // 图片进入 AssetExtractor
      return { src: await assetExtractor.stage(element) };
    }),
  }
);
```

注意：mammoth.js 只做最优努力转换，复杂 Word 样式（SmartArt、文本框、嵌套表格）可能丢失，
转换报告中记录 `messages` 作为警告。

### 6.5 NotionToMarkdown（Notion 导出 ZIP）

Notion 导出为包含 `.md` 文件的 ZIP，结构示例：

```
My Workspace/
├── Page Title abc123.md
├── Database abc123/
│   ├── Row1 abc123.md
│   └── Row2 abc123.md
└── Sub Page abc123.md
```

处理步骤：
1. 解压 ZIP（`jszip`）
2. 过滤 `.md` 文件
3. 对每个 `.md` 文件提取 Notion 专有语法：
   - **页面属性块**（开头的表格形式 `| 属性 | 值 |`）→ 转为 frontmatter
   - **数据库属性**（`database_id`, `Created`, `Status` 等）→ 转为 `notion_*` frontmatter 字段
   - `[[内部链接]]` → 保留为 `[[文件名]]`（与 WikiLink 兼容）
   - `/callout` → 暂不转换（M-01 延后）
4. 图片：Notion ZIP 中图片以相对路径引用，提取到 AssetPipeline
5. 文件夹结构 → FileManager 分类层级（自动创建子分类）

Notion 属性映射：

| Notion 属性 | frontmatter 字段 |
|---|---|
| `Created` | `created_at` |
| `Last Edited` | `updated_at` |
| `Status` | `status` |
| `Tags` | `tags` |
| `URL` | `notion_url` |
| 其他自定义 | `notion_<属性名>` |

### 6.6 ObsidianPassthrough（Obsidian Vault ZIP）

Obsidian 使用标准 Markdown，主要差异：
- `[[wikilink]]` → InkForge WikiLink（直接兼容，36-wiki-link-spec）
- `[[wikilink|别名]]` → 转为 `[[wikilink|别名]]`（兼容）
- 图片 `![[image.png]]` → 提取到 AssetPipeline，转为 `![](asset://...)`
- `#标签` 内联标签 → 转为 frontmatter `tags`
- Frontmatter：直接保留
- `.obsidian/` 配置目录：跳过

### 6.7 RoamToMarkdown（Roam Research JSON）

Roam 导出为嵌套 JSON 结构：
```json
[{
  "title": "Page Title",
  "uid": "abc123",
  "children": [
    {"string": "Block text", "uid": "...", "children": [...]}
  ]
}]
```

处理步骤：
1. 解析 JSON，每个顶级对象为一篇文档
2. 递归展开 `children` 为无序列表（层级 = 缩进深度）
3. Roam 特有语法转换：
   - `[[Page Reference]]` → WikiLink
   - `((block-ref))` → 转为引用文本 + 脚注（降级处理）
   - `{{[[TODO]]}}` / `{{[[DONE]]}}` → 任务列表语法 `- [ ]` / `- [x]`
   - `^^highlight^^` → `==highlight==`（高亮语法）
   - `` `code` `` → 保留
   - `/roam/...` 属性 → frontmatter
4. `uid` 作为文档唯一标识用于内部链接解析

### 6.8 BearToMarkdown（Bear 导出）

Bear 导出格式：`.bearbundle`（ZIP），内含每篇笔记的 `.textbundle`：
```
note.textbundle/
├── text.markdown
└── assets/
    ├── image.png
    └── ...
```

处理步骤：
1. 解压外层 ZIP，遍历 `.textbundle` 目录
2. 读取 `text.markdown`（标准 Markdown，Bear 扩展较少）
3. `#标签` → frontmatter `tags`
4. `/assets/` 图片 → AssetPipeline
5. Bear 特有：`::todo::` → 任务列表（部分版本）

### 6.9 MarkdownNormalizer

将任意来源的 Markdown 统一化：

```typescript
// src/services/importer/markdownNormalizer.ts
export function normalizeMarkdown(raw: string): string {
  // 1. 统一换行符 CRLF → LF
  // 2. 移除 BOM
  // 3. 标准化标题（ATX 格式，确保空格）
  // 4. 修复无序列表标记统一为 -
  // 5. 修复代码块语言标识大小写（Python → python）
  // 6. 折叠超过 3 个连续空行为 2 个
  // 7. 统一链接格式（不破坏 WikiLink）
}
```

---

## §7 图片资产处理

### 7.1 提取策略

在格式转换管道中，`AssetExtractor` 负责处理图片：

| 图片来源 | 处理方式 |
|---|---|
| HTML/DOCX 内嵌 base64 | decode → 写入临时文件 → AssetPipeline.stage() |
| ZIP 包内附件图片 | 解压 → AssetPipeline.stage() |
| 相对路径引用 | 解析绝对路径 → AssetPipeline.stage() |
| 远程 URL | 标记为 `external`，不下载（v2.1），保留原 URL |

### 7.2 AssetPipeline 集成

```typescript
import { assetPipeline } from '@/services/assetPipeline';

const assetId = await assetPipeline.importAsset({
  source: 'import',
  data: imageBuffer,         // ArrayBuffer
  filename: 'image.png',
  mimeType: 'image/png',
  documentId: targetDocId,  // 关联文档
});
// 返回的 assetId 用于替换文档中的图片引用
```

### 7.3 图片引用替换

转换完成后，文档中的所有图片引用替换为 `asset://` 协议：
```markdown
<!-- 替换前 -->
![alt](./assets/image.png)

<!-- 替换后 -->
![alt](asset://abc123-uuid)
```

### 7.4 GIF 和 SVG

- GIF：按原始格式存储，不转换（InkForge 不做图片编辑）
- SVG：以 `image/svg+xml` MIME 存储，渲染时作为 `<img>` 标签展示

---

## §8 后台任务队列（ImportJobQueue）

### 8.1 设计原则

- 导入不阻塞 UI
- 支持"在后台继续"（关闭 Wizard 后继续运行）
- 单次导入为一个 `ImportJob`，每个文件为一个 `ImportTask`
- 使用 Tauri Worker 线程（或 `setTimeout` 调度）串行处理文件

### 8.2 类型定义

```typescript
// src/services/importer/types.ts
export interface ImportJob {
  id: string;
  createdAt: Date;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled';
  options: ImportOptions;
  tasks: ImportTask[];
  progress: ImportProgress;
}

export interface ImportTask {
  id: string;
  filename: string;
  format: ImportFormat;
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'failed';
  result?: ImportTaskResult;
  error?: string;
}

export interface ImportProgress {
  total: number;
  completed: number;
  succeeded: number;
  skipped: number;
  failed: number;
}

export interface ImportOptions {
  targetFolderId: string | null;
  tags: string[];
  initialStatus: DocumentStatus;
  conflictStrategy: 'skip' | 'rename' | 'overwrite';
  extractImages: boolean;
  preserveMetadata: boolean;
  preserveTimestamps: boolean;
}

export interface ImportTaskResult {
  documentId: string;
  title: string;
  assetIds: string[];
  warnings: string[];
}
```

### 8.3 ImportJobQueue 接口

```typescript
// src/services/importer/importJobQueue.ts
export class ImportJobQueue {
  /** 创建并启动新的导入任务 */
  async createJob(files: File[], options: ImportOptions): Promise<ImportJob>;

  /** 获取任务状态 */
  getJob(jobId: string): ImportJob | null;

  /** 取消任务（软停止） */
  async cancelJob(jobId: string): Promise<void>;

  /** 任务进度事件 */
  on(event: 'progress', callback: (job: ImportJob) => void): void;
  on(event: 'taskComplete', callback: (task: ImportTask) => void): void;
  on(event: 'jobComplete', callback: (job: ImportJob) => void): void;

  /** 持久化任务到 IndexedDB（应用重启后可恢复中断的导入） */
  private persistJob(job: ImportJob): Promise<void>;
}
```

### 8.4 进度通知

后台模式下，通过 Toast 通知用户：
- 进度到 50%：Toast "导入进行中（50%）"（不强打断）
- 完成：Toast "导入完成：28 成功，2 失败" + "查看报告"按钮
- 失败：Toast "导入部分失败，点击查看详情"

---

## §9 错误处理与容错

### 9.1 错误分级

| 级别 | 示例 | 行为 |
|---|---|---|
| SKIP | 冲突策略为跳过 | 跳过计数 +1，继续 |
| WARN | mammoth 转换警告、图片过大 | 记录日志，继续 |
| ERROR | 文件损坏、解析失败 | 失败计数 +1，跳过，继续 |
| FATAL | 磁盘满、权限错误 | 暂停任务，通知用户 |

### 9.2 文件损坏处理

- ZIP 损坏：`jszip` 抛出异常 → 整个 ZIP 标记 ERROR
- DOCX 损坏：mammoth.js 抛出异常 → 标记 ERROR + 详情
- JSON 非法：`JSON.parse` 异常 → 标记 ERROR

### 9.3 超时处理

单个文件转换超时阈值：
- Markdown / TXT：3 秒
- HTML：10 秒
- DOCX：30 秒（mammoth.js 可能较慢）
- ZIP（按文件数）：每 50 个文件额外 10 秒

超时 → 标记 ERROR（`'转换超时'`），继续处理下一个。

### 9.4 错误日志格式

```
[TIMESTAMP] [STATUS] [FILENAME] [MESSAGE]
2026-04-21T10:30:00Z  ERROR  malformed.docx  "mammoth: Cannot read property of undefined"
2026-04-21T10:30:01Z  SKIP   duplicate.md    "文件已存在（冲突策略：跳过）"
2026-04-21T10:30:02Z  WARN   large.png       "图片大小 8.3MB，已压缩至 2.1MB"
```

---

## §10 Obsidian / Notion 专项处理

### 10.1 Obsidian 专项

**WikiLink 兼容性**：
Obsidian `[[文件名]]` 格式与 InkForge WikiLink（36-wiki-link-spec）完全兼容，直接保留。

**Frontmatter**：
Obsidian frontmatter 直接保留，不做字段重命名，但追加以下 InkForge 标准字段（若不存在）：
```yaml
---
inkforge_imported_from: obsidian
inkforge_imported_at: '2026-04-21T10:30:00Z'
---
```

**Daily Notes**：
识别符合 `YYYY-MM-DD.md` 命名格式的文件，自动打上 `daily-note` 标签。

**Canvas**：
Obsidian `.canvas` 文件（JSON 格式白板）：跳过，记录 WARN（v2.1 不支持）。

**Plugin 数据**：
`.obsidian/` 目录下的所有文件：跳过。

### 10.2 Notion 专项

**数据库视图**：
Notion 数据库导出为 CSV（附带 `.md` 文件），CSV 跳过（不导入表格数据）。

**关联关系**：
Notion 关联属性（`Relation`）→ 转为 frontmatter `notion_relation: [页面名称]`（v2.1 不做内链解析）。

**内嵌内容块**：
Notion `toggle`、`synced block`、`column` → 尽力保留为 Markdown 结构（toggle → `<details>`，其余扁平化）。

**Notion 公式**：
Notion 公式列 → frontmatter `notion_formula_<列名>: 计算结果字符串`（不执行公式）。

---

## §11 Roam Research / Bear 专项处理

### 11.1 Roam Research 专项

**块引用 `((uid))`**：
Roam 的块引用在本文档范围内解析为引用文本（被引用块的 string 内容），跨文档块引用降级为 `<!-- roam block ref: uid -->`（HTML 注释保留，不渲染）。

**属性**：
Roam 属性块（`Attribute::` 格式）→ frontmatter 字段：
```
Status:: In Progress
→ frontmatter: status: "In Progress"
```

**嵌套深度**：
Roam 允许无限嵌套，转换时限制最大缩进深度为 6 级（超过部分扁平化）。

**日期格式**：
Roam 使用 `[[April 21st, 2026]]` 格式的日期引用 → 保留为 WikiLink（如果目标不存在则仅保留文本）。

### 11.2 Bear 专项

**标题提取**：
Bear 笔记通常第一行为 `# 标题`，提取为 `title` frontmatter 字段。

**Bear 标签**：
Bear 使用 `#标签` 内联标签（与 Markdown 标题冲突处理）：
- 行首 `#标签`（后无空格）→ 识别为 Bear 标签，转为 frontmatter `tags`
- 行首 `# 标题`（后有空格）→ 识别为 Markdown 标题，保留

**Bear 链接**：
`bear://x-callback-url/open-note?id=...` 链接 → 转为 WikiLink（仅文档名，ID 丢弃）。

**附件**：
Bear 附件（非图片，如 PDF）→ 跳过，记录 WARN（v2.1 不支持非图片附件）。

---

## §12 冲突解决策略

### 12.1 冲突检测

冲突定义：导入文档的**标题**与目标文件夹中已有文档的**标题**相同。

检测时机：在 Step 3 配置完成后，Step 4 开始前，扫描所有待导入文档的标题。
扫描结果在 Step 3 下方显示冲突预览（`X 个文件存在冲突`）。

### 12.2 跳过策略

```typescript
if (existingDoc) {
  task.status = 'skipped';
  task.result = undefined;
}
```

### 12.3 重命名策略

```typescript
function resolveConflictName(title: string, existingTitles: Set<string>): string {
  let candidate = title;
  let counter = 1;
  while (existingTitles.has(candidate) && counter <= 99) {
    candidate = `${title}_${counter}`;
    counter++;
  }
  return candidate;
}
```

### 12.4 覆盖策略

覆盖前：
1. 读取现有文档当前内容
2. 调用 `versionStore.createVersionPoint()` 创建版本快照（标记为 `before_import_overwrite`）
3. 写入新内容

---

## §13 TypeScript 类型定义

```typescript
// src/services/importer/types.ts（完整）

export type ImportFormat =
  | 'markdown'
  | 'plaintext'
  | 'html'
  | 'docx'
  | 'notion-zip'
  | 'obsidian-zip'
  | 'roam-json'
  | 'bear-bundle';

export type ConflictStrategy = 'skip' | 'rename' | 'overwrite';

export type DocumentStatus =
  | 'draft'
  | 'writing'
  | 'review'
  | 'ready'
  | 'published'
  | 'archived';

export interface DetectionResult {
  format: ImportFormat | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  fileCount?: number; // ZIP 类型内部文件数
}

export interface ImportOptions {
  targetFolderId: string | null;
  tags: string[];
  initialStatus: DocumentStatus;
  conflictStrategy: ConflictStrategy;
  extractImages: boolean;
  preserveMetadata: boolean;
  preserveTimestamps: boolean;
}

export interface ImportJob {
  id: string;
  createdAt: Date;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'cancelled';
  options: ImportOptions;
  tasks: ImportTask[];
  progress: ImportProgress;
}

export interface ImportTask {
  id: string;
  filename: string;
  format: ImportFormat;
  status: 'pending' | 'processing' | 'success' | 'skipped' | 'failed';
  result?: ImportTaskResult;
  error?: string;
  warnings?: string[];
}

export interface ImportProgress {
  total: number;
  completed: number;
  succeeded: number;
  skipped: number;
  failed: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ImportTaskResult {
  documentId: string;
  title: string;
  assetIds: string[];
  warnings: string[];
  originalFormat: ImportFormat;
}

export interface ConflictInfo {
  filename: string;
  existingDocumentId: string;
  existingDocumentTitle: string;
}
```

---

## §14 模块架构

```
src/services/importer/
├── index.ts                   # 公开 API
├── types.ts                   # 全部类型定义
├── formatDetector.ts          # 格式检测
├── importJobQueue.ts          # 后台任务队列
├── markdownNormalizer.ts      # Markdown 统一化
├── assetExtractor.ts          # 图片提取（委托 AssetPipeline）
├── conflictResolver.ts        # 冲突解决
├── converters/
│   ├── markdownConverter.ts   # Markdown/TXT passthrough
│   ├── htmlConverter.ts       # HTML → Markdown（turndown）
│   ├── docxConverter.ts       # DOCX → Markdown（mammoth.js）
│   ├── notionConverter.ts     # Notion ZIP → Markdown
│   ├── obsidianConverter.ts   # Obsidian ZIP → Markdown
│   ├── roamConverter.ts       # Roam JSON → Markdown
│   └── bearConverter.ts       # Bear Bundle → Markdown
└── __tests__/
    ├── formatDetector.test.ts
    ├── converters/
    │   ├── htmlConverter.test.ts
    │   ├── docxConverter.test.ts
    │   ├── notionConverter.test.ts
    │   ├── obsidianConverter.test.ts
    │   ├── roamConverter.test.ts
    │   └── bearConverter.test.ts
    └── importJobQueue.test.ts

src/components/importer/
├── ImportWizard.vue           # 向导容器（步骤路由）
├── ImportStep1FileSelect.vue  # 步骤 1
├── ImportStep2Preview.vue     # 步骤 2
├── ImportStep3Options.vue     # 步骤 3
├── ImportStep4Progress.vue    # 步骤 4
└── ImportStep5Report.vue      # 步骤 5
```

---

## §15 性能 SLO

| 场景 | 目标 |
|---|---|
| 格式检测（单文件） | < 200ms |
| Markdown 转换（10KB 文件） | < 100ms |
| HTML 转换（10KB 文件） | < 500ms |
| DOCX 转换（1MB 文件） | < 5s |
| ZIP 解压 + 扫描（100 文件） | < 3s |
| 批量导入吞吐 | ≥ 5 文件/秒（纯 Markdown） |
| UI 响应 | 进度事件 ≥ 2Hz（导入中不卡顿） |

---

## §16 测试矩阵

| # | 测试场景 | 期望结果 |
|---|---|---|
| T01 | 导入单个 `.md` 文件 | 文档创建，内容保真，标题提取正确 |
| T02 | 导入单个 `.txt` 文件（纯文本） | 创建文档，内容包裹为段落 |
| T03 | 导入单个 `.html` 文件（含表格） | 表格结构保留为 Markdown pipe |
| T04 | 导入单个 `.docx` 文件（含图片） | 图片提取到 assets，文档引用 asset:// |
| T05 | 导入 Notion 导出 ZIP（10 页面，含数据库） | 10 篇文档创建，属性映射到 frontmatter |
| T06 | 导入 Obsidian Vault ZIP（含 WikiLink） | WikiLink 保留，图片提取 |
| T07 | 导入 Roam JSON（含嵌套块和 TODO） | 嵌套转为列表，TODO → 任务列表 |
| T08 | 导入 Bear Bundle（含 #标签） | 标签提取到 frontmatter |
| T09 | 拖放文件到 Hub → Wizard 预填文件 | 向导打开，步骤 2 已有文件列表 |
| T10 | 冲突策略：跳过 | 同名文档不覆盖，跳过计数 +1 |
| T11 | 冲突策略：重命名 | 新文档命名为 `title_1` |
| T12 | 冲突策略：覆盖 | 现有文档覆盖，版本快照创建 |
| T13 | 导入中途点击"在后台继续" | Wizard 关闭，导入继续，Toast 进度 |
| T14 | 导入中途点击"取消" | 当前文件完成后停止，已导入文件保留 |
| T15 | 损坏的 ZIP 文件 | 标记 ERROR，继续其他文件 |
| T16 | 损坏的 DOCX 文件 | 标记 ERROR，mammoth 错误信息记录 |
| T17 | 超时文件（DOCX > 30s） | 标记 ERROR（超时），继续 |
| T18 | 100 个 Markdown 文件批量导入 | 5 分钟内完成，UI 保持响应 |
| T19 | 导入后完成报告数字正确 | 成功+跳过+失败 = total |
| T20 | "下载错误日志" | 生成正确格式的 .txt 报告 |
| T21 | "打开目标文件夹" | FileManager 跳转并高亮新文件 |
| T22 | Notion 数据库 CSV 文件 | 跳过，记录 WARN |
| T23 | Obsidian Canvas 文件 | 跳过，记录 WARN |
| T24 | 导入带 base64 内嵌图片的 HTML | 图片解码提取，替换为 asset:// |
| T25 | 导入 Bear 笔记（`# 行首标签` vs `# 标题` 冲突） | 正确区分标签与标题 |
| T26 | Roam 块引用跨文档 | 降级为 HTML 注释，不报错 |
| T27 | 单文件 > 100MB | 提示确认弹窗，用户确认后继续 |
| T28 | 总文件数 > 500 | 分批提示，用户知悉 |

---

## §17 验收标准

1. 所有 8 种格式可正常导入，转换结果可在编辑器中正常打开和编辑。
2. 图片资产在导入后通过 `asset://` URL 在编辑器内正常显示。
3. 批量导入 100 个文件全程不阻塞 UI（进度条实时更新）。
4. 冲突解决三策略全部可正常工作，覆盖前版本快照可在版本历史中找到。
5. 错误日志可下载，格式符合 §9.4 定义。
6. 在后台继续后应用关闭再重开，导入任务不丢失（IndexedDB 持久化）。
7. 完成报告数字（成功/跳过/失败）精确无误。

## 2026-05-02 Format Detection Baseline Implementation Note

Baseline status: Implemented for the existing real file-picker import path. Full Spec 44 remains pending for the dedicated five-step ImportWizard UI, async ImportJobQueue, DOCX/ZIP/Notion/Obsidian/Roam/Bear converters, conflict-resolution workflow, and packaged Tauri drag/drop coverage.

Implemented baseline coverage:

- The existing `src/services/file-import` pipeline now exposes `detectImportFormat()` metadata and `getSupportedImportFormatOrThrow()` so format detection can be tested before content parsing.
- Markdown (`.md`, `.markdown`, `.mdx`, markdown MIME), HTML (`.html`, `.htm`, HTML MIME), and TXT (`.txt`, extensionless `text/plain`) remain supported by the existing parser and article-store creation path.
- Known migration formats without real converters (`.docx`, `.zip`, `.json`, `.bear`, `.bear2bk`) are explicitly classified as unsupported instead of being silently treated as plain text.
- Unknown extensions and binary MIME inputs are rejected with user-facing error reasons such as `unsupported-extension-or-mime`.
- Oversize protection remains first in the batch loop; skipped oversize count is preserved in `ImportSummary` and returned to UI through `FileImportResult.skippedOversize`.
- Hub now stores and renders the latest real import attempt result, including cancellation/no-write, success, failed, oversize skipped, and first error details.
- FileManager keeps using the same `articleStore.importFromFiles()` boundary and now also understands `skippedOversize` so the shared result model stays consistent.
- No fake DOCX/ZIP/Bear converters, mock imported documents, simulated successful imports, or emoji glyph icons were added.

Validation scope for this baseline:

- `pnpm exec vitest run src/services/file-import/format-detection.test.ts`
- `pnpm exec vue-tsc --noEmit`
- Targeted lint for file import service, article store, Hub, and FileManager
- Full lint, full Vitest suite, build, browser render smoke, BOM scan, emoji scan, `git diff --check`, and untracked-file whitespace scan passed before task completion.