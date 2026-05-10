# 04 — 渲染引擎 PRD

> 文档类型: PRD（产品需求文档）
> 阶段: Phase 3 · Batch B · P0 P1 核心
> 版本: v2.1 · draft-1
> 依赖: `10-markdown-authority-spec.md`（双层权威契约）, `11-content-model-spec.md`, `20-theme-font-typography-spec.md`, `27-performance-slo-spec.md`, `17-crash-recovery-spec.md`, `33-diagnostic-logging-spec.md`
> 被依赖: `04-spec-rendering-core.md`（本 PRD 的 Spec 实现层）, `15-export-publish-spec.md`, `16-markdown-extensions-spec.md`, `05-toolbar-complete-spec.md`, `13-workstation-layout-spec.md`, `14-statusbar-spec.md`, `18-preview-stage-panel-spec.md`, `28-sync-scroll-spec.md`, `29-search-engine-spec.md`
> 状态: DRAFT
> 创建日期: 2026-04-21
> 最后更新: 2026-04-21
> 铁律遵循: R-01（Markdown 权威）, R-02（Round-trip 全元素无损）, R-13（平台渲染链路独立 + 不反向污染）, R-14（公式/Mermaid/代码高亮三端一致 + 降级）, R-15（性能 SLO 硬指标）, R-16（数据底线：文章不丢）

---

## 目录

- §1 产品愿景与定位
- §2 目标用户与关键场景
- §3 功能范围（MoSCoW）
- §4 渲染管线总览
- §5 平台适配目标
- §6 性能服务水平目标（SLO）
- §7 质量属性（可访问性、国际化、可靠性、安全）
- §8 与相邻模块的关系
- §9 用户体验要求
- §10 非功能性需求
- §11 发布策略与里程碑
- §12 验收标准
- §13 风险与缓解
- §14 开放问题与决议记录
- §15 权威来源登记

---

## §1 产品愿景与定位

### 1.1 使命

InkForge 渲染引擎的使命是让用户**一次编辑的 Markdown 文本**，在**编辑器内、预览面板、导出产物、跨平台发布产物**四个消费面上，都能获得**语义一致、视觉可控、性能可预测**的输出，同时严格遵守"Markdown 是表达权威、HTML 是运行时缓存"的双层契约。

### 1.2 产品口号

> **"一源万态——从一段 Markdown 到任何平台，都值得被精雕细琢。"**

### 1.3 设计哲学（写入本 PRD 的"不变式"）

1. **权威不可污染**：任何渲染产物的生成、失败、降级都**不得**回写 `articles.markdownSource`、`articles.htmlCache` 或版本历史。
2. **平台即适配**：微信公众号、知乎、小红书、掘金、飞书、通用 HTML、Markdown 是**七种彼此独立的渲染链路**，它们只共享 Markdown 输入与权威 AST，不共享中间 HTML。
3. **渲染即可诊断**：每一次渲染运行都必须产出 `warnings[]`、`assetManifest`、`durationMs`、`fallbacksApplied[]`；用户必须可在导出对话框或诊断面板中看到降级与失败。
4. **渲染即可降级**：KaTeX、Mermaid、Shiki、自定义扩展都必须定义"失败三段式降级"（源码保留 → 占位提示 → 图像回退）。
5. **渲染即可复现**：Exporter 的行为必须由输入 `(markdown, frontmatter, options, theme, rendererVersion)` 确定；相同输入必须得到相同字节的产物（至少对 Markdown 与 HTML 两种纯文本产物做字节级一致性验证）。

### 1.4 与 v2.0 渲染链路的核心差别

| 维度 | v2.0 现状 | v2.1 目标 |
|---|---|---|
| 真值源 | HTML 字符串（`articles.content`） | Markdown 字符串（`articles.markdownSource`）+ HTML 运行时缓存 |
| 渲染链路 | 单一 HTML pipeline；微信导出是 HTML 补丁 | 7 条独立平台管线，均以 Markdown 为入口 |
| 扩展能力 | 硬编码少量扩展 | 基于 Unified（remark + rehype）插件链 + InkForge 专属扩展注册表 |
| 代码高亮 | highlight.js common（35 语言） | Shiki 双主题（`github-light` / `github-dark`）按语言 lazy 加载 |
| 公式/Mermaid | 编辑器内可用但导出脆弱 | 编辑-预览-导出三端一致 + 三级降级 |
| 图片处理 | 无统一管线；基础链接 | AssetPipeline 统一（去重/孤儿检测/远程回源/懒加载） |
| TOC | 无 | 正文 `[toc]` 宏 + 侧栏 TOC + 导出可选 |
| 降级策略 | 无 | 每个扩展强制声明 `fallback.toStandardMarkdown / toPlaceholder` |
| 性能 | 未实测 | 输入 0 延迟、保存 ≤ 1s、全文渲染 ≤ 300ms、导出 ≤ 3min |

### 1.5 决策锚点

本 PRD 的一切条款可追溯到：

- 决策 Part 1 · B 域（Markdown 权威）B-01 ~ B-14
- 决策 Part 2 · J 域（导出发布）J-01 ~ J-09
- 决策 Part 2 · L 域（性能规模）L-01 ~ L-05
- 决策 Part 1 · R（铁律）R-01/R-02/R-13/R-14/R-15/R-16
- L1-05/L1-06/L1-07/L1-08/L1-30/L1-31/L1-32/L1-36
- L1-42/L1-43/L1-44（生命周期影响归档/回收）
- T04 全部 15 题
- P-01 ~ P-06 全部导出发布题
- M-01 ~ M-08 全部 Markdown 扩展题

---

## §2 目标用户与关键场景

### 2.1 用户画像

- **P-01 单人深度写作者**：每天在 InkForge 中写 3000 ~ 10000 字原创文章；对渲染延迟极其敏感；常写长文（> 10 万字）含大量代码块 + 公式 + Mermaid。
- **P-02 多渠道作者**：写完一篇文章需要在 2 ~ 5 个平台发布（微信公众号 + 知乎 + 小红书 + 掘金 + 个人博客）；对每个平台的视觉保真度有硬性要求。
- **P-03 技术布道者**：大量使用代码块（Shell / TypeScript / Python / Rust / Go）+ 图表（Mermaid / ASCII 流程图 + 流程图）+ 公式；喜欢自定义主题与字体。
- **P-04 知识整理者**：通过 `[[wikilink]]` 与 TOC 组织多篇文档；频繁使用脚注、引用卡片与三层来源（事实 / 推断 / 手写）。
- **P-05 团队管理员（远期）**：审阅别人写的内容；需看到版本 diff、审计日志、发布记录；关注安全沙箱。

### 2.2 关键场景

#### 场景 S-01 — 实时编辑与 Typora 级 WYSIWYG

用户在 Typora 模式下键入 `$\int_0^1 x^2 dx$`：
- 上屏延迟 ≤ 16ms（一帧内）
- KaTeX 公式实时渲染
- 光标进入时自动露出 `$...$` 源码
- 语法错误时以 KaTeX 原生红色提示；修改后立即消失

#### 场景 S-02 — Mermaid Stage 渲染

用户在代码块中写 ```` ```mermaid ```` ：
- 正文区只显示代码块源码（T04-03 C）
- 右侧 Stage 面板实时渲染 SVG
- 失败时 Stage 面板显示 Mermaid 原生错误信息 + 源码
- 多 Mermaid 代码块时 Stage 面板可切换 / 全部预览 / 导出图像

#### 场景 S-03 — 全文预览实时刷新

用户在 Preview 模式下查看 10 万字长文：
- 首次预览渲染 ≤ 300ms
- 再次编辑任意一段文字，增量刷新 ≤ 50ms
- Preview 与编辑器双向同步滚动（W-04 D）
- Preview 使用的是"Platform Renderer"输出（J-07），不走独立预览管线

#### 场景 S-04 — 七平台导出

用户点击"导出" → 选择"微信公众号"：
- 导出对话框实时预览（设备框 T09-08 C）
- 公众号渲染规则激活（CSS 内联 + Mermaid 转 PNG + 代码高亮转行内 style）
- 一键"复制为富文本 HTML"到剪贴板（P-03 D）
- 导出历史记录（P-02 C），支持一键重导

#### 场景 S-05 — 降级可见性

用户在文档中用了 WikiLink：
- 导出为"标准 Markdown"时，弹出"以下扩展将被降级：WikiLink → `[text](link)`"
- 用户可选择"继续"或"查看降级详情"
- 导出日志记录全部降级

#### 场景 S-06 — 崩溃恢复与渲染一致性

用户编辑 5 分钟后断电：
- 重启后 CrashRecovery（17）从 beforeunload 快照恢复 Markdown
- 渲染引擎重新生成 HTML 缓存
- UI 告知"恢复自 2 分钟前的自动快照"
- 不丢一字（R-16）

#### 场景 S-07 — 多账户多 Profile 独立渲染配置

用户 Profile A 用护眼米黄主题 + 思源宋体；用户 Profile B 用纯黑暗色 + JetBrains Mono：
- 切换 Profile 时，渲染主题、字体、Shiki 主题、KaTeX 宏定义、Mermaid 主题全部切换
- 导出时继承 Profile 的默认导出预设

#### 场景 S-08 — AI 写入预览 diff

用户调用"AI 润色"：
- AI 返回新 Markdown → 渲染为临时预览（不写入 DB）
- 以 diff 视图对比原文与新文
- 用户决定"接受 / 拒绝" → 版本点自动生成

### 2.3 反场景（明确不做）

- R-N-01 **不做** PDF 导出（P-05 A）。
- R-N-02 **不做** 浏览器打印到 PDF 封装入 UI。
- R-N-03 **不做** Callout / Admonition（M-01 A 延后到 v2.2+）。
- R-N-04 **不做** 视频 / 音频 / iFrame 嵌入（M-07 A 延后）。
- R-N-05 **不做** 第三方 AI 在线渲染服务（保持本地渲染）。
- R-N-06 **不做** 反向污染：Renderer **不得**修改 `markdownSource` 或 `htmlCache`。

---

## §3 功能范围（MoSCoW）

### 3.1 MUST（v2.1 必须交付）

#### M-FR-01 渲染管线核心
- 基于 Unified（remark + rehype）的可插拔插件链
- Markdown AST ↔ ProseMirror JSON 双桥（对齐 `10-markdown-authority-spec.md` §11）
- HTML 缓存的 `sourceHash` 校验与自动重建
- Web Worker 执行 remark 解析（主线程只做 UI）

#### M-FR-02 19 标准元素 + 10 InkForge 专属扩展（详见 `16-markdown-extensions-spec.md`）
- 19 标准元素全覆盖（见 `10-markdown-authority-spec.md` §8）
- 10 专属扩展：多色高亮、脚注、TOC、Details、Emoji、WikiLink、Citation、公式交叉引用、Pangu 空格、三层来源

#### M-FR-03 代码高亮
- Shiki 双主题（`github-light` + `github-dark`）
- 180+ 语言按需 lazy 加载
- 富文本复制到剪贴板（带色 HTML + 纯文本 + Markdown 三 MIME）

#### M-FR-04 KaTeX 渲染
- 行内 `$...$` + 块级 `$$...$$`
- `throwOnError = false` + 红色错误提示
- 全局宏定义（在 Settings · 高级中可编辑）
- Typora 级 WYSIWYG（NodeView）

#### M-FR-05 Mermaid 渲染
- 代码块 `lang=mermaid` → Stage 面板渲染 SVG
- Mermaid 主题联动全局主题（light / dark / forest / neutral）
- 错误透传 + 源码保留

#### M-FR-06 七条平台渲染链路
- 微信公众号、知乎、小红书、掘金、飞书、通用 HTML、标准 Markdown
- 每条链路独立 rehype 插件 + sanitize 白名单 + CSS 注入策略

#### M-FR-07 导出管线
- 导出对话框（预览 + 设备框 + 参数调整 + 预设保存）
- 导出历史（P-02 C，一键重导）
- 失败日志与降级记录

#### M-FR-08 剪贴板管线
- "复制为..."菜单（P-03 D）
- 代码块富文本复制（T04-06 C）
- 表格 pipe 语法双向转换（E-05 D）

#### M-FR-09 TOC 系统
- 正文 `[toc]` 宏（M-04 D）
- 侧栏 TOC 面板（W-02 D）
- 导出可选 TOC（P-04 D）
- 拖拽重排章节（W-02 D）

#### M-FR-10 图片/资产管线
- AssetPipeline 统一清洗（T01-17 A + T05-11 D）
- 懒加载（IntersectionObserver）
- 尺寸限制（超大图片自动缩图）
- 远程 URL 回源为本地资产（Tauri fs）

#### M-FR-11 三层来源渲染
- FACT / INFERRED / AUTHORED 三色标记（H-02）
- 编辑/预览/导出保留 `data-citation-layer`
- 发布时按平台默认隐藏或保留（H-02）

#### M-FR-12 性能保障
- 输入 0 延迟（编辑不阻塞）
- 保存 ≤ 1s
- 冲突检测 ≤ 10s
- 导出 ≤ 3min
- Lighthouse Performance > 80

### 3.2 SHOULD（强烈建议，但非硬门槛）

- S-FR-01 Shiki 主题跟随 Profile 切换
- S-FR-02 Mermaid 导出 SVG 的"可点击 / 超链接"版本
- S-FR-03 KaTeX 宏库（用户可共享 / 导入社区宏）
- S-FR-04 图片自动压缩（WebP 优先）
- S-FR-05 代码块折叠 / 行号 / 长行折行切换
- S-FR-06 预览面板设备框（桌面 / 平板 / 手机 / 微信 / 知乎）

### 3.3 COULD（候选，若时间允许）

- C-FR-01 Mermaid 动画帧（gif 导出）
- C-FR-02 Ladder Diagram / PlantUML 替代 Mermaid
- C-FR-03 自定义 Shiki 主题（用户导入 tmTheme）
- C-FR-04 图片 Focal Point（智能裁切）
- C-FR-05 数学公式在编辑器内的可视化公式板（M-08 D）

### 3.4 WON'T（v2.1 明确不做）

- W-FR-01 PDF 导出（P-05 A）
- W-FR-02 Word/DOCX 导出（决策 Part 2 J-02）
- W-FR-03 RTF 导出
- W-FR-04 YouTube / CodePen / Tweet 嵌入（M-07 A）
- W-FR-05 Callout / Admonition（M-01 A）
- W-FR-06 在线渲染（所有渲染本地执行）
- W-FR-07 AI 驱动的自动排版

---

## §4 渲染管线总览

### 4.1 高层架构

```
┌──────────────────────────────────────────────────────────────────┐
│                    表达权威（Markdown + Frontmatter）              │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Unified (remark plugins)                     │
│   remark-parse → remark-frontmatter → remark-gfm →               │
│   remark-footnote-numbering → remark-math → remark-wikilink →   │
│   remark-callout → remark-mermaid-detector → remark-toc →       │
│   remark-citation → remark-rehype                               │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Unified (rehype plugins)                      │
│   rehype-raw → rehype-sanitize → rehype-slug →                  │
│   rehype-katex → rehype-shiki-dual → rehype-toc →               │
│   rehype-inline-css(for export) → rehype-format                 │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Platform Adapters (七选一)                     │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│   │ wechat  │  │ zhihu   │  │redbook  │  │ juejin  │  ...      │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│         ↓                                                         │
│   [sanitize × css-inject × mermaid-to-png × katex-to-svg]       │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                   RenderOutput {artifact, warnings[],             │
│                   assetManifest, durationMs, fallbacksApplied[]}  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 阶段分工

| 阶段 | 职责 | 运行环境 |
|---|---|---|
| S1 parse | Markdown → mdast | Web Worker |
| S2 mdast 扩展 | 解析 InkForge 专属语法 | Web Worker |
| S3 mdast → hast | 统一转 HTML AST | Web Worker |
| S4 sanitize | 白名单过滤（rehype-sanitize） | Web Worker |
| S5 enrich | slug / TOC / KaTeX / Shiki / Mermaid 占位 | 主线程（涉及 DOM） |
| S6 adapter | 按平台做最终适配 | 主线程 |
| S7 emit | 产物字符串 / Blob 输出 | 主线程 |

### 4.3 增量渲染

- 编辑器内实时预览：mdast 差分算法（节点级 replace），Preview DOM 走 morphdom 做增量 patch
- Stage 面板 Mermaid 渲染：按代码块 id 缓存，内容未变不重渲
- Shiki 高亮：按代码块 hash 缓存 highlighted HTML 片段

### 4.4 缓存策略

| 缓存对象 | Key | TTL | 失效条件 |
|---|---|---|---|
| HTML 完整缓存 | articleId | ∞ | `sourceHash` 不匹配 / `cacheVersion` 落后 |
| 代码块 Shiki 渲染 | `sha256(code+lang+theme)` | 内存 24h / 磁盘 7d | 主题变更 / Shiki 版本升级 |
| Mermaid SVG | `sha256(source+theme)` | 内存 24h | 主题变更 / Mermaid 版本 |
| KaTeX 渲染 | `sha256(src+macros+display)` | 内存 24h | 宏变更 |
| Shiki 语言包 | `langId@version` | 会话级 | 重启即重载 |
| 图片缩图 | `sha256(src+size)` | 磁盘 7d | 原图变更 |

---

## §5 平台适配目标

### 5.1 平台清单（v2.1 MUST）

| # | 平台 | 默认优先级 | 特殊规则 | 输出格式 |
|---|---|---|---|---|
| 1 | 微信公众号 | compliance | CSS 必须全内联，Mermaid/公式转 PNG，图片转 base64 | HTML 片段（可粘贴到公众号后台） |
| 2 | 知乎专栏 | semantic | 保留 `<pre><code>`，图片外链，公式 SVG | HTML 片段 |
| 3 | 小红书 | visual | 固定宽度 375px，长图切片 | HTML + PNG 切片 |
| 4 | 掘金 | semantic | 原生支持 Markdown，代码块保留语言标识 | Markdown + 图片 |
| 5 | 飞书文档 | semantic | 使用飞书 HTML 片段协议 | HTML 片段（粘贴到飞书） |
| 6 | 通用 HTML | visual | 单文件（内联全部资源） or 多文件 | `.html` + `assets/` |
| 7 | 标准 Markdown | semantic | 严格与 `markdownSource` 字节一致 | `.md` |

### 5.2 平台渲染链路独立（R-13）

每个平台必须**拥有独立的 adapter 实例**，不共享 HTML 中间产物：

```
Markdown ─→ rehype-mdast ─→ hast ─→ [sanitize₁] ─→ wechat-adapter   → 微信产物
                                  └─→ [sanitize₂] ─→ zhihu-adapter    → 知乎产物
                                  └─→ [sanitize₃] ─→ redbook-adapter  → 小红书产物
                                  └─→ ...
```

### 5.3 不反向污染（R-13）

平台 adapter **不得**：
- 修改 `markdownSource`
- 修改 `htmlCache`
- 修改版本历史条目
- 写入共享的"平台无关" HTML 缓存（每平台产物各自独立缓存）

### 5.4 平台差异化处理矩阵

详细对照矩阵见 `15-export-publish-spec.md` §6，此处列出关键差异。

| 能力 | 微信 | 知乎 | 小红书 | 掘金 | 飞书 | HTML | Markdown |
|---|---|---|---|---|---|---|---|
| CSS 内联 | 必须全内联 | 允许 class | 必须内联 | Markdown 无 | HTML 片段 | 可选 | 不适用 |
| Mermaid | PNG | SVG | PNG | 源码 | SVG | SVG | 源码 |
| KaTeX | PNG + 源码 | SVG + 源码 | PNG | 源码 | SVG | SVG | 源码 |
| 代码高亮 | inline style | class | inline style | 原生 | class | class | 源码 |
| 图片 | base64 | 外链 | 本地路径 | 外链 | 外链 | 外链/内联 | 链接 |
| TOC | 渲染为列表 | 渲染为列表 | 不渲染 | 渲染 | 原生 | 渲染 | `[toc]` |
| 脚注 | 渲染为尾注 | 渲染为尾注 | 不显示 | 原生 | 原生 | 原生 | `[^n]` |
| WikiLink | 降级为普通链接 | 降级 | 降级 | 降级 | 飞书内链 | 可选 | 降级 |

---

## §6 性能服务水平目标（SLO）

### 6.1 硬 SLO（L1-36 + L-01）

| 操作 | 目标 | 阈值上线 | 降级触发 |
|---|---|---|---|
| 输入延迟 | ≤ 16ms | ≤ 33ms | > 33ms：关闭 IME 联动动画 |
| 全文解析（10 万字） | ≤ 150ms | ≤ 300ms | > 300ms：启用增量 parse |
| 全文渲染（10 万字） | ≤ 200ms | ≤ 300ms | > 300ms：Preview 进入"冻结态"，仅在用户停止输入后再刷新 |
| 保存（写入 Markdown + 重建 HTML） | ≤ 500ms | ≤ 1s | > 1s：HTML 缓存异步重建 |
| 导出（微信，约 5000 字 + 10 图片） | ≤ 10s | ≤ 30s | > 30s：提示用户取消 |
| 导出（HTML，90 万字 + 2000 图片） | ≤ 3min | ≤ 3min | > 3min：终止并告警 |
| Preview 增量更新 | ≤ 50ms | ≤ 100ms | > 100ms：自动切到防抖 300ms |
| 代码块 Shiki 高亮（单块 < 1000 行） | ≤ 30ms | ≤ 100ms | > 100ms：显示 plain text 占位，后台异步 |
| KaTeX 行内公式（单个） | ≤ 5ms | ≤ 20ms | > 20ms：延迟渲染 |
| Mermaid 渲染（< 50 节点） | ≤ 300ms | ≤ 1s | > 1s：Stage 面板显示 loading |

### 6.2 软 SLO

| 指标 | 目标 |
|---|---|
| Lighthouse Performance | > 80 |
| Lighthouse Best Practices | > 90 |
| 首屏 FCP | ≤ 1.5s |
| 首次交互 TTI | ≤ 2.5s |
| Memory footprint（90 万字文档） | < 500MB |
| CPU 占用（idle 时渲染线程） | < 5% |

### 6.3 降级等级表（L-02）

| 等级 | 含义 | 可降级能力 |
|---|---|---|
| 必须保真 | 永不降级 | Markdown 保存 / HTML 正确性 / 19 标准元素 |
| 可降级保真 | SLO 超限时降级 | 动画 / Pangu 空格 / Emoji 自动补全 |
| 可延迟 | 后台执行 | Integrity 校验 / 版本清理 / 全文索引 |
| 可关闭 | 高危 SLO 超限时禁用 | Mermaid 自动渲染 / Shiki 高亮 / KaTeX 实时 |

### 6.4 性能测试门槛

- Phase 3 Batch B 完成时必须附带性能基线报告（位于 `artifacts/04-rendering/perf-baseline.md`）
- 每次 PR 必须跑性能回归：parse / render / export 三项，任一劣化 20% 需人工确认
- CI 上 Playwright E2E 必须包含 90 万字文档的"打开-编辑-导出"全链路性能测试

---

## §7 质量属性

### 7.1 可访问性（A11y）

- G-09 A：v2.1 不做 WCAG AA 合规专项
- 但渲染产物必须满足：
  - 标题层级连续（不跳级，slug 算法保证唯一）
  - 图片必须有 `alt`（缺失时自动从 filename 派生）
  - 代码块必须有 `lang` 属性（便于屏幕阅读器）
  - 链接必须有可读文本（不允许纯 URL 作为 link text 除非显式指定）

### 7.2 国际化（i18n）

- G-08 C：v2.1 同时交付中英双语
- 渲染产物中的用户可见字符串（如"目录"、"脚注"、"已复制"）必须走 vue-i18n
- 默认主题支持 CJK 字体 fallback：`"Source Han Sans SC", "Noto Sans CJK SC", -apple-system, system-ui`
- Pangu 空格规则在中英文边界自动插入（E-02 D 补充）

### 7.3 可靠性

- 任何单个扩展崩溃**不得**影响其他扩展（扩展错误边界，对齐 R-04 D）
- Mermaid / KaTeX / Shiki 三者若失败，必须至少保留源码（R-14 降级）
- Preview 渲染失败不得丢失编辑器内的 Markdown（R-16）
- 导出失败必须可重试；重试次数上限 3 次

### 7.4 安全

- T04-15 A：最低限度过滤明显危险项
- 进入渲染管线的 HTML 必须过 `rehype-sanitize`（白名单详见 `04-spec-rendering-core.md` §8）
- `javascript:` / `data:text/html` / `vbscript:` 协议一律剥离
- 自定义 CSS（EX-07）走沙箱 + iframe 隔离（`54-custom-css-spec.md`）
- 所有平台 adapter 的输出必须再过一次 adapter-specific sanitize

---

## §8 与相邻模块的关系

| 模块 | 关系 |
|---|---|
| `01-spec-editor-typora` | 渲染引擎消费 ProseMirror JSON；编辑器消费渲染引擎输出的 HTML 缓存 |
| `02-hub-layout-spec` | Hub 的 card-recent 需要 Markdown 摘要（由渲染引擎派生） |
| `05-toolbar-complete-spec` | 浮动工具栏触发 Renderer 的 actions（高亮 / 颜色 / 代码块） |
| `13-workstation-layout-spec` | Preview 面板与 Stage 面板都是渲染引擎的消费者 |
| `14-statusbar-spec` | 渲染延迟 / 字数统计 / TOC 位置显示在 StatusBar |
| `16-markdown-extensions-spec` | 专属扩展的语法 / 解析器 / 序列化器 / 降级规则 |
| `20-theme-font-typography-spec` | 渲染时注入主题 CSS、字体栈、Typography 面板参数 |
| `27-performance-slo-spec` | 本 PRD §6 的 SLO 来源 |
| `29-search-engine-spec` | 全文索引器消费渲染引擎产生的纯文本 |
| `31-version-bundle-spec` | 版本快照存 Markdown，不存 HTML |
| `33-diagnostic-logging-spec` | 渲染日志归档 |
| `54-custom-css-spec` | 自定义 CSS 注入策略 |

---

## §9 用户体验要求

### 9.1 编辑态 UX

- **UX-01** Typora 级 WYSIWYG：公式、Mermaid、代码块、表格均按 §5.3 规则在光标进出时切换呈现
- **UX-02** 渲染失败绝不"弹 Modal 打断用户"；所有错误走 Toast（可忽略）或区域红色提示
- **UX-03** 实时渲染不得抖动：Shiki / KaTeX 必须同步出现以避免"闪白"
- **UX-04** 渲染延迟超过 300ms 时必须有 Loading 占位（非骨架屏，避免不稳定感）
- **UX-05** Mermaid 的 Stage 面板必须支持缩放、平移、复制 SVG、下载 PNG

### 9.2 预览态 UX

- **UX-06** Preview 模式下默认显示"当前主题"的渲染（不是某个平台）
- **UX-07** 预览面板工具条提供"切换平台"下拉，可在七种平台之间切换预览（仅预览，不导出）
- **UX-08** 同步滚动（W-04 D）双向、可关闭
- **UX-09** 预览可全屏
- **UX-10** 预览顶部显示"最后渲染时间"、"用时"、"降级数"三个指示

### 9.3 导出态 UX

- **UX-11** 导出对话框遵循向导模式：模板 → 平台 → 参数预设 → 预览 → 导出
- **UX-12** 预览使用"设备框"（T09-08 C），展示微信/手机/桌面效果
- **UX-13** 降级列表必须在预览下方列出，可点击跳转到正文
- **UX-14** 导出历史（P-02 C）在对话框顶部 tab 可见
- **UX-15** 导出完成后提供"复制到剪贴板 / 下载 / 打开文件夹"三个动作
- **UX-16** 一键"复制为 X"（P-03 D）支持 Markdown / HTML / RTF / Plain / Wechat-HTML / Zhihu-HTML

### 9.4 发布态 UX（远期骨架）

- **UX-17** PublishAdapter 支持（P-06 D），v2.1 仅定义协议 + 内置渠道
- **UX-18** 发布日志与导出日志统一归档（K-02 审计）
- **UX-19** 发布失败必须有"重试 / 保存草稿 / 放弃" 三按钮

### 9.5 错误态 UX

- **UX-20** KaTeX 错误：红色行内提示，鼠标悬停显示错误详情
- **UX-21** Mermaid 错误：Stage 面板显示原生错误 + "复制源码"
- **UX-22** Shiki 错误：降级为 plain text + 小图标提示
- **UX-23** 所有错误提示在内容变化后自动消失（T04-12 A）
- **UX-24** 渲染总耗时超过 3s，顶部 Toast "本次渲染用时较长"

---

## §10 非功能性需求

### 10.1 架构约束

- **NF-01** 渲染引擎与编辑器解耦：Renderer 是纯函数 `render(input) → output`
- **NF-02** 渲染引擎与 UI 解耦：Renderer 产物是字符串 / Blob / hast AST，不直接操作 DOM
- **NF-03** 所有插件必须注册到 `RendererRegistry`，支持运行时 enable/disable
- **NF-04** 所有平台 adapter 必须实现 `PlatformRenderer` 接口
- **NF-05** 所有扩展必须实现 `ExtensionSpec`（`10-markdown-authority-spec.md` §9.2）

### 10.2 代码组织

```
src/rendering/
├── pipeline/            # 渲染管线核心
│   ├── unified.ts       # Unified 实例工厂
│   ├── stages.ts        # S1-S7 阶段定义
│   ├── worker.ts        # Web Worker 入口
│   └── cache.ts         # 缓存层
├── plugins/             # remark / rehype 插件
│   ├── remark-*.ts
│   └── rehype-*.ts
├── extensions/          # InkForge 专属扩展
│   ├── callout/
│   ├── wikilink/
│   ├── citation/
│   ├── pangu/
│   └── ...
├── adapters/            # 平台 adapter
│   ├── wechat/
│   ├── zhihu/
│   ├── redbook/
│   ├── juejin/
│   ├── feishu/
│   ├── html/
│   └── markdown/
├── sanitizer/           # 白名单
│   ├── base.ts
│   └── platform/
├── theme-injector/      # 主题 CSS 注入
│   ├── resolver.ts
│   └── shadow-dom.ts
├── export/              # 导出对话框相关
│   ├── dialog-controller.ts
│   ├── preview.ts
│   ├── history.ts
│   └── clipboard.ts
└── index.ts
```

### 10.3 包体积

- G-04 C：KaTeX / Mermaid / Shiki 全部按需加载
- 主包新增 ≤ 200KB（gzipped）
- 首屏渲染不加载 KaTeX / Mermaid / Shiki（仅在使用时懒加载）
- Shiki 按语言粒度切分，每个语言 ≤ 20KB（gzipped）

### 10.4 可测试性

- 所有 remark / rehype 插件独立可测
- Adapter 必须有"纯函数测试"（给定 Markdown → 期望产物字节级一致）
- 渲染引擎总体走 "黄金样本"测试（见 `04-spec-rendering-core.md` §13）

---

## §11 发布策略与里程碑

### 11.1 里程碑

| 里程碑 | 内容 | 截止时间 |
|---|---|---|
| M1 骨架 | Unified 管线 + 19 元素渲染 + HTML / Markdown exporter | Week 1 |
| M2 扩展 | 10 专属扩展全部可渲染 | Week 2 |
| M3 平台 | 7 平台 adapter 可用（覆盖矩阵 §5.4） | Week 3 |
| M4 体验 | KaTeX / Mermaid / Shiki 三端一致 + 降级 + Stage 面板 | Week 4 |
| M5 性能 | SLO 达标 + Worker + Cache | Week 5 |
| M6 验收 | 黄金样本 + E2E 全绿 | Week 6 |

### 11.2 分支与 PR 策略

- G-02 C：从 main 为本 Task 建独立 feature 分支 `feature/04-rendering-engine`
- 本 Task 可能被拆成多个 PR：
  - PR-01 Unified 管线骨架
  - PR-02 标准 19 元素 + sanitize
  - PR-03 KaTeX + Shiki
  - PR-04 Mermaid + Stage 面板
  - PR-05 专属扩展（按扩展粒度）
  - PR-06 平台 adapter（按平台粒度）
  - PR-07 导出对话框 + 历史
  - PR-08 性能优化 + Worker
  - PR-09 黄金样本 + E2E

### 11.3 验收门槛

- 所有 Vitest 单测 100% 通过
- 所有 Round-trip Fuzz 测试 100% 通过
- 所有 Playwright E2E 100% 通过
- Lighthouse Performance > 80
- 黄金样本 7 平台 × 19 元素 × 3 种状态（正常 / 边界 / 失败） = 399 条快照 100% 通过

---

## §12 验收标准

### 12.1 正向样本（P 样本）

| # | 场景 | 验收点 |
|---|---|---|
| P-01 | 输入 Hello World | Preview 与编辑器立即一致 |
| P-02 | 输入 19 标准元素 | Round-trip 字节级一致 |
| P-03 | 输入 KaTeX 行内公式 | 实时渲染 + Typora NodeView 切换 |
| P-04 | 输入 KaTeX 块级公式 | 块级渲染 + 居中 + 编号 |
| P-05 | 输入 Mermaid 代码块 | Stage 面板显示 SVG |
| P-06 | 输入代码块 180 语言 | Shiki 渲染 + 双主题 |
| P-07 | 输入多色高亮 `==red:x==` | 按主题渲染 |
| P-08 | 输入脚注 `[^1]` | 自动编号 + 跳转 |
| P-09 | 输入 `[toc]` | 自动生成 TOC |
| P-10 | 输入 `[[文章名]]` | WikiLink 跳转 |
| P-11 | 输入三层来源 | FACT / INFERRED / AUTHORED 三色 |
| P-12 | 导出为微信公众号 | CSS 内联 + Mermaid PNG + 富文本 |
| P-13 | 导出为知乎 | 保留 class + SVG |
| P-14 | 导出为小红书 | 375px 固定宽 + 切片 |
| P-15 | 导出为掘金 | Markdown + 原生代码块 |
| P-16 | 导出为飞书 | HTML 片段可粘贴 |
| P-17 | 导出为通用 HTML | 单文件内联 / 多文件外链两种模式 |
| P-18 | 导出为标准 Markdown | 与 `markdownSource` 字节一致 |
| P-19 | 复制代码块 | Shiki 富文本 + 纯文本 + Markdown 三 MIME |
| P-20 | Preview 实时更新 | ≤ 50ms 增量 |
| P-21 | 同步滚动 | 双向同步 + 可关闭 |
| P-22 | 切主题 | Shiki / Mermaid / KaTeX 全部跟随 |
| P-23 | Profile 切换 | 渲染配置继承新 Profile |

### 12.2 失败样本（F 样本）

| # | 场景 | 验收点 |
|---|---|---|
| F-01 | KaTeX 语法错 | 红色提示 + 源码保留 + 修改后消失 |
| F-02 | Mermaid 语法错 | Stage 面板显示原生错误 |
| F-03 | Shiki 语言包加载失败 | 降级为 plain text |
| F-04 | 代码块无语言 | plain text 渲染 |
| F-05 | 图片 URL 失效 | 占位图 + alt 文本 |
| F-06 | 非法 Markdown 未闭合 | 保留原文 + 局部不渲染 |
| F-07 | 导出微信时 Mermaid 转 PNG 失败 | 降级为 SVG → 源码 |
| F-08 | 导出小红书时图片超尺寸 | 自动切片 |
| F-09 | AssetPipeline 去重冲突 | 保留两份 + 警告 |
| F-10 | Preview 内存溢出 | 进入"冻结态" + 用户可手动刷新 |

### 12.3 边界样本（B 样本）

| # | 场景 | 验收点 |
|---|---|---|
| B-01 | 90 万字文档 | parse ≤ 300ms / render ≤ 300ms |
| B-02 | 空文档 | Preview 显示空白 + 不报错 |
| B-03 | 只有 frontmatter | 合法 |
| B-04 | 1000 层嵌套列表 | 不栈溢出 |
| B-05 | 超大代码块（10000 行） | Shiki 分段处理 |
| B-06 | 超大表格（1000×20） | 横向滚动 |
| B-07 | 100 个公式 | 渲染总时 ≤ 2s |
| B-08 | 100 个 Mermaid | Stage 面板支持分页 |
| B-09 | CJK / Emoji / RTL 混排 | Pangu 正确 + 字体 fallback |
| B-10 | 单文件内联 5MB 图片 | 导出 HTML ≤ 10s |

### 12.4 恢复样本（R 样本）

| # | 场景 | 验收点 |
|---|---|---|
| R-01 | HTML 缓存损坏 | 从 Markdown 重建 |
| R-02 | Worker 崩溃 | 主线程 fallback + 提示 |
| R-03 | 渲染中网络断（远程图片） | 降级为占位 |
| R-04 | 扩展崩溃 | 错误边界 + 降级为标准节点 |
| R-05 | 导出途中断电 | 重启后可从历史重导 |

### 12.5 安全样本（S 样本）

| # | 场景 | 验收点 |
|---|---|---|
| S-01 | `<script>alert(1)</script>` | 剥离 |
| S-02 | `javascript:void(0)` 链接 | 剥离 |
| S-03 | `<iframe src="...">` | 剥离（M-07 A） |
| S-04 | 危险 CSS `expression(...)` | 剥离 |
| S-05 | 超大 `data:` URL | 阈值过滤 |

### 12.6 留痕要求（G-14 D）

每条验收样本必须附：
- 输入 Markdown
- 预期产物（字符串 / 截图）
- 实际产物
- 差异（若有）
- 测试运行日志
- 性能数据

---

## §13 风险与缓解

| # | 风险 | 等级 | 缓解措施 |
|---|---|---|---|
| RK-01 | Shiki 体积过大影响首屏 | H | 按语言切包 + 延迟加载 + 预加载常用 10 语言 |
| RK-02 | Mermaid 渲染阻塞主线程 | H | Stage 面板异步 + loading 占位 |
| RK-03 | 多平台 adapter 维护成本高 | M | 抽象 PlatformRenderer 接口 + 共享 sanitize 基类 |
| RK-04 | KaTeX 宏冲突 | M | 全局宏表 + 文档级宏 + Profile 级宏三层优先级 |
| RK-05 | Round-trip 丢失 Pangu 空格 | L | Pangu 只在运行时处理，不写入 Markdown |
| RK-06 | AssetPipeline 远程图片被 CORS 阻止 | M | Tauri fs 代理下载 + 本地化 |
| RK-07 | 导出微信富文本在新版公众号后台不兼容 | M | 维护公众号兼容测试用例 + 每月回归 |
| RK-08 | 自定义 CSS 导致渲染崩溃 | H | iframe 沙箱 + 错误边界 + 安全模式启动 |
| RK-09 | 超大文档性能劣化 | H | 增量 parse + 虚拟滚动 + Worker |
| RK-10 | 黄金样本膨胀难维护 | L | 按扩展分组 + 自动化快照比对 |

---

## §14 开放问题与决议记录

### 14.1 决议记录（已关闭）

| # | 问题 | 决议 | 依据 |
|---|---|---|---|
| D-01 | Markdown vs HTML 权威 | Markdown 表达权威 + HTML 运行时缓存 | B-01 / B-02 |
| D-02 | 渲染链路是否共享 | 平台各自独立 | R-13 / L1-30 |
| D-03 | PDF 导出 | v2.1 不做 | P-05 A |
| D-04 | Callout | v2.1 不做 | M-01 A |
| D-05 | Shiki vs highlight.js | Shiki 双主题 | T04-05 A 升级 |
| D-06 | Mermaid 渲染位置 | Stage 面板 | T04-03 C |
| D-07 | 失败降级策略 | 三段式（源码 → 占位 → 图像） | R-14 |
| D-08 | 导出历史 | 必须有 | P-02 C |
| D-09 | 复制为菜单 | 必须有 | P-03 D |
| D-10 | TOC 来源 | 正文 `[toc]` 宏 + 侧栏 + 导出可选 | M-04 D / W-02 D / P-04 D |

### 14.2 开放问题

| # | 问题 | 待解 |
|---|---|---|
| O-01 | 公众号富文本粘贴的极端场景（新版公众号限制） | 需要与平台人员确认 |
| O-02 | 飞书文档 HTML 片段协议是否稳定 | 需要用户提供最新规则 |
| O-03 | 小红书长图切片算法（按屏幕高度或按元素） | 默认按元素切，观察用户反馈 |
| O-04 | 是否需要"发布到平台"的 API 集成（v2.1） | v2.1 仅做复制到剪贴板，不做 API |
| O-05 | 是否支持 Shiki 主题用户导入 | COULD，v2.1 不做 |

---

## §15 权威来源登记

| 条款 | 权威 | 决策 | 问卷 |
|---|---|---|---|
| Markdown 权威源 | 决策 | B-01 / R-01 | L1-05 A |
| 双层权威契约 | 决策 | B-02 | L1-06 D |
| Typora 扩展策略 | 决策 | B-03 | L1-07 C |
| Round-trip 全无损 | 决策 | B-04 / R-02 | L1-08 C + 补充 |
| Frontmatter 双写 | 决策 | B-05 | L1-09 D |
| 平台链路独立 | 决策 | B-06 / R-13 | L1-30 D |
| 平台各自合规优先级 | 决策 | B-07 | L1-31 C |
| 三端一致 + 降级 | 决策 | B-08 / R-14 | L1-32 C |
| KaTeX WYSIWYG | 决策 | B-12 | T04-01 A |
| KaTeX 红色错误 | 决策 | B-12 | T04-02 A |
| Mermaid Stage | 决策 | B-13 | T04-03 C |
| Shiki 主题 | 决策 | B-14 | T04-05 A |
| 代码高亮 180 语言 | 决策 | B-14 | T04-07 C |
| 导出面 | 决策 | J-02 | T04-08 C |
| 实时预览 | 决策 | J-07 | T04-09 A |
| 公式导出 | 决策 | J-04 | T04-10 A |
| 主题跟随 | 决策 | J-04 | T04-11 B |
| 失败不缓存 | 决策 | J-07 | T04-12 A |
| 代码块契约 | 决策 | J-04 | T04-13 C |
| 嵌入策略按平台 | 决策 | J-04 | T04-14 C |
| 安全沙箱 | 决策 | J-08 | T04-15 A |
| 导出预览 + 预设 | 决策 | J-03 | P-01 推断 D |
| 导出历史 | 决策 | J-03 | P-02 C |
| 复制为菜单 | 决策 | J-06 | P-03 D |
| TOC 用户选 | 决策 | J-09 | P-04 D |
| 不做 PDF | 决策 | J-02 | P-05 A |
| PublishAdapter | 决策 | J-05 | P-06 D |
| Callout 延后 | 决策 | M-04 三层 | M-01 A |
| 脚注完整 | 决策 | 本 PRD M-02 | M-02 D |
| 高亮多色 | 决策 | 本 PRD M-03 | M-03 D |
| TOC 正文节点 | 决策 | J-09 | M-04 D |
| Details 折叠 | 决策 | 本 PRD M-05 | M-05 D |
| Emoji `:name:` | 决策 | 本 PRD M-06 | M-06 C |
| 嵌入延后 | 决策 | 本 PRD M-07 | M-07 A |
| 公式辅助 | 决策 | 本 PRD M-08 | M-08 D |
| 性能 SLO | 决策 | L-01 | L1-36 C |
| 能力分级降级 | 决策 | L-02 | L1-36 C |
| 文章不丢 | 决策 | R-16 | X-11 C |

---

## §16 关联验收文件

- `artifacts/04-rendering/perf-baseline.md` — 性能基线
- `artifacts/04-rendering/golden-samples/` — 黄金样本
- `artifacts/04-rendering/platform-matrix.md` — 平台差异矩阵
- `artifacts/04-rendering/e2e-report.md` — E2E 报告

---

## §17 术语表

| 术语 | 定义 |
|---|---|
| Unified | remark + rehype 的统一抽象层 |
| mdast | Markdown AST |
| hast | HTML AST |
| Renderer | 渲染引擎的一次函数调用：`render(input) → output` |
| Platform Renderer | 七种平台 adapter 的具体实现 |
| Adapter | 将 hast 转换为平台产物的函数 |
| Sanitizer | HTML 白名单过滤器 |
| AssetPipeline | 统一的图片 / 文件清洗去重管线 |
| Golden Sample | 用于快照测试的输入 / 期望产物对 |
| Fallback | 失败时的降级产物 |
| SLO | 服务水平目标 |

---

## §18 变更历史

| 版本 | 日期 | 作者 | 变更 |
|---|---|---|---|
| draft-1 | 2026-04-21 | doc-engineer | 初稿，基于 0420 决策文档与 L1/L2/Enhancement 全部问卷 |

---

## §19 附录 A：与 0327 基线的差异对照

| 维度 | 0327 基线 | 0420 v2.1 | 理由 |
|---|---|---|---|
| 权威源 | 未明确 | Markdown | L1-05 |
| 插件架构 | marked hardcoded | Unified | 可插拔 + 社区生态 |
| 代码高亮 | highlight.js common | Shiki dual + 180 langs | T04-05/07 升级 |
| 平台 adapter | 1 种（微信） | 7 种 | L1-30 / J-02 |
| 失败降级 | 未定义 | 三段式 | R-14 |
| 导出对话框 | 简单选择 | 向导 + 预览 + 历史 + 预设 | P-01/02 |
| 性能 SLO | 未量化 | 硬指标 | L1-36 / L-01 |

---

## §20 附录 B：七平台适配细则索引

详见 `15-export-publish-spec.md`：
- 微信：§6.1
- 知乎：§6.2
- 小红书：§6.3
- 掘金：§6.4
- 飞书：§6.5
- HTML：§6.6
- Markdown：§6.7

---

## §21 附录 C：扩展索引

详见 `16-markdown-extensions-spec.md`：
- 多色高亮：§3
- 脚注：§4
- TOC 宏：§5
- Details：§6
- Emoji：§7
- WikiLink：§8
- Citation：§9
- 公式交叉引用：§10
- Pangu 空格：§11
- 三层来源：§12

---

## 完

> 本 PRD 是 `04-spec-rendering-core.md` / `15-export-publish-spec.md` / `16-markdown-extensions-spec.md` 三份 Spec 的上位文档。任何下游 Spec 与本 PRD 冲突，以本 PRD 为准；任何本 PRD 与 `10-markdown-authority-spec.md` 冲突，以 `10-markdown-authority-spec.md` 为准（后者是全项目的权威根基）。
