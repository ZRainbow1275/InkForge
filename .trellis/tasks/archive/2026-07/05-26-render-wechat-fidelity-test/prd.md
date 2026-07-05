# 微信公众号渲染保真度实测（基于真实长文）

## Goal

用 InkForge 实际的 `markdownToWechat` 管线，把 `experiment/正文1.0.md`（约 4 万字、6 部分的数字人民币战略分析报告）完整渲染成一份**可直接粘贴到微信公众号后台**的 HTML 文件，并通过 fidelity 报告检验其样式与微信公众号的兼容程度。

不写新代码、不改既有样式 —— 这是一次**对当前实现的现场验收**，目的是发现实际长文场景下样式系统的优劣与缺口。

## What I already know

- 文章：`experiment/正文1.0.md`，532 行，无图片、无代码块、含 1 张 Markdown 表、大量加粗 / 引号 / 多级标题（H3/H4 为主）。
- 渲染管线入口：`inkforge/src/services/export/wechat.ts#markdownToWechat(markdown, preset, options)`。
- 微信合规层：`platform-rules/wechat.ts` — CJK/Latin thin-space（U+202F）、677px 内容列 clamp、可选 dark-mode metadata。
- 后处理：`postProcessForWechat` — CSS 变量替换、清理 var()/flex/grid/animation/text-shadow/clip-path 等不支持属性、表格 + blockquote + figure 内联样式、图片宽度上限 640px、`section#nice` 包裹与零高度 `<p>` SVG 兼容夹层、`class` 属性最终清空。
- 主题预设系统：12+ 个预设（thesis、legal、report、commentary、aigc、notes、life、elegant、meme、code、news、tech）。`thesis` 最契合本文（学术严谨、墨色单调、思源宋体 + EB Garamond、h2 编号 + 极细底线）。
- 测试环境：vitest + happy-dom（通过 `// @vitest-environment happy-dom` 顶部 docblock 启用）。已有大量平台导出测试在此环境下运行。

## Phases & Acceptance Criteria

### Phase 1 — Render（产出 HTML）
- [ ] 写 `fixtures/render-real-article.test.ts`：vitest happy-dom 环境，import `markdownToWechatWithStats` + thesis preset，读取 `experiment/正文1.0.md`，输出到 `output/正文1.0-wechat.html`。
- [ ] HTML 含 `<!DOCTYPE html>` + 完整文档头（meta viewport、UTF-8）+ wechat-mock chrome（标题、作者、时间）外壳，方便浏览器直接打开预览。
- [ ] 主内容必须用 `<section id="nice">` 包裹（微信复制粘贴的关键 anchor）。
- [ ] 文件大小 < 1 MB，HTML 字符数 < 800 KB。

### Phase 2 — Compliance（合规验收）
- [ ] CJK/Latin 间距已插入（grep ` ` 数量 > 0，并抽样检查 `e-CNY` `M0` `mBridge` 等 CJK 和拉丁交界处是否有 thin-space）。
- [ ] 内容列 clamp wrapper 存在：`<div data-wechat-clamp="1" style="max-width:677px;...">`。
- [ ] 没有遗留不支持的 CSS 属性：grep 不应命中 `var\(--`、`display:\s*flex`（保留 inline-flex 例外）、`display:\s*grid`、`animation:`、`backdrop-filter:`、`clip-path:`、`-webkit-background-clip:\s*text`。
- [ ] 所有 `<table>` 节点必须有内联 `border-collapse + width` 样式，所有 `<th>/<td>` 有 `border + padding`。
- [ ] 所有 `<blockquote>` 必须有内联 `border-left + background + border-radius` 样式（非 alert 块）。
- [ ] 没有 `class=` 残留（postProcessForWechat 第 7.5 步会清空）。
- [ ] 没有 `<script>` / `<iframe>` / `<form>` / 事件属性。

### Phase 3 — Visual Spot-check（人工抽样）
- [ ] 浏览器打开 HTML，截图首页 + 中间一章 + 表格章节 + 结论页，确认：
  - 标题层级清晰、H1/H2/H3 可视区分
  - 段落字号与行高一致、首行无突兀缩进
  - 表格不溢出、边框清晰
  - 加粗 / 斜体 / 引用 / 分割线视觉到位
  - 无 layout shift（如百分比宽度坍缩、padding 累加）

### Phase 4 — Report（产出 fidelity_report.md）
- [ ] 列出每条合规检查的 pass/fail 结果 + 数值（thin-space 计数、HTML 大小、不支持属性命中次数）。
- [ ] 列出本次发现的样式缺口（例如：主标题字号是否合适、表格在窄屏是否横向滚动等）。
- [ ] 建议下一步：是否需要新增 preset、修改默认值、补合规规则。

## Definition of Done

- `output/正文1.0-wechat.html` 存在且可在浏览器直接打开。
- `fidelity_report.md` 包含所有 Phase 2 检查项的实际数值。
- 所有合规检查全部 pass，或 fail 项已被明确记录、归因到具体源码位置（行级）。
- 任务目录提交到 git（由用户决定时机）。

## Out of Scope

- 不在此任务里修改任何源码（既不改 preset、也不改合规规则）。所有发现写进 fidelity_report 的 "Next Step Suggestions"。
- 不做小红书 / 知乎对比 — 仅微信。
- 不上传真实微信公众号草稿（不调用 `wechat-publish.ts`，避免触碰真实 OAuth）。
- 不引入新依赖（如 Puppeteer 截图） — 视觉抽样靠用户手动浏览器打开。
- 不对接 mBridge 章节里的脚注链接做真实可点击验证。

## Technical Approach

**为什么用 vitest 而不是 standalone Node 脚本：**
- `wechat.ts` 强依赖 `window` / `document` / `DOMParser`（用于 KaTeX / Mermaid 降级、DOMPurify）。
- 项目已配置 happy-dom + alias（juice 指向 browser 版、shim url/path/fs），standalone Node 跑会缺一堆 shim。
- vitest 直接复用 vite.config.ts 的 alias，无需再造轮子。

**为什么用 thesis preset：**
- 文章是严肃的战略分析报告，墨色单调 + 思源宋体的学术味道最合适。
- thesis 的 h2 编号 + 极细底线对长文导航最友好。
- thesis 的 recipe 含 `cjk-decimal-h2` + `h2-underline-fine` —— 一二级标题的中文数字编号能直接对接 "第一部分 / 1.1 / 1.2" 这样的内容结构。

**输入选项：**
```ts
{
  enableCjkSpacing: true,
  maxContentWidth: 677,
  enableDarkMode: false,
  enableReadingTime: true,
  enableCiteStatus: true,
  enableAlertBlocks: true,
  enableEnhancedTable: true,
  enableCodeHighlight: true,
  fontFamily: 'serif',
  fontSize: '16px',
  primaryColor: '#1F2933',
}
```

**输出包装（让 HTML 可独立在浏览器打开）：**
```html
<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>正文1.0 · 微信公众号渲染保真度测试</title>
</head>
<body style="background:#f5f6f7;margin:0;">
  <main style="max-width:677px;margin:0 auto;background:#fff;">
    ...渲染结果（section#nice 包裹）...
  </main>
</body></html>
```

## Decision (ADR-lite)

**Context**: 用户提供长文，要求一次性产出可直接用在微信公众号的 HTML，验收当前渲染体系。
**Decision**: 用 vitest happy-dom 作为运行器跑实际 `markdownToWechatWithStats` 管线，输出 HTML 到任务目录。选 thesis preset、主色 `#1F2933`。
**Consequences**: HTML 是真实管线产物；任何缺陷都直接归因于现有源码，不存在 mock 出来的"假成功"。代价是单文件渲染需启动 vitest（≈ 数秒到十数秒），但对一次性验收而言可接受。

## Technical Notes

- 文章约 4 万字（中文字符为主），`calculateStats` 会按 `readingSpeed` 300 字/分钟估算 ≈ 130+ 分钟阅读时间 → reading-time header 会显示一个相当大的数字。这是真实场景下的"边界数据"，正好检验渲染管线对长文的容错。
- 文章里有 1 张表格、有大量"——"破折号、"《》"书名号、"**"强调 —— 都是 marked + 微信兼容性需要处理的典型 token。
- 文章里出现 `e-CNY` / `M0` / `M1` / `M2` / `mBridge` / `wCBDC` / `USDC` 等英文术语穿插中文 — CJK/Latin thin-space 的核心测试场景。
- 没有图片、代码块、Mermaid、LaTeX → 部分降级路径（image clamp、mermaid fallback、katex fallback）走不到 — 报告里要标注未覆盖。
- 输出 HTML 在 `.trellis/tasks/.../output/` 不纳入 lint/test 范围，避免污染主测试链。

---

## Closeout evidence - 2026-07-05

This WeChat fidelity planning task is closed by current local artifact verification:

- `output/正文1.0-wechat.html` exists and is a complete browser-openable HTML file.
- `fidelity_report.md` exists and records the full compliance/UX review, including hard compliance PASS and known UX concerns.
- Local verification confirmed `<!DOCTYPE html>`, `section#nice`, `data-wechat-clamp="1"`, CJK/Latin thin-space insertion, and absence of script/iframe/form/event-handler/javascript URL/CSS blacklist hits.
- The task is WeChat-only by design. Xiaohongshu and Zhihu publish testing remains manual per the current user instruction.
- No product source code was changed for this closeout.

Boundary:

- This proves local WeChat HTML fidelity artifact readiness, not a real WeChat public-account publish.
- Account-bound publication, phone preview, and external platform upload remain outside this task.
