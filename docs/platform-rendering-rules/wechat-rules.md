# 微信公众号渲染规则手册

> 基于 2025-2026 年全网调研整理，参考 doocs/md、wxmp、md2oa 等项目实践验证

> 2026-06 收口规则：本文件与 [market-practices-catalog.md](./market-practices-catalog.md) 共同构成 InkForge 微信导出合同。若旧段落与 `prompts/0601/` 真实微信粘贴证据或微信官方编辑器插件规范冲突，以本节和 `.trellis/spec/frontend/wechat-svg-modules.md` 为准。

## 零、最终输出合同

InkForge 的微信公众号产物必须是可粘贴/可同步的 `inline-style HTML`，并可选包含经过校验的 WeChat-safe inline SVG 与 inline HTML block。市场工具经验只转化为规则和元素族，不复制 135/秀米模板。

### 0.1 产物类型

| 产物 | 默认用途 | 要求 |
|------|----------|------|
| Inline HTML | 正文、标题、引用、表格、代码、卡片、图框 | 所有视觉样式在 `style` 上，最终输出不得依赖 `<style>`、class selector、CSS var |
| WeChat-safe SVG | 封面图形、分隔符、印章、几何图标、少量 opt-in 互动 | 通过 `checkWechatSafe`，不用 id/class/defs/gradient/filter/use/url 引用 |
| HTML block | 旗舰标题、金句、数据卡、阅读条、文末落款 | 使用 `<section>`、`<p>`、`<span>` 和安全 inline style，文本可重排 |
| Raster fallback | 公式、复杂图表、复杂互动、XHS/Zhihu 降级 | 明确标记为图片/长图/海报，不伪装成富文本 |
| Publish checklist | 小程序卡片、视频号、投票、公众号名片、音频等后台组件 | 只能列入手动/官方后台步骤，无凭据不得标记成功 |

### 0.2 市场元素族映射

| InkForge rule group | 135/秀米实践映射 | 微信输出 |
|------|------------------|----------|
| `headline-system` | 标题、编号标题、图文标题、节日/行业模板标题 | HTML block 为主，SVG 只做图形装饰 |
| `body-system` | 正文、阅读条、一键排版、段落参数修正 | inline paragraph + reading bar + lede |
| `card-system` | 引用、提示、金句、数据卡、对比卡 | inline HTML card，图标用 inline SVG |
| `figure-system` | 图片边框、拼图、多图、长图 | 图片样式规范化，多图用 table/inline-block 或长图 |
| `guide-system` | 关注、分享、文末、二维码、预览分享 | 可输出落款/占位/清单，不伪造官方组件 |
| `interactive-system` | SVG 展开、切换、滑动、路径动画、触发区 | opt-in SVG，必须实测或降级 |
| `fallback-system` | 生成长图/PDF/视频、插件复制 | 图片/长图/发布清单/unavailable 状态 |

### 0.3 135/秀米实机规则转译

2026-06-08 登录态实机学习只沉淀为 InkForge 自有规则，不复制 135/秀米模板、会员素材、私有 SVG 代码或付费样式。

| 市场观察 | InkForge 微信规则 |
|----------|-------------------|
| 135：样式中心、模板中心、标题/正文/图文/引导/布局/节日/行业/小元素/SVG 分类 | 进入元素族 catalog；只作为 trigger、persona、quality detector 的 taxonomy |
| 135：点击展开/显示/切换/缩放/翻转/弹出/播放/抽签、滑动展示、图片轮播、长按显示、文字弹幕、区域触发、互动答题等 SVG taxonomy | 进入 `interactive-system` 候选；默认 `blocked`，只有通过 WeChat-safe SVG 校验和真实微信编辑器/移动端验证后才可标记可用 |
| 秀米：导入 Word/Excel/Markdown、导入公众号文章、一键排版、插件复制、继续复制粘贴、同步公众号 | 进入 artifact state machine：`imported`、`local-rendered`、`copy-to-editor`、`copy-to-wechat`、`plugin-transfer`、`sync-draft`、`published`，各状态独立验收 |
| 秀米：动作/动作列表/提取动作、点击动作、图层、定位、背景图、组件定位、多选对齐、SVG 图集 | 映射为 `layout-and-layer-system`；微信正文必须保持 DOM 可读顺序，绝对/自由布局默认降级为图片/长图 |
| 秀米：生成长图/PDF/视频、贴纸图文 | 作为 fallback artifact，不作为微信公众号正文富文本成功证明 |

交互 SVG 分级：

- `static-safe`：只含图形装饰、分隔符、印章、几何图标；可按默认 SVG 校验进入微信输出。
- `click-safe-candidate`：SMIL `begin="click"` 或时间序列，不依赖脚本、事件属性、class/id/外部 CSS；必须有 PC 编辑器和移动端触发证据。
- `mobile-only-risk`：只标注手机端触发、长按触发或依赖 `touchstart` 的效果；默认 `blocked`，必须提供静态 fallback。
- `script-or-dom-event`：依赖 `<script>`、`onclick`、`onload`、JS listener、外部 CSS、`<style>` 或 class selector 的效果；禁止进入微信正文输出。

状态证明规则：

- `copy-to-editor` 成功不等于 `copy-to-wechat` 成功。
- `plugin-transfer` 成功不等于平台渲染成功。
- `sync-draft` 成功不等于发布成功。
- `published` 必须由真实账号、授权、接口/后台返回、平台预览和必要的手机端检查共同证明。

### 0.4 禁止项

- 不使用 emoji 作为 InkForge UI 图标或系统装饰图标；用 `lucide-vue-next` 或 inline SVG path。
- 不输出事件处理器、脚本、`<style>`、外部 CSS、class/id 依赖。
- 不使用透明图片叠 SVG 隐藏真实图片，避免发布后图片不可编辑。
- 不用 fixed width/fixed height 撑版，不用 `line-height:0` 隐藏内容。
- 不把普通段落放进 `<pre>`。
- 不用 `position:absolute/fixed`、`flex/grid/gap`、animation/transition/filter。
- 不把无凭据同步/发布/上传标记为通过。

---

## 一、HTML 标签白名单

### 支持的标签

| 类别 | 标签 | 备注 |
|------|------|------|
| 段落/标题 | `<p>`, `<h1>`~`<h6>` | 结构化内容组织 |
| 文本修饰 | `<strong>`, `<b>`, `<em>`, `<i>`, `<u>`, `<br>`, `<del>`, `<sub>`, `<sup>` | 文字样式 |
| 列表 | `<ul>`, `<ol>`, `<li>` | 有序/无序列表 |
| 链接 | `<a>` | 外链触发安全提醒弹窗 |
| 图像 | `<img>` | 自动 max-width:100% |
| 布局 | `<section>`, `<div>`, `<span>` | 容器/行内容器 |
| 表格 | `<table>`, `<tr>`, `<td>`, `<th>`, `<thead>`, `<tbody>` | 完整表格支持 |
| 引用 | `<blockquote>` | 块引用 |
| 代码 | `<pre>`, `<code>` | 代码展示 |
| 水平线 | `<hr>` | 分隔线 |
| 媒体 | `<mpvoice>`, `<mpvideo>` | 微信专属媒体标签；只能由官方后台/真实授权路径验证 |
| SVG | `<svg>`, `<g>`, `<path>`, `<rect>`, `<circle>`, `<line>`, `<text>` | 仅限 WeChat-safe 子集，见 `.trellis/spec/frontend/wechat-svg-modules.md` |

### 不支持/被过滤的标签
- `<script>`, `<style>`, `<link>` — 安全限制
- `<iframe>`, `<embed>`, `<object>` — 嵌入限制
- `<form>`, `<input>`, `<button>`, `<select>` — 表单不支持
- `<audio>`, `<video>` — 需使用微信专属标签或后台组件
- `<canvas>` — 不作为正文输出
- SVG 中的 `<foreignObject>`, `<defs>`, `<linearGradient>`, `<clipPath>`, `<mask>`, `<filter>`, `<use>`, 外部 `<image href>` — 需降级或重写为安全子集

---

## 二、CSS 支持规则

### 核心规则
1. **仅支持内联 `style` 属性** — 不支持 `<style>` 标签和外部 CSS 文件
2. **不支持 `class` 属性** — 微信编辑器会过滤掉所有 class
3. **不支持 CSS 变量** — `var(--xxx)` 无效，必须替换为实际值
4. **不支持 `@media` 查询** — 内联样式中无法使用媒体查询
5. **不支持伪类/伪元素** — `:hover`, `::before` 等无效

### 支持的 CSS 属性

| 类别 | 属性 | 示例 |
|------|------|------|
| 字体 | `font-size`, `font-weight`, `font-style`, `font-family`, `color` | `font-size:16px; color:#333;` |
| 间距 | `margin`, `padding`, `line-height`, `letter-spacing` | `margin:16px 0; line-height:1.75;` |
| 对齐 | `text-align`, `vertical-align` | `text-align:center;` |
| 显示 | `display` (block/inline-block/table/table-cell) | `display:table-cell;` |
| 背景 | `background-color`, `background` | `background-color:#f7f7f7;` |
| 边框 | `border`, `border-radius`, `box-shadow` | `border-radius:4px;` |
| 装饰 | `text-decoration`, `opacity` | `text-decoration:underline;` |
| 尺寸 | `width`, `height`, `max-width`, `min-width` | `max-width:100%;` |
| 交互 | `pointer-events` | `pointer-events:none;` |
| 溢出 | `overflow`, `overflow-x`, `overflow-y` | `overflow:hidden;` |
| 定位 | 不推荐 | 使用结构顺序、margin、table-cell 替代 |
| 文字 | `white-space`, `word-break`, `word-wrap` | `word-break:break-all;` |
| SVG 变换 | `transform` XML 属性 | 仅用于 SVG presentation attribute，不写在 HTML style 内 |

### 不支持/有风险的 CSS
- `animation`, `transition` — 动画无效
- `@keyframes` — 不支持
- `position: fixed` — 无效
- `linear-gradient` — 部分设备不支持，建议回退纯色
- `filter` — 大部分不支持
- `backdrop-filter` — 不支持
- `clip-path` — 不支持
- `display:flex`, `display:grid`, `gap` — InkForge 后处理会移除，使用 `table` / `table-cell`
- `line-height:0`, fixed `width` / `height` — 会触发微信官方结构/可见性风险
- `text-align:start/end` — 终端表现不稳定
- `!important` — 破坏平台公共样式和 Dark Mode 修正

---

## 三、关键渲染约束

### 1. CSS 内联化（强制）
```
原始: <p class="paragraph">文本</p> + .paragraph { color: #333; }
转换: <p style="color:#333;">文本</p>
工具: juice 库（npm install juice）
```

### 2. CSS 变量替换（强制）
```
原始: style="color: var(--md-primary-color)"
转换: style="color: #1a73e8"
方式: 正则替换 var(--xxx) → 实际值
```

### 3. 外链处理（强烈推荐）
- 非 `mp.weixin.qq.com` 域名链接会触发「即将离开微信」安全提醒
- 最佳实践：外链转文末脚注
```
原始: 请参考 [这篇文章](https://example.com)
转换: 请参考 这篇文章[1]
脚注: [1] https://example.com
```

### 4. 嵌套列表修复（强制）
微信对 `<li>` 内嵌套 `<ul>`/`<ol>` 的渲染异常
```html
<!-- 原始（有问题） -->
<ul>
  <li>项目一
    <ul>
      <li>子项</li>
    </ul>
  </li>
</ul>

<!-- 修复后（兄弟节点） -->
<ul>
  <li>项目一</li>
  <ul style="margin-left:20px;">
    <li>子项</li>
  </ul>
</ul>
```

### 5. 代码高亮处理
- highlight.js 生成的 `class` 会被过滤
- 必须将高亮颜色转为内联 `style`
```html
<!-- 错误：class 会被过滤 -->
<span class="hljs-keyword">const</span>

<!-- 正确：内联样式 -->
<span style="color:#c678dd;">const</span>
```

### 6. 图片处理
- 微信自动添加 `max-width:100%`
- `width`/`height` 属性需移到 inline style
- 建议图片宽度 ≤ 640px
- SVG 内嵌图片**必须**使用微信素材库链接
```html
<!-- 原始 -->
<img width="600" height="400" src="...">

<!-- 处理后 -->
<img style="width:600px; height:auto; max-width:100%;" src="...">
```

### 7. 数学公式
- 微信不支持 MathML 或 LaTeX 直接渲染。
- KaTeX/MathJax 的 `katex-html` 不能直接作为最终通过项；需要转为 WeChat-safe SVG、PNG 或图片化公式。
- 公式 SVG 必须具备明确底色或 `currentColor`/显式 fill，避免 Dark Mode 下不可读。
- 若公式无法安全保留，输出为图片 fallback，并在质量报告中标明。

### 8. 表格样式
- 必须完全内联样式
- 建议添加 `border-collapse: collapse` 和单元格边框
```html
<table style="border-collapse:collapse; width:100%; margin:16px 0;">
  <tr>
    <th style="border:1px solid #ddd; padding:8px 12px; background:#f5f5f5;">标题</th>
  </tr>
  <tr>
    <td style="border:1px solid #ddd; padding:8px 12px;">内容</td>
  </tr>
</table>
```

---

## 四、富文本复制技术

### Clipboard API 方案（推荐）
```javascript
async function copyToClipboard(html: string, text: string) {
  const htmlBlob = new Blob([html], { type: 'text/html' })
  const textBlob = new Blob([text], { type: 'text/plain' })
  const item = new ClipboardItem({
    'text/html': htmlBlob,
    'text/plain': textBlob,
  })
  await navigator.clipboard.write([item])
}
```

### 关键影响样式属性列表（getComputedStyle 过滤用）
```javascript
const EffectCssAttrs = [
  'fontSize', 'fontWeight', 'fontFamily', 'fontStyle',
  'color', 'backgroundColor',
  'textAlign', 'lineHeight', 'letterSpacing',
  'whiteSpace', 'wordBreak',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'border', 'borderRadius', 'borderColor', 'borderWidth',
  'display', 'verticalAlign',
  'width', 'maxWidth', 'height',
  'textDecoration', 'opacity',
  'listStyleType',
  'overflowX', 'overflowY',
]
```

---

## 五、渲染管线参考（doocs/md 验证方案）

```
Step 1: Markdown → HTML (marked + 自定义 renderer)
Step 2: 代码高亮 (highlight.js, class → inline style)
Step 3: 数学公式 (KaTeX → SVG)
Step 4: 安全清理 (DOMPurify.sanitize)
Step 5: 容器包装 (createContainer)
Step 6: CSS 内联化 (juice)
Step 7: 后处理
  ├── 嵌套列表修复 (li > ul → 兄弟节点)
  ├── 图片样式处理 (attr → inline style)
  ├── SVG 兼容性 (Mermaid 图表)
  ├── CSS 变量替换 (--var → 实际值)
  └── 外链转脚注
Step 8: 输出 WeChat-Compatible HTML
```

## 六、微信官方编辑器规范补充

微信官方编辑器插件规范已经明确若干会破坏编辑器和移动端呈现的风险。InkForge 质量检测与代码实现应覆盖这些点：

| 风险 | 规则 |
|------|------|
| 透明 `<img>` 叠加 SVG 背景图 | 禁止用来替代可编辑图片；图片应真实可见、可转存、可替换 |
| `line-height:0` | 禁止包裹文本内容 |
| fixed `width` / `height` | 容器不得固定到桌面宽度；移动端不能溢出或不可见 |
| `text-align:start/end` | 统一改为 `left`、`center`、`right` |
| SVG `animate begin` 仅 `touchstart` | opt-in 互动 SVG 需要同时覆盖 PC 和移动触发；默认不输出 DOM 事件处理器 |
| 普通段落放进 `<pre>` | 仅代码块使用 `<pre>`；普通正文使用 `<p>` 或 `<section>` |
| 深色模式渐变文字背景 | 文字背景使用纯色或有明确 fallback，渐变仅用于无文本装饰 |
| SVG 承载纯文本 | 尽量改为 HTML block；必须用 SVG 时要显式底色和 fill |

## 七、验证要求

- `convertToWechatWithStats` 后的最终 HTML 必须再次做 forbidden CSS / raw class / raw style tag / SVG safety 检测。
- 旗舰预设必须同时验证 `preview` 和 `wechat` target。
- 修改 SVG 或 HTML block 后，需要运行 `svg-modules`、`platform-rules`、`preview-fidelity` focused tests。
- 有真实微信公众号粘贴权限时做 paste recheck；没有权限时标记为 `blocked: needs real WeChat editor paste`，不可写成通过。
