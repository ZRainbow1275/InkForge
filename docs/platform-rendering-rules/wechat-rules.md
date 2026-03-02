# 微信公众号渲染规则手册

> 基于 2025-2026 年全网调研整理，参考 doocs/md、wxmp、md2oa 等项目实践验证

---

## 一、HTML 标签白名单

### 支持的标签

| 类别 | 标签 | 备注 |
|------|------|------|
| 段落/标题 | `<p>`, `<h1>`~`<h6>` | 结构化内容组织 |
| 文本修饰 | `<strong>`, `<b>`, `<em>`, `<i>`, `<u>`, `<br>`, `<del>`, `<sub>`, `<sup>` | 文字样式 |
| 列表 | `<ul>`, `<ol>`, `<li>` | 有序/无序列表 |
| 链接 | `<a>` | 外链触发安全提醒弹窗 |
| 图像 | `<img>` | 自动 max-width:100% |
| 布局 | `<section>`, `<div>`, `<span>` | 容器/行内容器 |
| 表格 | `<table>`, `<tr>`, `<td>`, `<th>`, `<thead>`, `<tbody>` | 完整表格支持 |
| 引用 | `<blockquote>` | 块引用 |
| 代码 | `<pre>`, `<code>` | 代码展示 |
| 水平线 | `<hr>` | 分隔线 |
| 媒体 | `<mpvoice>`, `<mpvideo>` | 微信专属媒体标签 |

### 不支持/被过滤的标签
- `<script>`, `<style>`, `<link>` — 安全限制
- `<iframe>`, `<embed>`, `<object>` — 嵌入限制
- `<form>`, `<input>`, `<button>`, `<select>` — 表单不支持
- `<audio>`, `<video>` — 需使用微信专属标签
- `<canvas>`, `<svg>` — SVG 内图片必须用微信素材库链接

---

## 二、CSS 支持规则

### 核心规则
1. **仅支持内联 `style` 属性** — 不支持 `<style>` 标签和外部 CSS 文件
2. **不支持 `class` 属性** — 微信编辑器会过滤掉所有 class
3. **不支持 CSS 变量** — `var(--xxx)` 无效，必须替换为实际值
4. **不支持 `@media` 查询** — 内联样式中无法使用媒体查询
5. **不支持伪类/伪元素** — `:hover`, `::before` 等无效

### 支持的 CSS 属性

| 类别 | 属性 | 示例 |
|------|------|------|
| 字体 | `font-size`, `font-weight`, `font-style`, `font-family`, `color` | `font-size:16px; color:#333;` |
| 间距 | `margin`, `padding`, `line-height`, `letter-spacing` | `margin:16px 0; line-height:1.75;` |
| 对齐 | `text-align`, `vertical-align` | `text-align:center;` |
| 显示 | `display` (block/inline-block/flex) | `display:flex;` |
| 背景 | `background-color`, `background` | `background-color:#f7f7f7;` |
| 边框 | `border`, `border-radius`, `box-shadow` | `border-radius:4px;` |
| 装饰 | `text-decoration`, `opacity` | `text-decoration:underline;` |
| 尺寸 | `width`, `height`, `max-width`, `min-width` | `max-width:100%;` |
| 交互 | `pointer-events` | `pointer-events:none;` |
| 溢出 | `overflow`, `overflow-x`, `overflow-y` | `overflow:hidden;` |
| 定位 | `position` (relative 有效, absolute/fixed 谨慎) | — |
| 文字 | `white-space`, `word-break`, `word-wrap` | `word-break:break-all;` |
| 变换 | `transform` (部分设备支持) | 谨慎使用 |

### 不支持/有风险的 CSS
- `animation`, `transition` — 动画无效
- `@keyframes` — 不支持
- `position: fixed` — 无效
- `linear-gradient` — 部分设备不支持，建议回退纯色
- `filter` — 大部分不支持
- `backdrop-filter` — 不支持
- `clip-path` — 不支持

---

## 三、关键渲染约束

### 1. CSS 内联化（强制）
```
原始: <p class="paragraph">文本</p> + .paragraph { color: #333; }
转换: <p style="color:#333;">文本</p>
工具: juice 库（npm install juice）
```

### 2. CSS 变量替换（强制）
```
原始: style="color: var(--md-primary-color)"
转换: style="color: #1a73e8"
方式: 正则替换 var(--xxx) → 实际值
```

### 3. 外链处理（强烈推荐）
- 非 `mp.weixin.qq.com` 域名链接会触发「即将离开微信」安全提醒
- 最佳实践：外链转文末脚注
```
原始: 请参考 [这篇文章](https://example.com)
转换: 请参考 这篇文章[1]
脚注: [1] https://example.com
```

### 4. 嵌套列表修复（强制）
微信对 `<li>` 内嵌套 `<ul>`/`<ol>` 的渲染异常
```html
<!-- 原始（有问题） -->
<ul>
  <li>项目一
    <ul>
      <li>子项</li>
    </ul>
  </li>
</ul>

<!-- 修复后（兄弟节点） -->
<ul>
  <li>项目一</li>
  <ul style="margin-left:20px;">
    <li>子项</li>
  </ul>
</ul>
```

### 5. 代码高亮处理
- highlight.js 生成的 `class` 会被过滤
- 必须将高亮颜色转为内联 `style`
```html
<!-- 错误：class 会被过滤 -->
<span class="hljs-keyword">const</span>

<!-- 正确：内联样式 -->
<span style="color:#c678dd;">const</span>
```

### 6. 图片处理
- 微信自动添加 `max-width:100%`
- `width`/`height` 属性需移到 inline style
- 建议图片宽度 ≤ 640px
- SVG 内嵌图片**必须**使用微信素材库链接
```html
<!-- 原始 -->
<img width="600" height="400" src="...">

<!-- 处理后 -->
<img style="width:600px; height:auto; max-width:100%;" src="...">
```

### 7. 数学公式
- 微信不支持 MathML 或 LaTeX 直接渲染
- KaTeX/MathJax → SVG 内嵌是最佳方案
- SVG 需要处理兼容性（添加空节点辅助复制）

### 8. 表格样式
- 必须完全内联样式
- 建议添加 `border-collapse: collapse` 和单元格边框
```html
<table style="border-collapse:collapse; width:100%; margin:16px 0;">
  <tr>
    <th style="border:1px solid #ddd; padding:8px 12px; background:#f5f5f5;">标题</th>
  </tr>
  <tr>
    <td style="border:1px solid #ddd; padding:8px 12px;">内容</td>
  </tr>
</table>
```

---

## 四、富文本复制技术

### Clipboard API 方案（推荐）
```javascript
async function copyToClipboard(html: string, text: string) {
  const htmlBlob = new Blob([html], { type: 'text/html' })
  const textBlob = new Blob([text], { type: 'text/plain' })
  const item = new ClipboardItem({
    'text/html': htmlBlob,
    'text/plain': textBlob,
  })
  await navigator.clipboard.write([item])
}
```

### 关键影响样式属性列表（getComputedStyle 过滤用）
```javascript
const EffectCssAttrs = [
  'fontSize', 'fontWeight', 'fontFamily', 'fontStyle',
  'color', 'backgroundColor',
  'textAlign', 'lineHeight', 'letterSpacing',
  'whiteSpace', 'wordBreak',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'padding', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'border', 'borderRadius', 'borderColor', 'borderWidth',
  'display', 'verticalAlign',
  'width', 'maxWidth', 'height',
  'textDecoration', 'opacity',
  'listStyleType',
  'overflowX', 'overflowY',
]
```

---

## 五、渲染管线参考（doocs/md 验证方案）

```
Step 1: Markdown → HTML (marked + 自定义 renderer)
Step 2: 代码高亮 (highlight.js, class → inline style)
Step 3: 数学公式 (KaTeX → SVG)
Step 4: 安全清理 (DOMPurify.sanitize)
Step 5: 容器包装 (createContainer)
Step 6: CSS 内联化 (juice)
Step 7: 后处理
  ├── 嵌套列表修复 (li > ul → 兄弟节点)
  ├── 图片样式处理 (attr → inline style)
  ├── SVG 兼容性 (Mermaid 图表)
  ├── CSS 变量替换 (--var → 实际值)
  └── 外链转脚注
Step 8: 输出 WeChat-Compatible HTML
```
