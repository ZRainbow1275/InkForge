# 15 — 导出与发布管线 Spec

> **Spec 编号**: 15
> **层级**: 发布层（Phase 3 — Output Channels）
> **状态**: Draft v1（0420）
> **作者**: InkForge v2.1 Spec 团队
> **依赖上游**: 10-markdown-authority-spec（Markdown 权威模型 + 渲染契约 + Exporter 签名约束 + 反向污染禁令）、16-markdown-extensions-spec（增强语法降级规则的具体来源）、28-asset-pipeline（资产快照与 base64 内联）、33-diagnostic-logging（export_logs 事件流）、11-document-lifecycle（状态联动）、31-version-bundle（导出对应版本）
> **下游依赖方**: UI 层的"导出对话框"、剪贴板"复制为…"菜单、Settings > Export 预设管理、Hub 的"发布历史"卡片、Command Palette 的"导出…"命令集
> **相关铁律**: R-01（Markdown 权威唯一）、R-02（元素 round-trip）、R-13（平台独立链路 + 不反向污染）、R-14（公式/Mermaid/代码高亮三端一致 + 降级）、R-17（关键操作审计）、R-18（关键写操作产生版本点或审计）
> **关联决策**: J-01 ~ J-09（决策文档 Part 2）、P-01 ~ P-06（增强问卷）

---

## 0. 文档定位与使用方式

本 Spec 定义 InkForge v2.1 的 **导出与发布总管线**、**五大平台适配器（微信公众号 / 小红书 / 知乎 / 标准 HTML / 标准 Markdown）**、**导出预设 Schema**、**导出预览与参数调整 UI 契约**、**导出历史与一键重导出**、**剪贴板"复制为…"菜单**、**自定义渠道配置**、**验收矩阵**。

- 本 Spec 严格遵循 10-markdown-authority-spec §12 / §13 / 附录 B 的"多平台链路分叉 + 独立目录 + 反向污染禁令"。
- 本 Spec 不定义增强语法的语法形式本身（交给 16-markdown-extensions-spec），仅约束"增强语法在各平台下的降级表现"。
- 本 Spec 不定义 Markdown 权威与 DB 镜像（交给 10）；所有 exporter 输入只能是 `markdown: string + context`。
- 本 Spec 明确 **v2.1 不做 PDF 导出**（P-05=A / 决策 J-02）。

---

## 目录

### Part A. 导出管线总则
1. 设计原则（Markdown 权威共享 + 各平台独立链路）
2. PublishAdapter 接口（输入/输出/CSS 约束/图片规则/HTML 清洗）
3. 导出预设 Schema（`preset.json`）
4. 平台清单（WeChat / RedBook / Zhihu / HTML / Markdown）
5. PDF 明确不做（P-05=A）声明

### Part B. 微信公众号适配器
6. CSS 注入（juice 内联）
7. SVG 处理（公式 → SVG 规范化）
8. Mermaid → PNG 回退
9. 代码块样式重写
10. 图片上传占位（手动上传指引）

### Part C. 小红书适配器
11. 长图拼接
12. 字体限制
13. 排版约定

### Part D. 知乎适配器
14. HTML 清洗
15. 公式保留 LaTeX
16. 代码块样式

### Part E. 标准 HTML 导出
17. 单文件 HTML + inline CSS + assets base64
18. TOC 可选（P-04=D + 用户选择）
19. 目录深度配置

### Part F. 标准 Markdown 导出
20. frontmatter 保留
21. 图片路径重写
22. 扩展语法可移植标注

### Part G. 导出体验
23. 导出前预览 + 参数调整（P-01 推断 D）
24. 导出预设保存
25. 导出历史记录（P-02=C，记录参数/版本/平台）
26. 一键重导出
27. 剪贴板"复制为…"菜单（P-03=D：text / HTML / Markdown）
28. 渠道用户自定义配置（P-06=D）

### Part H. 验收
29. 验收矩阵（5 平台 × 19 元素 × 3 样本）
30. 权威来源登记表

---

## Part A. 导出管线总则

### 1. 设计原则

#### 1.1 P1 | Markdown 权威共享，派生链路独立

所有 exporter 共享同一个上游：`markdownSource` + `frontmatter` + `assetSnapshot`。共享至 AST Normalizer 结束，再进入各平台独立渲染链。详见 10-markdown-authority-spec §12 的链路总图以及决策 J-01 的分层图。

```
       Markdown 源（权威）
            │
            ▼
       markdown-it 解析
            │
            ▼
      AST Normalizer
   （规范 GFM + InkForge ext）
            │
 ┌──────────┼──────────┬──────────┬──────────┐
 ▼          ▼          ▼          ▼          ▼
wechat   redbook    zhihu      html     markdown
 render   render    render     render    serialize
   │        │         │          │          │
   ▼        ▼         ▼          ▼          ▼
 preset    preset    preset    preset     preset
 sanitize sanitize  sanitize   sanitize   sanitize
 fallback fallback  fallback   fallback   fallback
   │        │         │          │          │
   ▼        ▼         ▼          ▼          ▼
 HTML+CSS  长图集   HTML+KaTeX 单文件HTML  .md 文件
```

#### 1.2 P2 | 不反向污染

依 10-markdown-authority-spec §13 的四条禁令 D1~D4，以及 J-01 "Markdown 权威源向下单向派生"铁律：

| 禁令 | 本 Spec 中的落实 |
|---|---|
| D1 exporter 不得修改 `markdownSource` | 所有 exporter 签名只接收 `readonly markdown: string`；类型层面不暴露写入函数 |
| D2 exporter 不得修改 `frontmatter` | `context.frontmatter` 是 `Readonly<Frontmatter>`；对 frontmatter 的任何平台映射只能写入 `ExportArtifact` 的独立字段，不回写 |
| D3 exporter 只能写 `export_logs` | 每次导出写一条 `export_logs` 记录；写入其他表则 ESLint `no-db-write-outside-authority` 阻断 |
| D4 粘贴/导入的 Markdown 一旦确认即成为新权威 | 导出不是导入的逆向；导入走 44-import-wizard |

额外禁令（决策 J-01）：

- **禁止**：Editor 代码中出现 `if (platform === 'wechat')` 这类平台判断（必须通过 Renderer 注入）
- **禁止**：Platform Renderer 之间共享代码（避免"为了微信加的补丁污染 HTML 导出"）
- **必须**：所有 Renderer 的输入是 Normalized AST，输出是平台 bundle（HTML + CSS + assets）

#### 1.3 P3 | 保真优先级可配置

每个 preset 声明 `fidelityPriority`：`semantic` / `visual` / `portability`。

- `semantic`：保留语义（结构、语义化标签优先），视觉可让步（如知乎 MD 导入）
- `visual`：视觉最大还原（如公众号长文排版、小红书长图）
- `portability`：可移植性优先（如标准 MD），增强语法必须降级到 CommonMark + GFM

#### 1.4 P4 | 统一资产处理

所有 exporter 通过 `context.assets: AssetSnapshot[]`（见 28-asset-pipeline）获取图片/附件；自行决定：

- `inline-base64`：内联成 data URI（HTML 单文件 / WeChat 临时预览）
- `external-url`：保留远端 URL（Markdown / Zhihu）
- `local-relative`：拷贝到 `{exportBasename}_files/` 子目录（Markdown 离线包）
- `placeholder-manual`：留占位符 + 导出后指引（WeChat 手动上传）

策略选择对应决策 J-04 "资产嵌入策略（T04-14 C）按平台决定"。

#### 1.5 P5 | 三端一致的公式 / Mermaid / 代码高亮（R-14）

对应 10-markdown-authority-spec §3.4 与决策 J-04 的三级降级矩阵：

| 能力 | 主策略 | 降级 1 | 降级 2（最低保真） |
|---|---|---|---|
| KaTeX 公式 | MathML / SVG inline | 渲染为 PNG 图像 | 保留 `$...$` 源码 + 提示 |
| Mermaid 图表 | inline SVG | 渲染为 PNG 图像 | 保留代码块源码 + 提示 |
| 代码高亮 | inline styles（colored span） | 纯 `<pre><code>` | 纯文本 |

- 编辑器 / 预览 / 导出三端共享同一个 `RENDERER_VERSION`
- 公式 / Mermaid 渲染失败时至少保留源码（不得静默丢失，J-04 硬约束）
- 降级事件必须写 `export_logs.downgrade`（R-17 审计）

#### 1.6 P6 | 降级必须可见

任何增强语法在目标平台的降级均需在"导出预览面板"的右侧列出：`共 X 条不可移植元素，Y 条已降级保留，Z 条已丢弃`。禁止静默丢失语义。

#### 1.7 P7 | 安全沙箱双层（J-08）

- **第一层 UnifiedSanitizer**：统一最小清洗（DOMPurify），删除 `<script>` / `on*` / `javascript:` / 危险 `data:`（保留 `<iframe>` 由 Adapter 决定）
- **第二层 Platform Sanitizer**：由每个 Adapter 的 `postprocess` 阶段执行，按平台规则补强

禁止关闭 UnifiedSanitizer（最底线）。Settings > Security Audit 可查看被清洗掉的条目（透明度）。

---

### 2. PublishAdapter 接口

#### 2.1 签名（对齐决策 J-05）

```ts
// src/services/exporters/types.ts
import type { Frontmatter } from '@/services/frontmatter/schema';
import type { AssetSnapshot } from '@/services/assets/types';
import type { ExportPreset } from './preset-schema';

export interface ExportContext {
  frontmatter: Readonly<Frontmatter>;
  assets: ReadonlyArray<AssetSnapshot>;
  preset: ExportPreset;
  rendererVersion: string;           // RENDERER_VERSION 快照
  versionId: string;                 // 当前导出对应的文档版本 ID（31-version-bundle）
  abortSignal?: AbortSignal;
  onProgress?: (p: ExportProgress) => void;
  onDowngrade?: (d: DowngradeEvent) => void;
}

export interface ExportArtifact<TPayload = unknown> {
  platform: PlatformId;
  payload: TPayload;                 // 各平台具体产物（字符串 / 压缩包 / 图像数组）
  mimeType: string;
  suggestedFilename: string;
  metadata: {
    wordCount: number;
    assetRefs: string[];             // 被引用的 asset-id 列表
    downgrades: DowngradeEvent[];    // 所有降级事件快照
    renderedAt: string;              // ISO
    rendererVersion: string;
    presetVersion: string;
  };
}

export type PublishAdapter<TPayload = unknown> = (
  markdown: string,
  context: ExportContext,
) => Promise<ExportArtifact<TPayload>>;

export interface PublishAdapterDescriptor {
  id: string;                        // "wechat-official"
  name: string;
  version: string;
  kind: 'builtin' | 'user' | 'plugin';
  cssConstraints: CssConstraints;
  htmlSanitizer: HtmlSanitize;
  assetStrategy: ImageRules;
  featureSupport: {
    math: FormulaStrategy;
    mermaid: MermaidStrategy;
    codeHighlight: CodeHighlightStrategy;
    embeds: boolean;
    footnotes: boolean;
    toc: boolean;
    citations: 'inline' | 'footnote' | 'hidden';
  };
  preprocess?: (ast: NormalizedAst) => NormalizedAst;
  render: PublishAdapter;
  postprocess?: (result: ExportArtifact) => ExportArtifact;
  publish?: (result: ExportArtifact, credentials: Credentials) => Promise<PublishResult>;
}
```

#### 2.2 CSS 约束

```ts
export interface CssConstraints {
  mode: 'inline-all'                 // 全部 inline（WeChat / RedBook）
      | 'inline-minimal'             // 仅保留骨架 inline，其余放 <style>（HTML 单文件）
      | 'sanitize-strip'             // 剥离所有样式（Zhihu Markdown-paste）
      | 'preserve';                  // 保留（标准 HTML）
  allowedProperties?: string[];      // 白名单 CSS 属性（平台合规要求）
  disallowedProperties?: string[];   // 黑名单（如 `position: fixed` 被微信剥离）
  maxInlineSize?: number;            // inline CSS 字节上限（WeChat 250KB 单文）
  fontFallbackChain?: string[];      // 平台支持的字体链
}
```

#### 2.3 图片规则

```ts
export interface ImageRules {
  strategy: AssetStrategy;           // inline-base64 / external-url / local-relative / placeholder-manual
  maxWidthPx?: number;               // 强制缩放上限（WeChat 900px / RedBook 长图 1080px）
  maxTotalBytes?: number;            // 单次导出总字节上限
  forcedFormat?: 'jpeg' | 'png' | 'webp' | 'keep';
  altRequired?: boolean;             // 缺失 alt 时是否报警
  mermaidStrategy: 'svg' | 'png' | 'code-fallback';
  formulaStrategy: 'katex-html' | 'mathml' | 'svg' | 'png' | 'latex-source';
}
```

#### 2.4 HTML 清洗规则

```ts
export interface HtmlSanitize {
  allowedTags: string[];             // 平台支持的标签
  allowedAttributes: Record<string, string[]>;
  disallowedTags: string[];          // 强制剥离的标签（如 <iframe>）
  cssClassPolicy: 'keep' | 'strip' | 'prefix';
  prefix?: string;                   // 如 `_ink_`，避免与宿主页冲突
  linkPolicy: 'keep' | 'text-only' | 'footnote-list';  // RedBook 把链接转脚注
}
```

#### 2.5 输入契约（强制约束）

- `markdown: string` 参数为**只读**（TypeScript 层 `readonly`）
- exporter 实现不得 import 任何 IndexedDB 写入函数（CI 静态扫描）
- exporter 不得 import 其他 exporter 目录下的文件（仅允许 import `src/services/exporters/shared/`）
- exporter 不支持任意 JS 代码注入（用户自定义 Adapter 仅支持配置式，决策 J-05 硬约束）

---

### 3. 导出预设 Schema

#### 3.1 `preset.json` 字段表

```ts
// src/services/exporters/<platform>/preset.schema.ts
export interface ExportPreset {
  id: string;                        // 预设唯一 ID，如 `wechat.default`
  version: string;                   // 预设版本号（语义化）
  platform: PlatformId;              // 平台
  label: string;                     // 显示名
  description?: string;
  fidelityPriority: 'semantic' | 'visual' | 'portability';
  css: CssConstraints;
  image: ImageRules;
  html: HtmlSanitize;
  toc: {
    enabled: boolean;                // 是否生成 TOC
    maxDepth: 2 | 3 | 4 | 5 | 6;
    numbered: boolean;
    clickable: boolean;
    position: 'top' | 'floating' | 'standalone';
  };
  fallback: {
    highlight: 'mark-tag' | 'span-bg-color' | 'text-only';
    footnote: 'anchor-list' | 'inline-paren' | 'keep';
    wikilink: 'plain-text' | 'external-link' | 'footnote-ref';
    citation: 'hidden' | 'footnote' | 'inline';
    math: FormulaStrategy;
    mermaid: MermaidStrategy;
    details: 'expanded' | 'keep-html' | 'summary-only';
    emoji: 'unicode' | 'image' | 'shortcode';
    toc: 'preserve-macro' | 'render-ol' | 'strip';
  };
  custom?: Record<string, unknown>;  // 平台专属字段
}
```

#### 3.2 预设层级

- **内置预设**（ship with app）：每平台 1~2 个默认预设，`src/services/exporters/<platform>/presets/*.json`
- **用户预设**（用户空间）：`IndexedDB.export_presets` 表；UI 通过"另存为预设"入口创建（决策 J-03 硬约束：账户级存储）
- **一次性调整**（ad-hoc）：导出对话框内临时改参数，不持久化，导出后丢弃（但导出历史记录参数快照）

#### 3.3 预设继承

用户预设可基于内置预设派生：`extends: "wechat.default"`，仅覆盖差异字段。UI 在预设编辑器中提供"重置为基准"按钮。

#### 3.4 预设 Schema 校验

- 所有预设（内置 + 用户）在加载时走 Zod 校验（对齐决策 J-05）
- 校验失败：UI 红框 + 错误字段名；不让用户保存无效预设
- 插件 Adapter 注册时必须过 schema 校验

---

### 4. 平台清单

| PlatformId | 中文名 | 产物 | 保真优先级 | 目录 |
|---|---|---|---|---|
| `wechat` | 微信公众号 | 富文本 HTML + 内联 CSS + 图片占位 | visual | `src/services/exporters/wechat/` |
| `redbook` | 小红书 | 长图序列（PNG）+ 文案 | visual | `src/services/exporters/redbook/` |
| `zhihu` | 知乎 | 清洗后 HTML（支持 LaTeX 粘贴） | semantic | `src/services/exporters/zhihu/` |
| `html` | 标准 HTML | 单文件 HTML，资产 inline | semantic | `src/services/exporters/html/` |
| `markdown` | 标准 Markdown | `.md` 文件（+ 可选资产目录） | portability | `src/services/exporters/markdown/` |

每子目录必含：`index.ts`（PublishAdapter 实现）、`preset.json`（默认预设）、`sanitize.ts`、`fallback.ts`、`render.ts`。缺失即 CI fail（遵循 10-markdown-authority-spec 附录 B）。

---

### 5. PDF 明确不做（P-05=A / J-02）

v2.1 **不提供 PDF 导出**。理由：

1. 用户决策 P-05=A
2. 决策 J-02 "PDF 决议：v2.1 明确不做（以 P-05 A 为准；T04-08 C 的文案笔误不触发 PDF 实现）"
3. PDF 渲染链路复杂（分页、字体嵌入、中文换行、公式排版）成本高
4. 用户可通过"标准 HTML 导出 + 浏览器打印"组合间接产出 PDF
5. v2.2+ 候选

**落点**：

- 导出对话框**不显示** PDF 选项（J-02 硬约束："不是 disabled，而是不存在"）
- 命令面板注册 `export.pdf` 命令时抛出 `FeatureDisabled` 错误，提示"v2.1 不支持 PDF 导出，请使用 HTML 导出 + 浏览器打印"
- DevPanel 不 list 该 exporter
- v2.1 **禁止**引入 Puppeteer / wkhtmltopdf 等 PDF 依赖（体积/复杂度代价）

---

## Part B. 微信公众号适配器

### 6. CSS 注入（juice 内联）

#### 6.1 核心策略

微信公众号后台粘贴的富文本：

- 仅接受 **inline style**（`<style>` 块全部剥离）
- `class` 选择器不生效
- 若干 CSS 属性被审核剥离（`position`, `transform`, `animation` 等）

#### 6.2 实现流程

```
渲染 HTML → 外链 + 内联 CSS（从主题生成）→ juice 合并 inline
→ sanitize 黑名单属性 → 按段落包裹保留语义 → 输出
```

```ts
// src/services/exporters/wechat/render.ts
import juice from 'juice';

export async function renderWechat(ast: NormalizedAst, preset: ExportPreset) {
  const htmlWithClasses = renderHtmlFromAst(ast, { classNames: true });
  const themeCss = resolveWechatTheme(preset.custom?.themeId ?? 'default');
  const inlined = juice.inlineContent(htmlWithClasses, themeCss, {
    inlinePseudoElements: false,
    preserveImportant: false,
  });
  return sanitizeWechat(inlined, preset.html);
}
```

#### 6.3 allowedProperties 白名单

仅允许：`color`、`background-color`、`font-family`、`font-size`、`font-weight`、`line-height`、`text-align`、`margin`、`padding`、`border`、`border-radius`、`text-decoration`、`letter-spacing`、`display`（仅 `inline` / `inline-block` / `block`）、`vertical-align`、`white-space`。

#### 6.4 disallowedProperties 黑名单

一律剥离：`position`、`top`、`left`、`right`、`bottom`、`transform`、`animation`、`transition`、`z-index`、`overflow-*`（部分）、`filter`、`backdrop-filter`、`content`、`will-change`、`mix-blend-mode`、`clip-path`。

#### 6.5 字节上限

- `maxInlineSize: 250_000`（微信单文大约 250KB 限制，预留余量 200KB）
- 超限时触发"拆分建议"：导出对话框提示"当前内容超过限制，是否启用长图导出（→ RedBook exporter）"

#### 6.6 字体 Fallback 链

```ts
fontFallbackChain: [
  '-apple-system', 'BlinkMacSystemFont',
  'PingFang SC', 'Hiragino Sans GB',
  'Microsoft YaHei', 'sans-serif',
]
```

#### 6.7 Stage Hook

WeChat exporter 的 `render.ts` 返回结果前须通过 `sanitize.ts` → `fallback.ts` → `postprocess.ts` 三步链路：

- `sanitize.ts`：UnifiedSanitizer + WeChat 专属 Platform Sanitizer（删除残留 `<style>`、剥离黑名单属性）
- `fallback.ts`：所有增强语法按 preset 降级
- `postprocess.ts`：合并最终 HTML，计算 byte-size，生成占位符清单

---

### 7. SVG 处理（公式 → SVG 规范化）

#### 7.1 KaTeX 公式策略

公众号不支持 LaTeX 源语法，但接受内联 SVG 与图片。

- **默认**：`formulaStrategy: 'svg'`
- 使用 `katex.renderToString(src, { output: 'mathml' | 'htmlAndMathml' })` 在渲染管线中换为内联 SVG（通过 `mathjax-full` 辅助或 `katex` + `mhchem` 的 SVG 输出扩展）
- SVG 必须规范化：
  - `viewBox` 完整
  - 去除外部字体引用，内联字形路径
  - 移除非必要属性（`data-*`）
  - 固定宽高比例，行内公式 height ≈ 1.1em，块级公式 max-width 100%

#### 7.2 SVG 压缩

- 走 `svgo` 在 exporter 内置 preset：移除 XML 声明 / 注释 / 未使用的命名空间
- 目标大小：单个行内公式 < 5KB，块级公式 < 30KB

#### 7.3 Fallback 链（对齐 J-04 三级降级）

```
svg → 失败则 png（puppeteer headless 渲染 png 后上传占位）
    → 失败则 latex-source（代码块形式保留 LaTeX，注释为"公众号不支持公式渲染，源代码如下"）
```

每一级降级必须写 `export_logs.downgrade` 事件。

#### 7.4 公式编号保留

对 16-markdown-extensions-spec §7 的公式编号机制：

- 块级公式的编号（`\tag{}` 或自动编号）转为 SVG 右侧的独立 `<span>` 元素
- 编号样式跟随主题（默认 `(1)` / `(1.1)` 格式）
- 交叉引用（Eq. 1）转为纯文本 + 章节路径提示（公众号无法锚点跳转）

---

### 8. Mermaid → PNG 回退

#### 8.1 为什么不用 SVG

Mermaid 生成的 SVG 含大量 `<foreignObject>` + 复杂 CSS，微信粘贴后会被裁剪。故默认走 PNG。

#### 8.2 生成流程

```
mermaid 源码 → mermaid.render(id, src) → SVG
→ DOMParser 解析 → 独立 canvas 渲染（canvg 或 offscreen canvas）
→ toBlob('image/png') → base64 data URI
→ <img src="data:image/png;base64,..." alt="Mermaid 图表">
```

#### 8.3 尺寸约束

- 最大宽度 900px（与 `maxWidthPx` 一致）
- 超高图表（> 3000px）拆成多段（提示用户"图表过长，建议拆分"）
- DPI：设备像素比 × 2（保证 retina 清晰度）

#### 8.4 Fallback 链

```
png → 失败则 svg（带降级警告） → 失败则 code-fallback（保留 ```mermaid 代码块 + 注释）
```

#### 8.5 未渲染图表占位符

exporter 输出 `<img>` 时给出特殊 `data-ink-mermaid-source="..."` 属性（用户可事后在公众号后台手动替换为自托管图床链接）。

#### 8.6 Stage 面板预览联动

编辑器内 Mermaid 预览使用 Stage 面板（决策 J-07）。WeChat exporter 的 PNG 渲染使用同一 Stage 渲染函数的"截图模式"，保证视觉一致。

---

### 9. 代码块样式重写

#### 9.1 挑战

- 公众号不支持 highlight.js 的 CSS class 方案
- 需要把 token 颜色直接 inline 到 `<span>`

#### 9.2 实现

```ts
// src/services/exporters/wechat/code-block.ts
import hljs from 'highlight.js';

export function renderCodeBlock(code: string, lang: string | null, themeName: string) {
  const theme = loadCodeTheme(themeName);            // 解析 CSS 文件提取 token → color 映射
  const tokens = hljs.highlight(code, { language: lang ?? 'plaintext' }).value;
  return inlineTokens(tokens, theme);                 // 把 class 替换为 inline style
}
```

#### 9.3 包装容器

```html
<section style="padding: 16px; background: #f6f8fa; border-radius: 6px; overflow-x: auto;">
  <pre style="margin: 0; font-family: 'Fira Code', Consolas, monospace; font-size: 14px; line-height: 1.6;">
    <code>...inline-styled tokens...</code>
  </pre>
</section>
```

#### 9.4 行号（可选）

- preset 字段 `custom.codeBlock.showLineNumbers: boolean`
- 行号通过左侧独立 `<span>` 序列渲染，不使用 `counter-increment`（公众号剥离）
- 行号颜色独立于 token 颜色（通常低对比度）

#### 9.5 复制按钮

WeChat 粘贴后不支持可交互元素；exporter 不输出复制按钮（与决策 J-04 "代码块契约：编辑器内完整能力，导出按平台自适应"一致）。

---

### 10. 图片上传占位（手动上传指引）

#### 10.1 WeChat 图片处理的特殊性

- 公众号编辑器粘贴外部 URL 图片时会触发"图片资源不安全"警告
- 自动上传需要公众号 API token，超出 InkForge v2.1 范围
- 故本版本采用**占位符 + 手动指引**策略

#### 10.2 占位符渲染

```html
<img
  src="data:image/svg+xml;base64,<默认占位 SVG base64>"
  alt="{图片说明}"
  data-ink-asset-id="{asset-id}"
  data-ink-original-src="{原图 URL 或 local path}"
  style="max-width: 100%; height: auto;"
/>
```

#### 10.3 导出后指引

导出完成后弹出"图片手动上传向导"：

- 列出所有图片（缩略图 + alt）
- 每张图片提供"下载原图"按钮（从 28-asset-pipeline 取 blob）
- 提供"复制原图路径"按钮
- 指引文案："请依次在公众号后台上传以下图片并替换占位图，上传后请将占位图替换为公众号素材库的图片链接"

#### 10.4 进度追踪（v2.2+ 候选）

v2.1 不做自动上传；v2.2 候选集成公众号素材 API（需用户配置 AppID/AppSecret）。届时通过决策 J-05 的 `adapter.publish` 实现。

#### 10.5 发布动作 systemAuth（决策 J-05 / I-06）

未来的 `wechat.publish(result, credentials)` 属于高危操作，必须走 systemAuth 二次确认（对齐决策 I-06）。

---

## Part C. 小红书适配器

### 11. 长图拼接

#### 11.1 策略

小红书发布以图片为主，文字卡位于图片内。故 exporter 产出 **长图序列**：

- 单张图片宽 1080px，高度自适应（单张最大 8000px，超过则拆分）
- 图片数量上限 9（小红书单次发布限制）
- 文案作为独立字段输出（用户手动粘贴到"正文"输入框）

#### 11.2 实现流程

```
Markdown → HTML（专属窄幅 CSS）→ 挂载到 offscreen DOM（1080 宽）
→ 按段落/标题分页（分页算法见 §11.3）→ html2canvas 逐页渲染
→ 输出 Blob[]
```

#### 11.3 分页算法

- 每页开头必须是标题或段落（不从中途切）
- 每页内容高度 ≤ 7500px（预留 padding）
- 代码块不拆分（超长代码块独占一页）
- 图片按原比例缩放到页内，不裁剪
- 列表的连续项尽量放同一页；不得已拆分时在断裂处添加"续"标记

#### 11.4 封面图

- 第一页自动添加封面卡（`frontmatter.title` + `frontmatter.cover` + 作者 + 日期）
- 封面样式由 preset 决定（`custom.cover.template: 'minimal' | 'bold' | 'magazine'`）
- 封面字段模板支持变量：`{title}` / `{subtitle}` / `{author}` / `{date}` / `{tagList}`

#### 11.5 文案产出

```ts
interface RedBookArtifact {
  images: Array<{ blob: Blob; width: number; height: number; filename: string }>;
  copy: {
    title: string;              // 用于发布标题输入框（限 20 字）
    body: string;               // 用于正文输入框（限 1000 字，含 emoji 与 tag）
    tags: string[];             // frontmatter.tags 转 `#tag` 格式
  };
}
```

---

### 12. 字体限制

#### 12.1 可选字体池

长图拼接使用的是**图像字体**（浏览器渲染 canvas），但为保证粉丝设备无依赖，限制在系统安全字体集：

- 中文：`PingFang SC`、`Hiragino Sans GB`、`Noto Sans CJK SC`、`Source Han Sans`
- 英文：`-apple-system`、`BlinkMacSystemFont`、`SF Pro`、`Helvetica`、`Inter`
- 衬线：`Noto Serif SC`、`Source Han Serif`、`Georgia`

preset 字段 `custom.fonts.family`：用户可选；超出池子则 UI 警告。

#### 12.2 字号尺度

长图内容的字号比编辑器默认更大（阅读环境是手机），`custom.fonts.scale: 'cozy' | 'comfortable' | 'spacious'`（对应 1.0 / 1.15 / 1.3 倍）。

#### 12.3 字体嵌入

- InkForge 仅引用系统字体，不在长图中嵌入字体文件
- 如用户选中非池字体，渲染时 fallback 到池内同类字体并在 StatusBar 警告

---

### 13. 排版约定

#### 13.1 卡片式段落

长图不采用连续书本式排版；每个段落独立成"卡片"：

- 标题 H1~H2 占一整行，含彩色小装饰条
- 正文段落 max-width 960px（含 60px 左右 padding）
- 引用块用"引号装饰"+ 浅灰背景
- 代码块用"深色主题 + 等宽字体"（与 WeChat 不同）
- 列表项左侧加小圆点/数字圆圈

#### 13.2 配色模板

preset 字段 `custom.theme: 'light' | 'dark' | 'pink' | 'sage' | 'custom'`；`custom` 允许用户自定义 10 个 CSS 变量：

```
--rb-bg, --rb-surface, --rb-text, --rb-text-muted,
--rb-accent, --rb-accent-subtle, --rb-border,
--rb-heading-decor, --rb-quote-bg, --rb-code-bg
```

#### 13.3 图像约定

- 文内图片保留原位置，缩放到 max-width 960px
- 如图片比例超高（> 1.5），拆到独立卡片
- alt 作为小灰色说明文字显示在图片下方（若存在）

#### 13.4 禁用元素

- 表格（小红书用户端难以阅读）→ 提示"已转为图片渲染"，整体嵌入
- 任务列表 → 转为普通列表 + 纯文本标记（当前实现为 `- [x]` → `√`，`- [ ]` → `□`，不得输出 emoji 前缀）
- Wikilink → 纯文本（目标平台无法跳转）

---

## Part D. 知乎适配器

### 14. HTML 清洗

#### 14.1 目标

知乎支持"Markdown 粘贴"与"富文本粘贴"两种入口。本 exporter 默认产出"富文本 HTML"，由用户粘贴到知乎编辑器，保留标题/列表/代码块/公式等结构。

#### 14.2 allowedTags 白名单

`p`, `h1`~`h6`, `strong`, `em`, `del`, `code`, `pre`, `blockquote`, `ul`, `ol`, `li`, `a`, `img`, `br`, `hr`, `table`, `thead`, `tbody`, `tr`, `td`, `th`, `sup`, `sub`, `mark`, `figure`, `figcaption`

#### 14.3 disallowedTags 黑名单

`iframe`, `script`, `style`, `object`, `embed`, `form`, `input`, `button`, `details`, `summary`（知乎不渲染）

#### 14.4 CSS class 策略

- `cssClassPolicy: 'strip'`
- 不保留任何 class；依靠知乎自身样式渲染
- 代码块通过 `<pre><code class="language-xxx">` 的标签结构暗示语言（知乎识别）——这是 strip 的唯一例外

#### 14.5 链接策略

- 保留所有 `<a href>` 但剥离 `target`, `rel` 等属性
- 相对链接（wikilink fallback）→ 注释 + 文本

---

### 15. 公式保留 LaTeX

#### 15.1 知乎的公式支持

知乎富文本编辑器支持 `<span class="ztext-math">\\(LaTeX\\)</span>` 与 `<span class="ztext-math">\\[LaTeX\\]</span>` 格式（需要测试实际行为，以 preset 版本管理为准）。

#### 15.2 实现

```ts
// formulaStrategy: 'latex-source'
function renderFormulaForZhihu(src: string, isBlock: boolean): string {
  const escaped = escapeHtml(src);
  const delim = isBlock ? ['\\[', '\\]'] : ['\\(', '\\)'];
  return `<span data-formula-type="${isBlock ? 'block' : 'inline'}">${delim[0]}${escaped}${delim[1]}</span>`;
}
```

#### 15.3 Fallback

若用户 preset 指定 `visual` 优先，可退回到"渲染为 PNG 图片"策略（与 WeChat 对齐）。

---

### 16. 代码块样式

#### 16.1 结构保留

知乎会识别 `<pre><code class="language-js">` 的语言标签并自行高亮。exporter 仅需：

- 保留 `language-*` class
- 不 inline 高亮 token（让知乎自己做）
- 保留缩进与换行

#### 16.2 长代码块

- 超过 200 行的代码块拆分为多个 `<pre>`，之间插入 `<p>---</p>` 分隔
- 或建议用户改用"GitHub Gist 链接" 走 wikilink fallback

---

## Part E. 标准 HTML 导出

### 17. 单文件 HTML + inline CSS + assets base64

#### 17.1 目标

产出**离线可读的单文件** `.html`，双击即可阅读：

- 所有 CSS 内联到 `<style>` 中
- 所有图片 base64 内嵌
- 无外部依赖（字体用 fallback 链 + 系统字体）
- KaTeX 公式通过 `katex` 的 `htmlAndMathml` 输出，并嵌入 KaTeX CSS 的最小子集

#### 17.2 结构

```html
<!DOCTYPE html>
<html lang="{frontmatter.locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="author" content="{authors[0].name}">
  <meta name="description" content="{summary}">
  <style>{baseCss + themeCss + katexCssMin + extensionCss}</style>
</head>
<body class="inkforge-export">
  <article class="ink-article">
    <header class="ink-article__header">
      <h1>{title}</h1>
      <p class="ink-article__meta">{date} · {wordCount} 字 · {readingTimeMin} 分钟</p>
      {summary ? `<p class="ink-article__summary">${summary}</p>` : ''}
    </header>
    {tocSection}
    <main class="ink-article__body">
      {renderedContent}
    </main>
    <footer class="ink-article__footer">
      {citations}
      {frontmatter.license ? `<p>${frontmatter.license}</p>` : ''}
    </footer>
  </article>
</body>
</html>
```

#### 17.3 CSS 层级

```
baseCss（排版 reset + 容器宽度） → themeCss（当前主题） → katexCssMin（公式） → extensionCss（mermaid / footnote / highlight）
```

- `maxInlineSize: 500_000`（500KB，允许较大）
- 超限时自动启用"外部资源引用"模式（图片拆成同目录 `xxx_files/`）

#### 17.4 打印样式

内置 `@media print` 规则：

- 隐藏 TOC 中的交互元素
- 分页：每个 H1 `page-break-before: always`
- 代码块禁止跨页：`page-break-inside: avoid`

供用户走"浏览器打印 → 保存为 PDF"路径（代替 PDF exporter）。

#### 17.5 双模式选项

preset 字段 `custom.outputMode: 'single-file' | 'offline-bundle'`：

- `single-file`：所有资源 base64，单一 `.html`
- `offline-bundle`：产出 `.zip`，内含 `index.html` + `assets/` 子目录

---

### 18. TOC 可选（P-04=D + 用户选择）

#### 18.1 UI 选择

导出对话框提供：
- `[ ] 生成目录`（默认根据 preset 默认值）
- 深度下拉：`H1~H2` / `H1~H3` / `H1~H4` / `H1~H5` / `H1~H6`
- `[ ] 编号（1., 1.1., 1.1.1., ...）`
- `[ ] 可点击（锚点跳转）`

#### 18.2 TOC 生成源

- 如果文档正文已有 `[toc]` 宏（16-markdown-extensions-spec §4），导出使用该位置
- 否则按 preset 决定插入位置：`top`（标题下方）/ `floating`（右浮边栏，仅 HTML 支持）/ `standalone`（独立一页）
- 对应决策 J-09："正文内 `[toc]` 与左栏 TOC 使用同一数据源（避免两套解析器）"

#### 18.3 `floating` TOC

```html
<aside class="ink-toc ink-toc--floating">
  <nav>...</nav>
</aside>
```

- CSS：`position: fixed; right: 20px; top: 80px; width: 240px; max-height: 70vh; overflow-y: auto;`
- 打印模式隐藏
- 当前段落高亮（IntersectionObserver，内联脚本）
- 仅 HTML 支持；其他平台退回 `top`

---

### 19. 目录深度配置

#### 19.1 深度定义

`maxDepth: 2 | 3 | 4 | 5 | 6`，表示 TOC 包含到 H{N} 为止。

#### 19.2 算法

```ts
function buildToc(ast: NormalizedAst, maxDepth: number, numbered: boolean): TocNode[] {
  const headings = collectHeadings(ast).filter(h => h.level <= maxDepth);
  const tree = buildHierarchyFromHeadings(headings);
  if (numbered) annotateNumbering(tree); // 1 / 1.1 / 1.1.1 ...
  return tree;
}
```

#### 19.3 锚点生成

- 与 10-markdown-authority-spec §7 的标题渲染共用 slug 算法
- slug = `kebab-case(title, { preserveCJK: true, maxLen: 60 })`
- 冲突时追加 `-2`、`-3`

#### 19.4 各平台支持度

| 平台 | TOC 支持 | 备注 |
|---|---|---|
| html | 完整（floating / top / standalone） | 最灵活 |
| markdown | 保留 `[toc]` 宏 或 渲染为 OL（视 flavor 而定） | J-09 |
| wechat | 渲染为锚点列表（顶部）+ 手动锚点 | 微信锚点有限制 |
| zhihu | 渲染为 OL 列表（顶部） | 知乎自动识别 |
| redbook | 首页封面包含目录卡片 | 图片化 |

---

## Part F. 标准 Markdown 导出

### 20. frontmatter 保留

#### 20.1 原则

Markdown exporter 输出 `.md` 文件，**完整保留 frontmatter**（来自 10-markdown-authority-spec §4.1）。这是离线归档 / 跨应用迁移的基准。

#### 20.2 preset 选项

- `flavor: 'standard' | 'inkforge-ext'`
  - `standard`：按 10-markdown-authority-spec §8 执行降级（高亮 → `<mark>`、wikilink → 普通链接、citation → HTML 注释、TOC → 渲染为 OL + 锚点）
  - `inkforge-ext`：保留原始增强语法（用于 InkForge 自身间迁移）
- `includeFrontmatter: boolean`（默认 true；false 时剥离整个 frontmatter）
- `frontmatterSubset?: string[]`（导出子集，例如仅 `['title', 'tags', 'createdAt']`）

#### 20.3 字段顺序

按 10-markdown-authority-spec §4.1 的顺序输出，保证 diff 稳定。

#### 20.4 版本与哈希字段

- `id` / `createdAt` / `updatedAt` 保留
- **不导出** `sourceHash`、`cacheVersion`、`ext.*`（除非用户显式 include）

---

### 21. 图片路径重写

#### 21.1 四种策略

| 策略 | 场景 | 输出 |
|---|---|---|
| `external-url` | 图片原本是远端 URL | 保持不变 |
| `local-relative` | 本地资产 + 产出 `.md + _files/` 离线包 | `![alt](basename_files/asset-id.ext)` |
| `inline-base64` | 单文件传输（零散引用时） | `![alt](data:image/png;base64,...)` |
| `placeholder-manual` | 资产缺失 | `![alt](<!-- 缺失资产 -->)` + 注释 |

#### 21.2 离线包结构

```
my-article.md
my-article_files/
  ├── cover.jpg
  ├── image-1.png
  ├── image-2.svg
  └── diagram-1.mermaid.svg
```

#### 21.3 asset-id → filename 映射

- 默认：保留 asset 原始文件名；冲突时加 hash 后缀
- 选项：`custom.filenameStrategy: 'original' | 'uuid' | 'numbered'`

#### 21.4 公式与 Mermaid 的 Markdown 导出策略

- 公式：`standard` flavor 保留 `$...$` 源码；`inkforge-ext` 同上（因为公式本身是 InkForge ext 但 `standard` 模式不做降级破坏语义）
- Mermaid：保留 ```` ```mermaid ```` 代码块（无损）
- `code-fallback` 模式用于只需要源码的场景

---

### 22. 扩展语法可移植标注

#### 22.1 `standard` 模式降级矩阵

参照 10-markdown-authority-spec §6.2 + 16-markdown-extensions-spec 每条扩展的 `toStandardMd` 字段：

| 扩展 | standard 降级输出 |
|---|---|
| `==text==` | `<mark>text</mark>` |
| `[^1]` | 保留（markdown-it-footnote 兼容 GFM 部分） |
| `[toc]` | 渲染为 `<ol>` + 锚点（不可点击版本为纯 ol） |
| `<details>` | 保留原生 HTML（GFM 兼容） |
| `:smile:` | Unicode `U+1F604`（emojibase 映射） |
| `$x$` / `$$x$$` | 保留 LaTeX 源（解析器不识别，但文本保真） |
| ```` ```mermaid ```` | 保留原 fenced block（目标解析器自行决定是否渲染） |
| `[[文章名]]` | `[文章名](./文章名.md)` 或 `[文章名](url)` |
| `{cite: id}` | `<!-- cite: id --> [来源: ...](url)` |
| `[@key]` | 保留 Pandoc-style citation syntax；无 bibliography 时不得伪造 author/year |

P1 Citation Baseline 的平台导出真相：

- HTML/Preview/WeChat/Zhihu 富文本路径应从 Markdown renderer 派生语义化 citation/footnote HTML，再交给对应 sanitizer；sanitizer 只能保留必要 safe attributes。
- Xiaohongshu native text path 会先调用 citation degradation helper，把 footnote definitions 与 citation clusters 展开成可读纯文本，不能泄露 raw `[^id]:` 或 `[@key]` 控制语法。
- Zhihu Markdown/native path可以保留有效 Markdown footnote/citation syntax；平台不支持的 HTML 仍按本 spec 的 sanitizer/fallback 矩阵处理。
- 若 renderer 未收到真实 BibTeX entries，export 必须沿用 unresolved citation 文案，而不是注入 fake bibliography。

#### 22.2 导出预览

- 标注所有"将要降级"的位置
- 每条降级生成 `export_logs.downgrade` 事件（含 `fromSyntax`、`toSyntax`、`location`、`reason`）

#### 22.3 不可降级语法

- 占位扩展（Callout / Embed）如果未来启用，在 `standard` 模式下必须 `preserve-as-text`
- 用户自定义扩展（25-extension-plugin）必须在注册时声明 `toStandardMd`，未声明则拒绝注册

---

## Part G. 导出体验

### 23. 导出前预览 + 参数调整（P-01 推断 D / 决策 J-03）

#### 23.1 P-01 的处理

P-01 在原问卷中未填写。依据：
- InkForge "冗余开发"哲学
- P-06=D（用户配置文件）
- 决策 J-03 "按零空壳交付 + 用户控制权最大化 + P-06 D 自定义适配器推断为 D"
- 导出需要精确可控

**推断值：D（预览 + 调参 + 保存预设）**。在导出对话框中提供完整预览 + 参数面板。

#### 23.2 UI 布局

```
┌────────────────────────────────────────────────────────────────┐
│ 导出                                                          X │
├───────────┬────────────────────────────────────┬────────────────┤
│ 平台      │ 预览                                │ 参数            │
│ ─────────│ ─────────────────────────────────── │ ──────────     │
│ ○ 微信    │                                     │ 预设：默认 ▼   │
│ ● 小红书  │                                     │ ─────          │
│ ○ 知乎    │  [渲染的平台预览]                    │ 保真优先级     │
│ ○ HTML    │                                     │ visual ▼       │
│ ○ Markdown│                                     │                │
│           │                                     │ TOC            │
│ 预设管理  │                                     │ [ ] 生成        │
│ [+ 新预设]│                                     │ 深度 H1-H3 ▼   │
│           │                                     │                │
│           │                                     │ 图片策略       │
│           │                                     │ base64 内联 ▼  │
│           │                                     │                │
│           │                                     │ 降级矩阵       │
│           │                                     │ 3 条将降级      │
│           │  [预览缩放] [刷新]                    │ [查看详情]      │
└───────────┴────────────────────────────────────┴────────────────┘
                                   [取消]  [另存为预设]  [导出]
```

#### 23.3 预览（对齐决策 J-07）

- 平台预览使用各 exporter 的 `render.ts` 产出（J-03 硬约束："预览面板使用 Platform Renderer 产物，不用单独的预览管线"）
- 渲染节流 300ms（避免频繁 re-render）
- 失败时显示错误带 + 堆栈（折叠）
- 对于 RedBook 长图：显示单页缩略图栅格
- 多设备预览（T09-08 C / J-07）：Stage 面板提供 iPhone / Android / iPad 三种设备框

#### 23.4 参数实时联动

- 任何参数变动 → 触发 `rerenderPreview(debounce 300ms)`
- 降级统计实时更新
- J-03 硬约束："导出参数变更实时反映到预览（不用点刷新按钮）"

#### 23.5 键盘支持

- `Enter`：导出
- `Esc`：取消
- `Ctrl/Cmd+P`：切换预览缩放
- `Ctrl/Cmd+S`：另存为预设

#### 23.6 Web Worker 承载

预览的重计算（markdown-it 解析 / juice / html2canvas）必须在 Web Worker 中执行（决策 J-07 硬约束 / L-02）。

---

### 24. 导出预设保存

#### 24.1 "另存为预设"流程

1. 当前对话框中的参数快照
2. 弹出输入框：预设名 + 描述
3. 选择 `extends` 基准（可选）
4. 写入 `IndexedDB.export_presets` 表
5. 关联 `profileId`（账户隔离，决策 K-03）

#### 24.2 预设管理 UI

Settings > Export Presets：

- 列表：名称 / 基准 / 平台 / 更新时间
- 操作：编辑 / 复制 / 导出 JSON / 删除
- 导入：从 JSON 文件加载（Zod 校验）

#### 24.3 预设 Schema 校验

- 所有预设（内置 + 用户）在加载时走 Zod
- 校验失败：UI 红框 + 错误字段名；不让用户保存无效预设

#### 24.4 预设版本

- 每次保存 `version` 自增（语义化：feature 变更 +minor，bugfix +patch）
- 导出历史记录中引用 `presetId@version`

#### 24.5 预设跨账户共享（L1-23 D 补充）

用户可在 Settings 中将预设 "发布" 为共享预设（全账户可见），或导出为 JSON 文件供他人导入。共享预设不含凭据字段。

---

### 25. 导出历史记录（P-02=C / 决策 J-03）

#### 25.1 存储模型

```ts
// IndexedDB.export_history 表（对齐决策 J-03 落点）
interface ExportHistoryRow {
  id: string;                        // UUID
  documentId: string;
  documentVersionId: string;         // 引用 31-version-bundle
  platform: PlatformId;
  presetId: string;
  presetVersion: string;
  paramsSnapshot: ExportPreset;      // 完整参数快照（即使预设删除也可重导）
  artifactMeta: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    imageCount: number;
    wordCount: number;
  };
  downgrades: DowngradeEvent[];
  status: 'success' | 'partial' | 'failed';
  errorMessage?: string;
  renderedAt: string;
  renderedBy: string;                // profileId
  profileId: string;
}
```

#### 25.2 UI 入口

- Hub 卡片：`card-export-history`（最近 5 条）
- Workstation 左栏（可选 Tab）：完整历史
- Document Property Panel > 导出历史
- Command Palette：`export.history`

#### 25.3 列表视图

按时间倒序；字段：时间 / 平台 / 预设 / 版本 / 大小 / 状态；每条支持：

- 查看详情（参数快照 + 降级清单）
- 一键重导出（见 §26）
- 复制产物 path（若本地导出）
- 删除

#### 25.4 不做 diff（P-02=C 明确）

不做"上次导出后变更的 diff"。J-03 硬约束："导出历史与 AI Diff 预览共用 UI"属禁止（语义不同）。

#### 25.5 与版本历史独立（J-03 硬约束）

- 导出历史与版本历史独立，但条目互相引用（版本 ID + 导出 ID）
- 删除版本时不级联删除导出历史（导出历史是独立审计记录）

#### 25.6 保留策略

- 默认保留 100 条；超出自动按时间裁剪
- Settings > Export > History 可调整上限（最大 1000）
- Artifact 文件路径仅保留元信息；磁盘文件不由 InkForge 管理

---

### 26. 一键重导出

#### 26.1 流程

从导出历史某条记录触发：

```
1. 加载 paramsSnapshot（不依赖当前预设是否还存在）
2. 加载文档当前版本（或用户选"当前版本"/"原导出版本"）
3. 进入导出对话框，参数预填
4. 允许用户修改（此时会生成新的历史记录）
5. 或直接"跳过对话框导出"（快捷通道）
```

#### 26.2 快捷通道

- 命令面板：`export.repeat.latest`（重复最近一次导出，跳过对话框）
- 快捷键：`Ctrl/Cmd+Shift+E`（可在 Settings 自定义）
- 右键菜单：Hub 卡片上右键 → "重复导出到 {platform}"

#### 26.3 版本选择

默认重导当前版本；提供选项"重导原版本"（用于归档再现）。

#### 26.4 失败处理

原预设删除时：

- 如有 `paramsSnapshot`：用快照继续（提示"基于历史快照，原预设已不存在"）
- 如快照缺失（理论不可能）：提示用户"无法重导出"，提供"新建导出"入口

---

### 27. 剪贴板"复制为…"菜单（P-03=D / 决策 J-06）

#### 27.1 默认复制行为（T01-20 D）

编辑器内选中文本 `Ctrl/Cmd+C`：

- **普通文本选区** → 纯文本
- **跨块级选区**（表格 / 代码块 / 公式 / Mermaid） → 多 MIME 写入
  - `text/plain`：纯文本（兼容性底线）
  - `text/html`：富文本 HTML（经 `clipboard` preset 清洗）
  - `text/markdown`：Markdown 片段

所有三格式均由同一 Markdown 源派生；接收应用自动选择其支持格式。

#### 27.2 "复制为…"菜单

右键菜单 / 命令面板（命令 ID 对齐决策 J-06）：

| 命令 | 产出 |
|---|---|
| `publish.copyAs.plainText` | 仅 `text/plain` |
| `publish.copyAs.html` | 仅 `text/html`（完整 inline CSS，可粘贴到邮件 / 富文本输入框） |
| `publish.copyAs.markdown` | 仅 `text/markdown`（默认 inkforge-ext，可配置 standard） |
| `publish.copyAs.wechatSafeHTML` | 复制"适合微信粘贴"的 HTML（等价于 WeChat exporter 片段版） |
| `publish.copyAs.richCode` | 带高亮的富文本代码（T04-06 C） |

#### 27.3 片段 exporter

片段版 exporter 是完整 exporter 的轻量模式：

```ts
// src/services/exporters/<platform>/snippet.ts
export async function renderSnippet(
  markdown: string,
  context: Pick<ExportContext, 'frontmatter' | 'assets' | 'preset'>,
): Promise<string> { ... }
```

- 不生成独立文件
- 资产一律 `inline-base64`（剪贴板不支持外部相对路径）
- 不走 export_history 写入（只写 activity_log）

#### 27.4 ClipboardPipeline 集成（J-06 落点）

- 统一入口 `src/services/clipboard/pipeline.ts`
- Tauri 独占的 `system.clipboard.*` 命令在 Web 调试态下 disabled
- 剪贴板数据必须通过 UnifiedSanitizer（J-06 + J-08 "禁止剪贴板数据带危险 HTML"）

#### 27.5 粘贴时提示

被粘贴的应用如不支持 HTML（仅 plaintext），InkForge 无法感知；但我们会在 StatusBar 显示"已复制 3 种格式"告知用户。

#### 27.6 Settings 配置

Settings > Editor > Clipboard：

- `defaultCopyFormats: Set<'plain' | 'html' | 'markdown'>`
- `markdownFlavor: 'standard' | 'inkforge-ext'`
- `htmlStylePreset: 'minimal' | 'wechat-like' | 'zhihu-like'`

---

### 28. 渠道用户自定义配置（P-06=D / 决策 J-05）

#### 28.1 PublishAdapter 作为开放协议

v2.1 的 5 个内置平台 exporter 就是该协议的实现。用户可：

1. **自定义预设**：在已有平台内自定义参数（§24）
2. **自定义渠道**：编写**配置式**（JSON）Adapter，放在 Profile 目录
3. **自定义 CSS 主题**（EX-07 联动）：覆盖 `custom.themeId` 指向的主题文件
4. **插件 Adapter**（v2.2+）：通过插件 SDK 注册（决策 M-01 / M-02）

#### 28.2 v2.1 用户自定义的范围

v2.1 **仅支持**：

- 自定义预设（内置平台参数覆盖）
- 自定义 CSS 主题（HTML / WeChat 预设下生效）
- 自定义片段模板（标题卡片 / 封面）
- 配置式自定义渠道 Adapter（不支持代码注入；决策 J-05 硬约束）

v2.1 **不支持**：

- 插件 Adapter（延后 v2.2）
- 直接 API 发布到第三方平台（延后 v2.2 的 `adapter.publish` 实现）
- 自定义渠道的任意 JS 代码字段（永远禁止，避免 XSS）

#### 28.3 自定义配置目录

用户配置走 IndexedDB 表（profile-scoped）+ Profile 目录：

```
IndexedDB.export_presets          // 用户预设
IndexedDB.export_themes           // 自定义主题（CSS 变量组）
IndexedDB.export_templates        // 自定义模板（封面/标题卡片的 HTML/CSS）
~/.inkforge/<profile>/publish-adapters/*.json  // 配置式自定义 Adapter（J-05 落点）
```

Tauri 环境下 Profile 目录使用平台约定路径；Web 环境下不支持 Profile 目录自定义 Adapter。

#### 28.4 UI 入口

Settings > Export：

- Presets（§24）
- Themes：CSS 变量编辑器 + 实时预览
- Templates：封面 / 标题卡片的模板编辑器
- Publish Adapters（J-05 落点 `PublishAdaptersTab.vue`）：列出内置 + 用户 Adapter，可启用/禁用、查看 schema

#### 28.5 导出/导入

- 每类配置支持"导出为 JSON"（文件下载）
- 支持"导入 JSON"（Zod 校验 + 冲突处理：覆盖 / 跳过 / 重命名）
- 分享场景：用户可把 JSON 发给其他用户
- **不得**在导出/导入中包含凭据字段（J-05 "Adapter 读取其他 Profile 的数据" 禁止）

#### 28.6 发布动作（v2.2+）

未来 `adapter.publish` 属高危操作，必须走 systemAuth 二次确认（决策 J-05 + I-06）。审计日志记录发布行为（K-02 D 级审计覆盖）。

---

## Part H. 验收

### 29. 验收矩阵（5 平台 × 19 元素 × 3 样本）

#### 29.1 矩阵维度

- **5 平台**：WeChat、RedBook、Zhihu、HTML、Markdown
- **19 元素**（与 10-markdown-authority-spec §16.1 / 01-editor-ui §19 一致）：
  1. 段落
  2. 标题 H1~H6（视为一组，6 变体）
  3. 粗体
  4. 斜体
  5. 行内代码
  6. 代码块（含 10 语言样本）
  7. 引用
  8. 无序列表（含嵌套）
  9. 有序列表（含嵌套）
  10. 链接
  11. 图片（含 caption、缩放、alt）
  12. 水平线
  13. 表格（含对齐、长表格横向滚动）
  14. 任务列表
  15. 删除线
  16. 公式（inline + block）
  17. Mermaid 图表
  18. 脚注
  19. 高亮（多色）
- **3 样本**：
  - 正向（常规）
  - 边界（极长 / 深度嵌套 / 特殊字符）
  - 混合（多元素组合）

总测试用例：5 × 19 × 3 = **285** 条基础路径；加上增强语法（脚注 / 高亮 / TOC / Details / Emoji / Math / Mermaid / Wikilink / Citation = 9 组 × 5 平台 × 3 样本 = 135 条）= **420** 条路径。

#### 29.2 每条用例的验收点

1. **渲染成功率**：exporter 不抛异常
2. **视觉正确性**：与预期 HTML/PNG/MD 对比（Playwright snapshot or diff）
3. **降级记录完整**：每次降级必写 `export_logs.downgrade`（R-17 审计）
4. **资产路径正确**：图片 / 公式 / Mermaid 资源按策略正确嵌入
5. **frontmatter 处理正确**：必填字段存在，subset 选项生效
6. **大小不超限**：WeChat ≤ 250KB、RedBook 单图 ≤ 8000px 高、HTML ≤ 500KB 默认
7. **可重复性**：同输入 + 同 preset 输出一致（hash 稳定）
8. **三端一致性**：编辑器预览 / 平台预览 / 最终产物 视觉一致（J-04 硬约束，不得"编辑器能渲染但导出坏"）

#### 29.3 性能 SLO（对齐 L-01）

| 操作 | SLO |
|---|---|
| 导出 1 万字文档（WeChat） | ≤ 2s |
| 导出 1 万字文档（RedBook 长图 5 张） | ≤ 6s |
| 导出 1 万字文档（Zhihu / HTML / Markdown） | ≤ 1.5s |
| 导出预览刷新节流 | 300ms |
| 剪贴板"复制为…" | ≤ 500ms |
| 导出 5 万字文档（HTML 单文件） | ≤ 4s |
| 导出 5 万字文档（WeChat，含 10 张图） | ≤ 10s |

#### 29.4 测试实现

- 目录：`tests/exporters/<platform>/<element>.spec.ts`
- Fixture：`tests/exporters/fixtures/` 下 19 元素 × 3 样本 的 Markdown 源
- Snapshot：`tests/exporters/snapshots/<platform>/<element>__<sample>.snap`
- CI 强制：失败即 block merge
- Visual Regression：RedBook 长图走 Playwright `toMatchSnapshot` + 容差 0.5%

#### 29.5 E2E 场景

除单元矩阵外，E2E 覆盖：

| 场景 | 预期 |
|---|---|
| 打开导出对话框，切换平台 | 参数联动、预览刷新 |
| 修改参数 → 保存为预设 | 预设写入 DB，下次可选 |
| 导出完成 → 历史记录出现 | `export_history` 新记录 |
| 从历史记录重导出 | 参数预填，可再次导出 |
| 微信图片占位向导 | 列出所有图片，下载链接可用 |
| 剪贴板"复制为…" 菜单 | 三格式写入正确 |
| 自定义主题（HTML） | CSS 变量生效，预览同步变化 |
| 导出中取消 | AbortSignal 触发，资源释放 |
| 三端一致性抽检 | 编辑器预览 vs 导出产物视觉 diff ≤ 2% |
| UnifiedSanitizer 清洗清单 | Settings > Security Audit 可查看 |
| 导出失败 | 错误带 + 堆栈（折叠）+ 提示"重试" |

#### 29.6 反向污染 CI 守护

- ESLint 规则 `no-db-write-outside-authority` 不报警
- 所有 exporter 目录下文件不 import `@/db/**`（除 `@/db/types` 只读类型）
- exporter 之间不互相 import（静态扫描）
- PR 模板强制勾选"未修改权威字段"checkbox

---

### 30. 权威来源登记表

| 本 Spec 章节 | 引用问卷题号 / 决策编号 | 说明 |
|---|---|---|
| §1 设计原则 | R-01 / R-02 / R-13 / R-14；10-markdown-authority-spec §12 §13；决策 J-01 | Markdown 权威共享 + 独立链路 + 不反向污染 |
| §2 PublishAdapter 接口 | 决策 J-05 | 接口字段表 + 用户自定义仅配置式 |
| §3 Export Preset Schema | P-06=D、决策 J-03 / J-05 | 分层 preset + Zod 校验 + 账户级存储 |
| §4 平台清单 | P-06=D + "后续集成更多渠道"、决策 J-02 表 | 5 个内置平台 |
| §5 PDF 不做 | P-05=A、决策 J-02 | 明确声明 v2.1 不做；禁止引入 Puppeteer |
| §6 WeChat CSS 注入 | 决策 J-04、juice 内联经验 | inline-all + 黑白名单 |
| §7 WeChat SVG 公式 | R-14 公式降级、L1-30 D、决策 J-04 三级降级 | SVG 规范化 + fallback |
| §8 WeChat Mermaid → PNG | R-14 Mermaid 降级、决策 J-07 Stage 面板 | PNG 为默认 |
| §9 WeChat 代码块 | 决策 J-04 代码契约 | inline token 重写 |
| §10 WeChat 图片占位 | 决策 J-04 资产策略 | 占位 + 手动指引；publish 走 systemAuth |
| §11 RedBook 长图 | 决策 J-04 小红书策略、P-06=D | 1080 宽 + 分页算法 |
| §12 RedBook 字体 | 决策 J-04 / L1-57 D 字体开源 | 系统安全字体池 |
| §13 RedBook 排版 | 决策 J-04 卡片式排版 | 卡片 / 配色模板 |
| §14 Zhihu HTML 清洗 | 决策 J-08 Platform Sanitizer | 白名单 + strip class |
| §15 Zhihu 公式 LaTeX | R-14 公式降级、决策 J-04 | LaTeX 源保留 |
| §16 Zhihu 代码块 | 决策 J-04 | 保留 language-* |
| §17 HTML 单文件 | 决策 J-04 资产策略、T04-14 C | inline-base64 / 单文件 vs bundle |
| §18 TOC 可选 | P-04=D + 用户选择、M-04=D、决策 J-09 | 用户勾选 + 深度 + 与左栏 TOC 同数据源 |
| §19 TOC 深度 | P-04=D、决策 J-09 | maxDepth 2~6 |
| §20 Markdown frontmatter | 10-markdown-authority-spec §4、决策 J-02 Markdown 往返保真 | 完整保留 |
| §21 图片路径重写 | 28-asset-pipeline、决策 J-04 | 四策略 |
| §22 扩展语法降级 | 10-markdown-authority-spec §6 §8、16-markdown-extensions-spec | standard vs inkforge-ext |
| §23 导出预览 | P-01 推断 D、决策 J-03、J-07 多设备预览 | 预览 + 参数 + 预设 + Worker |
| §24 预设保存 | P-06=D、决策 J-03 / K-03 | 用户预设持久化 + 账户级 + 跨账户共享 |
| §25 导出历史 | P-02=C、决策 J-03 | 记录 / 不 diff / 独立于版本 |
| §26 一键重导出 | P-02=C、决策 J-03 | 历史 → 重导 |
| §27 剪贴板"复制为…" | P-03=D、决策 J-06 / J-08 | 三格式 + 平台片段 + sanitize |
| §28 自定义渠道 | P-06=D + 补充、决策 J-05 | v2.1 配置式 + 主题 + 模板；v2.2 插件 |
| §29 验收矩阵 | 10-markdown-authority-spec §11.2、T01-15 A、决策 J-04 三端一致 | 5 × 19 × 3 + 增强语法 |

---

## 附录 A：Exporter 目录与约束（与 10 附录 B 对齐）

```
src/services/exporters/
  ├── shared/                       // 共享工具
  │   ├── sanitize.ts               // UnifiedSanitizer
  │   ├── asset-resolver.ts
  │   ├── frontmatter-mapper.ts
  │   ├── downgrade-logger.ts
  │   └── html-utils.ts
  ├── wechat/
  │   ├── index.ts                  // PublishAdapter 实现
  │   ├── preset.json               // 默认预设
  │   ├── presets/                  // 额外内置预设
  │   │   ├── wechat.default.json
  │   │   └── wechat.magazine.json
  │   ├── sanitize.ts
  │   ├── fallback.ts
  │   ├── render.ts
  │   ├── snippet.ts                // 剪贴板片段版
  │   ├── code-block.ts
  │   └── themes/
  │       ├── default.css
  │       └── magazine.css
  ├── redbook/
  │   ├── index.ts
  │   ├── preset.json
  │   ├── render.ts
  │   ├── paginator.ts              // 长图分页算法
  │   ├── cover-template.ts
  │   └── themes/
  ├── zhihu/
  │   ├── index.ts
  │   ├── preset.json
  │   ├── sanitize.ts
  │   └── render.ts
  ├── html/
  │   ├── index.ts
  │   ├── preset.json
  │   ├── render.ts
  │   ├── toc.ts
  │   ├── themes/
  │   └── print.css
  └── markdown/
      ├── index.ts
      ├── preset.json
      ├── serialize.ts
      └── offline-package.ts
```

ESLint 约束：

- `src/services/exporters/<platform>/**` 不得 import `@/db/**`（除 `@/db/types` 只读类型）
- `src/services/exporters/<platform>/**` 不得 import `@/services/exporters/<other>/**`
- 自研 lint 规则 `no-db-write-outside-authority` 扫描所有 exporter

---

## 附录 B：DowngradeEvent Schema

```ts
// src/services/exporters/shared/downgrade-logger.ts
export interface DowngradeEvent {
  id: string;                        // UUID
  timestamp: string;                 // ISO
  platform: PlatformId;
  syntaxId: string;                  // 注册表 ID，如 `inkforge.highlight`
  fromSyntax: string;                // 原源文本片段
  toSyntax: string;                  // 降级后片段
  strategy: 'preserve-as-text' | 'inline-replacement' | 'wrap-comment' | 'strip';
  reason: string;                    // 人类可读说明
  location?: {
    line: number;
    column: number;
  };
  severity: 'info' | 'warn';
}
```

- 所有事件在 exporter 内部通过 `downgradeLogger.record(event)` 上报
- exporter 结束前统一写入 `IndexedDB.export_logs`
- UI 在"导出预览面板"与"导出历史详情"中消费

---

## 附录 C：反模式与正确做法

| 反模式 | 正确做法 |
|---|---|
| exporter 内部直接读 IndexedDB.articles 表 | 只接收 `context.frontmatter` + `context.assets`；不做直接 DB 查询 |
| exporter 在成功后写回 `frontmatter.targets[]` | 由上层（导出对话框/命令）在 exporter 返回后写 `export_history`，不让 exporter 碰 frontmatter |
| exporter 之间共用代码（wechat 引 zhihu 工具） | 抽到 `src/services/exporters/shared/` |
| 自定义平台 exporter 强改 `markdownSource` 修复"糟糕输入" | exporter 遇到不合法输入应在 `DowngradeEvent` 中记录；修复属于 44-import-wizard 职责 |
| 剪贴板"复制为…" 重新跑一遍完整 exporter | 走 `snippet.ts` 的轻量路径 |
| 预设 JSON 直接 `JSON.parse` 不校验 | 必须走 Zod schema 校验 |
| 导出时 UI 线程直接跑 markdown-it | Markdown 解析 / juice / html2canvas 等 CPU 密集工作必须在 Worker 中执行 |
| 用户自定义 Adapter 里写 JS 函数 | 禁止；只允许配置式 JSON |
| 关闭 UnifiedSanitizer 以"提升性能" | 禁止；底线不可突破 |
| 导出 PDF 时回退到"HTML + 浏览器打印"按钮 | 按钮存在即 UI 承诺，与"不显示 PDF 选项"冲突；可在"帮助"中说明如何用浏览器打印 |

---

## 文档状态

- 草案版本：v1（Phase 3 Batch B3 产出）
- 下一次更新触发条件：
  - 新增平台 exporter → §4 / 附录 A 同步更新
  - 新增增强语法 → §22 降级矩阵同步更新
  - preset schema 字段变动 → §3 / Zod 定义同步更新
  - publish 动作（v2.2）实装 → §28 / J-05 落地
- 冻结里程碑：Phase 3 开发启动前必须冻结

---

## 2026-04-30 Baseline 实装记录

本轮已完成 `ExportModal.vue` 的 compatible export/publish baseline，不声明 Spec 15 全量完成：

- 已保留当前真实三平台导出引擎：微信公众号样式版 HTML、小红书样式预览与原生纯文本、知乎样式预览与原生 Markdown 均继续复用 `src/services/export` 中现有转换器。
- 已新增导出预检区，预检项来自当前真实运行态：权威 Markdown 输入、平台渲染产物、质量检测、剪贴板能力与直连发布配置状态。
- 已新增平台原生产物区，复用 `convertToNativeFormat()` 生成：微信为 HTML，小红书为纯文本，知乎为 Markdown，并支持真实复制与 Blob 下载。
- 已把直接发布明确标记为“未配置真实 API 授权”，当前 UI 只承诺复制与下载，不伪造微信、小红书或知乎发布成功。
- 已增强剪贴板工具：新增能力探测、纯文本复制降级和短超时，避免浏览器剪贴板权限未返回时出现无反馈等待。
- 已把下载失败、复制失败与复制进行中状态反馈到 UI，不再静默吞掉导出关键操作错误。

本轮真实验证包括：`pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build` 均通过；本地 Vite `/workstation` 浏览器运行时无 console error；通过当前 Pinia `articleStore` 写入并清理 1 篇真实 IndexedDB 文稿，确认导出模态框可打开，三平台预检区与原生产物区可随平台切换真实更新。

仍未在本 baseline 覆盖的完整 Spec 15 项：标准 HTML/标准 Markdown 独立平台入口、导出历史 `export_logs`、一键重导出、预设持久化、Worker offloading、资产快照与 base64 内联、五平台 × 19 元素 × 3 样本验收矩阵、Settings > Export 预设管理、自定义渠道配置、真实平台 API 发布与审计日志写入。这些仍保持 Pending。
