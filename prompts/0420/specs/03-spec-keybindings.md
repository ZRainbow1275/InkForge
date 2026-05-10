> 版本: v2.1 | 状态: Authoritative | 依赖: 01-spec-editor-typora, 49-editor-keymap-spec, 22-command-palette-spec, 07-settings-full-spec

# 03 键盘快捷键完整规格

> **文档类型**: Spec（权威技术规范）
> **阶段**: Phase 3
> **依赖 Spec**: 01-spec-editor-typora, 49-editor-keymap-spec, 22-command-palette-spec, 07-settings-full-spec, 14-statusbar-navigation-spec, 37-snippet-system-spec
> **被依赖**: 01-spec-editor-typora, 02-spec-hub-layout, 05-toolbar-complete-spec, 07-settings-full-spec, 22-command-palette-spec
> **来源决策**: T03-01~T03-13, L1-27~L1-29, S-04, EX-03
> **创建日期**: 2026-04-20
> **铁律遵循**: R-21（不与 OS 保留键冲突）, R-22（热更新即时生效）, R-23（冲突可覆盖但须告知）

---

## 目录

- §1 设计原则
- §2 键位分层架构
- §3 全量快捷键表
  - 3.1 文件与文档管理
  - 3.2 编辑操作
  - 3.3 格式化
  - 3.4 视图与模式
  - 3.5 导航
  - 3.6 搜索与替换
  - 3.7 特殊元素插入
  - 3.8 应用与系统
  - 3.9 写作辅助
  - 3.10 评论与审阅
- §4 预设键位方案
- §5 用户自定义
- §6 冲突处理规则
- §7 平台差异（Win/Linux/macOS 键映射）
- §8 无障碍（全键盘可访问性保证）
- §9 KeymapService 实现规格
- §10 测试矩阵
- 附录 A：全量快捷键参考表（Win/Mac 双列）

---

## §1 设计原则

### 1.1 核心原则

InkForge v2.1 键盘快捷键系统遵循以下六条设计原则，任何键位设计决策必须回溯这六条原则之一作为依据。

**原则 1 — 遵循平台习惯（R-21）**

所有快捷键的修饰键前缀（Ctrl/Cmd）必须随操作系统自动切换。Windows 与 Linux 使用 `Ctrl`，macOS 使用 `Cmd`，文档中统一记录为 `Mod`。不设任何平台孤立键位。

**原则 2 — 简化一致，Tauri 单套规则**

InkForge 仅交付 Tauri 桌面 App（T03-11 用户补充确认），不做 Web 版。因此不存在浏览器快捷键冲突兜底，仅需考虑 OS/Tauri 两套冲突策略。消除双套系统带来的额外认知负担。

**原则 3 — 可覆盖，用户自治（T03-03=A, T03-04=A）**

用户自定义 > 预设方案 > 系统默认。冲突时以用户的最新选择为准，但必须给出可见告警并允许一键回退。快捷键修改后立即热更新生效，无需重启（T03-03=A）。

**原则 4 — 上下文感知（T03-07=C）**

同一物理键在不同焦点上下文下可承担不同语义。上下文优先级由 `when` 表达式在注册时声明，运行期动态计算激活状态。Tab、Enter、Escape 是最典型的上下文感知键。

**原则 5 — 可发现（T03-05=C, T03-12=C）**

所有快捷键必须在两处可查：帮助 Tooltip（F1 或 `?` 键）+ CommandPalette（Ctrl+K）。每条命令在 CommandPalette 中实时显示当前绑定键。帮助面板支持录制模式内联修改。

**原则 6 — 可撤销，低风险**

快捷键绑定的修改本身可回退：Settings > 键盘 提供单项重置和全部重置。高危命令（删除、覆盖）触发二次确认，而非直接执行（L1-40 C 级防呆）。

### 1.2 键位命名约定

| 符号 | 含义 |
|------|------|
| `Mod` | Windows/Linux=Ctrl，macOS=Cmd |
| `Alt` | Windows/Linux=Alt，macOS=Option |
| `+` | 同时按下 |
| ` ` (空格) | Chord 序列，先按前键再按后键 |
| `[when:X]` | 激活条件（上下文 when 表达式） |
| `[chord]` | 两段组合键 |

### 1.3 职责边界（L1-29=A）

快捷键、斜杠命令、浮动工具栏三者职责严格分离：

| 入口 | 职责 | 目标用户 |
|------|------|----------|
| 快捷键 | 熟练操作，高频低摩擦 | 有记忆成本意愿的高级用户 |
| 斜杠命令 `/` | 插入/创建新内容块 | 全体用户（低发现成本） |
| 浮动工具栏 | 选区格式化 | 全体用户（低操作成本） |
| 右键菜单 | 上下文补充命令（二三级嵌套） | 偶尔使用 |

---

## §2 键位分层架构（优先级由高到低）

### 2.1 分层总览

InkForge 采用五层键位架构。当多层存在相同物理键时，优先级高的层优先捕获，低层不再响应。

```
┌──────────────────────────────────────────────────────────┐
│  Layer 5: 模态层（Modal / Dialog）                        │  优先级最高
│  Layer 4: 命令面板层（CommandPalette 激活时）             │
│  Layer 3: 编辑器层（TipTap / ProseMirror 内部）           │
│  Layer 2: Hub / 视图层（Hub、Settings、StagePanel）       │
│  Layer 1: 应用全局层（任何位置均生效）                    │  优先级最低
└──────────────────────────────────────────────────────────┘
```

### 2.2 Layer 5 — 模态层

**激活条件**: 任意 Modal/Dialog 组件处于可见且 `aria-modal=true` 状态。

**行为**:
- `Escape` 关闭当前模态（不冒泡到编辑器）
- `Enter` 确认默认动作（如对话框的主按钮）
- `Tab` / `Shift+Tab` 在模态内部焦点循环
- 除 `F1`（帮助）外，所有其他快捷键**被拦截，不穿透到下层**

**组件范围**: DeleteConfirmDialog, ShortcutsSettingsModal, ColorPickerModal, ConflictResolutionModal, AccountDeleteDialog, AvatarCropperDialog

### 2.3 Layer 4 — 命令面板层

**激活条件**: `CommandPalette` 组件 `isOpen=true`。

**行为**:
- 字母/数字键输入到搜索框
- `ArrowUp` / `ArrowDown` 在结果列表中移动
- `Enter` 执行选中命令并关闭面板
- `Escape` 关闭面板（不执行）
- `Tab` 补全最高置信度命令名
- 面板激活时，Layer 3 及以下的快捷键**全部被拦截**

### 2.4 Layer 3 — 编辑器层

**激活条件**: TipTap editor 实例获得焦点（Typora 模式或 Source 模式均适用）。

**行为**:
- 由 ProseMirror keymap + TipTap Extensions 处理
- 注册顺序决定内部优先级（见 49-editor-keymap-spec §5.2）
- `Enter`、`Tab`、`Backspace`、`Delete`、`Escape` 均为上下文感知键
- 编辑器层快捷键通过 `addKeyboardShortcuts()` 声明式注册
- IME 合成期间 `Ctrl+数字` 系列被跳过（T03-08=B）

**内部子优先级**（从高到低）:

| 优先级 | 键位扩展 | 负责功能 |
|-------|---------|---------|
| E-1 | ListNotionKeymap | Enter 列表减缩 |
| E-2 | TabContextKeymap | Tab 三态 |
| E-3 | MultiCursor | Ctrl+D 多光标 |
| E-4 | PaperWidthKeymap | Ctrl+= 纸张宽度 |
| E-5 | CheckpointHistory | Ctrl+Z Redo/Undo |
| E-6 | MarkdownHints | Cursor-aware 装饰 |
| E-7 | StarterKit 扩展 | 基础格式键 |

### 2.5 Layer 2 — Hub / 视图层

**激活条件**: Hub 视图、Settings 视图、StagePanel 获得焦点，且 Layer 3 以上无激活。

**行为**:
- 方向键在文章列表中移动选中项
- `Enter` 打开选中文章
- `Delete` / `Backspace` 移动到回收站（带确认）
- `Ctrl+A` 全选列表项

### 2.6 Layer 1 — 应用全局层

**激活条件**: 任何时候（除 Layer 5 拦截外）。

**注册方式**: Tauri 全局快捷键注册（`register_global_shortcut`）+ 应用层 `keydown` 监听器。

**代表键位**:
- `Ctrl+N` — 新建文章（全局，S-04）
- `Ctrl+,` — 打开 Settings
- `Ctrl+K` — 打开 CommandPalette
- `F1` — 帮助面板

---

## §3 全量快捷键表（按功能分组）

### 3.1 文件与文档管理

> 覆盖范围：新建、打开、保存、关闭、导入、导出、发布相关操作

| 操作 | Windows/Linux | macOS | 范围 | 说明 |
|------|--------------|-------|------|------|
| 新建文章 | `Ctrl+N` | `Cmd+N` | 全局 | 使用最近模板；无模板则空白（S-04） |
| 新建文章（选择模板） | `Ctrl+Shift+N` 已占用，见格式 | — | — | 通过 CommandPalette 触达 |
| 打开文章（快速打开） | `Ctrl+P` | `Cmd+P` | 全局 | 模糊搜索文章标题 |
| 打开文章（文件浏览器） | `Ctrl+O` | `Cmd+O` | 全局 | 调用 Tauri 文件选择器 |
| 保存 | `Ctrl+S` | `Cmd+S` | Workstation | 强制序列化到磁盘 |
| 另存为 | `Ctrl+Shift+S` | `Cmd+Shift+S` | Workstation | 弹出另存路径选择器 |
| 关闭当前文章 | `Ctrl+W` | `Cmd+W` | Workstation | 未保存时拦截确认 |
| 关闭所有文章 | `Ctrl+Shift+W` | `Cmd+Shift+W` | Workstation | 批量关闭 Tab |
| 重命名当前文章 | `F2` | `F2` | Workstation | 激活标题行内编辑 |
| 移动到回收站 | `Delete` | `Backspace` | Hub 列表 | 软删除，可恢复 |
| 永久删除 | `Shift+Delete` | `Shift+Backspace` | Hub 列表 | 二次确认后执行 |
| 从回收站恢复 | `Ctrl+Z` | `Cmd+Z` | Trash 视图 | 在回收站中撤销删除 |
| 导入 Markdown | `Ctrl+Shift+I` | `Cmd+Shift+I` | 全局 | 调用导入向导 |
| 导出当前文章 | `Ctrl+Shift+E` | `Cmd+Shift+E` | Workstation | 打开导出预设选择器 |
| 导出为 HTML | `Ctrl+Alt+H` 已占用，见格式 | — | — | 通过导出面板选择 |
| 发布到当前平台 | `Ctrl+Shift+U` | `Cmd+Shift+U` | Workstation | 当前选中发布目标 |
| 打印 / 导出 PDF | `Ctrl+Shift+P` | `Cmd+Shift+P` | Workstation | 调用打印预览 |
| 在文件管理器中显示 | `Ctrl+Shift+R` | `Cmd+Shift+R` | Workstation | Tauri `revealInExplorer` |
| 复制文件路径 | `Ctrl+Alt+C` | `Cmd+Alt+C` | Workstation | 复制当前文档完整路径 |
| 切换到上一个文章 | `Ctrl+Tab` | `Ctrl+Tab` | Workstation | 在 TabBar 中循环 |
| 切换到下一个文章 | `Ctrl+Shift+Tab` | `Ctrl+Shift+Tab` | Workstation | 在 TabBar 中反向循环 |
| 切换到指定 Tab（1-9） | `Ctrl+1`~`Ctrl+9` | `Cmd+1`~`Cmd+9` | Workstation | [IME 合成期跳过] |

> IME 合成期间，`Ctrl+1`~`Ctrl+9` 被跳过，不触发 Tab 切换，避免打断中文输入（T03-08=B）。

### 3.2 编辑操作

> 覆盖范围：撤销/重做、剪贴板、选区、多光标、文本变换

| 操作 | Windows/Linux | macOS | 范围 | 说明 |
|------|--------------|-------|------|------|
| 撤销 | `Ctrl+Z` | `Cmd+Z` | Editor | 逻辑分组撤销（E-10=B，见 49-keymap §3） |
| 重做 | `Ctrl+Shift+Z` | `Cmd+Shift+Z` | Editor | 重做上一步 |
| 重做（备用） | `Ctrl+Y` | `Cmd+Y` | Editor | 与 Ctrl+Shift+Z 等价 |
| 剪切 | `Ctrl+X` | `Cmd+X` | Editor | 多格式剪切（Markdown + HTML） |
| 复制 | `Ctrl+C` | `Cmd+C` | Editor | 多格式复制（Markdown + HTML） |
| 粘贴（自动清洗） | `Ctrl+V` | `Cmd+V` | Editor | 智能粘贴，优先结构化内容 |
| 粘贴（强制保留 HTML） | `Ctrl+Shift+V` | `Cmd+Shift+V` | Editor | 绕过内容清洗 |
| 粘贴为纯文本 | `Ctrl+Alt+V` | `Cmd+Alt+V` | Editor | 去除所有格式 |
| 全选 | `Ctrl+A` | `Cmd+A` | Editor/Hub | 编辑器选全文；Hub 选全文章 |
| 取消选区 | `Escape` | `Escape` | Editor | 清除选区，光标保持位置 |
| 选中当前词 | `Ctrl+D` | `Cmd+D` | Editor | 无选区时选中当前词（E-06=B） |
| 选中下一个相同词 | `Ctrl+D` | `Cmd+D` | Editor | 有选区时添加下一个匹配 |
| 选中所有匹配 | `Ctrl+Shift+L` | `Cmd+Shift+L` | Editor | 选中文档内所有同名词 |
| 移除最后一个多光标 | `Ctrl+U` | `Cmd+U` | Editor | 回撤多光标（E-06=B） |
| 退出多光标 | `Escape` | `Escape` | Editor | [when:multiCursorActive] 仅保留主光标 |
| 扩展选区到行首 | `Shift+Home` | `Shift+Cmd+Left` | Editor | 扩展选区到当前行行首 |
| 扩展选区到行尾 | `Shift+End` | `Shift+Cmd+Right` | Editor | 扩展选区到当前行行尾 |
| 扩展选区到文档头 | `Ctrl+Shift+Home` | `Cmd+Shift+Up` | Editor | 扩展选区到文档开头 |
| 扩展选区到文档尾 | `Ctrl+Shift+End` | `Cmd+Shift+Down` | Editor | 扩展选区到文档末尾 |
| 向上移动行 | `Alt+Up` | `Option+Up` | Editor | 将当前行（或选中行）向上移动一行 |
| 向下移动行 | `Alt+Down` | `Option+Down` | Editor | 将当前行（或选中行）向下移动一行 |
| 删除当前行 | `Ctrl+Shift+K` | `Cmd+Shift+K` | Editor | 删除光标所在整行 |
| 在下方插入空行 | `Ctrl+Enter` | `Cmd+Enter` | Editor | [when:notInList] 在当前段落下方插入空段 |
| 在上方插入空行 | `Ctrl+Shift+Enter` | `Cmd+Shift+Enter` | Editor | 在当前段落上方插入空段 |
| 软换行（行内换行） | `Shift+Enter` | `Shift+Enter` | Editor | 插入 `<br>`，不创建新段落 |
| 删除到词尾 | `Ctrl+Delete` | `Option+Delete` | Editor | 删除光标后的整词 |
| 删除到词首 | `Ctrl+Backspace` | `Option+Backspace` | Editor | 删除光标前的整词 |
| 切换大小写 | `Alt+U` | `Option+U` | Editor | 选区文本大小写循环切换 |
| 转为大写 | `Alt+Shift+U` | `Option+Shift+U` | Editor | 选区强制转为全大写 |
| 转为小写 | `Alt+Shift+L` | `Option+Shift+L` | Editor | 选区强制转为全小写 |

### 3.3 格式化

> 覆盖范围：行内格式、块级格式、清除格式

| 操作 | Windows/Linux | macOS | 范围 | 说明 |
|------|--------------|-------|------|------|
| 粗体 | `Ctrl+B` | `Cmd+B` | Editor | Toggle bold |
| 斜体 | `Ctrl+I` | `Cmd+I` | Editor | Toggle italic |
| 下划线 | `Ctrl+U` | `Cmd+U` | Editor | Toggle underline |
| 删除线 | `Ctrl+Shift+X` | `Cmd+Shift+X` | Editor | Toggle strikethrough |
| 行内代码 | `Ctrl+Shift+C` | `Cmd+Shift+C` | Editor | Toggle inline code |
| 高亮 | `Ctrl+Shift+H` | `Cmd+Shift+H` | Editor | 使用当前高亮颜色 |
| 高亮颜色选择器 | `Ctrl+Alt+H` | `Cmd+Alt+H` | Editor | 打开颜色选择器弹窗 |
| 上标 | `Ctrl+.` | `Cmd+.` | Editor | Toggle superscript |
| 下标 | `Ctrl+,` 已占用，见系统 | — | — | 通过工具栏触达 |
| 清除格式 | `Ctrl+Shift+N` | `Cmd+Shift+N` | Editor | 去除选区所有行内格式（T03-06=C） |
| 段落（普通文本） | `Ctrl+Alt+0` | `Cmd+Alt+0` | Editor | 转为 paragraph |
| 标题 H1 | `Ctrl+Alt+1` | `Cmd+Alt+1` | Editor | [IME 合成期跳过] |
| 标题 H2 | `Ctrl+Alt+2` | `Cmd+Alt+2` | Editor | [IME 合成期跳过] |
| 标题 H3 | `Ctrl+Alt+3` | `Cmd+Alt+3` | Editor | [IME 合成期跳过] |
| 标题 H4 | `Ctrl+Alt+4` | `Cmd+Alt+4` | Editor | [IME 合成期跳过] |
| 标题 H5 | `Ctrl+Alt+5` | `Cmd+Alt+5` | Editor | [IME 合成期跳过] |
| 标题 H6 | `Ctrl+Alt+6` | `Cmd+Alt+6` | Editor | [IME 合成期跳过] |
| 无序列表 | `Ctrl+Shift+L` 已占用 | — | — | 与多光标冲突；通过工具栏或斜杠命令 |
| 有序列表 | `Ctrl+Shift+O` | `Cmd+Shift+O` | Editor | Toggle ordered list |
| 任务列表 | `Ctrl+Shift+T` | `Cmd+Shift+T` | Editor | Toggle task list |
| 引用块 | `Ctrl+Shift+Q` | `Cmd+Shift+Q` | Editor | Toggle blockquote |
| 代码块 | `Ctrl+Alt+C` | `Cmd+Alt+C` | Editor | 插入/切换 fenced code block |
| 分割线 | `Ctrl+Alt+-` | `Cmd+Alt+-` | Editor | 插入水平分割线 |
| 增加缩进 | `Tab` | `Tab` | Editor | [when:inList] 增加一级列表缩进 |
| 减少缩进 | `Shift+Tab` | `Shift+Tab` | Editor | [when:inList] 减少一级列表缩进 |
| 表格 — 跳到下一格 | `Tab` | `Tab` | Editor | [when:inTable] 移动到下一单元格 |
| 表格 — 跳到上一格 | `Shift+Tab` | `Shift+Tab` | Editor | [when:inTable] 移动到上一单元格 |
| 加粗+斜体组合 | `Ctrl+Alt+B` | `Cmd+Alt+B` | Editor | Toggle bold+italic（bold-italic） |
| 行内公式 | `Ctrl+M` | `Cmd+M` | Editor | 切换行内 math `$...$` |
| 块级公式 | `Ctrl+Alt+M` | `Cmd+Alt+M` | Editor | 切换块级 math `$$...$$` |
| 文字颜色 | `Ctrl+Alt+F` | `Cmd+Alt+F` | Editor | 打开文字颜色选择器 |
| 文字背景色 | `Ctrl+Alt+G` | `Cmd+Alt+G` | Editor | 打开背景色选择器 |
| 段落居左 | `Ctrl+Shift+A` | `Cmd+Shift+A` | Editor | 设置段落对齐左 |
| 段落居中 | `Ctrl+Shift+E` 已占用，见文件 | — | — | 通过工具栏触达 |
| 段落居右 | `Ctrl+Shift+D` | `Cmd+Shift+D` | Editor | 设置段落对齐右 |
| 段落两端对齐 | `Ctrl+Shift+J` | `Cmd+Shift+J` | Editor | 设置段落 justify |

### 3.4 视图与模式

> 覆盖范围：编辑器模式切换、侧栏/面板显示、纸张宽度、专注模式

| 操作 | Windows/Linux | macOS | 范围 | 说明 |
|------|--------------|-------|------|------|
| 切换模式（正向：Typora→Source→Preview） | `Ctrl+\` | `Cmd+\` | Workstation | 三态循环（T03-06=C）|
| 切换模式（反向） | `Ctrl+Shift+\` | `Cmd+Shift+\` | Workstation | 三态反向循环 |
| 切换到 Typora 模式 | `Ctrl+Alt+T` | `Cmd+Alt+T` | Workstation | 直接切换到混合编辑 |
| 切换到 Source 模式 | `Ctrl+Alt+S` | `Cmd+Alt+S` | Workstation | 直接切换到源码视图 |
| 切换到 Preview 模式 | `Ctrl+Alt+P` | `Cmd+Alt+P` | Workstation | 直接切换到预览视图 |
| Peek Preview（临时预览） | `Ctrl+Shift+P` 长按 | `Cmd+Shift+P` 长按 | Workstation | 按住期间显示预览；松开回编辑 |
| 纸张宽度循环（宽→中→窄→全屏） | `Ctrl+=` | `Cmd+=` | Workstation | 四档循环（T01-11=C） |
| 纸张宽度反向循环 | `Ctrl+-` | `Cmd+-` | Workstation | 反向四档循环 |
| 切换专注写作模式 | `F11` | `Ctrl+Cmd+F` | Workstation | 进入/退出全屏专注模式 |
| 切换侧栏 | `Ctrl+Alt+B` 已占用 | — | — | 通过工具栏按钮 |
| 显示/隐藏文件管理器 | `Ctrl+Shift+F` | `Cmd+Shift+F` | Workstation | Toggle FileManager 侧栏 |
| 显示/隐藏大纲面板 | `Ctrl+Shift+O` 已占用 | — | — | 通过 Hub 底栏 |
| 显示/隐藏 Stage 面板 | `Ctrl+Shift+G` 已占用，见查找 | — | — | 通过工具栏 |
| 切换全屏 | `Alt+Enter` | `Ctrl+Cmd+F` | 全局 | Tauri 原生全屏切换 |
| 返回 Hub | `Ctrl+Shift+H` 已占用 | — | — | 通过导航栏按钮 |
| 回到 Hub 首页 | `Escape` | `Escape` | Workstation | [when:noModal] 退出 Workstation 回到 Hub |
| 切换分屏模式 | `Ctrl+Alt+\\` | `Cmd+Alt+\\` | Workstation | 开启/关闭分屏 |
| 放大编辑器字体 | `Ctrl+Shift+=` | `Cmd+Shift+=` | Workstation | 字体 +2px |
| 缩小编辑器字体 | `Ctrl+Shift+-` | `Cmd+Shift+-` | Workstation | 字体 -2px |
| 重置编辑器字体 | `Ctrl+Shift+0` | `Cmd+Shift+0` | Workstation | 恢复默认字体大小 |
| 切换主题（Chord） | `Ctrl+K Ctrl+T` | `Cmd+K Cmd+T` | 全局 | [chord] 打开主题选择器 |

### 3.5 导航

> 覆盖范围：光标移动、文档内跳转、Tab/面板切换

| 操作 | Windows/Linux | macOS | 范围 | 说明 |
|------|--------------|-------|------|------|
| 跳到行首 | `Home` | `Cmd+Left` | Editor | 软行首（可见行）第一次；硬行首第二次 |
| 跳到行尾 | `End` | `Cmd+Right` | Editor | 软行尾 |
| 跳到文档头 | `Ctrl+Home` | `Cmd+Up` | Editor | 跳到文档最开始 |
| 跳到文档尾 | `Ctrl+End` | `Cmd+Down` | Editor | 跳到文档最末尾 |
| 按词向前跳 | `Ctrl+Right` | `Option+Right` | Editor | 跳到下一词边界 |
| 按词向后跳 | `Ctrl+Left` | `Option+Left` | Editor | 跳到上一词边界 |
| 向上滚动一屏 | `PageUp` | `PageUp` | Editor | 不移动光标，仅滚动视口 |
| 向下滚动一屏 | `PageDown` | `PageDown` | Editor | 不移动光标，仅滚动视口 |
| 跳到指定行号 | `Ctrl+G` | `Cmd+G` | Source 模式 | 弹出行号跳转输入框 |
| 跳到段落（快速） | `Ctrl+G` | `Cmd+G` | Typora 模式 | 弹出标题/段落模糊跳转 |
| 查找下一个 | `F3` | `Cmd+G` | 全局 | 与 Ctrl+G 等价（FindReplace 激活时） |
| 查找上一个 | `Shift+F3` | `Cmd+Shift+G` | 全局 | 反向查找 |
| 跳转到块（上一块） | `Alt+Up` | `Option+Up` | Editor | 跳到上一个内容块节点 |
| 跳转到块（下一块） | `Alt+Down` | `Option+Down` | Editor | 跳到下一个内容块节点 |
| 切换到上一历史位置 | `Alt+Left` | `Cmd+[` | Workstation | 后退（编辑器内光标历史） |
| 切换到下一历史位置 | `Alt+Right` | `Cmd+]` | Workstation | 前进（编辑器内光标历史） |
| 焦点进入编辑器 | `Ctrl+E` | `Cmd+E` | Workstation | 从侧栏/工具栏焦点跳回编辑器 |
| 焦点进入文件管理器 | `Ctrl+Shift+E` 已占用，见文件 | — | — | 通过 Tab 键导航 |
| 关闭浮动面板 / 退出当前重块 | `Escape` | `Escape` | Editor | [when:inHeavyBlock] |

### 3.6 搜索与替换

> 覆盖范围：查找、替换、正则、全词、大小写、跨文档搜索

| 操作 | Windows/Linux | macOS | 范围 | 说明 |
|------|--------------|-------|------|------|
| 打开查找面板 | `Ctrl+F` | `Cmd+F` | Workstation | 显示 FindReplace 浮窗（查找模式） |
| 打开查找+替换面板 | `Ctrl+H` | `Cmd+H` | Workstation | 显示 FindReplace 浮窗（替换模式） |
| 关闭查找面板 | `Escape` | `Escape` | FindReplace | 关闭并清除高亮 |
| 查找下一个 | `F3` 或 `Ctrl+G` | `Cmd+G` | FindReplace 激活 | 跳到下一个匹配 |
| 查找上一个 | `Shift+F3` 或 `Ctrl+Shift+G` | `Cmd+Shift+G` | FindReplace 激活 | 跳到上一个匹配 |
| 替换当前匹配 | `Alt+R` | `Option+R` | FindReplace 激活 | 替换当前选中匹配 |
| 替换全部 | `Alt+A` | `Option+A` | FindReplace 激活 | 替换所有匹配并显示计数 |
| 切换正则模式 | `Alt+Ctrl+R` | `Option+Cmd+R` | FindReplace 激活 | Toggle 正则搜索 |
| 切换大小写敏感 | `Alt+Ctrl+C` | `Option+Cmd+C` | FindReplace 激活 | Toggle 区分大小写 |
| 切换全词匹配 | `Alt+Ctrl+W` | `Option+Cmd+W` | FindReplace 激活 | Toggle 全词匹配 |
| 全局搜索（跨文档） | `Ctrl+Shift+F` | `Cmd+Shift+F` | 全局 | 打开全局搜索面板（29-search-engine） |
| 在当前文件夹搜索 | `Ctrl+Alt+F` 已占用，见格式 | — | — | 通过全局搜索面板的范围选择器 |
| 确认搜索词（不关闭面板） | `Enter` | `Enter` | FindReplace 输入框 | 跳到下一个匹配 |

### 3.7 特殊元素插入

> 覆盖范围：链接、图片、表格、代码块、特殊符号插入

| 操作 | Windows/Linux | macOS | 范围 | 说明 |
|------|--------------|-------|------|------|
| 插入/编辑链接 | `Ctrl+K Ctrl+K` | `Cmd+K Cmd+K` | Editor | [chord] 打开 LinkPopover（T05-04=A） |
| 快速链接（选中文字后） | `Ctrl+K` | `Cmd+K` | Editor | [when:hasSelection] 直接打开 LinkPopover |
| 插入图片 | `Ctrl+Alt+I` | `Cmd+Alt+I` | Editor | 打开图片选择器（文件/URL/拖入） |
| 插入表格 | `Ctrl+Alt+Shift+T` | `Cmd+Alt+Shift+T` | Editor | 弹出表格尺寸选择器；避免与“直接进入 Typora”默认键位冲突 |
| 插入代码块 | `Ctrl+Alt+C` | `Cmd+Alt+C` | Editor | 与格式化共用，光标在普通段落时插入 |
| 插入行内公式 | `Ctrl+M` | `Cmd+M` | Editor | 见 §3.3 |
| 插入块级公式 | `Ctrl+Alt+M` | `Cmd+Alt+M` | Editor | 见 §3.3 |
| 插入 Mermaid 图表 | `Ctrl+Alt+D` | `Cmd+Alt+D` | Editor | 插入 mermaid 代码块（Stage 面板渲染） |
| 插入 Callout 块 | `Ctrl+Alt+L` | `Cmd+Alt+L` | Editor | 插入 Callout/Admonition 块 |
| 插入 Details/折叠块 | `Ctrl+Alt+E` | `Cmd+Alt+E` | Editor | 插入 `<details>` 折叠块 |
| 插入水平分割线 | `Ctrl+Alt+-` | `Cmd+Alt+-` | Editor | 见 §3.3 |
| 插入脚注 | `Ctrl+Alt+F` | `Cmd+Alt+F` | Editor | 在光标处插入脚注引用 |
| 插入 Wiki 链接 | `[[` | `[[` | Editor | 触发 WikiLink 自动补全（36-wiki-link） |
| 插入 Snippet | `Ctrl+Alt+Y` | `Cmd+Alt+Y` | Editor | 打开 Snippet 选择器（37-snippet） |
| 插入 TOC | `Ctrl+Alt+O` | `Cmd+Alt+O` | Editor | 在光标位置插入目录块 |
| 插入日期时间戳 | `Alt+D` | `Option+D` | Editor | 插入 ISO 8601 格式当前时间 |
| 插入 HR（下划线触发） | `---` + Enter | `---` + Enter | Editor | Typora 风格：三横线自动转换 |

### 3.8 应用与系统

> 覆盖范围：Settings、CommandPalette、帮助、窗口管理、应用控制

| 操作 | Windows/Linux | macOS | 范围 | 说明 |
|------|--------------|-------|------|------|
| 打开 Settings | `Ctrl+,` | `Cmd+,` | 全局 | 跳转到 Settings 视图 |
| 打开 CommandPalette | `Ctrl+K` | `Cmd+K` | 全局 | 22-command-palette（EX-03） |
| 打开帮助面板（F1） | `F1` | `F1` | 全局 | 可搜索快捷键 Tooltip 面板（T03-12=C） |
| 打开快捷键设置（Chord） | `Ctrl+K Ctrl+S` | `Cmd+K Cmd+S` | 全局 | [chord] 打开 Settings > 键盘 |
| 打开最近文件（Chord） | `Ctrl+K Ctrl+R` | `Cmd+K Cmd+R` | 全局 | [chord] 显示最近文件面板 |
| 切换主题（Chord） | `Ctrl+K Ctrl+T` | `Cmd+K Cmd+T` | 全局 | [chord] 打开主题选择器 |
| 开发者面板（调试） | `Ctrl+Shift+Alt+D` | `Cmd+Shift+Alt+D` | 全局 | 打开 DevPanel（40-dev-panel） |
| 重新加载 | `Ctrl+Shift+Alt+R` | `Cmd+Shift+Alt+R` | 全局 | 强制重载整个应用（调试用） |
| 打开诊断日志 | `Ctrl+Shift+Alt+L` | `Cmd+Shift+Alt+L` | 全局 | 打开 LogViewer（33-diagnostic） |
| 切换账户 | 无默认 | 无默认 | Hub | 通过头像菜单或 CommandPalette |
| 退出 InkForge | `Ctrl+Q` | `Cmd+Q` | 全局 | 未保存内容时拦截确认 |

### 3.9 写作辅助

> 覆盖范围：Chord 操作、Snippet 触发、斜杠命令、AI 写作辅助、字数统计

| 操作 | Windows/Linux | macOS | 范围 | 说明 |
|------|--------------|-------|------|------|
| 触发斜杠命令 | `/` | `/` | Editor | 在行首或段首触发斜杠命令面板 |
| 关闭斜杠命令面板 | `Escape` | `Escape` | SlashMenu 激活 | 取消并关闭面板 |
| 触发 Snippet 展开 | Snippet 前缀 + `Tab` | Snippet 前缀 + `Tab` | Editor | 匹配 Snippet prefix 展开 |
| 触发 AI 辅助写作 | `Ctrl+Space` | `Cmd+Space` | Editor | 打开 AI 写作辅助面板 |
| 触发 AI 续写 | `Ctrl+Shift+Space` | `Cmd+Shift+Space` | Editor | 在光标处生成 AI 续写建议 |
| 应用 AI 建议 | `Tab` | `Tab` | AI 建议气泡激活 | 接受 AI 内联建议 |
| 拒绝 AI 建议 | `Escape` | `Escape` | AI 建议气泡激活 | 拒绝并关闭建议 |
| 切换字数统计面板 | `Ctrl+Shift+W` 已占用，见文件 | — | — | 通过 StatusBar 点击 |
| 切换拼写检查 | `F7` | `F7` | Editor | Toggle spellcheck |
| 接受拼写建议 | `Alt+1`~`Alt+5` | `Option+1`~`Option+5` | Editor | 选择拼写建议列表项 |
| 忽略拼写错误 | `Alt+I` | `Option+I` | Editor | 忽略当前词的拼写标记 |
| 字数目标设置 | 无默认 | 无默认 | — | 通过 StatusBar > 字数 进入 |
| 切换全屏专注模式 | `F11` | `Ctrl+Cmd+F` | 全局 | 见 §3.4 |

### 3.10 评论与审阅

> 覆盖范围：评论插入、审阅、接受/拒绝修订（32-comment-review-spec）

| 操作 | Windows/Linux | macOS | 范围 | 说明 |
|------|--------------|-------|------|------|
| 插入评论 | `Ctrl+Alt+N` | `Cmd+Alt+N` | Editor | 在选区附着行内评论锚点 |
| 打开评论面板 | `Ctrl+Alt+R` | `Cmd+Alt+R` | Workstation | 显示右侧评论审阅面板 |
| 解决当前评论 | `Ctrl+Alt+Shift+R` | `Cmd+Alt+Shift+R` | Editor | 标记当前焦点评论为 Resolved |
| 跳到下一条评论 | `Ctrl+Alt+Down` | `Cmd+Alt+Down` | Editor | 移动到下一个评论锚点 |
| 跳到上一条评论 | `Ctrl+Alt+Up` | `Cmd+Alt+Up` | Editor | 移动到上一个评论锚点 |
| 接受当前修订 | `Ctrl+Alt+A` | `Cmd+Alt+A` | Editor | Track Changes 模式下接受修订 |
| 拒绝当前修订 | `Ctrl+Alt+J` | `Cmd+Alt+J` | Editor | Track Changes 模式下拒绝修订 |
| 接受所有修订 | `Ctrl+Alt+Shift+A` | `Cmd+Alt+Shift+A` | Editor | 批量接受全部修订 |
| 拒绝所有修订 | `Ctrl+Alt+Shift+J` | `Cmd+Alt+Shift+J` | Editor | 批量拒绝全部修订 |
| 切换 Track Changes | `Ctrl+Alt+K` | `Cmd+Alt+K` | Editor | 开启/关闭修订追踪模式 |

---

## §4 预设键位方案

### 4.1 Default（InkForge 默认）

默认方案即本文档 §3 所定义的全量快捷键表。所有新安装用户的初始状态为 Default 方案。

**特征**:
- Ctrl+\ 专职模式切换（T03-06=C）
- Ctrl+K 打开 CommandPalette（与 VSCode 一致）
- Ctrl+D 多光标（与 VSCode 一致）
- 无 Vim/Emacs 风格按键

**SchemaId**: `"inkforge-default"`

### 4.2 Typora 兼容模式

面向从 Typora 迁移的用户，最大程度保留 Typora 的肌肉记忆。

**覆盖列表**（仅列出与 Default 不同的项）:

| 操作 | Typora 原键位 | Default 键位 |
|------|--------------|-------------|
| 删除线 | `Alt+Shift+5` | `Ctrl+Shift+X` |
| 无序列表 | `Ctrl+Shift+U` | 工具栏/斜杠命令 |
| 有序列表 | `Ctrl+Shift+O` | `Ctrl+Shift+O` |
| 标题（H1-H6） | `Ctrl+1`~`Ctrl+6` | `Ctrl+Alt+1`~`Ctrl+Alt+6` |
| 清除格式 | `Ctrl+\` 有选区时 | `Ctrl+Shift+N` |
| 模式切换 | `Ctrl+/` | `Ctrl+\` |
| 代码块 | `Ctrl+Shift+K` | `Ctrl+Alt+C` |
| 分割线 | `Ctrl+-` | `Ctrl+Alt+-` |

**激活方式**: Settings > 键盘 > 预设方案 > 选择"Typora 兼容模式"

**SchemaId**: `"typora-compat"`

**注意**: Typora 模式中 `Ctrl+1`~`Ctrl+6` 绑定为标题，因此 IME 合成期跳过规则扩展到 `Ctrl+1`~`Ctrl+6`（原 Default 只跳过 `Ctrl+1`~`Ctrl+9` 的 Tab 切换）。

### 4.3 VSCode 模式

面向日常使用 VSCode 的开发者用户，对齐 VSCode 的常用编辑键位。

**覆盖列表**（与 Default 差异项）:

| 操作 | VSCode 键位 | Default 键位 |
|------|------------|-------------|
| 向上复制行 | `Alt+Shift+Up` | 无默认 |
| 向下复制行 | `Alt+Shift+Down` | 无默认 |
| 转为注释 | `Ctrl+/` | 无默认（Source 模式有效） |
| 选中括号内内容 | `Ctrl+Shift+[` | 无默认 |
| 折叠代码块 | `Ctrl+Shift+[` | 无默认 |
| 展开代码块 | `Ctrl+Shift+]` | 无默认 |
| 命令面板 | `Ctrl+Shift+P` | `Ctrl+K` |
| 快速打开 | `Ctrl+P` | `Ctrl+P` |
| 删除行 | `Ctrl+Shift+K` | `Ctrl+Shift+K` |
| 缩进 | `Ctrl+]` | `Tab` [when:inList] |
| 减少缩进 | `Ctrl+[` | `Shift+Tab` [when:inList] |

**SchemaId**: `"vscode-compat"`

**激活方式**: Settings > 键盘 > 预设方案 > 选择"VSCode 模式"

### 4.4 Vim 模式（基础）

提供基础 Vim 导航键位，不实现完整 Modal Editing，仅覆盖 Normal 模式的移动命令。

**范围**: Editor 层，仅在光标未在 CommandPalette/Modal 内时激活。

**支持的 Vim 命令**:

| 命令 | 行为 |
|------|------|
| `h` / `j` / `k` / `l` | 左/下/上/右移动光标（Normal 模式） |
| `w` / `b` | 按词向前/向后移动 |
| `0` / `$` | 行首/行尾 |
| `gg` / `G` | 文档头/文档尾 |
| `i` | 进入 Insert 模式（恢复正常输入） |
| `Escape` | 退出 Insert 模式，进入 Normal 模式 |
| `u` | Undo（Normal 模式） |
| `Ctrl+R` | Redo（Normal 模式） |
| `dd` | 删除当前行 |
| `yy` | 复制当前行 |
| `p` | 在光标后粘贴 |
| `P` | 在光标前粘贴 |
| `v` | 进入 Visual 模式（文本选择） |
| `/` | 激活 FindReplace 查找面板 |
| `n` / `N` | 下一个/上一个查找结果 |

**StatusBar 指示器**: 激活 Vim 模式时，StatusBar 显示当前模式（`-- NORMAL --` / `-- INSERT --` / `-- VISUAL --`）。

**限制**: 不支持宏、寄存器、Ex 命令（`:wq` 等）、文本对象（`ci"` 等）。这些属于未来插件扩展能力。

**SchemaId**: `"vim-basic"`

### 4.5 Emacs 模式（基础）

提供基础 Emacs 导航和编辑键位，面向熟悉 Emacs 的用户。

**支持的 Emacs 命令**:

| 命令 | 行为 |
|------|------|
| `Ctrl+A` | 跳到行首（Emacs 语义，编辑器全选降优先级） |
| `Ctrl+E` | 跳到行尾 |
| `Ctrl+F` / `Ctrl+B` | 向前/向后移动一个字符 |
| `Ctrl+N` / `Ctrl+P` | 下移/上移一行 |
| `Alt+F` / `Alt+B` | 按词向前/向后移动 |
| `Ctrl+D` | 删除光标后的字符（覆盖多光标选词） |
| `Ctrl+K` | 删除到行尾（Kill Line，注意与 CommandPalette 冲突） |
| `Ctrl+Y` | 粘贴（Yank） |
| `Ctrl+Space` | 设置标记（Mark），开始选区 |
| `Ctrl+W` | 剪切选区（Kill Region，覆盖关闭文章） |
| `Alt+W` | 复制选区（Copy Region） |
| `Alt+<` | 跳到文档头 |
| `Alt+>` | 跳到文档尾 |
| `Ctrl+G` | 取消当前操作（Keyboard Quit） |
| `Ctrl+Z` | Undo（与 Default 一致） |
| `Ctrl+X Ctrl+S` | 保存（与 Chord 模式一致） |
| `Ctrl+X Ctrl+F` | 打开文件（快速打开） |

**注意**: Emacs 模式中 `Ctrl+K`（Kill Line）与 Default 的 CommandPalette 触发键冲突。Emacs 模式激活后，CommandPalette 改用 `Ctrl+X Ctrl+K` 触发。

**SchemaId**: `"emacs-basic"`

### 4.6 方案管理规范

```ts
interface KeymapPreset {
  id: string                          // 'inkforge-default' | 'typora-compat' | 'vscode-compat' | 'vim-basic' | 'emacs-basic'
  name: string                        // 显示名称
  description: string
  basePreset?: string                 // 基于哪个预设继承（null=从零开始）
  overrides: Record<string, string>   // commandId -> newKey
  isBuiltin: boolean                  // 内置预设不可删除
}
```

切换预设时：
1. 将当前用户自定义快捷键存为快照（`user_keymap_snapshot_${timestamp}`）
2. 应用新预设的 overrides
3. 弹出通知："已切换到 [预设名]，原自定义设置已备份"
4. 提供"撤销切换"按钮（10 秒内有效）

---

## §5 用户自定义

### 5.1 Settings > 键盘 页面规格

**路由**: `/settings/keyboard`

**页面结构**:

```
Settings > 键盘
├── 预设方案选择器（Dropdown）
│   ├── InkForge 默认
│   ├── Typora 兼容模式
│   ├── VSCode 模式
│   ├── Vim 基础模式
│   ├── Emacs 基础模式
│   └── 我的自定义（如有修改）
├── Chord 超时设置（Slider: 1-5 秒，默认 2 秒）
├── 搜索框（实时过滤命令列表）
├── 分组切换（Tab: 全部 / 文件 / 编辑 / 格式 / 视图 / 导航 / 搜索 / 插入 / 系统 / 写作辅助 / 评论）
├── 命令列表（虚拟滚动，≥ 170 项）
│   └── 每行：[命令名] [分组标签] [当前键位] [冲突标记?] [重置按钮] [录制按钮]
├── 导入 JSON 按钮
├── 导出 JSON 按钮
└── 全部重置按钮
```

**命令列表每行规格**:

| 字段 | 说明 |
|------|------|
| 命令名 | 国际化显示名（中文） |
| 分组标签 | 小徽章，颜色区分分组 |
| 当前键位 | 键位标签（`Ctrl+B`），点击进入录制模式 |
| 冲突标记 | 橙色感叹号图标，hover 显示冲突的其他命令 |
| 重置按钮 | 仅在该命令有用户覆盖时显示，点击重置为当前预设默认值 |
| 录制按钮 | 图标按钮，点击后进入按键捕获等待状态 |

### 5.2 按键捕获交互

**触发**: 点击"录制"按钮或直接点击键位标签。

**捕获流程**:

```
1. 键位标签变为 "按下组合键..." 状态（闪烁边框）
2. 捕获下一个 KeyboardEvent（非 Shift/Ctrl/Alt/Cmd/Meta 单独释放）
3. 判断是否为合法键位（非 OS 保留键）
4. 冲突检测（见 §5.3）
5a. 无冲突 → 立即预览新键位，等待用户确认（Enter）
5b. 有冲突 → 显示冲突弹窗（见 §6.2）
6. 用户确认 → 写入 user_shortcuts 表 → 热更新生效
7. 用户取消（Escape）→ 恢复原键位，退出录制状态
```

**等待超时**: 10 秒内无按键 → 自动退出录制状态，不修改。

**Chord 录制**: 录制时若第一键是 Chord Leader（如 Ctrl+K），系统进入 Chord ARMED 状态，等待第二键；超时后仅录制 Leader 键本身。

### 5.3 冲突检测算法

```ts
interface ConflictCheckResult {
  hasConflict: boolean
  conflictType: 'os-reserved' | 'app-shortcut' | 'plugin-shortcut' | 'scope-safe'
  conflictingCommand?: string  // commandId
  conflictingScope?: string
}

function checkConflict(
  newKey: string,
  commandId: string,
  scope: KeymapScope,
  registry: KeymapRegistry
): ConflictCheckResult {
  // Step 1: OS 保留键检测（阻塞性，不允许覆盖）
  if (OS_RESERVED_KEYS[platform].has(newKey)) {
    return { hasConflict: true, conflictType: 'os-reserved' }
  }

  // Step 2: InkForge 内置命令冲突检测
  const existingEntry = registry.findByKey(newKey)
  if (existingEntry && existingEntry.commandId !== commandId) {
    // 作用域检查：只有作用域有交集时才是真冲突
    if (scopesOverlap(scope, existingEntry.scope)) {
      return {
        hasConflict: true,
        conflictType: 'app-shortcut',
        conflictingCommand: existingEntry.commandId,
        conflictingScope: existingEntry.scope
      }
    }
    // 作用域互斥（如 editor-only vs hub-only）→ 安全
    return { hasConflict: false, conflictType: 'scope-safe' }
  }

  // Step 3: 插件注册键位冲突检测
  const pluginEntry = pluginRegistry.findByKey(newKey)
  if (pluginEntry) {
    return {
      hasConflict: true,
      conflictType: 'plugin-shortcut',
      conflictingCommand: pluginEntry.commandId
    }
  }

  return { hasConflict: false, conflictType: 'scope-safe' }
}
```

**作用域交集规则**:

| 作用域 A | 作用域 B | 是否冲突 |
|---------|---------|---------|
| `global` | 任意 | 是 |
| `editor` | `editor` | 是 |
| `editor` | `hub` | 否 |
| `hub` | `hub` | 是 |
| `modal` | 任意 | 否（模态层自处理） |

### 5.4 导入/导出（.json 格式）

**导出格式**:

```json
{
  "schema": "inkforge-keymap-v1",
  "version": "1.0.0",
  "basePreset": "inkforge-default",
  "exportedAt": "2026-04-20T10:00:00Z",
  "author": "ZRainbow1275",
  "overrides": [
    {
      "commandId": "editor.bold",
      "key": "Ctrl+B",
      "scope": "editor",
      "when": null,
      "source": "user"
    }
  ]
}
```

**导入验证**:

```ts
function validateKeymapJson(raw: unknown): ValidationResult {
  // 1. Schema 版本检查
  if (raw.schema !== 'inkforge-keymap-v1') return { valid: false, error: 'SCHEMA_MISMATCH' }

  // 2. 每条 override 的字段完整性检查
  for (const override of raw.overrides) {
    if (!override.commandId || !override.key) return { valid: false, error: 'MISSING_FIELDS' }
    // 3. CommandId 是否存在于当前命令注册表
    if (!commandRegistry.has(override.commandId)) {
      warnings.push(`Unknown commandId: ${override.commandId}, will be ignored`)
    }
  }

  return { valid: true, warnings }
}
```

**导入行为**: 导入成功后自动切换到"我的自定义"方案，原自定义存为快照。不合法的 commandId 跳过并记录 warning。

**导出行为**: 仅导出用户覆盖（delta），不导出整个键位表。

### 5.5 重置单个 / 全部重置

**重置单个**:
- 点击命令行右侧重置按钮（仅在有用户覆盖时可见）
- 弹出 `confirm("将 [操作名] 的快捷键重置为默认值 [默认键位]？")`
- 确认后删除该条 user_shortcuts 记录，热更新生效

**全部重置**:
- 点击页面底部"全部重置"按钮
- 弹出二次确认对话框（输入"重置"二字）
- 确认后清空 `user_shortcuts` 表中当前用户所有记录
- 如果当前预设是自定义方案，切回 `inkforge-default`
- 操作记录写入审计日志（24-permission-audit-spec）

---

## §6 冲突处理规则（详细）

### 6.1 OS 保留键列表

以下键位属于 OS 保留，InkForge **不得分配**，用户尝试录制时弹出错误并阻止保存：

**Windows**:
- `Ctrl+Alt+Del` — 系统中断
- `Win+*`（所有 Win 键组合）— Windows 系统保留
- `Ctrl+Shift+Esc` — 任务管理器
- `Alt+F4` — 关闭窗口（建议不覆盖，Tauri 可拦截）
- `Alt+Tab` — 应用切换
- `PrintScreen` / `Alt+PrintScreen` — 截图

**macOS**:
- `Cmd+Space` — Spotlight（强制保留）
- `Cmd+Tab` — 应用切换（强制保留）
- `Cmd+H` — 隐藏应用（强制保留）
- `Cmd+Option+Esc` — 强制退出（强制保留）
- `Ctrl+Up/Down/Left/Right` — Mission Control（建议不覆盖）

**Linux（通用）**:
- `Ctrl+Alt+F1`~`Ctrl+Alt+F7` — TTY 切换
- `Ctrl+Alt+T` — 终端（常见桌面环境保留，警告但不阻止）

### 6.2 应用内冲突处理流程

```
用户录制新键位
     │
     ▼
冲突检测（§5.3）
     │
  ┌──┴──────────────────────────────────┐
  │ OS 保留键                            │ 弹错误提示，阻止保存
  │ "此键位为系统保留键，无法使用"        │
  └─────────────────────────────────────┘
     │
  ┌──┴──────────────────────────────────┐
  │ 作用域内 App 命令冲突                │ 弹冲突对话框（见下）
  │ 警告但允许覆盖（T03-04=A）           │
  └─────────────────────────────────────┘
     │
  ┌──┴──────────────────────────────────┐
  │ 插件命令冲突                         │ 弹警告，允许覆盖，插件命令失绑
  └─────────────────────────────────────┘
     │
  ┌──┴──────────────────────────────────┐
  │ 无冲突 / 作用域安全                  │ 直接保存，立即热更新
  └─────────────────────────────────────┘
```

**冲突对话框规格**:

```
┌─ 快捷键冲突 ─────────────────────────────────────────────────┐
│                                                              │
│  Ctrl+Shift+X 当前绑定到「删除线」                           │
│  你要将它改绑到「剪切选区（Emacs 风格）」吗？               │
│                                                              │
│  改绑后，「删除线」将变为「未绑定」状态。                   │
│  你可以在 Settings > 键盘 中重新为「删除线」分配快捷键。    │
│                                                              │
│  [取消]  [仅改绑新命令，保留原命令未绑定]  [确认改绑]       │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 失绑命令的处理

当某命令因冲突被移除绑定后：
- Settings > 键盘 列表中该命令的键位列显示"未绑定"标签（灰色）
- StatusBar 显示警告："1 个命令已失去快捷键绑定" — 3 秒自动消失，可点击跳转到 Settings（T03-13=B）

### 6.4 Chord Leader 冲突

如果某个键被同时注册为 Chord Leader 和普通命令，优先级规则：
- 进入 ARMED 状态（等待第二键）
- 2 秒内有第二键 → 执行 Chord 命令
- 2 秒超时 → 执行 Leader 键对应的普通命令（如有）
- 无普通命令 → 取消，StatusBar 提示 "Chord 已取消"

### 6.5 Chord 状态机完整定义

```
                   按下 Leader 键
IDLE ────────────────────────────────► ARMED
 ▲                                      │
 │                           ┌──────────┼──────────┐
 │                           ▼          ▼          ▼
 │                       匹配第二键  超时(2s)   Escape
 │                           │          │          │
 │                      EXECUTING    CANCELLING  CANCELLING
 │                           │          │          │
 └───────────────────────────┴──────────┴──────────┘
                      IDLE（等待下一次输入）
```

**ARMED 状态行为**:
- 所有非 Chord 第二键的输入被拦截
- 右下角弹出 Chord Overlay（见 §9.4）
- 计时器启动（用户可配置 1-5 秒）

**CANCELLING 状态行为**:
- StatusBar 显示"Chord 已取消"，3 秒后自动消失
- Chord Overlay 立即关闭

---

## §7 平台差异（Win/Linux/macOS 键映射）

### 7.1 键位映射总则

| 文档中的符号 | Windows/Linux | macOS |
|------------|--------------|-------|
| `Mod` | `Ctrl` | `Cmd` |
| `Alt` | `Alt` | `Option` |
| `Meta` | `Win` | `Cmd` |
| `Shift` | `Shift` | `Shift` |

**运行时自动替换**: `useKeybindings.ts` 在初始化时检测 `navigator.platform`（Tauri 环境下使用 `os.type()`），自动将所有键位定义中的 `Mod` 替换为平台对应修饰键。UI 显示也随平台变化（Windows 显示 `Ctrl+B`，macOS 显示 `⌘B`）。

### 7.2 macOS 特殊处理

**中文输入法与 Cmd 键**:
- macOS 上 Cmd 键不触发 IME composing，因此 `Cmd+数字` 在 macOS 无需 IME 跳过处理
- 仅 Windows/Linux 的 `Ctrl+数字` 需要 IME 合成期跳过（T03-08=B）

**Cmd+H / Cmd+M 系统级拦截**:
- macOS 上 `Cmd+H`（隐藏应用）和 `Cmd+M`（最小化）是系统级快捷键，Tauri 窗口无法完全拦截
- InkForge 在 macOS 上将 `Cmd+H` 的"高亮"功能改为 `Cmd+Shift+H`，避免冲突
- `Cmd+M`（行内公式）在 macOS 可能被最小化拦截，提供 `Cmd+Alt+M` 作为备用

**Backspace vs Delete**:
- macOS 键盘的 `Backspace` 在 InkForge 中处理等同于 Windows 的 `Backspace`
- macOS 的 `Fn+Delete` 等同于 Windows 的 `Delete`（向后删除）

### 7.3 Linux 特殊处理

**GTK 输入法**:
- GTK 的 IBus/Fcitx 在 composing 期间对 Ctrl 键的处理与 Windows IME 不同
- InkForge 在 Linux 上额外监听 `compositionstart`/`compositionend` 事件，与 Windows 一致处理

**Super 键**:
- Linux 的 Super（Win）键属于桌面环境保留，InkForge 不使用 Super 键组合
- 已知冲突：GNOME 占用 `Ctrl+Alt+T`（终端），InkForge 在 Linux 上弹出警告提示而非阻止

**Wayland vs X11**:
- 全局快捷键注册（Tauri GlobalShortcut）在 Wayland 下可能受限
- 如全局快捷键注册失败，InkForge 降级为应用内焦点时捕获（仅在应用窗口激活时生效）

### 7.4 键位显示规范（UI）

| 平台 | 显示格式 | 示例 |
|------|---------|------|
| Windows | 文字 | `Ctrl+B` |
| Linux | 文字 | `Ctrl+B` |
| macOS | 符号 | `⌘B` |

**macOS 符号映射**:

| 修饰键 | 符号 |
|-------|------|
| Cmd | ⌘ |
| Option | ⌥ |
| Shift | ⇧ |
| Ctrl | ⌃ |
| Backspace | ⌫ |
| Delete | ⌦ |
| Enter | ↩ |
| Tab | ⇥ |
| Esc | ⎋ |
| Up/Down/Left/Right | ↑↓←→ |

---

## §8 无障碍（键盘全键盘可访问性保证）

### 8.1 全键盘可访问性原则

InkForge 的所有功能必须通过键盘（不使用鼠标）完全可操作。

**覆盖要求**:

| 区域 | 键盘进入方式 | 内部导航 |
|------|------------|---------|
| Hub 文章列表 | `Ctrl+N` 新建；`Tab` 进入列表 | `↑↓` 移动；`Enter` 打开；`Delete` 删除 |
| Workstation 编辑器 | `Ctrl+E` 焦点进入编辑器 | 所有编辑键位 |
| FloatingToolbar | 光标在选区时 `Alt+T` 激活工具栏 | `←→` 按钮间移动；`Enter` 触发 |
| Settings 页面 | `Ctrl+,` 进入；`Tab` 导航 | `←→↑↓` 导航；`Enter/Space` 切换 |
| CommandPalette | `Ctrl+K` 打开 | `↑↓` 移动结果；`Enter` 执行；`Esc` 关闭 |
| 模态对话框 | 由触发动作打开 | `Tab`/`Shift+Tab` 循环；`Enter` 确认；`Esc` 取消 |
| 右键菜单 | `Shift+F10` 或 `Menu` 键 | `↑↓` 移动；`→` 展开子菜单；`←` 收起；`Enter` 执行 |
| FindReplace 面板 | `Ctrl+F`/`Ctrl+H` | `Tab` 在输入框/按钮间导航；`Enter` 查找下一个 |

### 8.2 焦点陷阱规范

所有模态（Modal/Dialog）必须实现焦点陷阱：
- 焦点不能离开模态（`Tab` 在最后一个元素时跳回第一个元素）
- `Shift+Tab` 在第一个元素时跳到最后一个元素
- 模态关闭后焦点返回到触发元素

**实现**: 使用 `focus-trap-vue` 库或等价的自定义 `composable/useFocusTrap.ts`。

### 8.3 快捷键帮助面板的无障碍

- `F1` 打开帮助面板后，焦点自动移入搜索框
- 搜索框 `aria-label="搜索快捷键或命令名"`
- 快捷键列表使用 `role="listbox"` + `aria-label`
- 每行命令的键位标签使用 `<kbd>` 元素
- 录制模式下 `aria-live="polite"` 实时播报按键结果

### 8.4 StatusBar 无障碍

- StatusBar 的短提示区域设置 `aria-live="polite"` + `aria-atomic="true"`
- 3 秒后消失时同步通知屏幕阅读器

### 8.5 跳过导航链接

Hub 和 Workstation 视图顶部均提供"跳过导航"隐藏链接：
- `<a class="skip-nav" href="#main-content">跳过导航，直接到主内容</a>`
- Tab 键第一次按下时显示（`focus-visible` 状态）

---

## §9 KeymapService 实现规格

### 9.1 数据模型（TypeScript 严格模式）

```ts
// src/services/keymap/types.ts

export type KeymapScope =
  | 'global'
  | 'hub'
  | 'workstation'
  | 'editor'
  | 'source'
  | 'settings'
  | 'modal'
  | 'command-palette'
  | 'find-replace'

export type KeymapSource = 'default' | 'preset' | 'user' | 'plugin'

export type KeymapConflictType =
  | 'os-reserved'
  | 'app-shortcut'
  | 'plugin-shortcut'
  | 'scope-safe'
  | 'none'

export interface KeymapEntry {
  readonly id: string                    // 唯一 UUID
  readonly commandId: string             // 对应 commandRegistry 中的命令 ID
  key: string                            // 'Ctrl+B' | 'Ctrl+K Ctrl+S'（Chord）
  readonly scope: KeymapScope
  when?: string                          // 条件表达式字符串，如 'hasSelection'
  source: KeymapSource
  readonly isChord: boolean              // key 中是否含有空格（Chord 标记）
  readonly description: string           // 显示用文案（i18n key）
  readonly group: KeymapGroup            // 分组
  readonly isBuiltin: boolean            // 内置键位，可覆盖但不可删除
}

export type KeymapGroup =
  | 'file'
  | 'edit'
  | 'format'
  | 'view'
  | 'navigate'
  | 'search'
  | 'insert'
  | 'system'
  | 'writing'
  | 'review'

export interface KeymapConflictResult {
  hasConflict: boolean
  conflictType: KeymapConflictType
  conflictingEntry?: KeymapEntry
}

export interface KeymapPreset {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly basePreset: string | null
  readonly overrides: Readonly<Record<string, string>>   // commandId -> key
  readonly isBuiltin: boolean
}

export interface UserKeymapOverride {
  commandId: string
  key: string
  updatedAt: string    // ISO 8601
}
```

### 9.2 KeymapRegistry

```ts
// src/services/keymap/registry.ts

export class KeymapRegistry {
  private readonly entries: Map<string, KeymapEntry> = new Map()    // commandId -> entry
  private readonly reverseIndex: Map<string, Set<string>> = new Map() // key -> commandId set

  register(entry: KeymapEntry): void {
    this.entries.set(entry.commandId, entry)
    this.addToReverseIndex(entry.key, entry.commandId)
  }

  unregister(commandId: string): void {
    const entry = this.entries.get(commandId)
    if (entry) {
      this.removeFromReverseIndex(entry.key, commandId)
      this.entries.delete(commandId)
    }
  }

  findByCommandId(commandId: string): KeymapEntry | undefined {
    return this.entries.get(commandId)
  }

  findByKey(key: string, scope?: KeymapScope): KeymapEntry[] {
    const commandIds = this.reverseIndex.get(key) ?? new Set()
    return Array.from(commandIds)
      .map(id => this.entries.get(id)!)
      .filter(entry => !scope || scopesOverlap(entry.scope, scope))
  }

  getAll(): KeymapEntry[] {
    return Array.from(this.entries.values())
  }

  getByGroup(group: KeymapGroup): KeymapEntry[] {
    return this.getAll().filter(e => e.group === group)
  }

  private addToReverseIndex(key: string, commandId: string): void {
    if (!this.reverseIndex.has(key)) {
      this.reverseIndex.set(key, new Set())
    }
    this.reverseIndex.get(key)!.add(commandId)
  }

  private removeFromReverseIndex(key: string, commandId: string): void {
    this.reverseIndex.get(key)?.delete(commandId)
  }
}
```

### 9.3 KeymapResolver（优先级解析）

```ts
// src/services/keymap/resolver.ts

export class KeymapResolver {
  constructor(
    private readonly registry: KeymapRegistry,
    private readonly contextEvaluator: ContextEvaluator
  ) {}

  resolve(
    key: string,
    currentScope: KeymapScope,
    editorContext: EditorContext
  ): KeymapEntry | null {
    const candidates = this.registry.findByKey(key, currentScope)

    if (candidates.length === 0) return null

    // 按层级优先级排序
    const sorted = candidates.sort((a, b) =>
      SCOPE_PRIORITY[a.scope] - SCOPE_PRIORITY[b.scope]
    )

    // 取第一个满足 when 条件的 entry
    for (const entry of sorted) {
      if (!entry.when || this.contextEvaluator.evaluate(entry.when, editorContext)) {
        return entry
      }
    }

    return null
  }
}

const SCOPE_PRIORITY: Record<KeymapScope, number> = {
  'modal':             0,  // 最高优先级
  'command-palette':   1,
  'find-replace':      2,
  'editor':            3,
  'source':            3,
  'hub':               4,
  'workstation':       4,
  'settings':          4,
  'global':            5   // 最低优先级（但全局有效）
}

// ContextEvaluator：执行 when 表达式
export class ContextEvaluator {
  evaluate(expression: string, context: EditorContext): boolean {
    // 支持的条件表达式：
    // 'hasSelection'       — 编辑器有非空选区
    // 'noSelection'        — 无选区（光标点）
    // 'inList'             — 光标在列表项内
    // 'inCodeBlock'        — 光标在代码块内
    // 'inTable'            — 光标在表格单元格内
    // 'inModal'            — 模态已打开
    // 'multiCursorActive'  — 多光标激活
    // 'imeComposing'       — IME 合成期进行中
    // 'isTyporaMode'       — 当前为 Typora 模式
    // 'isSourceMode'       — 当前为 Source 模式
    // 'isPreviewMode'      — 当前为 Preview 模式
    // '!X'                 — 逻辑非
    // 'X && Y'             — 逻辑与
    // 'X || Y'             — 逻辑或
    return evaluateExpression(expression, context)
  }
}
```

### 9.4 Chord 管理器

```ts
// src/services/keymap/chord-manager.ts

type ChordState = 'IDLE' | 'ARMED' | 'EXECUTING' | 'CANCELLING'

export class ChordManager {
  private state: ChordState = 'IDLE'
  private leaderKey: string | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private readonly timeoutMs: number

  constructor(timeoutMs: number = 2000) {
    this.timeoutMs = timeoutMs
  }

  handleKey(key: string, registry: KeymapRegistry): ChordHandleResult {
    if (this.state === 'IDLE') {
      // 检查 key 是否是某个 Chord 的 Leader
      const isLeader = registry.getAll().some(e => e.isChord && e.key.startsWith(key + ' '))
      if (isLeader) {
        this.enterArmed(key)
        return { action: 'chord-armed', leaderKey: key }
      }
      return { action: 'pass-through' }
    }

    if (this.state === 'ARMED') {
      const chordKey = `${this.leaderKey} ${key}`
      const entries = registry.findByKey(chordKey)
      if (entries.length > 0) {
        this.reset()
        return { action: 'execute-chord', entry: entries[0], chordKey }
      }
      // 第二键不匹配 → 取消
      this.cancel()
      return { action: 'chord-cancelled' }
    }

    return { action: 'pass-through' }
  }

  private enterArmed(leaderKey: string): void {
    this.state = 'ARMED'
    this.leaderKey = leaderKey
    this.timer = setTimeout(() => this.cancel(), this.timeoutMs)
  }

  cancel(): void {
    this.reset()
    this.state = 'CANCELLING'
    // 通知 StatusBar
    statusBarService.showMessage('Chord 已取消', 3000)
    // 关闭 Chord Overlay
    chordOverlayStore.close()
    // 重置为 IDLE
    requestAnimationFrame(() => { this.state = 'IDLE' })
  }

  private reset(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.leaderKey = null
    this.state = 'IDLE'
  }
}

// Chord Overlay 数据
export function getChordOverlayCandidates(
  leaderKey: string,
  registry: KeymapRegistry
): KeymapEntry[] {
  return registry.getAll().filter(e =>
    e.isChord && e.key.startsWith(leaderKey + ' ')
  )
}
```

### 9.5 持久化（IndexedDB keymaps 表）

```ts
// src/services/keymap/persistence.ts

export interface KeymapDB {
  /**
   * 表: user_shortcuts
   * 主键: commandId
   * 存储用户覆盖的键位（delta，不存储整个 Registry）
   */
  user_shortcuts: {
    key: string            // commandId（主键）
    value: UserKeymapOverride
    indexes: {
      'by-updated-at': string
    }
  }

  /**
   * 表: keymap_presets
   * 主键: presetId
   * 存储用户自定义预设方案（内置预设不存储到 DB）
   */
  keymap_presets: {
    key: string            // presetId
    value: KeymapPreset
  }

  /**
   * 表: keymap_snapshots
   * 主键: snapshotId
   * 存储切换预设前的快照（自动 GC，保留最近 10 条）
   */
  keymap_snapshots: {
    key: string
    value: {
      id: string
      createdAt: string
      label: string
      overrides: UserKeymapOverride[]
    }
  }
}

// 初始化
export async function initKeymapDB(): Promise<IDBPDatabase<KeymapDB>> {
  return openDB<KeymapDB>('inkforge-keymap', 1, {
    upgrade(db) {
      const store = db.createObjectStore('user_shortcuts', { keyPath: 'commandId' })
      store.createIndex('by-updated-at', 'updatedAt')

      db.createObjectStore('keymap_presets', { keyPath: 'id' })
      db.createObjectStore('keymap_snapshots', { keyPath: 'id' })
    }
  })
}

// 加载用户覆盖并合并到 Registry
export async function loadAndApplyUserOverrides(
  db: IDBPDatabase<KeymapDB>,
  registry: KeymapRegistry
): Promise<void> {
  const overrides = await db.getAll('user_shortcuts')
  for (const override of overrides) {
    const entry = registry.findByCommandId(override.commandId)
    if (entry) {
      // 更新 key 并标记为 user source
      registry.unregister(override.commandId)
      registry.register({ ...entry, key: override.key, source: 'user' })
    }
  }
}

// 持久化单条覆盖（热更新路径）
export async function saveUserOverride(
  db: IDBPDatabase<KeymapDB>,
  override: UserKeymapOverride
): Promise<void> {
  await db.put('user_shortcuts', override)
}

// 快照 GC：保留最近 10 条
export async function pruneSnapshots(db: IDBPDatabase<KeymapDB>): Promise<void> {
  const all = await db.getAll('keymap_snapshots')
  const sorted = all.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  for (const snap of sorted.slice(10)) {
    await db.delete('keymap_snapshots', snap.id)
  }
}
```

### 9.6 热更新流程

```ts
// src/services/keymap/hot-update.ts

export async function hotUpdateKeymap(
  commandId: string,
  newKey: string,
  db: IDBPDatabase<KeymapDB>,
  registry: KeymapRegistry
): Promise<HotUpdateResult> {
  // 1. 冲突检测
  const conflict = checkConflict(newKey, commandId, registry)
  if (conflict.conflictType === 'os-reserved') {
    return { success: false, reason: 'OS_RESERVED' }
  }

  // 2. 处理现有占用命令（如有）
  if (conflict.hasConflict && conflict.conflictingEntry) {
    await saveUserOverride(db, {
      commandId: conflict.conflictingEntry.commandId,
      key: '',    // 空字符串 = 未绑定
      updatedAt: new Date().toISOString()
    })
    registry.unregister(conflict.conflictingEntry.commandId)
    registry.register({
      ...conflict.conflictingEntry,
      key: '',
      source: 'user'
    })
  }

  // 3. 更新目标命令的键位
  const entry = registry.findByCommandId(commandId)!
  registry.unregister(commandId)
  registry.register({ ...entry, key: newKey, source: 'user' })

  // 4. 持久化
  await saveUserOverride(db, {
    commandId,
    key: newKey,
    updatedAt: new Date().toISOString()
  })

  // 5. 广播到所有窗口（BroadcastChannel）
  keymapBroadcast.postMessage({ type: 'KEYMAP_UPDATED', commandId, newKey })

  // 6. 更新 Tauri 全局快捷键注册（对全局层快捷键）
  if (entry.scope === 'global') {
    await tauriGlobalShortcut.unregister(entry.key)
    await tauriGlobalShortcut.register(newKey, () => commandRegistry.execute(commandId))
  }

  return { success: true }
}
```

---

## §10 测试矩阵（≥ 40 条）

### 10.1 快捷键功能测试

| TC-ID | 分类 | 场景 | 前置条件 | 操作 | 预期结果 | 边界/失败 |
|-------|------|------|---------|------|---------|---------|
| KM-01 | 文件 | Ctrl+N 全局新建 | 在任意视图 | `Ctrl+N` | 新建文章，进入 Workstation Typora 模式 | 最近模板被删时空白新建 |
| KM-02 | 文件 | Ctrl+S 强制保存 | 有未保存内容 | `Ctrl+S` | 文件写入磁盘，标题栏"*"消失 | 磁盘满 → StatusBar 错误 + 详情链接 |
| KM-03 | 文件 | Ctrl+W 关闭文章 | 有未保存内容 | `Ctrl+W` | 弹出保存确认对话框 | 用户取消 → 不关闭 |
| KM-04 | 文件 | Ctrl+1 切 Tab | 打开 3 个 Tab | `Ctrl+1` | 跳到第 1 个 Tab | IME 合成期间不触发 |
| KM-05 | 文件 | Ctrl+Shift+E 导出 | Workstation 激活 | `Ctrl+Shift+E` | 打开导出预设选择器 | 无内容时仍可打开 |
| KM-06 | 编辑 | Ctrl+Z 撤销逻辑分组 | 输入 "hello world" | `Ctrl+Z` 一次 | 撤销 "world "（一组） | 再 Ctrl+Z 撤销 "hello" |
| KM-07 | 编辑 | Ctrl+D 选中当前词 | 光标在 "hello" 内 | `Ctrl+D` | 选中 "hello" | 光标在词边界时选中左侧词 |
| KM-08 | 编辑 | Ctrl+D 添加多光标 | 已选中 "hello" | `Ctrl+D` 再次 | 选中下一个 "hello"，多光标 | 无更多匹配时从头循环 |
| KM-09 | 编辑 | Ctrl+Shift+L 全选匹配 | 选中 "hello" | `Ctrl+Shift+L` | 所有 "hello" 被多光标选中 | 超 100 个匹配时警告性能 |
| KM-10 | 编辑 | Ctrl+U 移除最后多光标 | 多光标 3 个 | `Ctrl+U` | 移除最后添加的匹配 | 只剩 1 个时不再 Ctrl+U |
| KM-11 | 编辑 | Esc 退出多光标 | 多光标 5 个 | `Escape` | 仅保留主光标 | 同时退出浮动工具栏 |
| KM-12 | 格式 | Ctrl+B 粗体 Toggle | 选区有文字 | `Ctrl+B` | 加粗；再次 `Ctrl+B` 取消粗体 | 混合选区（部分粗体）→ 全部加粗 |
| KM-13 | 格式 | Ctrl+Alt+1 H1 | 普通段落 | `Ctrl+Alt+1` | 转为 H1 | IME 合成期跳过 |
| KM-14 | 格式 | Ctrl+Shift+N 清除格式 | 选区包含粗体+斜体 | `Ctrl+Shift+N` | 所有行内格式清除 | 块级格式（标题/列表）保留 |
| KM-15 | 格式 | Tab 列表缩进 | 光标在列表项 | `Tab` | 增加一级缩进 | 最深级时不再响应 |
| KM-16 | 格式 | Shift+Tab 列表减缩 | 二级列表项 | `Shift+Tab` | 减少一级缩进 | 顶层时退出列表（空项）或保留（非空） |
| KM-17 | 格式 | Enter 列表减缩（Notion） | 三级嵌套空项 | `Enter` | 回到二级（E-01=B） | 顶层空项 → 退出列表为普通段落 |
| KM-18 | 视图 | Ctrl+\ 模式切换 | Typora 模式 | `Ctrl+\` | 切换到 Source 模式 | 再次 `Ctrl+\` 切换到 Preview |
| KM-19 | 视图 | Ctrl+= 纸张宽度 | 中等纸张 | `Ctrl+=` | 切换到下一档宽度 | 循环四档 |
| KM-20 | 视图 | F11 专注模式 | Workstation | `F11` | 进入全屏专注写作模式 | 再次 `F11` 退出 |
| KM-21 | 导航 | Ctrl+Home 文档头 | 光标在文中 | `Ctrl+Home` | 光标跳到文档最开始 | 大文档（10 万字）延迟 ≤ 16ms |
| KM-22 | 导航 | Ctrl+G 段落跳转 | Typora 模式 | `Ctrl+G` | 弹出段落模糊跳转框 | Source 模式下弹行号跳转 |
| KM-23 | 搜索 | Ctrl+F 查找 | 任意文档 | `Ctrl+F` | FindReplace 浮窗出现（查找模式） | 空文档时搜索框可用 |
| KM-24 | 搜索 | Ctrl+H 替换 | 任意文档 | `Ctrl+H` | FindReplace 浮窗出现（替换模式） | 自动填充最近搜索词 |
| KM-25 | 搜索 | Alt+Ctrl+R 正则切换 | FindReplace 激活 | `Alt+Ctrl+R` | Toggle 正则模式；无效正则显示红框 | 正则与全词同时开启时正确联合生效 |
| KM-26 | 搜索 | Alt+A 替换全部 | 查找到 5 个匹配 | `Alt+A` | 5 处替换完成，显示"5 处已替换" | 0 个匹配时 Toast "0 处替换" |
| KM-27 | 搜索 | Ctrl+Shift+F 全局搜索 | 全局 | `Ctrl+Shift+F` | 全局搜索面板打开 | 搜索中显示进度 |
| KM-28 | 插入 | Ctrl+K Ctrl+K 链接 | 选中文字 | `Ctrl+K Ctrl+K` | LinkPopover 出现（Chord） | 无选区时 URL 为空 |
| KM-29 | 插入 | Ctrl+Alt+Shift+T 表格 | 普通段落 | `Ctrl+Alt+Shift+T` | 弹出表格尺寸选择器 | 表格内时追加行/列 |
| KM-30 | 插入 | Ctrl+M 行内公式 | 普通段落 | `Ctrl+M` | 插入 `$...$` 并进入编辑状态 | 光标已在公式内时退出公式 |
| KM-31 | 系统 | Ctrl+K CommandPalette | 任意位置 | `Ctrl+K` | CommandPalette 打开 | 再次 `Ctrl+K` 关闭 |
| KM-32 | 系统 | Ctrl+, Settings | 任意位置 | `Ctrl+,` | 跳转到 Settings 视图 | 已在 Settings 时无反应 |
| KM-33 | 系统 | F1 帮助面板 | 任意位置 | `F1` | 帮助 Tooltip 面板打开，焦点进入搜索框 | 模态打开时帮助面板仍可打开 |
| KM-34 | Chord | Ctrl+K Ctrl+S 快捷键设置 | 任意位置 | `Ctrl+K` 然后 `Ctrl+S` | Settings > 键盘 页面打开 | 2 秒超时 → Chord 取消，StatusBar 提示 |
| KM-35 | Chord | Chord Overlay 显示 | 任意位置 | `Ctrl+K`（仅 Leader） | 右下角 Chord Overlay 弹出，显示候选列表 | `Esc` 立即关闭 Overlay |
| KM-36 | 冲突 | 录制已占用键 | Settings > 键盘 | 录制 `Ctrl+B` 给其他命令 | 弹出冲突对话框，显示当前绑定命令 | 用户取消 → 保留原状 |
| KM-37 | 冲突 | 录制 OS 保留键 | Settings > 键盘 | 录制 `Ctrl+Alt+Del` | 弹错误提示，阻止保存 | 任何 OS 保留键均阻止 |
| KM-38 | 热更新 | 修改快捷键即时生效 | Settings > 键盘 | 将 `Ctrl+B` 改为 `Ctrl+Shift+B` | 立即生效，无需重启 | 多窗口同步（BroadcastChannel） |
| KM-39 | IME | Ctrl+1 合成期跳过 | Windows + 微软拼音 IME 合成中 | `Ctrl+1` | 不触发 Tab 切换，字符传递给 IME | 中文输入完成后 Ctrl+1 正常触发 |
| KM-40 | IME | 其他快捷键合成期正常 | Windows + IME 合成中 | `Ctrl+B` | 正常触发粗体格式（T03-08=B） | Ctrl+数字系列跳过；其他不跳过 |
| KM-41 | 无障碍 | 全键盘操作 Hub | 无鼠标 | Tab 键进入文章列表 | 文章列表高亮第一项 | ↑↓ 移动；Enter 打开 |
| KM-42 | 无障碍 | 模态焦点陷阱 | 任意 Modal 打开 | Tab 键循环 | 焦点不离开 Modal | Shift+Tab 反向 |
| KM-43 | 预设 | 切换 Typora 兼容模式 | Settings > 键盘 | 选择 Typora 模式 | 键位按 §4.2 覆盖，通知用户 | 原自定义已备份 |
| KM-44 | 预设 | 导入导出 JSON | Settings > 键盘 | 导出 → 修改 → 导入 | 正确应用导入的键位差异 | 格式错误 → 拒绝并提示 |
| KM-45 | 持久化 | 重启后恢复自定义 | 已设置自定义键位 | 重启 InkForge | 自定义键位从 IndexedDB 恢复 | 数据库损坏 → 回落到默认 |

### 10.2 性能测试

| TC-ID | 场景 | 门槛 | 测试方法 |
|-------|------|------|---------|
| KM-PERF-01 | 快捷键触发到命令执行延迟 | ≤ 16ms | `keydown` → `command.execute` 时间差 |
| KM-PERF-02 | Chord 超时倒计时精度 | 误差 ≤ 100ms | setTimeout 精度测试 |
| KM-PERF-03 | 冲突检测（170 条命令） | ≤ 1ms | `performance.mark` |
| KM-PERF-04 | 全量 Registry 初始化 | ≤ 50ms | 应用启动时测量 |
| KM-PERF-05 | IndexedDB 热更新写入 | ≤ 10ms | Tauri IPC + IndexedDB put 往返 |
| KM-PERF-06 | BroadcastChannel 跨窗口同步延迟 | ≤ 100ms | 双窗口测试 |

### 10.3 平台兼容性测试

| TC-ID | 平台 | 场景 | 预期 |
|-------|------|------|------|
| KM-PLAT-01 | Windows 11 | `Ctrl+,`（Settings）触发 | 正常打开 Settings；不被 Windows 11 拦截 |
| KM-PLAT-02 | macOS 14 | `Cmd+H`（高亮，已改为 Cmd+Shift+H） | 不触发 macOS 隐藏应用 |
| KM-PLAT-03 | Ubuntu 22.04 + GNOME | `Ctrl+Alt+T`（直接进入 Typora） | 弹出警告（与 GNOME 终端快捷键冲突） |
| KM-PLAT-04 | Windows + 搜狗拼音 | IME 合成期 `Ctrl+1` | 不触发 Tab 切换 |
| KM-PLAT-05 | Windows + 微软拼音 | IME 合成期 `Ctrl+B` | 正常触发粗体 |

---

## 附录 A：全量快捷键参考表（合并表，含 Win/Mac 双列）

> 本附录为 §3 全量表的汇总参考，供快速检索。标注 [chord] 的为两段组合键，标注 [IME] 的为 IME 合成期跳过。

### A.1 文件与文档管理

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 新建文章 | `Ctrl+N` | `⌘N` |
| 快速打开文章 | `Ctrl+P` | `⌘P` |
| 打开文件浏览器 | `Ctrl+O` | `⌘O` |
| 保存 | `Ctrl+S` | `⌘S` |
| 另存为 | `Ctrl+Shift+S` | `⌘⇧S` |
| 关闭当前文章 | `Ctrl+W` | `⌘W` |
| 关闭所有文章 | `Ctrl+Shift+W` | `⌘⇧W` |
| 重命名文章 | `F2` | `F2` |
| 移动到回收站 | `Delete` | `Backspace` |
| 导入 Markdown | `Ctrl+Shift+I` | `⌘⇧I` |
| 导出当前文章 | `Ctrl+Shift+E` | `⌘⇧E` |
| 发布到当前平台 | `Ctrl+Shift+U` | `⌘⇧U` |
| 打印/导出 PDF | `Ctrl+Shift+P` | `⌘⇧P` |
| 在文件管理器中显示 | `Ctrl+Shift+R` | `⌘⇧R` |
| 复制文件路径 | `Ctrl+Alt+C` | `⌘⌥C` |
| 切换到上一个文章 | `Ctrl+Tab` | `⌃Tab` |
| 切换到下一个文章 | `Ctrl+Shift+Tab` | `⌃⇧Tab` |
| 切换到 Tab 1-9 | `Ctrl+1`~`Ctrl+9` [IME] | `⌘1`~`⌘9` |

### A.2 编辑操作

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 撤销 | `Ctrl+Z` | `⌘Z` |
| 重做 | `Ctrl+Shift+Z` / `Ctrl+Y` | `⌘⇧Z` |
| 剪切 | `Ctrl+X` | `⌘X` |
| 复制 | `Ctrl+C` | `⌘C` |
| 粘贴（智能） | `Ctrl+V` | `⌘V` |
| 粘贴（保留 HTML） | `Ctrl+Shift+V` | `⌘⇧V` |
| 粘贴为纯文本 | `Ctrl+Alt+V` | `⌘⌥V` |
| 全选 | `Ctrl+A` | `⌘A` |
| 选中当前词 / 下一个匹配 | `Ctrl+D` | `⌘D` |
| 选中所有匹配 | `Ctrl+Shift+L` | `⌘⇧L` |
| 移除最后多光标 | `Ctrl+U` | `⌘U` |
| 退出多光标 | `Escape` | `⎋` |
| 向上移动行 | `Alt+Up` | `⌥↑` |
| 向下移动行 | `Alt+Down` | `⌥↓` |
| 删除当前行 | `Ctrl+Shift+K` | `⌘⇧K` |
| 在下方插入空行 | `Ctrl+Enter` | `⌘↩` |
| 在上方插入空行 | `Ctrl+Shift+Enter` | `⌘⇧↩` |
| 软换行 | `Shift+Enter` | `⇧↩` |
| 删除到词尾 | `Ctrl+Delete` | `⌥⌦` |
| 删除到词首 | `Ctrl+Backspace` | `⌥⌫` |
| 切换大小写 | `Alt+U` | `⌥U` |

### A.3 格式化

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 粗体 | `Ctrl+B` | `⌘B` |
| 斜体 | `Ctrl+I` | `⌘I` |
| 下划线 | `Ctrl+U` | `⌘U` |
| 删除线 | `Ctrl+Shift+X` | `⌘⇧X` |
| 行内代码 | `Ctrl+Shift+C` | `⌘⇧C` |
| 高亮 | `Ctrl+Shift+H` | `⌘⇧H` |
| 高亮颜色选择器 | `Ctrl+Alt+H` | `⌘⌥H` |
| 上标 | `Ctrl+.` | `⌘.` |
| 清除格式 | `Ctrl+Shift+N` | `⌘⇧N` |
| 段落 | `Ctrl+Alt+0` | `⌘⌥0` |
| 标题 H1 | `Ctrl+Alt+1` [IME] | `⌘⌥1` |
| 标题 H2 | `Ctrl+Alt+2` [IME] | `⌘⌥2` |
| 标题 H3 | `Ctrl+Alt+3` [IME] | `⌘⌥3` |
| 标题 H4 | `Ctrl+Alt+4` [IME] | `⌘⌥4` |
| 标题 H5 | `Ctrl+Alt+5` [IME] | `⌘⌥5` |
| 标题 H6 | `Ctrl+Alt+6` [IME] | `⌘⌥6` |
| 有序列表 | `Ctrl+Shift+O` | `⌘⇧O` |
| 任务列表 | `Ctrl+Shift+T` | `⌘⇧T` |
| 引用块 | `Ctrl+Shift+Q` | `⌘⇧Q` |
| 代码块 | `Ctrl+Alt+C` | `⌘⌥C` |
| 分割线 | `Ctrl+Alt+-` | `⌘⌥-` |
| 粗体+斜体 | `Ctrl+Alt+B` | `⌘⌥B` |
| 行内公式 | `Ctrl+M` | `⌘M` |
| 块级公式 | `Ctrl+Alt+M` | `⌘⌥M` |
| 文字颜色 | `Ctrl+Alt+F` | `⌘⌥F` |
| 文字背景色 | `Ctrl+Alt+G` | `⌘⌥G` |
| 段落居左 | `Ctrl+Shift+A` | `⌘⇧A` |
| 段落居右 | `Ctrl+Shift+D` | `⌘⇧D` |
| 段落两端对齐 | `Ctrl+Shift+J` | `⌘⇧J` |

### A.4 视图与模式

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 模式切换（正向） | `Ctrl+\` | `⌘\` |
| 模式切换（反向） | `Ctrl+Shift+\` | `⌘⇧\` |
| 切换到 Typora 模式 | `Ctrl+Alt+T` | `⌘⌥T` |
| 切换到 Source 模式 | `Ctrl+Alt+S` | `⌘⌥S` |
| 切换到 Preview 模式 | `Ctrl+Alt+P` | `⌘⌥P` |
| 纸张宽度循环 | `Ctrl+=` | `⌘=` |
| 纸张宽度反向 | `Ctrl+-` | `⌘-` |
| 专注写作模式 | `F11` | `⌃⌘F` |
| 显示/隐藏文件管理器 | `Ctrl+Shift+F` | `⌘⇧F` |
| 切换全屏 | `Alt+Enter` | `⌃⌘F` |
| 切换分屏 | `Ctrl+Alt+\\` | `⌘⌥\\` |
| 放大字体 | `Ctrl+Shift+=` | `⌘⇧=` |
| 缩小字体 | `Ctrl+Shift+-` | `⌘⇧-` |
| 重置字体 | `Ctrl+Shift+0` | `⌘⇧0` |
| 切换主题 [chord] | `Ctrl+K Ctrl+T` | `⌘K ⌘T` |

### A.5 导航

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 跳到行首 | `Home` | `⌘←` |
| 跳到行尾 | `End` | `⌘→` |
| 跳到文档头 | `Ctrl+Home` | `⌘↑` |
| 跳到文档尾 | `Ctrl+End` | `⌘↓` |
| 按词向前 | `Ctrl+Right` | `⌥→` |
| 按词向后 | `Ctrl+Left` | `⌥←` |
| 向上滚屏 | `PageUp` | `PageUp` |
| 向下滚屏 | `PageDown` | `PageDown` |
| 跳转到段落/行号 | `Ctrl+G` | `⌘G` |
| 查找下一个 | `F3` | `⌘G` |
| 查找上一个 | `Shift+F3` | `⌘⇧G` |
| 后退（光标历史） | `Alt+Left` | `⌘[` |
| 前进（光标历史） | `Alt+Right` | `⌘]` |
| 焦点进入编辑器 | `Ctrl+E` | `⌘E` |

### A.6 搜索与替换

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 打开查找面板 | `Ctrl+F` | `⌘F` |
| 打开替换面板 | `Ctrl+H` | `⌘H` 改为 `⌘⌥H`（macOS）|
| 查找下一个 | `F3` / `Ctrl+G` | `⌘G` |
| 查找上一个 | `Shift+F3` / `Ctrl+Shift+G` | `⌘⇧G` |
| 替换当前 | `Alt+R` | `⌥R` |
| 替换全部 | `Alt+A` | `⌥A` |
| 切换正则模式 | `Alt+Ctrl+R` | `⌥⌘R` |
| 切换大小写敏感 | `Alt+Ctrl+C` | `⌥⌘C` |
| 切换全词匹配 | `Alt+Ctrl+W` | `⌥⌘W` |
| 全局搜索（跨文档） | `Ctrl+Shift+F` | `⌘⇧F` |

### A.7 特殊元素插入

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 插入/编辑链接 [chord] | `Ctrl+K Ctrl+K` | `⌘K ⌘K` |
| 快速链接（有选区） | `Ctrl+K` | `⌘K` |
| 插入图片 | `Ctrl+Alt+I` | `⌘⌥I` |
| 插入表格 | `Ctrl+Alt+Shift+T` | `⌘⌥⇧T` |
| 插入代码块 | `Ctrl+Alt+C` | `⌘⌥C` |
| 插入行内公式 | `Ctrl+M` | `⌘M` |
| 插入块级公式 | `Ctrl+Alt+M` | `⌘⌥M` |
| 插入 Mermaid 图表 | `Ctrl+Alt+D` | `⌘⌥D` |
| 插入 Callout 块 | `Ctrl+Alt+L` | `⌘⌥L` |
| 插入折叠块 | `Ctrl+Alt+E` | `⌘⌥E` |
| 插入水平分割线 | `Ctrl+Alt+-` | `⌘⌥-` |
| 插入脚注 | `Ctrl+Alt+F` | `⌘⌥F` |
| 插入 Snippet | `Ctrl+Alt+Y` | `⌘⌥Y` |
| 插入 TOC | `Ctrl+Alt+O` | `⌘⌥O` |
| 插入日期时间戳 | `Alt+D` | `⌥D` |

### A.8 应用与系统

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 打开 Settings | `Ctrl+,` | `⌘,` |
| CommandPalette | `Ctrl+K` | `⌘K` |
| 帮助面板 | `F1` | `F1` |
| 快捷键设置 [chord] | `Ctrl+K Ctrl+S` | `⌘K ⌘S` |
| 最近文件 [chord] | `Ctrl+K Ctrl+R` | `⌘K ⌘R` |
| 开发者面板 | `Ctrl+Shift+Alt+D` | `⌘⇧⌥D` |
| 诊断日志 | `Ctrl+Shift+Alt+L` | `⌘⇧⌥L` |
| 退出 InkForge | `Ctrl+Q` | `⌘Q` |

### A.9 写作辅助

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 触发斜杠命令 | `/` | `/` |
| AI 辅助写作面板 | `Ctrl+Space` | `⌘Space` |
| AI 续写 | `Ctrl+Shift+Space` | `⌘⇧Space` |
| 接受 AI 建议 | `Tab` | `Tab` |
| 拒绝 AI 建议 | `Escape` | `⎋` |
| 切换拼写检查 | `F7` | `F7` |
| 接受拼写建议 1-5 | `Alt+1`~`Alt+5` | `⌥1`~`⌥5` |
| 忽略拼写错误 | `Alt+I` | `⌥I` |
| 专注写作模式 | `F11` | `⌃⌘F` |

### A.10 评论与审阅

| 操作 | Windows/Linux | macOS |
|------|--------------|-------|
| 插入评论 | `Ctrl+Alt+N` | `⌘⌥N` |
| 打开评论面板 | `Ctrl+Alt+R` | `⌘⌥R` |
| 解决当前评论 | `Ctrl+Alt+Shift+R` | `⌘⌥⇧R` |
| 跳到下一条评论 | `Ctrl+Alt+Down` | `⌘⌥↓` |
| 跳到上一条评论 | `Ctrl+Alt+Up` | `⌘⌥↑` |
| 接受当前修订 | `Ctrl+Alt+A` | `⌘⌥A` |
| 拒绝当前修订 | `Ctrl+Alt+J` | `⌘⌥J` |
| 接受所有修订 | `Ctrl+Alt+Shift+A` | `⌘⌥⇧A` |
| 拒绝所有修订 | `Ctrl+Alt+Shift+J` | `⌘⌥⇧J` |
| 切换 Track Changes | `Ctrl+Alt+K` | `⌘⌥K` |

---

## 权威来源登记表

| 条目 | 权威类型 | 权威文件 | 决策 ID |
|------|---------|---------|---------|
| 全量快捷键表（§3） | 文档 | 本文档 §3 + 附录 A | — |
| FindReplace 快捷键 | 文档 | 本文档 §3.6 | T03-01=C, T03-02=A |
| 热更新（§9.6） | 文档 | 本文档 §9 | T03-03=A |
| 冲突检测（§5.3, §6） | 文档 | 本文档 §5.3 + §6 | T03-04=A |
| Chord 多段组合（§6.5, §9.4） | 文档 | 本文档 §6.5 + §9.4 | T03-10=D |
| Tab 上下文感知 | 文档 | 49-editor-keymap-spec §2 | T03-07=C |
| IME 合成期策略（§2.4 E-6） | 文档 | 本文档 §2.4 | T03-08=B |
| 作用域模型（§2） | 文档 | 本文档 §2 | T03-09=A |
| 帮助面板（§5.1） | 文档 | 本文档 §5.1 | T03-12=C |
| Ctrl+N 全局新建 | 文档 | 本文档 §3.1 | S-04 |
| StatusBar 失败提示 | 文档 | 14-statusbar-navigation-spec | T03-13=B |
| CommandPalette 协同 | 文档 | 22-command-palette-spec | EX-03 |
| 命令系统四类分离 | 文档 | 本文档 §9.3 + commandRegistry | L1-27=D |
| 快捷键职责分工 | 文档 | 本文档 §1.3 | L1-29=A |
| Ctrl+\ 专职模式切换 | 文档 | 本文档 §3.4 | T03-06=C |
| 预设方案（§4） | 文档 | 本文档 §4 | — |
| 持久化 IndexedDB（§9.5） | 文档 | 本文档 §9.5 | — |
| 列表 Enter 减缩 | 文档 | 49-editor-keymap-spec §1 | E-01=B |
| 多光标 Ctrl+D | 文档 | 49-editor-keymap-spec §4 | E-06=B |
| 撤销逻辑分组 | 文档 | 49-editor-keymap-spec §3 | E-10=B |

---

**文档完**
