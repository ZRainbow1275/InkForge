# App-Mode Visual & Interaction Overhaul (Hub + Workstation)

> 创建日期: 2026-05-06
> 决策权威源: `prompts/0506/` 全卷（862 行 / 6 文件 / 214 题）
> 当前分支: `dev/visual-fixes`
> 任务目录: `.trellis/tasks/05-06-app-visual-overhaul/`

---

## 0. Goal

将 InkForge 从"网页感的开发态"打磨为符合 0506 全卷答案的 **Tauri 桌面 APP**。本轮聚焦三个面：
1. **运行定位**：仅 Tauri，Web 仅供开发调试（G-06、G-12）
2. **视觉一致性 D 级**：拒绝"开发注释前端化"、拒绝突兀风格、拒绝后台表格感（T09-13）
3. **桌面 APP 操作语言**：Hub 版式滑动 + 阻尼、工作台磁吸式检查器、编辑器 Typora 式混合 + 简洁状态（L1-10、L1-12、L1-46、N-01）

---

## 1. 0506 决策映射总览（先把"为什么"写清楚）

| 决策出处 | 一句话条款 | 本任务相关条目 |
|---------|----------|--------------|
| **G-06 / G-12** | Tauri 是发布态，Web 只方便开发 | 全局 G-3 |
| **L1-50 / L1-52** | 我讨厌引导；所有功能第一天可见 | 全局 G-2（删除"开发注释"前端化文案） |
| **L1-51** | 帮助系统 = Markdown 速查卡 + 上下文气泡 | 全局 G-4（帮助 ?  按钮迁离右下角） |
| **T09-13** | 任何突兀的东西（例如 emoji）会让我极其反感 | 全局 G-2 / Hub V3 H3.2 |
| **T09-10** | Hub 宽松 / Workstation 中等 / Settings 紧凑；不可像后台表格 | Hub 留白与拉伸 H1.4、H4.1 |
| **T02-01** | Hero 卡片在 WritingFlowCard 基础上改善 | Hub V1 H1.1 / H1.3 |
| **T02-09** | 保持 scroll-snap | Hub 版式滑动 H0.1 |
| **T02-10** | 保持当前 SectionNav | Hub 版式指示 H0.2 |
| **T02-11** | QuickActionFab = 新建 + 模板 + 导入 | 全局 G-4（FAB 独占右下） |
| **T06-07** | Hub 头像点击 = 账户名/管理/设置/退出 气泡菜单 | Hub V1 H1.2 |
| **T06-02 / T06-03** | AccountWelcome 通过 Hub 头像进入；上传走裁剪对话框 | Hub V1 H1.2 |
| **T08-01 / T08-04** | 6 个新图表全部上；Hover Tooltip + 点击跳转 | Hub V1 H1.1（柱状弹卡）/ Hub V3 |
| **L1-45** | 写作目标必须在 Hub 洞察中体现；目标完成有动画奖励 | Hub V1 / V3 |
| **L1-43** | 收藏/置顶 = 自定义"快速访问"列表，可排序可分组 | Workstation W3（盯上栏） |
| **L1-41** | 文档 6 态生命周期；状态显示在 Hub 卡片 + 文件管理器 | Hub V4 卡片 |
| **L1-12** | 工具栏可重可简；动效欢迎 | Workstation W1（红尾移除）/ W7 |
| **L1-46** | 专注模式：仅显示变少，仍允许快捷键/斜杠/保存 | Workstation W5（检查器磁吸） |
| **L1-58 / L1-60 / T01-11** | 完整主题编辑器；纸张宽度 Settings + Ctrl+= + StatusBar 显示 | Workstation W4 / W8（迁入检查器） |
| **N-01** | StatusBar 完整信息架构 + 必须可关闭 | Workstation W9 |
| **W-01** | 右栏仅预览；左侧已配置版本历史 + 加文档属性 | Workstation W4 / W8 |
| **W-03** | 不同编辑模式有不同布局记忆 | Workstation W5 / W6 / W7 |
| **L1-10 / T01-18** | Typora 式默认；光标移入即编辑，移出即渲染 | Workstation W7 |
| **T01-13** | 模式切换 = 过渡 + Toast | Workstation W6 |
| **T09-02 / T09-03** | 页面切换 fade+slide / 面板折叠 250ms transition | Hub H0.1 / Workstation 全部动画 |
| **T09-09** | 动画系统按设备性能自动降级 | 全局动画策略 |

> 凡未在本任务覆盖的 0506 决策（暗色模式 T09-01、字体 L1-57、文档生命周期 L1-41 完整实现等）显式列入"Out of Scope"。

---

## 2. 详细需求（每条带 0506 决策出处 + 完整解决方案 + 涉及代码）

### G — 全局（Global）

#### G-1 弹性 max-width [P0]
- **0506 决策**：T09-10（Hub 宽松，不可像后台表格）；L1-12（动效欢迎）
- **现状**：HubView.vue 7 处 `max-width: 1400px; margin: 0 auto`（行 2457、2766、2776、2832、4335、4486、4613）；宽屏 >1700px 单侧空白 >300px
- **方案**：替换为 `max-width: min(1680px, calc(100vw - 96px))`；窄屏（<1400）原样，宽屏自然撑开
- **涉及文件**：`inkforge/src/views/HubView.vue` 7 处 + `WorkstationView.vue` 同类规则审查
- **验收**：1366 / 1440 / 1920 / 2560 视口下，单侧空白 ≤96px

#### G-2 文案净化（"开发注释前端化") [P0]
- **0506 决策**：T09-13（拒绝突兀）；L1-50（讨厌引导）；L1-52（功能第一天可见，无需"为什么这么设计"的解释）
- **现状**：HubView 含以下"开发注释式"文案：
  - 行 1323：「减少重复入口，保留真实创建链路。模板创建、文档导入与素材积累都可以从这里接续。」
  - 行 1830：「第二屏直接挑模板，进入工作站不再绕路。」
  - 行 1838：「这里直接复用现有模板创建真链路。点击模板后会写入草稿并跳转工作站，不新增任何空壳入口。」
  - 行 1893：「真实创建链路、当前进度和工具信号在这里聚合。」
  - 行 1898：「保持空白 / 模板 / 导入三入口，不再复制第四条路径。这里展示的所有动作都已经在 Hub 内跑通。」
  - 行 2026 ARIA：「创作工具信号」
- **方案**：建立 deny-list（写到 `research/deny-list.md`），全局 grep 扫描 + 逐句替换为产品文案 OR 直接删除：
  - 「模板、导入与素材在这里开始汇合」(行 1832 标题保留)，删除下方"减少重复入口..."解释段
  - 删除 1830 / 1893 副标题（保留主标）
  - 「真实快速操作」→「快速操作」；「创作工具信号」→「创作动态」
- **涉及文件**：`HubView.vue`、`AccountWelcome.vue`、`App.vue`、若干小组件
- **验收**：`grep -rE "(真实创建链路|不再绕路|不新增任何空壳|这里展示的所有动作都已经在 Hub|不再复制第四条路径|开发链路)" inkforge/src` 返回 0 行

#### G-3 APP 取向标注 [P1]
- **0506 决策**：G-06（主要 Tauri）；G-12（Tauri 发布态）；S-07（不需要 Tauri 原生菜单栏，纯 Web UI）
- **现状**：UI 层未对"Web 调试态"与"Tauri 发布态"差异做任何标记；Web 路径有 onboarding/弹窗（截图首页那个）
- **方案**：
  - 在 README.md 顶部明确"Tauri 唯一交付目标，Web 仅供开发"
  - 不在 UI 中区分模式（用户讨厌引导）
  - 保留欢迎弹窗（L1-50 同意"轻量欢迎"），但改为可一键永久关闭，且默认逻辑中**不再首启自动弹**（L1-50 反对引导）
- **涉及文件**：`README.md`、`AccountWelcome.vue`、`OnboardingModal.vue` 或同等组件
- **验收**：刷新页面无引导弹窗（除非用户从设置主动打开）

#### G-4 右下角 FAB ⨯ 帮助按钮位置冲突 [P0]
- **0506 决策**：T02-11（FAB = 新建 + 模板 + 导入，保留）；L1-51（帮助 = Markdown 速查卡 + 上下文气泡）；EX-03（命令面板 v2.1）
- **现状**：`App.vue:391` 全局帮助按钮 box=1374,834 与 `HubView.vue:2371` `quick-action-fab` box=1372,832 完全重叠
- **方案**：
  - **保留** Hub 右下 FAB（QuickActionFab）
  - **移除** App.vue 全局右下角帮助按钮
  - 帮助入口改为：① Hub Header 工具栏增加「?」icon-btn（与设置同行）；② 编辑器内 Ctrl+? / Ctrl+/ 触发上下文气泡
  - HelpCenter 组件本身保留（L1-51 要求）
- **涉及文件**：`App.vue`（删除 ~391 按钮）、`HubView.vue`（Header 加 help icon-btn）、`WorkstationView.vue`（绑定 Ctrl+/）
- **验收**：右下角任一时刻只有一个浮动按钮（FAB）

---

### H — Hub 首页

#### H0.1 版式 snap + 阻尼 [P0]
- **0506 决策**：T02-09（保持 scroll-snap）；T09-02（fade + slide）；L1-12（动效欢迎）；T09-09（按性能降级）
- **现状**：HubView 已用 `<region>` 多版块结构（截图 snapshot 看到 region e182、e368 等），但无 snap，滚动是连续线性
- **方案**：
  - 在 `.hub-page` 容器加 `scroll-snap-type: y mandatory; overflow-y: auto;`
  - 每个 region 加 `scroll-snap-align: start; scroll-snap-stop: always; min-height: 100vh;`
  - 阻尼用 CSS `scroll-behavior: smooth` + JS 拦截 wheel 事件加缓动（cubic-bezier(0.16, 1, 0.3, 1) 600ms）
  - 用 IntersectionObserver 触发版面进入动画（fade + translateY 24px → 0）
  - `prefers-reduced-motion: reduce` 时降级为瞬时切换（T09-09）
- **涉及文件**：`HubView.vue`（容器 CSS + composable 新建 `useScrollSnap.ts`）
- **验收**：滚轮一次操作切换 1 个版面；阻尼曲线明显；Reduced Motion 下无动画

#### H0.2 版式指示 [P1]
- **0506 决策**：T02-10（保持 SectionNav）
- **方案**：右侧固定 4 个圆点指示器（"创作流 / 模板 / 洞察 / 文章"），点击直接跳转对应版；当前版高亮
- **涉及文件**：`HubView.vue` 新增 `SectionDots` 子结构
- **验收**：可视、可点击、当前版高亮联动

#### H1 — 第一版（创作流 + 头像 + 完整可见 + 留白）

##### H1.1 创作流柱状图弹卡 [P0]
- **0506 决策**：T02-01（在 WritingFlowCard 改善）；T08-04（Hover Tooltip + 点击跳转）；L1-45（目标在 Hub 洞察体现）
- **现状**：HubView 创作流 hero 卡的 7 根柱状图下显示 0/1 数字（截图 5），点击无反应
- **方案**：
  - 移除柱状下方数字 label
  - 柱状图改为：hover → tooltip 显示「周X · N 篇」；click → 弹出**当日文章列表卡片**（覆盖在 hero 上层 popup，含文章标题 + 时间 + 字数 + 状态徽章）
  - 弹卡支持 ESC 关闭、点击背景关闭
  - 数据源：基于现有 articleStore 按 createdAt/updatedAt 过滤当日
- **涉及文件**：`HubView.vue`（hero 卡 template + script）、新增 `WritingFlowDayPopup.vue`
- **验收**：点击任一柱状条 → 出现卡片显示当日文章；空日显示"今日尚无创作"文案

##### H1.2 头像设计 [P0]
- **0506 决策**：T06-07（Hub 头像点击 = 气泡菜单：账户名/管理/设置/退出）；T06-03（上传走裁剪对话框）；T06-02（AccountWelcome 通过 Hub 头像进入）
- **现状**：右上角红色方块"本"图标（截图 6），丑且非头像样式
- **方案**：
  - 头像组件：圆形 40×40（Header 内）or 48×48（更大版本，用户要求"较大"），显示用户头像图片或 fallback 字母
  - 点击 → 浮出气泡菜单（Popover）：
    ```
    [头像图]
    ZRainbow1275
    本地账户
    ─────────
    账户管理 →
    设置 →
    切换账户 →
    退出
    ```
  - 气泡用 `position: absolute` + 12px 圆角 + shadow + 进入动画 fade+scale(0.95→1)
  - 头像无图时 fallback：使用账户首字母 + 算法生成色（基于账户 id hash 的稳定色）
- **涉及文件**：`HubView.vue` Header；新增 `UserAvatarPopover.vue`
- **验收**：圆形头像可见；点击弹出气泡；菜单项可跳转

##### H1.3 一版完整可见 [P0]
- **0506 决策**：T02-08（4→3→2→1 列响应）；T02-03（auto 高度）；T09-10（Hub 宽松，不像表格）
- **现状**：截图 7 第一版被截断，需要滚动才能看到底部
- **方案**：
  - 第一版整体高度限制为 `100vh - 64px`（去掉 Header 与底部 hint）
  - bento grid 内部 row 数固定为 3（hero + 中列 + 右列），不允许溢出
  - hero 占 2 行，stats 占 2 行（中列上下），inspiration 占 1 行
  - 字号与 padding 视高度自适应（用 clamp）
- **涉及文件**：`HubView.vue` `.bento-container` + 各 card
- **验收**：1080p 高度（900px viewport）下首屏完整可见无截断

##### H1.4 留白与拉伸重排 [P0]
- **0506 决策**：T09-10（Hub 宽松）；T09-13（拒绝突兀）
- **现状**：截图 9 大块空白；截图 10 卡片被异常拉伸
- **方案**：
  - 重新分配 grid 比例：`grid-template-columns: 1.4fr 0.7fr 1fr`（hero / stats / tools）
  - stats 卡（数字 1 / 0 / 0%）改为水平分布而非纵向，节省垂直空间
  - 各 card 设 `min-height` 不设 `height: 100%`，避免拉伸
- **验收**：无 >120px 真空白区域（背景色 + 无内容）；卡片高度由内容决定

#### H2 — 第二版（模板市场）

##### H2.1 模板市场重排 [P0]
- **0506 决策**：T02-02（创作工具区 = 模板 + 草稿 + 素材入口）；S-01（v2.1 模板系统）；F-04（一文件夹一项目，素材关联追踪）
- **现状**：截图 11 左侧模板市场组件错配
- **方案**：
  - 顶部分类胶囊条（横向 chip group）：「全部 / 文章 / 笔记 / 摘要 / 周报 / 自定义」
  - 下方模板卡 grid（3 列宽屏 / 2 列中屏 / 1 列窄屏）
  - 每张模板卡：120px 高封面（颜色块或缩略图）+ 标题 + 用途简述（≤24 字）+ "使用模板"按钮
  - 第一行第一张固定为「+ 新建模板」CTA
- **涉及文件**：`HubView.vue` 第二版 region；新增/重构 `TemplateMarketGrid.vue`
- **验收**：截图 11 错配现象消失；分类切换无重排闪烁

##### H2.2 文案净化 [P0]
- **0506 决策**：T09-13（拒绝突兀）；L1-52（功能第一天可见）
- **方案**：删除第二版所有"为什么这么设计"的解释段（行 1830/1838/1893/1898）；保留主标题 + 必要操作 label
- **验收**：第二版可见文案 ≤ 5 条短句

#### H3 — 第三版（图表）

##### H3.1 注释清除 [P1]
- **0506 决策**：T08-01（6 个图表全上）；T09-13（拒绝突兀）
- **现状**：截图 12 图表设计本身被用户认可，仅左上角有多余开发注释
- **方案**：保留图表布局，删除左上角"数据洞察的设计目的"类装饰文字；保留每图表自身标题（必要的最小信息）
- **验收**：第三版无任何"开发解释"语；只有图表标题 + 数据 + 图例

##### H3.2 标签云中文化 [P0]
- **0506 决策**：S-14（标签和分类职责区分）；S-12（标签 + 分类）；L1-06（微信公众号、小红书 = 中文产品）
- **现状**：截图 13 标签云显示英文
- **方案**：
  - 标签云数据源切换为真实 `tagStore` / `categoryStore` 中文标签
  - 若用户尚无标签：fallback 为占位中文样例（"草稿 / 已发布 / 灵感 / 笔记 / 待整理"）而非英文
  - 字号映射真实词频（log scale），最大 28px / 最小 12px
- **涉及文件**：`HubView.vue` 第三版图表区；标签云子组件
- **验收**：第三版无任何英文标签词

#### H4 — 第四版（瀑布流）

##### H4.1 真瀑布流单独成版 [P0]
- **0506 决策**：T02-08（4→3→2→1 响应）；F-08（列表+卡片+看板）；H0.1 版式分隔
- **现状**：当前是简单卡片网格混在 Hub 后段，不是瀑布
- **方案**：
  - 第四版独占 100vh
  - CSS columns 布局：`columns: 4 280px; column-gap: 24px;`（>1400 4 列；1100-1400 3 列；800-1100 2 列；<800 1 列）
  - 每张文章卡 `break-inside: avoid; margin-bottom: 24px;`
  - 上方有过滤栏（保留现有 .filter-bar：全部/本周/分类）
  - 底部"加载更多" / 无限滚动
- **涉及文件**：`HubView.vue` 第四版 region + `.waterfall-grid` CSS（行 2832 已有 columns: 3 280px 基础，扩展即可）
- **验收**：宽屏 4 列；卡片高度自然不规则；视觉上明显是瀑布

##### H4.2 文章卡含封面 + 渲染预览 [P0]
- **0506 决策**：L1-30（Markdown 权威）；L1-41（状态显示在卡片）；F-06（弹出面板：摘要/封面/字数/状态）
- **现状**：当前文章卡只有标题 + 摘要 + 字数（截图末尾）
- **方案**：
  - 卡片结构（自上而下）：
    1. 封面图区（160px 高）：优先 frontmatter.cover；次选正文首图；最后用主题色块 + 文章名首字
    2. 状态徽章（绝对定位左上角）：文档生命周期 6 态（草稿/写作中/待审阅/待发布/已发布/归档）
    3. 标题（h3，2 行截断）
    4. 摘要（3 行截断）
    5. Footer：字数 + 更新时间 + 标签前 2 个
  - 卡片 hover 微缩放 + shadow 加深（已有，保留）
- **涉及文件**：`HubView.vue` 第四版 article-card；`utils/extractCover.ts` 新增（提取首图）
- **验收**：每张卡有封面位（不为空）；状态徽章可见；标签可见

---

### W — 工作台 Workstation

#### W1 红色尾巴移除 [P0]
- **0506 决策**：T09-13（拒绝突兀）；L1-12（纸张体验冻结项可由用户选）
- **现状**：截图 14 编辑器右侧/底部有红色装饰条
- **方案**：grep 定位 `border-right: ... red` / 红色装饰元素（构成主义 #D32F2F 滥用），移除装饰；保留品牌红仅用于 logo / focus ring / 关键 CTA
- **涉及文件**：`WorkstationView.vue`、`EditorPanel.vue`、可能涉及 `MarkdownEditor.vue`
- **验收**：编辑区视觉上无红色装饰条

#### W2 左侧功能栏动画 + 搜索框放大 [P0]
- **0506 决策**：T09-03（折叠 250ms transition）；W-03（布局记忆）；S-03（v2.1 实现全文搜索）；T03-01（FindReplace 正则+大小写+全词+计数）
- **现状**：截图 15 左栏死板，搜索框输入时不能看到完整内容
- **方案**：
  - 左栏（manager 面板）每个 item hover 微缩放（scale 1.02）+ 颜色过渡 200ms
  - 折叠/展开 250ms cubic-bezier(0.4, 0, 0.2, 1)
  - 搜索框 focus 时：宽度 300px → 480px 平滑放大；blur 后回缩；放大期间结果列表覆盖在主视图上层（不挤压布局）
- **涉及文件**：`WorkstationView.vue` manager 面板、搜索组件
- **验收**：动画顺滑无卡顿；搜索框 focus 后输入长查询完整可见

#### W3 盯上的项目栏重做 [P0]
- **0506 决策**：L1-43（自定义快速访问列表，可排序可分组）；T09-06（自定义滚动条 6px hover 8px）
- **现状**：截图 16 上下滑动条多余、风格丑
- **方案**：
  - 移除多余滚动条（用 CSS `overflow: hidden` + 使用面板自身高度）
  - 列表风格统一：每项 36px 高、标题 + 状态点 + 时间右对齐
  - 拖拽排序（参 S-02：v2.1 实现拖拽排序）
  - 分组功能：长按/右键 → 添加到分组；分组用 `<details>` 折叠
- **涉及文件**：`WorkstationView.vue` 盯上栏区
- **验收**：盯上列表无内嵌滚动条；项可拖拽排序

#### W4 排版预设迁入检查器 + 仅保留 1 个 [P0]
- **0506 决策**：W-01（右栏仅预览；左侧已配置版本历史 + 加文档属性）；W-03（不同编辑模式有不同布局记忆）；T01-11（纸张宽度 = Settings + Ctrl+= + StatusBar）
- **现状**：截图 17、18 排版预设有多处入口
- **方案**：
  - 工作台主面板顶栏移除排版预设按钮
  - 检查器（Inspector）新增「排版」面板段（Tab 或折叠组）
  - 排版段含：纸张宽度（窄/中/宽 三档）+ 行距 + 字体大小 + 主题（继承 L1-58 主题完整可编辑的精简版）
  - 现有 `WORKSTATION_LAYOUT_PRESETS` (typora / source / preview) 保留作为 layout 切换，与"排版"区分（layout 是面板布局，排版是纸张样式）
- **涉及文件**：`WorkstationView.vue` Inspector 面板；移除主栏入口
- **验收**：grep 工作台主栏不再含 layout-preset 按钮；Inspector 内有排版段

#### W5 检查器磁吸（默认收 + 右边缘呼出） [P0]
- **0506 决策**：W-03（布局记忆）；L1-46（专注模式仅显示变少）；L1-12（工具栏可重可简）
- **现状**：检查器固定显示，占据右侧空间
- **方案**：
  - 新建 composable `useEdgeMagnetism.ts`：监听 `window.mousemove`，当 `e.clientX > window.innerWidth - 48` 持续 200ms → 触发呼出
  - 检查器默认 collapsed=true（覆盖 `WORKSTATION_PANEL_DEFAULTS.inspectorCollapsed = true`）
  - 鼠标离开检查器区域 + 鼠标 X < window.innerWidth - 480 持续 600ms → 自动收起
  - 用户主动点击「钉住」可禁用磁吸（保留显式手动控制）
  - 审阅模式开启时强制保持收起（防止干扰）
- **涉及文件**：`WorkstationView.vue` Inspector + 新建 `composables/useEdgeMagnetism.ts`
- **验收**：默认无右栏；右移鼠标呼出；左移自动收

#### W6 源码模式重设计 [P0]
- **0506 决策**：T01-06（vue-codemirror）；T01-13（过渡 + Toast 通知模式切换）；L1-10（Typora 默认）
- **现状**：截图 19 源码模式两个框分别说明用途，冗余啰嗦
- **方案**：
  - 单一编辑器视图（CodeMirror 6 直接显示原生 Markdown）
  - 不再有"两个框"
  - 模式切换走 Toast：`Toast: "已切换到源码模式 · Ctrl+\\ 切回 Typora"`
  - 顶部状态栏角落微提示（"源码"小标签）
- **涉及文件**：`EditorPanel.vue`（源码模式 template）、`MarkdownEditor.vue`
- **验收**：源码模式只有一个编辑框；切换有 Toast

#### W7 所见即所得视觉重设 [P0]
- **0506 决策**：L1-10（Typora 式）；T01-18（光标移入即编辑，移出即渲染）；L1-12（纸张式体验）
- **现状**：截图 20 当前样式被用户判为"蠢"（具体原因：可能是带框/带标签等"网页表单"风）
- **方案**：
  - 默认 Typora 模式 = 整篇纸张感，无框、无说明 label、无 mode toggle UI
  - 模式状态仅在 StatusBar 角落显示
  - 切换走 Ctrl+\ 快捷键 + Toast，无 UI 按钮
  - 纸张背景色 #FAFBFC（rice paper）+ 文字色 #263238 + 行高 1.7
- **涉及文件**：`EditorPanel.vue`、`MarkdownEditor.vue` CSS
- **验收**：进入工作台无可见模式标签；编辑区是干净纸张

#### W8 版心 + 设置迁入检查器 [P0]
- **0506 决策**：T01-11（纸张宽度切换 = Settings + Ctrl+=）；W-01（右栏仅预览，文档属性入栏）
- **现状**：截图 21 版心调整在主栏外露
- **方案**：版心调整放到 W4 的"排版"面板段内（与纸张宽度 / 字号一起）；快捷键 Ctrl+= 仍可用
- **涉及文件**：`WorkstationView.vue` 主栏移除 / Inspector 增设
- **验收**：主栏无版心调整入口；Inspector 排版段内可调

#### W9 状态指示精简 [P0]
- **0506 决策**：N-01（StatusBar 完整：模式+字数+行列+保存+阅读时长+纸张+目标；必须可关闭）；E-07（StatusBar 状态 + TabBar 标记 + 错误指示）
- **现状**：截图 22 顶部有多个状态指示重复
- **方案**：
  - 顶部左上角仅保留「已同步 · 已保存」单一组合状态：
    - 同步未完成 → "同步中…"（金色圆点）
    - 同步成功 + 内容变更 → "未保存"（橙色）
    - 同步成功 + 无变更 → "已保存"（灰色对勾）
  - 移除其他冗余状态指示
  - 详细信息（字数 / 模式 / 行列 / 阅读时长）下沉到底部 StatusBar（N-01）
  - StatusBar 在 Settings > Workstation 加可关闭开关（N-01 必须可关闭）
- **涉及文件**：`WorkstationView.vue` Header；`EditorStatusBar.vue`
- **验收**：顶部状态指示数 ≤ 1 组；底部 StatusBar 信息完整且可关

---

## 3. Acceptance Criteria（按 G/H/W 分组，每条可独立验证）

### 全局
- [ ] **AC-G1.1** Playwright 在 1366/1440/1920/2560 视口截图，主内容容器单侧空白 ≤ 96px
- [ ] **AC-G2.1** `grep -rE "(真实创建链路|不再绕路|不新增任何空壳|这里展示的所有动作都已经在 Hub|不再复制第四条路径|开发链路|创作工具信号|真实快速操作)" inkforge/src` 输出 0 行
- [ ] **AC-G3.1** README 顶部包含 "Tauri 唯一交付目标 / Web 仅供开发" 字样
- [ ] **AC-G3.2** 默认刷新无引导弹窗
- [ ] **AC-G4.1** 同一时刻右下角 ≤ 1 个浮动按钮（FAB）
- [ ] **AC-G4.2** Hub Header 工具栏存在帮助 icon-btn

### Hub
- [ ] **AC-H0.1** 滚轮一次操作 → 切换 1 个版面（不连续滚）
- [ ] **AC-H0.2** 阻尼时长 500-800ms；reduced-motion 下无动画
- [ ] **AC-H0.3** 版式指示圆点随当前版面联动
- [ ] **AC-H1.1** 柱状条点击 → 弹出当日文章列表卡片
- [ ] **AC-H1.2** 头像为圆形；点击弹出气泡菜单（账户名/管理/设置/退出）
- [ ] **AC-H1.3** 1080p 高度第一版完整无截断
- [ ] **AC-H1.4** 第一版无 >120px 真空白
- [ ] **AC-H2.1** 第二版顶部分类胶囊条 + 模板卡 grid 排布正确
- [ ] **AC-H2.2** 第二版可见文案 ≤ 5 条短句（无解释段）
- [ ] **AC-H3.1** 第三版无开发解释语
- [ ] **AC-H3.2** 第三版标签云 100% 中文
- [ ] **AC-H4.1** 第四版独占 100vh；CSS columns 4 列瀑布流
- [ ] **AC-H4.2** 每张文章卡有封面位 + 状态徽章 + 标题 + 摘要 + footer

### Workstation
- [ ] **AC-W1** 编辑区无红色装饰条
- [ ] **AC-W2.1** 左栏 hover 有缩放/颜色过渡动画
- [ ] **AC-W2.2** 搜索框 focus 自动放大
- [ ] **AC-W3.1** 盯上列表无内嵌滚动条
- [ ] **AC-W3.2** 盯上项可拖拽排序
- [ ] **AC-W4** 工作台主栏无排版预设入口；Inspector 内有排版段
- [ ] **AC-W5.1** 默认无右栏；鼠标移到右边缘 48px 持续 200ms 呼出
- [ ] **AC-W5.2** 鼠标离开 + X < width-480 持续 600ms 自动收
- [ ] **AC-W6** 源码模式只有一个编辑框
- [ ] **AC-W7** 进入工作台无可见 mode 标签 UI
- [ ] **AC-W8** 主栏无版心调整入口；Inspector 排版段内可调
- [ ] **AC-W9.1** 顶部状态指示 ≤ 1 组
- [ ] **AC-W9.2** Settings 内有 StatusBar 关闭开关

---

## 4. Definition of Done

- [ ] **DoD-1** 全部 AC（共 25 条）通过 Playwright 多视口验证
- [ ] **DoD-2** `pnpm typecheck` 通过
- [ ] **DoD-3** `pnpm lint` 通过且无遗留 fixable
- [ ] **DoD-4** `pnpm test` 现有测试不退化
- [ ] **DoD-5** `gitnexus_detect_changes` 范围与 PRD 改动一致
- [ ] **DoD-6** 控制台 0 error / 0 warning
- [ ] **DoD-7** 文案 deny-list grep 反向校验通过
- [ ] **DoD-8** 截图证据归档到 `.trellis/tasks/05-06-app-visual-overhaul/evidence/`（X-12 要求"附截图/日志"）
- [ ] **DoD-9** Tauri build 一轮（最终阶段，验证 APP 形态无回归）

---

## 5. Out of Scope（显式 0506 决策但本轮不做）

| 0506 决策 | 内容 | 不做的原因 |
|----------|-----|----------|
| T09-01 | 暗色模式所有组件 100% 适配 | 单独大任务，与视觉打磨耦合度低 |
| L1-57 | 中英文字体独立配置（开源） | 字体系统单独任务 |
| L1-58 | 完整主题编辑器（CSS 变量/导入/导出） | 主题编辑器是独立 task，本轮仅迁入入口 |
| L1-41 | 文档 6 态生命周期完整实现 | 仅在 H4 卡片显示徽章，不做完整状态机 |
| EX-01 | 快速笔记 Scratch Pad | 独立任务（独立全局快捷键 + 托盘） |
| EX-02 | `[[文章名]]` 内链 | 独立任务（依赖全文索引） |
| EX-03 | 命令面板 | 独立任务（已有部分代码 `command-palette/`） |
| L1-53 | Tauri 多窗口 | 独立任务 |
| L1-54 | 文件夹监控 | 独立任务 |
| L1-55 | 系统托盘 + 全局快捷键 | 独立任务 |
| S-03 | 全文搜索完整实现 | 本轮仅做搜索框 UI 放大，不动后端索引 |
| S-08 | .docx 导入 | 独立任务 |
| 后端 | Tauri Rust 改动 | 本轮纯前端 |
| i18n | i18n 抽离（G-08 中英双语） | 独立任务（先用就地中文常量） |

---

## 6. Technical Approach

### 6.1 文件改动一览

| 文件 | 改动量级 | 主要内容 |
|------|---------|---------|
| `inkforge/src/views/HubView.vue` | **大** (~800 行变更) | max-width 弹性、文案净化、4 版重构、snap |
| `inkforge/src/views/WorkstationView.vue` | **大** (~600 行变更) | 红尾移除、左栏动画、盯上栏、Inspector 重构、磁吸、状态精简 |
| `inkforge/src/components/editor/EditorPanel.vue` | **中** (~200 行) | 源码模式单框、所见即所得视觉重设 |
| `inkforge/src/components/editor/EditorStatusBar.vue` | **中** | 状态合并、可关闭开关 |
| `inkforge/src/components/editor/MarkdownEditor.vue` | **小** | 红色装饰移除 |
| `inkforge/src/App.vue` | **小** | 删帮助按钮 |
| `inkforge/src/composables/useEdgeMagnetism.ts` | **新增** | 检查器磁吸 |
| `inkforge/src/composables/useScrollSnap.ts` | **新增** | Hub snap + 阻尼 |
| `inkforge/src/components/hub/UserAvatarPopover.vue` | **新增** | 圆头像气泡菜单 |
| `inkforge/src/components/hub/WritingFlowDayPopup.vue` | **新增** | 柱状日弹卡 |
| `inkforge/src/components/hub/SectionDots.vue` | **新增** | 版式指示 |
| `inkforge/src/components/hub/TemplateMarketGrid.vue` | **新增/重构** | 第二版模板市场 |
| `inkforge/src/utils/extractCover.ts` | **新增** | 文章封面提取 |
| `README.md` | **小** | APP 取向标注 |
| `.trellis/tasks/05-06-app-visual-overhaul/research/deny-list.md` | **新增** | 文案 deny-list（验证 grep） |

### 6.2 关键技术决策（ADR-lite）

**A. 弹性 max-width: `min(1680px, 100vw - 96px)`**
- Context: 7 处 1400px 在 1920+ 视口空旷
- Decision: 不引入断点切列，仅放宽容器；4 列 bento 在 1680 仍合理
- Consequences: 卡片 padding/gap 无需改；窄屏不变

**B. Hub snap：原生 CSS scroll-snap + 自定义 wheel 拦截**
- Context: T02-09 要求保持 snap；T09-09 要求按性能降级；T09-02 fade+slide
- Decision: 不引入 carousel 库；CSS scroll-snap-type 主导，wheel 事件 + IntersectionObserver 增强阻尼与进入动画
- Consequences: 控制权完全在我们；reduced-motion 直接降级

**C. 检查器磁吸：自写 composable**
- Context: W-03、L1-46
- Decision: composable 监听 mousemove + 时间累积；不引入 hover-intent 库
- Consequences: 阈值（48px / 200ms / 600ms）可在 Settings 调

**D. 不并行编辑同一巨石文件**
- Context: HubView 5087 行 + WorkstationView 5250 行；并发 patch 必冲突
- Decision: HubView 内部串行（一个 Hub agent 跑 G/H 全部）；Workstation 独立 agent；二者跨文件并行
- Consequences: Phase 2 仅 2 个并行 agent；Phase 1 全局 agent 必须先完成

**E. 文案净化用 deny-list + grep 校验**
- Context: G-2 验收要求确定性
- Decision: 把禁用词写入 `research/deny-list.md`；CI 级 grep 反向验证
- Consequences: 后续维护成本低；任何回归立刻可见

---

## 7. Agents Team 编排

```
Phase 0  ✅ 已完成
  PRD + 任务结构 + deny-list seed

Phase 1  串行（trellis-implement, ~30 分钟）
  └── A1 · Global-Cleanup
        · 7 处 max-width → min(1680px, 100vw - 96px)
        · 文案 deny-list grep 全量替换/删除
        · App.vue 帮助按钮迁移到 Hub Header
        · README APP 取向标注
        · 关闭首启 onboarding 自动弹
        · 改动后做 trellis-check 自检

Phase 2  并行（同一时间并发 spawn 2 个 trellis-implement, ~120 分钟）
  ├── A2 · Hub-Overhaul （改 HubView.vue 单文件）
  │     H0.1 snap + 阻尼 (composables/useScrollSnap.ts)
  │     H0.2 SectionDots
  │     H1.1 WritingFlowDayPopup（柱状弹卡）
  │     H1.2 UserAvatarPopover（圆头像气泡）
  │     H1.3 第一版完整可见（grid 重排）
  │     H1.4 留白与拉伸修复
  │     H2.1 TemplateMarketGrid 重构
  │     H2.2 第二版文案净化
  │     H3.1 第三版注释清除
  │     H3.2 标签云中文化
  │     H4.1 第四版独立瀑布流
  │     H4.2 文章卡封面 + 状态徽章
  │
  └── A3 · Workstation-Overhaul （改 WorkstationView.vue + EditorPanel.vue）
        W1 红尾移除（grep 红色装饰）
        W2 左栏动画 + 搜索框放大
        W3 盯上栏重做
        W4 排版预设迁入 Inspector + 仅 1 个
        W5 useEdgeMagnetism + 默认收起 + 鼠标右边缘呼出
        W6 源码模式单框
        W7 所见即所得视觉重设
        W8 版心 + 设置迁入 Inspector
        W9 顶部状态精简到 1 组 + StatusBar 可关闭

Phase 3  我亲自跑（~30 分钟）
  └── A4 · Verify
        · Playwright 多视口截图（1366/1440/1920/2560）
        · 所有 25 条 AC 逐项验证
        · grep deny-list 反向校验
        · pnpm typecheck + lint
        · gitnexus_detect_changes 范围核对
        · 截图归档到 evidence/
        · 失败项回送对应 agent 修复
```

**为什么这样编排**：
- HubView (5087 行) 与 WorkstationView (5250 行) 是巨石单文件，不能多 agent 同时编辑
- Phase 1 全局必须先做（max-width 与文案净化是后续打磨的基础）
- A2、A3 改不同文件，可真正并行（spawn 在同一 message 内）
- A4 由我亲自做，避免子 agent 误判验收

---

## 8. 风险与回退

| 风险 | 概率 | 应对 |
|-----|-----|-----|
| Hub snap 在 Tauri webview 表现与 Chrome 不一致 | 中 | Phase 3 用 Tauri build 复检；如有差异为 webview 加 polyfill |
| 检查器磁吸与用户鼠标自然移动冲突 | 中 | 阈值设保守（48px/200ms 触发，600ms 收回）；提供"钉住"按钮禁用 |
| 巨石文件 patch 冲突 | 低（已规避） | A2/A3 跨文件并行，无重叠 |
| 文案净化误删用户已认可的产品语 | 低 | deny-list 仅匹配确认的"开发解释"短语，主标题/操作 label 不在列表内 |
| 第二版模板市场重构破坏现有模板调用链 | 中 | 保留模板 store API；仅重构展示组件 |
| 阻尼动画在低性能设备卡顿 | 低 | T09-09 要求按性能降级；prefers-reduced-motion 已处理 |

**回退策略**：
- 每个 Agent 独立 commit（不合并 squash），出问题可单独 revert
- Phase 1 完成时打 tag `before-overhaul-phase2`
- A2/A3 各自完成时打 tag `hub-overhaul-done` / `workstation-overhaul-done`

---

## 9. Decision (ADR-lite)

**Context**: 用户给出 4 大类 26+ 条具体视觉/交互问题 + 19 张截图 + 0506 全卷 214 题决策；HubView/WorkstationView 单文件超大；视觉一致性 D 级要求"任何突兀都极其反感"

**Decision**:
1. 严格映射 0506 每条决策到具体改动（PRD 第 1 节决策映射表）
2. 不引入新 UI/动画/i18n 库（视觉一致性 D 级 + 不偏离 stack）
3. 三阶段编排：Global → Hub‖Workstation → Verify
4. 文案净化建立 deny-list（CI 级 grep 校验）
5. 弹性 max-width 用 `min(1680px, 100vw - 96px)`
6. 检查器磁吸自写 composable
7. 巨石单文件不并行编辑

**Consequences**:
- 优点：每条改动可追溯到 0506 出处；并行度合理；验收确定性高
- 风险：HubView 内部串行总周期较长；缓解 — A2 内部按版面分段串行 commit，渐进可验
- 长期：deny-list、useEdgeMagnetism、useScrollSnap 沉淀为可复用资产
