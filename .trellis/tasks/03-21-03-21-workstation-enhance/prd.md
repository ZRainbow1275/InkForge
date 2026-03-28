# Workstation 工作台增强

## Goal
消除 Workstation 中的功能冗余，统一视觉规格，补齐文件管理/版本对比/同步三大核心链路，增强编辑器辅助功能。

## Priority
P1 — 与 Hub 可并行，依赖 data-model-upgrade 完成

## Requirements

### 移除冗余元素
- 删除 Stage 面板下方的预设快速选择区域
- 删除 Stage 面板下方的"复制到平台"/"全屏导出"按钮
- 仅保留平台 Tab 切换 + iPhone 设备框预览

### 面板标题统一
- Files/Versions/Outline 标题统一为：13px / 600 weight / #607D8B / 0.02em spacing

### 文件管理增强
- DraftBox.vue：草稿箱（status='draft' 文档列表）
- AssetPreview.vue：素材缩略图预览网格
- 文件树排序（name/updated/words）
- 文档拖拽到分类、inline 重命名、复制

### 版本对比重写
- utils/diff.ts：Myers diff 算法实现
- DiffViewer.vue：unified + side-by-side 双模式
- VersionDiffModal.vue：Props 改为 baseVersion + compareVersion
- 快捷对比按钮（与上一版/与初版）

### 同步功能
- SyncStatusIcon.vue：同步状态图标（5 种状态 x Lucide 图标）
- SyncMenu.vue：下拉菜单（保存本地/同步云端/同步设置）
- 替换 Header 区域的上传图标

### 编辑器增强
- MarkdownHints.ts：TipTap 扩展，标题旁显示 ### 灰色提示
- WritingGoal.vue：写作目标进度条
- Settings 新增 showMarkdownHints / dailyWordGoal 字段

## Acceptance Criteria
- [ ] Stage 面板无冗余预设/按钮
- [ ] 三个面板标题字体大小统一
- [ ] 草稿箱显示 draft 状态文档
- [ ] 版本对比可选择两个版本并展示彩色 diff
- [ ] 同步图标正确反映状态
- [ ] Markdown 语法提示可通过设置开关
- [ ] `pnpm typecheck` 零错误

## Technical Notes
- Spec 参考：`docs/specs/02-workstation-spec.md`
- 11 个新/改组件
- 不改变 TipTap 编辑器核心配置
