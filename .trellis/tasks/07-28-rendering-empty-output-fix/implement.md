# Implementation Plan — 渲染结果为空专项修复

## 1. Start gate

- 用户已确认完整升级和推荐架构：TipTap 原子组件节点 + Markdown JSX 无损往返。
- 当前软件截图是失败基线：普通与旗舰正文近似裸文本，自动“墨铸”尾标 SVG 超大并被裁切。
- 任务启动后先修共享渲染根因；组件库不能阻塞基础排版恢复。

## 2. Pre-edit protocol

- [ ] 读取当前 PRD、设计、相关 spec 和真实失败截图。
- [ ] 检查 dirty tree，仅编辑/暂存本任务精确文件。
- [ ] 修改每个函数/类/方法前运行 GitNexus upstream impact；HIGH/CRITICAL 先报告。
- [ ] 先写能失败的最小回归，再改共享根。
- [ ] 每个切片后运行聚焦测试、精确 lint 和差异审查。
- [ ] 重检查真实 Tauri 软件，不用浏览器页面冒充成品。

## 3. Ordered slices

### Slice A — Preview/decorator shared root

- [ ] 追踪 `usePreviewRenderer`、主题 decorator、`generateThemeCSS`、`renderWechatMockHtml` 的真实产物。
- [ ] 证明并移除普通主题 preview 无条件旁路。
- [ ] 确保 preset decorator 每个接受 token 只执行一次，Stage/分栏/全屏一致。
- [ ] 阻止宿主 CSS 扁平化正文排版。
- [ ] 增加同 fixture 的 16 预设独特签名回归。

### Slice B — Plain body and responsive SVG

- [ ] 让普通段落从当前主题 CSS/token 获得可见首段、节奏、强调和链接样式。
- [ ] 定位自动尾标 SVG 的模块生成根，统一修复移动画布宽度、纵横比、最大高度和溢出。
- [ ] 校正短文自动结尾的文章流比例，不删除任何既有 SVG 模块。
- [ ] 增加 320/390/586px 几何与安全节点回归。

### Slice C — Component registry and JSX round-trip

- [ ] 在现有 `markdown-ext` 中增加严格类型组件注册、代码围栏安全解析与渲染。
- [ ] 复用 `html-blocks` 和 `delivery-adornments` 建立内置组件定义。
- [ ] 为 `TyporaMode` 增加组件 HTML → JSX 稳定序列化。
- [ ] 增加未知组件、过期版本、必填字段和导入安全回归。

### Slice D — TipTap atomic node and library UI

- [ ] 增加最小 `inkComponent` Node/NodeView，保存组件 ID、版本和属性。
- [ ] 使用 `BlockBoundaryInsertion` 接入光标插入、焦点恢复、选择和重新编辑。
- [ ] 增加现有视觉语言下的内置/自定义组件库、属性表单、即时预览和受限导入/导出。
- [ ] 从斜杠命令与编辑器插入入口打开同一组件库。

### Slice E — Cross-platform and native acceptance

- [ ] 验证 WeChat 安全 HTML/SVG 与字段完整时的平台标签。
- [ ] 验证 XHS/Zhihu 安全降级，不声称外部发布成功。
- [ ] 运行相关 Vitest、完整 export 串行套件、精确 ESLint、`vue-tsc` 和生产构建。
- [ ] 构建并启动真实 Tauri 软件，逐个检查 16 个预设和组件往返。
- [ ] 更新 spec、任务证据和完成报告，运行 GitNexus `detect_changes` 与最终 diff 审查。

## 4. Acceptance evidence matrix

| Row | Automated evidence | Native evidence | Status |
| --- | --- | --- | --- |
| 16 预设正文可见且独特 | 16/16 active + unique | 16-chip native loop | passed |
| 普通段落非裸文本 | computed style regression | 16px / 25.888px + spacing | passed |
| SVG 尾标响应式且不裁切 | bounded geometry | mark 72px / seal 64px | passed |
| Stage/分栏/全屏一致 | pending | pending | open |
| JSX/TipTap 往返与重开 | pending | pending | open |
| 组件入口/属性/预览/插入 | pending | pending | open |
| 微信复制/导出安全产物 | pending | manual readback | open |
| XHS/Zhihu 本地降级 | pending | user publishes manually | open |

## 5. 2026-07-28 Native Rendering Root-Fix Execution

### Root cause

- The production Tauri 1 asset pass appended a nonce to `style-src`. WebView2 therefore ignored
  `'unsafe-inline'` for the sanitized preview fragment.
- Before the fix, the theme `<style>` existed but `style.sheet === null`; all inline `style`
  attributes were present but absent from computed layout. No host selector matched or overrode the
  article.
- The minimal shared fix is
  `dangerousDisableAssetCspModification: ["style-src"]`. Script CSP modification remains enabled
  and `script-src` remains self-only.

### TDD and build

- Red: the scoped-CSP config guard failed with
  `expected false to deeply equal ["style-src"]`.
- Green: the same focused Vitest check passed after the configuration change.
- `pnpm exec tauri build --debug --bundles none` passed:
  - Vue type/build and Vite production build passed (`5571 modules`, `1m 22s`).
  - Tauri debug compilation passed (`Finished dev profile`, `1m 10s`).
- Focused preview/config regression passed: `2 files / 26 tests`.
- Full serial export regression passed: `45 files / 1398 tests`.
- Exact ESLint for the changed regression test passed.
- `pnpm exec vue-tsc --noEmit --pretty false` passed.
- Exact diff whitespace/JSON validation and sensitive-path scan passed.
- GitNexus `detect-changes --scope all` completed. Its repository-wide result is `critical`
  because the pre-existing dirty tree contains 150 files / 655 symbols; this slice itself changes
  no indexed runtime symbol, only Tauri configuration, one regression assertion, and docs/spec.
- `cargo build --release --manifest-path src-tauri/Cargo.toml` passed. The production release was
  probed again through Tauri WebDriver and reproduced the fixed CSSOM, typography, footer, mark,
  and seal measurements.
- A standalone QA delivery was copied outside the repository to the Desktop folder
  `InkForge-0.1.0-Windows-20260728-rendering-fix`; its SHA-256 is recorded beside the executable
  and verified with `sha256sum -c`.

### Real Tauri/WebView2 before/after

| Probe | Broken packaged build | Fixed debug build |
| --- | ---: | ---: |
| Runtime style test border | `0px` | `6.66667px` |
| Theme rules matching article | `0` | `7` |
| Body typography | `14px / 21px` | `16px / 25.888px` |
| Paragraph bottom margin | `0px` | `16px` |
| Footer background / radius | transparent / `0px` | `#f7f4ef` / `14px` |
| Footer vessel mark | `355.7px` | `72px` |
| Footer seal | `355.7px` | `64px` |

The fixed screenshot was visually inspected from the real debug executable: cover, paragraphs,
chapter card, quote card, colors, spacing, and bounded SVG geometry are visible. The screenshot
remains in the local temporary evidence path only and is not committed.

### Native 16-preset loop

One isolated native WebView2 session clicked all 16 real Workstation preset chips:

- `count: 16`
- `styleActive: 16`
- `signatureCount: 16`
- `failures: []`

Every preset had an active CSSOM stylesheet, readable paragraph font/line-height/non-zero spacing,
and no SVG wider than the measured `355.7px` WeChat canvas. The four flagship variants rendered
10 SVG nodes each with a maximum width of `339.7px`.

### Scope result

- Slice A/B production-rendering root is complete without editing the HIGH-risk shared
  `svgSection` primitive or any of the 16 theme definitions.
- Component registry / TipTap atomic node / JSX round-trip remains a separate open slice.
- WeChat phone/sync/publish and XHS/Zhihu publishing remain manual/external evidence, per user
  instruction.
