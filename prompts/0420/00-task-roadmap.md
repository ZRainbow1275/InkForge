# InkForge v2.1 — 任务路线图与 Spec 清单（Roadmap）

> **文档定位**: 把 0420 抽取的 287 题需求（L1/L2/增强）转化为**可执行的规范生产计划**。
> **基线**: 0327 的 9 份 spec（Master Plan + T01~T09）
> **输入**: `prompts/0420/_extracted/` 下的 5 份答案提取文件
> **产出用途**: 作为 Phase 3 "PRD + Spec 编写"阶段的总纲与进度表
> **创建日期**: 2026-04-20
> **基调**: 严谨性优先、不考虑时间成本、零空壳交付铁律

---

## 目录

- §1 v2.1 Scope 总览
- §2 基线 Spec 升级决策（0327 的 9 份）
- §3 新增 Spec 完整清单
- §4 依赖关系图
- §5 实施阶段划分（Phase 1-6）
- §6 风险登记册
- §7 Phase 3 产出文档清单

---

# §1 v2.1 Scope 总览

## 1.1 本轮硬性基线（L1-03=B + L1-04=D + X-12=D 交叉得出）

- P0 任务必须全量完成；核心 P1 必须同轮完成。
- 所有进入 scope 的能力必须**零空壳垂直切片**，高风险能力必须有恢复/校验/错误处理链路。
- 所有验收必须"机器测试先行 + 截图/日志/对比样本证据化"（X-12 D）。
- 不设工期（X-08 C）；以 **Lighthouse Performance > 80**（X-05 C）、**输入无延迟 / 保存 ≤1s / 冲突检测 ≤10s / 导出 ≤3min**（L1-36 C+补充）为硬闸门。

## 1.2 本轮必须完成（P0 + 核心 P1）

### 源自 0327 的 9 份基线 spec（全部 in scope，但需要升级）

1. Typora 模式编辑器（01）— 大改
2. Hub 首页布局（02）— 中等升级
3. 键盘快捷键（03）— 中等升级
4. 渲染引擎（04）— 大改
5. 浮动工具栏 + 右键菜单 + 斜杠命令（05）— 大改
6. 本地账户管理（06）— 大改
7. Settings 全量实装（07）— 大改
8. 数据洞察（08）— 大改
9. UI 打磨（09）— 中等升级

### 源自增强问卷（L1+F+E+W+N+P+M+R+EX+S）引出的新 Spec — 本轮**全部必须完成**

- 重量级 20 份：DocumentLifecycle、TrashCan、SmartFolder、AssetStoreV2、TauriFileBridge、TauriMultiWindow、TauriSystemIntegration、ThemeEngine、FontSystem、Typography、CrashRecovery、DataIntegrity、ErrorBoundarySafeMode、DevPanel、PublishAdapter、ExportHistory、SyncScroll、TOCSystem、SplitView、CommandPalette。
- 中等 27 份：详见 §3.2。
- 并入现有 Spec 的小增强 8 项：详见 §3.3。

### Sync 铁律（L1-20 D）

- **WebDAV Provider**、**Git Provider**、**自有服务 Provider** 三种必须真实落地（不是 UI 占位）。Git 是主路径（T07-02=D），WebDAV 为副路径，自有服务为 MVP 骨架。
- 冲突一律由用户决策（L1-22 D + 补充）。三方合并尝试 → 失败时人工合并 UI → 所有结果写审计日志。

### 多账户铁律（L1-23 D + L1-24 D + T06-01=A）

- 每账户独立 IndexedDB + 文件根；支持多窗口并行（与 L1-53 C 跨窗口标签拖拽一致）。
- 模板 / 导出预设 / AI 配置允许跨账户共享（共享区存设备级），其余数据严格隔离。
- v2.1 不开启共享（T06-11=A），共享通道预留接口。

## 1.3 本轮延后（P2 / v2.2+ 候选）

| # | 能力 | 来源 | 延后理由 |
|---|---|---|---|
| 1 | Callout / Admonition | M-01=A | 用户明确 v2.2+ |
| 2 | 嵌入块（Embed YouTube/CodePen/Tweet） | M-07=A | 渠道兼容性不可控 |
| 3 | Deep Link（Tauri URL scheme） | EX-09 | v2.2 候选 |
| 4 | 打印功能 | S-10=A | 明确不做 |
| 5 | Tauri 原生菜单栏 | S-07=C | 明确不做 |
| 6 | 触控 / 手势 / 移动端适配 | T09-12=A | 桌面鼠标优先 |
| 7 | 无障碍 WCAG 合规 | G-09=A | 不专项做 |
| 8 | 阅读模式（独立于预览） | L1-47=A | 不做 |
| 9 | PDF 导出 | P-05=A、T04-08=C（文案不含 PDF） | 明确不做 |
| 10 | 主题市场 / 主题分享 | ThemeEngine 延伸 | v2.1 做本地，分享推后 |

## 1.4 用户明确说"远期"的能力（进入骨架 / 不进入实装）

- **团队协作 / 多人并发编辑 / 正式审阅状态机（Request Changes / Approve）**（L1-01 B 放远期 + L1-16 C 框架保留）
- **行内级冲突合并**（L1-21 D 单写者 + 补充的"实际需要 C 级"的数据结构预留）
- **基于 RBAC / ReBAC 的重型权限模型**（L1-33 C 资源级，远期扩展到 ReBAC）
- **企业级审计 > 3 个月**（L1-34 补充 3 个月为硬指标，更长期要等企业版）
- **外部连接器（云文档 / 代码仓 / 数据库 / 第三方知识库）的深度 Provider**（L1-25 D 要求激进范围 → 本轮只落接口 + 本地 Provider + URL Provider 两种实现）
- **完整 AI Provider**（T07-01=A 本轮仅 UI 占位，真实接入留远期）
- **Tauri 自动更新强推**（L1-56 B 仅通知）

---

# §2 基线 Spec 升级决策（0327 的 9 份）

> 图例：**大改** = 结构级重写 / 章节翻倍 / 核心模型变更；**中等** = 新增若干章节、覆盖面扩展；**保留** = 基本沿用，仅文字级修订。
> 所有基线 spec 一律**拆分为 PRD（产品需求）+ Spec（技术规范）两层**（G-11 补充"每条 PRD 条目记录权威来源"）。

---

## 2.1 01-editor-ui-spec.md（T01 Typora 模式）

- **升级幅度**: **大改**（0327 基础上重构到约 3 倍篇幅）
- **拆分决策**: 拆为 `01-prd-editor.md`（产品需求） + `01-spec-editor-typora.md`（技术规范）
- **升级要点**:
  - 要点 1：明确"Markdown 表达权威 + HTML 运行时持久化权威"双层定义（L1-05 A × L1-06 D）
  - 要点 2：Round-trip 所有元素无损（L1-08 C+补充，硬门槛到 C+）
  - 要点 3：Typora/Source/Preview 切换时所有状态（选区/撤销栈/版本点/评论锚点）必须继承（L1-11 C+补充）
  - 要点 4：模式切换用 Toast + 过渡（T01-13=D）
  - 要点 5：19 种元素一次性覆盖（T01-15=A），禁止分批
  - 要点 6：Source 模式技术栈锁定 vue-codemirror（T01-06=A）
  - 要点 7：内容模型锁定 TipTap JSON，Source 模式是投影层（T01-05=B）
  - 要点 8：嵌套 Mark 分别显示（T01-02=C）、语法标记 currentColor opacity 0.25 无动画（T01-03=A、T01-04=C）
  - 要点 9：重块元素统一"光标进入即编辑、离开即渲染"（T01-18=B）— 图片走 B 而非 C（解决 T01-10 vs T01-18 矛盾）
  - 要点 10：表格完整 Typora 切换（T01-07=C），代码块围栏标记 cursor-aware（T01-08=A），链接 hover tooltip + Ctrl+Click（T01-09=C）
  - 要点 11：纸张宽度 Ctrl+= 循环切换（T01-11=C）
  - 要点 12：专注模式含段落高亮（T01-12=B）
  - 要点 13：Undo/Redo 按模式分检查点（T01-14=C）
  - 要点 14：粘贴默认纯文本清洗（T01-17=A）+ 来源白名单/黑名单机制
  - 要点 15：非法 Markdown 轻补全失败回退原文（T01-19=B+补充"最大程度尊重用户选择"）
  - 要点 16：复制按内容类型分流（T01-20=D）
  - 要点 17：评论锚点行内级 + 跨版本漂移（L1-15 C+补充）
  - 要点 18：写作目标必须显示在 StatusBar 与 Hub Insights（L1-45 C+补充）
  - 要点 19：E-01 列表 Enter = 减少缩进（E-01=B，Notion 风格）
  - 要点 20：撤销逻辑分组（E-10=B）；多光标 Ctrl+D（E-06=B）
- **预计章节目录（升级后 Spec）**：
  1. 内容权威模型（Markdown vs HTML 双层契约）
  2. Typora / Source / Preview 三模式契约（状态继承表）
  3. 19 元素行为矩阵（逐元素 cursor-aware 规则）
  4. TyporaMode 扩展架构（增强 MarkdownHints.ts）
  5. 嵌套 Mark 渲染层（Decoration 策略）
  6. 语法标记视觉规范（currentColor + opacity）
  7. 模式切换引擎（Toast / 过渡 / 状态继承）
  8. Source 模式 vue-codemirror 集成
  9. 重块元素进入退出状态机
  10. Undo/Redo 跨模式检查点模型
  11. 粘贴清洗管线（来源白/灰/黑名单）
  12. 非法 Markdown 容错层
  13. 复制 / 剪贴板多格式策略
  14. 评论锚点与漂移算法
  15. 输入法与 IME 兼容（验收场景）
  16. 列表 Enter 等键位细则
  17. 写作目标与 StatusBar 联动
  18. 性能 SLO 对齐（输入 0ms）
  19. 验收矩阵（19 元素 × 4 模式 × 5 样本）
  20. 权威来源登记表
- **依赖的新 Spec**: 10-markdown-authority、16-markdown-extensions、21-focus-writing-assist、27-performance-slo、34-layout-persistence、41-crash-recovery

---

## 2.2 02-hub-layout-spec.md（T02 Hub 首页）

- **升级幅度**: **中等**（延续原骨架，新增引导模式、卡片优先级、Workstation 关系）
- **拆分决策**: 拆为 `02-prd-hub.md` + `02-spec-hub-layout.md`
- **升级要点**:
  - 要点 1：Hero = WritingFlowCard 视觉重设计 + 继续创作入口（T02-01=A + T02-14=B，解决矛盾需在 Spec 明确 Hero 新结构）
  - 要点 2：Section 2 改为"创作工具"区（模板 + 草稿 + 素材管理）（T02-02=D）
  - 要点 3：Bento Grid 用 auto 高度，不 100vh（T02-03=B）
  - 要点 4：响应式 4→3→2→1 四级（T02-08=C）
  - 要点 5：保留 scroll-snap（T02-09=A）+ 保留 SectionNav（T02-10=A）
  - 要点 6：InspirationCard = 本地硬编码 50-100 条 + AI 生成 + 用户句子混合（T02-04=D+补充"AI 生成"）
  - 要点 7：card-recent 动态数量（T02-06=C）
  - 要点 8：Store 响应式自动更新（T02-07=B）
  - 要点 9：Hub 最多 3 个新建入口（新建/模板/导入）（T02-13=C），FAB 展开同上三项（T02-11=B）
  - 要点 10：card-categories 点击展开列表（不跳转 Workstation）（T02-12=B）
  - 要点 11：卡片优先级 Hero+Recent+Stats 必保（T02-16=A）
  - 要点 12：Hub ↔ Workstation = 项目首页 vs 文档工作区（T02-17=C）
  - 要点 13：空状态 = 引导版 Hub（T02-15=B），全新安装首启走引导版 Hub；拒绝独立 Onboarding 页（化解 T02-05 C 与 T02-15 B 矛盾）
  - 要点 14：Hub 必须呈现文档生命周期状态（L1-41 补充"必须显示在 Hub 卡片"）
  - 要点 15：Hub 必须呈现写作目标进度（L1-45 C+补充"Hub 洞察体现"）
  - 要点 16：Pinned / 收藏 = 虚拟分类的一种形态，Hub `card-pinned` 新增（L1-43 D+补充"收藏是分类的一种"）
- **预计章节目录（升级后 Spec）**：
  1. Hub 信息架构与页面目标
  2. 首启引导版 vs 常规版切换
  3. Hero 卡片重设计（图表 + 继续创作）
  4. Section 2 创作工具区
  5. Section 3 数据洞察区（与 T08 新版对齐）
  6. card-recent 动态容量
  7. card-pinned 虚拟分类展示
  8. card-categories 就地展开
  9. InspirationCard 数据源（本地 + AI + 用户句子）
  10. 卡片优先级与小屏裁剪
  11. Bento Grid 布局规范 + 响应式 4 档
  12. scroll-snap + SectionNav
  13. QuickActionFab 三入口
  14. 入口预算与冲突检测
  15. Hub ↔ Workstation 导航契约
  16. Store 响应式链路
  17. 文档状态显示 + 生命周期徽章
  18. 写作目标进度 Hub 呈现
  19. 验收矩阵
  20. 权威来源登记表
- **依赖的新 Spec**: 11-document-lifecycle、12-file-manager、13-workstation-layout、19-ftue-help、20-theme-font-typography

---

## 2.3 03-keyboard-shortcuts-spec.md（T03 快捷键 / FindReplace）

- **升级幅度**: **中等**（快捷键映射表基本沿用，新增 chord / 作用域 / 冲突策略 / 帮助面板）
- **拆分决策**: 拆为 `03-prd-keyboard.md` + `03-spec-keybindings.md`
- **升级要点**:
  - 要点 1：FindReplace 完整能力（正则 + 大小写 + 全词 + 跳转 + 计数）VS Code 风浮窗（T03-01=C、T03-02=A）
  - 要点 2：快捷键热更新（T03-03=A）
  - 要点 3：冲突可覆盖 + 警告（T03-04=A）
  - 要点 4：Ctrl+\ 专职模式切换；清除格式改 Ctrl+Shift+N（T03-06=C）
  - 要点 5：Tab 键上下文感知（列表/代码块/焦点切换）（T03-07=C）
  - 要点 6：IME 合成期 Ctrl+数字跳过，其他保留（T03-08=B）
  - 要点 7：作用域先全局统一（T03-09=A），未来再分层
  - 要点 8：Chord 多段组合 + 可视化序列提示（T03-10=D）
  - 要点 9：帮助面板 = 可搜索 + 支持分组 + 录制 + 修改 + 筛选（T03-12=C+补充 D 的筛选维度）
  - 要点 10：快捷键失败提示走 StatusBar 短提示（T03-13=B）
  - 要点 11：Ctrl+N 新建文章 Hub 全局快捷键（S-04）
  - 要点 12：CommandPalette 作为统一命令入口（EX-03、L1-27 D）— 本 Spec 负责 chord / palette 触发的键位契约，palette 实现在 22-command-palette
  - 要点 13：浏览器冲突策略 = 只做 App，简化为 Tauri 单套规则（T03-11 未选 + 补充"不做 Web 版"）
- **预计章节目录（升级后 Spec）**：
  1. 快捷键设计原则
  2. 33 快捷键映射表（与 0327 基本一致，微调 Ctrl+\ Ctrl+Shift+N）
  3. DEFAULT_SHORTCUTS 定义
  4. 快捷键热更新与 Settings 联动
  5. 冲突检测（Tauri/OS 单套规则）
  6. Chord 多段组合状态机
  7. Chord 可视化提示 Overlay
  8. Tab 键上下文感知
  9. IME 合成期策略
  10. 作用域模型（v2.1 全局统一 / v2.2 分层预留）
  11. FindReplace 完整规范
  12. FindReplace 面板布局与 z-index
  13. 快捷键帮助 Tooltip + Settings Tab 联动
  14. 全局快捷键 Ctrl+N（Hub）
  15. 快捷键失败提示（StatusBar）
  16. 验收矩阵
  17. 权威来源登记表
- **依赖的新 Spec**: 22-command-palette、26-multi-account-profile（账户切换快捷键）、37-snippet-system

---

## 2.4 04-rendering-engine-spec.md（T04 渲染引擎）

- **升级幅度**: **大改**（多平台独立渲染管线 + 全平台导出预设，从 1 份拆成 3 份）
- **拆分决策**: 拆为 `04-prd-rendering.md` + `04-spec-rendering-core.md` + `15-export-publish-spec.md`（发布管线独立成一份）
- **升级要点**:
  - 要点 1：KaTeX 完整 WYSIWYG + 红色原生错误（T04-01=A、T04-02=A）
  - 要点 2：Mermaid 右侧 Stage 面板渲染（T04-03=C、T04-04=A）
  - 要点 3：KaTeX/Mermaid 始终渲染（不做 Typora 切换）（X-02=B）— 明确简化扩展复杂度
  - 要点 4：代码高亮 GitHub 系主题 + 加载全 180 种语言（T04-05=A、T04-07=C）
  - 要点 5：代码块复制富文本 + 纯文本（T04-06=C）
  - 要点 6：渲染错误在修改后自动消失（T04-12=A+补充）
  - 要点 7：主题跟随全局 + 按平台适配（T04-11=B）"一平台一渲染流程"
  - 要点 8：公式 / Mermaid / 代码高亮三端一致 + 失败降级（L1-32 C+补充，PRD 强制补入降级规则）
  - 要点 9：安全沙箱 = 轻级清洗 + 平台 exporter 兜底（T04-15=A）
  - 要点 10：预览实时更新（T04-09=A）
  - 要点 11：资产嵌入策略 = 按平台决定（T04-14=C）
  - 要点 12：渲染契约按平台规则（T04-13=C）
  - 要点 13：Round-trip 到所有导出端（Typora / Source / Preview / Export 四者间无损）（L1-08 C+补充）
- **预计章节目录（升级后 04-spec-rendering-core）**：
  1. 渲染架构原则
  2. 权威源 → 平台派生链路
  3. KaTeX WYSIWYG
  4. KaTeX 错误处理
  5. Mermaid Stage 面板
  6. Mermaid 错误处理
  7. 代码高亮引擎（Shiki / highlight.js 选型）
  8. 语言懒加载策略（按语言粒度）
  9. 代码块复制多格式
  10. 渲染错误缓存与清除
  11. 主题跟随 + 平台 override
  12. 公式图表三端一致契约
  13. 降级策略（源码/占位/回退图像）
  14. 安全沙箱轻级清洗
  15. 预览实时更新（节流策略）
  16. 资产嵌入决策表
  17. 性能 SLO 对齐
  18. 验收矩阵
- **依赖的新 Spec**: 10-markdown-authority、15-export-publish、16-markdown-extensions、27-performance-slo

---

## 2.5 05-toolbar-complete-spec.md（T05 浮动工具栏 + 右键菜单 + 斜杠命令）

- **升级幅度**: **大改**（命令注册表变成中枢系统；多级菜单；资产管线）
- **拆分决策**: 拆为 `05-prd-toolbar.md` + `05-spec-toolbar-contextmenu-slash.md` + 新增 `25-extension-plugin-spec.md` 承接命令总线与权限
- **升级要点**:
  - 要点 1：统一命令注册表（权限 + 审计 + 回滚 + 搜索排序）（T05-09=D、L1-27 D）
  - 要点 2：命令四域分离（编辑/系统/AI/发布）（L1-27 D 补充）
  - 要点 3：AI/自动化写操作必须预览 diff + 自动版本点（T05-12=D、X-10=C+补充"任何自动化必须生成版本点"）
  - 要点 4：右键菜单深度嵌套（二/三级及以上）（T05-08=B+补充"能做尽做"）
  - 要点 5：斜杠命令模糊匹配（T05-06=C）+ 排序最多维度（上下文 + 频率 + 收藏）（T05-10=D）
  - 要点 6：FloatingToolbar Source 模式保持一致（T05-07=C、X-01=A）
  - 要点 7：颜色选择器预设 16 + 最近使用 + 自定义（T05-05=C）
  - 要点 8：链接编辑 = 内联 Popover（T05-04=A）；链接 tooltip 含编辑/复制/取消（E-08=C）
  - 要点 9：Callout = CSS-only blockquote + 原生 details（T05-02=A，M-01 Callout 本轮不做，Details 做）
  - 要点 10：图片走 Tauri 文件系统（T05-03=D + 补充"需能导出到平台"）
  - 要点 11：资产统一管线（拖拽 / 粘贴 / 按钮）去重/命名/大小阈值/清洗（T05-11=D+补充"截图/GIF/SVG/远程 URL"收归本地）
  - 要点 12：右键菜单剪贴板走 Tauri clipboard API（T05-01=A）
  - 要点 13：只读/预览/发布态命令可见性 = 上下文子集（T05-13=C）
  - 要点 14：三种入口严格分工（快捷键=熟练 / 斜杠=插入 / 浮动=格式化）（L1-29 A）
- **预计章节目录（升级后 Spec）**：
  1. 统一命令注册表架构
  2. 命令四域分离（namespace + 权限）
  3. 命令元数据（id/label/icon/enableWhen/handler）
  4. 命令搜索排序算法
  5. 快捷键/斜杠/工具栏/右键入口消费协议
  6. FloatingToolbar 布局（Typora/Source 一致）
  7. FloatingToolbar 溢出修复
  8. 右键菜单递归嵌套（无层级限制）
  9. 右键菜单上下文敏感子集
  10. 斜杠命令 fuzzy 过滤
  11. 斜杠命令排序（上下文+频率+收藏）
  12. 颜色选择器
  13. 链接编辑 Popover + Tooltip
  14. Callout / Details 轻量实现
  15. 资产统一管线（AssetPipeline）
  16. Tauri clipboard 剪贴板
  17. AI/自动化命令预览 + 版本点
  18. 权限/审计接入点（引用 24-permission-audit-spec）
  19. 验收矩阵
- **依赖的新 Spec**: 22-command-palette、24-permission-audit、25-extension-plugin、28-asset-pipeline-spec

---

## 2.6 06-account-auth-spec.md（T06 本地账户管理）

- **升级幅度**: **大改**（Chrome Profile 级 + 多账户并行 + 高级认证 + 首启分流）
- **拆分决策**: 拆为 `06-prd-account.md` + `06-spec-account-auth.md` + 抽出 `26-multi-account-profile-spec.md`
- **升级要点**:
  - 要点 1：完全 Profile 隔离（文章/分类/设置 独立数据库）（T06-01=A、L1-23 D）
  - 要点 2：账户切换 = 整页 reload（T06-05=C），自动保存失败时禁止切换（T06-12=A+补充）
  - 要点 3：多账户并行打开，多窗口 / 多工作区（L1-24 D）
  - 要点 4：模板 / 导出预设 / AI 配置跨账户共享（L1-23 D+补充）— 放设备级共享区
  - 要点 5：AccountWelcome = 可选页（T06-02=A），通过 Hub 头像进入（T06-07=B）
  - 要点 6：头像上传走裁剪对话框（T06-03=B）
  - 要点 7：删除账户 = 双重确认 + 输入账户名（T06-04=B）
  - 要点 8：软删除 7 天可恢复（T06-10=B）
  - 要点 9：首启分流 = 创建正式账户 / 导入已有数据（T06-08=D + 拒绝匿名）
  - 要点 10：认证 = 本地密码 + Windows Hello 双轨（T06-09=D+补充"高危操作强制高级认证"）
  - 要点 11：高危操作清单（删文章/删账户/查敏感设置/导出全量）强制高级认证
  - 要点 12：远程同步占位显示 + disabled（T06-06=A）
  - 要点 13：跨账户共享 v2.1 完全关闭（T06-11=A）
  - 要点 14：权限模型 = 资源级（文档/文件夹/评论/版本/发布）绑多账户/多 Profile（L1-33 C）
- **预计章节目录**：
  1. Profile 模型（每账户独立 DB + 文件根）
  2. AccountWelcome 页面（可选）
  3. 账户创建向导
  4. 头像上传 + 裁剪
  5. 账户删除（双重确认 + 软删除 7 天）
  6. 账户切换流程（reload + autosave 预检）
  7. 多账户并行（多窗口）
  8. 首启分流 Dispatcher
  9. 本地密码认证
  10. Windows Hello 集成
  11. 高危操作清单与二次认证
  12. 跨账户共享区（设备级）
  13. 权限模型（资源级）
  14. Hub 头像气泡菜单
  15. 远程同步占位
  16. 验收矩阵
- **依赖的新 Spec**: 23-sync-provider、24-permission-audit、17-crash-recovery（切换前 autosave 预检）

---

## 2.7 07-settings-full-spec.md（T07 Settings 全量实装）

- **升级幅度**: **大改**（新增 Sync Git、搜索、迁移、重置、作用域）
- **拆分决策**: 拆为 `07-prd-settings.md` + `07-spec-settings-tabs.md`
- **升级要点**:
  - 要点 1：AI Tab = UI 占位（T07-01=A）
  - 要点 2：Sync Tab = Git 同步主路径（T07-02=D）+ WebDAV + 自有服务（L1-20 D）
  - 要点 3：Data Tab = 导出/导入/清除/统计/自动备份/IndexedDB Inspector（T07-03=B+C）
  - 要点 4：Advanced Tab = 开发者模式 + 日志 + 缓存 + DB 重置 + 自定义 CSS + 自定义 JS + 性能监控 + 网络诊断（T07-04=B+C）
  - 要点 5：Settings 顶部全局搜索栏 + 同义词/快捷键名（T07-05=B、T07-11=C+补充）
  - 要点 6：即时持久化（T07-06=A）
  - 要点 7：设置不独立导出（随账户导出）（T07-07=B）
  - 要点 8：作用域 = 账户级为主 + 设备级少量（T07-08=C）
  - 要点 9：危险项需开启开发者模式（T07-09=C）
  - 要点 10：迁移 = schema version + 差异预览 + 回滚点 + 废弃提示（T07-10=D+补充）
  - 要点 11：重置 = 单项 / Tab / 全量三级 + 回滚点（T07-12=C+补充）
  - 要点 12：扩展 SDK 完全开放 + 沙箱 + 权限声明（L1-37 D + L1-38 C）
  - 要点 13：字体 / 主题 / Typography 面板接入 ThemeEngine（L1-57/58/59/60 D）
- **预计章节目录**：
  1. Settings 信息架构
  2. 全局搜索栏 + 同义词索引
  3. 设置注册中心（SettingsRegistry）
  4. 持久化与 schema 版本化
  5. 迁移引擎 + 差异预览 + 回滚
  6. 重置三级粒度 + 回滚点
  7. 作用域分层（Device / Account）
  8. Appearance Tab
  9. Editor Tab
  10. Shortcuts Tab（引用 03）
  11. AI Tab（占位）
  12. Sync Tab（Git 主路径，引用 23-sync-provider）
  13. Data Tab（导入/导出/备份/Inspector）
  14. Advanced Tab（开发者模式 + 诊断面板）
  15. 自定义 CSS（引用 EX-07）
  16. 自定义 JS（沙箱）
  17. 危险项保护矩阵
  18. 扩展管理 UI（引用 25-extension-plugin）
  19. 验收矩阵
- **依赖的新 Spec**: 20-theme-font-typography、23-sync-provider、24-permission-audit、25-extension-plugin、29-crash-recovery-health、41-settings-migration

---

## 2.8 08-data-insights-spec.md（T08 数据洞察）

- **升级幅度**: **大改**（指标字典 + 多层刷新 + 行动化 + Web Worker 预计算）
- **拆分决策**: 拆为 `08-prd-insights.md` + `08-spec-insights-charts.md` + 独立 `metrics-dictionary.md`
- **升级要点**:
  - 要点 1：6 个新图表全做（T08-01=A）
  - 要点 2：ExportFrequency 新增 export_logs 表（T08-02=B）
  - 要点 3：图表技术 = 轻量图表库（unovis / frappe-charts）（T08-03=C）
  - 要点 4：Hover Tooltip + 点击跳转（T08-04=C）
  - 要点 5：默认固定时间范围，部分图表可展开（T08-05=C）
  - 要点 6：每图 CSV 导出（T08-06=B）
  - 要点 7：指标统一口径（来源/计算/边界/异常值） + 字数按纯正文（不含标题/代码块/公式）（T08-07=D+补充）
  - 要点 8：多层刷新（实时/会话/日级）+ 错峰计算 + requestIdleCallback（T08-08=D+补充）
  - 要点 9：数据缺口可见 + 重算 + 异常来源入口（T08-09=D+补充"统计可信"）
  - 要点 10：洞察行动化 + Hub/Workstation 强联动 + 建议动作（T08-10=D+补充）
  - 要点 11：图表大数据降级 + Web Worker 预计算 + maxSampleSize 声明（T08-11=D+补充）
  - 要点 12：归档文档不参与统计（L1-44 D）
  - 要点 13：字数统计 = 正文 + 标题 + 选中（EditorStatusBar 显示 3 档；T08 字数口径用纯正文）（S-06=C+T08-07）
- **预计章节目录**：
  1. 洞察信息架构
  2. 指标字典（metrics-dictionary，作为附件）
  3. 6 个图表设计
  4. ExportFrequency 与 export_logs 表
  5. 图表库选型
  6. 交互模型（Hover/Click/跳转）
  7. 时间范围模型（固定/可展开）
  8. CSV 导出
  9. 指标口径定义
  10. 多层刷新调度器
  11. Web Worker 预计算
  12. 数据完整性与缺口展示
  13. 异常值处理与重算入口
  14. 洞察行动化 API
  15. 归档过滤
  16. 字数统计联动 StatusBar
  17. 验收矩阵
- **依赖的新 Spec**: 11-document-lifecycle（归档/状态过滤）、27-performance-slo、33-diagnostic-logging-spec（export_logs）

---

## 2.9 09-ui-polish-spec.md（T09 UI 打磨）

- **升级幅度**: **中等**（新增动画分级/密度策略/设计语汇字典）
- **拆分决策**: 拆为 `09-prd-ui-polish.md` + `09-spec-ui-polish.md` + 独立 `design-language.md`（设计语汇字典）
- **升级要点**:
  - 要点 1：暗色 100% 覆盖（T09-01=A）
  - 要点 2：页面切换全套动画 fade/slide-left/slide-right（T09-02=A）
  - 要点 3：面板宽度过渡 250ms ease（T09-03=A）
  - 要点 4：各组件自定义空状态（T09-04=A）— 但受 T09-13 D 设计语汇约束
  - 要点 5：Z-index 固定数值标准（Modal=300, Tooltip=200, ContextMenu=250, Toast=400, Overlay=500）（T09-05=B）
  - 要点 6：自定义细滚动条 6px → 8px hover（T09-06=B）
  - 要点 7：Focus Ring 品牌红 2px outline + 2px offset（T09-07=B）
  - 要点 8：多设备预览参照 md.doocs.org（T09-08=C+补充）
  - 要点 9：动画按类别分级 + 自动降级（T09-09=D+补充）
  - 要点 10：Hub/Workstation/Settings 差异化密度，禁止后台表格感（T09-10=B+补充）
  - 要点 11：短加载用空状态文案（骨架屏极少）（T09-11=A+补充）
  - 要点 12：桌面鼠标优先（T09-12=A）
  - 要点 13：视觉一致性 D 级 + 严禁 emoji（T09-13=D+补充）
  - 要点 14：Ethereal Constructivism 设计语汇字典
  - 要点 15：主题切换分层过渡（L1-59 C）— 与 20-theme-font-typography 联动
- **预计章节目录**：
  1. 设计语汇字典（design-language）
  2. 颜色体系（亮/暗/品牌红）
  3. 字体体系（引用 FontSystem）
  4. 圆角 / 阴影 / 毛玻璃
  5. Typography 基调（引用 Typography）
  6. 页面切换动画
  7. 面板折叠动画
  8. 空状态设计准则（约束自定义实现）
  9. 滚动条样式
  10. Focus Ring
  11. Z-index 层级表
  12. 动画分级 + 自动降级
  13. 密度策略（每页 data-density）
  14. 骨架屏使用规则
  15. 多设备预览
  16. 禁止 emoji + 突兀新风格
  17. 一致性审查流程
  18. 暗色模式完整性检查清单
  19. 验收矩阵
- **依赖的新 Spec**: 20-theme-font-typography、34-layout-persistence

---

## 2.10 基线升级幅度统计

| 幅度 | 数量 | Spec |
|---|---|---|
| 大改 | 6 | 01-editor, 04-rendering, 05-toolbar, 06-account, 07-settings, 08-insights |
| 中等 | 3 | 02-hub, 03-keyboard, 09-ui-polish |
| 保留 | 0 | （9 份全部有改动） |

---

# §3 新增 Spec 完整清单

> 规则：
> - 重量级（预计 >500 行规范 / 独立模块）
> - 中等（200~500 行 / 单组件或单流程）
> - 并入小增强（写入已有 Spec）
> 文件编号从 10 开始。

## 3.1 重量级新 Spec（20 份）

| # | 文件名 | 范围 | 来源题号 | 预计篇幅 | 依赖 |
|---|---|---|---|---|---|
| 10 | `10-markdown-authority-spec.md` | Markdown 表达权威 vs HTML 持久化权威双层定义；YAML frontmatter + DB 镜像；Round-trip 契约；非标准 Markdown 可移植性标注 | L1-05, L1-06, L1-07, L1-08, L1-09, L1-30, L1-32 | 600~900 行 | 无（基础） |
| 11 | `11-document-lifecycle-spec.md` | 6 态 FSM（草稿→写作中→待审阅→待发布→已发布→归档）；软删除/回收站/过期/审计；批量状态变更；归档冷存储；收藏虚拟分类 | L1-41, L1-42, L1-43, L1-44, F-02 | 700~1000 行 | 10, 24 |
| 12 | `12-file-manager-spec.md` | 多层嵌套分类 + 虚拟分类；批量操作；多维度排序；智能文件夹；3 种视图（列表/网格/看板）；自定义字段列；文档属性弹出面板 | F-01, F-02, F-03, F-06, F-08, L1-43 | 800~1100 行 | 11, 18 |
| 13 | `13-workstation-layout-spec.md` | 左栏 Tab（FileManager + VersionHistory + TOC）；右栏 = 仅预览 + 可切换参考/分屏；布局按模式记忆；编辑器最大化；双视图并排对比 | W-01, W-02, W-03, W-04, W-05, W-06, L1-47 | 700~900 行 | 10, 18, 35 |
| 14 | `14-statusbar-navigation-spec.md` | StatusBar 完整信息架构 + 可关闭；全部区域可交互；不做面包屑；TabBar 增强（拖拽/中键/固定/悬停预览/跨窗口拖拽）；修改指示全栈；Sonner Toast + 撤销按钮 | N-01, N-02, N-03, N-04, N-05, N-06, L1-48, E-07 | 600~800 行 | 18, 11 |
| 15 | `15-export-publish-spec.md` | 每平台独立渲染链路（微信/小红书/知乎/HTML/Markdown）；导出预设；导出历史；剪贴板"复制为…"；TOC 可选；发布适配器协议；用户自定义渠道配置 | L1-30, L1-31, L1-32, P-01（推断 D）, P-02, P-03, P-04, P-05, P-06, T04-08 | 1000~1300 行 | 10, 16, 27 |
| 16 | `16-markdown-extensions-spec.md` | 脚注、多色高亮、[toc] 宏、Details 折叠、Emoji `:name:`、公式辅助输入（FormulaBuilder + 交叉引用）、内链 `[[文章名]]`、引用来源标注；Callout/Embed 延后 | M-02, M-03, M-04, M-05, M-06, M-07, M-08, M-01（延后声明）, EX-02, EX-10 | 800~1000 行 | 10 |
| 17 | `17-crash-recovery-spec.md` | beforeunload 紧急保存；Recovery Mode 启动检测；恢复向导 UI；诊断包导出（日志+环境+堆栈）；与 VersionHistory 联动；数据完整性校验后台 Worker；灾难自动恢复快照 | R-01, R-02, R-05, X-11, L1-19 | 800~1000 行 | 41 |
| 18 | `18-tauri-desktop-spec.md` | **聚合 3 份 Tauri 能力**：(a) 多窗口 + 跨窗口标签拖拽 + 窗口状态同步；(b) 文件系统集成（打开本地 md / 监控文件夹 / 冲突检测 / 外部修改刷新）；(c) 系统托盘 + 全局快捷键 + QuickNoteWindow + 自动更新仅通知 | L1-53, L1-54, L1-55, L1-56, EX-01, EX-09（延后声明） | 1100~1400 行 | 17, 11 |
| 19 | `19-ftue-help-spec.md` | 欢迎弹窗（无示例文档）；功能全可见；Markdown 速查卡；上下文气泡帮助（已读记忆）；引导版 Hub | L1-50, L1-51, L1-52, T02-15 | 400~600 行 | 02 |
| 20 | `20-theme-font-typography-spec.md` | ThemeEngine（内容区/UI 双轨主题）；导入/导出；分层过渡；FontSystem（开源字体 + 中英独立 + 用户导入）；Typography 完整面板；WritingAmbience（iA Writer 氛围模式） | L1-57, L1-58, L1-59, L1-60, L1-49 | 900~1200 行 | 无 |
| 21 | `21-focus-writing-assist-spec.md` | 专注模式（视觉极简但功能保留）；FocusSessionSummary；WritingGoal（文档 + 日/周跨文档）+ 动画 + 奖励；打字机模式；字数详细报告（段落/句子/词频）；WritingAmbience 联动 | L1-45, L1-46, L1-49, EX-06 | 500~700 行 | 20, 14 |
| 22 | `22-command-palette-spec.md` | 命令面板（统一搜索所有命令 + 最近 + 收藏 + 上下文排序）；与命令注册表复用；Chord 触发；EX-03 + EX-08 片段系统接入 | EX-03, EX-08, L1-27, T05-09 | 500~700 行 | 25, 03 |
| 23 | `23-sync-provider-spec.md` | 三 Provider 接口（WebDAV / Git / 自有服务）；Git 为主路径（文章目录即 repo）；冲突三方合并 UI；冲突审计日志；IndexedDB 为 primary；同步状态图标；行内级数据结构预留 | L1-20, L1-21, L1-22, T07-02 | 900~1200 行 | 10, 24, 17 |
| 24 | `24-permission-audit-spec.md` | 资源级权限（文档/文件夹/评论/版本/发布）；多 Profile 绑定；全范围审计（A+B+C+D）3 个月保留 + 可导出 + 用户可查；高危操作清单；批量操作留痕 | L1-33, L1-34, T05-12, X-10 | 700~900 行 | 26 |
| 25 | `25-extension-plugin-spec.md` | 完整插件 SDK（生命周期/权限/事件/UI 注入点）；沙箱；权限声明；扩展健康检查；出错自动禁用；安全模式；统一命令注册表 | L1-37, L1-38, EX-07, R-04 | 800~1000 行 | 17, 24 |
| 26 | `26-multi-account-profile-spec.md` | 每账户独立 DB + 文件根；多窗口并行；共享区（模板/导出预设/AI 配置）；首启分流；账户切换 reload；高级认证（本地密码 + Windows Hello）；资源级权限 | L1-23, L1-24, T06 全部, L1-33 | 900~1200 行 | 06, 24 |
| 27 | `27-performance-slo-spec.md` | 硬 SLO 定义（输入 0ms / 保存 ≤1s / 冲突检测 ≤10s / 导出 ≤3min / Lighthouse >80）；能力分级（可关闭/必须保真/可后台）；动画自动降级；图表降级；性能预算；CI Lighthouse | L1-35, L1-36, X-05, T09-09, T08-11 | 500~700 行 | 无 |
| 28 | `28-asset-pipeline-spec.md` | 资产统一管线（拖拽/粘贴/按钮/截图/GIF/SVG/远程 URL）；去重（内容哈希）；命名；大小阈值；引用计数；孤儿检测；存储统计；一项目一文件夹物理模型；Tauri 文件系统集成 | T05-11, F-04 | 700~900 行 | 18, 11 |
| 29 | `29-search-engine-spec.md` | 全文搜索（flexsearch/minisearch）；标题+正文+标签+分类+摘要+评论+模板+导出记录+版本+资源；DSL 高级语法（`tag:xxx status:draft`）；搜索历史；上下文片段与高亮；与 SmartFolder 共用 query 层；与 CommandPalette 复用 | S-03, S-12, F-07 | 600~800 行 | 11, 12, 22 |

## 3.2 中等新 Spec（27 份）

| # | 文件名 | 范围 | 来源题号 | 预计篇幅 | 依赖 |
|---|---|---|---|---|---|
| 30 | `30-trash-recycle-spec.md` | 回收站（过期 30 天 / 手动清空 / 容量统计 / 审计 / 与版本历史联动） | L1-42 D | 250 行 | 11, 24 |
| 31 | `31-version-bundle-spec.md` | DocumentVersionBundle（正文+资源引用+导出参数+评论锚点）；diff 存储（diff-match-patch）；无限版本；内存占比警告清理；Version Diff 视图；恢复 = diff/merge 双栏；所有状态跟随恢复 | L1-17, L1-18, X-07, X-09, EX-05 | 400 行 | 10, 14 |
| 32 | `32-comment-review-spec.md` | 评论锚点行内级（字符级）；漂移算法；审阅三态（Comment / Request Changes / Approve）；与 VersionBundle 联动 | L1-14, L1-15, L1-16 | 350 行 | 31, 18 |
| 33 | `33-diagnostic-logging-spec.md` | ActivityLogger（7 天 IndexedDB）；性能指标采样；DiagnosticPackage 导出；全局错误四层（提示/可恢复/阻断/数据风险）；全局 errorHandler + Toast；export_logs | G-13, R-02, X-03, T08-02 | 400 行 | 14 |
| 34 | `34-layout-persistence-spec.md` | 布局按模式记忆（Typora/Source/Preview 各独立）；编辑器最大化；面板折叠动画 | W-03, W-05 | 200 行 | 13 |
| 35 | `35-split-view-spec.md` | 右栏模式切换器（预览/参考/分屏）；同文档双视图；两文档并排对比 | W-06 | 300 行 | 13 |
| 36 | `36-wiki-link-spec.md` | `[[文章名]]` 语法 + 自动完成 + 跳转 + 反向链接索引 | EX-02 | 200 行 | 29, 10 |
| 37 | `37-snippet-system-spec.md` | 片段系统（变量/命令/快捷键）；模板变量；与 CommandPalette 复用 | EX-08 | 250 行 | 22 |
| 38 | `38-toc-system-spec.md` | TOCPanel（左栏 Tab + 实时高亮 + 折叠 + 拖拽重排章节）；TOCMacro（正文内 `[toc]` 节点）；ExportTOC 选项 | W-02, M-04, P-04 | 400 行 | 13, 16 |
| 39 | `39-sync-scroll-spec.md` | 双向同步滚动；节点映射；临时解除按钮 + 快捷键；性能优化 | W-04 | 200 行 | 13 |
| 40 | `40-dev-panel-spec.md` | 开发者面板（TipTap JSON / PM state / Store viewer / 性能面板 / 事件流 / IndexedDB Inspector）；隐藏激活 | R-03 | 300 行 | 25, 17 |
| 41 | `41-settings-migration-spec.md` | schema version 管理；自动迁移；差异预览；回滚点；废弃提示 | T07-10 | 250 行 | 无 |
| 42 | `42-templates-spec.md` | 模板 CRUD；使用；TemplateMarketCard 真实化；模板版本化且升级不反向污染已有文章 | S-01, S-11 | 400 行 | 10, 11 |
| 43 | `43-drafts-box-spec.md` | 草稿箱（过期提醒 + 多入口 + QuickNoteWindow 归入） | F-05, L1-55, EX-01 | 250 行 | 18, 42 |
| 44 | `44-import-wizard-spec.md` | 导入 .md + .docx（mammoth.js）；冲突策略（自动重命名/合并/跳过/新分类）；规则模板可保存复用 | S-08, S-13 | 400 行 | 10, 11, 28 |
| 45 | `45-tabbar-enhancement-spec.md` | TabBar 拖拽排序 + 中键关闭 + 右键菜单 + 固定 + 悬停预览 + 跨窗口拖拽 | S-09, N-04 | 350 行 | 18 |
| 46 | `46-draggable-ordering-spec.md` | FileManager 文章/分类拖拽排序；schema order 字段；虚影跟随 | S-02, E-03 | 300 行 | 12 |
| 47 | `47-tag-system-spec.md` | 标签对象化（id/name/color/parentId/aliases）；分组/层级/别名；与模板/搜索/洞察联动；与分类职责区分 | S-05, S-14 | 400 行 | 12, 29 |
| 48 | `48-session-restore-spec.md` | 多标签会话恢复（editor_sessions 表）；每 tab 光标/滚动/折叠/预览；账户/工作区隔离；性能优于 Word；降级不触正文 | S-15, L1-53 | 350 行 | 45, 26 |
| 49 | `49-editor-keymap-spec.md` | 列表 Enter = 减少缩进（Notion 风格）；Tab 上下文；撤销逻辑分组；多光标 Ctrl+D；自定义 TipTap keymap | E-01, E-06, E-10, T03-07 | 250 行 | 03 |
| 50 | `50-smart-punctuation-spec.md` | 智能标点（引号/破折号等）每条独立开关 + PanguSpacing 中英文空格 | E-02 | 200 行 | 无 |
| 51 | `51-block-drag-handle-spec.md` | 块级拖拽 + 列表项拖拽 + 蓝色插入线 + 虚影跟随 | E-03 | 250 行 | 46 |
| 52 | `52-table-extension-v2-spec.md` | Tab 导航 + 拖拽列宽 + 对齐 + 横向滚动 + 与 Markdown pipe 双向转换 | E-05 | 400 行 | 10 |
| 53 | `53-image-extension-v2-spec.md` | 图片交互（大小/对齐/替换/alt/说明文字/画廊/删除）；Figure+Caption 节点 | E-09 | 300 行 | 28 |
| 54 | `54-custom-css-spec.md` | Settings > Advanced 下 CSS 编辑器；沙箱；与 ThemeEngine 隔离；错误回滚 | EX-07 | 200 行 | 20, 25 |
| 55 | `55-updater-spec.md` | Tauri Updater（仅通知不强推） | L1-56 | 150 行 | 18 |
| 56 | `56-citation-spec.md` | 引用来源标注（Blockquote 节点扩展 + source URL + 三层来源区分：事实/推断/手写） | EX-10, L1-26 | 300 行 | 10, 16 |

## 3.3 并入现有 Spec 的小增强（8 项）

| # | 内容 | 并入 |
|---|---|---|
| a | 多色高亮 + 工具栏选色 | 05-spec-toolbar、16-markdown-extensions |
| b | 链接 Tooltip 操作按钮（编辑/复制/取消） | 05-spec-toolbar |
| c | 字数统计三档（正文/标题/选中） | 14-statusbar-navigation + 08-insights |
| d | Auto-save 视觉指示全栈（StatusBar + TabBar + 关闭前确认） | 14-statusbar-navigation |
| e | 滚动条 / Focus Ring / Z-index / 密度 | 09-ui-polish + design-language.md |
| f | Hub Header 头像气泡菜单 | 02-spec-hub + 26-multi-account-profile |
| g | 写作目标 Hub Insights 卡片 | 02-spec-hub + 21-focus-writing-assist |
| h | 引言卡片 AI 生成 + 用户句子混合 | 02-spec-hub |

## 3.4 新增 Spec 数量汇总

- 重量级新 Spec：**20 份**
- 中等新 Spec：**27 份**
- 并入现有 Spec 的小增强：**8 项**
- 新增 Spec 总计：**47 份**（独立文件）
- 小增强总计：**8 项**
- 所有 Spec（含基线 9 拆分后 + 新增 47）：**基线 9 → 基线升级 9（各自含 PRD + Spec 两份 → 18 份） + 新增 47 = 65 份**（规划口径；取决于是否把 PRD/Spec 分立计算）
- 截至 `2026-04-22`，`prompts/0420` 当前实际文件树已落盘 `63` 份 `specs/*.md`、`9` 份根目录 Markdown、`5` 份 `_extracted` Markdown；当前导航与真实文件名以 `README.md`、`specs-index.md` 与 `specs/00-wave1-current-truth.md` 为准。

---

# §4 依赖关系图（文本形态）

## 4.1 基础层（无依赖）

```
10-markdown-authority        ← 所有渲染/导出/编辑的权威
20-theme-font-typography     ← 所有 UI 的视觉底座
27-performance-slo           ← 所有模块的性能闸门
41-settings-migration        ← 所有设置变动的兜底
50-smart-punctuation         ← 独立扩展
```

## 4.2 核心基础设施（依赖基础层）

```
10-markdown-authority
  ↓
  01-editor-ui, 04-rendering, 16-markdown-extensions, 52-table-ext-v2

27-performance-slo
  ↓
  全部模块（作为 SLO 验收闸门）

20-theme-font-typography
  ↓
  09-ui-polish, 21-focus-writing-assist, 54-custom-css
```

## 4.3 数据层

```
17-crash-recovery
  ↓
  11-document-lifecycle, 23-sync-provider, 31-version-bundle

11-document-lifecycle
  ↓
  12-file-manager, 02-hub, 08-data-insights, 30-trash-recycle, 42-templates

31-version-bundle
  ↓
  32-comment-review, 32 下发恢复能力到 17-crash-recovery

24-permission-audit
  ↓
  05-toolbar (命令权限), 06-account, 25-extension-plugin, 26-multi-account-profile
```

## 4.4 UI 层

```
18-tauri-desktop
  ↓
  45-tabbar-enhancement (跨窗口拖拽), 
  43-drafts-box (QuickNote), 
  55-updater, 
  28-asset-pipeline (Tauri FS), 
  48-session-restore (多窗口)

13-workstation-layout
  ↓
  34-layout-persistence, 35-split-view, 38-toc-system, 39-sync-scroll

14-statusbar-navigation
  ↓
  45-tabbar-enhancement, 21-focus-writing-assist

12-file-manager
  ↓
  46-draggable-ordering, 44-import-wizard, 47-tag-system, 29-search-engine
```

## 4.5 编辑器能力层

```
01-editor-ui
  ↓
  49-editor-keymap, 50-smart-punctuation, 51-block-drag-handle, 
  52-table-ext-v2, 53-image-ext-v2, 32-comment-review

16-markdown-extensions
  ↓
  38-toc-system, 36-wiki-link, 56-citation

05-toolbar-complete (命令注册表)
  ↓
  22-command-palette, 25-extension-plugin, 37-snippet-system, 
  28-asset-pipeline, 40-dev-panel
```

## 4.6 输出层

```
15-export-publish
  ↓
  依赖 10, 16, 27；
  下发给发布渠道（微信/小红书/知乎/HTML/Markdown）；
  链接到 42-templates（模板 snapshot）、31-version-bundle（版本导出参数）
```

## 4.7 入口层（Entry Points）

```
02-hub (首页) —— 依赖 11, 12, 08, 19
03-keyboard-shortcuts —— 依赖 22, 26, 37
07-settings —— 依赖 20, 23, 24, 25, 41
06-account —— 依赖 17, 23, 24, 26
```

## 4.8 横切关注点

```
33-diagnostic-logging        ← 被 14, 17, 23, 24, 40 共用
27-performance-slo           ← 被所有模块共用
24-permission-audit          ← 被 05, 06, 25, 26 共用
```

---

# §5 实施阶段划分（6 个 Phase）

> 所有阶段共同约束：G-14 D（验收证据矩阵 + 正向/失败/恢复/边界四种样本）、X-12 D（机器测试先行 + 截图/日志/对比样本）、X-05 C（Lighthouse > 80）。

---

## Phase 1 — 基础设施与权威模型

**前提条件**: 无（从 main 起分支，G-02 C 每 Task 一独立 feature/PR）

**本阶段 Spec 清单**:
- 10-markdown-authority
- 20-theme-font-typography
- 27-performance-slo
- 41-settings-migration
- 33-diagnostic-logging（全局错误四层 + 日志）
- 17-crash-recovery（基础骨架）
- 24-permission-audit（接口骨架）
- design-language.md（设计语汇字典）
- metrics-dictionary.md（指标口径字典）

**本阶段交付产物**:
- 代码：`src/core/authority/`（权威模型）、`src/styles/theme/`（ThemeEngine 基础）、`src/services/logger/`（四层错误）、`src/services/migration/`（schema 迁移）、`src/services/recovery/`（beforeunload + 启动检测骨架）、`src/services/permissions/`（接口）、`.lighthouserc.json`
- 测试：Vitest 单测（权威模型/迁移/logger），Lighthouse CI 配置
- 文档：10/20/27/41/33/17/24 Spec + design-language + metrics-dictionary

**验收门槛**:
- 权威模型在空文档下可序列化/反序列化所有 19 类元素
- ThemeEngine 亮/暗切换 + 内容区/UI 双轨分离 demo 可用
- Lighthouse CI 接入并跑 baseline
- 全局错误四层 + 错误边界接入 App.vue
- beforeunload 紧急保存写入 localStorage 可恢复
- 迁移 dry-run 报告差异可正确显示

**后续阻塞列表**: Phase 2 所有 Spec（权威模型未定稿则无法进入编辑器改造）

---

## Phase 2 — 编辑器核心三件套 + 渲染权威

**前提条件**: Phase 1 全部验收通过

**本阶段 Spec 清单**:
- 01-editor-ui（Typora + 19 元素 + 双模式）
- 04-rendering-core（KaTeX / Mermaid / 代码高亮）
- 16-markdown-extensions（脚注/高亮/TOC/Details/Emoji/公式/Wikilink/Citation）
- 49-editor-keymap
- 50-smart-punctuation
- 51-block-drag-handle
- 52-table-extension-v2
- 53-image-extension-v2
- 56-citation
- 36-wiki-link
- 31-version-bundle（版本基础）
- 32-comment-review（评论锚点框架）

**本阶段交付产物**:
- 代码：TipTap 扩展全部重构（TyporaMode、MarkdownHints 增强、19 元素 NodeView）、Source 模式 vue-codemirror 集成、Math/Mermaid 扩展、渲染链路、Version Bundle 存储
- 测试：19 元素 × 3 模式 × 正向/失败 Playwright E2E（T01-15 A 要求）
- 验收：Round-trip 测试（四模式无损往返 + 19 元素逐项覆盖）

**验收门槛**:
- 19 元素在 Typora/Source/Preview 模式下无损 round-trip（硬门槛 C+）
- 模式切换选区/撤销栈/评论锚点/版本点全部继承
- KaTeX + Mermaid + 代码高亮三端一致
- 输入延迟 = 0（用户感知不到）
- Version Bundle 保存/恢复/diff/merge 双栏可用
- 评论锚点跨版本漂移算法通过 edge case 测试

**后续阻塞列表**: Phase 3、4、5 的 UI 能力（编辑器核心不稳则无法支撑上层）

---

## Phase 3 — UI 外壳与工作区

**前提条件**: Phase 2 全部验收通过

**本阶段 Spec 清单**:
- 13-workstation-layout
- 14-statusbar-navigation
- 34-layout-persistence
- 35-split-view
- 38-toc-system
- 39-sync-scroll
- 02-hub（升级）
- 19-ftue-help
- 21-focus-writing-assist
- 45-tabbar-enhancement
- 09-ui-polish
- 03-keyboard-shortcuts（升级）
- 22-command-palette
- 05-toolbar-complete（升级，含命令注册表中枢）
- 37-snippet-system
- 25-extension-plugin（SDK 骨架）
- 40-dev-panel
- 54-custom-css

**本阶段交付产物**:
- 代码：WorkstationView 四栏布局、SplitView、TOCPanel、SyncScroll、HubView 升级、FTUE、FocusMode、TabBar 增强、命令注册表中枢、CommandPalette、ChordHintOverlay、FindReplace、SnippetSystem、扩展 SDK、DevPanel、CustomCSS 编辑器
- 测试：Playwright E2E（Hub 引导版 / 常规版切换、模式切换布局记忆、SplitView、TOC、FindReplace、CommandPalette）

**验收门槛**:
- Hub 首启走引导版 + 做完首动作切常规版；卡片优先级 Hero+Recent+Stats 小屏必保
- Workstation 左栏三 Tab + 右栏模式切换可用
- 布局按 Typora/Source/Preview 独立记忆
- 命令注册表承担四域（编辑/系统/AI/发布）+ 权限 + 审计 + 回滚 + 搜索排序
- Chord 多段快捷键可录制 + 可视化提示
- 扩展 SDK 可加载 hello-world 扩展 + 沙箱 + 权限声明 + 健康检查

**后续阻塞列表**: Phase 4 的数据与多账户能力（UI 外壳不稳则无法测试账户切换）

---

## Phase 4 — 文件管理、数据与多账户

**前提条件**: Phase 3 全部验收通过

**本阶段 Spec 清单**:
- 11-document-lifecycle
- 12-file-manager
- 30-trash-recycle
- 46-draggable-ordering
- 47-tag-system
- 42-templates
- 43-drafts-box
- 44-import-wizard
- 28-asset-pipeline
- 29-search-engine
- 26-multi-account-profile
- 06-account（升级）
- 48-session-restore
- 08-data-insights（升级）
- 18-tauri-desktop（多窗口 + 文件桥 + 系统集成）
- 55-updater

**本阶段交付产物**:
- 代码：FSM 6 态、FileManager 三视图 + 拖拽、TrashCan、TagSystem、TemplateSystem（含版本化且不反向污染）、DraftBox、ImportWizard、AssetPipeline、SearchEngine（DSL + 多对象索引）、多账户 Profile（独立 DB + 文件根）、多窗口 + 跨窗口标签拖拽、Tauri FileBridge、SystemTray、QuickNoteWindow、Updater（仅通知）、6 新图表 + Web Worker 预计算 + metrics-dictionary 实现、SessionRestore
- 测试：Playwright E2E 覆盖 FSM 迁移 / 回收站恢复 / 多账户切换 reload / 多窗口并行 / 外部文件修改冲突检测 / 搜索 DSL / 导入向导

**验收门槛**:
- FSM 6 态可迁移 + 过滤 + 看板视图可用
- 软删除 7 天可恢复，彻底删除进审计
- 多账户切换 = reload；autosave 失败时阻止切换
- 多窗口跨窗口标签拖拽正确
- 外部文件修改触发冲突检测 UI
- QuickNoteWindow 全局快捷键唤起并归入草稿
- SearchEngine 索引 10 种对象（文章/标签/分类/摘要/评论/模板/导出记录/版本/资源/导入记录）
- 6 图表 + metrics 口径（纯正文字数）+ Web Worker 预计算稳定

**后续阻塞列表**: Phase 5 的同步与导出（数据层不稳则同步/导出无源）

---

## Phase 5 — 同步、导出与发布

**前提条件**: Phase 4 全部验收通过

**本阶段 Spec 清单**:
- 23-sync-provider（WebDAV + Git + 自有服务三 Provider）
- 15-export-publish（含 PublishAdapter + 导出历史 + 剪贴板）
- 07-settings（升级，含 Sync Tab + Data Tab + Advanced Tab 全量）
- 32-comment-review（完整审阅三态）

**本阶段交付产物**:
- 代码：GitSyncService（主路径，文章目录即 repo）、WebDAVSyncService（副路径）、LocalServerSyncService（MVP 骨架）、三方合并 UI、审计日志、PublishAdapter 接口 + 5 渠道实现（微信/小红书/知乎/HTML/Markdown）、ExportHistory、ClipboardPipeline（复制为 text/HTML/Markdown）、Settings 全量 Tab
- 测试：Playwright E2E（Git 双端拉/推/冲突三方合并 + 导出每平台 + 剪贴板多格式）

**验收门槛**:
- Git 同步主路径通过双端冲突 E2E
- WebDAV 副路径通过基本 CRUD
- 冲突必走用户决策 UI + 审计日志留痕
- 5 平台导出保真度通过黄金样本对比
- 导出历史可重导
- Settings 搜索/迁移/重置三级 + 回滚点完整
- Sync 时文档版本包（正文 + 资源 + 导出参数 + 评论锚点）完整还原

**后续阻塞列表**: Phase 6 验收（若同步/导出有漏则全局验收不通过）

---

## Phase 6 — 恢复、诊断、验收证据化与交付

**前提条件**: Phase 5 全部验收通过

**本阶段 Spec 清单**:
- 17-crash-recovery（完整落地）
- 40-dev-panel（完整落地）
- R-05 数据完整性校验（DataIntegrity 子章节）
- 全局验收矩阵（X-12 D）

**本阶段交付产物**:
- 代码：RecoveryMode UI、DiagnosticPackage 导出、DataIntegrity Worker、SafeMode 启动参数、完整 DevPanel（TipTap JSON / PM state / Store / 性能 / 事件流 / IndexedDB Inspector）
- 验收证据：`artifacts/<task-id>/` 每 Task 截图 + 日志 + 导出样本 + 对比样本 + 失败样本 + 恢复样本 + 边界样本
- 最终验收矩阵：acceptance-matrix.md

**验收门槛**:
- 模拟崩溃场景（kill process / OOM / DB 损坏）全部能恢复且不丢文章（X-11 C 底线"文章不能丢"）
- 数据完整性 Worker 后台校验不影响前台性能（R-05 补充性能要求）
- DevPanel 隐藏激活 + 生产构建保留
- acceptance-matrix 涵盖所有 P0/P1 Task 的正向 + 失败 + 恢复 + 边界四种样本
- `pnpm build` + `vue-tsc --noEmit` 零错误
- Lighthouse Performance > 80
- 所有 SLO（输入 0ms / 保存 1s / 冲突 10s / 导出 3min）在自动化测试中达标

**后续阻塞列表**: 无（v2.1 发布）

---

## 5.7 阶段划分数量：**6 个 Phase**

---

# §6 风险登记册

## 6.1 高风险（必须缓解）

| # | 风险 | 来源 | 触发概率 | 影响 | 缓解措施 |
|---|---|---|---|---|---|
| H1 | Git 同步与 IndexedDB source of truth 未定：若 .md 文件与 DB 同时被修改，数据归属模糊 | T07-02 D + X-04 B + X-11 C 交叉 | 高 | 数据丢失或重复 | 在 23-sync-provider Spec 首章硬性声明 **IndexedDB 为 primary，Git 文件为 derived**；Git 仓库的 .md 每次提交前由 DB 重新序列化 |
| H2 | Markdown 表达权威 vs HTML 运行时持久化权威双层定义若不落地，全产品权威链路崩溃 | L1-05 A vs L1-06 D 矛盾 | 高 | 渲染失真 / 导出失真 / round-trip 丢数据 | Phase 1 优先完成 10-markdown-authority Spec，冻结双层契约；所有后续 Spec 在元数据中声明遵循 |
| H3 | 19 元素无损 round-trip 硬门槛与 Source/Preview/Export 四模式组合的测试组合爆炸 | L1-08 C+补充"所有元素必须无损" | 高 | 验收无法通过 | Phase 2 必须建立 19×4 黄金样本矩阵 + Playwright 自动回归 |
| H4 | Sync 必须落地 3 个 Provider 的工期压力与测试复杂度 | L1-20 D+补充 | 高 | 延期或以牺牲质量交付 | Phase 5 先行 Git 主路径 E2E 通过；WebDAV 和自有服务走 MVP 级；但三者接口骨架必须在 Phase 4 已 ready |
| H5 | 多账户 + 多窗口 + 跨窗口标签拖拽 + SessionRestore 四者耦合 | L1-23/24 D + L1-53 C + S-15 D | 高 | 状态泄漏 / 崩溃恢复失败 | 在 26-multi-account-profile + 48-session-restore 中先做 state diagram 严格建模；单窗口场景跑通后再并行 |
| H6 | 扩展 SDK 完全开放（L1-37 D）+ 沙箱（L1-38 C）的安全 - 灵活性冲突 | L1-37 D vs L1-38 C | 中-高 | 扩展作恶 / 性能崩溃 / 数据泄漏 | 25-extension-plugin 必须定义完整权限清单 + 细粒度声明 + R-04 自动禁用出错扩展 + SafeMode |
| H7 | 安全沙箱选择 A 级（T04-15）缺乏统一兜底层，XSS/注入风险留给各 exporter 自律 | T04-15 A+补充 | 中-高 | 发布到平台后安全事件 | 在 15-export-publish 中强制要求每个 PublishAdapter 单独申报安全规则清单，并由 audit 层抽检 |

## 6.2 中风险（需监控）

| # | 风险 | 来源 | 缓解 |
|---|---|---|---|
| M1 | Lighthouse >80 与全量图表库 + 180 种语言 + 所有动画冲突 | X-05 C vs T08-01 A + T04-07 C + T09-02 A | 27-performance-slo 强制能力分级 + T09-09 D 自动降级 + T08-11 D Worker 预计算 |
| M2 | 冲突粒度 L1-21 D 与补充"实际需要 C 级"自相矛盾 | L1-21 D + 补充 | 本轮按 D（文档级）实现，但数据结构预留 C 级粒度；远期可热迁 |
| M3 | 冲突解决 L1-22 D 与补充"一律用户解决"自相矛盾 | L1-22 D + 补充 | 默认尝试三方合并，即使成功也让用户确认；UI 始终展示三方合并结果供裁决 |
| M4 | 审计范围 L1-34 A+B+C 与补充"全范围"自相矛盾 | L1-34 + 补充 | PRD 按 D 落地（所有 AI/命令也留痕）；保留期 3 个月 |
| M5 | T02-01 Hero A（仅图表）vs T02-14 B（继续创作入口）冲突 | T02-01 vs T02-14 | Spec 明确 Hero = 图表 + 继续创作入口组合，Hero 新结构在 02-spec-hub 定稿 |
| M6 | T02-05 Onboarding C vs T02-15 引导版 Hub B 冲突 | T02-05 vs T02-15 | 采用 B：首启走引导版 Hub，做完首动作切常规版，拒绝独立 Onboarding 页 |
| M7 | T01-10 图片双击 C vs T01-18 统一光标进入 B 冲突 | T01-10 vs T01-18 | 图片统一采用 B（光标进入即编辑，离开即渲染）；T01-10 的 C 视为早期误选 |
| M8 | T04-08 C（不含 PDF）vs P-05 A（不做 PDF）一致但与"多渠道"期望有张力 | T04-08 + P-05 | 明确 v2.1 不做 PDF；v2.2+ 候选 |
| M9 | E-02 D 含自动链接 vs E-08 C 未选自动链接 | E-02 vs E-08 | 以 E-08 C 为准（不做自动链接），智能标点设置里"自动链接"默认关闭 |
| M10 | StatusBar 字段集 L1-48 B vs N-01 C 不一致 | L1-48 vs N-01 | 以 N-01 C 为准（阅读时长 + 纸张宽度 + 目标进度），不显示行列号 |
| M11 | 右栏职责 W-01 A（仅预览）vs W-06 D（并排对比）冲突 | W-01 vs W-06 | 引入"右栏模式切换器"（预览/参考/分屏对比），默认仅预览 |
| M12 | 空状态自由设计 T09-04 A vs 视觉一致性 T09-13 D 张力 | T09-04 vs T09-13 | 在 design-language.md 中建立"空状态设计准则"约束自定义实现 |

## 6.3 低风险（知悉即可）

| # | 风险 | 来源 |
|---|---|---|
| L1 | EX-04 "card-recent 已覆盖"认知差，需补充"最近文档"实际规范 | EX-04 |
| L2 | IME 合成期 T01-16 C 不做特殊冻结可能带来中文输入跳字 | T01-16 |
| L3 | 工具栏重度化 L1-12 B+补充 vs iA Writer 安静哲学 L1-39 A 张力 | L1-12 vs L1-39 |
| L4 | G-11 权威顺序字母缺失，以最新日期文档 + 逐项判定为折中 | G-11 |
| L5 | L1-28 命令系统权限与回滚题未填，按 D 级默认推断 | L1-28 |

## 6.4 风险总计：**22 条**（高 7 + 中 12 + 低 5；§6 要求 10-15 条，实际为加强覆盖略超上限，可按需裁剪）

---

# §7 Phase 3 产出文档清单（PRD + Spec 汇总）

> 命名约定：
> - PRD 文件：`XX-prd-<topic>.md`（产品需求，面向 PM / 设计 / 验收）
> - Spec 文件：`XX-spec-<topic>.md`（技术规范，面向工程实施）
> - 基础字典：`<topic>.md`（无前缀，作为附件字典）
> - 全部存放于 `prompts/0420/` 下，按 `phase-N/` 子目录或按编号平铺（推荐按编号平铺方便检索）

## 7.1 需要编写的 PRD 文件（基线 9 份 Task 各一份）

1. 01-prd-editor.md
2. 02-prd-hub.md
3. 03-prd-keyboard.md
4. 04-prd-rendering.md
5. 05-prd-toolbar.md
6. 06-prd-account.md
7. 07-prd-settings.md
8. 08-prd-insights.md
9. 09-prd-ui-polish.md

**PRD 小计：9 份**

## 7.2 需要编写的 Spec 文件

### 基线升级 Spec（9 份，对应 9 PRD）

1. 01-spec-editor-typora.md
2. 02-spec-hub-layout.md
3. 03-spec-keybindings.md
4. 04-spec-rendering-core.md
5. 05-spec-toolbar-contextmenu-slash.md
6. 06-spec-account-auth.md
7. 07-spec-settings-tabs.md
8. 08-spec-insights-charts.md
9. 09-spec-ui-polish.md

### 新增 Spec（47 份）

重量级 20 份：10~29（见 §3.1 表）
中等 27 份：30~56（见 §3.2 表）

### 基础字典 / 附件（3 份）

- design-language.md（设计语汇字典，§2.9 依赖）
- metrics-dictionary.md（指标口径字典，§2.8 依赖）
- acceptance-matrix.md（验收矩阵总表，Phase 6 依赖）

**Spec 小计：9（基线升级）+ 47（新增）+ 3（附件）= 59 份**

## 7.3 总文档数量

- PRD：9 份
- Spec：59 份（基线升级 9 + 新增 47 + 附件 3）
- **总计：68 份独立文档（Phase 3 规划口径）**

## 7.4 总预计字数

| 类别 | 份数 | 单份字数 | 合计 |
|---|---|---|---|
| 基线升级 PRD | 9 | ~3,000 字 | 27,000 字 |
| 基线升级 Spec | 9 | ~8,000 字 | 72,000 字 |
| 重量级新 Spec | 20 | ~6,500 字 | 130,000 字 |
| 中等新 Spec | 27 | ~2,500 字 | 67,500 字 |
| 附件字典 | 3 | ~4,000 字 | 12,000 字 |
| **总计** | **68** | — | **≈ 308,500 字** |

## 7.5 建议的文档命名约定与目录结构

> 注：以下目录结构是规划期产物布局示意；当前仓库已经收口为根目录索引文件 + 扁平 `specs/` 目录的真实落盘结构，不再存在独立 `prd/`、`spec/`、`dict/` 目录。继续开发时请以当前文件树而不是下方示意树为准。

```
prompts/0420/
├── 00-task-roadmap.md                   ← 本文件
├── _extracted/                           ← 问卷答案（源）
│   ├── 01-L1-answers.md
│   ├── 02a-L2-G-T01-T02.md
│   ├── 02b-L2-T03-T04-T05-T06.md
│   ├── 02c-L2-T07-T08-T09-X-S.md
│   └── 03-enhancement-answers.md
├── prd/                                  ← 9 份 PRD
│   ├── 01-prd-editor.md
│   ├── 02-prd-hub.md
│   ├── ...
│   └── 09-prd-ui-polish.md
├── spec/                                 ← 9 份基线升级 Spec + 47 份新增
│   ├── 01-spec-editor-typora.md
│   ├── ...
│   ├── 09-spec-ui-polish.md
│   ├── 10-markdown-authority-spec.md
│   ├── 11-document-lifecycle-spec.md
│   ├── ...
│   └── 56-citation-spec.md
├── dict/                                 ← 字典附件
│   ├── design-language.md
│   ├── metrics-dictionary.md
│   └── acceptance-matrix.md
└── artifacts/                            ← Phase 6 验收证据（代码实施后产出）
    └── <task-id>/
        ├── screenshots/
        ├── logs/
        ├── exports/
        └── samples/
```

## 7.6 文档模板要求（每份 PRD/Spec 强制字段）

所有文档开头必须包含：

```markdown
# <编号> - <标题>

> 文档类型: PRD | Spec | Dict
> 阶段: Phase N
> 依赖: <依赖 Spec 列表>
> 来源问卷题号: <L1-XX, TNN-XX, ...>
> 权威来源: 本 Spec 各条目在"权威来源表"章节逐条标记（文档 / 原型 / 代码 / 混合）
> 创建日期: 2026-04-20
> 最后更新: —

## 一、背景与目标
## 二、范围与边界（进 / 不进 / 延后）
## 三、详细规范 / 需求条目
...
## N-1、验收矩阵（含正向 / 失败 / 恢复 / 边界样本）
## N、权威来源登记表
```

---

# 文档末尾

**本路线图产出说明**:
- 已完整覆盖 0420 五份提取文件的 287 题决策
- 已对照 0327 九份 Spec 逐一判定升级幅度
- 已建立文件编号 10~56 的新增 Spec 清单
- 已绘制依赖关系图并划分 6 个实施阶段
- 已登记 22 条风险（高 7 / 中 12 / 低 5）
- 已输出 Phase 3 的 68 份文档清单（规划口径，PRD 9 + Spec 59）；当前已落盘文件树请回看 `README.md` 与 `specs-index.md`

**下一步建议**:
1. 在本路线图基础上，按 Phase 1 顺序先行产出基础层 Spec（10/20/27/41/33/17/24 + 两份字典）
2. Phase 1 Spec 评审通过后再进入 Phase 2 编辑器核心 Spec 编写
3. 所有矛盾项（§6.2 M2~M12）在对应 Spec 首章第一时间定稿，避免 Spec 间漂移
