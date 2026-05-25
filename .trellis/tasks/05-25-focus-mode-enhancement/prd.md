# focus-mode-enhancement

## Goal

增强"专注写作"面板的实用性：写作数据可视化 + 番茄钟增强 + 环境音增强 + 写作目标增强。面板设计基础好（task 1 已归一字阶），现在填充功能深度。

## What I Already Know

### 现有架构

- **WritingAssistPanel.vue**: 9 props from WorkstationView, emits toggleFocus/toggleTypewriter. 从 writingAssist store 取 ambient/pomodoro/stats/vignette
- **stores/writingAssist.ts**: FocusModeState, PomodoroConfig (work 25m, short 5m, long 15m, longBreakAfter 4), AmbientSoundState (4 types: rain/cafe/whitenoise/nature), Stats (wpm/sessionSeconds/estimatedMinutesToGoal), wordCountHistory (in-memory only)
- **services/writing-assist/stats.ts**: pure fns (computeWpm 60s window cap 300, estimateMinutesToGoal, formatDuration, appendWordCountSample, WordCountSample type)
- **services/writing-assist/ambient-sound.ts**: Web Audio synthesis (brown noise + BiquadFilter per type). No audio files.
- **composables/useTextStats.ts**: computeWritingWindowStats over article DB
- **settings.ts**: writingGoal { documentTarget?, dailyTarget?, weeklyTarget? } — editable in SettingsView
- **Persistence**: only vignette + pomodoroConfig + ambientVolume in localStorage. No session history / streaks / daily totals persisted in this store (daily/weekly computed live from article DB)
- **FocusSessionSummaryModal.vue**: exists, shown on focus exit

## Requirements

### R1: 写作数据可视化

**R1.1 WPM 迷你折线图**: WritingAssistPanel "每分钟字数" card 下方增加 60s 滑动窗口的 WPM sparkline（纯 SVG，≤30 数据点，无外部依赖）。数据源: wordCountHistory (already collected via appendWordCountSample)

**R1.2 目标进度环**: "写作目标" 3 行（当前/今日/本周）的 progress bar 升级为 circular progress ring（SVG arc），数字在环心。保留 percent prop 计算。

### R2: 番茄钟增强

**R2.1 可编辑时长**: pomodoro card 增加 gear icon → popover/inline-edit：workMinutes (1-90), shortBreakMinutes (1-30), longBreakMinutes (1-60), longBreakAfter (1-8)。调用 store.updatePomodoroConfig()。

**R2.2 轮次显示 + 进度**: 显示当前轮次 / longBreakAfter（如 "2/4"），用小圆点表示。

**R2.3 Session History**: 新增 store 字段 `pomodoroHistory: PomodoroSession[]`（{startedAt, endedAt, phase, wordsAdded}），persist 到 localStorage。WritingAssistPanel 底部折叠区显示最近 5 个 session。

### R3: 环境音增强

**R3.1 新增音源**: 增加 4 个: thunderstorm, keyboard, fireplace, birdsong（仍 Web Audio 合成，不引入音频文件）。

**R3.2 混音**: 支持同时播放 ≤2 个音源。store 的 ambientSound 从单选变为 `activeSounds: Set<AmbientSoundType>`（max 2）。UI: chip 可多选，第 3 个自动踢掉最早的。

**R3.3 音源预设**: 增加 3 个一键预设: "深夜书房"(rain+keyboard), "户外咖啡"(cafe+birdsong), "图书馆"(whitenoise)。

### R4: 写作目标增强

**R4.1 内联可编辑目标**: 目标行（当前/今日/本周）的 target 值可点击编辑（click → number input → blur save）。调用 settingsStore.updateSettings()。

**R4.2 达标动画**: goal percent >= 100% 时 progress ring 播放 confetti-style CSS 动画（无外部依赖，纯 CSS keyframe）。

**R4.3 连续达标 Streak**: 新增 store 字段 `goalStreak: { currentDays: number, longestDays: number, lastDate: string }`，persist 到 localStorage。WritingAssistPanel 目标区域显示 "🔥 连续 N 天达标"。每日目标 100% 时 bump streak。

## Acceptance Criteria

- [ ] R1.1: WPM sparkline 渲染 ≤30 点 SVG，实时更新
- [ ] R1.2: 3 个 circular progress rings 替代 bar
- [ ] R2.1: gear → popover 编辑 4 个时长值，persist
- [ ] R2.2: 轮次 "2/4" + 小圆点
- [ ] R2.3: session history 持久化 + 最近 5 显示
- [ ] R3.1: 8 个音源 chip（原 4 + 新 4）
- [ ] R3.2: ≤2 个同时播放
- [ ] R3.3: 3 个预设 chip
- [ ] R4.1: 目标值 click-to-edit
- [ ] R4.2: 达标 CSS confetti 动画
- [ ] R4.3: streak 显示 + persist
- [ ] pnpm typecheck + lint 绿
- [ ] 现有 stats.test.ts 仍绿
- [ ] WritingAssistPanel.vue + writingAssist.ts 为主改动文件；ambient-sound.ts 新增音源；stats.ts 新增 streak helpers

## Out of Scope

- 外部音频文件引入
- 写作统计 dashboard 页面（仅 panel 内 widget）
- 多设备同步
- 写作 AI 助手功能
- 暗色模式适配

## Technical Notes

- WritingAssistPanel: `inkforge/src/components/editor/WritingAssistPanel.vue`
- Store: `inkforge/src/stores/writingAssist.ts`
- Ambient: `inkforge/src/services/writing-assist/ambient-sound.ts`
- Stats: `inkforge/src/services/writing-assist/stats.ts`
- Settings store: `inkforge/src/stores/settings.ts` (writingGoal)
- FocusSummary: `inkforge/src/components/editor/FocusSessionSummaryModal.vue`
