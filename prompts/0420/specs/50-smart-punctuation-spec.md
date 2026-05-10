# 50-SPEC | 智能标点规范

> **文档层级**: Spec（技术规范）
> **适用任务**: 并入 T01（Typora 编辑器） + T07（Settings）
> **依赖 Spec**: `01-spec-editor-typora.md`、`07-spec-settings-tabs.md`（批次 E）、`49-editor-keymap-spec.md`
> **创建日期**: 2026-04-20
> **Roadmap §3 新增 Spec 小增强 #48**: 智能标点 + 中英文空格
> **目标读者**: T01 / T07 Implement Agent

---

## 目录

- 第 1 章 智能标点规则表（E-02=D + 每条独立开关）
- 第 2 章 中英文间自动空格（PanguSpacing）
- 第 3 章 自动列表 / 自动引用
- 第 4 章 输入法兼容（IME 合成期规则）
- 第 5 章 Settings UI（Editor Tab 开关矩阵）
- 第 6 章 与 Source 模式的关系
- 第 7 章 验收矩阵
- 第 8 章 权威来源登记表

---

# 第 1 章 智能标点规则表（E-02=D + 每条独立开关）

## 1.1 决策依据

- **E-02=D**（智能标点全家桶 + 每条独立可关）
- **E-02 用户补充**："中英文间默认添加空格"（新增一条规则，pangu.js 级别）
- **E-08 C**（不做自动链接检测；解决 L2 附录 A.3 矛盾）

## 1.2 规则总表

| # | 规则名 | 触发 | 默认启用 | 说明 |
|---|--------|------|---------|------|
| 1 | 直引号 → 弯引号 | 输入 `"` 或 `'` | ✓ | `"text"` → `"text"`；`'s` → `'s` |
| 2 | 连字符 → 破折号 | 输入连续 `--` | ✓ | `--` → `—`（em dash） |
| 3 | 三连点 → 省略号 | 输入连续 `...` | ✓ | `...` → `…` |
| 4 | 双连字符 → 连字符 | 输入 `- -`（中间空格） | ✗ | 保守，默认关闭 |
| 5 | 箭头 → 符号 | 输入 `->` / `<-` / `=>` | ✗ | `->` → `→`；默认关闭（代码中易误触） |
| 6 | 分数 → 分数符号 | 输入 `1/2` / `1/4` / `3/4` | ✗ | `1/2` → `½`；默认关闭（代码中易误触） |
| 7 | 乘号 `x` → `×` | 输入 `2x3` | ✗ | 默认关闭（极易误触） |
| 8 | 版权符 | 输入 `(c)` / `(r)` / `(tm)` | ✓ | `(c)` → `©`；`(r)` → `®`；`(tm)` → `™` |
| 9 | 度数 | 输入 `45 deg` | ✗ | 默认关闭 |
| 10 | 中英文自动空格（PanguSpacing） | 中英混排时 | ✓ | 详见第 2 章 |
| 11 | 自动列表 | 行首输入 `- ` / `1. ` / `* ` | ✓ | 详见第 3 章 |
| 12 | 自动引用 | 行首输入 `> ` | ✓ | 详见第 3 章 |
| 13 | 自动代码块 | 输入 ` ``` ` + 空格 / Enter | ✓ | 行首 ```` ``` ```` + Enter → 创建代码块 |
| 14 | 自动标题 | 行首输入 `# ` / `## ` / ... | ✓ | `# ` → h1；继承 Typora |
| 15 | **自动链接检测** | 输入 URL 后按空格 | ✗ | **默认关闭**（E-08 C 裁决） |

## 1.3 规则字段定义

每条规则在 Settings 中按以下字段定义：

```ts
// src/stores/settings.ts
export interface SmartPunctuationRule {
  id: string
  enabled: boolean
  description: string       // UI 显示的规则说明
  previewBefore: string     // 预览：输入字符
  previewAfter: string      // 预览：转换结果
  contextScope: 'typora' | 'source' | 'both' // 哪些模式触发
  defaultEnabled: boolean
}

export interface SmartPunctuationSettings {
  masterEnabled: boolean  // 总开关
  rules: Record<string, boolean> // { 'rule-id': enabled }
}
```

## 1.4 规则匹配与应用

### 1.4.1 触发时机

每次 Transaction apply 后：

1. 检查当前 Transaction 是否插入字符
2. 以插入点为中心扫描 ±N 字符（N 取决于规则）
3. 匹配规则 → 生成替换 Transaction
4. 应用替换（作为新的 Transaction，独立 undo 组 §3 of Spec 49）

### 1.4.2 实现位置

`src/editor/extensions/SmartPunctuation.ts`

```ts
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export const SmartPunctuation = Extension.create({
  name: 'smartPunctuation',

  addOptions() {
    return {
      rules: DEFAULT_RULES,
      userOverrides: {} as Record<string, boolean>,
      masterEnabled: true,
      disabledInSource: true  // Source 模式不触发
    }
  },

  addProseMirrorPlugins() {
    const ext = this
    return [
      new Plugin({
        key: new PluginKey('smartPunctuation'),
        appendTransaction: (transactions, oldState, newState) => {
          if (!ext.options.masterEnabled) return null
          if (getCurrentMode() === 'source') return null
          if (isComposing()) return null // IME 合成期不触发

          const tr = transactions[transactions.length - 1]
          if (!tr || !tr.docChanged) return null

          // 仅处理文本输入 Transaction
          if (tr.getMeta('paste')) return null
          if (tr.getMeta('undo') || tr.getMeta('redo')) return null
          if (tr.getMeta('smart-punctuation')) return null // 避免递归

          // 扫描并应用规则
          const replacement = applyRules(
            newState,
            ext.options.rules,
            ext.options.userOverrides
          )

          if (replacement) {
            const newTr = newState.tr
            newTr.setMeta('smart-punctuation', true)
            newTr.setMeta('undoGroup', 'smart-punct')
            newTr.replaceWith(replacement.from, replacement.to, replacement.content)
            return newTr
          }

          return null
        }
      })
    ]
  }
})
```

## 1.5 规则实现细节

### 1.5.1 直引号 → 弯引号

```ts
const curlyQuoteRule: Rule = {
  id: 'curly-quotes',
  match: (text: string, pos: number): Match | null => {
    const char = text[pos - 1]
    if (char === '"') {
      // 判定前后文是否为开引号 / 关引号
      const prev = text[pos - 2] || ' '
      const isOpening = /[\s\p{P}\n]/u.test(prev)
      return {
        from: pos - 1,
        to: pos,
        replace: isOpening ? '“' : '”'
      }
    }
    if (char === "'") {
      const prev = text[pos - 2] || ' '
      const isOpening = /[\s\p{P}\n]/u.test(prev)
      return {
        from: pos - 1,
        to: pos,
        replace: isOpening ? '‘' : '’'
      }
    }
    return null
  }
}
```

### 1.5.2 `--` → `—`

```ts
const emDashRule: Rule = {
  id: 'em-dash',
  match: (text, pos) => {
    if (text.slice(pos - 2, pos) === '--' && text[pos - 3] !== '-') {
      return { from: pos - 2, to: pos, replace: '—' }
    }
    return null
  }
}
```

### 1.5.3 `...` → `…`

```ts
const ellipsisRule: Rule = {
  id: 'ellipsis',
  match: (text, pos) => {
    if (text.slice(pos - 3, pos) === '...' && text[pos - 4] !== '.') {
      return { from: pos - 3, to: pos, replace: '…' }
    }
    return null
  }
}
```

### 1.5.4 版权符号

```ts
const copyrightRule: Rule = {
  id: 'copyright',
  match: (text, pos) => {
    const last4 = text.slice(pos - 4, pos).toLowerCase()
    const last3 = text.slice(pos - 3, pos).toLowerCase()
    if (last4 === '(tm)') return { from: pos - 4, to: pos, replace: '™' }
    if (last3 === '(c)')  return { from: pos - 3, to: pos, replace: '©' }
    if (last3 === '(r)')  return { from: pos - 3, to: pos, replace: '®' }
    return null
  }
}
```

## 1.6 规则冲突避让

- 代码块 / 行内代码 / 数学公式内**不触发**任何智能标点
- 链接 URL 内不触发
- 通过 `$from.marks().some(m => ['code', 'link', 'math'].includes(m.type.name))` 判定

## 1.7 可逆性

- 智能标点替换生成独立 undo 组
- Ctrl+Z 可撤销替换，保留用户原始字符
- 连续 Ctrl+Z：第一次撤销替换，第二次撤销用户输入

---

# 第 2 章 中英文间自动空格（PanguSpacing）

## 2.1 决策依据

- **E-02 用户补充**："中英文间默认添加空格"
- 参考 [pangu.js](https://github.com/vinta/pangu.js) 算法

## 2.2 规则定义

**PanguSpacing**: 在中文字符与英文 / 数字字符之间自动插入半角空格。

### 2.2.1 字符类别

| 类别 | Unicode 范围 | 示例 |
|------|-------------|------|
| CJK（中日韩字符） | `\u{4E00}-\u{9FFF}`、`\u{3040}-\u{309F}`（平假名）、`\u{30A0}-\u{30FF}`（片假名）、`\u{AC00}-\u{D7AF}`（韩文） | 中文汉字、中日韩标点 |
| Latin + 数字 | `[a-zA-Z0-9]` | 英文 / 数字 |
| 其他 | 空格 / 标点 / 符号 | 不触发 |

### 2.2.2 触发场景

```
情形 A: CJK + 英文 / 数字
  "今天是2026年"  → "今天是 2026 年"
  "使用Vue开发"  → "使用 Vue 开发"

情形 B: 英文 / 数字 + CJK
  "Vue3组件"  → "Vue3 组件"（数字与汉字之间）
  "API接口"   → "API 接口"

情形 C: 不触发
  "你好！" （CJK 与标点）
  "hello world"（纯英文）
  "2026年"（数字与紧邻的 CJK 单字不触发？→ 触发，见情形 B）
```

## 2.3 实现算法

```ts
// src/editor/smart-punctuation/pangu.ts
const CJK = '\\u{4E00}-\\u{9FFF}\\u{3040}-\\u{309F}\\u{30A0}-\\u{30FF}\\u{AC00}-\\u{D7AF}'
const ALPHA_NUM = 'a-zA-Z0-9'

const CJK_BEFORE_ALPHA = new RegExp(`([${CJK}])([${ALPHA_NUM}])`, 'gu')
const ALPHA_BEFORE_CJK = new RegExp(`([${ALPHA_NUM}])([${CJK}])`, 'gu')

export function spacing(text: string): string {
  return text
    .replace(CJK_BEFORE_ALPHA, '$1 $2')
    .replace(ALPHA_BEFORE_CJK, '$1 $2')
}
```

## 2.4 触发时机

仅在 Typora 模式下；Source 模式不触发（§6）。

触发条件：

- **实时触发**：每次插入字符后，扫描插入点 ±5 字符范围
- **批量触发**：粘贴清洗时（白名单）应用一次

### 2.4.1 避免重复插入

如果 CJK 与英文之间**已经有空格**，不再添加：

```ts
const CJK_ALPHA_NO_SPACE = new RegExp(`([${CJK}])(?! )([${ALPHA_NUM}])`, 'gu')
// 等价：CJK 后无空格再接 alpha-num → 插入空格
```

### 2.4.2 不触发场景

- 在代码块 / 行内代码内（见 §1.6）
- 在数学公式内
- 在链接 URL 内
- 在 frontmatter YAML 区域内

## 2.5 与 IME 的协作

- IME 合成期（`isComposing=true`）不触发（§4）
- 合成结束（`compositionend`）后统一应用一次

## 2.6 可逆性

- PanguSpacing 替换生成独立 undo 组 `undoGroup: 'pangu'`
- Ctrl+Z 撤销：先回退到无空格状态，再 Ctrl+Z 回退到用户输入前

## 2.7 性能约束

- 单次扫描 ±5 字符范围
- 大文档批量 PanguSpacing（如粘贴或 frontmatter 同步）使用 Web Worker
- 单次延迟 ≤ 2ms

## 2.8 开关

```ts
smartPunctuation.rules.pangu-spacing = true // 默认启用
```

---

# 第 3 章 自动列表 / 自动引用

## 3.1 自动列表

### 3.1.1 触发

在新段落行首输入以下序列 + 空格：

| 输入 | 结果 |
|------|------|
| `- ` | 无序列表 `- ` |
| `* ` | 无序列表（等价 `- `，自动规范为 `-`） |
| `+ ` | 无序列表（等价 `- `） |
| `1. ` | 有序列表 `1. ` |
| `1) ` | 有序列表（等价 `1. `） |
| `- [ ] ` | 任务列表未完成 |
| `- [x] ` | 任务列表已完成 |

### 3.1.2 实现

```ts
const autoListRule: Rule = {
  id: 'auto-list',
  match: (text, pos, $from) => {
    // 仅在段落行首触发
    if ($from.parent.type.name !== 'paragraph') return null
    if ($from.parentOffset !== pos - positionOfParagraphStart($from)) return null

    const input = text.slice(pos - 10, pos)

    if (/^[-*+] $/.test(input.slice(-2))) {
      return { action: 'create-bullet-list', length: 2 }
    }
    if (/^\d+[.)] $/.test(input)) {
      return { action: 'create-ordered-list', length: input.length }
    }
    if (/^[-*+] \[[ x]\] $/.test(input.slice(-6))) {
      return { action: 'create-task-list', length: 6, checked: input.includes('[x]') }
    }
    return null
  }
}
```

### 3.1.3 取消自动列表

用户不想触发自动列表时：按 Ctrl+Z 立即撤销自动转换，保留原文 `- `。

## 3.2 自动引用

### 3.2.1 触发

段落行首输入 `> ` → 转为引用块。

### 3.2.2 多级嵌套

`> > ` → 二级嵌套引用。

### 3.2.3 实现

```ts
const autoBlockquoteRule: Rule = {
  id: 'auto-blockquote',
  match: (text, pos, $from) => {
    if ($from.parent.type.name !== 'paragraph') return null
    const input = text.slice(pos - 10, pos)
    const match = /^(> )+$/.exec(input)
    if (match) {
      const level = match[0].length / 2
      return { action: 'create-blockquote', level, length: match[0].length }
    }
    return null
  }
}
```

## 3.3 自动代码块

段落行首输入 ` ``` ` + Enter → 创建代码块。

如果输入为 ` ```ts ` + Enter → 创建 TypeScript 代码块。

```ts
const autoCodeBlockRule: Rule = {
  id: 'auto-codeblock',
  match: (text, pos, $from) => {
    if ($from.parent.type.name !== 'paragraph') return null
    const match = /^```(\w*)$/.exec(text.slice(positionOfParagraphStart($from), pos))
    if (match && /(\n|\r)/.test(text[pos])) {
      return { action: 'create-codeblock', lang: match[1] || 'text', length: match[0].length + 1 }
    }
    return null
  }
}
```

## 3.4 自动标题

段落行首输入 `# `~`###### ` → 转为对应标题。

```ts
const autoHeadingRule: Rule = {
  id: 'auto-heading',
  match: (text, pos, $from) => {
    if ($from.parent.type.name !== 'paragraph') return null
    const input = text.slice(positionOfParagraphStart($from), pos)
    const match = /^(#{1,6}) $/.exec(input)
    if (match) {
      return { action: 'create-heading', level: match[1].length, length: match[0].length }
    }
    return null
  }
}
```

## 3.5 与 Typora 一致性

这些"自动语法转换"是 Typora 的标志性能力。InkForge v2.1 完全继承 Typora 行为：

| Typora 行为 | InkForge v2.1 |
|------------|--------------|
| `- ` 自动无序列表 | ✓ |
| `1. ` 自动有序列表 | ✓ |
| `> ` 自动引用 | ✓ |
| ```` ```lang ``` ```` 自动代码块 | ✓ |
| `# ` 自动标题 | ✓ |
| `---` 自动分隔线 | ✓（行首输入 `---` + Enter） |

---

# 第 4 章 输入法兼容（IME 合成期规则）

## 4.1 IME 合成期识别

```ts
// src/editor/smart-punctuation/ime.ts
let isComposing = false

export function setupIMEObservers(editor: Editor) {
  editor.view.dom.addEventListener('compositionstart', () => { isComposing = true })
  editor.view.dom.addEventListener('compositionend', () => {
    isComposing = false
    // 合成结束后补跑一次智能标点
    scheduleSmartPunctuation(editor)
  })
}

export function isIMEComposing(): boolean {
  return isComposing
}
```

## 4.2 合成期规则

### 4.2.1 规则

- **合成期内**: 所有智能标点规则**不触发**
- **合成结束后**: 在 `compositionend` 事件触发时统一应用一次

### 4.2.2 理由

- 合成期内字符并非"最终输入"，智能标点可能误触发并干扰 IME
- 合成期内触发替换可能导致 ProseMirror selection 错乱
- 参考 T01-16=C（不做特殊冻结）——但智能标点仍需主动避让

## 4.3 中文输入场景验收

| 场景 | 预期 |
|------|------|
| 中文输入 "你好 hello" | 合成期内不触发；合成结束后自动加空格 "你好 hello" → "你好 hello"（已有空格不再加） |
| 中文输入 "中国2026" | 合成结束后 PanguSpacing 应用 → "中国 2026" |
| 中文输入 "我需要 API" | 合成期内输入 "我需要"，结束后 PanguSpacing → "我需要" + 空格 + "API" |
| 中文输入 "用 Vue3" + 中文标点 | 正常 |

## 4.4 五笔 / 其他 IME 兼容

- 与 Pinyin 同逻辑
- 候选词切换期间（`compositionupdate`）不触发
- 强制等待 `compositionend`

---

# 第 5 章 Settings UI（Editor Tab 开关矩阵）

## 5.1 Settings 位置

Settings → Editor Tab → "智能标点" 分组

## 5.2 UI 设计

```
┌────────────────────────────────────────────────────────┐
│ 智能标点                              [ 总开关 ]  ◉    │
├────────────────────────────────────────────────────────┤
│                                                        │
│ ▸ 基础规则                                             │
│   ◉ 直引号 → 弯引号                      " → "        │
│   ◉ 连字符 → 破折号                      -- → —       │
│   ◉ 三连点 → 省略号                      ... → …      │
│   ◉ 版权符号                              (c) → ©      │
│                                                        │
│ ▸ 进阶规则                                             │
│   ○ 双连字符规则                                       │
│   ○ 箭头符号                              -> → →      │
│   ○ 分数符号                              1/2 → ½      │
│   ○ 乘号替换                              2x3 → 2×3    │
│                                                        │
│ ▸ 中英文排版                                           │
│   ◉ 中英文间自动空格（PanguSpacing）                  │
│                                                        │
│ ▸ 自动语法                                             │
│   ◉ 自动列表                              "- " → list  │
│   ◉ 自动引用                              "> " → quote │
│   ◉ 自动代码块                            ```ts → cb   │
│   ◉ 自动标题                              "# " → h1    │
│                                                        │
│ ▸ 链接                                                 │
│   ○ 自动链接检测（实验性）                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 5.3 Settings 数据结构

```ts
// src/stores/settings.ts
export interface SmartPunctuationSettings {
  masterEnabled: boolean
  rules: {
    'curly-quotes': boolean       // 默认 true
    'em-dash': boolean            // 默认 true
    'ellipsis': boolean           // 默认 true
    'copyright': boolean          // 默认 true
    'double-hyphen': boolean      // 默认 false
    'arrow': boolean              // 默认 false
    'fraction': boolean           // 默认 false
    'multiplication': boolean     // 默认 false
    'degree': boolean             // 默认 false
    'pangu-spacing': boolean      // 默认 true
    'auto-list': boolean          // 默认 true
    'auto-blockquote': boolean    // 默认 true
    'auto-codeblock': boolean     // 默认 true
    'auto-heading': boolean       // 默认 true
    'auto-link': boolean          // 默认 false（E-08 C 裁决）
  }
}
```

## 5.4 Settings 即时持久化

- 修改开关 → 立即写入 IndexedDB
- 编辑器立即生效（通过 Pinia reactivity）
- 详见 Spec 07 T07-06=A（即时持久化）

## 5.5 Settings 导出 / 导入

- 智能标点开关随账户导出（T07-07=B）
- 导入时做 schema 校验（与 Spec 41 SettingsMigration 联动）

## 5.6 重置

- 单项重置：每条规则旁有"恢复默认"按钮
- 分组重置：每个分组顶部有"重置本组"
- 全部重置：Settings Tab 底部"重置为默认"
- 详见 Spec 07 T07-12=C+补充（三级重置）

---

# 第 6 章 与 Source 模式的关系（Source 不触发智能标点）

## 6.1 规则

**Source 模式下所有智能标点规则一律不触发**。

### 6.1.1 理由

- Source 模式是对 Markdown 原始字符的直接编辑
- 智能标点会破坏原始文本意图（例如把 `--` 改成 `—` 使 Markdown 不再标准）
- Source 模式用户明确需要"看到并编辑"原始字符

### 6.1.2 实现

```ts
// src/editor/extensions/SmartPunctuation.ts（片段）
appendTransaction: (transactions, oldState, newState) => {
  if (getCurrentMode() === 'source') return null // §6
  // ...
}
```

### 6.1.3 Source 模式 vue-codemirror 也不触发

Spec 01 §8.6 明确："Source 模式中 PanguSpacing / 智能标点 / 自动列表 / 自动引用 一律禁用"。

## 6.2 Preview 模式

Preview 模式为只读，不涉及输入，自然不触发。

## 6.3 Typora ↔ Source 切换时的状态

- Typora 模式已应用的智能标点结果（`—` / `©` 等）写入 Markdown
- 切到 Source 模式看到的是已转换后的字符
- Source 模式改回 `--` 并切回 Typora → 再次触发转换

## 6.4 模式切换一致性测试

`tests/e2e/smart-punct/mode-consistency.spec.ts`：

1. Typora 输入 `test--case` → 应用 em-dash → `test—case`
2. Ctrl+\ 切到 Source → 显示 `test—case`（已是转换后）
3. Source 修改为 `test--case` → Ctrl+\ 切 Typora → 再次应用 em-dash → `test—case`

---

# 第 7 章 验收矩阵

## 7.1 维度

- **规则正向**: 15 条规则每条有触发样本
- **规则禁用**: 关闭开关后不触发
- **模式隔离**: Source 模式不触发
- **IME 协作**: 合成期不触发 / 合成结束触发
- **上下文避让**: 代码块 / 数学 / 链接内不触发
- **可逆**: Ctrl+Z 可撤销

## 7.2 用例表

### 7.2.1 规则触发

| AC ID | 规则 | 输入 | 预期 |
|-------|------|------|------|
| AC-SP-01 | 弯引号开 | 开 "hello" | `"hello"` |
| AC-SP-02 | 弯引号关（单引号） | I'm | `I'm`（转 `'`） |
| AC-SP-03 | em-dash | `foo--bar` | `foo—bar` |
| AC-SP-04 | 省略号 | `…` | 当输入第 3 个 `.` 时转 `…` |
| AC-SP-05 | 版权 | `(c)` | `©` |
| AC-SP-06 | 商标 | `(tm)` | `™` |
| AC-SP-07 | 注册商标 | `(r)` | `®` |
| AC-SP-08 | 箭头（默认关） | `->` | `->`（不转换） |
| AC-SP-09 | 箭头（开） | `->` | `→` |
| AC-SP-10 | 自动链接（默认关） | `https://example.com ` | 不转 |

### 7.2.2 PanguSpacing

| AC ID | 场景 | 输入 | 预期 |
|-------|------|------|------|
| AC-PANGU-01 | CJK + 英文 | `使用Vue` | `使用 Vue` |
| AC-PANGU-02 | 英文 + CJK | `Vue组件` | `Vue 组件` |
| AC-PANGU-03 | CJK + 数字 | `今天2026` | `今天 2026` |
| AC-PANGU-04 | 数字 + CJK | `2026年` | `2026 年` |
| AC-PANGU-05 | 已有空格不重复 | `使用 Vue` | 不变 |
| AC-PANGU-06 | CJK + 标点 | `你好！` | 不变 |
| AC-PANGU-07 | 纯英文 | `hello world` | 不变 |
| AC-PANGU-08 | 代码块内 | 代码块输入 `使用Vue` | 不变 |
| AC-PANGU-09 | 行内代码内 | `` `Vue组件` `` | 不变 |

### 7.2.3 自动语法

| AC ID | 场景 | 输入 | 预期 |
|-------|------|------|------|
| AC-AUTO-01 | 自动无序列表 | `- ` at line start | 变为列表 |
| AC-AUTO-02 | `*` 自动列表 | `* ` | 变为无序列表（规范为 `-`） |
| AC-AUTO-03 | 自动有序 | `1. ` | 变为有序列表 |
| AC-AUTO-04 | 自动任务列表 | `- [ ] ` | 变为任务列表项 |
| AC-AUTO-05 | 自动标题 | `## ` | 变为 h2 |
| AC-AUTO-06 | 自动引用 | `> ` | 变为 blockquote |
| AC-AUTO-07 | 自动引用嵌套 | `> > ` | 二级引用 |
| AC-AUTO-08 | 自动代码块 | ```` ```ts ```` + Enter | 创建 TS 代码块 |
| AC-AUTO-09 | 行中不触发 | 在行中（非行首）输入 `- ` | 不触发 |

### 7.2.4 IME 协作

| AC ID | 场景 | 操作 | 预期 |
|-------|------|------|------|
| AC-IME-01 | 合成期不触发 | 中文输入 "你好"（期间输入法显示 "ni hao"） | 合成期内不触发 PanguSpacing |
| AC-IME-02 | 合成结束应用 | 合成结束为 "你好 hello" | 补上空格（如无空格） |
| AC-IME-03 | 候选词切换 | 在候选词状态下 | 不触发 |
| AC-IME-04 | 中文标点智能化 | 中文输入法的 `""` | 按 IME 处理，不额外转换 |

### 7.2.5 Source 模式

| AC ID | 场景 | 操作 | 预期 |
|-------|------|------|------|
| AC-SRC-01 | Source em-dash 不触发 | Source 输入 `foo--bar` | 保留 `--` |
| AC-SRC-02 | Source PanguSpacing 不触发 | Source 输入 `使用Vue` | 保留无空格 |
| AC-SRC-03 | Source 自动列表不触发 | Source 输入 `- ` | 保留文本 `- ` 不变为列表 |
| AC-SRC-04 | Source 切 Typora 重触发 | Source `使用Vue` → Ctrl+\ Typora | 切换后应用 PanguSpacing |

### 7.2.6 上下文避让

| AC ID | 场景 | 操作 | 预期 |
|-------|------|------|------|
| AC-CTX-01 | 代码块内不触发 | 代码块输入 `"hello"` | 不转弯引号 |
| AC-CTX-02 | 行内代码内不触发 | `` `使用Vue` `` | 不加空格 |
| AC-CTX-03 | 数学公式内不触发 | `$foo--bar$` | 不转 em-dash |
| AC-CTX-04 | 链接 URL 内不触发 | `[text](http://example.com/--foo)` | URL 保留 `--` |
| AC-CTX-05 | Frontmatter 内不触发 | YAML 区域输入 | 不触发 |

### 7.2.7 可逆性

| AC ID | 场景 | 操作 | 预期 |
|-------|------|------|------|
| AC-REV-01 | 撤销弯引号 | 输入 `"hello"` 应用转换 → Ctrl+Z | 回到 `"hello"` |
| AC-REV-02 | 撤销 em-dash | 输入 `--` → `—` → Ctrl+Z | 回到 `--` |
| AC-REV-03 | 撤销自动列表 | 输入 `- ` → 列表 → Ctrl+Z | 回到 `- ` 纯文本 |
| AC-REV-04 | 撤销 PanguSpacing | 输入 `使用Vue` → `使用 Vue` → Ctrl+Z | 回到 `使用Vue` |

### 7.2.8 Settings

| AC ID | 场景 | 操作 | 预期 |
|-------|------|------|------|
| AC-SET-01 | 关闭总开关 | Settings 总开关 off | 所有规则不触发 |
| AC-SET-02 | 关闭单个规则 | 关闭 em-dash | em-dash 不触发，其他仍触发 |
| AC-SET-03 | Settings 即时生效 | 修改后立即键入 | 立即反映 |
| AC-SET-04 | 重置单项 | 点击"恢复默认" | 恢复对应规则的默认值 |
| AC-SET-05 | 重置本组 | 点击"重置本组" | 本组所有规则恢复默认 |
| AC-SET-06 | 导出 / 导入 | 导出 JSON → 修改 → 导入 | 开关恢复 |

## 7.3 性能

| AC ID | 场景 | 门槛 |
|-------|------|------|
| AC-PERF-01 | 单次规则扫描 | ≤ 2ms |
| AC-PERF-02 | PanguSpacing 单次 | ≤ 2ms |
| AC-PERF-03 | 粘贴清洗 + PanguSpacing | ≤ 50ms（10KB 文本） |
| AC-PERF-04 | 无规则命中时无开销 | 无明显输入延迟（p99 ≤ 16ms 总） |

## 7.4 Artifacts

```
artifacts/T01-smartpunct/
├── acceptance-matrix.md
├── screenshots/
├── videos/
│   ├── pangu-spacing.mp4
│   └── ime-compatibility.mp4 (30min 中文写作)
├── logs/
│   └── rule-trigger-trace.json
└── performance/
    └── scan-latency.json
```

---

# 第 8 章 权威来源登记表

| 章节 | 内容 | 权威来源 | 决策 ID |
|------|------|---------|---------|
| §1.1~§1.7 | 智能标点规则表 | doc | E-02=D |
| §1.2 行 15 | 自动链接默认关 | doc | E-08=C（裁决 L2 附录 A.3） |
| §2.1~§2.8 | 中英文自动空格 | doc | E-02 用户补充"中英文间默认添加空格"（pangu.js 级） |
| §3.1~§3.5 | 自动列表 / 引用 / 代码块 / 标题 | doc | E-02 D（Typora 继承） |
| §4.1~§4.4 | IME 合成期规则 | doc | T01-16=C + 本 Spec 加强（智能标点必须避让） |
| §5.1~§5.6 | Settings UI | doc | E-02 D 每条独立开关 / T07-06 A（即时持久化） |
| §6.1~§6.4 | Source 模式不触发 | doc | T01-05 B / T01-06 A / 本 Spec 决策 |
| §7.1~§7.4 | 验收矩阵 | doc | R-20 / X-12 D |

## 8.1 Spec 间契约

| 本 Spec 提供 | 消费方 |
|-------------|--------|
| `SmartPunctuation` 扩展 | Spec 01 Typora 编辑器（通过 `editor.extensions`） |
| `pangu.ts` 工具函数 | Spec 01 粘贴清洗（§11）白名单管线复用 |
| Settings 规则字段 | Spec 07 Settings Editor Tab / Spec 41 SettingsMigration |

## 8.2 冲突裁决

| 冲突 | 裁决 | 参考 |
|------|------|------|
| E-02 D（含自动链接）vs E-08 C（不做自动链接） | 以 E-08 C 为准；自动链接默认关闭 | L2 附录 A.3 |
| T01-16 C（IME 不冻结）vs 智能标点避让 | 智能标点对 IME 合成期主动避让；Decoration 层面仍按 T01-16 | 本 Spec §4 |

## 8.3 向后兼容

- v2.0 无智能标点功能；升级后默认启用基础规则（弯引号 / em-dash / 省略号 / 版权 / PanguSpacing / 自动语法）
- 用户可在 Settings 逐项关闭

---

# 附录 A | 禁止事项（反例）

- ❌ 在 Source 模式触发 PanguSpacing（违反 §6）
- ❌ 在 IME 合成期触发智能标点（违反 §4）
- ❌ 在代码块 / 行内代码内触发智能标点（违反 §1.6）
- ❌ 默认启用自动链接检测（违反 E-08 C 裁决）
- ❌ 智能标点替换合并到用户输入 undo 组（违反 §1.7 可逆性）
- ❌ 使用同步阻塞的全文扫描（违反 §1.5 / NFR 性能）
- ❌ 链接 URL 内触发 PanguSpacing（违反 §2.4.2）

---

# 附录 B | 图标使用

| 功能 | 图标 |
|------|------|
| 智能标点总开关 | `lucide:type` |
| 弯引号 | `lucide:quote` |
| em-dash | `lucide:minus` |
| 中英文空格（PanguSpacing） | `lucide:space` |
| 自动列表 | `lucide:list` |
| 自动引用 | `lucide:text-quote` |
| 自动代码块 | `lucide:code-2` |
| 自动标题 | `lucide:heading-1` |
| 自动链接 | `lucide:link` |

---

（本 Spec 完）
