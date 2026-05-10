# Spec 40 — DevPanel（开发者面板）

> **Spec ID**: 40  
> **范围**: 开发者面板（TipTap JSON / PM state / Store viewer / 性能面板 / 事件流实时 / IndexedDB Inspector / Network Diagnostics）、隐藏激活、生产构建保留。  
> **关联**: R-03, T-04, T07-04, T07-03, X-05  
> **上游依赖**: 33-diagnostic-logging-spec（Event Stream 订阅 logger）、17-crash-recovery-spec（Integrity 结果展示）

---

## 1. 定位（Positioning）

DevPanel 是 **InkForge 领域特有**的开发与诊断工具，不是 Vue DevTools 替代。它面向：

1. 核心开发者调试 TipTap / ProseMirror 内部态
2. 高级用户（`R-03 D` 补充）定位扩展出错 / 性能瓶颈
3. 用户提交 bug 时与 DiagnosticPackage 协同提供证据

与 Vue DevTools 的关系：
- Vue DevTools 看 Vue 组件树、props、computed，这些 InkForge 不重复提供。
- DevPanel 看 InkForge 业务态：文档内容、命令执行、Store 实时状态、IDB 数据。
- Vue DevTools 仅开发构建可用；DevPanel **生产构建保留**（隐藏激活）。

---

## 2. 激活路径（Activation）

### 2.1 开关

| 入口 | 行为 |
|-----|-----|
| Settings > Advanced > Developer Mode | 持久化开启；激活后 Ctrl+Shift+D 可切换面板 |
| 连按 `Ctrl+Shift+D` 三次（500ms 内） | 本次会话临时开启；刷新后重置（除非 Settings 已 ON） |
| 启动参数 `--dev-panel` | Tauri argv 检测，强制开启 |
| Command Palette: `Developer: Toggle Panel` | 已开启时快捷切换 |

### 2.2 快捷键

| 快捷键 | 作用 |
|-------|-----|
| `Ctrl+Shift+D`（三连） | 开启 Developer Mode 并显示面板 |
| `Ctrl+Shift+D` | 开启后切换面板显隐 |
| `Ctrl+Shift+I` | DevPanel 内部 Tab 切换到 Inspector |
| `Ctrl+\` | 冲突时降级为 `Ctrl+Shift+I`（T-04 原文） |
| `Esc` | 关闭面板（面板内输入框除外） |

### 2.3 面板打开动作记录

每次 DevPanel 打开 / 关闭写 `dev.panel.open` / `dev.panel.close`（level=info, module=dev），便于排查用户反馈。

---

## 3. 面板分区（Layout）

### 3.1 整体形态

- **独立底部 drawer**（T-04 定义）
- 默认高度 40vh，可拖拽 20vh ~ 80vh
- 最右侧按钮：固定（drawer）/ 浮窗模式 / 折叠
- `z-debug = 9000`（见 R-06 附录），位于所有业务 UI 之上但低于 modal
- 暗色主题独立（不跟随 ThemeEngine），避免被自定义主题破坏

### 3.2 Tab 导航

7 个 Tab，禁止运行时新增：

| Tab | Icon | 说明 |
|----|------|-----|
| Editor | file-code | TipTap JSON + Marks + Selection |
| ProseMirror | share-2 | PM raw doc + plugin state |
| Stores | database | 所有 Pinia stores 实时 |
| Performance | activity | FPS / 内存 / 长任务 / perf 采样 |
| Events | zap | 实时日志流（订阅 ActivityLogger） |
| IndexedDB | hard-drive | 表 / 索引 / 数据查询 |
| Network | network | Tauri IPC + HTTP 请求统计 |

### 3.3 响应式

- 最小宽度 960px，<960 时 Tab 切换为下拉菜单。
- Tauri 小窗口下强制显示精简模式，仅 Editor / Events / IndexedDB。

---

## 4. TipTap JSON 查看器（Editor Tab）

### 4.1 内容

- **Current JSON**：当前活跃编辑器 `editor.getJSON()`，以树形折叠视图展示（vue-json-pretty 或自研）
- **Active Marks**：当前光标位置 marks 列表
- **Selection**：`{from, to, anchor, head, $from, $to}` 明细
- **Scroll**：`scrollTop / scrollHeight / viewport`
- **Characters / Words**：实时统计

### 4.2 交互

- 只读展示（不允许通过 DevPanel 修改文档，以免绕过业务校验）
- 「Copy JSON」按钮：复制到剪贴板
- 「Download JSON」按钮：下载为 `<articleId>-<timestamp>.json`
- 节流：每 300ms 更新一次（输入高频时避免卡顿）

### 4.3 大文档保护

- JSON > 1MB 时默认折叠到根节点，用户手动展开
- JSON > 5MB 时禁用自动更新，改为手动「Refresh」按钮

---

## 5. ProseMirror State 可视化（ProseMirror Tab）

### 5.1 展示内容

| 区块 | 内容 |
|-----|-----|
| Document | `state.doc.toJSON()` 原始结构 |
| Plugins | 所有已注册 plugin 列表、key、spec.props 的键名 |
| Plugin State | 点击某 plugin 展开 `plugin.getState(editor.state)` |
| Transaction Log | 最近 50 个 `tr`（类型 + doc size 变化 + selection 变化） |
| Decorations | 当前 decorationSet 列表 |

### 5.2 交互

- Plugin state 可导出 JSON
- Transaction Log 可暂停 / 清空 / 按类型过滤
- 点击某 tr 展示详细变化（使用 diff 视图，借助 `diff-match-patch`）

### 5.3 性能

- Plugin 订阅采用 lazy：Tab 激活时才挂接监听
- Tab 离开时解除监听

---

## 6. Pinia Store Viewer（Stores Tab）

### 6.1 内容

- 左侧：所有已注册 store 列表（按字母排序）
- 右侧：选中 store 的 `state / getters` 树形视图

### 6.2 交互

- **编辑**（T-04 原文允许）：state 字段可双击修改（仅基础类型），提交时需二次确认
- 修改记录写 `dev.store.patch`（level=warn, module=dev），含 storeId / path / oldValue / newValue
- **历史**：右上角切换「History」Tab，展示最近 50 次 patch（来自业务 + DevPanel）
- **导出**：全部 state 一次性 dump JSON

### 6.3 安全

- 编辑 store 不会绕过业务 watchers，但用户可能引起异常 → 所有修改进入 ActivityLog，并在 SafeMode 下禁用编辑功能

---

## 7. 性能实时面板（Performance Tab）

### 7.1 展示

| 区块 | 更新频率 | 内容 |
|-----|--------|-----|
| FPS | 每 100ms | 环形缓冲 60s，折线图 |
| Memory | 每 5s | `performance.memory`（jsHeap / total / limit），折线图 |
| Long Tasks | 实时 | PerformanceObserver('longtask') 最近 50 条 |
| Perf Budget | 最近 5min | 读取 `perf` 通道，按 metric 汇总：均值 / p95 / 越界次数 |
| Render Profile | 手动 | 「Start / Stop」按钮采样 React-like profile（使用 `performance.mark`） |
| Lighthouse 提示 | 静态 | 显示当前构建 Lighthouse 分数（CI 注入） |

### 7.2 内存泄漏提示

内存连续 5 个采样点递增 + 超过 limit 的 80% → Tab 顶部红条提示「Memory pressure」。

### 7.3 与 DiagnosticPackage 联动

「Export Performance Snapshot」按钮 → 导出最近 24h perf 通道数据 + 当前 FPS / memory snapshot 为 JSON。

---

## 8. 事件流实时（Events Tab）

### 8.1 数据源

- **ActivityLogger EventBus** `log:written` 订阅
- **editor.onUpdate** / `editor.onTransaction` / `editor.onSelectionUpdate` 监听
- **command.onDispatch**（来自命令注册表中枢）
- **Tauri IPC events**（订阅 tauri `listen('*')`）

### 8.2 UI

- 左列：过滤器（level / module / event / source）
- 中列：事件流表格（timestamp / level / module / event / summary）
- 右列：选中事件的详情 JSON

### 8.3 功能

- 暂停 / 继续 / 清空 / 限速
- 正则过滤 event name
- 双击事件 pin 到顶部（稍后 review）
- 导出当前过滤后事件为 JSONL
- 默认限速 200 条 / 秒；超出改为采样 10%

---

## 9. IndexedDB Inspector（IndexedDB Tab）

### 9.1 功能

| 区块 | 交互 |
|-----|------|
| 表列表 | 左侧 tree；显示每表 row count / 估算大小 |
| 数据浏览 | 分页 50 / page；列排序；搜索关键字 |
| 索引浏览 | 点击索引名展示对应结果集 |
| 查询 | 上方查询栏支持 `table.where(field).equals(value)` 表达式（沙盒 eval）|
| 单条删除 | 行内删除按钮（二次确认） |
| 单条编辑 | 行内编辑（仅基础字段），写回后 refresh |
| 导出表 | 整表 JSON 导出 |

### 9.2 安全

- 删除 / 编辑记录 `dev.idb.patch`（level=warn）
- SafeMode 下禁用删除 / 编辑，仅允许浏览
- 敏感表（`audit_logs` / `recovery_journal`）禁用删除编辑，仅浏览 + 导出

### 9.3 与 Spec 17 联动

提供「跳转到 Data Health」「运行完整性检查」按钮，触发 Spec 17 的 on-demand integrity run。

---

## 10. Network Diagnostics（Network Tab）

### 10.1 内容

| 区块 | 内容 |
|-----|-----|
| Tauri IPC | 最近 100 次 invoke（命令 / 参数 / 响应 / 耗时 / 错误） |
| HTTP | 若 Provider 层使用 fetch / Tauri HTTP：请求列表（method / url / status / size / 耗时） |
| WebSocket | 协同 / Provider 连接：连接状态 / 最近 50 条消息 |

### 10.2 采样

- IPC 调用通过 `src/services/tauri-ipc/logger.ts` 注入监听，生产构建也启用但不记录 body（隐私）
- HTTP 通过 fetch 包装器：`createLoggedFetch()`
- DevPanel 关闭时监听仍保留，但数据只保留在环形缓冲内存

### 10.3 隐私

- URL query 中的 token 自动脱敏
- 请求 body 仅显示长度 + 摘要，完整 body 需手动「Reveal」按钮（二次确认 + 写 audit）

---

## 11. 生产保留策略（Production Retention）

### 11.1 原则（T-04 硬约束）

- 生产构建**保留 DevPanel 代码**，不做 tree-shake。
- 默认不加载；首次激活时通过 **动态 import** 加载（`import('./dev-panel')`）。
- 首包不包含 DevPanel chunk；独立 `dev-panel-[hash].js`。

### 11.2 性能约束

DevPanel 激活运行时：
- CPU 占用 <5%
- 内存占用 <50MB
- 不影响首屏加载（未激活时 0 成本）

### 11.3 大小预算

- DevPanel chunk < 300KB gzipped
- 子 Tab lazy-loaded：每个 Tab 独立 chunk，< 80KB gzipped

### 11.4 版本匹配

- DevPanel 内显示当前 appVersion / gitSha（build-time 注入）
- 生产构建中 DevPanel 源码 map 默认不包含，可通过 `--enable-devpanel-sourcemap` 构建开关启用

---

## 12. 测试矩阵

### 12.1 单元（Vitest）

| 项目 | 正向 | 失败 | 恢复 | 边界 |
|-----|-----|-----|-----|-----|
| 三连激活 | 500ms 内三次触发 | 超时不激活 | — | 连续 10 次 |
| Tab 切换 | 各 Tab 渲染 | 异常 Tab 不崩 | 错误边界 | 快速切换 |
| Editor JSON 更新节流 | 300ms | 高频不丢最后一帧 | — | 5MB 文档禁自动 |
| Store viewer 编辑 | 修改提交 | 非法 path 拒绝 | Undo | 深层 object |
| IDB 查询沙盒 | 合法表达式 | eval 注入拒绝 | — | 长查询 |
| Events 限速 | 200/s 通过 | 超限采样 10% | — | 突发 1000/s |
| 生产 import 懒加载 | 首次 import | 网络失败 | 重试 | 离线 |

### 12.2 Playwright E2E

| 场景 | 步骤 | 预期 |
|-----|-----|-----|
| 激活 DevPanel | Settings 开关 ON → Ctrl+Shift+D | 面板出现 |
| 查看 TipTap JSON | 输入内容 → Editor Tab | JSON 实时更新 |
| 导出 Perf Snapshot | Performance Tab → Export | zip 下载 |
| IDB 删除 | Inspector → 删除行 | 二次确认 + 删除成功 |
| SafeMode 禁用删除 | 进 SafeMode → IDB Tab | 删除按钮灰 |
| 事件流订阅 | 触发多种事件 | Events Tab 实时显示 |
| 生产构建激活 | 使用 dist 构建 | DevPanel chunk 仅激活后加载 |

### 12.3 artifacts/40

```
artifacts/40/
├── positive/
│   ├── activation.gif
│   ├── editor-tab.png
│   └── events-stream.png
├── failure/
│   └── idb-delete-denied-safemode.png
├── recovery/
│   └── tab-error-boundary.png
└── boundary/
    ├── 5mb-json-throttle.json
    └── events-1000-per-sec.json
```

---

## 13. 验收矩阵 + 权威来源登记表

### 13.1 验收矩阵

| 编号 | 验收点 | 自动化 | 证据 |
|-----|-------|-------|-----|
| AC-40-01 | 三种激活路径 | E2E | positive |
| AC-40-02 | 7 个 Tab 全渲染 | E2E | positive |
| AC-40-03 | Editor Tab JSON 准确 | Vitest | unit |
| AC-40-04 | ProseMirror plugin state | Vitest | unit |
| AC-40-05 | Store 编辑写 ActivityLog | E2E | unit+E2E |
| AC-40-06 | Performance FPS / memory | E2E | boundary |
| AC-40-07 | Events 限速 200/s | Vitest | boundary |
| AC-40-08 | IDB 查询沙盒安全 | Vitest | unit |
| AC-40-09 | 敏感表禁删 | Vitest | unit |
| AC-40-10 | IPC / HTTP 脱敏 | Vitest | unit |
| AC-40-11 | SafeMode 下 readonly | E2E | failure |
| AC-40-12 | 生产 chunk <300KB | CI bundle check | report |
| AC-40-13 | 未激活时 0 成本 | Benchmark | perf |
| AC-40-14 | 激活时 CPU<5%/内存<50MB | Benchmark | perf |

### 13.2 权威来源登记表

| 编号 | 字段 / 结论 | 来源 | 位置 |
|-----|-----------|-----|-----|
| S-40-01 | 隐藏激活 Settings + 三连快捷键 | T-04 | part3b §T-04 |
| S-40-02 | 生产构建保留 | T-04 / R-03 D | part3b §T-04 |
| S-40-03 | 动态 import 分割 | T-04 硬约束 | part3b §T-04 |
| S-40-04 | 7 个 Tab 定义 | T-04 | part3b §T-04 |
| S-40-05 | 性能预算 <5%CPU/<50MB | T-04 硬约束 | part3b §T-04 |
| S-40-06 | z-debug 9000 | part3b §R-06 附录 | part3b §R-06 |
| S-40-07 | TipTap JSON / PM state / Store / Perf / Events / IDB | R-03 D 决策含义 | 03-enhancement R-03 |
| S-40-08 | 事件流订阅 ActivityLogger | Spec 33 §4 | 33-diagnostic-logging §4 |
| S-40-09 | IDB 查询 T07-03 C | 00-task-roadmap §3 | T07-04 决策 |
| S-40-10 | SafeMode 下 readonly | T-03 | part3b §T-03 |

### 13.3 上下游关联

- **上游**：33-diagnostic-logging（订阅 logger 事件）、17-crash-recovery（Integrity / Backups 跳转）、29-command-registry（Event Stream 订阅命令流）
- **下游**：27-safe-mode（SafeMode 禁用开关）
- **平行**：Settings > Advanced 主面板（09-settings）

---

## 14. 目录落地

```
src/views/dev/
├── DevPanel.vue
├── DevPanelShell.vue
├── tabs/
│   ├── EditorTab.vue
│   ├── ProseMirrorTab.vue
│   ├── StoresTab.vue
│   ├── PerformanceTab.vue
│   ├── EventsTab.vue
│   ├── IndexedDBTab.vue
│   └── NetworkTab.vue
└── widgets/
    ├── JsonTree.vue
    ├── FpsChart.vue
    ├── MemoryChart.vue
    └── LogRow.vue

src/services/dev-tools/
├── activator.ts           # 三连激活逻辑
├── tiptap-inspector.ts
├── pm-inspector.ts
├── store-inspector.ts
├── perf-inspector.ts
├── events-bus.ts
├── idb-inspector.ts
└── net-inspector.ts

src/services/tauri-ipc/
└── logger.ts              # IPC wrapping

build/
└── devpanel-chunk.ts      # 动态 import 入口
```

---

**Spec 40 完**

## 2026-05-02 Baseline Implementation Note

Baseline status: Pass for the compatible production-retained DevPanel baseline; full Spec 40 remains partially pending for the larger edit/delete/writeback and performance benchmark matrix.

Accepted baseline coverage:
- App root lazy-loads `src/views/dev/DevPanel.vue` through `defineAsyncComponent`; normal startup does not mount or load the DevPanel chunk.
- Activation supports persistent Settings `advanced.developerMode`, `?dev-panel=1` / `?devPanel=1` startup force, and Ctrl+Shift+D triple-press session enablement.
- Command Palette command `dev.togglePanel` is registered and refuses to open until Developer Mode or session activation is enabled.
- DevPanel renders the fixed seven tabs: Editor, ProseMirror, Stores, Performance, Events, IndexedDB, and Network.
- Editor/ProseMirror tabs read the active TipTap editor through `registerActiveEditor`; unavailable state is explicit when no editor is active.
- Store tab reads real `pinia.state.value`; primitive patching requires `PATCH_STORE_STATE` confirmation and writes `dev.store.patch` through ActivityLogger.
- Events tab combines persisted ActivityLogger rows with a bounded in-memory DevTools event bus and 200/s sampling guardrail.
- IndexedDB tab reads real Dexie table summaries and paged sanitized rows; mutation remains disabled in baseline.
- Network diagnostics wrap `fetch` and shared `tauriInvoke`, retain bounded ring buffers, record sizes/status/duration, and redact URL query secrets and metadata.
- Settings > About contains the persistent Developer Mode control and panel open/close button.

Validation evidence:
- `pnpm exec vitest run src/services/dev-tools/dev-tools.test.ts` passed: 1 file, 7 tests.
- `pnpm exec vue-tsc --noEmit` passed.
- `pnpm exec eslint src --ext .ts,.tsx,.vue --quiet` passed.
- `pnpm exec vitest run` passed: 20 files, 144 tests.
- `pnpm build` passed and emitted independent `DevPanel-*.js` / `DevPanel-*.css` chunks; Vite reported only existing chunk-size and mixed dynamic/static import warnings.
- Chromium smoke on `http://127.0.0.1:3005/` verified normal startup has no `.dev-panel` and no loaded DevPanel script.
- Chromium smoke on `http://127.0.0.1:3005/?dev-panel=1` verified DevPanel visibility, all seven tabs, real Network capture, token redaction, and no leaked secret string.
- Chromium smoke on `http://127.0.0.1:3005/settings?tab=about` verified the `about.devPanel` section, checkbox, open/close button, and 0 console errors after clearing the intentionally generated 404 from the network-capture probe.

Pending for full Spec 40 pass:
- Full IndexedDB row edit/delete/writeback with SafeMode rules and audit evidence.
- Floating panel mode and persisted drag-resize beyond baseline drawer height.
- ProseMirror diff view and decorations viewer.
- Direct Tauri IPC imports outside the shared `tauriInvoke` wrapper.
- Packaged Tauri validation, Playwright artifact capture, CPU/memory benchmark report, and full artifacts/40 matrix.
