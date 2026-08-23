# Implementation Plan — 同品牌多版式差异化渲染

## 1. Baseline and failure gates

- [x] 读取父任务、方向板、visual variant spec 和当前真实 diff。
- [x] 用 release `InkForge.exe` 对同一验收稿采集现有 16 套首屏。
- [x] 增加失败优先测试：七 Variant、共享 Variant 的 preset/Profile、16 个最终 preset 指纹。
- [x] 记录共享骨架来源及每对冲突预设。

## 2. Minimal implementation

- [x] 收缩 `commonVariantCSS()` 到品牌/安全/可读性底座。
- [x] 保留七个 Variant 独立 masthead 结构和领域构图。
- [x] 完成 `commentary/news`、`aigc/code/tech`、`meme/life/elegant` 的结构差异。
- [x] 检查四个旗舰与基础 preset 的最终装帧差异。
- [x] 补足各 preset 的 H1–H6、quote/list/table/code/figure/component/footer 视觉所有权。
- [x] 不新增 renderer、状态、依赖或数据字段。

## 3. Validation

```bash
pnpm -C inkforge exec vitest run \
  src/services/export/article-masthead.test.ts \
  src/services/export/visual-variants.test.ts \
  --reporter=default

pnpm -C inkforge exec vitest run src/services/export \
  --reporter=default --maxWorkers=1 --no-file-parallelism

pnpm -C inkforge exec eslint \
  src/services/export/utils.ts \
  src/services/export/visual-variants.ts \
  src/services/export/article-masthead.test.ts \
  src/services/export/visual-variants.test.ts --quiet

pnpm -C inkforge exec vue-tsc --noEmit --pretty false
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
pnpm -C inkforge style-proof:application-preflight
```

- [x] 原生 release 截图；16/16 可选且无横向溢出。
- [x] 重点并排目检三组：评论/新闻、AIGC/代码/科技、整活/人生/优雅。
- [x] 代表预设检查完整文章中段、表格、代码及文末。
- [x] 小红书、知乎本地转换回归；不执行发布。

## 4. Review and documentation

- [x] 运行 GitNexus `detect_changes`，只解释本任务精确文件。
- [x] 运行 exact-file `git diff --check` 和敏感路径/凭据扫描。
- [x] 更新 `.trellis/spec/frontend/visual-variant-system.md` 的品牌不变量与 preset 唯一性合同。
- [x] 在本文件记录原生截图目检结论、测试命令和未验证外部门禁。
- [x] 不 stage、commit 或 push；保留用户当前 dirty worktree。

## Rollback points

1. masthead 结构改动可由 `utils.ts` 对应 preset 分支单独回退；
2. CSS 艺术指导可由 `visual-variants.ts` 对应 builder 单独回退；
3. 任何回退均不得触碰 preset ID、组件 schema、用户数据和平台 adapter。

## 2026-07-31 Implementation and acceptance record

### Root cause and implementation

- 根因不是缺少主题数量，而是多个 preset 在同一 `VisualVariant` 内复用 masthead、H3、
  writing-component 与 colophon 骨架，运行时主要依赖换色。
- 继续复用唯一 `VisualVariant + ArticleProfile + presetId` 管线；没有新增 renderer、
  theme DSL、store、数据字段、依赖或图片资产。
- 十二个基础微信 preset 现在拥有十二个 masthead composition；共享 Variant 的三组
  sibling preset 进一步拥有各自 H3、组件容器与文末收束。
- 四个旗舰继续复用既有 SVG/decorator 与 paste-safe 规则；赤陶、赤陶兼容、铜绿、黄铜
  在最终产物层保持不同结构指纹。
- 所有 preset 共享的品牌锚点仅保留为 `INKFORGE · <variant>`、`文章值得您享受`、真实
  metadata、colophon、字体和窄屏可读性基线。

### Automated verification

```text
targeted variants/masthead:
  2 files / 50 tests passed

full export serial regression:
  48 files / 1462 tests passed

ESLint exact files:
  passed

vue-tsc --noEmit:
  passed

frontend production build:
  5577 modules transformed; passed

Tauri release build:
  release InkForge.exe built; passed

style-proof application preflight:
  status=application-ready
  applicationGalleryIssueCount=0
  wechatSafeViolationCount=0
  wechatStyleSampleIssueCount=0

exact-file hygiene:
  8 files passed whitespace/final-newline validation
  sensitive/runtime artifact scan passed
  no task file staged
```

### Change-impact review

- GitNexus `detect_changes(scope=all)` 报告的 `critical` 来自当前工作树中 168 个既有
  dirty 文件、745 个变更符号的聚合影响，并非本轮八文件切片的风险等级。
- 本轮生产改动集中于 `buildReadingTimeHeader` 与既有 visual-variant builders；
  预编辑 symbol impact 为 LOW/MEDIUM，未出现 HIGH/CRITICAL。
- 精确文件测试、完整 export 串行回归、类型/构建检查和原生软件目检共同约束本轮影响；
  未整理、暂存、提交或推送其他工作树改动。

### Native visual verification

- 使用重新构建的 release `InkForge.exe` / Tauri WebView2 和应用真实 Pinia
  `articleStore.addArticle()` 链创建同一份验收文稿。
- 16/16 preset 均在真实导出窗口中可选、可渲染；每套 `previewWidth=390`、
  `charsPerLine=22`、`overflowX=0`。
- 首屏目检覆盖十二个基础 preset 与四个旗舰；三组 sibling 在 masthead、标题层级和
  视觉节奏上一眼可区分。
- 另对时事点评、AIGC、人生感悟检查中段与文末：H2/H3、列表、表格、strong/em、
  inline-code、代码块和 H5/H6 均正常，无重叠、浅底浅字或异常横向滚动。
- 临时截图只用于本机目检，未写入仓库。

### Explicit boundary

- 本轮没有执行或声称小红书、知乎、微信公众号的账号发布成功。
- application preflight 的 `canClaimReleaseComplete=false` 仅表示手机预览、Dark Mode、
  封面缩略图、凭据同步、定时发送和平台发布仍需外部人工证据；它不否定本任务的本地
  软件渲染与 preset 差异化验收。
