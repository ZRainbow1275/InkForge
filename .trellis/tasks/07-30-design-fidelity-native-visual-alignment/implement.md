# Implementation Plan — 设计稿逐屏视觉对齐与原生验收

## Phase A. Baseline and Contracts

- [x] 保存本轮原生 Tauri 当前微信预览的临时视觉基线；不提交用户数据截图。
- [x] 对拟修改的共享符号逐一运行 GitNexus upstream impact：
  - `buildReadingTimeHeader`
  - `convertToWechatWithStats`
  - `getVisualVariantCSS`
  - `generateThemeCSS`
  - ExportModal 的渲染/选择入口
- [x] 建立失败测试：
  - 真实标题进入抬头；
  - 未提供标题不生成占位；
  - 七套普通段落不再全部卡片化；
  - 七套 masthead 结构指纹不同；
  - V7 playful/quiet 结构不同；
  - 旧 16 preset 映射保持不变。

## Phase B. Real Identity Data Flow

- [x] 仅扩展 `WechatExportOptions` 的可选真实标题字段；Variant 继续从 preset 映射解析。
- [x] `ExportModal.vue` 与 `PublishView.vue` 均透传现有真实 `title` / `articleCategory`。
- [x] WeChat 转换只使用调用方真实值；缺失字段省略。
- [x] 保持旧调用者和跨平台转换兼容。
- [x] 原生复验发现工作台已选“论文翻译”却显示 `INDUSTRY SECTION`；根因是
  `usePreviewRenderer()` 仍调用无 preset/title 的通用报头。现已改为复用同一 preset→Variant
  映射，并透传真实标题、分类和歌曲；工作台“复制平台成品”也透传同一标题与分类。

## Phase C. Variant Mastheads

- [x] 在现有 Variant 权威文件中加入闭合 masthead presentation。
- [x] 保持 `buildReadingTimeHeader()` 兼容，改为按 Variant 渲染七套 normal-flow 报头。
- [x] 阅读时间开关只控制分钟提示；关闭后仍保留所选 Variant 报头、真实标题与分类。
- [x] 每套使用微信安全的短 HTML 几何母题，不把长文字放进 SVG。
- [x] 逐套验证标题、分类、阅读时间、字数和可选歌曲的真实数据。

## Phase D. Continuous Reading Flow

- [x] 删除七套对所有普通段落的统一卡片化处理。
- [x] 补齐 V1–V7 的 H1–H6、正文、引用、列表、链接、表格、代码、figure 和 caption 安全基线；公式与图表复用现有降级链。
- [x] 每套落实专属 masthead 与语义模块结构信号，不只换色。
- [x] 保持 390px 连续正文画布与 Typography 覆盖。

## Phase E. Writing Components

- [x] 复用现有 writing-component 数据模型和 classes。
- [x] 为以下组件保留七套主题化表达或安全 fallback：
  - TimelineBlock
  - CompareBlock
  - StatBlock
  - GalleryBlock / ImageBlock
  - CitationBlock
  - SongBlock
  - AuthorBlock / MpProfile
  - ArticleBlock / LinkBlock
  - WechatMediaBlock
- [x] 不生成任何假作者、假数字、假图片、假来源或假平台信息。

## Phase F. Export Visual Workspace

- [x] 调整 `ExportModal.vue` 桌面布局，让控制区与 390px 微信设备画布完整同时可见。
- [x] 桌面控制列由 400px 收窄为 360px，保留所有现有控制并扩大真实预览可见面积。
- [x] 16 个风格入口显示 Variant 名称与短签名，保留所有现有选择和诊断功能。
- [x] 在同一原生预览容器中连续切换 V1–V7；未出现横向裁切、重建闪白或不可恢复的滚动重置。
- [x] 原生窗口按 980 CSS px 验证为纵向堆叠且预览可达；`420px` 保留确定性 CSS
  退化契约，但 Tauri 主窗口 `minWidth=800`，不伪造不存在的 420px 原生桌面证据。

## Phase G. Automated Verification

- [x] 运行最新定向测试（3 文件 / 43 项、2 文件 / 395 项，以及工作台预览修复
  3 文件 / 417 项、工作台预览与复制 2 文件 / 35 项均通过）。
- [x] 运行 export 全量串行测试（48 文件 / 1447 项通过）：

```bash
pnpm -C inkforge exec vitest run src/services/export \
  --reporter=default --maxWorkers=1 --no-file-parallelism
```

- [x] 运行精确 ESLint、`vue-tsc --noEmit --pretty false`。
- [x] 运行生产构建与应用预检：

```bash
NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build
pnpm -C inkforge style-proof:application-preflight
```

- 应用预检结果：`status=application-ready`、`applicationReady=true`；27 个 SVG 模块、
  7 个家族、108 组 gallery pair 与 13 个可选微信样式样本均通过，所有本地 issue count 为 0。
  `canClaimReleaseComplete=false` 只保留外部手机、凭据、平台预览和发布证据边界。
- 最终 `pnpm -C inkforge tauri:build` 通过，生成 Release EXE、MSI 与包含离线
  WebView2 Runtime 的 NSIS；文件大小与 SHA-256 已写入脱敏本地证据文件。
- [x] 恢复生成的 `tsconfig.tsbuildinfo`，不污染提交边界。
- [x] 运行 GitNexus CLI `detect-changes -r InkForge --scope all`：全工作树为 167 文件、
  747 symbols、39 flows、`critical`；该结果包含长期混合 dirty tree，不能归因于本切片。
  本任务另以精确文件 diff、目标测试和原生运行结果审计。

## Phase H. Native Visual Loop

- [x] 构建 Release `InkForge.exe`、MSI 与 NSIS 安装包。
- [x] 只在原生 Tauri/WebView2 中逐张检查 V1–V7；未把浏览器截图作为完成证据。
- [ ] 已捕获七套首屏与当前真实正文可见段，并额外检查 V7 playful/quiet；当前本机真实文章
  只有 5 字、4 段且无丰富组件，无法在不制造数据的前提下补齐七套“中段/文末”截图。
  H1–H6、表格、代码、公式和 writing-component 完整性由真实 renderer 测试覆盖。
- [x] 对照 final-direction 方向板逐项审查当前真实可见内容：
  - 首屏轮廓；
  - 字体层级；
  - 连续正文节奏；
  - 领域母题；
  - 当前文章可见的组件轮廓。
- [ ] 当前真实文章没有可见 CC/引文来源/长文文末，不能把自动化 footer 契约冒充原生
  长文视觉证据；七套 colophon/license/link 已有独立 CSS 指纹与最终内联回归测试。
- [x] 原生循环发现 Typography `background` / `pill` 会把反白标题变成浅底白字；在共享
  inline override 根因层写入安全深色前景，新增 2 个回归用例后重建并复查七套均通过。
- [x] 最终 Release 原生复验：选中“论文翻译”显示 `CRITICAL TRANSLATION / 典藏译本`；
  切换“法学研讨”显示 `JURISPRUDENCE ATLAS / 法理坐标`；再切回时未残留
  `INDUSTRY SECTION`。原生软件保持最大化并停留在编辑器，供用户继续实测。

## Phase I. Final Audit

- [x] 目标测试确认 16 个微信、5 个小红书、3 个知乎 preset 均保留；未删除功能、组件或设置。
- [x] 产物只读取真实文章数据；未加入 mock、占位数据、概念板素材或市场编辑器 DOM。
- [x] 导出边界会移除历史自定义 CSS 中包含任意 `url(...)` 的声明，防止远程字体、图片或
  跟踪资源进入微信成品；工作台预览复用同一 normalizer，恶意报头元数据保持纯文本转义。
- [x] 精确任务文件敏感扫描通过：无本机临时路径、Cookie、Token、HAR、浏览器 Profile
  或账号截图；暂存区为 0 文件。
- [x] 更新 `.trellis/spec/frontend/visual-variant-system.md` 的可执行视觉与标题对比度契约。
- [x] 记录边界：小红书/知乎发布由用户手测；微信手机预览、Dark Mode、封面缩略图、
  凭据同步、定时发送和发布仍需外部真实证据，本轮不声称完成。
- [ ] 保持任务 `in_progress`，直到原生七套视觉矩阵与所有本地门禁真实完成。

## Risk and Rollback Points

- Masthead 是共享路径：每次改动后先跑 article-masthead 与平台导出目标测试。
- Variant CSS 同时被三平台调用：微信修复不得把微信 wrapper 泄漏到 XHS/知乎。
- ExportModal 为高密度组件：只改现有布局和数据透传，不顺手清理无关诊断代码。
- 任一短 SVG 不能通过安全预检时，退回 normal-flow HTML/边框表达，不放宽白名单。
- 任一方向需要第二套 renderer 或假数据才能成立时，简化视觉表达而不是扩张架构。
