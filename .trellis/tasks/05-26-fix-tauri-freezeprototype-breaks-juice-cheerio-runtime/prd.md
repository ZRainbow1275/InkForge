# fix: Tauri freezePrototype breaks juice/cheerio runtime in webview

## Goal

修复 Tauri 桌面壳里加载编辑器/新文章页面立即崩溃的 P0 bug。错误：
`Cannot assign to read only property 'toString' of object '#<Cheerio>'`。
浏览器（Chrome/Edge）无问题，只有 Tauri webview 命中。Bug 链路在 cheerio 1.0.0 内部，被 Tauri 注入的 prototype 冻结打中。

## What I already know

### 错误现场
- 截图：ErrorBoundary `App.vue:266 onErrorCaptured` 命中，`info = "native event handler"`
- 错误信息：`Cannot assign to read only property 'toString' of object '#<Cheerio>'`
- 触发：进入编辑器/新建/打开文章时立即崩

### 真因链路
1. Tauri `inkforge/src-tauri/tauri.conf.json:89` 启用 `"freezePrototype": true`
   - Tauri runtime 在 webview 加载时注入 `Object.freeze(Object.prototype)` / `Object.freeze(Array.prototype)` 等，意图防原型污染（XSS 加固）
   - 副作用：`Object.prototype.toString` 等成为 non-writable
2. cheerio 1.0.0 `dist/browser/cheerio.js:57`（**真正命中点**）：
   ```js
   Object.assign(Cheerio.prototype, Attributes, Traversing, Manipulation, Css, Forms, Extract);
   ```
   `Manipulation` 导出 `toString`。`Cheerio.prototype` 是 plain object，沿 prototype 链到 Object.prototype；当 Object.prototype.toString 被 Tauri 冻为 non-writable 时，写 `Cheerio.prototype.toString = X` 在 strict mode 下抛 TypeError。
   V8 报错对象 `#<Cheerio>` 即指 Cheerio.prototype（构造器标签）。
   该 `Object.assign` 在模块加载期执行 — 任何 import 链最终触达 cheerio（如 juice barrel）即触发，**不需要真正调 `juice()` 或 `cheerio.load()`**。
3. 仓库内任何 import 路径触达 `@/services/export` → 拉 `wechat.ts/zhihu.ts/xiaohongshu.ts` → `import juice from 'juice'` → juice 内部 `require('cheerio')` → cheerio 模块求值 → `Object.assign(Cheerio.prototype,...)` 抛错

### 影响面（research 终稿）
- **静态 import 引爆**（不是 click/runtime 触发）：5 个文件 import `@/services/export` barrel → 拉 `wechat.ts/zhihu.ts/xiaohongshu.ts` → `import juice from 'juice'` → cheerio 模块加载期 cheerio.js:57 立即抛
  - `views/WorkstationView.vue:26-30`
  - `views/PublishView.vue:14-21`
  - `views/SettingsView.vue:30`
  - `components/export/ExportModal.vue:7-14`
  - `components/cms/CMSTools.vue:7`
- 三大平台 production 导出全部受影响（juice 内联是必经环节）
- **同根因牵连的其他 dep**（仅 Approach A 才一次性化解）：mermaid 路径的 `lodash-es` / `dayjs` / `d3` / `cytoscape`（`.vite/deps` chunks 内同样 `.toString = ` 写入模式）
- **额外 Tauri parity 隐患**（不在本 task 修，列入 PR2 手测矩阵观察）：
  - `ClipboardItem` 在 `PublishView.vue:198-200`（Tauri 1.x 已知不稳）
  - CSP 同源 chunk 加载
  - `fetch` vs Tauri `invoke`（`wechat-publish.ts`）
  - `URL.createObjectURL`
  - localStorage origin = `tauri://localhost`
  - UA sniffing

### 关键约束
- Tauri 1.6（`@tauri-apps/cli ^1.6.0`、`tauri = "1.6"`）
- CSP 已锁死 `script-src 'self'`（`tauri.conf.json:88`），无外部 JS 执行通道
- pnpm overrides：`@tiptap/core@^2.27.2`、`@tiptap/pm@^2.27.2`
- juice 11.1.1 + cheerio 1.0.0（pnpm 解析）
- 本地应用，离线优先，无远端用户输入接口

### 已排除的路径
- 代码内没有 `\.toString\s*=` 显式赋值；问题在 cheerio 内部
- juice 自身 `lib/property.js:63` 只是 `Property.prototype.toString = function...` 模块加载期赋值，与本错无关
- 预览（preview）走 `wechat-mock` 不经 juice；但 barrel import 会拉 juice 模块求值（不会触发 cheerio.load）

## Assumptions (temporary)

- 关掉 `freezePrototype` 不会损失实质安全（CSP + 本地无 XSS 入口）。**需要 user 拍板**。
- 不需要升降级 juice/cheerio：cheerio 1.0.0 在原型未冻结的浏览器/Node 环境工作正常
- 不需要替换 juice：投入大，且对 wechat 渲染管线影响广

## Open Questions

1. （Blocking/Preference）修复路径选哪条？详见 `Feasible approaches`。
2. （Preference）验收是否要求 Tauri release build 也跑通（不仅 tauri:dev）？
3. （Derivable）启动期触发 juice 的具体调用栈 — user 提供 DevTools stack 可加速，否则我跑 vitest 复现。

## Requirements (evolving)

**核心要求**：全盘修复，不允许只补当下症状点（参见 user 反馈 / `feedback_full_sweep_fix.md`）。需要完整覆盖所有受"Tauri webview ↔ frozen-prototype"分歧影响的路径。

- [ ] Tauri webview 加载编辑器/新文章页面不再抛 "Cannot assign to read only property 'toString'"
- [ ] **三大平台导出全部路径在 Tauri 壳内可用**（不止微信，含小红书 + 知乎）：
  - `convertToWechat` / `convertToWechatWithStats` / `markdownToWechat` / `markdownToWechatWithStats` / `publishWechatDraft`
  - `convertToXhs` / 等价 xhs 路径
  - `convertToZhihu` / 等价 zhihu 路径
- [ ] **三大平台预览路径**（usePreviewRenderer 走 mock 渲染器）在 Tauri 壳内不崩
- [ ] **审计并报告**其他 dependency 是否潜在踩 frozen-prototype 地雷（mermaid / cytoscape / chevrotain / popperjs / vue runtime / dexie / dompurify / marked），列出"已验证安全"清单 + "存在风险但未实测"清单
- [ ] 浏览器（Chrome/Edge）回归不受影响
- [ ] 维持现有 CSP 强度（不动 `script-src 'self'` 等其他安全开关）

## Acceptance Criteria (evolving)

### 启动 / 编辑（基线）
- [ ] `npm run tauri:dev` 启动 → 进入编辑器 → 新建文章 0 报错
- [ ] 打开已有草稿、切换文章、跨平台切换 tab 全程 0 报错
- [ ] `tauri:build` 出 release 包后启动同样路径全程 0 报错

### 三平台导出全路径（user 选定）
- [ ] **微信**：编辑 markdown → 微信 tab 预览 → "复制平台输出" 成功 → clipboard 含已内联样式 HTML
- [ ] **微信**：ExportModal "全屏导出" 走 markdownToWechatWithStats 成功
- [ ] **小红书**：xhs tab 预览 + "复制平台输出" 成功（含图卡/标签/正文）
- [ ] **知乎**：zhihu tab 预览 + "复制平台输出" 成功（含 LaTeX/代码块/表格）

### 自动化覆盖
- [ ] 新增单测 `__tests__/frozen-prototype.test.ts`：
  - 主用例：仅 `Object.freeze(Object.prototype)`（精确 mirror Tauri 行为，per research/tauri-freezeprototype-semantics.md），动态 `import('@/services/export')` 不抛
  - 防御性用例（labeled "defense-in-depth"，非 Tauri 真实行为）：同时冻 Object/Array/Function.prototype，三平台 `convert*` 不抛
  - fixture：minimal markdown + 含表格/代码块/数学公式 rich markdown
- [ ] 现有 `platform-export-rendering.test.ts` + `pipeline-cross-platform.test.ts` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm run test` 全绿

### 文档 / 安全痕迹
- [ ] `tauri.conf.json` 修改记录在 commit message + 注释里写明原因
- [ ] 新增/更新 `SECURITY.md`（如有）或 README 安全章节，标注"freezePrototype 关闭的取舍"
- [ ] 同步记录到 `feedback_codex_mcp_defaults` 同级 memory：本次 Tauri 配置变更

## Definition of Done

- Tests 覆盖修复路径（jsdom/happy-dom + 模拟 Object.freeze 场景，或 e2e Tauri smoke）
- Lint / typecheck / CI 全绿
- `tauri.conf.json` 若改安全策略，README/CHANGELOG 标注
- 提交 PR 走 dev/visual-fixes，描述含 reproduction + before/after

## Out of Scope (explicit)

- 不重写 juice / 不替换为 esbuild-style CSS inliner
- 不升级 cheerio / juice 大版本（除非小补丁正好修复，则按需）
- 不修改其他 Tauri 安全开关（dangerousDisableAssetCspModification 等保持原值）
- 不改 export 流水线设计（仅修运行时崩溃，不重构）
- 审计中发现的"高风险 dep 但未实测复现"问题：**只列清单，不在本 task 内修**；列入后续 task

## Full Sweep Audit Plan

**目标**：确保把 Tauri webview vs 浏览器 parity 的"原型冻结"分歧吃干净，不留尾巴。

### A. 代码内 juice/cheerio 直接调用点（必须 100% 验证）
- `inkforge/src/services/export/wechat.ts:1324` — `juice(styledHtml, ...)`
- `inkforge/src/services/export/xiaohongshu.ts:622` — `juice(...)`
- `inkforge/src/services/export/zhihu.ts:538` — `juice(...)`
- 调用者矩阵（grep `convertToWechat|convertToXhs|convertToZhihu|markdownTo*` 结果）：
  - `views/PublishView.vue:151`
  - `views/WorkstationView.vue`（barrel import）
  - `components/cms/CMSTools.vue:91`
  - `components/export/ExportModal.vue:456, 630`
  - `services/export/index.ts:286`（platform dispatch）

### B. dependency 风险审计（grep 自动 + 手测复核）
按"`Object.assign(funcOrClassInstance, {toString,...})`"模式或"`.prototype.toString = `"模式扫：
- ✅ 已确认中招：`juice@11.1.1` ↔ `cheerio@1.0.0`
- ⚠️ 候选嫌疑（grep 中模式命中，需 Tauri 实跑验证）：
  - `mermaid@11.x` + `@mermaid-js/parser`
  - `cytoscape@3.33`
  - `@popperjs/core@2.11.8`
  - `chevrotain@12.0.0`（mermaid 依赖）
  - `@vue/compiler-vue2`（被某 dep 间接拉入？）
  - `confbox` / `@vitest/utils` / `@babel/types` — dev-only, 不影响 runtime
- ✅ 大概率安全：dompurify@3 / marked@15 / katex / lowlight / highlight.js / dexie / pinia / vue@3 / @tiptap/*（基于经验，仍 Tauri 跑一遍确认）

### C. 启动期触发栈
- 用 ErrorBoundary 增强 + 临时打开 `error.stack` 持久化到 localStorage（可选）
- 或：跑 vitest 用例 `should not throw under frozen prototype`，先复现再修

### D. 验证矩阵（手测脚本）
| # | 场景 | 期望 |
|---|------|------|
| 1 | tauri:dev 启动 + 新建文章 | 不崩 |
| 2 | tauri:dev + 打开已有草稿 | 不崩 |
| 3 | 切换 微信→小红书→知乎 tab | 不崩，预览正常 |
| 4 | 三平台各自"复制平台输出" | 成功且 clipboard 有内容 |
| 5 | ExportModal 全屏导出（含 publishWechatDraft） | 成功 |
| 6 | tauri:build release 复跑 #1-#5 | 全部不崩 |
| 7 | 浏览器 chrome 复跑 #1-#5 | 仍可用（回归） |

### E. 自动化测试增量
- `__tests__/frozen-prototype.test.ts`（新）：
  - 在 `beforeAll` 调 `Object.freeze(Object.prototype); Object.freeze(Array.prototype); Object.freeze(Function.prototype)`（happy-dom 环境）
  - 跑 `convertToWechat / convertToXhs / convertToZhihu` 各最小 fixture
  - 断言无抛出 + 输出 HTML 非空
- 现有 `platform-export-rendering.test.ts` / `pipeline-cross-platform.test.ts` 保持绿

## Feasible approaches

### Approach A: 关闭 `freezePrototype`（推荐）
**怎么做**：
- `tauri.conf.json:89` 改 `"freezePrototype": false`
- 加单测断言 `convertToWechat` 在 frozen-prototype-simulated env 下不抛（防回归）
- README/SECURITY.md 注明：依赖 CSP 作为主要 XSS 防线

**Pros**：
- 1 行 config 改动，立刻解决
- 不动 juice/cheerio，零回归面
- 配合现有 CSP 安全姿态足够（无外部 JS 入口、本地离线）

**Cons**：
- 丢"Object/Array.prototype 冻结"这一层加固。若未来引入第三方插件/远端脚本会风险上升
- Tauri 团队推荐 freezePrototype 启用，社区会问

### Approach B: 锁版本 / 切换 cheerio 实现
**怎么做**：
- 把 `cheerio` 锁到 0.22.x / 1.0.0-rc.10 等不在 `Object.assign(initialize, {toString})` 的版本
- 或 pnpm patch cheerio 1.0.0 `load.js`，去掉 toString 字段

**Pros**：保留 freezePrototype 防护
**Cons**：
- pnpm patch 维护成本（cheerio 升级跟随）
- 旧版 cheerio 缺少新功能，juice 可能不兼容
- 治标不治本：juice 内部其他路径也可能踩 prototype 冻结地雷

### Approach C: prototype-freeze polyfill 兜底
**怎么做**：
- 在 main.ts 或 export barrel 最顶部，临时 unfreeze `Object.prototype` / `Function.prototype`，执行 juice 路径，再重新冻结
- 或 `Object.defineProperty(Object.prototype, 'toString', { writable: true })` 在 cheerio import 之前

**Pros**：保留大部分冻结防护
**Cons**：
- 复杂、易错、order-sensitive
- 可能根本不工作（Tauri 在 webview 创建后才注入冻结脚本，时序复杂）
- 黑魔法，未来 debug 痛苦

### Approach D: 替换 juice
**怎么做**：
- 自写或引入纯浏览器 CSS 内联器（如 `style-to-object` + 手工 traversal）
**Pros**：彻底脱离 cheerio 依赖
**Cons**：投入大，回归面广，超出 P0 修复范围 → 列 Out of Scope

## Decision (ADR-lite)

**Context**: Tauri webview 的 `freezePrototype: true` 与 cheerio 1.0.0 `Object.assign(initialize, {toString, ...})` 不兼容，导致 P0 启动崩溃。三大平台导出全部受阻。

**Decision**: 采用 Approach A — `tauri.conf.json:89` 改 `"freezePrototype": false`。

**Consequences**:
- 失去 `Object.prototype` / `Array.prototype` 冻结这一层"原型污染防护"
- 安全主防线收敛到 CSP（`script-src 'self'`，已在 `tauri.conf.json:88` 启用）
- 本地离线应用，无外部 JS 注入入口（无 eval、无远端 script、无未受控用户输入跨 JS 边界）
- 后续若引入第三方插件/远端脚本，需要重新评估并恢复或寻求替代防护
- 在 SECURITY.md / CHANGELOG 标注此决策与理由

## Implementation Plan (slices)

**PR1 — 根因修复 + 单测兜底（必须）**
- `tauri.conf.json:89` 改 `"freezePrototype": false` + 行内注释 + commit message 写明
- 新增 `inkforge/src/services/export/__tests__/frozen-prototype.test.ts`：在 happy-dom 内 freeze 三大 prototype，跑 `convertToWechat / convertToXhs / convertToZhihu` 各 1 个 minimal + 1 个 rich fixture，断言不抛 + 输出非空
- 跑 `npm run typecheck` + `npm run test`，全绿后提交

**PR2 — 手测验证矩阵 + 文档（必须）**
- 跑完 Full Sweep Audit Plan D 表 #1-#7 全部场景，记录到 `journal-1.md`
- `tauri.conf.json` 同目录或 README 增加安全说明（freezePrototype 关闭的 rationale + CSP 是主防线）
- 若发现 #1-#7 有问题，回到 PR1 加修

**PR3 — 风险 dep 审计报告（必须）**
- 跑 `npx gitnexus impact` + 手工 grep 验证 B 节"候选嫌疑"清单中每个 dep 在 Tauri 跑一遍最小用例不崩
- 输出 `docs/audit/tauri-prototype-freeze-deps.md`（或类似），列：
  - ✅ 实测安全
  - ⚠️ 实测有问题（开 follow-up task）
  - ❓ 难以触达（覆盖率说明）
- 该清单是后续 task 的依据，不在本 PR 内修任何其他 dep

**PR 顺序与依赖**：PR1 → PR2 (依赖 PR1) → PR3 (可与 PR2 并行)

## Technical Notes

### 关键文件
- `inkforge/src-tauri/tauri.conf.json:88-91`（CSP + freezePrototype）
- `inkforge/src/services/export/wechat.ts:1324`（juice 调用点）
- `inkforge/src/services/export/zhihu.ts:538`
- `inkforge/src/services/export/xiaohongshu.ts:622`
- `inkforge/src/App.vue:266-287`（ErrorBoundary）
- `inkforge/src/composables/usePreviewRenderer.ts:226-251`（预览路径）

### 上游证据
- cheerio 1.0.0 `dist/browser/load.js:104`：`Object.assign(initialize, staticMethods, { toString,... })`
- Tauri 1.x freezePrototype 文档：runtime 注入冻结脚本

### 复现/验证策略
- 现有：`tauri:dev` 启动 → 新文章页面 → 复现
- 新增单测：mock `Object.freeze(Object.prototype)` + `Object.freeze(Function.prototype)` 在 vitest 环境，调 `convertToWechat`，断言不抛
- happy-dom 本身不冻结 prototype，需手工 freeze

### 风险
- Approach A：若未来需要恢复 freezePrototype，需要先解决 cheerio 兼容问题
- 任何 approach：juice + cheerio 路径多，单测可能漏掉某条
