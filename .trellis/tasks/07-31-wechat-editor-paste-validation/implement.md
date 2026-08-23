# Implementation Plan — 微信公众号真实粘贴渲染验收

## 1. Preflight

- [x] 加载相关 frontend/spec、上轮 preset 差异化任务和微信粘贴规则。
- [x] 确认 release `InkForge.exe` 可运行且 16 个微信预设可选。
- [x] 复用当前任务既有 CloakBrowser 登录会话，确认用户打开的是可安全替换正文的测试稿。
- [x] 确认不使用 Playwright、Chrome、第二 profile 或程序化 paste event 冒充普通粘贴。

## 2. Real WeChat paste matrix

用户最新视觉反馈后，以下旧矩阵记录只作为回归基线，不再视为当前通过：

- [x] 为同一真实验收稿依次选择 16 个微信预设。
- [x] 每套都由应用现有按钮写入系统剪贴板。
- [x] 每套都以普通 OS `Ctrl+V` 粘贴到微信公众号正文编辑器。
- [x] 每套记录脱敏 DOM 指标、首屏视觉结论和降级状态。
- [x] 对评论/新闻、AIGC/代码/科技、整活/人生/优雅做并排差异检查。
- [x] 对四个旗舰检查 SVG、paste-safe fallback 和首屏装帧。
- [x] 对代表预设滚动检查完整文章中段、组件和文末。

## 2A. Native editor / preview correspondence

- [x] 以原生 `InkForge.exe` 记录当前 preset、editor CSS identity 和 preview preset/variant。
- [x] 修复通用编辑骨架与独立渲染版式割裂，复用现有 canonical state。
- [x] 写作组件在编辑态显示真实类型、字段摘要/错误状态，且可继续编辑。
- [x] 以三套高反差预设先验收字号、字体和对应关系，再扩到 16 套。

## 3. Root-cause repair when required

- [x] 先定位 InkForge 产物、剪贴板通道或微信 sanitizer 的真实失败层。
- [x] 编辑任何符号前运行 GitNexus upstream impact。
- [x] 只修共享根因；不新增 renderer、依赖、store、字段或测试专用输出。
- [x] 补充最小失败优先测试，重新构建 release `InkForge.exe`。
- [x] 在真实微信编辑器中按相同普通粘贴路径复验失败预设及相邻回归预设。

## 4. Validation

若无代码改动，保留已有本地自动化证据并完成真实平台矩阵即可。

若有代码改动，至少运行：

```bash
pnpm -C inkforge exec vitest run <focused-tests> --reporter=default
pnpm -C inkforge exec vitest run src/services/export \
  --reporter=default --maxWorkers=1 --no-file-parallelism
pnpm -C inkforge exec eslint <exact-changed-files> --quiet
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge exec tauri build --bundles none
pnpm -C inkforge style-proof:application-preflight
```

## 5. Review and evidence

- [x] 更新微信规则/spec，记录普通粘贴真实保留与降级边界。
- [x] 运行 GitNexus `detect_changes` 和 exact-file diff review。
- [x] 扫描任务文件，确保无账号、Cookie、Token、二维码、HAR、profile 或临时路径。
- [x] 不把 PC 编辑器结果外推为手机、Dark Mode、交互、封面、同步或发布成功。
- [x] 不 stage、commit 或 push；保护用户既有 dirty worktree。

## Rollback points

1. renderer/variant 修复按对应 builder 回退；
2. 微信后处理修复按 compatibility transform 回退；
3. clipboard 修复按现有 copy service 回退；
4. 回退不得删除 preset、组件、SVG 模块或用户数据。

## 2026-07-31 Real WeChat PC Paste Result

### Matrix

- Release `InkForge.exe` exposed all 16 existing WeChat presets. The auditable per-preset result is:

| Preset ID | Visible name | Structural family / variant | Real PC paste channel | WeChat readback |
| --- | --- | --- | --- | --- |
| `thesis` | 论文翻译 | Structural HTML — `critical-translation` | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `legal` | 法学研讨 | Structural HTML — `jurisprudence-atlas` | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `report` | 行业研报 | Structural HTML — `industry-section` | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `commentary` | 时事点评 | Structural HTML — `fact-wire` commentary variant | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `aigc` | AIGC | Structural HTML — `machine-foundry` AIGC variant | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `code` | 编程创造 | Structural HTML — `machine-foundry` code variant | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `notes` | 学习笔记 | Structural HTML — `knowledge-weave` | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `news` | 新闻 | Structural HTML — `fact-wire` news variant | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `meme` | 整活 | Structural HTML — `human-margins` playful variant | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `life` | 人生感悟 | Structural HTML — `human-margins` life variant | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `elegant` | 优雅 | Structural HTML — `human-margins` elegant variant | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `tech` | 科技 | Structural HTML — `machine-foundry` tech variant | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | title/body/end/brand retained; horizontal overflow 0 |
| `flagship-kiln` | 赤陶旗舰 | Source-owned flagship SVG/static structure — kiln | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | source-owned SVG/static structure and title/body/end/brand retained; horizontal overflow 0 |
| `flagship-kiln-paste-safe` | 赤陶兼容旗舰 | Source-owned flagship SVG/static structure — kiln paste-safe compatibility variant | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | source-owned SVG/static structure and title/body/end/brand retained; horizontal overflow 0 |
| `flagship-tempera` | 铜绿旗舰 | Source-owned flagship SVG/static structure — tempera | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | source-owned SVG/static structure and title/body/end/brand retained; horizontal overflow 0 |
| `flagship-amber` | 黄铜旗舰 | Source-owned flagship SVG/static structure — amber | app button → system `HTML Format` → ordinary Windows `Ctrl+V` | source-owned SVG/static structure and title/body/end/brand retained; horizontal overflow 0 |

- The 12 base presets are structural HTML compositions; no unretained exact inline-style or SVG
  counts are claimed. The four flagship presets retained their source-owned SVG/static structure.
- This matrix is PC editor evidence only. It is not phone preview, mobile interaction, Dark Mode,
  cover, sync, schedule, group-send, or publish proof.

### Defects and shared repair

1. `行业研报 / industry-section`: a post-inline typography override replaced the dark report quote
   background with the generic light quote background while retaining light foreground text.
2. `学习笔记 / knowledge-weave`: the preset title is a real `<strong>` node; the notes theme's generic
   emphasis background remained behind its light masthead title.
3. The corrected merge contract does not preserve every same-property `!important` declaration.
   A declaration is preserved only when the owning composition explicitly allowlists that property
   for that node; arbitrary historical `!important` is not a lock.
4. The typography-merge allowlist is limited to the `industry-section` blockquote's `background`
   and `color` declarations.
5. `knowledge-weave` is repaired by its source-owned masthead title rule: transparent `background`
   and readable `color` over the dark parent. It does not rely on catch-all merge preservation.
6. User typography remains authoritative for unlocked properties, including report quote
   padding/border/geometry and heading style.

### Recorded rebuilt software proof — final root revalidation pending

The following task evidence is not final AC-8/AC-9 sign-off. The current root repair still requires
fresh regression/build checks and exact sensitive-artifact cleanup review.

- Focused regression: 1 passed.
- Visual variant + shared typography + platform rendering: 3 files, 402 tests passed.
- Serial export suite: 48 files, 1463 tests passed.
- Exact ESLint: passed.
- `vue-tsc --noEmit --pretty false`: passed.
- Production web build and Tauri release build: passed.
- Application preflight: `application-ready`, 0 local application issues; external release proof
  remains `blocked-by-external`.
- Rebuilt-app WeChat readback:
  - `行业研报`: computed quote background `rgb(37, 41, 51)`, foreground
    `rgb(245, 240, 230)`, zero overflow.
  - `学习笔记`: computed masthead background `rgb(15, 91, 85)`, title background transparent,
    title foreground `rgb(245, 240, 230)`, zero overflow.

## 2026-08-01 Current Release Revalidation

### Native editor / preview correspondence

- Rebuilt release `InkForge.exe` was exercised across all 16 existing WeChat preset IDs.
- For 16/16 selections, the editor projection preset ID equalled the preview preset ID; the
  resolved variant/profile changed with the selected preset instead of retaining a generic editor
  skin.
- The real `TipBlock` inserted from the writing-component UI remained a `ready` atomic editor card
  with its registered label and real field summary, and rendered in the corresponding preview.
- User body typography remained `16px / 28.8px`; preset-owned heading, quote, emphasis, masthead,
  component, and colophon treatments remained distinct.

### Real WeChat ordinary-paste matrix

- 16/16 presets wrote Windows `HTML Format` through the release application's existing copy button.
- 16/16 artifacts entered the authenticated WeChat PC article body through Windows `SendInput`
  `Ctrl+A` then `Ctrl+V` while the real editor held focus; no synthetic `ClipboardEvent`, DOM
  assignment, save, preview, sync, schedule, group-send, or publish action was used.
- Clipboard artifacts produced 16 unique content fingerprints. WeChat sanitizer readback also
  produced 16 unique DOM fingerprints, retained the acceptance text and real writing component, and
  contained zero scripts.
- The twelve base presets correctly contained no literal SVG. A settled second readback of each
  flagship retained 16 literal SVG nodes and two `data-ink-svg` sentinels, with zero unsafe SVG,
  zero scripts, zero horizontal overflow, and the real component still present. The complete
  Windows-input rerun produced the same 16 unique sanitized DOM fingerprints. Counts were taken
  after the platform editor finished its paste/render cycle rather than from an early transient read.
- The final `flagship-kiln-paste-safe` readback used `16px` body text, `28.8px` line height, the safe
  CJK serif fallback chain, and retained 35 structured sections plus the real component.

### Verification

- Focused rendering/editor regressions: 10 files, 493 tests passed.
- Typewriter, focus-vignette, native layout, and component-node regression: 4 files, 47 tests passed.
- Serial export suite: 48 files, 1471 tests passed.
- Exact ESLint: passed.
- `vue-tsc --noEmit --pretty false`: passed.
- Production web build and Tauri release build (`--bundles none`): passed.
- Application preflight: `application-ready`; 27 SVG modules, 7 families, 108 module-persona pairs,
  and zero local application/gallery/style-sample issues.
- This is native application plus WeChat PC editor evidence only. Phone rendering, mobile Dark Mode,
  mobile interaction, cover thumbnail, credentialed sync, scheduled send, group-send, and publish
  remain outside this round and are not claimed.

## 2026-08-01 Final Typography and Cover-Scale Closure

### Shared root repair

- The final real WeChat visual readback found one remaining scale defect: `cover-title` and
  `cover-grid` still hard-coded a `100` viewBox-pixel headline. The body and writing component were
  already `16px / 28.8px`; the oversized text belonged to the two existing SVG cover renderers, not
  to the platform adapter or the sixteen preset mappings.
- Both source-owned cover renderers now use a `72` headline, `92` line advance, at most nine
  characters per line, and the existing two-line ellipsis contract. The full-bleed grid and
  warm-paper title covers keep separate background, header, rule, tab, seal, and subtitle geometry.
- The fix added no renderer, dependency, store, preset, data field, browser output, or sample
  content. GitNexus upstream impact for both renderer symbols was `LOW` with zero direct callers and
  zero affected processes.

### Final rebuilt release and visual proof

- The final release `InkForge.exe` was rebuilt and opened as the native Tauri/WebView2 application.
- Native 16/16 selection readback: editor preset ID equalled preview preset ID, editor variant
  equalled preview variant, the real edited `TipBlock` remained ready/editable/rendered, body text
  remained `16px / 28.8px`, and all four flagship covers exposed a `72` headline.
- Every native preset screenshot was visually inspected in four groups. Critical Translation,
  Jurisprudence, Industry, Fact Wire, AIGC, software, notes, news, the three Human Margins profiles,
  technology, and all four flagships retained distinct composition and readable hierarchy.
- The authenticated WeChat PC editor was then rerun for all sixteen presets through the release
  copy button and ordinary Windows `Ctrl+A` / `Ctrl+V`. Result: 16 unique sanitized DOM
  fingerprints, component marker retained in 16/16, zero scripts, zero horizontal overflow,
  12/12 base presets with zero literal SVG, and 4/4 flagships with 16 SVG nodes plus two
  `data-ink-svg` sentinels.
- Final `flagship-kiln-paste-safe` WeChat readback: 987 text characters, 35 sections, 16 SVG nodes,
  two SVG sentinels, zero scripts, zero overflow, `72px` cover headline, and `16px / 28.8px` body and
  writing-component text using the safe CJK serif fallback chain.

### Final per-preset sanitized readback matrix

The fingerprint is a short hash of the settled WeChat body DOM after ordinary Windows paste. It is
not account data and is recorded only to prove that the sixteen presets did not collapse into one
shared skeleton. `SVG/sentinel` counts are settled post-sanitizer values; every row retained the real
writing component and reported `scripts=0`, `overflow=0`.

| Preset | Visible composition signature | DOM fingerprint | SVG/sentinel |
| --- | --- | --- | ---: |
| `thesis` / 论文翻译 | Critical Translation 典藏译本、章节线与译注节奏 | `f57ecbafe74a677a` | `0/0` |
| `legal` / 法学研讨 | Jurisprudence Atlas 法理坐标、规则链与法学编号 | `bd9dc074ce0939e5` | `0/0` |
| `report` / 行业研报 | Industry Section 深色产业封面、数据编号与商务分隔 | `f821312c97b685cb` | `0/0` |
| `commentary` / 时事点评 | Fact Wire 事实通讯、短报头与红色观点锚点 | `ad1c16e2de75d635` | `0/0` |
| `aigc` / AIGC | Machine Foundry 数字铸场、模型标牌与蓝色数据节奏 | `8d1f30ad996a2f33` | `0/0` |
| `code` / 编程创造 | 终端式 Machine Foundry、代码符号与步骤编号 | `8b6fc47fc2089396` | `0/0` |
| `notes` / 学习笔记 | Knowledge Weave 知识经纬、便签索引与奶油纸面 | `22fbbefa2686b754` | `0/0` |
| `news` / 新闻 | 新闻版 Fact Wire、黑色报头与双线信息流 | `20a70d1be7a5e42c` | `0/0` |
| `meme` / 整活 | Human Margins 高饱和标题与破格色块 | `feaceb61944c64f6` | `0/0` |
| `life` / 人生感悟 | Human Margins 人文边页、长呼吸留白与棕褐引号 | `3bdc0e8d577d6a4d` | `0/0` |
| `elegant` / 优雅 | 深紫书卷章序、首字下沉与古典细线 | `0222053017e30093` | `0/0` |
| `tech` / 科技 | 靛蓝未来标题、技术标记与几何节奏 | `42eadf93b412f11d` | `0/0` |
| `flagship-kiln` / 赤陶旗舰 | 赤陶全幅网格、Forge 标牌与印章 | `2ab99a8aacd759a6` | `16/2` |
| `flagship-kiln-paste-safe` / 赤陶兼容旗舰 | 暖纸装帧、赤陶侧栏与普通粘贴安全封面 | `d521f8deb77318bb` | `16/2` |
| `flagship-tempera` / 铜绿旗舰 | 铜绿知识封面、括号标题与菱形节奏 | `af427f004b94d630` | `16/2` |
| `flagship-amber` / 黄铜旗舰 | 黄铜报告封面、商务竖线与细线署名 | `affc30397404f26a` | `16/2` |

### Final checks

- Focused cover/flagship/typography regressions: 5 files, 111 tests passed.
- Serial export suite: 48 files, 1474 tests passed.
- Markdown and writing-component suite: 6 files, 26 tests passed.
- Typewriter, focus vignette, desktop layout, and atomic component suite: 4 files, 48 tests passed.
- Exact changed-file ESLint and `vue-tsc --noEmit --pretty false`: passed.
- Production web build and Tauri release build (`--bundles none`): passed.
- Application preflight: `application-ready`; 27 modules, 7 families, 108 rendered
  module-persona pairs, and zero local application/gallery/style-sample issues.
- No save, phone preview, sync, schedule, group-send, or publish action was executed. Those external
  gates remain unclaimed and do not block this round's native application plus WeChat PC paste goal.
