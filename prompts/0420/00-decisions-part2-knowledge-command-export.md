# InkForge v2.1 规范化决策文档 · 第 2 部分

> **范围**: 知识增强(H) / 命令系统(I) / 导出发布(J) / 权限审计(K) / 性能规模(L) / 扩展插件(M)
> **来源**: prompts/0420/_extracted/ 下 5 份问卷提取
> **产出日期**: 2026-04-20
> **配对文档**: 第 1 部分 (产品定位/编辑器/评论/历史/同步/账户) — 另行产出
> **编写原则**:
> - 每项决策必须给出"最终结论"而非选项字母
> - 冲突项必须显式说明取舍理由
> - 术语统一：用 **文档 / 命令 / 入口 / 适配器 / Profile / 版本包** 等约定词
> - 所有落地点优先指向现有文件路径

---

## 约定术语表（用于本文档与后续 PRD/Spec）

| 术语 | 定义 | 等价/别名 |
| --- | --- | --- |
| 权威源 (Authoritative Source) | Markdown 文本是表达权威源；HTML 是运行时持久化权威 | Source of Truth |
| 文档版本包 (DocumentVersionBundle) | 正文 + 资源引用 + 导出参数 + 评论锚点的完整快照 | 版本包 / Bundle |
| Profile | 一个账户对应的完整数据单元（DB + 文件根 + 设置） | 账户工作区 |
| 命令 (Command) | 在 CommandRegistry 中登记的可执行单元，含 id/label/handler/enableWhen | — |
| 入口 (Entry) | 调用命令的 UI 通道：快捷键 / 斜杠 / 浮动工具栏 / 右键菜单 / Command Palette | Invocation Channel |
| 适配器 (Adapter) | 对外部平台（发布渠道、同步 Provider、知识源）的协议实现 | Provider / Connector |
| 高危操作 (Dangerous Action) | 删除文章、删除账户、重置、清缓存、导出全量、CSS/JS 注入等 | — |
| 三层引用 (3-Layer Citation) | 原始事实 / 模型推断 / 用户手写三类内容的强制区分 | — |
| 降级 (Degradation) | 能力保真失败时的回退策略（源码保留 / 占位 / 回退图像） | Fallback |

---

# 域 H | 知识增强与引用溯源

## 决策 H-01 | 知识源连接器采用"接口 + 渐进实现"模式

- **来源题**: L1-25 (D)
- **用户原始选择**: D —— "本地 + URL + 项目知识库 + 外部连接器（云文档/代码仓/数据库/第三方知识库）"
- **用户补充**: 空
- **规范化结论**:
  - 定义统一 `KnowledgeSourceAdapter` 接口，包含：`id / label / kind / auth / fetch / search / cite`
  - v2.1 必须交付的 Adapter 实现：
    1. **Local Text Adapter**（用户粘贴 / 拖拽的本地文本）
    2. **Local File Adapter**（.md / .docx / .txt / 图像 OCR 占位）
    3. **URL Fetch Adapter**（网页抓取 + 正文提取 + 清洗）
    4. **Local Knowledge Base Adapter**（InkForge Profile 内的历史文章作为知识源）
  - v2.1 以 **Stub 骨架 + 配置占位** 形式预留的 Adapter（不做真实调用）：
    5. Cloud Document Adapter（Notion / Google Docs 接口定义）
    6. Code Repo Adapter（GitHub / GitLab 接口定义）
    7. Database Adapter（SQL/NoSQL 结构化数据接口定义）
    8. Third-Party Knowledge Adapter（Obsidian / Logseq vault 接口定义）
  - Adapter 必须是可插拔扩展点：插件 SDK（决策 M-01）可注册新的 Adapter
- **硬约束**:
  - 必须：4 个实装 Adapter 在 v2.1 有完整垂直切片（UI 入口 + 抓取 + 预览 + 插入正文 + 引用卡片）
  - 必须：4 个 Stub Adapter 在 Settings > Knowledge Sources 显示为 "Coming Soon / Provider Configurable" 占位
  - 必须：所有 Adapter 调用都走沙箱 + 权限声明（对齐决策 M-02）
  - 必须：抓取失败必须走决策 G-13 的"数据风险错误"四层分级路径
  - 禁止：把 Stub Adapter 误导性标示为"已可用"
  - 禁止：v2.1 对任何 Stub Adapter 消耗网络请求或密钥配额
- **冲突处理**: L1-25 D 是激进范围，与本轮 scope 可行性（L1-03 B）存在张力。采用"接口完备 + 分级实现"降低风险：接口面 = D 级，实装面 = C 级。
- **落地点**:
  - `src/services/knowledge/adapter.ts`（接口定义）
  - `src/services/knowledge/adapters/{localText,localFile,urlFetch,localKB}.ts`（4 个实装）
  - `src/services/knowledge/adapters/stubs/`（4 个占位）
  - `src/views/settings/KnowledgeSourcesTab.vue`
  - `prompts/0420/spec/knowledge-source-adapter.md`（Spec 待建）

---

## 决策 H-02 | 三层引用强制区分与显示契约

- **来源题**: L1-26 (D + 补充), EX-10 (v2.1 实现)
- **用户原始选择**: L1-26 D —— "必须做到引用显示位置，导出时保留，发布时可隐藏"；EX-10 —— "正文内搜索引用/来源标注" 进入 v2.1
- **规范化结论**:
  - 定义三层引用标签：
    1. **FACT（原始事实）**: 从 Adapter 抓取到的原始摘录（URL / 本地文件路径 / 知识库条目）
    2. **INFERENCE（模型推断）**: AI 命令生成的内容（润色 / 续写 / 摘要 / 翻译）
    3. **MANUAL（用户手写）**: 无任何知识源/AI 标记的默认状态
  - 每个引用节点承载：`layer / source_id / source_uri / excerpt / created_at / adapter_id / confidence?`
  - 显示契约（三个维度可独立配置）：
    | 配置项 | 可选值 | 默认 |
    | --- | --- | --- |
    | 编辑器内显示位置 | inline-badge / right-margin / footnote-only / hidden | inline-badge |
    | 导出时保留 | 必须保留（硬约束） | **强制 true** |
    | 发布时显示 | 按平台可隐藏 / 转脚注 / 保留 inline | 按平台 PublishAdapter 默认 |
  - 引用跳转：单击打开"引用卡片"Popover（源文本 + 原文链接 + 再次抓取按钮 + 标记为已核实按钮）
- **硬约束**:
  - 必须：AI 命令生成的任何正文改动，必须自动打 INFERENCE 标签（对齐决策 I-06）
  - 必须：Adapter 插入的内容必须自动打 FACT 标签
  - 必须：导出管线不得丢失 layer 元数据（HTML 用 `data-citation-layer` 属性，Markdown 用 HTML 注释 `<!-- citation:FACT ... -->`）
  - 必须：发布适配器在发布前可按平台"隐藏 / 转脚注 / 保留"三选一处理
  - 禁止：三层标签互相覆盖（同一节点最多一层，后续编辑不得降级为 MANUAL 除非用户显式"去除引用标签"）
  - 禁止：导出/发布时隐式剥离 layer 数据
- **落地点**:
  - `src/editor/extensions/Citation/CitationMark.ts`（TipTap Mark 节点）
  - `src/editor/extensions/Citation/CitationPopover.vue`
  - `src/services/citations/registry.ts`
  - `src/services/export/citationTransform.ts`（导出/发布时的 layer 处理管线）
  - Spec 并入 EX-10 的 `CitationExtension` 规范

---

## 决策 H-03 | 引用卡片与原文跳转契约

- **来源题**: L1-26 (D)
- **规范化结论**:
  - 引用卡片 Popover 在编辑态、预览态、Stage 面板、导出 HTML 均必须渲染；仅发布时按 H-02 契约隐藏
  - Popover 结构：
    1. Layer Badge（FACT/INFERENCE/MANUAL 三色）
    2. Source Title + Source URI（可点击跳转）
    3. Excerpt（原文片段，可折叠长文本）
    4. Adapter Name + Captured Timestamp
    5. 操作区：`跳转原文 / 重新抓取 / 标记已核实 / 标记过期 / 去除引用 / 查看历史版本中的差异`
  - 原文跳转策略：
    - URL 类：在 Tauri WebView 的默认浏览器打开（不在应用内打开以避免沙箱逃逸）
    - 本地文件类：通过 Tauri 文件系统打开（Shell.open）
    - 知识库条目类：在当前应用内用"引用详情页"组件打开
  - 引用数据独立存储在 `citations` 表，通过 `article_id + node_uuid` 关联
- **硬约束**:
  - 必须：引用卡片支持跨版本历史的锚点漂移（与 L1-15 评论锚点使用同一漂移算法）
  - 必须：原文不可访问时显示 `[来源不可用]` 占位，但不得删除引用节点
  - 必须：重新抓取必须保留历史抓取版本（可回溯）
  - 禁止：本地文件跳转时调用 shell 任意命令
- **落地点**:
  - `src/db/schema.ts` 新增 `citations` 表
  - `src/services/citations/anchorDrift.ts`（复用 L1-15 漂移算法）
  - `src/editor/extensions/Citation/CitationPopover.vue`

---

## 决策 H-04 | 知识摄取的权限与审计

- **来源题**: L1-25 (D), L1-34 (A+B+C + "全范围"), L1-37/L1-38 (D / C)
- **规范化结论**:
  - 所有 Adapter 调用必须先经 **PermissionBroker**（决策 K-01）：
    - 本地文件 Adapter：首次访问目录时弹系统权限对话框 + 路径白名单
    - URL Fetch Adapter：需声明目标域名或正则，首次命中新域名需确认
    - 云文档 / 代码仓（Stub）：OAuth 授权 + scope 最小化
  - 所有 Adapter 调用必须写入审计日志（对齐决策 K-02 的全范围审计）：
    - event_type: `knowledge.fetch / knowledge.cite / knowledge.refresh`
    - 必含字段：`adapter_id / source_uri / profile_id / result_status / error?`
  - 第三方插件 Adapter 必须声明 `kind=network|fs|db|auth` 权限面（决策 M-02）
- **硬约束**:
  - 必须：用户可在审计日志中查询某文档的所有知识摄取事件
  - 必须：失败事件（网络错误 / 权限拒绝 / 内容被风控）写入数据风险错误级（G-13 四层）
  - 禁止：绕过 PermissionBroker 的私有 fetch 通道
- **落地点**:
  - `src/services/permissions/broker.ts`
  - `src/services/audit/logger.ts`
  - Audit schema 条目 `knowledge.*`

---

## 决策 H-05 | 知识增强输出的一致性门槛

- **来源题**: L1-26 (D + 补充)
- **规范化结论**:
  - 任何 AI 生成 / Adapter 摘录出的内容必须具备：
    - 引用卡片（H-02）
    - 原文跳转（H-03）
    - 审计记录（H-04）
    - 版本点（决策 I-06、X-10）
  - 三者缺一则拒绝落盘（UI 阻断 + Toast + 数据风险错误级）
- **硬约束**:
  - 必须：实现 `InsertCitedContent(command)` 统一封装函数，所有 AI/Adapter 写入都走此通道
  - 禁止：直接调用 `editor.commands.insertContent()` 插入含外源内容（必须走 `InsertCitedContent`）

---

# 域 I | 命令系统与快捷键

## 决策 I-01 | 四类命令分域 + 统一注册表 + 可组合工作流

- **来源题**: L1-27 (D + "四类分离"), T05-09 (D), EX-03 (v2.1), EX-08 (v2.1)
- **用户原始选择**:
  - L1-27 D："斜杠 + Command Palette + 工具栏/右键/快捷键统一映射 + 可组合命令流"，补充"必须做到区分编辑 / 系统 / AI / 发布四类命令"
  - T05-09 D："命令注册表承担权限、审计、回滚、搜索排序"
- **规范化结论**:
  - 建立唯一 `CommandRegistry`，全应用唯一 source of truth
  - 四大命名空间强隔离：
    | namespace | 用途 | 示例 |
    | --- | --- | --- |
    | `edit.*` | 正文编辑类 | `edit.bold / edit.heading1 / edit.table.insert` |
    | `system.*` | 应用级控制 | `system.settings.open / system.window.newTab / system.profile.switch` |
    | `ai.*` | AI / 自动化写操作 | `ai.polish / ai.continue / ai.translate` |
    | `publish.*` | 导出与发布 | `publish.wechat / publish.export.html / publish.copyAs.markdown` |
  - 命令元数据字段（强制）：
    ```ts
    interface Command {
      id: string;                     // "edit.bold"
      namespace: 'edit'|'system'|'ai'|'publish';
      label: string;                  // i18n key
      icon?: string;
      shortcut?: string;              // "Mod+B"
      enableWhen?: (ctx) => boolean;
      visibleWhen?: (ctx) => boolean; // T05-13 C
      requiresAuth?: 'none'|'password'|'systemAuth'; // T06-09 D
      requiresConfirm?: boolean;       // L1-40 C
      writesContent?: boolean;        // true 则走版本点 + 审计
      handler: (ctx) => Promise<CommandResult>;
      undo?: (ctx) => Promise<void>;
      fuzzyKeywords?: string[];       // 斜杠/Palette 搜索
    }
    ```
  - 可组合工作流：支持 `CompositeCommand`（一个命令串联多个子命令，原子性提交 / 回滚）
- **硬约束**:
  - 必须：任何入口（快捷键 / 斜杠 / 工具栏 / 右键 / Command Palette）触发同一命令得到一致结果
  - 必须：命令执行前后发射事件 `command:before / command:after / command:error` 供审计订阅
  - 必须：写数据的命令（`writesContent=true`）自动走版本点 + 审计（对齐决策 I-06）
  - 禁止：任何入口绕过 CommandRegistry 直接操作 Store / Editor（code review 强制检查）
  - 禁止：跨 namespace 隐式调用（`edit.*` 不得直接启动 `publish.*`，必须走 CompositeCommand 显式声明）
- **落地点**:
  - `src/services/commandRegistry.ts`（核心注册表）
  - `src/services/commandBus.ts`（事件总线）
  - `src/services/commandComposer.ts`（CompositeCommand）
  - `src/types/command.ts`（接口定义）
  - Spec: `prompts/0420/spec/22-command-palette-spec.md`

---

## 决策 I-02 | 入口分工契约（快捷键 / 斜杠 / 工具栏 / 右键 / Palette）

- **来源题**: L1-29 (A), T05-01 ~ T05-13, T05-07 (C), EX-03
- **用户原始选择**: L1-29 A —— "快捷键给熟练用户，斜杠给插入/创建，浮动工具栏只做选区格式化"
- **规范化结论**:
  | 入口 | 职责 | 消费的 namespace | 不允许承担的事 |
  | --- | --- | --- | --- |
  | 快捷键 | 熟练操作、高频动作 | 全部 4 类 | 首次探索、学习路径 |
  | 斜杠命令 `/` | 插入 / 创建 / 切换块级结构 | 主要 `edit.*insert / edit.block.*`，少量 `ai.insert.*` | 选区格式化、系统控制、发布 |
  | 浮动工具栏 | 选区格式化（粗体 / 斜体 / 颜色 / 高亮 / 链接） | 仅 `edit.*format / edit.link` | 创建块级元素、跨文档操作 |
  | 右键菜单 | 上下文补充 + 剪贴板 + 元素级操作 | 按上下文展示 `edit.*` 子集 + `system.clipboard.*` | 系统级设置、AI 工作流 |
  | Command Palette (EX-03) | 全局搜索所有命令 | 全部 4 类（按上下文过滤 visibleWhen） | 无限制但需显示分类 |
- **硬约束**:
  - 必须：斜杠命令**不得**承载创建类之外的命令（如"清空文档"这种系统命令不得出现在 `/` 列表）
  - 必须：浮动工具栏在无选区时不可见（选区结束即隐藏）；Typora/Source 模式下保持一致（T05-07 C）
  - 必须：右键菜单支持二级/三级嵌套（T05-08 B + "能做尽做"）；设计通用递归菜单组件
  - 必须：Command Palette 可搜索全部 4 类命令，搜索结果分组显示 namespace
  - 禁止：工具栏出现创建类命令（如"插入表格"应走斜杠）
  - 禁止：右键菜单重复呈现快捷键主路径上已有的命令（避免认知负担）
- **冲突处理**:
  - T05-08 B vs "能做尽做"补充：采用补充的"多级递归菜单"；B 只是最低保证，实际 UI 组件支持无限深度（但推荐不超过 3 级）
- **落地点**:
  - `src/components/editor/FloatingToolbar.vue`（已有，需剥离创建类命令）
  - `src/components/editor/SlashCommandMenu.vue`
  - `src/components/common/ContextMenu.vue`（递归多级组件）
  - `src/components/common/CommandPalette.vue`（EX-03 新增）

---

## 决策 I-03 | Ctrl+\ 语义解耦 + 全局快捷键映射表

- **来源题**: T03-06 (C), T03-07 (C), T03-08 (B), T01-11 (C), S-04 (A), L1-55 (C)
- **规范化结论**:
  - `Ctrl+\` → 专职**模式切换**（Typora ↔ Source ↔ Preview 循环）
  - `Ctrl+Shift+N` → 专职**清除格式**
  - `Ctrl+N` → 全局新建文章（Hub 与 Workstation 均生效）
  - `Ctrl+=` → 纸张宽度循环切换 + StatusBar 显示当前档（T01-11 C）
  - `Ctrl+Alt+N` → 全局快速笔记（L1-55 C + EX-01）→ 拉起 `QuickNoteWindow`
  - Tab 键行为（T03-07 C）：列表中缩进 / 代码块中插入 Tab / 其他位置切换焦点
  - IME 合成态（T03-08 B）：仅 `Ctrl+数字`（标题快捷键）在 `event.isComposing` 时 bypass；其他快捷键照常
- **硬约束**:
  - 必须：`src/config/keybindings.ts` 是默认快捷键的唯一声明源
  - 必须：用户自定义快捷键运行时热更新（T03-03 A），无需重启
  - 必须：冲突检测在录制时警告但允许覆盖（T03-04 A）
  - 必须：Ctrl+Alt+N 全局快捷键由 Tauri GlobalShortcut 注册（应用在后台时仍生效）
  - 禁止：Ctrl+\ 承担"清除格式"的任何行为（与旧版解耦）
  - 禁止：Web 调试态下注册 Tauri 独占快捷键（运行时检测 platform）
- **落地点**:
  - `src/config/keybindings.ts`
  - `src/composables/useKeybindings.ts`
  - `src/services/tauri/globalShortcut.ts`（Tauri 独占）

---

## 决策 I-04 | 快捷键作用域与 Chord 序列支持

- **来源题**: T03-09 (A), T03-10 (D), T03-11 (未选 / 补充), T03-12 (C), T03-13 (B)
- **规范化结论**:
  - 作用域策略：**全局统一优先（T03-09 A）**，不做分层作用域；未来再演进
  - Chord 序列（T03-10 D）：支持 VS Code 风格多段组合（如 `Ctrl+K Ctrl+S`），序列状态可视化浮层提示
  - 系统/OS 冲突策略（T03-11 未选 + 补充"不做 Web"）：
    - 最终结论：**仅走 Tauri/OS 层冲突规则，Web 版规则不设计**
    - 采用黑/灰/白三级：
      * 黑名单（禁覆盖）：OS 级系统快捷键（Win+L、Alt+Tab、Win+D、Alt+F4）
      * 灰名单（可覆盖但警告）：常见应用保留键（Ctrl+C/V/X/Z/Y/A/S/F）
      * 白名单（自由）：其余组合
  - 快捷键帮助系统（T03-05 C + T03-12 C）：Tooltip 风格浮窗（可搜索 + 内嵌录制按钮）
  - 失败提示（T03-13 B）：StatusBar 短提示"当前不可用"，不做 Toast/气泡
- **硬约束**:
  - 必须：Chord 进入中间状态时全屏可视化浮层提示（按键回显 + 候选命令列表）
  - 必须：快捷键帮助面板内可直接修改绑定（T03-12 C）
  - 必须：OS 黑名单键禁止覆盖（录制时阻断）
  - 必须：灰名单覆盖时强制警告 + 明确"不可移植风险"文案
  - 禁止：在 Web 调试态下假装处理 OS 冲突（Web 直接禁用 GlobalShortcut 相关 UI）
- **冲突处理**: T03-11 用户选项空缺，补充说"不做 Web"。本决策按 D 的"黑/灰/白名单"结构落地，但明确"仅 Tauri/OS 一套规则"，不为 Web 维护第二套。
- **落地点**:
  - `src/composables/useKeybindings.ts`（状态机 + Chord）
  - `src/components/common/ChordHintOverlay.vue`
  - `src/components/common/ShortcutTooltip.vue`
  - `src/components/settings/ShortcutsTab.vue`（扩展：支持录制 + 搜索）

---

## 决策 I-05 | FindReplace 与 Command Palette 的协作

- **来源题**: T03-01 (C), T03-02 (A), EX-03
- **规范化结论**:
  - **FindReplace** = 正文范围的文本搜索替换
    - 能力：正则 + 大小写 + 全词 + 上下一个跳转 + 匹配计数（T03-01 C）
    - 位置：编辑器右上角浮动面板（VS Code 风格，T03-02 A）
    - 快捷键：`Ctrl+F` 打开，`Ctrl+H` 打开替换
  - **Command Palette** = 全局命令搜索
    - 能力：跨 4 个 namespace 搜索命令 + 模糊匹配 + 分类显示
    - 位置：居中 Modal（居中弹出，宽 640px）
    - 快捷键：`Ctrl+Shift+P`
  - **GlobalSearch** (S-03) = 文章/标签/分类/评论/模板/版本/资源全文搜索
    - 快捷键：`Ctrl+P`（文件搜索）/ `Ctrl+Shift+F`（全文搜索）
  - 三者关系：互不重叠，UI 上有明显视觉区分（颜色 / 图标 / 布局）
- **硬约束**:
  - 必须：三个搜索面板 z-index 规范（FindReplace=200 / GlobalSearch=300 / Palette=310，避免层叠冲突）
  - 必须：FindReplace 与 FloatingToolbar 同时存在时，FloatingToolbar 自动隐藏
  - 禁止：Command Palette 混入文件搜索（保持语义纯粹）
- **落地点**:
  - `src/components/editor/FindReplace.vue`
  - `src/components/common/CommandPalette.vue`
  - `src/components/common/GlobalSearchModal.vue`

---

## 决策 I-06 | 命令执行的权限 / 确认 / 回滚 / 审计

- **来源题**: L1-28 (未填写 / 推断 D), L1-40 (C + "高危险操作二次确认"), T05-12 (D), X-10 (C)
- **用户原始选择**:
  - L1-28: **未填写**
  - L1-40 C: "C 级防呆 + 高危险操作二次确认"
  - T05-12 D: "AI 自动化写操作必须生成版本点并进入审计日志"
  - X-10 C: "命令名 + 影响范围摘要 + 自动版本点"（未选 D 的逐条单独回滚）
- **规范化结论（解决 L1-28 空白）**:
  - **按 L1-34 "全范围审计" + L1-40 "C 级防呆" + T05-12 "AI 必走预览 + 版本点" 推断为 D 级**
  - 命令执行约束矩阵：
    | 命令类别 | 确认 | 版本点 | 审计 | 回滚 | 权限认证 |
    | --- | --- | --- | --- | --- | --- |
    | 只读命令（如查看属性） | 否 | 否 | 否 | 无需 | 否 |
    | `edit.*` 普通格式化 | 否 | 继承 Editor 的 undo stack | 仅异常写入 | Ctrl+Z | 否 |
    | `edit.*` 批量格式化（影响 >50 节点） | 是 | **强制版本点** | 强制写入 | 版本回滚 | 否 |
    | `system.*` 非危险 | 否 | 否 | 强制写入 | 无需 | 否 |
    | `system.*` **高危**（删文档 / 删账户 / 清缓存 / CSS 注入 / 全量导出 / DB 重置） | **二次确认** | **强制版本点**（文档级）/ **Profile 快照**（账户级） | 强制 | 版本回滚 / Profile 恢复 | **systemAuth**（Windows Hello 或本地密码，T06-09 D） |
    | `ai.*` 所有写入 | **Diff 预览 + 用户 Apply** | **强制版本点** | 强制 | 版本回滚 | 否（读本地模型）/ 密钥认证（远程模型） |
    | `publish.*` 导出 | 否（非破坏性） | 导出参数快照 | 强制 | 无需 | 否 |
    | `publish.*` 发布（真实推送平台） | **二次确认** | 发布快照（写入 publish_history） | 强制 | 不支持撤回发布但记录 | 密钥认证 |
- **硬约束**:
  - 必须：`writesContent=true` 的命令在 handler 前自动包 `withVersionPoint(commandId, scope, fn)`
  - 必须：AI 写入必须先 Diff 预览 UI（参照 Notion/IDE），用户 Apply 才落盘（T05-12 D）
  - 必须：所有命令执行事件进审计日志（对齐决策 K-02 全范围）
  - 必须：高危操作的二次确认使用独立 Dialog（非 native confirm，支持深度文案 + 输入确认 + 超时自动取消）
  - 禁止：静默执行写操作（即使是批量）
  - 禁止：AI 直接覆盖用户内容（必须走 Diff）
- **落地点**:
  - `src/services/commandBus.ts`（中间件链：confirm → auth → versionPoint → audit → handler）
  - `src/services/versionStore/withVersionPoint.ts`
  - `src/components/ai/AIDiffPreviewModal.vue`
  - `src/components/common/DangerConfirmDialog.vue`

---

## 决策 I-07 | 斜杠命令搜索算法与排序

- **来源题**: T05-06 (C), T05-10 (D)
- **规范化结论**:
  - 搜索算法：**模糊匹配（fuzzy，T05-06 C）**；推荐使用 `fuse.js` 或自研基于字符距离的 ranker
  - 排序维度（多因子 score 模型）：
    1. 上下文相关（`contextBoost`）: 当前光标在列表/代码块/表格内则对应命令权重 +3
    2. 最近使用频率（`recencyBoost`）: 最近 7 天调用次数衰减
    3. 用户收藏/置顶（`pinBoost`）: +5
    4. 基础匹配度（`matchScore`）: fuzzy 算法返回值
  - 最终排序：`pinned → contextRelevant → frequent → other`，分组显示
- **硬约束**:
  - 必须：用户可在设置中关闭"最近使用"影响（为写作稳定性保留选项）
  - 必须：收藏 / 置顶持久化到 Profile 级设置（对齐决策 K-03）
  - 禁止：排序模型导致同一输入在短时间内结果顺序反复变化（稳定排序）
- **落地点**:
  - `src/editor/extensions/SlashCommands/filter.ts`
  - `src/editor/extensions/SlashCommands/ranker.ts`
  - `src/stores/commandStats.ts`

---

## 决策 I-08 | AI / 自动化命令的写入闭环

- **来源题**: T05-12 (D), X-10 (C), H-02 (三层引用)
- **规范化结论**:
  - AI 命令执行完整链路（不可简化）：
    1. 用户触发 `ai.*` 命令 → 命令前置中间件
    2. 权限检查（密钥是否配置）→ 失败则 Toast 并终止
    3. 调用模型 → 收集生成结果
    4. 展示 **AIDiffPreviewModal**：`原文 | 建议 | 接受 / 拒绝 / 重试 / 手动编辑建议`
    5. 用户 Apply → 自动打 INFERENCE 引用标签（决策 H-02）
    6. 自动生成版本点 `ai.<commandId>.<timestamp>`
    7. 写入审计日志 `ai.apply`（含 command_id / prompt_hash / diff_summary / model_name）
  - 小改动（单行 / 单词替换）允许简化 Diff UI（inline suggestion）但版本点和审计不可省
  - 批量 AI 操作（如全文翻译）使用 CompositeCommand，整体作为一个版本点
- **硬约束**:
  - 必须：AI 生成内容带 INFERENCE 标签，导出保留
  - 必须：用户拒绝 AI 建议不写审计（仅 Apply 才写）
  - 必须：批量操作记录影响范围摘要（"影响 12 段 / 共 3580 字符"）
  - 禁止：AI 命令跳过 Diff 直接写入
  - 禁止：AI 命令写入后立即触发其他 AI 命令（避免级联污染）
- **落地点**:
  - `src/services/ai/commandExecutor.ts`
  - `src/components/ai/AIDiffPreviewModal.vue`
  - `src/components/ai/InlineSuggestion.vue`

---

## 决策 I-09 | 命令可见性与只读态

- **来源题**: T05-13 (C), L1-33 (C)
- **规范化结论**:
  - 命令在不同上下文显示策略：
    - 编辑态：按 `enableWhen` + `visibleWhen` 过滤，不可用命令**隐藏**（保持界面干净）
    - 预览态：仅显示 `publish.*` + `system.view.*`，隐藏编辑类
    - 发布预览态：仅显示 `publish.*`
    - 只读态（权限为"审阅人"或"访客"）：仅 `edit.comment.*` + `publish.export.*`
  - 不强制加"为什么不可用"的文案（未选 D 的解释文案）
- **硬约束**:
  - 必须：权限控制通过 `requiresRole` 字段在命令注册时声明
  - 必须：权限变更（Profile 切换、角色变更）时 CommandRegistry 重新评估可见命令
  - 禁止：灰化显示不可用命令（T05-13 C 明确选择隐藏而非灰化）
- **落地点**:
  - `src/services/commandRegistry.ts` 的 `visibleWhen` 管线
  - `src/stores/auth.ts` 订阅 Profile / 角色变更事件

---

# 域 J | 导出与发布

## 决策 J-01 | "一 Markdown 权威源，多独立渲染链路"架构

- **来源题**: L1-05 (A), L1-30 (D + 补充), L1-31 (C), L1-32 (C + 补充), X-06 (B)
- **用户原始选择**:
  - L1-30 D："必须共享同一 canonical render pipeline + 不反向污染"，补充"不可能来自同一条链路，各平台各作为一个链路"
  - L1-31 C："不同渠道不同策略"
  - L1-32 C："三端高度一致" + "微信 CSS/SVG 规则诡异"
- **规范化结论（解决 L1-30 表面矛盾）**:
  - 架构分层：
    ```
    [1] Authoritative Source (Markdown 文本)
          ↓ 派生
    [2] Normalized AST (ProseMirror JSON 或 Markdown AST，内部中间态)
          ↓ 各自适配器消费
    [3] Platform Renderers (独立管线)
          ├── LocalPreviewRenderer   (编辑器内预览)
          ├── HTMLRenderer           (纯 HTML 导出)
          ├── MarkdownRenderer       (标准 Markdown 导出)
          ├── WeChatRenderer         (微信公众号 CSS + SVG 适配)
          ├── ZhihuRenderer          (知乎平台)
          ├── XiaohongshuRenderer    (小红书)
          └── PluginRenderers        (通过 PublishAdapter 注册的第三方)
    ```
  - 铁律：**Markdown 权威源向下单向派生，任何平台适配不得反向污染**（L1-30 D 铁律）
  - 具体映射：
    - HTML 持久化（X-06 B "HTML 主存储"）是 **运行时持久化权威**（数据库层），但对用户而言 Markdown 文本是 **表达权威**（导出 / 分享 / 搜索的语义源）
    - 每次编辑：Markdown 文本 → 解析为 ProseMirror JSON → 渲染为 HTML 存入 DB
    - 每次加载：HTML → 反解析为 JSON → 派发给 Typora/Source/Preview
- **硬约束**:
  - 必须：Platform Renderer 之间不共享代码（避免"为了微信加的补丁污染 HTML 导出"）
  - 必须：所有 Renderer 的输入是 Normalized AST，输出是平台 bundle（HTML + CSS + assets）
  - 必须：Renderer 有独立 Spec + 独立单测 + 独立验收矩阵
  - 禁止：Renderer 修改 Authoritative Source
  - 禁止：Editor 代码中出现 `if (platform === 'wechat')` 这类平台判断（必须通过 Renderer 注入）
- **落地点**:
  - `src/services/renderers/` 目录（每个 Renderer 一个子目录）
  - `src/services/renderers/base/Renderer.ts`（接口）
  - Spec: `prompts/0420/spec/platform-renderer-contract.md`（待建）

---

## 决策 J-02 | 导出覆盖面与 PDF 决议

- **来源题**: T04-08 (C), P-05 (A), S-08 (B)
- **用户原始选择**:
  - T04-08 C: "所有平台 + 纯 HTML + Markdown 导出"（C 文案不含 PDF，D 才含 PDF）
  - P-05 A: "v2.1 不做 PDF 导出"
- **规范化结论（解决 T04-08 潜在歧义）**:
  - v2.1 导出覆盖面：
    | 格式 | 落地 | 备注 |
    | --- | --- | --- |
    | 微信公众号（HTML 片段 + inline CSS） | ✅ v2.1 | CSS/SVG 特殊适配 |
    | 知乎（HTML 片段） | ✅ v2.1 | |
    | 小红书（HTML 片段） | ✅ v2.1 | |
    | 纯 HTML（独立文档） | ✅ v2.1 | 含 `<head>` 完整结构 |
    | Markdown（.md） | ✅ v2.1 | 往返保真（对齐 L1-08 "所有元素无损"） |
    | PDF | ❌ **不做** | P-05 A 明确否决 |
    | Word (.docx) | ❌ **不做** | 仅导入，不导出 |
  - PDF 决议：**v2.1 明确不做**（以 P-05 A 为准；T04-08 C 的文案笔误不触发 PDF 实现）
- **硬约束**:
  - 必须：5 种导出格式每个有独立 Exporter + 单元测试 + E2E 验收
  - 必须：用户在导出面板中看不到 PDF 选项（不是 disabled，而是不存在）
  - 禁止：v2.1 引入 Puppeteer / wkhtmltopdf 等 PDF 依赖（体积/复杂度代价）
- **落地点**:
  - `src/services/exporters/wechat.ts`
  - `src/services/exporters/zhihu.ts`
  - `src/services/exporters/xiaohongshu.ts`
  - `src/services/exporters/html.ts`
  - `src/services/exporters/markdown.ts`
  - 不新增 PDF 相关目录

---

## 决策 J-03 | 导出前预览与参数调整（P-01 补齐）

- **来源题**: P-01 (未填写 / 推断 D), P-02 (C), P-03 (D)
- **用户原始选择**:
  - P-01: **未填写**
  - P-02 C: "导出历史可重导出"
  - P-03 D: "复制为..." 菜单
- **规范化结论（解决 P-01 空白）**:
  - **按"零空壳交付 + 用户控制权最大化 + P-06 D 自定义适配器"推断为 D**
  - 导出流程必须包含：
    1. 选择目标平台 / 格式
    2. 预览面板（实时渲染 + 设备框 T09-08 C 多设备切换）
    3. 参数调整区（按 Renderer 定义的可调项：封面 / 作者 / TOC / 公式主题 / 代码块主题）
    4. 保存为预设（ExportPreset，可跨账户共享 L1-23 D 补充）
    5. 应用预设 / 调整后 → `导出` / `复制到剪贴板` / `发布到平台`
  - 导出历史（P-02 C）：记录每次导出的 `(articleId, platform, preset, timestamp, result_path_or_hash)`，支持一键重导（使用当时参数）
  - "复制为..."（P-03 D）：右键菜单 + 命令 `publish.copyAs.*`，精确选择格式
- **硬约束**:
  - 必须：预览面板使用 Platform Renderer 产物，不用单独的预览管线（避免"预览与导出不一致"）
  - 必须：导出参数变更实时反映到预览（不用点刷新按钮）
  - 必须：保存预设时命名 + 账户级存储（对齐决策 K-03 账户级设置）
  - 必须：导出历史与版本历史独立，但条目互相引用（版本 ID + 导出 ID）
  - 禁止：导出历史与 AI Diff 预览共用 UI（语义不同）
- **落地点**:
  - `src/views/export/ExportDialog.vue`
  - `src/components/export/PlatformPreview.vue`
  - `src/components/export/ExportPresetPicker.vue`
  - `src/stores/exportPresets.ts`
  - `src/stores/exportHistory.ts`
  - `src/db/schema.ts` 新增 `export_presets` + `export_logs`（呼应 T08-02 B）

---

## 决策 J-04 | 公式 / Mermaid / 代码高亮的导出契约与降级

- **来源题**: L1-32 (C + 补充), T04-10 (A), T04-11 (B), T04-13 (C), T04-14 (C)
- **规范化结论**:
  - **L1-32 升级为 D 级**（用户补充"微信 CSS/SVG 规则诡异"意味着必须有降级）：
    - 编辑器、预览、导出在语义上高度一致
    - 必须定义每种能力的**三级降级策略**：
      | 能力 | 主策略 | 降级 1 | 降级 2（最低保真） |
      | --- | --- | --- | --- |
      | KaTeX 公式 | MathML / SVG inline | 渲染为 PNG 图像 | 保留 `$...$` 源码 + 提示 |
      | Mermaid 图表 | inline SVG | 渲染为 PNG 图像 | 保留代码块源码 + 提示 |
      | 代码高亮 | inline styles（colored span） | 纯 `<pre><code>` | 纯文本 |
  - 公式/图表主题（T04-11 B）: 默认跟随全局主题，导出时按目标平台再覆盖
    - 微信：公式强制 SVG 或 PNG（CSS 限制）
    - 知乎：支持 HTML 带样式
    - 小红书：图文混排，公式转图片
    - HTML：完整保留 SVG / MathML
    - Markdown：保留 `$...$` 源码
  - 资产嵌入策略（T04-14 C）：按平台决定
    - 微信：全内联（base64 图片 + inline SVG + inline CSS）
    - 知乎 / 小红书：按平台 API 要求（通常允许外链）
    - HTML 导出：按用户选项（单文件内联 vs 多文件外链，默认单文件）
    - Markdown：保留相对路径引用
  - 代码块契约（T04-13 C + 补充"按平台规则"）：编辑器内完整能力（高亮 + 复制 + 行号 + 折行/横滚），导出按平台自适应
- **硬约束**:
  - 必须：公式 / Mermaid 渲染失败时至少保留源码（不得静默丢失）
  - 必须：每个 Renderer 的降级策略在 Spec 中显式声明
  - 必须：公式/图表/代码三类能力的导出结果必须有 E2E 验收样本
  - 禁止：编辑器能渲染但导出坏（L1-32 铁律 14）
- **落地点**:
  - `src/services/renderers/{wechat,zhihu,...}/features/{math,mermaid,code}.ts`
  - `src/services/renderers/base/fallback.ts`（降级策略框架）

---

## 决策 J-05 | PublishAdapter 协议与用户自定义渠道

- **来源题**: P-06 (D + 补充), L1-37 (D), EX-10, J-01
- **用户原始选择**: P-06 D + "后续版本旨在集成更多渠道"
- **规范化结论**:
  - 定义 `PublishAdapter` 接口：
    ```ts
    interface PublishAdapter {
      id: string;                    // "wechat-official"
      name: string;
      version: string;
      kind: 'builtin' | 'user' | 'plugin';
      cssConstraints: CSSConstraints;        // 允许的 CSS 属性白名单
      htmlSanitizer: SanitizerConfig;
      assetStrategy: AssetStrategy;          // inline / url / upload
      featureSupport: {
        math: 'inline-svg' | 'png-image' | 'source';
        mermaid: 'inline-svg' | 'png-image' | 'source';
        codeHighlight: 'inline-styles' | 'class-only' | 'plain';
        embeds: boolean;
        footnotes: boolean;
        toc: boolean;
        citations: 'inline' | 'footnote' | 'hidden';
      };
      preprocess?: (ast: NormalizedAST) => NormalizedAST;
      render: (ast: NormalizedAST, preset: ExportPreset) => Promise<RenderResult>;
      postprocess?: (result: RenderResult) => RenderResult;
      publish?: (result: RenderResult, credentials: Credentials) => Promise<PublishResult>;
    }
    ```
  - v2.1 内置 Adapter：微信公众号 / 知乎 / 小红书 / HTML / Markdown（5 个）
  - 用户自定义 Adapter：放在 Profile 目录 `~/.inkforge/<profile>/publish-adapters/*.json`（纯配置，不支持代码注入）
  - 插件 Adapter：通过插件 SDK 注册（决策 M-01 / M-02）
- **硬约束**:
  - 必须：用户自定义 Adapter 仅支持配置式（CSS / HTML 清洗规则 / feature 开关），不支持任意 JS 代码
  - 必须：Adapter 注册时通过 schema 校验
  - 必须：插件 Adapter 走沙箱 + 权限声明（决策 M-02）
  - 必须：发布动作（`adapter.publish`）需要额外 `systemAuth`（对齐决策 I-06）
  - 禁止：Adapter 读取其他 Profile 的数据
  - 禁止：用户自定义 Adapter 支持代码字段（避免 XSS）
- **落地点**:
  - `src/services/publish/adapter.ts`（接口）
  - `src/services/publish/adapters/builtin/`（5 个内置）
  - `src/services/publish/registry.ts`
  - `src/views/settings/PublishAdaptersTab.vue`
  - Spec: `prompts/0420/spec/publish-adapter.md`（待建）

---

## 决策 J-06 | 剪贴板管线与 "复制为..." 菜单

- **来源题**: P-03 (D), T01-20 (D), T04-06 (C)
- **规范化结论**:
  - `Ctrl+C` 默认复制：按选区内容类型决定（T01-20 D）
    - 普通文本选区 → 纯文本
    - 跨块级选区（表格 / 代码块 / 公式 / Mermaid）→ 多 MIME 写入（`text/plain` + `text/html` + `text/markdown`）
  - "复制为..." 菜单（P-03 D）：明确格式
    - `publish.copyAs.markdown` → 仅 Markdown
    - `publish.copyAs.html` → 仅 HTML
    - `publish.copyAs.plainText` → 仅纯文本
    - `publish.copyAs.wechatSafeHTML` → 微信兼容 HTML（选中块级时可用）
    - `publish.copyAs.richCode` → 带高亮的富文本代码（T04-06 C）
  - 剪贴板写入统一走 `ClipboardPipeline`（对齐 `PublishAdapter`）
- **硬约束**:
  - 必须：多 MIME 写入时保证 `text/plain` 始终存在（兼容性底线）
  - 必须：Tauri 独占的 `system.clipboard.*` 命令在 Web 调试态下 disabled
  - 禁止：剪贴板数据中带危险 HTML（通过决策 J-08 的 sanitizer 清洗）
- **落地点**:
  - `src/services/clipboard/pipeline.ts`
  - `src/services/tauri/clipboard.ts`

---

## 决策 J-07 | 预览面板刷新与 Stage 架构

- **来源题**: T04-09 (A), T04-12 (A), T04-03 (C), T04-04 (A), T09-08 (C)
- **规范化结论**:
  - 预览面板（右栏，W-01 A）刷新策略：**实时（T04-09 A），无防抖**
  - 渲染失败不缓存（T04-12 A）：每次输入重试；错误提示在内容变化后自动消失
  - Mermaid 使用 Stage 面板（T04-03 C）：在右栏内独立区域渲染，与正文脱耦
  - Mermaid / KaTeX 错误展示原生信息（T04-04 A）便于调试
  - 多设备预览（T09-08 C）：Stage 面板提供 iPhone / Android / iPad 三种设备框，参照 md.doocs.org
- **硬约束**:
  - 必须：预览渲染使用 Platform Renderer（可切换平台），不用独立的预览渲染管线
  - 必须：实时刷新必须在 Web Worker 中执行重计算（避免阻塞主线程，对齐决策 L-02）
  - 必须：错误提示最多 1 行 + "查看详情"展开，不长霸屏幕
  - 禁止：预览面板使用 setTimeout 轮询（响应式驱动）
- **落地点**:
  - `src/components/preview/PreviewPane.vue`
  - `src/components/preview/StagePanel.vue`
  - `src/components/preview/DevicePreview.vue`
  - `src/workers/previewRenderer.worker.ts`

---

## 决策 J-08 | 预览 / 导出 / 发布的安全沙箱策略

- **来源题**: T04-15 (A + "一切以平台规则决定")
- **用户原始选择**: A —— "仅清理明显危险标签/属性"
- **规范化结论**:
  - **用户选 A 但补充"平台规则决定"——升级为"A 级统一最小清洗 + 平台 Adapter 补强"的双层架构**
  - 第一层：**UnifiedSanitizer**（统一最小清洗，对齐 A 级）
    - 删除 `<script>`, `<object>`, `<embed>`, `on*` 事件属性, `javascript:` 协议, `data:` 协议中的 JS
    - 默认不删除 `<iframe>`（由 Adapter 决定）
    - 使用 DOMPurify 作为实现
  - 第二层：**Platform Sanitizer**（按 Adapter 配置）
    - 微信：额外删除 `<script>`, `<iframe>`, `<style>` 标签外的 CSS，强制 inline style
    - 知乎 / 小红书：按平台 API 要求
    - HTML 导出：基本不删（用户自负）
    - Markdown 导出：不涉及 HTML 清洗
  - 沙箱策略文档（列入 Spec）：每个 Adapter 必须声明安全策略
- **硬约束**:
  - 必须：所有进入渲染管线的内容都先过 UnifiedSanitizer
  - 必须：Platform Sanitizer 在 Adapter 的 `postprocess` 阶段调用
  - 必须：用户可在 Settings > Advanced 查看被清洗掉的条目（透明度）
  - 禁止：关闭 UnifiedSanitizer（最底线）
- **冲突处理**: T04-15 用户选 A，但用户补充"一切以平台规则决定"。按 A 作为最低底线 + 平台 Adapter 补强上层的方式落地，既尊重"轻量" A 级选择，又保证安全底线。
- **落地点**:
  - `src/services/sanitize/unified.ts`
  - `src/services/renderers/{platform}/sanitizer.ts`
  - `src/views/settings/SecurityAuditTab.vue`（清洗透明度）

---

## 决策 J-09 | TOC 与脚注导出策略

- **来源题**: P-04 (D + "让用户选择"), M-04 (D), M-02 (D)
- **规范化结论**:
  - TOC 双形态（与 W-02 左栏面板解耦，M-04 D 是正文内节点）：
    - 正文内 `[toc]` 节点（M-04 D）：渲染为目录，可配置层级 / 编号 / 可点击
    - 左栏 TOC 面板（W-02 D，放置在左侧 tab 内）：实时高亮 + 折叠 + 拖拽重排章节
  - 导出时 TOC（P-04 D）：由用户在导出参数中勾选"包含 TOC"
  - 脚注（M-02 D）：导出时按平台处理
    - 微信：转为 `<sup>` + 底部列表
    - Markdown：保留 `[^id]` 语法
    - HTML：标准 footnote 结构（对齐 CommonMark 扩展）
- **硬约束**:
  - 必须：正文 `[toc]` 与左栏 TOC 使用同一数据源（避免两套解析器）
  - 必须：TOC 导出时正确处理层级（最多 6 级）
  - 禁止：用户编辑 `[toc]` 节点内部文本（节点自动生成）
- **落地点**:
  - `src/editor/extensions/TOCNode.ts`
  - `src/components/workstation/TOCPanel.vue`
  - `src/services/renderers/*/toc.ts`

---

# 域 K | 权限与审计

## 决策 K-01 | 资源级权限模型与 PermissionBroker

- **来源题**: L1-33 (C + "结合多账户多 Profile"), L1-24 (D), T06-01 (A), T06-09 (D)
- **规范化结论**:
  - 权限模型：**资源级 ACL（L1-33 C）+ Profile 绑定**，不做 ReBAC
  - 资源类型 × 动作矩阵：
    | 资源 | 动作 | 说明 |
    | --- | --- | --- |
    | Document | read / write / delete / publish / export | 文档级 |
    | Folder / Category | read / write / reorganize | 分类级 |
    | Comment | read / write / resolve | 评论级（v2.1 C 基础审阅闭环） |
    | Version | read / restore | 版本级 |
    | Publish | configure / execute | 发布配置与执行分离 |
    | Profile | switch / delete / export | 账户级 |
  - 角色预留（为远期 5-10 人团队，L1-02 补充）：
    - Owner / Admin / Author / Reviewer / Guest
    - v2.1 实际只使用 Owner（本地单用户等价）
  - PermissionBroker：所有命令执行前调用 `broker.check(command, resource, user)` → 返回 `allow / deny / requireAuth`
- **硬约束**:
  - 必须：PermissionBroker 是 CommandBus 的前置中间件
  - 必须：Deny 时 Toast + 写审计
  - 必须：`requireAuth` 返回时触发 `systemAuth`（Windows Hello 或本地密码）
  - 必须：角色表与权限映射表在 Spec 中显式定义
  - 禁止：绕过 Broker 的任何"内部命令"（code review 检查）
- **落地点**:
  - `src/services/permissions/broker.ts`
  - `src/services/permissions/roles.ts`
  - `src/db/schema.ts` 新增 `acls` 表
  - Spec: `prompts/0420/spec/permission-model.md`（待建）

---

## 决策 K-02 | 审计日志全范围覆盖（D 级）+ 3 个月保留

- **来源题**: L1-34 (A+B+C + "全范围审计"), X-10 (C), R-02 (D)
- **用户原始选择**: A+B+C（表面选项） + "全范围审计, 留存期限 3 个月, 可导出, 用户本身可查看"
- **规范化结论（解决 L1-34 自相矛盾）**:
  - **PRD 按 D 落地全范围审计**（补充的"全范围"明确含 D 的 AI/命令留痕）
  - 审计事件类别（4 大类覆盖）：
    1. **Security**（登录、切换账户、删除、恢复、导入导出、密码修改、systemAuth 触发）
    2. **EditLifecycle**（创建、修改里程碑、恢复、发布、同步解决冲突）
    3. **ReviewPermission**（评论、关闭线程、审批、授权、撤权）
    4. **AutomationCommand**（所有 `ai.*` + 批量 `edit.*` + 所有 `publish.*` 执行）
  - 存储：IndexedDB `audit_logs` 表（Profile 隔离）
  - 保留期：**3 个月**（超过自动清理）
  - 可导出：用户可在 Settings > Security 导出 CSV / JSON（对齐 J-02 的导出清单）
  - 可查看：Settings > Security 提供筛选 UI（时间范围 / 类别 / 文档 / 命令 / 结果状态）
- **硬约束**:
  - 必须：审计写入是同步 + 幂等（失败必须重试，对齐 G-13 数据风险错误级）
  - 必须：审计记录包含 `event_id / event_type / profile_id / user_id? / timestamp / resource / action / result / meta_json / severity`
  - 必须：3 个月清理通过后台任务执行，删除前写入 `audit.retention.cleanup` 事件
  - 必须：审计日志本身是**不可篡改**的（用户 UI 只能查看 / 导出，不能编辑）
  - 禁止：审计存储在可同步目录（防止 Git 同步冲突破坏审计完整性）
- **落地点**:
  - `src/services/audit/logger.ts`
  - `src/db/schema.ts` 新增 `audit_logs`
  - `src/views/settings/SecurityAuditTab.vue`
  - `src/workers/auditRetention.worker.ts`

---

## 决策 K-03 | 多账户隔离与共享区

- **来源题**: L1-23 (D + "共享模板/导出预设/AI 配置"), L1-24 (D), T06-01 (A), T06-11 (A), T07-08 (C), T07-07 (B)
- **规范化结论（解决 T06-11 A vs L1-23 D 补充冲突）**:
  - 三层数据 Scope（对齐 Part 2 跨域）：
    ```
    Device Scope  ──────  少量系统偏好（语言、窗口大小记忆、最后激活 profile ID）
       │
    Account/Profile Scope  ──  大部分设置 + 文档 + 版本 + 评论 + 资源 + 审计 + 导出历史
       │
    Workspace Scope  ──────  多窗口并行时每个工作区独立（session 恢复）
       │
    Document Scope  ──────  文档级设置（导出预设应用 / TOC 深度 / 纸张宽度覆盖）
    ```
  - 共享区（决策 L1-23 D 补充与 T06-11 A 的矛盾解决）：
    - v2.1 **默认不跨账户共享**（T06-11 A 为准）
    - 提供"导出 / 导入"机制（单向迁移）：
      - ExportPreset（导出预设）
      - AIConfig（AI 配置 / v2.1 为 Stub）
      - Template（模板，S-01）
      - CustomCSS（EX-07）
    - 未来版本通过"共享设备"概念实现自动共享（v2.2+）
  - 设置 scope（T07-08 C）：
    - 大部分设置（编辑器偏好 / 主题 / 快捷键 / AI 配置 / Sync 配置）= Account Scope
    - 少量纯本地（语言 / 窗口大小 / 最后激活 profile）= Device Scope
  - 设置随账户一起导出（T07-07 B）：全量 Profile 导出包含 `settings.json`
- **硬约束**:
  - 必须：每个 Profile 有独立 IndexedDB 数据库（`inkforge_<profileId>`）
  - 必须：每个 Profile 有独立文件根（`~/.inkforge/<profileId>/`）
  - 必须：Device 级设置通过 `localStorage` 的独立 namespace（`device.*`）
  - 必须：Profile 切换使用全页 reload（T06-05 C）确保 store 清理干净
  - 必须：未保存状态切换被阻止，autosave 失败则禁止切换（T06-12 A + 补充）
  - 必须：软删除 7 天可恢复（T06-10 B）
  - 禁止：跨 Profile 的直接数据读取（即使同一设备）
  - 禁止：Profile 切换不触发 reload（与 T06-05 C 对齐）
- **落地点**:
  - `src/services/profile/storage.ts`
  - `src/services/profile/switcher.ts`
  - `src/services/profile/importExport.ts`
  - `src/db/profileFactory.ts`（按 profileId 开 Dexie 实例）

---

## 决策 K-04 | 高危操作清单与 systemAuth

- **来源题**: L1-40 (C + "高危险操作"), T06-09 (D + 补充), T07-09 (C)
- **规范化结论**:
  - **高危操作清单**（对齐 L1-40 C "高危险操作"）：
    | 操作 | 确认方式 | systemAuth | 自动备份 |
    | --- | --- | --- | --- |
    | 删除文档 | 单次确认 | 否 | 回收站 7 天（L1-42 D） |
    | 批量删除文档 | 输入数量确认 | 否 | 回收站 7 天 |
    | 删除账户 | 双重确认 + 输入账户名（T06-04 B） | **是** | Profile 软删 7 天（T06-10 B） |
    | 切换账户（有未保存） | 阻止 + 提示保存（T06-12 A） | 否 | 不适用 |
    | 查看敏感设置（审计日志详情 / 密钥） | 无 | **是** | 否 |
    | 导出全量数据 | 单次确认 | **是** | 否 |
    | 清除 IndexedDB / 重置数据库 | 双重确认 + 输入 "RESET" | **是** | 强制导出备份（选择是否导出） |
    | 注入自定义 CSS / JS（EX-07） | 开发者模式（T07-09 C） | 否 | 否 |
    | 清缓存 | 单次确认 | 否 | 否 |
    | 覆盖灰名单快捷键（I-04） | 警告弹窗 | 否 | 否 |
    | AI 批量写入（影响 >100 段） | Diff 预览 | 否 | 强制版本点 |
    | 发布到远端平台 | 二次确认 | **是** | 发布快照 |
    | Profile 硬删除（跳过 7 天软删） | 三重确认 | **是** | 强制导出 |
  - systemAuth 实现（T06-09 D）：
    - 优先 Windows Hello（Tauri plugin-biometric）
    - 回退本地密码（账户设置的 Local Password）
    - 失败三次锁定 5 分钟（防暴力）
- **硬约束**:
  - 必须：高危清单在 Spec 中显式维护，新增高危操作需 PRD 评审
  - 必须：systemAuth 超时 5 分钟后过期（下次高危操作需重新认证）
  - 必须：认证失败写审计
  - 禁止：通过 URL / Deep Link 直接触发高危操作（对齐 EX-09 v2.2 延后）
- **落地点**:
  - `src/services/auth/dangerousActions.ts`（清单 + 处理器）
  - `src/services/auth/localAuth.ts`
  - `src/services/auth/platformAuth.ts`（Tauri plugin）
  - `src/components/common/DangerConfirmDialog.vue`

---

## 决策 K-05 | 开发者 / 高级模式门槛

- **来源题**: T07-04 (B+C), T07-09 (C), EX-07 (v2.1), R-03 (D)
- **规范化结论**:
  - **开发者模式开关**在 Settings > Advanced 顶部，默认关闭
  - 开启需 systemAuth + 二次确认 + 警告文案"开启后可能影响数据安全"
  - 开启后可见的能力：
    - 自定义 CSS 注入（EX-07 / T07-04 B）
    - 自定义 JS 注入（T07-04 B；仅 plugin 通过 SDK 注入，不是 UI 输入框）
    - 性能监控面板（T07-04 C）
    - 网络诊断（T07-04 C）
    - IndexedDB 浏览器（T07-03 C）
    - DB 重置（T07-04 A，需二次 systemAuth）
    - 开发者面板（R-03 D）：TipTap JSON / PM state / Store viewer / 事件流
  - 关闭开发者模式后：自定义 CSS / JS 注入**不运行**，但配置保留（下次开启后恢复）
- **硬约束**:
  - 必须：自定义 CSS 注入有 sandbox（只影响编辑器内容区和 UI，不得影响 Tauri 系统 WebView 安全域）
  - 必须：自定义 JS 注入仅允许通过插件 SDK 的 hook（不允许 `eval(userInput)`）
  - 必须：开启/关闭开发者模式写审计
  - 必须：开发者模式错误（如注入 CSS 导致渲染崩溃）触发错误边界 + 安全模式（R-04 D）
  - 禁止：生产版本隐藏开发者模式开关（与"完全开源"L1-37 D 一致）
- **落地点**:
  - `src/stores/developerMode.ts`
  - `src/views/settings/AdvancedSettingsTab.vue`
  - `src/services/custom-style/` + `src/services/devPanel/`

---

## 决策 K-06 | 审计的导出与隐私边界

- **来源题**: L1-34 (+ "可导出 + 用户可查看"), R-02 (D)
- **规范化结论**:
  - 审计导出格式：
    - CSV（表格式，适合分析）
    - JSON（含完整 meta，适合二次加工）
  - 审计导出本身写一条 `audit.export` 事件（自指）
  - 隐私边界：
    - 审计中不存明文密码 / API 密钥（密钥字段打马赛克 `sk-***xxx`）
    - 审计中不存文档正文（只存文档 ID + 操作类型 + 影响范围摘要）
    - 审计支持 "禁用摘要" 选项（Settings > Security）以进一步脱敏
- **硬约束**:
  - 必须：密钥脱敏在写入时进行（一次性），不在查看时脱敏
  - 必须：导出包含时间范围过滤，不强制全量
  - 禁止：导出审计走未加密通道（Git 同步场景需注意，配合决策 L-01）
- **落地点**:
  - `src/services/audit/exporter.ts`
  - `src/services/audit/sanitizer.ts`

---

# 域 L | 性能 SLO 与规模

## 决策 L-01 | 硬性能 SLO + Lighthouse 门槛

- **来源题**: L1-35 (C + 规模数字), L1-36 (C + "具体数字"), X-05 (C + "极致性能")
- **用户原始选择**: L1-36 C + "输入无延迟；保存 ≤ 1s；冲突检测 ≤ 10s；导出 ≤ 3min"; X-05 C "Lighthouse > 80"
- **规范化结论**:
  - 规模硬指标（L1-35 C + 补充）：
    | 维度 | 目标 | 备注 |
    | --- | --- | --- |
    | 单文档字符数 | 900,000+ | ~90 万字，远超选项 B 的 10 万字 |
    | 附件数 | 2000+ | 单 Profile 累计 |
    | 版本数（单文档） | 999 | 超出自动清理旧版本（用户可查看警告）|
    | 账户数 | 50+ | 单设备 Profile 数量 |
  - 性能 SLO（L1-36 + X-05 合并）：
    | 指标 | 阈值 | 优先级 |
    | --- | --- | --- |
    | 输入延迟 | **0（用户不可感知）** | P0 |
    | 保存耗时 | ≤ 1s | P0 |
    | 冲突检测 | ≤ 10s | P0 |
    | 导出耗时 | ≤ 3min（90 万字 + 2000 附件全量） | P0 |
    | 首屏加载 | ≤ 3s | P1 |
    | Hub 渲染 | ≤ 1s | P1 |
    | Lighthouse Performance | > 80 | P1 |
    | 页面切换 | ≤ 300ms | P1 |
  - CI 集成（X-05）：`lighthouse-ci` 阈值强制，不达标阻塞合并
- **硬约束**:
  - 必须：每个 Task 验收矩阵含"性能样本"（截图 + 时长 + 规模）
  - 必须：`prompts/0420/spec/perf-budget.md` 记录基线并持续更新
  - 必须：性能回归超阈值触发告警（CI + 本地 dev 模式）
  - 必须：超大文档（>50 万字）的编辑走 Web Worker + 虚拟滚动
  - 禁止：主线程执行 Markdown 解析 / Renderer 渲染（必须 Worker）
  - 禁止：Hub 数据加载阻塞首屏（分阶段加载）
- **落地点**:
  - `.lighthouserc.json`
  - `prompts/0420/spec/perf-budget.md`
  - `src/workers/` 目录
  - `src/components/editor/VirtualScrollingEditor.vue`（大文档方案）

---

## 决策 L-02 | 能力分级与自动降级矩阵

- **来源题**: L1-36 (C), T08-11 (D), T09-09 (D), X-05 (C + 极致)
- **规范化结论**:
  - **L1-36 升级为 D 级**（补充明确数字阈值但未选 D 的"可关闭 / 必须保真 / 可后台"分级；为实现 Lighthouse > 80 必须做 D）：
  - 能力三级分类：
    | 级别 | 含义 | 示例 | 降级策略 |
    | --- | --- | --- | --- |
    | **必须保真** | 用户写作核心 | 输入 / 保存 / 渲染正文 | 永不降级 |
    | **可后台处理** | 辅助性 | 全文搜索索引 / AI 预生成引言 / 版本 diff 计算 / 数据洞察预计算 | Worker 线程 + 空闲时段 |
    | **可关闭** | 增值 | 同步滚动 / 实时预览 / 动画 / 图表动效 / 骨架屏 | 超阈值自动关闭 + 用户可见 |
  - 自动降级触发（T09-09 D + T08-11 D + L1-36 C）：
    | 触发条件 | 降级动作 |
    | --- | --- |
    | 主线程阻塞 > 50ms | 暂停动画（降到 `data-animation-level=minimal`） |
    | 内存占用 > 70% | 暂停预览实时刷新，改为手动刷新 |
    | 文档字符数 > 30 万 | 启用虚拟滚动 + 折叠装饰 |
    | 版本数 > 500 | 旧版本只显示摘要，按需展开（点击才加载 diff） |
    | 图表数据点 > N（按类型） | 时间窗口聚合 / 采样 |
    | CPU 温度告警（Tauri 能力） | 暂停后台预计算 |
  - 用户可在 Settings > Advanced > Performance 查看当前降级状态 + 手动恢复
- **硬约束**:
  - 必须：降级事件写审计（`perf.degrade` / `perf.restore`）
  - 必须：降级动作用户可见（Toast 级提醒，但不打断写作）
  - 必须：Editor 输入处理永远在主线程，渲染永远在 Worker
  - 禁止：降级导致正文数据丢失（与 X-11 "文章不能丢"底线一致）
- **落地点**:
  - `src/services/performance/monitor.ts`
  - `src/services/performance/degradeManager.ts`
  - `src/composables/useAnimationLevel.ts`
  - Spec: `prompts/0420/spec/degrade-policy.md`（待建）

---

## 决策 L-03 | 大数据量图表与洞察性能

- **来源题**: T08-08 (D), T08-11 (D), X-05 (C)
- **规范化结论**:
  - 洞察指标三层刷新（T08-08 D）：
    | 层级 | 触发时机 | 示例 |
    | --- | --- | --- |
    | 实时（< 1s） | 当前会话字数 / 目标进度 | WritingGoal |
    | 会话级（10s 节流） | 最近文档列表 / 标签统计 | RecentCard / TagCloud |
    | 日级（后台） | 全局字数曲线 / 导出频率 / 生产力趋势 | WritingTimeline / ExportFrequency |
  - 每图表最大采样量（T08-11 D）：
    | 图表 | maxSampleSize | 超限动作 |
    | --- | --- | --- |
    | WritingTimeline | 365 天 | 按周聚合 |
    | ProductivityInsights | 90 天 | 按天聚合 |
    | WordDistribution | 1000 文档 | 按分类聚合 |
    | RecentActivity | 50 条 | 滑动窗口 |
    | ExportFrequency | 180 天 | 按周聚合 |
    | 第六图 | 按需定义 | — |
  - 后台预计算（T08-11 D 实现）：`src/workers/insights.worker.ts` 接收事件订阅，空闲时预计算 + 缓存到 IndexedDB `metrics_cache`
  - 统计口径（T08-07 D + 补充）：字数 = 纯正文文本（不含标题 / 代码块 / 公式）
- **硬约束**:
  - 必须：所有图表在 `InsightCard` 父组件中注册 `maxSampleSize`
  - 必须：超限时显示 "数据已聚合展示" 提示 + "查看全量" 展开入口
  - 必须：统计口径文档 `metrics-dictionary.md` 对每个指标声明：来源表 / 计算函数 / 边界 / 异常处理
  - 必须：异常数据（缺口 / 脏数据）显示缺口 + 不完整提示 + "重新计算" 入口（T08-09 D）
  - 必须：图表交互（hover tooltip + 点击跳转到对应文档 / 时间段，T08-04 C）
  - 禁止：图表渲染阻塞主线程（Canvas 或 SVG 都通过 Worker 预生成数据）
- **落地点**:
  - `src/services/metrics/scheduler.ts`
  - `src/services/metrics/dictionary.ts`
  - `src/workers/insights.worker.ts`
  - `src/components/insights/InsightCard.vue`
  - `prompts/0420/spec/metrics-dictionary.md`

---

## 决策 L-04 | 版本存储与回滚性能

- **来源题**: X-07 (C 无限版本 + diff 存储), X-09 (D 文档版本包), L1-17 (C + "无上限 + 内存占比警告"), L1-18 (D 双栏 diff/merge)
- **规范化结论**:
  - 版本存储：**diff-based**（X-07 C），使用 `fast-diff` 或 `diff-match-patch` 库
  - 每 N 次（建议 20 次）存一个 snapshot，其余存 diff（减少回放计算）
  - DocumentVersionBundle（X-09 D）包含：
    - 正文（HTML + Markdown 双份，或一份 + 另一份按需生成）
    - 资源引用快照（asset_id 列表 + 当时哈希）
    - 导出参数（活跃 preset）
    - 评论锚点
    - 引用数据（H-02 的三层引用）
  - 清理策略（L1-17 C 补充）：
    - 无硬上限（999 也是规模指标而非清理线）
    - 内存 / 磁盘占比 > 警告线（默认 80%）时警告用户并建议清理
    - 清理建议按 `importance = priority * recency` 排序，显示候选版本（用户勾选清理）
  - 恢复（L1-18 D）：
    - 恢复 = 打开双栏 diff/merge 视图
    - 用户选择性应用（不是整体覆盖）
    - 所有状态跟随（评论锚点 / 选区 / 设置）
- **硬约束**:
  - 必须：diff 存储有完整性校验（哈希链）
  - 必须：回滚失败时能回到回滚前状态（回滚的回滚）
  - 必须：版本清理前强制导出完整快照备份（可选跳过但需二次确认）
  - 禁止：清理任务自动执行（必须用户勾选）
- **落地点**:
  - `src/services/versionStore/diffEngine.ts`
  - `src/services/versionStore/bundleBuilder.ts`
  - `src/components/version/DiffMergeView.vue`
  - `src/workers/versionDiff.worker.ts`

---

## 决策 L-05 | 同步 / 迁移 / 灾难恢复性能

- **来源题**: L1-20 (D), T07-02 (D), X-04 (B), X-11 (C + "文章不能丢"), X-12 (D)
- **规范化结论（解决 T07-02 D Git vs IndexedDB 主从冲突）**:
  - **IndexedDB 为主存储（primary source of truth），Git 为派生（derived）**
  - Git 同步流程：
    1. IndexedDB → Markdown 文件系统（Tauri fs 写入 Profile/articles/*.md）
    2. Markdown 文件系统 → Git 仓库（commit + push）
    3. 冲突时：三方合并 → 成功则回写 IndexedDB；失败则进入决策 L1-22 的"用户手动解决"路径
  - 冲突检测：
    - 粒度：本轮架构按"文档级"但数据结构预留"行内/标记级"（L1-21 D + 补充的双层设计）
    - 超时：≤ 10s（L1-36）
  - 迁移（X-04 B）：启动时显式跑迁移脚本 + 进度 Modal（不隐式依赖 Dexie 自动升级）
  - 灾难恢复（X-11 C + 底线）：
    1. 启动时完整性检查（哈希链校验）
    2. 异常进入安全模式（仅核心功能可用）
    3. 自动尝试恢复最近 snapshot（非 diff）
    4. 恢复失败时显示"文章抢救"向导，至少导出所有可读文档为 Markdown
  - 验收矩阵（X-12 D）：每个 Task 必须附 `artifacts/<task-id>/` 含截图 / 日志 / 对比样本 / 导出结果
- **硬约束**:
  - 必须：IndexedDB 写入必须先于 Git 提交（不先 Git 再 DB）
  - 必须：Git 冲突写审计 `sync.conflict`
  - 必须：灾难恢复"文章不能丢"是硬底线（所有降级策略的最终护栏）
  - 必须：每次启动检查 `db_health` 并写日志
  - 禁止：用户主动删除 Git 历史不触发 DB 调整（DB 永远是主）
  - 禁止：安全模式允许 AI / 插件加载
- **落地点**:
  - `src/services/sync/git.ts`
  - `src/services/sync/conflictResolver.ts`
  - `src/services/dbMigration/runner.ts`
  - `src/services/disasterRecovery/healthChecker.ts`
  - `src/services/disasterRecovery/safeMode.ts`

---

# 域 M | 扩展与插件

## 决策 M-01 | 完整插件 SDK（L1-37 D 实现）

- **来源题**: L1-37 (D + "完全开源"), EX-07 (v2.1 自定义 CSS), T07-04 (B+C)
- **规范化结论**:
  - v2.1 交付的插件 SDK 能力面：
    | 扩展点 | 示例 | 安全级别 |
    | --- | --- | --- |
    | 主题 / 样式 | 预设主题包 | 无代码，配置级 |
    | 导出预设 | ExportPreset 共享 | 无代码，配置级 |
    | 编辑器节点 | 新的 TipTap 节点（如 Callout、AdvancedTable） | 代码，沙箱 |
    | 命令 | 注册 `edit.*` / `system.*` / `ai.*` / `publish.*` 命令 | 代码，沙箱 |
    | 工具栏 / 菜单 | 注入按钮 / 子菜单 | 代码，沙箱 |
    | 同步 Provider | WebDAV / Git 之外的第三方 Provider | 代码，网络权限 |
    | 发布渠道（PublishAdapter） | 新平台适配器 | 代码 + 网络 + 密钥 |
    | 知识源 Adapter | 新知识源（Obsidian / Notion 等）| 代码 + 网络 / FS 权限 |
    | 生命周期 hook | `onArticleCreate / onBeforeExport / onAfterPublish` 等 | 代码 |
    | UI 注入点 | Hub 卡片 / Sidebar Tab / Settings Tab | 代码 + UI |
  - SDK 分发：
    - 官方 SDK 包 `@inkforge/plugin-sdk`（npm）
    - 开发文档 + 示例仓库
    - v2.1 内置插件市场仅显示"Coming Soon"占位（真实市场延后到 v2.2）
    - 本地安装：用户指定插件包路径（`.iforge-plugin` 压缩包或解压目录）
- **硬约束**:
  - 必须：插件通过独立 JavaScript Context 加载（iframe 或 Web Worker）
  - 必须：插件 API 白名单（不暴露 `window.fetch / window.fs / Tauri API` 直接引用）
  - 必须：插件必须声明 manifest（id / name / version / permissions[] / hooks[] / uiInjections[]）
  - 必须：插件运行错误 → 自动禁用 + 通知用户（R-04 D）
  - 必须：与 CustomCSS (EX-07) 协调：CSS 级扩展走 CustomCSS 管线，不重复实现
  - 禁止：插件运行时修改其他插件的状态
  - 禁止：插件访问其他 Profile 的数据
  - 禁止：v2.1 支持任意代码的 "用户 JS 注入"（只支持通过 manifest 注册的 hook）
- **落地点**:
  - `@inkforge/plugin-sdk` npm 包
  - `src/services/plugins/loader.ts`
  - `src/services/plugins/sandbox.ts`
  - `src/services/plugins/api.ts`（白名单 API）
  - `src/views/settings/PluginsTab.vue`
  - Spec: `prompts/0420/spec/plugin-sdk.md`（待建）

---

## 决策 M-02 | 插件权限声明与沙箱

- **来源题**: L1-38 (C + "服务于写作"), L1-37 (D), R-04 (D)
- **规范化结论**:
  - 权限模型：**权限声明 + 沙箱（C 级），不做 D 的"签名 + 审查 + 兼容承诺"重流程**
  - 权限面：
    | 权限 | 含义 | 示例 |
    | --- | --- | --- |
    | `editor.read` | 读取当前文档 | 内容分析插件 |
    | `editor.write` | 修改文档（走 Command） | AI 插件 |
    | `command.register` | 注册命令 | 任何插件 |
    | `ui.inject` | 注入 UI 元素 | 工具栏增强 |
    | `network.fetch` | 网络请求（按域名白名单） | Publish Adapter |
    | `fs.read` / `fs.write` | 文件系统访问（按路径白名单） | Local 知识源 Adapter |
    | `db.read` / `db.write` | 数据库（仅插件自己的 namespace） | 持久化插件数据 |
    | `secret.read` | 读取密钥（按密钥 ID） | OAuth 插件 |
    | `audit.read` | 读取审计 | 审计可视化插件 |
  - 沙箱实现：
    - 编辑器节点扩展：TipTap 扩展注册（受 TipTap 本身约束）
    - UI 注入：Vue 组件限制在 `plugin-container`，CSS 受 CustomCSS 沙箱保护
    - 代码逻辑：Web Worker（插件进程）+ postMessage 白名单 API
  - 安装时：用户看到权限清单 + 同意（Chrome 扩展式）
  - 运行时：异常时禁用 + 写审计
  - 安装来源：v2.1 仅支持本地手动安装（不连插件市场远端仓库）
- **硬约束**:
  - 必须：插件 manifest schema 校验
  - 必须：权限申请在安装时一次性确认（运行时变更 = 更新版本 + 重新确认）
  - 必须：插件访问 Tauri API 必须通过 `@inkforge/plugin-sdk` 代理（不得 import tauri 直接）
  - 必须：R-04 D 的"自动禁用出错扩展"在插件系统实现（ExtensionHealth 监控）
  - 必须：沙箱隔离测试作为 E2E 用例（插件不能污染主应用）
  - 禁止：插件关闭沙箱（无"信任此插件"的绕过选项）
  - 禁止：插件通过 CustomCSS 执行 JS（EX-07 沙箱与 M-02 沙箱协同）
- **落地点**:
  - `src/services/plugins/manifest.ts`（schema 校验）
  - `src/services/plugins/permissionPrompt.ts`（安装时 UI）
  - `src/services/plugins/healthMonitor.ts`（R-04 D 联动）
  - `src/components/plugins/PermissionRequestDialog.vue`

---

## 决策 M-03 | 扩展的生命周期 / 事件 / 更新

- **来源题**: L1-37 (D), L1-38 (C + "服务于写作"), L1-56 (B 仅通知)
- **规范化结论**:
  - 插件生命周期事件：
    - `onInstall / onEnable / onDisable / onUninstall`
    - `onUpdate(oldVersion, newVersion)`（用于数据迁移）
  - 应用事件（插件可订阅）：
    - `article.create / article.update / article.delete`
    - `version.create / version.restore`
    - `export.before / export.after`
    - `publish.before / publish.after`
    - `profile.switch`
    - `command.execute`
  - 应用主程序更新（L1-56 B）：仅通知，不自动下载 / 安装
  - 插件更新：
    - v2.1 仅手动更新（用户重新安装）
    - v2.2+ 考虑自动检查（但仍通知式，对齐 L1-56）
- **硬约束**:
  - 必须：事件订阅必须声明在 manifest.hooks
  - 必须：插件禁用时自动取消所有订阅
  - 必须：插件卸载时清理其数据库 namespace + UI 注入
  - 必须：`profile.switch` 事件会导致插件 re-init
  - 禁止：插件订阅未声明的事件（manifest 校验阻断）
- **落地点**:
  - `src/services/plugins/eventBus.ts`
  - `src/services/plugins/lifecycleManager.ts`

---

## 决策 M-04 | 核心命令不走插件（内置 vs 可选 vs 插件 三层）

- **来源题**: L1-37 (D), EX-07 (v2.1 自定义 CSS), EX-08 (v2.1 片段系统)
- **规范化结论**:
  - 核心能力分层：
    | 层 | 定义 | 可禁用 / 卸载 | 例子 |
    | --- | --- | --- | --- |
    | **核心内置（Core）** | 产品身份必备 | ❌ 不可 | Typora 模式 / 基础编辑 / 版本管理 / 本地导出 / Profile 管理 |
    | **内置可选（Optional）** | 产品提供但用户可关闭 | ⚙️ 可禁用 | 微信发布 / AI 命令 / 同步 Provider / 命令面板 / 片段系统 / 字数报告 |
    | **插件（Plugin）** | 第三方或用户 | ✅ 可卸载 | 自定义 Publish Adapter / 知识源 Adapter / UI 增强 |
  - Optional 与 Plugin 的区别：
    - Optional 由 InkForge 官方维护，随主程序发版
    - Plugin 独立生命周期，有自己的版本号 / 更新
- **硬约束**:
  - 必须：Core 层即使在安全模式下也必须可用（至少以降级形式）
  - 必须：Optional 层的关闭不影响 Core（通过依赖检查）
  - 必须：Plugin 层异常不影响 Optional + Core
  - 禁止：Plugin 覆盖 Core 命令（插件命令 ID 必须使用 `plugin.<pluginId>.*` 前缀）
- **落地点**:
  - `src/services/features/registry.ts`（Optional 层开关）
  - `src/views/settings/FeaturesTab.vue`

---

# 跨域一致性与冲突最终裁定表

> 本节显式列出本部分范围内发现的所有冲突，并给出最终裁定，便于 PRD / Spec 阶段引用。

| # | 冲突点 | 涉及决策 | 最终裁定 |
| --- | --- | --- | --- |
| 1 | L1-28 **未填写**（命令权限/回滚） | I-06 | 按 **D 级**落地：所有改数据命令确认 + 版本点 + 审计 + 权限约束（推断自 L1-34 全范围 + L1-40 C + T05-12 D） |
| 2 | L1-34 A+B+C vs 补充"全范围" | K-02 | 按 **D 级**落地全范围审计（含 AI/命令），3 个月保留、可导出、用户可查看 |
| 3 | T05-08 B vs 补充"能做尽做" | I-02 | 递归菜单组件支持无限深度；B 是最低保证，推荐不超 3 级 |
| 4 | T03-11 **未选 + "不做 Web"** | I-04 | 仅走 Tauri/OS 黑/灰/白名单，不维护 Web 冲突规则 |
| 5 | L1-30 D vs 补充"各平台独立链路" | J-01 | Markdown 权威源共享 + Platform Renderer 各自独立，任何适配不得反向污染 |
| 6 | T04-08 C（不含 PDF）vs 潜在需要 | J-02 | v2.1 **不做 PDF**（以 P-05 A 为准） |
| 7 | T04-15 A vs "平台规则决定" | J-08 | 两层架构：UnifiedSanitizer（最低底线） + Platform Sanitizer（按 Adapter） |
| 8 | L1-23 D 共享模板/预设 vs T06-11 A 不共享 | K-03 | v2.1 默认不共享；提供单向导出/导入；共享能力 v2.2+ |
| 9 | T07-02 D（Git 同步）vs X-04 B 迁移 vs X-11 C 灾难恢复 | L-05 | **IndexedDB 为主，Git 为派生**；冲突走三方合并 → 失败用户手动解决 |
| 10 | L1-21 D（文档级假设）vs 补充"行内/标记级" | L-05 | 本轮按 D 走（单写者假设），数据结构预留 C 级粒度 |
| 11 | L1-22 D（三方合并）vs 补充"用户解决为主" | L-05 / K-01 | 默认三方合并，但即使成功也让用户确认（UI 始终显示三方结果） |
| 12 | L1-32 C（三端一致）vs "微信诡异规则" | J-04 | 升级为 D 级：定义三级降级策略 |
| 13 | L1-36 C（未选 D 的能力分级）vs "极致性能" | L-02 | 升级为 D 级：必须保真 / 可后台 / 可关闭三级 + 自动降级 |
| 14 | X-10 C（不要单独回滚批量）vs X-09 D（版本包全量回滚）vs S-11（模板不反向污染） | L-04 / M-04 | 版本粒度分层：文档版本=主线，命令版本点=挂在文档版本下，模板版本=独立 |
| 15 | L1-38 C（沙箱）vs L1-37 D（完整 SDK + 完全开源）vs"不作恶" | M-01 / M-02 | SDK 开放 D 级能力面，权限声明 + 沙箱是强制约束，不做 D 的签名/审查 |

---

# 索引：本部分决策清单

| 决策 ID | 标题 | 关键来源题 |
| --- | --- | --- |
| H-01 | 知识源连接器接口 + 渐进实现 | L1-25 |
| H-02 | 三层引用强制区分与显示契约 | L1-26, EX-10 |
| H-03 | 引用卡片与原文跳转契约 | L1-26 |
| H-04 | 知识摄取的权限与审计 | L1-25, L1-34, L1-37/38 |
| H-05 | 知识增强输出一致性门槛 | L1-26 |
| I-01 | 四类命令分域 + 统一注册表 + 可组合工作流 | L1-27, T05-09, EX-03, EX-08 |
| I-02 | 入口分工契约 | L1-29, T05-01~13, T05-07 |
| I-03 | Ctrl+\ 解耦 + 全局快捷键映射 | T03-06/07/08, T01-11, S-04, L1-55 |
| I-04 | 作用域 / Chord / OS 冲突 | T03-09/10/11/12/13 |
| I-05 | FindReplace vs Command Palette | T03-01/02, EX-03 |
| I-06 | 命令权限 / 确认 / 回滚 / 审计 | L1-28(推断D), L1-40, T05-12, X-10 |
| I-07 | 斜杠搜索与排序 | T05-06/10 |
| I-08 | AI 写入闭环 | T05-12, X-10, H-02 |
| I-09 | 命令可见性与只读态 | T05-13, L1-33 |
| J-01 | Markdown 权威 + 多平台独立链路架构 | L1-05/30/31/32, X-06 |
| J-02 | 导出覆盖面 + PDF 决议 | T04-08, P-05, S-08 |
| J-03 | 导出前预览与参数调整（补 P-01） | P-01(推断D), P-02/03 |
| J-04 | 公式/Mermaid/代码高亮导出契约与降级 | L1-32, T04-10/11/13/14 |
| J-05 | PublishAdapter 协议 + 自定义渠道 | P-06, L1-37 |
| J-06 | 剪贴板管线 + "复制为..." | P-03, T01-20, T04-06 |
| J-07 | 预览刷新 + Stage 架构 | T04-09/12/03/04, T09-08 |
| J-08 | 预览/导出/发布沙箱（两层架构） | T04-15 |
| J-09 | TOC 与脚注导出 | P-04, M-04, M-02 |
| K-01 | 资源级权限模型 + PermissionBroker | L1-33/24, T06-01/09 |
| K-02 | 全范围审计（D）+ 3 个月保留 | L1-34, X-10, R-02 |
| K-03 | 多账户隔离 + 共享区 | L1-23/24, T06-01/11, T07-08/07 |
| K-04 | 高危操作清单 + systemAuth | L1-40, T06-09, T07-09 |
| K-05 | 开发者/高级模式门槛 | T07-04/09, EX-07, R-03 |
| K-06 | 审计导出与隐私边界 | L1-34, R-02 |
| L-01 | 硬性能 SLO + Lighthouse | L1-35/36, X-05 |
| L-02 | 能力分级 + 自动降级 | L1-36, T08-11, T09-09, X-05 |
| L-03 | 图表与洞察性能 | T08-07/08/09/11 |
| L-04 | 版本存储与回滚性能 | X-07/09, L1-17/18 |
| L-05 | 同步/迁移/灾难恢复性能 | L1-20, T07-02, X-04/11/12 |
| M-01 | 完整插件 SDK | L1-37, EX-07, T07-04 |
| M-02 | 插件权限声明 + 沙箱 | L1-38, L1-37, R-04 |
| M-03 | 扩展生命周期/事件/更新 | L1-37/38/56 |
| M-04 | 核心内置/可选/插件 三层 | L1-37, EX-07/08 |

---

# 文档元数据

- **版本**: v1.0（0420 决策固化版）
- **总决策条数**: 35（H 5 + I 9 + J 9 + K 6 + L 5 + M 4，本部分覆盖的 6 个域）
- **已解决冲突条数**: 15（冲突裁定表）
- **覆盖题目**:
  - L1: L1-25/26/27/28(推断)/29/30/31/32/33/34/35/36/37/38/40 部分 + L1-23/24/17/18/02/03/05(引用) = 21 题深入覆盖
  - G/T03 全 13 题
  - T04 全 15 题
  - T05 全 13 题
  - T06: 09/11 引用
  - T07: 02/04/08/09 引用
  - T08: 01/07/08/09/11 引用
  - T09: 08/09 引用
  - X: 05/06/07/09/10/11/12 引用
  - S: 01/03/04/08/11/12 引用
  - EX: 03/07/08/10 进入 v2.1；09 延后
  - Enhancement P 全 6 题（P-01 推断补齐）
  - Enhancement R: 02/03/04/05 引用
- **后续产出**: Part 1（产品定位/编辑器/评论/历史/同步/账户/UI打磨）、Part 3（Hub/Workstation/文件管理/元数据/FTUE）
- **预期落地**: 所有决策对应到 `prompts/0420/spec/*.md` 与 `src/**/*` 路径
