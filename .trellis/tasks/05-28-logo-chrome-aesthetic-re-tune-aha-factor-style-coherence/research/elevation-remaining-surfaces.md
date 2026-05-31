# InkForge 全应用提升计划 — 「静谧刊印」扩展到剩余表面

> 来源：7 路只读审计 + 1 路合成 workflow（wcaec3q9h，732k tokens 分析）。合成代理读文件
> 验证后纠正了两处审计误判。所有改动非破坏性：CSS 值 + markup 重着色 + lucide 图标替换，
> 不动 store/service/router/pinia/TipTap/prop/emit。暗色 + reduced-motion 必须保持正确。

## 共享前置（Wave 0，落一次，后续复用）

1. **新增 4 个 token**（tokens.css + design-system.css 明暗两块）：
   - `--scrim`（light rgba(0,0,0,0.4) / dark 0.6）= 对话框/命令面板遮罩。
   - `--danger` + `--danger-soft`（dark-aware，~#C0392B / #E5705F）= 破坏性操作，**语义上与 --ember 分开**。
   - 不动 e2e 断言的 `--motion-*`/`--type-step-*`/`--focus-ring`。
2. **不要** 新建 `--success-soft/--error-soft/--warning-soft`：`--success-light/--error-light/--warning-light` 已存在且 dark-aware（design-system.css L30/32/34 + L681/683/685）；只删字面 hex 回退即可。
3. **forge-line 提全局**：`@keyframes forge-line` + `.forge-line` 工具类移到 design-system.css（现仅 EditorEmptyState/HubView 各有一份 scoped 拷贝）。token 驱动时长 → reduced-motion 自动折叠。

## 脊柱重着色映射（所有波次统一，明暗永不分叉）

- 背景 `#FFFFFF/#fff` → `var(--bg-surface)`；凹陷场 `#FAFBFC/#F5F5F5/#FAFAFA` → `var(--bg-rice-paper)`；画布/预览场 → `var(--paper-warm)`。
- 边框/分隔 `#E5E7EB/#ECEFF1/#F0F1F3/#F3F4F6` → `var(--hairline)`。
- 文字 `#263238/#1a1a1a/#1F2937` → `var(--text-primary)`；`#607D8B/#374151/#455A64/#546E7A` → `var(--text-secondary)`；`#90A4AE/#9CA3AF/#B0BEC5/#CFD8DC/#6B7280/#E0E0E0` → `var(--text-muted)`。
- 手写阴影 → `--elev-2/--elev-3`；字面红色环境阴影 → `--elev-*`（彩色阴影只留给 ONE armed CTA 的 `--glow-ember`）。
- `transition:all` + 散落 `0.1~0.5s` → 动效阶梯。inline SVG `stroke="#..."` → `stroke="currentColor"` + 父级 `color`。
- **每处 literal→token 替换，必须同时删掉它对应的冗余 `html.theme-dark` 手写覆写**（切主题验证）。

## EMBER 预算账本（每屏 ≤2 处朱红，横切验收）

Workstation = publish CTA(glow) + 保存/同步 live-dot。Editor 气泡 = active-mark beat + 链接确认 CTA。
Slash/Context/Table 菜单 = 仅 selected/active 左缘 beat（hover 永远中性灰，绝不红）。FileManager = 仅 active-doc 行缘
（分段/排序/智能夹/搜索聚焦全降中性）。ArticlePanel = active 卡缘 + FAB(glow)。CategoryPanel = 仅 active 缘。
AIPanel = live 加载/错误 beat（互斥）+ 一个主 CTA hover。Export = 渲染 forge-line + 复制 CTA(glow)，微信草稿降 ghost。
Template = selected 卡 forge-line/图标 + 使用模板 CTA(glow)。Version = current 指示条 + 保存 CTA(glow)，diff 蓝降墨色。
CommandPalette = active 行 + Run。Settings/Insights/Themes/Account/404 = 多红收成 ONE 主 CTA + 中性脊柱。

## 波次（有序）

- **Wave 0 (P0/S)** — 共享地基：4 token + 全局 forge-line。`tokens.css`、`design-system.css`。近零风险。
- **Wave 1 (P0/L)** — Workstation shell（写作者常驻屏）。`WorkstationView.vue`。根 `#FAFBFC/#263238`→token（**全应用最大暗色断裂**，整壳现在暗色下全白）；~150 处脊柱重着色；3 个红色 FILL 按钮降级（publish 留 ember CTA + 换 ArrowUpRight 笔锋箭头，stage 复制按钮转中性墨填，secondary 转 hairline ghost）；live beat = 保存 status-pill unsaved/saving 态；两处预览红洗 → `--paper-warm`；device-frame → paper+elev-3（保留黑刘海）；inspector header 挂一条 forge-line；崩溃恢复横幅加暗色覆写。e2e 不断言任何 Workstation 选择器。
- **Wave 2 (P0/M)** — Editor chrome（气泡/slash/context/table 工具条 + EditorPanel 框）。四张浮层卡 → token；**全面消灭红 FILL**：FloatingToolbar active mark → ember-soft tint + ember 图标 + inset 下划线；hover 中性；SlashMenu 选中 → ember 左轨；ONE CTA = 链接确认 → 实心 ember+glow；EditorPanel 源码模式 `#FAFBFC`→token、拖拽插入线蓝 `#2563eb`→ember。
- **Wave 3 (P0/L)** — 左栏（FileManager + ArticlePanel + CategoryPanel + AddCategoryModal）。FileManager(3382 行,~120 literal)批量脊柱重着色 + 同步删冗余暗覆写；**六处同时的红降中性**（搜索聚焦/分段/排序/智能夹/快捷点全降，仅 active-doc 行留 ember 缘）；三色状态徽章去糖果化；ArticlePanel 海军蓝卡边 + 4px 偏移影 → 单 border-left ember + elev-1，FAB 蓝光 → ember+glow；CategoryPanel active 整行红填 → 中性纸填 + ember 左缘。
- **Wave 4 (P0/L)** — 全局 chrome（TitleBar + CommandPalette + EditorStatusBar + modal.css）。CommandPalette(最差,非品牌蓝/琥珀)→ ember/danger/scrim；EditorStatusBar 常驻粉色 goal-pill FILL → 中性,hover 才 ember；modal.css 遮罩→`--scrim`,危险→`--danger`,加 focus-visible。**TitleBar = 唯一带 e2e 结构断言的波次**：forge-line 走 ::before 且 `pointer-events:none`+置于 3 个控制键之后,不动 ForgeNibMark/seal 几何/按钮类名文本 → 单独跑一次 e2e 把关。
- **Wave 5 (P0/L)** — 导出/模板/版本模态。ExportModal(154 raw literal,零 token,本组最大暗断)整体重着色,平台 pill active 红填降墨,微信草稿红→ghost,复制=ONE ember CTA+glow;TemplatePicker 选中卡 ember 边+forge-line;VersionPanel current 指示条=beat1,保存=beat2,diff 蓝收墨;删字面 hex 让 `*-light` token 生效。
- **Wave 6 (P1/L)** — Hub 数据洞察组件（×8 文件）。每卡红左轨+红角光+红 eyebrow 中性化;唯一 live beat = 热力图最热格 ember。**保留功能性数据可视化多色**（分类多色/时间线双色/单序列走 ember）。
- **Wave 7 (P1/L)** — Settings + WelcomeModal + AIPanel + Themes/Account/404。AIPanel(零 ember,4 个竞争色填)→中性,加载=ONE ember+forge-line beat,生成摘要按钮加 ArrowUpRight;SettingsView(近金标,外科手术)补暗色级联缺口+meter 去糖果;Themes/Account/404 零暗块→`var(--token,#fallback)` 全 token 化,多红收 ONE 主 CTA。

## 刻意 DEFER（非遗漏）

- 不新建 `*-soft` 状态 token（已存在 `*-light`）。
- 不定义 CommandPalette 引用的 5 个未定义 `--color-*`（会把非品牌蓝/琥珀固化进 token 系统）→ 改为重定向到现有 spine/ember/danger。
- 不全局替换 `--accent-primary`（滑块/range/Settings 选中/热力图基底仍用它）。
- 不拍平功能性数据可视化调色板（编码的是数据非 chrome）。
- 不给 `.ProseMirror` 正文加 scoped 暗覆写（全局已处理）。
- 不删两份已存在的 scoped forge-line 拷贝（无害,churn 无收益）。
- 保留 device-notch 黑边、92px Hub 数字、Hub 破调圆角（ArticlePanel 卡用单一 `--radius-medium`）。

## 验证 / 流程约束

每波后数 ember 实例 ≤2。CLAUDE.md：改符号前 gitnexus_impact、提交前 detect_changes。Tauri 1.x 编译期嵌 dist →
视觉改动需 pnpm build + cargo build 才在真二进制显现（tauri:dev 验,非 vite）。OOM：串行 build、限 node 内存、
build 时不开 tauri:dev。
