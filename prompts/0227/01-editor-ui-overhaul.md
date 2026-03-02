# 01 - 编辑器 UI 全面改造 Spec

## 目标
将编辑器从"原型级"提升至"企业级"视觉品质，消除所有视觉缺陷。

## 核心修改

### 1.1 EditorPanel.vue — 移除黑框
**当前问题**：`border-left: 2px solid #2c3e50` 产生丑陋的大黑框
**修复方案**：
```css
/* 移除 */
border-left: 2px solid #2c3e50;
/* 替换为 */
border-left: 1px solid var(--border); /* #ECEFF1 */
box-shadow: -1px 0 0 0 var(--border);
```

### 1.2 工具栏改造 — 从固定顶栏改为悬浮气泡
**当前**：固定在编辑器顶部的工具栏（toolbar class）
**目标**：选中文字时出现的悬浮工具栏（Bubble Menu）

技术方案：
- 安装 `@tiptap/extension-bubble-menu`
- 创建 `FloatingToolbar.vue` 组件
- 移除 EditorPanel.vue 中的固定 toolbar 区域
- BubbleMenu 包含：B / I / U / S / Link / Color / Code / H2 / H3

### 1.3 编辑器排版美化
- 背景色：#FAFBFC（宣纸色）
- ProseMirror 编辑区 padding 增大到 32px 48px
- 正文字体：'Noto Serif SC', Georgia, serif
- 字号：16px，行高：1.618 倍（黄金比）
- 段间距：1.5em
- 标题间距优化：H2 margin-top 2em, H3 margin-top 1.5em
- 引用块左边框颜色使用 --accent-primary (#D32F2F)

### 1.4 模式切换标签优化
**当前**：扁平的按钮，选中时用主色填充
**目标**：下划线指示器风格，更克制优雅
```css
.mode-tabs button.active {
  background: transparent;
  color: var(--accent-primary);
  border-bottom: 2px solid var(--accent-primary);
}
```

### 1.5 版本选择器和操作按钮区美化
- 版本选择器使用 pill 形状
- 操作按钮间距调整
- "复制到公众号"按钮保持微信绿 (#07c160)

## 2. WorkstationView 布局优化

### 2.1 移除预览面板顶部的平台说明文字
当前预览面板顶部有显示"微信公众号"/"小红书"/"知乎"的标签说明，需要简化为仅图标切换。

### 2.2 面板间距优化
- Manager 面板与编辑器之间：1px 分隔线或 4px 间隙
- 编辑器与 Stage 之间：无间隙，通过微妙阴影区分
- 所有面板 border-radius: 0（无圆角，构成主义风格）

### 2.3 Stage（预览）面板改造
- 移除手机顶部的"平台名称"文字
- 预览内容嵌入 iframe 避免 CSS 污染
- 预览背景保持白色
- 切换平台时使用淡入淡出过渡

## 3. 新增组件

### 3.1 FloatingToolbar.vue
```vue
<!-- 悬浮工具栏 —— 选中文字时出现 -->
<BubbleMenu :editor="editor" :tippy-options="{ duration: 150 }">
  <div class="floating-toolbar">
    <button @click="toggleBold">B</button>
    <button @click="toggleItalic">I</button>
    <!-- ... -->
  </div>
</BubbleMenu>
```

样式要求：
- 背景：rgba(38, 50, 56, 0.95)（深灰半透明）
- 文字：白色
- 圆角：8px
- 间距：按钮 32x32，间隔 2px
- 阴影：0 4px 12px rgba(0,0,0,0.15)
- 动画：scale 0.95 → 1.0, opacity 0 → 1

## 验收标准
- [ ] 编辑器无黑框，边框为 1px 浅色
- [ ] 工具栏为悬浮气泡形式
- [ ] 编辑器排版优雅（宣纸色背景、黄金比行高）
- [ ] 预览面板无多余平台说明文字
- [ ] 面板间过渡流畅
