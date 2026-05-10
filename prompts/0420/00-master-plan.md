# InkForge v2.1 — Master Plan（升级版总体规划）

> 文档类型: Master Plan
> 创建日期: 2026-04-21
> 替代: `prompts/0327/00-master-plan.md`（v2.1 起原 0327 Master Plan 降为历史档案）
> 基线: 0327 九份 Spec + 0420 五份问卷（287 题）提取 + 0420 决策合成 Part 1/Part 2/Part 3a/Part 3b
> 设计语言: Ethereal Constructivism（延续并收紧）
> 基调: 严谨性优先、不考虑时间成本、零空壳交付、数据底线"文章不能丢"

---

## 目录

- §1 v2.1 产品哲学（一句话定位 + 三轴）
- §2 20 条铁律（R-01 ~ R-20）
- §3 绝对约束（ABSOLUTE CONSTRAINTS）
- §4 技术栈参考
- §5 v2.1 本轮 Scope
- §6 决策文档体系（Part 1/2/3a/3b）
- §7 Spec 文档体系（规划口径 65 份；当前落盘见 README/specs-index）
- §8 依赖层次与 6 Phase 实施计划
- §9 硬性 SLO 与验收门槛
- §10 风险登记册（高 7 / 中 12 / 低 5）
- §11 现有代码结构索引
- §12 开发流程与验收规范
- §13 文档模板与元数据字段
- §14 快速导航

---

## §1 v2.1 产品哲学（一句话定位 + 三轴）

**InkForge v2.1 是 Markdown-first 的单人深度写作与多渠道出版中枢**
— 以**纸张式安静写作**为气质、以 **Typora 风格所见即所得**为默认编辑范式、以 **Markdown 文本为唯一表达权威**、以**多平台独立渲染链路**为出版契约、以**零空壳与全量审计**为交付底线的**本地优先桌面应用**。

### 1.1 三轴与近远期（L1-01）

- **主轴 = A + D 双核**：单人深度写作（A）+ 多渠道出版（D）
- **次轴 = C**：知识增强（近期；接入骨架 + 垂直切片）
- **远期 = B**：团队协作（评论基础闭环纳入本轮，多人实时协作推后）

### 1.2 目标用户（L1-02）

- 主战场：个人本地用户
- 远期锚点：5–10 人小团队 + 管理员 + 非作者角色（多账户/同步/审计/权限骨架**必须本轮真实落地**）
- 禁止：任何云端强依赖作为必需路径

### 1.3 气质与哲学

- **纸张式安静 + iA Writer 哲学 + Typora 所见即所得**（L1-12 B + L1-39 A + L1-10 B + L1-49 B+C）
- **"默认极简，全开关可打开"**（工具栏简化为默认、重度为可切换；StatusBar 可整体关闭；专注模式保留所有命令入口）
- **功能第一天全部可见**（L1-52 A），不做渐进式发现
- **严禁 emoji、严禁后台表格感、严禁任何偏离 Ethereal Constructivism 设计语汇的"似是而非"组件**（T09-13 D + 补充）

### 1.4 数据底线（X-11 C + 补充）

**文章不能丢**。任何降级路径不得触及正文内容（S-15 补充）。

---

## §2 20 条铁律 R-01 ~ R-20

> 每条铁律都是**可拒绝交付**的硬门槛。PR 若违反任一条，reviewer 必须 block。完整出处与执行细则见 `00-decisions-part1-product-authority.md` §2。

| # | 铁律 | 核心约束 |
|---|---|---|
| **R-01** | Markdown 表达权威唯一 | 所有渲染/预览/导出/发布/AI 输入均从 Markdown 派生；exporter 签名必为 `(markdown)→artifact` |
| **R-02** | 所有元素无损 round-trip | 19 种标准元素 + 全部增强语法（高亮/脚注/details/TOC/Math/Mermaid）在 Typora/Source/Preview/Export 四态无损往返 |
| **R-03** | 零空壳交付 | Spec 中出现的能力必须有真实可运行代码；高风险能力必须自带恢复/校验/错误处理 |
| **R-04** | 纸张式视觉基调冻结 | 视觉/颜色/行距/字体基调冻结；允许重工具栏与动效作为可切换模式；禁 emoji |
| **R-05** | Typora 模式状态全继承 | 模式切换时选区/撤销栈/版本点/评论锚点/滚动位置/折叠状态连续 |
| **R-06** | 版本恢复走 diff/merge + 状态跟随 | "恢复版本"不得直接覆盖；必须双栏选择性恢复；版本包完整还原 |
| **R-07** | 自动保存失败用户可见 + 留日志 | 失败重试一次；不得静默降级；写审计日志；提供失败明细与应急导出入口 |
| **R-08** | Sync 三 Provider 真实落地 | WebDAV / Git / 自有服务 三 Provider 本轮必须可用；Sync Tab 不得出现"即将推出" |
| **R-09** | 冲突解决以用户为主 + 审计留痕 | 默认三方合并但仍需用户确认；所有冲突事件写 activity_logs |
| **R-10** | 账户 = Profile + 多实例并行 | 每账户独立 DB + 文件根；多窗口并行（类 VSCode New Window）；不自动关文档 |
| **R-11** | 引用与溯源三层强制 | 原始事实/模型推断/用户手写三层区分；显示位置可配；导出保留；发布可隐藏 |
| **R-12** | 命令系统四类分离 + 统一注册表 | 编辑/系统/AI/发布四类命令独立 namespace + 独立权限；统一注册表承担权限/审计/回滚/搜索 |
| **R-13** | 平台独立渲染链路 + 不反向污染 | Markdown 源共享；转换管道各自独立；exporter 禁止修改 Markdown 权威与 DB 正文 |
| **R-14** | 公式/Mermaid/代码高亮 三端一致 + 降级规则 | 编辑/预览/导出三态语义与视觉高度一致；每平台定义源码保留/占位/图像回退三档降级 |
| **R-15** | 性能 SLO 硬指标 | 输入 0ms / 保存 ≤1s / 冲突检测 ≤10s / 导出 ≤3min / Lighthouse > 80 |
| **R-16** | 数据底线 — 文章不能丢 | 启动前完整性检查；异常进入安全模式；自动恢复最近快照；降级不得触及正文 |
| **R-17** | 全范围审计 + 3 个月保留 | 安全/编辑生命周期/审阅权限/AI+命令 四类全留痕；保留 3 个月；可导出；用户可查看 |
| **R-18** | 高危操作二次认证 + 自动备份 | 删除/恢复/导入/导出/切账户/批量命令 + 删文章/删账户/敏感设置/全量导出 必须认证或自动备份 |
| **R-19** | 开放扩展 + 沙箱防作恶 | 完整插件 SDK；扩展声明权限 + 沙箱限制；开源；服务于写作 |
| **R-20** | 验收证据机器优先 + 矩阵齐全 | Vitest + Playwright 双层机器测试必须先行；附截图/日志/导出产物/对比样本；覆盖正向/失败/恢复/边界 |

---

## §3 绝对约束（ABSOLUTE CONSTRAINTS）

以下约束在任何改动中都不可违反（继承自 0327 并按 0420 决策收紧）：

1. **不改变编辑器纸张风格** — EditorPanel.vue 的纸张风格、颜色体系（#D32F2F 构成红、#263238 墨色、#37474F 文字色）不可更改（L1-12 B）。
2. **严禁使用 Emoji** — 所有图标使用 `lucide-vue-next` 图标库；零容忍。新增：严禁任何"似是而非"的新视觉风格组件（T09-13 D + 补充）。
3. **禁用 Mock 数据** — 所有功能必须连接真实数据源（Pinia / IndexedDB / Tauri FS / 真实 API）；v2.1 对 0327 的"不 Mock"约束**进一步收紧**为"零空壳"（L1-04 D + R-03）。
4. **不做大重构（但允许大改特定模块）** — 不破坏文件结构、组件层次、Store 模式；但 0420 决策明确**大改**的 6 份 Spec（editor / rendering / toolbar / account / settings / insights）可以做结构级重写。
5. **TypeScript 严格模式** — 所有代码必须通过 `vue-tsc --noEmit`（零错误）。
6. **保持技术栈一致** — Vue 3 Composition API + Pinia + TipTap + Dexie + Tailwind + shadcn-vue + Zod（增补：vue-codemirror、vue-i18n、lighthouse-ci、flexsearch/minisearch、mammoth.js、unovis/frappe-charts、diff-match-patch）。
7. **发布形态只有 Tauri 桌面端** — Web 仅作开发调试（G-06 B + G-12 A）。
8. **禁用 Tauri 原生菜单** — 所有菜单在 Vue 层渲染（S-07 C）。
9. **不做 PDF 导出、不做打印、不做阅读独立模式、不做触控优化、不做 WCAG 专项** — v2.1 明确边界（P-05 A / S-10 A / L1-47 A / T09-12 A / G-09 A）。
10. **Markdown 表达权威是唯一真值来源** — 任何模块不得以 HTML/JSON/平台产物作为 source of truth（R-01）。
11. **数据底线：文章不能丢** — 任何降级路径不得触及正文内容（R-16）。

---

## §4 技术栈参考

| 层 | 技术 | 版本 | v2.1 变更 |
|---|---|---|---|
| 框架 | Vue 3 | ^3.5.13 | — |
| 状态管理 | Pinia | ^2.2.8 | — |
| 编辑器引擎 | TipTap (ProseMirror) | ^2.27.2 | 重构 TyporaMode / MarkdownHints 增强 / 19 元素 NodeView |
| 数据库 | Dexie (IndexedDB) | ^4.0.10 | schema 新增 profiles/tags/templates/export_logs/editor_sessions/article_versions/activity_logs/import_rule_templates 等 |
| CSS | Tailwind CSS | ^3.4.17 | 接入 data-density / data-animation-level 驱动 |
| UI 组件库 | shadcn-vue (reka-ui) | 已安装 | 沿用 |
| 图标 | lucide-vue-next | ^0.468.0 | 沿用；**严禁 emoji** |
| 验证 | Zod | ^4.2.1 | 新增 schema：DocumentVersionBundle / SmartFolder Query / Frontmatter |
| 路由 | vue-router | ^4.6.4 | 新增 `/account`、`/first-run`、`/templates` 等 |
| 代码高亮 | highlight.js 或 shiki | ^3.3.0 | 加载 180+ 语言按需（G-04 C / T04-07 C） |
| Markdown 序列化 | marked + 自研扩展 | ^15.0.12 | 增加增强语法扩展（高亮/脚注/details/TOC/Math/Mermaid/WikiLink/Citation） |
| Markdown Round-trip | 自研 md-serializer | — | **Phase 1 新建** |
| CSS 内联 | juice | ^11.0.0 | 导出链路 |
| 安全 | DOMPurify | ^3.3.1 | 轻量全局兜底（T04-15 A） |
| 桌面端 | Tauri | ^1.6.0 | 升级：多窗口 + fs 监控 + 托盘 + 全局快捷键 + Updater |
| 后端（自有同步） | Hono.js + better-sqlite3 | server/ | Sync Provider 之一（MVP） |
| 认证 | JWT (jose) + bcryptjs | server/ | 本地认证 + Windows Hello 新增 |
| 国际化 | vue-i18n | **新增** | 中英双语（G-08 C） |
| 编辑器源码模式 | vue-codemirror + @codemirror/lang-markdown | **新增** | Source 模式（T01-06 A） |
| 图表库 | unovis 或 frappe-charts | **新增** | 6 个洞察图表（T08-03 C） |
| 全文搜索 | flexsearch 或 minisearch | **新增** | 多对象索引（S-03 / S-12 D） |
| 导入 .docx | mammoth.js | **新增** | 导入向导（S-08 B） |
| 版本 diff | diff-match-patch 或 fast-diff | **新增** | 无限版本 diff 存储（X-07 C） |
| Pangu 空格 | 自研 / pangu.js | **新增** | 中英文自动空格（E-02 D 补充） |
| 拖拽 | vue-draggable-next / @vueuse/integrations | **新增** | FileManager / TabBar / Block（S-02 / E-03 D） |
| Toast | 现有（或升级 vue-sonner） | **升级** | N-06 D 撤销按钮 Toast |
| CI 性能 | lighthouse-ci | **新增** | Performance > 80 硬闸门（X-05 C） |

---

## §5 v2.1 本轮 Scope

### 5.1 硬性基线

- P0 全量完成 + 核心 P1 同轮完成（L1-03 B）；T01 Typora 编辑器 + T04 渲染是最硬门槛。
- 所有进入 scope 的能力零空壳垂直切片 + 高风险能力自带恢复链路（L1-04 D）。
- 所有验收机器测试先行 + 截图/日志/对比样本（X-12 D）。
- 不设工期（X-08 C），以质量和 SLO 作为完成判据。

### 5.2 本轮必须完成的能力清单（按域分类）

| 域 | 核心能力 |
|---|---|
| **A 产品边界** | 零空壳、多 Profile 骨架、资源级权限骨架、全范围审计、C 级防呆、完整插件 SDK |
| **B Markdown 权威** | 双层权威模型、Frontmatter 双写、19 元素 round-trip、非标扩展移植性标记 |
| **C 编辑范式** | Typora/Source/Preview 三模式 + 状态全继承 + Source = vue-codemirror + 19 元素全覆盖 + 表格 pipe 双向 + 图片完整交互 + IME 中文回归 |
| **D 评论审阅** | 行内评论锚点 + 跨版本漂移 + 三态状态机（Comment / Request Changes / Approve） |
| **E 版本历史** | 无限版本 + diff 存储 + DocumentVersionBundle + diff/merge 恢复 + 崩溃恢复 + 灾难恢复 |
| **F 同步冲突** | WebDAV + Git + 自有服务 三 Provider + 三方合并 + 用户确认 + 审计 |
| **G 多账户** | Chrome Profile 级 + 多窗口并行 + Windows Hello 高级认证 + 50+ 账户 + 软删除 7 天 |
| **H 知识增强** | Provider 接口 + 本地/URL 两实现 + 三层来源区分（事实/推断/手写） |
| **I 命令系统** | 统一命令注册表 + 四域 + 权限/审计/回滚/搜索 + CommandPalette + Chord 可视化 + 片段系统 |
| **J 导出发布** | 5 平台独立渲染（微信/小红书/知乎/HTML/Markdown）+ PublishAdapter 协议 + 导出历史 + 剪贴板多格式 |
| **K 权限审计** | 资源级权限 + 全范围审计 + 3 个月保留 + 可导出可查看 |
| **L 性能规模** | 单文档 900K 字符 / 附件 2000+ / 版本 999 / 账户 50+ / 硬 SLO + 能力分级 + 自动降级 |
| **M 扩展 SDK** | 完整 SDK + 沙箱 + 权限声明 + 健康检查 + 安全模式 + 自定义 CSS/JS |
| **N UI 外壳** | Workstation 四栏 + Hub Bento + StatusBar 可关 + TabBar 增强 + FTUE 轻量 + ThemeEngine 双轨 + FontSystem 开源 + Typography |
| **O 文档生命周期** | 6 态 FSM + 回收站 7 天 + 归档冷存储 + Smart Folder + 收藏虚拟分类 |
| **P Tauri 深度集成** | 多窗口 + 跨窗口标签拖拽 + fs 监控 + 冲突检测 + 托盘 + 全局快捷键 + QuickNoteWindow + 仅通知式 Updater |

### 5.3 本轮延后（P2 / v2.2+ 候选）

| # | 能力 | 延后理由 |
|---|---|---|
| 1 | Callout / Admonition | M-01 A 用户明确 v2.2+ |
| 2 | Embed YouTube/CodePen/Tweet | M-07 A 渠道兼容性不可控 |
| 3 | Deep Link（Tauri URL scheme） | EX-09 v2.2 候选 |
| 4 | PDF 导出 | P-05 A / T04-08 C |
| 5 | 打印功能 | S-10 A |
| 6 | Tauri 原生菜单栏 | S-07 C |
| 7 | 触控/手势/移动端 | T09-12 A |
| 8 | WCAG 专项 | G-09 A |
| 9 | 独立阅读模式 | L1-47 A |
| 10 | 多人实时协作 / 责任指派 / 截止时间 | L1-01 B 远期 / L1-16 C |
| 11 | 行内级冲突合并（实装）| L1-21 D + 补充（架构预留但本轮单写者） |
| 12 | 企业级 RBAC/ReBAC 权限模型 | L1-33 C |
| 13 | 审计 > 3 个月 | L1-34 补充（3 个月为硬指标） |
| 14 | 云文档/代码仓/数据库/第三方知识库深度 Provider | L1-25 D 激进范围 → 本轮只骨架 |
| 15 | 完整 AI Provider 接入 | T07-01 A UI 占位 |
| 16 | Tauri 自动更新强推 | L1-56 B 仅通知 |
| 17 | 主题市场 / 主题分享 | ThemeEngine v2.1 只做本地 |
| 18 | 跨账户共享（模板/AI 配置等） | T06-11 A 本轮关闭 |

### 5.4 本轮"骨架而非实装"清单（远期接入）

- 评论多人协作框架、多人并发编辑、责任指派与截止时间
- 行内级冲突合并数据结构（预留，本轮不启用）
- AI Provider（仅 UI 占位 + 四类命令域预留）
- 知识增强云连接器（Provider 接口 + 本地/URL 两实现）
- 跨账户共享通道（T06-11 A 完全关闭，只留 API 骨架）

---

## §6 决策文档体系

> 0420 决策合成产出**4 份决策文档**，是 Phase 3A+3B 所有 Spec 的唯一上游真值来源。

| 文档 | 路径 | 覆盖域 | 产出量 |
|---|---|---|---|
| **Part 1 — 产品与权威** | `00-decisions-part1-product-authority.md` | 产品哲学总纲 + 20 条铁律 + 域 A / B / C / D / E / F / G | 91 决策 + 20 铁律 + 20 冲突裁决 + 14 遗留 |
| **Part 2 — 知识/命令/导出** | `00-decisions-part2-knowledge-command-export.md` | 域 H 知识增强 + 域 I 命令系统 + 域 J 导出发布 + 域 K 权限审计 + 域 L 性能规模 + 域 M 扩展 + 域 N UI 细节 | — |
| **Part 3a — 生命周期/写作/Hub** | `00-decisions-part3a-lifecycle-writing-hub.md` | 域 O 文档生命周期 + 写作辅助 + Hub 布局细化 + 文件管理器 + 命令/快捷键 Task 级 | — |
| **Part 3b — Tauri/视觉/恢复** | `00-decisions-part3b-tauri-visual-recovery.md` | 域 P Tauri 集成 + 视觉系统 + 崩溃/诊断 + 扩展 SDK 细化 | — |
| **Roadmap** | `00-task-roadmap.md` | 基线升级决策 + 新增 Spec 清单 + 依赖图 + 6 Phase + 风险登记 | 68 份文档（规划口径）≈ 30 万字 |

**冲突裁决已由 Part 1/2/3a/3b 收敛完毕**，共 20+ 项（详见 Part 1 §10）；本 Master Plan 及后续 Spec 必须**严格遵从已裁决结论**，不得回溯。

> 注：截至 `2026-04-22`，`prompts/0420` 当前实际已落盘 `63` 份 `specs/*.md`、`9` 份根目录 Markdown 和 `5` 份 `_extracted` Markdown。本文件中的 `65 / 68` 与若干规划期文件名简写属于历史规划口径；当前目录导航与真实文件名请以 `README.md`、`specs-index.md` 和 `specs/00-wave1-current-truth.md` 为准。

---

## §7 Spec 文档体系（规划口径 65 份总览）

### 7.1 基线升级 Spec（9 份，对应 9 PRD）

> 每份基线 Spec 拆分为 `PRD + Spec` 两层。详细升级要点见 `00-task-roadmap.md §2`。
> 本节保留的是规划期命名简写；实际落盘文件名、状态与补充增量请以 `specs-index.md` 的当前清册为准。

| # | 基线 Spec | 升级幅度 | 对应 Task |
|---|---|---|---|
| 01 | 01-spec-editor-typora.md | **大改** | T01 Typora 编辑器 |
| 02 | 02-spec-hub-layout.md | 中等 | T02 Hub 首页 |
| 03 | 03-spec-keybindings.md | 中等 | T03 快捷键 + FindReplace |
| 04 | 04-spec-rendering-core.md | **大改** | T04 渲染引擎（独立出 15-export-publish） |
| 05 | 05-spec-toolbar-contextmenu-slash.md | **大改** | T05 浮动工具栏/右键/斜杠 |
| 06 | 06-spec-account-auth.md | **大改** | T06 本地账户 |
| 07 | 07-spec-settings-tabs.md | **大改** | T07 Settings 全量 |
| 08 | 08-spec-insights-charts.md | **大改** | T08 数据洞察 |
| 09 | 09-spec-ui-polish.md | 中等 | T09 UI 打磨 |

### 7.2 新增 Spec（47 份）

**重量级 20 份**（编号 10~29）：

10 markdown-authority（**本 Phase 3A 产出**） / 11 content-model（**本 Phase 3A 产出**） / 12 file-manager / 13 workstation-layout / 14 statusbar-navigation / 15 export-publish / 16 markdown-extensions / 17 crash-recovery / 18 tauri-desktop / 19 ftue-help / 20 theme-font-typography / 21 focus-writing-assist / 22 command-palette / 23 sync-provider / 24 permission-audit / 25 extension-plugin / 26 multi-account-profile / 27 performance-slo / 28 asset-pipeline / 29 search-engine

> **注**：Roadmap 的 11 条目名 `document-lifecycle-spec` 在本 Master Plan 升级为更广义的 `content-model-spec`，因为本轮决策让 "内容模型" 不仅是 FSM，还包括 Scope 层级、frontmatter schema、分类/标签/收藏/回收站一体化数据模型。文档生命周期 FSM 是 content-model 的核心章节之一。

**中等 27 份**（编号 30~56）：详见 `00-task-roadmap.md §3.2`。

### 7.3 基础字典（3 份）

| 名称 | 用途 |
|---|---|
| `design-language.md` | Ethereal Constructivism 视觉语汇字典，约束所有新组件 |
| `metrics-dictionary.md` | 指标口径字典（字数纯正文、读时、活跃天、会话等） |
| `acceptance-matrix.md` | 全局验收矩阵（Phase 6 产出，正向/失败/恢复/边界） |

### 7.4 文档总览

| 类别 | 份数 | 预计字数 |
|---|---|---|
| PRD | 9 | ~27,000 |
| 基线升级 Spec | 9 | ~72,000 |
| 重量级新 Spec | 20 | ~130,000 |
| 中等新 Spec | 27 | ~67,500 |
| 基础字典 | 3 | ~12,000 |
| **总计** | **68** | **≈ 308,500** |

### 7.5 目录结构

```
prompts/0420/
├── 00-master-plan.md                       ← 本文件（v2.1 入口）
├── 00-task-roadmap.md                      ← 路线图
├── 00-decisions-part1-product-authority.md
├── 00-decisions-part2-knowledge-command-export.md
├── 00-decisions-part3a-lifecycle-writing-hub.md
├── 00-decisions-part3b-tauri-visual-recovery.md
├── _extracted/                              ← 问卷抽取（5 份）
├── prd/                                     ← 9 份 PRD（Phase 3B 起产出）
├── spec/                                    ← 56 份 Spec
│   ├── 10-markdown-authority-spec.md       ← 本 Phase 3A 产出
│   ├── 11-content-model-spec.md            ← 本 Phase 3A 产出
│   └── ...
├── dict/                                    ← 3 份字典
└── artifacts/<task-id>/                     ← 验收证据（Phase 6）
```

---

## §8 依赖层次与 6 Phase 实施计划

### 8.1 依赖层次（自底向上）

```
[Layer 0 — 基础层]
  10-markdown-authority       Markdown 表达权威 + HTML 运行时持久化 双层契约
  11-content-model            文档生命周期 FSM + Scope 层级 + frontmatter schema + 数据模型
  20-theme-font-typography    视觉系统底座
  27-performance-slo          性能闸门
  41-settings-migration       schema 版本化兜底
  design-language.md          视觉字典
  metrics-dictionary.md       指标字典

[Layer 1 — 数据与恢复]
  17-crash-recovery ← 11
  24-permission-audit ← 11
  33-diagnostic-logging ← 27
  31-version-bundle ← 10 / 14

[Layer 2 — 编辑器核心]
  01-editor-ui ← 10 / 27
  04-rendering-core ← 10 / 27 / 16
  16-markdown-extensions ← 10
  49-editor-keymap / 50-smart-punctuation / 51-block-drag-handle / 52-table-ext-v2 / 53-image-ext-v2 / 32-comment-review / 36-wiki-link / 56-citation

[Layer 3 — UI 外壳]
  13-workstation-layout ← 10
  14-statusbar-navigation
  02-hub ← 11 / 12 / 08 / 19
  09-ui-polish ← 20
  03-keyboard / 05-toolbar ← 22 / 25 / 37
  ... 继续扩散

[Layer 4 — 数据业务]
  12-file-manager ← 11
  30-trash-recycle ← 11
  42-templates ← 10 / 11
  47-tag-system ← 12
  29-search-engine ← 11 / 12
  28-asset-pipeline ← 18 / 11
  26-multi-account-profile ← 06 / 24
  08-data-insights ← 11 / 27
  48-session-restore ← 26

[Layer 5 — 系统集成]
  18-tauri-desktop ← 17 / 11
  45-tabbar-enhancement ← 18
  43-drafts-box ← 18 / 42
  55-updater ← 18

[Layer 6 — 同步与导出]
  23-sync-provider ← 10 / 24 / 17
  15-export-publish ← 10 / 16 / 27
  06-account（升级）← 17 / 23 / 24 / 26
  07-settings（升级）← 20 / 23 / 24 / 25 / 41

[Layer 7 — 恢复与诊断（收尾）]
  40-dev-panel / 完整 17-crash-recovery / DataIntegrity Worker
```

### 8.2 6 Phase 实施计划

| Phase | 名称 | 核心交付 | 阻塞下游 |
|---|---|---|---|
| **Phase 1** | 基础设施与权威模型 | 10 / 11 / 20 / 27 / 41 / 33 / 17 骨架 / 24 骨架 + design-language + metrics-dictionary | 全部 |
| **Phase 2** | 编辑器核心三件套 + 渲染权威 | 01 / 04-core / 16 / 49 / 50 / 51 / 52 / 53 / 56 / 36 / 31 / 32 + 19 元素 × 4 模式 round-trip 矩阵 | Phase 3/4/5 |
| **Phase 3** | UI 外壳与工作区 | 13 / 14 / 34 / 35 / 38 / 39 / 02 / 19 / 21 / 45 / 09 / 03 / 22 / 05 / 37 / 25 / 40 / 54 | Phase 4 |
| **Phase 4** | 文件管理、数据与多账户 | 11 实装 / 12 / 30 / 46 / 47 / 42 / 43 / 44 / 28 / 29 / 26 / 06 升级 / 48 / 08 升级 / 18 / 55 | Phase 5 |
| **Phase 5** | 同步、导出与发布 | 23 三 Provider / 15 全平台 / 07 全量 / 32 完整三态 | Phase 6 |
| **Phase 6** | 恢复、诊断、验收证据化与交付 | 17 完整 / 40 完整 / DataIntegrity Worker / 全局 acceptance-matrix | 发布 |

> 各 Phase 验收门槛、交付产物、后续阻塞列表详见 `00-task-roadmap.md §5`。

### 8.3 分支策略（G-02 C）

- 从 `main` 为每个 Task 建 feature 分支（命名 `feat/v21-<task-id>-<brief>`）
- 每 Task 一独立 PR，PR 粒度对齐 Task 粒度
- `dev/visual-fixes` 分支本轮**废弃**，当前未合入代码若有保留价值，作为独立 PR 先行合回 main
- PR 必须满足 §12 的开发流程与验收规范

### 8.4 任务执行顺序（G-01 C）

- **T01 + T02 + T03 三路并行**（通过 feature 分支隔离）
- **T04 必须等 T01 编辑器基础就绪**（T04 依赖 TipTap 扩展与权威模型）
- T05 / T06 / T07 / T08 / T09 按 Phase 3/4/5 推进
- Phase 6 收尾

---

## §9 硬性 SLO 与验收门槛

### 9.1 硬 SLO（R-15）

| 维度 | 指标 | 来源 |
|---|---|---|
| 输入延迟 | 用户感知不到（**≈ 0ms**） | L1-36 C 补充 |
| 保存耗时 | ≤ 1s | L1-36 C 补充 |
| 冲突检测耗时 | ≤ 10s | L1-36 C 补充 |
| 导出耗时 | ≤ 3min | L1-36 C 补充 |
| Lighthouse Performance | > 80 | X-05 C 补充"性能必须极致优化" |

### 9.2 规模硬指标（L1-35 C 补充）

| 维度 | 指标 |
|---|---|
| 单文档字符数 | ≥ 900,000 |
| 单文档附件数 | ≥ 2,000 |
| 单文档版本数 | ≥ 999 |
| 账户数 | ≥ 50 |

### 9.3 验收门槛（R-20 / X-12 D / G-14 D）

- **机器测试先行**：Vitest + Playwright E2E 双层必须先通过
- **证据化**：每 Task 产出 `artifacts/<task-id>/` 目录，包含：
  - 截图（screenshots/）
  - 日志（logs/）
  - 导出样本（exports/）
  - 对比样本（samples/）
  - 正向样本 / 失败样本 / 恢复样本 / 边界样本四类
- **CI 闸门**：`pnpm build` + `vue-tsc --noEmit` + lighthouse-ci 全绿
- **审计验收**：activity_logs 在测试中必须记录预期事件类型

### 9.4 冗余预算投放（G-15 B）

冗余开发优先投放**数据安全线**：
- 保存栈（autosave + beforeunload + Recovery）
- Undo/Redo 栈
- 导出管线
- 回收站 / 草稿箱 / 自动备份

UI 引导/命令系统/帮助系统**不是冗余重点**。

---

## §10 风险登记册

详细缓解措施见 `00-task-roadmap.md §6`。

### 10.1 高风险（必须缓解）

| # | 风险 | 缓解策略 |
|---|---|---|
| H1 | Git 同步与 IndexedDB source of truth 冲突 | 23-sync-provider 首章声明 **IndexedDB 为 primary，Git 为 derived** |
| H2 | Markdown 表达权威 vs HTML 持久化权威 若不落地则全产品崩 | Phase 1 优先冻结 10-markdown-authority 双层契约 |
| H3 | 19 元素 × 4 模式 round-trip 测试组合爆炸 | Phase 2 建 19×4 黄金样本矩阵 + Playwright 回归 |
| H4 | Sync 三 Provider 工期压力与测试复杂度 | Git 主路径优先通过 E2E；WebDAV/自有走 MVP；接口骨架 Phase 4 ready |
| H5 | 多账户 + 多窗口 + 跨窗口标签 + SessionRestore 四者耦合 | 26 / 48 先严格建模；单窗口跑通再并行 |
| H6 | 扩展 SDK 完全开放 + 沙箱的安全 vs 灵活性 | 25 完整权限清单 + R-04 自动禁用 + SafeMode |
| H7 | 安全沙箱 A 级缺乏统一兜底，XSS/注入风险 | 15 每 PublishAdapter 申报安全规则清单 + audit 抽检 |

### 10.2 中风险（需监控）

Lighthouse > 80 与全量图表/180 语言/动画冲突、冲突粒度/冲突解决/审计范围语义歧义、Hero/空状态/图片手势/PDF/自动链接/StatusBar 字段/右栏职责/空状态一致性 等 12 条（已在 Part 1 §10 裁决，本轮 Spec 按裁决落地）。

### 10.3 低风险（知悉）

EX-04 card-recent 认知差、IME 跳字风险、工具栏重度化 vs 安静哲学张力、G-11 权威顺序、L1-28 命令权限未填（按 D 推断）等 5 条。

---

## §11 现有代码结构索引

```
inkforge/src/
  views/
    HubView.vue                首页仪表盘（Phase 3 大改 / 引导版 + 常规版）
    WorkstationView.vue        编辑工作台（Phase 3 大改 / 左栏三 Tab + 右栏模式切换器）
    SettingsView.vue           设置中心（Phase 5 全量 Tab）
    PublishView.vue            发布页（Phase 5 对接 PublishAdapter）
    ThemesView.vue             主题市场（Phase 3 接入 ThemeEngine）
    NotFoundView.vue           404
    AccountWelcome.vue         账户管理页（Phase 4 升级）
    [新增] FirstRunDispatcher.vue     首启分流（Phase 4）
    [新增] TemplatesView.vue          模板系统（Phase 4）
    [新增] Onboarding 废弃，由 HubView 的 guided mode 代替
  components/
    editor/                    TipTap 编辑器组件（Phase 2 大改）
    hub/                       Hub 首页组件（Phase 3 中等升级）
    [新增] comments/           评论系统（Phase 2 骨架 + Phase 5 完整）
    [新增] file-manager/       文件管理器（Phase 4）
    [新增] tags/               标签系统（Phase 4）
    [新增] import/             导入向导（Phase 4）
    [新增] stage/              Stage 面板（Phase 2 Mermaid）
    [新增] dev/                开发者面板（Phase 3 骨架 + Phase 6 完整）
  stores/
    [扩展] articles / settings / editor / stats
    [新增] profiles / templates / tags / sessions / commandStats / versionHistory
  services/
    [新增] markdown-authority/          权威模型（Phase 1）
    [新增] md-serializer/               Round-trip 序列化（Phase 2）
    [新增] content-sync/                Markdown ↔ HTML 双向同步（Phase 1）
    [新增] frontmatter/                 YAML + DB 镜像（Phase 1）
    [新增] version-store/               DocumentVersionBundle（Phase 2）
    [新增] comment-anchor/              漂移算法（Phase 2）
    [新增] sync-providers/{webdav,git,inkforge-server}/
    [新增] exporters/{wechat,zhihu,redbook,html,markdown}/
    [新增] commandRegistry.ts           命令总线（Phase 3）
    [新增] search/                      全文搜索（Phase 4）
    [新增] assets/                      资产管线（Phase 4）
    [新增] auth/{localAuth,platformAuth}/
    [新增] profileStorage/              Profile 隔离
    [新增] metrics-scheduler/           指标分层调度（Phase 4）
    [新增] recovery/                    崩溃恢复（Phase 1 骨架）
    [新增] safe-mode/                   安全模式（Phase 6）
    [新增] logger/                      四层错误 + 审计（Phase 1）
    [新增] migration/                   schema 迁移（Phase 1）
    [新增] permissions/                 资源级权限（Phase 1 骨架）
    [新增] conflict-detect/             冲突检测（Phase 5）
    [新增] conflict-resolve/            冲突解决（Phase 5）
  db/
    [扩展 schema.ts] profiles / templates / tags / article_versions / activity_logs /
                     export_logs / editor_sessions / import_rule_templates / trash_items
  workers/
    [新增] insights-worker.ts           洞察 Web Worker 预计算（Phase 4）
    [新增] integrity-worker.ts          数据完整性校验（Phase 6）
  platform/
    [新增] 统一抽象 Web vs Tauri
  i18n/
    [新增] locales/{zh-CN,en-US}.ts     中英双语（Phase 1）
  styles/
    [扩展] theme/ / focus.css / scrollbar.css / z-index.css
```

---

## §12 开发流程与验收规范

### 12.1 开发流程

1. **开 Task 前**：读对应 Spec（PRD + Spec + 依赖 Spec + 字典）+ Part 1/2/3a/3b 对应决策条目
2. **开分支**：`feat/v21-<task-id>-<brief>`，从 `main` 分出
3. **开发**：严格按 Spec；遇到 Spec 缺漏**不得自行决策**，必须回合议
4. **阶段性自测**：Vitest 单测 + Playwright E2E + `vue-tsc --noEmit` + `pnpm build`
5. **冗余校验**：保存/恢复/回滚/导出 四路径至少各加一道兜底（G-15 B）
6. **证据化**：在 `artifacts/<task-id>/` 下留正向/失败/恢复/边界样本
7. **提 PR**：PR 描述必须附：
   - 对应 Spec 编号
   - 对应铁律遵循情况
   - 验收矩阵对照表
   - `artifacts/` 链接
   - Lighthouse CI 分数对比

### 12.2 验收规范（R-20 / X-12 D）

- **机器测试先行**：任何 PR 未通过机器测试一律不 review
- **四类样本齐全**：正向 / 失败 / 恢复 / 边界
- **SLO 对齐**：每 Task 验收必含性能测试（输入延迟 / 保存 / 冲突 / 导出）
- **审计日志**：对应 event kind 在测试中出现即 pass

### 12.3 Spec 漂移约束

- 所有 Spec 条目必须标注**权威来源**（文档 / 原型 / 代码 / 混合）
- 开发过程中发现 Spec 与代码不符，**必须先改 Spec**（如 Spec 错）或先改代码（如代码错），不得让两者漂移
- 若需要偏离已裁决决策（Part 1 §10 的 20 条冲突裁决），必须走合议流程

---

## §13 文档模板与元数据字段

每份 PRD / Spec 开头必须包含以下字段（可被工具脚本扫描）：

```markdown
# <编号> - <标题>

> 文档类型: PRD | Spec | Dict
> 阶段: Phase N
> 依赖: <依赖 Spec 编号列表>
> 来源决策: <Part 1 / Part 2 / Part 3a / Part 3b 对应条目>
> 来源问卷题号: <L1-XX, TNN-XX, ...>
> 权威来源: 本 Spec 各条目在"权威来源表"章节逐条标记
> 创建日期: 2026-04-21
> 最后更新: —
> 铁律遵循: R-01, R-02, ...（列出本 Spec 强相关的铁律）

## 一、背景与目标
## 二、范围与边界（进 / 不进 / 延后）
## 三、详细规范
...
## N-1、验收矩阵（正向 / 失败 / 恢复 / 边界）
## N、权威来源登记表
```

---

## §14 快速导航

### 14.1 新成员入门路径

1. 读本 **Master Plan**（你正在读）
2. 读 **`00-decisions-part1-product-authority.md`** §1 + §2 + §10（产品哲学 + 20 铁律 + 冲突裁决）
3. 读 **`00-task-roadmap.md`** §1 + §5（v2.1 Scope + 6 Phase）
4. 按对应 Phase 读具体 Spec

### 14.2 开发者按 Phase 入口

| Phase | 入口 Spec |
|---|---|
| Phase 1 | 10-markdown-authority / 11-content-model / 20-theme-font-typography / 27-performance-slo |
| Phase 2 | 01-spec-editor-typora / 04-spec-rendering-core / 16-markdown-extensions |
| Phase 3 | 13-workstation-layout / 14-statusbar-navigation / 02-spec-hub-layout / 03-spec-keybindings |
| Phase 4 | 11-content-model / 12-file-manager / 26-multi-account-profile / 18-tauri-desktop |
| Phase 5 | 23-sync-provider / 15-export-publish / 07-spec-settings-tabs |
| Phase 6 | 17-crash-recovery / 40-dev-panel / acceptance-matrix |

### 14.3 各域决策入口

| 域 | 决策文档 | 主要 Spec |
|---|---|---|
| A 产品边界 | Part 1 §3 | 00-master-plan（本文）、design-language |
| B Markdown 权威 | Part 1 §4 | **10-markdown-authority** |
| C 编辑范式 | Part 1 §5 | 01-spec-editor-typora / 49 / 50 / 51 / 52 / 53 |
| D 评论审阅 | Part 1 §6 | 32-comment-review |
| E 版本历史 | Part 1 §7 | 31-version-bundle / 17-crash-recovery |
| F 同步冲突 | Part 1 §8 | 23-sync-provider |
| G 多账户 | Part 1 §9 | 26-multi-account-profile / 06-spec-account-auth |
| H 知识增强 | Part 2 | 16-markdown-extensions / 56-citation |
| I 命令系统 | Part 2 | 22-command-palette / 05-spec-toolbar / 25-extension-plugin / 37-snippet-system |
| J 导出发布 | Part 2 | 15-export-publish / 04-spec-rendering-core |
| K 权限审计 | Part 2 | 24-permission-audit / 33-diagnostic-logging |
| L 性能规模 | Part 2 | 27-performance-slo |
| M 扩展 SDK | Part 2 | 25-extension-plugin / 54-custom-css |
| N UI 外壳 | Part 2 + Part 3b | 13-workstation-layout / 14-statusbar-navigation / 09-spec-ui-polish |
| O 生命周期 | Part 3a | **11-content-model** / 12-file-manager / 30-trash-recycle / 42-templates |
| P Tauri 集成 | Part 3b | 18-tauri-desktop / 45-tabbar-enhancement / 55-updater |

---

## 完

**本 Master Plan 是 v2.1 的根入口文档**，所有工程师、Spec 编写者、代码 reviewer 在开始任何工作前都必须先读本文件并理解 20 条铁律与 §3 绝对约束。

任何 Spec 与本 Master Plan 冲突时，**以 Part 1/2/3a/3b 决策文档为最终权威**；Master Plan 由决策文档派生。
