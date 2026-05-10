# Spec 54 | CustomCSS（自定义 CSS 注入）

> Settings > Advanced 下的高级定制入口，允许高级用户通过 CSS 代码微调 `.editor-content` 容器及其后代样式。
>
> 本文件对应 `prompts/0420/00-task-roadmap.md` §3 第 54 条、`00-decisions-part3b-tauri-visual-recovery.md` 决策 Q-10，以及 `_extracted/03-enhancement-answers.md` 的 EX-07。
>
> **范围**：CSS 编辑器 UI、沙箱策略、错误检测、崩溃回滚、与 ThemeEngine 优先级、导入导出。
>
> **不在本 Spec 范围**：
> - 自定义 JS 注入（Q-10 默认不开放，v2.1 不实现）
> - ThemeEngine 变量体系（→ `20-theme-font-typography-spec.md`）
> - SafeMode 启动流程（→ `29-crash-recovery-health-spec.md`）
> - 开发者模式开关（→ `15-settings-migration-spec.md` T07-09 C）

---

## 目录

1. 使用场景
2. UI 位置与激活路径
3. 编辑器（CodeMirror CSS 模式）
4. 应用层（`<style>` 注入策略）
5. 沙箱策略
6. 错误检测
7. 崩溃回滚（SafeMode 联动）
8. 与 ThemeEngine 优先级
9. 导入 / 导出
10. 验收矩阵 + 权威来源登记表

---

## 1. 使用场景

### 1.1 典型用户

- **高级用户**：不满足于 ThemeEngine + Typography 面板的可视化控制，希望用 CSS 直接调整纸张视觉细节。
- **博主 / 出版用户**：希望纸张样式完全对齐某个渠道 CSS（例如"知乎阅读态"或"Medium 风格"）。
- **写作主题作者**：调试新主题时使用 CustomCSS 快速迭代，定稿后迁移到 ThemeEngine 变量。

### 1.2 典型场景示例

- 改纸张边距：`.editor-content { padding: 4em 6em; }`
- 改标题样式：`.editor-content h1 { border-bottom: 2px dashed var(--paper-brand); }`
- 改代码块装饰：`.editor-content pre { box-shadow: inset 4px 0 0 var(--chrome-brand-red); }`
- 关闭某些语法标记：`.editor-content .syntax-mark { display: none; }`

### 1.3 非目标

- **不用于 chrome UI 定制**：CustomCSS 作用域限定 `.editor-content`，不允许影响 TopBar / Sidebar / StatusBar / Modal / Toast（Q-10 硬约束）。
- **不替代 ThemeEngine**：CustomCSS 是"最后一公里"微调手段，不承担配色 / 字体 / 排版主体职责。
- **不用于加载外部资源**：禁止 `@import url()`、`background: url(https://...)`、`@font-face: src: url(https://...)` 等远程加载（§5 沙箱）。

---

## 2. UI 位置与激活路径

### 2.1 入口位置

Settings > Advanced > "CustomCSS" 卡片。

### 2.2 开发者模式门槛（T07-09 C 联动）

- 默认隐藏在 "Advanced" 分组内，需要用户主动进入 Settings > Advanced 才可见。
- 若用户开启 **Developer Mode**（T07-09 C "Advanced" 高级设置），UI 扩展以下能力：
  - "立即应用"按钮旁暴露"保存并重载整个窗口"
  - CodeMirror 编辑器的"调试断点"功能可用
- 未开启 Developer Mode 时仍可正常使用基础编辑器。

### 2.3 卡片结构

```
┌─ CustomCSS ─────────────────────────────────┐
│  [启用 CustomCSS]  ○ 关  ● 开               │
│                                              │
│  作用域：.editor-content 容器及其后代          │
│  警告：修改可能破坏纸张视觉，极端错误会自动回滚  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ CodeMirror CSS 编辑器                  │  │
│  │ /* 你的自定义 CSS */                   │  │
│  │ .editor-content {                      │  │
│  │   padding: 4em 6em;                    │  │
│  │ }                                      │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [应用]  [重置]  [导入]  [导出]             │
│                                              │
│  状态：✓ 已应用（12 条规则）                  │
└──────────────────────────────────────────────┘
```

### 2.4 启用开关行为

- `enabled=false`（默认）：不注入 `<style>` 标签，编辑器框内代码保留但不生效
- `enabled=true`：立即编译 + 沙箱检查 + 注入

### 2.5 危险项提示（T07-09 C 补充）

- 首次开启 `enabled=true` 时弹确认对话框：
  ```
  ⚠ 启用自定义 CSS

  自定义 CSS 可能导致纸张视觉异常或编辑器不可用。
  若出现严重问题，应用将在下次启动自动禁用（SafeMode）。

  [仍然启用] [取消]
  ```
- 后续应用 / 关闭不再弹确认。

---

## 3. 编辑器（CodeMirror CSS 模式）

### 3.1 编辑器规格

- 基础：`@codemirror/lang-css`
- 高度：min 240px，max 600px，可拖拽调整
- 字体：`var(--font-code-family)`（沿用 FontSystem 的 code 字体）
- 字号：`var(--typography-code-size)`（默认 14px）
- 主题：跟随当前 AppChromeTheme mode（light → CodeMirror `basicLight`；dark → `basicDark`）

### 3.2 功能配置

| 功能 | 状态 | 说明 |
|------|------|------|
| 语法高亮 | 开启 | CSS 语法着色 |
| 行号 | 开启 | 左侧行号栏 |
| 括号匹配 | 开启 | `{`、`(`、`[` 匹配高亮 |
| 自动闭合 | 开启 | 输入 `{` 自动补 `}` |
| 自动缩进 | 开启 | Enter 自动缩进 |
| 搜索 / 替换 | 开启 | `Cmd/Ctrl+F` 查找 |
| Lint | 开启 | 见 §6 错误检测 |
| 自动补全 | 开启 | CSS 属性 / 值补全（来自 `@codemirror/lang-css`） |
| Format | 开启 | `Cmd/Ctrl+Shift+I` 格式化（Prettier CSS parser） |
| Vim / Emacs 键位 | 关闭 | v2.1 不做 |

### 3.3 自动保存 / 显式应用

- CodeMirror 内容变更后**不会立即生效**（避免输入中途编译错误导致抖动）
- 用户需点击 "应用" 按钮或按 `Cmd/Ctrl+S` 显式应用
- CodeMirror 内容每 2s 自动保存到 `user-preferences.customCss.draft`（草稿，不注入）
- 应用成功后 `draft` 提升为 `published`

### 3.4 提示与提醒

- 编辑器顶部固定提示条：
  ```
  提示：仅 .editor-content 及其后代样式生效；
  禁用：@import、url()、!important、behavior:
  ```
- 输入被禁止的语法时（§5 沙箱静态检查）实时下划线标红 + hover 提示原因

### 3.5 代码片段示例

提供 "代码片段" 下拉菜单，预置 6 段示例：

| 名称 | 片段 |
|------|------|
| 纸张更宽边距 | `.editor-content { padding: 4em 6em; }` |
| 标题虚线下划线 | `.editor-content h1, .editor-content h2 { border-bottom: 1px dashed var(--paper-hr); padding-bottom: 0.3em; }` |
| 代码块侧边装饰 | `.editor-content pre { position: relative; padding-left: 2em; } .editor-content pre::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--chrome-brand-red); }` |
| 引用块书本风格 | `.editor-content blockquote { font-style: italic; border-left: none; background: transparent; padding-left: 2em; position: relative; } .editor-content blockquote::before { content: '"'; position: absolute; left: 0; top: -0.3em; font-size: 3em; color: var(--paper-blockquote-border); }` |
| 链接无下划线 | `.editor-content a { text-decoration: none; border-bottom: 1px solid var(--paper-link); }` |
| 段首大写首字母 | `.editor-content > p:first-child::first-letter { font-size: 3em; float: left; line-height: 1; padding-right: 0.1em; }` |

---

## 4. 应用层（`<style>` 注入策略）

### 4.1 注入位置

- 目标：`document.head`
- 标签 id：`inkforge-custom-css`
- 单例：应用多次只保留最后一次注入的 style，不累加

### 4.2 注入时机

| 时机 | 行为 |
|------|------|
| 应用启动 | 读取 `user-preferences.customCss`，若 `enabled=true` 则注入 |
| 用户点击"应用" | 执行沙箱检查 + 重新注入 |
| 用户切换 `enabled=false` | 移除 `<style>` 标签 |
| 主题切换 | 不重新注入（CustomCSS 不依赖主题） |
| WritingMode 进入 / 退出 | 不重新注入 |

### 4.3 作用域强制前缀（CRITICAL）

- 用户编辑的 CSS 文本通过 PostCSS 预处理：
  - 所有选择器自动前缀 `.editor-content` 作为祖先选择器（若用户已写 `.editor-content`，不重复加）
  - 例：用户写 `h1 { color: red; }` → 实际注入 `.editor-content h1 { color: red; }`
  - 例：用户写 `body { background: red; }` → 转换为 `.editor-content { background: red; }`（body 替换为容器根）
  - 例：用户写 `.editor-content blockquote { ... }` → 保持原样
- 全局选择器（`*`、`html`、`body`）被强制改写为 `.editor-content`

### 4.4 注入示例

用户输入：
```css
h1 {
  color: blue;
}
.my-note {
  background: yellow;
}
```

注入后的实际 CSS：
```html
<style id="inkforge-custom-css">
.editor-content h1 {
  color: blue;
}
.editor-content .my-note {
  background: yellow;
}
</style>
```

### 4.5 层叠优先级

- CustomCSS `<style>` 标签插入位置：`document.head` 最底部
- 由于 CSS 层叠顺序，同等特异性时**后出现的 CSS 获胜**，因此 CustomCSS 优先级高于：
  - ThemeEngine 变量
  - Typography 样式
  - 默认 paper 样式
- 但**不覆盖**使用 `!important` 的基础样式（§5 禁止用户使用 `!important`，故实际 CustomCSS 不使用 `!important`）

---

## 5. 沙箱策略

### 5.1 静态检查清单（硬约束）

在 "应用" 按钮触发的 PostCSS pipeline 中执行：

| # | 规则 | 处理 |
|---|------|------|
| S-01 | 禁止 `@import url(...)` | 拒绝并报错 `禁止远程导入` |
| S-02 | 禁止 `background: url(http...)` 或任意远程 url() | 拒绝并报错 `禁止远程资源加载` |
| S-03 | 允许 `url(data:image/...)` 内联资源（图片上限 50KB） | 超限报错 |
| S-04 | 禁止 `@font-face { src: url(http...) }` | 拒绝（字体走 FontSystem） |
| S-05 | 禁止 `behavior:` 属性（老 IE 漏洞） | 拒绝 |
| S-06 | 禁止 `javascript:` 协议（任何位置） | 拒绝 |
| S-07 | 禁止 `!important`（防止用户覆盖基础安全样式） | 拒绝并报错 `禁止使用 !important` |
| S-08 | 禁止覆盖关键变量：`--chrome-brand-red`、`--paper-bg`、`--z-*` 等冻结项 | 警告 + 应用但标记 `overridden-frozen-tokens` |
| S-09 | 禁止选择器 `*`、`html`、`body` 作为顶层选择器（自动改写为 `.editor-content`） | 静默改写 |
| S-10 | 禁止伪类 `:host`、`:host-context`（Shadow DOM 穿透） | 拒绝 |
| S-11 | 禁止 `position: fixed`（破坏布局） | 警告（不拒绝，但 lint 警告） |
| S-12 | 限制总 CSS 字符数 ≤ 50,000 | 超限报错 |
| S-13 | 限制规则数量 ≤ 1,000 | 超限报错 |
| S-14 | 禁止 `contain: strict` 等可能影响布局树的属性 | 警告 |

### 5.2 PostCSS 插件链

```
input CSS
  ↓
[1] postcss-safe-parser           (容错解析)
  ↓
[2] inkforge-sandbox-check        (§5.1 静态检查)
  ↓
[3] inkforge-scope-prefix         (§4.3 作用域前缀)
  ↓
[4] postcss-discard-unused        (移除未使用 @keyframes 等)
  ↓
[5] cssnano (minify, 可选)        (压缩)
  ↓
output CSS → <style id="inkforge-custom-css">
```

### 5.3 运行时监控

即使通过静态检查，注入后仍监控：

- `MutationObserver` 监听 `document.head` 下 `#inkforge-custom-css` 被意外移除 / 篡改
- 若检测到其他脚本注入 `<style>` 到 `.editor-content` 域 → 记录 ActivityLogger（T-03 错误边界）

### 5.4 边界隔离（R-04 ErrorBoundary）

- CustomCSS 出错超过 **3 次 / 分钟**自动停用（Q-10 硬约束）：
  - 错误计数器：PostCSS 静态检查失败 / 解析失败 / 运行时异常共同累计
  - 达 3 次后自动 `enabled=false` + 移除 `<style>` + 弹 Toast "CustomCSS 已自动停用，请检查代码"
  - 错误日志写入 `ActivityLogger.custom-css-errors`

### 5.5 CSS 解析失败

- PostCSS 解析失败时：
  - 不注入（保留前一次成功的 CSS）
  - CodeMirror 显示错误提示（行号 + 错误原因）
  - Toast "CSS 语法错误：{message}"
- 解析失败不计入 §5.4 错误计数（仅运行时 / 静态检查冲突才计入）

---

## 6. 错误检测

### 6.1 CodeMirror Linter

基于 `@codemirror/lint`，实时显示：

- **error**（红色下划线）：语法错误（解析失败）
- **warning**（黄色下划线）：
  - 使用禁止属性（如 `!important`）
  - 覆盖冻结 token
  - 特异性过高（`.a .b .c .d .e` 超过 5 级）
- **info**（蓝色点）：优化建议（如"该规则可用 ThemeEngine 变量替代"）

### 6.2 应用前验证

点击 "应用" 时执行完整验证流程：

```
1. PostCSS 解析
   ├─ 成功 → 继续
   └─ 失败 → Toast 错误 + 高亮错误行

2. 沙箱静态检查
   ├─ 通过 → 继续
   └─ 拒绝 → 对话框列出所有违规 + 行号

3. 作用域前缀改写
   └─ 总是成功

4. 注入 <style>
   ├─ 成功 → Toast "已应用 {n} 条规则" + 更新状态条
   └─ 注入失败（极罕见，document 已卸载）→ Toast 错误
```

### 6.3 运行时错误

- 注入后纸张立即可见：
  - 若 Editor 检测到布局异常（高度 0 / 宽度 0 / overflow 无限递归）→ 降级
  - 降级策略：临时禁用 CustomCSS 60s + Toast "检测到布局异常，CustomCSS 暂停 60s"
  - 60s 后自动重新注入；若再次异常 → 计入 §5.4 错误计数

### 6.4 错误日志面板

Settings > Advanced > CustomCSS > "查看错误日志"链接：

- 展示最近 20 次错误记录
- 每条含：时间戳 / 错误类型 / 错误消息 / 触发的 CSS 片段
- 一键"清空日志"按钮

---

## 7. 崩溃回滚（SafeMode 联动）

### 7.1 崩溃检测

- 每次应用启动时检查 `beforeunload` flag（T-01 CrashRecovery）
- 若上次启动后未正常关闭（异常 Quit、进程崩溃、Tauri 崩溃）→ 进入恢复流程

### 7.2 SafeMode 启动

- 恢复流程检测：最近 3 次启动中是否出现 ≥ 2 次崩溃？
- 若是 → 进入 SafeMode：
  - **CustomCSS 自动禁用**（Q-10 硬约束 + T-03 SafeMode）
  - `user-preferences.customCss.enabled` 设为 `false`
  - `user-preferences.customCss.suspendedReason = 'safe-mode'`
  - 弹恢复向导："检测到近期崩溃，已自动禁用 CustomCSS。[查看 CSS] [保持禁用] [重新启用]"

### 7.3 手动恢复

- SafeMode 下用户可在 Settings > Advanced 手动重新启用（按 §2.5 弹警告）
- 重启应用后如果仍崩溃 → 再次进入 SafeMode

### 7.4 CustomCSS 本身不可导致崩溃

- 理论上 CSS 是纯声明式不会导致进程崩溃
- 实际可能场景：
  - CSS 触发浏览器 reflow bug（极端 `contain` / `translateZ` 组合）→ 降级（§6.3）
  - Chrome 渲染进程 OOM（纸张内容 + CustomCSS 规则数太多）→ SafeMode 恢复
- 任何 CSS 层面的异常都应被 §5.4 ErrorBoundary 或 §7.2 SafeMode 覆盖，**禁止** CSS 导致主进程崩溃

### 7.5 SafeMode 图标提示

- SafeMode 期间 TopBar 右侧显示 `icon: ShieldAlert` 图标
- hover 提示："应用当前处于安全模式，CustomCSS、扩展等高级功能已禁用。[详情]"

---

## 8. 与 ThemeEngine 优先级

### 8.1 优先级层级

```
最低         ┌────────────────────────────┐
             │  :root 默认 CSS 变量         │
             └──────────┬─────────────────┘
                        ↓
             ┌────────────────────────────┐
             │  AppChromeTheme 变量覆盖    │
             │  (data-theme-chrome)         │
             └──────────┬─────────────────┘
                        ↓
             ┌────────────────────────────┐
             │  EditorContentTheme 变量覆盖│
             │  (data-theme-paper)          │
             └──────────┬─────────────────┘
                        ↓
             ┌────────────────────────────┐
             │  Typography 变量            │
             └──────────┬─────────────────┘
                        ↓
             ┌────────────────────────────┐
             │  FontSystem 变量            │
             └──────────┬─────────────────┘
                        ↓
             ┌────────────────────────────┐
             │  WritingMode 覆盖            │
             │  (data-writing-mode)         │
             └──────────┬─────────────────┘
                        ↓
最高         ┌────────────────────────────┐
             │  CustomCSS (<style id=…>)   │
             └────────────────────────────┘
```

### 8.2 CustomCSS 为何最高

- 语义上：CustomCSS 是"用户最后的意图表达"，应尊重
- 实现上：CSS 层叠顺序中 `<style>` 标签在 `document.head` 最底部 → 特异性相同时后出现的规则获胜

### 8.3 CustomCSS 不使用 `!important`

- §5.1 S-07 禁止用户使用 `!important`
- 即使不使用 `!important`，CustomCSS 仍能覆盖大部分 ThemeEngine 样式（因位置靠后）
- 无法覆盖的情况：原样式使用了 `!important`（极少数，仅限 `.editor-paper[data-raw-mode]` 等保护样式）

### 8.4 冻结 token 覆盖

- CustomCSS 尝试覆盖 `--chrome-brand-red` 等冻结 token 时（§5.1 S-08）：
  - **允许**覆盖但会标记 `overridden-frozen-tokens`
  - Settings > Advanced > CustomCSS 卡片显示警告："你覆盖了 {n} 个冻结视觉 token，可能影响品牌一致性"

### 8.5 WritingMode 期间

- WritingMode 激活时 paper 变量被叠加覆盖
- CustomCSS 依然在最后生效
- 设计期望：WritingMode 的极简配色可能被 CustomCSS 打破（用户需自行协调）
- 未提供"WritingMode 时禁用 CustomCSS"选项（保持简单）

---

## 9. 导入 / 导出

### 9.1 导出

- 入口：CustomCSS 卡片 "导出" 按钮
- 文件名：`inkforge-custom.css`
- 文件头添加注释：
  ```css
  /*!
   * InkForge Custom CSS
   * Exported at: 2026-04-20T12:34:56Z
   * InkForge version: 2.1
   * Notes: 以 .editor-content 为作用域；禁止 @import/url()/!important。
   */
  ```
- 导出内容 = 当前用户编辑框内容（未经作用域前缀改写的"源"CSS）

### 9.2 导入

- 入口："导入" 按钮 → 文件选择器（`.css`）
- 导入行为：
  1. 读取文件内容
  2. 若当前编辑框非空，弹确认 "当前 CSS 将被覆盖，是否继续？[继续] [取消]"
  3. 写入编辑框（不自动应用，用户需点击"应用"）

### 9.3 与主题包集成

- `.inkforge-theme` 包（见 `20-theme-font-typography-spec.md` §33）**可内嵌** CustomCSS：
  - 包内额外文件 `custom.css`
  - theme.json 添加字段 `"customCss": "custom.css"` 引用
- 导入主题包时：
  - 若包含 customCss → 弹询问 "此主题包含自定义 CSS，是否导入？[是] [否]"
  - 用户选"是" → 写入 CustomCSS 编辑框 + 自动应用
  - 用户选"否" → CustomCSS 被忽略

### 9.4 同步（23-sync-provider）

- `user-preferences.customCss` 加入同步字段
- 同步冲突时：提示用户手动合并（不自动覆盖，避免意外丢失）

---

## 10. 验收矩阵 + 权威来源登记表

### 10.1 验收矩阵

| # | 验收项 | 验收方法 |
|---|--------|----------|
| C-01 | 默认关闭，启用需二次确认 | 首次开启弹警告对话框 |
| C-02 | 仅作用 `.editor-content` | 用户写 `body { background: red }` 不会影响 TopBar 等 |
| C-03 | 自动作用域前缀 | PostCSS 输出验证 `.editor-content` 前缀已添加 |
| C-04 | 禁止 @import url() | 输入包含 @import 的代码被拒绝 |
| C-05 | 禁止 !important | 应用被拒绝，错误提示正确 |
| C-06 | 禁止远程 url() | 输入 `background: url(https://...)` 被拒绝 |
| C-07 | 允许 data: url() | 小于 50KB 的 data url 正常生效 |
| C-08 | 错误 3 次 / 分钟自动停用 | 连续输入 3 次违规 CSS 被自动停用 |
| C-09 | CodeMirror Lint 实时显示 | 输入 !important 时红色下划线 |
| C-10 | Prettier 格式化可用 | `Cmd+Shift+I` 格式化代码 |
| C-11 | 代码片段下拉可用 | 6 个片段可插入 |
| C-12 | 应用后 `<style id="inkforge-custom-css">` 注入 head | DevTools Elements 可见 |
| C-13 | 关闭后 `<style>` 移除 | DevTools Elements 已无 |
| C-14 | 优先级高于 ThemeEngine | 覆盖 `--paper-bg` 后生效 |
| C-15 | SafeMode 启动自动禁用 | 模拟 2 次崩溃后启用 SafeMode，CustomCSS 被禁用 |
| C-16 | 导入 / 导出无损 | 导出后导入内容完全一致 |
| C-17 | 主题包内嵌 CustomCSS 导入询问 | 弹确认对话框 |
| C-18 | 同步不自动覆盖 | 同步冲突时提示用户手动合并 |
| C-19 | 错误日志面板可用 | 最近 20 次错误记录正确 |
| C-20 | 50,000 字符硬上限 | 超限弹错误 |
| C-21 | 1,000 规则硬上限 | 超限弹错误 |
| C-22 | CodeMirror 主题跟随 AppChromeTheme | 切换到 dark 主题时编辑器主题跟随 |
| C-23 | 作用域改写不破坏既有 `.editor-content` 选择器 | 用户已写 `.editor-content h1` 保持原样 |
| C-24 | 覆盖冻结 token 触发警告 | 覆盖 `--chrome-brand-red` 时卡片显示警告 |
| C-25 | 运行时布局异常自动降级 60s | 模拟异常后 CustomCSS 暂停 60s |

### 10.2 权威来源登记表

| 字段 | 来源 | 决策 ID |
|------|------|---------|
| Settings > Advanced 下 CSS 编辑器 | `00-task-roadmap.md` §3 第 54 条 | 路线图 |
| EX-07 v2.1 实现 | `_extracted/03-enhancement-answers.md` | EX-07 |
| 作用域限定 `.editor-content` | `00-decisions-part3b-tauri-visual-recovery.md` Q-10 | Q-10 |
| 禁止 @import url() 外部资源 | `00-decisions-part3b-tauri-visual-recovery.md` Q-10 | Q-10 |
| 禁止 `behavior:` / `javascript:` | `00-decisions-part3b-tauri-visual-recovery.md` Q-10 | Q-10 |
| ErrorBoundary 监控（3 次 / 分钟自动停用） | `00-decisions-part3b-tauri-visual-recovery.md` Q-10 + T-03 | Q-10 / T-03 |
| SafeMode 启动自动跳过 CustomCSS | `00-decisions-part3b-tauri-visual-recovery.md` Q-10 | Q-10 |
| CodeMirror CSS 编辑器 | `00-decisions-part3b-tauri-visual-recovery.md` Q-10 落地点 | Q-10 |
| 与 ThemeEngine 独立 | `00-decisions-part3b-tauri-visual-recovery.md` Q-10 关联 L1-58 | Q-10 |
| CustomCSS 最高优先级 | 本 Spec §8.2 推理（CSS 层叠语义） | — |
| 禁止 `!important` | 本 Spec §5.1 S-07 推理（避免用户覆盖安全样式） | — |
| 禁止 `position: fixed` 警告 | 本 Spec §5.1 S-11 推理（避免破坏布局） | — |
| 自动作用域前缀 | 本 Spec §4.3 推理（Q-10 作用域硬约束的实现手段） | — |
| 开发者模式门槛 | `00-task-roadmap.md` T07-09 C 联动 | T07-09 |
| 主题包内嵌 CustomCSS | 本 Spec §9.3 与 `20-theme-font-typography-spec.md` 集成 | — |
| 同步字段 | `23-sync-provider-spec.md` 约定 | — |

### 10.3 未决追问

- CustomCSS 的"主题市场"分享：v2.2+（本轮延后）
- 自定义 JS 注入：Q-10 明确默认不开放；v2.1 仅保留接口位，实现推后到 v2.3+
- Vim / Emacs 键位：v2.1 不做；可在 v2.2 根据用户反馈评估

---

# 完
