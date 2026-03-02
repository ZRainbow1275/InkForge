# InkForge Studio v5.0 - 完整开发规格文档 (SPEC)

> **版本**: v1.0 | **日期**: 2026-03-01
> **状态**: 执行中
> **设计基准**: `prototype/inkforge_workstation.html` (Ethereal Constructivism)

---

## 第一部分：设计系统 (Design System)

### 1.1 设计哲学

**Ethereal Constructivism (空灵构成主义)**

公式: `InkForge = (结构张力 x 几何秩序) ^ 东方气韵`

| 维度 | 灵感来源 | 实现手法 |
|------|---------|---------|
| 结构 | El Lissitzky | 非对称网格、悬浮层级、视觉张力 |
| 秩序 | Josef Muller-Brockmann | 极度克制排版、Type is UI |
| 气韵 | 原研哉 | 纸张物理性、呼吸感、光影层级 |

### 1.2 设计令牌 (Design Tokens)

#### 色彩系统

```css
:root {
  /* 材质 (Materiality) */
  --bg-rice-paper: #FAFBFC;
  --bg-surface: #FFFFFF;
  --bg-frosted: rgba(255, 255, 255, 0.85);
  --bg-elevated: rgba(255, 255, 255, 0.95);

  /* 构成主义色彩 */
  --accent-primary: #D32F2F;
  --accent-primary-light: #FFEBEE;
  --accent-secondary: #1565C0;
  --accent-secondary-light: #E3F2FD;

  /* 中性色 */
  --text-primary: #263238;
  --text-secondary: #607D8B;
  --text-muted: #90A4AE;
  --border: #ECEFF1;
  --border-light: #F5F5F5;

  /* 语义色 */
  --success: #2E7D32;
  --warning: #F57C00;
  --error: #C62828;
}
```

#### 间距节奏 (8px Grid)

| 级别 | 值 | 应用场景 |
|------|-----|---------|
| micro | 4px | 图标与文字间距 |
| small | 8px | 按钮内边距、列表项 |
| medium | 16px | 卡片内边距、段落间距 |
| large | 32px | 区块分隔 |
| macro | 64px | 编辑器纸张padding |

#### 阴影层级

```css
--shadow-soft: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
--shadow-medium: 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
--shadow-float: 0 8px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
```

#### 动效参数

| 类型 | 缓动函数 | 时长 | 用途 |
|------|---------|------|------|
| 面板展开 | cubic-bezier(0.16, 1, 0.3, 1) | 300ms | 侧边栏 |
| 弹性弹出 | cubic-bezier(0.34, 1.56, 0.64, 1) | 200ms | 浮动菜单 |
| 平滑过渡 | cubic-bezier(0.4, 0, 0.2, 1) | 150ms | 微交互 |

#### 字体栈

| 用途 | 字体 | 字重 |
|------|------|------|
| 界面UI | Inter | 300-700 |
| 文章正文 | Noto Serif SC | 400-700 |
| 代码/等宽 | JetBrains Mono | 400-500 |

---

## 第二部分：四栏布局架构

### 2.1 整体结构

```
+--------+---------------------------+----------+-----------+
| Header (52px, full width)                                  |
+--------+---------------------------+----------+-----------+
| Manager| Editor Area               | Stage    | Inspector |
| 240px  | flex: 1                   | 360px    | 280px     |
| 可折叠  | 居中纸张 680px max        | 可折叠    | 可折叠     |
+--------+---------------------------+----------+-----------+
| Status Bar (26px, full width)                              |
+--------+---------------------------+----------+-----------+
```

### 2.2 Header 规格

| 属性 | 值 |
|------|-----|
| 高度 | 52px |
| 背景 | var(--bg-surface) + backdrop-filter: blur(12px) |
| 边框 | 底部 1px solid var(--border) |

**组成元素**:
1. **品牌区**: Logo方块(28x28px, 红色圆角6px) + "InkForge" 文字(14px/600)
2. **标题输入**: 可编辑标题(14px/500, 280px min-width, hover/focus态变化)
3. **保存状态**: Pill样式指示器(saved绿/#E8F5E9, unsaved橙/#FFF3E0)
4. **操作按钮组**: 34x34px icon-btn (hover: scale(1.05))
5. **发布按钮**: 红色CTA(8px 18px padding, 圆角8px, 阴影)

### 2.3 Manager Panel 规格

| 属性 | 值 |
|------|-----|
| 宽度 | 240px (折叠: 0px) |
| 背景 | var(--bg-frosted) + backdrop-filter: blur(20px) |
| 边框 | 右侧 1px solid var(--border) |
| 过渡 | width 300ms var(--ease-panel) |

**结构**:
- Panel Header: 标题(11px uppercase) + 操作按钮
- Manager Tabs: 文件(Files) / 版本(Versions)
- Panel Content: 滚动区域
  - Files Tab: section-label分组(最近/分类/草稿箱/资讯源) + file-item列表
  - Versions Tab: version-timeline(indicator圆点 + label + 时间 + diff统计)

**文件项**: 8px 10px padding, 圆角6px, hover态, active态(红色浅底)
**版本项**: 左侧timeline圆点(10px, current态有光晕), 标签+时间+统计

### 2.4 Editor Area 规格

| 属性 | 值 |
|------|-----|
| 布局 | flex: 1, flex-direction: column |
| 滚动容器 | overflow-y: auto, justify-content: center, padding: 32px |

**编辑器纸张 (editor-paper)**:
- max-width: 680px
- min-height: 800px
- background: var(--bg-surface)
- border-radius: 2px
- box-shadow: var(--shadow-soft), focus态升级为shadow-medium
- padding: 64px 72px
- line-height: 1.618 (黄金比)
- 正文字体: Noto Serif SC, 17px, #37474F
- H1: 26px/700, H2: 20px/600
- 代码: JetBrains Mono, 14px, 红色accent
- blockquote: 左3px红色边框 + 灰色斜体

### 2.5 Stage Panel 规格

| 属性 | 值 |
|------|-----|
| 宽度 | 360px (折叠: 0px) |
| 背景 | var(--bg-frosted) + backdrop-filter: blur(20px) |
| 边框 | 左侧 1px solid var(--border) |

**结构**:
- 平台标签页: 微信 / 小红书 / 知乎 (11px/600, 圆角6px)
- 设备仿真:
  - iPhone Frame: 280x560px, 黑色#1C1C1E, 圆角36px, padding 12px
  - Dynamic Island: 90x28px, 居中顶部16px
  - Screen: 白色圆角28px, padding-top 48px

### 2.6 Inspector Panel 规格

| 属性 | 值 |
|------|-----|
| 宽度 | 280px (折叠: 0px) |
| 背景 | var(--bg-frosted) + backdrop-filter: blur(20px) |
| 边框 | 左侧 1px solid var(--border) |

**四个Section**:
1. **排版风格**: 主题色选择器(28px圆形色块, hover scale(1.15), active态边框+阴影)
2. **字体控制**: 下拉选择(Serif/Sans/手写) + 字号slider
3. **素材库**: 上传区域(虚线2px) + 2列网格 + asset-item(1:1方形, 圆角8px)
4. **引用链接**: 链接列表 + favicon

### 2.7 Status Bar 规格

| 属性 | 值 |
|------|-----|
| 高度 | 26px |
| 背景 | var(--bg-surface) |
| 字体 | 11px, var(--text-muted) |

**左侧**: 字数 | 段落数 | 图片数
**右侧**: 阅读时间 | Markdown | UTF-8

### 2.8 Focus Mode 规格

- 触发: F11键 或 UI按钮
- 效果: body添加.focus-mode类
- Focus Overlay: radial-gradient暗角 (从中心透明渐变到边缘0.08不透明)
- Header/StatusBar: opacity:0.3, hover时恢复opacity:1

### 2.9 Edge Triggers 规格

- 宽度: 12px, 绝对定位
- 指示条: 4px宽 48px高 红色圆角条
- 默认: opacity:0
- Hover: opacity:0.6, scaleY(1.2)

---

## 第三部分：编辑器核心

### 3.1 TipTap 编辑器配置

**核心扩展列表**:

| 扩展 | 来源 | 功能 |
|------|------|------|
| StarterKit | @tiptap/starter-kit | 基础节点(paragraph, heading, bold, italic等) |
| Placeholder | @tiptap/extension-placeholder | 空态占位文字 |
| Typography | @tiptap/extension-typography | 智能标点替换 |
| Link | @tiptap/extension-link | 链接支持 |
| Image | @tiptap/extension-image | 图片插入 |
| Table | @tiptap/extension-table | 表格编辑 |
| TaskList | @tiptap/extension-task-list | 任务列表 |
| CodeBlockLowlight | @tiptap/extension-code-block-lowlight | 代码高亮 |
| Highlight | @tiptap/extension-highlight | 文字高亮 |
| Underline | @tiptap/extension-underline | 下划线 |
| TextAlign | @tiptap/extension-text-align | 文字对齐 |
| Color | @tiptap/extension-color | 文字颜色 |
| TextStyle | @tiptap/extension-text-style | 文字样式 |
| Subscript | @tiptap/extension-subscript | 下标 |
| Superscript | @tiptap/extension-superscript | 上标 |
| Dropcursor | @tiptap/extension-dropcursor | 拖拽光标 |
| BubbleMenu | @tiptap/extension-bubble-menu | 浮动菜单基础 |
| FloatingMenu | @tiptap/extension-floating-menu | 浮动菜单 |
| CharacterCount | @tiptap/extension-character-count | 字符统计 |
| History | @tiptap/extension-history | 撤销/恢复 |

**自定义扩展**:

| 扩展 | 文件 | 功能 |
|------|------|------|
| SmartPunctuation | extensions/SmartPunctuation.ts | `--`->`--`, `...`->`......`, 直角引号转换 |
| TypewriterMode | extensions/TypewriterMode.ts | 光标始终在视口垂直居中 |
| SlashCommands | extensions/SlashCommands.ts | /h1 /h2 /image /table /quote 等 |
| WeChatFormat | extensions/WeChatFormat.ts | 微信兼容格式化 |

### 3.2 Markdown 语法即时渲染

编辑器的核心设计原则: **Markdown原始文本呈现为重心，但支持即时渲染**

| 语法 | 输入 | 渲染效果 |
|------|------|---------|
| 粗体 | `**text**` | 两侧`**`变灰，文字加粗 |
| 斜体 | `*text*` | 两侧`*`变灰，文字斜体 |
| 删除线 | `~~text~~` | 两侧`~~`变灰，文字划线 |
| 行内代码 | `` `code` `` | 灰底红色等宽字体 |
| 标题 | `# Title` | `#`变灰变小，标题放大加粗 |
| 引用 | `> text` | 左红色边框，灰色背景 |
| 列表 | `- item` / `1. item` | 标准列表样式 |
| 代码块 | ` ``` ` | 完整代码块+语法高亮 |
| 链接 | `[text](url)` | 蓝色下划线文字 |
| 图片 | `![alt](url)` | 内联图片预览 |
| 分隔线 | `---` | 水平线 |
| 表格 | `| a | b |` | 可视化表格 |
| 数学 | `$formula$` | KaTeX渲染 |

### 3.3 浮动工具栏规格

**触发条件**: 选中文字时出现(非光标仅闪烁态)

**位置**: 选中文字上方8px, 水平居中对齐

**按钮列表** (从左到右):
B(Bold) | I(Italic) | U(Underline) | S(Strikethrough) | 分隔线 | Link | Color | Code | 分隔线 | H下拉(H1-H3) | 更多(+)

**动画**:
- 显示: translateY(8px) scale(0.95) -> translateY(0) scale(1), 200ms ease-bounce
- 隐藏: opacity 1->0, 150ms

**样式**:
- 背景: white, 圆角10px, shadow-float
- 按钮: 32x32px, 圆角6px, hover态灰底
- 分隔线: 1px x 20px 垂直线

### 3.4 斜杠命令系统

**触发**: 在新行输入 `/`

**命令列表**:

| 命令 | 图标 | 描述 | 快捷键 |
|------|------|------|--------|
| /h1 | Type | 一级标题 | - |
| /h2 | Type | 二级标题 | - |
| /h3 | Type | 三级标题 | - |
| /quote | Quote | 引用块 | - |
| /code | Code | 代码块 | - |
| /image | Image | 插入图片 | - |
| /table | Grid | 插入表格 | - |
| /divider | Minus | 分隔线 | - |
| /list | List | 无序列表 | - |
| /ordered | ListOrdered | 有序列表 | - |
| /task | CheckSquare | 任务列表 | - |
| /template | FileText | 插入模板 | - |
| /ai | Sparkles | AI辅助 | - |

**UI规格**:
- 下拉面板: 白色, 圆角8px, shadow-float, max-height 300px, 溢出滚动
- 命令项: 10px 12px padding, 圆角6px, hover灰底
- 搜索过滤: 实时筛选命令
- 键盘导航: 上下箭头 + Enter选中 + Esc关闭

### 3.5 编辑器快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+B | 加粗 |
| Ctrl+I | 斜体 |
| Ctrl+U | 下划线 |
| Ctrl+Shift+S | 删除线 |
| Ctrl+K | 插入链接 |
| Ctrl+Shift+C | 行内代码 |
| Ctrl+Z | 撤销 |
| Ctrl+Shift+Z | 重做 |
| Ctrl+S | 保存 |
| Ctrl+Shift+V | 纯文本粘贴 |
| / | 斜杠命令(行首) |
| F11 | 专注模式 |

---

## 第四部分：三平台导出管线

### 4.1 渲染管线流程

```
Markdown Source
    |
    v
marked Parser (扩展: alert块, 自定义renderer)
    |
    v
DOMPurify Sanitize (XSS防护)
    |
    v
代码高亮 (highlight.js, 7+主题, inline style)
    |
    v
Alert块渲染 ([!NOTE] [!WARNING] [!TIP] [!IMPORTANT] [!CAUTION])
    |
    v
主题CSS注入 (generateThemeCSS)
    |
    v
平台分流:
    ├── 微信: juice CSS内联 -> 结构修复 -> 外链脚注 -> 图片宽度限制
    ├── 小红书: 格式简化 -> emoji装饰 -> 段落分割 -> 外链剥离
    └── 知乎: Markdown直出 -> 学术引用 -> LaTeX保留
```

### 4.2 微信公众号导出规格

**CSS内联化** (juice库):
```typescript
juice(html, {
  inlinePseudoElements: true,
  preserveMediaQueries: false,
  preserveFontFaces: false
})
```

**后处理清单**:
1. CSS变量替换: `var(--primary-color)` -> 具体值
2. 图片属性转样式: `width="100"` -> `style="width: 100px"`
3. 嵌套列表修复: `li > ul` 移为兄弟元素
4. 外链转脚注: 非mp.weixin.qq.com链接 -> 底部引用+上标编号
5. blockquote增强: 左色条 + 浅灰背景 + 圆角
6. figcaption样式: 居中斜体灰色
7. 表格增强: 条纹行 + 圆角 + 主色表头
8. 代码块: Mac窗口样式(可选) + 行号(可选) + inline style高亮
9. 图片最大宽度: 640px

**输出格式**: 纯HTML字符串，可直接粘贴到微信公众号编辑器

### 4.3 小红书导出规格

**格式简化**:
1. 移除所有自定义CSS
2. 保留基础格式: 加粗、斜体
3. 标题装饰: emoji前缀
4. 段落优化: 长段落自动分割(每段不超过5行)
5. 外链剥离: 移除所有超链接，保留文字
6. 表格不支持: 转为文字列表
7. 代码块不支持: 转为缩进文本
8. emoji密度: 建议1-2个/100字

**签名块**: 文末附加创作者签名

### 4.4 知乎导出规格

**Markdown直出**:
1. 保持原始Markdown语法
2. LaTeX保留: `$...$` 和 `$$...$$`
3. 代码块保留: ``` 语法
4. 学术引用脚注: 底部参考文献格式
5. 外链: 正常保留

### 4.5 导出质量检测 (Pre-flight Check)

| 检测项 | 平台 | 规则 |
|--------|------|------|
| 死链检测 | 全平台 | HTTP HEAD检测404 |
| 图片大小 | 微信 | >10MB警告 |
| 图片宽度 | 微信 | >640px自动提示 |
| 标题长度 | 小红书 | 限制20字符 |
| emoji密度 | 小红书 | 1-2个/100字 |
| 段落长度 | 小红书 | 每段<=5行 |
| 表格兼容 | 小红书 | 不支持，建议替代 |
| 代码块兼容 | 小红书 | 不支持，建议替代 |
| SEO标题 | 全平台 | 15-25字，含数字/疑问/情绪词 |

---

## 第五部分：主题系统

### 5.1 基础主题 (3种)

| 主题 | 风格 | 特征 |
|------|------|------|
| default | 经典 | 均衡的排版，适合多数场景 |
| grace | 优雅 | 加大行距，精致的细节 |
| simple | 简洁 | 最小化装饰，极度克制 |

### 5.2 文章类型预设 (10种)

| # | 类型 | 基础主题 | 主题色 | 字体 | 特殊配置 |
|---|------|---------|--------|------|---------|
| 1 | 论文翻译 | grace | #8B0000 苏联红 | Serif | 首行缩进, 脚注开 |
| 2 | 法学研讨 | grace | #1A3A5C 藏青 | Serif | 首行缩进, 两端对齐 |
| 3 | 行业研报 | default | #004080 商务蓝 | Sans | Mac代码块关 |
| 4 | 时事点评 | simple | #C00000 新闻红 | Sans | 脚注开 |
| 5 | AIGC | default | #7B2D8E 赛博紫 | Sans | Mac代码块开 |
| 6 | 编程创造 | default | #00FF41 终端绿 | Mono | Mac代码块开, 行号开 |
| 7 | 学习笔记 | grace | #E07020 温暖橙 | Sans | 首行缩进关 |
| 8 | 新闻 | simple | #000000 纯黑 | Sans | 极简配置 |
| 9 | 整活 | default | #FF6B9D 活力粉 | Sans | 默认配置 |
| 10 | 人生感悟 | simple | #666666 淡雅灰 | Serif | 首行缩进 |

### 5.3 主题CSS变量映射

```typescript
interface ThemePreset {
  id: string
  name: string
  baseTheme: 'default' | 'grace' | 'simple'
  primaryColor: string
  fontFamily: 'serif' | 'sans' | 'mono'
  fontSize: number  // 14-20
  lineHeight: number  // 1.5-2.0
  letterSpacing: string
  firstLineIndent: boolean
  textAlign: 'left' | 'justify'
  footnoteEnabled: boolean
  macCodeBlock: boolean
  codeLineNumbers: boolean
  codeTheme: string  // highlight.js theme name
  customCSS: string
}
```

### 5.4 代码高亮主题

支持 7 种精选主题:

| 主题 | 风格 | 推荐场景 |
|------|------|---------|
| github | 浅色 | 通用 |
| github-dark | 深色 | 科技文 |
| monokai | 深色 | 编程类 |
| atom-one-light | 浅色 | 学术类 |
| atom-one-dark | 深色 | 专业级 |
| vs2015 | 深色 | 微软风 |
| xcode | 浅色 | Apple风 |

---

## 第六部分：数据与状态管理

### 6.1 IndexedDB Schema (Dexie.js)

```typescript
// utils/db.ts
class InkForgeDatabase extends Dexie {
  categories!: Table<Category>
  articles!: Table<Article>
  contents!: Table<Content>
  versions!: Table<Version>
  assets!: Table<Asset>

  constructor() {
    super('InkForgeDB')
    this.version(1).stores({
      categories: '++id, name, sortOrder, createdAt',
      articles: '++id, categoryId, title, status, sourceUrl, createdAt, updatedAt',
      contents: '++id, articleId',
      versions: '++id, contentId, label, createdAt',
      assets: '++id, articleId, name, type, size, createdAt'
    })
  }
}
```

### 6.2 数据模型

```typescript
interface Category {
  id?: number
  name: string
  icon?: string
  color?: string
  sortOrder: number
  createdAt: Date
}

interface Article {
  id?: number
  categoryId: number | null
  title: string
  status: 'draft' | 'published' | 'archived'
  sourceUrl?: string
  metadata: {
    cover?: string
    summary?: string
    tags?: string[]
    platform?: 'wechat' | 'xiaohongshu' | 'zhihu'
    wordCount?: number
    readingTime?: number
  }
  createdAt: Date
  updatedAt: Date
}

interface Content {
  id?: number
  articleId: number
  markdown: string
  html?: string
}

interface Version {
  id?: number
  contentId: number
  label: string
  markdown: string
  diff?: string
  createdAt: Date
}

interface Asset {
  id?: number
  articleId: number
  name: string
  type: 'image' | 'video' | 'file'
  data: Blob | ArrayBuffer
  url?: string
  size: number
  dimensions?: { width: number; height: number }
  createdAt: Date
}
```

### 6.3 Repository 接口

```typescript
interface IRepository<T, ID = number> {
  findAll(): Promise<T[]>
  findById(id: ID): Promise<T | undefined>
  create(entity: Omit<T, 'id'>): Promise<ID>
  update(id: ID, updates: Partial<T>): Promise<void>
  delete(id: ID): Promise<void>
  count(): Promise<number>
}

// 特化接口
interface IArticleRepository extends IRepository<Article> {
  findByCategory(categoryId: number): Promise<Article[]>
  findByStatus(status: string): Promise<Article[]>
  search(query: string): Promise<Article[]>
  findRecent(limit: number): Promise<Article[]>
}
```

### 6.4 Pinia Store 规格

#### editor.ts - 编辑器状态 (FSM)

```typescript
type EditorStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

interface EditorState {
  status: EditorStatus
  currentArticleId: number | null
  content: string  // Markdown
  isDirty: boolean
  lastSavedAt: Date | null
  wordCount: number
  charCount: number
  paragraphCount: number
  imageCount: number
  readingTime: number
  focusMode: boolean
  typewriterMode: boolean
}
```

**状态转换**:
- idle -> loading (selectArticle)
- loading -> ready (loadSuccess)
- loading -> error (loadFail)
- ready -> saving (autoSave/manualSave)
- saving -> ready (saveSuccess)
- saving -> error (saveFail)
- any -> idle (closeArticle)

**自动保存**: 内容变更后 5秒 debounce 触发

#### article.ts - 文章管理

```typescript
interface ArticleState {
  articles: Article[]
  selectedId: number | null
  loading: boolean
  filter: {
    categoryId: number | null
    status: string | null
    search: string
  }
}
```

#### category.ts - 分类管理

```typescript
interface CategoryState {
  categories: Category[]
  selectedId: number | null
}
```

#### settings.ts - 应用设置

```typescript
interface SettingsState {
  // 编辑器设置
  editor: {
    fontFamily: string
    fontSize: number
    lineHeight: number
    tabSize: number
    wordWrap: boolean
    autoSave: boolean
    autoSaveInterval: number
    typewriterMode: boolean
    smartPunctuation: boolean
  }
  // 主题设置
  theme: {
    presetId: string
    customCSS: string
    accentColor: string
    codeTheme: string
  }
  // AI设置
  ai: {
    provider: 'openai' | 'anthropic' | 'deepseek' | 'ollama'
    baseUrl: string
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
  }
  // 导出设置
  export: {
    platform: 'wechat' | 'xiaohongshu' | 'zhihu'
    footnoteEnabled: boolean
    firstLineIndent: boolean
    textAlign: 'left' | 'justify'
    macCodeBlock: boolean
    codeLineNumbers: boolean
  }
}
```

---

## 第七部分：文件管理系统

### 7.1 Bundle 架构

每篇文章在 IndexedDB 中按 Bundle 模式组织:

```
Article (元数据)
  ├── Content (Markdown正文)
  │   └── Versions[] (版本历史)
  └── Assets[] (素材资源)
```

### 7.2 版本快照系统

**自动快照**: 每5分钟自动创建(如果有变更)
**手动快照**: 用户主动保存版本 + 版本标签
**版本对比**: 两个版本间的diff展示
**版本恢复**: 一键回滚到历史版本

### 7.3 草稿箱

- 未分类的快速笔记
- 自动保存到 IndexedDB
- 可后续归类到分类

---

## 第八部分：AI 系统

### 8.1 Provider 抽象层

```typescript
interface AIProvider {
  name: string
  chat(messages: Message[], options: ChatOptions): AsyncIterable<string>
  models(): Promise<string[]>
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatOptions {
  model: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}
```

**支持的Provider**:

| Provider | 默认BaseURL | 默认模型 |
|----------|-----------|---------|
| OpenAI (硅基流动) | https://api.siliconflow.cn/v1 | Qwen/Qwen3-8B |
| Anthropic | https://api.anthropic.com | claude-3-haiku |
| DeepSeek | https://api.deepseek.com | deepseek-chat |
| Ollama | http://localhost:11434 | llama3 |

### 8.2 AI 面板规格

- 位置: 右侧抽屉(可独立于Inspector)
- 宽度: 360px
- 功能:
  - 自由对话
  - 文章润色/扩写/缩写
  - 标题优化建议
  - 摘要自动生成
  - 翻译
  - 语法检查

---

## 第九部分：安全架构

### 9.1 XSS 防护

- 所有用户输入经 DOMPurify 清洗
- HTML导出前强制sanitize
- 禁止script/iframe/event handler注入

### 9.2 CSS 消毒

- 导出CSS经白名单过滤
- 禁止 expression() / url(javascript:) / behavior
- 限制CSS属性范围

### 9.3 输入验证

- Zod schema 验证所有数据模型
- API请求参数严格类型检查
- 文件上传类型和大小限制

---

## 第十部分：验收清单

### 10.1 布局验收

- [ ] 四栏磁吸布局精确匹配原型
- [ ] Manager可折叠(悬停左边缘展开)
- [ ] Stage永久驻留右侧 + 设备仿真
- [ ] Inspector可折叠
- [ ] F11专注模式(暗角vignette)
- [ ] 所有面板弹性缓动动画
- [ ] 状态栏统计信息实时更新

### 10.2 编辑器验收

- [ ] TipTap编辑器正常工作
- [ ] Markdown语法即时渲染
- [ ] 选中文字浮动工具栏
- [ ] 斜杠命令系统
- [ ] 打字机模式
- [ ] 智能标点替换
- [ ] 快捷键全部生效
- [ ] 纸张样式匹配原型

### 10.3 导出验收

- [ ] 微信公众号CSS完全内联
- [ ] 微信外链自动转脚注
- [ ] 微信图片宽度<=640px
- [ ] 微信代码块inline style高亮
- [ ] 小红书格式简化输出
- [ ] 小红书emoji装饰
- [ ] 知乎Markdown原生输出
- [ ] Stage三平台预览切换

### 10.4 数据验收

- [ ] IndexedDB文章CRUD
- [ ] 版本快照创建/恢复
- [ ] 自动保存(5秒debounce)
- [ ] 分类管理
- [ ] 素材管理

### 10.5 视觉验收

- [ ] 整体Light Theme (#FAFBFC)
- [ ] 构成主义红CTA (#D32F2F)
- [ ] 60%+留白比
- [ ] 动画支持reduced-motion
- [ ] 字体: Inter(UI) + Noto Serif SC(正文)
- [ ] 8px网格间距一致性

### 10.6 性能基线

| 指标 | 目标 |
|------|------|
| 首屏渲染 | < 1.5s |
| 编辑器输入延迟 | < 16ms (60fps) |
| 自动保存延迟 | < 500ms |
| 导出生成 | < 2s |
| 内存占用 | < 200MB |

---

*文档版本: v1.0*
*创建时间: 2026-03-01*
*基于原型: prototype/inkforge_workstation.html*
