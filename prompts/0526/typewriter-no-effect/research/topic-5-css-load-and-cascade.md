# topic-5: CSS 是否被加载？是否到达 .ProseMirror 内的 `<p>`？是否被裁切 / 覆盖？`--color-primary` 是否真有值？

## 调查问题

Phase 2 在 `design-system.css` 末尾追加的 `.typewriter-dim-near` / `-dim-far` / `.typewriter-sentence-dim` / `.typewriter-block-active::before` 等规则，在 InkForge 实际跑起来时：

1. CSS 文件是否被加载到页面？
2. `opacity !important` 是否被 ProseMirror / `<p>` 任何 inline-style 覆盖？
3. `.typewriter-block-active::before { left: -10px }` 是否被 `editor-panel` 的 `overflow: hidden` 裁掉？
4. `var(--color-primary, #D32F2F)` fallback 是否真生效？或 `--color-primary` 是否实际有定义？
5. `.editor-paper` 的 padding 是否影响 ::before 的位置？

## 调查方法

- 读 `main.ts` import 链
- 读 `inkforge/src/styles/main.css` 与 `design-system.css`
- 读 `EditorPanel.vue` 的 `<style scoped>` 全部规则
- Grep `--color-primary` 项目内所有定义/使用

## 关键发现

### 1. CSS 加载链完整

`inkforge/src/main.ts:20-23`:

```ts
import './styles/fonts.css'
import './styles/main.css'
import './styles/client.css'
import 'katex/dist/katex.min.css'
```

`inkforge/src/styles/main.css:12`:

```css
@import './design-system.css';
```

→ design-system.css **会被 Vite 编译进 bundle 并注入页面**。打字机的 CSS 块在 line 1069-1124，没有任何条件性 @media / @supports 包裹。**CSS 一定加载**。

### 2. `--color-primary` 实际有定义（与"已知事实"中的描述相反）

`inkforge/src/styles/design-system.css:630, 677`：

```css
:root,
html.theme-light,
html[data-theme="light"] {
  ...
  --color-primary: var(--accent-primary);
  --color-primary-light: var(--accent-primary-light);
}

html.theme-dark,
html[data-theme="dark"] {
  ...
  --color-primary: var(--accent-primary);
  --color-primary-light: var(--accent-primary-light);
}
```

`--accent-primary: #D32F2F` (line 15) / `#EF5350` (dark, line 651)。

**结论**：`var(--color-primary, #D32F2F)` 在任何情况下都会解析到 `#D32F2F`（light）或 `#EF5350`（dark），fallback 永远不会被用到（除非有人在 `inkforge-theme` / 某 sub-tree 上明确 unset --color-primary）。

**与"已知事实"分歧**：实现 implementer 用 `--color-primary` 是 **OK** 的，不需要换成 `--accent-primary`。

### 3. `.typewriter-dim-near` / `-dim-far` 的 `opacity !important` 不会被覆盖

`design-system.css:1076-1084`:

```css
.typewriter-dim-near {
  opacity: 0.85 !important;
  transition: opacity 0.3s ease;
}

.typewriter-dim-far {
  opacity: 0.5 !important;
  transition: opacity 0.3s ease;
}
```

EditorPanel.vue scoped style 里没有任何 `:deep(.ProseMirror p) { opacity: ... }` 规则。`<p>` 默认 opacity = 1（无 inline style 覆盖）。

唯一对 `<p>` 影响 opacity 的内部规则：

`EditorPanel.vue:988`: `.tiptap-content :deep(.block-drag-source) { opacity: 0.42 }` — 仅拖拽中。

ProseMirror 内核也不会给 `<p>` 写 inline `style="opacity: ..."`。所以 **!important 不必要但也不会失效**。

### 4. `.typewriter-block-active::before { left: -10px }` 在 editor-paper 内部不会被裁切

布局栈（从外向内）：

```
.editor-panel (overflow: hidden) (EditorPanel.vue:870)
  └─ .editor-mode-shell
       └─ .editor-scroll (overflow-y: auto, padding: 32px) (line 873-881)
            └─ .editor-paper (padding: 64px 72px) (line 884-897)
                 └─ .tiptap-content (position: relative) (line 948-950)
                      └─ .ProseMirror
                           └─ <p class="typewriter-block-active">
                                └─ ::before (position: absolute, left: -10px)
```

`<p>` 的 left 边距：在 .editor-paper 内 padding-left=72px，`<p>` 默认 margin=0（global reset line 121-125）。所以 `<p>` 的左边线 = paper 内 x=72px。`::before` 的 `left: -10px` 让侧栏出现在 x=62px 处（仍在 paper 内）。

`.editor-paper` 没有 `overflow: hidden`（line 884-897 仅 transition / box-shadow 等，确认 read 过 line 870-897）。所以 ::before 不会被 paper 裁。

`.editor-panel` 有 `overflow: hidden`，但 ::before 在 paper 内 x=62px 远未到 panel 边界。

**结论**：::before 不会被任何祖先 overflow 裁切。

### 5. ProseMirror DOM 中段落 `<p>` 是否真的拿到 typewriter-* class

topic-3 已确认 Decoration.node 写入 `<p class="typewriter-block-active">`，CSS selector `.typewriter-block-active` 命中。

但要注意 **`.tiptap-content :deep(.ProseMirror p)` 的 scoped 选择器优先级高于全局 `.typewriter-block-active`** 吗？

具体性比较：

- `.tiptap-content :deep(.ProseMirror p)` 编译后 = `.tiptap-content[data-v-xxx] .ProseMirror p` —— `(0,2,1)` + 属性 = `(0,3,1)`
- `.typewriter-block-active` (global) = `(0,1,0)`

**全局 class 选择器特异性更低**。但 `.tiptap-content :deep(.ProseMirror p)` 只设了 `color / font-family / margin-bottom`（line 1096-1102），**没设 opacity**。所以 opacity 来源就是 `.typewriter-dim-near` 的 `!important`，能赢。

### 6. .typewriter-sentence-dim 是 **inline decoration**，写到 `<span>` 上

`TypewriterMode.ts:298-302`:

```ts
Decoration.inline(from, to, {
    class: 'typewriter-sentence-dim',
}),
```

Inline decoration 会包一层 `<span class="typewriter-sentence-dim">`。`design-system.css:1086-1089`:

```css
.typewriter-sentence-dim {
  opacity: 0.75;
  transition: opacity 0.25s ease;
}
```

没有 !important。但 `<span>` 默认 opacity=1，没有任何竞争规则给 `<span>` 设过 opacity，所以这个 0.75 也能生效。

## 结论

**CSS 链路完全 OK**：

- CSS 被加载 ✓
- `--color-primary` 有定义 ✓
- `!important` 不必要但也不会失效 ✓
- `::before { left: -10px }` 不被裁 ✓
- 选择器特异性能赢 ✓

如果用户看不到任何视觉反馈，**问题不在 CSS**。问题在于：

- (a) Decoration class 没真正进 DOM（topic-2 / topic-3 / topic-4） — 这是最可能的真凶
- (b) class 进了 DOM 但用户手测的实际 markdown 文档结构特殊（topic-6 调查）

## 对修复的指导意义

1. **"换 --color-primary 为 --accent-primary"是一种可做也可不做的整理改动，但不是修复根因**。Phase 2 implementer 用 --color-primary 也工作正常。修 PRD 中不要把这一项当成"必须改才能让 UI 出现"的项。
2. CSS 不是问题。修复 PRD 应聚焦在"Decoration 是否真的进 DOM" + "Plugin 2 是否真的跑"。
3. 诊断顺序建议：
   - Step 1 - 用 devtools 查 `<p>` 是否真有 `class="typewriter-block-active"` 等 class
   - Step 2 - 如果有 class 但无视觉效果 → 查 computed style → 可能是 user 拿到的是缓存的旧 CSS（hard reload 排除）
   - Step 3 - 如果无 class → Plugin 2 没运行 → 看 topic-2 + topic-4（HMR 残留 / dispatch 路径）
