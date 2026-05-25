# preset-style-tab-differentiation

## Goal

让 微信 / 小红书 / 知乎 三个 platform tab 切换 preset 时**视觉差异真实可见且正确无错位**，把 05-23 preset typography overhaul 没落实的部分补完。完整范围：A 修 bug + B 架构接通 + C wechat preset 设计加强 + D 自托管 CJK 字体。

## Research Findings

详见 [`research/codebase-gap-analysis.md`](research/codebase-gap-analysis.md) + matrix-bot 实测：

### A. **[CRITICAL] xhs / zhihu preset 切换 off-by-one**
chip active-class 与渲染 `data-preset` / mock class 不同步，渲染延迟一帧（看到上一个 preset 样式）。受影响：5 个 xhs + 3 个 zhihu。wechat 路径不受影响。

### B. **[HIGH] xhs/zhihu mock 完全忽略 `preset.previewCSS`**
xiaohongshu-mock.ts:124-199 + zhihu-mock.ts:119-157 只读硬编码 PRESET_TOKENS（primaryColor + fontFamily + background）。themes.ts 中 5 xhs `#xhs-note{}` + 3 zhihu `#zhihu-answer{}` block 是 dead code。

### C. **[MEDIUM] wechat preset 间样式差异化弱**
实测 wechat thesis vs report 视觉无法分辨（同 35.7px serif h1，同 #2A2A2A 正文色）。仅 elegant 显著（蓝色标题）。12 preset 底层 schema 完整，但 visual hook 设计太薄。

### D. **[INFRA] woff2 字体未 ship**
public/fonts/ 仅 `.gitkeep` + manifest（13 entries 全 `shipped: false`）。字体维度的差异化完全失效。环境已就绪（Python 3.12, fonttools 4.51, pyftsubset, curl）。

## Scope (Full)

**纳入**: A + B + C + D 全部。  
**排除**:
- 跨 platform fallback warn（findings E）— 留 future
- preset 数量变化 / 改 id
- inspector 卡 UI 重排
- 单元测试新增（仅看回归）
- 主题暗色模式适配

## Implementation Plan — 4 PR

### PR P1 (A) — fix preset off-by-one bug
**Files**: `inkforge/src/composables/usePreviewRenderer.ts` + 可能 inspector chip handler in `WorkstationView.vue`。

**Diagnose**:
- usePreviewRenderer.ts:280-289 watch list 用 `[body, platform, JSON.stringify(getExportSettings()), JSON.stringify(getAppearance())]`。同 tick 内 platform 改 + settings.presetId 改时，stringified key 用旧 platform 渲染。
- chip click handler 调 store mutation — 看是否 sync。

**Fix 候选**:
- 把 platform 嵌入 getExportSettings 的 stringify（让 platform 变化也触发完整 dedupe key 重算）
- 或：watch 的 source 改为 computed 合并 input
- 或：用 `nextTick` 同步重排 watcher 触发

**AC**:
- xhs 5 preset + zhihu 3 preset 每次点击立即看到对应样式，no off-by-one
- wechat 不受影响

### PR P2 (D) — ship 13 woff2 CJK + Latin webfonts
**Files**: `inkforge/public/fonts/*.woff2`（13 个）+ `manifest.json` 更新 + `inkforge/src/main.ts` 或新增 `inkforge/src/styles/fonts.css` 注入 `@font-face` 声明。

**Steps**:
1. curl 下载 13 字体源（GitHub releases / Google Fonts mirror）到 tmp dir
2. pyftsubset 各 font 到 `inkforge/public/fonts/<name>.woff2`，按 manifest unicode 范围
3. 更新 manifest.json 各 entry 的 `shipped: true` + 实际 size
4. 注入 `@font-face` CSS（全局 face 声明，preset CSS 里直接引用 family）

**预算**:
- 单 font subset ≤ 2.5 MB，总 ≤ 12 MB
- 入 repo binary（用户已同意）
- 工作流：循环 13 次 curl + subset

**AC**:
- `inkforge/public/fonts/` 含 13 woff2 文件，`shipped: true`
- `node scripts/font-subset.mjs --check` 全 OK
- 浏览器加载 wechat preset 看到 Source Han Serif（开 DevTools Network）

### PR P3 (B) — xhs/zhihu mock 接入 preset.previewCSS
**Files**: `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts` + `zhihu-mock.ts` + 调用方 `usePreviewRenderer.ts`。

**Approach**:
- mock 签名扩展：增加 `themeCSS?: string` 参数
- mock template 头部注入 `<style>{themeCSS}</style>`，scope 到 `.xhs-mock` / `.zhihu-mock` container
- 调用方在 xhs/zhihu 分支：`getPresetById(presetId)?.previewCSS` → 传入
- 硬编码 PRESET_TOKENS 保留为 fallback（presetId 不识别时）

**AC**:
- xhs 5 preset 间 preview 字体/装饰/排版有可见差异（不止颜色）
- zhihu 3 preset 同上
- regression: 用 P2 的字体后 wechat preset 仍正确（如 D 已 done）

### PR P4 (C) — wechat preset visual identity deepening
**Files**: `inkforge/src/services/export/themes.ts`（12 preset CSS）+ 可能 `wechat.ts` decorate hooks。

**Goal**: 12 preset 间能一眼分辨。每 preset 至少有 3 个差异维度：字体（衬线/无衬线/手写）+ 色彩动机 + 装饰元素（drop cap / 标题下划线变体 / 引号符号 / 段间分隔）。

**Persona 分组（PRD 05-23 已定）**:
- 学术 (thesis/legal/report): 衬线极简，0-1 装饰，靠字体+留白
- 商业 (commentary/aigc): 几何小装饰，理性色块
- 生活 (notes/life/elegant): 富装饰，drop cap + ornament hr + 大引号
- 创意 (meme/code/news): 实验型，破格排版

**AC**:
- matrix-bot 重抓 12 wechat preset：任意两个 preset 视觉对比能在 5 秒内辨识差异（至少 2 维度差异）
- pixel diff vs 当前基线 > 25%（证明真的改了）
- export path 不受影响（exportCSS 不动 / 改 decorate 不影响 juice 兼容）

## Acceptance Criteria (整体)

- [ ] A: xhs/zhihu chip click → 渲染零延迟
- [ ] B: xhs/zhihu preset 间字体/装饰/排版差异可见
- [ ] C: wechat 12 preset 任意两两可分辨
- [ ] D: 13 woff2 ship + @font-face 生效
- [ ] `pnpm typecheck` + `pnpm lint` 绿
- [ ] 现有 tests (`usePreviewRenderer.test.ts`, `platform-export-rendering.test.ts`) 仍绿
- [ ] gitnexus_detect_changes risk ≤ MEDIUM
- [ ] 截图 evidence: 4 PR 各自前后对比

## Out of Scope

- 跨 platform fallback warn
- preset 数量/id 改动
- inspector 卡 UI 改动
- 暗色模式

## Technical Notes

- usePreviewRenderer watch: `inkforge/src/composables/usePreviewRenderer.ts:280-289`
- xhs mock: `inkforge/src/services/export/preview-fidelity/xiaohongshu-mock.ts:124-199`
- zhihu mock: `inkforge/src/services/export/preview-fidelity/zhihu-mock.ts:119-157`
- themes.ts presets: `inkforge/src/services/export/themes.ts` (1032 lines, 12 ids)
- font script: `inkforge/scripts/font-subset.mjs`
- font manifest: `inkforge/public/fonts/manifest.json`
- getPresetById: `inkforge/src/services/export/index.ts`
- getPlatformPresets: `inkforge/src/services/export/index.ts:434`
