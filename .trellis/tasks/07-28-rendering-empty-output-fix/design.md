# Technical Design — 渲染结果为空专项修复

## 1. Scope

- 修复真实 Tauri/WebView2 软件中“选择了预设但正文近似裸文本”和自动 SVG 尾标超大/裁切。
- 保留 Vue 3、TipTap、Markdown、Pinia、Dexie、现有 `themePresets`、装饰器、SVG 模块与平台导出管线。
- 在共享渲染根因修复后，沿同一权威链加入 doocs/md 风格组件入口；不创建第二套主题或渲染引擎，不增加依赖。
- 知乎/小红书发布、微信同步/发布/手机预览不属于本轮本地软件验收。

## 2. Invariants

1. Markdown 是文稿权威；平台预览、复制和导出均为派生产物。
2. 一个被接受的预览 token 只调用一次当前 `preset.decorate()`；旧异步结果不能覆盖新选择。
3. 原始 Markdown HTML 先净化，InkForge 可信装饰器后执行；装饰后不得再被通用净化静默破坏。
4. 平台宿主只控制画布宽度、滚动、包含和背景，不用宽泛 `!important` 改写文章内部排版。
5. 外层 SVG 使用 `width="100%"`、有效 `viewBox` 和有界纵横比；模块不能依赖固定像素宽度撑破移动画布。
6. 结构可自动生成，内容不得编造。缺失真实组件字段时保持待填写/待绑定，不输出假数据。

## 3. Shared rendering repair

```text
current Markdown
  -> existing async Markdown renderer
  -> sanitize untrusted Markdown-origin HTML
  -> selected preset.decorate(html, target) exactly once
  -> generateThemeCSS(preset, target)
  -> platform fidelity wrapper
  -> Stage / split / full preview
```

### 3.1 Preview parity

- 移除普通主题装饰器对 `target === 'preview'` 的无条件旁路；预览与微信导出共享语义装饰规则。
- 只把真正依赖平台终端行为的部分做 target 分支，并提供静态、安全的预览降级。
- `renderWechatMockHtml()` 保留画布基线和选择器重写，但不得覆盖嵌套标题、段落、引用、列表、卡片或 SVG 模块样式。

### 3.2 Plain-body treatment

- 普通段落也必须体现当前 persona：首段、段落间距、正文色/字号/行高、强调、链接和节奏由现有主题 token/CSS 负责。
- 装饰器只基于已有语义转换标题、引用、列表、表格、图片和显式组件，不从普通文字猜测时间线、数字或来源。
- 每个普通预设至少保留一个既有独特签名；差异通过已有 `visualSignature`、主题 CSS 与装饰配方呈现，而非复制旗舰模板换色。

### 3.3 Responsive SVG

- 在 SVG 模块生成根处统一校正外层宽度、`viewBox`、`preserveAspectRatio`、容器 `max-width` 和溢出，不在每个预览表面加缩放补丁。
- 自动结尾模块采用适合文章流的有界变体。短文或缺少语义结构时仍可显示品牌结尾，但高度不得主导整屏。
- 断言所有自动注入 SVG 在 320–586px 画布中宽高非零、无横向溢出、无 `script`/`foreignObject`。

## 4. Typed component architecture

### 4.1 Canonical model

```ts
type InkComponentNode = {
  componentId: string
  version: number
  props: Record<string, string | number | boolean | string[]>
}
```

- 组件定义集中在现有 `markdown-ext`/导出服务附近，使用已安装 Zod 验证 ID、版本、属性和自定义模板。
- 内置项复用现有 `html-blocks`、SVG 模块和 `delivery-adornments`；不重复实现时间线、对比、数据、图集、来源、歌曲、图片、链接、文章和联系人数据模型。
- 用户组件与内置组件进入同一只读合并注册表；持久化沿现有设置/Dexie，不保存可执行函数。

### 4.2 TipTap and Markdown round-trip

```text
Markdown JSX
  -> renderInkforgeMarkdownExtensions()
  -> <section data-ink-component ...>
  -> TipTap atomic inkComponent NodeView

TipTap document
  -> serializeHtmlToMarkdown()
  -> <ComponentName prop="..." />
```

- NodeView 可选择、打开属性编辑器、删除和移动；其控制按钮不进入导出 HTML。
- `TyporaMode.nodeToMarkdown()` 在通用容器降级前识别 `data-ink-component`，按组件 Schema 以稳定属性顺序序列化。
- 解析跳过 fenced code block；未知/过期组件显示可恢复错误块并保留原始语法。
- 插入位置使用 `BlockBoundaryInsertion`，组件库关闭/插入后恢复焦点和选择。

### 4.3 Component library UI

- 使用现有对话框、表单、按钮和 Lucide 图标风格，提供内置/自定义页签、搜索、展开属性、必填校验、即时预览、插入、新建/编辑/删除/导入/导出。
- 可从编辑器插入入口和斜杠命令打开；两者调用同一服务和同一光标插入动作。
- 即时预览调用当前真实组件渲染器与所选预设，不维护示例 HTML。

### 4.4 Platform output

- WeChat：安全 HTML/SVG；只有字段完整且现有规则允许时输出平台标签。
- XHS：保留语义数据，生成现有文本/卡片/图片产物的安全降级。
- Zhihu：语义 Markdown/HTML；复杂 SVG 走现有图片 fallback。
- 编辑器控制 UI、内部数据属性和未完成状态不进入最终平台 payload。

## 5. Compatibility and security

- 既有文稿无组件语法时行为不变。
- 未知 JSX 标签保持普通 Markdown；只有注册的 PascalCase 名称进入组件解析。
- 自定义导入限制文件大小、组件数、属性数、模板长度和允许标签/属性；拒绝脚本、事件、iframe、外链执行内容与原型污染键。
- 既有预设 ID、导出历史、文章、素材和账号设置不迁移、不清空、不删除。

## 6. Validation

1. 先建立失败回归：普通预设 preview 旁路、普通段落近似裸文本、尾标 SVG 溢出。
2. 同一真实文稿 fixture 遍历 16 个微信预设，断言非空正文、独特签名、响应式 SVG 和无危险节点。
3. 组件 parser/serializer、代码围栏、未知组件、必填校验、TipTap 往返、保存重开和平台降级测试。
4. 精确 ESLint、`vue-tsc --noEmit`、生产构建、相关导出套件串行运行。
5. 构建真实 `InkForge.exe`，在 Tauri/WebView2 逐个切换 16 个预设，验证 Stage、分栏、全屏与复制产物；记录新构建与可见几何证据。

## 7. Rollback

- 渲染共享根修复、SVG 几何修复、组件语法/NodeView/UI 分切片实施，各自具备聚焦测试。
- 任一组件 UI 切片回退时，基础主题与 SVG 修复仍独立可用。
- 不删除旧组件、主题、模块或存储记录；回退不需要数据清理。
