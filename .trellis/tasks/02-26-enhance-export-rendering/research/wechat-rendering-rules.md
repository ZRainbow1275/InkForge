# Research: wechat-rendering-rules

- Query: 微信公众号导出渲染约束与 Markdown-to-WeChat 最佳实践；重点核对 Inkforge 现有导出链在 HTML/CSS 内联、外链/脚注、图片、表格、代码块、公式、sanitize、深色模式与素材库依赖上的真实落地情况。
- Scope: mixed
- Date: 2026-05-11

## Findings

### Files found

- `inkforge/src/services/export/wechat.ts` — WeChat HTML 导出主链；负责 sanitize、代码高亮、脚注、CSS 内联、表格增强、后处理、平台合规化。
- `inkforge/src/services/export/utils.ts` — 导出侧公共后处理；包含 task-list checkbox 替换、代码块高亮、表格增强、外链脚注生成。
- `inkforge/src/services/export/platform-rules/wechat.ts` — WeChat 专属文本与结构规则；包含 CJK/Latin 间距、内容宽度 clamp、dark-mode metadata 注入。
- `inkforge/src/services/export/platform-css.ts` — 平台 CSS 能力矩阵；定义 WeChat 对 flex/grid/transform/custom properties 等支持边界。
- `inkforge/src/services/export/quality-detector.ts` — 导出前质量检查；对 WeChat 的 CSS 变量、SVG、外链、图片宽度、`<style>`、不支持标签、Mermaid 给出告警。
- `inkforge/src/services/export/platform-export-rendering.test.ts` — 平台导出测试；验证 WeChat 最终 HTML 无 `<style>`/`class`/`javascript:`，并覆盖 thin-space、宽度 clamp、dark-mode 元数据。
- `inkforge/src/services/security/html-sanitizer.ts` — 通用 HTML sanitizer；存在 `wechat-export` 预设，但当前 WeChat 导出主链没有直接复用这套配置。
- `inkforge/src/config/security.ts` — 安全白名单与 CSS 注入规则；提供 `HTML_SECURITY` 与 `CSS_INJECTION_PATTERNS`。
- `inkforge/src/services/rendering/optional-renderers.ts` — Markdown 扩展渲染入口；Mermaid 输出 SVG，LaTeX 当前走 KaTeX `htmlAndMathml`。
- `inkforge/src/services/markdown-ext/registry.ts` — 平台降级注册表；明确把 WeChat 数学降级目标标为 `katex-html`。
- `inkforge/src/services/export/image-pipeline/uploaders/wechat-stub.ts` — WeChat 素材上传仍是 stub；任何依赖素材库上传的方案都还没有实现。
- `inkforge/src/services/export/index.ts` — `convertToNativeFormat()` 路由；WeChat native export 仍返回 HTML，而不是图片包或素材库引用包。
- `.trellis/tasks/02-26-enhance-export-rendering/prd.md` — 本任务目标；要求 WeChat 侧具备 CSS 完全内联、外链脚注、KaTeX→SVG、图片宽度限制、表格内联样式等能力。
- `.trellis/tasks/02-26-enhance-export-rendering/research-report.md` — 旧的广域对标调研；覆盖 doocs/md、wxmp、小红书、知乎，但还没有把 Inkforge 当前实现逐项对齐到行级证据。

### Code patterns

- WeChat 导出总链当前顺序是：task-list checkbox 替换 → DOMPurify sanitize → 清理空段落/连续换行 → 代码高亮 → Alert 块渲染 → 外链脚注 → 包装 `section#nice` → 生成 CSS → `juice` 内联 → 标题装饰 → 表格增强 → WeChat 后处理 → CSS 合规化 → WeChat 平台规则。见 `inkforge/src/services/export/wechat.ts:770-955`。
- 当前已做 CSS 变量替换，但实现位置在 WeChat 后处理里按字符串替换 `var(--xxx)`；不是在主题构建阶段消除变量。见 `inkforge/src/services/export/wechat.ts:69-89` 与 `inkforge/src/services/export/wechat.ts:573-575`。
- 图片处理目前只做 `width/height` 属性搬运到 inline style，并补 `max-width:100%;height:auto;`；没有把大图硬性压到 `<=640px`。见 `inkforge/src/services/export/wechat.ts:115-151`。
- 嵌套列表已做 `li > ul/ol` 提升修复，而且实现故意避免复杂正则回溯。见 `inkforge/src/services/export/wechat.ts:236-320`。
- 后处理阶段会显式剥离 `<script> / <style> / <iframe> / <object> / <embed> / <form> / <button>`、移除事件属性与 `javascript:` URL，并在较晚阶段统一删掉 `class=`，保证所有 class 依赖都必须先转成内联样式。见 `inkforge/src/services/export/wechat.ts:576-583`、`inkforge/src/services/export/wechat.ts:657-658`。
- 表格增强不是只靠 `juice`；后处理还会补 `<table>` 宽度、`th/td` 边框与 padding，说明团队已经遇到过“juice 不一定把表格每个单元格都处理完整”的现实问题。见 `inkforge/src/services/export/wechat.ts:671-705` 与 `inkforge/src/services/export/utils.ts:522-575`。
- WeChat dark-mode 元数据是后置注入的：`data-darkmode-color`、`data-darkmode-bgcolor`、`data-darkmode-original-*` 只在 `enableDarkMode` 时添加，而且是在 `enforcePlatformCSS()` 之后执行，避免被合规化阶段误删。见 `inkforge/src/services/export/platform-rules/wechat.ts:216-285` 与 `inkforge/src/services/export/wechat.ts:945-955`。
- 代码高亮使用 `highlight.js` 的 HTML 输出，再把 token class 映射为 inline style；这是正确方向，因为 WeChat 最终不会保留 class。见 `inkforge/src/services/export/utils.ts:411-469`。
- 外链脚注当前策略是“非 `mp.weixin.qq.com` 链接改写为 `span + sup`，文末输出文字脚注区”；不会保留可点击外链，也没有 URL 去重或 `mailto:/tel:` 例外处理。见 `inkforge/src/services/export/utils.ts:586-641`。
- WeChat 质量检测已经意识到 SVG、外链、安全提示、`<style>`、不支持标签、Mermaid、图片宽度等现实限制，但其中图片宽度目前只告警，不执行强制降级。见 `inkforge/src/services/export/quality-detector.ts:67-152`。
- 平台 CSS 矩阵明确把 WeChat 标成 `flexbox=false`、`grid=false`、`transform=false`、`customProperties=false`、`mediaQuery=false`、`clamp=false`，并要求所有样式内联。见 `inkforge/src/services/export/platform-css.ts:65-98`。
- 测试已经把 WeChat 最终结果定义成“无 `<style>`、无 `<script>/<iframe>/<form>/<input>`、无 `class=`、无 `javascript:`、无 `display:flex/gap/var(...)`，但有 inline style 与图片/表格降级结果”。见 `inkforge/src/services/export/platform-export-rendering.test.ts:41-69`。
- 公式当前并没有做“KaTeX → SVG”。`renderLatex()` 直接调用 `katex.renderToString(..., { output: 'htmlAndMathml' })`，也就是输出带 class 的 HTML/MathML。见 `inkforge/src/services/rendering/optional-renderers.ts:46-60`。
- 平台扩展注册表也把 WeChat 数学降级写成 `katex-html`，进一步说明“KaTeX→SVG”在当前代码里尚未落地。见 `inkforge/src/services/markdown-ext/registry.ts:94-127`。
- KaTeX 样式目前依赖应用级全局 CSS 引入 `katex/dist/katex.min.css`；这适合预览，不适合要求“导出 HTML 完全自包含”的 WeChat 粘贴链。见 `inkforge/src/main.ts:22`。
- WeChat 专用素材上传仍未实现；任何“把公式/Mermaid/SVG/封面变成微信素材库资源”的方案都被 `WechatUploader.upload` stub 卡住。见 `inkforge/src/services/export/image-pipeline/uploaders/wechat-stub.ts:3-8`。
- `convertToNativeFormat()` 对 WeChat 仍然直接返回 HTML，说明当前产品抽象还没有进入“素材上传 + 资源回写 + HTML 替换”这一层。见 `inkforge/src/services/export/index.ts:297-336`。
- 通用 `sanitizeHTMLWechat()` 与 WeChat 导出主链里的自定义 DOMPurify 配置并不是一套逻辑：前者允许 `data-*` 与更宽的通用标签集合，后者在主链里把 `ALLOW_DATA_ATTR` 设成 `false`，再在最后重建自己真正需要的 `data-wechat-clamp` / `data-darkmode-*`。这是潜在配置漂移点。见 `inkforge/src/services/security/html-sanitizer.ts:105-140`、`inkforge/src/services/security/html-sanitizer.ts:185-250`、`inkforge/src/services/security/html-sanitizer.ts:588-589` 与 `inkforge/src/services/export/wechat.ts:832-865`。

### External references

- WeChat 对标项目 `doocs/md` 最新 release 为 `v2.1.0`（2025-10-17 发布），仍把自己定义为“Markdown 文档自动即时渲染为微信图文”的主流基线项目。Release: <https://github.com/doocs/md/releases/tag/v2.1.0>
- `doocs/md` 当前源码仍使用 `juice(...inlinePseudoElements...)`、`modifyHtmlStructure()` 修复 `li > ul/ol`、`solveWeChatImage()` 把 `width/height` 改成 inline style，并明确关闭 `resolveCSSVariables` 交给前置变量处理。Source: <https://raw.githubusercontent.com/doocs/md/main/apps/web/src/utils/index.ts>
- `wxmp` 最新 release 为 `v2.4.1`（2025-05-27 发布）；README 直接写明 GFM 脚注“不支持完整注脚特性”，原因是“微信文章不支持锚点跳转和打开第三方 URL 超链接”，并且“表格无法使用自定义样式”。Release/API surface: <https://github.com/jaywcjlove/wxmp/releases/tag/v2.4.1> , README: <https://raw.githubusercontent.com/jaywcjlove/wxmp/master/README.md>
- `juice` 官方 README 说明 `inlinePseudoElements` 会把 `::before/::after` 真实插入 DOM，`removeStyleTags` 会移除原始 `<style>`，`resolveCSSVariables` 默认是 `true`。这对 WeChat“只认最终 inline 结果”很关键。 Source: <https://github.com/Automattic/juice>
- `highlight.js` 官方 API 文档明确 `highlight()` / `highlightAuto()` 返回的是带高亮标记的 HTML 字符串 `value`，不是 inline style；因此导出链如果目标平台不保留 class，必须再做 class→style 转换。 Source: <https://highlightjs.readthedocs.io/en/latest/api.html>
- KaTeX 官方 API 文档明确 `renderToString()` 生成的是 HTML 字符串，示例输出以 `<span class="katex">...</span>` 开头，而不是 SVG。若要“自包含且不依赖 KaTeX CSS”，不能把 `renderToString()` 误当成 SVG 输出。 Source: <https://katex.org/docs/api.html>
- MathJax 官方 `SVG Support` 文档明确 SVG 输出“相对 self-contained”，不依赖字体文件，可作为独立图像保存；如果任务坚持“公式 -> SVG/静态资源”而不是“公式 -> CSS 依赖 HTML”，MathJax SVG 比 KaTeX HTML 更贴近目标。 Source: <https://docs.mathjax.org/en/latest/output/svg.html>
- 2026-05-11 联网核验到的当前依赖版本：`juice 11.1.1`、`highlight.js 11.11.1`、`katex 0.16.45`、`mathjax-full 3.2.2`。这说明如果要对齐最新生态，Inkforge 的“KaTeX→SVG”需求更像是渲染策略变更，不是靠升级 KaTeX 版本自然获得。

### Related specs

- `.trellis/spec/frontend/index.md` — frontend 总入口，目前多为框架占位，没有 export 专用规则。
- `.trellis/spec/frontend/quality-guidelines.md` — 通用质量门，当前没有单独覆盖 export/rendering 这一层。
- `.trellis/spec/frontend/type-safety.md` — 类型约束总表；这条线如果后续新增 export/image-pipeline 合同，应在这里落类型边界。
- `.trellis/spec/guides/cross-platform-thinking-guide.md` — 要求外部 API/格式必须核实，不要靠记忆猜测平台契约。
- `.trellis/spec/guides/code-reuse-thinking-guide.md` — 提醒避免重复实现 sanitizer / export rule；对当前“双 sanitizer 路径”尤其 relevant。

### Recommended direction

- 把 WeChat 渲染需求拆成两层，不要混成一句“KaTeX→SVG”：
  - Layer A: 可粘贴 HTML 约束。这里的核心是 inline CSS、无 class 依赖、无 `<style>`、无 unsupported tags、外链脚注、表格与 blockquote 降级。
  - Layer B: 平台外部资源策略。这里的核心是“哪些内容必须变成静态图片/素材库资源”，包括大图、SVG、Mermaid、数学公式、封面。
- 如果只做 Layer A，当前 Inkforge 已经接近完成，主要补缺是“图片硬限制”和“规则文档化”。
- 如果要真做 Layer B，优先级应是：
  - 先实现 `WechatUploader.upload`
  - 再决定数学公式是 `MathJax SVG` 还是“渲染为图片后上传素材库”
  - 最后再收敛 `thumb_media_id` / 素材校验 / URL 回写
- 不建议把 `sanitizeHTMLWechat()` 与 `convertToWechatWithStats()` 两套规则继续并行扩张；更稳妥的方向是抽出一份明确的 WeChat export allowlist / transform order，避免将来一边改了 `html-sanitizer.ts`，另一边导出结果没变。

## Caveats / Not Found

- 复核结果：`quality-detector.ts` 当前注释引用的是 `docs/platform-rendering-rules/wechat-rules.md`，该文件实际存在；早期提到的 `inkforge/docs/platform-rendering-rules/wechat-rules.md` 是过期路径说法，不应继续作为缺陷记录。
- 当前任务目录最初没有 `research/` 子目录，而且在当前受限 PowerShell/沙箱环境下创建该目录曾触发 `WinError 5 Access denied`；如果本文件最终能写入，说明是通过补充写权限路径解决的，而不是原环境天然可写。
- 没找到 Inkforge 仓内的 WeChat 真实素材库上传实现，也没找到 `thumb_media_id` / `cgi-bin/material/*` 的实际调用点；现阶段任何“SVG 转素材链接”的方案都还是设计层而不是已集成能力。
- 没找到 WeChat 官方公开的“HTML/CSS 支持白名单”单页文档；现有规则更多来自主流开源工具长期实践、官方/半官方 API 文档、以及当前代码库自身的测试与限制注释。
- WeChat dark-mode `data-darkmode-*` 的注入规则在本仓已有实现，但没有找到仓内额外文档解释其来源；后续如要继续依赖，建议补 spec 或 runbook。
