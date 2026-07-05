# 微信公众号渲染保真度 — 最终评审报告

**Target Article**: `experiment/正文1.0.md` (中国数字人民币战略全景报告, 29,919 字 / 100 min read / 50 headings / 1 table / 0 images / 0 links)
**Preset**: `report` (行业研报, primary `#004080`, persona `academic`, fontFamily serif, fontSize 16px)
**Output**: `output/正文1.0-wechat.html` (172 KB, 170 KB inner HTML)
**Pipeline**: `markdownToWechatWithStats` (full path = marked → DOMPurify → highlight → alerts → footnotes → juice 内联 → decorate → enhanceTable → postProcessForWechat → enforcePlatformCSS → wechatComplianceTransform)
**Reviewed by**: 5-expert agent team (typography / layout / compliance / longform-ux / mobile)

---

## Overall Verdict

> **⚠️ CONCERNS** — pipeline produces WeChat-compliant output that **can be pasted into 公众号 backend without rejection**, but the visual hierarchy and emphasis density degrade the reader experience for this specific 4 万字 long-form. Hard compliance: **PASS (10/10)**. UX polish: **5/10**.

| 维度 | 评级 |
|---|---|
| WeChat 合规硬门槛（无脚本/iframe、CSS 黑名单清空、677 clamp、SVG 兜底、class 剥离） | ✅ **PASS** |
| 字体与中文排版 | ⚠️ CONCERN（HIGH：font-family 链 Latin 优先） |
| 视觉层级与导航 | ⚠️ CONCERN（HIGH：第X部分 vs 1.x 同形，100-min read 无路标） |
| 长文阅读 UX | ⚠️ CONCERN（HIGH：strong 高亮过密, reading-time 100min 易劝退） |
| 移动适配 (375px / 360px / 414px) | ⚠️ CONCERN（MEDIUM：暗黑模式色对比 3.5:1 < AA, table 在 360px 紧凑） |
| 内容完整性 | ✅ PASS（结构、字数、阅读时长、表格全部正确转出） |

---

## Section 1 — Hard Compliance Checklist（10/10 PASS）

| # | 项 | 计数 / 证据 |
|---|---|---|
| 1 | `var(`/`display:flex`(非 inline)/`display:grid`/`animation:`/`transition:`/`backdrop-filter:`/`filter:`/`clip-path:`/`text-shadow:`/`-webkit-background-clip:text`/`position:fixed|sticky` | 全部 0 |
| 2 | `section#nice` 包装含基础内联样式 | ✅ |
| 3 | `<div data-wechat-clamp="1" style="max-width:677px;…">` 内层包裹 | ✅ |
| 4 | SVG 复制兜底 `<p style="font-size:0;…">&nbsp;</p>` | 2 处（首尾） |
| 5 | section#nice 内 `class=` 残留 | 0 |
| 6 | 禁用标签（script/iframe/form/input/button/object/embed） + 事件属性 + javascript: | 全部 0 |
| 7 | dark-mode metadata（按入参 `enableDarkMode:false`） | 0（按预期） |
| 8 | 表格 th/td 内联 border + padding | th=3/3, td=9/9 |
| 9 | 阅读时长 header 注入 | "阅读约 100 分钟 · 全文 29919 字 · 1 张表" |
| 10 | cite-status（零链接场景空操作） | ✅（无 footnote 误生成） |

**结论**: 输出 HTML 通过 WeChat 编辑器粘贴流水线无障碍。无需为"是否能发布"担心。

---

## Section 2 — Cross-Cutting UX Findings（多专家一致命中）

### 🔴 HIGH-1 · 标题层级坍缩 — 100 min 长文失去主干

**命中专家**: layout, longform-ux
**事实**: 文章源 markdown 全部使用 `###`（H3）+ `####`（H4），完全没有 H1/H2。report preset 最强烈的视觉表达 — H1 左侧蓝条 + 60px 横条、H2 编号 badge + 2px 下边线 — **全部哑火**。"第X部分"与"1.x"在渲染产物中视觉上完全同形（同 `color:#1A3A5C; font-size:1.15em; border-left:3px solid #004080; padding-left:0.7em`），6 个主章节 × 4-5 小节 = 24+ 个视觉无差异跳转。读者下滑 100 分钟无法判断"我现在在哪一部分"。

**佐证**: `output/正文1.0-wechat.html:41`（第一部分）= `:43`（1.1 节）样式串完全相同；文章源也漏掉了"第三部分"和"第四部分"两个主章节标题（grep 仅命中第一/二/五/六）。

**建议（按 ROI 排序）**:
1. 新增 `decorateReportChapterHeading` 装饰器，正则匹配 H3 文本 `^第[一二三四五六七八九十]+部分`，给命中项注入 chapter 风格：`margin-top:2.4em; font-size:1.45em; padding:0.6em 0.8em; background:#F2F5F9; border-left:6px solid #004080;` + 段号 badge（与 H2 同款）。
2. 在 chapter heading 之前自动 inject `<hr>`，提供视觉 rest stop。
3. 上游建议：作者补齐"第三部分""第四部分"两个 H3 主标题。

---

### 🔴 HIGH-2 · `<strong>` 高亮密度过载 — 长文视觉疲劳

**命中专家**: typography, layout, longform-ux, mobile, compliance（暗黑模式风险）
**事实**: 200+ `<strong>` 元素，每一个都背着 `background:linear-gradient(180deg, transparent 60%, rgba(0,64,128,0.15) 60%)` 的"荧光笔"底色。作者在 markdown 里 `**…**` 加粗高频出现（粗略每段 2-4 次），叠加 H3/H4 也用 `<strong>` 包裹标题文本 → 渲染后**约 1/4 行带蓝色高亮**，读者扫页时无法定位真正的关键句。

**附带副作用**:
- 暗黑模式：linear-gradient background 无 `data-darkmode-bgcolor` → mmbiz 夜读丢失整片高亮（compliance 报告 Risk #1）；剩下 `#004080` 主色文字在近黑底上对比度 ~3.5:1，**低于 WCAG AA 4.5:1**（mobile 报告 §6）。
- 负载：每个 strong 内联 ~135 字符 → 200+ strong = ~27 KB 重复 CSS，约 16% 总负载（longform-ux §7）。
- 标题层级坍缩雪上加霜：headings 内 `<strong>` 包裹后 H3 vs H4 主要差异只剩字号 1.15em vs 0.92em（layout §1）。

**建议**:
1. `postProcessForWechat` 新增 step：剥离 H1-H4 内的 `<strong>` 包裹（preset 已经在 heading 上染主色）；**只在 body `<p>` 内允许 strong 高亮**。
2. preset 层降饱和：把 `rgba(0,64,128,0.15)` 改为 `rgba(0,64,128,0.08)`，或彻底移除背景渐变只保留 `color:#004080; font-weight:700`。
3. 入口 default `enableDarkMode:true`，为 strong 自动补 `data-darkmode-bgcolor`，保住夜读视觉强调。

---

### 🟠 MEDIUM-1 · `section#nice` 内联 font-family 链 Latin 字体置于首位

**命中专家**: typography (HIGH)
**事实**: section#nice 的内联 `font-family` 为 `Georgia, 'Noto Serif SC', 'Source Han Serif SC', 'Source Han Serif CN', STSong, 'Times New Roman', Times, serif`。**Georgia 优先**意味着 macOS/Win/iOS 上有 Georgia 时浏览器逐字符 fallback CJK 到系统衬线（Songti/PingFang Serif）— 视觉可接受但 metric 不匹配，16px 下 ascender 高度差异肉眼可见。

**根因方向**: `preset-fonts.ts:26` 的 academic persona 明确把 CJK 序列写在前面（`'Source Han Serif SC', 'Noto Serif SC', 'Songti SC', 'STSong', 'SimSun', serif`），导出管线某一层在 inline 时把 Latin 提到了前面。需追踪 `generatePersonaBaseCSS('academic')` 的下游消费者，或 juice 内联的字体排序启发式。

**建议**: 一次性追踪 `Georgia` 出现位置 →修正排序生成器 → 添加单元测试断言 inline font-family 首项必为 CJK 字体。

---

### 🟠 MEDIUM-2 · 14 处表格元素重复 `style=` 属性

**命中专家**: layout, compliance
**事实**: 1 `<table>` + 1 `<thead>` + 3 `<th>` + 9 `<td>` 共 14 个表格相关元素带有**两个** `style=` 属性。HTML5 spec 浏览器只保留第一个，故当前视觉无回归；但 WeChat 服务端粘贴流水线若做 DOM normalize，存在历史版本会把后写覆盖先写，届时 preset 的 `border:1px solid #D8E2EC` 会被 `wechat.ts:1005-1023` 步骤 9.1 注入的 `border:1px solid #ddd` 替换。

**根因**: `postProcessForWechat` step 9.1 的 regex `match.replace(/style="([^"]*)"/, …)` 只替换第一个匹配后又拼接了完整原始 `${attrs}`，造成属性重复。

**建议**: step 9.1 改为"如果已有 style= 则 merge 进首个 style，否则才追加"。同时 step 10 的 `(?![^>]*style=)` 也应升级为 "缺失键补齐" 而非"有 style 就放弃"。

---

### 🟠 MEDIUM-3 · OL 数字标号破坏 CJK/Latin thin-space

**命中专家**: typography
**事实**: `decorateReportOlNumbers` 在 `<p>` 之前注入 `<span>01</span>` 等标号 span，但 span 与紧随其后的 `<p>` 文本之间没有空格 → `applyCjkLatinSpacing` 的 tokenizer 跨标签盲区，无法在 `1` ↔ `契` 等边界插入 U+202F。共 21 处漏掉（vs 全文 434 处正确插入）。

**建议**: 装饰器输出 `<span>01 </span>`（正常空格在 span 内）或 `<span>01</span>` + U+202F 紧贴 `<p>` 文本头；或在 decorate 链结束后再跑一次 `applyCjkLatinSpacing`（性能影响可忽略）。

---

### 🟡 LOW-1 · `**…**` 嵌套 markdown 残留可见 `**` 字符

**命中专家**: typography (内容噪声), longform-ux (CONCLUSION §6.2 见可见 `**`)
**事实**: 源 `正文1.0.md` 在 line 47/54/420/422 等处有不闭合或嵌套 `**xxx<strong>...</strong>xxx**` 结构，marked 解析时产生残留 literal `**`。渲染产物里能看到裸 `**`。**Not a pipeline bug** — 源 markdown 作者编辑事故。

**建议**: 不修管线。提示作者侧统一全文 `**` 配对检查（推荐 lint：`grep -c '\*\*' 正文1.0.md` 必须偶数）。

---

### 🟡 LOW-2 · `阅读约 100 分钟` 心理威慑

**命中专家**: longform-ux
**事实**: `calculateStats` 用 300 cpm 估算（utils.ts:661）。29919 / 300 = 99.7 → 显示 100 分钟。原生中文读者实际 cruise 速度 500-600 cpm（叙事）/ 350-450 cpm（政策分析），真实阅读时间 70-85 min。**100 分钟 = 1 小时 40 分**在公众号首屏是高 bounce 触发点。

**建议**: `report` preset 默认 `readingSpeed: 400`（仍保守），显示"75 分钟"，更诚实也更可咽下。

---

### 🟡 LOW-3 · 移动端 `section#nice` padding:0 4px 过窄

**命中专家**: mobile
**事实**: preset 自带 `padding:0 4px`，postProcess step 10 的 `16px` 兜底不触发（preset 已声明 padding 故 (?![^>]*style=) 失败）。fidelity shell 内被外层 720px 容器盖住没问题，但**真正进入 WeChat in-app browser 时没有额外 padding**，正文左右贴边。375px iPhone 上文字距视口边缘仅 4px。

**建议**: preset 直接改为 `padding:0 12px`，或 postProcess step 10 升级为"必要键补齐"逻辑。

---

### 🟡 LOW-4 · 表格在 360px Android 紧凑

**命中专家**: mobile, layout
**事实**: 3 列表格 `width:100%; border-collapse:collapse`，**无 `table-layout:fixed`**。375px iPhone 上每列 ~96px、5-8 行堆叠勉强可读。本表 3 列已是上限，若未来 ≥4 列必溢出。

**建议**: 表格 enhancer 增加 `table-layout: fixed` + 默认按 col 数生成等宽 col。

---

### 🟡 LOW-5 · 字体子级 0.88em / 0.92em 跌破 WeChat 推荐 15px 下限

**命中专家**: mobile
**事实**: 16px base × 0.88 = 14.1px（th）、× 0.92 = 14.7px（h4）。WeChat 公众号阅读侧推荐正文最小 15px。老花眼读者用 reader 字号 XL 时仍受影响（inline 字号会覆盖 reader 偏好，**accessibility regression**）。

**建议**: preset 把 h4 / th 字号 ≥ 0.95em；或入口层把 fontSize 16px 改为 17px（doocs/md 默认）。

---

## Section 3 — 未触达管线分支（本次未覆盖）

文章无图片 / 代码块 / Mermaid / LaTeX / 外链 / blockquote / GitHub Alert / 任务列表 / 复杂数学符号。以下 pipeline 分支**未被触发**，不在本次保真度证据范围：

- `clampWechatImageTagWidth` / 图片 640px clamp
- `degradeWechatLatexHtml` / LaTeX 退化
- `degradeWechatMermaidHtml` / Mermaid 退化
- `highlightCodeBlocks` / highlight.js + Mac code chrome
- `renderAlertBlocks` / GitHub `> [!NOTE]` 块
- `convertLinksToFootnotes` / 外链转脚注（已就绪但 0 输入）
- `enhanceTableStyles` 条纹行 / hover（单表 + 无 even row 数据）
- preset 的 blockquote 装饰（preset 已就绪，`#F5F8FB` bg + 4px `#004080` border）

→ 这些分支建议后续用其它体裁文本（技术文章 / 教程 / 学术笔记）单独跑保真度回归。

---

## Section 4 — 可直接复制到微信公众号后台的产物

**Path**: `D:/Desktop/Inkforge/.trellis/tasks/05-26-render-wechat-fidelity-test/output/正文1.0-wechat.html`

**使用方法**:
1. 浏览器打开 `正文1.0-wechat.html` 预览整体效果（外层 720 px 灰底壳为 fidelity shell，不会随复制带入微信）。
2. 在 浏览器开发者工具中选中 `<section id="nice">…</section>` 节点，右键 "Copy → Copy outerHTML"，或直接全选页面内容（fidelity shell 的 `<section id="nice">` 内部就是要粘贴的内容；clamp div 包裹内部内容也会一起带过去）。
3. WeChat 公众号后台 → 新建图文 → 在编辑器里 `Ctrl+V` 直接粘贴。WeChat sanitize 后保留 inline 样式 + table + h3/h4 + strong 高亮 + hr 装饰。
4. 标题、作者、封面图需在 WeChat 后台单独设置（fidelity shell 顶部的"InkForge · 渲染保真度测试"是预览装饰，不是文章封面）。

**注意**: 出于 Section 2 列出的两个 HIGH issue，建议作者发布前在 WeChat 编辑器内手动：
- 检查"第X部分"标题与"1.x"标题的视觉区分度（必要时手工把"第X部分"提到 H2）。
- 检查 strong 高亮密度，必要时手工撤掉 20-30% `**…**` 加粗。

---

## Section 5 — 优先级整改清单（按修复 ROI 排序）

| # | 严重度 | 整改项 | 涉及文件 |
|---|---|---|---|
| 1 | 🔴 HIGH | 新增 chapter-heading 装饰器识别 `第X部分` 并提级到 H2 视觉 | `inkforge/src/services/export/preset-decorations.ts` + `themes.ts` |
| 2 | 🔴 HIGH | postProcess 剥离 H1-H4 内 `<strong>`；preset 降饱和 strong 高亮；默认 enableDarkMode=true | `inkforge/src/services/export/wechat.ts` postProcessForWechat / `themes.ts` report preset |
| 3 | 🟠 MED | 修复 inline font-family 排序，CJK 优先 | `inkforge/src/services/export/preset-fonts.ts` + 上游消费者 |
| 4 | 🟠 MED | postProcess step 9.1 + step 10 改为 "style 键级 merge" 而非追加新 `style=` | `inkforge/src/services/export/wechat.ts:989-1058` |
| 5 | 🟠 MED | OL decorator 末尾补 U+202F；或 decorate 后再跑一次 applyCjkLatinSpacing | `inkforge/src/services/export/preset-decorations.ts` `decorateReportOlNumbers` |
| 6 | 🟡 LOW | report preset `readingSpeed:400` 默认；阅读时长展示更友好 | `themes.ts` 或 `types.ts` 添加 `readingSpeed` field |
| 7 | 🟡 LOW | preset section#nice `padding:0 12px` 替代 `0 4px` | `themes.ts` report preset |
| 8 | 🟡 LOW | 表格 enhancer 输出 `table-layout:fixed` | `inkforge/src/services/export/utils.ts` `enhanceTableStyles` |
| 9 | 🟡 LOW | h4/th font-size ≥ 0.95em；考虑 default fontSize 17px | `themes.ts` |
| 10 | ⚪ Author | 源 markdown `**…**` 配对 lint；补齐"第三/四部分"H3 | `experiment/正文1.0.md`（作者侧） |

---

## Section 6 — 本次任务作为 Regression Fixture 的复用价值

本任务沉淀的 `__fidelity__/render-real-article.fidelity.test.ts` 是 **第一个用真实 4 万字长文跑完整 wechat pipeline 的 fixture**。建议：

1. 将该 fixture 保留在 `inkforge/__fidelity__/` 目录，作为 CI 的可选 job（`npm run fidelity` 单独脚本，不阻塞主 CI）。
2. 每次 wechat.ts / platform-rules/wechat.ts / themes.ts 修改前后跑一次，diff `output/正文1.0-wechat.stats.json` 即可快速发现回归。
3. 后续为不同体裁补充 fixture：技术文（含代码块/mermaid）、笔记体（含图片/blockquote）、新闻体（含外链/footnote 实际触发）。
4. 把本报告的整改清单 #1-#9 实施后，**重跑此 fixture 应观察到**：strong 计数下降 30%+、HTML 大小下降到 ~130KB、`第X部分` 视觉提升、暗黑模式 data-* 注入、`Georgia` 不再首位。

---

## Definition of Done — 全部达成

- [x] `output/正文1.0-wechat.html` 落盘且可浏览器直接打开
- [x] `output/正文1.0-wechat.stats.json` 含 wordCount/readingTime/headingCount/tableCount 实际数据
- [x] `fidelity_report.md`（本文）覆盖 Phase 2 全部检查项 + 5 维度专家分析 + 整改 ROI 表
- [x] 所有硬合规检查 PASS；UX concern 已明确归因到具体文件/行
- [x] 5 个专家研究文件 `research/*.md` 沉淀完整推理链

任务可关闭。
