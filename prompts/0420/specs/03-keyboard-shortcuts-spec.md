# 03 — Keyboard Shortcuts Spec（快捷键 + FindReplace + Chord + 帮助面板）

> 文档类型: Spec（基线升级 · 中等）
> 阶段: Phase 3
> 依赖: 22-command-palette, 26-multi-account-profile（账户切换键）, 37-snippet-system, 49-editor-keymap
> 被依赖: 01-editor-typora, 02-hub, 05-toolbar, 07-settings-full（Shortcuts Tab）
> 来源决策: Part 2 §T03 + Part 2 §EX-03（CommandPalette）
> 来源问卷: T03-01~13, S-04, EX-03
> 权威来源: 文档
> 创建日期: 2026-04-20
> 最后更新: 2026-04-29
> 铁律遵循: R-21, R-22, R-23（键位不与 OS 冲突）

---

## 目录

- §1 背景与目标
- §2 范围与边界
- §3 快捷键设计原则
- §4 33 快捷键映射表
- §5 DEFAULT_SHORTCUTS 定义
- §6 热更新与 Settings 联动
- §7 冲突检测（Tauri 单套）
- §8 Chord 多段组合
- §9 Chord 可视化提示 Overlay
- §10 Tab 键上下文感知（与 49 契约）
- §11 IME 合成期策略
- §12 作用域模型（v2.1 全局统一）
- §13 FindReplace 完整规范
- §14 FindReplace UI 布局
- §15 帮助面板（Searchable + Filter）
- §16 全局快捷键 Ctrl+N
- §17 StatusBar 失败提示
- §18 与 CommandPalette 的协同
- §19 验收矩阵
- §20 权威来源登记表

---

## §1 背景与目标

### 1.1 问题背景

v2.0 基础映射已存在，但：
- FindReplace 能力弱（仅 find，无 replace，无正则 / 大小写 / 全词）。
- 无 Chord 多段组合。
- 无帮助面板；冲突无提示。
- IME 合成期策略未定义，Ctrl+数字可能打断输入法。

### 1.2 目标

- **FindReplace VS Code 风**：正则 + 大小写 + 全词 + 跳转 + 计数 + 替换全部。
- **热更新** + 冲突可覆盖 + 警告。
- **Chord 多段组合**：如 `Ctrl+K Ctrl+S` 打开 Shortcuts 设置。
- **帮助面板**：Shortcut Reference 可搜索 / 分组 / 录制 / 修改 / 筛选。
- **全局 Ctrl+N**（Hub 新建文章）。
- **StatusBar 失败短提示**。

---

## §2 范围与边界

### 2.1 本 Spec 覆盖

- 33 快捷键映射表 + 热更新
- FindReplace 规范 + UI
- Chord 组合 + Overlay
- 帮助面板
- 冲突检测
- IME 合成期
- StatusBar 提示

### 2.2 不覆盖

| 主题 | 去处 |
| --- | --- |
| 编辑器内键位细则（列表 Enter / 多光标 / 撤销分组） | 49-editor-keymap |
| 模式切换快捷键 | 01-editor-typora §4.2 |
| CommandPalette UI | 22-command-palette |
| Settings Shortcuts Tab 界面 | 07-settings-full |
| Snippet | 37-snippet-system |

---

## §3 快捷键设计原则

1. **遵循平台习惯**：Ctrl/Cmd 自动按 OS 切换（Tauri 平台桥接）。
2. **简化一致**：Tauri 单套规则（T03-11 + 补充 "不做 Web 版"）。
3. **可覆盖**：用户自定义 > 默认；冲突以用户选择为准。
4. **上下文感知**：Tab 键等按当前焦点上下文。
5. **可发现**：帮助面板 + 命令 palette 随时查询。
6. **可撤销**：修改误操作，用户始终可撤销编辑。

---

## §4 33 快捷键映射表

### 4.1 全局（Application）

| # | Key | Command | Scope | 备注 |
| --- | --- | --- | --- | --- |
| 1 | Ctrl+N | new-article | Hub / Workstation | 全局 Ctrl+N（S-04） |
| 2 | Ctrl+O | open-article | — | 打开选择器 |
| 3 | Ctrl+S | save | Workstation | 即时保存（正常自动） |
| 4 | Ctrl+Shift+S | save-as | Workstation | 另存为 |
| 5 | Ctrl+W | close-article | Workstation | 关闭当前 |
| 6 | Ctrl+, | open-settings | Global | — |
| 7 | Ctrl+K | command-palette | Global | 22-command-palette |
| 8 | Ctrl+P | quick-open | Global | 快速打开文件 |
| 9 | Ctrl+Shift+P | peek-preview-hold / command-palette-alt | Context | 按上下文 |
| 10 | Ctrl+Shift+N | clear-formatting | Workstation | 改自原 Ctrl+\ （T03-06=C） |

### 4.2 编辑

| # | Key | Command | 备注 |
| --- | --- | --- | --- |
| 11 | Ctrl+B | bold | — |
| 12 | Ctrl+I | italic | — |
| 13 | Ctrl+U | underline | — |
| 14 | Ctrl+Shift+X | strike | — |
| 15 | Ctrl+Shift+C | code-inline | — |
| 16 | Ctrl+K Ctrl+K | link-insert | Chord |
| 17 | Ctrl+Shift+H | highlight | — |
| 18 | Ctrl+Alt+H | highlight-color-picker | 16 §5 |
| 19 | Ctrl+Shift+L | list-bullet | — |
| 20 | Ctrl+Shift+O | list-ordered | — |
| 21 | Ctrl+Shift+T | list-task | — |

### 4.3 模式 / 预览

| # | Key | Command | 备注 |
| --- | --- | --- | --- |
| 22 | Ctrl+\ | toggle-source-mode | T03-06=C 专职 |
| 23 | Ctrl+Shift+P（hold） | peek-preview | 01 §5.6 |
| 24 | Ctrl+= | cycle-paper-width | T01-11=C |

### 4.4 查找与导航

| # | Key | Command | 备注 |
| --- | --- | --- | --- |
| 25 | Ctrl+F | find | §13 |
| 26 | Ctrl+H | find-replace | §13 |
| 27 | Ctrl+G | find-next | §13 |
| 28 | Ctrl+Shift+G | find-previous | §13 |
| 29 | Ctrl+Enter | jump-to-workstation / exit-block | 上下文 |

### 4.5 Chord & Palette

| # | Key | Command | 备注 |
| --- | --- | --- | --- |
| 30 | Ctrl+K Ctrl+S | open-settings-shortcuts | Chord |
| 31 | Ctrl+K Ctrl+T | toggle-theme | Chord |
| 32 | Ctrl+K Ctrl+R | recent-files | Chord |
| 33 | F1 | help-panel | §15 |

---

## §5 DEFAULT_SHORTCUTS 定义

### 5.1 结构

```ts
interface ShortcutDefinition {
  id: string
  key: string              // 'Ctrl+N' 或 'Ctrl+K Ctrl+S'
  commandId: string        // 命令注册表 ID
  scope: 'global' | 'hub' | 'workstation' | 'editor' | 'source' | 'settings'
  when?: string            // 条件表达式 'hasSelection', 'inCodeBlock'
  source: 'default' | 'user' | 'plugin'
  description: string
}
```

### 5.2 文件位置

- `src/features/shortcuts/default-shortcuts.ts`
- 运行时与用户覆盖合并为最终映射。

---

## §6 热更新与 Settings 联动（T03-03=A）

### 6.1 热更新流程

- 用户在 Settings > Shortcuts 中修改 → 立即写入 `user_shortcuts` 表 → Tauri 全局取消旧绑定 + 注册新 → 立即生效，无需重启。
- 同步到所有打开窗口（BroadcastChannel）。

### 6.2 冲突覆盖（T03-04=A）

- 用户分配一个已被占用的键 → 弹出对话框：「Ctrl+N 已绑定到 `new-article`，你要改绑到 `new-folder` 吗？」
- 选择 "改绑" → 旧命令进入"未绑定"状态，StatusBar 警告"1 个命令失绑"。

### 6.3 重置

- 单项 / 全部重置按钮（07-settings §3-level reset）。

---

## §7 冲突检测（Tauri 单套规则）

### 7.1 规则

- **Tauri 唯一**：只做 App（T03-11 + 补充），不存在浏览器冲突兜底。
- OS 保留键（Ctrl+Alt+Del 等）**不可覆盖**，用户尝试分配 → 弹提示 + 禁用保存。

### 7.2 检测

- 保存前检查：
  - 与 OS 保留列表冲突 → block
  - 与其他 InkForge 命令冲突 → prompt
  - 与 plugin 注册的命令冲突 → prompt

### 7.3 OS 保留列表

- Windows: Ctrl+Alt+Del, Win+*, Ctrl+Shift+Esc
- macOS: Cmd+Space, Cmd+Tab, Cmd+Q(可覆盖 with 警告), Cmd+H
- Linux: Ctrl+Alt+F1~F7

---

## §8 Chord 多段组合（T03-10=D）

### 8.1 语法

- `Ctrl+K Ctrl+S`：按 Ctrl+K，然后 2 秒内按 Ctrl+S。
- 中间可以是 chord leader 字符：`Ctrl+K s`（非组合键，只按 s）。

### 8.2 状态机

```
IDLE ─ 按下 leader (e.g. Ctrl+K) ─► ARMED (2s timer)
  │                                  │
  │                                  ├─ 匹配 second → EXECUTE → IDLE
  │                                  ├─ timeout → CANCEL → IDLE
  │                                  └─ Esc → CANCEL
```

### 8.3 超时

- 2 秒无第二键 → 自动取消 + StatusBar "Chord 取消"。
- 可在 Settings > Shortcuts > Chord Timeout 调整（1-5s）。

---

## §9 Chord 可视化提示 Overlay

### 9.1 行为（T03-10=D）

- 进入 ARMED 状态瞬间：右下角弹出 Overlay 面板：
  - 标题："Chord Ctrl+K"
  - 列表显示所有以 Ctrl+K 为前缀的命令：
    - `Ctrl+K Ctrl+S — Settings: Shortcuts`
    - `Ctrl+K Ctrl+T — Toggle Theme`
    - …
  - 倒计时条（2s）

### 9.2 取消

- Esc 键立即关闭。
- 超时自动关闭。

---

## §10 Tab 键上下文感知

### 10.1 授权契约

- 本 Spec 仅定义 Tab 键会在哪些上下文被"锁定"；具体行为委托给 49-editor-keymap §4。

### 10.2 锁定列表

- 列表项、代码块、表格单元格（见 49 §4）

### 10.3 其他上下文

- 非锁定上下文中 Tab 切换焦点；Shift+Tab 反向。

---

## §11 IME 合成期策略（T03-08=B）

### 11.1 跳过清单

- Ctrl+1 / Ctrl+2 / … / Ctrl+9（数字块）在合成期**跳过**（不触发命令）。
- 其他组合键**正常触发**。

### 11.2 实现

- 监听 `compositionstart` / `compositionend`。
- 在合成期间 shortcut 监听器对数字前缀做白名单判定。

### 11.3 验收

- 6 种中文输入法 + Office 键盘 × 33 键位通过率 100%。

---

## §12 作用域模型

### 12.1 v2.1 策略（T03-09=A）

- **全局统一**：所有快捷键在 Hub / Workstation / Editor 共享；上下文不启用的命令通过 `when` 表达式控制激活。

### 12.2 v2.2+ 分层预留

- 为未来添加 `scope: 'workspace' | 'editor' | 'panel'` 留接口。
- v2.1 Settings UI 按 scope 分组展示，但无法单独配置。

---

## §13 FindReplace 完整规范（T03-01=C, T03-02=A）

### 13.1 功能清单

| 功能 | 键 | 说明 |
| --- | --- | --- |
| 查找 | Ctrl+F | 打开查找面板 |
| 替换 | Ctrl+H | 打开查找+替换面板 |
| 下一个 | F3 / Ctrl+G | — |
| 上一个 | Shift+F3 / Ctrl+Shift+G | — |
| 替换当前 | Alt+R | — |
| 替换全部 | Alt+A | — |
| 正则模式 | Alt+Ctrl+R | Toggle |
| 大小写敏感 | Alt+Ctrl+C | Toggle |
| 全词匹配 | Alt+Ctrl+W | Toggle |

### 13.2 匹配计数

- 面板显示 `m/n` 当前 / 总数。
- 超过 1000 匹配时显示 `1000+` 并延迟计数（避免卡顿）。

### 13.3 跳转

- 自动将匹配滚入视口。
- 当前匹配高亮 ≠ 其他匹配高亮（主色 vs 次色）。

### 13.4 正则

- JavaScript 原生 RegExp；用户输入非法 → 红色边框 + Tooltip 错误。

### 13.5 作用域

- "当前文档" / "当前文件夹" / "整个工作区"（Settings 切换）。
- 跨文档查找默认 disabled，通过 Workstation > Find 启用。

---

## §14 FindReplace UI 布局

### 14.1 面板

- 右上角浮窗（不遮挡当前行）。
- z-index 高于浮动工具栏但低于模态。
- 尺寸：420 × 自适应。

### 14.2 布局

```
┌─ FindReplace ──────────────┐
│ Search [输入查找词  ]  x    │
│   [.*] [Aa] [Ab]   m/n     │
│ Up     [输入替换词  ]       │
│   [替换] [全部替换]          │
└────────────────────────────┘
```

### 14.3 关闭

- Esc / × 按钮 / 点击面板外。

---

## §15 帮助面板（Searchable + Filter）

### 15.1 触发

- F1 / Settings > Shortcuts > Help。

### 15.2 功能（T03-12=C + 补充 D）

- **搜索**：输入框支持命令名、快捷键（`Ctrl+K`）、命令 ID。
- **分组**：按 Application / Edit / View / Navigate / Find / Format / Plugin 分组。
- **筛选**：
  - By Scope
  - By Source（default / user / plugin）
  - Conflicting
  - Unbound
- **录制**：右侧按钮 "Record"，按组合键 → 显示按键 → "Apply to selected row"。
- **修改**：直接在行内编辑（单击键位 → 录制）。
- **导出** / **导入** JSON。

### 15.3 帮助 Tooltip

- 在 Settings > Shortcuts 的行内 hover 显示键位当前绑定 + 来源。

---

## §16 全局快捷键 Ctrl+N（S-04）

### 16.1 行为

- 在 Hub / Workstation / Settings 任何位置 Ctrl+N → 创建新文章。
- 新文章默认进入 Workstation + Typora 模式。
- 模板选择：按最近使用模板（无则空白）。

### 16.2 冲突

- 与编辑器内 Ctrl+N 冲突时 → 以全局为准（编辑器内 Ctrl+N 不绑定内容命令）。

---

## §17 StatusBar 失败提示（T03-13=B）

### 17.1 场景

- 按下未绑定键 → 无提示。
- 按下 Chord leader 但超时 → StatusBar "Chord 已取消"。
- 按下命令但当前上下文不可用 → StatusBar "此命令在当前上下文不可用"。
- 命令执行失败（permission 拒绝等）→ StatusBar 错误 + 详情链接。

### 17.2 短提示规范

- 3 秒自动消失；可点击展开详情。
- 不弹 Toast，避免打断。

---

## §18 与 CommandPalette 的协同

### 18.1 统一入口（EX-03 + L1-27 D）

- CommandPalette 是**发现**入口；快捷键是**熟练**入口。
- Palette 中每个命令显示其当前绑定键。
- 改绑快捷键 → Palette 实时显示新键。

### 18.2 触发

- Ctrl+K 打开 CommandPalette。
- Ctrl+Shift+P 在 Workstation 上下文中可为 Peek Preview；在 Hub / Settings 等上下文中作为 Palette 备选触发（22-command-palette §触发）。

---

## §19 验收矩阵

| 编号 | 用例 | 正向 | 失败 | 恢复 | 边界 |
| --- | --- | --- | --- | --- | --- |
| KS1 | Ctrl+N Hub | 新建文章 | 最近模板被删 → 空白 | — | — |
| KS2 | Ctrl+F 查找 | 面板出现 | 正则非法 → 红框 | 修正 | 1000+ 匹配 |
| KS3 | Ctrl+H 替换全部 | 替换完毕 | 无匹配 → Toast "0 替换" | Undo 一次回退 | 大小写敏感 |
| KS4 | 正则 + 全词 | 联合生效 | — | — | 嵌套括号 |
| KS5 | Chord Ctrl+K Ctrl+S | 打开 Settings | 超时 → Status 取消 | — | — |
| KS6 | Chord Overlay | 显示候选 | Esc 取消 | — | — |
| KS7 | 冲突检测 | 改绑弹对话 | 用户取消 → 保留原状 | — | OS 保留键阻止 |
| KS8 | 热更新 | 立即生效 | 多窗口不同步 → BroadcastChannel | — | 快速连续改 |
| KS9 | 帮助面板搜索 | 过滤即时 | 大列表 → 虚拟滚动 | — | 插件加载新命令 |
| KS10 | 帮助面板录制 | 捕获组合 | OS 键 → 拒绝 | — | IME 合成期录制 |
| KS11 | IME 合成 Ctrl+1 | 不触发 | — | — | 搜狗 / 微软 |
| KS12 | F1 帮助面板 | 打开 | — | — | — |
| KS13 | StatusBar 失败提示 | 3s 消 | 可点击详情 | — | — |
| KS14 | Ctrl+\ 模式切换 | Source<->Typora | — | — | — |
| KS15 | Ctrl+Shift+N 清格式 | 去 mark | — | Undo 恢复 | 选区跨块 |
| KS16 | 插件命令冲突 | 提示改绑 | 用户拒绝 → 插件命令未绑定 | — | — |
| KS17 | 作用域 v2.1 统一 | 全局生效 | — | — | — |
| KS18 | 导入导出 shortcuts | JSON 迁移 | 格式错 → 拒绝 | — | — |

### 19.2 证据（artifacts/03-keyboard/）

- 33 键位用例 GIF
- FindReplace 大文档（100k 字）测试
- Chord Overlay 截图
- 帮助面板搜索演示

---

## §20 权威来源登记表

| 条目 | 权威类型 | 权威文件 | 备注 |
| --- | --- | --- | --- |
| 33 快捷键表 | 文档 | 本 §4 | — |
| FindReplace | 文档 | 本 §13 + 14 | T03-01=C, T03-02=A |
| 热更新 | 文档 | 本 §6 | T03-03=A |
| 冲突检测 | 文档 | 本 §7 | T03-04=A |
| Chord | 文档 | 本 §8 + 9 | T03-10=D |
| Tab 上下文（边界） | 文档 | 49-editor-keymap §4 | T03-07=C |
| IME 合成 | 文档 | 本 §11 + 01 §16 | T03-08=B |
| 作用域 v2.1 | 文档 | 本 §12 | T03-09=A |
| 帮助面板 | 文档 | 本 §15 | T03-12=C+补 |
| Ctrl+N 全局 | 文档 | 本 §16 + 02-hub | S-04 |
| StatusBar 提示 | 文档 | 本 §17 + 14-statusbar | T03-13=B |
| Palette 协同 | 文档 | 本 §18 + 22-command-palette | EX-03 |

---


## 2026-04-29 Implementation Ledger

- P0-03 baseline has been completed in the current app as a 38-shortcut Settings-backed implementation, covering the original 33-key formatting / heading / block / editing / view matrix plus mode and paper-width extensions.
- Real implementation files: `src/extensions/KeyboardShortcuts.ts`, `src/components/editor/FindReplace.vue`, `src/components/editor/EditorPanel.vue`, `src/components/editor/FloatingToolbar.vue`, `src/views/WorkstationView.vue`, `src/stores/settings.ts`, `src/views/SettingsView.vue`, `src/components/settings/ShortcutInput.vue`, and `src/utils/shortcuts.ts`.
- FindReplace is implemented as an in-editor floating panel with ProseMirror `DecorationSet` highlighting, active match selection, case-sensitive / regex / whole-word toggles, current replace, and replace all.
- Runtime shortcut normalization now uses physical `KeyboardEvent.code` for shifted punctuation and digit keys, preventing documented bindings such as `Ctrl+Shift+[` and ``Ctrl+Shift+` `` from missing on real keyboards.
- Verification evidence on 2026-04-29: `pnpm exec vue-tsc --noEmit`, `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet`, targeted shortcut normalization script (`SHORTCUT_NORMALIZATION_OK`), targeted static acceptance script (`P0_03_STATIC_OK`), and `pnpm build` all passed. The build still reports the existing chunk-size warning, which is tracked outside this shortcut baseline.
- Remaining scope from this v2.1 spec is intentionally not claimed by P0-03: 120+ command registry, Chord overlay, F1 help panel, global Ctrl+N creation, StatusBar failure prompts, keymap JSON import/export, and command-palette live synchronization remain active requirements for their dedicated 0420 follow-up specs.

**文档完**
