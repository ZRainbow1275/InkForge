# 04 - 平台 CSS 合规性

## 问题描述

导出到微信/小红书/知乎三个平台后，实际粘贴到平台编辑器中的渲染效果与 InkForge 预览不一致。核心原因是各平台对 CSS 的支持程度差异巨大。

## 平台 CSS 约束矩阵

| CSS 特性 | 微信公众号 | 小红书 | 知乎 |
|----------|-----------|--------|------|
| `display: flex` | 不支持 | 不支持 | 支持 |
| `display: grid` | 不支持 | 不支持 | 不支持 |
| `display: table-cell` | 支持 | 支持 | 支持 |
| `position: absolute/fixed` | 不支持 | 不支持 | 部分 |
| `box-shadow` | 支持 | 不支持 | 支持 |
| `border-radius` | 支持 | 支持 | 支持 |
| `background-image` | 不支持 | 不支持 | 不支持 |
| `background-color` | 支持 | 支持 | 支持 |
| `max-width` | 支持 | 支持 | 支持 |
| `float` | 支持(慎用) | 不支持 | 支持 |
| 外部链接 `<a href>` | 不支持(自动剥离) | 不支持 | 支持 |
| `<img>` 外链 | 需 HTTPS | 需 HTTPS | 需 HTTPS |
| `font-family` | 仅系统字体 | 仅系统字体 | 仅系统字体 |
| `@media` queries | 不支持 | 不支持 | 不支持 |
| `calc()` | 部分 | 不支持 | 支持 |
| `CSS variables` | 不支持 | 不支持 | 不支持 |
| 内联 `style` | 必须 | 必须 | 支持 |
| `<style>` 标签 | 部分支持(不可靠) | 不支持 | 支持 |

## 解决方案

### 1. WeChat 导出引擎优化 (wechat.ts)

参考 doocs/md 的 11 步转换管线：

```typescript
// 核心原则：所有布局使用 table-cell，所有样式内联

// Step 1: 代码块 — 使用 table-cell 替代 flex
function convertCodeBlock(html: string): string {
  // 行号使用 display: table-cell 布局
  // 代码内容使用 display: table-cell 布局
  // 整体使用 display: table + table-layout: fixed
}

// Step 2: 引用块 — 使用 border-left + padding
function convertBlockquote(html: string): string {
  // border-left: 4px solid {accentColor}
  // padding: 16px 20px
  // margin: 20px 0
  // background: {accentColorLight}
}

// Step 3: 表格 — 使用 display: table 系列
function convertTable(html: string): string {
  // display: table, table-row, table-cell
  // border-collapse: collapse
  // 奇偶行交替背景色
}

// Step 4: 脚注转换
function convertFootnotes(html: string): string {
  // 微信不支持锚点跳转
  // 使用上标数字 + 文末引用列表
}

// Step 5: CSS 内联化（juice + 自定义后处理）
function inlineAllStyles(html: string, css: string): string {
  // 1. juice(html, { extraCss: css })
  // 2. 移除所有 class、id 属性
  // 3. 移除所有 <style> 标签
  // 4. 移除所有 data-* 属性
}
```

### 2. 小红书导出引擎优化 (xiaohongshu.ts)

```typescript
// 小红书特色：简约风格 + 表情符号装饰

// Step 1: 标题装饰
function decorateHeadings(html: string, preset: XhsPreset): string {
  // h1: 加大字号 + 粗体 + 下划线装饰
  // h2: 中等字号 + 分隔线
  // 可选表情前缀（用户配置）
}

// Step 2: 图片处理
function processImages(html: string): string {
  // 所有图片必须 HTTPS
  // 添加圆角和外边距
  // max-width: 100%
}

// Step 3: 链接处理
function processLinks(html: string): string {
  // 小红书不支持外部链接
  // 将链接文本保留，href 移除
  // 可选：将链接转为脚注
}
```

### 3. 知乎导出引擎优化 (zhihu.ts)

```typescript
// 知乎最宽松，但有自己的特色需求

// Step 1: 代码高亮
function enhanceCodeBlocks(html: string, theme: CodeTheme): string {
  // 支持 highlight.js 主题
  // 添加语言标签
  // 行号显示
}

// Step 2: 表格增强
function enhanceTables(html: string): string {
  // 支持 box-shadow
  // 表头固定样式
  // 响应式宽度
}

// Step 3: 链接保留
function processLinks(html: string): string {
  // 知乎支持外部链接
  // 添加 target="_blank" rel="noopener"
}
```

### 4. 平台一致性测试框架

```typescript
// tests/export/platform-compliance.test.ts

/**
 * 平台合规性测试
 * 验证导出 HTML 不包含目标平台不支持的 CSS 属性
 */
const WECHAT_FORBIDDEN_CSS = [
  'display:\\s*flex',
  'display:\\s*grid',
  'position:\\s*(absolute|fixed)',
  'background-image',
  'var\\(--',
  '@media',
]

function validatePlatformCompliance(html: string, platform: Platform): string[] {
  const violations: string[] = []
  const forbidden = platform === 'wechat' ? WECHAT_FORBIDDEN_CSS : /* ... */

  for (const pattern of forbidden) {
    if (new RegExp(pattern, 'i').test(html)) {
      violations.push(`Contains forbidden CSS: ${pattern}`)
    }
  }

  return violations
}
```

## 修改文件清单

### 需要修改
| 文件 | 修改内容 |
|------|----------|
| `src/services/export/wechat.ts` | 重构为 doocs/md 风格的多步管线 |
| `src/services/export/xiaohongshu.ts` | 增强图片/链接处理 |
| `src/services/export/zhihu.ts` | 增强代码/表格渲染 |
| `src/services/export/utils.ts` | 添加 CSS 属性过滤工具 |
| `src/services/export/themes.ts` | 确保主题 CSS 仅使用平台安全属性 |

### 需要创建
| 文件 | 说明 |
|------|------|
| `src/services/export/platform-validator.ts` | 平台 CSS 合规性验证器 |

### 依赖添加
- 无新依赖（已有 marked, juice, DOMPurify, highlight.js）

## 验证标准

1. WeChat 导出 HTML 不包含 flex/grid/position:absolute/CSS变量
2. 小红书导出 HTML 不包含外部链接 href
3. 所有平台导出的图片 URL 为 HTTPS
4. 代码块在三个平台中均正确渲染（带行号、语法高亮）
5. 表格在三个平台中均使用 table/table-cell 布局
6. 内联样式正确应用（无残留 class/id）
7. 经过剪贴板粘贴到实际平台后视觉效果与预览一致

## 优先级

**P1** — 核心导出质量
