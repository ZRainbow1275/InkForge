# 04 — 渲染引擎核心技术规范（Rendering Core Spec）

> **文档编号**: 04-spec-rendering-core
> **层级**: 技术规范层（Tech Spec）
> **版本**: v2.1 Draft（2026-04-20）
> **配套 PRD**: `04-prd-rendering.md`
> **权威上游**: `10-markdown-authority-spec.md`
> **产物对接**: `15-export-publish-spec.md`、`16-markdown-extensions-spec.md`、`27-performance-slo-spec.md`
> **铁律映射**: R-01 / R-02 / R-13 / R-14（见 10-markdown-authority §1.5）

---

## 目录

1. 渲染架构原则（不反向污染 Markdown 权威）
2. 权威源 → 平台派生链路（Markdown → AST → 各平台 adapter）
3. KaTeX WYSIWYG 集成（完整模式）
4. KaTeX 错误处理（红色原生错误 + 悬停提示）
5. Mermaid Stage 面板（右侧）
6. Mermaid 错误处理
7. 代码高亮引擎选型（Shiki 主 / highlight.js 副）
8. 语言懒加载（按语言粒度，180 种语言）
9. 代码块复制多格式（富文本 + 纯文本）
10. 代码块复制按钮 UI（悬停显示）
11. 渲染错误缓存与自动清除
12. 主题跟随全局 + 平台 override
13. 公式 / Mermaid / 代码三端一致性契约
14. 降级策略（源码保留 / 占位提示 / 回退图像 SVG→PNG）
15. 安全沙箱（DOMPurify 轻级清洗 + 平台 exporter 兜底）
16. 预览实时更新（节流 100ms）
17. 资产嵌入策略（按平台决定）
18. 表格渲染增强（横向滚动 / 对齐 / 列宽）
19. 图片渲染（Figure + Caption + 画廊）
20. 性能 SLO 对齐
21. 验收矩阵（语法 × 平台 × 输出格式）
22. 权威来源登记表

---

## 1. 渲染架构原则（不反向污染 Markdown 权威）

### 1.1 核心原则一览

| 原则 ID | 原则 | 对应铁律 |
|---|---|---|
| P-R01 | Markdown 文本是唯一权威源 | R-01 |
| P-R02 | HTML 是运行时缓存，不是真值 | R-01 |
| P-R03 | 平台 adapter 是单向函数：`(Markdown, options) → PlatformArtifact` | R-13 |
| P-R04 | 每平台独立渲染链路，内部改动不跨链路传播 | R-13 |
| P-R05 | 所有渲染失败不阻塞主流程 | R-02 |
| P-R06 | 任意元素必须 Typora/Source/Preview/Export 四态无损 | R-02 |
| P-R07 | `RENDERER_VERSION` 升级必须主动 invalidate `htmlCache` | R-01 |
| P-R08 | 三端（编辑/预览/导出）视觉一致性 ≥ 95%；差异必须在降级矩阵登记 | R-14 |

### 1.2 "不反向污染"的代码级实现约束

- **约束 A** | 所有 exporter 的函数签名强制为 `(markdown: string, options: ExportOptions) => Promise<PlatformArtifact>`；**禁止** `(html: string) => ...` 签名。违反则 TypeScript 编译失败（见 §2.3 类型定义）。
- **约束 B** | exporter 内部不得持有对 `editor.state` / `tiptapJSON` / `htmlCache` 的引用；只接受 Markdown 字符串。
- **约束 C** | exporter 修改自身样式（如微信 adapter 把表格 class 转 inline style）只能在 **exporter 私有的 post-process 链** 中发生，产出的 DOM 不回写 editor / preview。
- **约束 D** | 插件扩展（见 `25-extension-plugin-spec`）若要参与渲染，必须通过 `registerRenderPlugin(phase, handler)` 接入，phase 限定为 `beforeParse` / `afterParse` / `beforeSerialize` / `afterSerialize`，plugin 之间**不共享状态**。
- **约束 E** | 渲染核心模块（`src/services/rendering/`）对平台 adapter 仅暴露 `renderToAst(markdown)`；**不暴露** DOM、editor、store 任何对象。

### 1.3 模块边界（Module Boundaries）

```
src/
  services/
    rendering/                        (渲染核心，不知任何平台规则)
      pipeline.ts                     (RenderPipeline 编排器)
      version.ts                      (RENDERER_VERSION 常量)
      markdown-it-config.ts           (解析器配置)
      ast-normalizer.ts               (AST 规范化)
      plugins/                        (markdown-it 插件集)
        katex.ts
        mermaid.ts
        footnote.ts
        toc.ts
        task-lists.ts
    exporters/                        (平台 adapter，每平台独立)
      wechat/
        index.ts                      (实现 Exporter 接口)
        preset.ts                     (微信主题 override)
        post-process.ts               (SVG→PNG / 内联 style / 脚注转换)
      zhihu/
      redbook/
      html/
      markdown/
    sanitize/                         (DOMPurify 清洗配置)
      base-config.ts
      profile-preview.ts              (预览态 profile)
      profile-export.ts               (导出基线 profile)
  components/
    editor/
      MathInlineNodeView.vue          (KaTeX 行内 NodeView)
      MathBlockNodeView.vue           (KaTeX 块级 NodeView)
      MermaidStagePanel.vue           (右侧 Stage 面板)
      CodeBlockView.vue               (代码块 NodeView + 复制按钮)
    preview/
      PreviewPane.vue                 (预览面板)
```

### 1.4 依赖关系图

```
[Markdown 源 (权威)]
   │
   ▼
[RenderPipeline.renderToAst()]  ←── RENDERER_VERSION
   │
   ├──► [TipTap JSON] ─► [Editor HTML] ─► 编辑器显示
   ├──► [Preview HTML] ─► DOMPurify(profile-preview) ─► PreviewPane
   └──► [平台 adapter]
           ├── wechat/index.ts  ─► 微信 HTML
           ├── zhihu/index.ts   ─► 知乎 Markdown + 少量 HTML
           ├── redbook/index.ts ─► 小红书 JSON + 图片
           ├── html/index.ts    ─► 单文件 HTML
           └── markdown/index.ts─► 原生 Markdown
```

---

## 2. 权威源 → 平台派生链路

### 2.1 单向链路定义

**定义 2.1.1 | 单向链路（Unidirectional Pipeline）**
设 `M` 为 Markdown 源，`A = parse(M)` 为 AST，`H = serialize(A)` 为 HTML 产物。则：

- 正向：`M → A → H`（允许）
- 反向：`H → A → M`（**禁止**，除粘贴清洗/docx 导入入口外）

### 2.2 Exporter 统一接口

```ts
// src/services/exporters/types.ts

export interface ExportOptions {
  profileId: string;                       // Profile 级配置
  platform: PlatformId;                    // "wechat" | "zhihu" | "redbook" | "html" | "markdown"
  theme?: ThemeOverride;                   // 主题覆盖
  assetPolicy: AssetEmbedPolicy;           // 资产嵌入策略
  sanitizeProfile: SanitizeProfileId;     // DOMPurify profile
  extras?: Record<string, unknown>;        // 平台特有配置
}

export interface PlatformArtifact {
  platform: PlatformId;
  format: 'html' | 'markdown' | 'json' | 'zip';
  content: string | Uint8Array;            // 文本或二进制
  assets: ArtifactAsset[];                 // 附属资产
  warnings: RenderWarning[];               // 降级 / 不兼容警告
  meta: ArtifactMeta;                      // 生成时间 / 版本 / 统计
}

export interface Exporter {
  readonly platform: PlatformId;
  readonly name: string;                   // "微信公众号"
  export(markdown: string, options: ExportOptions): Promise<PlatformArtifact>;
}
```

**强制约束（类型层面）**: `Exporter.export` 的第一个参数是 `string`，TypeScript 在其他地方调用 exporter 时若传入非字符串（如传入 `editor.getHTML()`）会报错；但更重要的是**禁止在 exporter 内部读取 `window.editor` / `useEditorStore` / `ipcRenderer`**。通过 ESLint 自定义规则 `no-editor-in-exporter` 保证。

### 2.3 平台 adapter 内部架构

```ts
// src/services/exporters/wechat/index.ts (示意)

import type { Exporter, ExportOptions, PlatformArtifact } from '../types';
import { RenderPipeline } from '@/services/rendering/pipeline';
import { wechatPreset } from './preset';
import { wechatPostProcess } from './post-process';
import { sanitizeForWechat } from './sanitize';

export const wechatExporter: Exporter = {
  platform: 'wechat',
  name: '微信公众号',
  async export(markdown, options) {
    const pipeline = new RenderPipeline({
      version: RENDERER_VERSION,
      theme: options.theme ?? wechatPreset.theme,
      plugins: wechatPreset.markdownItPlugins,
    });

    const ast = pipeline.renderToAst(markdown);
    const html = pipeline.serializeAst(ast, { target: 'wechat' });
    const postProcessed = await wechatPostProcess(html, {
      assetPolicy: options.assetPolicy,
      profileId: options.profileId,
    });
    const sanitized = sanitizeForWechat(postProcessed);

    return {
      platform: 'wechat',
      format: 'html',
      content: sanitized.html,
      assets: sanitized.assets,
      warnings: sanitized.warnings,
      meta: { generatedAt: Date.now(), rendererVersion: RENDERER_VERSION },
    };
  },
};
```

### 2.4 RenderPipeline 编排器

```ts
// src/services/rendering/pipeline.ts

import MarkdownIt from 'markdown-it';
import { RENDERER_VERSION } from './version';
import { createKatexPlugin } from './plugins/katex';
import { createFootnotePlugin } from './plugins/footnote';
// ... 其他插件

export interface PipelineConfig {
  version: string;
  theme: ThemeSnapshot;
  plugins: ReadonlyArray<MarkdownItPlugin>;
}

export class RenderPipeline {
  private md: MarkdownIt;

  constructor(private readonly config: PipelineConfig) {
    this.md = new MarkdownIt({
      html: false,         // 默认不允许裸 HTML（降级时在特定 adapter 打开）
      linkify: true,
      typographer: true,
      breaks: false,
    });
    for (const plugin of config.plugins) {
      this.md.use(plugin.install, plugin.options);
    }
  }

  public renderToAst(markdown: string): NormalizedAst {
    const tokens = this.md.parse(markdown, {});
    return normalizeAst(tokens);   // 处理 frontmatter、非标语法、引用
  }

  public serializeAst(ast: NormalizedAst, opts: SerializeOptions): string {
    return serializeNormalizedAst(ast, opts);
  }

  public renderToHtml(markdown: string): string {
    const ast = this.renderToAst(markdown);
    return this.serializeAst(ast, { target: 'generic' });
  }
}
```

### 2.5 RENDERER_VERSION 与缓存契约

```ts
// src/services/rendering/version.ts

export const RENDERER_VERSION = '2.1.0';          // 语义化版本
export const PIPELINE_COMPONENTS = {
  markdownIt: '14.x',
  katex: '0.16.x',
  mermaid: '10.x',
  shiki: '1.x',
  dompurify: '3.x',
} as const;
```

**规则**:
- 任何组件升级 → `RENDERER_VERSION` 必须 bump 补丁号/次版本号。
- 数据库 migration（见 `41-settings-migration-spec`）在 `RENDERER_VERSION` 变动时，把所有文章 `htmlCache = null` + `cacheVersion = RENDERER_VERSION`。
- 下次读取文章时按需重建 `htmlCache`（懒重建）。

---

## 3. KaTeX WYSIWYG 集成（完整模式）

### 3.1 两种公式模式

| 模式 | Markdown 语法 | TipTap Node |
|---|---|---|
| 行内公式 | `$E=mc^2$` | `mathInline`（inline, atom） |
| 块级公式 | `$$E=mc^2$$` | `mathBlock`（block, atom） |

### 3.2 TipTap Node 定义

```ts
// src/editor/extensions/Math/MathInline.ts

import { Node, mergeAttributes } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import MathInlineNodeView from '@/components/editor/MathInlineNodeView.vue';

export const MathInline = Node.create({
  name: 'mathInline',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      source: { default: '' },       // LaTeX 源码
      rendered: { default: false },  // 是否已渲染
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-math-inline]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-math-inline': '' }), 0];
  },

  addNodeView() {
    return VueNodeViewRenderer(MathInlineNodeView);
  },

  addInputRules() {
    return [
      // 匹配 $...$（不包含换行、不在代码块内）
      nodeInputRule({
        find: /\$([^\$\n]+?)\$$/,
        type: this.type,
        getAttributes: (match) => ({ source: match[1] }),
      }),
    ];
  },
});
```

### 3.3 NodeView 状态机（Typora 模式核心）

```vue
<!-- src/components/editor/MathInlineNodeView.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3';
import type { NodeViewProps } from '@tiptap/vue-3';
import katex from 'katex';

const props = defineProps<NodeViewProps>();

const source = ref<string>(props.node.attrs.source ?? '');
const mode = ref<'view' | 'edit'>('view');
const error = ref<string | null>(null);
const editorInput = ref<HTMLInputElement | null>(null);

const rendered = computed(() => {
  try {
    return katex.renderToString(source.value, {
      throwOnError: false,
      strict: 'warn',
      output: 'htmlAndMathml',
      trust: false,
      macros: KATEX_MACROS,
      errorColor: '#cc0000',
    });
  } catch (e) {
    error.value = (e as Error).message;
    return null;
  }
});

function enterEditMode(): void {
  mode.value = 'edit';
  nextTick(() => editorInput.value?.focus());
}

function leaveEditMode(): void {
  mode.value = 'view';
  // 错误在源码变化后 computed 自动重算 → 自动清除（见 §11）
}

watch(source, (newVal) => {
  props.updateAttributes({ source: newVal });
  error.value = null;   // 内容变化，清除旧错误（对齐 T04-12 = A）
});
</script>

<template>
  <NodeViewWrapper as="span" class="math-inline" :class="{ 'math-inline--edit': mode === 'edit' }">
    <input
      v-if="mode === 'edit'"
      ref="editorInput"
      v-model="source"
      class="math-inline__input"
      @blur="leaveEditMode"
      @keydown.escape="leaveEditMode"
    />
    <span
      v-else
      class="math-inline__view"
      :title="error ?? undefined"
      @click="enterEditMode"
      v-html="rendered ?? `<span class='math-error'>\${source}\$</span>`"
    />
  </NodeViewWrapper>
</template>

<style scoped>
.math-inline__view { cursor: pointer; }
.math-inline--edit { outline: 2px solid var(--color-accent, #d32f2f); border-radius: 3px; }
.math-error { color: #cc0000; border-bottom: 1px dashed #cc0000; }
</style>
```

### 3.4 光标进入/离开的触发逻辑

- **进入编辑态**: 用户点击公式节点 / TipTap 选区 entering 该 Node（通过 `decorations` 检测）。
- **离开编辑态**: 失去焦点 (`blur`) / 按下 `Escape` / 光标移出（`selection.from` 不再落在 Node 上）。

**TipTap 层集成**:
```ts
// 在 EditorPanel.vue 中监听 selectionUpdate，命中 math node 时打开 NodeView 的编辑态
editor.on('selectionUpdate', ({ editor: ed }) => {
  const { from, to } = ed.state.selection;
  ed.state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === 'mathInline' || node.type.name === 'mathBlock') {
      // 发 custom event 让对应 NodeView 进入 edit 模式
      window.dispatchEvent(new CustomEvent('math:enter-edit', { detail: { pos } }));
      return false;
    }
  });
});
```

### 3.5 KaTeX 配置集合

```ts
// src/services/rendering/katex-config.ts

export const KATEX_OPTIONS: katex.KatexOptions = {
  throwOnError: false,     // 不抛错，改为内嵌红色错误
  strict: 'warn',          // 非标语法警告但不阻塞
  output: 'htmlAndMathml', // 双输出，便于平台兼容
  trust: false,            // 禁用 \href / \url 等危险命令
  errorColor: '#cc0000',
  macros: {
    '\\RR': '\\mathbb{R}',
    '\\NN': '\\mathbb{N}',
    '\\ZZ': '\\mathbb{Z}',
    '\\QQ': '\\mathbb{Q}',
    '\\CC': '\\mathbb{C}',
    // 用户可在 Settings > Editor > KaTeX Macros 扩展
  },
};
```

### 3.6 Source 模式下公式行为

- Source 模式（见 `01-spec-editor-typora.md`）下，公式始终显示源码（`$...$` 或 `$$...$$`）。不渲染。
- 切换回 Typora 模式时，重新解析 Markdown，公式 Node 自动重建。

### 3.7 Preview 模式下公式行为

- Preview 始终渲染，不提供编辑。
- PreviewPane 组件直接使用 `markdown-it-katex` 插件输出，而非 TipTap NodeView。

### 3.8 不反向污染的保证

- NodeView 的 `updateAttributes` 只修改 TipTap JSON 的 `attrs.source`，不修改 Markdown 源。
- Markdown 源在保存时由 `tiptapJsonToMarkdown(json)` 函数重建（遵循 round-trip），不依赖 NodeView 的内部状态。

---

## 4. KaTeX 错误处理（红色原生错误 + 悬停提示）

### 4.1 错误分类

| 错误级别 | KaTeX `strict` 对应 | UI 表现 |
|---|---|---|
| `error` | 语法不合法 | 红色文字 + 虚线下划线 + `title` 属性显示完整错误 |
| `warning` | 非 LaTeX 标准但可渲染 | 浅橙色下划线 + `title` 属性显示警告 |
| `ignore` | 已弃用命令（静默处理） | 正常渲染，无 UI 提示 |

### 4.2 错误渲染 DOM 结构

**KaTeX 默认**: `<span class="katex-error" style="color:#cc0000" title="ParseError: ...">$\frac{1}{$</span>`

**InkForge 增强**: 在 NodeView 层 wrap 一层 `<span class="math-error">`，注入 `lucide-vue-next` 的 `AlertTriangle` 图标（可选，避免干扰可在 Settings 关闭）。

```html
<span class="math-error" title="ParseError: Expected '}' at position 9">
  <AlertTriangle :size="12" />
  <span class="math-error__source">$\frac{1}{$</span>
</span>
```

### 4.3 悬停提示（Tooltip）

使用**浏览器原生 `title` 属性**，理由：
1. 无 z-index 层级冲突（自定义 Tooltip 在多层浮窗场景下容易被 FloatingToolbar / FindReplace 遮盖）。
2. 无需额外依赖，性能稳定。
3. 与操作系统原生表现一致，可访问性较好。

**约束**: `title` 文本最长 500 字符，超出截断并附加 `...`。

### 4.4 错误的自动清除

- **触发条件**: `props.node.attrs.source` 变化 → `computed(rendered)` 重算 → 新结果不抛错 → `error` 自动回归 `null`。
- **保证**: 不做 manual invalidation，不依赖外部 observer。

### 4.5 错误进入审计日志

```ts
// src/services/rendering/error-audit.ts

function logRenderError(subsystem: 'katex'|'mermaid'|'shiki', err: Error, ctx: RenderContext): void {
  auditLogger.log({
    event: 'render.error',
    subsystem,
    message: err.message,
    docId: ctx.docId,
    nodeUuid: ctx.nodeUuid,
    profileId: ctx.profileId,
    at: Date.now(),
  });
}
```

**注意**: 不弹 Toast、不中断流程；审计日志仅供开发者/支持人员复盘。

### 4.6 错误 UI 的降级

- 若用户 Settings 开启"隐藏渲染错误"（辅助功能），错误 UI 退化为原样 `$...$` 源码（不带红色标识）。仍写入审计日志。

---

## 5. Mermaid Stage 面板（右侧）

### 5.1 Stage 面板定位

- 位置：Workstation 右侧面板（与 Preview / Insights 面板同级 Tab），Tab 名称"图表 Stage"。
- 触发：光标进入 Mermaid 代码块时，Stage 面板自动激活该 Tab 并渲染当前代码。
- 非激活状态：显示"当前无图表"占位，不残留上一次结果。

### 5.2 组件结构

```vue
<!-- src/components/editor/MermaidStagePanel.vue -->
<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import mermaid from 'mermaid';
import { useEditorStore } from '@/stores/editor';
import { useThemeStore } from '@/stores/theme';
import { Maximize2, Download, Copy, AlertTriangle } from 'lucide-vue-next';

const editorStore = useEditorStore();
const themeStore = useThemeStore();

const currentMermaidSource = computed(() => editorStore.activeMermaidBlockSource);
const svgOutput = ref<string | null>(null);
const error = ref<string | null>(null);
const zoom = ref<100 | 150 | 200>(100);

watch([currentMermaidSource, () => themeStore.resolved], async ([src, theme]) => {
  if (!src) {
    svgOutput.value = null;
    error.value = null;
    return;
  }
  try {
    mermaid.initialize({
      theme: theme.mode === 'dark' ? 'dark' : 'default',
      startOnLoad: false,
      securityLevel: 'strict',
      fontFamily: 'var(--font-family-base)',
    });
    const id = `mermaid-${Date.now()}`;
    const result = await mermaid.render(id, src);
    svgOutput.value = result.svg;
    error.value = null;
  } catch (e) {
    error.value = (e as Error).message;
    svgOutput.value = null;
    logRenderError('mermaid', e as Error, { docId: editorStore.docId });
  }
}, { immediate: true });

async function exportPng(): Promise<void> { /* SVG → Canvas → PNG 下载 */ }
function copySvg(): void { /* navigator.clipboard.writeText(svgOutput) */ }
function goFullscreen(): void { /* 进入 mermaid fullscreen modal */ }
</script>

<template>
  <div class="mermaid-stage">
    <header class="mermaid-stage__toolbar">
      <button @click="zoom = 100">100%</button>
      <button @click="zoom = 150">150%</button>
      <button @click="zoom = 200">200%</button>
      <button @click="goFullscreen" title="全屏"><Maximize2 :size="14" /></button>
      <button @click="exportPng" title="导出 PNG"><Download :size="14" /></button>
      <button @click="copySvg" title="复制 SVG"><Copy :size="14" /></button>
    </header>

    <section class="mermaid-stage__canvas" :style="{ '--zoom': zoom / 100 }">
      <div v-if="svgOutput" v-html="svgOutput" />
      <div v-else-if="error" class="mermaid-stage__error">
        <AlertTriangle :size="18" />
        <pre>{{ error }}</pre>
      </div>
      <div v-else class="mermaid-stage__empty">当前无图表</div>
    </section>
  </div>
</template>
```

### 5.3 光标跟随机制

- `editorStore.activeMermaidBlockSource`:  一个 `computed` 读 `editor.state.selection.from`，找到最近的 `codeBlock` node，若其 `language === 'mermaid'` 返回 `node.textContent`，否则 `null`。
- 通过 `editor.on('selectionUpdate', ...)` 触发 store 更新。
- Debounce 50ms（避免连续 selectionUpdate 触发多次渲染）。

### 5.4 渲染引擎初始化

- Mermaid 单例初始化，主题从 `themeStore.resolved.mode` 映射（`light` → `default`、`dark` → `dark`、`sepia` → `neutral`）。
- `securityLevel: 'strict'` 禁止内嵌 HTML（Mermaid 支持的 `html` 节点默认关闭，避免 XSS）。
- 字体使用 `var(--font-family-base)` 跟随主题字体（见 `20-theme-font-typography-spec`）。

### 5.5 Stage 面板与多 Mermaid 块

- 光标只跟随当前一个 Mermaid 块；多个 Mermaid 块不同时渲染在 Stage。
- 提供"面板底部导航箭头"（`ChevronLeft` / `ChevronRight`）允许用户手动在文档内的多个 Mermaid 块之间切换，不用移动光标。

### 5.6 Stage 面板与正文内联的对比

| 方式 | 决策 | 理由 |
|---|---|---|
| 正文内联渲染 | 否（T04-03 = C） | Mermaid 容易渲染失败、占空间大，正文内联打断阅读流 |
| 右侧 Stage 面板 | 是 | 独立区域、可缩放、可导出、不污染正文排版 |

---

## 6. Mermaid 错误处理

### 6.1 错误来源

| 错误类型 | 触发条件 |
|---|---|
| 语法错误 | Mermaid 解析器无法理解（如 `graph LD` 拼错方向） |
| 不支持的图表类型 | Mermaid 版本不支持的新语法 |
| 渲染超时 | 复杂图渲染超过 5s（`Promise.race` 超时包裹） |
| 字体加载失败 | 字体文件缺失 |

### 6.2 错误 UI（Stage 面板内）

- 红色边框 + `AlertTriangle` 图标 + Mermaid 原生错误信息（透传，不封装）。
- 错误信息以 `<pre>` 展示，保留换行。
- 不影响正文编辑。

### 6.3 错误处理代码模式

```ts
async function renderMermaid(src: string): Promise<{ svg: string } | { error: string }> {
  const timeoutMs = 5000;
  const task = mermaid.render(`mermaid-${Date.now()}`, src);
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Mermaid render timeout')), timeoutMs)
  );
  try {
    const { svg } = await Promise.race([task, timeout]);
    return { svg };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
```

### 6.4 错误后的降级链

1. Stage 面板显示原生错误。
2. 导出到平台时（见 `15-export-publish-spec`）：
   - 导出到 HTML：保留 Mermaid 源码代码块（不渲染）+ 插入"图表预览失败"注释。
   - 导出到微信：同上 + 视觉上显示一个灰色占位图。
   - 导出到其他：同上。
3. 降级记录写入 `render.degrade` 审计日志。

---

## 7. 代码高亮引擎选型（Shiki 主 / highlight.js 副）

### 7.1 为什么选 Shiki 为主

| 维度 | Shiki | highlight.js |
|---|---|---|
| 高亮质量 | VS Code 同款（TextMate grammar） | 启发式匹配，质量一般 |
| 主题覆盖 | 丰富（官方几十种），含 GitHub 亮/暗 | 少量主题 |
| 输出结构 | `<pre><code>` + 每 token 内联 style | `<pre><code>` + class 名 |
| 体积 | 中等（180 种语言 + 按需加载约 ~1MB） | 较小 |
| 平台兼容 | 内联 style 天然适合微信（不依赖 class） | class 依赖 → 微信需要手动内联 |
| 懒加载 | 官方支持按语言动态 import | 需要手动组织 |

**结论**: Shiki 的"内联 style 输出"天然适配微信/知乎等不信任 class 的平台，是平台无关渲染的首选。

### 7.2 为什么保留 highlight.js 作为副引擎

- Shiki 的语法定义偶尔对冷门语言不稳定。
- Shiki 主题升级可能导致样式突变（高亮 CSS 版本管理复杂）。
- highlight.js 作为 fallback，在 Shiki 失败时保证**有高亮总好过无高亮**。

### 7.3 双引擎协作的判断顺序

```
1. 代码块 language 字段读取
2. Shiki.codeToHtml(code, { lang, theme }) 尝试
   ├── 成功 → 返回 Shiki HTML
   └── 失败 → 进入 fallback
3. highlight.js highlight(lang, code) 尝试
   ├── 成功 → 返回 highlight.js HTML（后续 post-process 转 inline style）
   └── 失败 → 返回裸 <pre><code>{code}</code></pre>
```

### 7.4 实现骨架

```ts
// src/services/rendering/code-highlight.ts

import { getHighlighter, type Highlighter, type BundledLanguage } from 'shiki';
import hljs from 'highlight.js/lib/core';

let shikiPromise: Promise<Highlighter> | null = null;

async function ensureShiki(): Promise<Highlighter> {
  if (!shikiPromise) {
    shikiPromise = getHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [],   // 按需加载
    });
  }
  return shikiPromise;
}

const loadedLangs = new Set<string>();

export async function highlightCode(code: string, lang: string, theme: 'light'|'dark'): Promise<HighlightResult> {
  const shiki = await ensureShiki();
  const shikiTheme = theme === 'dark' ? 'github-dark' : 'github-light';
  const normalizedLang = normalizeLangAlias(lang);   // jsx→javascript, ts→typescript

  // 1) 懒加载语言
  if (normalizedLang && !loadedLangs.has(normalizedLang)) {
    try {
      await shiki.loadLanguage(normalizedLang as BundledLanguage);
      loadedLangs.add(normalizedLang);
    } catch {
      return await fallbackHighlight(code, normalizedLang);
    }
  }

  // 2) Shiki 渲染
  try {
    const html = shiki.codeToHtml(code, { lang: normalizedLang, theme: shikiTheme });
    return { engine: 'shiki', html };
  } catch (e) {
    logRenderError('shiki', e as Error, { lang: normalizedLang });
    return await fallbackHighlight(code, normalizedLang);
  }
}

async function fallbackHighlight(code: string, lang: string): Promise<HighlightResult> {
  try {
    const mod = await import(`highlight.js/lib/languages/${lang}`);
    hljs.registerLanguage(lang, mod.default);
    const result = hljs.highlight(code, { language: lang });
    return { engine: 'highlight.js', html: `<pre><code class="hljs language-${lang}">${result.value}</code></pre>` };
  } catch {
    return { engine: 'none', html: `<pre><code>${escapeHtml(code)}</code></pre>` };
  }
}
```

### 7.5 Shiki 主题锁定

- 亮色：`github-light`
- 暗色：`github-dark`
- **不开放用户自定义主题**（T04-05 = A）。未来 v2.2+ 可在 Settings 增开主题选择器。

### 7.6 渲染产出示例

```html
<!-- Shiki 输出（内联 style，天然适合平台导出） -->
<pre class="shiki github-light" style="background-color:#fff;color:#24292e" tabindex="0">
<code><span class="line">
  <span style="color:#D73A49">const</span>
  <span style="color:#005CC5"> x</span>
  <span style="color:#D73A49"> =</span>
  <span style="color:#032F62"> 42</span>;
</span></code>
</pre>
```

---

## 8. 语言懒加载（按语言粒度，180 种语言）

### 8.1 为何按语言粒度而不一次全加载

- Shiki 全语言打包约 1MB+（压缩后），首屏加载成本高。
- 多数用户常用 < 10 种语言。按需加载最小化运行时内存。

### 8.2 懒加载状态机

```
[用户输入 ```python]
   │
   ▼
[highlightCode(code, 'python', theme)]
   │
   ▼
[loadedLangs.has('python')?]
   ├── 是 → 直接渲染
   └── 否 → 动态 import python.mjs (约 20KB)
          ├── 成功 → loadedLangs.add → 渲染
          └── 失败 → highlight.js fallback
```

### 8.3 语言别名归一化

```ts
const LANG_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'jsx': 'tsx',           // Shiki 的 tsx 涵盖 jsx
  'py': 'python',
  'rb': 'ruby',
  'yml': 'yaml',
  'sh': 'bash',
  'cs': 'csharp',
  'cpp': 'cpp',
  'c++': 'cpp',
  'kt': 'kotlin',
  'rs': 'rust',
  'md': 'markdown',
  'html': 'html',
  '': 'text',             // 空语言 → text（无高亮）
};

export function normalizeLangAlias(raw: string): string {
  const key = raw.trim().toLowerCase();
  return LANG_ALIASES[key] ?? key;
}
```

### 8.4 加载性能约束

- 首次命中某语言的加载延迟（P95）≤ 200ms（含网络往返在开发模式；生产模式本地打包加载 ≤ 50ms）。
- 加载期间代码块显示裸文本（无高亮），标记 `<pre data-highlight-loading>`，加载完成后替换。
- 连续命中同语言多次时，第二次起 < 10ms。

### 8.5 预热策略（可选）

- 在 Settings 高级选项中允许用户指定"常用语言预热列表"，首次启动时预加载（例如 TS/JS/Python/Bash）。
- 默认关闭，避免给首次启动带来负担。

### 8.6 浏览器兼容性

- 懒加载依赖 ES2020 `import()`，Tauri 的 Webview2 / WKWebView / WebKitGTK 均支持。
- Web 版不做（明确不做 Web 版）。

---

## 9. 代码块复制多格式（富文本 + 纯文本）

### 9.1 多 MIME 写入剪贴板

```ts
// src/services/clipboard/code-copy.ts

export async function copyCodeBlockToClipboard(opts: {
  plain: string;           // 原始代码
  html: string;            // Shiki 渲染后的 HTML（含内联 style）
  mode: 'default' | 'plain-only' | 'html-only' | 'markdown';
}): Promise<void> {
  const cb = navigator.clipboard;

  switch (opts.mode) {
    case 'plain-only':
      await cb.writeText(opts.plain);
      return;
    case 'html-only': {
      const item = new ClipboardItem({
        'text/html': new Blob([opts.html], { type: 'text/html' }),
      });
      await cb.write([item]);
      return;
    }
    case 'markdown': {
      const md = wrapMarkdownCodeBlock(opts.plain, opts.lang);
      await cb.writeText(md);
      return;
    }
    default: {
      // default: 两种 MIME 同时写入，目标粘贴端自动选择
      const item = new ClipboardItem({
        'text/plain': new Blob([opts.plain], { type: 'text/plain' }),
        'text/html': new Blob([opts.html], { type: 'text/html' }),
      });
      await cb.write([item]);
    }
  }
}
```

### 9.2 默认行为（目标 U-PC-02）

- 同时写入 `text/plain` + `text/html`。
- 粘贴到微信公众号编辑器、飞书、Notion 等富文本客户端 → 自动识别 `text/html`，保留颜色。
- 粘贴到 VS Code、Terminal、Slack 普通聊天 → 自动识别 `text/plain`，退化为纯文本。

### 9.3 Tauri 下剪贴板能力

- Tauri Webview2（Windows）支持 `ClipboardItem`。
- Tauri WKWebView（macOS）支持。
- 若老版本 Webview 不支持 `ClipboardItem` API：降级到 `navigator.clipboard.writeText(plain)`（仅纯文本，富文本功能不可用，审计日志记录）。

### 9.4 Settings 全局默认切换

```ts
// Profile 级设置
interface CodeCopyPreference {
  defaultMode: 'both' | 'plain-only' | 'html-only' | 'markdown';
  quickCopyButtonMode: 'both' | 'plain-only';  // 一键复制按钮模式（§10）
}
```

对齐 OPEN-05 的决策方案：允许用户全局关闭富文本复制。

---

## 10. 代码块复制按钮 UI（悬停显示）

### 10.1 交互状态机

```
[代码块正常状态]
   │
   ├── mouseenter → 按钮淡入（opacity 0→1，150ms）
   │
   └── mouseleave → 按钮淡出（opacity 1→0，150ms）

[点击复制按钮]
   │
   ▼
[writeCopyAction()]
   │
   ├── 成功 → 图标切换 Copy→Check，文字"已复制"，1500ms 后恢复
   └── 失败 → 图标切换到 AlertTriangle，Toast "复制失败"

[右键（或长按 300ms）复制按钮]
   │
   ▼
[弹出二级菜单]
   ├── 复制纯文本
   ├── 复制富文本
   └── 复制为 Markdown 代码块
```

### 10.2 NodeView 结构

```vue
<!-- src/components/editor/CodeBlockView.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/vue-3';
import type { NodeViewProps } from '@tiptap/vue-3';
import { Copy, Check, AlertTriangle, ChevronDown } from 'lucide-vue-next';
import { copyCodeBlockToClipboard } from '@/services/clipboard/code-copy';
import { useCodeCopyPref } from '@/stores/editorPrefs';

const props = defineProps<NodeViewProps>();
const pref = useCodeCopyPref();

const isHovered = ref(false);
const state = ref<'idle'|'copied'|'error'>('idle');
const menuOpen = ref(false);

const codeText = computed(() => props.node.textContent);
const lang = computed(() => props.node.attrs.language ?? '');

async function handleCopy(mode: 'default'|'plain-only'|'html-only'|'markdown' = pref.defaultMode): Promise<void> {
  try {
    await copyCodeBlockToClipboard({
      plain: codeText.value,
      html: await renderToHighlightedHtml(codeText.value, lang.value),
      mode,
    });
    state.value = 'copied';
    setTimeout(() => state.value = 'idle', 1500);
  } catch (e) {
    state.value = 'error';
    setTimeout(() => state.value = 'idle', 2000);
  }
}
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="code-block"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="code-block__lang-label" v-if="lang">{{ lang }}</div>

    <button
      class="code-block__copy-btn"
      :class="{
        'code-block__copy-btn--visible': isHovered,
        'code-block__copy-btn--copied': state === 'copied',
        'code-block__copy-btn--error': state === 'error',
      }"
      @click="() => handleCopy()"
      @contextmenu.prevent="menuOpen = true"
    >
      <Copy v-if="state === 'idle'" :size="14" />
      <Check v-else-if="state === 'copied'" :size="14" />
      <AlertTriangle v-else :size="14" />
      <ChevronDown :size="12" />
    </button>

    <CodeCopyMenu
      v-if="menuOpen"
      @close="menuOpen = false"
      @copy-plain="handleCopy('plain-only')"
      @copy-html="handleCopy('html-only')"
      @copy-markdown="handleCopy('markdown')"
    />

    <pre><NodeViewContent as="code" :class="`language-${lang}`" /></pre>
  </NodeViewWrapper>
</template>

<style scoped>
.code-block { position: relative; }

.code-block__lang-label {
  position: absolute; top: 8px; right: 52px;
  font-size: 11px; color: rgba(255,255,255,0.4); letter-spacing: 0.05em;
  text-transform: uppercase;
  pointer-events: none;
}

.code-block__copy-btn {
  position: absolute; top: 8px; right: 8px;
  opacity: 0;
  transition: opacity 150ms ease, background 120ms ease;
  display: inline-flex; align-items: center; gap: 2px;
  padding: 4px 6px; border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px; background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8); cursor: pointer;
}
.code-block__copy-btn--visible { opacity: 1; }
.code-block__copy-btn--copied { color: #81c784; border-color: #81c784; }
.code-block__copy-btn--error { color: #ef5350; border-color: #ef5350; }
</style>
```

### 10.3 样式规范

- 按钮位置：代码块右上角 8px 内边距。
- 语言标签在复制按钮左侧。
- 按钮背景半透明，暗色主题下文字 `rgba(255,255,255,0.8)`，亮色主题下 `rgba(0,0,0,0.6)`。
- 过渡时长：150ms（与 CLAUDE.md `transition: background 120ms ease` 基调一致）。

### 10.4 可访问性

- 按钮添加 `aria-label="复制代码块内容"` + `title` 属性（键盘用户也能看到提示）。
- `Tab` 键可聚焦按钮（不隐藏 outline）。
- 焦点状态有明显视觉反馈。

### 10.5 与右键菜单的协同

- 右键代码块整体（不是按钮）→ 弹出编辑器右键菜单（见 05 spec），含"复制代码块"作为一级项。
- 右键复制按钮本身 → 弹出复制模式二级菜单。

---

## 11. 渲染错误缓存与自动清除

### 11.1 决策（T04-12 = A + 补充）

- **不缓存失败**: 每次内容变化都重新尝试渲染。
- **错误自动消失**: 用户修改源码后错误 UI 立即清除。

### 11.2 为何不缓存失败

- 用户正在修复错误的过程中，缓存会让他无法立即看到修复是否生效。
- 缓存失败结果需要一套 invalidation 机制，增加复杂度。
- 渲染失败本身是"便宜操作"（KaTeX 解析错误几毫秒返回），重试开销可接受。

### 11.3 自动清除的技术实现

- KaTeX / Mermaid / Shiki 的错误都绑定在对应 NodeView 的 `computed` 或 `watch` 上。
- Source 变化 → `computed` 重算 → 新结果覆盖 `error` ref → UI 自动更新。
- 不使用 `error` 持久化到 TipTap JSON（错误仅 UI 层临时态）。

### 11.4 防抖策略（可选，默认关闭）

- 极端场景：用户高速输入公式时每次 keystroke 触发 KaTeX 解析。
- 默认行为：每次 keystroke 触发（`computed` 自动防抖）。
- 若 Profile 级性能设置开启"公式渲染防抖 150ms"，则在 `watch` 里加 debounce（仅针对超大文档）。
- 默认不启用防抖（对齐 `T04-09 = A "实时"` 与 `T04-12 = A "即时重试"`）。

### 11.5 错误计数与告警

- 开发者面板（见 `07-spec-settings` Advanced Tab）显示：最近 5 分钟的渲染错误次数 / 成功次数 / 错误率。
- 错误率 > 20% 且持续 30s，弹一次轻量 Toast 提示用户"渲染错误率较高，建议查看开发者面板"。

---

## 12. 主题跟随全局 + 平台 override

### 12.1 主题数据结构

```ts
// src/stores/theme.ts

interface ThemeSnapshot {
  mode: 'light' | 'dark' | 'sepia';
  family: 'ethereal-constructivism' | 'classic' | 'contrast-high';
  tokens: Record<string, string>;   // CSS 变量（--color-*, --font-*, --space-*）
  codeTheme: 'github-light' | 'github-dark';
  mermaidTheme: 'default' | 'dark' | 'forest' | 'neutral';
  katexMacros: Record<string, string>;
}
```

### 12.2 主题解析优先级

```
1. 全局主题（Settings > Appearance > Theme）
2. Profile 级覆盖（Profile 级可单独设）
3. 临时覆盖（例如专注模式进入时强制 sepia）
4. 平台 override（仅在 exporter 内部生效，不回写到全局）
```

### 12.3 平台 override 实现

```ts
// src/services/exporters/wechat/preset.ts

import type { ThemeOverride } from '@/stores/theme';

export const wechatPreset = {
  theme: {
    mode: 'light',                     // 微信只导出 light（大部分公众号白底）
    codeTheme: 'github-light',         // 强制亮色代码
    mermaidTheme: 'default',
    overrideReason: 'platform:wechat',
  } satisfies ThemeOverride,
  markdownItPlugins: [ /* 见 §15 */ ],
};
```

**关键**: `wechatPreset.theme` 只在 `wechatExporter.export()` 内部被使用，不回流到 `themeStore`。编辑器内的主题不变。

### 12.4 主题热切换不重新解析 Markdown

- 主题切换仅触发 CSS 变量变化 → 已渲染的 HTML 自动反映新主题（通过 CSS 变量）。
- **例外**: 代码高亮（Shiki 输出的内联 style 不依赖 CSS 变量）。主题切换时必须重新走 Shiki 渲染一次代码块。

```ts
// 监听主题变化，批量重渲染代码块
watch(() => themeStore.codeTheme, async (newTheme) => {
  const codeBlocks = document.querySelectorAll('.code-block');
  for (const el of codeBlocks) {
    const lang = el.dataset.language ?? '';
    const code = el.textContent ?? '';
    const result = await highlightCode(code, lang, newTheme === 'github-dark' ? 'dark' : 'light');
    el.querySelector('pre').outerHTML = result.html;
  }
});
```

### 12.5 KaTeX 主题

- KaTeX CSS 本身不分主题，颜色使用 `currentColor`。
- 暗色主题下自动反色（通过父容器 `color: white` 即可）。
- 错误块颜色固定 `#cc0000`（暗色主题下可读性可接受，用户若不满可在 Settings 调）。

### 12.6 Mermaid 主题

- Mermaid 官方主题：`default` / `dark` / `forest` / `neutral`。
- 全局主题映射：
  - `light` → `default`
  - `dark` → `dark`
  - `sepia` → `neutral`
- 用户可在 Settings > Rendering > Mermaid Theme 单独覆盖（不跟随全局）。

---

## 13. 公式 / Mermaid / 代码三端一致性契约

### 13.1 三端一致性定义

| 端 | 定义 |
|---|---|
| 编辑态（Typora） | TipTap NodeView 渲染 |
| 预览态（Stage / PreviewPane） | markdown-it + 插件渲染 |
| 导出态 × N | 每个 exporter 在 RenderPipeline 基础上 post-process |

**契约**: 三端在同一 Markdown 源、同一 `RENDERER_VERSION`、同一主题下**视觉一致率 ≥ 95%**。

### 13.2 一致性保证机制

- 公式：所有端统一调用 `katex.renderToString(source, KATEX_OPTIONS)`，CSS 统一引用 `katex/dist/katex.min.css`。
- Mermaid：所有端统一调用 `mermaid.render(id, source, theme)`，SVG 输出相同。
- 代码高亮：所有端统一调用 `highlightCode(code, lang, theme)`（Shiki 主）。

### 13.3 允许的差异（不计入一致性失败）

| 差异项 | 原因 |
|---|---|
| 微信：Mermaid 从 SVG 降级到 PNG | 微信 SVG 兼容问题（R-01） |
| 小红书：表格转图片 | 小红书不支持 HTML 表格 |
| 微信：代码块内联 style 替代 class | 微信不支持 class |
| 所有导出：KaTeX 输出去掉 MathML（仅保留 HTML） | 部分平台不认 MathML |

### 13.4 一致性测试工具

**工具 K-13.1** | 黄金样本对比 (Golden Sample Diff)
- 维护 `test/rendering/golden/` 目录，内含 100+ 个 Markdown 样本 + 每端期望产物。
- CI 跑 exporter，diff 实际输出 vs 期望产物，允许像素差 < 5%。

**工具 K-13.2** | 视觉回归测试 (Visual Regression)
- 使用 Playwright 截图编辑态 / 预览态 / 每平台导出结果。
- Pixel diff > 5% 视为回归，CI 失败。

### 13.5 Round-trip 一致性

- Markdown → TipTap JSON → Markdown 必须等价（允许空白归一化）。
- Markdown → KaTeX HTML → 拷贝 → 粘贴回 InkForge，解析后 JSON 与原 JSON 等价。
- Round-trip 测试矩阵见 `10-markdown-authority-spec §11`。

---

## 14. 降级策略（源码保留 / 占位提示 / 回退图像 SVG→PNG）

### 14.1 降级层级表

| 层级 | 策略 | 触发 |
|---|---|---|
| L0 | 原始渲染成功 | 默认 |
| L1 | 轻度降级（保留能力，调整形式） | 特定平台规则（如微信 inline style） |
| L2 | 回退到源码 + 原生错误 UI | 渲染器解析失败 |
| L3 | 回退图像（SVG → PNG） | 目标平台不支持 SVG（主要指微信） |
| L4 | 占位 + 文件名 | 资产不可访问 |
| L5 | 完全省略 | 极端不支持（小红书跳过复杂表格内容） |

### 14.2 KaTeX 降级

```
L0: KaTeX HTML+MathML
L1: KaTeX HTML only（平台不支持 MathML）
L2: 源码 + 红色错误（LaTeX 解析失败）
L3: SVG 图片（KaTeX output: 'mathml' → 失败平台的兜底）
L4: 纯文本源码（最终兜底）
```

### 14.3 Mermaid 降级

```
L0: Mermaid SVG
L1: Mermaid SVG with themeOverride（平台主题不同）
L2: 源码显示 + 错误注释
L3: SVG → PNG（微信专用）
L4: 灰色占位图 + "图表预览失败"（PNG 也失败时）
L5: 删除 Mermaid 块，改为 <pre>源码</pre>
```

**SVG → PNG 转换流程**:
1. Mermaid 渲染得到 SVG 字符串。
2. 创建离屏 `<canvas>`（size 自动根据 SVG viewBox）。
3. 将 SVG 作为 `<img src="data:image/svg+xml;base64,...">` 加载。
4. `canvas.getContext('2d').drawImage(img, 0, 0)`。
5. `canvas.toBlob(blob => ...)` 得到 PNG Blob。
6. PNG 走 adapter 的资产上传/嵌入逻辑。

### 14.4 代码高亮降级

```
L0: Shiki 内联 style
L1: Shiki 不同主题（平台 override）
L2: highlight.js class + 平台级 inline style 转换
L3: 裸 <pre><code> 无高亮
```

### 14.5 表格降级

```
L0: 原生 <table>
L1: inline style 表格（微信）
L2: 转为图片（小红书，使用 html2canvas）
L3: 转为"标题：内容"列表（极端兜底）
```

### 14.6 图片降级

```
L0: <figure><img src=本地路径><figcaption/></figure>
L1: <figure><img src=base64><figcaption/></figure>（单文件 HTML）
L2: <figure><img src=https://cdn.../xxx.png></figure>（上传到平台后的 URL）
L3: 占位图 + 文件名（图片不可访问）
L4: 省略图片，保留 alt 文本
```

### 14.7 降级日志

每次降级写入审计日志：

```ts
auditLogger.log({
  event: 'render.degrade',
  element: 'mermaid',        // katex | mermaid | code | table | image
  fromLevel: 'L0',
  toLevel: 'L3',
  reason: 'platform:wechat:svg-incompatible',
  docId, nodeUuid, profileId, at: Date.now(),
});
```

### 14.8 用户可见的降级提示

- 编辑态/预览态不弹提示（降级是后台行为）。
- 导出时在 exporter 返回的 `warnings` 数组里附带降级清单，导出对话框显示 "本次导出存在 N 项降级，查看详情"。

---

## 15. 安全沙箱（DOMPurify 轻级清洗 + 平台 exporter 兜底）

### 15.1 决策与风险

- `T04-15 = A` 决策为"轻级清洗 + 平台兜底"（最弱安全级别）。
- 用户补充"一切以平台规则决定"。
- 本章既落地该决策，同时登记风险（见 `04-prd-rendering.md §6 R-04`）。

### 15.2 清洗分层

```
[Markdown 源]
   │
   ▼
[RenderPipeline] 产出未清洗 HTML
   │
   ├── 预览态 → [DOMPurify profile-preview] → PreviewPane
   │
   └── 导出态 → [DOMPurify profile-export-base] → 每个 adapter 私有清洗 → 平台产物
```

### 15.3 DOMPurify profile-preview 配置

```ts
// src/services/sanitize/profile-preview.ts

import DOMPurify from 'dompurify';

export const PREVIEW_SANITIZE_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    // 文本结构
    'h1','h2','h3','h4','h5','h6','p','blockquote','hr','pre','code','br',
    'strong','em','del','s','u','mark','sub','sup','small','kbd',
    // 列表
    'ul','ol','li',
    // 链接 & 图片
    'a','img','figure','figcaption',
    // 表格
    'table','thead','tbody','tr','th','td','colgroup','col',
    // KaTeX 产物
    'span','div','math','mrow','mi','mn','mo','mfrac','msqrt','msup','msub','mtable','mtr','mtd',
    'annotation','semantics',
    // Mermaid SVG
    'svg','g','path','text','rect','circle','ellipse','line','polyline','polygon','marker','defs',
  ],
  ALLOWED_ATTR: [
    'href','src','alt','title','class','id','style','colspan','rowspan','align',
    'data-math-inline','data-math-block','data-language','data-citation-layer',
    'viewBox','width','height','fill','stroke','stroke-width','d','x','y','cx','cy','r','rx','ry',
    'transform','opacity','font-family','font-size','marker-end','marker-start',
  ],
  ALLOW_DATA_ATTR: true,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|asset|blob|data|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_TAGS: ['script','iframe','object','embed','form','input','button','style'],
  FORBID_ATTR: ['onload','onerror','onclick','onmouseover','onfocus','onblur','onsubmit','onchange'],
};
```

### 15.4 导出基线清洗

导出基线（`profile-export-base`）与预览态基本一致，但**允许 `<style>` 标签**（某些平台导出需要内嵌 CSS）。每个平台 adapter 在基线之上做平台级清洗。

### 15.5 每平台 adapter 过滤矩阵

| adapter | 额外禁止 | 额外允许 | 特殊处理 |
|---|---|---|---|
| 微信 | `class` 属性 | — | 所有 class 转 inline style；外链 `<a>` 转脚注；SVG→PNG |
| 知乎 | — | `<math>`（知乎内置 MathJax） | 代码块需要 `data-language` 属性 |
| 小红书 | `<table>` / `<svg>` / `<pre>` | — | 复杂元素转图片 / 省略 |
| HTML | — | `<style>` + `<script>`（仅用户明确开启） | 可选单文件 base64 嵌入 |
| Markdown | 全部 HTML 除 `<img>` / `<a>` / `<br>` | — | 纯 Markdown，HTML 仅保留最基本 |

### 15.6 风险缓解清单

- 每个 adapter 必须实现独立 `sanitize()` 函数，不信任上游。
- 每次 exporter 单元测试必须包含"恶意 Markdown 输入测试"（XSS payload 模板）。
- 发布前运行 OWASP ZAP 对导出产物扫描。
- 审计日志记录所有被清洗掉的标签/属性。

---

## 16. 预览实时更新（节流 100ms）

### 16.1 节流 vs 防抖的选择

- **节流（throttle）**: 连续输入期间，每 100ms 刷新一次（用户能看到中间态）。
- **防抖（debounce）**: 停止输入 100ms 后才刷新（用户看不到中间态）。
- **决策**: 节流，对齐 `T04-09 = A "实时"` 与用户补充的"实时更新"预期。

### 16.2 实现

```ts
// src/stores/preview.ts

import { watchThrottled } from '@vueuse/core';

export const usePreviewStore = defineStore('preview', () => {
  const markdown = computed(() => editorStore.markdownSource);
  const html = ref('');

  watchThrottled(markdown, async (md) => {
    const ast = renderPipeline.renderToAst(md);
    html.value = renderPipeline.serializeAst(ast, { target: 'generic' });
  }, { throttle: 100, leading: false, trailing: true });

  return { html };
});
```

### 16.3 增量渲染（性能优化）

- 仅重渲染有变化的 AST 节点（`patch` 而非 replace）。
- 通过 `markdown-it` 的 token 序列 diff，找出变化的 token，patch 到对应 DOM 节点。
- 未变化的节点保留原 DOM（包括 CSS 滚动位置 / NodeView 状态）。

### 16.4 滚动同步

- 预览面板与编辑器双向滚动同步（见 `spec-rendering-core` 的 SyncScroll 集成，详见 `03-prd-keyboard` 相关或未来 SyncScroll spec）。
- 本 spec 不定义滚动同步细节，但节流刷新不得破坏滚动位置：**在 patch 前记录 scrollTop，patch 后还原**。

### 16.5 大文档降级

- 文档字数 > 50,000 时节流时长自动提升到 300ms。
- 超过 100,000 时进入"手动刷新"模式（PreviewPane 显示刷新按钮），默认不自动刷新。
- 降级阈值可在 Settings 配置。

### 16.6 性能度量

- `perf.mark('preview:throttle-tick')` 埋点。
- 开发者面板显示平均/P95 重绘耗时。

---

## 17. 资产嵌入策略（按平台决定）

### 17.1 决策

- `T04-14 = C` + 用户补充"一切以平台规则决定"：每个 adapter 独立决定。

### 17.2 资产类型与来源

| 类型 | 来源 | 存储位置 |
|---|---|---|
| 本地图片 | 用户拖拽/粘贴/插入 | Tauri `app_data_dir/assets/{profile}/` |
| 截图 | 用户截屏粘贴 | 同上 |
| 远程 URL | Markdown 直接引用 `https://...` | 不本地化（除非 adapter 要求） |
| base64 DataURL | 历史导入 | 内嵌在 Markdown |
| SVG | Mermaid 产物 / 手动插入 | 同 Tauri 本地 |

### 17.3 每平台嵌入矩阵

| adapter | 本地图片 | 远程 URL | base64 | SVG |
|---|---|---|---|---|
| 微信 | 上传到微信素材库（返回 CDN URL）或 base64 | 下载再上传或保留（风险：可能被封） | 保留 | PNG 转换后上传 |
| 知乎 | 上传到知乎图床或 base64 | 保留 | 保留 | 保留（知乎支持 SVG） |
| 小红书 | 通过平台 API 上传 | 下载再上传 | 解码为 File 上传 | 转 PNG 再上传 |
| HTML | 选项 A：base64 内嵌（单文件）<br>选项 B：相对路径（多文件 ZIP） | 保留 | 保留 | 保留 |
| Markdown | 绝对路径 / 相对路径 | 保留 | 保留 | 保留 |

### 17.4 资产管线（Asset Pipeline）

见 `05-spec-toolbar-contextmenu-slash.md §15 资产统一管线`。本 spec 只关心资产在**渲染/导出**阶段的走向。

### 17.5 大资产阈值

- 单张图片 > 2MB：**禁止 base64 内嵌**（base64 膨胀 30%，HTML 会过大）。
- 导出单文件 HTML 时，大图片改用 blob URL（但 blob URL 在其他浏览器打开时失效，警告用户）。

### 17.6 资产哈希去重

- 每张图片计算 sha256，资产库按哈希存储，多处引用同一张图只保留一份。
- 导出时按哈希生成一次产物，文档内多次引用时共享。

---

## 18. 表格渲染增强（横向滚动 / 对齐 / 列宽）

### 18.1 GFM 表格语法

```
| 左对齐 | 居中 | 右对齐 |
|:------|:----:|------:|
| A     | B    | C     |
```

TipTap 扩展：`@tiptap/extension-table` + `@tiptap/extension-table-row` + `@tiptap/extension-table-cell` + `@tiptap/extension-table-header`。

### 18.2 横向滚动容器

```css
.table-wrapper {
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.table-wrapper table {
  min-width: 100%;
  width: max-content;
}
```

- 永远包裹 `<div class="table-wrapper">`，避免破坏 `max-width` 布局。
- 表格原始宽度可能超过容器，用户可横向滚动查看。

### 18.3 列宽拖拽

- TipTap `@tiptap/extension-table` `resizable: true`。
- 拖拽结果保存在 `tableRow` 节点的 `colwidth` 属性（数组，每列宽度）。
- 序列化为 Markdown 时，列宽通过 HTML 注释嵌入保证 round-trip：
  ```markdown
  <!-- inkforge:colwidth=[120,200,180] -->
  | 列1 | 列2 | 列3 |
  ```
- 反序列化时解析注释并恢复 `colwidth`。

### 18.4 对齐语法

- 对齐存在 `tableHeader`/`tableCell` 节点的 `alignment` 属性（`left` | `center` | `right` | `default`）。
- 序列化时转换为 GFM 对齐符号（`:---` / `:---:` / `---:`）。

### 18.5 斑马纹 & hover

```css
.table-wrapper tr:nth-child(even) td { background: rgba(0,0,0,0.02); }
.table-wrapper tr:hover td { background: rgba(211,47,47,0.04); }
```

- 暗色主题下自动反转。
- 导出到微信时转为 inline style。

### 18.6 小红书的表格特例

- 小红书 HTML 不支持复杂表格。
- 小红书 adapter 检测到 `<table>` 时用 `html2canvas` 渲染为 PNG，上传后替换为图片。

### 18.7 大表格性能

- 行数 > 100 或列数 > 20 的表格，编辑器提示"大表格，建议拆分"。
- 预览态虚拟滚动（仅渲染视口内行），导出时完整渲染。

---

## 19. 图片渲染（Figure + Caption + 画廊）

### 19.1 基础 Figure 结构

```html
<figure class="md-figure">
  <img src="..." alt="图说" loading="lazy" />
  <figcaption>图说</figcaption>
</figure>
```

- Caption 来自 Markdown `alt`。
- `loading="lazy"` 改善大文档滚动性能。
- TipTap `Image` 扩展扩展后自定义 NodeView 包裹 `<figure>`。

### 19.2 画廊模式

- 检测连续多张图片（中间无非图片块级元素）。
- 自动组装为 `<div class="md-gallery"><figure/><figure/>...</div>`。
- CSS flexbox 或 grid 实现响应式等高横向排列。

```css
.md-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}
.md-gallery figure { margin: 0; }
.md-gallery img { width: 100%; height: auto; aspect-ratio: 1/1; object-fit: cover; }
```

- 点击图片触发大图预览（Lightbox，见 `53-image-extension-v2-spec`）。

### 19.3 画廊的平台降级

- 微信：降级为单列堆叠（`<p><img/></p>` 序列）。
- 知乎：保留画廊 HTML。
- 小红书：拆分为多张单图上传。

### 19.4 图片加载失败

```vue
<figure class="md-figure md-figure--error">
  <ImageOff :size="24" />
  <figcaption>{{ filename }} 加载失败</figcaption>
</figure>
```

- 检测 `<img>` `onerror` 事件触发占位。
- 占位 UI 使用 `lucide-vue-next` 的 `ImageOff` 图标。
- 不抛错，不阻断渲染。

### 19.5 图片对齐

- Markdown 不直接支持对齐，扩展语法 `![alt](src "title"){: .align-left}` 保留但不激活。
- 或通过 Node attributes 存 `alignment`，序列化为 HTML 注释 `<!-- align:center -->` + 后续图片。

### 19.6 图片尺寸

- Markdown 不支持尺寸，用 HTML 注释 `<!-- size:400x300 -->` 保持 round-trip。
- 导出时各平台 adapter 处理：
  - 微信：保留尺寸属性（`width`/`height`）。
  - 小红书：按平台要求压缩到 720px 宽。
  - HTML：保留。

---

## 20. 性能 SLO 对齐

### 20.1 SLO 表（对齐 `04-prd-rendering §4.1`）

| 指标 | SLO | 关键实现 |
|---|---|---|
| 输入到编辑器响应 P95 | ≤ 16ms（单帧） | TipTap transaction 不阻塞 |
| 预览刷新 P95 | ≤ 100ms | 节流 100ms + 增量渲染（§16） |
| KaTeX 单公式渲染 P95 | ≤ 50ms | KaTeX 本身性能优越；宏定义不过多 |
| Mermaid 单图渲染 P95 | ≤ 500ms | 图复杂度控制 + 超时 5s 兜底 |
| 代码高亮首次加载 P95 | ≤ 200ms | 按语言懒加载（§8） |
| 主题切换全量重渲染 | ≤ 500ms | 只重渲染代码块，其他用 CSS 变量（§12.4） |
| 导出单文档 | ≤ 3min | 对齐 L1-36 C |

### 20.2 性能度量埋点

```ts
// src/services/rendering/perf.ts

export function measureRender<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
  const start = performance.now();
  const result = fn();
  return Promise.resolve(result).then((r) => {
    const duration = performance.now() - start;
    perfRegistry.record(label, duration);
    if (duration > PERF_BUDGET[label]) {
      console.warn(`[perf] ${label} took ${duration}ms (budget: ${PERF_BUDGET[label]}ms)`);
    }
    return r;
  });
}
```

### 20.3 回归测试

- CI 内置性能基准（Benchmark.js）。
- 每次 PR 必须保持 P95 不回退 5% 以上。
- 严重回退阻塞合并。

### 20.4 用户感知性能

- 使用 `requestIdleCallback` 安排非关键任务（如预热常用语言 / 统计上报）。
- 骨架屏：大文档打开时显示骨架，等后台渲染完成再替换。
- "Time to First Meaningful Paint" ≤ 300ms。

### 20.5 内存使用

- Shiki 保留的 Highlighter 实例内存约 30MB。
- 每个 Mermaid SVG 节点 < 100KB。
- 长时间编辑大文档：内存峰值控制在 < 500MB（Webview2 上限约 2GB）。

---

## 21. 验收矩阵（语法 × 平台 × 输出格式）

### 21.1 语法矩阵（19 个元素）

| # | 元素 | 样本数 |
|---|---|---|
| 1 | 标题 h1-h6 | 5 |
| 2 | 段落 | 3 |
| 3 | 无序列表 | 5（扁平/嵌套/混排任务） |
| 4 | 有序列表 | 5 |
| 5 | 引用块 blockquote | 5（嵌套） |
| 6 | 代码块 fenced | 5（语言/空语言/极长/极短/含特殊字符） |
| 7 | 行内代码 | 3 |
| 8 | 行内公式 `$...$` | 5 |
| 9 | 块级公式 `$$...$$` | 5 |
| 10 | Mermaid 块 | 5（流程/时序/甘特/饼图/语法错误） |
| 11 | 表格 | 5（简单/对齐/宽表/空单元格/仅表头） |
| 12 | 图片 | 5（本地/远程 URL/base64/SVG/404） |
| 13 | 链接 | 5（自动链接/标注链接/引用链接/锚点/mailto） |
| 14 | 脚注 | 3 |
| 15 | 任务列表 | 3 |
| 16 | 目录 TOC | 2 |
| 17 | 分割线 | 2 |
| 18 | 高亮 / mark | 3 |
| 19 | 上/下标 | 3 |

**合计样本数** = 77，每样本测试**四态 + 五平台**（编辑 Typora / 编辑 Source / 预览 / 导出 ×5）。

**总测试点** = 77 × 9 = 693 点。

### 21.2 平台矩阵

| 平台 | 渲染器 | 验收方式 |
|---|---|---|
| 编辑态 Typora | TipTap NodeView | Playwright 截图 |
| 编辑态 Source | vue-codemirror | Playwright DOM 断言 |
| 预览态 Stage | markdown-it | Playwright 截图 |
| 导出 → 微信 HTML | wechat adapter | HTML diff + 实机导入公众号后端目视 |
| 导出 → 知乎 HTML | zhihu adapter | 同上 + 知乎编辑器目视 |
| 导出 → 小红书 JSON | redbook adapter | JSON schema 验证 |
| 导出 → 单文件 HTML | html adapter | Playwright 打开并截图对比 |
| 导出 → 原生 Markdown | markdown adapter | 字符串 diff（round-trip） |

### 21.3 一致性通过率

- **阈值**: 95%
- **测量方法**: Playwright 截图 pixel diff（含 5% 色彩容差）
- **报告**: `test/rendering/report.html` 展示每样本的四态 + 五平台截图，差异高亮。

### 21.4 降级验证

- 每个降级路径（§14）必须有至少一个对应样本：
  - Mermaid SVG → PNG（微信）
  - KaTeX HTML → 源码（解析失败样本）
  - 表格 → 图片（小红书）
  - Shiki → highlight.js（冷门语言失败样本）

### 21.5 边界用例

- 空文档：所有端不报错，显示空白。
- 超大文档（10,000 行）：预览可用，滚动不卡。
- 全是 Mermaid 块（50 个）：Stage 面板正确跟随，不崩溃。
- 恶意 Markdown（含 `<script>`）：所有平台都安全，审计日志记录。
- 空白语言代码块：显示裸代码，不报错。
- 嵌套表格（不支持）：显示第一层 + 降级提示。

### 21.6 回归防护

- CI 自动跑验收矩阵，PR 失败阻塞合并。
- 每月全量跑一次，报告汇总到 `report/rendering-quality/YYYY-MM.md`。

### 21.7 用户可见的验收

- Settings > About 显示 "渲染引擎通过率: 96.3%"（上一次 CI 结果）。
- Issue 跟踪：每个未通过样本登记 GitHub issue，修复后关闭。

---

## 22. 权威来源登记表

### 22.1 决策来源

| Spec 条款 | 来源 | 内容 | 决策值 |
|---|---|---|---|
| §3 KaTeX WYSIWYG | `prompts/0420/_extracted/02b-L2-T03-T04-T05-T06.md` | T04-01 | A |
| §4 KaTeX 红色错误 | 同上 | T04-02 | A |
| §5 Mermaid Stage | 同上 | T04-03 | C |
| §6 Mermaid 原生错误 | 同上 | T04-04 | A |
| §7 GitHub 主题 | 同上 | T04-05 | A |
| §9 富文本 + 纯文本复制 | 同上 | T04-06 | C |
| §8 全 180 种语言 | 同上 | T04-07 | C |
| §17 按平台嵌入 | 同上 | T04-14 | C |
| §16 预览实时更新 | 同上 | T04-09 | A（100ms 节流） |
| §12 主题跟随 + 平台 override | 同上 | T04-11 | B |
| §11 错误自动清除 | 同上 | T04-12 | A + 用户补充 |
| §13 三端一致性 | `prompts/0420/00-task-roadmap.md` | §2.4 要点 8 | L1-32 C+ |
| §15 轻级安全沙箱 | `prompts/0420/_extracted/02b...` | T04-15 | A（风险登记）|
| §21 Round-trip 四态 | `10-markdown-authority-spec.md` | §11 | 完整验收矩阵 |
| §20 性能 SLO | `prompts/0420/00-task-roadmap.md` | §1.1 | L1-36 C+ |
| Mermaid 始终渲染 | 同上 | §2.4 要点 3 | X-02 B |
| 不反向污染 | `10-markdown-authority-spec.md` | §1.3 P-03 | 硬约束 |

### 22.2 技术参考

| 库 | 版本 | 用途 |
|---|---|---|
| `markdown-it` | 14.x | Markdown 解析 |
| `katex` | 0.16.x | 公式渲染 |
| `mermaid` | 10.x | 图表渲染 |
| `shiki` | 1.x | 代码高亮（主） |
| `highlight.js` | 11.x | 代码高亮（副） |
| `dompurify` | 3.x | HTML 清洗 |
| `@tiptap/core` | 2.x | 编辑器 |
| `@tiptap/extension-table` | 2.x | 表格 |
| `html2canvas` | 1.x | 表格/图片降级（小红书） |

### 22.3 基线 Spec 参考

- `prompts/0327/04-rendering-engine-spec.md` — 2026-03-27 基线，已由本 Spec 超集覆盖。
- 保留其中：右键菜单 15 项（转移到 05-spec-toolbar）、FindReplace（转移到 03-spec-keybindings）、拖拽粘贴图片（转移到 05-spec）、合规检测（转移到 15-export-publish）。
- 新增要点（v2.1 独有）：WYSIWYG NodeView 状态机、Shiki 懒加载、三端一致性契约、降级层级、DOMPurify 双 profile、资产嵌入矩阵。

### 22.4 下游 Spec 引用

| 下游 Spec | 本 Spec 提供 |
|---|---|
| `15-export-publish-spec.md` | §2 Exporter 接口、§14 降级、§15 sanitize profile、§17 资产嵌入 |
| `16-markdown-extensions-spec.md` | §2 RenderPipeline 插件注册点 |
| `20-theme-font-typography-spec.md` | §12 主题契约 |
| `27-performance-slo-spec.md` | §20 性能 SLO |
| `25-extension-plugin-spec.md` | §1.2 渲染插件 phase 注册点 |
| `32-comment-review-spec.md` | §18 表格 round-trip（评论锚点漂移） |

### 22.5 矛盾处理登记

- **OPEN-01** | T04-08 C 不含 PDF，用户可能想要 PDF（D）。**处置**: v2.1 不做 PDF，列 v2.2+ 候选，见 PRD §6 R-07。
- **OPEN-02** | T04-15 A 轻级沙箱 + 用户补充"平台规则决定"风险。**处置**: §15.6 风险缓解清单 + 每 adapter 独立 sanitize。
- **OPEN-04** | Source 模式下公式渲染行为（T04-01=A vs X-02=B）。**处置**: §3.6 规范化 —— Source 显示源码，Typora WYSIWYG，Preview 始终渲染。
- **OPEN-05** | 代码复制默认富文本是否打扰纯文本用户。**处置**: §9.4 Profile 级默认模式 + 按钮二级菜单切换。

### 22.6 铁律对齐

| 铁律 | 本 Spec 条款 | 落地方式 |
|---|---|---|
| R-01 Markdown 唯一权威 | §1, §2 | 单向链路 + 类型约束 + 不反向污染 |
| R-02 四态无损 round-trip | §21 | 验收矩阵 + CI 回归 |
| R-13 多平台独立链路 | §2, §12 | 每平台 adapter 独立 preset + 独立 sanitize |
| R-14 三端一致 + 降级 | §13, §14 | 一致性契约 + 降级层级表 |
| R-16 数据完整性 | §2.5 RENDERER_VERSION + §15 审计 | cacheVersion 验证 + 审计日志 |

---

## 附录 A | Markdown-it 插件完整配置

```ts
// src/services/rendering/markdown-it-config.ts

import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import anchor from 'markdown-it-anchor';
import toc from 'markdown-it-toc-done-right';
import taskLists from 'markdown-it-task-lists';
import container from 'markdown-it-container';
import { katexPlugin } from './plugins/katex';
import { mermaidFencedPlugin } from './plugins/mermaid';
import { shikiFencedPlugin } from './plugins/shiki';

export function createMarkdownIt(): MarkdownIt {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    breaks: false,
  });

  md.use(footnote);
  md.use(anchor, { permalink: anchor.permalink.headerLink() });
  md.use(toc, { listType: 'ul' });
  md.use(taskLists, { enabled: true, label: true });
  md.use(container, 'warning');    // 未来 Callout 占位，v2.1 不激活视觉
  md.use(katexPlugin, { /* KATEX_OPTIONS */ });
  md.use(mermaidFencedPlugin);
  md.use(shikiFencedPlugin);

  return md;
}
```

## 附录 B | 性能预算表

```ts
// src/services/rendering/perf-budget.ts

export const PERF_BUDGET: Record<string, number> = {
  'katex:renderInline': 20,
  'katex:renderBlock': 50,
  'mermaid:render': 500,
  'shiki:highlight:first': 200,
  'shiki:highlight:warm': 10,
  'preview:full-render': 100,
  'preview:increment-patch': 30,
  'theme:switch:code-rerender': 500,
  'exporter:wechat': 2000,
  'exporter:zhihu': 1500,
  'exporter:redbook': 3000,
  'exporter:html': 1000,
  'exporter:markdown': 200,
};
```

## 附录 C | 错误码

| Code | 含义 | 严重度 |
|---|---|---|
| RENDER_KATEX_PARSE | KaTeX 语法错误 | Info（UI 级） |
| RENDER_MERMAID_PARSE | Mermaid 语法错误 | Info（UI 级） |
| RENDER_MERMAID_TIMEOUT | Mermaid 渲染超过 5s | Warn |
| RENDER_SHIKI_LANG_LOAD_FAIL | Shiki 语言加载失败 | Warn（降级到 hljs） |
| RENDER_SHIKI_RENDER_FAIL | Shiki 渲染失败 | Warn（降级到 hljs） |
| RENDER_DEGRADE | 发生降级 | Info |
| RENDER_SANITIZE_STRIPPED | sanitize 移除了标签/属性 | Info |
| EXPORT_ASSET_UPLOAD_FAIL | 资产上传失败 | Error |
| EXPORT_PLATFORM_INCOMPATIBLE | 平台完全不兼容（无降级路径） | Error |

## 附录 D | 关键文件清单

| 动作 | 路径 | 来源 |
|---|---|---|
| 新增 | `src/services/rendering/pipeline.ts` | §2.4 |
| 新增 | `src/services/rendering/version.ts` | §2.5 |
| 新增 | `src/services/rendering/markdown-it-config.ts` | 附录 A |
| 新增 | `src/services/rendering/katex-config.ts` | §3.5 |
| 新增 | `src/services/rendering/code-highlight.ts` | §7.4 |
| 新增 | `src/services/rendering/perf.ts` | §20.2 |
| 新增 | `src/services/rendering/perf-budget.ts` | 附录 B |
| 新增 | `src/services/rendering/error-audit.ts` | §4.5 |
| 新增 | `src/services/rendering/plugins/katex.ts` | §3 |
| 新增 | `src/services/rendering/plugins/mermaid.ts` | §5 |
| 新增 | `src/services/rendering/plugins/shiki.ts` | §7 |
| 新增 | `src/services/sanitize/profile-preview.ts` | §15.3 |
| 新增 | `src/services/sanitize/profile-export-base.ts` | §15.4 |
| 新增 | `src/services/exporters/types.ts` | §2.2 |
| 新增 | `src/services/exporters/{wechat,zhihu,redbook,html,markdown}/` | §2.3 |
| 新增 | `src/services/clipboard/code-copy.ts` | §9 |
| 新增 | `src/editor/extensions/Math/MathInline.ts` | §3.2 |
| 新增 | `src/editor/extensions/Math/MathBlock.ts` | §3.2 |
| 新增 | `src/components/editor/MathInlineNodeView.vue` | §3.3 |
| 新增 | `src/components/editor/MathBlockNodeView.vue` | §3.3 |
| 新增 | `src/components/editor/MermaidStagePanel.vue` | §5.2 |
| 新增 | `src/components/editor/CodeBlockView.vue` | §10.2 |
| 修改 | `src/components/preview/PreviewPane.vue` | §16 |
| 修改 | `src/stores/preview.ts` | §16.2 |
| 修改 | `src/stores/editor.ts` | §5.3 光标跟随 |
| 修改 | `src/stores/theme.ts` | §12.1 |
| 新增 | `test/rendering/golden/` | §13.4, §21 |

---

**文档结束（04-spec-rendering-core）**

---

## 2026-04-25 Implementation Alignment Note

The current nested app implementation now includes an incremental rendering-core slice aligned with this spec:

- `src/extensions/codeLanguages.ts` centralizes the lowlight language registry and registers Dart / Scala on top of the common lowlight set.
- `src/extensions/RichCodeBlock.ts` and `src/components/editor/CodeBlockView.vue` provide code-block language labels and a real clipboard copy action.
- `src/extensions/AssetImage.ts`, `src/extensions/ImageDropPaste.ts`, `src/components/editor/AssetImageNodeView.vue`, and `src/utils/asset-url.ts` define the stable local image contract: editor insertion stores Blob data through the existing IndexedDB asset store and serializes Markdown as `inkforge-asset://<assetId>` instead of transient `blob:` URLs.
- `src/components/editor/TableFloatingToolbar.vue` adds table row/column/header/merge/split/delete commands without replacing the existing FloatingToolbar or table node setup.
- `src/services/rendering/optional-renderers.ts` provides optional KaTeX and Mermaid runtime rendering. These dependencies are dynamic and non-mandatory; missing packages produce safe fallback HTML rather than mock output.
- `src/services/export/quality-detector.ts` now checks rendering-core issues that affect export parity: missing code-fence languages, unsupported language ids, temporary Blob image URLs, local asset references that must be resolved by platform exporters, and raw HTML tables.

The full project guard is still blocked by the local `node_modules` / `entities` CommonJS package resolution failure, so this note records implemented behavior rather than final task closure.

## 2026-04-25 Context Menu Alignment Note

`src/components/editor/EditorContextMenu.vue` is now wired into `EditorPanel.vue` as the shared right-click command surface for this rendering phase and the toolbar/context-menu phase. It exposes 15 actions in four groups: clipboard, formatting, insertion, and tools. Image insertion delegates to the real asset pipeline, link insertion delegates to the existing FloatingToolbar link editor, and find/replace delegates to the ProseMirror DecorationSet panel.


## 2026-04-29 Implementation Ledger

- P0-04 rendering-engine baseline is completed in the current nested app as an incremental implementation rather than a large exporter rewrite.
- Real dependency state: `katex@0.16.45` and `mermaid@11.14.0` are installed in `inkforge/package.json`; `pnpm-lock.yaml` is updated; `main.ts` imports KaTeX CSS.
- `src/services/rendering/optional-renderers.ts` now uses Vite-visible dynamic imports for KaTeX and Mermaid, matching the official KaTeX `renderToString` API and Mermaid `initialize({ startOnLoad: false })` / `render(id, source)` API. The earlier `new Function` import bridge has been removed because it cannot be reliably rewritten into browser chunks.
- Platform preview/export parity has been improved: `convertToPlatform`, `markdownToWechat`, `markdownToZhihu`, and `markdownToXiaohongshu` all render Markdown through `renderMarkdownWithOptionalEnhancements()` before platform-specific conversion.
- Existing completed slices remain active: `RichCodeBlock` + `CodeBlockView`, `AssetImage` + `ImageDropPaste` + `AssetImageNodeView`, `TableFloatingToolbar`, `EditorContextMenu`, and rendering-core checks in `quality-detector.ts`.
- Verification evidence on 2026-04-29: `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, targeted static script (`P0_04_STATIC_OK`), SFC template compile script (`P0_04_SFC_TEMPLATE_OK`), dependency API script (`KATEX_MERMAID_DEPS_OK`), and `pnpm build` all passed. The build emits expected KaTeX/Mermaid dynamic chunks and the pre-existing large chunk warning.
- Remaining larger v2.1 architecture requirements are not marked complete by this ledger: normalized AST pipeline, Shiki-first renderer, dedicated Math/Mermaid TipTap NodeViews, golden snapshot tests, exporter package split, and rendering error audit infrastructure remain governed by later 0420 specs and architecture tasks.
