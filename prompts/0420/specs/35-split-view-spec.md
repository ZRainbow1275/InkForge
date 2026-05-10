---
id: 35-split-view-spec
title: SplitView — 分栏视图规范
version: 1.0.0
status: draft
created: 2026-04-21
source_decisions:
  - W-06=D（参考面板/分屏编辑：固定参考、同文档双视图、两文档并排）
  - W-01=A（右栏仅预览；引入右栏模式切换器以兼容分屏场景）
  - W-04=D（双向同步滚动 + 可临时解除）
  - W-03=C（布局随编辑模式记忆）
related_specs:
  - 39-sync-scroll-spec.md
  - 38-toc-system-spec.md
  - 45-tabbar-enhancement-spec.md
  - 48-session-restore-spec.md
---

# SplitView — 分栏视图规范

## 1. 概述与设计意图

分栏视图（SplitView）允许用户在编辑器工作区中同时显示两个面板，典型用例包括：

- **编辑 + 预览并排**：左侧 Typora 或 Source 模式编辑，右侧实时 HTML Preview（只读）
- **同文档双视图**：两个滚动位置不同的视口同时看一份文档的不同段落（长文写作场景）
- **两文档并排对比**：左侧主文档编辑，右侧参考文档只读（写作参考场景）

分栏视图是 W-06=D 决策的直接落地，同时须与 W-01=A（右栏职责）协调。W-01 的"仅预览"约束通过引入右栏模式切换器放宽为可选状态，默认仍是预览。

设计哲学：**分栏是用户主动启用的高效工具，非默认状态**。窄屏下优雅降级，不强制用户适应布局。

---

## 2. 触发与入口

### 2.1 触发方式（共三种）

| 触发方式 | 行为 |
|---------|------|
| `Ctrl+Shift+E` | 在当前活跃 Tab 上切换分栏开启/关闭 |
| 工具栏按钮 | FloatingToolbar 右侧区域增加分栏图标（lucide-vue-next `Columns2`）；已分栏时图标高亮 |
| 命令面板 | 输入 `split view` / `分栏` 可命中 `editor.splitView.toggle` 命令 |

### 2.2 右栏模式切换器

右侧面板顶部提供模式选择器（`RightPanelModeSwitcher`），三个互斥选项：

```
[Preview]  [Reference]  [Split Compare]
```

- **Preview**（默认）：HTML 预览，只读渲染
- **Reference**：加载另一份文档，只读（即"参考文档"模式）
- **Split Compare**：左右均可编辑，两份不同文档并排

模式切换后，右栏内容区平滑替换（fade 过渡 150ms）。

---

## 3. 布局结构

### 3.1 DOM 层级

```
WorkstationLayout
└── EditorPane (flex container, horizontal)
    ├── LeftPane          (主编辑区)
    │   ├── EditorToolbar
    │   └── TipTapEditor
    ├── SplitDivider      (拖拽分割线)
    └── RightPane         (辅助面板)
        ├── RightPanelModeSwitcher
        └── RightPanelContent
            ├── PreviewRenderer    (mode=Preview)
            ├── ReferenceViewer    (mode=Reference)
            └── CompareEditor      (mode=Split Compare)
```

### 3.2 分割线规格

| 属性 | 值 |
|------|----|
| 默认宽度 | 4px |
| 颜色 | `var(--color-border-subtle)` |
| hover 状态 | 颜色加深为 `var(--color-brand-primary)`，cursor: col-resize |
| 拖拽时 | 全局 cursor: col-resize；overlay 遮挡防止 iframe 吞事件 |
| 双击行为 | 重置比例为 50/50，触发 `splitRatioReset` 动画（200ms ease） |
| 最小可拖宽度 | 左栏 ≥ 280px，右栏 ≥ 280px（触碰极限时停止拖拽） |

### 3.3 默认比例与存储

默认比例：**50 / 50**（各占 50%）

用户拖拽调整后比例持久化到 `layoutSplitView.ratio`（0.2 ~ 0.8 浮点数，表示左栏占比）。

---

## 4. 左栏——编辑器行为

### 4.1 编辑模式

左栏支持三种编辑模式，与全局编辑模式联动：

| 模式 | 描述 |
|------|------|
| `typora` | 所见即所得，默认模式 |
| `source` | 原始 Markdown 文本编辑 |
| `preview` | 仅预览（此时分栏无意义；UI 应自动折叠右栏） |

当全局模式切换为 `preview` 时，分栏自动关闭并 Toast 提示："预览模式下不支持分栏"。

### 4.2 左栏工具栏

左栏保留完整 FloatingToolbar（X-01=A：Typora/Source 下行为一致），分栏状态不减少任何按钮。

左栏顶部增加一个内联的模式指示标签（Typora / Source），点击可切换左栏编辑模式（不影响全局模式记忆）。

### 4.3 独立缩放

左右栏各自持有独立的字体缩放状态：

- `Ctrl+滚轮`：调整当前光标所在栏的字体大小（`font-size` 基准值 ±2px，范围 12px~24px）
- 快捷键 `Ctrl+=` / `Ctrl+-`：同上，作用于焦点栏
- 缩放状态存储于 `layoutSplitView.leftFontScale` / `layoutSplitView.rightFontScale`

---

## 5. 右栏——Preview 模式

### 5.1 渲染器

右栏 Preview 使用 `PreviewRenderer` 组件，该组件接收 TipTap 的 HTML 输出并进行：

1. 清洗（DOMPurify）
2. 应用 Stage CSS（与导出预览共用同一套样式变量）
3. 可选：应用目标渠道（微信公众号 / 默认 Web）的 CSS 框架

渲染更新策略：编辑器内容变化 → debounce 200ms → `PreviewRenderer` 接收新 HTML → 局部 DOM diff 更新（避免整体重绘导致滚动位置跳动）。

### 5.2 只读保护

Preview 模式下右栏不可编辑：

- `contenteditable` 设为 `false`
- 禁用所有 TipTap 命令
- 鼠标点击文本不触发光标
- 可选中文本（便于复制），但选中后不触发 FloatingToolbar

### 5.3 右栏工具栏（最简）

Preview 模式右栏顶部只显示：

```
[模式选择器]                    [同步滚动开关] [在新窗口打开]
```

- **同步滚动开关**：图标 `Link` / `LinkOff`（lucide），切换 39-sync-scroll 的双向锁定
- **在新窗口打开**：仅在 Tauri 多窗口场景下显示（L1-53=C）

---

## 6. 右栏——Reference 模式

### 6.1 参考文档选择

右栏顶部显示文档选择器（`ReferenceDocPicker`）：

- 输入框实时搜索当前 Vault 内文档（调用 SearchEngine 的标题快搜）
- 选择后加载参考文档 HTML（只读渲染）
- 最近使用的参考文档列表缓存于 `layoutSplitView.recentRefDocs`（最多 5 条）

### 6.2 参考文档只读渲染

与 Preview 模式共用 `PreviewRenderer`，但数据源是参考文档的 `content` 字段而非当前编辑文档。

参考文档的章节滚动是独立的，不参与 SyncScroll（不强制关联，用户可选）。

### 6.3 状态持久化

关闭分栏后重新打开，Reference 模式记住上次选择的参考文档（`layoutSplitView.refDocId`）。

---

## 7. 右栏——Split Compare 模式

### 7.1 两文档并排

Split Compare 模式下左右各是独立的 TipTap 编辑器实例，分别打开不同文档：

- 左栏：当前 TabBar 活跃文档（可编辑）
- 右栏：由用户从 `CompareDocPicker` 选择的另一文档（可编辑）

两栏各自拥有独立的 Tab 状态（脏标记、自动保存等）。

### 7.2 冲突防范

若右栏文档与左栏文档相同（用户误选），系统拒绝并提示："不能在两栏中打开同一文档，请选择不同文档"。

### 7.3 保存行为

两栏各自独立触发自动保存（AutoSave）。`Ctrl+S` 保存当前焦点栏所在文档。

---

## 8. 同步滚动

### 8.1 默认行为

Preview 模式下分栏默认开启同步滚动（SyncScroll）。算法详情见 **39-sync-scroll-spec.md**。

Reference 模式和 Split Compare 模式下同步滚动默认关闭，用户可手动开启。

### 8.2 临时解除（W-04=D）

右栏工具栏的同步滚动图标点击后：

- 图标变为 `LinkOff` 状态
- 双侧滚动完全独立
- 状态存于 `layoutSplitView.syncScrollEnabled`
- 关闭分栏后重新打开，恢复上次状态

### 8.3 滚动边界处理

- 左侧到顶：右侧强制定位到顶部
- 左侧到底：右侧强制定位到底部
- 两端边界对齐优先级高于锚点匹配

---

## 9. 响应式与降级

### 9.1 宽度阈值

| 视口宽度 | 行为 |
|---------|------|
| ≥ 1200px | 分栏完全可用，两栏各≥ 280px 保障可读性 |
| 900px ~ 1199px | 分栏可用，但最小化一侧时右栏收至 280px 极限，工具栏自动折叠为图标模式 |
| < 900px | 禁用分栏：若当前处于分栏状态，自动折叠至单栏，Toast 提示："窗口过窄，已退出分栏模式" |

### 9.2 窗口 resize 监听

使用 `ResizeObserver` 监听 `EditorPane` 宽度变化。宽度降至 900px 以下时触发自动折叠，同时将 `layoutSplitView.enabled` 临时置为 `false`（不永久覆盖用户配置）。窗口再次变宽至 900px 以上时，询问用户："是否恢复分栏布局？"（Toast 带操作按钮）。

---

## 10. 存储结构

### 10.1 持久化字段

```typescript
interface LayoutSplitViewState {
  enabled: boolean;               // 是否开启分栏
  ratio: number;                  // 左栏占比，0.2 ~ 0.8，默认 0.5
  leftMode: 'typora' | 'source';  // 左栏编辑模式，默认 'typora'
  rightMode: 'preview' | 'reference' | 'compare'; // 右栏模式
  refDocId: string | null;        // 参考文档 ID（Reference 模式）
  compareDocId: string | null;    // 对比文档 ID（Compare 模式）
  syncScrollEnabled: boolean;     // 同步滚动开关，默认 true（Preview 模式下）
  leftFontScale: number;          // 左栏字体缩放因子，1.0 = 默认
  rightFontScale: number;         // 右栏字体缩放因子，1.0 = 默认
  recentRefDocs: string[];        // 最近参考文档 ID 列表，最多 5 条
}
```

### 10.2 存储位置

存储于 `pinia-plugin-persistedstate` 的 `layoutStore`，key 为 `inkforge_layout_split_view`。

存储粒度：**账户级**（跟随账户数据包，设备独立）。符合 T07-08=C 的账户级优先原则。

### 10.3 编辑模式记忆（W-03=C）

`layoutSplitView.leftMode` 会随全局编辑模式记忆分开存储。Typora 模式切换时记住上次分栏状态，Source 模式切换时记住另一套分栏状态。

存储键：`inkforge_layout_typora_split` / `inkforge_layout_source_split`。

---

## 11. 动画与过渡

### 11.1 开启/关闭动画

分栏开启：右栏从 `width: 0` 过渡至目标宽度（`transition: width 250ms ease`），配合 T09-03=A 的面板折叠规格。

分栏关闭：右栏反向收缩至 `width: 0`，内容淡出（`opacity: 0`，100ms）。

### 11.2 比例调整动画

拖拽分割线时：实时更新，无动画（避免拖拽延迟感）。

双击重置比例：`width` 从当前值过渡至 50%，200ms ease，伴随分割线短暂高亮（品牌色，300ms 后恢复）。

### 11.3 模式切换动画

右栏内容区模式切换：`opacity: 0 → 1`，150ms，避免内容闪烁。

---

## 12. 键盘交互

| 快捷键 | 行为 |
|--------|------|
| `Ctrl+Shift+E` | 切换分栏开启/关闭 |
| `Ctrl+Shift+←` | 焦点移至左栏 |
| `Ctrl+Shift+→` | 焦点移至右栏 |
| `Ctrl+Shift+\` | 等分两栏（重置比例为 50/50） |
| `Escape`（焦点在右栏时） | 焦点返回左栏（不关闭分栏） |

### 12.1 Tab 键焦点顺序

分栏状态下 Tab 焦点顺序：左栏工具栏 → 左栏编辑区 → 分割线（可按 Enter 激活键盘拖拽）→ 右栏模式切换器 → 右栏内容区 → 右栏工具栏。

### 12.2 分割线键盘拖拽

分割线获得焦点后：

- `←` / `→`：以 10px 步长移动分割线（调整比例）
- `Shift+←` / `Shift+→`：以 50px 步长移动
- `Enter`：重置为 50/50
- `Escape`：取消操作，恢复到焦点前比例

---

## 13. 可访问性

| 要求 | 实现方式 |
|------|---------|
| 分割线可聚焦 | `tabindex="0"`, `role="separator"`, `aria-orientation="vertical"` |
| 分割线位置通知 | `aria-valuenow="50"` / `aria-valuemin="20"` / `aria-valuemax="80"` |
| 右栏只读区域 | `role="region"`, `aria-label="文档预览"` / `aria-label="参考文档"` |
| 模式切换器 | `role="tablist"` + `role="tab"` 三个选项卡 |
| 焦点可见 | Focus Ring 遵循 T09-07=B（品牌红 2px outline + 2px offset） |

---

## 14. 与其他系统的集成

### 14.1 版本历史（VersionHistory）

分栏状态不影响版本历史面板（左栏）。版本历史预览时，版本 diff 内容显示在右栏（自动切换为 Preview 模式，显示历史版本 HTML）。

### 14.2 文档属性面板（DocumentPropertyPanel）

`F-06` 的弹出式属性面板在分栏状态下以浮动 Popover 形式出现，定位到工具栏按钮旁，不占用分栏宽度。

### 14.3 TabBar

TabBar 中的 Tab 对应的是左栏文档（主编辑文档）。切换 Tab 时，若当前处于分栏状态：

- Preview 模式：右栏自动更新为新 Tab 文档的预览
- Reference 模式：右栏保持原参考文档不变
- Compare 模式：弹出提示"切换文档将关闭对比模式，是否继续？"

### 14.4 会话恢复（SessionRestore）

分栏状态完整记入 `session_state`（见 48-session-restore-spec.md）。恢复时：

- 恢复 `layoutSplitView` 全部字段
- 异步加载参考文档 / 对比文档（不阻塞主编辑区恢复）
- 若参考文档已删除：右栏显示"参考文档已删除"空状态，不阻断主编辑区

### 14.5 专注模式（FocusMode）

专注模式（L1-46=D）开启时：

- 分栏仍可保持（不强制关闭）
- 分割线和右栏工具栏隐藏（仅在鼠标悬停时浮现）
- 右栏内容区保留，但比例调整被禁用

---

## 15. 错误处理

| 场景 | 处理方式 |
|------|---------|
| 参考文档加载失败 | 右栏显示错误空状态 + 重试按钮，不影响左栏编辑 |
| 对比文档与左栏相同 | 拒绝选择，Toast 提示原因 |
| 视口过窄自动折叠 | Toast 提示，保留用户配置，待宽度恢复后询问是否重启 |
| SyncScroll 引发无限循环 | flag 防循环（见 39-sync-scroll-spec.md），若仍检测到，禁用同步滚动并 Toast 警告 |
| TipTap 右栏实例初始化失败 | 降级为只读 iframe，内容由 `innerHTML` 填充 |

---

## 16. 组件文件结构

```
src/components/editor/
├── SplitView/
│   ├── SplitViewContainer.vue       # 顶层容器，管理 enabled 状态
│   ├── SplitDivider.vue             # 可拖拽分割线
│   ├── RightPanelModeSwitcher.vue   # 三模式切换器
│   ├── RightPanelContent.vue        # 路由到具体内容
│   ├── PreviewRenderer.vue          # HTML 预览渲染器
│   ├── ReferenceViewer.vue          # 参考文档只读视图
│   ├── CompareEditor.vue            # 对比编辑器（双 TipTap 实例）
│   └── ReferenceDocPicker.vue       # 参考/对比文档搜索选择器
src/composables/
├── useSplitView.ts                  # 分栏状态逻辑（比例计算、拖拽）
├── useSplitViewKeyboard.ts          # 键盘快捷键逻辑
src/stores/
├── layoutStore.ts                   # 包含 layoutSplitView 持久化字段
```

---

## 17. 测试矩阵

| # | 测试场景 | 预期结果 | 优先级 |
|---|---------|---------|--------|
| 1 | `Ctrl+Shift+E` 触发分栏开启 | 右栏从左侧滑入，比例 50/50，Preview 模式 | P0 |
| 2 | `Ctrl+Shift+E` 再次触发 | 右栏收起，恢复单栏状态 | P0 |
| 3 | 工具栏按钮点击触发分栏 | 与快捷键行为一致 | P0 |
| 4 | 命令面板输入 `split view` | 命中 `editor.splitView.toggle`，执行正确 | P1 |
| 5 | 拖拽分割线调整比例 | 左右栏实时响应，极限 280px 时停止 | P0 |
| 6 | 双击分割线 | 比例重置为 50/50，200ms 动画 | P1 |
| 7 | 左栏编辑内容 → 右栏 Preview 更新 | 200ms debounce 后右栏更新，无整体重绘 | P0 |
| 8 | 同步滚动开关关闭后各自独立滚动 | 左右不再联动 | P0 |
| 9 | 同步滚动开关开启后左滚右同步 | 按锚点策略同步（见 39-sync-scroll-spec） | P0 |
| 10 | 切换右栏为 Reference 模式 | 参考文档选择器出现，同步滚动默认关闭 | P1 |
| 11 | 选择参考文档后右栏显示对应文档 | 文档内容渲染，只读保护 | P1 |
| 12 | 切换右栏为 Split Compare 模式 | 两侧均可编辑，独立自动保存 | P1 |
| 13 | Compare 模式选择与左栏相同文档 | 拒绝选择并提示 | P1 |
| 14 | 视口宽度压缩至 899px | 自动关闭分栏，Toast 提示 | P0 |
| 15 | 视口恢复至 900px 以上 | Toast 询问是否恢复分栏 | P1 |
| 16 | 分栏状态下切换 Tab | Preview 模式右栏更新；Reference 模式右栏不变 | P0 |
| 17 | 分栏比例持久化验证 | 刷新后比例恢复上次拖拽结果 | P0 |
| 18 | 左右栏独立字体缩放 | `Ctrl+滚轮` 只影响焦点栏，另一栏不变 | P1 |
| 19 | 分栏状态下专注模式开启 | 分割线和右栏工具栏隐藏，内容保留 | P1 |
| 20 | 参考文档已删除时会话恢复 | 右栏显示"已删除"空状态，左栏正常恢复 | P1 |
| 21 | 分割线键盘拖拽（方向键 + Enter 重置） | 焦点在分割线时方向键调整，Enter 重置 | P2 |
| 22 | Escape 从右栏焦点返回左栏 | 焦点移回左栏编辑区，分栏保持 | P2 |
| 23 | 全局编辑模式切换为 preview | 分栏自动关闭，Toast 提示原因 | P0 |
| 24 | 账户切换后分栏状态隔离 | 账户 A 和账户 B 各自独立的分栏配置 | P1 |
| 25 | 暗色模式下分割线和右栏工具栏 | 完全适配暗色 token，无硬编码色值 | P1 |

---

## 18. 性能要求

| 指标 | 要求 |
|------|------|
| 分栏开启动画 | 整体 < 16ms/frame（60fps） |
| 右栏 Preview 初次渲染 | < 200ms（小文档 5k 字以内） |
| 比例拖拽响应 | mousemove 回调 < 8ms（不阻塞主线程） |
| 编辑 → Preview 更新延迟 | debounce 200ms + 渲染 < 100ms |
| 参考文档切换 | < 500ms（含数据库读取） |

---

## 19. 边界条件汇总

1. 分栏状态下进行版本回滚：回滚完成后右栏 Preview 刷新，保持当前比例
2. 分栏状态下文档被外部修改（TauriFileBridge 监控）：左栏提示冲突，右栏静默等待用户决定后刷新
3. Compare 模式下右栏文档被删除：右栏切换为"文档已删除"空状态，左栏继续编辑
4. 两个 TipTap 实例同时滚动引发 SyncScroll 竞争：flag 机制防循环，见 39 规范
5. 分栏 + 多窗口（L1-53=C）：每个 Tauri 窗口独立维护各自的 `layoutSplitView` 状态

---

## 20. 验收标准

- [ ] 所有 P0 测试矩阵项通过，附截图证据
- [ ] `Ctrl+Shift+E` 快捷键在 Typora / Source 两种模式下均正常触发
- [ ] 比例拖拽在 1200px 和 900px 两个断点下均测试通过
- [ ] 暗色模式截图显示无色值硬编码
- [ ] 会话恢复测试：关闭重开后分栏状态、比例、右栏模式全部正确恢复
- [ ] 性能测试：Lighthouse Performance > 80，分栏开启不拉低首屏分数
- [ ] 参考文档删除场景：主编辑区不受影响，右栏降级正确

---

*本文档生成于 2026-04-21，依据 W-01/W-04/W-06 决策及 InkForge Ethereal Constructivism 设计语汇。*

---

## 21. 与 FocusMode 的深度集成

### 21.1 专注模式 + 分栏叠加规则（W-05=D）

专注模式（FocusMode）和分栏视图（SplitView）是两个独立的编辑器状态，可以同时激活：

| 状态组合 | 行为 |
|---------|------|
| 仅分栏 | 完整布局，分割线可见，右栏工具栏可见 |
| 仅专注 | 全屏，隐藏 Sidebar、TabBar、StatusBar |
| 分栏 + 专注 | 全屏，右栏保留，分割线变窄（2px），工具栏在 hover 时浮现 |

叠加状态下，右栏宽度限制取消（可拖至更窄，最小 200px），以最大化编辑区域。

### 21.2 专注模式退出时的分栏恢复

退出专注模式后：
- 分栏状态完整保留（比例、右栏模式）
- 不触发分栏重新初始化
- 布局以 150ms ease 过渡恢复（SideBar 展开 + TabBar 渐显）

---

## 22. RightPane 内容区的滚动行为详解

### 22.1 滚动容器设计

```css
.right-pane-content {
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  /* 使用自定义细滚动条（T09-06=B） */
  scrollbar-width: thin;
  scrollbar-color: var(--color-scrollbar-thumb) transparent;
}
```

右栏滚动容器与左栏**完全独立**（各自有独立的 `overflow` 容器），SyncScroll 通过监听两个容器的 `scroll` 事件实现联动。

### 22.2 平滑滚动配置

```css
.right-pane-content {
  scroll-behavior: smooth;
}
```

SyncScroll 算法设置 `scrollTop` 时直接赋值（不使用 `scrollTo({ behavior: 'smooth' })`），避免 smooth 滚动动画与同步逻辑冲突。

---

## 23. 分栏视图下的 FloatingToolbar 行为

### 23.1 FloatingToolbar 显示规则

FloatingToolbar 跟随鼠标焦点所在栏：

- 光标在左栏：FloatingToolbar 在左栏内正常显示
- 光标在右栏（Compare 模式）：FloatingToolbar 在右栏内正常显示
- 右栏为 Preview 或 Reference（只读）：不显示 FloatingToolbar

### 23.2 工具栏位置约束

FloatingToolbar 的 X 坐标约束在当前活跃栏的边界内，避免跨栏遮挡：

```typescript
function constrainToolbarPosition(
  toolbarRect: DOMRect,
  paneRect: DOMRect
): { left: number; top: number } {
  const maxLeft = paneRect.right - toolbarRect.width - 8; // 8px 边距
  const minLeft = paneRect.left + 8;
  return {
    left: Math.max(minLeft, Math.min(maxLeft, toolbarRect.left)),
    top: toolbarRect.top,
  };
}
```

---

## 24. 国际化（i18n）相关

所有 UI 文本均通过 i18n key 引用，不硬编码中文。关键 key 列表：

| Key | 中文值 |
|-----|--------|
| `splitView.toggleOn` | 开启分栏 |
| `splitView.toggleOff` | 关闭分栏 |
| `splitView.tooNarrow` | 窗口过窄，已退出分栏模式 |
| `splitView.restorePrompt` | 是否恢复分栏布局？ |
| `splitView.sameDocError` | 不能在两栏中打开同一文档，请选择不同文档 |
| `splitView.refDocDeleted` | 参考文档已删除 |
| `splitView.modePreview` | 预览 |
| `splitView.modeReference` | 参考文档 |
| `splitView.modeCompare` | 对比编辑 |

---

## 25. 实现优先级与分阶段交付

### 25.1 Phase 1（核心功能，P0 覆盖）

- `Ctrl+Shift+E` 触发分栏
- Preview 模式（右栏只读渲染）
- 分割线拖拽
- 同步滚动（基本锚点策略）
- 比例持久化
- 响应式降级（< 900px 自动关闭）

### 25.2 Phase 2（完整功能，P1 覆盖）

- Reference 模式（参考文档选择器）
- Split Compare 模式（双 TipTap 实例）
- 右栏模式切换器
- 独立字体缩放
- 专注模式叠加

### 25.3 Phase 3（细化体验，P2 覆盖）

- 分割线键盘操作
- 跨窗口分栏状态同步
- 会话恢复完整集成
- 图片懒加载兼容性测试

### 25.4 验收节点

每个 Phase 完成时提交独立验收，附对应测试矩阵行数的截图/视频证据。

---

## 26. CSS 设计 token 映射

分栏视图涉及的所有 CSS 变量必须在 `theme-light.css` 和 `theme-dark.css` 中同时定义：

| Token | 用途 | 亮色参考值 |
|-------|------|----------|
| `--color-split-divider` | 分割线默认色 | `#E5E7EB` |
| `--color-split-divider-hover` | 分割线 hover 色 | `var(--color-brand-primary)` |
| `--color-split-right-bg` | 右栏背景色 | `#FAFAFA` |
| `--color-split-toolbar-bg` | 右栏工具栏背景 | `#FFFFFF` |
| `--color-split-mode-active` | 模式切换器激活态 | `var(--color-brand-primary)` |

---

## 27. 测试矩阵补充（Phase 2/3）

| # | 测试场景 | 预期结果 | 优先级 |
|---|---------|---------|--------|
| 26 | Reference 模式加载参考文档 | 文档渲染正确，不可编辑 | P1 |
| 27 | Reference 模式搜索文档（输入中文） | 搜索结果正确，选择后加载 | P1 |
| 28 | Compare 模式右栏文档编辑 | `Ctrl+S` 保存右栏文档，左栏不受影响 | P1 |
| 29 | Compare 模式下版本历史面板 | 反映左栏文档历史 | P2 |
| 30 | 分栏 + 专注模式叠加 | 全屏，右栏保留，分割线收窄为 2px | P1 |
| 31 | 退出叠加状态 | 分栏比例和模式完整保留 | P1 |
| 32 | 右栏工具栏在专注模式下 hover 浮现 | hover 右栏区域时工具栏淡入 | P2 |
| 33 | 多窗口下分栏独立状态 | 窗口 A 和窗口 B 各自维护分栏状态 | P2 |
| 34 | Compare 模式脏标记 | 右栏文档有修改时，右栏工具栏出现脏标记 | P1 |
| 35 | 版本回滚时右栏 Preview 刷新 | 回滚完成后 Preview 更新为回滚后内容 | P2 |

---

## 28. 已知约束与技术债务记录

### 28.1 Safari 滚动行为差异

Safari 的 `scrollTop` 赋值行为与 Chrome/Firefox 存在细微差异（异步化处理），可能导致 SyncScroll 在 Safari 上存在单帧偏差。v2.1 以 Chrome 为主要测试环境，Safari 问题标记为 v2.2 修复。

### 28.2 TipTap 双实例内存占用

Compare 模式下同时存在两个 TipTap 实例。每个实例约占用 5~10MB 内存（视文档大小），20k 字文档两实例合计约 15~25MB，在主流桌面设备（8GB RAM）上可接受。

若文档超过 50k 字，Compare 模式下考虑右侧降级为只读 HTML 渲染（非 TipTap 实例），以节省内存。降级阈值在 Settings > 高级 中可配置（默认 50k 字）。

### 28.3 首次渲染闪烁

分栏开启动画（250ms width 过渡）在低端设备上可能出现白色闪烁（右栏背景色延迟应用）。修复方案：在动画开始前预设 `right-pane-content` 的背景色（通过 inline style），动画结束后移除。

### 28.4 CSS 容器查询

未来可考虑使用 CSS Container Queries 替代 ResizeObserver 判断窗口宽度，使宽度阈值逻辑完全在 CSS 层处理。当前因浏览器兼容性问题（Tauri 内嵌 WebView 版本），保留 JS 实现。

---

## 29. 分栏视图与 StatusBar 的协作

### 29.1 StatusBar 在分栏状态下的显示内容

分栏状态下，StatusBar 显示的统计数据基于**左栏（主编辑文档）**，不反映右栏文档：

- 字数：左栏文档的字数
- 阅读时长：左栏文档的估算阅读时间
- 保存状态：左栏文档的自动保存状态

若处于 Compare 模式（两个文档并排可编辑），StatusBar 反映**当前焦点所在栏**的文档统计。焦点切换时 StatusBar 动态更新（200ms 防抖）。

### 29.2 字数点击展开（N-02=D）

StatusBar 字数区点击后弹出 WordCountReport（EX-06），弹出内容同样基于当前焦点文档，不混合两栏统计。

---

## 30. 分栏视图国际化（i18n）补充 key

| Key | 中文值 |
|-----|--------|
| `splitView.rightMode.preview` | 预览 |
| `splitView.rightMode.reference` | 参考文档 |
| `splitView.rightMode.compare` | 对比编辑 |
| `splitView.syncScroll.enabled` | 点击暂停同步滚动 |
| `splitView.syncScroll.disabled` | 点击开启同步滚动 |
| `splitView.refDoc.placeholder` | 搜索参考文档… |
| `splitView.refDoc.recentLabel` | 最近使用 |
| `splitView.compareDoc.placeholder` | 搜索对比文档… |
| `splitView.refDoc.deleted` | 参考文档已删除 |
| `splitView.compareDoc.sameError` | 不能在两栏中打开同一文档 |
| `splitView.previewMode.disabled` | 预览模式下不支持分栏 |
| `splitView.narrowWarning` | 窗口过窄，已退出分栏模式 |
| `splitView.narrowRestore` | 是否恢复分栏布局？ |

---

## 31. 小结

SplitView 是 InkForge Workstation 层的核心布局能力，通过严格的状态持久化、响应式降级、与 SyncScroll / TOC / SessionRestore 的深度集成，为用户提供专业的并排工作体验。实现时严格遵循"分阶段交付、每阶段可独立验收"原则，确保 Phase 1 核心功能先行可用。
