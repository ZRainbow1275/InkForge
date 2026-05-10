# InkForge v2.1 决策文档 Part 3b —— Tauri 桌面端 / 视觉系统 / 布局导航 / 崩溃恢复

> **合成目标**: 将 L1 + L2（G/T01-T09/X/S）+ 增强问卷（L1-41~60、F、E、W、N、P、M、R、EX）中关于 **Tauri 桌面能力、视觉系统、StatusBar/TabBar/Workstation 布局、崩溃恢复与诊断** 四大域的决策规范化，给出硬约束与落地点。
> **编制日期**: 2026-04-20
> **作者**: synth-part3b
> **覆盖**: 域 Q（Tauri）12 决策 + 域 R（视觉）14 决策 + 域 S（布局导航）14 决策 + 域 T（崩溃恢复）10 决策 = 50 决策
> **前置铁律**: 所有决策继承 L1 15 条铁律，其中第 3/4/7/15 条（零空壳、纸张气质、自动保存可见、SLO 硬指标）对本文四域影响最大。

---

## 文档阅读路线

本文件 4 大域各自独立章节，顺序如下：

1. **域 Q | Tauri 桌面端能力**（12 决策）：多窗口、文件系统桥接、系统托盘 / 全局快捷键、自动更新、运行环境矩阵
2. **域 R | 视觉系统（字体 / 主题 / 排版 / 动画 / 焦点）**（14 决策）：Ethereal Constructivism 冻结项、ThemeEngine 双轨、FontSystem、Typography、动画分级、Z-index、滚动条、暗色、密度、骨架屏、触控取舍、视觉一致性审查
3. **域 S | StatusBar / TabBar / Workstation 布局 / 导航**（14 决策）：StatusBar 字段集与交互、TabBar 增强、修改指示、面包屑、Toast、左栏三合一（FileManager/TOC/VersionHistory）、右栏模式切换器、分屏对比、布局记忆、同步滚动、最大化与专注叠加
4. **域 T | 崩溃恢复与诊断**（10 决策）：CrashRecovery 全链路、DataIntegrity、ErrorBoundary + SafeMode、DevPanel、DiagnosticPackage、ActivityLogger、ExtensionHealth、自动保存失败兜底

冲突裁决集中在**末尾第 6 章**。

---

# 域 Q | Tauri 桌面端能力

Tauri 是 InkForge v2.1 的**唯一生产发布形态**（G-06 B + G-12 A）。Web 端只服务于本地 `pnpm dev` 调试，不承担任何生产兜底责任。因此"文件系统 / 剪贴板 / 全局快捷键 / 系统菜单 / 导入导出"五大能力完全归属 Tauri 独占路径，无须为 Web 降级。

## 决策 Q-01 | 多窗口架构

- **来源题**: L1-53（C）
- **用户选择**: C —— 多窗口 + 跨窗口标签拖拽
- **规范化结论**:
  - 每个 Tauri 窗口承载**独立的 Vue Root + 独立 Pinia Store 实例**；窗口之间**共享 IndexedDB**（同一数据库，按 profileId 分 namespace）。
  - 跨窗口**通过 Tauri IPC 事件总线**协调"标签迁移 / 同步选区 / 共享剪贴板缓存"；不允许直接操作别窗口的 DOM。
  - 标签（TabBar 的 Tab 对象）迁移时，**源窗口释放 Tab + 目标窗口重建 Editor 实例**（通过 HTML5 DataTransfer + 自定义 MIME `application/x-inkforge-tab` 承载 `{tabId, articleId, profileId}`）。
  - 不保留"唯一主窗口"概念，任何窗口都可独立退出应用，最后一个窗口关闭触发全局优雅退出。
- **硬约束**:
  - 同一 Article 在多个窗口同时打开时，**最后一次 save 胜出**，但必须提示"另一窗口正在编辑此文档"，并在 DirtyStateTracking 中标记冲突（见 N-05）。
  - 多账户（L1-24 D）通过**不同窗口承载不同 profile** 实现并行，profile 切换不影响其他窗口。
- **落地点**:
  - `spec/18-tauri-desktop-spec.md`（新）
  - `src-tauri/src/windows.rs`（窗口管理器）
  - `src/platform/ipc.ts`（IPC 事件总线抽象）
  - `src/stores/tabs.ts` 支持 `windowId` 属性
- **关联**: S-04（跨窗口 TabBar 拖拽）、T06（账户切换等同切 Profile）、T-02（DataIntegrity 要求窗口间共享校验状态）

## 决策 Q-02 | 运行环境能力矩阵

- **来源题**: G-06（B）、G-12（A）
- **用户选择**: G-06 B / G-12 A
- **规范化结论**:
  - 生产发布形态：**仅 Tauri 桌面端**；Web 端不做生产支持。
  - Web 端（`pnpm dev` 浏览器预览）的职责：**纯 UI / Store / 编辑器扩展的快速迭代调试**；Tauri 独占能力在 Web 下 gracefully no-op（不抛错，但按钮/功能入口禁用）。
  - 以下能力**必须走 Tauri 原生实现**，禁止保留"Web 版降级"分支：
    1. 文件系统读写（`@tauri-apps/plugin-fs`）
    2. 剪贴板完整 MIME 支持（`@tauri-apps/plugin-clipboard-manager`）
    3. 全局快捷键（`@tauri-apps/plugin-global-shortcut`）
    4. 系统托盘（`@tauri-apps/api/tray`）
    5. 多窗口管理（`@tauri-apps/api/window`）
    6. OS 级认证（Windows Hello / Touch ID，对应 T06-09 D）
    7. 文件拖放到窗口（`onFileDrop` 事件）
- **硬约束**:
  - `src/platform/` 下**必须存在 `tauriOnly(fn)` 装饰器**：Web 环境下自动替换为 `() => { console.warn(...) }` 或抛可识别的 `EnvironmentUnsupportedError`。
  - 任何 Tauri-only 模块**不允许在 Web 端崩溃整个应用**；Tauri 检测通过 `window.__TAURI_INTERNALS__` 的存在与否完成。
- **落地点**:
  - `src/platform/environment.ts`（`isTauri()` / `isWebDev()` / `tauriOnly()`）
  - `src/platform/clipboard.ts`、`src/platform/fs.ts`、`src/platform/globalShortcut.ts`、`src/platform/tray.ts`（各抽象层）
- **关联**: 所有 Task 的 Web 调试态；T06-09（高危操作平台认证）

## 决策 Q-03 | 本地文件系统集成深度

- **来源题**: L1-54（D）、EX-02（v2.1 实现 Wikilink）
- **用户选择**: L1-54 D —— 打开本地 .md / 监控文件夹 / 外部编辑 + 冲突检测 + 补充"必须支持打开本地 .md / 监控文件夹"
- **规范化结论**:
  - **IndexedDB 是 primary**，本地文件系统是 **derived**（镜像）。用户打开/监控的本地 .md 文件在首次导入时**复制到 IndexedDB**，同时在 `articles` 表记录 `localPath`、`localSyncEnabled`、`localFsHashLastSeen` 三个字段。
  - **监控文件夹模式**：用户在 Settings 中添加一个或多个受监控目录，使用 `@tauri-apps/plugin-fs` 的 `watch` API + 内部 debounce 500ms 去抖。
  - **冲突策略**（外部编辑被检测到）：
    1. 应用内文档未 dirty：**自动拉取外部变更**，StatusBar 提示"外部已更新"。
    2. 应用内文档 dirty：**强制进入 diff/merge 视图**（复用 L1-18 D 的 diff/merge 基础设施），让用户选择：丢弃本地 / 丢弃远端 / 三方合并 / 另存为新文档。
  - **双向同步时机**：
    - IndexedDB → 本地：每次自动保存成功且 `localSyncEnabled=true` 时，异步 debounce 1s 写文件。
    - 本地 → IndexedDB：fs watcher 触发时，先校验 `sha256 !== localFsHashLastSeen` 再进入冲突流程。
- **硬约束**:
  - **文章不能丢**（X-11 底线）：任何本地覆盖前必须先生成 IndexedDB 快照 version-point（复用 X-07 无限版本）。
  - 用户关闭"监控文件夹"后，已导入的 Article 保留但 `localSyncEnabled=false`，`localPath` 字段保留以便后续重新启用。
  - 禁止在 fs watcher 事件中直接写 IndexedDB；必须走统一的 `TauriFileBridge.applyExternalChange()` 入口，内部会触发完整性校验（见 T-02）。
- **落地点**:
  - `spec/18-tauri-desktop-spec.md` 的 "FileBridge" 章节
  - `src/services/tauri-file-bridge/`（watcher / conflict-resolver / hash-cache）
  - `src/db/schema.ts` 的 `articles` 表新增三字段
  - `src/views/settings/SyncSettingsTab.vue` 暴露"监控文件夹"列表
- **关联**: T07-02（Sync 走 Git）、L1-22（三方合并冲突策略）、X-07（版本历史）、X-11（灾难恢复底线）

## 决策 Q-04 | 系统托盘与全局快捷键

- **来源题**: L1-55（C）、EX-01（Scratch Pad v2.1）、F-05（D 多入口草稿）
- **用户选择**: L1-55 C —— 托盘 + 右键菜单 + 全局快捷键快速笔记
- **规范化结论**:
  - 系统托盘默认**随应用启动**（Settings 中可关闭）；托盘右键菜单项：
    1. 打开最近文档（子菜单，最多 5 项）
    2. 新建快速笔记（触发 QuickNoteWindow）
    3. 显示主窗口
    4. 退出
  - **全局快捷键**：`Ctrl+Alt+N`（Windows/Linux）/ `Cmd+Alt+N`（macOS）默认绑定"唤起 QuickNoteWindow"；用户可在 Settings > Shortcuts 中修改。
  - **QuickNoteWindow 规格**：
    - 独立 Tauri 子窗口，尺寸 480×360，无菜单栏，置顶显示。
    - 内容是一个**极简编辑器**（无 FloatingToolbar、无 StatusBar，只有字数计数 + 保存按钮）。
    - 保存后**自动归入"草稿箱（Drafts）"特殊分类**（与 F-05 D 的草稿独立空间一致），状态为 `draft`（对应 L1-41 状态机）。
    - Esc 关闭，内容未保存时弹出"保留草稿 / 丢弃"确认。
- **硬约束**:
  - QuickNoteWindow 不得影响主窗口的编辑上下文；两者通过 IPC 事件 `quick-note:saved` 通知主窗口刷新草稿列表。
  - 不做"系统分享"和"开机自启动"（L1-55 C 明确排除 D）。
- **落地点**:
  - `src/views/QuickNote.vue`（新子窗口根）
  - `src-tauri/src/tray.rs`、`src-tauri/src/global_shortcut.rs`
  - `spec/18-tauri-desktop-spec.md` 的 "SystemIntegration" 章节
- **关联**: S-04（Ctrl+N 全局新建）、F-05（草稿箱多入口）、EX-01（Scratch Pad）

## 决策 Q-05 | 自动更新策略

- **来源题**: L1-56（B）
- **用户选择**: B —— 仅检查通知
- **规范化结论**:
  - **不做后台自动下载、不做自动安装**。
  - 启动后延迟 30s 检查更新（通过 `@tauri-apps/plugin-updater`），命中新版本时在 Toast 区展示一次通知（含"查看详情 / 稍后提醒 / 忽略此版本"三选项）。
  - 若用户"忽略此版本"，记录到 localStorage 的 `updater.ignoredVersion`，本版本号不再通知。
  - 用户也可在 Settings > About 中手动"检查更新"。
- **硬约束**:
  - 检查请求必须可被网络故障静默吞掉，**不允许报 toast 错误**。
  - 不做"跳过非关键版本"等复杂策略。
- **落地点**:
  - `src/services/updater/`
  - `src/views/settings/AboutTab.vue`
- **关联**: 无

## 决策 Q-06 | 一项目一文件夹物理模型（与素材管理协同）

- **来源题**: F-04（C + 补充）、L1-54（D）
- **规范化结论**:
  - 当用户启用"本地文件系统同步"时，每个 InkForge "Project"（可视为分类根目录）映射到本地磁盘的**一个文件夹**；该文件夹结构：
    ```
    <ProjectRoot>/
      articles/
        <article-slug>.md
      assets/
        <hash-prefix>/<hash>.<ext>
      .inkforge/
        manifest.json          # 项目元数据（id, name, schema version）
        templates/             # 项目级模板（可选）
    ```
  - 素材文件使用 **content-hash 命名**（SHA-256 前 16 位作为目录分片），实现 F-04 D 的去重诉求；但**对用户呈现原始文件名**（存储于 IndexedDB 的 `assets.originalName`）。
  - 孤儿素材检测（F-04 D）：定期扫描 `assets.refCount === 0` 的记录，在 DataInsights 展示"可清理素材 X 个，占用 Y MB"。
- **硬约束**:
  - 导出到微信 / 知乎 / 小红书时，图片必须能够**从本地绝对路径重新载入**生成 base64 或上传链接（与 T05-03 D Tauri 文件系统策略一致）。
  - 用户不启用本地同步时，仍使用 IndexedDB Blob（asset pipeline 的存储后端差异对调用方透明）。
- **落地点**:
  - `src/services/asset-store/`（storage-backend 抽象）
  - `src/services/tauri-file-bridge/project-layout.ts`
- **关联**: T05-03 D（图片存储 Tauri fs）、T05-11 D（asset pipeline）、T08-09 D（统计可信与孤儿检测）

## 决策 Q-07 | 原生菜单栏取舍

- **来源题**: S-07（C）
- **用户选择**: C —— 不需要 Tauri 原生菜单
- **规范化结论**: `src-tauri/tauri.conf.json` 中 `app.windows[].menu` 保持空或禁用；所有应用菜单（File / Edit / View / Window / Help）在 Vue 层实现为自定义组件。
- **硬约束**: 必须保证 OS 级标准快捷键（如 macOS `Cmd+Q`、Windows `Alt+F4`）仍能工作；Vue 层实现菜单时不得拦截这些全局关闭行为。
- **落地点**: `src-tauri/tauri.conf.json`；`src/components/menu/AppMenuBar.vue`（可选，嵌入到窗口标题栏）
- **关联**: Q-02（仅 Tauri 路径保留）

## 决策 Q-08 | 文件拖放与粘贴入口

- **来源题**: T05-11（D）、E-09（D 图片交互）
- **规范化结论**:
  - 窗口级文件拖入：监听 Tauri `tauri://file-drop` 事件，转交 `assetPipeline.ingestFiles(paths)`。
  - 编辑器内粘贴：TipTap `handlePaste` + `handleDrop` 钩子全部接入 `assetPipeline.ingestClipboard(data)`。
  - 所有入口共用**同一清洗 / 去重 / 命名 / 阈值**管线（T05-11 D）。
- **硬约束**: 拖入的 .md / .docx 文件触发"导入向导"（S-08 + S-13 D）而非 asset 入库；必须通过 MIME 类型分流。
- **落地点**: `src/services/asset-pipeline/`；`src-tauri/src/file_drop.rs`
- **关联**: T05-11（统一 pipeline）、S-08（导入格式）

## 决策 Q-09 | 平台认证集成（OS 级）

- **来源题**: T06-09（D）、EX-07（自定义 CSS 风险）
- **规范化结论**:
  - Windows 集成 **Windows Hello**（通过 `windows-rs` 的 `UserConsentVerifier`）；macOS 集成 **Touch ID / Apple Watch**（通过 `LocalAuthentication.framework`）。
  - 高危操作清单（要求平台认证或本地密码）：
    1. 删除文章（单篇 / 批量）
    2. 删除账户（T06-04 双重确认之后再加一层认证）
    3. 查看"敏感设置"（含 AI Token、Git 凭据、自定义 CSS/JS 注入源码编辑）
    4. 导出全量账户数据
    5. 清空回收站（批量硬删除）
  - 用户可在 Settings > Security 中为不同账户配置不同保护级别（无 / 密码 / Hello）。
- **硬约束**:
  - 认证失败超过 5 次/分钟时，**锁定对应操作 10 分钟**并写审计。
  - 平台认证不可用时（如 Hello 未配置）自动降级为密码认证。
- **落地点**:
  - `src-tauri/src/auth/platform.rs`（Windows Hello / Touch ID 绑定）
  - `src/services/auth/local-auth.ts`（密码派生：PBKDF2 + scrypt）
  - `src/services/auth/permission-gate.ts`（命令注册表 `requiresAuth` 元字段消费者）
- **关联**: T05-09（命令注册表含权限字段）、T06-04（删除账户）

## 决策 Q-10 | 自定义 CSS/JS 注入的沙箱

- **来源题**: EX-07（v2.1 实现）、T07-04（B+C 高级设置）、R-04（D 错误边界）
- **规范化结论**:
  - 自定义 CSS 注入：**允许**，作用域**限定为 `.editor-content` 容器及其子元素**；禁止影响应用 chrome（工具栏 / StatusBar）以防用户写挂界面无法恢复。
  - 自定义 JS 注入：**默认不开放**；仅在 Settings > Advanced > Developer Mode 开启且连续二次确认后可用；注入脚本在 iframe sandbox 中执行，仅能通过 `postMessage` 与主进程通信。
  - 所有自定义 CSS / JS 必须受 ErrorBoundary 监控（T-03）：**出错超过 3 次 / 分钟自动停用并提示用户**。
- **硬约束**:
  - SafeMode 启动（T-03）时**自动跳过所有自定义 CSS/JS**。
  - 用户 CSS 中禁止出现 `@import url()` 外部资源、`behavior:`、`javascript:` 协议（通过 PostCSS 静态检查）。
- **落地点**:
  - `src/services/custom-style/css-sanitizer.ts`
  - `src/views/settings/CustomCSSEditor.vue`（带 CodeMirror）
  - `src/services/extension-host/sandbox-iframe.ts`
- **关联**: T-03（SafeMode）、L1-58（主题引擎独立于自定义 CSS）

## 决策 Q-11 | 打印功能取舍

- **来源题**: S-10（A）
- **用户选择**: A —— 不需要
- **规范化结论**: v2.1 **不实现**打印能力；不拦截浏览器/系统默认 `Ctrl+P`（打印当前 WebView 内容），但不提供专属打印样式。
- **硬约束**: 禁止投入资源在 `@media print` 样式表上。
- **落地点**: 无
- **关联**: P-05（v2.1 不做 PDF 导出）

## 决策 Q-12 | 深度链接（Deep Link）

- **来源题**: EX-09（v2.2 考虑）
- **用户选择**: v2.2 延后
- **规范化结论**: v2.1 **不实现** `inkforge://` URL scheme；但需在 `src-tauri/tauri.conf.json` 中**预留 scheme 注册位**（写入但 `disabled: true`），确保 v2.2 可快速启用不需用户重新授权。
- **硬约束**: 不得在 v2.1 出现任何 `inkforge://` 外部链接 / 二维码 / 分享入口。
- **落地点**: `src-tauri/tauri.conf.json`（预留）
- **关联**: 无

---

# 域 R | 视觉系统（字体 / 主题 / 排版 / 动画 / 焦点）

视觉系统是 InkForge 的**品牌灵魂**。L1-12 B + L1-39 A 共同确立"Typora/iA Writer 式纸张气质"；L1-49 B+C、L1-58 D、L1-57 D、L1-60 D 将视觉能力推向**最深度可定制但默认极简**的双端态。T09-13 D 把一致性审查拉到最严（含"严禁 emoji"）。

## 决策 R-01 | Ethereal Constructivism 视觉冻结项

- **来源题**: L1-12（B + 补充）、L1-39（A）、T09-01（A 暗色全覆盖）、T09-13（D 设计语汇映射）
- **用户选择**: L1-12 B + L1-39 A + T09-13 D + 补充"严禁 emoji"
- **规范化结论**:
  - **不可破坏**（视觉冻结）：
    1. 纸张居中 + 4 档宽度
    2. 主色：品牌红 `#D32F2F`；中性灰阶主序列
    3. 行距、正文字号基调、字体基调
    4. 安静氛围（无频繁弹窗、无强制引导）
    5. **严禁 emoji**（T09-13 用户补充）
    6. **Notion 化块编辑风格禁止**（如块级 `+` 悬浮按钮的强视觉侵扰）
  - **允许灵活**：
    1. 工具栏密度（L1-12 补充"过重 / 简化"双档）
    2. 动效（L1-12 补充"动效是欢迎的"，但受 T09-09 D 环境自动降级）
    3. 用户自定义主题（L1-58 D）
    4. 用户自定义字体（L1-57 D）
- **硬约束**:
  - 任何新组件必须映射到**已有设计语汇**（Ethereal Constructivism 字典），**不允许引入孤立风格**。
  - 暗色模式覆盖 100%（T09-01 A），组件不得硬编码色值，统一用 `var(--color-*)` token。
  - Code Review checklist 必查项："是否引入了 emoji？是否有新色值硬编码？是否偏 Notion 块编辑？"
- **落地点**:
  - `spec/19-design-language.md`（Ethereal Constructivism 字典）
  - `src/styles/tokens/`（color / spacing / typography tokens）
  - `src/styles/theme-light.css` / `theme-dark.css`（100% 覆盖）
  - `.eslintrc` 自定义规则：禁止 color hex 裸值、禁止 `<span>😀</span>` 等 emoji 字面量
- **关联**: R-06（动画分级）、R-10（密度策略）、T09-13（一致性审查）

## 决策 R-02 | ThemeEngine 双轨主题

- **来源题**: L1-58（D）、L1-49（B+C 写作配色）、L1-59（C 分层过渡）
- **用户选择**: L1-58 D + "编辑器内容区主题与应用 UI 主题允许独立"
- **规范化结论**:
  - **双轨主题系统**：
    - **AppChromeTheme**（应用主题）：工具栏、侧栏、StatusBar、Hub、Settings 等 "chrome" 区域的配色。
    - **EditorContentTheme**（写作主题）：纸张背景、正文色、标题色、代码块背景、引用色、链接色。
  - 两轨**可独立切换**：例如"应用深色 + 写作羊皮纸色"、"应用浅灰 + 写作暗夜模式"。
  - 每轨提供：
    1. 内置预设（至少 Light / Dark / Sepia / Solarized-Light / Solarized-Dark 5 套）
    2. 完整自定义编辑器（所有 CSS 变量可调）
    3. 导入 / 导出 JSON
  - **切换过渡**（L1-59 C）：
    - 全局淡入淡出 200ms
    - **分层过渡**：纸张区域与工具栏各自独立的 CSS 变换持续时间（纸张 300ms，chrome 150ms），形成视觉层次。
  - **不做跟随系统**（L1-59 未选 D），但 Settings 中提供"启动时跟随系统"一次性推荐，默认关闭。
- **硬约束**:
  - EditorContentTheme 切换**不得影响**浮动工具栏、模态对话框等 overlay 组件。
  - 主题切换过渡期间**禁止触发**动画（防止叠加动效卡顿）。
  - 所有组件必须在 Light + Dark × App + Editor 四组组合下验收。
- **落地点**:
  - `spec/20-theme-engine.md`
  - `src/services/theme-engine/`（preset-loader / css-var-applier / transition-orchestrator）
  - `src/views/settings/ThemeEditor.vue`（双轨独立编辑面板）
  - `src/styles/themes/`（预设目录）
- **关联**: L1-49（WritingAmbience）、R-01（冻结项不得被主题破坏）、R-03（字体配合主题）

## 决策 R-03 | FontSystem 字体系统

- **来源题**: L1-57（D）
- **用户选择**: D + "以开源字体为核心，商业字体非用户导入一律不使用"
- **规范化结论**:
  - **中英文字体独立配置**，每轨（正文 / 标题 / 代码 / UI）4 类 × 2 语种 = 8 个可独立设置的字段。
  - 内置字体 **全部开源**，候选清单（需许可证实 OFL / Apache 2.0）：
    - 中文正文：**思源宋体 / 思源黑体 / 霞鹜文楷**（Source Han Serif/Sans / LXGW WenKai）
    - 中文标题：**霞鹜新晰黑 / 思源黑体 Heavy**
    - 英文正文：**Source Serif Pro / Inter / iA Writer Duo（已开源）**
    - 英文标题：**Inter Tight / Playfair Display**
    - 代码：**JetBrains Mono / Fira Code / Source Code Pro**
  - **自定义字体导入**（Tauri 独占）：用户选择本地 .ttf / .otf / .woff2 文件，InkForge 复制到 app data 目录 `fonts/user/`，内部通过 `@font-face` 注入。
  - **许可检查**：导入时 `opentype.js` 读取字体的 license / licenseUrl name table 字段；无法确定或明确非商用的字体在导入对话框中**显著警告**，但仍允许导入（用户承担法律责任）。
- **硬约束**:
  - 内置字体打包选择：默认只打包**思源宋体 / Inter / JetBrains Mono** 三款小体积子集（约 2MB CJK 基本字 + 拉丁字符）；其他内置字体走**按需下载**（首次启用时从 CDN 或本地仓库下载到 `fonts/builtin/`，失败时回退思源）。
  - 用户自导入字体**不允许商用打包分发**；应用界面永不显示未验证许可的字体作为默认值。
- **落地点**:
  - `spec/21-font-system.md`
  - `src/services/font-system/loader.ts`（builtin + user 字体加载器）
  - `src/services/font-system/license-checker.ts`
  - `src/views/settings/FontSettings.vue`
- **关联**: R-04（Typography 排版）、R-02（主题可引用字体变量）

## 决策 R-04 | Typography 排版系统

- **来源题**: L1-60（D）
- **用户选择**: D —— 完整 Typography 面板
- **规范化结论**:
  - Typography 面板控制字段：
    1. 字号：正文 / h1~h6 各自独立（默认值走 Modular Scale 1.25）
    2. 行距：正文 / 标题 / 代码块各自（默认 1.7 / 1.3 / 1.5）
    3. 段间距：`margin-top` 正文段落（默认 0.75em）
    4. 首行缩进：中文 2em / 英文 0（可独立切换）
    5. 字间距（letter-spacing）：正文 / 标题
    6. 中英文混排间距：使用 `pangu-spacing` 或 CSS `word-spacing`，与 E-02 智能标点联动
    7. 引用块样式：背景 / 左边框粗细 / 颜色
    8. 代码块样式：背景 / 内边距 / 行高
  - Typography 配置**可作为 EditorContentTheme 的一部分导出**（打包进 `.inkforge-theme.json`）。
- **硬约束**:
  - 调整不得让正文字号小于 **13px** 或大于 **24px**（防止极端配置破坏纸张感）。
  - 行距不得小于 **1.4**。
- **落地点**:
  - `spec/22-typography.md`
  - `src/views/settings/TypographyPanel.vue`
  - `src/styles/typography.css`（基于 CSS 变量）
- **关联**: R-02（主题导出含 Typography）、R-03（字体作为 Typography 一部分）、L1-12（纸张气质冻结）

## 决策 R-05 | 焦点指示器（Focus Ring）

- **来源题**: T09-07（B）
- **用户选择**: B —— 品牌红 2px outline + 2px offset
- **规范化结论**:
  - 全局 `:focus-visible`：`outline: 2px solid var(--color-brand-red); outline-offset: 2px;`
  - 特殊场景（圆形头像、按钮等）使用 `box-shadow: 0 0 0 3px var(--color-brand-red-a20)` 模拟发光。
  - 不做触控优化（T09-12 A）。
- **硬约束**: 所有交互组件必须支持键盘焦点；禁止使用 `outline: none` 而无替代样式。
- **落地点**: `src/styles/focus.css`
- **关联**: G-09（不做无障碍专项，但键盘焦点是底线）

## 决策 R-06 | 动画系统分级与自动降级

- **来源题**: T09-09（D）、T09-02（A 全套）、T09-03（A 宽度过渡）、T01-03（A 无动画语法标记）
- **用户选择**: T09-09 D + "性能环境不足统一降级"
- **规范化结论**:
  - 动画按类别分 5 档：
    1. **critical**：数据保存指示、错误提示（永不降级）
    2. **navigation**：页面切换（slide / fade，T09-02 A）
    3. **feedback**：按钮点击、hover、主题切换（T09-03 A 宽度过渡）
    4. **ambient**：光标跟随、背景纹理、完成奖励动画（L1-45 C 补充）
    5. **decorative**：花哨修饰（纯粹悦目的）
  - 全局动画等级通过 `document.documentElement.dataset.animationLevel` 切换：`full | standard | reduced | none`；CSS 中用 `[data-animation-level="reduced"] .ambient-anim { animation: none }` 关闭对应级别。
  - **自动降级触发条件**（任一命中降一级）：
    1. `navigator.connection.saveData === true`
    2. `matchMedia('(prefers-reduced-motion: reduce)').matches`
    3. 最近 5 秒内 FPS < 45（通过 `requestAnimationFrame` 采样）
    4. CPU 占用 > 80%（通过性能观察 API）
- **硬约束**:
  - 语法标记显隐（T01-03 A）、IME 组合期间（T01-16 C）**永不使用动画**。
  - 模式切换 Toast（T01-13 D）即使在 `none` 级别也保留（属 critical 类）。
- **落地点**:
  - `src/composables/useAnimationLevel.ts`
  - `src/services/performance-monitor/fps-sampler.ts`
  - 全局 CSS 以 `[data-animation-level]` 为 prefix 分组
- **关联**: X-05（Lighthouse>80 性能硬指标）、T09-02（页面切换动画）

## 决策 R-07 | Z-index 标准化

- **来源题**: T09-05（B）
- **用户选择**: B —— 固定数值
- **规范化结论**:
  - Z-index 固定分层（写入 `src/styles/z-index.css` 或 TypeScript 常量）：
    ```
    --z-base: 0
    --z-sticky: 50         // 纸张顶部 StickyTitle
    --z-dropdown: 100      // 常规下拉菜单
    --z-floating-toolbar: 200
    --z-context-menu: 250
    --z-modal: 300
    --z-popover: 350       // 链接 popover、F-06 文档属性面板
    --z-toast: 400
    --z-overlay: 500       // 全屏遮罩（对话框背景）
    --z-debug: 9000        // DevPanel 永远在最顶
    ```
- **硬约束**: 禁止使用 >500 的数值（除 Debug）；禁止 `z-index: 9999` 类魔法数字。
- **落地点**: `src/styles/z-index.css`
- **关联**: T03-02（FindReplace 与 FloatingToolbar 层级冲突）

## 决策 R-08 | 滚动条样式

- **来源题**: T09-06（B）
- **用户选择**: B —— 6px / hover 8px 细滚动条
- **规范化结论**:
  - WebKit：`::-webkit-scrollbar { width: 6px; }`；hover 态 `width: 8px`。
  - Firefox：`scrollbar-width: thin`；`scrollbar-color: var(--color-scrollbar-thumb) transparent`。
  - 滚动条拇指色 = 中性灰 40% 透明度；hover 时增加到 60%。
- **硬约束**: **编辑器正文区滚动条走自定义样式**；系统对话框 / 原生控件保持默认。
- **落地点**: `src/styles/scrollbar.css`
- **关联**: 无

## 决策 R-09 | 暗色模式覆盖度

- **来源题**: T09-01（A）
- **用户选择**: A —— 所有 14+ 组件 100% 暗色适配
- **规范化结论**: 所有视觉组件**必须**在 dark 主题下有完整适配；通过 `var(--color-*)` token 驱动；CI 检查（定制 stylelint 插件或 PR 扫描）：禁止 `#[0-9a-f]{3,8}` 裸色值出现在 `.vue` 和 `.css` 文件。
- **硬约束**: 第三方组件（如 shiki 代码高亮、KaTeX）需为 dark 主题提供 theme swap（shiki 使用 `github-dark`，KaTeX 使用 `--color-code-text` token 覆写）。
- **落地点**: `src/styles/theme-dark.css`；CI lint 规则
- **关联**: R-01（设计语汇冻结）、R-02（ThemeEngine）

## 决策 R-10 | 密度策略

- **来源题**: T09-10（B + 补充）
- **用户选择**: B —— Hub 宽松 / Workstation 中等 / Settings 紧凑 + "禁止后台表格感，美感优先"
- **规范化结论**:
  - 每个 View 在根节点设置 `data-density="comfortable|standard|compact"`：
    - Hub：`comfortable`（卡片间距 24px，卡片内 padding 20px）
    - Workstation：`standard`（主编辑区纸张间距 16px，侧栏 12px）
    - Settings：`compact`（标签/表单间距 10px，但仍不得"后台表格"）
  - **DataInsights**：与 Hub 共用 comfortable，但图表内部走 standard。
- **硬约束**:
  - 任何 View 在任何密度下都**禁止出现 >5 列的原始表格** / 过窄的 input / 无 padding 的密集列表。
  - Settings 的"紧凑"≠"窄"，必须保留足够呼吸空间（line-height ≥ 1.5）。
- **落地点**: `src/styles/density.css`；每个 View 根组件
- **关联**: L1-39 A（Typora/iA Writer 气质）、T09-04 A（自定义空状态）

## 决策 R-11 | 空状态与骨架屏

- **来源题**: T09-04（A）、T09-11（A）
- **用户选择**: T09-04 A（每组件自定义）+ T09-11 A（直接说明，少用骨架屏）
- **规范化结论**:
  - **加载态**：优先用"直接说明文案"（`LoadingState` 组件显示纯文字 + 进度），不默认骨架屏。
  - **骨架屏**：仅用于**首次启动首屏**（Hub 卡片首次渲染）场景，其他异步加载一律文案。
  - **空状态**：每个组件自定义（T09-04 A 保留设计自由度），但**所有空状态必须符合 `spec/19-design-language.md` 的设计语汇**（禁止 emoji、禁止不一致色彩）。
- **硬约束**:
  - 空状态文案必须是**完整中文句子**（中英双语）；不得使用孤立词汇或缩写。
  - 任何空状态的 CTA 按钮必须映射到 Hub 3-入口预算（新建 / 模板 / 导入，见 Part3a T02-13 决策）。
- **落地点**:
  - `src/components/common/LoadingState.vue`
  - `spec/19-design-language.md` 的 "EmptyStatePatterns" 章节
- **关联**: T09-04（组件自定义）、T09-13（一致性审查）、T02-05 / T02-15（Onboarding 冲突裁决见第 6 章）

## 决策 R-12 | 触控 / 键盘通道取舍

- **来源题**: T09-12（A）
- **用户选择**: A —— 只优化鼠标
- **规范化结论**:
  - 桌面 Tauri 环境默认**鼠标优先**，不做触控优化。
  - 键盘作为次要通道（T03 快捷键体系完整，但不做 a11y 专项）。
  - 不投入 `@media (pointer: coarse)` 样式 / 手势 / 长按等。
- **硬约束**: 不接受为了触控增加组件体积的提交（如 react-use-gesture 类依赖）。
- **落地点**: 无
- **关联**: G-09（不做无障碍专项）

## 决策 R-13 | 视觉一致性审查严格度

- **来源题**: T09-13（D）
- **用户选择**: D + "严禁 emoji / 任何突兀"
- **规范化结论**:
  - 所有新组件必须在 PR 中**显式声明**使用的设计语汇条目（`spec/19-design-language.md` 的引用 ID）。
  - PR 模板新增 checklist：
    - [ ] 所有颜色使用 token
    - [ ] 所有字体使用 FontSystem 注册字体
    - [ ] 未引入 emoji
    - [ ] 未引入后台表格感
    - [ ] 已适配 dark 主题
    - [ ] 已适配双轨主题（AppChrome + EditorContent）
    - [ ] 已适配 3 档密度
- **硬约束**: 视觉一致性失败的 PR **不允许合并**，需提供修订。
- **落地点**: `.github/pull_request_template.md`；`spec/19-design-language.md`
- **关联**: G-14 / G-15（验收矩阵、冗余开发）

## 决策 R-14 | 多设备预览（Stage 面板）

- **来源题**: T09-08（C）
- **用户选择**: C —— 多设备切换，参照 https://md.doocs.org/
- **规范化结论**:
  - 预览面板提供设备框切换：**iPhone 14 Pro / Pixel 8 / iPad Air / 桌面 Web**（4 档）。
  - 设备框 SVG 使用**线稿风格**（不写实），符合 Ethereal Constructivism 克制美学。
  - 不同设备对应不同 CSS 容器宽度（iPhone=390 / Pixel=412 / iPad=820 / Desktop=100%），文章内容在容器内按对应宽度渲染。
- **硬约束**: 设备切换不得触发 article 重新加载；仅切换 CSS `width` 与 `device-frame` SVG。
- **落地点**:
  - `src/components/stage/DevicePreview.vue`
  - `src/assets/device-frames/`（SVG 资源）
- **关联**: L1-30 / L1-31（各平台独立渲染）

---

# 域 S | StatusBar / TabBar / Workstation 布局 / 导航

## 决策 S-01 | StatusBar 字段集（最终版）

- **来源题**: L1-48（B）、N-01（C + 补充）、E-07（D 保存指示）、L1-49（B+C 可关闭）
- **冲突**: L1-48 B 字段集 vs N-01 C 字段集（L1-48 无行列号 / 目标，N-01 C 有目标）
- **裁决**（见第 6 章冲突 #1）: **以 N-01 C 字段集为准**，不显示行列号
- **规范化结论（最终字段集）**:
  - **左区**（写作统计）：
    1. 字数（正文纯文本，与 T08-07 D 口径一致 —— 不含标题 / 代码块 / 公式）
    2. 字符数
    3. 段落数
    4. 预估阅读时长（按 300 字/分钟）
  - **中区**（写作目标 / 模式）：
    5. 当前写作目标进度（L1-45 C 有目标时显示）
    6. 当前编辑模式（Typora / Source / Preview）
    7. 当前纸张宽度档位（T01-11 C）
  - **右区**（系统状态）：
    8. 保存状态（E-07 D：已保存 / 保存中 / 失败，点击可查看详情）
    9. 同步状态（Git / WebDAV 最近同步时间）
    10. 当前账户 Profile 名（L1-23 D / L1-24 D）
  - **不显示**: 行号 / 列号、打字速度、选区字数（选区字数走弹出面板，由 N-02 D 字数区域 click 触发 WordCountReport EX-06）。
  - **整体可关闭**（L1-49 补充）：Settings > Editor > "显示 StatusBar" 开关；关闭后仅在字数更新时短暂透明提示 1s（iA Writer 式）。
- **硬约束**:
  - 所有字段必须**全局可交互**（N-02 D）：字数 → 弹 WordCountReport；目标 → 弹目标设置；保存状态 → 弹保存详情 / 手动保存；模式 → 切换菜单；纸张宽度 → 档位列表；账户 → 切换菜单。
  - 隐藏 StatusBar 时（关闭状态），快捷键 `Ctrl+/` 可临时显示 5s。
- **落地点**:
  - `spec/23-statusbar.md`
  - `src/components/editor/EditorStatusBar.vue`
  - `src/stores/editor-status.ts`
- **关联**: T08-07（字数口径）、E-07（保存指示）、N-02（交互）、L1-45（目标）、T01-11（纸张宽度）、L1-49（可关闭）

## 决策 S-02 | TabBar 增强

- **来源题**: N-04（D）、S-09（B v2.1 实现）、L1-53（C 跨窗口）、N-05（D 修改指示）
- **规范化结论**:
  - TabBar 功能全集：
    1. **拖拽排序**（同窗口内）
    2. **中键关闭**
    3. **右键菜单**：关闭 / 关闭其他 / 关闭右侧 / 关闭所有 / 固定标签页 / 复制路径 / 在 FileManager 中定位
    4. **固定（Pin）标签页**：固定标签不参与"关闭其他"
    5. **跨窗口拖拽**（与 Q-01 配合）：拖到窗口外某处时释放，自动打开新窗口承接
    6. **悬停预览**：hover 500ms 后显示弹出小卡（文章标题 / 字数 / 最近编辑时间 / 前 3 行）
  - **修改指示**（N-05 D）：
    1. 未保存文档：Tab 左侧圆点 `•`
    2. 外部修改但未同步：Tab 左侧感叹号 `⚠`（非 emoji，使用 SVG 图标）
    3. 冲突（多窗口同时编辑）：Tab 左侧双圆点
    4. 关闭未保存 Tab 时弹确认（保存 / 丢弃 / 取消）
- **硬约束**:
  - Tab 宽度：最小 120px，最大 240px；超出时水平滚动（不自动折叠）。
  - 跨窗口拖拽的 Tab 状态（光标位置 / 选区 / 撤销栈）必须**完整迁移**（Q-01 IPC）。
- **落地点**:
  - `spec/24-tabbar.md`
  - `src/components/layout/TabBar.vue`
  - `src/components/layout/TabContextMenu.vue`
  - `src/components/layout/TabPreviewCard.vue`
- **关联**: Q-01（多窗口）、N-05（修改指示）、X-07（版本）

## 决策 S-03 | Workstation 三栏布局（左 / 中 / 右）

- **来源题**: W-01（A）、W-02（D 左侧 tab）、W-03（C 按模式记忆）、W-05（D 叠加）、W-06（D 分屏）
- **冲突**: W-01 A（右栏仅预览）vs W-06 D（分屏对比需要另一侧栏位）
- **裁决**（见第 6 章冲突 #2）: **引入右栏模式切换器**，默认仅预览
- **规范化结论**:
  - **左栏**（Sidebar）：通过 Tab 切换以下 3 个面板（用户补充 W-01 "左侧已经配置版本历史"）
    1. **FileManager**（文件管理 + 分类 + 智能文件夹）
    2. **TOC**（W-02 D：实时高亮 + 折叠 + 拖拽重排章节）
    3. **VersionHistory**（L1-17/18/19 + X-07）
    4. **DraftBox**（F-05 D 独立空间，作为第 4 个 Tab）
    - 宽度默认 280px，可拖拽调整（200-480px），可折叠到 48px（图标 rail）
  - **中栏**（Editor）：纸张编辑区 + Typora/Source 切换 + StatusBar
  - **右栏**（Stage）：**模式切换器**（Segmented Control）
    - **Preview**（默认，W-01 A）：实时预览
    - **Reference**（W-06 D 参考文档）：固定另一篇文章作为只读参考
    - **Split**（W-06 D 分屏对比）：两篇文档并排编辑
    - 宽度默认 480px，可调，可折叠到 0（完全隐藏）
  - **布局记忆**（W-03 C）：Typora / Source / Preview 三种编辑模式各自独立保存 `{leftWidth, rightWidth, leftActiveTab, rightMode, leftCollapsed, rightCollapsed}`。
- **硬约束**:
  - 右栏 "Reference" / "Split" 模式**只在 Tauri 独占路径下可用**（Web 调试态也可用，但跨窗口 Split 要求 Q-01 支持）。
  - 左栏 4 Tab 之间切换 **200ms** 过渡；切换不重置面板内部状态（如滚动位置、折叠状态）。
- **落地点**:
  - `spec/25-workstation-layout.md`
  - `src/views/Workstation.vue`
  - `src/components/layout/LeftSidebar.vue`（4 Tab 容器）
  - `src/components/layout/RightStage.vue`（模式切换器）
  - `src/stores/layout.ts`（按模式记忆）
- **关联**: W-04（同步滚动）、W-05（最大化）、R-06（动画）

## 决策 S-04 | 同步滚动（SyncScroll）

- **来源题**: W-04（D）
- **用户选择**: D —— 双向 + 可临时解除
- **规范化结论**:
  - 编辑器 <-> 预览 **双向同步滚动**：滚动其中一侧时，另一侧按节点映射对齐（基于 heading / paragraph 级 DOM id）。
  - 顶栏或快捷键 `Ctrl+Shift+L` 切换"同步 / 不同步"。
- **硬约束**:
  - 节点映射算法必须在 >50MB 文档下 **<100ms** 响应（配合 L1-36 输入延迟零感知指标）。
  - 同步状态在 Settings 中持久化，下次打开文档继承。
- **落地点**: `src/services/sync-scroll/`
- **关联**: L1-36（性能 SLO）

## 决策 S-05 | 编辑器最大化 + 专注模式叠加

- **来源题**: W-05（D）、L1-46（D 专注模式深度）、T01-12（B 段落高亮）
- **规范化结论**:
  - **EditorMaximize** 状态：隐藏左右栏，仅保留中栏 + StatusBar + Tab（可选隐藏 Tab）。快捷键 `Ctrl+Shift+F`。
  - **FocusMode** 状态（L1-46 D）：当前段落高亮 + 其他段落透明度 0.4 + Toolbar 淡隐。快捷键 `Ctrl+Shift+Z`。
  - 两者**可叠加**：`Maximize + Focus` = 全屏纸张 + 段落高亮 + 退出时弹 FocusSessionSummary（L1-46 D 补充）。
  - **退出 FocusMode 弹出 Summary**：本次会话写作时长 / 字数增量 / 目标达成度（与 L1-45 C 联动）。
- **硬约束**:
  - FocusMode 下**仍允许所有快捷键 / 斜杠命令 / 保存**（L1-46 补充）。
  - Maximize 不影响多窗口（其他窗口保持正常）。
- **落地点**:
  - `src/stores/focus-state.ts`
  - `src/components/editor/FocusSessionSummary.vue`
- **关联**: L1-45（目标）、L1-49（写作氛围）

## 决策 S-06 | 修改指示全链路

- **来源题**: N-05（D）、E-07（D 自动保存状态）
- **规范化结论**:
  - **TabBar 指示**：见 S-02（圆点 / ⚠ / 双圆点）
  - **FileManager 指示**：列表项文件名旁同样标记，风格统一
  - **窗口标题**：未保存时 `• InkForge - 文档名` ；已保存时 `InkForge - 文档名`
  - **关闭前确认**：未保存 Tab 关闭时强制弹确认（即使是关闭整个窗口）
- **硬约束**: 自动保存失败时（L1-19 D），TabBar 指示升级为 `⚠` + Toast 持续提示 + StatusBar 保存状态变红（E-07 D）。
- **落地点**: `src/services/dirty-state-tracker/`
- **关联**: L1-19（自动保存失败）、Q-01（跨窗口冲突）

## 决策 S-07 | 面包屑导航

- **来源题**: N-03（A）
- **用户选择**: A —— 不做面包屑
- **规范化结论**: v2.1 **不实现**面包屑导航；导航依赖 Hub ↔ Workstation 层级（T02-17 C）+ TabBar + 侧栏 FileManager。
- **硬约束**: 不得在任何页面引入面包屑组件。
- **落地点**: 无
- **关联**: T02-17（Hub/Workstation 层级）

## 决策 S-08 | Toast / 通知系统（Sonner 级）

- **来源题**: N-06（D）、G-07（D 沿用当前 Toast）
- **冲突**: G-07 D（沿用当前 Toast）vs N-06 D（Sonner + 撤销按钮）
- **裁决**（见第 6 章冲突 #3）: **升级当前 Toast 到 Sonner 级能力**，不引入新依赖
- **规范化结论**:
  - 栈式 Toast（最多同时 3 条可见，超出排队）
  - 操作类 Toast 带"撤销"按钮（与 L1-42 D 回收站、X-10 版本点联动）：
    - 删除文章 → "已删除 X，[撤销]"（30s 有效）
    - 批量操作完成 → "已移动 N 篇文章，[撤销]"
    - AI 改写应用 → "已应用建议，[回滚到此前版本]"
  - 4 种级别：info / success / warning / error（对应 G-13 D 分级）；error 不自动消失
- **硬约束**:
  - 撤销机制基于 **ActionReversal 框架**：每个可撤销操作预先生成 reversal closure，Toast click 时执行。
  - 撤销 Toast 如果被覆盖或超时，**视为用户放弃**（不保留到下次启动）。
- **落地点**:
  - `src/services/toast-system/`
  - `src/services/action-reversal/`
- **关联**: L1-42（回收站）、X-10（批量操作留痕）、G-13（错误分级）

## 决策 S-09 | Hub 布局衔接（与 Part3a 对齐）

- **来源题**: T02-01 / T02-14 / T02-05 / T02-15（由 Part3a 主决）
- **规范化结论（本文档仅定义布局相关条目，详见 Part3a）**:
  - Hub 页面密度 `comfortable`（R-10）
  - Hub 使用 scroll-snap（T02-09 A）
  - 响应式 4→3→2→1 四级（T02-08 C）
- **硬约束**: Hub 首屏 Bento Grid **auto 高度**（T02-03 B），不强制 100vh；受 L1-49 "可关闭 StatusBar" 影响时纸张区域略微上移。
- **落地点**: Part3a 负责细节；本文档仅约束布局基调
- **关联**: 见 Part3a

## 决策 S-10 | 左栏 TOC 面板（细则）

- **来源题**: W-02（D 补充"放在左侧 tab"）、M-04（D 正文内 `[toc]`）
- **规范化结论**:
  - **左栏 TOC Tab** 与正文 `[toc]` 节点（M-04 D）**独立**：前者是导航面板（侧栏），后者是正文里的可导出节点。
  - TOC 面板功能：
    1. 实时提取当前文档的所有 heading（h1~h6）
    2. 当前滚动位置对应的 heading 高亮
    3. 可折叠子层级
    4. **拖拽重排章节**（W-02 D）：拖动 h2 节点时，整个 h2 下的子树一起移动（通过 ProseMirror 节点范围移动实现）
  - 面板顶部提供搜索框过滤 heading 文本。
- **硬约束**:
  - 拖拽重排**立即反映到编辑器**（不做 "preview-then-apply"）；若拖拽失败需完整回滚。
  - 拖拽操作必须生成版本点（X-09 D 文档版本包）。
- **落地点**: `src/components/layout/TOCPanel.vue`；`src/services/editor-structure/heading-mover.ts`
- **关联**: W-02、M-04、X-09

## 决策 S-11 | 文档属性弹出面板（F-06）

- **来源题**: F-06（C + 补充"弹出面板"）
- **规范化结论**:
  - 入口：Tab 右键菜单 "查看属性" / StatusBar 字数区域 click / 斜杠命令 `/文档属性`
  - 面板形态：**Popover**（非 Modal，可在背后继续编辑）
  - 字段：摘要 / 封面 / 字数 / 状态（L1-41 C 6 态）/ 版本数量 / 导出历史 / 创建 / 修改 / 标签 / 分类
  - **不做自定义字段**（F-06 C 未选 D）
- **硬约束**: 面板关闭时若字段有修改，自动保存（不弹确认）。
- **落地点**: `src/components/common/DocumentPropertyPanel.vue`
- **关联**: L1-41（状态机）、S-14（标签对象模型）

## 决策 S-12 | 多标签会话恢复（S-15）

- **来源题**: S-15（D + 补充"优于 Word"）
- **规范化结论**:
  - 会话数据表 `editor_sessions(accountId, workspaceId, windowId, tabs[], updatedAt)`
  - 每个 tab 存：`{articleId, cursorPos, scrollTop, foldedBlocks[], previewOpen, rightStageMode, rightScrollTop}`
  - 启动时**异步加载**（不阻塞 UI）：首次渲染显示上次"激活 Tab"的文档（从 IndexedDB 已 decode 的正文缓存），其余 Tab 懒加载。
  - 降级策略：若 `editor_sessions` 表损坏，**仅恢复最后活跃文档**；**绝不丢失正文**（X-11 底线）。
- **硬约束**:
  - 恢复延迟必须 **< Microsoft Word 级**（即 **<2 秒首屏可交互**，优于 Word 典型 3-5 秒）。
  - 通过 Web Worker 并行解析多个 tab 的 JSON，分批 hydration 到 Pinia Store。
- **落地点**:
  - `src/services/session-store/`
  - `src/workers/session-hydrator.ts`
- **关联**: Q-01（多窗口）、X-11（灾难恢复）、S-01（StatusBar 账户 Profile）

## 决策 S-13 | 首启分流与引导

- **来源题**: L1-50（B + "讨厌引导、不要示例文档"）、L1-52（A 全部可见）、T06-08（D 三分流 + "拒绝匿名"）
- **冲突**: L1-49 B+C（安静氛围）vs L1-52 A（全部可见） / T02-05 C vs T02-15 B（Onboarding 冲突）
- **裁决**（见第 6 章冲突 #4 / #5）:
  - **首启仅一个轻量欢迎弹窗 + 2 分流**（创建正式账户 / 导入已有数据，否决匿名）
  - **不自动创建示例文档**（L1-50 补充）
  - **所有功能第一天可见**（L1-52 A）但**默认极简**（R-01 / L1-49）；StatusBar / FloatingToolbar 等可用户关闭
  - **Hub 全新安装**使用 T02-15 B 的"首启引导版 Hub"而非 T02-05 C 的独立 Onboarding Flow（详见冲突 #4 裁决）
- **规范化结论**:
  - **FirstRunDispatcher**：检测账户表为空时，打开欢迎弹窗（Welcome Modal）：
    - 标题："欢迎来到 InkForge"（无副标题、无插画）
    - 两个按钮：
      - 创建账户（主按钮）→ 账户创建向导
      - 导入现有数据（次按钮）→ ImportWizard（S-13 D）
  - 创建 / 导入完成后**进入 Hub 的"引导版"**（T02-15 B）：卡片显示精简版 + 首个 CTA（"开始创作第一篇文章"），首个动作完成后标记 `settings.hasCompletedFirstAction=true` 并切到常规 Hub。
  - 帮助系统两层（L1-51 C）：
    1. **Markdown 语法速查卡**：随时通过 `Ctrl+?` 呼出
    2. **上下文气泡**："What's this?" 风格，**首次使用**某功能时弹出（记忆到 `settings.helpBubblesShown[]` 不重复）
- **硬约束**:
  - **严禁自动创建示例文档** / **严禁匿名模式**。
  - 所有引导气泡必须可"永久关闭"且**不得阻塞操作**。
- **落地点**:
  - `src/views/FirstRunDispatcher.vue`
  - `src/components/welcome/WelcomeModal.vue`
  - `src/components/help/MarkdownCheatsheet.vue`
  - `src/components/help/ContextBubble.vue`
- **关联**: T02-15 / T02-05（Onboarding 冲突裁决）、T06-08（首启账户）

## 决策 S-14 | 导入向导 + 规则模板

- **来源题**: S-08（B）、S-13（D）
- **规范化结论**:
  - 支持导入 **.md + .docx + 项目文件夹**（批量）。
  - ImportWizard 步骤：
    1. 选择来源（单文件 / 文件夹 / 压缩包）
    2. 预览即将导入的项
    3. 冲突策略：重命名 / 合并 / 跳过 / 新建分类 / 应用已保存规则模板
    4. 目标分类 / 标签 / 状态
    5. 执行并展示结果
  - **规则模板**（`import_rule_templates` 表）：用户可保存本次向导的所有选择为模板，下次批量导入一键应用。
  - .docx 使用 **mammoth.js** 转换为 HTML，再通过 Turndown 落到 Markdown。
- **硬约束**: 导入冲突处理必须**非破坏**：若冲突策略失败，默认转为"跳过"而非覆盖。
- **落地点**:
  - `src/views/import/ImportWizard.vue`
  - `src/services/importers/markdown-importer.ts`
  - `src/services/importers/docx-importer.ts`
  - `src/db/schema.ts` 的 `import_rule_templates` 表
- **关联**: F-04（资产)、L1-41（目标状态）、S-13（首启导入分支）

---

# 域 T | 崩溃恢复与诊断

"文章不能丢"是 X-11 用户底线。本域所有决策均服务于此底线。用户在 R-01~R-05 整组选择均为 **D 级**，表明对系统健壮性要求达到最保守档位。

## 决策 T-01 | 崩溃恢复机制（CrashRecovery）

- **来源题**: R-01（D）、L1-19（D 自动保存失败）
- **规范化结论**:
  - **beforeunload 紧急保存**：浏览器 / Tauri WebView 的 `beforeunload` 事件触发时，同步写入 localStorage 一份"最后状态"（前 200KB 文档 + `{articleId, tabs[], windowId, timestamp}`）。
  - **异常退出检测**：每次启动检查两个标志：
    1. 上次启动时写入的"正常退出标志"（在正常关闭流程末尾设置）
    2. beforeunload 紧急保存记录
    - 若 1 缺失且 2 存在 → 进入 Recovery Mode
  - **Recovery Mode UI**：
    - 列出所有检测到的"未保存文档候选"
    - 对每个候选显示："IndexedDB 最新版本" vs "localStorage 应急版本" 的 diff
    - 用户选择：保留 IndexedDB / 保留 localStorage / 三方合并 / 丢弃
  - **自动保存失败兜底**（L1-19 D）：
    1. 保存失败 → Toast 红色 + StatusBar 变红
    2. 自动重试 1 次
    3. 失败后强制创建"本地恢复点"（localStorage 紧急副本 + IndexedDB `recovery_points` 表）
    4. StatusBar 保存状态点击 → 弹出"保存失败详情"面板，含：错误堆栈 / 应急导出按钮（将当前文档导出 .md 到本地）
    5. 所有失败事件写入 ActivityLog（T-05）
- **硬约束**:
  - beforeunload 写入必须 **<50ms** 完成（否则浏览器可能拒绝执行）；超出时只写最近 100KB。
  - Recovery Mode **禁用所有自定义 CSS/JS 扩展**（Q-10 的 SafeMode 联动）。
  - 任何恢复操作必须**先复制为新版本点**，再决定覆盖 / 合并，**不允许直接覆盖**。
- **落地点**:
  - `spec/26-crash-recovery.md`
  - `src/services/crash-recovery/`
  - `src/views/RecoveryMode.vue`
  - `src/db/schema.ts` 的 `recovery_points` 表
- **关联**: X-11（灾难恢复）、L1-19（自动保存失败）、L1-18（恢复双栏 diff）

## 决策 T-02 | 数据完整性校验（DataIntegrity）

- **来源题**: R-05（D + "性能前提下后台静默"）
- **规范化结论**:
  - **启动时基础检查**：
    1. `articles` 表每行 `contentHash` 与 `sha256(content)` 比对（抽样 10%，整体 <200ms）
    2. `assets` 表引用计数与实际 FK 比对（通过 SQL COUNT JOIN）
    3. `article_versions` 表的 diff 链完整性（抽样 5%）
  - **后台定期校验**：使用 **Web Worker**，每 15 分钟执行一次全量（文档数 <1000 时）或分片（>1000 时），使用 `requestIdleCallback` 空闲时执行。
  - **异常处理**：
    - 发现 hash 不匹配 → 进入 SafeMode（T-03）+ Toast 警告 + 自动从 `article_versions` 最近完整版本恢复
    - 发现引用计数不一致 → 静默修复（重建计数）+ 写 ActivityLog
  - **用户可见界面**: Settings > Advanced > Data Health（显示最后校验时间、发现问题数、手动触发按钮）。
- **硬约束**:
  - 后台校验**不得占用主线程 >50ms / 100ms**；CPU > 60% 时自动推迟。
  - 校验失败但**文章未损坏**时（例如 hash 字段丢失），优先重建 hash 而非触发 SafeMode。
- **落地点**:
  - `src/services/data-integrity/`
  - `src/workers/integrity-worker.ts`
  - `src/views/settings/DataHealthPanel.vue`
- **关联**: T-03（SafeMode 联动）、X-07（版本历史恢复）

## 决策 T-03 | 错误边界 + SafeMode

- **来源题**: R-04（D）、X-03（A）、X-11（C）
- **规范化结论**:
  - **全局 Vue errorHandler**（X-03 A）：捕获未处理异常 → Toast（error 级）+ 写 ActivityLog + 上报到 ErrorBoundary 聚合器。
  - **扩展健康监控**：
    - 每个 TipTap 扩展包装在 try-catch；同一扩展 1 分钟内出错 ≥3 次 → 自动**禁用该扩展**（仅当前会话，写 ActivityLog）
    - 用户可在 Settings > Advanced > Extension Health 查看被禁用列表 + 重启尝试
  - **SafeMode 启动**：
    - 触发条件：
      1. T-02 检测到完整性异常
      2. 连续 3 次启动崩溃（每次启动前写标志，成功启动后清除）
      3. 用户手动按住 `Shift` 启动
    - SafeMode 下禁用：所有自定义 CSS/JS（Q-10）、非核心 TipTap 扩展（保留仅：Text / Paragraph / Heading / List / Link）、动画（R-06 降到 none 级）、fs watcher（Q-03）、插件
    - SafeMode 顶部横幅提示："已进入安全模式。点击 [查看问题] [退出安全模式]"
- **硬约束**:
  - **数据只读优先**（X-11 "文章不能丢"）：SafeMode 下可编辑但每次保存强制版本点。
  - 自动禁用扩展**仅限当前会话**，不做持久化（X-03 A "不做自动禁用"的用户表述 = 不持久禁用，临时禁用保护是底线）。
- **落地点**:
  - `spec/27-safe-mode.md`
  - `src/services/safe-mode/`
  - `src/services/extension-health/`
- **关联**: R-04、X-11、Q-10（自定义 CSS 关闭）

## 决策 T-04 | 开发者面板（DevPanel）

- **来源题**: R-03（D）、T07-04（B+C 高级设置）
- **规范化结论**:
  - **激活方式**：Settings > Advanced > Developer Mode = ON **或** 连按 `Ctrl+Shift+D` 三次。
  - **面板内容**（Tab 导航）：
    1. **TipTap Editor State**：当前 JSON 内容、active marks、selection、scrollTop
    2. **ProseMirror State**：raw PM doc、plugin states
    3. **Store Viewer**：所有 Pinia stores 实时展示（支持编辑）
    4. **Performance**：最近 60s FPS 曲线、长任务列表、render profile
    5. **Event Stream**：实时日志流（可过滤等级 / 模块）
    6. **IndexedDB Browser**：表 / 索引 / 数据查询（T07-03 C）
    7. **Network Diagnostics**：Tauri IPC 调用、HTTP 请求统计
  - **面板形态**：独立底部 drawer，可拖拽调高度（默认 40vh）；`Ctrl+\` 组合不冲突时以 `Ctrl+Shift+I` 打开。
- **硬约束**:
  - 生产构建**保留**（R-03 D），但仅在激活时加载代码（动态 import 分割）。
  - DevPanel 不得影响应用性能：自身占用 **<5% CPU / <50MB 内存**。
- **落地点**:
  - `src/views/dev/DevPanel.vue`
  - `src/services/dev-tools/`（tiptap-inspector / pm-inspector / store-inspector / ...）
- **关联**: X-05（Lighthouse）、R-06（动画可观察）

## 决策 T-05 | ActivityLogger（前端日志）

- **来源题**: R-02（D）、L1-34（A+B+C + "全范围"）
- **冲突**: L1-34 选项（排除 D AI / 命令留痕）vs 补充"全范围审计"（含 D）
- **裁决**（见第 6 章冲突 #6）: **按全范围落地**（含 AI / 命令操作）
- **规范化结论**:
  - **日志存储**: IndexedDB 表 `activity_logs(id, timestamp, level, module, event, data, scope)`，保留期 **3 个月**（L1-34 补充）。
  - **覆盖范围**：
    1. 安全：登录、账户切换、删除、恢复、导入 / 导出（L1-34 A）
    2. 编辑：创建 / 修改 / 恢复 / 发布 / 同步冲突解决（L1-34 B）
    3. 审阅：评论 / 关闭线程 / 审批 / 授权 / 撤权（L1-34 C）
    4. **AI / 命令**：任何 AI 改写、批量命令、斜杠命令写操作（L1-34 补充拉到 D）
    5. 性能采样（首屏 / 输入 / 保存，R-02 D）
    6. 错误堆栈（T-03 errorHandler 捕获的全部）
  - **用户可见**（L1-34 补充）：Settings > Advanced > Activity Log
    - 过滤：时间范围 / 等级 / 模块 / 事件
    - **导出**：JSON / CSV（与 T08-06 B 单图表 CSV 风格一致）
    - **DiagnosticPackage**：一键打包（日志 + 环境信息 + 最近 5 个错误堆栈 + 应用版本 / Tauri 版本 / OS），用于用户提交 bug 报告。
- **硬约束**:
  - 日志写入**永不阻塞主线程**；批量写入（1 秒 / 100 条谁先到）。
  - `data` 字段敏感内容（密码、API Key）**强制脱敏**（白名单式序列化）。
- **落地点**:
  - `src/services/activity-logger/`
  - `src/views/settings/ActivityLogViewer.vue`
  - `src/services/diagnostic-package/`
- **关联**: L1-34、T05-09（命令注册表审计字段）、X-12（验收）

## 决策 T-06 | 性能采样与预算

- **来源题**: X-05（C Lighthouse>80 + "极致优化"）、L1-36（C SLO 硬指标）
- **规范化结论**:
  - **SLO 硬指标**（L1-36 C 补充）:
    - 输入延迟 ~ 0（用户感知不到，通常 <16ms）
    - 保存（autosave）≤ 1s
    - 冲突检测 ≤ 10s
    - 导出 ≤ 3min
    - 首屏可交互 ≤ 3s
    - Hub 切换 ≤ 1s
    - **Lighthouse Performance Score > 80**
  - **采样**:
    - 输入事件监听采样 5%，记录 keydown → DOM 更新耗时
    - autosave 每次记录耗时 + 大小
    - 页面切换记录路由变化 → 首次渲染耗时
    - 定期（每 5 分钟）runtime Performance.memory 快照
  - **预算破防**:
    - 实时越界（单次超标）→ 仅写 ActivityLog
    - 连续越界（同类指标 5 次 / 分钟超标）→ Toast 警告 + 触发 R-06 动画自动降级
  - **CI 集成**: `lighthouse-ci` 在每个 PR 上跑基线项目；任何 metric 下降 >10% 阻塞合并。
- **硬约束**: 生产构建必须通过 Lighthouse > 80；开发构建允许 > 60（因为 devtools overhead）。
- **落地点**:
  - `src/services/performance-monitor/`
  - `.lighthouserc.json`
  - `spec/28-perf-budget.md`
- **关联**: X-05、L1-36、R-06（动画降级）

## 决策 T-07 | 自动保存失败兜底

- **来源题**: L1-19（D）、E-07（D）、X-11（C 底线）
- **规范化结论**（已在 T-01 覆盖，此处汇总）:
  - 失败一次即**重试一次**（L1-19 补充"失败重试一次"）
  - 再次失败 → 完全可见（L1-19 D）：Toast 红 + StatusBar 红 + Tab 指示 ⚠
  - 强制本地恢复点（`recovery_points` 表 + localStorage 副本）
  - "查看保存失败明细" 面板（错误详情）
  - "手动导出应急副本" 按钮（当前文档 → .md 本地文件）
  - 写 ActivityLog（T-05 覆盖）
- **硬约束**:
  - 失败期间**不阻塞编辑**（用户可继续写，所有更改累积）；恢复成功后 batch save。
  - 失败态持续 >5 分钟触发更严重的警告（窗口标题加 `⚠` 前缀）。
- **落地点**: `src/services/autosave/`（集成 recovery-points）
- **关联**: T-01、L1-19、E-07

## 决策 T-08 | 灾难恢复 / 数据库损坏处理

- **来源题**: X-11（C + "文章不能丢"）
- **规范化结论**:
  - **启动前检查**:
    1. IndexedDB 连接成功？否 → SafeMode + 尝试 import fallback
    2. 核心表结构正确？否 → 跑迁移脚本
    3. 抽样完整性 OK？否 → T-03 SafeMode + T-02 自动修复流程
  - **Dexie 打开失败**（数据库损坏）:
    - 尝试只读打开，成功则"只读抢救模式"：读所有可读的 articles 导出 JSON，引导用户新建空数据库并导入。
    - 全失败则 Recovery Wizard（R-01 D 选项的向导化形态）：
      - Step 1：诊断报告
      - Step 2：用户选择备份源（最近自动备份 / localStorage / Git 仓库 / 本地 .md 文件夹）
      - Step 3：执行恢复（预览 → 确认）
      - Step 4：如果全部失败，引导用户提交 DiagnosticPackage（T-05）
- **硬约束**:
  - **任何路径下不得丢失 articles.content 的最新内容**（底线 X-11）。
  - Recovery Wizard 操作前必须 dump 当前残破数据库到 `recovery/<timestamp>.json.bak`。
- **落地点**:
  - `src/services/disaster-recovery/`
  - `src/views/RecoveryWizard.vue`
- **关联**: T-01 Recovery Mode（编辑器崩溃）vs 此处 Recovery Wizard（数据库崩溃），两者是正交的两个系统

## 决策 T-09 | 数据库迁移

- **来源题**: X-04（B）、G-10（A）
- **冲突**: X-04 B（显式脚本 + 进度）vs G-10 A（Dexie 自动迁移）
- **裁决**（见第 6 章冲突 #7）: **按 X-04 B 落地**（显式进度），Dexie 的 `.version().upgrade()` 作为执行底层
- **规范化结论**:
  - 启动时调用 `runMigrations()` → 比较 `meta.schemaVersion` 与当前代码目标版本
  - 若有落差：
    1. 弹出 `MigrationProgressModal`（进度条 + 当前步骤 + "取消"按钮禁用）
    2. 执行步骤顺序：**先备份** → 每一步写日志 → 原子提交
    3. 任一步骤失败 → 回滚 + Toast 错误 + 进入 SafeMode（T-03）
  - 迁移本身通过 Dexie `.version(N).upgrade(tx => ...)` 实现，但**包一层 runner**提供 UI 和日志。
- **硬约束**:
  - **迁移前强制完整 IndexedDB 快照**（导出到 `backups/<timestamp>.json`），保留最近 3 份。
  - 迁移失败**不得阻止应用启动**（SafeMode 兜底）。
- **落地点**:
  - `src/services/db-migration/`
  - `src/components/layout/MigrationProgressModal.vue`
- **关联**: T-03（SafeMode）、T07-03（自动备份）

## 决策 T-10 | 验收矩阵（证据化）

- **来源题**: X-12（D）、G-14（D）
- **规范化结论**（汇总本域所有 Task 的验收证据要求）:
  - 每个崩溃恢复 / 数据完整性 / SafeMode 功能必须有以下证据:
    1. **正向样本**：正常场景截图 / 日志
    2. **失败样本**：主动注入的失败场景截图 / 日志 / 错误堆栈
    3. **恢复样本**：失败后成功恢复的截图 / 日志 / 版本点对比
    4. **边界样本**：极端情况（超大文档 / 多账户并发 / 断电模拟）
  - 所有证据存于 `artifacts/<task-id>/`，随 PR 提交。
  - **机器测试先行**：每个决策对应至少 1 个 Vitest 单测 + 1 个 Playwright E2E。
- **硬约束**: 没有完整证据链的 Task 一律拒绝合并。
- **落地点**: `spec/29-acceptance-matrix.md`；`artifacts/` 目录
- **关联**: G-14、X-12、G-03（测试策略 C）

---

# 6. 冲突裁决汇总

以下 7 条冲突在本文件内完成裁决，不再留待 PRD。

## 冲突 #1 | L1-48 B vs N-01 C（StatusBar 字段集）

- **差异**: L1-48 B = 字数 + 字符 + 段落 + 阅读时长；N-01 C = B + 阅读时长 + 纸张宽度 + 目标进度（且 B 选项被 N-01 重新定义）
- **裁决**: **以 N-01 C 为准**，并增加 E-07 保存状态、账户 Profile 名
- **理由**: N-01 是 L1-48 的超集，且用户明确 StatusBar 可整体关闭；不显示行列号保持纸张气质。
- **最终字段集**见决策 S-01

## 冲突 #2 | W-01 A vs W-06 D（右栏职责）

- **差异**: W-01 A 右栏仅预览；W-06 D 需要并排参考 / 对比
- **裁决**: **引入右栏模式切换器**（Preview / Reference / Split 三选一）
- **理由**: 默认 Preview 符合 W-01 A 的"仅预览"；Reference / Split 是可选的用户态扩展，不污染默认体验
- **最终方案**见决策 S-03

## 冲突 #3 | G-07 D vs N-06 D（Toast 系统）

- **差异**: G-07 D 沿用当前 Toast（可能功能较弱）；N-06 D 需要 Sonner + 撤销
- **裁决**: **将当前 Toast 升级到 Sonner 级能力，不引入新依赖**
- **理由**: 用户核心诉求是"撤销按钮 + 栈式"，这可通过对现有 Toast 增补 ActionReversal 框架实现，无需新增依赖
- **最终方案**见决策 S-08

## 冲突 #4 | T02-05 C vs T02-15 B（Onboarding）

- **差异**: T02-05 C 独立 Onboarding Flow 取代空 Hub；T02-15 B 首启引导版 Hub
- **裁决**: **以 T02-15 B 为准 +  L1-50 B "轻量欢迎" 打底**
- **理由**:
  1. 用户 L1-50 明确"讨厌引导、不要示例文档"，独立 Onboarding Flow 偏重，不符合用户偏好
  2. 引导版 Hub 更轻量，做完首个动作即恢复常规
  3. FirstRunDispatcher 的 Welcome Modal + 账户分流满足"引导"的最低信息需求
- **最终方案**: 首启 = WelcomeModal（轻） → 账户创建 / 导入 → 引导版 Hub（T02-15 B） → 首个动作后切常规 Hub。**无独立 Onboarding Flow**。见决策 S-13

## 冲突 #5 | L1-49 B+C vs L1-52 A（极简 vs 功能密度）

- **差异**: L1-49 B+C 强调 iA Writer 式安静；L1-52 A 所有功能第一天可见
- **裁决**: **"默认极简，全开关可打开" 原则**
- **理由**: 二者并非对立 —— L1-52 A 是"可达性"（Availability），L1-49 B+C 是"默认态"（Default）。功能存在 ≠ 功能可见。
- **最终方案**:
  - 所有功能在菜单 / 命令面板中可达（L1-52 A）
  - 默认 UI 保持极简：StatusBar / FloatingToolbar / Toolbar 均可关闭（R-10 / S-01）
  - WritingAmbience 一键切到 iA Writer 模式（L1-49）
- 见决策 R-01 / R-10 / S-01 / S-13

## 冲突 #6 | L1-34 A+B+C vs 补充"全范围"

- **差异**: 选 A+B+C 排除 D（AI / 命令审计）；补充"全范围审计"含 D
- **裁决**: **按 D 落地（含 AI / 命令审计）**
- **理由**: 用户的补充更具体（"全范围"），优先于选项字母；同时与 L1-40 C 防呆、X-10 批量操作留痕、T05-09 D 命令注册表审计字段自洽
- **最终方案**见决策 T-05

## 冲突 #7 | X-04 B vs G-10 A（DB 迁移）

- **差异**: X-04 B 显式迁移脚本 + 进度；G-10 A Dexie 自动迁移
- **裁决**: **按 X-04 B 落地**（显式进度），Dexie 的 `.upgrade()` 作为底层执行
- **理由**:
  1. X-04 B 是更新的决策（后填）
  2. 显式进度 UI 对用户更透明，符合 L1-04 D 零空壳 + G-13 D 数据风险错误分级
  3. Dexie 仍作为实现手段，只是外包一层 UI + 日志 runner
- **最终方案**见决策 T-09

## 冲突 #8 | EX-04 认知差

- **描述**: 用户 EX-04 填"已有（card-recent 覆盖）"，但 0327 原 spec 中仅命名 card-recent，未必完全实现
- **裁决**: **与 Part3a 协同处理**
- **理由**: Part3a 涵盖 T02-06（card-recent 动态条数）等详细决策；本文只在决策 S-09 中纳入"Hub 布局基调"与 Part3a 对齐
- **最终方案**: 具体 card-recent 规格与实现状态由 Part3a 主决，本文不重复展开

## 冲突 #9 | T01-10 vs T01-18（图片进入规则）

- **描述**: T01-10 C 图片双击进入；T01-18 B 光标进入即编辑
- **归属**: 本文件**不主决**（属编辑器域，Part3a / Part3c 处理），仅在决策 S-11 中注明"文档属性面板弹出方式不依赖图片具体交互规则"
- **建议**: 由负责 T01 域的部分主决

## 冲突 #10 | X-05 极致性能 vs T08-01+T08-03+T09-02（新图表 / 动画）

- **描述**: 新图表 + 图表库 + 页面动画会冲击 Lighthouse > 80
- **本文件裁决**: 通过 **R-06 自动降级 + T-06 性能监控 + T-02 后台计算 Web Worker** 共同保证
- 见决策 R-06 / T-06

---

# 7. 新增 Spec 文件清单（本文件引出）

| # | Spec 文件 | 决策来源 | 体量估计 |
|---|---------|---------|---------|
| 18 | `spec/18-tauri-desktop-spec.md` | Q-01 ~ Q-12 | 大（>800 行） |
| 19 | `spec/19-design-language.md` | R-01 / R-11 / R-13 | 大（>600 行） |
| 20 | `spec/20-theme-engine.md` | R-02 | 大（>500 行） |
| 21 | `spec/21-font-system.md` | R-03 | 中（300-500 行） |
| 22 | `spec/22-typography.md` | R-04 | 中（300-500 行） |
| 23 | `spec/23-statusbar.md` | S-01 | 中 |
| 24 | `spec/24-tabbar.md` | S-02 | 中 |
| 25 | `spec/25-workstation-layout.md` | S-03 ~ S-05 | 大 |
| 26 | `spec/26-crash-recovery.md` | T-01 ~ T-08 | 大 |
| 27 | `spec/27-safe-mode.md` | T-03 | 中 |
| 28 | `spec/28-perf-budget.md` | T-06 | 中 |
| 29 | `spec/29-acceptance-matrix.md` | T-10 / X-12 | 中（表格为主） |

---

# 8. 对其他 Part 的交接

- **Part3a（Hub / T01 编辑器 / T02 Hub 布局）**：
  - 承接 S-09（Hub 布局基调）
  - 处理冲突 #9（图片进入规则）
  - 处理 T02-05 / T02-15 的 Hub 引导版细节（本文 S-13 已裁决总路径）
- **Part3c（Settings / T07 / 数据模型 / 导出）**：
  - 承接 T-09（DB 迁移 runner 实现细节）
  - 承接 Q-03（Tauri File Bridge 与 Settings 监控文件夹入口联动）
  - 承接 T-05（ActivityLog 查看器 UI）
- **Part4（路线图 / 实施）**：
  - 本文给出 12 个新 Spec 清单 + 关联的 Task 拆分建议

---

# 9. 决策统计

- **总决策数**: **50**（Q-01 ~ Q-12 = 12 + R-01 ~ R-14 = 14 + S-01 ~ S-14 = 14 + T-01 ~ T-10 = 10）
- **已解决冲突**: **7**（#1 ~ #7）
- **交接冲突**: **3**（#8 Part3a 认知差、#9 Part3a 图片规则、#10 跨 Part 性能协同）
- **新增 Spec 文件**: **12**（18-29）
- **硬约束条目估算**: ~150
- **落地点（代码 / 配置路径）估算**: ~80

---

# 完

> 本文件规范了 InkForge v2.1 **Tauri 桌面端能力 / 视觉系统 / 布局导航 / 崩溃恢复**四域的全部可执行决策，与 Part3a（Hub/编辑器）、Part3c（Settings/数据/导出）、Part4（路线图）协同构成完整 v2.1 决策集。
