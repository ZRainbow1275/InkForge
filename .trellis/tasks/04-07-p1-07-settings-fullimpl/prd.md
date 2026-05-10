# Settings 全量实装 (7 Tab 完全功能化)

## 规格参考
- `prompts/0327/07-settings-full-spec.md` (完整规范, 1313 行)

## 背景
SettingsView.vue 7 个 Tab UI 框架已搭建，但多数功能是"有 UI 无功能"或缺少完整交互。

## 当前基线差距
- ✅ 7 Tab 框架存在
- ✅ Appearance/Editor/Export/AI/Data 已从“壳层 UI”进入真实绑定状态
- ⚠️ Shortcuts 已具备搜索、录制、冲突检测、单项/全量重置，但 `33` 条完整覆盖仍需逐项复核
- ⚠️ Advanced 能力已部分融入现有 Settings 结构，尚未完全达到此 PRD 设想的独立完整面板
- ✅ `ShortcutInput.vue` 已存在并接入快捷键录制链路
- ✅ `useFeatureFlag.ts` 已存在
- ✅ `http-proxy.ts` 已存在

## 2026-04-21 当前实现真相
- `stores/settings.ts` 已成为 settings 主链的单一真相源，包含 `editorMode`、`editorWidth`、feature flags、proxy、shortcuts 与 reset 能力。
- `SettingsView.vue` 当前保持现有 7 个 tab，不做大重构，但编辑器模式、版心宽度、快捷键、feature flags 与 proxy 配置都已经进入真实 UI 链路。
- `ShortcutInput.vue` 已支持快捷键录制、浏览器保留组合键提示、与现有绑定冲突检测、disabled 状态。
- 本轮延续的是“增强现有 Settings 设计语言”的路线，而不是把所有 0420 构想一次性重排为全新信息架构。

## Requirements

### 1. Appearance Tab 增强
- 自定义主色: 颜色输入框 (hex) + 预设色板 (6 色)
- 主题预览卡片: 三个小卡片 (light/dark/system) 实时预览效果
- 字体预览文本: 选中字体后实时显示 "The quick brown fox..."

### 2. Editor Tab 增强
- 编辑器宽度选择器: 4 个 pill 按钮 (narrow 640px / medium 768px / wide 960px / full 100%)
- 编辑模式选择器: 2 个 pill 按钮 (Typora / Source)
- Settings Schema 更新 `editorMode` + `editorWidth` (与 01 任务协同)

### 3. Export Tab 增强
- 平台预览说明: 每个平台一行说明文字
- 自定义 CSS 编辑器: CodeMirror textarea (高度 120px)
- 导出历史: 最近 10 条导出记录
- 一键复制: 复制导出的 HTML

### 4. AI Tab 增强
- API Key 显示切换: Eye/EyeOff 图标按钮
- Provider 说明: 每个 Provider 下方一行说明
- 模型下拉: 按 Provider 筛选可选模型
- 系统提示词: textarea (高度 80px)
- 连接测试按钮: 发送 ping 请求验证配置

### 5. Data Tab 增强
- 存储使用进度条: IndexedDB 使用量可视化
- 导入进度条: 大文件导入时显示进度
- 自动备份: toggle + 间隔 (分钟) + 最大数量 + 位置
- 危险操作: 输入确认 ("DELETE" 文字确认)

### 6. Shortcuts Tab (重点)
- 33 条按 5 组分组显示 (格式化/标题/块级/编辑/视图)
- 搜索过滤: 按名称/快捷键搜索
- **ShortcutInput.vue** 组件:
  - 点击进入录制模式
  - 监听 keydown 组合键
  - 显示 "按下快捷键..." 提示
  - 冲突检测 (与其他快捷键/浏览器默认冲突)
  - 单项重置 / 全部重置
- `DEFAULT_SHORTCUTS` 对象更新为 33 条

### 7. Advanced Tab
6 项功能:
1. **日志级别**: debug/info/warn/error 下拉选择 → 绑定 `services/error.ts` 的 `setLogLevel`
2. **Feature Flags**: 4 个 toggle (markdown-hints / multi-tab / ai-autocomplete / performance-metrics)
   - 新建 `composables/useFeatureFlag.ts`
3. **代理设置**: 完整表单 (enabled/protocol/host/port/username/password)
   - 新建 `services/http-proxy.ts`
4. **缓存管理**: 浏览器缓存大小 / 预览缓存 / SW 状态 + 清除按钮
5. **开发者工具**: Dexie 版本 / 数据库记录数 / TipTap 状态 / 编辑器节点数 + 导出调试 JSON
6. **性能监控**: FPS / 保存延迟 / IDB 延迟 / 内存 (仅 performance-metrics flag 启用时显示)

## Acceptance Criteria
- [ ] 7 个 Tab 全部功能可用
- [ ] Shortcuts Tab 33 条分组 + 搜索 + 录制 + 冲突检测
- [ ] ShortcutInput 组件键盘录制正常
- [ ] Advanced Tab 6 项功能正常
- [ ] Feature Flags 控制对应功能
- [ ] `cd inkforge && npx vue-tsc --noEmit` 零错误

## 验收备注
- 截至 `2026-04-21`，Settings 主链已经明显超出“只有 UI 无功能”的状态，但由于本轮没有拿到统一 `vue-tsc` 复验，且 33 条快捷键与 Advanced 全量项尚未逐项点验，因此这里继续保留待验收口径。

## 2026-04-25 Runtime hardening note
- Data tab storage diagnostics now read real `StorageManager.estimate()`, `localStorage`, Dexie table counts, Cache Storage buckets, Service Worker registration state, and preview object URL cache count from the running browser instead of placeholder values.
- Auto backup controls now feed the real version manager path: `SettingsView.vue` edits `settings.data.autoBackup`, `backupInterval`, and `maxBackups`; `VersionPanel.vue` forwards sanitized values into `useVersionManager`; auto snapshots are persisted through `contentRepository.update(...)` and auto-labelled versions are pruned by the configured retention limit.
- Advanced diagnostics are folded into the existing About tab rather than adding an eighth tab, preserving the current 7-tab Settings structure. Runtime log level is backed by `settings.advanced.logLevel` and synchronized with `services/error.ts` through `setLogLevel`.
- Additional defensive guards were added for empty numeric inputs, invalid auto snapshot intervals, partial runtime diagnostic failures, Cache Storage cleanup failures, and debug JSON export credential leakage. These changes preserve existing functionality and only harden the real runtime path.
- Local verification passed a narrow TypeScript syntax/transpile check for the changed frontend files. Full `pnpm -C D:/Desktop/Inkforge/inkforge exec vue-tsc --noEmit` and `pnpm -C D:/Desktop/Inkforge/inkforge build` remain blocked in the current sandbox because Node cannot read `entities/dist/commonjs/package.json`; an elevated read proved the file contains `{ "type": "commonjs" }`, but the elevated full typecheck request was rejected by the local approval service. Do not mark this task complete until the full guard is rerun successfully outside that ACL failure.

## 2026-04-29 Completion note

This task is now treated as completed for the current seven-tab Settings architecture, without adding an eighth tab or deleting existing modules. The implementation keeps the existing design language and wires the Settings surface to real stores/services instead of mock data.

Completed capabilities:
- SettingsRegistry is the single searchable registry for the Settings page, including metadata, tab anchors, aliases, scope, and reset grouping.
- Settings search supports cross-tab matching, tab switching, scroll-to-anchor, and visible highlight for the selected registry item.
- Settings schema version is v2 and rollback snapshots are persisted through the Settings store. Tab reset and full reset create rollback points.
- Appearance, Editor, Export, AI, Data, Shortcuts, and About remain the seven visible tabs and are backed by real settings state.
- Export supports custom CSS, HTML preview copy through the real platform conversion path, and export history recording. Task-list checkbox export rendering no longer uses pictographic checkbox glyphs.
- AI supports provider/model binding, system prompt persistence, real connection-test timestamp recording, and existing key visibility controls.
- Data/About diagnostics use real browser StorageManager, Dexie, Cache Storage, Service Worker, runtime settings version, and migration snapshots.
- Shortcuts currently expose 38 definitions across formatting, headings, blocks, editing, and view groups, exceeding the original 33-entry minimum while preserving existing shortcut functionality.
- Advanced functions remain folded into the existing seven-tab layout through settings.advanced, About diagnostics, feature flags, proxy settings, log level, cache/runtime diagnostics, and performance visibility.

Verification passed on 2026-04-29:
- pnpm exec eslint src --ext .ts,.tsx,.vue --quiet
- pnpm exec vue-tsc --noEmit
- pnpm build
- SettingsView.vue script/template compile check with @vue/compiler-sfc
- git diff --check for the touched frontend and Settings files
- touched-file Emoji scan

Known non-blocking note:
- Vite still reports the existing chunk-size warning for large bundles. The build succeeds and this task did not attempt a broad chunking refactor.
