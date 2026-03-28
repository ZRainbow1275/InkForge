# EditorStatusBar 视觉清理

## 规格参考
- `prompts/0327/09-ui-polish-spec.md` (UI打磨)

## Goal
清理 EditorStatusBar 的视觉层级，使其紧凑、清晰、不抢编辑器焦点。

## Requirements

### 1. 整体布局
- **高度**: 压缩到 32px (从当前约 40px)
- **字体**: 统一 12px
- **颜色层级**: 主要信息 slate-600, 次要信息 slate-400
- **间距**: 元素间 gap: 8px, 分隔符用 1px solid slate-200 竖线
- **背景**: 保持白色/透明，底部 1px border-top slate-200

### 2. 左侧区域 (统计信息)
- 保留: 字数 (T N字) + 段落数 (N段) + 阅读时间 (N分钟)
- 移除或简化: 点击展开详细统计的交互（保持只读文本显示）
- 格式: `T 123字 | 5段 | 2分钟`

### 3. 中部区域
- **可读性评分**: 将当前的圆圈+字母("A")改为文字 `可读性 87`
- **写作目标**: 将进度条+分数改为紧凑文字 `123/1000`，点击可编辑目标值

### 4. 右侧区域
- 保留: 编辑模式按钮 (Typora/Source)
- 保留: 同步状态 (待同步 N)
- 保留: 保存状态 (已保存/保存中)
- 保留: 行列位置 (行 N:M)
- 移除: 渲染耗时显示 (开发调试信息，不应在生产UI显示)

### 5. 视觉一致性
- 所有图标尺寸: 14px
- 文字不加粗 (font-weight: normal)
- 编辑模式按钮: 保持 pill 形状但缩小 padding

## Acceptance Criteria
- [ ] 状态栏高度 32px
- [ ] 字体统一 12px, slate-600/400 颜色层级
- [ ] 可读性评分为文字显示
- [ ] 写作目标为紧凑数字显示
- [ ] 渲染耗时移除
- [ ] TypeScript 零错误

## Technical Notes
- EditorStatusBar.vue 是主要修改文件
- WritingGoal.vue 可能需要修改（如果进度条在那里）
- 保持所有 props 和 emits 接口不变
