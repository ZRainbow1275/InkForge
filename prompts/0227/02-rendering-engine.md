# 02 - 三平台渲染引擎优化 Spec

## 目标
确保微信公众号、小红书、知乎三平台的渲染效果与各平台编辑器中的显示效果一致。

## 核心原则
- 左侧编辑器的内容通过平台专属渲染管线处理
- 右侧预览直接展示处理后的 HTML
- 预览使用 iframe 隔离 CSS，确保渲染准确

## 1. 微信公众号渲染优化

### 1.1 CSS 内联确保完整
- 所有 CSS 变量 `var(--xxx)` 必须在 juice 内联前替换为具体值
- 验证 juice 内联后所有样式都在 style 属性上
- 后处理移除 `display: flex/grid` 等不支持属性

### 1.2 排版参数
- 正文字号：15-16px
- 行高：1.75-1.8
- 字间距：0.03-0.05em
- 段间距：1.5em
- 字体栈：-apple-system-font, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif

### 1.3 标题装饰优化
现有 6 种标题装饰（applyHeadingDecorations）需验证在微信中的显示效果：
- stars（金色星号）
- brackets（书名号）
- gradient（渐变底色）
- highlight（高亮标记）
- underline（下划线装饰）
- none（无装饰）

### 1.4 代码块处理
- 使用 highlight.js inline style 渲染
- Mac 风格三色圆点装饰
- 语言标签右上角显示
- 代码字体：Menlo, Consolas, monospace

### 1.5 外链转脚注
- 非 mp.weixin.qq.com 链接自动转为底部编号引用
- 脚注区域样式统一

## 2. 小红书渲染优化

### 2.1 格式简化
- 移除所有复杂 CSS，保留基础排版
- 段落短小精悍（每段 2-4 行）
- 行间距大（line-height: 2.0）
- emoji 标题装饰

### 2.2 预设主题
5 种预设需验证效果：
- xhs-fresh（清新少女）：粉色系 + 花朵 emoji
- xhs-minimal（极简高级）：灰黑 + 几何符号
- xhs-warm（温暖治愈）：暖橙 + 爱心 emoji
- xhs-tech（科技数码）：蓝紫 + 闪电 emoji
- xhs-nature（自然清新）：绿色 + 叶子 emoji

### 2.3 外链处理
- 完全剥离所有 `<a>` 标签，只保留文字
- 图片链接保留

## 3. 知乎渲染优化

### 3.1 Markdown 保留
- 直接输出 Markdown 格式
- LaTeX 公式保持 `$...$` 和 `$$...$$` 语法
- 代码块保持 ``` 语法

### 3.2 预设主题
3 种预设：
- zhihu-academic（学术论文）：引用脚注 + 严谨排版
- zhihu-tech（技术博客）：Mac 代码块 + 行号
- zhihu-insight（深度评论）：强调色引用块

## 4. 预览面板改造

### 4.1 iframe 隔离
```vue
<iframe
  ref="previewFrame"
  :srcdoc="renderedHtml"
  class="preview-iframe"
  sandbox="allow-same-origin"
/>
```

### 4.2 平台切换
- Tab 切换方式
- 切换时重新渲染
- 保持滚动位置

### 4.3 设备仿真
- iPhone 15 Pro 框架（375x812）
- Android（360x800）
- 支持缩放查看

## 验收标准
- [ ] 微信渲染效果与微信编辑器中粘贴后的效果一致
- [ ] 小红书渲染效果简洁美观，emoji 装饰正确
- [ ] 知乎渲染保留 Markdown 原生格式
- [ ] 预览面板使用 iframe 隔离 CSS
- [ ] 12 种微信预设全部渲染正确
- [ ] 5 种小红书预设全部渲染正确
- [ ] 3 种知乎预设全部渲染正确
