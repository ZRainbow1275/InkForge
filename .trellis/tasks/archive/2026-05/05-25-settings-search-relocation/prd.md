# settings-search-relocation

## Goal

设置页左侧栏的"设置搜索"面板当前在 `<nav>` 下方（侧栏底部），位置尴尬。移到 `<nav>` 上方（侧栏顶部），使其立即可见且符合常见 sidebar-search 模式。

## Requirements

1. 移动 `.sv-settings-search-panel` DOM block (lines 2720-2758) 到 `<nav class="sv-nav">` 之前。
2. CSS: `.sv-settings-search-panel` 改 `margin-top: 14px` 为 `margin-bottom: 14px`（底部留间距与 nav 分开）。
3. 不改搜索功能逻辑、不改 nav 顺序。

## Acceptance Criteria

- [ ] 搜索框在侧栏顶部（nav 上方）
- [ ] 搜索功能正常（输入关键词 → 结果列表 → 点击跳转）
- [ ] 仅改 SettingsView.vue
- [ ] pnpm typecheck + lint 绿

## Out of Scope

搜索 UI 样式改动、搜索逻辑改动、nav 重排。

## Technical Notes

- SettingsView.vue: aside 内 nav(line ~2630) + search-panel(line 2720-2758)
- CSS: `.sv-settings-search-panel` line 6726
