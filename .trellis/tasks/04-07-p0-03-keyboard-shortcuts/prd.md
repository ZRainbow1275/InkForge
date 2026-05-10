# 33 条键盘快捷键体系

## 规格参考
- `prompts/0327/03-keyboard-shortcuts-spec.md` (完整规范)

## 背景
当前只有 7 条快捷键 (save/bold/italic/undo/redo/outline/focusMode)，需扩展到 33 条，分 5 组。

## 当前基线差距
- 缺失: `KeyboardShortcuts.ts` 不存在，需从零创建
- 缺失: `FindReplace.vue` 不存在
- 风险: 7/33 快捷键已实现 (TipTap 默认)
- 已存在: Settings shortcuts 字段存在但只有 7 条

## Requirements

### 1. KeyboardShortcuts.ts TipTap 扩展
新建 `inkforge/src/extensions/KeyboardShortcuts.ts`:

**格式化 (8 条)**:
| 快捷键 | 功能 | TipTap Command |
|---------|------|----------------|
| Ctrl+B | 粗体 | toggleBold |
| Ctrl+I | 斜体 | toggleItalic |
| Ctrl+U | 下划线 | toggleUnderline |
| Ctrl+Shift+S | 删除线 | toggleStrike |
| Ctrl+Shift+` | 行内代码 | toggleCode |
| Ctrl+K | 链接 | 触发 FloatingToolbar 链接编辑 |
| Ctrl+\ | 清除格式 (有选区) / 切换编辑模式 (无选区) |
| Ctrl+Shift+H | 高亮 | toggleHighlight |

**标题 (5 条)**: Ctrl+1/2/3/4 → h1-h4, Ctrl+0 → paragraph

**块级 (7 条)**: Ctrl+Shift+Q (引用), Ctrl+Shift+K (代码块), Ctrl+Shift+[ (有序列表), Ctrl+Shift+] (无序列表), Ctrl+Shift+X (任务列表), Ctrl+T (表格 3x3), Ctrl+Enter (分割线)

**编辑 (6 条)**: Ctrl+S (保存), Ctrl+Z (撤销), Ctrl+Shift+Z (重做), Ctrl+H (查找替换), Ctrl+F (查找), Ctrl+A (全选)

**视图 (7 条)**: Ctrl+Shift+E (左栏), Ctrl+Shift+P (预览), Ctrl+Shift+O (大纲), F11 (专注), F9 (打字机), Ctrl+\ (切换编辑模式), Ctrl+= (缩放)

### 2. FindReplace.vue
新建 `inkforge/src/components/editor/FindReplace.vue`:
- 位置: absolute top-right, z-index 150, width 360px
- 支持: 大小写 / 正则 / 全词 toggle
- 匹配计数显示 ("3/17")
- 上下导航 (ChevronUp/ChevronDown)
- 替换 / 全部替换
- Decoration 高亮: 浅黄色匹配 / 品牌红当前匹配
- Ctrl+F 打开查找, Ctrl+H 打开查找替换, ESC 关闭

### 3. Ctrl+\ 双重用途
```typescript
if (editor.state.selection.empty) {
  // 切换编辑模式 (typora <-> source)
} else {
  // 清除格式 editor.chain().clearNodes().unsetAllMarks().run()
}
```

### 4. Ctrl+K 链接插入
- 禁止 `window.prompt()`
- 触发 FloatingToolbar 的链接编辑模式 (showLinkInput)

### 5. 输入法兼容
所有 keydown handler 检查 `event.isComposing`，中文输入法激活时跳过快捷键处理。

### 6. Settings 快捷键 Tab 扩展
- 33 条按 5 组分组显示
- 搜索过滤
- 录制自定义组合键 (ShortcutInput 组件)
- 冲突检测
- 单项重置 / 全部重置

### 7. WorkstationView 全局 keydown handler
视图快捷键不属于 TipTap，需在 WorkstationView.vue 的 `onMounted` 中注册全局 keydown:
- Ctrl+Shift+E/P/O: 面板切换
- F11: 专注模式
- F9: 打字机模式

## Acceptance Criteria
- [x] 33 条快捷键全部可触发对应功能
- [x] FindReplace 查找 + 替换 + 高亮 + 计数正常
- [x] Ctrl+\ 根据选区状态切换行为
- [x] Ctrl+K 不弹 window.prompt
- [x] 中文输入法兼容 (isComposing 检查)
- [x] Settings 33 条分组显示 + 搜索 + 冲突检测
- [x] `cd inkforge && npx vue-tsc --noEmit` 零错误

## 2026-04-25 Implementation Note

- Added `src/extensions/KeyboardShortcuts.ts` as a real TipTap/ProseMirror keydown plugin backed by Settings bindings.
- Added `src/components/editor/FindReplace.vue` with ProseMirror DecorationSet highlighting, count navigation, regex/case/whole-word options, replace current, and replace all.
- Wired `EditorPanel.vue` to open Find/Replace on shortcut, route Ctrl+K to the existing FloatingToolbar link editor, and emit empty-selection Ctrl+\\ editor mode toggles to Workstation.
- Exposed `FloatingToolbar.openLinkEditor()` without replacing the existing toolbar flow or using `window.prompt()`.
- Hardened `WorkstationView.vue` global shortcuts with `event.isComposing`, corrected the sidebar fallback to `Ctrl+Shift+E`, and added the real F9 typewriter mode toggle.
- Verification: targeted TypeScript transpile checks passed for the new TS files and changed Vue `<script setup>` blocks; `@vue/compiler-dom` parsed the new FindReplace template successfully.
- Full `vue-tsc` and `vite build` remain blocked in this sandbox by node_modules ACL/EPERM and the known `entities@7.0.1` CommonJS package metadata read issue, so this task is not marked completed yet.


## 2026-04-29 Completion Note

- Completed the P0-03 baseline as a real vertical slice: `KeyboardShortcuts.ts`, `FindReplace.vue`, `EditorPanel.vue`, `FloatingToolbar.vue`, `WorkstationView.vue`, `settings.ts`, `SettingsView.vue`, `ShortcutInput.vue`, and `utils/shortcuts.ts` are wired together with live Settings-backed bindings.
- The Settings shortcut registry now exposes 38 configurable shortcuts across the original 5 groups, exceeding the 33-key baseline while preserving all existing functions. Legacy conflicting bindings are migrated to safer defaults: preview is `Ctrl+Shift+V`, paragraph is `Ctrl+Alt+0`, table is `Ctrl+Alt+Shift+T`, and dedicated clear-format is `Ctrl+Alt+\`; `Ctrl+\` remains the no-selection editor-mode toggle and clears formatting when the editor selection is non-empty.
- Fixed a real keyboard usability issue in shared shortcut normalization: shifted punctuation keys now resolve by physical `event.code`, so `Ctrl+Shift+[`, `Ctrl+Shift+]`, ``Ctrl+Shift+` ``, `Ctrl+Shift+\`, and `Ctrl+Shift+1` can match their documented bindings instead of becoming `{`, `}`, `~`, `|`, or `!` at runtime.
- `ShortcutInput.vue` now reuses the same runtime normalization and normalized conflict detection as the editor extension, keeping Settings recording and actual shortcut dispatch consistent.
- `Ctrl+K` routes to the existing FloatingToolbar link editor and does not use `window.prompt()`; editor and global handlers both guard `event.isComposing`.
- Verified on 2026-04-29 with: `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, `SHORTCUT_NORMALIZATION_OK`, `P0_03_STATIC_OK`, and `pnpm build`. Build succeeds with the existing large chunk warning only.
- Scope boundary: `prompts/0420/specs/03-keyboard-shortcuts-spec.md` additionally specifies 120+ keymaps, Chord overlay, F1 help panel, Ctrl+N global creation, StatusBar failure prompts, and command-palette synchronization. Those are not falsely marked complete in this P0-03 baseline; they remain governed by the dedicated 0420 keymap / command-palette / statusbar specs.
