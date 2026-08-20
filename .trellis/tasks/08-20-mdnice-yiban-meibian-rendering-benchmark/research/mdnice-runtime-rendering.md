# Research: mdnice 公开产品边界、渲染/复制机制与 InkForge 启示

- Query: 调查 `mdnice.com` / `editor.mdnice.com` 作为成熟 Markdown-to-WeChat 编辑器的公开产品行为、Markdown/主题/HTML/CSS/SVG/剪贴板链路、公式/代码/图片处理与预览一致性，并映射到 InkForge 当前实现。
- Scope: mixed（外部官方资料、公开生产静态资源、官方开源历史源码、任务内当前运行态证据、InkForge 当前 dirty source/规格）
- Date: 2026-08-20（Asia/Shanghai）
- Task boundary: 仅研究；未修改产品代码，未安装依赖，未登录、授权、上传、复制到平台、保存或发布内容；未启动第二个浏览器。

## 证据分级

为避免把营销文案、旧源码或静态字符串写成当前事实，本文使用以下标签：

- **V-HTTP**：本轮直接请求公开 URL 后验证的响应、HTML 或静态资源事实。
- **V-SOURCE**：mdnice 官方 GitHub/NPM 可复核源码或元数据；必须同时注明年代。
- **V-RUNTIME**：本任务内唯一浏览器会话及当前生产 bundle 还原的证据，索引见 `research/mdnice-current-runtime-evidence.md`。
- **DOC**：mdnice 官方产品页/教程的声明；文章多发布于 2019 年，不自动等于 2026 年当前运行态。
- **INFERENCE**：由多个证据推得的设计意图或建议，不是平台行为证明。
- **NOT VERIFIED**：本轮没有取得真实剪贴板、微信公众号粘贴/readback、移动端或账号 API 证据。

## 方法、时间与降级记录

| 时间（UTC+8） | 方法 | 范围与结果 | 限制/降级原因 |
|---|---|---|---|
| 2026-08-20 | `grok-search.plan_intent`，level 3，session `7d751cea4b5e` | 将问题拆为官方产品资料、官方源码/管线、公式/代码/图片、公开静态资源、预览/剪贴板五组 | Grok provider 返回 provider error；没有把失败搜索摘要当证据 |
| 2026-08-20 | Grok search + Exa 独立核验 | Exa 命中 mdnice 官方产品/教程/开发者页和官方 GitHub；随后均用直接 HTTP 或官方源码再核验 | Grok 的 `web_fetch` 下游 Firecrawl 返回 HTTP 403 / `account banned`；这是工具账户状态，不是 mdnice 站点封禁结论 |
| 17:47:13 | 直接 HTTP GET `https://editor.mdnice.com/` | 200；5,236 bytes；空 `#root`、`noscript` JS 门槛、生产资源清单 | 无 JS 时没有运行态 DOM |
| 17:47:38 | 直接 HTTP HEAD 生产资源 | 验证主 JS、CSS、CodeMirror、Prettier、MathJax chunk 的状态、大小与更新时间 | HEAD 只证明资源存在，不证明代码路径已执行 |
| 17:48:09 | 只读扫描当前主 bundle | 独立定位 `markdown-it`、Juice、MathJax、highlight.js、CodeMirror、复制事件、当前主题 CSS 序列化和公开域名/endpoint 字符串 | 无 source map；静态调用链不等于真实粘贴成功 |
| 17:49:21 | 直接 HTTP GET 9 个官方产品/教程页并抽取正文 | 各页 200；核验教程标题、发布日期、功能声明和已知限制 | 页面 `Last-Modified` 是 2025 静态站构建时间，不能替代文章自身日期 |
| 17:49:57 | GitHub API、raw GitHub、NPM registry | 核验官方仓库 SHA、文件历史、NPM 版本与依赖 | 开源组件/源码主要停在 2020 年，不能代表 2025 生产 SaaS 的全部实现 |
| 同日 | InkForge 当前 dirty source/规格与任务内证据 | 映射渲染、主题、剪贴板、SVG 与外部 proof gates | 不是 `main`/release 能力证明；当前 task 仍为 planning，未运行 `task.py start` |

补充网络差异：本轮 shell 对 `https://mdnice.com/` 的直接请求约 31.5 秒超时；任务内唯一浏览器会话能够打开该社区入口（`mdnice-current-runtime-evidence.md:8-11`），所以这只能记为**当前 HTTP 工具路径超时**，不能写成站点不可用。

## Files Found

| 文件 | 一句话说明 |
|---|---|
| `.trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/prd.md` | 本研究 R1-R7、证据/账号/规划边界的权威任务输入 |
| `.trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/research/mdnice-current-runtime-evidence.md` | 根线程唯一浏览器会话与当前生产 bundle 的 DOM/网络/复制链路证据，避免本线程重复开浏览器 |
| `.trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/research/inkforge-current-rendering-baseline.md` | InkForge 当前单一微信渲染链、现有 proof gates 与已覆盖市场研究 |
| `inkforge/src/services/rendering/optional-renderers.ts:107-129` | Markdown 增强：CJK emphasis、Mermaid、LaTeX、InkForge 扩展，最后 `marked.parse({ breaks:true, gfm:true })` |
| `inkforge/src/services/export/wechat.ts:280-336` | 当前微信公式把 KaTeX/TeX 降级为自包含、可读的“公式：TeX” HTML，而非视觉公式 |
| `inkforge/src/services/export/wechat.ts:1199-1453` | 当前微信 HTML 主链：安全化、高亮、脚注、主题、Juice、装饰/SVG、表格及平台合规 |
| `inkforge/src/services/export/wechat.ts:1479-1488` | Markdown → lazy-enhanced HTML → 微信格式入口 |
| `inkforge/src/services/export/themes.ts:1757-1816` | 主题的 preview/export 双轨 CSS 与 `#nice` scoped CSS |
| `inkforge/src/services/export/utils.ts:954-1060` | 微信 HTML 准备、`ClipboardItem` 双 MIME 富文本复制、失败闭合和 `execCommand` 后备 |
| `inkforge/src/services/export/preview-fidelity/wechat-mock.ts:1-15` | 本地 mock wrapper 明确不自行执行 Juice/DOMPurify/平台后处理，也不伪造账号/发布状态 |
| `.trellis/spec/frontend/wechat-svg-modules.md:8-18` | 微信 SVG 安全子集与“无公开官方 whitelist”的规格边界 |
| `.trellis/spec/frontend/flagship-element-catalog.md:175-188` | 市场工具只作 taxonomy；渲染/复制/插件/同步状态必须分离 |
| `.trellis/spec/frontend/visual-variant-system.md:7-20` | InkForge 只能有一个文章渲染架构，variant 不能替代 sanitizer/renderer/SVG/quality gates |

## External References

### 当前入口与公开静态资源

- [在线编辑器](https://editor.mdnice.com/)：**V-HTTP**，2026-08-20 返回 200；HTML 标题“Markdown | 让排版变 Nice”，空 `#root` 和 `You need to enable JavaScript to run this app.`。
- [产品站](https://product.mdnice.com/)：**V-HTTP + DOC**，2026-08-20 返回 200；产品定位、主题、图床、本地/云端存储和“一键排版”声明。
- [当前主 bundle](https://editor.mdnice.com/static/js/main.7214cd8f.chunk.js)、[当前 CSS](https://editor.mdnice.com/static/css/main.c5b1c0c3.chunk.css)、[CodeMirror chunk](https://editor.mdnice.com/static/js/chunk-lib.codemirror.51d28bf0.chunk.js)、[Prettier chunk](https://editor.mdnice.com/static/js/chunk-lib.prettier.d9a30848.chunk.js)、[MathJax chunk](https://editor.mdnice.com/static/js/chunk-mathjax.3b640616.chunk.js)：**V-HTTP**，均为 2025-05-20 的公开生产资源。

### 官方产品/教程页

- [微信公众号数学公式排版](https://product.mdnice.com/article/intro/wechat-formula-typesetting/)：**DOC，2019-02-15**；左 Markdown、右实时预览、`$`/`$$`、复制后到公众号 `Ctrl+V`。
- [公式编写注意点](https://product.mdnice.com/article/user/formula-note/)：**DOC，2019-04-14**；MathJax 3、语法边界、账号相关“图片粘贴失败”和插件 workaround。
- [和微信公众号编辑器战斗的日子](https://product.mdnice.com/article/intro/battle-with-wechat/)：**DOC，2019-01-15**；历史架构说明：React、markdown-it、Juice、CodeMirror、highlight.js、MathJax、脚注、图床与无 `<defs>` SVG 经验。
- [浏览器插件](https://product.mdnice.com/article/user/extension/)：**DOC，2019-05-24**；向微信公众号后台注入工具栏/切换入口、平台登录/一键授权、直接编辑与公式/表格 workaround。
- [编辑器快捷键](https://product.mdnice.com/article/user/hot-key/)：**DOC，2019-03-15**；代码块、行内代码、链接、图片、表格、H1-H3 等快捷键。
- [主题模板使用说明](https://product.mdnice.com/article/user/theme/)：**DOC，2021-04-07**；免费/付费模板及素材的许可和不得再分发约束。
- [更多疑问解答](https://product.mdnice.com/article/user/question/)：**DOC，2019-03-01**；表格在微信兼容性差、表格中公式失败、默认 mdnice 图床等已知限制。
- [组件使用](https://product.mdnice.com/article/developer/component-usage/)：**DOC，2019-05-06**；历史 React 组件 API、默认文本、变更回调、自定义图床与微信/知乎 HTML 获取方法。

### 官方开源/包元数据（历史证据）

- [官方仓库](https://github.com/mdnice/markdown-nice) 当前 `master` SHA `6525a5aba371209c2840593e8f537b4a69137a4b`；仓库最近 push 为 2023-10-06，但本文引用的核心渲染文件最后修改于 2020 年。
- [converter.js：公式、Juice、copy event](https://github.com/mdnice/markdown-nice/blob/6525a5aba371209c2840593e8f537b4a69137a4b/src/utils/converter.js#L13-L160)：**V-SOURCE，2020**。
- [helper.js：MarkdownIt 插件和 highlight.js](https://github.com/mdnice/markdown-nice/blob/6525a5aba371209c2840593e8f537b4a69137a4b/src/utils/helper.js#L57-L97)：**V-SOURCE，2020**。
- [Wechat.js：复制入口](https://github.com/mdnice/markdown-nice/blob/6525a5aba371209c2840593e8f537b4a69137a4b/src/component/Sidebar/Wechat.js#L21-L36)：**V-SOURCE，2020**。
- [Lib.js：导出接口](https://github.com/mdnice/markdown-nice/blob/6525a5aba371209c2840593e8f537b4a69137a4b/src/Lib.js#L21-L40)：**V-SOURCE，2020**。
- [package.json](https://github.com/mdnice/markdown-nice/blob/6525a5aba371209c2840593e8f537b4a69137a4b/package.json)、[NPM `markdown-nice`](https://www.npmjs.com/package/markdown-nice)：公开组件最新为 `1.8.22`，发布于 2020-09-29；NPM 元数据最后修改于 2022-05-08。

## Findings

### 1. 产品入口与边界

1. **V-HTTP/V-RUNTIME：社区、产品文档和编辑器是三个不同入口。** `mdnice.com` 当前是“墨滴”社区入口，`product.mdnice.com` 是产品/教程站，真正的 Web 编辑器是 `editor.mdnice.com`。对标不能只打开 `mdnice.com` 首页就声称观察了编辑器。
2. **V-HTTP：编辑器是 JS 应用。** 静态 HTML 只有空 `#root`；无 JS 抓取不能取得编辑 DOM、主题 computed style 或剪贴板产物。
3. **DOC：产品形态不仅是网页转换器。** 官方产品站还列出 PC 端、浏览器插件、主题社区、图床和文章存储；这些是产品生态，不等于微信渲染核心。
4. **V-RUNTIME：当前浏览器会话已有登录态，未出现重新登录 gate。** 当前复制入口的生产代码仍检查登录态和当前文章（`mdnice-current-runtime-evidence.md:63-75`）。因此“页面可打开”不能推出“匿名用户可执行微信复制”。
5. **DOC/ACCOUNT GATE：扩展分发是另一条有账号权限的通道。** 官方插件教程明确要求目标平台登录和“一键授权”。本轮没有安装扩展、打开授权或请求凭据。

### 2. 编辑输入与 Markdown 解析

#### 已验证

- **V-HTTP：** 当前编辑器首屏加载独立 CodeMirror 和 Prettier chunks；主 bundle 也包含 CodeMirror/格式化/快捷键代码。这能证明当前生产构建仍包含 Markdown 源编辑与格式化能力。
- **DOC：** 公式教程描述左侧 Markdown 输入、右侧实时预览；快捷键页覆盖粗体、下划线、斜体、代码块、行内代码、链接、图片、表格和 H1-H3。
- **V-SOURCE（历史）+ V-HTTP（当前 bundle 交叉验证）：** 历史官方源码以 `MarkdownIt({ html:true, highlight })` 为核心，并串入数学、脚注、TOC、ruby、figure、列表、图片流、多级引用等插件；当前 2025 bundle 仍包含完整 markdown-it parser 和 highlight.js，而不是只保留静态文案。
- **V-RUNTIME：** 当前 Markdown token/renderer 会给标题、表格、列表、公式、脚注、TOC、图片/图注、引用和有限自定义 block 生成稳定结构；预览根为 `section#nice`（`mdnice-current-runtime-evidence.md:34-43`）。

#### 边界

- `html:true` 是 mdnice 的历史/当前静态实现信号，不是 InkForge 应照搬的安全选择。当前 bundle 未检出 DOMPurify 标识只构成静态风险信号，不能据此声称存在漏洞；InkForge 现有 DOMPurify 不应为“兼容”而移除。
- 官方快捷键页和部分开发者页是 2019 年文档；具体当前快捷键是否全部仍可用，没有逐项动态执行。

### 3. Markdown → 预览 → 微信复制的链路图

以下链路把当前生产 bundle、任务内浏览器观察与官方历史源码交叉在一起；括号注明证据级别：

```text
Markdown source / CodeMirror                                  [V-HTTP, DOC]
  -> markdown-it + fixed plugins                              [V-HTTP, V-SOURCE]
     -> code fence: pre.custom > code.hljs                    [V-HTTP, V-SOURCE]
     -> formula token -> MathJax mjx-container/SVG            [V-HTTP, V-RUNTIME]
     -> heading/table/list/figure/footnote fixed DOM anchors  [V-RUNTIME]
  -> section#nice live preview tree                           [V-RUNTIME]
  -> current theme stylesheet + code-theme stylesheet         [V-RUNTIME]

点击“复制到公众号”                                            [V-HTTP static call chain]
  -> check login/current article                              [V-RUNTIME static call chain]
  -> snapshot #nice.innerHTML                                 [V-RUNTIME]
  -> temporarily normalize MathJax SVG wrappers/dimensions    [V-RUNTIME]
  -> serialize rich box HTML
  -> serialize current theme rules + code-theme CSS
  -> Juice inlineContent(...,
       inlinePseudoElements:true,
       preserveImportant:true)                                [V-HTTP, V-RUNTIME]
  -> restore original #nice.innerHTML                         [V-RUNTIME]
  -> one-shot copy event writes text/html + text/plain
  -> document.execCommand('copy')                              [V-HTTP, V-RUNTIME]
  -> user pastes into mp.weixin.qq.com                         [DOC; NOT VERIFIED here]

可选浏览器扩展：
  -> 注入公众号后台工具栏/编辑器切换
  -> 平台登录 + 一键授权
  -> 在微信中直接编辑/分发，绕开普通页面复制切换             [DOC 2019; NOT VERIFIED current]
```

**INFERENCE：** mdnice 减少预览/复制漂移的关键不是“使用了 SVG”，而是复制产物从同一 `#nice` 树派生，只在复制边界暂时做平台规范化和 CSS 内联，之后恢复编辑 DOM。这个模式可借鉴；具体 vendor DOM、class、SVG 路径和主题不可复制。

### 4. 主题与组件系统

#### 主题

- **DOC：** 产品站提供多主题订阅/兑换和定制；主题页明确存在免费/付费许可、素材使用说明和不得再分发约束。
- **V-SOURCE（历史）：** 默认/自定义主题 CSS 存储并注入 style；复制时合并 basic、Markdown、code、font CSS 后交给 Juice。
- **V-RUNTIME：** 当前实现已演进为可动态修改的 Constructable Stylesheet：按 selector 建索引、直接更新 CSSRule，预览使用同一主题表，复制时序列化全部规则（`mdnice-current-runtime-evidence.md:51-61`）。
- **NOT VERIFIED：** 当前主题总数、免费/付费分布、每个主题的 computed style、移动端表现和授权范围没有逐一采集。

#### 组件/固定结构

- **V-RUNTIME：** 标题 `prefix/content/suffix`、表格外层、列表内层、figure/footnote 和少量固定自定义 block 提供稳定选择器锚点。这更像有限、可预测的组件语法，不是任意 HTML page builder。
- **DOC/V-SOURCE（历史）：** 官方 React 组件曾暴露默认文本、标题、文本变更、自定义图床和微信/知乎 HTML 获取能力。
- **文档漂移证据：** 开发者页文本显示 `getWechatHtml()`，而 `Lib.js:25` 是 `getWeChatHtml()`。NPM 包又停在 2020 年。因此不能把旧公开组件 API 当成 2026 SaaS 的稳定集成协议。

### 5. HTML、CSS 与 SVG 产物

#### HTML

- **V-RUNTIME：** 预览/复制围绕 `section#nice` 和稳定语义包装工作；复制时为顶层节点加入 `data-tool="mdnice编辑器"`。
- **V-SOURCE（历史）：** `solveHtml()` 读取富文本容器 `innerHTML`，合并样式并返回 inline HTML；`getWeChatHtml()` 在转换前后保存/恢复布局 DOM。
- **NOT VERIFIED：** 没有读取真实剪贴板内容，也没有取得粘贴到公众号后的 sanitized DOM。因此不能断言 class、data 属性或所有节点在微信中保留。

#### CSS

- **V-HTTP/V-RUNTIME：** 当前生产 bundle 仍调用 Juice `inlineContent()`，合并当前主题与 code-theme CSS，并开启 pseudo-element inline 与 `!important` 保留。
- **设计意义（INFERENCE）：** 内联是为了跨越公众号编辑器不可靠的外部/类选择器环境；它不是平台 whitelist，也不能保证 Juice 支持的 CSS 一定被微信保留。
- **NOT VERIFIED：** 本线程没有 computed-style 快照；任务内运行态文件也没有覆盖主题矩阵的 before/after computed style。

#### SVG

- **V-RUNTIME：** 当前微信复制分支把 MathJax 容器规范化为行内 `span.inline-equation` 或块级 `section.block-equation`，保留 formula 数据，将 SVG 尺寸从 attribute 移到 inline style，并补充 `<g>` 节点（`mdnice-current-runtime-evidence.md:65-75`）。
- **DOC（历史）：** 2019 架构文称微信拒绝含 `<defs>` 的 SVG，而无 `<defs>` 公式 SVG 可用。这是 mdnice 的逆向经验，不是微信官方规范。
- **重要边界：** mdnice 的公式 SVG 不能证明任意 SVG、SMIL、交互 SVG、`<style>`、`class`、外部资源或 `url(#id)` 在微信可用。InkForge 规格明确微信没有公开 whitelist（`wechat-svg-modules.md:15-18`）。
- **NOT VERIFIED：** 本轮没有采集一条真实公式的最终 SVG 字节、`<defs>`/path 结构、真实剪贴板 HTML 或公众号 readback。

### 6. 复制到微信：普通剪贴板与扩展通道必须分开

#### 普通网页复制

- **DOC：** 公式教程描述“蓝色复制按钮 → 微信公众号后台 Ctrl+V”。
- **V-SOURCE（历史）+ V-HTTP（当前 bundle）：** 复制事件同时写 `text/html` 和 `text/plain`，然后 `execCommand('copy')`；当前生产代码仍采用该路径。
- **V-RUNTIME static chain：** 复制前先规范化公式、内联 CSS，并恢复预览 DOM。
- **NOT VERIFIED：** 没有实际触发复制、读取系统剪贴板、粘贴到公众号、读取公众号 DOM 或保存草稿。静态代码中的成功 toast 不能证明剪贴板或微信粘贴成功。

#### 浏览器扩展/授权分发

- **DOC（2019）：** 扩展向微信后台注入工具栏与编辑器切换；其宣称优势包括直接在微信编辑、避免公式复制图片丢失，并改善知乎表格同步。
- **账号 gate：** 教程明确要求目标平台登录与“一键授权”。这是 credentialed channel，不是普通剪贴板的 fallback 同义词。
- **NOT VERIFIED：** 当前 Chrome 商店版本、权限清单、2026 可用性、传输协议、生成草稿 readback 和公式成功率均未验证；未安装或授权扩展。

**对 InkForge 的硬约束：** `clipboard-copied`、`plugin-transferred`、`draft-synced`、`published` 必须是不同状态。mdnice 扩展教程不能用来升级 InkForge 普通剪贴板的 proof。

### 7. 公式、代码、图片与表格

#### 公式

- **DOC：** 以 `$...$` / `$$...$$` 输入，MathJax 3 渲染；教程建议长公式用块级、避免不合适的换行/标签。
- **V-HTTP/V-RUNTIME：** 当前生产构建有独立 2,741,102-byte MathJax chunk，复制前会规范化 MathJax SVG。
- **DOC 已知失败：** 公式页称可直接复制，公式注意页同时承认部分公众号会出现“图片粘贴失败”，原因未知，并建议插件；FAQ 还说表格中的公式无法成功。
- **结论：** 视觉公式是 mdnice 相对 InkForge 当前“公式：TeX”可读降级的真实差异候选，但它不是已证明的跨账号成功方案。

#### 代码

- **V-SOURCE/V-HTTP：** markdown-it 的 code fence 交给 highlight.js，历史源码输出 `pre.custom > code.hljs` 并对换行/空格做富文本适配；当前 bundle 仍包含 highlight.js 和 code-theme CSS。
- **DOC：** 2019 架构文曾列 7 个代码主题；该数量没有作为 2026 当前事实使用。
- **NOT VERIFIED：** 当前语言列表、主题数量、复制后行号/换行、横向滚动和移动端字体没有逐项验证。

#### 图片

- **DOC：** 产品站宣称提供 mdnice 图床和长期存储；FAQ 说默认图床为 mdnice。
- **V-HTTP static evidence：** 当前 bundle 嵌有生产 upload URL `https://api.mdnice.com/file/user/upload` 和 `https://files.mdnice.com/` 资源域名。
- **边界：** 只验证了字符串/公开图片 URL；没有向 upload endpoint 发请求，未验证鉴权、容量、格式、长期可用性、跨域、微信抓取或图片复制行为。

#### 表格

- **DOC：** FAQ 明确称自定义表格样式在微信兼容性差，并称表格内公式失败；插件页提到的是“知乎表格同步”，不能外推到微信。
- **INFERENCE：** 表格、表格内公式、代码块、长链接和图片应进入同一个确定性兼容 corpus，而不是把首页“完美兼容”作为验收。

### 8. 预览 fidelity：策略强，但最终平台一致性仍未证明

1. **强项（V-RUNTIME）：** 左右编辑/预览共用一个 Markdown 解析结果和 `#nice` 树；复制只临时修改公式 DOM并恢复，避免长期污染编辑状态。
2. **仍可能漂移（INFERENCE）：** 浏览器预览使用动态 stylesheet；复制产物经过 Juice；微信公众号再执行自己的粘贴/保存 sanitizer。这三个阶段不可能仅凭“同一源树”认定像素或结构一致。
3. **官方声明冲突：** 产品首页称“完美兼容微信公众号”，但官方 FAQ 同时承认表格样式差、表格内公式失败，公式注意页承认账号相关粘贴失败。后两者说明首页只能当营销声明。
4. **NOT VERIFIED：** 真实剪贴板 MIME、微信 PC paste DOM、保存后 DOM、手机预览、Dark Mode、封面缩略图和发布页均未采集。

### 9. 请求、资源、DOM 与 computed-style 证据清单

#### 本轮直接验证的公开响应

| URL/资源 | 状态 | Bytes | `Last-Modified` | 说明 |
|---|---:|---:|---|---|
| `https://editor.mdnice.com/` | 200 | 5,236 | 2025-05-20 06:23:19 GMT | JS shell，空 `#root` |
| `main.7214cd8f.chunk.js` | 200 | 3,642,408 | 同上 | 当前主业务/依赖 bundle |
| `chunk-lib.codemirror.51d28bf0.chunk.js` | 200 | 173,427 | 同上 | Markdown editor chunk |
| `chunk-lib.prettier.d9a30848.chunk.js` | 200 | 694,159 | 同上 | 格式化 chunk |
| `chunk-mathjax.3b640616.chunk.js` | 200 | 2,741,102 | 同上 | 公式引擎 chunk |
| `main.c5b1c0c3.chunk.css` | 200 | 760,822 | 同上 | 当前主 CSS |
| `https://product.mdnice.com/` | 200 | 661,902 | 2025-09-24 07:55:27 GMT | 静态产品站 |
| 8 个官方教程/开发者页 | 200 | 662K–714K | 同上 | 文章日期主要为 2019；静态站统一重建 |

任务内 companion evidence 还记录主 JS SHA-256 `214577c4f99804f9167e5a39d0ba65c9b418710e0073bca287164b42b36264e9`、CSS SHA-256 `9882d27ad280134c4a103c93fce1709c8e01dedea7d2b64db41e1b7ab593dfa5`，以及 source map 404（`mdnice-current-runtime-evidence.md:25-32`）。

#### DOM / computed-style / network 边界

- **DOM：** 本线程只确认静态 `#root`；当前运行态 DOM 由根线程唯一浏览器会话记录在 companion evidence，未重复采集。
- **Computed style：** 未采集；缺少主题/节点/状态矩阵，不能声称预览与 Juice 产物样式逐项相等。
- **Network：** companion evidence 仅记录登录态加载出现 `users/self`、`options`、`catalogs`、`users/capacities/self`、`articles/search` 路径，没有读取响应体/认证头（该文件 23 行）。本线程没有调用这些 API。
- **Upload endpoint：** 只从公开 bundle 读取字符串；没有请求。
- **Dynamic gate：** `https://editor.mdnice.com/` 必须执行 JS；微信复制代码还检查登录态和当前文章。扩展分发则明确要求平台登录/一键授权。本线程按约束停在这些门槛之外。

### 10. 事实、资料声明、推断与未验证矩阵

| 主题 | 已验证事实 | 官方资料声明 | 合理推断 | 未验证 |
|---|---|---|---|---|
| 输入 | 当前构建含 CodeMirror/Prettier；当前 bundle 含 markdown-it | 左写 Markdown、右实时预览；有快捷键 | 源编辑和预览仍是主工作流 | 每个快捷键当前可用性 |
| Markdown 管线 | 当前 bundle 含 markdown-it、highlight.js、MathJax；运行态有固定 DOM anchors | 历史文章列同一技术栈 | 固定 anchors 降低主题选择器脆弱性 | 所有扩展语法、错误恢复 |
| 主题 | 当前运行时动态 stylesheet 与 copy-time 序列化 | 多主题订阅/定制 | 限量设计 token 比任意模板 DSL 更稳 | 当前主题数、每主题 computed style |
| CSS | 当前 bundle 执行 Juice inlineContent | “类选择器转行内样式” | copy-time inline 是兼容策略 | 微信最终保留哪些属性 |
| SVG | 当前复制分支规范化 MathJax SVG | 历史文章称无 `<defs>` SVG 可用 | 公式 SVG 是专用产物，不是通用 SVG whitelist | 真实 formula clipboard/paste DOM |
| Copy | 当前静态调用链写双 MIME + `execCommand` | 蓝色按钮后 Ctrl+V | 同源树 + copy-time transform 减少内部漂移 | 剪贴板内容、WeChat readback |
| Extension | 官方教程描述注入和授权 | 直接编辑、公式/知乎表格 workaround | 它是独立 credentialed channel | 当前版本、权限、传输/草稿成功 |
| Image | bundle 含 upload/files 域名 | mdnice 图床/长期保存 | 公共 URL 是微信媒体可用性的必要但非充分条件 | 上传鉴权、容量、持久性、微信抓取 |
| Fidelity | 同一 `#nice` 树派生预览/复制 | 首页称完美兼容 | 仍需平台 sanitizer/readback proof | PC paste、手机、Dark Mode、发布 |

## InkForge 对照与可执行启示

### 1. 现有能力 / 差异 / 复用 / 不应照搬

| 领域 | InkForge 当前已具备 | 与 mdnice 的有价值差异/缺口 | 最小复用点 | 不应照搬 |
|---|---|---|---|---|
| Markdown | Mermaid/LaTeX/扩展预处理 + `marked` GFM（`optional-renderers.ts:107-129`） | 无需换 parser；可审计稳定 DOM anchors 是否足够 | 现有 lazy renderer、writing components | markdown-it 旧版本、`html:true` 安全边界 |
| 微信 HTML | DOMPurify、代码、脚注、主题、Juice、装饰/SVG、表格、CSS/平台合规完整单链（`wechat.ts:1199-1453`） | mdnice 不是新 renderer 候选 | `convertToWechatWithStats()` | 第二套 mdnice renderer、vendor DOM/class |
| 主题 | preview/export 双轨、VisualVariant、Typography，ExportModal 已有字体/字号/主题色控件 | 当前没有由 mdnice 证明的新缺口；仅在真实选择器失败时补 anchor | `generateThemeCSS()`、现有 preset/variant | 重复 token 控件、付费主题、模板几何、素材/字体/品牌 |
| 公式 | 编辑预览有 KaTeX；微信输出明确降级为“公式：TeX”可读 HTML（`wechat.ts:280-336`） | mdnice 当前保留视觉公式 SVG；这是最明确的视觉 fidelity gap 候选 | 现有 TeX 提取、SVG safe validator、fallback | 未验证的 MathJax DOM、任意 SVG、无 proof 即替换 fallback |
| 代码 | highlight.js、code theme、语言标签/行号等 | 需比较最终换行/移动端，而非主题数量 | 现有 `highlightCodeBlocks` | 2019 的“7 主题”数字、旧 hljs bundle |
| 图片 | 已有 image artifact/manifest/quality 体系 | 需要更清楚地显示 public-host/blocked/readback，不需要接 mdnice host | 当前 image manifest/report | 直接调用 mdnice upload、第三方 CDN 依赖 |
| Copy | `ClipboardItem` 写 `text/html`+`text/plain`，富文本失败闭合，另有 sanitized exec fallback；Export/Publish 已记录历史和操作反馈（`utils.ts:999-1060`） | 实现已比 mdnice 当前静态 `execCommand` 路径更现代；缺的是微信编辑器/手机对同一产物的真实 readback，不是再做 receipt | `copyWechatHtmlToClipboard()`、native result、现有 export history | 退回 execCommand-only、toast=成功、重复 receipt |
| Preview/proof | 当前 dirty source 的 preview 使用 canonical native result；ExportModal 已显示 quality/preflight/style-proof；dev HEAD 有官方草稿，脱敏 live round-trip 仅 dirty-only | 剩余缺口是外部 PC editor、phone/cover 与发布证明 | 当前 StyleProof manifest/runbook 与 live round-trip | 把 dirty-only 当 release、重做诊断 UI，或用浏览器 mock/市场截图升级状态 |
| Channel | 已区分 clipboard/plugin/sync/publish 概念，普通微信 clipboard 曾有失败证据 | mdnice extension 说明 direct channel 有产品价值，但验证/权限成本高 | `wechat-plugin-transfer-checklist`、credentialed gate | 把插件声明当已实现/已验证，或偷用现有登录态 |

### 2. 优先级建议

#### 已覆盖 — 不再新增“可见产物/receipt/样式 token”

当前 dirty source 的 ExportModal/Publish Center 已消费 canonical native result，并具备 quality、preflight、style-proof、复制反馈、导出历史、官方草稿状态和脱敏 live round-trip receipt；其中受限 round-trip 与部分路径为 dirty-only。字体、字号、主题色与 SVG 插槽也在该工作树中存在。只有实施基线绑定到包含这些能力的 commit 后，mdnice 对标才不得再做一套 receipt、参数面板或渲染结果卡片。

#### P0 准备步骤 — 为现有通道外部闭环建立 canonical-artifact + channel-payload corpus

- **用户结果：** 给富复制/官方草稿的真实 PC、手机、Dark Mode 与封面闭环提供唯一、可重复的输入；本地 corpus 单独通过不能完成 P0。
- **最小范围：** 一个 repo-owned Markdown corpus，至少含 inline/block formula、长公式、formula-in-table、语言/无语言 code、宽表、嵌套列表、外链、远程/本地图片和 captions；对 final HTML 做结构 fingerprint 和 forbidden-node audit。
- **复用：** 现有 style-proof、quality detector、formula fallback、image manifest、manual checklist。
- **成本/风险：** 本地准备低；外部闭环需要单独批准的测试草稿、账号态与手机操作。
- **验收：** 本地结果可重复只是进入条件；首批完成必须继续取得同 corpus 的 PC editor readback、官方 draft readback、phone/Dark Mode、cover 与测试草稿 cleanup/absence。各层证据分开记录，不保存账号/HAR/第三方正文。
- **回滚：** 仅测试/证据层，不改变产品行为。

#### P1 — 评估“视觉公式优先、可读 TeX 兜底”的微信专用输出

- **用户结果：** 在真实可用 channel 中获得接近 mdnice 的视觉公式，同时任何失败仍保留可读 TeX。
- **最小实现候选：** 继续在现有 `degradeWechatLatexHtml()` 的 pre-sanitize 边界提取/转义 TeX，并保留当前 HTML fallback；如果选择 SVG，则只留下安全 placeholder，待 DOMPurify 之后、现有 `applyWechatOptionSvgModules()` 邻近阶段再注入 source-owned 静态 SVG 并过 safe validator（当前 DOMPurify allowlist 不含 SVG，不能在其前面直接生成）。如果选择图片，则走现有 public-HTTPS image artifact/manifest。SVG 与 raster image 必须先用真实微信证据选一，不预设答案。
- **复用：** TeX source 提取（`wechat.ts:290-306`）、SVG validator、image artifact manifest、现有平台后处理。
- **风险：** 高；公式 SVG 可能被 sanitizer、Dark Mode、字体/path、尺寸或普通 clipboard 破坏，图片方案又引入 public host/账号/持久性。
- **验收：** 分开记录 canonical renderer result hash、clipboard/draft channel payload hash、微信 PC 保存后 canonical readback hash，再补手机预览与 Dark Mode；formula-in-table 单列结论。实体编码、属性顺序和浏览器规范化必须写入 canonicalization 规则，仅本地 SVG 截图不通过。
- **回滚：** 一键退回当前 `data-inkforge-latex="degraded"` 可读 TeX，不影响其他节点。

#### Deferred — 只有真实失败才补 DOM anchor 或样式 token

现有 13/13 可选样式均有当前轮本地渲染证明，且 ExportModal 已有高频字体/字号/主题色控件。在发现具体 preset 的 selector collision、平台 readback 差异或缺失用户动作前，不增加新 anchor/token。

#### Conditional — 仅在现有通道失败或明确要求时评估最小 companion

- **用户结果：** 只有现有 clipboard/draft channel 出现可复现失败，或用户明确要求编辑器内插入时，才可能用 selection insert 减少切换。
- **当前新增证据：** `yiban-wechat-editor-runtime.md` 在壹伴 12.3.14 中追踪到 template/Markdown/dynamic-material 写入适配路径，包含 UEditor 与 `__MP_Editor_JSAPI__` 标识；一次性草稿又证明 Markdown applied DOM 与微信保存读回不同，且保存后引用/粗体/行内代码发生可见降级。其完整权限是 `<all_urls>` 加 cookies/proxy/webRequest，不能照搬；免费 SVG applied DOM 与手机证明仍缺失。
- **为什么不是首批：** companion 不会自动关闭 phone/cover 门禁，并会新增私有 API、MAIN-world bridge、浏览器版本维护与扩展安全面。
- **前置条件：** 用户明确选择；仅 `mp.weixin.qq.com`；显式手势 selection insert；所有写入按可能 autosave 建模；readback 只在页面内摘要本次 nonce 标记的自有子树，不返回原始/相邻正文；不自动保存/预览/发布；宿主 API 不识别时 fail closed。
- **状态模型：** 新 channel 只能升级 `plugin-transferred`/`draft-synced`，不得覆盖普通 `clipboard-paste` 失败记录。
- **回滚：** channel 独立禁用；本地 renderer 和普通 copy 不受影响。

#### 明确不做

- 不复制 mdnice 免费/付费主题、模板 HTML、品牌 asset、公式 SVG/path、class 命名、API payload 或 CDN 依赖。
- 不引入旧 `markdown-it 8`、`juice 5`、`highlight.js 9` 或 `React 16` 作为“成熟工具同款”。
- 不把文章云库、社区、会员、主题市场、AI 对话或多平台授权扩展为本轮微信 fidelity MVP。
- 不用 `execCommand`-only 替换 InkForge 现有现代 Clipboard API + fail-closed 路径。
- 不把 mdnice 首页、静态 bundle、浏览器 preview 或插件教程当作真实微信 paste/publish proof。

## Related Specs

- `.trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/prd.md:16-22`：要求覆盖公开权威/真实证据、完整 mdnice 链路、InkForge 映射和按价值/成本/风险排序；本轮保持 planning。
- `.trellis/tasks/08-20-mdnice-yiban-meibian-rendering-benchmark/prd.md:24-45`：禁止 mock 冒充、复制第三方资产、范围漂移、账号/发布动作。
- `.trellis/spec/frontend/wechat-svg-modules.md:8-18`：SVG 必须穿过现有 Juice/后处理/合规链；微信没有公开官方 whitelist。
- `.trellis/spec/frontend/wechat-svg-modules.md:31-44`：PC editor 与 phone proof 必须分别绑定 exact artifact，setup/scan/PC DOM 不能替代手机正文。
- `.trellis/spec/frontend/flagship-element-catalog.md:12-20`：市场编辑器只提供 taxonomy/workflow；runtime catalog 决定真实可用性。
- `.trellis/spec/frontend/flagship-element-catalog.md:175-188`：一键排版只能复用现有 renderer/gates；local/copy/plugin/sync/publish 状态分离。
- `.trellis/spec/frontend/visual-variant-system.md:7-20`：保持一个渲染架构，不以 variant 替换 sanitizer、renderer、SVG 模块或 quality detector。
- `.trellis/spec/frontend/visual-variant-system.md:196-220`：编辑、preview 与 copy 必须消费同一 canonical settings；浏览器 preview 不是 release evidence。
- `research/inkforge-current-rendering-baseline.md:10-43`：当前单一微信管线和 preview/copy 共用 final native artifact。
- `research/inkforge-current-rendering-baseline.md:77-85`：仍缺 phone、authenticated editor 与 credentialed channel proof。
- `research/mdnice-current-runtime-evidence.md:34-81`：当前 mdnice DOM、主题、公式、Juice 和 copy-time restore 链路的唯一浏览器/生产 bundle 证据。

## Caveats / Not Found

1. **没有第二浏览器。** 按根线程要求，本线程未调用 CloakBrowser、Playwright 或 Chrome；动态 DOM/网络证据引用任务内唯一会话的 companion file。
2. **没有真实 clipboard。** 当前复制函数和双 MIME 是生产 bundle 静态调用链证据，不是执行成功证据；没有读取或保存系统剪贴板。
3. **没有真实微信公众号 paste/readback。** 未粘贴、保存草稿、手机预览或发布；不能声称 mdnice 或 InkForge 已与微信一致。
4. **没有 computed-style 矩阵。** 只验证生产 CSS 资源和 runtime stylesheet 机制；没有逐节点、逐主题、逐状态对比浏览器 computed style 与 Juice inline style。
5. **登录边界未由本线程触发。** 编辑器静态 shell 公开；任务内唯一浏览器已有登录态。复制入口代码检查登录/文章；扩展教程明确要求平台登录与授权。本线程未请求凭据。
6. **官方教程多为历史文档。** 文章内容主要来自 2019 年；2025 `Last-Modified` 是产品静态站重建，不是功能重新验证日期。
7. **开源仓库不是当前 SaaS 源码。** NPM `1.8.22` 与核心文件停在 2020 年；只在当前 2025 bundle 独立出现相同机制时，才用于交叉说明。
8. **source map 不可用。** 当前 `.map` URL 404；当前调用链来自公开 minified bundle、官方旧源码与最小 DOM观察，未获取私有源码。
9. **上传/存储未验证。** 仅看到公开 endpoint/host 字符串和官方声明；没有发起 upload，也没有验证容量、鉴权、持久性或微信抓取。
10. **扩展当前态未验证。** 未验证 Chrome 商店版本、权限、2026 可用性、直接传输协议或生成草稿 readback。
11. **公式 SVG 不能外推。** 历史“无 `<defs>` SVG”经验不是官方规则，也不能证明任意组件/交互 SVG；InkForge 必须继续使用自己的安全子集和 exact-artifact proof。
12. **搜索链降级已记录。** Grok provider error 与 Firecrawl 403 均通过 Exa、直接官方 HTTP、GitHub/NPM 和任务内唯一运行态证据补足；没有把搜索摘要单独作为关键结论来源。
