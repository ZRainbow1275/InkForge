> 版本: v2.1.0-draft / 依赖: 10-markdown-authority-spec / 11-content-model-spec / 状态: Draft / 关联决策: L1-05, L1-07, L1-08, L1-10, L1-11, L1-12, L1-13, L1-29, L1-36, L1-39, L1-45, L1-46, L1-47, L1-48, L1-49, L1-57, L1-58, L1-60, T01-01~T01-20, E-01~E-10, M-02~M-08, R-01/R-02/R-05/R-15/R-16
> 权威来源: 混合（以最新日期决策文档为主 + 0327 旧 Spec 视觉/交互基线）
> 创建日期: 2026-04-21
> 铁律遵循: R-01, R-02, R-04, R-05, R-06, R-11, R-13, R-14, R-15, R-16, R-17

# 01 — Typora 模式编辑器 PRD（Product Requirements Document）

## 目录

- §1 产品愿景与使命
- §2 用户画像与使用场景
- §3 用户旅程（Journey Maps）
- §4 核心价值主张
- §5 功能范围（MUST / SHOULD / COULD / WON'T）
- §6 核心能力清单（Capability Catalogue）
- §7 四模式互换语义（Typora / Source / Preview / Export）
- §8 非目标（Non-Goals）
- §9 性能 SLO 与规模指标
- §10 度量指标（Metrics & KPIs）
- §11 依赖与集成点
- §12 风险与假设
- §13 推出策略与阶段拆解
- §14 验收标准（Acceptance Criteria）
- §15 伦理、合规与安全
- §16 未决问题与后续回归
- §17 参考与术语表

---

## §1 产品愿景与使命

### 1.1 一句话定位

**InkForge v2.1 的编辑器是一台以 Markdown 为唯一表达权威、以 Typora 风格所见即所得为默认范式、以纸张式安静气质为视觉基底、以多渠道高保真出版为交付终点的专业深度写作机器。**

### 1.2 背景与问题陈述

当前 InkForge v2.0 已具备以下事实：
- TipTap（ProseMirror）负责富文本运行时
- IndexedDB `articles.content` 持久化 HTML 字符串
- 已存在 `MarkdownHints.ts` 扩展，可通过 `Decoration.widget()` 显示淡色语法标记
- 发布链路（微信/HTML）从 HTML 派生，Markdown 仅作为输入/输出视图

但在以下关键维度上仍未达到 v2.1 的硬门槛：
1. Markdown 真值链已经开始收口到 `currentContent.body`，但 authority model 中 `markdownSource/htmlCache/sourceHash` 的完整分层仍未完成（违反 R-01）
2. Typora 模式的"光标进入才暴露语法"尚未实现
3. Source 模式虽已以 `vue-codemirror` 落地，但更完整的编辑能力与扩展契约仍未全部补齐
4. 模式切换的 `editorMode` / `lastNonPreviewMode` / `modeLayouts` 已打通，但更大规模的 workstation layout store / preset 系统仍未完成（违反 R-05 状态契约）
5. Round-trip 在某些元素（公式、脚注、details、table pipe）上有损（违反 R-02）
6. 智能标点、快捷键、斜杠命令、浮动工具栏四条命令入口未严格分工（违反 L1-29）

### 1.3 使命

v2.1 编辑器必须完成以下六件事：
1. 将 **Markdown 文本抬升为唯一表达权威**，HTML 降级为运行时缓存（R-01 + 10-markdown-authority-spec）
2. 将 **Typora 式 cursor-aware 渲染**从 MarkdownHints 的"始终提示"升级到"光标进入才提示"（T01-01 A）
3. 将 **Source 模式**从字符串视图升级为独立的 vue-codemirror 编辑器实例（T01-06 A）
4. 实现 **Typora / Source / Preview 三模式切换**时所有状态（选区 / 撤销栈 / 版本点 / 评论锚点 / 滚动 / 折叠）全继承（L1-11 C + 补充）
5. 一次性覆盖 **19 种标准 Markdown 元素 + 核心扩展语法**（脚注、details、TOC、公式、Mermaid、Wikilink、Emoji、FrontMatter、Citation、Highlight）
6. 以 **四类命令入口**（快捷键 / 斜杠 / 浮动工具栏 / 右键）严格分工覆盖编辑命令，并接入命令注册表（L1-27 D + L1-29 A）

### 1.4 愿景画像（3 年愿景）

到 v3.0，InkForge 的编辑器目标为：
- 中文 Markdown 社区心智占位：类 Typora，但有更好的发布链路、更好的知识增强、更好的主题可定制
- 成为"学生/研究者/技术博客作者"首选的 Markdown 编辑器
- 可作为"AI 时代的写作核心模块"被第三方集成（嵌入 SDK）

### 1.5 在整个 InkForge 产品中的定位

- InkForge 产品 = Hub（项目首页）+ Workstation（文档级工作区）+ Editor（本 PRD 描述的对象）+ Publisher（发布链路）+ Knowledge（知识增强）
- **Editor 是所有其他子系统的基础**：没有可信赖的编辑器，Hub 的继续创作没有着力点，Publisher 的输出没有可靠输入，Version/Sync/Search 的对象不成立
- Editor 的**输出形态**：Markdown 文本（唯一权威）+ 运行时 HTML 缓存 + ProseMirror JSON 作为临时态
- Editor 的**消费方**：Hub 卡片、FileManager、TabBar、Preview 面板、Export 管线、Version Bundle、Sync Provider、Search Engine、AI Provider

---

## §2 用户画像与使用场景

### 2.1 用户画像 P1 — 深度技术博客作者（核心）

- **背景**：25-40 岁，后端/前端/算法工程师或研究生，长期在个人博客或掘金/少数派写长文
- **痛点**：
  - Markdown 文件散落，缺乏项目化组织
  - 各平台（微信/知乎/小红书）渲染规则不一，样式重做成本高
  - Typora 好用但发布链路弱；Obsidian 好组织但发布弱；VS Code 写博客太原始
- **诉求**：一个主战场，兼顾"写"与"发"
- **关键场景**：
  - 每天 1-2 小时深度写作，周产出 3-5 篇
  - 需要公式、图表、代码高亮、脚注
  - 需要多平台一键发布且视觉可接受

### 2.2 用户画像 P2 — 长文知识工作者

- **背景**：30-50 岁，研究员、分析师、独立咨询顾问
- **痛点**：
  - Word 不适合版本历史，没有 diff；Notion 性能差、不可离线
  - 希望有正式的文档生命周期（草稿→写作中→待审阅→已发布→归档）
  - 需要引用与溯源（原始事实 / 模型推断 / 用户手写三层区分）
- **诉求**：把 InkForge 作为"单人知识库 + 长文写作平台"
- **关键场景**：
  - 单文档可能 5-10 万字，长表格、长脚注、大量引用
  - 频繁切换 Typora 模式（读写）和 Preview 模式（排版检查）
  - 归档后仍可重新打开、复制片段、派生新稿

### 2.3 用户画像 P3 — 学生/研究生

- **背景**：在读硕博，写论文、笔记、文献综述
- **痛点**：
  - LaTeX 学习成本高，公式编辑器不顺手
  - 学校要求 Word 格式，但自己写作喜欢 Markdown
- **诉求**：Markdown 中写公式像写文字一样顺手；可导出多种格式
- **关键场景**：
  - 论文草稿 2-5 万字，多个嵌套列表、编号列表、图表、脚注
  - 每日记录实验结果，快速笔记
  - 毕业后希望完整数据可导出为标准 Markdown

### 2.4 用户画像 P4 — 独立开发者 / SaaS 写作者

- **背景**：25-35 岁，自由职业或小团队
- **痛点**：
  - 需要多账户（自己、客户 A、客户 B）分别管理文章
  - 需要可定制主题（配合自己的个人品牌）
  - 需要发布到多个渠道
- **诉求**：InkForge 作为"写作平台 + 多客户管理 + 自媒体中枢"
- **关键场景**：
  - 每天开 2-3 个窗口（不同 Profile）并行写作
  - 需要极致快捷键效率
  - 需要导出一致性（每次导出样式一致）

### 2.5 场景 S1 — 快速记录

- **触发**：用户点击 Hub 上的"快速新建"或按 Ctrl+N
- **流程**：
  1. 编辑器启动（冷启动 ≤ 800ms；热启动 ≤ 300ms）
  2. 默认进入 Typora 模式
  3. 用户开始输入；字符出现无延迟感（0ms，R-15）
  4. 按 `# ` 触发输入规则，立即变为 h1；光标在行末时仍显示 `# ` 淡色前缀
  5. 1 秒后自动保存到 DB，StatusBar 出现"已保存"指示
- **验收点**：从"打开 InkForge"到"开始写"不超过 3 秒

### 2.6 场景 S2 — 长文写作

- **触发**：用户双击 Hub 上的文章进入 Workstation
- **流程**：
  1. Workstation 打开，左栏显示文件树/版本/TOC，中栏 = 编辑器，右栏 = 预览
  2. 用户写作 2 小时；期间 5-10 次 Ctrl+Shift+V 切换 Preview；3-5 次 Ctrl+\ 切换 Source 看原文
  3. 写作期间产生 40-60 个自动版本快照，每次"修改完成"触发（L1-17 C + 补充）
  4. 两小时后退出，重新打开文档，模式（Typora/Source/Preview）被记忆，滚动位置恢复
- **验收点**：2 小时长文写作无感，版本历史可浏览，无任何数据丢失

### 2.7 场景 S3 — 技术文档（含公式、代码、表格）

- **触发**：写论文或技术说明
- **流程**：
  1. 输入 `$$` 进入块级公式，KaTeX 即时 WYSIWYG 渲染
  2. 输入 ``` 后选 `python`，代码块显示语言标签与复制按钮
  3. 输入 `| a | b |` 触发表格输入规则
  4. 光标进入表格 → 切换到 pipe 文本编辑；离开 → 渲染为表格（T01-07 C）
  5. 右侧 Preview 面板 Mermaid 图实时渲染（B-13）
- **验收点**：公式、代码、表格、Mermaid 都能在 Typora 模式下自然出现与编辑

### 2.8 场景 S4 — 发布到微信公众号

- **触发**：写完后按 Ctrl+Shift+E 或点击工具栏"导出"
- **流程**：
  1. 打开 Export Dialog，选择微信预设
  2. 调整参数（字号、颜色强调、是否保留 TOC）
  3. 预览最终效果
  4. 一键复制富文本到剪贴板 → 粘贴到公众号后台
- **验收点**：微信后台粘贴后视觉与预览 95% 一致（R-14 + 15-export-publish）

### 2.9 场景 S5 — 多端同步

- **触发**：在笔记本上写了一半，希望在台式机继续
- **流程**：
  1. 开启 Sync（WebDAV / Git / 自有服务）
  2. 保存后自动 push；另一台机器自动 pull
  3. 打开时看到最新版本；若本地有冲突，进入三方合并 UI（R-08 + R-09）
- **验收点**：5-10 秒内完成同步，冲突时让用户决策

---

## §3 用户旅程（Journey Maps）

### 3.1 首次安装与引导

| 阶段 | 用户动作 | 系统响应 | 情绪 | 改进机会 |
|---|---|---|---|---|
| 下载 | 点击下载 Tauri 安装包 | 跳转 Release 页 | 中性 | — |
| 首启 | 双击图标打开 | 出现 Welcome Modal（仅欢迎 + 3 行文字 + 进入 Hub 按钮，不创建示例文档） | 正向（极简） | 保持现状（A-09） |
| 探索 Hub | 看到空 Hub（guided mode） | 卡片显示"点击这里新建文章"等引导文案 | 正向 | 禁止 Feature Tour |
| 首次创建 | 点击 QuickActionFab → 新建 | 进入 Workstation → Editor → Typora 模式 | 正向 | 确保冷启动 ≤ 800ms |
| 首次输入 | 输入 "# Hello"，光标仍在行末 | h1 样式即时应用，`# ` 前缀可见 | 正向（像 Typora） | — |
| 光标移开 | 换行到下一段 | `# ` 前缀消失，纯粹标题呈现 | 惊喜（Aha Moment） | — |

### 3.2 日常写作

| 阶段 | 用户动作 | 系统响应 |
|---|---|---|
| 开机打开 InkForge | 双击图标 | 恢复到退出时的 TabBar 状态（N-05 + N-04） |
| 继续上次文章 | 点击 Tab | 编辑器恢复模式、选区、滚动位置（R-05 + L1-11） |
| 深度写作 | 输入、格式化、插入公式 | 字符 0ms 延迟；自动保存每 1s；版本每"修改完成"快照 |
| 切换 Source 看原文 | Ctrl+\ | 过渡动画 + Toast "已切换到 Source 模式"（T01-13 D） |
| 切回 Typora | Ctrl+\ | 恢复选区、撤销栈在新模式检查点（T01-14 C） |
| 意外崩溃 | Tauri 进程异常 | 重启后 Recovery Mode 引导 → 恢复 beforeunload 快照（R-01 D + 17-crash-recovery） |

### 3.3 发布与归档

| 阶段 | 用户动作 | 系统响应 |
|---|---|---|
| 导出前预览 | Ctrl+Shift+E → 选择预设 | 打开 Export Dialog + 预览 |
| 选择平台 | 微信/小红书/知乎/HTML/Markdown | 每平台独立渲染链路（R-13） |
| 一键复制/下载 | 按钮 | 多 MIME 复制或下载文件 |
| 标记已发布 | 状态机迁移到 `published` | FrontMatter 更新，DB 镜像同步，activity_logs 记录 |
| 归档 | 右键 → 归档 | 文档进入"冷存储"，不再参与统计（L1-44 D） |

---

## §4 核心价值主张

### 4.1 USP（独特卖点）

1. **Markdown 是唯一表达权威**：所有发布从 Markdown 派生，不怕导出走样
2. **Typora 风格 + 纸张式安静**：写作时光，保留视觉气质
3. **多渠道一键发布**：微信/知乎/小红书/HTML/Markdown 各自独立链路
4. **开源 + 本地优先 + 多账户**：数据掌握在自己手里
5. **Tauri 桌面端**：原生性能 + 原生文件系统集成 + 原生快捷键

### 4.2 为什么不选其他（差异化）

| 竞品 | InkForge v2.1 差异化 |
|---|---|
| Typora | 开源、多账户、多平台发布、插件系统、版本/回收站/审计 |
| Obsidian | 更安静、更 Markdown-first、多平台发布、无需强链接图 |
| Notion | 离线、Markdown 权威、无块强制、多账户本地 |
| VS Code + MD | 更专注写作、更好的 Typora 体验、更好的发布 |
| Logseq | 不是 outliner，更线性、更传统 |

### 4.3 对 A/D 双核的贡献

- A（单人深度写作）：Typora 模式、纸张式、专注模式、长文 90 万字、版本历史、崩溃恢复
- D（多渠道发布）：Markdown 权威、独立 exporter、保真度预设、剪贴板多 MIME

---

## §5 功能范围（MUST / SHOULD / COULD / WON'T）

### 5.1 MUST（v2.1 硬门槛）

1. Typora 模式 cursor-aware 渲染（19 种元素全覆盖）
2. Source 模式基于 vue-codemirror + `@codemirror/lang-markdown`
3. Preview 模式实时更新
4. 三模式切换状态全继承（选区/撤销栈/版本点/评论锚点/滚动/折叠）
5. Ctrl+\ 切换 Typora/Source，Ctrl+Shift+V 切换 Preview
6. 自动保存（1s）+ 失败重试一次 + 用户可见 + 审计日志
7. 版本快照（修改完成触发）+ diff/merge 恢复
8. 19 种元素 round-trip 无损
9. 扩展语法：脚注、details、TOC、KaTeX、Mermaid、Wikilink、Emoji、FrontMatter、Citation、Highlight
10. 智能标点（可逐条开关）+ PanguSpacing 中英文空格
11. 四类命令入口（快捷键 / 斜杠 / 浮动工具栏 / 右键）统一注册表
12. 引用溯源三层（事实/推断/手写）
13. 块级拖拽 + 列表项拖拽（虚影跟随）
14. 代码块 Shiki 高亮 + 复制按钮 + 语言标签
15. 表格双向 pipe 语法 + 横向滚动 + 对齐
16. 图片：选中/调整/对齐/替换/alt/画廊/Caption
17. 链接：hover tooltip（编辑/复制/取消）+ Ctrl+Click 跟随
18. 粘贴纯文本清洗（带来源白名单/黑名单机制）
19. 复制按内容类型分流（文本/富文本/Markdown 多 MIME）
20. 中文输入法兼容性测试覆盖
21. 专注模式（段落高亮 + 隐藏 UI，保留功能）
22. 纸张宽度 4 档 + Ctrl+= 循环切换
23. 错误边界 + 扩展健康检查 + 安全模式
24. 大文档分片（≥ 500 段或 ≥ 50k 字激活）
25. StatusBar 实时统计（字数 / 字符数 / 段落 / 阅读时长）
26. 写作目标（单文档 + 日/周累计）
27. IME 组合态下不误触 cursor-aware
28. 无障碍：keyboardable（不做 WCAG AA 专项，但全键盘可达）

### 5.2 SHOULD（v2.1 优先级次高）

1. 多光标 Ctrl+D 选中下一个相同词
2. 浮动工具栏选区格式化（选中文字后 150ms 浮出）
3. 写作氛围（iA Writer 式写作配色）
4. Typography 面板（字号/行距/段距/缩进/标题样式）
5. 字体中英文独立配置 + 开源字体优先
6. 主题引擎（编辑器内容区主题与 UI 主题解耦）
7. 批注能力（评论行内范围锚点，L1-15 C + 补充漂移算法）
8. 审阅状态机（Comment / Request Changes / Approve）
9. 自定义 CSS 注入（沙箱 + 错误回滚）
10. 片段系统（SnippetSystem）

### 5.3 COULD（v2.1 预留骨架）

1. Callout / Admonition（M-01 A 延后 v2.2+，但 NodeView 抽象预留）
2. Embed（M-07 A 延后）
3. 深度链接 Deep Link（EX-09 v2.2+）
4. Vim 模式（keymap 设计时预留切换层）
5. 打字机模式（专注模式可叠加，但默认关闭）

### 5.4 WON'T（v2.1 明确不做）

1. 块级编辑（Notion 式强制结构）
2. 实时多人协同编辑
3. WCAG AA 级无障碍专项
4. PDF 导出（P-05 A）
5. Tauri 原生菜单（S-07 C）
6. 打印（S-10 A）
7. 独立阅读模式（L1-47 A，预览兼任）
8. 示例文档自动创建（A-09）
9. 自动链接检测（E-08 C 裁决）
10. 代码块的 IDE 化增强（E-04 A，"文本编辑器不是代码编辑器"）
11. 行列号（L1-48 B，StatusBar 不显示）
12. 打字速度/会话字数增量（L1-48 B，不显示）
13. 代码编辑器的 Intellisense/自动补全（E-04 A）

---

## §6 核心能力清单（Capability Catalogue）

### 6.1 Typora 模式

| 能力 | 说明 | 决策 |
|---|---|---|
| cursor-aware 渲染 | 光标进入块/mark 时暴露 Markdown 源码，离开时隐藏 | T01-01 A |
| 嵌套 Mark 分层显示 | `**_text_**` 显示 `**` 和 `_` 分别在正确位置 | T01-02 C |
| 语法标记样式 | currentColor + opacity 0.25 + 无动画 | T01-03/04 |
| 块级元素 cursor-aware | heading/blockquote/list/hr/codeBlock/table/image/math | T01-07/08/09/10 + T01-18 |
| 表格完整 Typora 行为 | 进入=pipe 文本，离开=渲染表格 | T01-07 C |
| 代码块围栏 cursor-aware | 光标进入才显示 ``` + 语言标签 | T01-08 A |
| 链接 | 单击=光标置入；hover=URL tooltip；Ctrl+Click=跟随 | T01-09 C + E-08 C |
| 图片 | 始终渲染，光标进入=编辑 alt+src（统一 B 规则） | T01-10/18（取 B） |
| Mermaid | 不做内联切换，右侧 Stage 面板渲染 | B-13 |
| KaTeX | 块级/行内均做完整 WYSIWYG；错误提示自清 | B-12 |
| 高亮 `==text==` | cursor-aware + 多色 + 浮动工具栏选色 | M-03 D |
| 脚注 | 完整脚注语法 + 悬停预览 + 双向跳转 | M-02 D |
| Details | `<details>` + `<summary>` 展开收起 | M-05 D |
| TOC 宏 | 正文内 `[toc]` 实时生成 | M-04 D |
| Emoji | `:name:` 语法 + 自动完成面板 + 常用收藏 | M-06 C |
| WikiLink | `[[文章名]]` + 跳转 + 自动完成 | EX-02 |
| Citation | 引用来源标注（事实/推断/手写三层） | R-11 + EX-10 |

### 6.2 Source 模式

| 能力 | 说明 |
|---|---|
| 引擎 | vue-codemirror 6 + @codemirror/lang-markdown |
| 高亮 | Markdown 语法高亮（标题、代码、链接、强调） |
| 折叠 | 代码块 / 标题层级可折叠 |
| 行号 | 可选（Settings） |
| 软换行 | 默认开启（长文档友好） |
| 搜索替换 | CodeMirror 原生 + 快捷键 Ctrl+F/Ctrl+H |
| 撤销 | 独立 CodeMirror history，切模式时记检查点（T01-14 C） |

### 6.3 Preview 模式

| 能力 | 说明 |
|---|---|
| 渲染 | Markdown → HTML，每 keystroke 实时更新（T04-09 A） |
| 滚动同步 | 双向同步滚动，可临时关闭（W-04 D） |
| 主题 | 可独立于编辑器内容区主题 |
| 公式/代码/Mermaid | 与编辑态一致（R-14） |
| 导出按钮 | 顶部工具栏一键导出 |

### 6.4 四类命令入口（L1-29 A + L1-27 D）

| 入口 | 职责 | 快捷键示例 |
|---|---|---|
| 快捷键 | 熟练用户的全部命令 | Ctrl+B / Ctrl+I / Ctrl+Shift+K |
| 斜杠命令 | 插入/创建新块 | `/` → 面板 → "插入表格"、"插入代码块" |
| 浮动工具栏 | 仅对选区做格式化 | 选中后浮出：B/I/U/Strike/Code/Link/Highlight |
| 右键菜单 | 上下文菜单（剪切/复制/粘贴 + 上下文相关命令） | 右键点击块 |

严格分工：不得混用。浮动工具栏不做插入；斜杠命令不做格式化；快捷键可覆盖全部但保持默认集合克制。

### 6.5 自动保存与版本

| 能力 | 说明 |
|---|---|
| 自动保存 | 1s 防抖；失败重试 1 次；失败状态 UI 可见；日志留痕（R-07） |
| beforeunload 快照 | 紧急保存到 localStorage（R-01 D） |
| 自动版本 | 触发条件 = "修改完成"（不使用时间周期；L1-17 C + 补充） |
| 手动版本 | Ctrl+Shift+S 保存带命名的版本点 |
| 版本 diff | 双栏 diff/merge 恢复（L1-18 D） |

### 6.6 智能标点与自动补全

详见 `50-smart-punctuation-spec.md`。本 PRD 只列出纲要：
- 中文智能标点（引号/破折号/省略号/书名号）
- 英文智能标点（em/en dash / smart quotes / ellipsis）
- PanguSpacing（中英文自动加空格）
- 括号/引号/反引号/美元/尖括号配对
- YAML `---` 自动闭合
- Callout 触发 `>[!note]`（预留骨架，v2.2+ 启用）
- 代码块内禁用智能标点

### 6.7 键盘映射（完整 keymap）

详见 `49-editor-keymap-spec.md`。纲要：
- 格式化类：Ctrl+B/I/U/Shift+X（删除线）/Shift+H（高亮）/E（行内代码）
- 结构类：Ctrl+Alt+1~6（标题）/Ctrl+Shift+B（引用）/Ctrl+Shift+L（列表）
- 插入类：Ctrl+K（链接）/Ctrl+Alt+I（图片）/Ctrl+Shift+C（代码块）/Ctrl+Alt+Shift+T（表格）
- 视图类：Ctrl+\\（模式切换）/Ctrl+Shift+V（预览切换）/Ctrl+=/Ctrl+- 纸张宽度 / F11（专注模式）
- 导航类：Ctrl+F/H（查找替换）/Ctrl+P（命令面板，不打印）
- 历史类：Ctrl+Z/Y，逻辑分组
- 多光标：Ctrl+D（选下一个相同词）
- 数学/特殊：Alt+Shift+M（块级公式）/Alt+Shift+F（脚注）

### 6.8 无障碍

v2.1 不做 WCAG AA 专项（L1 G-09 A），但必须满足：
- 所有按钮有可达的键盘焦点
- 模式切换、命令面板、斜杠菜单有合适的 role/aria 属性
- 禁用状态下的按钮 aria-disabled
- 浮动工具栏 role=toolbar

### 6.9 国际化

- 默认中文 + 英文双语（G-08 C）
- 所有 UI 文案走 `src/i18n/locales/*.ts`
- 编辑器内容不国际化（内容是用户写的）

### 6.10 错误与恢复

- 四层错误分级（提示/可恢复/阻断/数据风险）
- 保存失败归入"数据风险"
- 崩溃恢复见 17-crash-recovery-spec
- 扩展健康检查见 R-04 D

---

## §7 四模式互换语义（Typora / Source / Preview / Export）

### 7.1 状态机图

```
          Ctrl+\             Ctrl+\
Typora   ←──────→   Source   ──────→   [不可直接到 Preview]
  │                   │
  │ Ctrl+Shift+V      │ Ctrl+Shift+V
  │                   │
  ▼                   ▼
Preview              Preview
  │                   │
  │ Ctrl+Shift+V      │ Ctrl+Shift+V
  │                   │
  ▼                   ▼
Typora              Source
```

- Typora ↔ Source：Ctrl+\
- Typora → Preview、Source → Preview：Ctrl+Shift+V
- Preview → 回到上次模式：Ctrl+Shift+V 再按
- Export 不是独立模式，而是 Dialog；从任一模式按 Ctrl+Shift+E 打开

### 7.2 状态继承表

| 状态 | Typora↔Source | ↔Preview | Export |
|---|---|---|---|
| 正文内容 | 必须一致（Markdown 真值） | 必须一致 | 必须一致 |
| 选区 | 继承字符偏移（转换位置） | 只读（Preview 不可编辑） | N/A |
| 撤销栈 | 各自独立 history + 检查点（T01-14 C） | N/A（Preview 无编辑） | N/A |
| 滚动位置 | 继承（按行号映射） | 继承（按锚点） | N/A |
| 折叠状态 | 继承 | 继承 | N/A |
| 版本点 | 不变 | 不变 | 不变 |
| 评论锚点 | 继承（字符漂移算法） | 继承 | 导出时隐藏（L1-26 可配） |
| 搜索高亮 | 各模式独立 UI，但 term 继承 | 继承 | N/A |

### 7.3 "Markdown 是唯一权威"的运行时保证

- Typora 模式：编辑产生 ProseMirror JSON → 序列化为 Markdown → 再反序列化回来（内部循环不暴露用户）
- Source 模式：直接编辑 Markdown 字符串
- Preview 模式：从 Markdown 渲染 HTML，不可编辑
- 切换路径保证：**以"当前 Markdown"为中介**，任何两模式切换必须先同步到 Markdown，再同步到目标模式

### 7.4 切换反馈

- 过渡动画：200ms 淡入淡出（非必须但 T01-13 D 要求）
- Toast：右下角出现"已切换到 Typora / Source / Preview 模式"
- StatusBar：左下角模式指示器变色

---

## §8 非目标（Non-Goals）

1. 不做块级强制结构：用户可在任意位置插入任意 Markdown，系统不纠正
2. 不做 Notion 式 block UI：所有元素以 Markdown 派生的 HTML 呈现，不是"块卡片"
3. 不做实时协同编辑：单写者假设（L1-21 D）
4. 不做 WYSIWYG 富文本编辑器（即不允许超出 Markdown 表达能力的格式，如文字颜色、字号）
5. 不做 Word 式复杂排版：页眉/页脚/分页符/脚注位置这些由 exporter 负责
6. 不做代码编辑器的功能（调试、断点、LSP）（E-04 A）
7. 不做 OCR / 语音输入 / 手写笔输入（不在 v2.1 scope）

---

## §9 性能 SLO 与规模指标

### 9.1 性能 SLO（R-15 硬指标）

| 指标 | 目标 | 测量方法 |
|---|---|---|
| 字符输入延迟 | 0ms 用户感知（< 16ms 渲染帧） | Playwright performance.now |
| 自动保存耗时 | ≤ 1000ms | service 内 timing |
| 模式切换耗时 | ≤ 300ms | UI 过渡 + 状态转换总和 |
| 冷启动时间（打开空白编辑器） | ≤ 800ms | 从 router 到 editor ready |
| 热启动时间（切换文档） | ≤ 300ms | Tab 切换 |
| 大文档打开 90 万字符 | ≤ 3s | DB 读取 + 解析 + 渲染 |
| 导出（单文档）| ≤ 3min | exporter.run |
| 冲突检测 | ≤ 10s | sync.detectConflict |

### 9.2 规模指标（L1-35）

| 指标 | 目标 |
|---|---|
| 单文档最大字符数 | 900,000+ |
| 单文档段落数 | 5,000+ |
| 图片/附件数 | 2,000+ |
| 版本数 | 999 |
| 账户数 | 50+ |

### 9.3 降级策略

当文档 ≥ 50,000 字或 ≥ 500 段时，自动激活：
- 虚拟滚动（仅渲染视口 + 缓冲区）
- 语法高亮分片（按视口 + 空闲时段处理剩余）
- Decoration 惰性计算（光标附近 N=5 段实时，其他段空闲计算）
- 自动保存降级为 3s 防抖

---

## §10 度量指标（Metrics & KPIs）

### 10.1 产品级

| 指标 | 目标（v2.1 release + 90 天） |
|---|---|
| DAU / MAU | 40%+ |
| 平均日停留时长 | 30 min+ |
| 平均日字数产出 | 2000 字+ |
| 模式占比（Typora/Source/Preview） | 70% / 20% / 10% |
| Export 使用率 | 40%+ 活跃用户月使用 |

### 10.2 质量级

| 指标 | 目标 |
|---|---|
| Crash Free Session | ≥ 99.5% |
| 保存失败率 | ≤ 0.1% |
| 数据损坏报告率 | 0（强硬门槛 R-16） |
| Round-trip 无损率 | 100%（fuzz 测试） |
| Typora 模式 19 元素覆盖 | 100% |

### 10.3 体验级

| 指标 | 测量 |
|---|---|
| 首启 → 第一次保存 | P95 ≤ 30s |
| 模式切换用户主动发起次数（日均） | 3-5 次 |
| 写作目标完成率 | ≥ 60%（开启目标的用户中） |
| 专注模式使用率 | ≥ 20% 活跃用户周使用 |

---

## §11 依赖与集成点

### 11.1 上游依赖（Editor 从这些模块拉数据）

- `10-markdown-authority-spec`：Markdown 权威模型、双层缓存契约
- `11-content-model-spec`：Article/FrontMatter/LifecycleState 数据结构
- `17-crash-recovery-spec`：beforeunload / Recovery Mode
- `20-theme-font-typography-spec`：主题引擎、字体系统、Typography
- `27-performance-slo-spec`：SLO 测量与基线
- `33-diagnostic-logging-spec`：错误/性能日志

### 11.2 下游依赖（这些模块从 Editor 拉数据）

- `02-spec-hub`：Hub 上显示最近编辑、字数统计
- `04-rendering-engine-spec`：Markdown → HTML 渲染引擎
- `05-toolbar-complete-spec`：浮动工具栏 UI
- `13-workstation-layout-spec`：Workstation 四栏布局
- `15-export-publish`：导出链路
- `22-command-palette`：命令面板
- `23-sync-provider`：同步
- `29-search-engine`：搜索索引
- `31-version-bundle`：版本快照存储

### 11.3 横向依赖（与 Editor 对等）

- `16-markdown-extensions`：扩展语法（高亮/脚注/details/TOC/Math/Mermaid/Wikilink/Citation）
- `49-editor-keymap-spec`：完整 keymap
- `50-smart-punctuation-spec`：智能标点
- `51-block-drag-handle`：块级拖拽
- `52-image-gallery-spec`：图片画廊
- `53-table-advanced-spec`：高级表格
- `54-custom-css-spec`：自定义 CSS（沙箱）
- `56-footnote-math-mermaid-extensions`：扩展语法实现

### 11.4 外部依赖（第三方库，锁版本）

| 包 | 版本 | 用途 |
|---|---|---|
| @tiptap/core | ^2.2 | 编辑器内核 |
| @tiptap/pm | ^2.2 | ProseMirror 内核 |
| @tiptap/starter-kit | ^2.2 | 基础节点扩展 |
| @tiptap/extension-table | ^2.2 | 表格扩展 |
| @tiptap/extension-image | ^2.2 | 图片扩展 |
| @tiptap/extension-link | ^2.2 | 链接扩展 |
| @tiptap/extension-task-list | ^2.2 | 任务列表 |
| vue-codemirror | ^6.1 | Source 模式编辑器 |
| @codemirror/lang-markdown | ^6.2 | Source 模式语法高亮 |
| katex | ^0.16 | 公式 |
| mermaid | ^10 | 图表 |
| shiki | ^1.0 | 代码高亮 |
| dexie | ^4.0 | IndexedDB ORM |
| pinia | ^2.1 | 状态管理 |
| vue | ^3.4 | 框架 |
| vue-i18n | ^9.9 | 国际化 |
| zod | ^3.22 | Schema 校验 |
| tailwindcss | ^3.4 | 样式 |
| lucide-vue-next | ^0.356 | 图标 |
| radix-vue | ^1.4 | 无头组件 |

**禁止新增**：任何未在此表中的编辑器/富文本/Markdown 解析库。

---

## §12 风险与假设

### 12.1 风险矩阵

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 长文档性能不达 SLO | 中 | 高 | 大文档分片 + 虚拟滚动 + 惰性 Decoration |
| 中文 IME 组合态下 cursor-aware 跳字 | 高 | 中 | T01-16 C 未冻结，但验收必跑中文 IME |
| Round-trip 无损难度（table pipe / math） | 中 | 高 | fuzz 测试 + 黄金样本库 |
| vue-codemirror 集成复杂度 | 中 | 中 | 封装统一 SourceModeEditor 组件 |
| 扩展之间冲突 | 中 | 中 | ExtensionHealth 监控 + SafeMode |
| 模式切换状态丢失 | 低 | 高 | 状态序列化契约 + 集成测试覆盖 |
| 发布链路走样 | 中 | 高 | 每平台独立 preset + 黄金样本回归 |

### 12.2 关键假设

- 假设 Tauri 桌面端是主战场；Web 仅开发调试（G-06/G-12）
- 假设用户主要是中文用户（但 UI 中英双语）
- 假设用户可接受 Markdown 学习曲线（不对 Markdown 初学者做引导）
- 假设 TipTap 2.x 的 API 稳定足以支撑我们的改造
- 假设 IndexedDB 的性能足以支撑 90 万字符 + 999 版本场景

---

## §13 推出策略与阶段拆解

### 13.1 阶段

- **Phase 2**（编辑器核心三件套）：本 PRD 对应的实施期
  - 子阶段 2a：cursor-aware + 19 元素 NodeView（4 周）
  - 子阶段 2b：Source / Preview 集成、模式切换（2 周）
  - 子阶段 2c：扩展语法（高亮/脚注/details/TOC/Math/Mermaid）（3 周）
  - 子阶段 2d：keymap / smart-punctuation / 浮动工具栏 / 斜杠命令（2 周）
  - 子阶段 2e：集成测试、fuzz、性能调优（2 周）
- **Phase 3**（基础层 Polish）：与 PRD 并行
- **Phase 4**（发布）：走 Tauri 桌面端首发

### 13.2 关键里程碑

| 里程碑 | 检验点 |
|---|---|
| M1 Typora 模式 MVP | 5 种基础元素（heading/list/bold/italic/link）cursor-aware |
| M2 Typora 模式 Full | 全部 19 元素覆盖 |
| M3 Source 模式完成 | vue-codemirror 接入，模式切换状态继承 |
| M4 Preview 模式完成 | 实时渲染 + 滚动同步 |
| M5 扩展语法完成 | KaTeX / Mermaid / 脚注 / details / TOC / Highlight / Wikilink / Emoji / FrontMatter / Citation |
| M6 命令系统完成 | keymap + smart-punctuation + 浮动工具栏 + 斜杠 |
| M7 集成测试通过 | 19 元素 × 3 模式 × fuzz round-trip |
| M8 性能 SLO 达成 | Lighthouse > 80 + 大文档性能 |

### 13.3 回归策略

- 每次 PR 必跑 Playwright E2E（G-03 C + R-20）
- 每周跑一次 round-trip fuzz 全集
- 每次导出链路变更跑黄金样本对比

---

## §14 验收标准（Acceptance Criteria）

> 以下每条都是 MUST 通过的 Playwright E2E 用例或 Vitest 单元用例。

### 14.1 Typora 模式（AC-T1 ~ AC-T20）

- AC-T1：输入 `# ` + 文字，应立即显示 h1 样式，光标在行末时可见 `# ` 前缀
- AC-T2：光标移开 h1 行，`# ` 前缀消失
- AC-T3：`## ` `### ` `#### ` `##### ` `###### ` 同样工作
- AC-T4：`> ` 引用块进入/离开
- AC-T5：`- ` 无序列表 / `1. ` 有序列表 / `- [ ] ` 任务列表
- AC-T6：`---` 分割线
- AC-T7：``` ``` + lang ``` ``` 代码块 cursor-aware
- AC-T8：表格进入显示 pipe，离开渲染
- AC-T9：`**bold**` 进入显示 `**`，离开隐藏
- AC-T10：`*italic*` 同上
- AC-T11：`~~strike~~` 同上
- AC-T12：`` `code` `` 同上
- AC-T13：`[text](url)` 同上
- AC-T14：图片 `![alt](url)` 光标进入可编辑 alt 与 url
- AC-T15：嵌套 mark `***bold italic***` 显示 `**` 和 `*` 分别
- AC-T16：上标 `^text^`、下标 `~text~`
- AC-T17：高亮 `==text==`
- AC-T18：公式行内 `$x^2$`、块级 `$$\sum$$`
- AC-T19：Mermaid 块级
- AC-T20：19 种元素 round-trip 无损（Typora→Markdown→HTML→Markdown→Typora 等价）

### 14.2 Source 模式（AC-S1 ~ AC-S10）

- AC-S1：Ctrl+\ 从 Typora 切换到 Source
- AC-S2：Source 模式显示完整 Markdown 字符串
- AC-S3：Source 模式修改后 Ctrl+\ 回到 Typora，修改可见
- AC-S4：Source 模式语法高亮（headings / code blocks / emphasis）
- AC-S5：Source 模式撤销栈独立
- AC-S6：Source 模式搜索（Ctrl+F）
- AC-S7：Source 模式折叠（标题/代码块）
- AC-S8：Source ↔ Typora 滚动位置继承
- AC-S9：Source ↔ Typora 选区继承（字符偏移对齐）
- AC-S10：Source 模式下 90 万字符性能 ≤ 1s 渲染

### 14.3 Preview 模式（AC-P1 ~ AC-P5）

- AC-P1：Ctrl+Shift+V 进入 Preview
- AC-P2：实时跟随编辑器变化
- AC-P3：滚动同步（双向）
- AC-P4：公式 / Mermaid / 代码高亮与编辑态一致
- AC-P5：Ctrl+Shift+V 再次切换回上次模式

### 14.4 模式切换（AC-M1 ~ AC-M5）

- AC-M1：三模式状态全继承（选区 + 滚动 + 折叠）
- AC-M2：撤销栈按模式分检查点
- AC-M3：过渡动画 + Toast
- AC-M4：崩溃后恢复时保留上次模式
- AC-M5：多文档 Tab 各自独立模式记忆

### 14.5 自动保存 + 版本（AC-A1 ~ AC-A5）

- AC-A1：修改后 1s 内自动保存成功
- AC-A2：保存失败后自动重试 1 次
- AC-A3：重试失败后 Toast + StatusBar 标记
- AC-A4：每次"修改完成"产生一个版本点
- AC-A5：Ctrl+Shift+S 产生命名版本点

### 14.6 扩展语法（AC-X1 ~ AC-X10）

- AC-X1：脚注 `[^1]` 双向跳转
- AC-X2：details `<details>` 折叠展开
- AC-X3：TOC `[toc]` 实时生成
- AC-X4：KaTeX 错误提示修改后自清
- AC-X5：Mermaid 图右侧 Stage 面板渲染
- AC-X6：Wikilink `[[文章名]]` 自动完成
- AC-X7：Emoji `:smile:` 自动完成
- AC-X8：FrontMatter YAML 自动闭合
- AC-X9：Citation 事实/推断/手写三层标记
- AC-X10：Highlight 多色 + 浮动工具栏选色

### 14.7 命令入口（AC-C1 ~ AC-C4）

- AC-C1：30+ 快捷键全覆盖
- AC-C2：斜杠命令 `/` 面板
- AC-C3：选中后 150ms 浮现浮动工具栏
- AC-C4：右键菜单上下文相关

---

## §15 伦理、合规与安全

- **开源许可**：InkForge 遵循 MIT（与项目总许可对齐）
- **字体许可**：内置字体必须开源；商业字体仅允许用户自带（L1-57 D + 补充）
- **用户数据**：本地优先，不默认上传；同步需用户主动授权
- **日志数据**：diagnostic 日志不包含正文；分析日志仅统计字数/时长/操作次数
- **扩展沙箱**：第三方扩展受权限声明约束（R-19）
- **安全清理**：全局最小清理 `<script>` / `on*` / `javascript:` / `<iframe>`（R-13 + B-11）

---

## §16 未决问题与后续回归

| 编号 | 问题 | 建议 |
|---|---|---|
| Q1 | 专注模式是否同时激活打字机模式？ | 默认关闭，用户可在 Settings 启用 |
| Q2 | YAML FrontMatter 编辑器是否做可视化？ | v2.1 仅语法高亮，v2.2+ 考虑 |
| Q3 | Vim 模式是否进 v2.1？ | 预留切换层，v2.2+ 实施 |
| Q4 | 评论锚点漂移算法具体细节？ | 见 `11-content-model-spec` |
| Q5 | 粘贴来源白名单/黑名单配置位置？ | Settings > Editor > Paste（v2.1 默认白名单：无；黑名单：富文本来源默认清洗） |

---

## §17 参考与术语表

### 17.1 术语

- **Typora 模式**：cursor-aware 渲染的所见即所得编辑范式
- **Source 模式**：纯 Markdown 字符串编辑
- **Preview 模式**：只读渲染视图
- **Export**：导出到目标平台（非编辑模式）
- **Round-trip**：从一模式经过多层转换再回到原模式，内容无损
- **Cursor-aware**：光标所在块/mark 暴露源码，离开隐藏
- **Mark**：ProseMirror 的行内标记（bold、italic 等）
- **NodeView**：ProseMirror 节点的自定义渲染组件
- **Decoration**：ProseMirror 的装饰器（widget / inline / node 三类）
- **FrontMatter**：YAML 格式的文档元数据头
- **Callout / Admonition**：视觉强调的段落块（note/warning/info/tip 等，v2.1 延后）
- **Wikilink**：`[[文章名]]` 语法，跳转到同库其他文章
- **Citation**：引用来源标注（事实/推断/手写三层）

### 17.2 外部参考

- Typora 官方文档：https://typora.io
- iA Writer 设计哲学：https://ia.net/writer
- ProseMirror 文档：https://prosemirror.net
- TipTap 文档：https://tiptap.dev
- CommonMark Spec：https://spec.commonmark.org
- GitHub Flavored Markdown：https://github.github.com/gfm

### 17.3 内部参考

- 0327 基线：`prompts/0327/01-editor-ui-spec.md`、`prompts/0327/05-toolbar-complete-spec.md`
- 决策合成：`prompts/0420/00-decisions-part1-product-authority.md`
- 任务路线图：`prompts/0420/00-task-roadmap.md`
- Markdown 权威：`prompts/0420/spec/10-markdown-authority-spec.md`
- 内容模型：`prompts/0420/spec/11-content-model-spec.md`（待建）

---

## §18 附录 A — 19 元素详细覆盖矩阵

| # | 元素 | Markdown | 块/行 | NodeView | Cursor-aware 策略 | 可移植性 |
|---|---|---|---|---|---|---|
| 1 | H1 | `#` | 块 | `HeadingView` | 光标在块内显示 `# ` 前缀 | 标准 |
| 2 | H2 | `##` | 块 | `HeadingView` | 同上 | 标准 |
| 3 | H3~H6 | `###`~`######` | 块 | `HeadingView` | 同上 | 标准 |
| 4 | 段落 | 纯文本 | 块 | 默认 | 无 | 标准 |
| 5 | 引用 | `> ` | 块 | `BlockquoteView` | 显示 `> ` 前缀 | 标准 |
| 6 | 无序列表 | `- ` | 块 | `ListItemView` | 显示 `- ` | 标准 |
| 7 | 有序列表 | `1. ` | 块 | `ListItemView` | 显示 `1. ` | 标准 |
| 8 | 任务列表 | `- [x]` | 块 | `TaskItemView` | 显示 `- [ ] ` / `- [x] ` | GFM |
| 9 | 分割线 | `---` | 块 | 默认 | 节点被选中显示 `---` | 标准 |
| 10 | 代码块 | ``` ``` | 块 | `CodeBlockView` | 光标进入显示围栏 + 语言 | 标准 |
| 11 | 表格 | `| ... |` | 块 | `TableView` | 光标进入显示 pipe 语法 | GFM |
| 12 | 图片 | `![alt](url)` | 块/行 | `ImageView` | 光标进入显示 `![alt](url)` | 标准 |
| 13 | 粗体 | `**text**` | 行 | Mark widget | 两端显示 `**` | 标准 |
| 14 | 斜体 | `*text*` | 行 | Mark widget | 两端显示 `*` | 标准 |
| 15 | 删除线 | `~~text~~` | 行 | Mark widget | 两端显示 `~~` | GFM |
| 16 | 行内代码 | `` `code` `` | 行 | Mark widget | 两端显示 `` ` `` | 标准 |
| 17 | 链接 | `[text](url)` | 行 | Mark widget | 显示 `[text](url)` 语法 | 标准 |
| 18 | 上标 | `^text^` | 行 | Mark widget | 两端显示 `^` | 扩展 |
| 19 | 下标 | `~text~` | 行 | Mark widget | 两端显示 `~` | 扩展 |

### 扩展语法附加矩阵（本 PRD scope 内但不计入 19）

| # | 元素 | Markdown | 可移植性 |
|---|---|---|---|
| E1 | 高亮 | `==text==` | 扩展（不可移植） |
| E2 | 脚注 | `[^1]` / `[^1]: ...` | CommonMark-ext |
| E3 | Details | `<details>` | HTML 原生 |
| E4 | TOC | `[toc]` | 扩展（不可移植） |
| E5 | 行内公式 | `$x^2$` | 扩展 |
| E6 | 块级公式 | `$$ ... $$` | 扩展 |
| E7 | Mermaid | ```` ```mermaid ```` | 扩展 |
| E8 | Wikilink | `[[文章名]]` | 扩展（不可移植） |
| E9 | Emoji | `:smile:` | GFM |
| E10 | FrontMatter | `--- ... ---` | Jekyll/Hugo |
| E11 | Citation | 事实/推断/手写标记 | InkForge 独占 |

---

## §19 附录 B — 决策可追溯性表

> 每条 MUST 必须可追溯到用户决策。

| PRD 条款 | 追溯的决策号 | 用户原始回答 |
|---|---|---|
| §5.1.1 Typora cursor-aware | T01-01 A | A |
| §5.1.2 Source vue-codemirror | T01-06 A | A |
| §5.1.4 状态全继承 | L1-11 C + 补充 | C + "所有状态必须继承" |
| §5.1.5 Ctrl+\ / Ctrl+Shift+V | T01-13 D + 路线图 | D（过渡 + Toast） |
| §5.1.6 自动保存失败可见 | L1-19 D | D + "失败重试一次；用户可见；日志" |
| §5.1.7 版本 diff 恢复 | L1-18 D | D |
| §5.1.8 Round-trip 无损 | L1-08 C + 补充 | C + "所有元素必须无损" |
| §5.1.9 扩展语法 | M-02/03/04/05/06/08 + EX-02/07/10 | D 系列 |
| §5.1.10 智能标点 + Pangu | E-02 D + 补充 | D + "中英文自动加空格" |
| §5.1.11 四类命令入口 | L1-27 D + L1-29 A | D + A |
| §5.1.12 引用三层 | L1-26 D + 补充 | D |
| §5.1.13 块级拖拽 | E-03 D + 补充 | D + "带文本走的感觉" |
| §5.1.14 Shiki 代码高亮 | B-14 | T04-05 A + T04-07 C |
| §5.1.15 表格双向 pipe | E-05 D + 补充 | D + "双向转换 pipe" |
| §5.1.16 图片完整交互 | E-09 D | D |
| §5.1.17 链接 tooltip | E-08 C | C |
| §5.1.18 粘贴清洗 | T01-17 A + 补充 | A + "来源白名单/黑名单" |
| §5.1.19 复制分流 | T01-20 D | D |
| §5.1.20 IME 覆盖测试 | T01-16 C + 风险 | C（但需测试） |
| §5.1.21 专注模式 | L1-46 D + 补充 | D + "保留快捷键/斜杠/保存" |
| §5.1.22 纸张 4 档 Ctrl+= | T01-11 C | C |
| §5.1.23 错误边界 | R-04 D | D |
| §5.1.24 大文档分片 | L1-35 + L1-36 | 性能 SLO |
| §5.1.25 StatusBar 实时统计 | L1-48 B + N-01 C + 补充 | B + C + "可整体关闭" |
| §5.1.26 写作目标 | L1-45 C + 补充 | C + "动画/奖励/Hub" |
| §5.4.1 不做块级 Notion | L1-39 A | A |
| §5.4.2 不做协同 | L1-21 D | D |
| §5.4.4 不做 PDF | P-05 A | A |
| §5.4.5 不做 Tauri 菜单 | S-07 C | C |
| §5.4.6 不做打印 | S-10 A | A |
| §5.4.7 不做独立阅读模式 | L1-47 A | A |
| §5.4.8 不创建示例文档 | L1-50 补充 | "讨厌引导，不要示例文档" |
| §5.4.9 不自动链接检测 | E-08 C | C |
| §5.4.10 不做代码 IDE | E-04 A + 补充 | A + "文本编辑器不是代码编辑器" |
| §5.4.11/12 StatusBar 不显示行列号/速度 | L1-48 B | B |
| §9 性能 SLO | L1-36 C + 补充 + R-15 | C + 硬指标 |
| §9 规模 | L1-35 + 补充 | 90 万字/2000 附件/999 版本/50 账户 |

---

## §20 附录 C — 验收证据清单（R-20 遵循）

每个 AC 必须附带以下证据：

1. **Playwright E2E 脚本**：`tests/e2e/editor-<ac-id>.spec.ts`
2. **Vitest 单元测试**（必要时）：`tests/unit/editor/...`
3. **截图**：`artifacts/editor/<ac-id>/screenshot.png`
4. **性能 trace**（涉及 SLO 的 AC）：`artifacts/editor/<ac-id>/trace.json`
5. **Round-trip 对比样本**（涉及 round-trip 的 AC）：`artifacts/editor/<ac-id>/roundtrip-diff.txt`

失败/恢复/边界样本：
- 失败样本：保存失败、扩展崩溃、非法 Markdown
- 恢复样本：beforeunload 快照恢复、版本回滚
- 边界样本：90 万字符、2000 附件、50 个 Tab

---

## §21 附录 D — 跨模块契约清单

> 本 PRD 对其他模块做出的假设与要求。

| 对方模块 | 本 PRD 的要求 |
|---|---|
| 10-markdown-authority | 提供 `markdownSource / htmlCache / sourceHash / cacheVersion` 字段与校验 API |
| 11-content-model | 提供 `Article` / `FrontMatter` / `LifecycleState` 类型 |
| 17-crash-recovery | 提供 `beforeunload` 钩子 + Recovery Mode |
| 20-theme | 提供 `EditorContentTheme` + `AppChromeTheme` 两个 CSS 变量轨道 |
| 27-performance-slo | 提供 `performanceBaseline.json` |
| 33-diagnostic-logging | 提供 `logger.error/warn/info` 四层分级 |
| 02-hub | 从 editor 订阅字数统计、最近修改 |
| 04-rendering-engine | 消费 Markdown → HTML 的渲染规则 |
| 13-workstation-layout | 提供四栏布局容器 |
| 15-export | 从 markdownSource 派生，不碰 DB |
| 22-command-palette | 从 commandRegistry 订阅命令 |
| 23-sync | 在 markdownSource 层做三方合并 |
| 29-search-engine | 从 markdownSource 建立全文索引 |
| 31-version-bundle | 以 markdownSource 快照作为版本存储对象 |
| 49-editor-keymap | 提供完整 keymap 注册 API |
| 50-smart-punctuation | 提供智能标点扩展 |

---

## §22 附录 E — 术语别名与翻译

| 英文 | 中文 | 本文档首选 |
|---|---|---|
| Cursor-aware | 光标感知 | cursor-aware |
| WYSIWYG | 所见即所得 | 所见即所得 |
| Round-trip | 往返 / 无损往返 | round-trip |
| Mark | 标记 | Mark |
| NodeView | 节点视图 | NodeView |
| FrontMatter | 头信息 | FrontMatter |
| Callout / Admonition | 告示块 | Callout |
| Wikilink | 双链 | Wikilink |
| Emoji | 表情 | Emoji |
| Highlight | 高亮 | Highlight |
| Footnote | 脚注 | 脚注 |
| Details | 折叠块 | Details |
| TOC | 目录 | TOC |

---

## §23 附录 F — 用户场景脚本（5 个核心场景的详细脚本化）

### F.1 场景 S1 — 快速记录（完整脚本）

**角色**：独立开发者 Alice，30 岁，同时维护 3 个 SaaS 产品的博客。

**场景**：Alice 正在开会，突然有灵感，想记下一段关于"AI Agent 交互设计"的思路。

**时间**：2026 年某个下午 15:42。

**步骤**：

1. 15:42:00 — Alice 按下 Ctrl+Alt+N（全局快捷键，L1-55 C）
2. 15:42:00.15 — Tauri 唤起 QuickNoteWindow 子窗口（冷启 ≤ 300ms）
3. 15:42:00.4 — 光标自动聚焦到编辑器
4. 15:42:01 — Alice 开始输入：`# AI Agent 交互设计随想`
5. 15:42:01.3 — `#` 立即触发输入规则，变为 h1 样式；光标在行末时可见淡色 `# ` 前缀（cursor-aware）
6. 15:42:01.5 — Alice 回车，进入下一行
7. 15:42:02 — 输入：`- 关键问题是**谁拥有上下文**？`
8. 15:42:02.5 — `- ` 触发无序列表；`**` 触发粗体
9. 15:42:10 — Alice 继续输入 200 字
10. 15:42:11 — 自动保存指示器在 StatusBar 闪烁（1s 节流）
11. 15:43:00 — Alice 完成随想，按 Ctrl+W 关闭窗口
12. 15:43:00.1 — QuickNote 内容自动归档到草稿箱（F-05 D）

**验收点**：
- 从按下快捷键到可以输入的时间 ≤ 300ms
- cursor-aware 即时生效
- 1s 自动保存
- 关窗自动归档

### F.2 场景 S2 — 长文写作（完整脚本）

**角色**：技术博客作者 Bob，35 岁，每月产出 3-5 篇技术深度文。

**场景**：Bob 正在写一篇关于"ProseMirror 架构剖析"的 8000 字长文。

**时间**：某个周末下午，14:00 - 17:00 共 3 小时。

**步骤**：

1. 14:00 — Bob 打开 InkForge，Hub 显示最近编辑的文章
2. 14:01 — 双击"ProseMirror 架构剖析"进入 Workstation
3. 14:01.3 — Workstation 打开，左栏 = 文件树/版本/TOC，中栏 = Editor（Typora 模式，保留上次滚动位置），右栏 = Preview
4. 14:02 — Bob 开始补充第 3 章"Transform 原理"
5. 14:15 — 输入一段 LaTeX 公式 `$$\text{state}_{t+1} = \text{apply}(\text{state}_t, \text{step})$$`
6. 14:15.3 — 块级公式立即 WYSIWYG 渲染
7. 14:20 — 插入代码块 ```` ```typescript ````
8. 14:25 — 右侧 Preview 实时更新
9. 14:30 — Bob 按 Ctrl+\ 查看 Source 模式确认纯 Markdown 效果
10. 14:30.2 — 模式切换：过渡动画 200ms + Toast "已切换到 Source 模式"
11. 14:30.5 — Source 模式显示完整 Markdown 字符串，滚动位置和选区继承
12. 14:31 — Bob 确认无误，Ctrl+\ 切回 Typora
13. 15:00 — Bob 需要插入 Mermaid 图
14. 15:00.3 — 输入 ```` ```mermaid ```` 进入 Mermaid 块
15. 15:01 — 编辑器显示 Mermaid 源码（不做 cursor-aware），右侧 Stage 面板渲染出图
16. 16:00 — Bob 已经连续写作 2 小时，期间产生约 50 个自动版本点（"修改完成"触发）
17. 16:30 — Bob 发现需要回到某个早期版本比较
18. 16:30.1 — 打开左栏版本历史 Tab，选择 15:20 的版本
19. 16:30.3 — 打开 diff/merge 双栏视图（R-06）
20. 16:30.5 — Bob 选择性合并其中 3 段回当前版本
21. 16:45 — 完成长文，按 Ctrl+Shift+S 创建命名版本"v1.0 草稿完成"
22. 17:00 — 关闭文档，Tab 状态记忆

**验收点**：
- 3 小时长文写作无卡顿，SLO 全达标
- 模式切换状态全继承
- 版本 diff/merge 可用
- 命名版本点

### F.3 场景 S3 — 技术文档（完整脚本）

**角色**：研究生 Carol，28 岁，正在写毕业论文。

**场景**：Carol 正在写毕业论文的方法论章节，涉及大量公式、参考文献脚注、图表。

**步骤**：

1. 打开"毕业论文.md"，1.8 万字长文
2. 在"方法论"章节插入公式推导（10 个块级公式）
3. 插入表格（4 列 × 8 行，数据列）
4. 每个公式添加编号（M-08 D 交叉引用）
5. 插入脚注引用（`[^1]` 语法，悬停显示内容）
6. 插入 Mermaid 流程图描述实验步骤
7. 插入 code block 描述算法
8. 使用 Wikilink `[[相关工作综述]]` 链接到同库其他章节
9. 使用 `[toc]` 宏自动生成目录
10. 使用 `==关键词==` 高亮重要概念（多色）
11. Citation 标记引用来源（事实层）

**验收点**：
- 所有公式编号可交叉引用
- 表格双向 pipe 语法
- 脚注双向跳转
- Mermaid 不做内联 Typora 切换
- Wikilink 自动完成
- `[toc]` 实时生成

### F.4 场景 S4 — 发布到微信（完整脚本）

**角色**：自媒体作者 David，40 岁，运营"技术管理"公众号 3 年，粉丝 5 万。

**场景**：David 刚写完一篇文章，要发布到微信公众号。

**步骤**：

1. 按 Ctrl+Shift+E 打开 Export Dialog
2. 选择"微信公众号"预设
3. 预览区实时显示微信适配的渲染效果
4. 调整字号（18px）、颜色强调（#576b95）、代码块背景
5. 开启"保留 TOC"选项
6. 确认无 Mermaid 降级问题（Mermaid → PNG 回退）
7. 点击"复制富文本到剪贴板"
8. 打开浏览器，进入微信公众号后台
9. 在编辑器中粘贴
10. 微信编辑器接受并正确渲染（视觉 95% 一致）
11. 点击"发布"

**验收点**：
- 导出速度 ≤ 3min
- 视觉 95% 一致
- 复制富文本多 MIME
- 降级策略生效（Mermaid 回退图像）

### F.5 场景 S5 — 多端同步（完整脚本）

**角色**：独立顾问 Eve，45 岁，笔记本和台式机均有 InkForge。

**场景**：Eve 早上在笔记本写了一半，晚上希望在台式机继续。

**步骤**：

1. 笔记本上 Eve 写作 30 分钟后保存
2. 笔记本自动 push 到 WebDAV（R-08）
3. 晚上 Eve 打开台式机 InkForge
4. 自动 pull 最新内容
5. 打开文档，看到上午在笔记本上的最新内容
6. 假设同时在台式机上也做了少量修改（冲突场景）
7. push 时检测到冲突（≤ 10s 完成）
8. 进入三方合并 UI（R-09）
9. Eve 逐段选择保留哪边
10. 合并完成，push 成功
11. activity_logs 记录"冲突解决"事件（R-17）

**验收点**：
- Sync 5-10s 完成
- 冲突检测 ≤ 10s
- 三方合并 UI 清晰
- 审计日志留痕

---

## §24 附录 G — 竞品对比矩阵

| 维度 | InkForge v2.1 | Typora | Obsidian | Notion | VS Code MD |
|---|---|---|---|---|---|
| Markdown 权威 | ✅ 唯一权威 | ✅ 表达权威 | ✅ 双链权威 | ❌ 内部块 | ✅ |
| Typora 风格 | ✅ 默认 | ✅ 默认 | ❌ | ❌ | ❌ |
| 纸张式视觉 | ✅ | ✅ | ❌ | ❌ | ❌ |
| 多渠道发布 | ✅ 5 平台 | ❌ | ❌ | ❌ | ❌ |
| 离线 | ✅ | ✅ | ✅ | ❌ | ✅ |
| 多账户 | ✅ Profile | ❌ | ❌ | ✅ | ❌ |
| 版本历史 | ✅ diff/merge | ❌ | ❌ 需插件 | ✅ | Git |
| 崩溃恢复 | ✅ | 部分 | ✅ | ✅ | Git |
| 开源 | ✅ MIT | ❌ | 部分 | ❌ | ✅ |
| 扩展系统 | ✅ SDK | ❌ | ✅ | ❌ | ✅ |
| Tauri 原生 | ✅ | ❌ Electron | ❌ Electron | ❌ Web | N/A |
| 中文 IME | ✅ 测试覆盖 | ✅ | 部分 | 部分 | ✅ |
| 公式 | ✅ KaTeX | ✅ | ✅ | 部分 | 插件 |
| Mermaid | ✅ Stage 面板 | ✅ | ✅ 插件 | 部分 | 插件 |
| 表格 pipe 双向 | ✅ | ✅ | 部分 | ❌ | ✅ 文本 |
| 快速笔记窗口 | ✅ 全局快捷键 | ❌ | ❌ | ❌ | ❌ |
| 文件系统集成 | ✅ 监控文件夹 | ✅ | ✅ | ❌ | ✅ |

---

## §25 附录 H — 功能开关矩阵（Feature Flags）

> v2.1 采用"默认极简、全开关"原则。以下表格列出所有可由用户调整的行为开关。

| 开关 | 默认 | 可调位置 | 说明 |
|---|---|---|---|
| Typora mode | On | Settings > Editor | 关闭后等同 Source 模式常驻 |
| Smart Punctuation | On | Settings > Editor > Smart Punctuation | 每条独立可关 |
| PanguSpacing | On | Settings > Editor > Smart Punctuation | 中英文空格 |
| Auto Save | On | Settings > Editor | 可调间隔 1-10s |
| Auto Save Retry | 1 次 | Settings > Editor | 1-3 次 |
| Auto Version | On | Settings > Editor | 关闭后仅手动版本 |
| Cursor-aware Inline | On | Settings > Editor > Typora | 行内 mark cursor-aware |
| Cursor-aware Block | On | Settings > Editor > Typora | 块级元素 cursor-aware |
| Sync Scroll | On | 右栏 Preview 工具栏 | 双向同步滚动 |
| Floating Toolbar | On | Settings > Editor > Toolbar | 选区浮动工具栏 |
| Slash Commands | On | Settings > Editor | `/` 触发命令面板 |
| Status Bar | On | Settings > Editor > Status Bar | 整体隐藏 |
| Writing Ambience | Off | Settings > Theme | iA Writer 式配色 |
| Focus Mode Paragraph Highlight | On | Settings > Focus | 段落聚焦 |
| Focus Mode Typewriter | Off | Settings > Focus | 打字机模式 |
| Paper Width | M | Ctrl+= 切换 | S/M/L/XL 4 档 |
| Block Drag Handle | On | Settings > Editor | 块级拖拽 |
| Image Caption | Off | Settings > Editor > Image | 图片说明文字 |
| Math Rendering | KaTeX | Settings > Editor > Math | KaTeX（仅一个选项） |
| Mermaid Stage | On | Settings > Editor > Mermaid | 右侧 Stage 面板 |

---

## §26 附录 I — 首次启动体验（FTUE）

### 26.1 原则

- L1-50 B + 补充"讨厌引导"：**仅欢迎弹窗，不创建示例文档，不做 Feature Tour**
- L1-52 A：所有功能第一天全部可见
- A-09：首次 Hub 进入"guided mode"（卡片带引导文案但不弹窗）

### 26.2 具体流程

1. 首次启动 → Welcome Modal（3 行文字 + 进入按钮）
2. 进入 Hub（guided mode）
3. 用户点击 QuickActionFab → 新建 → 进入 Workstation
4. Workstation 打开空白文档
5. 第一次使用某些高级功能时，显示上下文气泡（L1-51 C），带"已读"持久化

### 26.3 禁止

- ❌ 自动创建示例文档
- ❌ 多步骤 Tour
- ❌ 强制看新手视频
- ❌ 使用术语缩写（LSP / AST / FSM 等）对用户可见

---

## §27 附录 J — 失败场景处理

| 失败场景 | 行为 | 用户可见性 |
|---|---|---|
| 保存失败（1 次） | 自动重试 | 不提示 |
| 保存失败（重试后仍失败） | Toast + StatusBar 红点 + 入口查看失败日志 | 明确可见 |
| 扩展崩溃 | ExtensionHealth 监控 + 自动禁用 + Toast | 明确可见 |
| 大文档性能不达标 | 自动进入分片模式 | Toast "大文档模式已激活" |
| 非法 Markdown | 轻量自动补全；失败回退原文；不强制纠错 | 不提示 |
| KaTeX 公式错误 | 显示 KaTeX 原生红色；修改后自清 | 明确可见 |
| Mermaid 语法错误 | Stage 面板显示原始错误信息 | 明确可见 |
| 导出失败 | 中断 + 错误详情 + 重试按钮 | 明确可见 |
| Sync 冲突 | 三方合并 UI | 明确可见 |
| 崩溃 | Recovery Mode 引导 | 明确可见 |
| 数据完整性异常 | SafeMode 启动 + 修复建议 | 明确可见 |

---

## §28 变更记录

| 日期 | 版本 | 内容 | 作者 |
|---|---|---|---|
| 2026-04-21 | v2.1.0-draft | 初始化 PRD（§1-§27） | spec-team |

---

（PRD 结束）
