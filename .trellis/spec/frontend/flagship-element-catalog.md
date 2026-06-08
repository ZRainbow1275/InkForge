# 旗舰排版元素目录（Flagship Element Catalog）

> 「墨铸」旗舰预设（flagship-kiln / flagship-tempera / flagship-amber）使用的 inline-SVG +
> HTML 色块装饰元素的统一目录。每个元素 = 一条**规则**：触发方式 + 微信安全输出要点 +
> 品牌几何 + 装饰器函数 + 幂等哨兵。后期工具 UI（InkForge 工具栏）接入元素时按此目录读规则
> 「按钮 → 插 marker / 自动应用」。
>
> 母题统一：方格 grid × 菱形 diamond × 印章 × 构成主义。零 emoji。**preview + wechat 双轨执行**。
> 所有装饰器：`(palette, opts?) => (html, target) => html`，幂等（data-ink-block / data-ink-svg）。
> 非旗舰预设零行为改动。
>
> 2026-06 market supplement: 135/Xiumi are reference systems for taxonomy and workflow only.
> InkForge must not copy proprietary templates. New families should map into the catalog below,
> preserve the `墨铸 / Quiet Press / flagship editorial` identity, and keep non-WeChat targets as
> semantic Markdown/plain-text/image fallbacks.
>
> Runtime catalog: `inkforge/src/services/export/style-catalog.ts` is the typed availability
> surface for user-selectable style choices. This document describes the element families; the
> runtime catalog decides whether a style is available, blocked, or unavailable for a platform
> based on current evidence.
>
> 2026-06-08 element probe: `prompts/0601/evidence/market-editor-element-probe-20260608.txt`
> confirms current logged-in WeChat/135/Xiumi browser surfaces. It expands taxonomy and workflow
> gates only; it does not permit copying market templates or promoting plugin/sync/H5/mobile-only
> capabilities without exact InkForge runtime evidence.

---

## 0. 市场规则族映射

| Rule group | Market reference | Flagship implementation boundary |
|------------|------------------|----------------------------------|
| `headline-system` | 135 标题/模板中心、秀米图文标题/自由布局 | H2/H3/cover only through existing decorator chain; no copied template geometry |
| `body-system` | 一键排版、阅读头、正文参数修正 | `decorateFlagshipReadingBar`, lede, paragraph rhythm; no renderer replacement |
| `card-system` | 引用、金句、数据、提示、对比 | `pullquote`, `callout`, `stat`; icon must be inline SVG path, never emoji |
| `figure-system` | 图框、多图、长图、图片设计 | `decorateFlagshipFigure` and raster/long-image fallback; no hidden transparent image overlay |
| `guide-system` | 关注、分享、文末、二维码、预览分享 | footer/colophon and publish checklist; no fake official-account widgets |
| `interactive-system` | SVG 展开、切换、滑动、路径动画、区域触发 | opt-in only; must pass WeChat-safe validation plus real-editor verification or degrade |
| `fallback-system` | 长图/PDF/视频、插件复制、多平台分发 | XHS image pages/long image, Zhihu clean Markdown, explicit `blocked` for missing credentials |
| `editor-workflow-system` | 135/秀米导入、插入、一键排版、校对、复制、插件传输、同步草稿、预览分享 | UI may expose commands only through existing renderer/quality gates; artifact states are not interchangeable |
| `layout-and-layer-system` | 秀米图层、定位、背景图、组件定位、多选对齐、SVG 图集 | WeChat output preserves readable DOM order; free canvas/layer overlap degrades to raster/long-image unless proven safe |

Any new catalog element must declare:

- trigger type.
- WeChat artifact type: HTML block, WeChat-safe SVG, raster fallback, or publish checklist.
- XHS artifact type: plain text, image page, long image, or unavailable.
- Zhihu artifact type: Markdown semantic, image fallback, or unavailable.
- XHS manifest/page-count/reference consistency contract when the element can produce an image
  page, long image, cover, or carousel artifact.
- Zhihu image-host and raw diagram fence handling when the element can produce image fallback,
  formula/diagram/table raster output, or Markdown image references.
- safety validator and negative tests.
- idempotency sentinel.
- source/provenance when imported from an external editor artifact.
- action state produced by UI commands: local-rendered, copied, plugin-transferred, synced-draft,
  preview-shared/platform-previewed, scheduled-send/scheduled-publish, published, blocked, or
  unavailable.
- layout report when the element uses background layers, z-order, hit areas, or raster fallback.

---

## 1. 触发方式分类

| 类型 | 含义 | 工具 UI 形态 |
|------|------|--------------|
| **auto-structural** | 装饰器自动识别 HTML 锚点（`<h1-3>`/`<hr>`/`<blockquote>`/`<img>`/阅读头）并替换 | 无 UI（背景自动） |
| **auto-decoration** | 装饰器在文档首/末追加（cover / footer / TOC） | 「插入旗舰封面/版权页/目录」按钮 |
| **marker (markdown)** | 正文写约定标记（`> 金句：…` / `[数据] …`）触发 | 「插入金句卡 / 数据块」按钮 → 写 marker |

---

## 2. 元素目录（R1–R4 全量）

### R1–R3 已有元素

| 元素 | 触发 | 微信安全输出要点 | 品牌几何 | 装饰器函数 | 幂等哨兵 |
|------|------|------------------|----------|-----------|----------|
| **封面卡** | auto-structural（首部 SVG 插入） | `<svg viewBox width="100%">` + 顶部满幅 `accentDeep` 色带 + 巨号标题 + 重 accent tab + 右下方印 | 报头 nameplate / 印章 / 双线规则 | `composeSvgDecorate({cover})` → `renderCoverTitle` / `renderCoverGrid` | `data-ink-svg="cover-*"` |
| **分隔线** | auto-structural（替换 `<hr>`） | `<svg>` 内联 + 实心 accent 菱形 / 网格 / Forge Line + hairline 两侧 | 实心菱形 / 2×2 方格 / 锻造光晕 | `composeSvgDecorate({replaceHr})` → `divider-{diamond,grid,forge}` | `data-ink-svg="divider-*"` |
| **首字下沉** versal | auto-structural（首段第一个文本字符） | 内联 `<span>`，`background-color:{accentDeep}` + 反白 #fff + 52×52 方块 | 铸字方印（accentDeep + 白字 + serif） | `decorateFlagshipLede(palette)` | `data-ink-block="flagship-lede"` |
| **章节头** H2 | auto-structural（替换 `<h2>`） | `<section>` 嵌套 + `background-color:{accentDeep}` + `border-radius:4px` + 反白 + 方格铸号 svg | 方格铸号（白描边方框 + 套准小方 + 反白号）+ 节奏基线 3 小方块 | `decorateFlagshipH2(palette,{variant})` | `data-ink-block="flagship-h2"` |
| **小节头** H3 | auto-structural（替换 `<h3>`） | `<section>` + 底线 hairline + ink 标题 + 方格锚 svg | 方格锚（2×2 描边 + 实心朱文格） | `decorateFlagshipH3(palette)` | `data-ink-block="flagship-h3"` |
| **引用卡** QUOTE | auto-structural（默认 blockquote 分支） | `<section>` 左 7px accent 条 + 斜角三角 svg + 菱形收尾 + 内部 HTML 保留 | 构成主义斜角 + 菱形 | `decorateFlagshipBlockquote(palette)` (quote 分支) | `data-ink-block="flagship-quote"` |
| **CALLOUT 提示框** | marker（blockquote 首段以 `提示`/`注意`/`重点`/`警告`/`要点`/`Note`/`Tip`/`Warning` 起头） | `<section>` 左 5px 条 + `accentTintStrong` 底 + 内联 `<svg><path>` 图标 | octicon path（info / warn / tip） | `decorateFlagshipBlockquote(palette)` (callout 分支) | `data-ink-block="flagship-callout"` |
| **列表** UL | auto-structural（包 `<ul>/<li>`） | `<ul style="list-style:none">` + 每 li 前置实心 accent 菱形 svg + `display:inline-block` | 实心菱形 | `decorateFlagshipLists(palette)` (UL 分支) | `data-ink-block="flagship-ul"` |
| **列表** OL | auto-structural（包 `<ol>/<li>`） | `<ol style="list-style:none">` + 每 li 前置 22×22 方块 chip + 右上 1px 套准小白点 | 方格铸号 chip（border-radius:3px） | `decorateFlagshipLists(palette)` (OL 分支) | `data-ink-block="flagship-ol"` |
| **关键句高亮** | auto-structural（`<strong>` CSS） | juice 内联 `background:rgba({accent},0.18) + border-bottom:2px solid rgba({accent},0.5)` | accent rgba 半透明带 | flagship `#nice strong` CSS（themes.ts） | n/a（CSS 内联） |
| **文末落款卡** colophon | auto-decoration（文末追加） | `<section>` paperWarm 卡 + 双细线 + vessel mark svg + 方印 svg + 全文完 | vessel mark / 双线 / 方印（accentDeep + 白印文） | `decorateFlagshipFooterCard(palette,{brand,tagline})` | `data-ink-block="flagship-footer"` |

### R4 新增（2026-06-02）

| 元素 | 触发 | 微信安全输出要点 | 品牌几何 | 装饰器函数 | 幂等哨兵 |
|------|------|------------------|----------|-----------|----------|
| **E1 品牌阅读条** | auto-structural（替换 `buildReadingTimeHeader` 注入的裸 `<div>阅读约 X 分钟 全文 Y 字</div>` 块） | `<section>` 上下细线 + 小方格 svg + 「墨铸 · {persona栏目}」+ 实心菱形 sep + 「全文 Y 字 · 约 X 分钟 · 第 01 期」 | 小方格 + 实心菱形分隔 | `decorateFlagshipReadingBar(palette,{variant?})` | `data-ink-block="flagship-readbar"` |
| **E2 篇目目录** | auto-decoration（按原始 `<h2>` 收集；必须在 H2 装饰前） | `<section>` accentTint 底 + 左 5px accent 条 + 「本期目录」标头 + 每 H2 一行（方格小号 svg + 标题）；≤1 个 H2 不生成 | 方格铸号小尺寸（accent 底 + 反白号） | `decorateFlagshipTOC(palette)` | `data-ink-block="flagship-toc"` |
| **E3 金句大字卡** | marker（blockquote 首段以 `金句` / `金句：` / `[金句]` 起头） | `<section>` paperWarm 底 + 居中 + 大装饰引号 svg + 22px 600 居中正文 + 双线 + 「墨铸 · 菱形」收尾 | 大装饰引号 + 双线 + 菱形 | `decorateFlagshipBlockquote(palette)` (pullquote 分支，优先于 callout/quote) | `data-ink-block="flagship-pullquote"` |
| **E4 数据 callout** | marker（`<p>[数据] 大数字 \| 标签 \| 描述?</p>`） | `<section>` accentBorder 描边 + accentTint 底 + 40px 800 accent 实色大数字 + 15px ink 标签 + 13px inkSoft 描述 + 收尾菱形 | 方格铸框 + 菱形 | `decorateFlagshipStat(palette)` | `data-ink-block="flagship-stat"` |
| **E5 品牌图框** | auto-structural（`<p><img></p>` 或裸 `<img>`） | `<section>` paperWarm 衬纸 + hairline 边 + 圆角；img 补 `display:block;width:100%;border-radius:6px;`；alt 非空 → 题注行（小方格 svg + alt 文本） | 衬纸 + 小方格题注 | `decorateFlagshipFigure(palette)` | `data-ink-block="flagship-figure"` |

---

## 3. Chain 顺序（旗舰 decorate）

```
1. composeSvgDecorate(plan)           // SVG 图形：封面 / 分隔
2. decorateFlagshipReadingBar         // 替换裸阅读头（必须先于 lede，否则 lede 落上）
3. decorateFlagshipStat               // marker `<p>[数据]…</p>` → stat 块（必须先于 lede + H2）
4. decorateFlagshipFigure             // `<img>` → figure 框
5. decorateFlagshipLede               // 首段首字 versal（跳过 readbar/blockquote/data-ink）
6. decorateFlagshipTOC                // 按原始 `<h2>` 生成（必须先于 H2 装饰）
7. decorateFlagshipH2                 // H2 → 满幅章节头
8. decorateFlagshipH3                 // H3 → 方格锚 + 底线
9. decorateFlagshipBlockquote         // pullquote > callout > quote 三分流
10. decorateFlagshipLists             // UL 菱形 / OL 方号
11. decorateFlagshipFooterCard        // 文末追加版权页
```

---

## 4. 微信安全硬约束（所有元素共享）

- **允许**：`color`/`background-color`/`background(实色)`/`border`/`border-left`/`border-radius`/
  `padding`/`margin`/`box-shadow(非 inset)`/`font-*`/`text-align`/`line-height`/`letter-spacing`/
  `display:inline-block`/`vertical-align`/`word-break`/`opacity`。
- **禁止（被 postProcessForWechat / enforcePlatformCSS / DOMPurify 剥）**：
  `class` / `id` / `<style>` / `var(--)` / `calc()` / `linear-gradient` / `radial-gradient` /
  `transform`(style 内) / `transition` / `animation` / `filter` / `flex` / `grid` / `position` /
  输出 `<div>` / `box-shadow ... inset` / `xlink:href`。
- **内联 SVG 子集**：仅 `<svg viewBox width="N">`（固定 px 在 inline html-blocks 内 OK）+
  `<rect>`/`<path>`/`<line>`/`<circle>`/`<text>` + `fill`(hex/rgba) + `stroke` + `opacity` +
  `transform`(XML 属性)。**禁** `<defs>`/`<linearGradient>`/`<clipPath>`/`<mask>`/`<filter>`/
  `<use>`/`<symbol>`/`url(#)`/`<foreignObject>`/`<image href>`。
- **图标**：仅内联 SVG `<path>`（octicon 风格）或几何标点。**绝不 emoji**。
- **幂等**：所有装饰器先检 `data-ink-block` / `data-ink-svg` 哨兵；二跑 === 一跑。

---

## 5. 测试守护

- `svg-modules/__tests__/html-blocks.test.ts` — R1–R4 全部装饰器单测（含幂等 + 无禁用构造 +
  preview/wechat 双轨）。
- `svg-modules/__tests__/wechat-safe.test.ts` — 安全子集校验器（17 规则）。
- `services/export/__tests__/emit-flagship-artifacts.test.ts` — 真管线集成 + 三旗舰产物
  含 `data-ink-svg` + `data-ink-block="flagship-{h2,quote|callout,ul|ol,footer}"`。
- `services/export/__tests__/flagship-pipeline-smoke.test.ts` — 真 `convertToWechatWithStats`
  端到端，每个 `<section data-ink-svg>` 块经全管线后 `checkWechatSafe===[]`。

---

## 6. 后期工具化接入点（InkForge 编辑器 UI）

| UI 按钮 | 写入 markdown | 触发元素 |
|---------|---------------|---------|
| 「金句」 | `> 金句：{正文}` | E3 pullquote |
| 「数据块」 | `[数据] {大数字} \| {标签} \| {描述}` | E4 stat |
| 「提示」 | `> 提示：{正文}` | callout |
| 「警告」 | `> 警告：{正文}` | callout（ember） |
| 「目录」 | （自动，无 marker） | E2 TOC |
| 「插入图片」 | `![{alt}]({url})` | E5 figure |

（自动元素无需 UI 按钮：封面 / 分隔 / 阅读条 / 首字下沉 / H2/H3/列表 / 版权页 — 由 chain 自动应用。）

### 6.1 市场工具化边界

- 135/秀米的样式中心、模板中心、SVG 中心和图文编辑器只提供功能分类、工作流和质量门参考；不得导入、复刻或硬编码其模板几何、会员素材、私有 SVG 代码、品牌资产。
- 「一键排版」按钮只能调用既有 flagship decorator chain、preset renderer 和 quality detector；不得绕过 `convertToWechatWithStats`、`checkWechatSafe`、XHS/Zhihu leakage checks 或 artifact manifest。
- 「插件复制」「同步公众号」「生成长图/PDF/视频」是输出渠道，不是渲染成功证明。UI 必须区分本地 artifact、剪贴板复制、插件传输、草稿同步、发布完成与不可用状态。
- 135-style `AI排版` / `AI生图` / `AI图表` / `文案转笔记` and Xiumi-style `图文/H5/设计` creation entries are ingress or artifact-family selectors. They must first materialize audited Markdown, image manifests, or long-image artifacts, then pass the same platform renderer and quality gates.
- `授权公众号` / `定时群发` / `团队功能` / `企业内容中台` / `开放接口` / `私有化部署` are credentialed distribution or integration states. A UI affordance may expose them only as blocked/unavailable/checklist states unless a real account, team permission, endpoint, and platform preview are verified.
- 图层/自由布局/背景图/动作列表进入工具 UI 时，必须先声明目标平台：WeChat 使用 inline HTML/SVG 安全子集或图片 fallback，XHS 使用图片页/长图，Zhihu 使用 Markdown/图片 fallback。
- XHS 图片页/长图必须生成 manifest、页码/封面/正文引用一致性报告和裁切报告；任何数量、文件、引用不一致都应阻断导出或标记 `unavailable`。
- Zhihu 图片 fallback 必须是 public HTTPS/platform-host URL 且有 alt/caption；本地、`blob:`、`data:`、localhost/private IP、临时预览 URL、微信专用 CDN 或 raw diagram fence 必须阻断、图片化或标记 `blocked`。
- 任何新按钮图标继续使用已安装图标库或 inline SVG path；不得使用 emoji 图标。
- `flagship-amber` 当前在 runtime catalog 中保持 `blocked`：2026-06-08 真实微信普通
  `text/html` 剪贴板粘贴已证明它会降级为纯文本。若后续采用插件传输、开发者工具 HTML
  替换或授权同步，必须用新的 channel evidence 单独升级，不得复用普通剪贴板结论。

### 6.2 用户样式选择 UI 合同

The UI for future style selection must be a gate-aware control surface, not a template gallery
that implies every market effect is available.

| UI control | Data it must carry | Allowed states | Required action |
|------------|--------------------|----------------|-----------------|
| Platform segmented control | `wechat` / `xiaohongshu` / `zhihu` | selected | Re-run quality detection after every switch |
| Style family menu | rule group and choice id | available / blocked / unavailable | Hide or disable unsupported platform styles |
| Visual strength control | low / medium / high | available when renderer exists | Keep source text editable; high strength may route to image artifact |
| Motion toggle | none / static / click candidate / mobile-only | disabled by default for risky items | Require static fallback and evidence label before enabling |
| Evidence badge | `doc-only` through `published` | read-only | Never upgrade without exact artifact proof |
| Fallback selector | inline HTML / static SVG / raster / long-image / checklist | required for risky styles | Persist fallback in export options/report |
| Publish/sync command | copy / plugin / sync / preview / scheduled send / publish | credentialed or blocked | Verify account/permission and keep channel states separate |

Implementation rules:

- ExportModal may surface the catalog as a read-only capability panel and preflight row via
  `getPlatformStyleAvailabilityReport()`. It must not duplicate catalog constants in the
  component, and it must not let blocked/unavailable choices look selectable.
- Preview and scheduled-send states are separate from publish. A preview link proves only that
  the preview entry is visible for the current artifact; scheduled send proves only a
  credentialed distribution setup, not final publish success.
- Available WeChat choices must pass the WeChat detector before copy. Choices that trigger
  `wechat-event-handler`, `wechat-unsupported-css`, `wechat-unsafe-svg-construct`, or
  `wechat-katex-html` are hard-blocked.
- XHS choices can never write rich HTML/SVG into the body. High-visual choices must point to
  image pages, posters, or long images with manifest checks.
- Zhihu choices can never depend on WeChat wrappers or inline CSS. High-visual choices must
  become semantic Markdown or public-host image fallback with alt/caption.
- UI icons use installed icon libraries or source-owned inline SVG paths. Text labels may use
  Chinese platform terms, but visual icons must not be emoji.
