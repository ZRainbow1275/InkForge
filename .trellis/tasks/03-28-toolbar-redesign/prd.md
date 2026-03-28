# FloatingToolbar 视觉重设计

## 规格参考
- `prompts/0327/05-toolbar-complete-spec.md` (工具栏规格)
- `prompts/0327/09-ui-polish-spec.md` (UI打磨)

## Goal
将当前 5 行深色块状工具栏重设计为符合 Ethereal Constructivism 设计语言的紧凑浮动工具栏。

## Requirements

### 1. 视觉风格重设计
- **删除**: 深色背景 (#2d2d2d 或 slate-800)
- **删除**: 行间分割线 (border-bottom)
- **新背景**: `background: rgba(255,255,255,0.95); backdrop-filter: blur(20px);`
- **圆角**: `border-radius: 12px` (rounded-xl)
- **阴影**: `box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);`
- **边框**: `border: 1px solid rgba(0,0,0,0.06);`

### 2. 按钮布局
- **单行水平排列**，溢出时 `flex-wrap: wrap` 自动换行
- **按钮分组用 8px 间距**替代分割线 (gap: 2px 组内, margin-left: 8px 组间)
- **按钮尺寸**: 28x28px, border-radius: 6px
- **按钮颜色**: 图标 slate-600, hover 背景 rgba(211,47,47,0.08)
- **激活态**: 背景 rgba(211,47,47,0.12), 图标 #D32F2F
- **分组结构**:
  - 组1: B I U S Code Highlight Color (格式)
  - 组2: 上标 下标
  - 组3: H1 H2 H3
  - 组4: 引用 无序 有序 任务 (块级)
  - 组5: 左 中 右 两端 (对齐)
  - 组6: 链接 代码块 分割线 表格 (插入)

### 3. 窄屏 Compact 模式
- 当 `.editor-paper` 宽度 < 480px 时启用
- 只显示核心 6 按钮: Bold, Italic, Underline, Link, Heading, CodeBlock
- 末尾显示 "更多" 按钮 (MoreHorizontal 图标)
- 点击 "更多" 展开完整工具栏

### 4. 交互行为保持不变
- 选中文本时出现，空选区时隐藏
- 位置跟随选区中心
- 边界检测防止溢出 (已有逻辑保留)

## Acceptance Criteria
- [ ] 工具栏白色毛玻璃背景 + 微阴影
- [ ] 按钮单行排列，分组用间距区分
- [ ] 按钮 28x28, hover/active 态使用品牌红色
- [ ] 窄屏 compact 模式生效
- [ ] TypeScript 零错误
- [ ] 所有 28 个按钮功能不变

## Technical Notes
- 主要修改 FloatingToolbar.vue 的 template 和 style
- 保持 script setup 逻辑不变
- compact 模式需要新增 ref<boolean> 和切换逻辑
