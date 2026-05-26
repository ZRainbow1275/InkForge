# topic-5: fix-option-space

## 调查问题

枚举解决 exit-btn / 顶栏按钮重叠的可能修复方向，列出每个的 pros / cons / 影响面，**不做选择**。

## 调查方法

综合 topic-1 ~ topic-4 的事实：
- exit-btn fixed top:18, right:20, z-index:120, opacity 0.3→0.8 hover
- header 保留全部按钮（复制/导出/专注/4 layout-preset/split/发布），opacity 0.3 dim
- spec 21 §4.2 要求 ToolBar 隐藏，但用户铁律"header 0.3 不改"
- 物理重叠是根因

## 关键发现

### 修复方向 A：focus mode 隐藏发布/复制/模式 tabs（仅留退出/进出 focus 按钮）

**实现位置**: `WorkstationView.vue:5541` 附近新增

```css
.focus-mode .header-actions > .icon-btn:not(.focus-toggle),
.focus-mode .header-actions > .layout-presets,
.focus-mode .header-actions > .publish-btn { display: none; }
```

（需要给 focus toggle icon-btn 加一个 class 用于例外，或保留所有 icon-btn 隐藏，仅保留 exit-btn 浮层）

**Pros**:
- 贴合 spec 21 §4.2「ToolBar 隐藏」设计意图。
- 物理上彻底消除重叠（按钮不存在 → 不可能撞）。
- header 保留 logo + title + status pill，dim 0.3 保留 → 满足用户"header 0.3 不改"铁律。

**Cons**:
- 用户在 focus 模式下无法直接点击发布/导出/复制——需要靠快捷键或先退出 focus。spec 21 §4.3 没有把这几个 action 列入"保留"清单，似乎是 acceptable，但实际用户习惯可能依赖。
- layout-presets 4 个 tab 也消失了，用户在 focus 模式无法直接切到 写作/审阅 预设——必须先退出 focus。但用户进入 focus 之后切预设并不常见。
- 需要决定哪些 icon-btn 留：focus toggle 自己需不需要保留？目前 exit-btn 已经能退出，重复保留 icon-btn 的 focus toggle 是冗余。

**影响面**:
- `WorkstationView.vue`：新增 CSS 选择器 1 处（约 5 行）
- 无 template 改动（仅 CSS hide）
- spec 13/21 文档可能需要更新一句注记
- 测试：focus mode 截图测试需更新

---

### 修复方向 B："退出专注 Esc" 重定位到顶部正中、独立浮层

**实现位置**: `WorkstationView.vue:5486-5510` `.focus-exit-btn` CSS 改

```css
.focus-exit-btn {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  /* 删除 right: 20px */
  ...
}
```

**Pros**:
- header 完全不动（满足用户铁律）。
- 退出按钮居中视觉上很显眼，符合"主要 affordance"地位。
- spec 21 §4.3 说的"右上角固定位置"是 hint，不是强约束——居中也可接受。

**Cons**:
- 顶部正中位置在 header 内仍可能与 `.header-title-input`（中央 title 输入框）重叠。.header-title flex:1 撑开，title input min-width:280 max-width:400 居中布局，正好与 fixed top:18 left:50% 的 exit-btn 重叠。需要进一步左偏或下移到 status pill 上方。
- focus mode 下编辑区居中显示，正中顶部刚好是用户视线焦点上方——分散注意力。

**影响面**:
- 仅 `.focus-exit-btn` CSS 几行
- 需要重新视觉验证 title input 与 exit-btn 互不遮挡
- spec 21 §4.3 文字"右上角"需注记或微调

---

### 修复方向 C：移除顶栏 0.3 dim，提升退出按钮 z-index

**实现位置**: 删除 `.focus-mode .workstation-header { opacity: 0.3 }` (5541-5548)，保留 exit-btn 原位 + z-index

**Pros**:
- 实现最简单——删 4 行 CSS。
- header 完全不透明 + exit-btn 高 z-index 在前 → 视觉清晰，无半透明叠加。

**Cons**:
- **直接违反用户铁律 "header 0.3 不改"**。这条 prompt 明示。
- header 不 dim → focus mode 视觉冲击减弱，沉浸感差。
- exit-btn 仍物理重叠在 publish-btn 上方（z-index 高所以遮住），用户视觉上"看不到发布按钮"，但点击穿透问题没变——pointer-events 总会落在 exit-btn 上。

**影响面**:
- 仅 CSS 几行删除
- **但违反铁律 → 应不选择，除非用户撤回铁律**

---

### 修复方向 D：在右侧给"退出专注 Esc" 预留 padding-right reserve

**实现位置**: `WorkstationView.vue:5541` 区域新增

```css
.focus-mode .workstation-header {
  opacity: 0.3;
  padding-right: 160px;     /* 给 exit-btn 腾位置 */
  transition: ...;
}
```

或在 `.header-actions` 上加 reserve。

**Pros**:
- header dim 不改，按钮全保留。
- 物理腾出 exit-btn 区域 → 不重叠。

**Cons**:
- header 内"右段空白 160px + exit-btn 浮在空白上"视觉上很突兀，看起来像 layout bug。
- 窄屏（max-width: 900px）下 header 已经 flex-wrap，reserve 不一定生效，需要 media query 适配。
- 不解决根本问题（exit-btn 仍 fixed 在 header 同一行），只是把按钮挤左。
- 用户视觉上发布按钮位置变了（原本贴右沿，现在距右沿 160px+），可能引发新的"为什么按钮移位置"困惑。

**影响面**:
- `.focus-mode .header-actions` / `.workstation-header` 新增 padding-right
- 窄屏 media query 需补充
- 视觉验证需求高

---

### 修复方向 E：把"退出专注 Esc" 换成 floating action button（右下角 / 顶部中央 / 编辑区右上）

**变体 E1**: **右下角浮按钮**
```css
.focus-exit-btn { position: fixed; bottom: 24px; right: 24px; top: auto; ... }
```

**变体 E2**: **顶部中央**（同 B）

**变体 E3**: **编辑区内右上角**（相对编辑区 panel-editor）
- 需要把 button 从 `.workstation` 根挪到 `.panel-editor` 内
- `position: absolute; top: 16px; right: 24px;` 相对 `.panel-editor`

**Pros (通用)**:
- 物理避开 header 区域，header dim 不改（满足铁律）。
- floating UI 在 modern apps 常见（VS Code 右下角浮窗、Figma 右下角控件），用户接受度高。
- 编辑区右上角变体 (E3) 在编辑区域内浮，焦点更近，spec §4.3 "右上角固定位置"可以解读为"编辑区右上"而非"视口右上"。

**Cons**:
- E1（右下角）可能与 status bar / 番茄钟 (spec §8.3"专注模式下番茄钟显示在编辑区底部中央") / writing assist panel 浮按钮冲突。
- E2 顶部中央 — 见方向 B 的 Cons。
- E3 编辑区右上 — 需要从 `.workstation` 根移到 `.panel-editor` 内，template 改动比纯 CSS 大；但 spec 21 §4.4 描述的 `focus-mode-shell` 本就是 fixed inset:0 容器，把 exit-btn 放进 shell 是符合设计的。
- 整体 UI 风格变化（从 header 浮层 → editor-area 浮层），需要视觉一致性 review。

**影响面 (E3 为代表)**:
- `WorkstationView.vue` template 改 1 处（exit-btn 移位置）+ CSS 改定位
- 可能引入 `.focus-mode .panel-editor` 容器关系（需要 position: relative）
- spec 21 §4.3 可补充"位置可在 editor 区右上"

---

### 综合对照表

| 方向 | 改动量 | 满足用户铁律(0.3 dim 不改) | 贴合 spec 21 §4.2 | 物理消除重叠 | 视觉新风险 |
|---|---|---|---|---|---|
| A 隐藏 header-actions | 小 (CSS 1 处) | ✓ | 部分（ToolBar 隐藏的精神） | ✓ | 用户可能想要保留发布快捷入口 |
| B 顶部中央 | 小 (CSS) | ✓ | 改变"右上角" hint | ✓ | 与 header-title 重叠 |
| C 删 0.3 dim | 最小 (CSS 删 4 行) | ✗ 违反 | 部分 | ✗ 物理仍重叠 | 沉浸感降低，违反铁律 |
| D padding-right reserve | 中（CSS + media query） | ✓ | 不变 | ✓ | header 视觉怪 |
| E3 编辑区右上 | 中（template 改 + CSS） | ✓ | spec 友好 | ✓ | 风格不一致需 review |

## 对修复的指导意义

- 若优先满足用户铁律 "header 0.3 不改"：可选 A / B / D / E。
- 若优先满足 spec 21 §4.2 隐藏 ToolBar 精神：A 最佳。
- 若优先实现简单、影响面最小：A 或 B（A 略胜，因为 B 仍有 header-title 重叠隐患）。
- 若担心 A 误删用户需要的发布快捷入口：可改 A 变体——只隐藏 layout-presets + publish-btn，保留 icon-btn 复制/导出/focus toggle/split，再把 exit-btn 移到顶部中央或编辑区右上。
- 不建议方向 C（违反明确用户铁律）。
- 推荐**额外加固**：所有方向都建议给 exit-btn 加 `aria-label="退出专注模式"` 并把焦点点击区扩大，无论选哪个方向都对可访问性有益。
