# 16 — Markdown 扩展语法 Spec

> **Spec 编号**: 16
> **层级**: 编辑层（Phase 3 — Editor Enhancements）
> **状态**: Draft v1（0420）
> **作者**: InkForge v2.1 Spec 团队
> **依赖上游**: 10-markdown-authority-spec（Markdown 双层权威 + 非标语法注册表 §6 + round-trip 契约 §11）、01-editor-ui（Typora/Source/Preview 三模式 NodeView 基础）、04-rendering-core（AST Normalizer + markdown-it 插件集）、05-toolbar-complete（FloatingToolbar 命令注入）
> **下游依赖方**: 15-export-publish-spec（每条扩展的平台降级）、38-toc-system（`[toc]` 与左栏 TOC）、36-wiki-link-spec、56-citation-spec、21-focus-writing-assist（公式面板）、47-tag-system、28-asset-pipeline（emoji 图像数据源）
> **相关铁律**: R-01（Markdown 权威唯一）、R-02（元素 round-trip）、R-13（平台独立链路 + 不反向污染）、R-18（关键写操作产生版本点或审计）
> **关联决策**: M-01 ~ M-08（增强问卷 第七章）、EX-02（Wikilink）、EX-10（引用来源标注）

---

## 0. 文档定位与使用方式

本 Spec 定义 InkForge v2.1 的 **Markdown 增强语法集**：脚注、多色高亮、TOC 宏、Details/Summary、Emoji、数学公式辅助输入、Wikilink、Citation 引用来源、以及声明延后的 Callout、Embed。

- 本 Spec 严格依附 10-markdown-authority-spec 的"非标 Markdown 能力注册表（§6）"；每条扩展必须在该注册表中有条目。
- 本 Spec 不覆盖语法在各渠道下的"具体降级实现"（交给 15-export-publish-spec）；本 Spec 只给"默认 fallback 规则"。
- 本 Spec 不覆盖 Typora 模式 NodeView 的视觉规范（交给 01-editor-ui）；本 Spec 指定"语法 + 解析 + 序列化 + 编辑命令 + 快捷键 + 验收"。
- 本 Spec 的所有扩展必须满足 Round-trip 四态无损（Typora / Source / Preview / Export，10-markdown-authority-spec §11）。
- 本 Spec 的所有扩展对应的 markdown-it 插件 / TipTap 扩展必须明确命名并登记。

---

## 目录

1. 扩展语法总览（M-01~M-08 决策）
2. 脚注（M-02=D）
3. 多色高亮（M-03=D）
4. TOC 宏 `[toc]`（M-04=D）
5. Details/Summary 折叠块（M-05=D）
6. Emoji `:name:`（M-06=C）
7. 数学公式辅助输入（M-08=D）
8. Wiki Link `[[文章名]]`（EX-02）
9. 引用来源标注（EX-10）
10. Callout（M-01=A）—— 延后 v2.2+ 声明
11. Embed（M-07=A）—— 延后 + 渠道兼容性原则
12. 与 Typora 模式的集成
13. 与 Source 模式的序列化
14. 与导出管线的联动
15. 验收矩阵
16. 权威来源登记表

---

## 1. 扩展语法总览（M-01~M-08 决策）

### 1.1 决策映射表

| 决策 ID | 用户选择 | Spec 章节 | 是否 v2.1 实装 | 注册表 ID（10 §6.2） | portability |
|---|---|---|---|---|---|
| M-01 Callout | A | §10 | 否（延后 v2.2+） | `inkforge.callout` | inkforge-proprietary |
| M-02 Footnote | D | §2 | 是 | `inkforge.footnote` | inkforge-ext |
| M-03 Highlight（多色） | D | §3 | 是 | `inkforge.highlight` | inkforge-ext |
| M-04 `[toc]` 宏 | D | §4 | 是 | `inkforge.toc` | inkforge-ext |
| M-05 Details/Summary | D | §5 | 是 | `inkforge.details` | inkforge-ext |
| M-06 Emoji `:name:` | C | §6 | 是 | `inkforge.emoji` | inkforge-ext |
| M-07 Embed | A | §11 | 否（延后 v2.2+） | `inkforge.embed` | inkforge-proprietary |
| M-08 公式辅助输入 | D | §7 | 是（基于现有 KaTeX 升级） | `inkforge.math.inline` / `inkforge.math.block` | inkforge-ext |
| EX-02 Wikilink | v2.1 实装 | §8 | 是 | `inkforge.wikilink` | inkforge-proprietary |
| EX-10 引用来源 | v2.1 实装 | §9 | 是 | `inkforge.citation` | inkforge-proprietary |

### 1.2 设计原则

#### 1.2.1 P1 | 每条扩展必须注册

每条扩展必须在 `src/services/markdown-ext/registry.ts` 登记；登记条目包括 `id`、`name`、`syntax`、`portability`、`fallback.toStandardMd`、`fallback.toPlatform`、`roundTripTest`。

#### 1.2.2 P2 | 对称的解析与序列化

每条扩展必须同时实现：
- **markdown-it 插件**：Markdown → AST（用于渲染管线）
- **TipTap 扩展**：TipTap JSON 节点定义 + `toMarkdown()` + `fromMarkdown()` 钩子（用于编辑器运行时）

CI 必须跑 round-trip 对称性测试（`tests/roundtrip/<ext-id>.spec.ts`），不对称即 fail。

#### 1.2.3 P3 | 编辑命令统一走 Command Registry

扩展的插入 / 修改命令必须通过 `src/services/commands/registry.ts` 注册，命令 ID 约定：
- `editor.insert.<extName>`（插入）
- `editor.modify.<extName>`（修改）
- `editor.remove.<extName>`（移除）

不得在 UI 组件内直接调用 TipTap API 修改文档（绕过命令系统会破坏审计 R-17）。

#### 1.2.4 P4 | 斜杠命令 / 工具栏 / 快捷键 三入口

每条有"插入"语义的扩展必须提供三个入口：
- **斜杠命令**（`/`）：主入口
- **FloatingToolbar / 主工具栏按钮**：可见入口
- **快捷键**：进阶入口（可在 Settings 重映射）

#### 1.2.5 P5 | 不反向污染平台适配

扩展节点的 TipTap JSON 不得为"讨好某平台"加字段；平台特异性全部走 15-export-publish-spec 的 preset / sanitize / fallback 层。

#### 1.2.6 P6 | 与 Typora 模式 cursor-aware 一致

所有扩展在 Typora 模式下遵循 cursor-aware 原则：光标进入节点时显示原始 Markdown 语法字符（如 `==` / `[^1]`），离开节点后隐藏仅显示渲染效果。

#### 1.2.7 P7 | Source 模式完整显示

所有扩展语法在 Source 模式下完整显示为 Markdown 文本（无隐藏），CodeMirror 语法高亮可点缀但不改结构。

---

## 2. 脚注（M-02=D）

### 2.1 语法

遵循 `markdown-it-footnote` 约定：

```markdown
这是正文[^1]，这里继续[^note]。

[^1]: 第一个脚注。
[^note]: 第二个脚注，支持**Markdown**格式。
```

- 引用 `[^id]`：行内；id 为 `[A-Za-z0-9_\-]+`
- 定义 `[^id]: 内容`：块级；可多行（后续行需 4 空格缩进）
- 支持在单个脚注内嵌套列表、代码块、公式等

### 2.2 渲染

#### 2.2.1 HTML 结构

```html
<p>这是正文<sup class="ink-footnote-ref" id="fnref-1"><a href="#fn-1" data-footnote-id="1">[1]</a></sup>...</p>
...
<section class="ink-footnotes">
  <ol>
    <li id="fn-1">第一个脚注。<a href="#fnref-1" class="ink-footnote-back">↩</a></li>
    <li id="fn-note">...</li>
  </ol>
</section>
```

#### 2.2.2 Typora 模式渲染

- 行内 `[^1]` 渲染为蓝色小角标 `[1]`（NodeView）
- cursor-aware：光标进入角标后，角标前后显示 `[^` 和 `]` 源字符，方便编辑
- 脚注定义区自动折叠到文档末尾的"脚注"节段
- 光标进入脚注定义行时，展开编辑区

#### 2.2.3 悬停预览

鼠标悬停在角标上 500ms 后，显示脚注内容的悬浮卡片：

- 卡片宽 max-width 320px
- 内容按 Markdown 渲染（支持嵌套扩展，但不递归渲染 wikilink）
- 卡片含"跳转"按钮（点击跳到脚注定义位置）

### 2.3 双向跳转

- 点击角标 → 滚动到脚注定义行并高亮 1s
- 点击脚注定义末尾的 `↩` → 跳回最近一个引用点
- 同一脚注被引用多次：`↩1 ↩2 ↩3` 多个回链

### 2.4 编辑命令

| 命令 ID | 说明 | 快捷键 |
|---|---|---|
| `editor.insert.footnote` | 在光标位置插入新脚注（自动分配 id + 光标跳到定义区） | `Ctrl/Cmd+Alt+F` |
| `editor.modify.footnote` | 进入当前脚注的编辑状态（展开定义） | — |
| `editor.remove.footnote` | 移除光标所在脚注引用 + 级联删除定义（无其他引用时） | — |
| `editor.navigate.footnote.to-def` | 跳转到定义 | — |
| `editor.navigate.footnote.to-ref` | 从定义跳回引用 | — |

### 2.5 斜杠命令入口

`/footnote` / `/脚注` → 触发 `editor.insert.footnote`。

### 2.6 自动编号

- id 默认为自增数字（`1`, `2`, ...）
- 用户可手动改 id（如 `[^note]`）；两种风格共存
- 渲染时的序号按出现顺序重新编号（不管 id 形态）

### 2.7 Source 模式序列化

完全保留原始 `[^id]` 与 `[^id]: 内容` 形式。定义区位置保留（用户手动安排）；序列化时不自动挪到末尾。

### 2.8 导出策略

| 平台 | 策略 |
|---|---|
| HTML | 完整保留（§2.2.1 结构） |
| Markdown | 原样保留（markdown-it-footnote 兼容 GFM 扩展子集） |
| WeChat | 转为 `<sup>` + 底部列表（决策 J-09）；锚点跳转用 `#fn-1` |
| Zhihu | 同 HTML，保留 `<sup><a>` 结构 |
| RedBook | 展开为"正文内括号注"`（注: ...）`；底部不单独列（长图不适合跨页锚点） |

### 2.9 Round-trip 测试

- `tests/roundtrip/footnote.spec.ts`
- 样本：单脚注 / 多脚注 / 嵌套列表的脚注 / 含公式的脚注 / 重复引用同一脚注

### 2.10 落地组件

- markdown-it 插件：`markdown-it-footnote`（社区版）+ 自研 `markdown-it-footnote-back-ref`（回链多重引用增强）
- TipTap 扩展：`src/editor/extensions/Footnote/FootnoteRef.ts` + `FootnoteDef.ts`
- NodeView：`src/editor/extensions/Footnote/FootnoteRefView.vue`
- 悬停卡片：`src/components/editor/FootnotePreviewCard.vue`

---

## 3. 多色高亮（M-03=D）

### 3.1 语法

```markdown
这是 ==高亮文本==。
这是 ==color:red 红色高亮==。
这是 ==color:#FFD700 金色高亮==。
```

- 基础：`==text==`（默认色 `--ink-highlight-default`，通常黄色）
- 多色扩展：`==color:<name> text==` 或 `==color:<hex> text==`

### 3.2 多色方案

#### 3.2.1 内置色板

| 色名 | CSS 变量 | 默认色 |
|---|---|---|
| `default` / `yellow` | `--ink-highlight-yellow` | `#FFF176` |
| `green` | `--ink-highlight-green` | `#A5D6A7` |
| `blue` | `--ink-highlight-blue` | `#90CAF9` |
| `pink` | `--ink-highlight-pink` | `#F48FB1` |
| `purple` | `--ink-highlight-purple` | `#CE93D8` |
| `orange` | `--ink-highlight-orange` | `#FFCC80` |
| `red` | `--ink-highlight-red` | `#EF9A9A` |
| `gray` | `--ink-highlight-gray` | `#CFD8DC` |

#### 3.2.2 自定义色

支持 `#rrggbb` 或 `#rgb` 十六进制；Zod 校验不合法色值时 fallback 到 default 并记录 warn 日志。

### 3.3 渲染

#### 3.3.1 HTML 结构

```html
<mark class="ink-highlight ink-highlight--yellow">text</mark>
<mark class="ink-highlight ink-highlight--custom" style="background-color:#FFD700">text</mark>
```

- 内置色走 CSS class
- 自定义色走 inline style（避免动态生成 class）

#### 3.3.2 Typora 模式

- 渲染为 `<mark>` 背景色
- cursor-aware：光标进入时显示 `==` 源字符
- 进入后 FloatingToolbar 显示"高亮颜色选择器"（10 色盘 + 自定义色按钮）

### 3.4 FloatingToolbar 颜色选择器

当选区被 `<mark>` 节点包裹时，工具栏追加颜色选择器组件：

```
┌───────────────────────────────────────────┐
│ [B] [I] [U] [S] [代码] [链接] │ [●][●][●][●][●][●][●][●] [+] │
└───────────────────────────────────────────┘
                                  │ 10 色圆点 + 自定义色按钮 │
```

- 点击色圆 → 立即更换当前高亮色
- 点击 `+` → 弹出 HSL 颜色选择器
- 当前高亮色显示描边圈

### 3.5 编辑命令

| 命令 ID | 说明 | 快捷键 |
|---|---|---|
| `editor.insert.highlight` | 为选区加高亮（默认色） | `Ctrl/Cmd+Alt+H` |
| `editor.modify.highlight.color` | 修改选区内高亮色 | — |
| `editor.remove.highlight` | 移除选区内高亮 | `Ctrl/Cmd+Alt+Shift+H` |

### 3.6 斜杠命令

`/highlight` / `/高亮` → `editor.insert.highlight`。

### 3.7 Source 模式序列化

- 默认色：`==text==`
- 内置色：`==color:yellow text==`
- 自定义色：`==color:#FFD700 text==`

序列化保留用户原始写法（不重写）；除非解析时识别为不合法色值则回退到 default 同时写入警告日志。

### 3.8 导出策略（对齐 15 §22 降级矩阵）

| 平台 | 策略 |
|---|---|
| HTML | `<mark>` + CSS 变量 |
| Markdown `standard` | 降级为 `<mark>text</mark>`（丢失色信息，或 inline `<span style="background">`） |
| Markdown `inkforge-ext` | 原样保留 `==color:... text==` |
| WeChat | `<span style="background-color: ...">text</span>`（inline 样式） |
| Zhihu | `<mark>` 或 `<span class="highlighter" style="...">` |
| RedBook | 长图内渲染为彩色背景块 |

### 3.9 Round-trip 测试

- `tests/roundtrip/highlight.spec.ts`
- 样本：单色高亮 / 多色混用 / 嵌套加粗 / 自定义 hex / 非法 hex 恢复 / 跨段落高亮（不允许，应拒绝）

### 3.10 落地组件

- markdown-it 插件：`markdown-it-mark`（社区）+ 自研 `markdown-it-mark-color`（color 参数解析）
- TipTap 扩展：`src/editor/extensions/Highlight/HighlightExt.ts`
- FloatingToolbar 集成：`src/components/editor/FloatingToolbar/HighlightColorPicker.vue`

---

## 4. TOC 宏 `[toc]`（M-04=D）

### 4.1 语法

```markdown
# 文章标题

[toc]

## 章节一
...

## 章节二
...
```

- 语法：单独一行 `[toc]`（大小写不敏感：`[TOC]` / `[Toc]` / `[toc]` 等价）
- 占一个块级节点位置
- 全文最多一个 `[toc]`；多个则除第一个外均视为普通文本

### 4.2 渲染

#### 4.2.1 Typora 模式

- 渲染为 NodeView：目录面板（含层级标题 + 可点击跳转）
- 当前阅读位置高亮（决策 J-09 + 基于 IntersectionObserver）
- cursor-aware：光标进入 NodeView 时显示 `[toc]` 源字符；NodeView 本身不可编辑内部文本（内容自动生成）

#### 4.2.2 Preview 模式

```html
<nav class="ink-toc" data-max-depth="3" data-numbered="false">
  <ol>
    <li><a href="#章节一">章节一</a>
      <ol>
        <li><a href="#子章节-1-1">子章节 1.1</a></li>
      </ol>
    </li>
    <li><a href="#章节二">章节二</a></li>
  </ol>
</nav>
```

### 4.3 参数配置

`[toc]` 支持行内参数：

```markdown
[toc depth=3 numbered=true]
[toc depth=2]
```

- `depth=2..6`：标题层级上限（默认 3）
- `numbered=true|false`：编号（默认 false）

参数解析失败时 fallback 到默认值并记录 warn。

### 4.4 与左栏 TOC 面板的关系（决策 J-09）

- `[toc]` 是正文内节点；左栏 TOC 面板（W-02 D，见 38-toc-system）是全局浮动面板
- 两者使用同一数据源（标题采集算法共享），避免两套解析
- 禁止用户编辑 `[toc]` NodeView 内部文本（J-09 硬约束："用户编辑 [toc] 节点内部文本"属禁止）

### 4.5 编辑命令

| 命令 ID | 说明 | 快捷键 |
|---|---|---|
| `editor.insert.toc` | 在光标位置插入 `[toc]` | `Ctrl/Cmd+Alt+T` |
| `editor.modify.toc.depth` | 修改深度参数 | — |
| `editor.modify.toc.numbered` | 切换编号 | — |
| `editor.remove.toc` | 删除 `[toc]` 节点 | — |

### 4.6 斜杠命令

`/toc` / `/目录` → `editor.insert.toc`。

### 4.7 Source 模式序列化

保留 `[toc]` 或 `[toc depth=N numbered=B]`；完整保真。

### 4.8 导出策略（对齐 15 §18 §19）

| 平台 | 策略 |
|---|---|
| HTML | 渲染为 `<nav class="ink-toc"><ol>...</ol></nav>`；位置由用户 `[toc]` 决定；如用户在导出对话框勾选"生成 TOC"则追加 / 覆盖 |
| Markdown `standard` | `toc: 'render-ol'` 时渲染为 OL 列表（带锚点 `[text](#slug)`） |
| Markdown `inkforge-ext` | 保留 `[toc]` 宏 |
| WeChat | 渲染为顶部锚点列表（锚点跳转兼容性有限；附加"点击跳转"说明） |
| Zhihu | 渲染为 OL 列表（知乎自动识别） |
| RedBook | 首页封面卡片包含目录缩略（图片化） |

### 4.9 Round-trip 测试

- `tests/roundtrip/toc-macro.spec.ts`
- 样本：默认参数 / depth=2 / numbered=true / 多个 `[toc]`（应仅第一个生效）/ 含特殊字符的标题

### 4.10 当前位置高亮

- 基于 IntersectionObserver 监测正文标题可见性
- 当前可见标题在 TOC NodeView 中加 `.is-current` class
- 节流 100ms，避免滚动抖动

### 4.11 落地组件

- markdown-it 插件：自研 `markdown-it-toc-macro`（识别 `[toc]` 与参数）
- TipTap 扩展：`src/editor/extensions/TOC/TOCMacro.ts` + `TOCMacroView.vue`
- 数据源：`src/services/toc/collect-headings.ts`（与 38-toc-system 共用）

---

## 5. Details/Summary 折叠块（M-05=D）

### 5.1 语法

双语法支持（两者等价）：

**原生 HTML**：

```markdown
<details>
<summary>点击展开</summary>

这里是折叠内容，支持 **Markdown** 格式。

- 列表项
- 列表项 2

```python
print("code block inside details")
```

</details>
```

**容器语法**（markdown-it-container 式）：

```markdown
:::details 点击展开
这里是折叠内容，支持 **Markdown** 格式。
:::
```

- 两种语法解析为同一 AST 节点
- 序列化时保留用户原始形态（不规范化为单一形式）

### 5.2 渲染

#### 5.2.1 HTML 结构

```html
<details class="ink-details" open="false">
  <summary class="ink-details__summary">点击展开</summary>
  <div class="ink-details__content">
    <!-- 渲染的 Markdown 内容 -->
  </div>
</details>
```

#### 5.2.2 Typora 模式

- NodeView 渲染：summary 作为标题行（粗体 + 三角形折叠图标）
- 内容区可编辑（嵌套 Markdown 内容实时渲染）
- 折叠 / 展开通过点击三角或快捷键 `Ctrl/Cmd+Enter`
- cursor-aware：光标进入 summary 时显示 `<summary>` 标签字符（或 `:::details` 前缀）

### 5.3 编辑命令

| 命令 ID | 说明 | 快捷键 |
|---|---|---|
| `editor.insert.details` | 插入空的 details 块 | `Ctrl/Cmd+Alt+D` |
| `editor.modify.details.summary` | 修改 summary 文本 | — |
| `editor.modify.details.toggle` | 折叠/展开 | `Ctrl/Cmd+Enter`（光标在节点内） |
| `editor.remove.details` | 解包 details（保留内容） | — |

### 5.4 斜杠命令

`/details` / `/折叠` → `editor.insert.details`。

### 5.5 Typora 模式正确渲染（M-05=D 补充）

决策明确："Typora 模式正确渲染"是 D 级要求，不允许退化为纯文本。

- 内容区必须实时渲染（不显示 HTML 标签字符除光标进入时）
- summary 可编辑，保留内联格式（粗体 / 斜体 / 链接等）
- 嵌套 details 支持（理论无限层，实用层级建议 ≤ 3）

### 5.6 Source 模式序列化

保留原始形态（HTML 或 `:::details`）；解析时按出现的形式决定序列化输出形式。

### 5.7 导出策略

| 平台 | 策略 |
|---|---|
| HTML | 原生 `<details><summary>` |
| Markdown `standard` | 保留原生 HTML（GFM 兼容） |
| Markdown `inkforge-ext` | 保留原始语法（HTML 或 `:::`） |
| WeChat | 展开为普通段落 + summary 粗体标题（公众号不支持交互折叠） |
| Zhihu | 展开为普通段落（disallowedTags 含 details） |
| RedBook | 长图内展开为带装饰标题的段落 |

对应 preset `fallback.details: 'expanded' | 'keep-html' | 'summary-only'`（15-export-publish-spec §3.1）。

### 5.8 Round-trip 测试

- `tests/roundtrip/details.spec.ts`
- 样本：HTML 语法 / 容器语法 / 嵌套 details / 包含代码块 / 包含公式 / summary 含内联格式

### 5.9 落地组件

- markdown-it 插件：`markdown-it-container`（社区，配置 `details` 容器）+ 原生 `<details>` 标签白名单（原生 HTML 支持）
- TipTap 扩展：`src/editor/extensions/Details/Details.ts`（复合节点：Summary + Content）
- NodeView：`src/editor/extensions/Details/DetailsView.vue`

---

## 6. Emoji `:name:`（M-06=C）

### 6.1 语法

```markdown
你好 :smile: 世界 :+1: :heart_eyes:
```

- 行内 `:name:`
- name 匹配 `[a-z0-9_+-]+`
- 数据源：[emojibase-data](https://github.com/milesj/emojibase)（CC BY 4.0 许可）

### 6.2 渲染

#### 6.2.1 HTML 结构

- 默认：渲染为 Unicode 字符（`:smile:` → `U+1F604`）
- 可选：渲染为 `<img>` 标签（用 Twemoji 或 OpenMoji SVG，Settings 可切换）

```html
<!-- Unicode 模式 -->
<span class="ink-emoji" data-emoji-name="smile">U+1F604</span>

<!-- 图片模式 -->
<img class="ink-emoji ink-emoji--image" src="data:image/svg+xml;..." alt=":smile:" data-emoji-name="smile" />
```

#### 6.2.2 Typora 模式

- 渲染为 Unicode 字符（默认）或 SVG 图像（设置驱动）
- cursor-aware：光标进入时显示 `:smile:` 源文本
- 光标紧邻时（输入 `:`）弹出自动完成面板

### 6.3 自动完成面板（M-06=C 核心）

#### 6.3.1 触发

- 用户输入 `:` 后立即触发自动完成
- 输入 `:sm` → 过滤显示所有以 `sm` 开头的 emoji

#### 6.3.2 面板内容

```
┌─────────────────────────────────┐
│ :sm                             │
├─────────────────────────────────┤
│ U+1F604 :smile:       笑脸           │
│ U+1F642 :smiley:      微笑           │
│ U+1F60A :smirk:       得意           │
│ U+1F63A :smiley_cat:  猫笑           │
│ ...                             │
│ ──────── 常用 ────────          │
│ U+1F44D :+1:  U+2764 U+FE0F :heart:  U+1F389 :tada:  │
└─────────────────────────────────┘
```

- 上下键选择，Enter 插入
- 显示名称 + 中文翻译（locale 驱动）
- 底部分区显示"常用"（见 §6.4）

### 6.4 常用收藏（M-06=C 核心）

#### 6.4.1 收藏机制

- 用户使用某 emoji 后计数 +1
- `Settings.emoji.frequentCount: number`（默认 20）
- 常用区按计数倒序显示前 N 个
- 收藏列表持久化到 `IndexedDB.settings`（profile-scoped）

#### 6.4.2 快捷入口

- 主工具栏 / 斜杠命令 `/emoji` 打开完整选择器（非 `:` 触发的独立面板）
- 独立面板顶部显示"常用"区

### 6.5 编辑命令

| 命令 ID | 说明 | 快捷键 |
|---|---|---|
| `editor.insert.emoji` | 打开 emoji 选择面板 | `Ctrl/Cmd+Alt+E` |
| `editor.insert.emoji.byName` | 按 name 插入指定 emoji | — |

### 6.6 斜杠命令

`/emoji` / `/表情` → 打开独立选择面板。

### 6.7 Source 模式序列化

保留 `:name:` 原样；不转换为 Unicode（Source 模式是 Markdown 源的直接呈现）。

### 6.8 导出策略

| 平台 | 策略 |
|---|---|
| HTML | Unicode 字符（默认）或 SVG `<img>`（preset 可选） |
| Markdown `standard` | Unicode 字符（inline-replacement 降级） |
| Markdown `inkforge-ext` | 保留 `:name:` |
| WeChat | Unicode 字符（公众号兼容性好） |
| Zhihu | Unicode 字符 |
| RedBook | Unicode 字符（长图内直接绘制） |

对应 preset `fallback.emoji: 'unicode' | 'image' | 'shortcode'`。

### 6.9 自定义 emoji（v2.2+ 候选）

v2.1 不支持用户自定义 emoji；v2.2 候选支持"组织级 emoji 包"（上传 SVG + 命名）。

### 6.10 Round-trip 测试

- `tests/roundtrip/emoji.spec.ts`
- 样本：单 emoji / 多 emoji / 不存在的 name（fallback 到 `:unknown:` 文本） / 连续 emoji / emoji + 文字

### 6.11 落地组件

- markdown-it 插件：`markdown-it-emoji`（社区）+ 自研 `markdown-it-emoji-data`（接 emojibase 数据源）
- TipTap 扩展：`src/editor/extensions/Emoji/EmojiExt.ts`
- 自动完成：`src/components/editor/EmojiAutocomplete.vue`
- 独立面板：`src/components/editor/EmojiPickerPanel.vue`
- 数据：`src/services/emoji/emojibase-adapter.ts`（懒加载）

---

## 7. 数学公式辅助输入（M-08=D）

### 7.1 语法

#### 7.1.1 行内公式

```markdown
行内公式 $E = mc^2$ 嵌入文本。
```

- 开 / 闭定界符：`$`
- 语法：标准 LaTeX（KaTeX 支持子集）
- `$` 两侧必须非空白字符（避免与美元符号冲突）

#### 7.1.2 块级公式

```markdown
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```

- 开 / 闭定界符：`$$`
- 独占块
- 可选编号（见 §7.4）

### 7.2 渲染

#### 7.2.1 HTML 结构（KaTeX 输出）

- 行内：`<span class="katex">...</span>`
- 块级：`<div class="katex-display">...</div>`

#### 7.2.2 Typora 模式

- 渲染为编译后的数学公式（MathML + SVG）
- cursor-aware：光标进入时显示 `$...$` 源码 + FormulaBuilderPanel 触发按钮
- 光标在块级公式内时，右侧或下方显示并排编辑预览（见 §7.5）

### 7.3 FormulaBuilderPanel（M-08=D 核心）

#### 7.3.1 面板结构

```
┌───────────────────────────────────────────┐
│ 公式编辑                              [X] │
├────────────────────┬──────────────────────┤
│ 源码 (LaTeX)       │ 预览                 │
│ ────────────────── │ ──────────────────── │
│ \int_{-\infty}... │                      │
│                    │  ∫_{-∞}^{∞} e^{-x²} dx │
│                    │  = √π                │
├────────────────────┴──────────────────────┤
│ 常用符号：                                 │
│ [∫] [∑] [∏] [√] [±] [∞] [α] [β] [→] [⊕] │
│ 分类：希腊字母 / 运算符 / 关系 / 箭头 /... │
├───────────────────────────────────────────┤
│ 模板：                                     │
│ [分式] [矩阵] [方程组] [极限] [积分]      │
├───────────────────────────────────────────┤
│ 编号：[ ] 生成 label  ID: eq-1            │
│ [取消]                              [插入] │
└───────────────────────────────────────────┘
```

#### 7.3.2 实时预览（预览编辑并排）

- 源码输入时，右侧预览每 200ms 节流刷新
- 语法错误时，预览区显示 KaTeX 的错误信息 + 高亮出错行

#### 7.3.3 符号面板

- 分类：希腊字母 / 运算符 / 关系 / 箭头 / 几何 / 逻辑 / 微积分 / 括号 / 其他
- 点击符号 → 插入到源码编辑区当前光标位置

#### 7.3.4 模板插入

- 分式：`\frac{a}{b}`
- 矩阵：`\begin{pmatrix} a & b \\ c & d \end{pmatrix}`
- 方程组：`\begin{cases} a \\ b \end{cases}`
- 极限：`\lim_{x \to \infty}`
- 积分：`\int_{a}^{b}`

### 7.4 公式编号

#### 7.4.1 语法

```markdown
$$
E = mc^2 \tag{1}
$$

或自动编号：

$$
E = mc^2
$${#eq-energy}
```

- 手动 `\tag{1}`：在公式内写入（KaTeX 原生支持）
- 文档级自动编号：`$${#id}` 语法，编号由文档顺序决定

#### 7.4.2 渲染

- 编号在公式右侧，括号包围：`(1)` / `(2)` / ...
- 自动编号的公式可被引用（见 §7.5）

### 7.5 交叉引用

#### 7.5.1 引用语法

```markdown
参见公式 [^eq-energy]。

或

根据方程 {ref: eq-energy}，...
```

- `{ref: id}` 语法：渲染为"方程 (N)"，其中 N 为自动编号
- 点击跳转到公式位置

#### 7.5.2 引用自动完成

- 用户输入 `{ref:` 后弹出面板
- 列出全文中所有带 `#id` 的公式（标题 + 编号）

### 7.6 预览编辑并排（M-08=D 补充"预览编辑并排"）

- 当光标在块级公式内时，编辑器右侧（或下方）显示该公式的实时预览区
- 预览区跟随 FormulaBuilderPanel 的预览
- 关闭预览并排：Settings > Editor > Math > `showInlinePreviewWhileEditing: boolean`

### 7.7 编辑命令

| 命令 ID | 说明 | 快捷键 |
|---|---|---|
| `editor.insert.math.inline` | 插入行内公式骨架 `$$` 并把光标置于中间 | `Ctrl/Cmd+Alt+M` |
| `editor.insert.math.block` | 插入块级公式骨架 | `Ctrl/Cmd+Alt+Shift+M` |
| `editor.modify.math` | 打开 FormulaBuilderPanel 编辑当前公式 | 双击公式节点 |
| `editor.insert.math.ref` | 插入公式交叉引用 `{ref: id}` | — |
| `editor.remove.math` | 移除当前公式节点 | — |

### 7.8 斜杠命令

- `/math` / `/公式` → `editor.insert.math.block`
- `/imath` / `/行内公式` → `editor.insert.math.inline`
- `/ref` / `/引用` → 根据上下文选择（公式 ref / wiki link / citation，见 §8 §9）

### 7.9 Source 模式序列化

完整保留原始 `$...$` / `$$...$$` / `\tag{}` / `$${#id}` / `{ref: id}`。

### 7.10 导出策略（对齐 15 §7 §15）

| 平台 | 策略 |
|---|---|
| HTML | KaTeX 渲染为 `htmlAndMathml` |
| Markdown `standard` | 保留 `$...$` / `$$...$$` 源码（parser 不识别也保持文本） |
| Markdown `inkforge-ext` | 同 standard |
| WeChat | 公式 → SVG → 规范化 + 压缩（§7.1 WeChat 适配器）；fallback 链：svg → png → latex-source |
| Zhihu | 保留 LaTeX 源（`<span data-formula-type="">\\(...\\)</span>`） |
| RedBook | 公式渲染为 PNG 嵌入长图 |

### 7.11 Round-trip 测试

- `tests/roundtrip/math.spec.ts`
- 样本：简单公式 / 复杂嵌套（矩阵 + 分式 + 积分）/ 带编号 / 带引用 / 非法 LaTeX（语法错误）/ 含特殊字符

### 7.12 性能约束

- 渲染 100 个行内 + 10 个块级公式：单次首屏渲染 ≤ 500ms
- 超过阈值时渐进渲染（IntersectionObserver 触发）

### 7.13 落地组件

- markdown-it 插件：自研 fence 处理（不走 `markdown-it-texmath`，与 04 渲染链路对齐）
- TipTap 扩展：`src/editor/extensions/Math/MathInline.ts` + `MathBlock.ts`
- NodeView：`src/editor/extensions/Math/MathBlockView.vue`（含行内预览）
- FormulaBuilderPanel：`src/components/editor/FormulaBuilderPanel.vue`
- 编号 / 引用管理：`src/services/math/numbering.ts`

---

## 8. Wiki Link `[[文章名]]`（EX-02）

### 8.1 语法

```markdown
参见 [[文章 A]]，也可以看 [[文章 A|快速入门]]。

引用特定章节：[[文章 A#章节二]]。
```

- `[[title]]`：链接到标题为 title 的文档
- `[[title|alias]]`：显示 alias 文本但链接到 title
- `[[title#heading]]`：链接到该文档的某个标题

### 8.2 渲染

#### 8.2.1 HTML 结构

```html
<a class="ink-wikilink" href="ink://doc/{slug}" data-wikilink-target="文章 A" data-wikilink-resolved="true">文章 A</a>

<!-- 未解析（找不到目标） -->
<a class="ink-wikilink ink-wikilink--unresolved" data-wikilink-target="不存在" data-wikilink-resolved="false">不存在</a>
```

#### 8.2.2 Typora 模式

- 已解析：显示为下划线链接 + 蓝色
- 未解析：虚线下划线 + 红色（提示"该文档不存在"）
- 悬停显示目标文档的摘要卡片（含标题 + 首段）

### 8.3 自动完成

#### 8.3.1 触发

- 用户输入 `[[` 后触发自动完成面板
- 面板显示当前 profile 下所有文档（按最近访问排序）

#### 8.3.2 面板内容

```
┌───────────────────────────────────────┐
│ [[ 文章                                │
├───────────────────────────────────────┤
│ [document-icon] 文章 A            2026-04-18       │
│   草稿 · 标签：写作                    │
├───────────────────────────────────────┤
│ [document-icon] 文章笔记          2026-04-17       │
│   已发布 · 标签：笔记                  │
├───────────────────────────────────────┤
│ [创建新文档：文章]                     │
└───────────────────────────────────────┘
```

- 支持标题模糊搜索 + 标签过滤
- 底部提供"创建新文档"选项（标题为当前输入文本）

### 8.4 跳转行为

- 点击已解析链接：在当前窗口打开目标文档（保留当前滚动位置到历史栈）
- 点击未解析链接：弹出确认 "是否创建新文档 [文章 A]？"
- `Ctrl/Cmd+点击`：新标签页打开
- `Shift+点击`：新窗口打开（Tauri 多窗口，见 L1-53 C）

### 8.5 反向链接索引

#### 8.5.1 索引结构

```ts
interface BacklinkIndex {
  // key: documentId, value: 所有指向该文档的 wikilink 位置
  [documentId: string]: Array<{
    sourceDocumentId: string;
    location: { line: number; column: number };
    alias?: string;
    anchor?: string;
  }>;
}
```

#### 8.5.2 反向链接面板

- Document Property Panel（F-06）中新增 Tab："被引用"
- 列出所有引用当前文档的 wikilink 来源
- 点击跳转到来源位置

#### 8.5.3 索引更新时机

- 文档保存时（异步增量更新）
- 文档删除 / 重命名时（全量扫描影响的文档）
- Workstation 启动时做一致性校验（抽样）

### 8.6 编辑命令

| 命令 ID | 说明 | 快捷键 |
|---|---|---|
| `editor.insert.wikilink` | 打开 wikilink 自动完成面板 | `[[` 或 `Ctrl/Cmd+Alt+K` |
| `editor.modify.wikilink.target` | 修改目标 | 双击链接 |
| `editor.modify.wikilink.alias` | 修改别名 | — |
| `editor.remove.wikilink` | 移除 wikilink（保留文字） | — |
| `editor.navigate.wikilink.to-target` | 跳转到目标文档 | — |
| `editor.navigate.wikilink.to-backlinks` | 打开反向链接面板 | — |

### 8.7 斜杠命令

`/link` / `/wikilink` / `/内链` → `editor.insert.wikilink`。

### 8.8 Source 模式序列化

完整保留 `[[title]]` / `[[title|alias]]` / `[[title#heading]]`。

### 8.9 导出策略

| 平台 | 策略 |
|---|---|
| HTML 单文件 | 失效（无法跨文档跳转）→ fallback 为 `<span>` 文本 + `title` 属性注释目标名 |
| HTML 离线包 | 如果导出时启用"包含被引用文档"则生成相对链接 `./文章A.html`；否则同单文件 fallback |
| Markdown `standard` | `[文章 A](./文章A.md)`（inline-replacement） |
| Markdown `inkforge-ext` | 保留 `[[文章 A]]` |
| WeChat | 纯文本（公众号不允许相对链接，链接必须是绝对 URL） |
| Zhihu | 同 WeChat |
| RedBook | 纯文本 |

对应 preset `fallback.wikilink: 'plain-text' | 'external-link' | 'footnote-ref'`。

### 8.10 冲突处理

- 同名文档：自动追加 `#N` 区分（N 为 profile 内的顺序编号）
- 用户可在 Settings > WikiLink > 冲突解析策略 配置：`first-created` / `last-modified` / `ask`

### 8.11 Round-trip 测试

- `tests/roundtrip/wikilink.spec.ts`
- 样本：已解析 / 未解析 / 带 alias / 带 anchor / 同名冲突 / 特殊字符标题

### 8.12 落地组件

- markdown-it 插件：自研 `markdown-it-wikilink`
- TipTap 扩展：`src/editor/extensions/WikiLink/WikiLink.ts`
- 自动完成：`src/components/editor/WikiLinkAutocomplete.vue`
- 反向链接索引：`src/services/wikilink/backlinks-index.ts`
- 跨文档跳转：`src/services/navigation/cross-doc.ts`

---

## 9. 引用来源标注（EX-10）

### 9.1 语法

#### 9.1.1 基础：Blockquote + source URL

```markdown
> 这是一段来自外部的引用文本。
>
> — {source: https://example.com/article, kind: factual}
```

- 标准 GFM blockquote + 末尾 `{source: ..., kind: ...}` 元数据行
- `source`：URL 或自由文本（如书名 + 作者）
- `kind`：`factual` / `inferred` / `authored`（三层来源，见 §9.2）

#### 9.1.2 行内引用

```markdown
根据某研究 {cite: src-2026-ai}，AI 编辑器市场年增长率 30%。
```

- `{cite: id}`：行内引用，引用到 `frontmatter.citation.sources[]` 中的某条
- 避免在正文中写完整 URL，保持整洁

### 9.2 三层来源（EX-10 + 决策 H-02 三层引用）

| 层 | kind 值 | 语义 | 视觉 |
|---|---|---|---|
| **事实** | `factual` | 外部可验证事实（链接可访问） | 绿色引号装饰 + 小图标 [info-icon] |
| **推断** | `inferred` | 基于事实的推断或 AI 生成 | 蓝色引号 + 小图标 [idea-icon] |
| **手写** | `authored` | 作者原创内容（可选标注） | 橙色引号 + 小图标 [author-icon] |

AI 产出必须声明 `kind: factual` 或 `kind: inferred`（见 10-markdown-authority-spec §14.4）。

### 9.3 渲染

#### 9.3.1 HTML 结构

```html
<!-- blockquote 形式 -->
<blockquote class="ink-citation ink-citation--factual" data-source-url="https://example.com/article" data-citation-kind="factual">
  <p>这是一段来自外部的引用文本。</p>
  <footer class="ink-citation__meta">
    <span class="ink-citation__icon" aria-hidden="true">...</span>
    <a href="https://example.com/article" class="ink-citation__source">example.com</a>
  </footer>
</blockquote>

<!-- 行内 cite 形式 -->
<span class="ink-cite" data-citation-id="src-2026-ai">
  <a href="#citation-src-2026-ai">[1]</a>
</span>
```

#### 9.3.2 Typora 模式

- Blockquote 引用：在末尾显示小徽章（kind + source 图标）
- 行内 cite：显示为上标编号 `[1]`，悬停显示完整来源

### 9.4 与 Frontmatter 的关系

所有行内 `{cite: id}` 必须指向 `frontmatter.citation.sources[]` 中的一条（见 10-markdown-authority-spec §4.1 / §4.2）：

```yaml
---
citation:
  format: apa
  sources:
    - id: src-2026-ai
      kind: factual
      url: https://example.com/article
      note: "2026 AI 编辑器市场报告"
---
```

- 未注册的 cite id → 编辑器警告 + 未解析样式
- 用户可一键"提取内联来源到 frontmatter"

### 9.5 编辑命令

| 命令 ID | 说明 | 快捷键 |
|---|---|---|
| `editor.insert.citation.block` | 为选中 blockquote 添加来源标注 | — |
| `editor.insert.citation.inline` | 在光标处插入行内 `{cite: id}` | `Ctrl/Cmd+Alt+C` |
| `editor.modify.citation.source` | 修改 URL 或来源文本 | 双击徽章 |
| `editor.modify.citation.kind` | 切换 kind | — |
| `editor.remove.citation` | 移除来源标注（保留 blockquote 内容） | — |
| `editor.navigate.citation.to-source` | 打开外部链接 | — |

### 9.6 斜杠命令

- `/cite` / `/引用` → `editor.insert.citation.inline`
- `/quote-source` → `editor.insert.citation.block`

### 9.7 Source 模式序列化

保留完整语法：
- Blockquote 末尾 `{source: ..., kind: ...}` 行
- 行内 `{cite: id}`
- Frontmatter `citation.sources[]`

### 9.8 导出策略

| 平台 | 策略 |
|---|---|
| HTML | 完整保留（三层 kind 的 CSS 装饰） |
| Markdown `standard` | `wrap-comment`：`<!-- cite: id -->` + 正文注释 |
| Markdown `inkforge-ext` | 保留完整语法 |
| WeChat | 转为脚注（底部列出所有来源）或内联（preset 决定） |
| Zhihu | 保留 blockquote + `<a>` |
| RedBook | 长图封面卡片末尾显示"来源"区 |

对应 preset `fallback.citation: 'hidden' | 'footnote' | 'inline'`。

### 9.9 Round-trip 测试

- `tests/roundtrip/citation.spec.ts`
- 样本：三层 kind 各一 / 行内 + blockquote 混用 / 多重引用 / 未解析 id / 无效 URL

### 9.10 权限与审计（决策 H-04 知识摄取权限）

- AI 在文档中插入 citation 必须经过命令系统（24-permission-audit），生成 audit 事件
- `kind: factual` 的外链必须经过安全检查（域名白名单 / 恶意检测）——v2.1 最小实现：URL 格式校验，完整检查延后

### 9.11 落地组件

- markdown-it 插件：自研 `markdown-it-citation`
- TipTap 扩展：`src/editor/extensions/Citation/CitationBlock.ts` + `CitationInline.ts`
- NodeView：`src/editor/extensions/Citation/CitationView.vue`
- Frontmatter 联动：`src/services/citation/frontmatter-sync.ts`
- 来源管理 UI：`src/components/document/CitationSourcesPanel.vue`

### 9.12 P1 学术引用 baseline 实装状态

`inkforge.citation` 在 P1 Citation Baseline 中同时承担两类语法：

- EX-10 来源标注 `{cite: id}` / blockquote source metadata 仍按本节规划保留，面向事实来源与 AI 产出审计。
- Spec 56 学术引用 `[@key]` 已在 `src/services/citation/*` 与 `src/services/markdown-ext/render.ts` 落地，面向 Pandoc-style academic citation 与 BibTeX bibliography。

当前学术引用 baseline 的运行真相如下：

- `[@key]`、`[@a; @b]`、`[@key, p. 42]`、`[-@key]` 会被 renderer 转成 `<cite class="ink-academic-citation">`，并保留 `data-citation-raw` / `data-citation-keys` / `data-citation-style` / `data-citation-missing`。
- 没有真实 BibTeX entry 时必须显示 unresolved citation；不得从 key 猜测作者、年份或标题。
- 有真实 BibTeX entries 时，formatter 只提供 deterministic local CSL-style output，不宣称完整 CSL processor。
- Typora serializer 必须优先识别 `.ink-footnote-ref`、`.ink-academic-citation`、`.ink-footnotes`，并兼容 Tiptap-normalized `h2.ink-footnotes__title + ol > li[data-footnote-id]`。
- Source 模式仍显示 Markdown 原文；Preview/Typora/export HTML 均为 Markdown 派生结果，不得把 HTML 写回为权威状态。

---

## 10. Callout（M-01=A）—— 延后 v2.2+ 声明

### 10.1 决策

用户选择 **A**（"不做"），补充 "后续完成"。

### 10.2 v2.1 中的占位处理

- 注册表条目 `inkforge.callout` 保留占位（10-markdown-authority-spec §6.2）
- markdown-it 不加载 callout 插件
- TipTap 扩展不注册
- 若用户文档中存在 `:::note` / `:::warn` 等语法，按普通 `markdown-it-container` 解析为 `<div class="note">`（保留文本内容，不渲染特殊视觉）
- Source 模式下显示原文（不做高亮）

### 10.3 v2.2+ 规划

届时将补充：

- 类型：note / info / warn / danger / tip / success（6 种）
- 语法：`:::note 标题` 容器 + Markdown 内容
- NodeView：颜色装饰 + 图标（lucide-vue-next：Info / AlertTriangle / Lightbulb / CheckCircle2 等）
- 与导出平台的适配：WeChat 转为彩色背景段落，Zhihu 转为 blockquote + 标题

### 10.4 不反向污染

v2.1 期间绝不因为"为将来兼容"而在其他扩展里预留 callout 字段；完全隔离。

---

## 11. Embed（M-07=A）—— 延后 + 渠道兼容性原则

### 11.1 决策

用户选择 **A**（"不做"），补充 "许多渠道不支持嵌入，需要根据平台渠道规则反向选择"。

### 11.2 关键设计信号

决策中强调 "渠道兼容性决定内容能力"——这是重要的设计原则：

> 任何内容能力都应先看渠道兼容性。

本原则写入 InkForge"设计哲学"总则，影响所有未来扩展的取舍。

### 11.3 v2.1 中的占位处理

- 注册表条目 `inkforge.embed` 保留占位
- 语法 `@embed[url]` 不被解析（作为普通文本处理）
- Source 模式显示原文
- 若用户粘贴 YouTube / Bilibili / Twitter 嵌入代码（原生 `<iframe>`）：
  - UnifiedSanitizer **保留** `<iframe>`（10-markdown-authority-spec §3.3 / 15 §1.7）
  - 但各平台 sanitize 按 preset 执行清理（WeChat / Zhihu / RedBook 默认剥离 iframe）
  - HTML 导出：保留 iframe（用户自负）

### 11.4 v2.2+ 规划

届时将：

- 定义 `@embed[url]` 宏
- 提供 URL 解析器（识别 YouTube / Bilibili / Twitter / GitHub gist）
- 按目标渠道决定嵌入方式（iframe / 链接卡片 / 纯文本）
- 与 P-06 PublishAdapter 的 `featureSupport.embeds` 字段联动

---

## 12. 与 Typora 模式的集成

### 12.1 统一原则

所有扩展在 Typora 模式下必须满足：

1. **cursor-aware**：光标进入节点后显示原始 Markdown 语法字符（如 `==` / `[^1]` / `$$` / `[[` / `:::`）
2. **即时渲染**：光标离开节点后隐藏源字符，仅显示渲染效果
3. **原位编辑**：块级扩展（Details / Math block / TOC / Citation block）允许直接在 NodeView 中编辑内容
4. **快捷键穿透**：扩展节点内的编辑仍接受全局快捷键（保存 / 撤销 / 专注切换）
5. **滚动条保留**：扩展节点不改变外层滚动容器

### 12.2 NodeView 性能约束

- 单个 NodeView 首次渲染 ≤ 50ms
- 大量 NodeView（如 100 个公式 + 50 个 emoji）不得造成帧率下降到 30fps 以下
- 超过阈值时使用懒渲染（IntersectionObserver + 占位高度预估）

### 12.3 FloatingToolbar 对扩展的感知

- 选中普通文本：显示基础样式组（粗体/斜体/代码/链接）
- 选中扩展节点：显示扩展专属命令组
  - 高亮节点：颜色选择器（§3.4）
  - 公式节点：打开 FormulaBuilderPanel / 插入 ref
  - Wikilink：编辑目标 / alias / 打开反向链接
  - Citation：切换 kind / 修改来源
  - Details：折叠/展开 / 修改 summary
  - Footnote：编辑定义 / 跳转到定义

### 12.4 冲突解决

多个扩展的视觉 / 交互可能冲突。解决方案：

- 节点嵌套优先级：Block > Inline（如 Math block 内不允许嵌套 footnote）
- 选区跨节点：命令以选区顶层节点类型为准
- 快捷键冲突：按 Settings > Keyboard 中用户配置的优先级（对齐决策 I-04）

---

## 13. 与 Source 模式的序列化

### 13.1 原则

Source 模式是 Markdown 源的直接呈现。所有扩展语法必须：

1. **无损保留**：用户在 Source 模式手写的扩展语法，切到 Typora 再切回 Source，字符级一致
2. **完整显示**：所有语法字符（`==` / `[^` / `:::` 等）完整显示
3. **CodeMirror 语法高亮**：对扩展语法提供 decorator（可选的视觉点缀）

### 13.2 CodeMirror 语法高亮配置

```ts
// src/editor/modes/source/highlight-plugin.ts
export const inkforgeExtHighlight = {
  '==': 'highlight-delim',
  '[^': 'footnote-ref',
  ':::': 'container-delim',
  '$$': 'math-delim',
  '[[': 'wikilink-delim',
  '{cite:': 'citation-delim',
  '[toc]': 'toc-macro',
  ':smile:': 'emoji-shortcode',
};
```

色板使用 Typography 主题的子集（不独立定义）。

### 13.3 Source 模式下的插入命令

- 斜杠命令 / 快捷键 / 工具栏在 Source 模式下也可用
- 插入的内容直接写入 CodeMirror doc（Markdown 文本形式）
- 不经过 TipTap JSON 中转（决策 C-23 FloatingToolbar 跨模式）

### 13.4 错误标注

- 解析器识别到"半写"的扩展语法（如未闭合 `==`）时，CodeMirror 在该位置显示红色波浪下划线
- 悬停显示错误提示

---

## 14. 与导出管线的联动

### 14.1 统一出口

所有扩展的导出策略最终在 15-export-publish-spec 的 preset `fallback` 字段中汇总：

```ts
preset.fallback = {
  highlight: 'mark-tag' | 'span-bg-color' | 'text-only',
  footnote: 'anchor-list' | 'inline-paren' | 'keep',
  wikilink: 'plain-text' | 'external-link' | 'footnote-ref',
  citation: 'hidden' | 'footnote' | 'inline',
  math: FormulaStrategy,
  mermaid: MermaidStrategy,
  details: 'expanded' | 'keep-html' | 'summary-only',
  emoji: 'unicode' | 'image' | 'shortcode',
  toc: 'preserve-macro' | 'render-ol' | 'strip',
};
```

### 14.2 降级事件审计

每次扩展发生降级都会调用 `downgradeLogger.record(event)`，最终写入 `IndexedDB.export_logs`（15 附录 B）。

### 14.3 不反向污染

本 Spec 定义的所有扩展：
- **不知道**目标平台（TipTap JSON 层面）
- **不知道**渲染平台（markdown-it AST 层面）
- 平台特异性完全在 15 的 exporter 里处理

### 14.4 注册表单一出入口

扩展注册表 `src/services/markdown-ext/registry.ts` 是 15 与 16 的接口：

- 本 Spec 定义扩展的"什么 / 如何"
- 15 的 exporter 消费注册表的 `fallback.toStandardMd` 与 `fallback.toPlatform`
- CI 守护：新增扩展未登记 → 阻断 merge

---

## 15. 验收矩阵

### 15.1 功能验收

每条扩展（9 条实装）必须通过以下验收：

| 项 | 脚注 | 高亮 | TOC 宏 | Details | Emoji | Math | Wikilink | Citation |
|---|---|---|---|---|---|---|---|---|
| Typora 渲染 | yes | yes | yes | yes | yes | yes | yes | yes |
| Source 保真 | yes | yes | yes | yes | yes | yes | yes | yes |
| Preview 渲染 | yes | yes | yes | yes | yes | yes | yes | yes |
| cursor-aware | yes | yes | yes | yes | yes | yes | yes | yes |
| 斜杠命令 | yes | yes | yes | yes | yes | yes | yes | yes |
| 工具栏入口 | yes | yes | yes | yes | yes | yes | yes | yes |
| 快捷键 | yes | yes | yes | yes | yes | yes | yes | yes |
| 导出 5 平台 | yes | yes | yes | yes | yes | yes | yes | yes |
| 降级日志 | yes | yes | yes | yes | yes | yes | yes | yes |
| Round-trip | yes | yes | yes | yes | yes | yes | yes | yes |

### 15.2 Round-trip 测试用例

- 9 个扩展 × 5 样本 × 4 路径（Typora→Source→Typora / Typora→Preview / Source→Markdown 序列化 / Source→Export）= **180 条**
- 加上 5 平台的导出差异 = 每扩展额外 5 × 3 = 15 条；9 × 15 = **135 条**
- 总计约 **315 条** round-trip 测试

### 15.3 E2E 场景

| 场景 | 预期 |
|---|---|
| 输入 `==` 后输入文字 `==`，光标离开 | 文字渲染为黄色高亮 |
| 选中高亮后打开颜色选择器换色 | 颜色立即更新，Source 模式同步 |
| 输入 `[[` 触发自动完成 | 面板弹出，上下键选择，Enter 插入 |
| 输入 `:sm` 触发 emoji 完成 | 面板弹出，显示以 sm 开头的 emoji |
| 插入 `[toc]` 后添加 3 级标题 | TOC NodeView 自动更新；当前阅读位置高亮 |
| 双击公式节点 | FormulaBuilderPanel 打开，预览并排 |
| 引用公式 `{ref: eq-1}` 后修改 eq-1 的编号 | ref 文本自动更新为新编号 |
| 点击 wikilink 未解析链接 | 弹出"创建新文档"确认 |
| 悬停脚注角标 | 悬浮卡片显示脚注内容 |
| 导出到 WeChat 包含 5 种扩展 | 降级清单列出所有降级 + export_logs 写入 |

### 15.4 性能 SLO

| 指标 | SLO |
|---|---|
| 脚注悬停卡片响应 | ≤ 100ms |
| 高亮颜色切换 | ≤ 50ms |
| TOC 更新（标题变化时） | ≤ 200ms（节流） |
| Emoji 自动完成面板弹出 | ≤ 100ms |
| FormulaBuilderPanel 预览刷新 | ≤ 200ms（节流） |
| Wikilink 自动完成面板弹出 | ≤ 150ms |
| Wikilink 反向链接索引全量扫描（1000 文档） | ≤ 3s（后台） |

### 15.5 可访问性

- 所有 NodeView 可通过键盘聚焦 + 操作
- 所有交互元素符合 WAI-ARIA（role, aria-label, aria-expanded）
- 高亮颜色对比度符合 WCAG AA（4.5:1）——对 default 色板验证
- 脚注 / citation 图标用 aria-hidden + 同位 label

### 15.6 容错

| 情形 | 预期 |
|---|---|
| 脚注引用不存在的 id | 编辑器警告 + 红色样式；不崩溃 |
| citation id 未注册 | 同上 |
| 公式语法错误 | NodeView 显示 KaTeX 错误 + 源码 |
| wikilink 目标被删除 | 未解析样式 + 反向链接索引同步更新 |
| emoji name 不存在 | 显示 `:name:` 原文本 |
| 非法 `==color:XYZ text==` | fallback 到 default 色 + warn 日志 |

---

## 16. 权威来源登记表

| 本 Spec 章节 | 引用问卷题号 / 决策编号 | 说明 |
|---|---|---|
| §1 扩展语法总览 | M-01 ~ M-08、EX-02、EX-10 | 决策映射 |
| §2 脚注 | M-02=D | 完整脚注（语法/渲染/悬停/跳转/导出） |
| §3 多色高亮 | M-03=D | 多色 + FloatingToolbar 颜色选择器 |
| §4 TOC 宏 | M-04=D、P-04=D、决策 J-09 | 正文内节点 + 与左栏同数据源 |
| §5 Details/Summary | M-05=D | 双语法 + Typora 正确渲染 |
| §6 Emoji | M-06=C | emojibase + 自动完成 + 常用收藏 |
| §7 数学公式 | M-08=D | FormulaBuilderPanel + 编号 + 交叉引用 + 并排预览 |
| §8 Wikilink | EX-02、L1-54 D、决策 H-03（跳转契约） | 自动完成 + 跳转 + 反向链接索引 |
| §9 引用来源 | EX-10、决策 H-02 三层引用 | Blockquote + source URL + factual/inferred/authored |
| §10 Callout | M-01=A | 延后 v2.2+，占位保留 |
| §11 Embed | M-07=A | 延后 + 渠道兼容性原则 |
| §12 Typora 集成 | 决策 C-07 Typora 策略、01-editor-ui | cursor-aware + NodeView 性能 |
| §13 Source 序列化 | 10-markdown-authority-spec §10、决策 C-23 | 完整保留 + CodeMirror 高亮 |
| §14 导出联动 | 15-export-publish-spec §3.1 fallback、10 §6 注册表 | 统一 preset.fallback + 降级审计 |
| §15 验收矩阵 | 10-markdown-authority-spec §11、R-02 | 9 × 5 × 4 + 5 平台差异 |

---

## 附录 A：注册表条目（示例）

```ts
// src/services/markdown-ext/registry.ts
import type { MarkdownExtension } from '@/services/markdown-ext/types';

export const REGISTRY: Record<string, MarkdownExtension> = {
  'inkforge.footnote': {
    id: 'inkforge.footnote',
    name: '脚注',
    syntax: '[^id] / [^id]: 内容',
    portability: 'inkforge-ext',
    fallback: {
      toStandardMd: 'preserve-as-text',
      toPlatform: {
        wechat: 'footnote-list',
        zhihu: 'preserve-html',
        redbook: 'inline-paren',
        html: 'preserve-html',
        markdown: 'preserve-text',
      },
    },
    roundTripTest: 'tests/roundtrip/footnote.spec.ts',
  },
  'inkforge.highlight': {
    id: 'inkforge.highlight',
    name: '多色高亮',
    syntax: '==text== / ==color:name text==',
    portability: 'inkforge-ext',
    fallback: {
      toStandardMd: 'inline-replacement',
      toPlatform: {
        wechat: 'inline-span-bg',
        zhihu: 'mark-tag',
        redbook: 'bg-block',
        html: 'mark-tag-class',
        markdown: 'mark-tag',
      },
    },
    roundTripTest: 'tests/roundtrip/highlight.spec.ts',
  },
  // ... 其他扩展
};
```

---

## 附录 B：扩展命令 ID 全量表

| 命令 ID | 绑定扩展 | 默认快捷键 |
|---|---|---|
| `editor.insert.footnote` | Footnote | `Ctrl/Cmd+Alt+F` |
| `editor.insert.highlight` | Highlight | `Ctrl/Cmd+Alt+H` |
| `editor.remove.highlight` | Highlight | `Ctrl/Cmd+Alt+Shift+H` |
| `editor.modify.highlight.color` | Highlight | — |
| `editor.insert.toc` | TOC | `Ctrl/Cmd+Alt+T` |
| `editor.modify.toc.depth` | TOC | — |
| `editor.modify.toc.numbered` | TOC | — |
| `editor.remove.toc` | TOC | — |
| `editor.insert.details` | Details | `Ctrl/Cmd+Alt+D` |
| `editor.modify.details.toggle` | Details | `Ctrl/Cmd+Enter`（节点内） |
| `editor.modify.details.summary` | Details | — |
| `editor.remove.details` | Details | — |
| `editor.insert.emoji` | Emoji | `Ctrl/Cmd+Alt+E` |
| `editor.insert.emoji.byName` | Emoji | — |
| `editor.insert.math.inline` | Math | `Ctrl/Cmd+Alt+M` |
| `editor.insert.math.block` | Math | `Ctrl/Cmd+Alt+Shift+M` |
| `editor.modify.math` | Math | 双击节点 |
| `editor.insert.math.ref` | Math | — |
| `editor.remove.math` | Math | — |
| `editor.insert.wikilink` | WikiLink | `Ctrl/Cmd+Alt+K` |
| `editor.modify.wikilink.target` | WikiLink | 双击节点 |
| `editor.modify.wikilink.alias` | WikiLink | — |
| `editor.remove.wikilink` | WikiLink | — |
| `editor.navigate.wikilink.to-target` | WikiLink | — |
| `editor.navigate.wikilink.to-backlinks` | WikiLink | — |
| `editor.insert.citation.inline` | Citation | `Ctrl/Cmd+Alt+C` |
| `editor.insert.citation.block` | Citation | — |
| `editor.modify.citation.source` | Citation | 双击徽章 |
| `editor.modify.citation.kind` | Citation | — |
| `editor.remove.citation` | Citation | — |
| `editor.navigate.citation.to-source` | Citation | — |

快捷键可在 Settings > Keyboard > Shortcuts 中重映射。默认值避免冲突。

---

## 附录 C：反模式与正确做法

| 反模式 | 正确做法 |
|---|---|
| 新扩展直接在 UI 组件里写 TipTap API | 所有修改必须经过 command registry（P3） |
| 未在注册表登记就新加 markdown-it 插件 | 先写 registry 条目 + roundTripTest，CI 守护 |
| 为了讨好微信在 TipTap 节点里加 `wechatSafe: true` | 平台特异性放 15 的 exporter preset；核心节点保持中立 |
| callout 虽然 v2.1 不做但注册表留空 | 注册占位（`inkforge.callout` 条目 + `fallback.toStandardMd: 'preserve-as-text'`） |
| emoji 用 `<img>` 默认（Unicode 更兼容） | 默认 Unicode；Settings 允许切换到图像模式 |
| wikilink 序列化时把 `[[title|alias]]` 重写为 `[alias](title)` | 绝不重写；保留原始形态（P5 不反向污染） |
| 脚注定义在序列化时自动挪到文档末尾 | 保留用户手动安排的位置 |
| 公式 FormulaBuilderPanel 关闭时清空编辑内容 | 关闭时将内容回写到文档节点（auto-save） |
| citation 的 `kind: authored` 用来标记 AI 产出 | 反了——AI 必须用 `factual` / `inferred`；`authored` 留给作者原创（10 §14.4） |
| Source 模式下斜杠命令不生效 | 必须生效（§13.3） |

---

## 文档状态

- 草案版本：v1（Phase 3 Batch B3 产出）
- 下一次更新触发条件：
  - Callout / Embed 解冻（v2.2+）→ §10 §11 升级为完整章节
  - 新增扩展语法 → 在决策映射（§1.1）、章节、附录 A 同步登记
  - FormulaBuilderPanel UX 迭代 → §7.3 更新
  - Wikilink 反向链接索引性能瓶颈 → §8.5 更新算法
- 冻结里程碑：Phase 3 开发启动前必须冻结

## 2026-04-30 P1-16 Compatible Baseline Implementation Note

This baseline implements the render/export vertical slice for Spec 16 without claiming the full v2.1 extension system is complete.

Completed in code:

- Added `src/services/markdown-ext/types.ts`, `registry.ts`, `render.ts`, and `index.ts` as the single extension registry and shared render transform entry.
- Connected `renderInkforgeMarkdownExtensions()` into `renderMarkdownWithOptionalEnhancements()` before final `marked.parse()`, so Workstation Preview and HTML export paths share the same derived rendering logic.
- Implemented safe derived rendering for footnotes, color highlights, first `[toc]` macro, `:::details` containers, shortcode-shaped emoji, unresolved wikilinks, block citation source metadata, and inline citations.
- Preserved Markdown authority: source Markdown is not rewritten and no article/source record is mutated by the renderer.
- Respected the project no-Emoji-icon constraint: `:name:` is rendered as a safe shortcode badge instead of a Unicode emoji glyph.
- Kept platform publish truthfulness: no fake direct API publishing, no fake resolved wikilinks, and no fake registered citation sources.

Verification completed:

- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm build` passed with only the existing large chunk warning.
- Browser validation on `127.0.0.1:5176/workstation` used a real Pinia article write to IndexedDB and then cleaned it up. Preview contained `.ink-toc`, `.ink-highlight--green`, `.ink-highlight--custom`, `.ink-footnote-ref`, `.ink-footnotes`, `.ink-details`, `.ink-details__content`, `.ink-wikilink--unresolved`, `.ink-citation--factual`, `.ink-cite--unresolved`, and `.ink-emoji--shortcode`.
- Export service validation confirmed `renderMarkdownWithOptionalEnhancements()` and `convertToNativeFormat(markdown, 'wechat')` both carry extension output for TOC, footnotes, and citation, with no Unicode emoji glyphs.

Still pending for full Spec 16:

- TipTap NodeViews, cursor-aware editing, slash commands, toolbar integrations, keyboard shortcuts, FormulaBuilderPanel, backlink index, citation manager/frontmatter source resolution, export downgrade audit table, full per-platform fallback matrix, and the full 315-case round-trip/E2E suite remain pending.
