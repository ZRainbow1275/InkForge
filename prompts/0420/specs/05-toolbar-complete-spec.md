# 05 - 浮动工具栏 / 右键菜单 / 斜杠命令完整规范

> 文档类型: Spec
> 阶段: Phase 3 (UI 外壳) + Phase 2 依赖（编辑器）
> 依赖: 01-spec-editor-typora, 22-command-palette-spec, 24-permission-audit-spec, 25-extension-plugin-spec, 28-asset-pipeline-spec, 06-spec-account-auth（版本点）
> 来源问卷题号: T05-01 ~ T05-13, L1-27, L1-29, E-08, M-01, M-05, X-01, X-10
> 权威来源: 本 Spec 各条目在"权威来源表"章节逐条标记
> 创建日期: 2026-04-20
> 最后更新: 2026-04-29

---

## 一、背景与目标

### 1.1 背景

0327 版 `05-toolbar-complete-spec.md` 只规定了 FloatingToolbar 的外观和点选命令，没有统一命令模型，也没有考虑 AI/自动化命令的回滚、右键菜单的多级嵌套、以及图像素材的统一管线。用户在 0420 问卷（T05 全 13 题 + 增强问卷 M/E/P 多题）中把"命令系统"抬升为**中枢基础设施**的优先级：一切编辑/系统/AI/发布动作都必须通过统一注册表，并支持权限、审计、回滚、搜索排序。

### 1.2 本 Spec 目标

1. 建立**单一 Command Registry**，作为所有入口（快捷键 / 斜杠 / 浮动工具栏 / 右键菜单 / 命令面板 / 插件 SDK）的唯一 source of truth。
2. 实现**四域分离**（edit / system / ai / publish）的 namespace + 权限模型。
3. 所有 AI / 自动化 / 批量命令**必须先生成 diff 预览 + 自动生成版本点**；被拒绝的变更可以无损撤销。
4. 右键菜单支持**任意深度嵌套**（不仅限于二级，"能做尽做"）。
5. 资产（图片 / 附件 / 截图 / GIF / SVG / 远程 URL）走**统一 AssetPipeline**，本地化到应用数据目录。
6. Typora / Source 模式下 FloatingToolbar **行为完全一致**。
7. 斜杠命令采用**模糊匹配** + **多维排序**（上下文相关 + 最近使用 + 用户收藏 / 置顶）。
8. 颜色选择器支持预设 16 色 + 最近使用 + 自定义色。

### 1.3 产品铁律映射

| 铁律 | 落地条款 |
|------|---------|
| 铁律 3（零空壳交付） | 命令注册表必须在 v2.1 真实落地，所有入口统一消费 |
| 铁律 12（命令系统四类分离） | §2 命令四域 + §3 命令元数据 |
| 铁律 7（自动保存失败用户可见） | §17 AI 命令失败必须显式 Toast + 日志 |
| 铁律 15（性能 SLO） | §10 斜杠搜索响应 ≤ 50ms；§11 排序 ≤ 100ms |

---

## 二、范围与边界（进 / 不进 / 延后）

### 2.1 本轮进入 scope

- Command Registry 中枢（§1）
- 四域命名空间 + 权限（§2）
- 命令元数据 schema（§3）
- 搜索排序算法（§4、§11）
- 入口消费协议（§5）
- FloatingToolbar 一致性 + 溢出修复（§6、§7）
- 右键菜单递归嵌套 + 上下文敏感（§8、§9）
- 斜杠命令 fuzzy + 排序（§10、§11）
- 颜色选择器完整版（§12）
- 链接 Popover + Tooltip（§13）
- Callout / Details 轻量实现（§14）
- AssetPipeline（§15）
- Tauri clipboard（§16）
- AI 命令预览 + 版本点（§17）
- 权限 / 审计接入点（§18）

### 2.2 不进入

- 正式 Callout / Admonition 自定义节点（M-01 A → v2.2+）
- 嵌入块（M-07 A）
- 真实 AI Provider 接入（v2.1 仅命令占位 + mock provider）
- 插件 SDK 第三方扩展仓库（仅接口，社区分发不做）

### 2.3 延后

- 命令组合工作流模板（L1-27 D 的 "composable flow"）—— 接口预留，模板库 v2.2+
- 命令面板高级 DSL（如 `@article:` `#tag:` 作用域前缀）—— 基础 fuzzy 先行

---

## 三、详细规范 / 需求条目

## §1 统一命令注册表架构

### 1.1 核心数据流

```
                ┌─────────────────────────┐
                │    CommandRegistry      │ ← 唯一中枢
                │  (Map<id, Definition>)  │
                └───┬───────┬────────┬────┘
                    ▲       │        │
  register()        │       │ lookup │
 ┌──────────────────┘       │        ▼
 │  + Core Built-ins        │    ┌───────────────────────┐
 │  + ExtensionSDK          │    │  Consumer Adapters    │
 │                          │    ├───────────────────────┤
 │                          │    │ KeybindingAdapter     │
 │                          │    │ SlashCommandAdapter   │
 │                          │    │ FloatingToolbarAdapter│
 │                          │    │ ContextMenuAdapter    │
 │                          │    │ CommandPaletteAdapter │
 │                          │    │ PluginAdapter         │
 │                          │    └───────────────────────┘
 │                          │        │  execute(id, ctx)
 │                          │        ▼
 │                          │    ┌───────────────────────┐
 │                          │    │   ExecutionPipeline   │
 │                          │    ├───────────────────────┤
 │                          │    │ 1. Permission Guard   │
 │                          │    │ 2. Precondition Check │
 │                          │    │ 3. Risk Classifier    │
 │                          │    │ 4. Diff Preview(AI)   │
 │                          │    │ 5. VersionPoint       │
 │                          │    │ 6. Execute            │
 │                          │    │ 7. Audit Log          │
 │                          │    │ 8. Toast / Error      │
 │                          │    └───────────────────────┘
```

### 1.2 注册表接口

```ts
// src/services/command-registry/types.ts
export interface CommandDefinition<TPayload = unknown, TResult = unknown> {
  id: CommandId                  // 'edit.bold' / 'ai.rewrite' / etc.
  domain: 'edit' | 'system' | 'ai' | 'publish'
  label: string                  // 'Bold'
  labelKey?: string              // i18n key
  description?: string
  icon?: string                  // icon name
  shortcut?: string              // default 'Mod+B'
  keywords?: string[]            // for fuzzy search
  aliases?: string[]             // alternative names
  category?: string              // 'text-format' / 'insert' / 'file' / ...
  risk: 'safe' | 'low' | 'medium' | 'high' | 'data-risk'
  requiresAuth?: boolean         // high-risk ops need re-auth
  requiresConfirm?: boolean
  previewable?: boolean          // AI/bulk needs diff preview
  createsVersionPoint?: boolean
  enableWhen?: (ctx: CommandContext) => boolean
  visibleWhen?: (ctx: CommandContext) => boolean
  handler: (payload: TPayload, ctx: CommandContext) => Promise<TResult>
  undoHandler?: (result: TResult, ctx: CommandContext) => Promise<void>
  meta?: Record<string, unknown>
}

export interface CommandContext {
  editor?: Editor                // TipTap editor instance
  selection?: ProseMirrorSelection
  articleId?: string
  accountId: string
  mode: 'typora' | 'source' | 'preview' | 'hub' | 'workstation' | 'settings'
  readonly: boolean
  hasPermission: (cap: string) => boolean
  signal?: AbortSignal
}
```

### 1.3 注册表 API

```ts
class CommandRegistry {
  register(def: CommandDefinition): Unregister
  unregister(id: CommandId): void
  get(id: CommandId): CommandDefinition | undefined
  list(filter?: { domain?, category?, predicate? }): CommandDefinition[]
  search(query: string, ctx: CommandContext, opts?: { limit?: number }): SearchResult[]
  execute(id: CommandId, payload: unknown, ctx: CommandContext): Promise<unknown>
  canExecute(id: CommandId, ctx: CommandContext): { ok: boolean; reason?: string }
}
```

### 1.4 生命周期

1. App boot → `registerBuiltinCommands()` 注册所有内置命令（静态定义文件 `src/services/command-registry/builtins/`）。
2. 插件加载 → `plugin.register(registry)` 追加命令。
3. 运行时 → 各 Adapter 通过 `list()` / `search()` 拉取命令供 UI 消费。
4. `execute()` → 通过 ExecutionPipeline（见 §1.5）。

### 1.5 ExecutionPipeline

执行顺序（任一步失败抛出 `CommandAbort` 并走 audit）：

1. **Permission Guard**：检查 `hasPermission` + `requiresAuth`。高危必须过 Windows Hello / 本地密码（06-spec-account-auth）。
2. **Precondition Check**：`canExecute()` 在 UI 层已检查；再次兜底。
3. **Risk Classifier**：`risk === 'data-risk'` → 进入"强制备份 + 二次确认"；`requiresConfirm` → 弹 ConfirmDialog。
4. **Diff Preview**（仅 AI / 批量）：生成 diff 展示，用户确认才继续。
5. **VersionPoint**：`createsVersionPoint === true` → 调用 `versionStore.snapshot(bundle)`。
6. **Execute**：`handler(payload, ctx)`，支持 AbortSignal。
7. **Audit Log**：记录命令 id、payload 摘要、范围摘要、结果、耗时、执行者、时间戳。
8. **Toast / Error**：成功 → 可选 Toast；失败 → 必然 Toast + 详情入口。

---

## §2 命令四域分离（namespace + 权限）

### 2.1 四域定义

| Domain | Prefix | 说明 | 典型命令 |
|--------|--------|------|---------|
| **edit** | `edit.` | 编辑器内容操作 | `edit.bold`, `edit.insertTable`, `edit.formatClear` |
| **system** | `system.` | 应用级系统动作 | `system.openSettings`, `system.switchAccount`, `system.openTrash` |
| **ai** | `ai.` | AI 辅助 | `ai.rewrite`, `ai.summarize`, `ai.translate`, `ai.continueWriting` |
| **publish** | `publish.` | 导出 / 发布 | `publish.exportWechat`, `publish.copyHtml`, `publish.openHistory` |

### 2.2 域级默认权限策略

| Domain | 默认 risk | 默认 previewable | 默认 createsVersionPoint | 默认 requiresAuth |
|--------|-----------|------------------|--------------------------|-------------------|
| edit | `low` | false | false | false |
| system | `medium` | false | false | 部分（删账户 / 重置 DB） |
| ai | `medium` | **true** | **true** | false（但可配置） |
| publish | `low` | false | false | 导出全量数据时 true |

任何违反默认策略的命令必须在 `CommandDefinition` 里显式覆盖并在代码注释中说明原因。

### 2.3 域级可见性规则

- `mode === 'preview'` / `mode === 'hub'` → 自动隐藏所有 `edit.*`
- `readonly === true`（归档、回收站内的文档）→ 自动禁用所有 `edit.*` 和 `ai.*`
- 未配置 AI Provider → `ai.*` 全部 disabled 并展示说明文案（不隐藏，帮助建立心智）

---

## §3 命令元数据（id/label/icon/enableWhen/handler）

### 3.1 命名规范

- `id`：`<domain>.<verb>[.<qualifier>]`，kebab-case；全局唯一
- `label`：句式一致（动词开头，首字母大写）
- `keywords`：至少 3 个（中英双语均可），覆盖常见别名
- `aliases`：用户常见错拼 / 简称
- `category`：UI 分组字段，用于斜杠命令 / 命令面板的分组展示

### 3.2 示例（内置命令样本）

```ts
export const boldCommand: CommandDefinition = {
  id: 'edit.bold',
  domain: 'edit',
  label: 'Bold',
  labelKey: 'cmd.edit.bold',
  icon: 'bold',
  shortcut: 'Mod+B',
  keywords: ['bold', '加粗', '粗体', 'strong'],
  category: 'text-format',
  risk: 'safe',
  enableWhen: (ctx) => !!ctx.editor && !ctx.readonly,
  handler: async (_, ctx) => {
    ctx.editor!.chain().focus().toggleBold().run()
  },
}
```

### 3.3 元数据校验

- 启动时对所有已注册命令运行 `validateCommandDefinition()`，缺字段 / id 冲突即抛错，阻断启动（防止错误命令进入用户视野）。
- 插件注册失败 → 单独 disable 该插件，不影响 app 启动。

---

## §4 命令搜索排序算法

### 4.1 搜索输入

```ts
search(query: string, ctx: CommandContext): SearchResult[]
```

### 4.2 得分构成（score = Σ weights）

| 维度 | 权重 | 说明 |
|------|------|------|
| 模糊匹配得分 | 0.40 | Fuse.js score（见 §10） |
| 上下文相关性 | 0.25 | `enableWhen(ctx) === true` 加分；当前选区匹配加分；mode 匹配加分 |
| 最近使用频率 | 0.15 | 24h 内使用次数 × 衰减系数 |
| 收藏 / 置顶 | 0.10 | 用户标星 / 拖到"顶部"的命令额外加分 |
| 域偏好 | 0.05 | 当前 mode 的默认 domain 加分 |
| 使用总次数 | 0.05 | 历史总次数 log-scaled |

> 所有权重在 `SettingsRegistry` 里可调（Advanced Tab）。默认值如上。

### 4.3 性能约束

- 全量候选命令数量上限：v2.1 估算 300 ~ 500
- 搜索必须在 ≤ 50ms 返回前 50 条（X-05 Lighthouse）
- 超过则使用 Web Worker 索引（`src/workers/command-search.worker.ts`）

---

## §5 入口消费协议

### 5.1 Consumer 接口统一

所有 UI 入口通过同一份 Adapter 接口消费 Registry：

```ts
interface CommandAdapter {
  mount(container: HTMLElement, ctx: CommandContext): void
  refresh(ctx: CommandContext): void
  dispose(): void
}
```

### 5.2 入口分工（L1-29 A 铁律）

| 入口 | 职责 | 禁止 |
|------|------|------|
| 快捷键 | 熟练操作：高频编辑命令 | 不承担"插入"或"创建"类长命令 |
| 斜杠命令 `/` | **插入 / 创建**：块元素、模板、片段 | 不承担"选区格式化" |
| 浮动工具栏 | **选区格式化**：加粗 / 颜色 / 链接 | 不承担"插入" |
| 右键菜单 | 上下文辅助命令 + 剪贴板 | 不承担深度 AI 工作流（走命令面板） |
| 命令面板 Ctrl+P | 全量命令搜索 | 无 |
| 插件 SDK | 扩展命令接入 | 同上 |

### 5.3 Adapter 刷新时机

- 光标移动 → debounce 100ms → `refresh()`
- mode 切换 → 立即 `refresh()`
- Registry 变更（插件加载 / 卸载）→ 立即 `refresh()`

---

## §6 FloatingToolbar 布局（Typora / Source 一致）

### 6.1 一致性约束（X-01 A）

- 同一套按钮集、同一套分组、同一套交互。
- Source 模式下工具栏动作必须走 `source-mode-actions.ts`，将"加粗" → `**...**` 包裹选区。

### 6.2 按钮分组

```
┌─────────────────────────────────────────────────────────────┐
│ [B] [I] [U] [S] | [Heading] | [Bullet] [Numbered] [Quote] [Code] | [Color] [Highlight] | [Link] [More] │
└─────────────────────────────────────────────────────────────┘
```

- Group 1 Text-format：Bold / Italic / Underline / Strikethrough
- Group 2 Heading dropdown：H1~H6 / Paragraph
- Group 3 Block：Bulleted / Numbered / Quote / Code
- Group 4 Color：字色 + 高亮色（使用 §12 ColorPicker）
- Group 5 Link：Ctrl+K Popover（§13）
- Group 6 More：其余命令 Overflow 菜单（§7）

### 6.3 显示触发

- 非空选区 → 200ms 后浮现（避免拖选过程中闪现）
- 选区为空 → 隐藏
- 输入法组合中 → 保留当前工具栏，不重新计算位置（遵循 T01-16 C）

### 6.4 定位

- 使用 `Selection.getBoundingClientRect()`（当前代码已重写，见 commit 6e73ca5）
- 优先显示在选区上方；顶部空间不足 → 切换到下方
- 超出视口横向 → 贴边显示
- 工具栏高度固定 36px；按钮 28×28 + 间距 4px

---

## §7 FloatingToolbar 溢出修复

### 7.1 溢出问题

0327 版按钮分组一字排开，宽度 > 640px；在窄屏或纸张宽度 Narrow 档位下经常溢出屏幕。

### 7.2 策略

- Group 1~3 永远可见（核心能力）
- Group 4~5 视宽度降级
- Group 6 "More ⌘"是一个溢出抽屉，默认隐藏其他 Group 的"次要按钮"（基于 `visibleWhen`）
- 窗口宽度监听（`useElementSize`）→ 动态调整显示的按钮集

### 7.3 降级顺序

```
1440px+   : 全量按钮
1024-1440 : 隐藏 Underline + Strikethrough → 进 More
768-1024  : 再隐藏 Color/Highlight → 进 More
< 768     : 仅留 B/I/H/List/Link + More
```

---

## §8 右键菜单递归嵌套（无层级限制）

### 8.1 数据结构（T05-08 B + 补充）

```ts
type MenuItem =
  | { type: 'action'; command: CommandId; label?: string; disabled?: boolean }
  | { type: 'separator' }
  | { type: 'group'; label: string; children: MenuItem[] }  // 二级及以上
  | { type: 'checkbox'; command: CommandId; checked: () => boolean }
  | { type: 'radio'; groupId: string; command: CommandId; value: string; current: () => string }
```

`group.children` 可再嵌套 `group` —— 支持任意深度。

### 8.2 渲染

- 使用递归组件 `<ContextMenuNode :items>`
- 展开方向：默认向右；若右侧空间不足，向左弹出
- 键盘导航：Up/Down 移动，Right 进入子菜单，Left 返回父菜单，Enter 执行，Esc 关闭
- 鼠标悬停 300ms 自动展开子菜单（防误触）

### 8.3 性能

- 单菜单总节点数上限 200（超过警告 + 截断）
- 子菜单按需渲染（首次展开才 mount）

---

## §9 右键菜单上下文敏感子集

### 9.1 基本切片（T05-13 C）

根据点击位置的节点类型生成不同菜单：

| 上下文 | 典型菜单项 |
|--------|-----------|
| 普通段落 | Cut / Copy / Paste / Paste As Plain / Format > ... / Insert > ... / AI > ... |
| 代码块 | Copy Code / Copy as Rich Text / Change Language / Toggle Line Numbers |
| 图片 | Replace / Edit Alt / Resize / Align / Open Gallery / Delete |
| 链接 | Open / Copy Link / Edit / Unlink |
| 表格 | Insert Row / Insert Col / Align Col / Convert to Pipe / Delete |
| 选区（多节点） | Copy / Copy as Markdown / Wrap In > ... / AI > ... |

### 9.2 禁用规则

- `readonly === true` → 所有写操作置灰（非隐藏），通过 Tooltip 说明原因（T05-13 C 保留可见）
- 未配置 AI Provider → `AI >` 分组置灰

---

## §10 斜杠命令 fuzzy 过滤

### 10.1 触发

- 行首输入 `/` → 激活
- 非行首（如 "hello /abc"）→ 不激活，保留字符原样
- 已激活状态输入继续字符 → 增量过滤
- 按 Esc / 空格 / 移动光标离开 → 退出

### 10.2 fuzzy 算法

- 使用 [Fuse.js](https://fusejs.io) 或等价实现
- 匹配字段：`id`、`label`、`keywords`、`aliases`
- 选项：`threshold: 0.35`，`ignoreLocation: true`，`minMatchCharLength: 1`
- 支持"首字母匹配"：输入 `cdblk` → 匹配 `code-block`（E.g. 正则 `/^c.*d.*b.*l.*k$/i` 的首字母链）

### 10.3 交互

- 上下箭头选择，Enter 确认，Tab 也确认
- 预览：悬停候选项 → 右侧显示命令描述 + 快捷键 + 图标
- 创建类命令（如插入表格）执行后插入点留在新节点内合适位置

---

## §11 斜杠命令排序（上下文 + 频率 + 收藏）

### 11.1 排序策略（T05-10 D）

遵循 §4 的得分模型，额外约束：

- 固定分组（`category`）优先展示组名 → 组内按分数降序
- 分组顺序：`insert > text-format > ai > publish > system`
- 用户置顶的命令 → 最上方独立"Pinned"分组，不走 fuzzy
- 同分 → `label` 字母序

### 11.2 用户自定义

- Settings > Editor > Slash Commands 提供：
  - Pin to top（最多 10 条）
  - Hide from results（屏蔽某命令在斜杠中出现）
  - Favorite（收藏加分）

### 11.3 使用统计持久化

- Schema: `command_usage_stats` 表
  ```
  { commandId, accountId, lastUsedAt, usedCount, pinnedOrder?, hidden? }
  ```
- 每次 execute 成功 → 异步 upsert 一条记录（不阻塞主流程）

---

## §12 颜色选择器

### 12.1 组成

- **预设 16 色**（Ethereal 色系调色板，Part 3b 20-theme-font-typography 提供 tokens）
- **最近使用**：8 个槽位，先进先出
- **自定义**：HSL 圆盘 + HEX 输入 + 取色器（`<input type="color">` 兜底）

### 12.2 行为

- 点击预设 → 立即应用 + 自动关闭面板
- 点击自定义 → 打开拾色器，确认后才应用
- 自动写入 `editor_prefs.colorHistory`（AccountStore）
- 字色与高亮色共用同一组件，但独立历史

### 12.3 暗色模式

- 预设 16 色在暗色主题下提供对比调整（CSS variables），确保 WCAG AA 对比（虽然 G-09 不做全 a11y，但颜色可读性是硬需求）

---

## §13 链接编辑（内联 Popover + Tooltip）

### 13.1 Popover（Ctrl+K / 浮动工具栏 Link 按钮）

- 位置：选区附近 / 链接节点附近
- 字段：URL + Title（可选）
- 动作：Confirm / Cancel / Unlink
- 自动检测：粘贴 URL 到非链接选区 → 自动弹 Popover 询问是否套用
- 不做完整"自动链接检测"（与 E-08 C 一致：E-02 D 的智能标点不包含自动链接）

### 13.2 Tooltip（E-08 C）

- Hover 已有链接 → 显示 Tooltip，内含：
  - URL 纯文本
  - 三个按钮：Edit / Copy / Unlink
  - Ctrl+Click 直接跟随（hover 不跟随）
- Tooltip 500ms 延迟出现，离开 200ms 消失（避免抖动）

### 13.3 安全

- 链接 URL 必须通过 DOMPurify schema 过滤：禁止 `javascript:`, `data:text/html`, `vbscript:` 协议
- 外链点击前检查并提示（Settings > Editor > Warn Before External Link，默认开）

---

## §14 Callout / Details 轻量实现（T05-02 A）

### 14.1 Callout（CSS-only）

- 不新增 ProseMirror Node，复用 `blockquote`
- 通过 TipTap `Blockquote` 扩展的 `addAttributes({ variant })` 加变体字段
- 变体：`info` / `warning` / `error` / `success` / `quote`（默认）
- Markdown 序列化：
  ```markdown
  > [!info]
  > Content line 1
  > Content line 2
  ```
  与 MkDocs / GitHub 的 admonition 语法兼容

### 14.2 Details（原生 `<details>`）

- 新增 TipTap Extension `DetailsExtension`（参考 M-05 D）
- 支持斜杠命令 `/details` 插入
- Typora 模式：光标进入 Summary 时可编辑标题，离开渲染为折叠态
- 默认展开状态可配置（attribute `open: boolean`）

### 14.3 导出兼容

- 微信 / 知乎 / 小红书：Details 导出时根据平台规则降级为 `**标题**\n> 内容`（由 PublishAdapter 处理）
- HTML 导出：保留原生 `<details>` 标签

---

## §15 AssetPipeline（统一资产管线）

### 15.1 入口

| 入口 | 来源 | 处理 |
|------|------|------|
| 文件选择器 | File Input | 直接走 pipeline |
| 拖拽 | drop 事件 | 批量进 pipeline |
| 粘贴图片 | clipboard `image/*` | 临时保存 → pipeline |
| 粘贴 HTML（含 img） | 清洗 HTML | 每个 img src 进 pipeline（支持远程 URL fetch） |
| 截图 | Ctrl+Shift+S（或托盘） | 临时文件 → pipeline |
| Markdown import | `![](file:///...)` | 复制到资产目录 → 重写 path |

### 15.2 流程

```
Input  →  Validate  →  Deduplicate  →  Rename  →  Store  →  IndexUpdate  →  Emit URL
          │              │              │         │          │
          │              │              │         │          └─ assets_index 表
          │              │              │         └─ <dataDir>/<accountId>/<articleId>/assets/
          │              │              └─ hash(content).<ext>
          │              └─ 基于 content-hash；命中则复用（refCount++）
          └─ 大小阈值（默认 20MB）+ MIME 白名单 + 扫描危险扩展
```

### 15.3 去重（F-04 D + T05-11 D）

- 计算 `sha256(content)` 作为 asset id
- 已存在 → refCount++，返回既有 URL
- 文档删除时 refCount--；refCount === 0 → 归入 orphan 列表（30 天后清理）

### 15.4 本地化远程 URL

- 粘贴 HTML 含 `<img src="https://...">` → 后台 fetch 并保存本地
- 失败则保留原 URL + 在 asset_index 标记 `remote: true`
- 用户可在资产管理页批量重新下载

### 15.5 Tauri 文件系统（T05-03 D）

- 使用 `@tauri-apps/plugin-fs` 写入 `<appDataDir>/<accountId>/<articleId>/assets/`
- 发布 / 导出时由 PublishAdapter 决定嵌入策略（base64 / 上传 / 外链，各平台自决，参考 T04-14 C）

### 15.6 存储统计联动

- 每次写入 / 删除 → emit `asset.changed` 事件
- Data Insights（08-spec-insights）的 StorageBreakdown 图订阅该事件

---

## §16 Tauri clipboard（T05-01 A）

### 16.1 只走 Tauri clipboard API

- 使用 `@tauri-apps/plugin-clipboard-manager`
- Web 开发态（G-06 B）下降级到 `navigator.clipboard`（仅供调试用）

### 16.2 多 MIME 支持

- Copy Code（富文本）→ 写入 `text/plain` + `text/html`（T04-06 C）
- Copy Markdown（选区）→ 写入 `text/plain`（Markdown）+ `text/html`（渲染结果）
- 具体由 `ClipboardPipeline`（见 P-03 决策）统一协调

### 16.3 剪贴板安全

- 复制前对 `text/html` 做 DOMPurify 清洗，避免泄露编辑器内部 class / data-* 属性

---

## §17 AI / 自动化命令预览 + 版本点

### 17.1 预览流程（T05-12 D）

```
User Trigger AI Command
         │
         ▼
   Collect Scope (selection / paragraph / article / batch)
         │
         ▼
   Invoke AI Provider (mock in v2.1)
         │
         ▼
   Build Diff (text diff-match-patch + structured metadata)
         │
         ▼
   Show DiffPreviewModal
   ├── Accept → Snapshot VersionPoint → Apply
   ├── Reject → Discard (no side effect)
   └── Partial Accept → Apply subset → Snapshot
```

### 17.2 版本点（X-10 C）

- 每次 Apply 必须生成一个 `DocumentVersionBundle` 快照（见 Part 3a 决策 V-07）
- 命名：`ai:<commandId>@<timestamp>`
- 用户可在版本历史面板单独回滚该版本点

### 17.3 批量操作

- 批量调用 AI 时，每个受影响文档独立生成版本点
- 进度条显示批次处理状态；任一失败 → 整批停止，已完成部分不回滚，失败位置可重试

### 17.4 审计

- 审计 payload 包括：命令 id、影响的 articleIds、字符数增量、耗时、provider（占位 mock）、用户确认记录

### 17.5 Mock Provider（v2.1 不做真实 AI）

- 在 Settings > AI Tab 仅展示占位（T07-01 A）
- 为了让 §17 pipeline 可验收，提供 `MockAIProvider`：返回随机润色（大小写翻转 + 长度变化）作为 E2E 测试锚点

---

## §18 权限 / 审计接入点

### 18.1 权限检查（L1-33 C）

- ExecutionPipeline Step 1 调用 `permissionService.check(commandId, ctx)`
- 资源级权限由 24-permission-audit-spec 定义；本 Spec 仅定义接入点

### 18.2 审计

- 所有 `execute()` → 无论成功 / 失败 → 写入 `activity_logs`
- 字段：`{ ts, accountId, domain, commandId, scope, payloadDigest, result, error?, durationMs, source }`
- 保留 90 天（L1-34 补充）
- 敏感 payload（如完整正文）只存摘要 + 字符数，避免日志膨胀

### 18.3 跨接失败（Graceful degrade）

- 审计服务不可用时，命令仍可执行，但本地排队 retry；累计超过 50 条未同步 → 进入"审计降级"Banner 警示

---

## 四、数据模型变更

```sql
-- 命令使用统计
CREATE TABLE command_usage_stats (
  id INTEGER PRIMARY KEY,
  accountId TEXT NOT NULL,
  commandId TEXT NOT NULL,
  lastUsedAt INTEGER,
  usedCount INTEGER DEFAULT 0,
  pinnedOrder INTEGER,  -- NULL means not pinned
  hidden BOOLEAN DEFAULT 0,
  UNIQUE(accountId, commandId)
);

-- 资产索引
CREATE TABLE assets_index (
  id TEXT PRIMARY KEY,             -- sha256
  accountId TEXT NOT NULL,
  articleIds TEXT,                  -- JSON array
  filePath TEXT NOT NULL,
  originalName TEXT,
  mime TEXT,
  size INTEGER,
  createdAt INTEGER,
  refCount INTEGER DEFAULT 0,
  remote BOOLEAN DEFAULT 0,
  remoteUrl TEXT
);

-- AI 建议（预览 / 应用 / 拒绝追踪）
CREATE TABLE ai_suggestions (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  articleId TEXT,
  commandId TEXT NOT NULL,
  diffJson TEXT,
  status TEXT CHECK(status IN ('pending', 'applied', 'rejected', 'partial')),
  createdAt INTEGER,
  resolvedAt INTEGER,
  versionBundleId TEXT  -- foreign key to document_versions
);
```

---

## 五、接口与落地目录

```
src/
├── services/
│   ├── command-registry/
│   │   ├── index.ts                   // CommandRegistry 类
│   │   ├── types.ts
│   │   ├── execute-pipeline.ts
│   │   ├── ranker.ts                  // §4 排序
│   │   └── builtins/
│   │       ├── edit/*.ts
│   │       ├── system/*.ts
│   │       ├── ai/*.ts
│   │       └── publish/*.ts
│   ├── command-audit/
│   │   └── logger.ts
│   ├── ai-command-executor/
│   │   ├── mock-provider.ts
│   │   └── diff-builder.ts
│   ├── asset-pipeline/
│   │   ├── pipeline.ts
│   │   ├── dedupe.ts
│   │   ├── store-local.ts             // Tauri fs
│   │   └── remote-fetcher.ts
│   └── clipboard/
│       └── tauri-clipboard.ts
├── components/
│   ├── editor/
│   │   ├── FloatingToolbar.vue        // 复用重写后的定位
│   │   ├── FloatingToolbarOverflow.vue
│   │   ├── LinkPopover.vue
│   │   ├── LinkTooltip.vue
│   │   └── ColorPicker.vue
│   ├── common/
│   │   ├── ContextMenu.vue            // 递归组件
│   │   └── DiffPreviewModal.vue
│   └── command/
│       ├── SlashCommandMenu.vue
│       └── CommandPalette.vue         // 依赖 22-command-palette
├── workers/
│   └── command-search.worker.ts
└── stores/
    └── command-stats.ts
```

---

## 六、性能与降级

| 指标 | 目标 | 降级 |
|------|------|------|
| 斜杠搜索响应 | ≤ 50ms | Worker 索引 |
| 命令面板搜索 | ≤ 80ms | 同上 |
| FloatingToolbar 出现延迟 | ≤ 200ms | debounce |
| 右键菜单首次打开 | ≤ 80ms | 子菜单懒渲染 |
| AssetPipeline 本地化单文件 | ≤ 300ms（< 5MB） | Worker + 进度条 |
| 批量 AI 命令 | 单项 ≤ 2s（mock） | 可取消，AbortSignal 全链路 |

---

## 七、验收矩阵

### 正向样本

1. 右键菜单 4 级嵌套可渲染、可键盘导航、可执行底层命令
2. 斜杠命令 `/cdblk` 模糊匹配到 `code-block` 并正确插入
3. AI 命令生成 diff，用户部分接受，自动生成版本点，可从版本历史回滚
4. 图片粘贴后自动本地化，assets_index 记录 refCount=1
5. 用户切暗色主题，调色板 16 色对比度仍符合预期
6. 颜色选择器最近使用历史跨会话保留
7. Ctrl+K 链接 Popover 支持键盘全流程（URL 输入 → Enter 确认 → Esc 取消）
8. Typora/Source 模式切换 FloatingToolbar 行为一致，Source 下"加粗"包裹 `**`

### 失败样本

9. 斜杠命令输入无匹配 → 显示"No command found" + 引导去命令面板
10. 高危命令未过 Windows Hello → ExecutionPipeline 抛 `AuthRequired`，Toast + 重试入口
11. AI Provider mock 异常 → 详细错误 Toast + 审计写入 `result: error`
12. AssetPipeline 文件 > 20MB → 友好拒绝 + 建议开启 Advanced 调阈值

### 恢复样本

13. 审计服务宕机 → 命令仍可执行，本地队列；恢复后自动回放
14. 图片 refCount 降为 0 → 30 天后孤儿清理 GC 生效
15. AI 命令应用后用户不满意 → 1 键回滚到版本点，文档完整还原

### 边界样本

16. 命令注册表冲突（同一 id 被两个插件注册）→ 启动报错 + 禁用冲突插件
17. 命令元数据缺字段 → 启动阻断 + 错误明细页
18. 单菜单 > 200 项 → 截断并提示
19. 空选区拖动触发 FloatingToolbar 出现 → 不出现（debounce 生效）
20. 输入法 composition 中右键 → 菜单延后到 `compositionend` 后弹出

---

## 八、权威来源表

| 条目 | 权威来源 | 注释 |
|------|---------|------|
| 命令注册表架构 | 文档（决策 Part 2 + T05-09 D） | 新增 |
| 四域分离 | 文档（L1-27 D 补充） | 新增 |
| AI 预览 + 版本点 | 文档（T05-12 D + X-10 C 补充） | 新增 |
| 右键递归嵌套 | 文档（T05-08 B + 补充"能做尽做"） | 0327 选项 B 不够 |
| 斜杠 fuzzy | 文档（T05-06 C） | 沿用 0327 思路 + 升级算法 |
| 颜色选择器 16 + 最近 + 自定义 | 文档（T05-05 C） | 新增 |
| 链接 Popover | 文档（T05-04 A + E-08 C） | 升级 |
| Callout CSS-only / Details | 文档（T05-02 A + M-05 D） | 新增 |
| 图片 Tauri 文件系统 | 文档（T05-03 D + 补充） | 新增 |
| AssetPipeline 统一 | 文档（T05-11 D + 补充） | 新增 |
| 剪贴板走 Tauri | 文档（T05-01 A） | 升级 |
| 只读态置灰 | 文档（T05-13 C） | 新增 |
| 三入口分工 | 文档（L1-29 A） | 沿用 |
| Typora/Source FloatingToolbar 一致 | 文档（X-01 A + T05-07 C） | 新增 |

---

## 九、与其他 Spec 的依赖关系

- **01-spec-editor-typora**: FloatingToolbar 挂接点、NodeView 交互
- **06-spec-account-auth**: 高危命令二次认证
- **07-spec-settings-tabs**: AI Tab / 快捷键 Tab / Advanced Tab
- **08-spec-insights-charts**: 命令审计 → 使用统计数据源
- **20-theme-font-typography**: ColorPicker 色盘 tokens
- **22-command-palette-spec**: 命令面板入口
- **24-permission-audit-spec**: 权限服务 + 审计日志
- **25-extension-plugin-spec**: 插件命令注册
- **28-asset-pipeline-spec**: 资产管线（本 Spec §15 抽象出来的独立文档）

---

## 十、风险与缓解

| 风险 | 级别 | 缓解 |
|------|------|------|
| 命令注册表冲突导致启动失败 | 中 | 冲突只 disable 涉事插件，core 不受影响 |
| AI diff 体积过大卡住 Modal | 中 | diff 按段落分片渲染 + 虚拟列表 |
| AssetPipeline 本地化远程 URL 超时 | 中 | AbortSignal + 重试 3 次 + 最终降级保留原 URL |
| 右键菜单深度嵌套引发认知负担 | 低 | 每级最多 10 项；超过 → 拆分 group |
| Fuzzy 算法误匹配度过高 | 低 | threshold 可调，提供 Settings 开关 |

（完）



## 2026-04-25 p1-05 Implementation Note

- `FloatingToolbar.vue` now keeps the manual selection-based positioning strategy, clamps horizontal position, flips below the selection when top space is insufficient, and adds a <480px media rule so the wrapped toolbar stays within `calc(100vw - 24px)`.
- FloatingToolbar shortcut titles have been aligned with the live shortcut registry for the checked controls: strikethrough `Ctrl+Shift+S`, inline code `Ctrl+Shift+``, quote `Ctrl+Shift+Q`, code block `Ctrl+Shift+K`, divider `Ctrl+Enter`, and table `Ctrl+Alt+Shift+T`. The table binding follows `settingsStore.SHORTCUT_DEFINITIONS`, which supersedes the older `Ctrl+T` note.
- `SlashCommands.ts` now exposes 21 real commands across heading / block / list / insert / advanced. The added commands are h4, paragraph, link, highlight, textColor, alignCenter, alignRight, callout, details, and clearFormat.
- `/image` continues to delegate to the existing `requestImageFileInsert` host callback, which uploads through the real IndexedDB asset pipeline and inserts `inkforge-asset://<assetId>` instead of a mock URL or transient prompt value.
- `/link` delegates to the existing FloatingToolbar link editor rather than using `window.prompt()`.
- `SlashCommandMenu.vue` now renders grouped sections while preserving the flat `selectedIndex` used by keyboard navigation.
- `DetailsBlock.ts` adds a real Tiptap node for details/summary insertion, and `TyporaMode.ts` serializes details blocks back to Markdown-compatible raw HTML. `MarkdownPreview.vue` allows the required details attributes through DOMPurify.

### Verification

- PASS: targeted TS syntax + Vue template compile check for `DetailsBlock.ts`, `SlashCommands.ts`, `TyporaMode.ts`, `FloatingToolbar.vue`, `SlashCommandMenu.vue`, `EditorPanel.vue`, and `MarkdownPreview.vue`.
- PASS: structural assertion confirms 21 slash commands, no `window.prompt` in SlashCommands, all newly required lucide icon names mapped, details allowlist present, and narrow toolbar media rule present.
- BLOCKED: `pnpm -C D:/Desktop/Inkforge/inkforge exec vue-tsc --noEmit` still fails before source checking because local `node_modules` cannot resolve `vue-tsc` and `entities@7.0.1/dist/commonjs/decode.js` throws `ReferenceError: exports is not defined`.
- BLOCKED: `pnpm -C D:/Desktop/Inkforge/inkforge exec vite build` still fails before source bundling because `vite` is not visible to pnpm exec and Windows denies reading `node_modules/.pnpm/vite@6.4.1.../vite/bin/vite.js` with `EPERM`.

This closes the p1-05 implementation slice to targeted validation depth, but the Trellis task remains pending until the local dependency/ACL guard can run cleanly.


## 2026-04-29 Completion Ledger

- 已完成 0327/P1-05 基线切片：FloatingToolbar 视口夹紧、上方空间不足翻转、窄屏 wrap、28 个按钮 title、EditorContextMenu 15 项、SlashCommands 21 项、SlashCommandMenu 五类分组。
- 图片与链接插入均走现有真实链路：`/image` 委托 `requestImageFileInsert`，进入 IndexedDB asset pipeline 并插入稳定 `inkforge-asset://<assetId>`；`/link` 委托 FloatingToolbar 链接编辑器。
- 本轮验证通过 `P1_05_STATIC_OK`、`pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build`。构建仅出现既有 chunk size warning。
- 边界声明：本 ledger 不表示 0420 本文提出的完整 Command Registry、权限审计、AI diff 回滚、插件 SDK 与全局命令面板均已完成；这些属于后续 0420 命令中枢架构任务。
