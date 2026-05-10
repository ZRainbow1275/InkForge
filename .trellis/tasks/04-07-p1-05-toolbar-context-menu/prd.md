# 浮动工具栏 + 上下文菜单 + 斜杠命令

## 规格参考
- `prompts/0327/05-toolbar-complete-spec.md` (完整规范)

## 背景
设计理念: 无固定顶部工具栏。4 种功能发现方式: 斜杠命令 / 浮动工具栏 / 右键菜单 / 快捷键。

## 当前基线差距
- [已实现] FloatingToolbar 28+ 按钮已实现
- [待优化] FloatingToolbar 溢出处理需优化 (窄屏 flex-wrap)
- [待优化] 按钮 title 快捷键提示不完整 / 3 个错误映射
- [缺失] EditorContextMenu.vue 不存在
- [已实现] SlashCommands.ts 存在但只有 ~11 个命令
- [已实现] 链接输入 UI 已实现

## Requirements

### 1. FloatingToolbar 溢出修复
- 左右边界检测: `Math.max(minLeft, Math.min(maxLeft, centerX))`
- 上边界检测: 选区上方空间不足时翻转到下方
- 窄屏 (<480px): `flex-wrap: wrap` 自动换行
- `max-width: calc(var(--paper-width) - 16px)`

### 2. FloatingToolbar 快捷键 title 补全
24 个按钮完整映射，修正 3 个错误:
- 删除线: Ctrl+Shift+X → **Ctrl+Shift+S**
- 行内代码: Ctrl+E → **Ctrl+Shift+`**
- 引用: Ctrl+Shift+B → **Ctrl+Shift+Q**

需添加 title: 高亮(Ctrl+Shift+H) / H1-H3(Ctrl+1-3) / 列表类 / 代码块(Ctrl+Shift+K) / 分割线(Ctrl+Enter) / 表格(Ctrl+T)

### 3. EditorContextMenu 集成
在 EditorPanel.vue 中:
- `@contextmenu.prevent` 事件
- 传入 `editor` + 鼠标坐标 (x, y)
- 边界检测 (菜单不超出视口)
- 具体组件由 04 任务创建

### 4. 斜杠命令扩展 (11 → 21+)
新增命令:
| 命令 | 图标 | 分类 |
|------|------|------|
| h4 | Heading4 | heading |
| paragraph | Pilcrow | heading |
| link | Link | insert |
| highlight | Highlighter | advanced |
| textColor | Palette | advanced |
| alignCenter | AlignCenter | advanced |
| alignRight | AlignRight | advanced |
| callout | MessageSquare | block |
| details | ChevronDown | block |
| clearFormat | RemoveFormatting | advanced |

### 5. SlashCommandMenu 分类分组
5 个分类: heading / block / list / insert / advanced
每个分类有标题分隔线

### 6. 图片插入改用文件选择器
`/image` 命令不再使用 `window.prompt()` 弹出 URL 输入
改为触发 `<input type="file" accept="image/*">` 文件选择器

## Acceptance Criteria
- [x] FloatingToolbar 不溢出视口 (左/右/上边界)
- [x] 窄屏 flex-wrap 正常
- [x] 24 个按钮 title 正确 (修正 3 个错误映射)
- [x] EditorContextMenu 在右键点击时弹出
- [x] 斜杠命令 21+ 个按分类分组显示
- [x] /image 使用文件选择器
- [x] `cd inkforge && npx vue-tsc --noEmit` 零错误

## 2026-04-25 Shared Implementation Note
- `EditorContextMenu.vue` has been implemented during the p0-04 rendering-engine slice because the rendering PRD also listed the shared right-click menu as an acceptance dependency.
- The component is wired into `EditorPanel.vue` and provides 15 non-mock actions across clipboard, formatting, insertion, and tools groups.
- This does not close p1-05 by itself; the remaining toolbar/slash-command-specific acceptance items still need a dedicated verification pass before this task can be marked complete.


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


## 2026-04-29 Completion Note

- P1-05 的真实源码验收已重新跑通。`FloatingToolbar.vue` 当前包含 28 个 title，关键快捷键映射与 Settings-backed 快捷键保持一致；表格绑定按当前真实定义保留为 `Ctrl+Alt+Shift+T`，不回退到旧文档中的 `Ctrl+T`。
- `EditorContextMenu.vue` 已在 `EditorPanel.vue` 右键链路中真实接入，包含剪贴板、格式、插入、工具共 15 个动作，并带视口边界约束、ESC/外部点击关闭。
- `SlashCommands.ts` 当前提供 21 个真实命令，覆盖 heading / block / list / insert / advanced 五类；`SlashCommandMenu.vue` 按分组渲染并保留键盘导航的扁平索引。
- `/image` 通过宿主 `requestImageFileInsert` 回调进入真实文件选择器和 IndexedDB asset pipeline；`/link` 复用 FloatingToolbar 链接编辑器；未使用 `window.prompt()` 或 mock URL。
- 2026-04-25 的本地依赖/ACL blocker 已失效：本轮 `pnpm exec vue-tsc --noEmit`、`pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`、`pnpm build` 均已通过，构建仅保留既有 chunk size warning。
- 0420 的 Command Registry / 权限 / 审计 / 回滚属于更大的命令中枢架构，不在本 Trellis P1-05 基线任务中伪装完成；本任务只关闭 toolbar / context menu / slash command 交付切片。
