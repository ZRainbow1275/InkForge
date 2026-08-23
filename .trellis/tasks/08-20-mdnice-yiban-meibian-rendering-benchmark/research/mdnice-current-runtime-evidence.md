# mdnice 当前在线运行时与复制链路证据

> 采集日期：2026-08-20  
> 研究边界：只读观察公开页面、当前已登录编辑器的结构与公开静态资源；未读取文章正文、账号资料、Cookie、Token、二维码或私有 API 响应，未新建、修改、保存或发布文章。

## 1. 当前产品入口

- 社区入口：<https://mdnice.com/>，标题为“墨滴 | 看颜值的文章社区”。
- 在线编辑器：<https://editor.mdnice.com/>，标题为“Markdown | 让排版变 Nice”。
- 社区首页明确提供 Windows/macOS 客户端、浏览器插件和完整教程入口；在线编辑器是独立子域应用。
- 本次复用了项目默认的唯一 CloakBrowser 实例。会话原本已有登录态，因此没有出现需要用户重新登录的 gate；研究过程中未触碰已有文章内容。

## 2. 浏览器与网络观察

编辑器首次加载的可见静态入口：

- `static/css/main.c5b1c0c3.chunk.css`
- `static/js/main.7214cd8f.chunk.js`
- `static/js/chunk-lib.codemirror.51d28bf0.chunk.js`
- `static/js/chunk-lib.prettier.d9a30848.chunk.js`
- `static/js/chunk-mathjax.3b640616.chunk.js`

当前加载阶段还出现 `users/self`、`options`、`catalogs`、`users/capacities/self` 和 `articles/search` 等 API 请求。这里只记录路径存在，不读取或保存响应体与认证头。

公开静态资源校验：

| 资源 | 字节数 | SHA-256 |
|---|---:|---|
| `main.7214cd8f.chunk.js` | 3,642,408 | `214577c4f99804f9167e5a39d0ba65c9b418710e0073bca287164b42b36264e9` |
| `main.c5b1c0c3.chunk.css` | 760,822 | `9882d27ad280134c4a103c93fce1709c8e01dedea7d2b64db41e1b7ab593dfa5` |

对应 `.map` URL 均返回 HTTP 404。因此以下结论来自当前生产 bundle 的结构化字符串/调用链还原与浏览器 DOM 观察，不依赖 source map。

## 3. 当前 Markdown 到预览 DOM

生产 bundle 显示的主链路是：

1. `markdown-it` 以 `html: true` 工作；代码块交给 `highlight.js`，输出 `pre.custom > code.hljs`。
2. 标题内容被拆成 `span.prefix + span.content + span.suffix`，便于主题用稳定锚点绘制前后装饰。
3. 表格外包 `section.table-container`；列表项内容再包一层 `section`。
4. 公式、脚注、TOC、图片/图注、链接、引用块和自定义 `block-1` 至 `block-5`、双栏容器均在 Markdown token/renderer 阶段形成稳定结构。
5. 预览挂到 `section#nice`，并带 `data-tool="mdnice编辑器"`、`data-website="https://www.mdnice.com"` 标记。
6. 左侧是 CodeMirror，右侧实时预览；主题、样式、功能和平台复制入口围绕同一预览树工作，并非多套互不一致的渲染器。

### 可借鉴点

- `prefix/content/suffix`、`table-container`、列表内层 `section` 都属于低成本、可测试的稳定 DOM 锚点。
- 自定义容器不是任意组件系统，而是少量固定语法与固定结构，避免模板执行时再猜 DOM。
- InkForge 已有自己的装饰与 SVG 模块契约；若现有 DOM 已提供等价锚点，应复用而不是平行增加一套 mdnice 结构。

## 4. 主题与样式编辑机制

当前 bundle 使用一个 Constructable Stylesheet：

- 用 `CSSStyleSheet.replaceSync()` 装载主题 CSS。
- 按 `selectorText` 合并重复规则，并用 `Map` 建立 selector 到 CSS rule 的索引。
- 用户调整某个样式值时，直接修改命中的 `CSSStyleRule.style`；不存在的 selector 才插入空规则。
- 主题模型把样式项映射到 selector/property，并对素材主色、辅助色执行集中替换。
- 预览使用同一张动态样式表；复制时再序列化其全部规则。

这比“每换一次配置就重建整篇 HTML”更适合实时调色/微调，但 InkForge 不需要照搬其完整主题管理 UI。最小可用借鉴是：继续复用现有主题/模块，只把高频可解释 token（主色、辅助色、字号、行高、段距、圆角等）暴露成有限控件，并保证它们仍进入同一导出链路。

## 5. 微信复制的真实链路

从当前生产 bundle 还原出的微信分支：

1. 用户点击 `#nice-sidebar-wechat`。
2. 入口先检查登录态与当前文章是否存在。
3. 暂存 `#nice.innerHTML`。
4. 将 MathJax 容器转换成适合复制的 SVG 包装：移除 SVG 的 `width`/`height` attribute，把尺寸移到 inline style，并补齐外层 `g`；行内和块级公式分别落到稳定 `span.inline-equation` / `section.block-equation` 结构并保留公式数据。
5. 为预览顶层子节点补 `data-tool="mdnice编辑器"`。
6. 取 `nice-rich-text-box.innerHTML`，合并代码主题 CSS 与当前动态主题 CSS。
7. 用 Juice `inlineContent()` 执行 CSS 内联，参数包含 `inlinePseudoElements: true` 与 `preserveImportant: true`。
8. 立刻恢复原来的 `#nice.innerHTML`，因此“为复制而改 DOM”不会污染持续编辑状态。
9. 创建屏幕外 input，监听一次 `copy` 事件，同时写入 `text/html` 与 `text/plain`，再调用 `document.execCommand('copy')`。

知乎是独立分支：公式转为知乎公式图片，代码和表格还会做面向其编辑器的结构修正。这个分支隔离值得保留，但其具体 hack 不应进入微信通用链路。

### 对齐微信的关键不是某个 SVG 技巧

mdnice 的核心做法是“同一预览树 + 平台复制前短暂规范化 + 全量 CSS 内联 + 精确 MIME 写入”。SVG 只是其中一个节点类型；真正减少漂移的是复制产物与预览共源，并且复制前转换可逆、平台分支清楚。

## 6. 与 InkForge 当前能力的差异

InkForge 当前 dirty source 已经具备 Markdown 渲染、代码高亮、KaTeX/Mermaid 降级、DOMPurify、Juice 11、主题/自定义 CSS、装饰、SVG 模块、微信平台 CSS 与合规转换；不应再建第二套 mdnice 式 renderer。该结论不是 `main` 或 release 能力声明。

后续 dirty-source 复核表明，以下能力在该工作树中**已存在，不应在包含它们的实施基线上重复建设**：ExportModal/Publish Center 已显示 quality、preflight、style-proof 和外部门禁；preview 与 copy 共享 canonical `nativeResult.content`，但 copy 会先做 channel preparation/entity encoding，因此 clipboard payload 不是字节级同一内容；字体、字号、主题色与 SVG 插槽已有控件；官方微信草稿已在 dev HEAD，脱敏 live round-trip receipt 仅在 dirty source。

仍值得保留的启示只有：

1. **平台分支保持窄而明确**：微信 SVG/链接/表格规则留在微信后处理，知乎或其他平台特例不污染共用渲染阶段。
2. **只按失败证据补 DOM 锚点**：当前已有稳定结构和 13/13 可选样式渲染证明；没有选择器碰撞或真实平台失败前，不机械增加 mdnice 的 class/包装。
3. **视觉公式是候选，不是默认改动**：先用 exact-artifact corpus 与真实微信 paste/draft/phone 证据比较 SVG、图片和现有可读 TeX fallback，再决定是否改变输出。
4. **保留更强安全边界**：当前 mdnice bundle 可见 `html: true` 与 `dangerouslySetInnerHTML`，但未发现 DOMPurify 标识；这只构成静态风险信号，不作为已验证漏洞。InkForge 已有 DOMPurify，不应为兼容性删除或绕过。

## 7. 暂不采纳

- 不复制 mdnice 的生产 bundle、私有主题素材、SVG 或 class 命名。
- 不退回仅靠 `execCommand` 的剪贴板实现；InkForge 现有现代 Clipboard API + fallback 路径更合理。
- 不为了“成熟感”增加云文章库、会员、社区、AI 对话或任意主题市场；它们不直接解决本轮微信交付问题。
- 不把静态 bundle 推断冒充微信后台粘贴后的实机验收。最终外部 fidelity 仍需要真实微信公众号编辑器 paste/readback 证据。
