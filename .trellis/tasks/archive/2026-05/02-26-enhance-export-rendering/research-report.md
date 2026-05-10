# 全网调研报告：微信公众号/小红书/知乎 Markdown 编辑器最佳实践

> 调研日期：2026-02-28
> 调研范围：GitHub 开源项目、技术博客、官方文档、社区讨论

---

## 一、优秀开源项目对标分析

### 1. doocs/md — 标杆项目 ⭐ 11.8K Stars
- **仓库**: https://github.com/doocs/md
- **技术栈**: Vue3 + Vite + TypeScript + Tailwind CSS + pnpm monorepo
- **核心特性**:
  - 完整 Markdown 语法 + Mermaid 图表 + PlantUML + GFM 警告块
  - 30+ 代码高亮主题（highlight.js）
  - 自定义 CSS 主题系统（预定义主题 + 自定义 CSS）
  - AI 集成（DeepSeek/OpenAI/通义千问/腾讯混元等）
  - 13 种图床支持（GitHub/阿里云/腾讯云/七牛云/S3 等）
  - Ruby 注音扩展
  - 数学公式（MathJax v3）
  - Chrome 插件 + uTools 插件 + npm CLI

#### doocs/md 渲染管线（核心参考）
```
Markdown Input
  → Front Matter 解析 (parseFrontMatterAndContent)
  → marked.parse + 自定义 renderer
    → markedAlert 扩展（GFM 警告块）
    → MDKatex 扩展（数学公式）
    → markedSlider 扩展（图片轮播）
    → highlight.js 代码高亮
  → DOMPurify.sanitize（安全清理）
  → 阅读时间统计 + 脚注
  → createContainer 容器包装
  → Post-processing:
    → modifyHtmlStructure（嵌套列表 li > ul 修复为兄弟节点）
    → mergeCss（juice 库 CSS 内联化）
    → solveWeChatImage（图片 width/height → inline style）
    → SVG 兼容性修复（Mermaid 图表）
    → CSS 变量替换（--md-primary-color → 实际颜色值）
  → WeChat-Compatible HTML Output
```

#### doocs/md 主题系统架构
- `src/config/theme.ts` 定义预制主题（default/grace/simple 等）
- `buildTheme(opts)` 合并 base + element styles + font/size 设置
- `getStyles(tokenName)` 按 Markdown 元素名获取样式
- `styledContent(tag, content)` 将内联样式注入 HTML 元素
- `styleMapping` 对象保存每个元素的最终样式字符串

### 2. jaywcjlove/wxmp — 524 Stars
- **仓库**: https://github.com/jaywcjlove/wxmp
- **特色功能**:
  - 自定义 CSS 样式 + 主题编辑器
  - 代码块主题选择
  - URL 参数加载 Markdown 内容 + 主题选择
  - Electron 桌面应用
  - `<!--rehype:style=...-->` 自定义行内样式语法
  - `<!--rehype:ignore:start-->` 忽略内容标记
  - 数学公式支持（行内 + 块级）
  - GFM 脚注
  - Docker 部署

#### wxmp 主题定义规范
```css
/* 支持的 CSS 选择器 */
h1 {} h2 {} h3 {} h4 {} h5 {} h6 {}  /* 标题 */
a {} strong {} del {} em {} u {} p {} /* 文本格式 */
ul {} ol {} li {}                     /* 列表 */
blockquote {}                         /* 引用 */
table {} td {} th {}                  /* 表格 */
pre {} .code-highlight {} .code-line {} .code-spans {} /* 代码 */
sup {} .footnotes-title {} .footnotes-list {} /* 脚注 */
.image-warpper {} .image {}           /* 图片 */
/* 语法高亮 */
.comment {} .property {} .function {} .keyword {}
.punctuation {} .unit {} .tag {} .color {}
.selector {} .quote {} .number {}
.attr-name {} .attr-value {}
```

### 3. 其他参考项目
| 项目 | Stars | 特色 |
|------|-------|------|
| md2wechat.com | N/A | 5种精美主题，一键复制富文本 |
| 花生编辑器 (alchaincyf/huasheng_editor) | - | 13种 Markdown 样式，响应式 |
| md2oa (shaogefenhao) | - | marked + highlight.js + juice，图片 Base64 |
| yanxi123-com/md2weixin | - | Node.js API/CLI/WEB 统一核心，封面生成 |
| md2zhihu | - | 专注知乎格式转换，处理 LaTeX 兼容 |
| Markdown4Zhihu (miracleyoo) | - | LaTeX 公式 + 代码块优化 |
| xiaohongshu-text-layout | - | Markdown 长文自动分页生成图片 |
| md.hi-dhl.com | - | Markdown 转小红书海报 |

---

## 二、微信公众号渲染规则深度分析

### HTML 标签白名单
| 类别 | 支持的标签 |
|------|-----------|
| 段落/标题 | `<p>`, `<h1>`~`<h6>` |
| 文本修饰 | `<strong>`, `<b>`, `<em>`, `<i>`, `<u>`, `<br>`, `<del>` |
| 列表 | `<ul>`, `<ol>`, `<li>` |
| 链接 | `<a>` (外链触发安全提醒) |
| 图像 | `<img>` (自动 max-width:100%) |
| 布局 | `<section>`, `<div>`, `<span>` |
| 表格 | `<table>`, `<tr>`, `<td>`, `<th>`, `<thead>`, `<tbody>` |
| 引用 | `<blockquote>` |
| 代码 | `<pre>`, `<code>` |
| 媒体 | `<mpvoice>`, `<mpvideo>` (微信专属) |

### CSS 支持规则
- **仅支持内联 `style` 属性**，不支持 `<style>` 标签和外部 CSS
- **不支持 `class` 属性**（微信会过滤掉）

| CSS 属性类别 | 支持的属性 |
|-------------|-----------|
| 字体 | font-size, color, font-weight, font-style, font-family |
| 间距 | margin, padding, line-height, letter-spacing |
| 对齐 | text-align, vertical-align |
| 显示 | display (block/inline-block) |
| 背景 | background-color, background (渐变需谨慎) |
| 边框 | border, border-radius, box-shadow |
| 其他 | text-decoration, opacity, pointer-events |

### 关键渲染约束
1. **CSS 必须完全内联** — juice 库是业界标准方案
2. **CSS 变量不支持** — 必须替换为实际值
3. **外链限制** — 非 mp.weixin.qq.com 链接触发安全提醒，最佳实践是转脚注
4. **图片** — 建议上传微信素材库；SVG 内嵌图必须用素材库链接
5. **嵌套列表** — `li > ul` 结构需修复为兄弟元素
6. **图片宽度** — 自动 max-width:100%，建议 ≤640px

### 技术实现关键点（来自多个开源项目验证）
```
1. Markdown → HTML: marked 库 + 自定义 renderer
2. 代码高亮: highlight.js → 内联 style（非 class）
3. CSS 内联化: juice 库（CSS rules → inline style）
4. 嵌套列表修复: DOM 操作 li > ul/ol → 兄弟节点
5. 图片处理: width/height attr → inline style
6. 外链转脚注: 非微信域名链接 → 文末脚注列表
7. 数学公式: KaTeX/MathJax → SVG 内嵌
8. CSS 变量替换: --var → 实际值正则替换
9. 富文本复制: navigator.clipboard.write + ClipboardItem
```

### 富文本复制方案（核心技术）
```javascript
// 方案一：juice + clipboard API（业界主流）
const htmlData = new Blob([inlinedHTML], { type: 'text/html' })
const textData = new Blob([plainText], { type: 'text/plain' })
const item = new ClipboardItem({ 'text/html': htmlData, 'text/plain': textData })
await navigator.clipboard.write([item])

// 方案二：getComputedStyle + DOM 递归（无依赖方案）
// 遍历 DOM 树，getComputedStyle 获取计算样式，过滤关键属性，拼接内联样式
```

---

## 三、小红书渲染规则深度分析

### 平台限制
| 维度 | 规则 |
|------|------|
| 字数 | 单篇最多 1000 字（含标点空格），建议 600-800 字 |
| 图片比例 | 推荐 3:4 竖版（1080×1440px 或 1242×1660px） |
| 图片格式 | 仅支持 1:1 和 3:4 比例 |
| 表格 | **不支持**，需转为列表或文字描述 |
| 链接 | **不支持超链接**，需转为文字描述 |
| 代码块 | **不支持**，需转为截图或引用段 |
| HTML/CSS | **完全不支持**，纯文本 + emoji |

### 排版最佳实践
1. **段落控制**: 每段 ≤5 行，段间空行分隔
2. **Emoji 使用**: 标题带 emoji，每段首尾使用表情，密度 1-2个/100字
3. **标题格式**: 限制 20 字符以内，带吸引力的关键词
4. **序号符号**: 使用 emoji 序号（1️⃣2️⃣3️⃣）替代数字列表
5. **分隔符**: 使用 emoji 分隔线（如 ━━━━━━━━━━ 或 ✦✦✦）
6. **留白**: 短段落 + 空行 = 良好阅读节奏

### 转换策略
```
Markdown Input
  → 移除所有 HTML 标签
  → 标题 → emoji + 加粗文本
  → 列表 → emoji 序号
  → 代码块 → 引用段/截图提示
  → 表格 → 列表化描述
  → 链接 → 文字描述 + 搜索提示
  → 图片 → 3:4 比例提示
  → 段落分割（≤5行/段）
  → Emoji 密度优化
  → 字数统计 + 超限警告
  → Pure Text Output
```

---

## 四、知乎渲染规则深度分析

### 平台支持情况
| 元素 | 支持度 | 备注 |
|------|--------|------|
| Markdown 基础语法 | ✅ 完整 | 导入功能原生支持 |
| LaTeX 公式 | ✅ 支持 | `$...$` 行内，`$$...$$` 块级 |
| 代码块 | ✅ 支持 | ``` 语法，含语法高亮 |
| 表格 | ✅ 支持 | 标准 Markdown 表格语法 |
| 图片 | ✅ 支持 | 需外链或上传 |
| 链接 | ✅ 支持 | 外链正常显示 |
| Mermaid | ❌ 不支持 | 需转为图片 |
| HTML 标签 | ❌ 不支持 | 纯 Markdown |

### LaTeX 兼容性特殊处理
- 知乎原生支持 `$...$` 和 `$$...$$`
- 历史兼容：旧版知乎用 `<img src="https://www.zhihu.com/equation?tex=...">`
- 建议保留原始 LaTeX 语法，知乎编辑器自动渲染

### 转换策略
```
Markdown Input
  → 保留原始 Markdown 格式
  → LaTeX 公式保持 $...$ / $$...$$ 语法
  → 代码块保持 ``` 语法
  → 表格保留 Markdown 表格语法
  → Mermaid 图表 → 提示用户需手动截图
  → 图片链接检查（确保可访问）
  → 清理微信特有格式（如内联 style）
  → Clean Markdown Output
```

### 参考工具
- **md2zhihu**: 专业 Markdown → 知乎格式转换工具
- **Markdown4Zhihu**: 处理 LaTeX 兼容性

---

## 五、主题系统最佳实践

### doocs/md 主题架构（推荐参考）

#### 主题结构
```typescript
interface Theme {
  base: {               // 基础全局样式
    fontSize: string
    color: string
    lineHeight: string
    fontFamily: string
  }
  block: {              // 块元素样式
    h1: CSSProperties
    h2: CSSProperties
    h3: CSSProperties
    p: CSSProperties
    blockquote: CSSProperties
    code_pre: CSSProperties
    image: CSSProperties
    table: CSSProperties
    // ...
  }
  inline: {             // 行内元素样式
    strong: CSSProperties
    em: CSSProperties
    codespan: CSSProperties
    link: CSSProperties
    del: CSSProperties
    // ...
  }
}
```

#### 预制主题列表（推荐 InkForge 实现 8+ 主题）
| 主题名 | 风格 | 适用场景 |
|--------|------|---------|
| Default | 简洁中性 | 通用 |
| Grace | 优雅文艺 | 文学/生活 |
| Simple | 极简 | 技术 |
| Dark | 暗色 | 代码/技术 |
| Academic | 学术 | 论文/研究 |
| Vibrant | 多彩活泼 | 营销/推广 |
| Elegant | 精致 | 品牌 |
| Nature | 自然清新 | 生活/旅行 |

#### 主题色盘系统
- 基于主色调自动生成色阶（HSL 变换）
- 支持色盘取色器快速替换全局色调
- CSS 变量定义 → 渲染时替换为实际值

---

## 六、InkForge 增强建议

### 优先级 P0 — 核心渲染管线

1. **微信渲染完善**
   - 参考 doocs/md 的 7 步后处理管线
   - juice CSS 内联 → 嵌套列表修复 → 图片样式处理 → CSS 变量替换
   - 代码块高亮主题内联化（highlight.js styles → inline）
   - 外链自动转脚注 + 脚注列表

2. **小红书纯文本输出**
   - Markdown → 纯文本转换器
   - emoji 注入引擎（标题/段首尾/序号）
   - 段落分割器（≤5 行/段）
   - 字数统计 + 超限警告（1000 字限制）
   - 表格/代码块替代方案

3. **知乎原生 Markdown 输出**
   - 清理内联样式，保留纯 Markdown
   - LaTeX 公式保持原始语法
   - Mermaid 图表转图片提示

### 优先级 P1 — 主题系统

4. **主题引擎重构**
   - 参考 doocs/md 的 buildTheme/getStyles/styledContent 架构
   - 预制 8+ 主题
   - 主题预览面板（实时渲染）
   - 自定义 CSS 编辑器
   - 色盘取色 + 一键替换色调

### 优先级 P2 — 智能特性

5. **平台适配检测器**
   - 微信：CSS 属性白名单校验
   - 小红书：字数/段落/emoji 密度检测
   - 知乎：Mermaid/HTML 标签警告
   - 图片尺寸/比例建议

6. **富文本复制增强**
   - navigator.clipboard.write API
   - ClipboardItem 双格式（text/html + text/plain）
   - 复制成功提示 + 平台粘贴指引

---

## 七、来源参考

### 开源项目
- [doocs/md](https://github.com/doocs/md) — 11.8K Stars, Vue3 微信 Markdown 编辑器
- [jaywcjlove/wxmp](https://github.com/jaywcjlove/wxmp) — 524 Stars, 微信公众号 Markdown 编辑器
- [alchaincyf/huasheng_editor](https://github.com/alchaincyf/huasheng_editor) — 花生公众号排版器
- [shaogefenhao/md2oa](https://github.com/shaogefenhao/md2oa) — Markdown 转微信 HTML
- [yanxi123-com/md2weixin](https://github.com/yanxi123-com/md2weixin) — Markdown 转微信
- [miracleyoo/Markdown4Zhihu](https://github.com/miracleyoo/Markdown4Zhihu) — Markdown 转知乎
- [NowhereMan-in-Galaxy/xiaohongshu-text-layout](https://github.com/NowhereMan-in-Galaxy/xiaohongshu-text-layout) — 小红书排版

### 技术文章
- [从 Markdown 到公众号：基于原生 DOM 实现跨平台内容复制](https://juejin.cn/post/7433066208826638355)
- [微信公众号图文 HTML/CSS 支持情况解析](https://www.axtonliu.ai/newsletters/ai-2/posts/wechat-article-html-css-support)
- [公众号图文编辑器开发必备技能：样式内联化和富文本粘贴攻略](https://juejin.cn/post/7368777511953809434)
- [和微信公众号编辑器战斗的日子](https://zhuanlan.zhihu.com/p/84015464)
- [一键完成 Markdown 导入知乎的完美解决方案](https://zhuanlan.zhihu.com/p/339130036)
- [9.2K Star！微信排版神器技术架构解析](https://cloud.tencent.com/developer/article/2518353)

### 工具和平台
- [md2wechat.com](https://www.md2wechat.com/) — 在线微信 Markdown 编辑器
- [Reditor](https://reditorapp.com/) — 小红书编辑器
- [md.hi-dhl.com](https://md.hi-dhl.com/) — Markdown 转小红书海报
- [uplog.cc](https://uplog.cc/) — 小红书创作工具
