# 渲染引擎 + 写作增强

## 规格参考
- `prompts/0327/04-rendering-engine-spec.md` (完整规范, 1324 行)

## 背景
渲染功能存在硬伤: 代码块语言覆盖不足、无数学公式支持、无图表支持、无右键菜单、无查找替换、图片交互原始。

## 当前基线差距
- 风险: 代码高亮使用 `createLowlight(common)` (~35 语言)，可优化为按需加载
- 缺失: KaTeX 数学公式不存在
- 缺失: Mermaid 图表不存在
- 缺失: EditorContextMenu.vue 不存在
- 缺失: FindReplace.vue 不存在 (在 03 任务中创建)
- 缺失: 无拖拽图片插入 / 剪贴板图片粘贴
- 风险: 表格无浮动工具栏 / 斑马纹
- 风险: 图片无拖拽调整大小 / 对齐 / caption

## Requirements

### 1. 代码块增强
- 25+ 语言按需加载: JS/TS/Python/Java/C++/C#/Go/Rust/SQL/Bash/JSON/YAML/XML/CSS/Markdown/diff/shell/PHP/Ruby/Swift/Kotlin/Dart/Lua/R/Scala
- 新建 `CodeBlockView.vue` NodeView:
  - 左上角语言标签 (灰色 pill)
  - 右上角复制按钮 (Copy → Check 动画)
  - 可选: 行号显示

### 2. KaTeX 数学公式 (可选依赖)
- 新建 `inkforge/src/extensions/Mathematics.ts`
- 行内: `$...$` → MathInline Node
- 块级: `$$...$$` → MathBlock Node
- 依赖: `katex` (动态导入 `import('katex')`)
- 渲染: `katex.renderToString(tex, { throwOnError: false })`

### 3. Mermaid 图表 (可选依赖)
- 新建 `inkforge/src/extensions/MermaidBlock.ts` + `MermaidNodeView.vue`
- 当代码块语言为 `mermaid` 时渲染为 SVG
- 依赖: `mermaid` (动态导入)
- 编辑/预览双视图切换

### 4. 表格增强
- 表格选中时浮动工具栏: 增删行列 / 合并拆分 / 设表头
- 斑马纹: 奇偶行背景色
- 导出时样式内联

### 5. 图片增强
- 拖拽调整大小 (四角 handle)
- 对齐: 左/中/右 (data-align attribute)
- Caption: 图片下方可编辑文本
- 加载失败占位 (ImageOff 图标 + 灰色虚线框)

### 6. EditorContextMenu.vue (与 05 规范共享)
新建 `inkforge/src/components/editor/EditorContextMenu.vue`:
- **15 项 4 分组**:
  - 剪贴板 (3): 剪切/复制/粘贴
  - 格式 (5): 粗体/斜体/删除线/行内代码/清除格式
  - 插入 (4): 链接/图片/表格/分割线
  - 工具 (3): 查找替换/选区字数/在新窗口打开
- Props: `editor: Editor`, `x: number`, `y: number`, `visible: boolean`
- 固定定位, z-index 200, min-width 220px, rounded-lg, shadow-lg
- 点击外部 / ESC 关闭

### 7. 拖拽图片插入
- dragover/dragleave/drop 事件在 EditorPanel.vue
- 500KB 阈值: 小图 base64 / 大图存 IndexedDB
- 拖拽 overlay: 虚线边框 + "释放以插入图片"

### 8. 剪贴板图片粘贴
- ProseMirror `handlePaste` Plugin
- 支持: 截图工具 / 浏览器复制图片 / 图片编辑软件
- 同样 500KB 阈值

### 9. 预览一致性
- 参照 doocs/md 质量标准
- 平台渲染约束 (微信不支持 class/SVG/CSS变量)
- `quality-detector.ts` 10 项检测清单

## Acceptance Criteria
- [x] 代码块 25+ 语言高亮 + 语言标签 + 复制按钮
- [x] KaTeX 行内/块级渲染正常 (如果安装 katex)
- [x] Mermaid 图表渲染正常 (如果安装 mermaid)
- [x] 表格浮动工具栏 + 斑马纹
- [x] 图片拖拽调整大小 + 对齐 + caption
- [x] EditorContextMenu 15 项菜单正常
- [x] 拖拽/粘贴图片插入正常
- [x] `cd inkforge && npx vue-tsc --noEmit` 零错误

## 2026-04-25 Implementation Note
- Implemented rendering-engine vertical slices in the nested `inkforge/` app without deleting existing editor modes, toolbar, slash commands, asset store, or export logic.
- Code blocks now use a dedicated lowlight registry covering 37 languages, including the requested JS/TS/Python/Java/C/C++/C#/Go/Rust/SQL/Bash/JSON/YAML/XML/CSS/Markdown/diff/PHP/Ruby/Swift/Kotlin/Dart/Lua/R/Scala set, plus `RichCodeBlock` / `CodeBlockView.vue` for a language pill and copy button.
- Image insertion now has a real asset pipeline path: drag/drop, clipboard paste, and slash-command image insertion call `assetStore.uploadAsset()`, persist the Blob in IndexedDB, insert a stable `inkforge-asset://<id>` Markdown reference, and render via `AssetImageNodeView.vue` with resize handles, left/center/right alignment, caption input, copy source, delete, and ImageOff fallback.
- Table editing now has `TableFloatingToolbar.vue` with row/column insertion and deletion, header row toggle, merge/split cells, and delete-table commands; existing zebra-row CSS remains active.
- Preview consistency now routes Markdown through `renderMarkdownWithOptionalEnhancements()`: KaTeX and Mermaid are dynamically imported only when installed, otherwise safe fallback HTML is rendered. DOMPurify allowlists the extra math/SVG tags/attrs needed by these optional renderers.
- `quality-detector.ts` now adds rendering-core checks for unlabeled code fences, unsupported code languages, temporary `blob:` image URLs, internal `inkforge-asset://` image references before platform export, and HTML tables requiring inline export styles.
- Targeted syntax guards passed for all touched TS files and Vue script/template blocks. Full `pnpm -C D:/Desktop/Inkforge/inkforge exec vue-tsc --noEmit` remains blocked by the known local `node_modules` issue (`entities/dist/commonjs/decode.js: exports is not defined` / package ACL-resolution failure), so this task remains pending until the environment guard can run cleanly.
- Follow-up on the same implementation date: `EditorContextMenu.vue` was added and wired into `EditorPanel.vue` as the shared p0-04 / p1-05 right-click surface. It provides the required 15 real actions across clipboard, formatting, insertion, and tools groups, reusing existing editor commands and the real asset/link/find-replace flows rather than mock handlers.


## 2026-04-29 Completion Note

- Completed the P0-04 rendering-engine baseline as a real vertical slice across editor extensions, editor UI, preview rendering, export conversion, and quality detection.
- Code highlighting is backed by `src/extensions/codeLanguages.ts`, `RichCodeBlock.ts`, and `CodeBlockView.vue`, covering the required 25-language matrix and exposing language pills plus a real clipboard copy action.
- KaTeX and Mermaid are now real installed dependencies: `katex@0.16.45` and `mermaid@11.14.0`. `optional-renderers.ts` now uses Vite-visible `import('katex')` / `import('mermaid')` instead of a `new Function` dynamic import bridge, so production build emits real KaTeX / Mermaid chunks.
- `main.ts` imports `katex/dist/katex.min.css`, and `convertToPlatform()`, `markdownToWechat()`, `markdownToZhihu()`, and `markdownToXiaohongshu()` now route Markdown through `renderMarkdownWithOptionalEnhancements()` before platform adaptation, keeping editor preview and export conversion on the same optional rendering path.
- Image insertion is real: drag/drop, paste, slash-command insertion, and context-menu insertion use the existing IndexedDB asset store and stable `inkforge-asset://<id>` references; image NodeView supports resizing, alignment, captions, copy source, delete, and ImageOff fallback.
- Table editing is real through `TableFloatingToolbar.vue` with row, column, header, merge, split, and delete commands; TipTap table remains `resizable: true`.
- `EditorContextMenu.vue` provides 15 real actions across clipboard, formatting, insertion, and tools groups; link, image, table, divider, find/replace, and selection count paths delegate to existing live editor flows.
- Verified on 2026-04-29 with: `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, `P0_04_STATIC_OK`, `P0_04_SFC_TEMPLATE_OK`, `KATEX_MERMAID_DEPS_OK`, and `pnpm build`. Build succeeds with existing large chunk warnings; Mermaid / KaTeX chunks are expected after enabling real optional renderers.
- Scope boundary: the full 0420 rendering-core spec still describes a future normalized AST/exporter architecture, Shiki-first highlighting, golden tests, status/audit error codes, and dedicated Math/Mermaid TipTap node views. This P0-04 completion does not claim those larger architecture items; it completes the current app's incremental rendering baseline without deleting existing modules.
