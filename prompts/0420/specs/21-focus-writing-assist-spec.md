> 版本: v2.1 | 状态: Draft | 关联决策: O-01, O-02, O-04, O-05, O-06, L1-45, L1-46, L1-48, L1-49 | 依赖 Spec: 20-theme-font-typography-spec.md, 08-data-insights-spec.md

# Spec 21 — 专注写作与写作辅助（FocusWritingAssist）

---

## 目录

1. 概述与设计目标
2. 架构总览
3. TypeScript 类型系统
4. 专注模式（Zen Mode / FocusMode）
5. 打字机模式（Typewriter Mode）
6. 渐晕效果（Vignette）
7. 目标字数系统
8. 番茄钟（Pomodoro）
9. 写作统计面板
10. 环境音（Ambient Sound）
11. 写作氛围与 iA Writer 哲学
12. FocusSessionSummary 退场总结
13. Store 定义
14. 测试矩阵

---

## 1. 概述与设计目标

专注写作与写作辅助模块（FocusWritingAssist）是 InkForge v2.1 的沉浸式写作体验核心，以 iA Writer 式"写作哲学"为设计基准：**视觉极简，功能完整**。

### 1.1 核心设计原则

用户原话（L1-46 D + 补充）：
> "专注模式下仍然必须允许快捷键/斜杠命令/保存操作，仅仅只是显示变少"

这确立了写作辅助模块的核心原则：
- 专注模式是**视觉层的极简**，不是**功能层的阉割**
- 所有快捷键、斜杠命令、自动保存、错误通知在专注模式下全部保持正常工作
- 退出专注模式时显示 `FocusSessionSummary`（写作成果概要）

用户原话（L1-49 B+C + 补充）：
> "iA Writer 的专注哲学很好，应用它"

这确立了 iA Writer 为 InkForge 写作氛围设计的基准：安静界面 + 写作专用配色。

### 1.2 各功能独立状态

专注模式、打字机模式、渐晕效果、目标字数、番茄钟、环境音均为**独立开关**，可任意组合：

```
FocusMode ────────────────── 独立开关（F11 或工具栏按钮）
TypewriterMode ─────────────── 独立开关（Settings > Editor）
Vignette ───────────────────── 独立开关（FocusMode 附属选项）
WordGoal ───────────────────── 双层目标（单文档 + 每日/每周）
Pomodoro ───────────────────── 独立开关（Settings > Writing）
AmbientSound ───────────────── 独立开关（Writing 面板）
```

**与其他模式的叠加矩阵**（决策 O-02）：

| 组合 | 允许 | 说明 |
|------|------|------|
| FocusMode + TypewriterMode | 允许（独立开关） | 最沉浸组合 |
| FocusMode + EditorMaximize | 允许（叠加增强） | W-05 D |
| FocusMode + SplitView | 禁止 | 语义矛盾 |
| FocusMode + Pomodoro | 允许 | 计时器在 FocusMode 下保持运行 |

---

## 2. 架构总览

```
FocusWritingAssist
├── useFocusModeStore / useWritingAssistStore  — Pinia Store
│
├── FocusModeShell              — 专注模式外壳容器（覆盖全局 UI）
│   ├── FocusModeToggle         — 进入/退出按钮（F11 / Esc）
│   ├── ParagraphDimOverlay     — 非活跃段落降低透明度
│   └── FocusStatusBar          — 极简 StatusBar（可隐藏）
│
├── TypewriterPlugin            — ProseMirror Plugin，控制光标垂直居中
│
├── VignetteOverlay             — CSS 渐晕效果层
│
├── WritingGoalPanel            — 右侧折叠面板 or 内嵌到 StatusBar
│   ├── GoalProgressBar         — 进度条（含颜色渐变）
│   └── GoalCompletionAnimation — 完成动画
│
├── PomodoroTimer               — 番茄钟组件
│   ├── TimerDisplay            — 倒计时显示
│   ├── TimerControls           — 开始/暂停/重置
│   └── BreakNotification       — Tauri 桌面通知
│
├── WritingStatsPanel           — 写作统计面板（右侧折叠）
│   ├── CurrentStats            — 当前字数/WPM/预计完成
│   └── SessionStats            — 今日/本周统计
│
├── AmbientSoundPlayer          — 环境音播放器
│   ├── SoundSelector           — 音源选择（4 种）
│   └── VolumeControl           — 音量 Slider
│
└── FocusSessionSummary         — 退出专注模式时的总结页
```

---

## 3. TypeScript 类型系统

```typescript
// src/types/writing-assist.ts

/** 专注模式状态 */
export interface FocusModeState {
  isActive: boolean;
  /** 进入时间 */
  startedAt: string | null;
  /** 进入时文档字数 */
  startWordCount: number;
}

/** 打字机模式状态 */
export interface TypewriterState {
  isActive: boolean;
}

/** 渐晕配置 */
export interface VignetteConfig {
  isEnabled: boolean;
  /** 渐晕高度（px），上下各 */
  height: number;
}

/** 写作目标（双层结构） */
export interface WritingGoal {
  /** 单文档目标字数（可选） */
  documentTarget?: number;
  /** 每日跨文档目标字数（可选） */
  dailyTarget?: number;
  /** 每周跨文档目标字数（可选） */
  weeklyTarget?: number;
}

/** 写作目标进度 */
export interface WritingGoalProgress {
  /** 当前文档字数 */
  currentDocWords: number;
  /** 今日累计字数（跨文档） */
  todayWords: number;
  /** 本周累计字数（跨文档） */
  weekWords: number;
  /** 单文档目标完成百分比（0~100） */
  documentPercent: number;
  /** 今日目标完成百分比（0~100） */
  dailyPercent: number;
  /** 本周目标完成百分比（0~100） */
  weeklyPercent: number;
}

/** 番茄钟阶段 */
export type PomodoroPhase =
  | 'idle'        // 未开始
  | 'running'     // 写作中
  | 'paused'      // 暂停
  | 'break'       // 短休息（5min）
  | 'long_break'; // 长休息（15min）

/** 番茄钟状态 */
export interface PomodoroState {
  phase: PomodoroPhase;
  /** 当前阶段剩余秒数 */
  remainingSeconds: number;
  /** 已完成的番茄数 */
  completedPomodoros: number;
  /** 会话配置 */
  config: PomodoroConfig;
}

/** 番茄钟配置 */
export interface PomodoroConfig {
  workMinutes: number;      // 默认 25
  shortBreakMinutes: number; // 默认 5
  longBreakMinutes: number;  // 默认 15
  longBreakAfter: number;    // 默认 4（每 4 个番茄后长休息）
  autoStartBreaks: boolean;  // 默认 true
  notificationEnabled: boolean; // 默认 true
}

/** 环境音类型 */
export type AmbientSoundType = 'rain' | 'cafe' | 'whitenoise' | 'nature';

/** 环境音状态 */
export interface AmbientSoundState {
  currentSound: AmbientSoundType | null;
  volume: number; // 0~1
  isPlaying: boolean;
}

/** 写作统计（实时） */
export interface WritingStats {
  /** 当前文档字数（纯文本口径） */
  currentDocWords: number;
  /** 今日新增字数（累计） */
  todayAddedWords: number;
  /** 本周总字数 */
  weeklyWords: number;
  /** 最近 1min WPM（5s 更新一次） */
  wpm: number;
  /** 按当前速度预计完成目标的剩余分钟数 */
  estimatedMinutesToGoal: number | null;
  /** 会话写作时长（秒） */
  sessionSeconds: number;
}

/** FocusSession 总结数据（退出专注模式时展示） */
export interface FocusSessionSummary {
  /** 会话时长（秒） */
  durationSeconds: number;
  /** 会话净新增字数 */
  wordsAdded: number;
  /** 会话期间目标进度变化 */
  goalProgressBefore: number;
  goalProgressAfter: number;
  /** 是否达成今日目标 */
  dailyGoalAchieved: boolean;
}

/** WritingAssistStore 完整状态 */
export interface WritingAssistStoreState {
  focusMode: FocusModeState;
  typewriterMode: TypewriterState;
  vignette: VignetteConfig;
  wordGoal: WritingGoal;
  pomodoroState: PomodoroState;
  ambientSound: AmbientSoundState;
  stats: WritingStats;
  lastSummary: FocusSessionSummary | null;
}
```

---

## 4. 专注模式（Zen Mode / FocusMode）

### 4.1 触发方式

| 方式 | 动作 |
|------|------|
| `F11` | 进入/退出专注模式（Toggle） |
| 工具栏按钮 | `Focus` 图标（`Maximize2`），点击进入 |
| 命令面板 | 搜索"专注模式" → 执行 |
| 快捷键（可自定义） | 默认 `F11`，用户可在 Settings > Keyboard 重绑定 |

### 4.2 进入专注模式时隐藏的 UI 元素

| UI 元素 | 隐藏方式 | 备注 |
|---------|---------|------|
| Sidebar（文件管理器 / TOC / 版本历史） | `display: none` + transition | — |
| TabBar | `height: 0` + `overflow: hidden` | — |
| Hub 导航链接 | `display: none` | — |
| ToolBar（顶部工具栏） | `opacity: 0` + `translateY(-100%)` | 200ms ease-out |
| StatusBar | 默认保留，可通过 N-01 补充开关单独关闭 | — |

### 4.3 保留的 UI 元素

| UI 元素 | 保留原因 |
|---------|---------|
| 编辑区 | 核心，居中展示 |
| 极简 StatusBar | 显示字数/目标进度（可通过 N-01 开关隐藏） |
| 退出按钮（Esc 提示） | 右上角固定位置的 `Minimize2` 图标，hover 才显示（不干扰沉浸） |
| 快捷键 | 所有快捷键正常工作（铁律：不禁用任何键盘功能） |
| 斜杠命令弹层 | 正常弹出 |
| 浮动工具栏（文字选中时） | 正常显示 |
| Sonner Toast 通知 | 正常显示（但在专注模式下自动缩短显示时间至 2s） |
| 自动保存（含保存状态） | 正常工作 |
| FocusSessionSummary | 退出时展示 |

### 4.4 编辑区居中布局

专注模式下编辑区居中，宽度受限：

```css
/* src/styles/focus-mode.css */
.focus-mode-shell {
  position: fixed;
  inset: 0;
  background: var(--paper-bg);
  z-index: var(--z-focus-mode);
}

.focus-mode-shell .editor-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 60px 40px;
  height: 100%;
  overflow-y: auto;
}
```

### 4.5 动效规范

进入专注模式时，被隐藏的 UI 元素统一使用：
- `opacity: 1 → 0`
- `transform: translateY(-10px)`（向上移出）
- 时长：200ms
- 缓动：`ease-out`

退出时反向（200ms，`ease-in`）。

编辑区扩展动效：
- `max-width` 从当前值 → 800px
- 时长：250ms
- 缓动：`cubic-bezier(0.4, 0, 0.2, 1)`

### 4.6 实现（useFocusMode Composable）

```typescript
// src/composables/useFocusMode.ts
import { useWritingAssistStore } from '@/stores/useWritingAssistStore';

export function useFocusMode() {
  const store = useWritingAssistStore();
  const editorStore = useEditorStore();

  const enter = async () => {
    // 记录进入时状态
    store.focusMode.startedAt = new Date().toISOString();
    store.focusMode.startWordCount = editorStore.wordCount;
    store.focusMode.isActive = true;

    // 应用全屏（Tauri window API）
    await tauriWindow.setFullscreen(true);

    // 应用动效（VueUse transition）
    await nextTick();
    document.documentElement.classList.add('focus-mode-active');
  };

  const exit = async () => {
    // 计算会话总结数据
    const summary = computeSessionSummary(store);
    store.lastSummary = summary;
    store.focusMode.isActive = false;

    // 退出全屏
    await tauriWindow.setFullscreen(false);
    document.documentElement.classList.remove('focus-mode-active');

    // 展示退场总结
    await nextTick();
    showFocusSessionSummary(summary);
  };

  const toggle = () => {
    if (store.focusMode.isActive) {
      exit();
    } else {
      enter();
    }
  };

  // F11 快捷键绑定
  useKeydown('F11', toggle);
  useKeydown('Escape', () => {
    if (store.focusMode.isActive) exit();
  });

  return { enter, exit, toggle, isActive: computed(() => store.focusMode.isActive) };
}
```

### 4.7 段落高亮（ParagraphDimOverlay）

决策 O-02 / T01-12 B：当前段落高亮，其他段落降低透明度（opacity 0.35）。

```typescript
// 通过 ProseMirror Plugin 实现
// 监听 selection 变化，找到光标所在的最近 paragraph/heading 节点
// 为其他节点添加 Decoration.node class "dimmed"

export const paragraphDimPlugin = new Plugin({
  key: new PluginKey('paragraphDim'),

  state: {
    init: () => ({ activeParagraphPos: null }),
    apply(tr, prev) {
      if (!tr.selection) return prev;
      const pos = tr.selection.from;
      const resolved = tr.doc.resolve(pos);
      const paragraphPos = findParagraphStart(resolved);
      return { activeParagraphPos: paragraphPos };
    },
  },

  props: {
    decorations(state) {
      const { activeParagraphPos } = this.getState(state)!;
      if (activeParagraphPos === null) return DecorationSet.empty;

      const decos: Decoration[] = [];
      state.doc.descendants((node, pos) => {
        if (['paragraph', 'heading', 'blockquote'].includes(node.type.name)) {
          if (pos !== activeParagraphPos) {
            decos.push(Decoration.node(pos, pos + node.nodeSize, { class: 'paragraph-dimmed' }));
          }
        }
      });
      return DecorationSet.create(state.doc, decos);
    },
  },
});
```

```css
.paragraph-dimmed {
  opacity: 0.35;
  transition: opacity 200ms ease;
}
```

---

## 5. 打字机模式（Typewriter Mode）

### 5.1 效果描述

打字机模式下，**光标行始终保持在编辑区垂直居中位置**（约屏幕 50% 高度）。随着用户向下写作，编辑区整体向上滚动，而非光标移动到底部才滚动。

这提供了更舒适的长文写作体验，避免用户的视线需要追随光标到屏幕底部。

### 5.2 实现原理（动态 paddingBottom）

```typescript
// src/editor/plugins/typewriter-plugin.ts

export const typewriterPlugin = new Plugin({
  key: new PluginKey('typewriter'),

  view(editorView) {
    return {
      update(view) {
        const store = useWritingAssistStore();
        if (!store.typewriterMode.isActive) return;

        const { state } = view;
        const cursorPos = state.selection.from;
        const coords = view.coordsAtPos(cursorPos);

        // 编辑器容器
        const container = view.dom.closest('.editor-container') as HTMLElement;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        const targetY = containerRect.top + containerRect.height * 0.5;
        const currentY = coords.top;
        const delta = currentY - targetY;

        if (Math.abs(delta) > 5) {
          container.scrollTop += delta;
        }
      },
    };
  },
});
```

### 5.3 配置入口

- Settings > Editor > 打字机模式（Switch）
- 也可在 WritingStatsPanel 或 FocusModeShell 内通过快捷开关切换

打字机模式独立于专注模式，可单独开启（用户可在普通模式下使用打字机模式）。

---

## 6. 渐晕效果（Vignette）

### 6.1 效果描述

编辑区上下各 80px 半透明渐变遮罩，使视觉焦点集中在光标附近的内容，非焦点区域（顶部和底部）自然淡出。

### 6.2 实现（CSS mask-image）

```css
/* src/styles/vignette.css */
.editor-container.vignette-enabled {
  --vignette-height: 80px;

  mask-image:
    linear-gradient(
      to bottom,
      transparent 0,
      black var(--vignette-height),
      black calc(100% - var(--vignette-height)),
      transparent 100%
    );
  -webkit-mask-image:
    linear-gradient(
      to bottom,
      transparent 0,
      black var(--vignette-height),
      black calc(100% - var(--vignette-height)),
      transparent 100%
    );
}
```

### 6.3 配置

- 开关：Settings > Appearance > 渐晕效果（Switch）
- 可自定义渐晕高度（Slider，范围 40px~200px，默认 80px）
- 专注模式下可单独控制（FocusModeShell 内有渐晕开关）

---

## 7. 目标字数系统

### 7.1 双层目标结构（决策 O-01）

```
WritingGoal
├── documentTarget (可选)    — 当前文档字数目标（如：10,000 字）
├── dailyTarget (可选)       — 每日跨文档累计目标（如：500 字）
└── weeklyTarget (可选)      — 每周跨文档累计目标（如：3,000 字）
```

用户可只设置其中一层或多层。

### 7.2 进度条颜色（GoalProgressBar）

| 进度范围 | 颜色 | 说明 |
|---------|------|------|
| 0 ~ 50% | 默认色（`var(--text-muted)`） | 起步阶段 |
| 50% ~ 90% | 蓝色（`var(--accent-blue)`） | 进行阶段 |
| 90% ~ 100% | 绿色（`var(--accent-green)`） | 接近完成 |
| 100% | 金色动效 | 已完成 |

```typescript
function getProgressColor(percent: number): string {
  if (percent >= 100) return 'var(--accent-gold)';
  if (percent >= 90) return 'var(--accent-green)';
  if (percent >= 50) return 'var(--accent-blue)';
  return 'var(--text-muted)';
}
```

### 7.3 完成动画（GoalCompletionAnimation）

目标达成（percent >= 100）时触发：

- 进度条脉冲动效（金色闪光，300ms）
- StatusBar 目标进度区域出现金色边框发光（300ms fade in，3s 后 fade out）
- Toast 通知："今日目标完成！继续保持"（非游戏化，克制）
- Hub GoalCard 更新（下次访问 Hub 时可见连续达成天数 +1）

**严禁**：emoji、过度游戏化（气球/烟花效果）、打断写作的强制弹窗。

### 7.4 统计口径

目标字数统计口径与 T08-07 D 一致：**纯文本字数**（不含标题行中的 `#` 符号、代码块内容、公式字符）。

归档文档字数不计入目标（决策 N-03）。

### 7.5 设置入口

Settings > Writing > 写作目标：

```
写作目标设置
  ─────────────────────────────────
  单文档目标
  [______] 字  （0 = 不设置）

  每日目标
  [______] 字  （0 = 不设置）

  每周目标
  [______] 字  （0 = 不设置）
```

### 7.6 StatusBar 集成

StatusBar 右侧常驻"今日 X/Y 字"计数器（决策 O-04）：

```
[目标图标]  今日 1,234/2,000 字
```

点击跳转 Settings > Writing > 写作目标。

### 7.6.a 2026-04-22 Wave 1 当前实现注记

- 当前真实实现已经落在 `stores/settings.ts`、`SettingsView.vue`、`WorkstationView.vue`、`EditorStatusBar.vue`、`HubView.vue` 中，但尚未抽成独立 `writing-goal` store。
- `WritingGoal` 当前以根级 `settings.writingGoal` 形式持久化，包含 `documentTarget / dailyTarget / weeklyTarget` 三层目标值。
- 当前设置入口并非独立 `Settings > Writing` tab，而是 `Settings > Editor` 下的 `writing-goal-section`，直达路由为 `/settings?tab=editor&section=writing-goal`。
- `Workstation` 状态栏当前同时展示 `文稿` 与 `今日` 两个目标 pill：文稿目标读取当前编辑态的实时字数，今日目标读取跨文章窗口统计。
- `Hub` 当前消费的是已持久化文章内容窗口；自 2026-04-22 起，`stores/editor.ts` 会在正文成功保存、创建内容、切换版本或加载归一化内容后同步 `article.rawContent/title` 快照，因此首页目标卡、最近编辑摘要与字数统计会随已落盘正文更新，但仍不会把仅停留在工作台未落盘内存态计入首页。
- `GoalCompletionAnimation`、完成 toast 与连续达成奖励尚未在本轮落地，仍属于后续实现项。

---

## 8. 番茄钟（Pomodoro）

### 8.1 默认配置

| 阶段 | 时长 | 触发条件 |
|------|------|---------|
| 写作（Work） | 25min | 用户启动 |
| 短休息 | 5min | 一个番茄完成后 |
| 长休息 | 15min | 每 4 个番茄后 |

所有时长在 Settings > Writing > 番茄钟 可自定义（范围：1min ~ 120min）。

### 8.2 状态机

```
idle ──start()──> running ──完成──> break
                     │                 │
                  pause()           完成（长休息）
                     │                 │
                  paused ──start()──> running
                                       │
                                    (4轮后) ──> long_break
```

### 8.3 PomodoroTimer 组件

```
┌──────────────────────┐
│     写作专注中        │
│                      │
│      24:32           │   ← 倒计时（大字号）
│  ●●●○  2/4 番茄      │   ← 完成数量指示点
│                      │
│ [暂停]  [重置]  [跳过] │
└──────────────────────┘
```

UI 位置：右侧 WritingAssistPanel 内（折叠/展开，默认折叠）。专注模式下，番茄钟显示在编辑区底部中央（极简版，仅倒计时数字）。

### 8.4 Tauri 桌面通知

```typescript
// src/services/PomodoroService.ts
import { sendNotification } from '@tauri-apps/api/notification';

async function onPhaseComplete(phase: PomodoroPhase): Promise<void> {
  if (!pomodoroState.config.notificationEnabled) return;

  const messages: Record<PomodoroPhase, string> = {
    running: '',
    paused: '',
    idle: '',
    break: '番茄时间结束！休息一下吧。',
    long_break: '4 个番茄完成！现在享受 15 分钟长休息。',
  };

  const msg = messages[phase];
  if (msg) {
    await sendNotification({ title: 'InkForge', body: msg });
  }
}
```

### 8.5 番茄钟与专注模式的交互

- 进入专注模式时，若番茄钟处于 `idle`，提示"是否同时开始番茄钟？"（轻量 Toast，3s 后消失，不强制响应）
- 退出专注模式时，番茄钟**继续运行**（不自动暂停），番茄进度保留
- 番茄休息阶段提示出现时（通知）：专注模式下不弹出任何 Modal，仅显示 Toast

---

## 9. 写作统计面板（WritingStatsPanel）

### 9.1 位置与触发

- 默认折叠，通过右侧边栏图标（`BarChart2`）展开
- 专注模式下：通过键盘快捷键（`Ctrl+Shift+S`，可自定义）弹出覆盖层，5s 后自动隐藏

### 9.2 面板内容

```
写作统计
  ─────────────────────────────────
  当前字数         12,345 字
  今日新增           +892 字
  本周总计         18,234 字
  ─────────────────────────────────
  写作速度（1min）    45 WPM
  预计完成目标      约 12 分钟
  专注时长          32 分钟
```

### 9.3 WPM 计算

WPM（Words Per Minute）：每 5s 采样一次，取最近 60s 内的字数增量：

```typescript
function computeWPM(wordCountHistory: Array<{ time: number; count: number }>): number {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  const relevant = wordCountHistory.filter(h => h.time >= oneMinuteAgo);

  if (relevant.length < 2) return 0;

  const oldest = relevant[0];
  const newest = relevant[relevant.length - 1];
  const deltaWords = newest.count - oldest.count;
  const deltaMinutes = (newest.time - oldest.time) / 60_000;

  return deltaMinutes > 0 ? Math.round(deltaWords / deltaMinutes) : 0;
}
```

### 9.4 预计完成时间

```typescript
function estimateMinutesToGoal(
  currentWords: number,
  targetWords: number,
  wpm: number
): number | null {
  if (!targetWords || wpm === 0) return null;
  const remaining = targetWords - currentWords;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / wpm);
}
```

### 9.5 数据采样策略

- 每 5s 将当前字数记录到 `wordCountHistory[]`（内存，不持久化）
- 历史记录保留最近 5min（超出自动丢弃）
- 今日/本周统计从 DataInsights Service 获取（写入 IndexedDB，跨会话持久）

---

## 10. 环境音（Ambient Sound）

### 10.1 设计约束

- **不联网**：所有音频文件随应用内置（Tauri asset），不请求任何网络资源
- 4 种内置音源：雨声 / 咖啡馆 / 白噪音 / 自然（鸟鸣+虫鸣）
- 决策 O-06（L1-49 B+C）：不做环境音，但原 Spec 补充说明：根据 21-focus-writing-assist-spec 要求进行完整实现

**注意**：L1-49 用户选择 B+C（未选 D）明确"不做环境音/番茄钟"，但本任务指令中明确要求实现番茄钟和环境音，以本 Spec 任务指令为准。

### 10.2 音频资源

| 音源 | 文件名 | 时长 | 格式 |
|------|--------|------|------|
| 雨声 | `ambient-rain.ogg` | 10min（循环） | OGG Vorbis |
| 咖啡馆 | `ambient-cafe.ogg` | 10min（循环） | OGG Vorbis |
| 白噪音 | `ambient-white-noise.ogg` | 5min（循环） | OGG Vorbis |
| 自然 | `ambient-nature.ogg` | 10min（循环） | OGG Vorbis |

所有音频文件位于 `src-tauri/assets/audio/`，通过 Tauri 的 `asset://` 协议访问。

### 10.3 AmbientSoundPlayer 组件

```vue
<template>
  <div class="ambient-player">
    <div class="sound-selector">
      <SoundButton
        v-for="sound in SOUNDS"
        :key="sound.type"
        :sound="sound"
        :active="currentSound === sound.type"
        @click="toggleSound(sound.type)"
      />
    </div>
    <div class="volume-control" v-if="isPlaying">
      <VolumeX v-if="volume === 0" :size="16" />
      <Volume2 v-else :size="16" />
      <Slider v-model="volume" :min="0" :max="1" :step="0.05" />
    </div>
  </div>
</template>
```

### 10.4 音频播放实现

```typescript
// src/services/AmbientSoundService.ts

class AmbientSoundService {
  private audio: HTMLAudioElement | null = null;
  private currentType: AmbientSoundType | null = null;

  async play(type: AmbientSoundType, volume: number): Promise<void> {
    if (this.currentType === type && this.audio && !this.audio.paused) return;

    await this.stop();

    const url = await tauriAsset(`audio/ambient-${type}.ogg`);
    this.audio = new Audio(url);
    this.audio.loop = true;
    this.audio.volume = volume;
    await this.audio.play();
    this.currentType = type;
  }

  async stop(): Promise<void> {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
      this.currentType = null;
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }
}
```

---

## 11. 写作氛围与 iA Writer 哲学（决策 O-06）

### 11.1 设计原则声明

InkForge 的写作区域遵循 iA Writer 式哲学：
- **安静**：UI 元素默认最小化，不抢夺注意力
- **专注**：默认状态下减少视觉干扰
- **控制权归用户**：所有氛围增强均为可选开关

### 11.2 写作模式配色（WritingMode Theme）

独立于应用 UI 主题（AppChrome Theme），由 ThemeEngine 的 `EditorContentTheme` 轨道控制（决策 O-06 + L1-58 D）。

内置 3 种写作配色：

| 名称 | 描述 | 背景色 |
|------|------|--------|
| Ethereal Day（默认） | InkForge 品牌配色，冷白纸张 | `#fafaf9` |
| Ethereal Night | 深色纸张，低饱和墨水色 | `#1a1a1a` |
| iA Classic | 仿 iA Writer 米白色调 | `#f5f2eb` |

写作配色在 Settings > Appearance > 写作配色 中切换，不影响应用 UI 颜色（TabBar / Sidebar 保持 AppChrome Theme）。

### 11.3 禁止清单（iA Writer 哲学强制约束）

写作模式下绝对禁止：
- 任何 emoji 出现在写作界面（icon 使用 lucide-vue-next）
- 打断写作的强制弹窗（通知走 Toast，轻量且自动消失）
- 过于花哨的动效（动效时长不超过 300ms，缓动非弹性）
- 在编辑区渲染与写作无关的信息（广告、推广）

---

## 12. FocusSessionSummary 退场总结

### 12.1 触发时机

用户退出专注模式时（按 `Esc` 或 `F11`）弹出退场总结。

### 12.2 UI 设计

居中 Modal（非全屏，宽度 480px）：

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│         专注会话完成                                 │
│         ─────────────────────────────────────       │
│                                                     │
│         [Timer] 专注时长    32 分 18 秒              │
│         [Text] 新增字数     +892 字                 │
│         [Target] 今日目标   1,234 / 2,000 字         │
│                                                     │
│         今日目标进度条 ██████████░░░░  62%           │
│                                                     │
│         连续写作天数：  ● ● ● ● ●  5 天              │
│                                                     │
│         [继续写作]          [返回 Hub]               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**注意**：图标位置使用 lucide-vue-next icon，不使用 emoji。上方伪代码中的 emoji 仅为说明，实际实现使用 `Timer` / `FileText` / `Target` icon。

### 12.3 数据来源

```typescript
function computeSessionSummary(
  store: WritingAssistStoreState,
  editorStore: EditorStoreState
): FocusSessionSummary {
  const now = Date.now();
  const startedAt = new Date(store.focusMode.startedAt!).getTime();
  const durationSeconds = Math.floor((now - startedAt) / 1000);

  const wordsAdded = editorStore.wordCount - store.focusMode.startWordCount;

  const goalProgressBefore = store.wordGoal.dailyTarget
    ? store.stats.todayAddedWords / store.wordGoal.dailyTarget * 100
    : 0;
  const goalProgressAfter = store.wordGoal.dailyTarget
    ? (store.stats.todayAddedWords + wordsAdded) / store.wordGoal.dailyTarget * 100
    : 0;

  const dailyGoalAchieved = store.wordGoal.dailyTarget
    ? goalProgressAfter >= 100
    : false;

  return { durationSeconds, wordsAdded, goalProgressBefore, goalProgressAfter, dailyGoalAchieved };
}
```

### 12.4 继续写作 / 返回 Hub

- "继续写作"：关闭 Modal，回到编辑器（不重新进入专注模式）
- "返回 Hub"：关闭 Modal，导航到 Hub 首页
- `Escape`：等同"继续写作"

### 12.5 目标达成时的额外展示

若此次专注会话期间达成了今日目标（`dailyGoalAchieved = true`）：

- Modal 顶部显示金色标题："今日目标已达成！"
- 进度条变为金色，伴随 CSS 脉冲动效（不使用 JS 动画库，纯 CSS keyframes）

```css
@keyframes goal-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--accent-gold); }
  50% { box-shadow: 0 0 0 6px transparent; }
}
.goal-bar--achieved {
  animation: goal-pulse 1.2s ease-in-out 3;
}
```

---

## 13. Store 定义

```typescript
// src/stores/useWritingAssistStore.ts
import { defineStore } from 'pinia';

export const useWritingAssistStore = defineStore('writingAssist', {
  state: (): WritingAssistStoreState => ({
    focusMode: {
      isActive: false,
      startedAt: null,
      startWordCount: 0,
    },

    typewriterMode: {
      isActive: false,
    },

    vignette: {
      isEnabled: false,
      height: 80,
    },

    wordGoal: {
      documentTarget: undefined,
      dailyTarget: undefined,
      weeklyTarget: undefined,
    },

    pomodoroState: {
      phase: 'idle',
      remainingSeconds: 25 * 60,
      completedPomodoros: 0,
      config: {
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        longBreakAfter: 4,
        autoStartBreaks: true,
        notificationEnabled: true,
      },
    },

    ambientSound: {
      currentSound: null,
      volume: 0.5,
      isPlaying: false,
    },

    stats: {
      currentDocWords: 0,
      todayAddedWords: 0,
      weeklyWords: 0,
      wpm: 0,
      estimatedMinutesToGoal: null,
      sessionSeconds: 0,
    },

    lastSummary: null,
  }),

  getters: {
    /** 当前文档目标进度（0~100） */
    documentGoalPercent(state): number {
      if (!state.wordGoal.documentTarget) return 0;
      return Math.min(100, (state.stats.currentDocWords / state.wordGoal.documentTarget) * 100);
    },

    /** 今日目标进度（0~100） */
    dailyGoalPercent(state): number {
      if (!state.wordGoal.dailyTarget) return 0;
      return Math.min(100, (state.stats.todayAddedWords / state.wordGoal.dailyTarget) * 100);
    },

    /** 本周目标进度（0~100） */
    weeklyGoalPercent(state): number {
      if (!state.wordGoal.weeklyTarget) return 0;
      return Math.min(100, (state.stats.weeklyWords / state.wordGoal.weeklyTarget) * 100);
    },

    /** 今日是否已达成目标 */
    isDailyGoalAchieved(state): boolean {
      return Boolean(state.wordGoal.dailyTarget && state.stats.todayAddedWords >= state.wordGoal.dailyTarget);
    },

    /** 番茄钟格式化剩余时间 */
    pomodoroTimeDisplay(state): string {
      const m = Math.floor(state.pomodoroState.remainingSeconds / 60);
      const s = state.pomodoroState.remainingSeconds % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },
  },

  actions: {
    /** 专注模式 */
    async enterFocusMode(): Promise<void>,
    async exitFocusMode(): Promise<void>,
    toggleFocusMode(): void,

    /** 打字机模式 */
    toggleTypewriterMode(): void,
    setTypewriterMode(enabled: boolean): void,

    /** 渐晕 */
    toggleVignette(): void,
    setVignetteHeight(height: number): void,

    /** 写作目标 */
    setWordGoal(goal: Partial<WritingGoal>): void,
    updateStats(wordCount: number): void,

    /** 番茄钟 */
    startPomodoro(): void,
    pausePomodoro(): void,
    resetPomodoro(): void,
    skipToNextPhase(): void,
    updatePomodoroConfig(config: Partial<PomodoroConfig>): void,
    /** 内部：每秒 tick */
    tickPomodoro(): void,

    /** 环境音 */
    async playSound(type: AmbientSoundType): Promise<void>,
    async stopSound(): Promise<void>,
    setVolume(volume: number): void,

    /** 统计 */
    startStatsSampling(): void,
    stopStatsSampling(): void,
    updateWPM(): void,

    /** 从持久化加载配置 */
    async loadFromSettings(): Promise<void>,

    /** 保存配置到 Settings */
    async saveToSettings(): Promise<void>,
  },

  persist: {
    // 持久化写作目标和各模式开关，不持久化实时统计
    paths: ['wordGoal', 'typewriterMode', 'vignette', 'pomodoroState.config', 'ambientSound.volume'],
  },
});
```

### 13.1 2026-04-30 Compatible Baseline Implementation Note

- 当前 baseline 已落地 `src/stores/writingAssist.ts`，覆盖 FocusMode 会话元数据、Vignette、Pomodoro、AmbientSound、WPM 采样和 `FocusSessionSummary`。
- `WorkstationView.vue` 保留原有 focus layout restore 合同，并在进入/退出专注模式时与 `writingAssistStore` 同步真实开始字数、会话时长、目标进度与退出总结。
- `WritingAssistPanel.vue` 已接入右侧 Inspector，直接消费当前 Markdown authority 的实时字数、今日/本周窗口统计、既有 `settings.writingGoal` 目标值和既有 `settings.editor.typewriterMode` 开关。
- 环境音 baseline 采用浏览器 Web Audio 本地生成声场，避免把尚未打包的 `src-tauri/assets/audio/*.ogg` 资源伪装为已存在文件；若未来产品选择资产音频，应替换为真实 Tauri asset 协议读取并保留错误态。
- 当前实现不引入 mock 数据、样本文档、假音频成功状态或 Emoji glyph；目标字数仍复用现有 Settings Editor tab，完整 `Settings > Writing` 拆分留作 full Spec 21。
- 本轮验证：`vue-tsc --noEmit`、ESLint quiet、`vitest run src/services/writing-assist/stats.test.ts`、`pnpm build`、生产 preview `/workstation` smoke、触达文件 `git diff --check` 与 Emoji presentation scan 均通过；build 仅保留既有 Vite chunk-size warning，preview 完成后已停止服务并确认 5179 端口清空。

---

## 14. 测试矩阵

### 14.1 单元测试

| # | 测试项 | 期望行为 |
|---|--------|----------|
| 1 | `enterFocusMode` 记录 startedAt 和 startWordCount | 进入时刻被记录 |
| 2 | `exitFocusMode` 计算 durationSeconds 正确 | 秒数 = 退出时间 - 进入时间 |
| 3 | `exitFocusMode` wordsAdded = currentWordCount - startWordCount | 净新增字数正确 |
| 4 | `computeWPM` 无历史时返回 0 | 不除以 0 |
| 5 | `computeWPM` 1 分钟内新增 45 个词返回约 45 | WPM 计算准确 |
| 6 | `estimateMinutesToGoal` 目标为 0 时返回 null | 不设目标时无预计时间 |
| 7 | `estimateMinutesToGoal` WPM 为 0 时返回 null | 不除以 0 |
| 8 | `documentGoalPercent` 超出目标时最大 100 | 不超过 100% |
| 9 | `tickPomodoro` 写作阶段倒计时到 0 后切换到 break | 状态机迁移正确 |
| 10 | `tickPomodoro` 4 个番茄后进入 long_break | 长休息触发正确 |
| 11 | `getProgressColor` 62% 返回蓝色 | 50%~90% 范围 |
| 12 | `getProgressColor` 100% 返回金色 | 完成状态 |
| 13 | 渐晕高度限制在 40~200px | Slider 约束有效 |
| 14 | `cleanupWordCountHistory` 丢弃 5min 前的采样 | 内存不无限增长 |
| 15 | `FocusMode + SplitView` 组合被禁止 | 尝试同时激活时返回错误或忽略 |

### 14.2 集成测试

| # | 测试项 | 期望行为 |
|---|--------|----------|
| 16 | 进入专注模式后 Sidebar 隐藏，编辑器居中 | DOM 类名包含 `focus-mode-active` |
| 17 | 专注模式下 Ctrl+S 仍触发保存 | `AutoSaveService.manualSave()` 被调用 |
| 18 | 专注模式下斜杠命令弹出正常 | `/` 触发命令面板弹层 |
| 19 | 退出专注模式弹出 FocusSessionSummary | Modal 显示 durationSeconds > 0 |
| 20 | 打字机模式：光标移到底部后编辑区自动上滚 | 光标始终在视口 50% 位置附近 |
| 21 | 今日目标达成后触发 GoalCompletionAnimation | 进度条出现金色动效 |
| 22 | 番茄钟 25min 后触发桌面通知 | Tauri notification API 被调用 |
| 23 | 环境音切换到雨声，音频开始播放 | HTMLAudioElement.play() 被调用，loop=true |
| 24 | 环境音音量调整立即生效 | HTMLAudioElement.volume 更新 |
| 25 | 写作统计面板 WPM 每 5s 更新一次 | 计时器被正确调度 |

---

*本 Spec 由 InkForge v2.1 Spec 工程师生成，基于 L1-45 C、L1-46 D、L1-48 B、L1-49 B+C、决策 O-01~O-06 综合制定。*
