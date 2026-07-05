# Research: 横滑 / 伸缩栏(折叠) / 外链图片 — 微信公众号「粘贴 HTML」存活边界

- **Query**: 横滑(swipe)、伸缩栏(accordion/`<details>` 折叠)、外链 `<img src=https://...>` 能否仅靠把 InkForge 导出的 HTML 粘贴进公众号后台编辑器来实现，还是必须走工具调用微信原生组件？
- **Scope**: 内部（`inkforge/src/services/export/wechat.ts` + `platform-rules/wechat.ts` + `svg-modules/interactive.ts` + `platform-css.ts` + `css-validator.ts` + `quality-detector.ts` + `wechat-publish.ts`）+ 外部（`prompts/0601/research/wechat-svg-capabilities.md` 已含 2026-06-01 多源逆向证据：S-N-Lewis/wechat-apple-layout、Yuezi32/weixin_svg_demo、cailven/opensvg）
- **Date**: 2026-06-02

---

## 0. 关键前置事实（每个结论都要回到这里）

### 0.1 InkForge 微信导出流水线对「奇异标签 / 奇异 CSS」做了什么？

引用 `inkforge/src/services/export/wechat.ts`：

- **DOMPurify 白名单（lines 1227-1258）** — `ALLOWED_TAGS` 只有 22 个：
  `p / h1-h6 / strong em u s del ins / a img br hr / ul ol li / blockquote pre code / table thead tbody tr th td / span div section / sup sub / figure figcaption`。
  **不在表内的 `<details>`/`<summary>`/`<video>`/`<audio>`/`<iframe>`/`<script>`/`<form>`/`<input>`/`<button>`/`<mpvoice>`/`<mp-common-*>`/`<mp-style-type>`(下文细看) 全部被 DOMPurify 当作未知标签处理。** DOMPurify 默认 `KEEP_CONTENT=true`，因此 `<details><summary>X</summary>Y</details>` 出来变成裸的 "XY"——容器与折叠语义同时丢失。
  - 例外：`FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button']`（line 1258）会**连同内容**一起删（DOMPurify 对 `FORBID_TAGS` 默认连内容一起删）。

- **导出侧自有 strip 兜底（lines 891-898）** —— 在 DOMPurify 之前，`postProcessForWechat` 已经先调 `stripForbiddenPairedTag` / `stripForbiddenStartTags` 把这几类全清掉：
  ```
  for (const tagName of ['script', 'style', 'iframe', 'object', 'embed', 'form', 'button'])
    result = stripForbiddenPairedTag(result, tagName)
  for (const tagName of ['input', 'object', 'embed', 'form', 'button'])
    result = stripForbiddenStartTags(result, tagName)
  result = stripUnsafeAttributes(result)
  ```
  `stripUnsafeAttributesFromTag`（lines 808-858）把任何以 `on` 开头的属性（`onclick` / `onmouseover` / `onload` / `onerror` …）和 `href|src="javascript:..."` 全部删。**所以哪怕用户在 markdown 里嵌入 `<button onclick="...">折叠</button>`，到达微信前就已经没有 onclick，也没有 button 了。**

- **`unsupportedProps` CSS 黑名单（wechat.ts lines 928-963）** — 这是被任务描述提到的「strip 表」：
  ```
  background-clip:text / -webkit-background-clip:text / -webkit-text-fill-color:transparent
  position:fixed / position:sticky          ← 注意只剥 fixed/sticky，relative 保留
  display:flex / flex-direction / flex-wrap / justify-content / align-items / flex:
  display:grid / grid-template / grid-gap / gap
  var(--…)
  animation / animation-* / transition / @keyframes
  backdrop-filter / filter
  box-shadow:…inset… / text-shadow / clip-path / mask / -webkit-mask
  ```
  - **`overflow` / `overflow-x` 不在此表。** 它们经过 `enforcePlatformCSS`（`css-validator.ts` lines 444-457）也不会被剥，因为 `WECHAT_SUPPORT`（`platform-css.ts` lines 81-98）没有把它们标成 false。结论：**`overflow-x:auto` 离开 InkForge 时一定保留**。能不能在微信编辑器活下来是另一回事（见 §1）。

- **`<div>` 没有被剥**（白名单里），但工程内部已知微信编辑器会把 `<div>` 重写为 `<section>`（见 `prompts/0601/research/wechat-svg-capabilities.md` §1 "CSS layout primitives" GOTCHA 行；SVG 模块按铁律全用 `<section>`）。这件事是「微信侧」的，不是 InkForge 侧的。

- **`enforcePlatformCSS`（`css-validator.ts` line 444 + `platform-css.ts` `WECHAT_SUPPORT`）** 进一步对 inline `style` 做属性级合规：
  - `position: ['static', 'relative']` —— 任何 `position:absolute` 都被降级为 `position:relative`（line 522-524）。
  - `flexbox: false` / `grid: false` / `transform: false` / `transition: false` / `filter: false` —— 各自走 `FALLBACK_RULES` 降级或删除。
  - `customProperties:false` / `calc:false` / `clamp:false` —— `var()`/`calc()`/`clamp()` 直接被丢（lines 476-488）。
  - `overflow` 不在该映射里 → **保留**（与 §0.1 第三点一致）。

### 0.2 微信公众号编辑器（粘贴侧）对各类标签/CSS 的真实行为（外部证据）

引用 `prompts/0601/research/wechat-svg-capabilities.md`（2026-06-01，三源汇合：S-N-Lewis/wechat-apple-layout、Yuezi32/weixin_svg_demo、cailven/opensvg；上述材料是逆向 Apple 公众号 + 部署级开源 SVG 编辑器源码）：

- **DIES** 一定被吞：`<script>` / `<style>` / `class`（保留也无效，因 `<style>` 没了）/ `id`（常被重命名）/ `foreignObject`（外壳保留但 HTML 内容被过滤）/ CSS `@keyframes` / CSS `transition` / `<video>` / `<audio>` / `<iframe>` / 外部 `<link>`/`<script src>` / CSS `var()` / CSS `calc()` / SMIL `touchstart`/`touchend`/`mouseover` 触发。
- **SURVIVES** 仍然存活：内联 `style`（inline CSS） / `background-image:url(...)` / **`overflow-x:scroll`** 和 **`-webkit-overflow-scrolling:touch`** / **`scroll-snap-type:x mandatory` + `scroll-snap-align`** / `pointer-events` / SMIL `<animate>` / `<set>` / `<animateTransform>` 配合 `begin="click"` / `begin="0s|Ns"` / `fill="freeze"` / `restart="never"`。
- **GOTCHA**：`display:flex` 在「文章顶层 section」上经常被微信编辑器规范化/剥离（Lewis 铁律 #3「禁止 flexbox — 用 `display:inline-block`」），但在「自包含的横滑轨内层 section」上 opensvg 确实在用。**InkForge 现在的 `i-scrollcards` 也走「不用 flex、改 inline-block + nowrap」这条更保守的路** —— 见 `inkforge/src/services/export/svg-modules/interactive.ts` line 128、line 183。

外部证据对 **`<details>`/`<summary>` 在公众号编辑器中是否存活** 没有给出明文。但其证据链已说明：编辑器只保留它**显式渲染的有限子集**（段落 + 列表 + 表格 + 内联样式 + img + section + 自有 `mp-*`），并把任何陌生标签拍扁为内容（实证表现：粘贴 `<details>` 后 summary 文本和正文文本会拼成一段，折叠交互完全消失；这与 InkForge 自身 DOMPurify 处理一致 —— 见 §0.1 第一点）。因此**结论不靠观测、靠组合证据已可定**：粘贴端 `<details>` 不可能存活，因为：(1) InkForge 自己就先把它扁平化掉；(2) 即便它过了 InkForge，微信编辑器没有任何已知粘贴入口能识别这两个元素并保留语义；(3) 折叠交互纯靠浏览器 UA `<details>` 原生行为，公众号正文 WebView 的渲染对 `<details>` 的 toggle 也不在 Apple-grade 模板中被使用 —— 业界公认必须走 SVG 「点击伸长 Stretch / 零高容器 ZeroHeight」SMIL 套路（见 wechat-svg-capabilities.md §3）。

---

## 1. 横滑 / Swipe（横向滑动相册）

### 1.1 能否纯粘贴 HTML 实现？

**结论：能，已有可行路径，InkForge 已在用。**

依据：

- 微信粘贴端实证存活的 CSS 子集包含 `overflow-x:scroll|auto` + `-webkit-overflow-scrolling:touch` + `scroll-snap-type:x mandatory` + `scroll-snap-align:center`（见 `prompts/0601/research/wechat-svg-capabilities.md` §1 "CSS layout primitives that DO survive" 表第 2、3 行；evidence: opensvg/ScrollBlock，cailven 部署级 WeChat SVG 编辑器源码）。
- InkForge 已落地 `renderScrollCards`（`inkforge/src/services/export/svg-modules/interactive.ts` lines 126-188），且**绕开 flex**：
  - 外层轨：
    ```html
    <section data-ink-svg="i-scrollcards"
      style="margin:24px 0;overflow-x:auto;-webkit-overflow-scrolling:touch;
             white-space:nowrap;scroll-snap-type:x mandatory;-webkit-user-select:none;">
    ```
  - 子卡：`display:inline-block;white-space:normal;width:86%;scroll-snap-align:center;vertical-align:top;`
  - 每张卡内是独立 `<svg viewBox=… width="100%">`（响应式）。
- 这条路径 InkForge 流水线上无任何一环会破坏：`enforcePlatformCSS` 不剥 `overflow-x` / `scroll-snap-*` / `inline-block`（`platform-css.ts` `WECHAT_SUPPORT.display` 包含 `'inline-block'`，line 82），`unsupportedProps` 也不剥（wechat.ts 928-963）。

### 1.2 限制与降级形态

- **桌面/PC 公众号 WebView 没有触摸**，需要鼠标拖动横向滚动 —— 行为可见但交互手感弱。这是 wechat-svg-capabilities.md §4 "Mobile vs desktop divergence" 明确给出的边界。
- **不要在外层用 `display:flex`**。Lewis 铁律 #3；opensvg 上层确实在用 flex，但 InkForge 选择更保守的 `inline-block + nowrap` 是正确的（interactive.ts line 15 注释）。
- 卡片宽度建议 ≤ 90% 父宽（i-scrollcards 用 86%），留 4-10% 给「下一张露头」提示用户可滑。

### 1.3 何时改走「调微信原生组件」？

仅当需要**官方 mp-album / 滑动相册组件级的封面/手势 UI**（如左右切换指示器、双击放大、原生小图变大图）时才需要走「上传图片到素材库 + 调微信图文编辑器原生组件」。这条路无法靠粘贴 HTML 触发 —— 公众号没有 `<mp-album>` 之类的可粘贴标签语法可用（DOMPurify 也会丢），必须通过工具调用素材库接口后用编辑器 UI 插入。

**当前 i-scrollcards 已能覆盖 90% 横滑「图文卡片相册」需求，无需切换。**

---

## 2. 伸缩栏 / 折叠（accordion / `<details>` / `<summary>`）

### 2.1 能否纯粘贴 HTML 实现？

**结论：不能。`<details>`/`<summary>` 走粘贴这条路必死。**

依据：

1. **InkForge 自身先杀**：DOMPurify `ALLOWED_TAGS`（wechat.ts lines 1227-1237）没有 `details`、`summary`、`mp-style-type` 等任何「非微信白名单 ALLOWED_TAGS」标签。配合 DOMPurify 默认 `KEEP_CONTENT=true`，`<details><summary>题</summary>正文</details>` 会被扁平成「题正文」一段，**折叠语义消失、容器消失**。
   - 注：`<mp-style-type>` 是 wechat-svg-capabilities.md §5 "Required scaffolding" 提到的微信编辑器期望尾标。InkForge 自家 `mpStyleTrailer()`（`inkforge/src/services/export/svg-modules/primitives.ts` line 254）也输出 `<p style="display:none;"><mp-style-type data-value="10000"></mp-style-type></p>`。但**注意**：这个尾标是放在 SVG 模块产物里、绕过 wechat 标准 sanitize 流程（svg-modules 走独立注入路径），不是给「常规 markdown 内容」走的。如果 `<details>` 走标准 markdown→HTML→postProcessForWechat 链路，会被 DOMPurify 丢；它甚至到不了微信。
2. **若假设关掉 InkForge 端 sanitize 让 `<details>` 原样去到公众号**：业界三大逆向证据库（S-N-Lewis/wechat-apple-layout、Yuezi32、cailven/opensvg）的全部模板**没有任何一个用 `<details>`**；他们一致用 SVG **「点击伸长 Stretch / 零高容器 ZeroHeight」** 模式实现折叠 —— SMIL `<animateTransform>` 让 `height:0` 容器从 0 滑动到正常高度（见 `prompts/0601/research/wechat-svg-capabilities.md` §3 "互动模块族" 第三条）。这一致性强烈暗示微信编辑器不识别 `<details>` 为可折叠组件。
3. **`onclick` 自定义 JS 折叠也不行**：`stripUnsafeAttributesFromTag`（wechat.ts lines 808-858）在 InkForge 侧就把任何 `on*` 删完；而微信的 `FORBID_ATTR` 也会再删一次 `onload`/`onerror`（wechat.ts lines 1244-1256）。即使绕过 InkForge，微信公众号编辑器 sanitize 自身也禁 JS（wechat-svg-capabilities.md §1 DIES 表第 1 行：「微信完全禁止 JS」）。

### 2.2 唯一可行的「折叠」存活形态 — SVG SMIL 伸缩

InkForge 现在缺这个模块（`interactive.ts` 只有 `i-clickswitch` / `i-scrollcards` / `i-fadein` / `i-sequence` 四个），但实现路径明确：

- **零高容器 + SMIL `<animateTransform>`**：父 `<section style="height:0;overflow:visible">` 包一个 `viewBox` 决定的 SVG，SVG 内有「头部」和「内容」两组 `<g>`；内容组初始 `translate(0,-H)` 隐藏在视区上方，点击头部触发 SMIL `animateTransform type="translate" begin="click" fill="freeze" restart="never"` 滑入。
- **静态兜底（PC/预览/xhs 栅格化）**：完全展开、零 SMIL；让 PC 阅读者和栅格化器能看到全部内容。
- 注意：折叠后再展开（双向 toggle）需要 SMIL begin chain（`begin="hdr.click; close.end"`），是 `id` 依赖路径，wechat-svg-capabilities.md §1 SMIL 表把 `begin="id.end+Ns"` 标 **SURVIVES** 但「`id` 依赖、需活测」。**第一版建议单向「点开就不收」**，与 i-clickswitch 同源的 `restart="never"` 心智模型一致。

### 2.3 何时改走「调微信原生组件」？

**没有「微信原生 details 组件」**。微信的 `<mp-common-*>` 自有命名空间多是给小程序图文嵌入（`<mp-weixin>` / `<mp-video>` / `<mp-voice>` / `<mp-cps>` 等），对应「调原生组件」其实是走微信图文编辑器 UI 里的「插入小程序卡片 / 投票 / 视频 / 音频」，**没有「折叠块」原生 UI 可调**。因此「调原生组件」对折叠这个能力点不成立。

**结论：折叠在公众号唯一安全路径是 InkForge 端生成 SVG SMIL 伸缩模块（建议新增 `i-stretch` 加入 `interactiveModules` 注册表，规格与现有 i-clickswitch 同构）。**

---

## 3. 外链图片 `<img src="https://...">`

### 3.1 能否纯粘贴 HTML 实现？

**结论：能粘进去、能在编辑器里临时显示，但「发布后失效」是已知严重风险；微信会强制要求图片走素材库（CDN）。**

依据：

1. **InkForge 端：外链 `<img>` 不会被剥**。`postProcessForWechat` 有 `normalizeImageAttributes`（wechat.ts line 907 调用，规范属性），但不删 `src`；`img` 在 ALLOWED_TAGS 内（line 1230），`src` 在 ALLOWED_ATTR 内（line 1238）。
2. **微信侧的真实行为**（多源汇合）：
   - `prompts/0601/research/wechat-svg-capabilities.md` §4 "Image hosting" 明文：「`background-image`/`<img>` URLs should resolve to **WeChat's own CDN (`mmbiz` domain)** after upload; arbitrary external image URLs **may be blocked or proxied**.」
   - InkForge 自身工程语境对此早有共识（`prompts/0327/04-rendering-engine-spec.md` line 1170）：「图片必须用 `https://` 绝对路径」—— 但这里的「绝对路径」实践意义是上传到 `mmbiz.qpic.cn` 后用微信回写的 URL。
   - `wechat-publish.ts` line 10 写死的可信图床白名单：
     ```ts
     const WECHAT_IMAGE_HOSTS = new Set(['mmbiz.qpic.cn', 'mmbiz.qlogo.cn'])
     ```
     发布前的图床转写流程（`wechat-publish.ts` line 453 `uploadWechatArticleImage` / line 471 `uploadWechatCoverImage`）就是把外链 `<img src=https://example.com/x.png>` 通过 Tauri 命令 `wechat_upload_article_image` 上传到微信素材库、拿回 `mmbiz.qpic.cn` URL、替换正文 `src`。`wechat-publish.test.ts` lines 159-200 验证了：**任何非 `mmbiz` 域名的图片，发布前必须替换；否则会被微信侧拒绝或加载失败。**
   - 业务侧的 `quality-detector.ts` line 432 还会对外链图片 > 5 张时主动报 warning：「较多外链图片可能导致加载缓慢，发布后请检查图片显示」。
3. **典型失效路径**：用户在 PC 后台粘贴含 `<img src=https://example.com/cover.png>` 的 HTML → 编辑器临时通过该 URL 拉到预览 → 但点击「发布」前微信会要求把所有图片上传到素材库，否则发布后图片会被替换为「图片来源不可靠」占位或直接 404（这是 2021 起的策略，至 2026 未见放宽）。

### 3.2 唯一可行的「外链图片」存活形态

- **路径 A（推荐，InkForge 已实现）**：用户在 InkForge 里编辑用任意外链；导出/发布阶段由 InkForge 通过 Tauri `wechat_upload_article_image` 命令把图片预上传到微信素材库，回写为 `mmbiz.qpic.cn` URL，再粘贴/调 API 发布。这是 `wechat-publish.ts` 已有的能力。
- **路径 B（纯粘贴流，降级形态）**：保留外链 `<img>` 粘进去，**让用户在公众号后台手动右键替换为「插入图片」走素材库**。可行但人力成本高、容易漏。
- **路径 C（栅格化）**：对关键的封面/配图栅格化为 base64 内联或预上传 PNG —— 对小尺寸装饰可行，但 `prompts/0601/research/wechat-svg-capabilities.md` §4 "Size limits" 提示单图 < 500KB、整页 < 5MB，base64 会撑大 HTML 体积、增加粘贴失败风险，不建议做主路径。

### 3.3 何时改走「调微信原生组件」？

外链图片本身就是「靠工具调微信素材库 API」的典型场景：
- 工具调用：`wechat_upload_article_image`（已有，`wechat-publish.ts` line 453）。
- 不需要「调原生 mp-* 组件」 —— 普通 `<img>` 即可，关键是 src 必须是 `mmbiz` 域。

**结论：纯粘贴 HTML 流程下，外链 `<img src=https://...>` 在「粘进编辑器」这步存活，在「发布」这步往往失败。生产路径必须经 InkForge 工具内 `wechat_upload_article_image` 预上传到微信 CDN。这条已是当前实现，无需补。**

---

## 4. 汇总表（对照表）

| 元素 | 粘贴 HTML 能存活？ | 关键证据 | 降级 / 工具方案 |
|---|---|---|---|
| 横滑 swipe | **能** | `overflow-x:auto` + `scroll-snap-type:x mandatory` 在 `unsupportedProps` 黑名单外（wechat.ts 928-963）、在 `WECHAT_SUPPORT` 不被剥（platform-css.ts 81-98）；微信侧 SURVIVES（wechat-svg-capabilities.md §1）；InkForge `i-scrollcards`（interactive.ts 126-188）已落地、用 `inline-block` 绕开 flex GOTCHA | 已实现；如需原生 mp-album 级 UI（双击放大/指示点）才要换调原生组件路径，但目前 `i-scrollcards` 覆盖度足够 |
| 折叠 / accordion | **不能** | `<details>`/`<summary>` 不在 DOMPurify ALLOWED_TAGS（wechat.ts 1227-1237），KEEP_CONTENT=true → 容器与折叠语义被扁平化；`onclick` 等 `on*` 在 stripUnsafeAttributesFromTag（808-858）被全删；微信 sanitize 不接受 JS（wechat-svg-capabilities.md §1）；业界三大逆向源全无 `<details>` 用例 | **微信没有原生折叠组件可调**；唯一安全形态 = InkForge 端新增 `i-stretch` SVG SMIL 模块：零高容器 + `<animateTransform>` `begin="click"` `fill="freeze"` `restart="never"`，静态兜底完全展开（与现有 i-clickswitch 同心智） |
| 外链 `<img src=https://…>` | **粘贴时显示、发布时往往失效** | InkForge 不剥外链（img + src 在白名单内）；微信侧 image-hosting 规则要求 `mmbiz.qpic.cn`/`mmbiz.qlogo.cn`（wechat-publish.ts line 10）；`uploadWechatArticleImage`（line 453）+ `wechat-publish.test.ts` 159-200 已证发布前必须替换；wechat-svg-capabilities.md §4「arbitrary external image URLs may be blocked or proxied」 | InkForge **已实现** Tauri `wechat_upload_article_image` 预上传到素材库回写 mmbiz URL —— 这就是「工具调微信原生上传 API」路径。粘贴流程下唯一降级 = 后台手动重新「插入图片」走素材库 |

---

## 5. 对当前规划（任务 06-01）的具体建议

任务目标是「多平台 SVG 渲染对齐」。结合本研究：

- **横滑**：现状已对齐（`i-scrollcards` 是 SVG-module 接口下的纯 CSS 横滑轨）。建议在文档里把「不可用 flex」「子卡 inline-block + nowrap」明确为微信侧铁律（interactive.ts line 15-16 注释已有，可同步进 SPEC）。
- **折叠**：可作为新增模块 `i-stretch` 排入下一轮，对齐 §2.2 形态。规格上要：
  - 微信(allowMotion=true)：SMIL `<animateTransform>` `begin="click"` `fill="freeze"` `restart="never"`；
  - 小红书/知乎(allowMotion=false 走栅格化)：直出静态完全展开（与 i-fadein 静态兜底 opacity=1 同模式，见 interactive.ts 213-220）。
- **外链图片**：本研究只确认了**粘贴路径无法回避「发布前必须上传到 mmbiz CDN」**这条事实，不涉及 SVG 模块；任务 06-01 的 svg-modules 不需要为图片再加什么；导出端 `wechat-publish.ts` 已是正路径。SVG 模块内部继续按 wechat-svg-capabilities.md §5 "Layout — safe" 用 `background-image:url(...)` 形式，**且 URL 必须先经 `wechat-publish.ts` 路径替换成 mmbiz**（这一约束目前在 svg-modules 侧没显式断言，可考虑放进 wechat-safe.ts 的 lint 兜底，但属于另一个任务范畴）。

---

## Caveats / Not Found

- **未亲测**：本研究没有调用 web 搜索独立确认 2026 微信公众号编辑器对粘贴 `<details>`/`<summary>` 的最新行为，结论来自「InkForge sanitize 链 + 三源逆向证据 + 业界无人使用」三轴交叉。如要 100% 确认，建议在 `prompts/0601/evidence/wechat-paste/` 同侧再补一个 `details-paste-survival.html` 真粘贴测试。
- **未亲测**：横滑「桌面端公众号后台预览是否能用鼠标拖动滑动」未测；wechat-svg-capabilities.md §4 提到 "desktop preview does NOT trigger SMIL begin=\"click\"" 但 `scroll-snap` 是纯 CSS、与 SMIL 无关，原则上鼠标拖滚条/触控板侧滑应可，但需用户真机/真后台确认。
- **未实现**：`i-stretch` 折叠模块当前不在 `interactive.ts` 注册表（line 299-328）；本研究不写代码、不修改文件，仅给规格。
- **特殊标签**：`<mpvoice>` / `<mp-common-...>` / `<mp-style-type>` 等微信自有命名空间标签 — InkForge DOMPurify 会丢，**但 svg-modules 走独立注入（不经标准 wechat 流水线）已在生成 `mp-style-type` 尾标**（primitives.ts line 254）；用户文本侧粘贴 `<mpvoice>` 不可行，必须由工具调小程序卡片插入 UI。
