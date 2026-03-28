# 编辑器 FloatingToolbar 修复

## 问题清单 (来自用户截图标注)

### P1: Typora 模式下 FloatingToolbar 不弹出
- 用户在 Typora 模式选中文字后，FloatingToolbar 没有弹出
- 可能原因：FloatingToolbar 的 `updateToolbar()` 没有被正确调用，或者定位计算出错
- 需要：确保 EditorPanel.vue 中的 FloatingToolbar 接收了正确的 editor prop，且 selectionUpdate 事件被监听

### P2: FloatingToolbar 位置与文本冲突 (图10/11)
- 工具栏出现在文字上方但位置不稳定 — 有时显示在选区上方，有时显示在选区下方
- 两张截图显示不同的布局：一张有分隔符在正确位置，另一张分隔符消失且按钮排列异常
- 需要：
  1. 工具栏始终定位在选区**上方** 50px
  2. 如果上方空间不够（靠近编辑器顶部），翻转到选区**下方**
  3. 确保 `transform: translateX(-50%)` 水平居中生效
  4. 确保 `.toolbar-sep` 分隔符在所有情况下正确显示

### P3: FloatingToolbar 按钮布局不一致
- 图10 和图11 显示两种不同的按钮排列方式，说明有 CSS 冲突
- 需要：检查是否有旧的 `.floating-toolbar` CSS 残留（可能 design-system.css 或其他全局样式在覆盖），确保只有一套样式生效

### P4: FloatingToolbar 在 Source 模式不应出现
- Source 模式使用 CodeMirror，不需要 TipTap 的 FloatingToolbar
- 需要：确认 FloatingToolbar 只在 Typora 模式下渲染（通过 EditorPanel 的 v-if 控制）

## 影响文件
- `inkforge/src/components/editor/FloatingToolbar.vue` — 定位逻辑和 CSS
- `inkforge/src/components/editor/EditorPanel.vue` — FloatingToolbar 集成
- `inkforge/src/styles/design-system.css` — 检查全局样式冲突

## 验收标准
- [ ] Typora 模式选中文本后 FloatingToolbar 弹出
- [ ] 工具栏定位稳定（上方50px，空间不够时翻转到下方）
- [ ] 分隔符正常显示
- [ ] 按钮排列一致，无 CSS 冲突
- [ ] Source 模式无 FloatingToolbar
- [ ] TypeScript 零错误
