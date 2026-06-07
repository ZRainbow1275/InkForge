# Research: WeChat 公众号 SVG 动效与交互卡片真相 — 是秀米/135 怎么做的, 我们 wechat-safe.ts 哪些禁令过度保守

- **Query**: 秀米(xiumi.us) / 135编辑器(135editor.com) 等微信公众号编辑器的「SVG 动效 / SVG 交互卡片」如何实现、如何在微信粘贴后存活；逐条复审 InkForge `svg-modules/wechat-safe.ts` 的禁令是「真被微信剥」还是「我们过度保守」。
- **Scope**: External (web + GitHub primary sources) + Internal (复审 `inkforge/src/services/export/svg-modules/wechat-safe.ts`、`prompts/0601/research/wechat-svg-capabilities.md`、`prompts/0601/evidence/wechat-paste/*`、real-machine MEMORY)
- **Date**: 2026-06-03

---

## 0. TL;DR — 你要先看的三句话

1. **微信的渲染引擎本身（WKWebView/X5 系统 WebView）支持几乎全套 SVG**。真正的限制是 **微信的 HTML sanitizer 在「粘贴 / 保存草稿 / 发布」三步反复跑**，会剥 `<style>`/`<script>`/`<foreignObject>` 等非 SVG 动态面（confirmed）。**`id` 是否被剥则是「依场景」**：用于 SMIL 链式触发的 `id`（`<animate id="...">` + `begin="x.end+0.5s"`）在 opensvg 等量产编辑器里**正在被使用并工作**；但用于「画家模型」的 `id` 引用（`fill="url(#grad)"`, `clip-path="url(#m)"`, `<use xlink:href="#sym">`）**没有任何一个量产的微信 SVG 工具在用**——这是个共识级回避（不是「确认被剥」），意味着「也许能用、但社区集体不敢赌」。
2. **秀米/135/opensvg 的「SVG 互动」本质**：不是花哨的 SVG paint server（gradient/clip/mask），而是 **「`<section>` 容器 + 行内样式 + SVG 装 `background-image` 当画布 + SMIL `<animate>`/`<animateTransform>`/`<set>` 在 `<g>` 层做平移/淡入淡出/可见性切换 + CSS `scroll-snap`」**。所有「点击放大 / 切换 / 滑动翻页 / 滚动触发 / 计时动画」都是这套组合，**没有 `<linearGradient>`/`<clipPath>`/`<filter>`**。
3. **InkForge 当前 `wechat-safe.ts` 的禁令清单整体方向正确，但以下 3 条可以解禁、1 条值得软化、其余维持**——详见 §5 解禁清单。最大可解禁项是 **`<svg>` 嵌套 `<svg>`（opensvg 量产模式）**，以及 **`<animate>` 上的 `id`（SMIL 链式动画的前提）**。

---

## 1. 微信公众号正文 SVG 能力矩阵 (PC 编辑器 / 移动端 / 粘贴存活)

> 标注约定：✅=量产编辑器在用、实测通过；⚠️=量产编辑器避而不用（不是确认被剥，而是「无人敢赌」）；❌=被明确剥/过滤。
>
> 「PC 编辑器」=`mp.weixin.qq.com` 后台编辑器自身的预览；「移动端」=真机微信内打开文章；「粘贴存活」=从外部 HTML 复制粘贴到编辑器后是否保留语义。

### 1.1 根 / 形状 / 文本

| SVG 元素 | PC 编辑器 | 移动端 | 粘贴存活 | 证据 / 备注 |
|---|---|---|---|---|
| `<svg>` 根 + `viewBox` | ✅ | ✅ | ✅ | 所有源 (Yuezi/Lewis/opensvg) 必备 |
| `<g>` (含 `transform="translate/scale/rotate"`、`opacity`、`style="transform:"`) | ✅ | ✅ | ✅ | Yuezi 鞭炮 SVG (`<g style="transform: translate(140px,580px);">`)；opensvg StretchBlock `<g id="gif图2" transform="translate(2000 0)">` |
| `<path>` (含 `d`/`fill`/`stroke`/`transform`) | ✅ | ✅ | ✅ | Yuezi 鞭炮所有形状 |
| `<rect>` (含 `rx`/`ry`、`fill="rgba(...)"`、`stroke`、`stroke-width`、`opacity`) | ✅ | ✅ | ✅ | Yuezi `<rect width="92" height="229" rx="12" ry="12" fill="#fc4d50">`；Lewis seed `<rect ... rx="16" fill="rgba(102,126,234,0.15)" stroke="rgba(102,126,234,0.3)" stroke-width="1"/>` |
| `<circle>` (含 `cx`/`cy`/`r`/`fill`/`opacity`) | ✅ | ✅ | ✅ | Lewis seed 装饰光晕 `<circle cx="800" cy="200" r="300" fill="#667eea" opacity="0.06"/>` |
| `<line>` / `<polygon>` / `<polyline>` | ✅ (规范) | ⚠️ 量产未用 | ⚠️ 未验证 | 量产模板用细 `<rect height="1">` 当分隔线、用 `<path>` 当多边形——刻意回避 |
| `<text>` (含 `x`/`y`/`fill`/`font-size`/`font-weight`/`font-family`) | ✅ | ✅ | ✅ | Yuezi 「点击爆竹放飞梦想」`<text x="200" y="540" fill="#fff" style="font-size:30px">`；**字体只能用设备字体栈**（无 web font 嵌入） |
| `<tspan>` | ✅ (规范) | ⚠️ 量产未用 | ⚠️ 未验证 | Lewis 多行习惯用「多个 `<text>`」而非 `<tspan>` 包裹——刻意回避 |

### 1.2 SMIL 动画 (这是「微信 SVG 互动」的全部底层)

| 元素 / 属性 | PC 编辑器 | 移动端 | 粘贴存活 | 证据 |
|---|---|---|---|---|
| `<animate>` | ⚠️ 通常不触发 | ✅ | ✅ | 所有源在用 |
| `<animateTransform>` (translate/scale/rotate) | ⚠️ 通常不触发 | ✅ | ✅ | Yuezi `<animateTransform attributeName="transform" type="translate" values="0 0;0 -350" begin="click" dur="0.5s" fill="freeze" restart="never">` |
| `<set>` (visibility/opacity 切换利器) | ⚠️ | ✅ | ✅ | Lewis 点击放大 `<set attributename="visibility" to="hidden" begin="click+1s" fill="freeze" restart="never"/>` |
| `<animateMotion>` (路径动画) | ⚠️ 量产未用 | ⚠️ 量产未用 | ⚠️ 未验证 | 所有源刻意回避 (它依赖 `<mpath xlink:href="#path">` 的 id 引用，落入 §1.5 风险区) |
| `begin="click"` | ❌ PC 通常不响应 | ✅ 移动端 tap 触发 | ✅ | Lewis 与 opensvg 唯一可靠的触发器 |
| `begin="0s"` / `begin="1.5s"` (autoplay/delay) | ⚠️ PC 不一定播 | ✅ | ✅ | Lewis seed 装饰光晕 / Yuezi 「点击爆竹放飞梦想」标语循环 |
| `begin="id.end+0.5s"` (链式) | ⚠️ | ✅ | ✅ ‼️ | **依赖 `<animate id="animA">` 的 id 存活** — Lewis 给出真实写法 `<animate id="animA" .../>` `<animate begin="animA.end+0.2s" .../>` |
| `keyTimes` + `calcMode="discrete"` | ✅ | ✅ | ✅ | opensvg ClickSwitch `keyTimes="0;0.0000000000001;1" calcMode="discrete"` 做阶跃切换 |
| `calcMode="spline"` + `keySplines` (缓动) | ✅ | ✅ | ✅ | Lewis 给出全套缓动函数 (Apple 风 `0.5 0 1 1`、弹性 `0.68 -0.55 0.26 1.55` 等) |
| `fill="freeze"` + `restart="never"` | ✅ | ✅ | ✅ | **必填铁律**——否则点击动画不会「定住」、还会重复触发 |
| `repeatCount="indefinite"` (循环) | ✅ | ✅ | ✅ | Yuezi 「点击爆竹放飞梦想」无限循环 |
| `begin="touchstart"` / `touchend` | ❌ | ❌ | — | SVG SMIL 规范根本不包含——别试 |
| `begin="mouseover"` / `focusin` | ❌ 移动端无意义 | ❌ | — | 移动端没有 mouse/focus |

### 1.3 paint server (id-referenced) — 全部量产工具集体回避

| 元素 | PC 编辑器 | 移动端 | 粘贴存活 | 量产工具是否在用 | 证据 / 备注 |
|---|---|---|---|---|---|
| `<defs>` | ⚠️ (规范支持) | ⚠️ (规范支持) | ⚠️ **id 行为未公开** | ❌ **9/9 opensvg block + Lewis seed + Yuezi 都未用** | 共识级回避；理由是「id 可能被剥/重命名」 |
| `<linearGradient>` / `<radialGradient>` + `<stop>` | ⚠️ | ⚠️ | ⚠️ | ❌ 同上 | Lewis color-system 把「深色科技风渐变背景」写成 **CSS `background:#000 → #1a1a2e`**（注释「渐变」但实现是 CSS 不是 SVG）—— 这是个明确的「我们就是不想用 SVG gradient」信号 |
| `fill="url(#grad)"` | ⚠️ | ⚠️ | ⚠️ | ❌ 同上 | 与上一行同源；只要 id 被剥就断裂 |
| `<clipPath>` + `clip-path="url(#m)"` | ⚠️ | ⚠️ | ⚠️ | ❌ 同上 | 任意切角/圆角靠 `<rect rx="X">` 或 `<path>` |
| `<mask>` + `mask="url(#m)"` | ⚠️ | ⚠️ | ⚠️ | ❌ 同上 | 任意半透明/挖空靠 `opacity` + 叠加形状 |
| `<filter>` / `<feGaussianBlur>` / `<feColorMatrix>` 等 | ⚠️ | ⚠️ | ⚠️ | ❌ 同上 | 「光晕/模糊」一律用 `<circle r="300" opacity="0.06">` 替代（Lewis seed 注释 `<!-- 装饰光晕 -->`） |
| `<pattern>` + `fill="url(#pat)"` | ⚠️ | ⚠️ | ⚠️ | ❌ 同上 | 同上 |
| `<symbol>` + `<use xlink:href="#sym">` | ⚠️ | ⚠️ | ⚠️ | ❌ 同上 | Yuezi 在重复鞭炮形状时**整段重写**而非 `<use>`——明确的反例 |
| `xlink:href` 任意用法 | ⚠️ | ⚠️ | ⚠️ | ❌ Lewis 显式列入禁单 | 包括 `<animateMotion>` 的 `mpath`、`<use>` 等 |
| `href` (无 xlink) | ⚠️ | ⚠️ | ⚠️ | ⚠️ opensvg `<a href="...">` 链接在用 (FadeBlock) | `<a href>` 链接热区在 opensvg 是用的；但「资源引用 href」（`<image href>`、`<use href>`）没人用 |

**关键洞察**：上述「id 引用的 paint server」全军覆没在量产工具中。这**不是**因为微信明确剥，而是因为 **microsanitizer 行为对 id 不可预测**，量产团队不愿赌——经验上 id 在某些版本/路径下会被改写或剥掉，一旦 `url(#grad)` 找不到目标就是「无 fill 的破图」。

### 1.4 「容器/嵌套」相关 (这里有惊喜!)

| 元素 / 用法 | PC 编辑器 | 移动端 | 粘贴存活 | 量产工具是否在用 | 证据 |
|---|---|---|---|---|---|
| `<svg>` 内嵌套 `<svg>` (nested SVG) | ✅ | ✅ | ✅ | ✅ **opensvg ClickSwitchBlock 量产在用** | `<svg ...><g><svg style="background-image:url(...);">...</svg></g></svg>` —— **嵌套 svg 是 opensvg 的标配模式**，把每帧画成独立 inline svg 做底图容器 |
| `<foreignObject>` 内放 **HTML** | — | — | ❌ | ❌ Lewis 显式 DIES | 微信过滤 foreignObject 里的 HTML，事件绑定无效 |
| `<foreignObject>` 内放 **另一个 `<svg>`** | ⚠️ | ⚠️ | ⚠️ | ✅ **opensvg StretchBlock/ClickGifBlock 量产在用** | `<foreignObject x="0" y="0" width="100%" height="100%"><svg style="..." viewBox="..."></svg></foreignObject>` —— opensvg 用 foreignObject **当 SVG-in-SVG 的语法糖**而不是 HTML 容器；微信 sanitizer 对这种「内容仍是 SVG」的 foreignObject 似乎不剥（这点 Lewis 没覆盖，但 opensvg 是上线产品） |
| `<image href="...">` (SVG 内嵌位图) | ⚠️ | ⚠️ | ⚠️ | ❌ Lewis 与 opensvg 都不用 | 通用模式是 `<svg style="background-image:url(...)">` —— 把图片当 SVG 的 CSS 背景，不当 SVG `<image>` 子元素 |
| `<a href="...">` 包形状做超链接 | ✅ | ✅ | ✅ | ✅ opensvg FadeBlock 在用 | `<a :href="hotspot.link" target="_blank"><rect ... fill="transparent" style="cursor:pointer"/></a>` |

### 1.5 完全禁止 (DIES, 多源确认)

| 元素 / 属性 | 状态 | 证据 |
|---|---|---|
| `<script>` / 任何 JS | ❌ DIES | Lewis 铁律 #4「微信完全禁止 JS」 |
| `<style>` 块 (in-document CSS) | ❌ DIES | Lewis 铁律 #1「微信吞 `<style>` 标签」 |
| `class` + 类选择器样式 | ❌ DIES (实际无效) | `<style>` 被剥后 class 无所附；且 class 本身常被剥/改名 |
| `<foreignObject>` 内 HTML / 事件绑定 | ❌ DIES | Lewis 显式列出 |
| CSS `@keyframes` / `transition` / `animation` | ❌ DIES | 依赖 `<style>` |
| 外部 `<link>` / `<script src>` | ❌ DIES | Lewis 显式列出 |
| `<iframe>` / `<video>` / `<audio>` (内联 HTML) | ❌ DIES | Lewis 显式列出 (微信用自己的插件) |
| CSS `var(--x)` / `calc()` 在 inline style 中 | ❌ DIES | Lewis QA checklist「inline style 中无 CSS 变量 / 无 calc()」 |
| `<div>` (会被改写) | ❌ → 用 `<section>` | Lewis 铁律 #2 |

### 1.6 「会存活但 PC 编辑器看不到效果」类 (GOTCHA)

| 现象 | 含义 |
|---|---|
| SMIL `begin="click"` 在 PC 后台预览**不触发** | PC web 鼠标不会触发 mobile-Safari/X5 那种自动 click。**真机微信里才是真相**——所以 PC 编辑器预览看到的「不会动 / 卡片像死的」≠ 真机不工作 |
| SMIL `begin="0s"` 自动播放也常被 PC 编辑器**冻结在首帧** | 同上原因 |
| `viewBox` 被 PC 编辑器小写为 `viewbox` | 浏览器对两者都识别，**别被改写吓到** |
| `attributeName` 被小写为 `attributename` | 同上，渲染器忽略大小写 |
| 在外层 `<svg>` 用固定 `width="1080"` | 不会随屏宽缩放——必须 `width="100%"` |
| dark mode 自动反色 | SVG 本体的 `fill` 不会被自动反色；为避免页面级反色把 SVG 衬底打乱，量产做法是**在 SVG 内画一个全幅 `<rect fill="#0a0a0a"/>` 当自带背景** |

---

## 2. id 卡点深度解析 — 我们最该搞清楚的

### 2.1 三种 id 用途，三种命运

WeChat 对 id 不是「一刀切剥掉」也不是「全保留」。从对量产代码的观察看，**三类 id 用途，行为不同**：

| id 用途 | 例子 | 量产是否在用 | 推测 sanitizer 行为 | 风险等级 |
|---|---|---|---|---|
| **A. SMIL 同步用 id** —— `<animate id="A">` + `<animate begin="A.end+0.5s">` | Lewis 链式动画 `<animate id="animA" .../>` … `<animate begin="animA.end+0.2s" .../>` | ✅ Lewis 在用 | 大概率保留（否则链式动画在量产里早就坏了，Lewis 不会把它写进生产模板） | 🟡 LOW (但不是 ZERO) |
| **B. 容器定位/JS 操作 id** —— `<g id="hotspot1">`, `<section id="伸长1">` | opensvg StretchBlock `<g id="gif图1">`, `<section id="零高">` | ✅ opensvg 量产在用（甚至用中文 id！） | 大概率保留 (opensvg 是上线产品) | 🟡 LOW |
| **C. paint server 引用 id** —— `<linearGradient id="g">` + `fill="url(#g)"`、`<clipPath id="m">` + `clip-path="url(#m)"`、`<symbol id="s">` + `<use href="#s">` | (无量产案例) | ❌ **9/9 opensvg block + Lewis seed + Yuezi 全部回避** | **未知/不可预测** —— 全行业一致回避意味着「赌得起的人都不敢赌」 | 🔴 HIGH |

### 2.2 为什么 C 类风险特别高 (即使 A/B 类工作)

- **C 类一旦 id 被改写就「破图」**：`url(#grad)` 找不到目标 → fill 退化为黑 / 透明 / 默认 → 整张卡片视觉崩塌。**没有 graceful fallback**。
- **A/B 类即使 id 出问题，影响是「动效失效」**：用户看到静态首帧，但内容是完整的——降级体验仍可用。
- 这是「失败模式不对称」：C 类失败 = 视觉灾难；A/B 类失败 = 失去动效，仍可读。所以量产团队都愿赌 A/B 不愿赌 C。

### 2.3 秀米/135 怎么「让 url(#id) 不断裂」？答案：他们不用 url(#id)

经实测 9 个 opensvg block + Lewis seed + Yuezi 鞭炮 demo + buduan/Wechat-Blacktech-SVG + ixqbar/wxsvg + lyricat/wechat-format —— **全部零样本使用 `<linearGradient>`/`<clipPath>`/`<mask>`/`<filter>`/`<symbol>`/`<use>`**。

> 用户问的「秀米/135 如何让 gradient/clipPath 的 url(#id) 不断裂（如：每次随机长 id？内联到属性？xlink:href？）」—— **答案是「他们根本不用」**。他们用以下替代手法实现「视觉上看起来有渐变/有切割/有滤镜」的效果：
>
> 1. **「渐变」→ CSS `background:linear-gradient(...)` 写在 `<section style="...">` 的 inline style 上**（不是 SVG `<linearGradient>`）。微信明确保留 inline style 中的 `background-image` 包括 linear-gradient（虽然某些低端机降级）。
> 2. **「渐变」→ 多个半透明实色形状叠加**：在 SVG 里用 `<rect fill="rgba(0,0,0,0.06)"/>` + `<circle r="300" opacity="0.06"/>` 模拟「光晕/渐隐」。
> 3. **「圆角切割」→ `<rect rx="16" ry="16">`**（属性级 rx/ry，不依赖 clipPath）。
> 4. **「任意形状切割」→ `<path d="...">` 直接画**（不用 clipPath 切别人）。
> 5. **「模糊/发光」→ 大尺寸低透明形状**：`<circle cx="800" cy="200" r="300" fill="#667eea" opacity="0.06"/>` (Lewis seed 注释 `<!-- 装饰光晕 -->`)。
> 6. **「重复 motif」→ 整段复制粘贴 path 数据**：Yuezi 鞭炮的同一组 `<path>` 重复了 3×（不同 transform），不用 `<use>` 或 `<symbol>`。

---

## 3. SVG 交互/动效具体手法 — 真实代码样例

### 3.1 「点击放大」(Apple 标志性效果)

```html
<svg style="display:block;background-image:url('URL');background-size:cover;
     max-width:none !important;"
     viewbox="0 0 1080 516">
  <set attributename="visibility" to="hidden" begin="click+1s" fill="freeze" restart="never"/>
  <set attributename="opacity" to="0" begin="click" fill="freeze" restart="never"/>
  <animate attributename="width" values="100%;400%" begin="click" dur="1s"
           fill="freeze" restart="never" calcmode="spline" keysplines="0.5 0 1 1"/>
</svg>
```
来源: `S-N-Lewis/wechat-apple-layout/references/svg-animation-snippets.md` 第 1 节。**关键点**：图片本身是 SVG 的 `background-image`（不是 `<image>` 子元素）；点击把 `width` 从 100% 动画到 400% (突破列宽，靠 `max-width:none !important`)；1 秒后 set visibility 到 hidden 隐藏。

### 3.2 「点击切换 A→B」(opensvg ClickSwitchBlock 实战)

```html
<section style="display:block;width:100%;line-height:0;margin-top:-1px">
  <section style="height:0;overflow:visible">  <!-- 零高容器 -->
    <svg viewBox="0 0 1080 720"
         style="display:block;background-image:url('A.png');background-size:100%;background-repeat:no-repeat;"
         width="100%"></svg>
  </section>
  <section style="line-height:0">
    <svg viewBox="0 0 1080 720" opacity="0"
         style="display:block;background-image:url('B.png');background-size:100%;background-repeat:no-repeat;pointer-events:visiblePainted;"
         width="100%">
      <animate attributeName="opacity" values="0;1;1"
               begin="click" dur="1000s"
               fill="freeze"
               keyTimes="0;0.0000000000001;1"
               calcMode="discrete"/>
    </svg>
  </section>
</section>
```
来源: 实抓 `cailven/opensvg/src/components/blocks/ClickSwitchBlock/Preview.vue`。**核心技巧**：
- 两层 SVG (A 在上面零高容器、B 在下面 line-height:0 容器)；B 初始 `opacity="0"` 盖住 A 之上
- 点击 B 时，`<animate>` 用 `keyTimes="0;0.0000000000001;1" calcMode="discrete"` + `dur="1000s"` 制造**几乎瞬间的阶跃切换**（用动画当开关，因为 `<set>` 不能在 begin="click" 下做 0→1 切换 + freeze）
- 「零高容器」(`height:0;overflow:visible`) 是 opensvg 的标志性手法，让 SVG 用自己的 viewBox 撑高度而父容器不占布局空间

### 3.3 「滑动展开」(竖向 slide-up)

```html
<g transform="translate(0,1806)">
  <svg style="background-image:url('content.png');background-size:cover;"></svg>
  <animateTransform attributename="transform" type="translate"
    from="0 1806" to="0 0" dur="0.5s" begin="click" fill="freeze" restart="never"
    calcmode="spline" keysplines="0.42 0 0.58 1.0"/>
</g>
```
来源: Lewis svg-animation-snippets.md 第 6 节。**from/to 写法** vs `values=""` 写法都接受。

### 3.4 「横向滑动翻页」(纯 CSS scroll-snap, 不需 SMIL)

```html
<section style="scroll-snap-type:x mandatory; margin-top:-0.33vw;
                display:flex; overflow-x:auto; overflow-y:hidden;
                pointer-events:painted;">
  <section style="min-width:100%; scroll-snap-align:center; flex:none; flex-direction:column">
    <!-- 卡 1 内容 (一个独立 svg 或 section) -->
  </section>
  <section style="min-width:100%; scroll-snap-align:center; flex:none">
    <!-- 卡 2 内容 -->
  </section>
</section>
```
来源: 实抓 `cailven/opensvg/src/components/blocks/ScrollBlock/Preview.vue`。**关键 GOTCHA**：opensvg 在这里 *确实* 用了 `display:flex`，与 doocs/md 「postProcessForWechat 剥 flex」的说法相冲突。**和解**：`display:flex` 在顶层 `<section>` 上常被剥；但在「自包含的 scroll-rail」这类深嵌结构上能存活——验证依实例。InkForge 当前 `i-scrollcards` 用 `inline-block + white-space:nowrap + scroll-snap-type:x mandatory` 是更保守的做法（不依赖 flex 存活），**与 opensvg 模式互为冗余**。

### 3.5 「序列帧 GIF」(opensvg ClickGifBlock 套娃模式)

```html
<svg style="pointer-events:none" viewBox="0 0 W H">
  <g>
    <!-- 第一层 -->
    <foreignObject x="0" y="0" width="100%" height="100%">
      <svg style="background-image:url('frame1.png');" viewBox="0 0 W H"></svg>
    </foreignObject>
    <g>
      <!-- 第二层 (盖在第一层之上，等点击) -->
      <foreignObject x="1000" y="0" width="100%" height="100%">
        <svg style="background-image:url('frame2.png');" viewBox="0 0 W H"></svg>
      </foreignObject>
      <rect x="1000" y="0" width="100%" height="100%" opacity="0"
            style="pointer-events:auto">
        <set attributeName="visibility" from="visible" to="hidden" begin="click"/>
      </rect>
      <animateTransform attributeName="transform" type="translate"
                        values="-1000 0" fill="freeze" begin="click" dur="1000s"/>
    </g>
    <!-- 递归继续下一帧... -->
  </g>
</svg>
```
来源: 实抓 `cailven/opensvg/src/components/blocks/ClickGifBlock/Preview.vue` (递归 generator)。**关键**：
- 用 `<foreignObject>` **装另一个 `<svg>`**（不是 HTML）—— 这种用法社区在线产品在使用，与 Lewis 的「禁 foreignObject 内 HTML」并不矛盾（Lewis 禁的是 `<foreignObject>` 内 `<div>`/`<span>`，opensvg 这里塞 `<svg>` 就绕过了过滤器）
- 每点一次，最上层 `<g>` 的 `transform` 跳出去 1000 像素 + rect 隐藏 → 下一帧露出，连续点变成「点击 GIF」

### 3.6 「链式动画」(A 结束触发 B) —— id 关键证据

```html
<animate id="animA" attributename="width" from="100%" to="400%"
         begin="click" dur="1s" fill="freeze" restart="never"/>
<g opacity="0">
  <animate attributename="opacity" from="0" to="1"
           begin="animA.end+0.2s" dur="0.5s" fill="freeze" restart="never"/>
</g>
```
来源: Lewis svg-animation-snippets.md 链式动画节。**这是 id 在生产 WeChat SVG 中的真实用法证据**——`<animate id="animA">` 的 id 必须存活，否则 `begin="animA.end+0.2s"` 就找不到目标。Lewis 把它写进生产模板说明他们实测有效。

### 3.7 「计时动画 / 自动轮播」(SMIL 多帧用 keyTimes)

```html
<svg viewbox="0 0 950 600" style="width:100%;">
  <g>
    <svg style="background-image:url('s1.png');background-size:cover;"></svg>
    <animate attributename="opacity" values="1;1;0;0;1"
             keyTimes="0;0.3;0.33;0.97;1" dur="6s" repeatcount="indefinite"/>
  </g>
  <g>
    <svg style="background-image:url('s2.png');background-size:cover;"></svg>
    <animate attributename="opacity" values="0;0;1;1;0"
             keyTimes="0;0.3;0.33;0.63;0.66" dur="6s" repeatcount="indefinite"/>
  </g>
</svg>
```
来源: Lewis svg-animation-snippets.md 第 3 节。**完全不用 click 也不用 id**——纯时间触发器 + `repeatCount="indefinite"` 做无限轮播。

---

## 4. 「SVG 排版」整版手法 — 文字怎么进 SVG 又保持可读

### 4.1 量产共识：**SVG `<text>` 硬切多行，不用 `<foreignObject>` 塞 HTML**

证据：Lewis seed-svg-text-layout.html (Apple 级模板) 整页是 `<svg>`，文字全是 `<text>` 节点：

```html
<svg width="100%" viewbox="0 0 1080 1400" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 (SVG 自带不透明背 → dark mode 免疫) -->
  <rect width="1080" height="1400" fill="#0a0a0a"/>
  <!-- 装饰光晕 (大半透明 circle 模拟「光晕」) -->
  <circle cx="800" cy="200" r="300" fill="#667eea" opacity="0.06"/>
  <!-- 章节号 (大数字弱透明) -->
  <text x="80" y="120" fill="#667eea" font-size="120" font-weight="bold"
        font-family="Georgia, serif" opacity="0.15">01</text>
  <!-- 标题 -->
  <text x="80" y="260" fill="#ffffff" font-size="48" font-weight="bold"
        font-family="-apple-system, PingFang SC, sans-serif">标题</text>
  <!-- 副标题 (英文) -->
  <text x="80" y="320" fill="rgba(255,255,255,0.4)" font-size="24"
        font-family="-apple-system, PingFang SC, sans-serif">English Subtitle</text>
  <!-- 分割线 (用细 rect 不用 line) -->
  <rect x="80" y="380" width="920" height="1" fill="rgba(255,255,255,0.1)"/>
  <!-- 正文行 (每行一个 <text>，不用 <tspan>) -->
  <text x="80" y="450" fill="rgba(255,255,255,0.8)" font-size="28">正文第一行</text>
  <text x="80" y="500" fill="rgba(255,255,255,0.8)" font-size="28">正文第二行</text>
  <!-- 数据卡片 (rect 自带 rx，不用 clipPath) -->
  <rect x="80" y="640" width="440" height="160" rx="16"
        fill="rgba(102,126,234,0.15)" stroke="rgba(102,126,234,0.3)" stroke-width="1"/>
</svg>
```

**为什么这样做**：

1. **`<foreignObject>` 内 HTML 被微信剥** → 不能在 SVG 里嵌 `<div>` 排文字
2. **`<text>` 自动换行不支持** → 必须在生成端硬切到 N 字/行，每行一个 `<text>`
3. **设备字体差异**：iOS=PingFang SC, Android=系统字体 → 量产模板都用 `font-family="-apple-system, PingFang SC, sans-serif"` 优雅退化
4. **不要像素拼装** —— Android 字号 metrics 与 iOS 不同，硬贴文字会在 Android 上对不齐 → 留 ~10% 行高余量
5. **dark mode**: SVG 自带 `<rect fill="#0a0a0a"/>` 全幅背景 → 不被页面级反色搅扰

InkForge 当前 `interactive.ts` 的 `splitLines` 正是这套手法的实现 (`text.split` + 每行一个 `textLine`)，与 Lewis 模板**手法完全一致**。

### 4.2 整版「SVG 卡片」(背景纹理 / 渐变底 / 装饰边框 / 拼图)

| 装饰目标 | 量产手法 | 反面 (不要这样做) |
|---|---|---|
| 渐变背景 | CSS `background:linear-gradient` 在 `<section>` 上 OR 用 SVG 大半透明形状叠加 | ❌ SVG `<linearGradient>` + `fill="url(#grad)"` |
| 圆角卡片 | `<rect rx="16" ry="16">` | ❌ `<clipPath>` 切角 |
| 装饰边框 | `<rect ... stroke stroke-width>` | ❌ `<filter>` 描边 |
| 阴影 | 行内 CSS `box-shadow` 在外层 `<section>` 上；OR `<rect>` + `<rect>` 偏移 + opacity | ❌ `<filter feDropShadow>` |
| 光晕/发光 | 大半径低透明 `<circle>` 或 `<rect>` 叠加 | ❌ `<filter feGaussianBlur>` |
| 拼图/网格 | 多个 `<rect>` 平铺；OR 单个 `<path d="...">` 一次画完 | ❌ `<pattern>` |
| 角标/印章 | `<g transform="rotate(...)">` 加 `<rect>`/`<text>` | ❌ `<filter>` 仿做戳印效果 |
| 文字描边 | `<text stroke="..." stroke-width="..." fill="...">` (规范支持双 paint) | ❌ `<filter>` |
| 文字渐变填充 | **基本无解** —— 量产工具里**没有人在 SVG 里做「文字渐变填充」**；要做就改成「半透明文字叠加在带渐变背景的 rect 上」用视觉错觉 | ❌ `fill="url(#textGrad)"` |

---

## 5. 我方 `wechat-safe.ts` 禁令逐条复审 — 解禁清单

下表逐条对应当前 `inkforge/src/services/export/svg-modules/wechat-safe.ts:21-60` 的 19 条规则。

| # | 当前规则 (id) | 当前 detail | 复审结论 | 建议 |
|---|---|---|---|---|
| 1 | `no-class` (re: `\sclass\s*=`) | 微信剥 class，样式必须内联 | ✅ **维持** | 多源确认 (Lewis/doocs/md/wechat-format) |
| 2 | `no-style-block` (re: `<style[\s>]`) | 微信吞 `<style>` 标签 | ✅ **维持** | 多源确认 |
| 3 | `no-css-var` (re: `var\(\s*--`) | 微信不支持 CSS var() | ✅ **维持** | Lewis QA checklist 明确 |
| 4 | `no-calc` (re: `calc\(`) | 微信内联 style 不支持 calc() | ✅ **维持** | Lewis QA checklist 明确 |
| 5 | `no-div` (re: `<div[\s>]`) | 微信改写 `<div>`，须用 `<section>` | ✅ **维持** | 多源确认 |
| 6 | `no-foreign-object` (re: `<foreignObject[\s>]`) | 微信过滤 foreignObject 内 HTML | 🟡 **过严, 可软化为「禁止 foreignObject 内 HTML 子树」** | opensvg ClickGifBlock & StretchBlock **量产用 `<foreignObject>` 嵌套另一个 `<svg>`**——这种情况微信不剥；但 InkForge 当前根本不用 foreignObject 这条路，**保留全禁也无功能损失**。如未来想实现 opensvg 风格 GIF 序列帧才需要解禁。**当前建议: 维持，必要时再放开**。 |
| 7 | `no-id-referenced` (re: `<(defs\|linearGradient\|radialGradient\|clipPath\|mask\|filter\|feGaussianBlur\|feColorMatrix\|use\|symbol\|pattern)[\s>]`) | 依赖 id 引用的元素在微信不可靠 | 🟢 **维持核心，但建议拆分** | 9/9 opensvg block + Lewis seed + Yuezi 全部回避——共识级回避，**维持是正确的**。但建议在 detail 文案上更准确：**「这些元素的 id 引用机制行为不可预测，全行业回避；用半透明形状叠加 / rx 圆角 / 多 `<text>` 行 / `<rect>` 描边 替代」**——避免给人一种「微信明确剥」的错觉（事实上是「赌不起」） |
| 8 | `no-url-ref` (re: `url\(\s*#`) | fill="url(#id)" 依赖 id，微信剥 id 后失效 | ✅ **维持** | 与 #7 同源、同结论 |
| 9 | `no-style-transform` (re: style 中 transform:) | enforcePlatformCSS 会从 style 剥 transform；用 transform 属性 | 🟡 **维持但注意误伤** | 这条规则与 InkForge 的 `wechat.ts` postProcessForWechat 一致。**但**：Yuezi 量产 demo 在 `<g>` 上**同时**用 `transform="translate(...)"` (属性) **和** `style="transform: translate(140px, 580px);"` (CSS) ——双写共存。说明微信对内联 SVG 的 style transform **未必剥**，只是 doocs/md 等管线的后处理会剥。如果 InkForge 的 svg-modules 输出**不**经过 `postProcessForWechat` 的 transform 剥除，则不必这么严。当前 InkForge 的注入点位是「postProcess 之前」(MEMORY 确认)，所以**维持禁止用 transform 属性是简单且安全的**。 |
| 10 | `no-style-animation` (re: style 中 animation\|transition) | 微信剥 CSS animation/transition；用 SMIL | ✅ **维持** | 多源确认 |
| 11 | `no-keyframes` (re: `@keyframes`) | 需要 `<style>`，被剥 | ✅ **维持** |  |
| 12 | `no-script` (re: `<script[\s>]`) | 微信完全禁止 JS | ✅ **维持** |  |
| 13 | `no-xlink` (re: `xlink:href`) | 微信 FORBID xlink:href | ✅ **维持** | Lewis 显式禁单；opensvg 9/9 不用 xlink:href（只在 FadeBlock 用 `<a :href>` 普通 href 做链接） |
| 14 | `no-svg-image` (re: `<image[\s>]`) | 禁止 SVG `<image href>`，用 background-image 或 `<img>` | ✅ **维持** | 全行业用 `<svg style="background-image:url(...)">` 替代 SVG `<image>`，这是规范模式 |
| 15 | `no-bad-smil-trigger` (re: begin 中 touchstart\|touchend\|mouseover\|mouseout\|focusin\|focusout) | 移动端不可靠的 SMIL 触发器；用 begin="click" | ✅ **维持** | Lewis 显式禁单 |
| 16 | `no-fixed-svg-width` (re: `<svg ... width="\d+(?:px)?"`) | 外层 `<svg>` 禁固定 px 宽，须 width="100%" + viewBox | 🟡 **维持但注意嵌套情况** | **opensvg 量产模式：外层 `<svg>` width="100%"，内层 `<svg>` 仍 width="100%"`** —— 规则正确，不区分内外都该 100%。当前正则匹配任意 `<svg>` 都要 100% width，符合实情。 |
| 17 | `no-iframe` (re: `<iframe[\s>]`) | 微信过滤 iframe | ✅ **维持** |  |
| 18 | `no-media` (re: `<(video\|audio)[\s>]`) | 微信过滤 video/audio | ✅ **维持** |  |

### 5.1 可以「软化 / 解禁」的清单 (排序按收益)

#### 🟢 解禁项 1: **允许 `<animate id="...">` 用于 SMIL 链式动画** (高价值)

**当前状态**：`no-id-referenced` 规则的正则**只匹配 `<defs|linearGradient|radialGradient|clipPath|mask|filter|feGaussianBlur|feColorMatrix|use|symbol|pattern>`**，不覆盖 `<animate id="...">`。所以现在**实际上没有禁** SMIL id —— 只是 SMIL 模块自己没人写 id。**这意味着「解禁」其实只是「使用」**。

**收益**：实现 Lewis 风格的「链式动画」(`begin="animA.end+0.2s"`)，做出例如「点击图片 → 放大 → 再淡出文字提示」的多步动画序列。当前 `interactive.ts` 的 `i-sequence` 是用 `begin="0s/1.2s/2.4s"` 分别启动 3 帧，**可以升级为链式触发更稳健**。

**实现成本**：低 — 只需在 `primitives.ts` 的 `smilAnimate` 接受可选 `id` 参数，然后让模块内引用。

**风险**：低 — Lewis 量产模板在用、opensvg 用 id (`id="宽度动画1"`) 显式标 animate，证据强。

#### 🟢 解禁项 2: **允许嵌套 `<svg>` (svg-in-svg)** (中价值)

**当前状态**：`no-fixed-svg-width` 正则会击中**内层** `<svg>` 如果它写了 `width="N"`。但**内层 `<svg>` 用 `width="100%"` 是合法的**，规则不会误伤。`no-id-referenced` 也不击中 `<svg>` 本身。**所以也没禁，只是没用上**。

**收益**：能实现 opensvg 标志性的「**背景图层 SVG + 外层 SVG 做动画**」模式。例如点击放大用：
```html
<svg viewBox="0 0 1080 720" style="background-image:url(A.png)" width="100%">
  <animate attributeName="width" values="100%;400%" begin="click" dur="1s" .../>
</svg>
```
这是当前 `i-clickswitch` 没用上的更强模式 —— 当前实现是「文字卡片切换」，背景没有图。**未来用户需要「点击图片切换」时**，这条模式是唯一可走的路。

**实现成本**：中 — 需要新增模块支持「图片 URL 入参 → 渲染 background-image SVG」，并确认 raster.ts 在 xhs/zhihu 通道仍能截图（嵌套 SVG 可能导致 DOM 栅格化的兼容问题，需测）。

**风险**：中 — opensvg 是上线产品，证据充分；唯一未知是 Tauri 端 wdio 截图是否正确处理嵌套 SVG（建议跑一次 e2e 验证）。

#### 🟡 解禁项 3: **允许 `<a href="...">` 包形状做超链接** (低价值, 但 zero cost)

**当前状态**：现有规则**不禁**。但 svg-modules 当前没用上。

**收益**：让封面、署名卡、CTA 卡片**可点击跳外链**（如「关注公众号」「访问官网」）。

**实现成本**：低 — 在某些模块 (cover, endmark) 加可选 `href` 参数；包一层 `<a href target="_blank">`。

**风险**：低 — opensvg FadeBlock 量产在用；微信 sanitizer 不剥 `<a href>`。**注意**：微信会把外部 URL **自动改写到「未知来源」中转页**，但链接仍点得通。

#### 🟡 软化项 4: **`no-foreign-object` 文案改清楚: 「禁 HTML in foreignObject」而非「禁 foreignObject 元素」**

**当前 detail**：「微信过滤 foreignObject 内 HTML」

**问题**：detail 已经说明了「内 HTML」，但**正则匹配的是 `<foreignObject` 元素本身**，对所有 foreignObject 用法一视同仁。**这就 over-block 了 opensvg 的 「foreignObject 装另一个 SVG」用法**（这种用法量产工具在用且工作）。

**建议**：**保留当前正则**（功能上 zero-loss，因为 InkForge 当前不需要 GIF 序列帧），但**修订 detail 文案**为：

> 「微信过滤 `<foreignObject>` 内部的 HTML 子树（`<div>`/`<span>`/`<p>` 等）；内嵌另一个 `<svg>` 在 opensvg 等量产工具里能工作，但 InkForge 当前不依赖此模式，故全禁更简单」

**收益**：未来若想做 GIF 序列帧模块，规则不会成为误导（团队就知道是 self-imposed limit，不是 hard limit）。

#### ⚠️ 不建议解禁: `<defs>` / gradient / clipPath / mask / filter / use / symbol / pattern / `url(#)`

**结论**：维持全禁。理由：
1. 9/9 opensvg block + Lewis seed + Yuezi + buduan + ixqbar 全部回避 —— 共识级回避
2. 失败模式不对称（id 一旦被剥 → 整张图视觉灾难，无 graceful fallback）
3. **替代手法已被验证好用**（半透明形状叠加 / rx 圆角 / 多 `<text>` 行 / `<rect>` 描边）
4. InkForge MEMORY 6-01 真机验证「8 个 inline svg 全保留 零栅格化」也是在**不用** gradient/clipPath 的前提下取得的——保持现状最安全

如果将来必须解禁某个（如 `<defs>` + `<linearGradient>`），**唯一可接受路径**是：先在测试管线里加「真公众号 paste round-trip 测试」(MEMORY [[reference_wechat_render_selfcheck]] 已有方法)，把 paste 后 DOM 序列化回来 diff，确认 id 与 url(#) 都活下来再放——单凭代码层校验不够。

### 5.2 已经写对的事 (无需改，但值得标注)

- **`no-style-transform` 与 `no-style-animation`** 与 `inkforge/src/services/platform-rules/wechat.ts` 的 postProcess 完全对齐 —— 系统内自洽，不会因为「校验通过但 postProcess 剥掉」造成幽灵 bug
- **`no-fixed-svg-width`** 对内外 SVG 都强制 `width="100%"`，与 opensvg/Lewis/Yuezi 共识一致
- **`no-bad-smil-trigger`** 显式列举的 6 个事件 (touchstart/touchend/mouseover/mouseout/focusin/focusout) 与 Lewis 禁单完全吻合
- **整体 17 条规则做硬断言 (`assertWechatSafe` 抛错)** —— 比软警告 / TODO 注释强得多，是 CI 守护

---

## 6. 关键源汇总 (本次新增/复核)

| 源 | 用途 |
|---|---|
| `S-N-Lewis/wechat-apple-layout/references/wechat-svg-rules.md` (本次重 fetch) | 微信 SVG 过滤规则与 SMIL 兼容性矩阵 |
| `S-N-Lewis/.../references/svg-animation-snippets.md` (本次重 fetch) | 8 种 SMIL 动效真实代码 (点击放大 / 切换 / 轮播 / 链式 / 滑动 / 脉动 / 淡入 / 点击消失) |
| `S-N-Lewis/.../references/apple-article-anatomy.md` | 模式 A/B/C (全宽图 / 点击放大 / 横滑轮播) 三大结构 |
| `S-N-Lewis/.../references/color-system.md` | **关键证据**: 「深色科技风渐变背景」**实现是 CSS background:linear-gradient，不是 SVG linearGradient** |
| `S-N-Lewis/.../references/qa-checklist.md` | inline style 中无 var/calc 等硬性检查清单 |
| `S-N-Lewis/.../SKILL.md` | 12 条铁律（all-inline / 用 section / 禁 flex / 禁 JS / 禁 foreignObject / 禁百分比 / 必 viewBox / animate 必 restart=never / 点击必 fill=freeze / begin 仅 click / 每 `<p>` 显式 color / 图片用 background-image） |
| `S-N-Lewis/.../templates/seed-svg-text-layout.html` (本次重 fetch) | 纯 SVG 排版模板 - **零 defs/gradient/clipPath/filter/use** |
| `Yuezi32/weixin_svg_demo/index.html` (本次重 fetch) | 实际可粘进微信工作的 SVG demo（鞭炮放飞梦想）—— 同样零 defs/gradient |
| `cailven/opensvg/src/components/blocks/*` (本次重 fetch 全 9 个 block) | **量产 WeChat SVG 编辑器源码**：ClickGifBlock / ClickSwitchBlock / CustomBlock / FadeBlock / ImgBlock / ScrollBlock / StretchBlock / VerticalScrollBlock / ZeroHeightBlock —— **全 9 个 block 零 defs/gradient/clipPath/mask/filter/use；id 仅用于 SMIL 同步 + JS 触发热区** |
| `cailven/opensvg/README.md` | 编辑器自述的 7 种 block 类型与功能 |
| `doocs/md/packages/core/src/extensions/infographic.ts` | **`exportToSVG(node, { removeIds: true })`** —— 一个量产 WeChat md 转 HTML 工具**显式剥 SVG id**，旁证「id 不可靠」 |
| `doocs/md/.../extensions/katex.ts` & `mermaid.ts` & `plantuml` | KaTeX/Mermaid/PlantUML 输出确实包含 `<defs>` / `<use xlink:href>`，doocs/md **照原样塞进 WeChat**——理论上是「gradient/defs 工作」的反例，但实际效果未在本会话中真机验证（缺失最后一步） |
| `ixqbar/wxsvg` (基础.md / 旋转.md) | 一个个人笔记仓 —— 同样只用 `<rect>`/`<circle>`/`<animate>`，零 defs |
| `inkforge/src/services/export/svg-modules/wechat-safe.ts` | 复审目标本体 |
| `inkforge/src/services/export/svg-modules/interactive.ts` | 当前已实现的 4 个 SMIL 模块 (clickswitch / scrollcards / fadein / sequence) |
| InkForge MEMORY [[project_svg_typesetting]] | 6-01 真机验证「微信 ProseMirror sanitizer 完整保留 8 个 inline svg/rect/text/path、零栅格化」—— 在**不用** gradient/clipPath 的前提下取得 |
| InkForge MEMORY [[reference_wechat_render_selfcheck]] | 真公众号 paste round-trip 自验证方法（不要扫码，本地 Playwright + 合成 paste 即可） |

---

## 7. Caveats / 仍未确证的事

1. **没在本会话里做真公众号 paste round-trip 测试** —— 上面所有「能否解禁」结论都基于代码层面的源码考据（量产工具在用 ↔ 量产工具回避），**而不是「写一个 `<linearGradient>` 真的粘进微信看 id 还在不在」**。若要把 §5.1 任何解禁项真的开闸，**必须先按 MEMORY [[reference_wechat_render_selfcheck]] 跑一次 paste round-trip + DOM 序列化 diff**。
2. **doocs/md 的 MathJax/Mermaid 输出含 `<defs>`/`<use xlink:href>`** —— 这两个量产管线确实把这种 SVG 塞进 WeChat-bound HTML，但**本会话没确认其在真微信里的渲染保真度**。可能是「即使 id 被改写 MathJax/Mermaid 也降级到可接受样子」，也可能是「id 其实保留了」。这个反例值得未来用一篇 KaTeX 公式做 round-trip 测一下。
3. **微信 sanitizer 行为会随版本变动** —— 所有「DIES」结论都来自社区反向工程，**腾讯没有公开文档**。本研究的结论的「有效期」可能是 6–12 个月，需要周期性 round-trip 复测。
4. **PC 编辑器 vs 真机微信的渲染差异**是已知的（PC 不触发 SMIL click），但本会话没有真机截图证据；只能基于 Lewis 与 opensvg 团队的明示。**真机 SMIL 触发的最终权威只有真机**。
5. **本会话没访问到秀米/135editor 的实际导出 HTML 字节** —— 它们的 web 编辑器是 JS app + 登录墙；本研究的「秀米/135 怎么做」结论是从 `cailven/opensvg`（一个公开自我标榜为「**这两个编辑器开源克隆**」的项目）反推。证据强但不是原文字节级证据。要拿到原文最快的路径是手动跑一次秀米，导出 HTML 抓字节、grep `<linearGradient`/`<clipPath`，再写第二轮研究。
6. **`<animateMotion>` (路径动画) 完全未验证** —— 它的 `<mpath xlink:href="#path">` 落入 `no-xlink` 禁单。但 SVG 本身允许 `<animateMotion>` 直接写 `path` 属性而不用 mpath，这条路径量产工具也无人走。如果未来要做「物体沿曲线走」动画，要单独再研究一次。
7. **`<text>` 的 `textLength` / `lengthAdjust`（强制文字宽度对齐）** 全未验证，量产无人在用。InkForge 当前用 splitLines 硬切是更稳健的路径，可以维持。

---

## 8. 速查决策表 (给 Implement Agent)

> 「我要在 svg-modules 里实现 X，会过 wechat-safe 吗？」

| 想做的事 | 现状 (校验器允许吗) | 量产工具在做吗 | 建议 |
|---|---|---|---|
| 加 SMIL 链式动画 `begin="anim1.end+0.5s"` | ✅ 允许 (现规则不禁 animate id) | ✅ Lewis 用 | **可以做** |
| 在 SVG 里加渐变色 | ❌ 拦截 | ❌ 无人做 | **不要做**；改用 CSS `background:linear-gradient` on `<section>` 包裹，或多层半透明形状叠加 |
| 让某个形状变成圆角 | ✅ (`<rect rx>` 不被拦) | ✅ 全行业用 | **直接用 `<rect rx="16" ry="16">`**, 别想 clipPath |
| 模糊/发光效果 | ❌ filter 被拦 | ❌ 无人做 | **半径很大、opacity 6-15% 的 `<circle>`** 叠加 (Lewis 「装饰光晕」模式) |
| 让 SVG 嵌入另一张 SVG 当背景 (opensvg 模式) | ✅ 允许 | ✅ opensvg 量产 | **可以做**；外层 SVG 装 `background-image`, 内层 SVG 做动画 |
| 点击切换两张图 (像 opensvg ClickSwitch) | ✅ 允许 | ✅ opensvg | **可以做**；两层 `<g opacity>` + SMIL opacity 动画 + 透明 hot-zone |
| 文字在 SVG 里多行排版 | ✅ 允许 | ✅ 全行业 | **每行一个 `<text>`**，自己用 splitLines 切；不要用 `<tspan>` (规范支持但量产回避) |
| 复用一个图形多次 (重复 motif) | ❌ `<use>`/`<symbol>` 被拦 | ❌ Yuezi 直接复制粘贴 path | **复制粘贴 path 数据** 或 wrap 在 `<g transform="translate(...)">` 复用 markup（粘 3 次） |
| 给 SVG 内某段加超链接 (跳外站) | ✅ 允许 (无规则禁 `<a href>`) | ✅ opensvg FadeBlock | **可以做**；用 `<a href="..." target="_blank"><rect/></a>` 包透明 rect 当热区 |
| 让 SVG 在 dark mode 下不被页面反色 | ✅ 允许 | ✅ Lewis seed | **在 SVG 内画一个全幅 `<rect width=100% height=100% fill="#0a0a0a">`** 当自带不透明背景 |
| SVG 嵌入位图 | ❌ `<image>` 被拦 | ❌ 无人做 | **`<svg style="background-image:url(...)">`** 模式 |
| 触发 SMIL 用 touchstart/touchend | ❌ 拦截 | ❌ Lewis 禁 | 改 `begin="click"` |
| 在 SVG `<text>` 上做渐变填充 | ❌ `fill="url(#)"` 被拦 | ❌ 无人做 | **没办法**；用「半透明深色文字 + 渐变背景 rect」凑视觉错觉 |

---

## 9. 给 Implementer 的具体行动 (如要落地)

**如本研究被采纳为下一步实现依据**，建议的最小集修改清单（**仅是建议，本研究不改任何代码**）：

1. `inkforge/src/services/export/svg-modules/primitives.ts` 的 `smilAnimate` helper **加可选 `id` 参数**，让模块能写 `<animate id="...">`，配合 `begin="id.end+Ns"` 实现链式动画。
2. `inkforge/src/services/export/svg-modules/wechat-safe.ts` 的 `no-id-referenced` 规则的 `detail` 文案**改写**为：「这些元素的 id 引用机制在微信 sanitizer 中行为不可预测（全行业量产回避），用半透明形状叠加 / `<rect rx>` 圆角 / 多 `<text>` 行 / `<rect>` 描边替代」(规则本身不动)。
3. `inkforge/src/services/export/svg-modules/wechat-safe.ts` 的 `no-foreign-object` 规则的 `detail` 文案**改写**为：「微信过滤 `<foreignObject>` 内部的 HTML 子树（`<div>`/`<span>`/`<p>` 等）；内嵌另一个 `<svg>` 在 opensvg 等量产工具里能工作，但 InkForge 当前不依赖此模式，故全禁」(规则本身不动)。
4. （可选）新增一个 `i-clickimage` 交互模块（点击图片放大 / 切换两张图），实现 §3.1 / §3.2 的「图片型」交互——这是当前 4 个交互模块（全部是「文字卡片型」）的盲区。需配合 `inkforge/src/services/export/svg-modules/types.ts` 加 image URL 入参。
5. （可选）`i-sequence` 模块的 SMIL 触发器从「3 个独立 begin=0/1.2/2.4s」升级为「链式 begin="prev.end+1s"」用 §3.6 的链式动画模式 —— 稳健性更高（不依赖时钟同步精度）。
6. 增补 `inkforge/src/services/export/__tests__/` 一个 paste round-trip 测试（按 [[reference_wechat_render_selfcheck]] 方法），把 flagship-* 产物粘进 mp.weixin.qq.com 后台编辑器、序列化回来 grep `data-ink-svg` + count `<svg>` + check no `linearGradient` ——把当前的「单次手动验证」固化为可重跑断言（**这步比解禁更重要**）。

**不建议改的**：
- 不要解禁 `<defs>`/gradient/clip/mask/filter/use 任何一个。共识级回避太强，自爆代价太高。
- 不要解禁 `xlink:href`。`<a href>`（不带 xlink: 前缀）已经够用做超链接；其余 xlink 用途都落在禁单。
- 不要把 `no-svg-image`（禁 `<image href>`）解禁；`background-image:url(...)` 模式胜出。

