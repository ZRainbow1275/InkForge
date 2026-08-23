# Implementation Plan — 恢复品牌化渲染设计并重构视觉预设

## Phase A — Baseline and failure tests

- [ ] 记录当前用户否决的 11 张原生截图对应缺陷矩阵，不复制临时图片。
- [ ] 为七套 masthead composition 与结构指纹补失败测试。
- [ ] 为三组共享 Variant 的 profile 差异补失败测试。
- [ ] 锁定 16/10/24 ID 覆盖、连续段落、安全和 Typography 现有合同。

Validation:

```bash
pnpm -C inkforge exec vitest run \
  src/services/export/visual-variants.test.ts \
  src/services/export/article-masthead.test.ts \
  --reporter=default --maxWorkers=1 --no-file-parallelism
```

## Phase B — Root implementation

- [ ] 在 `utils.ts` 的现有 masthead 生成边界实现七个 normal-flow composition。
- [ ] 收缩 `commonVariantCSS()` 到真正共享的安全排版底座。
- [ ] 重制 V1–V7 masthead、标题、连续正文、语义组件、图像和文末样式。
- [ ] 在 V4/V5/V7 中落实 profile modifier，不增加状态源。
- [ ] 保持所有真实字段、escape/sanitize、preset 和 platform adapter 不变。

Rollback point:

- 只回退 `utils.ts`、`visual-variants.ts` 及对应测试，不触碰用户数据或其他任务文件。

## Phase C — Automated verification

- [ ] 目标测试通过。
- [ ] export 回归串行通过。
- [ ] 精确 ESLint 通过。
- [ ] `vue-tsc --noEmit` 通过。
- [ ] 生产构建通过。
- [ ] `style-proof:application-preflight` 通过。
- [ ] GitNexus `detect_changes` 只指向预期渲染流；复核大量 unrelated dirty changes。

Commands:

```bash
pnpm -C inkforge exec vitest run src/services/export \
  --reporter=default --maxWorkers=1 --no-file-parallelism
pnpm -C inkforge exec eslint \
  src/services/export/visual-variants.ts \
  src/services/export/visual-variants.test.ts \
  src/services/export/utils.ts \
  src/services/export/article-masthead.test.ts --quiet
pnpm -C inkforge exec vue-tsc --noEmit --pretty false
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
pnpm -C inkforge style-proof:application-preflight
```

## Phase D — Native visual acceptance

- [ ] 构建并启动 Release `InkForge.exe`。
- [ ] 在真实软件中用同一真实文章生成七套首屏 contact sheet。
- [ ] 对长文检查中段：H1–H6、连续段落、引用、列表、表格、代码、公式、图片。
- [ ] 对组件丰富文稿检查全部现有 writing components 与文末。
- [ ] 对 16 个微信 preset 检查可达性、即时切换和映射稳定。
- [ ] 逐项对照七张最终方向板，发现同质化立即迭代。

Stop rule:

- 不以测试绿、HTML 非空、CSS 字符串不同或 DOM sentinel 存在宣称视觉完成。
- 未取得真实长文/组件数据的分支明确记为待用户实测，不使用 mock 补齐。

## Phase E — Review and documentation

- [ ] 更新 `.trellis/spec/frontend/visual-variant-system.md` 的 composition 与防同骨架合同。
- [ ] 在任务 evidence 中记录命令、通过数、原生进程/hash 和无敏感内容边界。
- [ ] 执行 adversarial self-review：范围、数据真实性、安全、视觉偏差、回归、未验证声明。
- [ ] 不自动 commit/push；只在用户明确要求时精确 stage。
