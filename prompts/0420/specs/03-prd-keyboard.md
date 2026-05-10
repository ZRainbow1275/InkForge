---
Spec 编号: 03-prd-keyboard
Spec 名称: 键盘快捷键产品需求文档 (PRD)
Task 归属: T03 快捷键 / FindReplace / 输入法兼容
版本: v2.1.0
创建日期: 2026-04-21
Author: InkForge Spec 工程组
状态: Approved
权威来源: prompts/0420/_extracted/02b-L2-T03-T04-T05-T06.md (T03-01 ~ T03-13) + L1-27 ~ L1-29
对应 Spec: 03-spec-keybindings.md
关联决策: L1-27 D 统一命令注册表, L1-29 A 三入口分工, T03-03 A 热更新, T03-06 C Ctrl+\ 解耦, T03-09 A 全局统一, T03-10 D chord 支持
---

# InkForge v2.1 — 键盘快捷键产品需求文档 (PRD)

> 本 PRD 定义 InkForge v2.1 键盘体系的产品层契约：愿景、用户群、功能范围、非目标、SLO 与验收。工程实现见 `03-spec-keybindings.md`。

## 目录

- 第一章 愿景与哲学
- 第二章 产品定位与范围
- 第三章 目标用户画像
- 第四章 功能范围
- 第五章 非目标（明确拒绝的事）
- 第六章 业务规则与冲突策略
- 第七章 性能 SLO 与交付门槛
- 第八章 分层与作用域
- 第九章 预设方案
- 第十章 用户旅程
- 第十一章 可观测性
- 第十二章 验收标准
- 第十三章 发布计划与分期
- 第十四章 风险登记
- 附录 A 术语表
- 附录 B 硬性阈值清单
- 附录 C 决策溯源表

---

## 第一章 愿景与哲学

### 1.1 一句话愿景

InkForge 的键盘体系必须让**文字工作者用最小的中断、最低的记忆成本完成绝大部分写作动作**；对**极客用户**开放 VS Code 级别的深度定制（chord / 自定义 / 预设方案），同时对**非技术用户**保持零负担。

### 1.2 哲学支柱

1. **键盘优先，但不是键盘唯一**：快捷键是效率工具，不是入门门槛。Hub 新用户用鼠标能走完全部路径。
2. **极客流畅**（对齐 T03-10 D 补充）：InkForge 承诺对 Vim/VSCode/Emacs 重度用户友好 —— 支持 chord、chord 可视化、多种预设方案、完整自定义。
3. **冲突最小化、歧义零容忍**（对齐 T03-06 C）：同一键位不允许两种不相关语义共存；所有双重用途必须解耦为独立键位。
4. **热更新不重启**（对齐 T03-03 A）：用户修改快捷键即时生效，不要求刷新页面或重启应用。
5. **作用域统一优先**（对齐 T03-09 A 用户补充"先这样，后续再改"）：v2.1 先走全局统一模型，减少上下文歧义；复杂作用域层级延期到 v2.2。
6. **Tauri 独占定位**（对齐 G-06 B + G-12 A + T03-11 "只做 App"）：InkForge 不做 Web 版；快捷键设计专为 Tauri 桌面端 + 原生 OS 键盘语义。
7. **可移植但允许平台差异**：Windows/Linux/Mac 的 Cmd/Ctrl / Option/Alt 差异按 OS 习惯自动映射；用户自定义时显式跨平台标注。
8. **状态栏 / Toast 轻提示，不过度干扰**（对齐 T03-13 B）：快捷键失败只做轻量提示，不打断写作流。

### 1.3 决策原则（冲突时如何裁决）

1. **数据安全 > 便利**：涉及删除 / 覆盖 / 撤销栈清空的键位必须提供二次确认或自动备份。
2. **标准 > 创新**：与 VS Code / Typora / 系统标准相同的语义优先（Ctrl+C 永远是复制）。
3. **用户自治 > 默认**：用户可以覆盖任何键位，甚至覆盖系统保留键位（T03-04 A）；后果由用户承担。
4. **即时反馈 > 静默执行**：快捷键触发必须有反馈（视觉 / 状态栏 / Toast）。
5. **热更新 > 重启**：任何配置变更即时生效；拒绝"请重启以应用"。

---

## 第二章 产品定位与范围

### 2.1 产品定位

InkForge 键盘体系 = **Typora 默认习惯 + VS Code 深度定制 + 现代文字编辑器标准组合**。

三大入口严格分工（对齐 L1-29 A）：

| 入口 | 职责 | 触发方式 |
|---|---|---|
| **快捷键** | 熟练用户的高频动作；单键 / 组合键 / chord | 键盘 |
| **斜杠命令 `/`** | 插入 / 创建新元素；面向内容构造 | 编辑器内 `/` |
| **浮动工具栏** | 选区格式化；面向已选中内容变形 | 鼠标选择文本后弹出 |
| **右键菜单** | 上下文补充；面向鼠标操作者 | 鼠标右键 |

### 2.2 核心职责清单

| ID | 职责 | 必须落地 |
|---|---|---|
| J-01 统一命令注册表 | 所有快捷键通过 commandRegistry 注册 | L1-27 D / T05-09 D |
| J-02 默认键位覆盖 | 至少覆盖 120 条默认键位 | 本 PRD 第四章 |
| J-03 用户自定义 | Settings > Keyboard 可修改任何键位 | T03-12 C |
| J-04 冲突检测 | 录制时检测冲突，警告但可覆盖 | T03-04 A |
| J-05 热更新 | 修改后即时生效 | T03-03 A |
| J-06 Chord 支持 | VS Code 级 chord（两步按键） | T03-10 D |
| J-07 Chord 提示浮层 | chord 进行中显示"已按 Ctrl+K, 等待下一键" | T03-10 D |
| J-08 预设方案 | 默认 / Vim / VSCode / Emacs / Typora 五种 | 本 PRD 第九章 |
| J-09 导入导出 keymap | JSON 格式 | 本 PRD 第六章 |
| J-10 FindReplace | 正则 + 大小写 + 全词 + 跳转 + 计数 | T03-01 C |
| J-11 IME 兼容 | 组合输入期间跳过 Ctrl+数字 | T03-08 B |
| J-12 Tab 上下文感知 | 列表 / 代码块 / 其他三态 | T03-07 C |
| J-13 失败提示 | 状态栏短提示"当前不可用" | T03-13 B |
| J-14 快捷键速查卡 | F2 呼出 Tooltip 面板 | T03-05 C |
| J-15 帮助面板内嵌录制 | Settings > Keyboard 内可录制 / 修改 / 预览 | T03-12 C |

### 2.3 显式不承担的职责

- 不做 Web 版快捷键兼容（T03-11 补充：只做 App）
- 不做 VSCode extension host 级别的动态键位（v2.1 所有键位必须在启动时注册）
- 不做"根据用户使用频率自动调整键位"
- 不做基于 AI 的"智能快捷键推荐"
- 不做录制宏（Macro）能力

---

## 第三章 目标用户画像

### 3.1 用户群 A — 文字工作者（P0）

- **特征**：每日写作 1-4 小时；使用 Typora / Word / Bear 多年；对 Ctrl+B / Ctrl+I / Ctrl+Z 等标准组合熟练。
- **对键盘的期望**：标准快捷键 100% 可用；不要求学习新组合；鼠标能做的事键盘也能做。
- **痛点**：工具每次升级都改键位（例如从 Typora 到别的编辑器）；Ctrl+\ 双重用途造成困惑。
- **InkForge 的承诺**：提供"Typora 兼容预设"；核心键位与 Word / Typora 完全一致；Ctrl+\ 解耦。

### 3.2 用户群 B — 开发者 / 极客（P0）

- **特征**：每日写代码笔记 / 技术文档；重度 VS Code 用户；熟悉 chord / Vim 模式；希望深度自定义。
- **对键盘的期望**：VS Code 级 keymap 深度；支持 chord；支持预设方案快速切换；完整自定义。
- **痛点**：很多编辑器的快捷键"不够用"或"无法覆盖系统默认"。
- **InkForge 的承诺**：T03-10 D 的完整 chord + 可视化提示；允许覆盖系统保留键位（T03-04 A）；提供 VSCode / Vim / Emacs 预设。

### 3.3 用户群 C — 编辑 / 审校（P1）

- **特征**：每日修改他人文档；熟悉 Word 修订 / Google Docs 评论；重度使用查找替换。
- **对键盘的期望**：Ctrl+F 查找必须强大（正则 / 全词 / 计数）；Ctrl+H 替换好用；Ctrl+Shift+C 复制格式（远期）。
- **痛点**：很多编辑器的 Find 太弱，不支持正则；替换跳转繁琐。
- **InkForge 的承诺**：T03-01 C 的完整 FindReplace；VS Code 风格右上浮窗面板。

### 3.4 用户群 D — 移动 / 无键盘用户（非本 PRD 承担）

- InkForge 是 Tauri 桌面端，不为移动设备设计。
- 键盘不可用时用户可用鼠标完成 95% 动作。

---

## 第四章 功能范围

### 4.1 快捷键总量

v2.1 必须在 Spec（03-spec-keybindings.md）中定义 **≥ 120 条** 默认快捷键，分布如下：

| 层 | 最低数量 | 代表动作 |
|---|---|---|
| 编辑器层（Typora/Source/Preview） | 60 | Bold / Italic / List / Table / Undo |
| 应用层（全局） | 20 | New / Open / Settings / Switch Mode |
| Hub 层 | 10 | Ctrl+N / Ctrl+Shift+N / Ctrl+O / F2 |
| 命令面板层 | 5 | Open palette / Navigate / Execute |
| 模态层（FindReplace / Modal / Menu） | 15 | Enter / Esc / Tab / Arrow |
| Chord | 10 | Ctrl+K Ctrl+O / Ctrl+K Ctrl+S 等 |

### 4.2 功能列表（Must Have）

| 功能 | 描述 | 来源 |
|---|---|---|
| F-01 默认键位库 | 预置 120+ 键位，覆盖主要动作 | 4.1 |
| F-02 Settings > Keyboard Tab | 完整可视化管理界面 | T03-12 C |
| F-03 冲突检测 | 录制时显示冲突列表，允许覆盖 | T03-04 A |
| F-04 热更新 | 修改后即时生效，不需重启 | T03-03 A |
| F-05 重置为默认 | 单键 / 全体 / 分组三档重置 | 本 PRD |
| F-06 预设方案切换 | Default / Vim / VSCode / Emacs / Typora | 本 PRD |
| F-07 导入导出 keymap | JSON 格式 | 本 PRD |
| F-08 Chord 序列 | Ctrl+K 后等待第二键（VS Code 风格） | T03-10 D |
| F-09 Chord 可视化提示 | chord 进行中显示浮层 | T03-10 D |
| F-10 快捷键速查卡 | F2 呼出搜索式 Tooltip | T03-05 C |
| F-11 FindReplace 面板 | VS Code 风格右上浮窗 | T03-02 A |
| F-12 FindReplace 能力 | 正则 + 大小写 + 全词 + 跳转 + 计数 | T03-01 C |
| F-13 IME 兼容 | Ctrl+数字 组合输入期跳过 | T03-08 B |
| F-14 Tab 三态 | 列表缩进 / 代码块 Tab 字符 / 其他切焦点 | T03-07 C |
| F-15 Ctrl+\ 解耦 | 专职模式切换，清除格式 → Ctrl+Shift+N | T03-06 C |
| F-16 失败提示 | 状态栏短提示"当前不可用" | T03-13 B |
| F-17 帮助面板内嵌录制 | Settings > Keyboard 可录制 / 修改 | T03-12 C |
| F-18 审计日志 | 关键快捷键（删除 / 发布）写日志 | L1-34 补充 |

### 4.3 功能列表（Should Have）

| 功能 | 描述 |
|---|---|
| S-01 最近使用快捷键 | 速查卡顶部显示 |
| S-02 未绑定项筛选 | 速查卡过滤"未设快捷键的命令" |
| S-03 冲突项筛选 | 速查卡过滤"当前存在冲突的键位" |
| S-04 键位图谱 | 可视化键盘布局（Settings > Keyboard） |

### 4.4 功能列表（May Have / v2.2+）

| 功能 | 为什么延期 |
|---|---|
| M-01 宏录制 | 超出 v2.1 范围 |
| M-02 作用域分层管理 UI | T03-09 A 先不做 |
| M-03 VS Code keybinding.json 兼容导入 | 需兼容 `when` 表达式，复杂度高 |
| M-04 基于使用频率的智能推荐 | v2.1 不做 AI 辅助 |

---

## 第五章 非目标（明确拒绝的事）

### 5.1 键位层面

- 不允许同一键位绑定不相关语义（例如 Ctrl+\ 不能同时做"清除格式"和"切换模式"）
- 不允许"按住 500ms 变不同功能"类长按语义
- 不允许"三键同时按"（除 Ctrl+Alt+Shift+X 这种组合键外）
- 不允许"按顺序敲打密码"式的秘密键位

### 5.2 UX 层面

- 不做"新手引导 Tour 教快捷键"（L1-50 B 补充：讨厌引导）
- 不做"成就 / 徽章 / 解锁快捷键"游戏化
- 不做"键盘使用热度图报告"（侵犯隐私感）
- 不做强制 tutorial 打字游戏

### 5.3 技术层面

- 不做 Web 版兼容（T03-11 补充）
- 不做 Vim 完整语法（只做 Vim 键位映射；不做 Vim 命令行 `:wq` 等）
- 不做 Emacs 完整语法（只做 Emacs 键位映射；不做 Emacs Lisp）
- 不做外部键盘 OSK 集成
- 不做硬件宏键盘（StreamDeck 等）原生集成（但命令注册表允许外部工具通过 CLI 触发）

---

## 第六章 业务规则与冲突策略

### 6.1 Must 级规则

| ID | 规则 |
|---|---|
| R-M-01 | 所有快捷键必须通过 `commandRegistry` 注册；禁止散落 keydown listener。 |
| R-M-02 | 默认键位数量 ≥ 120。 |
| R-M-03 | 修改键位后 ≤ 50ms 即时生效。 |
| R-M-04 | 冲突检测必须在录制瞬间执行，显示具体冲突命令列表。 |
| R-M-05 | 用户可覆盖任何默认键位（包括系统保留键位，T03-04 A）。 |
| R-M-06 | 被覆盖的键位必须在 Settings > Keyboard 中显示"冲突警告"徽标。 |
| R-M-07 | Ctrl+\ 只承担"模式切换"（T03-06 C）；清除格式走 Ctrl+Shift+N。 |
| R-M-08 | Tab 必须按上下文三态工作（T03-07 C）。 |
| R-M-09 | IME `isComposing` 时跳过 Ctrl+数字（T03-08 B）。 |
| R-M-10 | Chord 第一键按下 ≤ 2 秒内必须等待第二键；超时取消。 |
| R-M-11 | FindReplace 必须支持正则、大小写、全词、跳转、计数。 |
| R-M-12 | 失败提示走状态栏，不弹 Modal（T03-13 B）。 |
| R-M-13 | 所有键位在 Settings > Keyboard 可重置为默认。 |
| R-M-14 | 预设方案切换必须走二次确认（避免误点）。 |
| R-M-15 | Keymap JSON 导入必须走 Schema 校验。 |
| R-M-16 | 预设方案切换后允许用户再次基于预设做修改。 |
| R-M-17 | 自定义键位在卸载应用 / 重装时必须保留（存 IndexedDB + 可导出）。 |
| R-M-18 | 启动时键位注册延迟 ≤ 100ms。 |
| R-M-19 | 高危操作（删除文档、清空回收站、切换账户）的快捷键必须走二次确认（L1-40 C）。 |
| R-M-20 | 审计日志记录"快捷键触发的高危操作"。 |

### 6.2 冲突处理算法

**录制时的冲突检测**：

```
1. 用户按下录制键位组合
2. 系统扫描所有已注册命令，找出使用该组合的命令集合 conflict[]
3. 若 conflict 为空 → 直接绑定
4. 若 conflict 非空 →
   - 显示冲突清单（含命令名 + 作用域 + 原键位）
   - 提供三选项：
     a) 覆盖（把原键位置空）
     b) 取消录制
     c) 保持共存（仅当作用域不同时可用）
5. 覆盖后写入审计日志
```

**运行时冲突解决**（同一键位多命令）：

优先级（高 → 低）：

1. 模态层（当前是否有 Modal 打开）
2. 命令面板层（命令面板是否打开）
3. 当前焦点元素的作用域（编辑器 / Hub / Settings）
4. 全局层

### 6.3 Chord 处理规则

- 第一键（chord prefix）按下后，系统进入 `chord-pending` 状态
- 2 秒超时自动取消
- 取消时状态栏显示"Chord canceled"
- chord 期间显示浮层提示"Waiting for next key..."
- chord 期间所有其他键位暂停响应
- Esc 随时取消 chord

### 6.4 IME 兼容

- `event.isComposing === true` 期间跳过 Ctrl+数字 组合（标题快捷键）
- 其他组合（Ctrl+S / Ctrl+B 等）不跳过（T03-08 B）
- `compositionend` 事件触发后立即恢复所有键位

### 6.5 Keymap 导入导出规则

**导出 JSON Schema**：

```json
{
  "version": "1.0.0",
  "platform": "win32|darwin|linux",
  "preset": "default|vim|vscode|emacs|typora|custom",
  "bindings": [
    {
      "commandId": "editor.bold",
      "keys": ["Ctrl+B"],
      "scope": "editor",
      "condition": null
    }
  ],
  "exportedAt": "2026-04-21T10:00:00Z",
  "exportedBy": "profile-id"
}
```

**导入流程**：

1. 选择 JSON 文件
2. Schema 校验
3. 显示 diff 预览（新增 / 修改 / 删除）
4. 用户确认 → 应用
5. 写入审计日志

---

## 第七章 性能 SLO 与交付门槛

### 7.1 性能 SLO

| 指标 | 目标 | 失败判定 |
|---|---|---|
| SLO-01 键位响应延迟 | ≤ 50ms | > 80ms 失败 |
| SLO-02 Chord prefix 显示浮层 | ≤ 30ms | > 60ms 失败 |
| SLO-03 Chord prefix 超时 | 2000ms 精确 | > 2200ms 失败 |
| SLO-04 键位注册时间 | ≤ 100ms（启动） | > 150ms 失败 |
| SLO-05 Settings > Keyboard 加载 | ≤ 200ms | > 400ms 失败 |
| SLO-06 FindReplace 面板弹出 | ≤ 100ms | > 200ms 失败 |
| SLO-07 FindReplace 1000 次匹配 | ≤ 100ms | > 300ms 失败 |
| SLO-08 Keymap 热更新延迟 | ≤ 50ms | > 100ms 失败 |
| SLO-09 预设方案切换 | ≤ 300ms | > 500ms 失败 |

### 7.2 资源预算

| 资源 | 预算 |
|---|---|
| 键位注册表内存 | ≤ 2MB |
| Settings > Keyboard UI | ≤ 50KB JS |
| FindReplace 面板 | ≤ 30KB JS |
| Chord 提示浮层 | ≤ 5KB JS |

### 7.3 交付门槛

- 所有 SLO 达标
- 默认键位 ≥ 120
- 5 种预设方案全部可用
- E2E 覆盖 30+ 场景
- 单测覆盖核心算法
- 视觉审查通过

---

## 第八章 分层与作用域

### 8.1 五层架构

```
┌─────────────────────────────┐
│ L5 模态层 (Modal / Dialog)  │  ← 最高优先级
├─────────────────────────────┤
│ L4 命令面板层 (Palette)      │
├─────────────────────────────┤
│ L3 页面层 (Hub / Workstation)│
├─────────────────────────────┤
│ L2 编辑器层 (Typora/Source) │
├─────────────────────────────┤
│ L1 应用层 (Global)          │  ← 最低优先级
└─────────────────────────────┘
```

### 8.2 作用域判定

按事件目标元素 up-traversal 直到根：

```
焦点元素 → 查找最近的 data-scope 祖先 → 命中作用域
```

作用域标记：

```html
<div data-scope="modal"> ... </div>
<div data-scope="palette"> ... </div>
<div data-scope="hub"> ... </div>
<div data-scope="workstation"> ... </div>
<div data-scope="editor-typora"> ... </div>
<div data-scope="editor-source"> ... </div>
```

### 8.3 优先级冲突解决

同一键位命中多层时，取**深度最大的作用域**（距离焦点最近）。

### 8.4 v2.1 简化版

对齐 T03-09 A（全局统一），v2.1 实际采用简化模型：

- 大部分键位注册到"全局层"
- 仅以下作用域做强区分：
  - `modal`（拦截所有其他层）
  - `palette`（拦截大多数层，放行 Esc）
  - `editor`（拦截全局的编辑类命令）

### 8.5 v2.2+ 完整版预留

完整五层架构作为 v2.2 候选，对应 Task 03 扩展工作。

---

## 第九章 预设方案

### 9.1 方案列表

| 方案 | 适用人群 | 默认激活 |
|---|---|---|
| Default | 文字工作者 | ✅ |
| Typora Compat | 从 Typora 迁移 | — |
| VSCode | 开发者 | — |
| Vim | Vim 重度用户 | — |
| Emacs | Emacs 重度用户 | — |

### 9.2 预设覆盖规则

用户切换预设：

1. 显示二次确认："切换到 VSCode 预设会覆盖你现有的自定义键位，继续吗？"
2. 用户勾选"保留我的自定义" → 预设 + 用户自定义（用户自定义优先）
3. 用户不勾选 → 完全覆盖
4. 切换后 Settings > Keyboard 顶部显示"当前预设：VSCode"

### 9.3 Typora 兼容预设要点

- 保留 Ctrl+数字 = 标题
- 保留 Ctrl+B / I / U 格式化
- Ctrl+/ = 切换源码模式
- Ctrl+Shift+M = 数学公式
- Ctrl+Shift+K = 代码块
- Ctrl+T = 插入表格

### 9.4 VSCode 预设要点

- Ctrl+P = 命令面板（Quick Open）
- Ctrl+Shift+P = 完整命令面板
- Ctrl+K Ctrl+S = 键盘快捷键设置
- Ctrl+, = 设置
- Ctrl+B = 切换侧边栏
- Ctrl+` = 面板切换

### 9.5 Vim 预设要点

- 进入 Normal 模式按 Esc
- `i` = 进入 Insert 模式
- `h j k l` = 方向键
- `yy` = 复制行
- `dd` = 删除行
- `u` = Undo
- `Ctrl+R` = Redo
- `/` = 查找
- `:` = 命令行（仅实现少量常用命令）

**注意**：v2.1 Vim 预设**不**实现完整 Vim；仅键位映射 + 基本 Normal/Insert 模式切换。

### 9.6 Emacs 预设要点

- Ctrl+X Ctrl+S = 保存
- Ctrl+X Ctrl+F = 打开文件
- Ctrl+X Ctrl+C = 退出
- Meta+X = 命令面板
- Ctrl+G = 取消
- Ctrl+Space = 标记

### 9.7 扩展预设（v2.2 候选）

- Sublime Text
- Atom
- Nano

---

## 第十章 用户旅程

### 10.1 旅程 J-A：从未改过键位的新用户

1. 启动 InkForge
2. 按 Ctrl+B → 立即加粗当前词
3. 按 Ctrl+Z → 撤销
4. 按 F1 → 看到上下文气泡（"当前可用快捷键"）
5. 按 F2 → 打开速查卡浏览

### 10.2 旅程 J-B：从 Typora 迁移的用户

1. 打开 Settings > Keyboard
2. 选择"Typora 兼容"预设
3. 二次确认 → 应用
4. 所有 Typora 习惯键位立即可用
5. 少数差异（Ctrl+\ 解耦）通过速查卡快速学习

### 10.3 旅程 J-C：VS Code 重度用户

1. 打开 Settings > Keyboard
2. 选择"VSCode"预设
3. 使用 Ctrl+P / Ctrl+Shift+P / Ctrl+K 系列
4. Ctrl+K Ctrl+S 进入键盘设置
5. 根据个人习惯微调

### 10.4 旅程 J-D：自定义重度用户

1. 打开 Settings > Keyboard
2. 搜索命令"切换纸张宽度"
3. 点击"录制快捷键" → 按 Ctrl+Alt+W
4. 系统提示"冲突：与全局字数统计快捷键冲突"
5. 用户选择"覆盖" → 生效
6. 用户导出 keymap.json 备份

### 10.5 旅程 J-E：IME 用户

1. 切换到中文输入法
2. 输入"abc" + 空格 → 中文显示
3. 按 Ctrl+1 → **不**触发标题（因 isComposing）
4. 回车上屏后 Ctrl+1 → 正常触发标题

### 10.6 旅程 J-F：Chord 用户

1. 按 Ctrl+K
2. 状态栏显示"Waiting for next key..."
3. 按 Ctrl+O → 打开文件
4. 或者按 Esc → 取消 chord

### 10.7 旅程 J-G：FindReplace 用户

1. 按 Ctrl+F → 右上角弹出浮窗
2. 输入"InkForge"
3. 显示"5 matches"
4. 按 Enter / F3 → 跳到下一个
5. 按 Shift+F3 → 上一个
6. 勾选"正则" → 输入 `\b\w+ing\b`
7. 按 Ctrl+H → 显示替换输入框
8. 输入"修改" → 点击"全部替换"

### 10.8 旅程 J-H：失败反馈用户

1. 在 Hub 按 Ctrl+Shift+B（编辑器专属命令）
2. 状态栏短提示"当前不可用"
3. 不弹 Modal、不中断操作

---

## 第十一章 可观测性

### 11.1 埋点事件

| 事件 | 触发点 | 用途 |
|---|---|---|
| `kbd.triggered` | 任何快捷键触发 | 使用频率统计 |
| `kbd.chord.started` | Chord 第一键按下 | chord 使用率 |
| `kbd.chord.completed` | Chord 完整执行 | chord 完成率 |
| `kbd.chord.canceled` | Chord 超时 / Esc | chord 取消率 |
| `kbd.conflict.detected` | 录制时冲突 | 冲突分布 |
| `kbd.override.applied` | 用户选择覆盖 | 覆盖率 |
| `kbd.preset.switched` | 切换预设 | 预设流行度 |
| `kbd.keymap.imported` | 导入 keymap | 功能使用 |
| `kbd.keymap.exported` | 导出 keymap | 功能使用 |
| `kbd.failed.out-of-scope` | 失败（不在作用域） | 作用域设计审查 |
| `kbd.failed.no-handler` | 失败（命令不存在） | 失败根因 |
| `kbd.ime.bypassed` | IME 期间跳过 | IME 行为验证 |

### 11.2 性能埋点

| 指标 | 采集频率 |
|---|---|
| `kbd.perf.keyboard-latency` | 每次按键 |
| `kbd.perf.settings-load` | 每次打开 Settings > Keyboard |
| `kbd.perf.find-replace-first-match` | 每次 Find |

### 11.3 审计日志（对齐 L1-34 补充）

以下高危操作的快捷键触发必须写 `activity_logs`：

- 删除文档 / 清空回收站
- 切换账户
- 批量归档 / 批量导出
- 导入 keymap
- 重置所有快捷键

保留期：3 个月；可导出为 CSV。

---

## 第十二章 验收标准（20+）

### 12.1 功能性验收

**AC-F-01** 默认键位数量 ≥ 120，覆盖 Spec 中所有章节。
**AC-F-02** 修改键位后 ≤ 50ms 即时生效，无需重启。
**AC-F-03** 冲突检测在录制时显示冲突命令列表。
**AC-F-04** 用户可覆盖系统保留键位（如 Ctrl+N）。
**AC-F-05** Ctrl+\ 仅切换模式；清除格式走 Ctrl+Shift+N。
**AC-F-06** Tab 在列表中缩进、在代码块中插入 Tab、其他位置切焦点。
**AC-F-07** IME 组合输入期间 Ctrl+数字 不触发。
**AC-F-08** Chord 第一键按下显示浮层；2 秒超时取消。
**AC-F-09** Esc 随时取消 chord。
**AC-F-10** FindReplace 支持正则 / 大小写 / 全词 / 跳转 / 计数。
**AC-F-11** FindReplace 面板位于右上角，VS Code 风格浮窗。
**AC-F-12** F2 呼出快捷键速查卡。
**AC-F-13** 速查卡支持按命令 / 键位 / 分组搜索。
**AC-F-14** Settings > Keyboard 内可录制 / 修改 / 重置键位。
**AC-F-15** 预设方案切换二次确认，切换后可再次基于预设修改。
**AC-F-16** 导入 Keymap JSON 走 Schema 校验，失败给出详细错误。
**AC-F-17** 导出 Keymap JSON 包含 version / platform / preset 等元信息。
**AC-F-18** 高危操作快捷键触发走二次确认。
**AC-F-19** 高危操作快捷键写审计日志。
**AC-F-20** 失败提示走状态栏，不弹 Modal。

### 12.2 性能验收

**AC-P-01** 键位响应延迟 ≤ 50ms。
**AC-P-02** Chord prefix 浮层 ≤ 30ms。
**AC-P-03** Keymap 热更新 ≤ 50ms。
**AC-P-04** 预设切换 ≤ 300ms。
**AC-P-05** FindReplace 首次匹配 ≤ 100ms。

### 12.3 跨平台验收

**AC-X-01** Windows 上 Ctrl+X 系列正常。
**AC-X-02** Mac 上 Cmd+X 系列自动映射。
**AC-X-03** Linux 上 Ctrl+X 系列正常。
**AC-X-04** 预设方案在三平台一致。
**AC-X-05** 用户自定义键位跨平台标注。

### 12.4 可用性验收

**AC-U-01** 速查卡支持"最近使用 / 未绑定 / 冲突项 / 推荐项"筛选。
**AC-U-02** 键位录制对话框显示当前按键预览。
**AC-U-03** 冲突徽标在 Settings > Keyboard 中清晰可见。
**AC-U-04** 状态栏快捷键失败提示可读（5 秒内消失）。
**AC-U-05** Settings > Keyboard 列表支持键盘上下方向键遍历。

### 12.5 安全与数据验收

**AC-S-01** Keymap 导入 Schema 校验防止恶意 JSON。
**AC-S-02** 重置键位不丢失其他用户设置。
**AC-S-03** 切换预设不影响其他 Profile 的 keymap。
**AC-S-04** 审计日志不可被用户手动修改。
**AC-S-05** 导出 Keymap 不含敏感数据（Profile ID / 密钥等）。

### 12.6 边界场景验收

**AC-E-01** 用户按下系统保留键位（如 Alt+F4）时，InkForge 不吞事件。
**AC-E-02** Chord prefix 按下后切窗口 / 切应用 → chord 自动取消。
**AC-E-03** 两个窗口的 Hub 各自有独立的 chord 状态。
**AC-E-04** 录制键位时按 Esc 取消录制，不误绑定。
**AC-E-05** 录制"单键 + Ctrl"时拒绝纯单键（除非配置允许单键）。

---

## 第十三章 发布计划与分期

### 13.1 v2.1 必做（P0）

- 默认键位 120+ 条
- Settings > Keyboard 完整 UI
- 冲突检测 + 警告
- 热更新
- Chord 支持 + 浮层
- F2 速查卡
- FindReplace 完整
- 5 种预设方案
- 导入 / 导出 JSON
- IME 兼容
- Tab 三态
- 失败状态栏提示

### 13.2 v2.1 推荐（P1）

- 最近使用筛选
- 未绑定项筛选
- 键位图谱可视化

### 13.3 v2.2+ 候选

- 完整作用域分层管理 UI
- VSCode keybinding.json 导入
- 宏录制
- 使用频率智能推荐

---

## 第十四章 风险登记

### 14.1 技术风险

| 风险 | 可能性 | 影响 | 缓解 |
|---|---|---|---|
| Tauri keydown 拦截系统保留键失败 | 中 | 中 | 预研 + Tauri plugin 封装 |
| IME 在 Mac 上行为与 Windows 不一致 | 中 | 中 | 各平台独立测试 |
| 预设方案维护成本高 | 高 | 中 | 社区预设共享机制（v2.2） |
| Chord 状态管理复杂 | 中 | 中 | 单元测试 + 状态机 |

### 14.2 产品风险

| 风险 | 可能性 | 影响 | 缓解 |
|---|---|---|---|
| 用户误操作覆盖关键键位 | 中 | 中 | 重置按钮 + 二次确认 |
| Vim 预设不完整导致用户失望 | 高 | 中 | 明确范围：仅键位映射 |
| 自定义键位跨 Profile 行为不一致 | 低 | 低 | 明确文档 + 默认独立 |

---

## 附录 A 术语表

| 术语 | 含义 |
|---|---|
| Chord | 两步按键序列（如 Ctrl+K Ctrl+O） |
| Keymap | 键位映射配置 |
| Keybinding | 单条键位绑定 |
| Scope | 作用域 |
| Command Registry | 统一命令注册表 |
| Preset | 预设方案 |
| Conflict | 多命令绑定同键位 |
| IME | 输入法编辑器 |
| FindReplace | 查找替换 |
| Modal Layer | 模态层 |

---

## 附录 B 硬性阈值清单

| 阈值 | 值 |
|---|---|
| 默认键位最少数量 | 120 |
| Chord 超时 | 2000ms |
| 响应延迟上限 | 50ms |
| 注册延迟上限 | 100ms |
| FindReplace 匹配上限（不降级） | 1000 |
| 审计日志保留期 | 90 天 |
| 预设方案数量 | 5 |
| 支持的平台 | win32, darwin, linux |
| JSON Schema 版本 | 1.0.0 |

---

## 附录 C 决策溯源表

| 决策 | 来源 | 章节 |
|---|---|---|
| 统一命令注册表 | L1-27 D / T05-09 D | 第二章 |
| 三入口分工 | L1-29 A | 第二章 |
| 热更新即时生效 | T03-03 A | 第六章 |
| 冲突警告可覆盖 | T03-04 A | 第六章 |
| Ctrl+\ 解耦 | T03-06 C | 第六章 |
| Tab 上下文感知 | T03-07 C | 第六章 |
| IME Ctrl+数字跳过 | T03-08 B | 第六章 |
| 全局作用域统一 | T03-09 A | 第八章 |
| Chord 支持 | T03-10 D | 第四章 |
| Tauri 独占 | T03-11 补充 + G-06 B | 第一章 |
| 帮助面板 Tooltip 风格 | T03-05 C | 第四章 |
| 失败状态栏提示 | T03-13 B | 第一章 |
| FindReplace 能力 C 级 | T03-01 C | 第四章 |
| VS Code 风格面板 | T03-02 A | 第四章 |
| 帮助面板内嵌录制 | T03-12 C | 第四章 |
| 高危操作二次确认 | L1-40 C | 第六章 |
| 审计日志覆盖 | L1-34 补充 | 第十一章 |

---

## 终章 · 交付信号

**键盘体系的终极衡量指标**：用户在 **任何时候**（无论新手、老手、IME 用户、chord 用户）都感受到键盘是流畅的合作伙伴；键位不冲突、不抖动、不罢工。

> "Keyboards are not just input devices. They are the extension of a writer's intent."

以上即键盘快捷键 PRD v2.1.0 全部内容。
