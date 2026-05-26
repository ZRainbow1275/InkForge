# topic-2: topbar-layout-in-focus-mode

## 调查问题

完整描述 focus mode 下 `.workstation-header` 的渲染情况：内部子元素、位置、z-index、与 exit-btn 的层叠关系，以及 `opacity: 0.3` dim 在当前场景下的作用。

## 调查方法

阅读 `WorkstationView.vue`:
- template `<header class="workstation-header">` 1985-2208
- CSS `.workstation-header` 3515-3525, `.header-actions` 3632-3637, `.icon-btn` 3639, `.layout-presets` 3675, `.layout-preset-btn` 3685, `.publish-btn` 3705
- CSS `.focus-mode .workstation-header` 5541-5548
- responsive `@media (max-width: 900px)` 4013-4068

## 关键发现

### Header 顶层结构

`WorkstationView.vue:1985-2208`

```vue
<header class="workstation-header">
  <div class="header-brand"> ... InkForge logo ... </div>
  <div class="header-title">
    <input class="header-title-input" />
    <div class="status-pill"> ... </div>
  </div>
  <div class="header-actions">
    <!-- 复制 -->
    <button class="icon-btn" @click="handleCopyToClipboard"> ... </button>
    <!-- 导出 -->
    <button class="icon-btn" @click="showExportModal = true"> ... </button>
    <!-- 专注模式 toggle -->
    <button class="icon-btn" :class="{ active: isFocusMode }" @click="toggleFocusMode"> ... </button>
    <!-- 布局预设 (默认 / 写作 / 审阅 / 专注 4 按钮) -->
    <div class="layout-presets">
      <button v-for="preset in WORKSTATION_LAYOUT_PRESETS"
              class="layout-preset-btn"
              :class="{ active: ... || (preset.id === 'focus' && isFocusMode) }">
        {{ preset.label }}
      </button>
    </div>
    <!-- Split View -->
    <button class="icon-btn" :class="{ active: isSplitViewActive }" @click="toggleSplitView"> ... </button>
    <!-- 发布 CTA -->
    <button class="publish-btn" @click="showExportModal = true">
      <svg ... />
      发布
    </button>
  </div>
</header>
```

预设标签来源 `WorkstationView.vue:217-244`：
- `默认 (default)`
- `写作 (writing)`
- `审阅 (review)`
- `专注 (focus)`

### Header CSS（基线）

`WorkstationView.vue:3515-3525`

```css
.workstation-header {
  height: 52px;
  min-height: 52px;
  background: #FFFFFF;
  border-bottom: 1px solid #ECEFF1;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  backdrop-filter: blur(12px);
  z-index: 10;            /* <<< exit-btn z-index 120 > 10 */
}
```

### Header-Actions / 按钮尺寸

`WorkstationView.vue:3632-3719`

```css
.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.icon-btn { width: 34px; height: 34px; ... }
.layout-presets {
  display: flex; align-items: center; gap: 4px;
  padding: 3px;
  border: 1px solid #E5E7EB; border-radius: 10px;
  background: #FAFBFC;
}
.layout-preset-btn { height: 28px; padding: 0 9px; font-size: 12px; }
.publish-btn { padding: 8px 18px; background: #D32F2F; color: white; font-size: 13px; }
```

水平宽度估算（右侧 4 个 icon-btn × 34 + layout-presets 4tab ≈ 180 + publish ≈ 90，加 gap）约 **480-520px** 全部聚集在 header 右段，**整体右沿**距视口右边缘 16px (`padding: 0 16px`)。

### Focus Mode 下的 Header

`WorkstationView.vue:5541-5548`

```css
.focus-mode .workstation-header {
  opacity: 0.3;
  transition: opacity 0.3s;
}

.focus-mode .workstation-header:hover {
  opacity: 1;
}
```

**关键事实**：focus mode 下整条顶栏（含全部按钮、logo、title、status pill、所有 icon-btn、layout-presets、publish-btn）**全部保留**，仅整体 opacity 降到 0.3，hover 时回到 1。

### Mobile (max-width: 900px)

`WorkstationView.vue:4013-4068` — header 改为 flex-wrap, header-actions 占满宽度 wrap。**但 focus-exit-btn 的 fixed top:18, right:20 不变**，移动端下重叠会更严重，因为按钮 wrap 后右上角依然在顶栏行内。

## 结论

| 元素 | 位置 | z-index | focus mode 表现 |
|---|---|---|---|
| `.workstation-header` | normal flow，顶部 52px 高 | 10 | opacity 0.3，hover 1.0 |
| `.header-actions` 内部按钮 | flex 居右，距视口右沿 16px | (header z-index 10) | 跟随 header dim |
| `.focus-overlay` | fixed inset:0 | 50 | focus mode 时 opacity 1 |
| `.focus-exit-btn` | fixed top:18 right:20 | 120 | opacity 0.3, hover 0.8 |

两者**同处右上角 24-50px 内**：
- exit-btn: top:18px, right:20px → 占据 ~viewport.right(0~80px) × top(18~46px)
- publish-btn 右沿: right:16px, vertical center 26px → 占据 ~viewport.right(16~100px) × top(8~44px)
- layout-presets 右沿: 略微靠左，但 vertical center 同样 ~26px

**0.3 dim 的副作用**：header 整体降透明度，使背后的 exit-btn 文字（白色 on 半透明深灰）穿过 header 显得"叠在按钮上"。但即便去掉 0.3 dim（让 header 完全不透明），exit-btn 仍会覆盖在按钮上方（z-index 120 > 10），只是层叠顺序看起来更"正常"——白字盖红字。

User 上次说"header 0.3 不改"，所以 dim 层不动；冲突根因在**两个元素的物理位置 px 重合**，不是 dim。

## 对修复的指导意义

- header 在 focus mode 下并**未隐藏任何按钮**——4 个 icon-btn + 4 个 layout-preset + 1 个 publish-btn 全保留。
- focus mode 设计本意（spec 21）是**视觉极简**，但当前实现只做了 opacity 0.3，并未真正隐藏右侧操作区——存在 design intent 偏离（参见 topic-4）。
- 修复时若选 "焦点模式隐藏 actions" 路线，可在 `.focus-mode .workstation-header .header-actions { display: none }` 之类一行解决；
- 若选 "保留 actions 但移开 exit-btn" 路线，应把 exit-btn 移到顶部中央或底部中央（不与 header right 区重合）。
