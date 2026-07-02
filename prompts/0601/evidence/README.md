# 证据采集指南 — WeChat-safe inline-SVG 旗舰排版（真机 / GUI e2e）

本目录存放 **AC1（微信真机粘贴 / 手机预览渲染）** 与 **AC8 的 GUI e2e（tauri-driver 真二进制）** 的人工 / 机器门禁证据。
自动化门禁（单测 / 冒烟 / typecheck / lint / build）、真实 Tauri e2e、真实公众号后台 PC 粘贴路径已在 `prompts/0601/COMPLETION-REPORT.md` 中留档，**不需在此重复**。注意：历史 PC sanitizer 样本覆盖 `flagship-kiln` 与 `flagship-tempera` 的程序化/浏览器 paste 路径；`flagship-amber` 已有 2026-06-09 CloakBrowser `ClipboardEvent` channel 读回和 2026-06-18 普通 OS Ctrl+V 成功证据。2026-06-18 `flagship-kiln` 普通 OS Ctrl+V 当前重试为纯文本负向证据；2026-06-19 `flagship-tempera` 原始 UTF-8 artifact 在修正可见标签页/DPI 校准后可通过普通 OS Ctrl+V 到达同一微信 PC editor 并保留 35 SVG / 3 data-ink-svg / 23 data-ink-block，但文本 mojibake 损坏且 disposable draft 已删除。随后同源 artifact 经 WeChat clipboard-safe 非 ASCII decimal entity 转换后，普通 OS Ctrl+V 在同一类 PC editor 路径读回 35 SVG / 3 data-ink-svg / 23 data-ink-block、`replacementCharCount=0`、`mojibakeHintCount=0`，且 disposable draft 已删除；该证明适用于实体安全剪贴板 payload，不等同于 raw UTF-8 artifact 直接可粘贴。三旗舰手机预览、暗黑模式、SMIL/点击、封面缩略图和发布门禁仍未完成。

> 关键事实（已对源码核实）：`[data-ink-svg]` 模块由 `preset.decorate`（= `composeSvgDecorate`）注入，**只在真实导出管线**（`convertToWechatWithStats` → `markdownToWechatWithStats`）内运行。在 UI 里该管线喂的是 **ExportModal 预览**（`.export-panel .preview-render`），**不是** Stage 迷你手机预览（后者走 mock 渲染器 `#wechat-article` / 677px，**不**含 `data-ink-svg`）。因此探针与 e2e 都在 **ExportModal** 内取证。

---

## A. 跑 tauri-driver 真二进制探针 / e2e（机器门禁）

**当前状态（2026-06-08）**：已执行并通过。最新机器日志已留档：
`build-refresh-20260608-082644.txt`（Vite built in 42.06s）、
`cargo-build-refresh-20260608-082813.txt`（`cargo build -p inkforge` dev profile 9.15s）、
`probe-svg-render-20260608-082919.txt`（A1 诊断探针）、
`e2e-svg-render-20260608-083022.txt`（A2 正式 e2e）、
`market-source-refresh-20260608.txt`（135/Xiumi/Exa/Grok 市场来源刷新）。
2026-06-08 后续 focused 机器门禁刷新已新增：
`focused-export-refresh-20260608.txt`（4 files / 64 tests passed）、
`svg-modules-refresh-20260608.txt`（15 files / 383 tests passed）、
`platform-gate-matrix-20260608.md`（当前平台门禁缺口矩阵）、
`market-rule-overnight-refresh-20260608.txt`（135/Xiumi 当前实机复核、微信官方插件规范、
XHS/Zhihu 弱来源冲突、agent 复审和聚焦测试）、
`quality-gate-hardening-20260608.txt`（WeChat/XHS/Zhihu 质量门禁阻断规则实现与验证）、
`xhs-markdown-gate-refresh-20260608.txt`（微信登录态复核 + 小红书 raw Markdown 控制符阻断门禁）、
`style-catalog-amber-paste-refresh-20260608.txt`（可执行样式选择 catalog + `flagship-amber`
普通剪贴板富 HTML 粘贴降级为纯文本的真实微信证据）。
`market-editor-element-probe-20260608.txt`（用户重新登录后对微信公众号、135、秀米的
只读浏览器元素探针；后续已追加 CloakBrowser-only applied-element rerun：点击 135/秀米
真实样式/SVG 效果、视觉确认中间编辑区/画布出现内容、再读 DOM/参数面板；不含截图、QR、
token、账号 ID、模板代码或私有素材）。
`wechat-editor-authenticated-readable-20260609.txt`（CloakBrowser `inkforge-0601` 登录态微信
编辑器只读证据：编辑器可达、`.ProseMirror` 标题/正文 DOM 可读、正文含真实音频卡，因此本轮未做
粘贴/保存/预览/发布；该证据只对应 `authenticated-editor-reachable` 和 `pc-editor-dom-readable`，
不升级为 `pc-editor-paste`、`mobile-preview`、`credentialed-sync` 或 `published`）。
`wechat-paste/amber-pc-clipboardevent-readback-20260609.txt`（CloakBrowser `inkforge-0601`
在真实微信 PC 图文编辑器里对 exact `flagship-amber.html` 触发程序化 `ClipboardEvent('paste')`
加 `DataTransfer`，微信 paste handler 接管并读回 `data-ink-svg=3` / `svg=35`。该证据只覆盖
特定 PC ClipboardEvent channel；普通 Ctrl+V、手机预览、Dark Mode、封面缩略图、同步、定时发送
和发布仍未证明）。
`style-proof-checklist-20260609.txt`（style-catalog 运行时 proof checklist：`pc-editor-paste`
必须有 exact artifact、safe disposable draft、真实 PC paste/channel event、PC DOM readback 和敏感
证据隔离；`mobile-preview` 单独要求手机读回/截图、Dark Mode 和封面缩略图检查；同次 CloakBrowser
只读复核观察到 `#js_add_appmsg` 会改变真实多图文草稿结构，因此未点击）。
`style-proof-manifest-validator-20260609.txt`（style proof manifest runtime validator：
`validateStyleProofManifest()` 阻断缺失 requirement、弱证据冒充强证据、blocked choice 被 proof
升级、平台/choice 不一致、敏感 profile/HAR/QR/cookie/token/local path 证据引用、缺 public image
host 或 XHS/Zhihu manifest validation；该 validator 不改变 availability/selectable，不证明手机预览、
同步或发布）。
`style-proof-manifest-report-20260609.txt`（style proof manifest 结构化报告 API：
`getStyleProofManifestReport()` 复用 validator，输出 requirement/artifact rows、缺失/无效/通过状态、
敏感 artifact 计数和 unsafe-commit 计数；focused Vitest 55 tests passed，ESLint exit 0；该 report
只作为证据清单/验收报告边界，不升级为平台预览、同步或发布证明；同轮完成 4-file export
94 tests passed、full export serial 988 tests passed、export ESLint/vue-tsc/build exit 0，并用
CloakBrowser `inkforge-0601` 动态导入真实 Vite 模块完成本地 runtime smoke）。
`style-proof-manifest-draft-20260609.txt`（style proof manifest 空白清单 API：
`createStyleProofManifestDraft()` 生成 `artifacts: []` 的 redacted scaffold，让 report 在真实证据采集前
列出 style-choice/evidence-label 缺口；focused Vitest 57 tests passed、4-file export 96 tests
passed、full export serial 990 tests passed、export ESLint/vue-tsc/build exit 0，并用 CloakBrowser
`inkforge-0601` 动态导入真实 Vite 模块完成 runtime smoke；不生成 mock proof artifact，不升级平台预览、
同步或发布证明）。
`style-proof-readiness-matrix-20260609.txt`（平台级 style proof readiness 矩阵：
`getPlatformStyleProofReadinessReport()` 为 WeChat/XHS/Zhihu 全部 style choices 生成空 draft
验收矩阵，列出 missing/invalid proof requirement ids 和 catalog-blocked choices；focused Vitest
58 tests passed，4-file export 97 tests passed，full export serial 991 tests passed，
ESLint/vue-tsc/build exit 0，并用 CloakBrowser `inkforge-0601` 动态导入真实 Vite 模块完成
runtime smoke；该矩阵确认 XHS image-page/long-image 与 Zhihu image-fallback/upload 的 manifest
proof requirement 平台隔离，不生成 artifact，不升级平台粘贴、手机预览、同步或发布证明）。
`style-proof-collection-plan-20260609.txt`（平台级 style proof collection plan：
`getPlatformStyleProofCollectionPlan()` 把 readiness 缺口映射为 local-evidence、market-editor、
authenticated-pc-editor、phone-preview、credentialed-channel、public-host、platform-publish
和 sensitive-hygiene 门禁；CloakBrowser `inkforge-0601` 动态导入真实 Vite 模块读回 WeChat
143 / XHS 38 / Zhihu 43 个待采集步骤。该文件是排程证据，不证明粘贴、手机预览、同步或发布成功）。
`style-proof-ui-gates-20260609.txt`（ExportModal 样式能力 UI 门禁可见化：
`getPlatformStyleProofCollectionPlan()` 的 proof summary 和 gate labels 已在真实本地 UI 中渲染；
CloakBrowser 桌面 1400×900 与移动 390×844 均无水平溢出，重启后已重复本地 UI 复核，
15 个样式卡均有 proof summary，60 个 gate 标签渲染；该文件不证明平台粘贴、手机预览、
同步或发布成功）。
`style-proof-collection-queue-20260609.txt`（当前规则实现：
`getPlatformStyleProofCollectionQueue()` 将 collection plan 按 gate 分组并给出 `nextGate` /
`nextSafeGate`；CloakBrowser 通过真实 Vite 模块读回 WeChat 143 steps / 6 gates、XHS
38 steps / 3 gates、Zhihu 43 steps / 5 gates，ExportModal 显示“下一步 本地证据”且无横向溢出；
该文件不证明平台粘贴、手机预览、同步或发布成功）。
`style-proof-progress-report-20260609.txt`（当前规则实现：
`getPlatformStyleProofProgressReport()` 将 redacted manifests 聚合为 platform / choice / gate
progress，focused Vitest 62 tests passed；该文件只证明本地 proof accounting，不证明平台粘贴、
手机预览、同步、上传、public host acceptance 或发布成功）。
`style-proof-manifest-pack-report-20260609.txt`（当前规则实现：
`getStyleProofManifestPackReport()` 将一组 redacted manifests 汇总为三平台 progress reports，并报告
unknown choices、platform mismatch、duplicate artifact ids、same-choice fingerprint mismatch 与 blocked-choice invalid progress；focused Vitest 65 tests passed。该文件只证明本地
proof intake/accounting，不证明平台粘贴、手机预览、同步、上传、public host acceptance 或发布成功）。
`style-proof-strong-gate-regression-20260609.txt`（当前规则实现：
`validateStyleProofManifest()` 负向回归门禁：authenticated editor、PC DOM、local browser 与
PC ClipboardEvent readback 不能满足 safe draft、mobile preview、credentialed sync 或 published gates；
focused Vitest 66 tests passed。该文件只证明本地 proof-gate enforcement，不证明平台粘贴、手机预览、
同步、上传、public host acceptance 或发布成功）。
`style-proof-acceptance-audit-20260609.txt`（当前规则实现：
`getPlatformStyleProofAcceptanceAuditReport()` / `getStyleProofAcceptanceAuditReport()` 将
redacted manifests 汇总为本地 acceptance audit，并把缺失、无效、external-blocked 和
unsafe-to-automate 的 proof rows 暴露为 cannotClaim；该文件只证明本地 acceptance accounting
和不能宣称规则，不证明平台粘贴、手机预览、同步、上传、public host acceptance 或发布成功）。
`style-proof-acceptance-issueids-20260618.txt`（当前规则实现：
acceptance audit 的 cannotClaim requirement rows 暴露具体 `StyleProofManifestIssueId`；
expired-session / generic DOM 证据会显示 authenticated-session 与 editor-DOM issue ids，但不
升级任何平台门禁为已完成）。
`style-proof-acceptance-ui-20260617.txt`（当前 UI 实现：
ExportModal 消费 `getPlatformStyleProofAcceptanceAuditReport()`，在样式能力摘要、单个样式卡和
导出预检里显示 cannotClaim / 验收宣称审计；该文件只证明本地 UI 防呆层，不证明平台粘贴、
手机预览、同步、上传、public host acceptance 或发布成功）。
`style-proof-committed-xhs-local-evidence-20260619.txt` 和
`xhs-cover-hook-local-evidence-20260621.txt`（当前规则实现：committed local manifest pack 已包含
`xhs-cover-carousel` 与 `xhs-cover-hook`，引用 tracked browser-canvas raster PNG 和 XHS
image-manifest gate report，只满足本地 raster / manifest / exact-artifact / sensitive-hygiene
rows；不证明 XHS account upload、platform preview、public URL acceptance 或 publish 成功）。
`xhs-markdown-card-slicer-local-evidence-20260621.txt`（当前规则实现：source-owned Markdown
card slicer 将 H2 sections、manual page breaks、lists 和 code fences 切成 4 页 1080×1440
XHS PNG；CloakBrowser 通过本地 Vite + `renderXhsPosterCard` 生成 exact raster pack，
独立 Node evidence verification 会读取 committed JSON/PNG、重算 SHA-256、重建
`XhsImageArtifactManifest` 并验证 `validateXhsImageArtifactManifest() === []`，Vitest 覆盖
Markdown 切片、SVG 安全和 manifest 输入生成；只满足本地
raster / manifest / exact-artifact / sensitive-hygiene rows，不证明 XHS account upload、
platform preview、public URL acceptance 或 publish 成功）。
`zhihu-academic-latex-local-evidence-20260621.txt` 与
`zhihu-wechat-adapted-local-evidence-20260621.txt`（当前规则实现：committed local manifest
pack 已包含 `zhihu-academic-latex-column` 与 `zhihu-wechat-adapted`；前者通过真实
`markdownToZhihuClean()` 输出 block/inline LaTeX equation img、脚注和代码块，后者把
WeChat-style `section`/inline SVG/style/class/data-ink 残留清为可读 Markdown；只满足
unit-test / exact-artifact / sensitive-hygiene rows，不证明 Zhihu public-image-host、
zhihu-artifact-manifest、account upload、platform preview、scheduled send 或 publish 成功）。
`style-proof-committed-wechat-pc-evidence-20260619.txt`（当前规则实现：
committed WeChat PC evidence pack 已包含 exact Amber ordinary OS Ctrl+V + disposable-draft cleanup
redacted proof，以及 Tempera entity-safe ordinary OS Ctrl+V + cleanup redacted proof；只满足对应
PC editor / exact artifact / safe draft / ordinary paste / hygiene rows；不证明 raw UTF-8 Tempera
直粘、Kiln 普通粘贴、手机预览、Dark Mode、封面、同步、定时发送、平台预览或发布）。
`style-proof-artifact-manifest-validation-20260619.txt`（当前规则实现：
XHS/Zhihu artifact-manifest proof rows 必须带 `artifactManifestValidated:true`，即 exact redacted
manifest 已通过对应平台 manifest validator；manifest-shaped 本地记录不能单独满足 proof，也不证明
upload、platform preview、public URL acceptance 或 publish 成功）。
`completion-gap-audit-20260617.txt`（06-01 当前完成度缺口审计：按 AC1-AC10、WeChat/XHS/Zhihu
平台 proof channel 和 hard gates 逐项标记 complete-local / partial / missing-external /
unsafe-to-automate-now；结论是本地 renderer、质量门禁和 proof accounting 已充分推进，但手机预览、
暗黑模式、移动 SMIL/click、封面入口、外部账号上传/同步/发布仍不能宣称完成）。
`market-editor-dom-learning-20260617.txt`（CloakBrowser-only applied-element refresh：
135 普通编辑器真实样式插入、135 SVG trial effect authoring blocks、秀米 SVG-gallery
image/action/layer tree；仅沉淀 DOM 学习、schema/fallback/layout-report/residue-gate
规则，不含账号、本地浏览器目录、登录凭据、扫码材料、抓包材料、截图位置、模板源码、私有 SVG 或素材 URL）。
`market-editor-applied-gate-20260617.txt`（当前规则实现：`applied-editor-element` requires
`centralEditorChanged:true`; center-unchanged library/listing probes stay invalid）。
`market-editor-placeholder-only-readback-contract-20260620.txt`（当前规则实现：
`market-applied-dom-readback` requires same-row `marketAppliedContentVerified:true`; a changed
135/Xiumi center canvas that is only placeholder/listing/no-material evidence stays invalid and
appears in acceptance-audit `cannotClaim`）。
`xiumi-svg-layer-slot-residue-contract-20260620.txt`（CloakBrowser-only Xiumi SVG applied-element
rerun：点击 SVG 图集/滚动样式后中心 `.tn-editing-panel` 真实变化但 inline SVG 仍为 0；
`tn-page-slot`、`tn-layer-slot`、`tn-child-position-*`、`tn-child-orientation-*`、`raw-image`
等细粒度 authoring residue 已落地为跨平台 publish-blocking detector）。
`xiumi-svg-gallery-state-wrapper-residue-20260620.txt`（CloakBrowser-only Xiumi v5 当前中心区
SVG 图集/游戏屏样本：`tn-image-inst-wrapper`、`tn-quick-input-*`、`tn-page-vessel`、
`tn-group-sortable-box`、`tn-sortable-pin`、`tn-state-*`、`tn-on-*` 等运行态包装残留已落地为
跨平台 publish-blocking detector；不含 profile、账号、截图路径、模板源码或素材 URL）。
`style-proof-runbook-field-criteria-20260620.txt`（当前规则实现：
execution runbook success/failure text formats required fields with field-level criteria while
preserving exact field names; `marketAppliedContentVerified:true` is explained as non-placeholder
applied DOM/controls/slots/visible content proof）。
`style-proof-phone-blocker-forbidden-contract-20260620.txt`（当前规则实现：
`phonePreviewBlocked:true` is blocker-only evidence and is forbidden on matching phone success rows;
validator、acceptance audit 和 execution runbook 均保持 phone preview / screenshot / Dark Mode / cover
thumbnail proof 不可冒领）。
`style-proof-external-account-blocker-forbidden-contract-20260620.txt`（当前规则实现：
`externalAccountLoginBlocked:true` is blocker-only evidence and is forbidden on matching
credentialed/scheduled/published success rows; validator、acceptance audit 和 execution runbook 均保持
sync / scheduled send / publish proof 不可冒领）。
`phone-preview-content-gate-20260617.txt`（当前规则实现：`mobile-preview` requires
`phonePreviewContentVerified:true`; scan/entry/setup states stay invalid）。
`phone-dark-cover-gate-20260617.txt`（当前规则实现：`dark-mode-check` requires
`darkModeEnabledVerified:true`; `cover-thumbnail-check` requires `coverThumbnailAccepted:true`;
ordinary phone screenshots and cover setup pages stay invalid）。
`pc-ordinary-paste-gate-20260617.txt`（当前规则实现：`pc-editor-paste-event` requires
`ordinaryClipboardPasteVerified:true`; programmatic ClipboardEvent/DataTransfer readback stays
invalid for ordinary Ctrl+V paste）。
`wechat-home-readonly-preflight-20260617.txt`（CloakBrowser-only 微信后台首页只读预检：
后台首页与近期草稿可读；未粘贴、保存、预览、同步、上传、定时、发布或创建草稿）。
`wechat-draftbox-readonly-preflight-20260617.txt`（CloakBrowser-only 微信草稿箱只读预检：
草稿箱列表和目标草稿可读，delete/edit/publish 动作结构可区分；edit 点击未进入文章编辑器）。
`wechat-editor-dom-readonly-refresh-20260618.txt`（CloakBrowser-only 微信 PC 编辑器只读复核：
后台首页草稿卡片可读，卡片组件的 session-bound 编辑入口可进入 PC 图文编辑器，`#js_appmsg_editor` /
`#js_ueditor` / `#js_editor` / `.edui-editor` / `.ProseMirror ProseMirror-focused` 可读；未粘贴、
保存、预览、同步、上传、定时、发布或创建草稿，不升级为普通 Ctrl+V、手机预览或发布证明）。
`wechat-ordinary-paste-os-clipboard-preflight-20260618.txt`（当前本机工具预检：
`inkforge/scripts/set-windows-html-clipboard.ps1` 可为三旗舰 artifact 生成 Windows CF_HTML
剪贴板 payload metadata；dry-run 显示每个 artifact 均为 `svgCount=35` / `dataInkSvgCount=3`。
该预检不写微信、不粘贴、不保存、不证明普通 Ctrl+V；只有后续在安全可清理草稿中完成 OS
剪贴板 Ctrl+V、DOM 读回和清理复核后，才能设置 `ordinaryClipboardPasteVerified:true`）。
`cloakbrowser-os-ctrlv-local-probe-20260618.txt`（当前本机工具负向预检：
CloakBrowser 本地受控 textarea 页面可被前台化，Win32 `SendInput` 可被系统接受并产生
`Unidentified` keydown，但未产生 `paste` / `input`，哨兵字符串未插入；该结果不证明普通
Ctrl+V，且在建立可靠非 Playwright 键盘通道或人工隔离粘贴证明前，不应触碰真实微信草稿）。
`cloakbrowser-os-ctrlv-richhtml-local-probe-20260618.txt`（当前本机工具正向预检：
CloakBrowser 干净本地受控页 + 校准 OS 点击 + Windows `keybd_event` Ctrl+V 可产生 trusted
`paste` / `input`；真实 `flagship-tempera.html` CF_HTML 粘贴到本地 contenteditable 后读回
`svgCount=35` / `dataInkSvgCount=3`。该结果只解锁本地工具链前置门槛，不证明微信草稿粘贴）。
`wechat-draftbox-cleanup-path-readonly-20260618.txt`（CloakBrowser-only 微信草稿箱清理路径
只读预检：草稿箱可达，草稿卡片暴露 delete/edit/publish 动作分类，删除确认/取消控件可发现，
“新的创作”下拉可读但文章创建入口为前端事件处理；本证据只证明清理 affordance，不创建、
编辑或删除草稿，不设置 `cleanupPathVerified:true`，不满足 `safe-disposable-draft`；后续
focused regression 确认 draftbox affordance doc-reference 仍不能通过 safe draft gate）。
`wechat-session-expired-gate-20260618.txt`（CloakBrowser-only 微信会话状态预检：
当前微信后台入口返回重新登录状态；新增 `authenticatedSessionVerified:true` 与
`platformEditorDomVerified:true` 运行时门禁，登录/重登/过期会话页不能满足 authenticated editor
或 PC editor DOM 证明）。
`wechat-auth-draftbox-readonly-refresh-20260618.txt`（CloakBrowser-only 微信后台/草稿箱只读复核：
后续会话已回到 authenticated backend / draftbox 状态，草稿箱可读且 delete/edit/publish 动作可区分；
本轮 edit 打开尝试仍停留在草稿箱列表，未读到 PC editor DOM，未粘贴/保存/预览/发布/删除）。
`wechat-editor-dom-current-readonly-20260618.txt`（CloakBrowser-only 微信 PC 编辑器当前只读复核：
通过草稿卡 Vue 组件的 `editUrl` 与当前 authenticated backend session 参数进入 PC editor；
`#js_appmsg_editor` / `#js_ueditor` / `#js_editor` / `.edui-editor` / `.ProseMirror` 可读；
未粘贴、编辑、保存、预览、同步、上传、定时、发布或删除）。
`wechat-disposable-draft-runbook-20260618.md`（真实微信 disposable draft 运行手册：
规定创建、普通 OS Ctrl+V、手机预览、清理和 manifest flag 映射的唯一安全路径；当前只是
pre-mutation contract，尚未创建、粘贴、预览、删除或证明 disposable draft 缺失）。
`wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt`（CloakBrowser-only 真实微信 PC
编辑器验收：`flagship-amber.html` 通过 Windows `keybd_event` 普通 OS Ctrl+V 写入 disposable draft；
PC editor DOM 读回 `svgCount=35` / `dataInkSvgCount=3` / `dataInkBlockCount=23`；同一
disposable draft 已删除，并经稳定 DOM 与刷新后草稿箱读回证明标题缺失；后续还清理了一个
无标题 InkForge/Amber 残留草稿并刷新验证计数为 0。仅证明 Amber PC 普通粘贴与清理，
不证明手机预览、Dark Mode、封面、同步、定时或发布）。
`market-editor-residue-gate-20260609.txt`（CloakBrowser applied-element 规则落地为 runtime
质量门禁：WeChat/XHS/Zhihu 分别阻断 135/秀米 authoring residue，普通文字提到 135/秀米不误报；
focused Vitest 42 tests passed，4-file export regression 81 tests passed，full export serial 975
tests passed，ESLint/vue-tsc/build exit 0，CloakBrowser local visual check done；不含截图路径、
账号数据、模板源码或私有素材）。
`layout-report-runtime-gate-20260609.txt`（CloakBrowser applied-element 的图层/自由布局规则落地为
WeChat runtime 门禁：`wechat-layout-report-required` 阻断自由定位、z-order、背景图层、裁切、
固定几何、手动位移、负 margin 和隐藏触发区；普通自有 inline flow 色块不误报；focused Vitest
44 tests passed，4-file export regression 83 tests passed，full export serial 977 tests passed，
ESLint/vue-tsc/build exit 0，CloakBrowser local visual check done；不含截图路径或账号数据）。
`xhs-image-manifest-gate-20260609.txt`（小红书 image-page / cover / long-image 本地 artifact
manifest runtime 门禁：`validateXhsImageArtifactManifest()` 阻断页序、封面、文件存在性、正文引用、
比例/尺寸、格式、bytes 与裁切问题；`convertToNativeFormat(..., 'xiaohongshu')` 只把 manifest
作为 local preflight artifact 返回，不升级为上传、预览或发布证明；focused XHS/export 69 tests
passed，4-file export regression 85 tests passed，full export serial 979 tests passed，ESLint/vue-tsc/build
exit 0，CloakBrowser `inkforge-0601` local visual check done；不含截图路径、账号数据或平台发布声称）。
`xhs-raster-manifest-builder-20260619.txt`（当前规则实现：
`createXhsImageArtifactManifestFromRaster()` 将真实 raster metadata/data URL 转为
`XhsImageArtifactManifest`，并继续要求 `validateXhsImageArtifactManifest()` 通过；缺 bytes、
不支持比例、缺尺寸或不支持格式会抛错，不伪造本地 readiness，不证明 XHS 上传、预览、public URL 或发布）。
`xhs-raster-pack-manifest-builder-20260619.txt`（当前规则实现：
`createXhsImageArtifactManifestFromRasterArtifacts()` 将多页/轮播真实 raster metadata 转为
`XhsImageArtifactManifest`，排序页码、默认首图封面、派生正文引用，并继续让
`validateXhsImageArtifactManifest()` 阻断重复页、引用不一致、缺文件、比例/格式/bytes/crop 问题；
不证明 XHS 上传、预览、public URL 或发布）。
`zhihu-image-manifest-builder-20260619.txt`（当前规则实现：
`createZhihuImageArtifactManifest()` 将真实 public-host / platform-host image metadata 转为
`ZhihuImageArtifactManifest`，并继续要求 `validateZhihuImageArtifactManifest()` 通过；local fallback
缺 `exists:true`、bytes、alt、语义 caption/textFallback，或伪造 host/upload 状态都会失败；不证明知乎账号上传、
编辑器预览、同步或发布）。
`zhihu-image-manifest-gate-20260609.txt`（知乎 formula/diagram/table/inline/cover image fallback
本地/平台 host artifact manifest 门禁：`validateZhihuImageArtifactManifest()` 阻断 host、上传证明、
本地文件、alt/caption、格式、尺寸、bytes 与 Markdown 引用不一致；`convertToNativeFormat(..., 'zhihu')`
只回传 `artifacts.zhihuImageArtifactManifest` 作为 preflight，不升级为知乎上传、编辑器预览、同步或发布证明；
focused cross-platform 87 tests passed，full export serial 981 tests passed，ESLint/vue-tsc/build exit 0）。
`pnpm -C inkforge test:e2e` 由
`onPrepare` 真实 `cargo build`，通过 `tauri-driver.exe` + `msedgedriver.exe` 驱动真
Tauri/WebView2 二进制；`svg-render.spec.cjs` 5 tests passed，`visual.spec.cjs` 11 tests
passed。证据截图已存 `prompts/0601/evidence/e2e/flagship-{kiln,tempera,amber}.png`。

### A0. 前置（探针与 spec 都**不自带 build**）

1. **刷新嵌入 dist**（Tauri 在 cargo build 时把 `inkforge/dist` 嵌进二进制，视觉/代码改动不 rebuild 就看不到）：
   ```bash
   cd D:/Desktop/Inkforge/inkforge
   pnpm build            # 串行、限 node 内存，避免 OOM；build 时不要同时开 tauri:dev
   ```
2. **编译 debug 二进制**（产物 `inkforge/src-tauri/target/debug/InkForge.exe`）：
   ```bash
   cd D:/Desktop/Inkforge/inkforge/src-tauri
   cargo build -p inkforge        # 或：cd ../ && pnpm tauri build --debug
   ```
   > `wdio.conf.cjs` 的 `onPrepare` 会替你跑 `cargo build`，但 `pnpm build` 必须**先手动**跑，确保嵌入的 dist 是新的。
3. **准备 driver**（与 `wdio.conf.cjs` / `paint-h1.cjs` 一致的 fallback 路径）：
   - `tauri-driver.exe`：在 PATH 或 `~/.cargo/bin/tauri-driver.exe`；可用 `TAURI_DRIVER_PATH` 覆盖。
   - `msedgedriver.exe`：与本机 WebView2 运行时版本匹配，在 `~/.local/bin/msedgedriver.exe`；可用 `MSEDGE_DRIVER_PATH` 覆盖。
   ```bash
   # PowerShell 示例（按实际路径调整）
   $env:TAURI_DRIVER_PATH="$HOME\.cargo\bin\tauri-driver.exe"
   $env:MSEDGE_DRIVER_PATH="$HOME\.local\bin\msedgedriver.exe"
   ```

### A1. 诊断探针（人读几何，非 graded）
```bash
cd D:/Desktop/Inkforge/inkforge
node tests/e2e/probes/svg-render.cjs
```
对每个旗舰预设（赤陶 / 铜绿 / 黄铜）打印每个 `[data-ink-svg]` 模块的 bbox / viewBox / `width:100%` 与容器的 delta、`#nice` 列宽、charsPerLine，并给出 VERDICT（OK / NO-SVG / VIEWBOX-MISSING / WIDTH-DRIFT / PAINT-CULLED / NICE-WIDTH-OUT-OF-BAND / CHARS-OUT-OF-BAND）。把整段 stdout 存为 `prompts/0601/evidence/probe-svg-render-<日期>.txt`。

2026-06-08 当前探针结果说明：`probe-svg-render-20260608-082919.txt` 对三旗舰均确认
`moduleCount=2`、`viewBox` 存在、`widthAttr=100%`、`deltaToParent=0`，SVG 几何与响应式宽度
正常；同时因诊断脚本读取的是 401px ExportModal 宽列与 15px 字号，VERDICT 报
`CHARS-OUT-OF-BAND: 27/line`。该脚本是人读几何诊断，不是 AC3 graded gate；正式 AC3 仍以
`svg-render.spec.cjs` 在移动排版口径下的真实字形布局断言为准，当前 A2 e2e 已通过。

### A2. 正式 e2e spec（graded，wdio）
```bash
cd D:/Desktop/Inkforge/inkforge
pnpm test:e2e      # wdio.conf.cjs 收集 tests/e2e/specs/*.spec.cjs，含 svg-render.spec.cjs
```
`svg-render.spec.cjs` 断言（容差带）：
- 每个旗舰预设在 ExportModal 预览注入 ≥1 个 `[data-ink-svg]` 模块；每模块含 `<svg>` 且 `viewBox` 形如 `0 0 W H`；`width:100%` 跟随容器（delta < 2.5px）；painted width > 0（捕捉 WebView2 0×0 culling）。
- `#nice` 正文列宽落在 300–460px（移动端框 ~375px）；最长 CJK 段 charsPerLine 落在 16–24（目标 ~18–22，**AC3**）。

> **若 harness 无已加载文章**：Stage「全屏导出」按钮为 `:disabled`，spec 会**优雅 skip** 并打印诊断（不是 fail）。请先在 Workstation 打开/新建一篇草稿再跑。
> 把 wdio 报告 / 终端输出存为 `prompts/0601/evidence/e2e-svg-render-<日期>.txt`，失败截图（若有）存本目录。

---

## B. 真机手动验证（微信公众号后台，AC1）

**当前状态（2026-06-08）**：

- 已完成：真实 `mp.weixin.qq.com` PC 图文编辑器粘贴路径验证。Playwright 触发真实 `text/html` paste 事件后，微信编辑器 paste sanitizer 在 `flagship-kiln` / `flagship-tempera` 样本中保留 inline SVG / `data-ink-svg`，并在 PC 编辑器中可视化渲染封面、分隔线、引用卡和文末结束标。
- 已完成：PC 粘贴验证暴露的封面长标题溢出已修复，并通过重粘验证 `coverMaxOverflowPx` 为负值，标题落在 viewBox 内。
- 已补充：`flagship-amber` 的 CloakBrowser 程序化 `ClipboardEvent` PC 编辑器读回证据（同一 artifact 读回 `data-ink-svg=3` / `svg=35`），以及 2026-06-18 普通 OS Ctrl+V 成功读回（`svg=35` / `data-ink-svg=3`）和 disposable draft 清理证据。`flagship-kiln` 在 2026-06-18 type=10/type=77 普通 OS Ctrl+V 重试中均降级为纯文本并已清理失败草稿。未完成：微信手机端扫码预览 / 最终手机渲染 / SMIL 交互 / 暗黑模式 / 封面缩略图确认。手机端步骤需要公众号后台封面缩略图、手机微信和扫码预览，不能用本地浏览器或 PC 后台 DOM 证据替代。

对**每个旗舰预设**（赤陶旗舰 / 铜绿旗舰 / 黄铜旗舰）执行：

1. 启动真应用：`cd D:/Desktop/Inkforge/inkforge && pnpm tauri:dev`（或运行 A0 编译出的 `InkForge.exe`）。**手测一律走 Tauri，不要走浏览器/vite。**
2. 打开/新建一篇含 **h2 / h3 标题 + 多段中文正文 + `---` 分隔线 + `>` 引用块** 的草稿（命中 cover / header / divider / quote / endmark 全部锚点）。
3. Workstation → Stage 面板 →「全屏导出」打开 ExportModal → 平台选「微信」→ 选中该旗舰预设卡片。
4. 确认 ExportModal 预览（`.preview-render`）出现 SVG 标题头 / 分隔线 / 引用卡 / 封面 / 文末结束标，且正文每行 ≈ 20–22 个汉字。
5. 复制导出 HTML → 在 **PC 浏览器**打开微信公众号后台图文编辑器正文区 → 粘贴。
6. 插入/选择一张符合微信要求的封面缩略图，然后点「预览」，用**手机微信**扫码打开。
7. 在手机微信里确认渲染：
   - 章节标题头（ribbon / bracket / vrule）显示，配色 = 该预设品牌色；
   - 分隔线（forge / diamond / grid）显示；
   - 引用卡（mark / corner / vbar）显示，原引用文字在内；
   - 文末结束标（vessel / fin / rule，含 ◇◇◇）显示；
   - 正文每行约 20–22 字（不被 SVG 撑破行宽）；
   - 暗黑模式下 SVG 不反色（自带不透明背景 rect）；
   - 点击/SMIL 交互若该产物包含互动模块，必须在手机微信预览里真实触发，不能用 PC 后台 DOM 或本地 e2e 替代；
   - 无裸标签泄漏、无 `<style>`/class 残留。
8. 手机截图存本目录，命名 `wechat-<presetId>-mobile-<日期>.png`（如 `wechat-flagship-kiln-mobile-20260608.png`）。

---

## C. 证据清单（采集后逐项打勾）

```
[x] build-refresh-20260608-082644.txt   # A0 PROD dist 刷新，Vite built in 42.06s
[x] cargo-build-refresh-20260608-082813.txt # A0 Tauri debug 二进制编译，9.15s
[x] probe-svg-render-20260608-082919.txt # A1 探针 stdout；SVG 几何 OK，chars/line 诊断提示见上文
[x] e2e-svg-render-20260608-083022.txt   # A2 wdio spec：2 spec files / 16 tests passed
[x] market-source-refresh-20260608.txt   # 市场来源刷新：135/Xiumi/Exa/Grok，非敏感文本证据
[x] focused-export-refresh-20260608.txt  # focused 导出测试：4 files / 64 tests passed
[x] svg-modules-refresh-20260608.txt     # SVG 模块 + 旗舰产物 emitter：15 files / 383 tests passed
[x] platform-gate-matrix-20260608.md     # 历史平台门禁矩阵：机器门禁完成；WeChat 手机门禁仍缺，amber 普通 Ctrl+V 仍阻断
[x] market-rule-overnight-refresh-20260608.txt # 当前市场规则硬化：135/Xiumi/WeChat official/XHS/Zhihu/agent 复审
[x] quality-gate-hardening-20260608.txt # 当前质量门禁实现：WeChat/XHS/Zhihu 阻断规则 + tests/lint/typecheck/build
[x] xhs-markdown-gate-refresh-20260608.txt # 当前质量门禁实现：XHS raw Markdown 控制符阻断 + WeChat 登录态复核
[x] style-catalog-amber-paste-refresh-20260608.txt # 当前规则实现：style-catalog typed choices + amber paste blocked proof
[x] market-editor-element-probe-20260608.txt # 本轮只读浏览器元素探针 + CloakBrowser applied-element rerun：WeChat 后台 + 135/Xiumi taxonomy/应用元素规则
[x] wechat-editor-authenticated-readable-20260609.txt # 当前微信后台：CloakBrowser 登录态编辑器可达且 DOM 可读；不含粘贴/预览/保存/发布
[x] wechat-paste/amber-pc-clipboardevent-readback-20260609.txt # 当前微信后台：amber exact artifact 的特定 ClipboardEvent channel PC DOM readback；普通 Ctrl+V/手机/发布仍未证明
[x] style-proof-checklist-20260609.txt # 当前规则实现：evidence label -> proof requirement 清单；safe draft/phone/Dark Mode/cover gates 独立
[x] style-proof-manifest-validator-20260609.txt # 当前规则实现：StyleProofManifest runtime validator；proof 质量门禁，不升级 platform success
[x] style-proof-collection-plan-20260609.txt # 当前规则实现：readiness gaps -> collection gates；区分本地自动化/账号/手机/发布/敏感清洁门禁
[x] style-proof-ui-gates-20260609.txt # 当前 UI 实现：ExportModal 显示 proof summary/gate labels；CloakBrowser 桌面/移动无横向溢出
[x] style-proof-collection-queue-20260609.txt # 当前规则实现：collection gates -> ordered queue；CloakBrowser runtime queue readback + UI next gate
[x] style-proof-progress-report-20260609.txt # 当前规则实现：redacted manifests -> platform/choice/gate proof progress；focused tests passed
[x] style-proof-manifest-pack-report-20260609.txt # 当前规则实现：redacted manifest pack -> three platform progress reports + pack issues
[x] style-proof-strong-gate-regression-20260609.txt # 当前规则实现：弱证据不能满足 safe draft/mobile/sync/publish 强门禁
[x] style-proof-acceptance-audit-20260609.txt # 当前规则实现：redacted manifests -> acceptance audit cannotClaim rows
[x] style-proof-acceptance-issueids-20260618.txt # 当前规则实现：acceptance audit cannotClaim rows expose concrete issue ids
[x] style-proof-acceptance-ui-20260617.txt # 当前 UI 实现：ExportModal surfaces acceptance audit cannotClaim rows
[x] style-proof-committed-local-evidence-20260617.txt # 当前规则实现：committed local evidence manifests -> local gates only; external claims remain open
[x] style-proof-committed-xhs-local-evidence-20260619.txt # 当前规则实现：XHS committed local raster + manifest rows; upload/preview/publish remain open
[x] style-proof-committed-wechat-pc-evidence-20260619.txt # 当前规则实现：Amber raw + Tempera entity-safe committed WeChat PC paste/cleanup rows; phone/sync/publish remain open
[x] style-proof-committed-evidence-combined-audit-20260620.txt # 当前规则实现：committed local + WeChat PC combined audit exposes fingerprint conflicts; external claims remain open
[x] style-proof-committed-evidence-runbook-report-20260620.txt # 当前规则实现：committed local + WeChat PC execution runbook report keeps operator gates unclaimed
[x] style-proof-committed-evidence-release-gate-20260620.txt # 当前规则实现：committed evidence release gate returns canClaimComplete=false until local/external blockers close
[x] style-proof-local-actionability-20260622.txt # 当前规则实现：committed local safe open rows -> actionable-local/catalog-blocked split; external proof rows stay in external checklist
[x] exportmodal-release-gate-preflight-20260620.txt # CloakBrowser local UI check：ExportModal preflight exposes canClaimComplete=false without closing external gates; current conflict count is refreshed by style-proof-amber-reconciliation-20260621.txt
[x] style-proof-artifact-manifest-validation-20260619.txt # 当前规则实现：XHS/Zhihu artifact manifests require validator-passed proof flag
[x] completion-gap-audit-20260617.txt # 当前完成度审计：AC1-AC10 + WeChat/XHS/Zhihu hard gates；总任务仍未完成
[x] market-editor-dom-learning-20260617.txt # CloakBrowser-only applied DOM refresh：135/Xiumi 规则学习；无账号/本地浏览器目录/登录凭据/扫码材料/模板源码
[x] market-editor-applied-gate-20260617.txt # 当前规则实现：applied-editor-element requires centralEditorChanged:true; center-unchanged library/listing probes stay invalid
[x] market-editor-placeholder-only-readback-contract-20260620.txt # 当前规则实现：market-applied-dom-readback also requires marketAppliedContentVerified:true
[x] xiumi-svg-layer-slot-residue-contract-20260620.txt # CloakBrowser-only Xiumi applied SVG layer-slot/raw-image residue -> runtime blocker
[x] xiumi-svg-gallery-state-wrapper-residue-20260620.txt # CloakBrowser-only Xiumi applied SVG gallery state-wrapper residue -> runtime blocker
[x] style-proof-runbook-field-criteria-20260620.txt # 当前规则实现：execution runbook requiredFields use field-level criteria text, not raw names only
[x] style-proof-phone-blocker-forbidden-contract-20260620.txt # 当前规则实现：phonePreviewBlocked:true is forbidden on matching phone success rows
[x] style-proof-external-account-blocker-forbidden-contract-20260620.txt # 当前规则实现：externalAccountLoginBlocked:true is forbidden on matching credentialed/publish success rows
[x] phone-preview-content-gate-20260617.txt # 当前规则实现：mobile-preview requires phonePreviewContentVerified:true; scan/entry/setup states stay invalid
[x] phone-dark-cover-gate-20260617.txt # 当前规则实现：Dark Mode/cover thumbnail require explicit verified mobile state flags
[x] style-proof-phone-runbook-failure-signals-20260619.txt # 当前规则实现：执行手册明确拒绝 scan/setup/PC preview shell/cover-setting 等手机伪证据；不证明手机端通过
[x] pc-ordinary-paste-gate-20260617.txt # 当前规则实现：ordinary PC paste requires ordinaryClipboardPasteVerified:true
[x] wechat-home-readonly-preflight-20260617.txt # 当前平台状态：CloakBrowser 微信后台首页可达；只读，不证明编辑器/手机/发布
[x] wechat-draftbox-readonly-preflight-20260617.txt # 当前平台状态：CloakBrowser 微信草稿箱可达；edit 未进入文章编辑器
[x] wechat-editor-dom-readonly-refresh-20260618.txt # 当前平台状态：CloakBrowser 微信 PC 编辑器可达且 DOM 可读；未粘贴/保存/预览/发布
[x] wechat-ordinary-paste-os-clipboard-preflight-20260618.txt # 当前本机工具预检：三旗舰可生成 CF_HTML；不是微信 Ctrl+V 证明
[x] cloakbrowser-os-ctrlv-local-probe-20260618.txt # 当前本机工具负向预检：OS SendInput 在 CloakBrowser 控制页只产生 Unidentified keydown；不是普通 Ctrl+V 证明
[x] cloakbrowser-os-ctrlv-richhtml-local-probe-20260618.txt # 当前本机工具正向预检：keybd_event Ctrl+V + CF_HTML 在本地 contenteditable 中保留 SVG；不是微信草稿证明
[x] wechat-draftbox-cleanup-path-readonly-20260618.txt # 当前平台状态：草稿箱清理 affordance 可读；未创建/删除 disposable draft，不满足 cleanupPathVerified
[x] wechat-session-expired-gate-20260618.txt # 当前平台状态：微信后台要求重新登录；登录/过期页不能满足 authenticated editor 或 PC DOM proof
[x] wechat-session-timeout-readonly-recheck-20260621.txt # 当前平台状态：微信后台再次返回登录超时；validator 回归确认不能满足 authenticated editor / PC DOM proof
[x] wechat-auth-draftbox-readonly-refresh-20260618.txt # 当前平台状态：微信后台/草稿箱重新可达；本轮 edit 仍未进入 PC editor DOM
[x] wechat-editor-dom-current-readonly-20260618.txt # 当前平台状态：微信 PC editor DOM 重新可读；未粘贴/保存/预览/发布
[x] wechat-disposable-draft-runbook-20260618.md # pre-mutation contract：真实 disposable draft 创建/粘贴/手机/清理门禁步骤
[x] wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt # 当前平台状态：Amber 在微信 PC editor 通过普通 OS Ctrl+V 保留 35 SVG/3 data-ink-svg，并完成 disposable draft 删除/缺失读回；手机/同步/发布仍未证明
[x] wechat-kiln-ordinary-ctrlv-plain-text-cleanup-20260618.txt # 当前平台负向证据：Kiln 在 type=10/type=77 微信 PC editor 中普通 OS Ctrl+V 只进入纯文本，0 SVG/0 data-ink-svg；失败草稿已清理且不得设置 ordinaryClipboardPasteVerified:true
[x] wechat-kiln-entity-ordinary-ctrlv-editor-return-cleanup-20260619.txt # 当前平台负向证据：Kiln entity-safe CF_HTML 已准备并发送普通 OS Ctrl+V，但编辑器返回草稿列表且无正文 DOM 读回；current-run 未命名草稿已清理，不得设置 ordinaryClipboardPasteVerified:true
[x] wechat-tempera-ordinary-ctrlv-input-bridge-blocked-20260619.txt # 当前平台负向证据：Tempera exact CF_HTML 已写入剪贴板，但 keybd_event/SendInput/SendKeys 均未触发页面 key/paste/input 或正文 mutation；不得设置 ordinaryClipboardPasteVerified:true
[x] wechat-tempera-ordinary-ctrlv-mojibake-cleanup-20260619.txt # 当前平台负向证据：Tempera 同页普通 OS Ctrl+V 保留 35 SVG/3 data-ink-svg/23 data-ink-block，但 replacement/mojibake=1118；deterministic draft 已 ret=0 删除
[x] market-editor-residue-gate-20260609.txt # 当前规则实现：135/秀米 authoring residue 三平台 runtime 阻断 + focused tests/lint
[x] layout-report-runtime-gate-20260609.txt # 当前规则实现：WeChat 自由布局/图层/背景/触发区 runtime 阻断 + CloakBrowser local visual
[x] wechat-classic-inline-local-evidence-20260621.txt # 当前规则实现：WeChat classic inline 本地 unit/exact HTML artifact；不证明 PC 粘贴/手机/发布
[x] wechat-quiet-editorial-local-evidence-20260621.txt # 当前规则实现：WeChat quiet editorial 本地 browser/exact HTML artifact；不证明 PC 粘贴/手机/发布
[x] wechat-toolbar-parameter-map-local-evidence-20260622.txt # 当前规则实现：WeChat toolbar 参数映射本地 browser/exact HTML artifact；不证明 PC 粘贴/手机/发布
[x] wechat-cover-seal-divider-local-evidence-20260622.txt # 当前规则实现：WeChat cover/seal/divider 本地 browser/exact HTML artifact；不证明 PC 粘贴/手机/发布
[x] wechat-card-rich-local-evidence-20260622.txt # 当前规则实现：WeChat rich card/timeline/gallery 本地 browser/exact HTML artifact；不证明 PC 粘贴/手机/发布
[x] xhs-image-manifest-gate-20260609.txt # 当前规则实现：XHS image artifact manifest 本地 preflight 门禁 + CloakBrowser local visual
[x] xhs-raster-manifest-builder-20260619.txt # 当前规则实现：real raster metadata/data URL -> XHS manifest builder; no upload/publish claim
[x] xhs-long-report-local-evidence-20260621.txt # 当前规则实现：XHS long-report 本地 4 页 CloakBrowser raster pack + manifest；本地可用但未发布
[x] xhs-market-rich-card-fallback-local-evidence-20260621.txt # 当前规则实现：XHS market-rich fallback 本地 4 页 CloakBrowser raster pack + manifest；本地可用但未发布
[x] zhihu-image-manifest-gate-20260609.txt # 当前规则实现：Zhihu image fallback artifact manifest 本地/host preflight 门禁
[x] e2e/flagship-kiln.png                # A2 真 WebView2：赤陶旗舰 SVG 注入截图
[x] e2e/flagship-tempera.png             # A2 真 WebView2：铜绿旗舰 SVG 注入截图
[x] e2e/flagship-amber.png               # A2 真 WebView2：黄铜旗舰 SVG 注入截图
[x] xhs-raster/xhs-raster-cover-grid-browser-*.png  # AC6 真浏览器 canvas：小红书 3:4 PNG 产图
[x] xhs-raster/xhs-long-report-browser-2026-06-21.json  # XHS long-report 本地 manifest pack
[x] xhs-raster/xhs-long-report-browser-2026-06-21-page-*.png  # XHS long-report 4 页 1080x1440 PNG
[x] xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21.json  # XHS market-rich fallback 本地 manifest pack
[x] xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21-page-*.png  # XHS market-rich fallback 4 页 1080x1440 PNG
[x] xhs-style-choice-application-mapping-20260622.txt # XHS data-card / long-report / market-rich fallback 映射到现有真实小红书 presets；不证明上传/发布
[x] wechat-classic-inline-local-artifact-20260621.html # WeChat classic inline 本地 exact HTML artifact
[x] wechat-quiet-editorial-local-artifact-20260621.html # WeChat quiet editorial 本地 exact HTML artifact
[x] wechat-toolbar-parameter-map-local-artifact-20260622.html # WeChat toolbar 参数映射本地 exact HTML artifact
[x] wechat-cover-seal-divider-local-artifact-20260622.html # WeChat cover/seal/divider 本地 exact HTML artifact
[x] wechat-card-rich-local-artifact-20260622.html # WeChat card-rich 本地 exact HTML artifact
[x] wechat-paste/wechat-*.png            # B PC 后台：真实公众号编辑器粘贴/重粘截图（kiln/tempera 路径证据）
[ ] wechat-paste/wechat-amber-*.png      # B PC 后台：黄铜旗舰可提交截图补证；当前只有脱敏文本读回，普通剪贴板路径已失败
[ ] wechat-flagship-kiln-mobile-<日期>.png      # B 手机预览：赤陶旗舰公众号渲染
[ ] wechat-flagship-tempera-mobile-<日期>.png   # B 手机预览：铜绿旗舰公众号渲染
[ ] wechat-flagship-amber-mobile-<日期>.png     # B 手机预览：黄铜旗舰公众号渲染
[ ] charsperline-<presetId>-<日期>.png   # 推荐：标尺/字数佐证 20-22 字/行（AC3）
[ ] darkmode-flagship-kiln-<日期>.png       # B 手机暗黑模式：赤陶旗舰不反色/不丢背景
[ ] darkmode-flagship-tempera-<日期>.png    # B 手机暗黑模式：铜绿旗舰不反色/不丢背景
[ ] darkmode-flagship-amber-<日期>.png      # B 手机暗黑模式：黄铜旗舰不反色/不丢背景
[ ] smil-interaction-<presetId>-<日期>.png  # B 手机互动：若文章含 SMIL/click 模块，记录触发前后
```

把截图直接放本目录（`prompts/0601/evidence/`）。文本日志同目录。

---

## D. 说明（与 COMPLETION-REPORT 一致）

- 最新自动化门禁与真实 Tauri e2e 已覆盖三旗舰；历史真实公众号后台 PC 粘贴路径覆盖 kiln/tempera 的 PC sanitizer 可视化样本，但不等同于当前普通 OS Ctrl+V 富 HTML/SVG 证明。`flagship-amber` 已在 2026-06-18 用普通 OS Ctrl+V 保留 35 个 SVG 并完成 disposable draft 清理；`flagship-kiln` 在同日 CloakBrowser type=10/type=77 微信 PC editor 普通 OS Ctrl+V 重试中只进入纯文本，0 SVG / 0 `data-ink-svg`，失败草稿已清理。2026-06-09 CloakBrowser 程序化 `ClipboardEvent` channel 对 exact amber artifact 的 PC DOM readback 保留 `data-ink-svg=3` / `svg=35`。因此当前剩余手动门禁是：微信手机端扫码预览截图、SMIL/点击交互确认、三旗舰手机暗黑模式确认、封面缩略图入口确认，以及 Kiln/Tempera 普通 Ctrl+V 富 HTML/SVG、插件/授权同步等其他渠道若要对外宣称时的单独证明。
- 2026-06-09 CloakBrowser `inkforge-0601` 复核证明当前账号可进入微信 PC 图文编辑器，并能读取顶层 `.ProseMirror` 标题/正文 DOM；但当前草稿正文含真实音频卡，未执行任何粘贴、保存、预览或发布。该证据只能作为 `authenticated-editor-reachable` / `pc-editor-dom-readable`，不得外推为 `pc-editor-paste` 或手机端证明。
- 2026-06-09 runtime proof checklist 已落到 `style-catalog.ts`：`pc-editor-paste` 的安全前置包括 `safe-disposable-draft`；本轮只读探测到的 `#js_add_appmsg` 会改变真实多图文草稿结构，未点击，不能作为粘贴测试入口。
- 2026-06-18 CloakBrowser 本地 OS 键盘探针只能在受控 textarea 页面产生
  `Unidentified` keydown，不能产生 `paste` / `input`，因此不能作为普通 Ctrl+V 证据。
  在建立可靠非 Playwright 键盘通道或明确隔离的人工粘贴证明前，不应对真实微信草稿执行自动
  ordinary-paste 验收。
- 2026-06-09 `validateStyleProofManifest()` 已落到 `style-catalog.ts`：它验证 redacted proof manifest 是否覆盖 required proof items、是否同一 artifact、是否真实平台 action/readback、是否误用弱证据、是否引用敏感本地/profile/HAR/QR/token/cookie 材料。它不改变 style availability、selectable 状态，也不等于平台预览、同步或发布成功。
- 真 canvas 栅格化（小红书海报）仅在浏览器/Tauri 有 DOM 时运行；2026-06-08 已用 Playwright Chromium 动态导入实际 `renderXhsPosterCard()` 产出 1080×1440 PNG。2026-06-09 已补强知乎 preview-fidelity：`renderZhihuMockHtml()` 会把 `section[data-ink-svg]` inline SVG 转成 `<img data-ink-svg src="data:image/svg+xml...">` image fallback，并由 focused Vitest 覆盖。该本地预览证据不等于知乎 public host、上传、同步或发布成功。
- 2026-06-09 小红书 image artifact manifest 已落到 runtime preflight：`XhsImageArtifactManifest`
  与 `validateXhsImageArtifactManifest()` 只证明本地图片页/封面/长图 artifact 的文件、页序、封面、
  引用、比例、格式、bytes 和裁切状态；`NativeExportResult.artifacts.xiaohongshuImageManifest`
  不是小红书账号上传、手机预览或发布证明。
- 2026-06-09 知乎 image artifact manifest 已落到 runtime preflight：`ZhihuImageArtifactManifest`
  与 `validateZhihuImageArtifactManifest()` 只证明公式图、图表图、表格图、正文图和封面图 fallback
  的 host、上传证明、本地文件、alt/caption、格式、尺寸、bytes 与 final Markdown 引用一致性；
  `NativeExportResult.artifacts.zhihuImageArtifactManifest` 不是知乎账号上传、编辑器预览、同步或发布证明。

## 2026-06-17 Safe Draft Cleanup Gate

- [x] style-proof-safe-draft-cleanup-gate-20260617.txt
- This local proof-gate entry records that `safe-disposable-draft` now requires
  `disposableDraft:true` and `cleanupPathVerified:true` on the same platform-editor proof artifact.
- It is not platform proof. It does not claim a real draft, cleanup action, phone preview, sync,
  upload, schedule, or publish.

## 2026-06-17 WeChat Backend Session Preflight

- [x] wechat-backend-session-preflight-20260617.txt
- This CloakBrowser-only read-only preflight reached the WeChat backend home path but the page
  reported a timed-out session and exposed no workbench/editor controls.
- It is blocked evidence, not platform proof. It does not satisfy authenticated editor,
  safe-draft cleanup, paste, phone preview, sync, upload, schedule, or publish gates.

## 2026-06-17 Tauri/WebView2 E2E Refresh

- [x] tauri-e2e-refresh-20260617.txt
- `pnpm -C inkforge test:e2e` passed 2 spec files / 17 tests in the real Tauri/WebView2 runner.
- This proves current local desktop rendering, ExportModal style-gate UI, acceptance audit
  cannot-claim UI, flagship SVG injection, and chrome/theme smoke coverage only. It is not phone,
  account sync, upload, schedule, or publish proof.

## 2026-06-17 Local Sensitive Path Redaction

- [x] local-sensitive-path-redaction-20260617.txt
- Historical evidence files were redacted to remove local executable absolute paths and an absolute
  CloakBrowser profile directory while preserving proof results and non-sensitive profile labels.
- This is evidence hygiene only. It does not create new platform proof or close external gates.

## 2026-06-17 CloakBrowser Market Editor Applied Refresh

- [x] market-editor-applied-refresh-20260617.txt
- 135 SVG and ordinary editor clicks produced measurable center editor/canvas changes.
- Xiumi SVG library selection remained taxonomy-only in the current login/recovery-dialog state
  because the central paper did not change.
- WeChat backend still reported a timed-out session. This refresh is market-learning and blocked
  evidence only, not phone, sync, upload, schedule, or publish proof.

## 2026-06-17 Market Editor Applied Gate

- [x] market-editor-applied-gate-20260617.txt
- `StyleProofArtifact.centralEditorChanged` is now required for `market-applied-dom-readback`.
- Center-unchanged market library/category/item probes remain taxonomy evidence only and surface
  `style-proof-manifest-market-editor-not-applied`.
- Focused export tests, 4-file export regression, full export serial run, targeted ESLint,
  `vue-tsc --noEmit`, and direct Vite production build passed; the combined package build script
  hit a Node heap out-of-memory failure during `vue-tsc -b` on this low-free-memory host.
- This is local validator proof only, not phone, sync, upload, schedule, or publish proof.

## 2026-06-17 Phone Preview Content Gate

- [x] phone-preview-content-gate-20260617.txt
- `StyleProofArtifact.phonePreviewContentVerified` is now required for `phone-preview-readback`.
- Scan pages, preview entries, setup dialogs, cover-setting pages, and PC backend DOM readbacks
  remain setup evidence only until the exact artifact is visible in the phone preview article body.
- Focused export tests, 4-file export serial regression, full export serial run, targeted ESLint,
  `vue-tsc --noEmit`, and direct Vite production build passed.
- This is local validator proof only, not phone, sync, upload, schedule, or publish proof.

## 2026-06-17 Phone Dark Mode and Cover Thumbnail Gate

- [x] phone-dark-cover-gate-20260617.txt
- `StyleProofArtifact.darkModeEnabledVerified` is now required for `dark-mode-check`.
- `StyleProofArtifact.coverThumbnailAccepted` is now required for `cover-thumbnail-check`.
- Ordinary phone screenshots and cover setup pages remain setup evidence only until the exact
  mobile Dark Mode state or exact platform preview/share/list cover entry is verified.
- Focused export tests, 4-file export serial regression, full export serial run, targeted ESLint,
  `vue-tsc --noEmit`, and direct Vite production build passed.
- This is local validator proof only, not phone, sync, upload, schedule, or publish proof.

## 2026-06-17 PC Ordinary Clipboard Paste Gate

- [x] pc-ordinary-paste-gate-20260617.txt
- `StyleProofArtifact.ordinaryClipboardPasteVerified` is now required for
  `pc-editor-paste-event`.
- Programmatic ClipboardEvent/DataTransfer readback remains PC-channel diagnostics only; it cannot
  satisfy ordinary user Ctrl+V rich HTML/SVG paste proof.
- Focused export tests, 4-file export serial regression, full export serial run, targeted ESLint,
  `vue-tsc --noEmit`, and direct Vite production build passed.
- This is local validator proof only, not ordinary PC paste, phone, sync, upload, schedule, or
  publish proof.

## 2026-06-17 WeChat Backend Read-only Preflight

- [x] wechat-home-readonly-preflight-20260617.txt
- CloakBrowser reached the authenticated WeChat backend home page and read the recent draft list.
- Existing draft navigation was not completed; a publish action became visible in the draft card
  area, so no further click was attempted.
- This is backend-home reachability proof only, not editor paste, phone, sync, upload, schedule, or
  publish proof.

## 2026-06-17 WeChat Draftbox Read-only Preflight

- [x] wechat-draftbox-readonly-preflight-20260617.txt
- CloakBrowser reached the authenticated WeChat draftbox list through content management.
- The target existing draft was visible, and the draft card exposed separate delete, edit, and
  publish actions.
- The isolated edit action was clicked, but the page stayed on the draftbox list and no article
  editor DOM appeared.
- This is draftbox reachability and action-taxonomy proof only, not editor paste, phone, sync,
  upload, schedule, or publish proof.

## 2026-06-18 WeChat Draftbox Cleanup Path Read-only Preflight

- [x] wechat-draftbox-cleanup-path-readonly-20260618.txt
- CloakBrowser reached the authenticated WeChat draftbox list and observed five draft cards.
- Draft cards exposed separate delete, edit, and publish actions, with delete confirmation and
  cancel controls discoverable in the DOM.
- The "new creation" dropdown was readable, but the article creation entry was front-end event
  handled rather than a non-persistent href, so it was not clicked.
- This is cleanup-affordance proof only. It does not create, edit, delete, paste, save, preview,
  sync, upload, schedule, publish, set `cleanupPathVerified:true`, or satisfy
  `safe-disposable-draft`.
- Follow-up regression: `platform-export-rendering.test.ts` now rejects draftbox cleanup affordance
  notes as `safe-disposable-draft` proof; focused Vitest passed with 1 file / 77 tests and
  4-file export regression passed with 4 files / 116 tests; full export serial suite passed with
  35 files / 1010 tests.

## 2026-06-18 WeChat Session Expired Proof Gate

- [x] wechat-session-expired-gate-20260618.txt
- CloakBrowser opened the WeChat backend home entry and reached a re-login state, not an
  authenticated backend/editor surface.
- No login attempt, credential entry, draft mutation, paste, save, preview, sync, upload, schedule,
  or publish action was performed.
- Runtime proof gates now require `authenticatedSessionVerified:true` for authenticated editor
  reachability and both `authenticatedSessionVerified:true` plus `platformEditorDomVerified:true`
  for PC editor DOM readback; the `authenticated-pc-editor` collection plan/queue note also
  surfaces both flags for operator collection.
- Focused regression: login/expired-session style manifests remain invalid for authenticated editor
  and PC editor DOM proof; 4-file export regression passed with 4 files / 118 tests, full export
  serial suite passed with 35 files / 1012 tests, ESLint/vue-tsc/build passed. Follow-up
  collection-plan assertion confirms the authenticated-PC-editor queue note includes both new
  required flags.

## 2026-06-18 WeChat Authenticated Draftbox Read-only Refresh

- [x] wechat-auth-draftbox-readonly-refresh-20260618.txt
- CloakBrowser later reached the authenticated WeChat backend home and draftbox list again.
- The draftbox list exposed five visible existing draft title candidates and a safer delete/edit/
  publish control distinction; the delete icon was identified and not clicked.
- The edit icon was identified, but title click, DOM-dispatched edit events, and precise
  CloakBrowser click all left this run on the draftbox list, so no current PC editor DOM proof was
  collected.
- This refresh updates current reachability only. It does not prove editor DOM, ordinary paste,
  cleanup, phone preview, Dark Mode, cover thumbnail, sync, schedule, or publish gates.

## 2026-06-18 WeChat Current Editor DOM Read-only Refresh

- [x] wechat-editor-dom-current-readonly-20260618.txt
- Using the card Vue component's `editUrl` with the current authenticated backend session
  parameters loaded the PC article editor in the current CloakBrowser tab.
- Read-only DOM checks found `#js_appmsg_editor`, `#editor_pannel`, `#js_ueditor`, `#js_editor`,
  `.edui-editor`, `.ProseMirror`, the toolbar shell, two visible `contenteditable=true` editors,
  and a hidden platform article-preview iframe.
- Editor chrome signals included save draft, preview, cover, title, body, and media/import
  controls.
- This is current authenticated editor reachability and PC editor DOM evidence only. It does not
  prove ordinary paste, artifact-specific SVG readback, phone preview, Dark Mode, cover thumbnail,
  cleanup, sync, schedule, or publish gates.

## 2026-06-18 WeChat Disposable Draft Runbook

- [x] wechat-disposable-draft-runbook-20260618.md
- Defines the only acceptable live-mutation path for disposable WeChat proof.
- Separates create, ordinary OS Ctrl+V paste, phone/preview, cleanup, abort conditions, redaction,
  and manifest flag mapping.
- Records the pre-mutation contract. A later Amber-only run completed the PC ordinary Ctrl+V and
  cleanup portion of that contract; phone/preview and publish gates remain separate.
- This is a pre-mutation contract only. It does not create, paste into, preview, delete, or prove
  absence of a disposable draft.

## 2026-06-18 WeChat Amber Ordinary Ctrl+V Disposable Draft Proof

- [x] wechat-amber-ordinary-ctrlv-disposable-draft-20260618.txt
- Created deterministic disposable draft `InkForge disposable proof 20260618-0515`.
- Wrote exact `flagship-amber.html` to Windows CF_HTML clipboard with SHA-256
  `09607268931e18aa05244594f941dfd181d24bc6420f3263a022ff263018fa3d`.
- Inserted the artifact into the authenticated WeChat PC editor body through ordinary OS Ctrl+V
  via Windows `keybd_event`; no synthetic ClipboardEvent/DataTransfer, plugin transfer, sync,
  upload, or publish API was used for body insertion.
- PC editor DOM readback preserved `svgCount=35`, `dataInkSvgCount=3`,
  `dataInkBlockCount=23`, `sectionNice=true`, and `placeholder=false`.
- The same disposable draft was deleted from the draftbox; stable DOM and post-reload readbacks
  both reported the deterministic title absent and list count `Article 6`.
- A remaining untitled InkForge/Amber residual draft from earlier Amber attempts was also deleted
  through the card-level content delete confirmation; stable and post-reload readbacks both
  reported untitled InkForge/Amber residual count `0` and final list count `Article 5`.
- Boundary: this proves Amber PC ordinary Ctrl+V rich HTML/SVG insertion plus cleanup only. It does
  not prove phone preview, mobile Dark Mode, mobile SMIL/click, cover thumbnail acceptance,
  credentialed sync, scheduled send, public URL, XHS/Zhihu account upload, or publish success.

## 2026-06-18 WeChat Kiln Ordinary Ctrl+V Plain-Text Negative Proof

- [x] wechat-kiln-ordinary-ctrlv-plain-text-cleanup-20260618.txt
- Wrote exact `flagship-kiln.html` to Windows CF_HTML clipboard with SHA-256
  `90581eec1c3cb2805ddc235b8d41725795bfeaf2fc3628c707d485201af0d531`.
- In authenticated WeChat PC editor attempts for both `type=10` and `type=77`, ordinary OS
  Ctrl+V via Windows `keybd_event` reached the body editor and inserted content, but the editor
  readback degraded to plain text: `bodyTextLength=1790`, `bodyHtmlLength=1800`, `svgCount=0`,
  `dataInkSvgCount=0`, `dataInkBlockCount=0`, and `sectionNice=false`.
- Cleanup was verified after reload: draftbox returned to `Article 5`, with current-run failed
  title count `0`, current-run recent draft count `0`, Kiln marker/fingerprint count `0`, and
  local path count `0`.
- Boundary: this is negative evidence for Kiln ordinary OS Ctrl+V rich HTML/SVG in the current
  WeChat session. It must not set `ordinaryClipboardPasteVerified:true`, and it does not weaken the
  exact-artifact Amber proof or prove Tempera, phone preview, sync, schedule, or publish gates.

## 2026-06-19 WeChat Kiln Entity-Safe Ctrl+V Editor-Return Cleanup

- [x] wechat-kiln-entity-ordinary-ctrlv-editor-return-cleanup-20260619.txt
- Used CloakBrowser only; Playwright was not used.
- Exact source `flagship-kiln.html` SHA-256:
  `90581eec1c3cb2805ddc235b8d41725795bfeaf2fc3628c707d485201af0d531`.
- Entity-safe SHA-256:
  `d099275aadb399a7b63792d3fb0c826c66b7bb02aba50d67820fb9b0fa23d335`.
- The transform changed source bytes `41800` to entity HTML bytes `46487`, reduced non-ASCII
  characters from `941` to `0`, and preserved `svgCount=35`, `dataInkSvgCount=3`, and
  `dataInkBlockCount=23`.
- The authenticated WeChat editor surface was reachable before paste setup:
  3 contenteditable nodes, 2 ProseMirror nodes, `#js_ueditor=1`, `#js_appmsg_editor=1`, and
  `#editor_pannel=1`.
- OS Ctrl+V was sent through Win32 `keybd_event` with foreground window stable, preserved
  clipboard, no mouse move, and no click.
- The post-paste readback found the active page back on the draft-list route, with no editor
  ProseMirror body, no in-page paste/input/mutation counter state, no deterministic proof title,
  and no `data-ink-svg` / `data-ink-block` marker visible in the list. The current-run untitled
  draft increased the article count from 6 to 7, so this is editor-return/no-rich-readback failure.
- Cleanup completed through the visible top current-run draft delete path; two post-delete readbacks
  reported article count `6`, current-run time matches `0`, deterministic proof title matches `0`,
  relogin signals absent, and editor selectors absent.
- Boundary: this is negative evidence for Kiln entity-safe ordinary PC Ctrl+V in the current
  WeChat session. It must not set `ordinaryClipboardPasteVerified:true`,
  `pasteInputEventVerified:true`, `editorBodyMutationVerified:true`, `mojibakeFreeVerified:true`,
  `safe-disposable-draft`, phone preview, Dark Mode, cover, sync, schedule, public rendering, or
  publish gates.

## 2026-06-18 Kiln Paste-Safe Candidate Local Probe

- [x] wechat-kiln-paste-safe-candidate-local-probe-20260618.txt
- Added an additive `flagship-kiln-paste-safe` candidate preset and
  `wechat-flagship-kiln-paste-safe` style choice. The original `flagship-kiln`, `cover-grid`, and
  Kiln negative proof remain unchanged.
- Generated `wechat-paste/flagship-kiln-paste-safe.html` through the real flagship artifact
  emitter. The candidate keeps Kiln palette, creative persona, Forge divider, and flagship HTML
  blocks, but uses `cover-title` as the first SVG module.
- Candidate artifact metadata: SHA-256
  `338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`,
  `htmlBytes=41618`, `cfHtmlBytes=41787`, `svgCount=35`, `dataInkSvgCount=3`,
  `dataInkBlockCount=23`, first module `cover-title`.
- Local CloakBrowser contenteditable probe with Windows `HTML Format` plus `keybd_event` Ctrl+V
  read back `svgCount=35`, `dataInkSvgCount=3`, `dataInkBlockCount=23`, `sectionNice=true`, and
  first module `cover-title`.
- Authenticated WeChat draftbox was restored for a no-mutation check. The list still reported
  `Article 5`, candidate title count `0`, current-run marker count `0`, and no paste-safe/Kiln
  residue. The article creation entry did not open a safe disposable editor in this state, so the
  run stopped before platform mutation.
- Boundary: this is candidate/local proof only. It must not set
  `ordinaryClipboardPasteVerified:true`, must not satisfy `pc-editor-paste-event` or
  `safe-disposable-draft`, and does not prove phone, sync, schedule, or publish gates.

## 2026-06-22 Kiln Paste-Safe Committed Local Evidence

- [x] wechat-kiln-paste-safe-committed-local-evidence-20260622.txt
- [x] wechat-paste/flagship-kiln-paste-safe.html
- Reused the already tracked exact HTML artifact generated by the real flagship artifact emitter.
- Artifact hash:
  `sha256:338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`.
- Artifact bytes: 41618.
- Historical probe metadata remains valid: `cfHtmlBytes=41787`, `svgCount=35`,
  `dataInkSvgCount=3`, `dataInkBlockCount=23`, first module `cover-title`.
- Independent Node verification re-read the tracked HTML, checked the hash, byte length, required
  `cover-title` / `i-stretch` / `divider-forge` SVG sentinels, flagship block sentinels, and
  structured sensitive / market-editor residue scan.
- CloakBrowser loaded a local read-only artifact preview and measured:
  `viewportWidth=1400`, `nice.width=677`, `clamp.width=669`, `bodyOverflowX=false`,
  `svgElementCount=35`, `styleElementCount=0`, `foreignObjectCount=0`, `imageInSvgCount=0`,
  `scriptCount=0`, `dataInkSvgCount=3`, `dataInkBlockCount=23`, and `textLength=1370`.
- SVG sentinel readback found `cover-title`, `i-stretch`, and `divider-forge`.
- Block sentinel readback found `flagship-readbar=1`, `flagship-toc=1`, `flagship-quote=2`,
  `flagship-lede=1`, `flagship-banner=1`, `flagship-stat=1`, `flagship-compare=1`,
  `flagship-timeline=1`, `flagship-gallery=1`, and `flagship-footer=1`.
- One internal SVG `<text>` node reported a small scroll-width delta without causing page-level
  overflow; this remains a local visual observation, not external-platform proof.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one
  `wechat-flagship-kiln-paste-safe` manifest. It claims only `unit-tested` and `local-browser`
  evidence and satisfies unit, local-browser, exact-artifact, and sensitive-hygiene accounting for
  this exact HTML artifact.
- Current committed release-gate accounting remains blocked with `canClaimComplete=false`,
  `status=blocked-by-local-conflict`, `localManifestCount=20`, `wechatPcManifestCount=2`,
  `combinedManifestCount=22`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: independent HTML evidence verification, CloakBrowser artifact readback,
  focused committed/local/release regression with 1 file / 4 selected tests, full
  `platform-export-rendering.test.ts` regression with 1 file / 155 tests, four-file
  cross-platform export regression with 4 files / 194 tests, full export serial regression with
  36 files / 1132 tests, targeted ESLint, `vue-tsc`, and production build with 4653 transformed
  modules in 35.83s. `git diff --check` passed for the slice files, and GitNexus detect reported
  39 dirty files across the whole working tree, 18 changed symbols, 0 affected processes, and low
  risk; the dirty-file count includes unrelated pre-existing files.
- Boundary: this is local WeChat Kiln paste-safe browser/exact-artifact/sensitive-hygiene
  accounting only. It does not prove official editor paste, phone preview, mobile interaction,
  Dark Mode, cover thumbnail acceptance, sync, scheduled send, platform preview, public article
  rendering, or publish success.

## 2026-06-22 Style Proof Release Blocker Counts

- [x] style-proof-release-blocker-counts-20260622.txt
- Added read-only blocker count fields to `getCommittedStyleProofEvidenceReleaseGateReport()`:
  `issueCount`, `platformStepCounts`, `requirementStepCounts`, and `issueCounts`.
- `issueIds` is now a de-duplicated scanner list, while `issueCounts` preserves current issue
  occurrence totals.
- Current live report remains `status=blocked-by-local-conflict` and
  `canClaimComplete=false`.
- Current snapshot:
  `localManifestCount=20`, `wechatPcManifestCount=2`, `combinedManifestCount=22`,
  `combinedIssueCount=16`, `cannotClaimSteps=32`, `phoneOpenSteps=4`,
  `externalDependencyOpenSteps=14`, `unsafeToAutomateOpenSteps=13`,
  `mutatingOpenSteps=13`, `blockerCount=5`.
- Current blocker count readout:
  `local-conflict issueCounts=[requirement-missing:13, choice-blocked:3]`,
  `phone-preview platformStepCounts=[wechat:4]`,
  `external-dependency platformStepCounts=[wechat:7,xiaohongshu:2,zhihu:5]`,
  `unsafe-to-automate platformStepCounts=[wechat:7,xiaohongshu:2,zhihu:4]`.
- ExportModal now surfaces the same count fields in the existing committed proof preflight row,
  while keeping the row blocked and preserving the cannot-claim boundary.
- Verification passed: GitNexus impact checks for the release-gate report, release blocker helper,
  and blocker interface; focused `release claims` regression with 1 selected test; direct `tsx`
  live report readout; full `platform-export-rendering.test.ts` regression with 1 file /
  155 tests; four-file cross-platform export regression with 4 files / 194 tests; full export
  serial regression with 36 files / 1132 tests; targeted ESLint; `vue-tsc`; production build with
  4653 transformed modules in 37.94s; ExportModal UI production build with 4653 transformed
  modules in 33.96s; and `git diff --check` for slice files. GitNexus detect
  reported 39 dirty files across the whole working tree, 24 changed symbols, 0 affected
  processes, and low risk; the dirty-file count includes unrelated pre-existing files.
- Additional UI smoke passed through CloakBrowser: a real local article was created through the UI,
  the real `发布` button opened ExportModal, the committed proof preflight row displayed
  `本地冲突 16`, `缺项 13`, `目录阻断 3`, `手机预览 4`, `外部依赖 14`, `小红书 2`,
  `知乎 5`, `requirementCounts`, and the cannot-claim sentence; desktop readback reported
  `scrollWidth=1400`, `bodyScrollWidth=1400`, and `overflowCount=0`.
- Follow-up narrow UI smoke passed through CloakBrowser at `390x844`: the same real ExportModal
  row replaced raw English `nextOperatorActions` with Chinese summaries, kept
  `canClaimComplete=false`, retained the blocker counts and cannot-claim sentence, and reported
  `scrollWidth=390`, `bodyScrollWidth=390`, `overflowCount=0`. Follow-up targeted ExportModal
  ESLint, `vue-tsc`, focused `release claims` Vitest, and production build with 4653 modules in
  33.19s passed. GitNexus detect reported low risk, 39 dirty files across the whole working tree,
  15 changed symbols, and 0 affected processes; the dirty-file count includes unrelated
  pre-existing files. Runtime screenshots were used only for local visual inspection and are not
  committed artifacts.
- Boundary: this is release-gate accounting only. It does not prove WeChat PC paste, phone
  preview, Dark Mode, cover thumbnail, credentialed sync, public host, scheduled send, platform
  preview, Xiaohongshu upload, Zhihu upload, public rendering, or publish success.

## 2026-06-22 Style Proof Release Blocked-Choice-Only Scope

- [x] style-proof-release-blocked-choice-only-scope-20260622.txt
- `getCommittedStyleProofEvidenceReleaseGateReport()` now excludes blocked-choice-only aggregate
  local requirement gaps from the `local-conflict` blocker.
- `zhihu-artifact-manifest` gaps that require public/platform image hosts remain unclaimable, but
  they stay with public-host / external dependency proof instead of appearing as a local artifact
  chore.
- Runtime readout remains unclaimable: `status=blocked-by-local-conflict`,
  `canClaimComplete=false`, `combinedIssueCount=16`, `blockerCount=5`, `phoneOpenSteps=4`,
  `externalDependencyOpenSteps=14`, `unsafeToAutomateOpenSteps=13`, and `mutatingOpenSteps=13`.
- The local-conflict blocker now reports only the three committed proof rows that target
  catalog-blocked choices: `issueCount=3`, `issueIds=[style-proof-manifest-choice-blocked]`, and
  no local requirement ids.
- Focused TDD first failed while `style-proof-manifest-requirement-missing` was still present in
  `local-conflict`; after the implementation, focused `release claims` regression passed.
- Verification passed: targeted ESLint, focused `release claims` regression, four-file
  cross-platform export regression with 4 files / 194 tests, full export serial regression with
  36 files / 1132 tests, `vue-tsc`, and production build with 4653 modules in 46.56s.
- CloakBrowser narrow readback at `390x844` used a real local article and the real `发布` button.
  ExportModal showed `本地冲突 3`, no `本地冲突 6`, no `本地冲突 16`, no stale local
  artifact-manifest summary, `目录阻断 3`, `手机预览 4`, `外部依赖 14`,
  `canClaimComplete=false`, the updated choice-only local-conflict operator summary,
  `scrollWidth=390`, `bodyScrollWidth=390`, and `overflowCount=0`.
- Final `npx gitnexus detect-changes -r InkForge --scope all` reported low risk, 40 dirty files
  across the whole working tree, 18 changed symbols, and 0 affected processes; the dirty-file
  count includes unrelated pre-existing local changes and does not define the staged boundary.
- Boundary: this is release-gate classification precision only. It does not prove WeChat PC paste,
  phone preview, Dark Mode, cover thumbnail, credentialed sync, public host, scheduled send,
  platform preview, Xiaohongshu upload, Zhihu upload, public rendering, or publish success.

## 2026-06-22 XHS Local Catalog Open

- [x] xhs-local-catalog-open-20260622.txt
- `xhs-data-card`, `xhs-long-report`, and `xhs-market-rich-card-fallback` are now
  `local-browser` available catalog choices because the committed CloakBrowser raster packs prove
  exact image-page manifests, 1080 x 1440 PNG dimensions, `overflow=false`, `cropStatus=ok`, body
  references, and `validationIssueIds=[]`.
- They remain unselectable in ExportModal because no `STYLE_CHOICE_APPLICATIONS` mapping points to a
  real InkForge preset/export option yet.
- Runtime release-gate readout remains unclaimable but is now external-gate blocked:
  `status=blocked-by-external`, `canClaimComplete=false`, `combinedIssueCount=13`,
  `blockerCount=4`, with `phone-preview`, `external-dependency`, `unsafe-to-automate`, and
  `mutating-platform` blockers. There is no `local-conflict` blocker in this snapshot.
- Verification passed: focused style catalog regression with 1 file / 155 tests; full export
  serial regression with 36 files / 1132 tests; targeted ESLint; e2e script syntax check;
  `vue-tsc`; production build with 4653 modules in 31.91s; and Tauri/WebView2 e2e with 1 spec /
  6 passing.
- Final `npx gitnexus detect-changes -r InkForge --scope all` reported low risk, 41 dirty files
  across the whole working tree, 27 changed symbols, and 0 affected processes; the dirty-file
  count includes unrelated pre-existing local changes and does not define the staged boundary.
- CloakBrowser visual/DOM readback at `390x844` used a real local article and the real `发布`
  button. The XHS summary showed `7/8` available, cards counted `total=8`, `available=7`,
  `blocked=0`, `unavailable=1`, `overflowingCards=0`, `document scrollWidth=390/clientWidth=390`,
  `panel scrollWidth=374/clientWidth=374`, `status blocked-by-external`, `blockers 4`,
  `canClaimComplete=false`, no local-conflict blocker, and the three opened choices rendered as
  available but disabled/unmapped.
- Boundary: this opens local catalog availability only. It does not prove Xiaohongshu account
  upload, mobile/platform preview, scheduled send, public article rendering, or publish success.

## 2026-06-22 XHS Style Choice Application Mapping

- [x] xhs-style-choice-application-mapping-20260622.txt
- `xhs-data-card`, `xhs-long-report`, and `xhs-market-rich-card-fallback` now map to existing
  Xiaohongshu presets through `STYLE_CHOICE_APPLICATIONS`.
- Exact mappings: `xhs-data-card -> xhs-tech / 科技数码`,
  `xhs-long-report -> xhs-simple / 极简高级`, and
  `xhs-market-rich-card-fallback -> xhs-nature / 自然清新`.
- These choices are now selectable in the real ExportModal after their local-browser availability
  proof. The mapping selects existing presets only; it does not add upload, preview, scheduled
  send, public article, public URL, or publish proof.
- Verification passed: GitNexus impact for `STYLE_CHOICE_APPLICATIONS` and
  `evaluateStyleChoiceApplication`; focused style-choice regression with 1 file / 3 selected
  tests; full platform style-catalog regression with 1 file / 155 tests; full export serial
  regression with 36 files / 1132 tests; targeted ESLint; e2e script syntax check; `vue-tsc`;
  production build with 4653 modules in 39.75s; and Tauri/WebView2 e2e with 1 spec / 6 tests.
- Final `npx gitnexus detect-changes -r InkForge --scope all` reported low risk, 40 dirty files
  across the whole working tree, 25 changed symbols, and 0 affected processes; the dirty-file
  count includes unrelated pre-existing local changes and does not define the staged boundary.
- CloakBrowser narrow readback at `390x844` used a real local article and the real `发布` button.
  XHS showed `7/8` available; the three mapped cards were enabled as `style-choice-available`;
  clicking Data -> Long -> Market selected `xhs-nature / 自然清新`; the preflight row read
  `已选择 Market rich card image fallback → 自然清新（xhs-nature）`; `scrollWidth=390`,
  `clientWidth=390`, and `overflowCount=0`.
- Boundary: this is local application mapping only. Xiaohongshu account upload, mobile/platform
  preview, public URL acceptance, scheduled send, public article rendering, and publish success
  remain external proof gates.

## 2026-06-22 Style Proof Release Local Conflict Scope

- [x] style-proof-release-local-conflict-scope-20260622.txt
- `getCommittedStyleProofEvidenceReleaseGateReport()` now scopes `local-conflict` to local
  committed-evidence and catalog conflicts instead of counting every missing external proof row.
- Runtime readout remains unclaimable: `status=blocked-by-local-conflict`,
  `canClaimComplete=false`, `combinedIssueCount=16`, and `blockerCount=5`.
- The local-conflict blocker now reports `issueCount=6`, with
  `style-proof-manifest-choice-blocked=3` and
  `style-proof-manifest-requirement-missing=3`.
- Local-conflict requirement ids are `zhihu-artifact-manifest`, `unit-test-coverage`, and
  `local-browser-rendering`.
- Phone preview, external dependency, unsafe-to-automate, and mutating-platform blockers still
  remain open and continue to carry their external/phone/platform proof requirements.
- Verification passed: GitNexus impact for `getCommittedStyleProofManifestIssueIds`,
  `getCommittedStyleProofReleaseGateStatus`, and
  `getCommittedStyleProofEvidenceReleaseGateReport`; TDD first focused run failed before the
  implementation; focused `release claims` regression passed after implementation; targeted
  ESLint passed; four-file cross-platform export regression passed 4 files / 194 tests; full
  export serial regression passed 36 files / 1132 tests; `vue-tsc` passed; and production build
  passed with 4653 modules in 53.68s after the UI summary follow-up.
- Final `npx gitnexus detect-changes -r InkForge --scope all` reported low risk, 40 dirty files
  across the whole working tree, 22 changed symbols, and 0 affected processes; the dirty-file
  count includes unrelated pre-existing local changes and does not define the staged boundary.
- CloakBrowser narrow readback at `390x844` used a real local article and the real `发布` button.
  The committed proof row showed `本地冲突 6`, no `本地冲突 16`, `缺项 3`, `目录阻断 3`,
  `手机预览 4`, `外部依赖 14`, `canClaimComplete=false`, the updated local-conflict operator
  summary, `scrollWidth=390`, `bodyScrollWidth=390`, and `overflowCount=0`.
- Boundary: this is release-gate classification precision only. It does not prove WeChat PC paste,
  phone preview, Dark Mode, cover thumbnail, credentialed sync, public host, scheduled send,
  platform preview, Xiaohongshu upload, Zhihu upload, public rendering, or publish success.

## 2026-06-22 Style Choice Notice Localization

- [x] style-choice-notice-localization-20260622.txt
- ExportModal style cards now translate known catalog blocker/reason strings into compact Chinese
  display copy without mutating the runtime catalog, availability decisions, selectable state,
  release-gate reports, execution runbooks, or proof manifests.
- Follow-up display consistency now replaces the remaining raw `fallback：` label with `降级：`
  and localizes the style-catalog preflight blocked action reason with the same notice mapper.
- Follow-up CloakBrowser readback at `390x844` reported `fallbackOld=false`,
  `fallbackNewCount=17`, no known English reason fragments, `scrollWidth=390`,
  `bodyScrollWidth=390`, and `overflowCount=0`. The current selected style was available, so the
  preflight blocked branch was not visible; that branch now reuses the same notice mapper and was
  covered by lint/type/build.
- CloakBrowser narrow readback at `390x844` used a real local article and the real `发布` button.
  Known English blocker fragments were absent, expected Chinese fragments were present, the Amber
  card remained blocked, and layout readback reported `scrollWidth=390`,
  `bodyScrollWidth=390`, `overflowCount=0`.
- Verification passed: GitNexus impact for the exact `styleChoiceRows` function reported LOW risk
  and 0 affected processes; targeted ExportModal ESLint, `vue-tsc`, and production build with
  4653 modules in 32.90s passed. Follow-up checks also passed: GitNexus impact for
  `styleChoiceDetail` and exact `styleCatalogPreflightRow` reported LOW risk and 0 affected
  processes; targeted ExportModal ESLint; focused style/release Vitest with 1 file / 4 selected
  tests; `vue-tsc`; production build with 4653 modules in 37.62s; and GitNexus detect with low
  risk, 39 dirty files across the whole working tree, 10 changed symbols, and 0 affected
  processes. Dirty-file counts include unrelated pre-existing files.
- Boundary: this is UI copy localization and narrow viewport proof only. It does not prove WeChat
  PC paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, public host acceptance, scheduled send, platform preview, public rendering,
  Xiaohongshu upload, Zhihu upload, or publish success.

## 2026-06-18 WeChat Kiln Paste-Safe Ctrl+V Tab-Mismatch Cleanup

- [x] wechat-kiln-paste-safe-wechat-ctrlv-tab-mismatch-cleanup-20260618.txt
- Wrote exact `flagship-kiln-paste-safe.html` to Windows CF_HTML clipboard with SHA-256
  `338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`.
- Authenticated WeChat PC editor attempts used CloakBrowser plus Windows `keybd_event` Ctrl+V.
- The intended deterministic-title editor stayed unchanged (`svgCount=0`,
  `dataInkSvgCount=0`, `dataInkBlockCount=0`, body placeholder still present).
- A later foreground paste hit a different visible WeChat editor tab than the CloakBrowser-bound
  DOM target. That wrong-tab body contained large InkForge HTML/SVG residue but was
  mojibake-damaged and therefore invalid as proof.
- Cleanup was completed: the recent empty-title InkForge-like residue was identified by content
  fingerprint, deleted through WeChat `operate_appmsg` with `ret=0`, and post-delete checks
  returned deterministic title matches `0`, deleted-candidate matches `0`, and current-run
  empty/default-title InkForge-like residue candidates `0`.
- Boundary: this is negative evidence and cleanup proof only. It must not set
  `ordinaryClipboardPasteVerified:true`, must not satisfy `pc-editor-paste-event` or
  `safe-disposable-draft`, and does not prove phone, Dark Mode, cover, sync, schedule, or publish
  gates.

## 2026-06-18 WeChat Kiln Paste-Safe Single-Tab Ctrl+V No-Paste

- [x] wechat-kiln-paste-safe-wechat-ctrlv-single-tab-nopaste-20260618.txt
- Added `-NoClick` to `inkforge/scripts/probe-windows-foreground-input.ps1` so Windows
  `keybd_event` Ctrl+V can be sent without moving the mouse or changing an already focused editor.
- In a single visible WeChat editor tab, the page was visible, `document.hasFocus()` was true, the
  body `.ProseMirror` was focused, and a CloakBrowser body click succeeded.
- Both `System.Windows.Forms.SendKeys("^v")` and `keybd_event -NoClick` left the body unchanged:
  `bodyTextLength=8`, `bodyHtmlLength=298`, `svgCount=0`, `dataInkSvgCount=0`,
  `dataInkBlockCount=0`.
- Cleanup/absence checks after returning home found deterministic title matches `0` and recent
  empty/default-title InkForge-like residue candidates `0`.
- Boundary: this is negative evidence only. Foreground-window match, focused editor state, and
  key event counts are not enough; future proof must observe a paste/input event or same-editor DOM
  body change.

## 2026-06-19 WeChat Tempera Ordinary Ctrl+V Input-Bridge Blocked

- [x] wechat-tempera-ordinary-ctrlv-input-bridge-blocked-20260619.txt
- Used CloakBrowser only against the authenticated WeChat new-article editor surface.
- Wrote exact `flagship-tempera.html` to Windows CF_HTML clipboard with SHA-256
  `d173f8dd2ba807b2fe90b7f0c2a6dea7907a3672d6c225fc0acc918751392585`, `svgCount=35`,
  `dataInkSvgCount=3`, and `dataInkBlockCount=23`.
- The visible body editor started placeholder-only: `bodyTextLength=8`, `bodyHtmlLength=298`,
  `svgCount=0`, `dataInkSvgCount=0`, and `dataInkBlockCount=0`.
- Retried OS input through `keybd_event`, `SendInput`, absolute body-coordinate clicks, and
  `WScript.Shell.AppActivate + SendKeys`. The helpers reported foreground/window activation or
  sent key counts, but the CloakBrowser page observed no `keydown`, `keyup`, `paste`,
  `beforeinput`, `input`, trusted paste/input, or editor body DOM mutation.
- The temporary title was cleared after the attempt; final body readback remained placeholder-only
  with 0 SVG / 0 `data-ink-svg` / 0 `data-ink-block`, so no body draft residue was created.
- Boundary: this is input-bridge-blocked negative evidence, not WeChat rich HTML/SVG rejection or
  acceptance. It must not set `ordinaryClipboardPasteVerified:true`, `pasteInputEventVerified:true`,
  `editorBodyMutationVerified:true`, `pc-editor-paste-event`, or `safe-disposable-draft`.

## 2026-06-19 WeChat Tempera Ordinary Ctrl+V Mojibake Cleanup

- [x] wechat-tempera-ordinary-ctrlv-mojibake-cleanup-20260619.txt
- Used CloakBrowser only; Playwright was not used.
- Root-caused the earlier input bridge block to visible-tab mismatch plus DPI coordinate mismatch:
  Windows input targeted a visible WeChat tab while CloakBrowser read back another tab.
- After selecting the CloakBrowser-controlled target tab and calibrating coordinates, a transient
  in-page probe received real OS mouse/key/input events.
- Wrote exact `flagship-tempera.html` to Windows CF_HTML clipboard with SHA-256
  `d173f8dd2ba807b2fe90b7f0c2a6dea7907a3672d6c225fc0acc918751392585`.
- Same-visible-tab WeChat PC editor ordinary OS Ctrl+V readback preserved `svgCount=35`,
  `dataInkSvgCount=3`, and `dataInkBlockCount=23`, with trusted paste and body mutation observed.
- The result was still invalid as complete proof because `replacementCharCount=1118` and
  `mojibakeHintCount=1118`.
- Cleanup completed through the current platform delete endpoint with session-bound credentialed
  `operate_appmsg` returning `base_resp.ret=0`; two post-delete reload readbacks reported
  title matches `0`, target content matches `0`, and target app id absent.
- Boundary: this proves same-tab OS Ctrl+V reachability, SVG/data-ink structure survival, and
  cleanup for Tempera, but it does not satisfy `pc-editor-paste-event`,
  `mojibakeFreeVerified:true`, phone preview, Dark Mode, cover, sync, schedule, public rendering,
  or publish gates.

## 2026-06-18 WeChat PC Paste Strong Gate

- [x] wechat-pc-paste-strong-gate-20260618.txt
- `StyleProofArtifact` now has additional optional bound proof flags for ordinary WeChat PC paste:
  `sameEditorTabVerified`, `pasteInputEventVerified`, `editorBodyMutationVerified`, and
  `mojibakeFreeVerified`.
- `pc-editor-paste-event` now requires one same `platform-editor` / `pc-paste` artifact to bind
  all strong paste flags together with `ordinaryClipboardPasteVerified:true`.
- Regression tests reject same-tab no-paste evidence, wrong-tab/mojibake readback, and split
  multi-artifact proof.
- Focused verification passed: `platform-export-rendering.test.ts` 1 file / 84 tests.
- Boundary: this is local validator proof only, not WeChat paste, phone, sync, schedule, or publish
  proof.

## 2026-06-18 Market Editor DOM/CSS Learning

- [x] market-editor-dom-css-learning-20260618.txt
- CloakBrowser-only live sampling covered Xiumi v5 SVG/title/card categories, the 135 SVG editor,
  and the 135 ordinary WeChat editor. No Playwright, save, copy, sync, upload, scheduled-send, or
  publish action was used.
- Xiumi SVG previews can contain literal SVG/SMIL/foreignObject, but the applied center canvas may
  materialize as image cells and authoring layers. InkForge must translate that into
  image-slot/fallback manifests, not direct inline-SVG proof.
- 135 SVG effects map to typed image slots, hot zones, motion, trigger, fallback, and layout-report
  schema. Tall `viewBox=0 0 1080 1920`, `background-size:100.1% 100.1%`, and `margin-top:-1px` are
  useful layout heuristics only.
- 135/Xiumi authoring residue such as `_135editor`, `135brush`, `135bg`, market `data-tools`,
  market data ids, `tn-*`, `tn-comp-role`, and vendor URLs must remain blocked from InkForge
  publishable output.
- Boundary: this evidence records market-rule extraction only. It does not prove WeChat phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, schedule, XHS/Zhihu upload, public
  host, or publish gates.

## 2026-06-18 Market Editor Hosted Background Residue Gate

- [x] market-editor-residue-background-gate-20260618.txt
- `MARKET_EDITOR_RESIDUE_RULES` now blocks CSS `url(...)` references to 135/Xiumi hosted media as
  `market editor hosted background source`.
- Added a three-platform regression proving WeChat, Xiaohongshu, and Zhihu quality reports all fail
  when copied market editor hosted background sources are present.
- `PLATFORM_STYLE_CHOICES` now injects the platform-specific market-residue detector blocker into
  every current and future style choice.
- Verification passed:
  - `platform-export-rendering.test.ts`: 1 file / 85 tests.
  - cross-platform export regression: 4 files / 124 tests.
  - full export serial run: 35 files / 1047 tests.
- Boundary: this is a local detector gate only. It does not prove phone preview, mobile interaction,
  Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, or publish gates.

## 2026-06-18 Style Acceptance ExportModal E2E Refresh

- [x] style-acceptance-exportmodal-e2e-20260618.txt
- Real Tauri/WebView2 WDIO e2e initially failed because the spec still expected the old WeChat
  style catalog count `7/15` while runtime ExportModal now reports `8/16`.
- Updated `tests/e2e/specs/svg-render.spec.cjs` to assert the current WeChat counts:
  `8/16`, `cardCount=16`, `availableCount=8`, `blockedCount=4`, and `unavailableCount=4`.
- Re-ran `pnpm exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`
  and it passed with 1 spec / 6 tests.
- The passing e2e still verifies cannot-claim preflight, phone-preview next action, blocked Amber,
  blocked mobile-only SVG effects, unavailable plugin transfer, XHS/Zhihu gate summaries, flagship
  SVG injection, and `charsPerLine=20`.
- Boundary: local Tauri/WebView2 proof only. It does not prove phone preview, mobile interaction,
  Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, or publish gates.

## 2026-06-18 Full Tauri/WebView2 E2E Refresh

- [x] full-tauri-e2e-refresh-20260618.txt
- Re-ran the full local Tauri/WebView2 WDIO suite with `pnpm test:e2e`.
- Result: passed with 2 specs / 17 tests.
- `svg-render.spec.cjs` passed with 6 tests covering real Pinia draft seeding, ExportModal style
  gates, cannot-claim UI, phone-preview next action, flagship SVG rendering, and
  mobile-emulated `charsPerLine=20`.
- `visual.spec.cjs` passed with 11 tests covering titlebar controls, brand mark, motion/type/easing
  styles, focus styles, and light/dark theme cascade.
- Boundary: local Tauri/WebView2 UI/rendering proof only. It does not prove phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, or publish
  gates.

## 2026-06-18 135 Applied Text Slot Residue Gate

- [x] 135-applied-text-slot-residue-gate-20260618.txt
- CloakBrowser-only 135 ordinary editor sampling now includes a real left-style click that mutated
  the central UEditor iframe after the editor body selection was established.
- `#style-173703` inserted one central editor block: `data-id="173703"` changed from `0` to `1`,
  editor body children changed from `4` to `5`, and HTML length changed from `20627` to `22552`.
- The applied DOM confirmed additional authoring residue beyond wrapper classes:
  `data-brushtype`, `autonum[data-num]`, and `style_id/style_name/style_price`.
- `MARKET_EDITOR_RESIDUE_RULES` now blocks those 135 text-slot/list metadata residues across
  WeChat, Xiaohongshu, and Zhihu.
- Verification passed: focused 86 tests, 4-file export regression 125 tests, full export serial
  1048 tests, ESLint, `vue-tsc`, and production build.
- Boundary: local detector proof only. It does not prove phone preview, mobile interaction, Dark
  Mode, cover thumbnail, sync, scheduled-send, upload, public host, or publish gates.

## 2026-06-20 135 Ordinary Free Style Applied Readback Refresh

- [x] 135-ordinary-free-style-applied-readback-refresh-20260620.txt
- Reused CloakBrowser only on the active 135 ordinary editor page; no save, export, sync, upload,
  preview, publish, screenshot, browser profile artifact, account artifact, template source, or
  material URL was recorded.
- After focusing the central UEditor iframe body and clicking visible non-VIP style
  `#style-173703`, current readback confirmed `bodyChildren=6`, `bodyHtmlLen=25148`,
  `nodes=186`, `sections=122`, `styleAttrs=131`, `dataTools=7`, `dataId=7`,
  `dataBrushType=18`, `svgs=5`, `images=12`, and `style173703=2`.
- This refresh confirms the existing applied-editor-element boundary and 135 residue rules. It
  does not add a runtime detector rule because the already-blocked residues cover the observed
  `_135editor`, `data-tools`, `data-id`, and `data-brushtype` families.
- Verification passed: focused `market editor residue` regression 1 selected test and
  `git diff --check` on this slice's docs/evidence files.
- Boundary: market-editor authoring DOM learning only. It does not prove phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, or publish
  gates.

## 2026-06-29 135 Style Library Operation Chrome Residue Gate

- [x] 135-style-library-operation-chrome-residue-20260629.txt
- CloakBrowser-only 135 ordinary editor sampling enabled the visible free filter and inspected
  concrete left style-card DOM after a center-empty click was rejected as insufficient applied
  proof.
- The sampled left style card exposed library operation markers such as
  `judgeYangShiJurisdiction(...)`, `similarity_recommend_entry`, `material-id`,
  `material-type="style"`, `mappaobug`, and `data-model="EditorStyle"` in addition to the already
  covered `style_id/style_name/style_price` metadata.
- `MARKET_EDITOR_RESIDUE_RULES` now blocks those 135 style-library operation chrome residues
  across WeChat, Xiaohongshu, and Zhihu even when `_135editor`, `data-tools`, and style-list
  metadata have already been stripped.
- Verification passed: targeted TDD red/green, adjacent 135 market-residue regression,
  full `platform-export-rendering` with 358 tests, full export service suite with 1335 tests,
  ESLint, `vue-tsc`, production build, and release preflight expected-blocked.
- Boundary: local detector proof only. It does not prove WeChat PC paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, XHS/Zhihu
  account upload, or publish gates.

## 2026-06-29 135 UEditor Chrome Residue Gate

- [x] 135-ueditor-chrome-residue-20260629.txt
- CloakBrowser-only 135 ordinary editor sampling read the visible UEditor toolbar/editor shell on
  the live page after the central iframe was confirmed reachable.
- Observed normal-editor chrome markers included `edui-toolbar`, `edui-button`,
  `edui-for-bold`, `edui-for-fontsize`, `edui-wx-input`, `edui-editor`,
  `edui-editor-mainbar`, `edui-editor-toolbarbox`, and `edui-editor-iframeholder`.
- `MARKET_EDITOR_RESIDUE_RULES` now blocks UEditor toolbar/editor chrome across WeChat,
  Xiaohongshu, and Zhihu even when `_135editor`, style-list metadata, left-library operation
  chrome, and SVG-builder markers are absent.
- Verification passed: targeted TDD red/green, adjacent 135 market-residue regression,
  full `platform-export-rendering` with 359 tests, full export service suite with 1336 tests,
  ESLint, `vue-tsc`, production build, and release preflight expected-blocked.
- Boundary: local detector proof only. It does not prove WeChat PC paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, XHS/Zhihu
  account upload, or publish gates.

## 2026-06-29 135 Editor Action Rail Chrome Residue Gate

- [x] 135-action-rail-chrome-residue-20260629.txt
- CloakBrowser-only 135 ordinary editor sampling read the right-side editor action rail next to
  the central UEditor iframe.
- Observed action rail markers included `editorslide`, `multiedit_agent_main`, `agent_btn`,
  `import-article`, `copy-editor-html`, `quick-save-template`, `save-as-template`,
  `btn-new-msg`, `large-image-popover`, `btn-show-drafts`, `preview-editor`, and
  `sync_official_accounts`.
- `MARKET_EDITOR_RESIDUE_RULES` now blocks those action rail controls across WeChat,
  Xiaohongshu, and Zhihu even when `_135editor`, style-list metadata, left-library operation
  chrome, UEditor toolbar/editor chrome, and SVG-builder markers are absent.
- Verification passed: targeted TDD red/green, adjacent 135 market-residue regression,
  full `platform-export-rendering`, full export service suite, ESLint, `vue-tsc`, production
  build, and release preflight expected-blocked.
- Boundary: local detector proof only. It does not prove WeChat PC paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, XHS/Zhihu
  account upload, or publish gates.

## 2026-06-29 135 Mirrored Image Source Residue Gate

- [x] 135-mirrored-image-source-residue-20260629.txt
- CloakBrowser-only 135 ordinary editor sampling restored the center UEditor iframe body selection
  and clicked a visible free style. The second click produced a real center delta:
  `body.children.length` 5 -> 6, HTML length 22552 -> 25922, `data-id="174407"` 0 -> 1, and
  image count 12 -> 14.
- The inserted block carried 135-hosted material image references through both `src` and `_src`.
- `MARKET_EDITOR_RESIDUE_RULES` now explicitly treats `_src` as part of `135 third-party image
  source` coverage across WeChat, Xiaohongshu, and Zhihu, even when broader `_135editor`,
  `data-tools`, and numeric market style ids are absent.
- Verification passed: existing coverage audit for `_src`, adjacent hosted image/background
  regression, full `platform-export-rendering`, full export service suite, ESLint, `vue-tsc`,
  production build, and release preflight expected-blocked.
- Boundary: local detector proof only. It does not prove WeChat PC paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, XHS/Zhihu
  account upload, or publish gates.

## 2026-06-29 135 Style Panel Navigation Chrome Residue Gate

- [x] 135-style-panel-navigation-chrome-residue-20260629.txt
- CloakBrowser-only 135 ordinary editor sampling read the live left-panel style navigation chrome.
- Observed markers included `style-operate-area`, `style-color-palette`, `style-categories`,
  `style-sorts`, and `news_modal-ys`.
- `MARKET_EDITOR_RESIDUE_RULES` now blocks those style-panel navigation controls across WeChat,
  Xiaohongshu, and Zhihu even when style-card operation buttons, UEditor toolbar chrome, action
  rail chrome, hosted image sources, and SVG-builder markers are absent.
- Verification passed: targeted TDD red/green, adjacent 135 market-residue regression,
  full `platform-export-rendering`, full export service suite, ESLint, `vue-tsc`, production
  build, and release preflight expected-blocked.
- Boundary: local detector proof only. It does not prove WeChat PC paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, XHS/Zhihu
  account upload, or publish gates.

## 2026-06-29 135 Full-Page Navigation Chrome Residue Gate

- [x] 135-full-page-navigation-chrome-residue-20260629.txt
- CloakBrowser-only 135 ordinary editor sampling read the live site header, announcement strip,
  account menu, product navigation, and left main menu chrome.
- Observed markers included `nav-header`, `top-style-tools`, `site-annoucement-list`,
  `login-menus`, `left-operate-menu`, `left-advertises`, `bg-header`, `category-nav`,
  `left_side__menu`, and `ai_subsystem_nav`.
- `MARKET_EDITOR_RESIDUE_RULES` now blocks those full-page navigation controls across WeChat,
  Xiaohongshu, and Zhihu even when style-panel controls, style-card operation buttons, UEditor
  toolbar chrome, action rail chrome, hosted image sources, and SVG-builder markers are absent.
- Verification passed: targeted TDD red/green, adjacent 135 market-residue regression,
  full `platform-export-rendering`, full export service suite, ESLint, `vue-tsc`, production
  build, and release preflight expected-blocked.
- Boundary: local detector proof only. It does not prove WeChat PC paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, XHS/Zhihu
  account upload, or publish gates.

## 2026-06-29 135 Helper Iframe Chrome Residue Gate

- [x] 135-helper-iframe-chrome-residue-20260629.txt
- CloakBrowser-only 135 ordinary editor sampling read helper iframe markers around the live editor
  page.
- Observed markers included `ai_polish_box_iframe`, `js_shared_iframe`, `svg_editor_iframe`,
  `ueditor_0`, and `_src="/style-center?...`.
- `MARKET_EDITOR_RESIDUE_RULES` now blocks those helper iframe controls across WeChat,
  Xiaohongshu, and Zhihu even when full-page navigation chrome, style-panel controls, style-card
  operation buttons, UEditor toolbar chrome, action rail chrome, hosted image sources, and
  SVG-builder markers are absent.
- Verification passed: targeted TDD red/green, adjacent 135 market-residue regression,
  full `platform-export-rendering`, full export service suite, ESLint, `vue-tsc`, production
  build, and release preflight expected-blocked.
- Boundary: local detector proof only. It does not prove WeChat PC paste, phone preview, iframe
  fidelity, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, XHS/Zhihu
  account upload, or publish gates.

## 2026-06-29 135 Announcement Link Chrome Residue Gate

- [x] 135-announcement-link-chrome-residue-20260629.txt
- CloakBrowser-only 135 ordinary editor sampling read announcement-strip link markers on the live
  editor page.
- Observed markers included `class="announcement unread"` and
  `https://www.135editor.com/announcements/view/<id>`.
- `MARKET_EDITOR_RESIDUE_RULES` now blocks those announcement link controls across WeChat,
  Xiaohongshu, and Zhihu even when full-page navigation chrome, helper iframe chrome, style-panel
  controls, style-card operation buttons, UEditor toolbar chrome, action rail chrome, hosted image
  sources, and SVG-builder markers are absent.
- Verification passed: targeted TDD red/green, adjacent 135 market-residue regression,
  full `platform-export-rendering`, full export service suite, ESLint, `vue-tsc`, production
  build, and release preflight expected-blocked.
- Boundary: local detector proof only. It does not prove WeChat PC paste, phone preview, link
  fidelity, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, XHS/Zhihu
  account upload, or publish gates.

## 2026-06-18 135 SVG Builder Canvas Residue Gate

- [x] 135-svg-builder-canvas-residue-gate-20260618.txt
- CloakBrowser-only 135 SVG editor sampling read the center `#app-content-canvas` after opening
  `https://www.135editor.com/svgeditor/`.
- The center canvas contained 8 blocks, 8 SVG previews, 0 images, and HTML length `11946`.
- Observed builder identities included `multiselectpopup`, `carouselslide`,
  `slidesectorclickredpacket`, `clickelementscaleimagesspread`, and
  `coverclickmovewithspread`.
- The first visible `免费试用` click did not change the current canvas counts, so it was recorded as
  no-delta; the existing center canvas DOM still supplied authoring-structure rules.
- `MARKET_EDITOR_RESIDUE_RULES` now blocks copied 135 SVG builder `data-name` values and canvas
  placeholder/block classes across WeChat, Xiaohongshu, and Zhihu.
- Verification passed: focused 87 tests, 4-file export regression 126 tests, full export serial
  1049 tests, ESLint, `vue-tsc`, and production build.
- Boundary: local detector proof only. It does not prove phone preview, mobile interaction, Dark
  Mode, cover thumbnail, sync, scheduled-send, upload, public host, or publish gates.

## 2026-06-18 Xiumi Applied Runtime Binding Residue Gate

- [x] xiumi-applied-runtime-binding-residue-gate-20260618.txt
- CloakBrowser-only Xiumi v5 paper editor sampling clicked SVG, Title, and Card categories plus one
  visible sample from each category, then read the center `.tn-editing-panel` DOM.
- SVG insertion changed the center editor by `htmlLength +32007`, `tnComp +15`, `tnCell +18`,
  `contenteditable +1`, `img +3`, and `tnUuid +15`.
- Title insertion changed the center editor by `htmlLength +15313`, `tnComp +6`, `tnCell +7`,
  `contenteditable +1`, and `img +6`.
- Card insertion changed the center editor by `htmlLength +30728`, `tnComp +17`, `tnCell +21`,
  `contenteditable +7`, and `img +3`.
- `MARKET_EDITOR_RESIDUE_RULES` now blocks copied Xiumi runtime binding attributes
  `opera-tn-ra-comp`, `opera-tn-ra-cell`, and `disable-tn-*` across WeChat, Xiaohongshu, and Zhihu.
- Verification passed: focused 88 tests, 4-file export regression 127 tests, full export serial
  1050 tests, ESLint, `vue-tsc`, and production build.
- Boundary: local detector proof and market-editor rule extraction only. It does not prove phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host,
  or publish gates.
## 2026-06-18 Xiumi Angular Runtime Residue Gate

- `xiumi-angular-runtime-residue-gate-20260618.txt` records the CloakBrowser-only
  Xiumi center-editor readback where `.tn-editing-panel` contained 4905 `ng-*`
  authoring attributes, 83 `tn-uuid` values, 184 `opera-tn-ra-*` bindings,
  38 `statics.xiumi.us` references, 99 images, and zero center inline SVG.
- The executable gate blocks copied Angular/Vue authoring attributes such as
  `ng-model`, `ng-include`, `ng-controller`, `ng-change`, and `ng-hide`, plus
  Angular runtime classes such as `ng-scope`, `ng-binding`, `ng-hide`,
  `ng-pristine`, `ng-valid`, and `ui-sortable`.
- This evidence is local detector proof only. It does not prove WeChat phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send,
  XHS/Zhihu upload, public host acceptance, or publish success.

## 2026-06-18 OSS Converter Source Refresh

- [x] oss-converter-source-refresh-20260618.txt
- Public source-backed refresh inspected doocs/md, mdnice/markdown-nice, and RedBookCards with
  Grok Search used only as a narrow GitHub/source discovery aid.
- The refresh records converter-family rules: WeChat CSS must be made fragment-safe and inlined
  before clipboard/export; preview theme injection is not proof; images need stable style-level
  dimensions; math/SVG diagrams require platform shims or fallback artifacts.
- It also records platform separation: XHS high-visual output is image-page/long-image manifest
  work, while Zhihu output is semantic Markdown or public-host image fallback with alt/caption.
- Boundary: source-backed rule extraction only. It does not prove WeChat phone preview, mobile
  interaction, Dark Mode, cover thumbnail, ordinary rich Ctrl+V for all flagship artifacts,
  credentialed sync, scheduled-send, XHS/Zhihu upload, public host acceptance, or publish success.

## 2026-06-18 Xiumi Editable Surface Residue Gate

- `xiumi-editable-surface-residue-gate-20260618.txt` records the CloakBrowser-only
  Xiumi center-editor readback where `.tn-editing-panel` contained 19
  `contenteditable` text cells inside applied SVG/title/card content.
- The executable gate blocks copied `contenteditable` attributes as
  `editor editable surface attribute`, independently from `tn-*`, `ng-*`, 135
  wrapper classes, or vendor media URL markers.
- This evidence is local detector proof only. It does not prove WeChat phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled-send,
  XHS/Zhihu upload, public host acceptance, or publish success.

## 2026-06-18 Style Proof Execution Runbook

- [x] style-proof-execution-runbook-20260618.txt
- Added a local operator runbook layer above the style proof acceptance audit.
- `getPlatformStyleProofExecutionRunbook()` and `getStyleProofExecutionRunbook()` map every open
  proof requirement to required proof channel/action/readback, artifact fields, success criteria,
  failure signals, redaction boundary, and cannot-claim reason.
- Ordinary WeChat PC paste now has a machine-readable proof contract requiring the same
  `platform-editor` / `pc-paste` artifact to carry the bound paste flags, including
  `ordinaryClipboardPasteVerified`, `sameEditorTabVerified`, `pasteInputEventVerified`,
  `editorBodyMutationVerified`, and `mojibakeFreeVerified`.
- Phone preview, Dark Mode, cover thumbnail, public host, credentialed channel, and publish gates
  remain separate cannot-claim rows until exact external proof exists.
- Verification passed: focused 92 tests, 4-file export regression 131 tests, full export serial
  1054 tests, ESLint, `vue-tsc`, and production build.
- Boundary: local execution-runbook proof only. It does not prove phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, or publish
  gates.

## 2026-06-19 Style Proof Execution Runbook ExportModal UI

- [x] style-proof-execution-runbook-exportmodal-20260619.txt
- ExportModal now surfaces the local execution runbook beside the existing style capability and
  acceptance audit UI: summary, preflight row, per-card execution summary, and artifact-field
  contract chips across WeChat, Xiaohongshu, and Zhihu.
- The UI is read-only and does not change style selectability, availability, blocked/unavailable
  state, preset application, clipboard, draft, sync, upload, or publish behavior.
- Real Tauri/WebView2 WDIO caught and fixed a layout regression where long field-label chips could
  squeeze the preview body to 61px. The final run restored `#nice` width to 401px and kept
  `charsPerLine=20`; the 980px responsive branch resets the desktop control-column max-width.
- Verification passed: component ESLint, focused style proof Vitest 92 tests, `vue-tsc`, production
  build, and real WDIO SVG render spec with 1 spec / 6 tests.
- Boundary: local UI visibility and layout proof only. It does not prove phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, or publish
  gates.

## 2026-06-19 Style Proof Artifact Manifest Validation

- [x] style-proof-artifact-manifest-validation-20260619.txt
- XHS and Zhihu artifact-manifest proof rows now require `artifactManifestValidated:true` in
  addition to `artifactRef` and `safeForCommit`.
- The validator keeps manifest-shaped proof rows invalid until the matching
  `validateXhsImageArtifactManifest()` or `validateZhihuImageArtifactManifest()` call has passed
  for the exact redacted manifest.
- Validator-passed rows also require a non-empty `artifactRef` to the redacted manifest report.
- The execution runbook exposes the same required field so UI/operator checklists cannot diverge
  from the proof validator.
- Runbook next actions and failure signals name `validateXhsImageArtifactManifest()` for XHS and
  `validateZhihuImageArtifactManifest()` for Zhihu.
- Boundary: local validator-passed accounting only. It does not prove upload, platform preview,
  public URL acceptance, sync, scheduled publish, or publish success.

## 2026-06-19 WeChat Dashboard Authenticated Redacted Readback

- [x] wechat-dashboard-auth-redacted-readback-20260619.txt
- CloakBrowser-only readback reached the authenticated WeChat Official Account backend dashboard at
  `/cgi-bin/home` after machine reboot.
- Redacted readback confirmed visible backend/home root, draftbox link, all-drafts button,
  dashboard draft cards, publish-record cards, and appmsg-family anchors.
- Login-page containers were absent and the visible login QR image selector was absent; dashboard
  QR-class nodes were treated as ordinary backend UI and not as a login blocker.
- No editor was opened, no draft was edited, no paste was attempted, no phone preview was opened,
  no sync/upload/publish action was triggered, and no screenshots, account-identifying text,
  article-identifying text, link targets, credential material, browser state locations, or raw
  markup were committed.
- Boundary: authenticated dashboard reachability only. It does not prove editor DOM readback,
  ordinary Ctrl+V rich HTML/SVG paste, safe disposable draft cleanup, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, or publish
  gates.

## 2026-06-19 E2E SVG Render Refresh

- [x] e2e-svg-render-refresh-20260619.txt
- Rebuilt production assets with `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`;
  Vite transformed 4652 modules and built successfully in 24.15s.
- Ran the real Tauri/WebView2 SVG render spec:
  `pnpm -C inkforge exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`.
- `wdio.conf.cjs` compiled the real Tauri debug binary via Cargo, then WebView2 149 ran
  `svg-render.spec.cjs` with 1 spec / 6 tests passed.
- The run re-confirmed ExportModal style capability gates, three flagship responsive
  `[data-ink-svg]` modules, and the mobile line rhythm gate at `charsPerLine=20`.
- Boundary: local production build and real Tauri/WebView2 ExportModal proof only. It does not
  prove WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, credentialed sync,
  scheduled-send, XHS/Zhihu upload, public host acceptance, or publish success.

## 2026-06-19 WeChat Create Entry No-op Readback

- [x] wechat-create-entry-noop-readback-20260619.txt
- Authenticated browser-only preflight stayed on the WeChat backend home path and verified the
  deterministic disposable-draft sentinel count was 0 before any mutation attempt.
- The visible article creation entry was present, but DOM click plus two browser-layer clicks on
  the visible create-content/title nodes did not open the editor.
- Post-attempt readback stayed on `/cgi-bin/home`; editor shell, ProseMirror, contenteditable, and
  sentinel counts all stayed 0, with no visible blocking dialog.
- A redacted anchor scan found draftbox/publish-record/public article path families but no safe
  visible new-editor href to use without bypassing the normal creation path.
- Boundary: no mutation occurred and no proof gate is satisfied. This does not prove
  safe-disposable-draft, editor DOM readback, ordinary Ctrl+V paste, phone preview, Dark Mode,
  cover thumbnail, sync, scheduled-send, upload, public host, or publish success.

## 2026-06-19 Market Editor Applied Rule Refresh

- [x] market-editor-applied-rule-refresh-20260619.txt
- CloakBrowser-only refresh converted 135 ordinary editor, 135 SVG trigger-canvas, and Xiumi SVG
  carousel/flow-canvas observations into local detector/spec rules.
- Empty 135 `_135editor` placeholders are recorded as insertion-risk evidence, not applied style
  proof.
- 135 SVG trigger-canvas wrappers and Xiumi flow-canvas / SVG-carousel authoring metadata now stay
  publish-blocking residue for WeChat, Xiaohongshu, and Zhihu outputs.
- Verification passed: focused export rendering test, 4-file cross-platform export regression,
  full export serial suite, targeted ESLint, `vue-tsc`, and production build.
- Boundary: local detector and documentation proof only. It does not prove WeChat phone preview,
  mobile interaction, Dark Mode, cover thumbnail, credentialed sync, scheduled-send, XHS/Zhihu
  upload, public host acceptance, platform preview, public article rendering, or publish success.

## 2026-06-19 WeChat Draftbox Create Menu Readback

- [x] wechat-draftbox-create-menu-readback-20260619.txt
- CloakBrowser-only authenticated navigation reached the draftbox route through the backend DOM menu
  link with active session context; a bare draftbox path returned a relogin prompt.
- The draftbox toolbar create menu was reachable and exposed an article-like item, but no article
  type was selected.
- No editor opened, no draft was created, no paste was attempted, no preview/sync/upload/publish
  action was triggered, and no raw account text, article titles, query parameters, browser state,
  screenshots, or raw markup were committed.
- Boundary: create-menu reachability only. It does not prove safe-disposable-draft, editor DOM
  readback, ordinary Ctrl+V paste, phone preview, Dark Mode, cover thumbnail, sync, scheduled-send,
  upload, public host, platform preview, public article rendering, or publish success.

## 2026-06-19 WeChat Draftbox Article Menu Click Blocked

- [x] wechat-draftbox-article-menu-click-blocked-20260619.txt
- CloakBrowser-only authenticated follow-up kept the draftbox create menu in scope and attempted to
  select the visible article item without bypassing the platform UI.
- DOM click, CloakBrowser selector clicks, calibrated OS mouse clicks, and a diagnostic in-page
  pointer/mouse event sequence did not open the article editor. CloakBrowser selector clicks were
  blocked by element-stability failures, and the diagnostic DOM event sequence is not trusted user
  proof.
- Post-attempt readback stayed on `/cgi-bin/appmsg`; editor shell selectors, `.ProseMirror`,
  article-body contenteditable nodes, iframe nodes, textarea nodes, and the deterministic sentinel
  all stayed absent.
- Boundary: authenticated draftbox article-menu selection is blocked. This does not prove
  safe-disposable-draft, editor DOM readback, ordinary Ctrl+V paste, phone preview, Dark Mode,
  cover thumbnail, sync, scheduled-send, upload, public host, platform preview, public article
  rendering, or publish success.

## 2026-06-19 WeChat OS Click Calibration Abort

- [x] wechat-os-click-calibration-abort-20260619.txt
- A follow-up tried to validate Win32 `mouse_event` / `SendInput` targeting against the visible
  create button before any further article-item selection.
- The candidate point landed on a Chromium render window and the intended page coordinate matched
  the visible create button, but the create menu did not open. CSS hover diagnostics showed the OS
  cursor path was not safely bound to the intended DOM target and intersected a draft-card region.
- The hover diagnostic exposed private draft/card text, so only the redacted conclusion is recorded.
- Post-attempt readback stayed on `/cgi-bin/appmsg`; no editor shell, article-body contenteditable,
  iframe, textarea, create-menu item, or deterministic sentinel appeared.
- Boundary: OS-coordinate clicking is aborted for this session. This does not prove editor DOM
  readback, safe disposable draft, ordinary Ctrl+V paste, phone preview, Dark Mode, cover
  thumbnail, sync, scheduled-send, upload, public host, platform preview, public article rendering,
  or publish success.

## 2026-06-19 Completion Gap Audit Refresh

- [x] completion-gap-audit-20260619.txt
- Current-state audit refresh across committed local evidence, committed WeChat PC proof, market
  editor rule extraction, E2E SVG render proof, WeChat dashboard/draftbox/create-menu readbacks,
  draftbox article-menu block, and OS-click calibration abort.
- The audit predates the Tempera entity-safe committed manifest refresh. Current committed PC
  accounting now includes Amber raw proof plus Tempera entity-safe proof, while still preventing
  generalization to raw UTF-8 Tempera direct paste, Kiln, phone preview, Dark Mode, cover thumbnail,
  sync, scheduled-send, platform preview, or publish.
- It marks WeChat article-editor entry as blocked-safe-abort until OS cursor path and exact DOM
  target identity can be proved without intersecting account content.
- It keeps XHS/Zhihu local artifact manifests as preflight only until real account/platform or
  public-host proof exists.
- Boundary: gap audit only. It does not create new platform proof or close phone, sync, upload,
  public-host, platform preview, public article rendering, scheduled-send, or publish gates.

## 2026-06-19 Platform Editor Target Identity Gate

- [x] platform-editor-target-identity-gate-20260619.txt
- Current local validator/runbook hardening: `platformEditorTargetVerified:true` is now required
  for authenticated editor URL proof, PC editor DOM proof, and ordinary PC editor paste proof.
- Draftbox/create-menu/article-menu readbacks and OS click calibration diagnostics remain blocked
  or abort evidence; they cannot satisfy article editor target identity from active session,
  render-window hit testing, hover chains, or body focus alone.
- Regression coverage keeps authenticated draftbox/menu readbacks and OS click calibration aborts
  invalid/cannot-claim while preserving the exact committed Amber PC proof.
- Verification passed: focused export rendering test, 4-file cross-platform export regression,
  full export serial suite, targeted ESLint, `vue-tsc`, and production build.
- Boundary: local validator/runbook proof only. It does not prove WeChat editor opening, ordinary
  Ctrl+V rich paste success, safe disposable draft cleanup, phone preview, Dark Mode, cover
  thumbnail, sync, scheduled-send, upload, public host, platform preview, public article rendering,
  or publish success.

## 2026-06-19 WeChat Create Entry CloakBrowser Stability Block

- [x] wechat-create-entry-cloakbrowser-stability-blocked-20260619.txt
- Current platform state: authenticated `/cgi-bin/appmsg` remained reachable, but no article editor
  shell, contenteditable article body, iframe, textarea, or deterministic sentinel was present.
- The visible new-creation control had stable geometry, but CloakBrowser selector clicks against
  the button, operation group, and default span all failed the element-stability gate.
- The toolbar contained hidden create-option DOM text, but the dropdown menu stayed `display:none`
  with zero-size menu item rects.
- Boundary: hidden dropdown DOM text and click-stability failures are blocked evidence only. They
  do not prove article editor target identity, editor DOM readback, safe draft, PC paste, phone
  preview, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host, platform preview,
  public article rendering, or publish success.

## 2026-06-19 WeChat Existing Draft Edit Entry Blocked

- [x] wechat-existing-draft-edit-entry-blocked-20260619.txt
- CloakBrowser selector click on a visible existing draft title returned ok, but readback stayed on
  `/cgi-bin/appmsg` with no editor shell, contenteditable article body, iframe, textarea, visible
  editor-like node, or deterministic sentinel.
- The visible card action layer exposed edit/publish affordances, but the tagged edit candidate
  resolved to `visibility:hidden`; its center hit the parent action layer.
- CloakBrowser selector click against the tagged edit candidate failed the element-stability gate.
- Boundary: existing draft title links and hidden hover/action edit affordances are blocked
  evidence only. They do not prove article editor target identity, editor DOM readback, safe draft,
  PC paste, phone preview, Dark Mode, cover thumbnail, sync, scheduled-send, upload, public host,
  platform preview, public article rendering, or publish success.

## 2026-06-19 XHS/Zhihu Account Login Gate Readback

- [x] xhs-zhihu-account-login-gate-readback-20260619.txt
- XHS creator home redirected to the creator login route; login controls were visible and no
  file-upload input, platform preview, or publish surface was reachable.
- Zhihu write entry redirected to the sign-in route; verification-code login controls were visible
  and no editor DOM, upload input, editor preview, or publish surface was reachable.
- Boundary: external-account blocker only. XHS/Zhihu local artifact manifests remain preflight
  proof and do not prove account upload, platform preview, public-host acceptance, public article
  rendering, scheduled-send, or publish success.

## 2026-06-19 External Account Login Blocker Validator

- [x] external-account-login-blocker-validator-20260619.txt
- Local validator/runbook hardening adds explicit external-account fields and the
  `style-proof-manifest-external-account-login-blocked` issue.
- XHS login-gate readback remains invalid for upload preview and publish proof.
- Zhihu sign-in readback remains invalid for public-host, upload-manifest, and publish proof.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 103 tests.
- 4-file cross-platform regression passed at 4 files / 142 tests, and full export serial
  regression passed at 35 files / 1076 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: local validator/runbook proof only. It does not prove account authentication, upload
  surface availability, public-host acceptance, platform preview, public article rendering,
  scheduled-send, or publish success.

## 2026-06-19 WeChat Session Relogin CloakBrowser Readback

- [x] wechat-session-relogin-cloakbrowser-readback-20260619.txt
- CloakBrowser-only readback opened the WeChat backend article-list path after restart and found a
  relogin signal rather than a usable authenticated article editor.
- Redacted selector counts showed zero `.ProseMirror`, zero contenteditable article bodies, zero
  iframe nodes, and zero textarea nodes for the checked editor surfaces.
- No screenshot, form fill, draft mutation, paste, phone preview, sync, scheduled send, or publish
  action was performed.
- Boundary: relogin platform-state evidence only. It cannot satisfy authenticated editor URL, PC
  editor DOM, safe draft, ordinary PC paste, phone preview, sync, scheduled-send, platform preview,
  public article rendering, or publish proof.

## 2026-06-19 WeChat Phone Preview Matrix Validator

- [x] wechat-phone-preview-matrix-validator-20260619.txt
- Local validator/runbook hardening adds `phone-preview-entry-readback`,
  `phonePreviewBlocked`, and `style-proof-manifest-phone-preview-blocked`.
- `phone-screenshot` now requires final phone article content verification, not just a screenshot
  artifact.
- `dark-mode-check` now requires final phone article content verification as well as mobile Dark
  Mode verification.
- Scan/setup/PC-preview-shell readbacks remain invalid for phone preview readback, phone
  screenshot, Dark Mode, and cover-thumbnail rows.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 104 tests.
- 4-file cross-platform regression passed at 4 files / 143 tests, and full export serial
  regression passed at 35 files / 1077 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: local validator/runbook proof only. It does not prove WeChat phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, platform preview, public article
  rendering, or publish success.

## 2026-06-19 External Account Proof Contract Validator

- [x] external-account-proof-contract-validator-20260619.txt
- Local validator/runbook hardening adds
  `style-proof-manifest-external-account-auth-missing`.
- `credentialed-channel-response` and `sync-readback` require
  `externalAccountAuthenticated:true` on the same proof artifact.
- `published-url-or-platform-preview` requires `public-web` or `credentialed-channel` proof with
  `externalAccountAuthenticated:true`; `phone-preview` remains mobile-preview proof only.
- Single-factor regressions cover `externalAccountLoginBlocked:true`,
  `externalAccountAuthenticated:false`, and `action:'external-account-login-readback'`.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 108 tests.
- 4-file cross-platform regression passed at 4 files / 147 tests, and full export serial
  regression passed at 35 files / 1081 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: local validator/runbook proof only. It does not prove account authentication, upload
  surface availability, public-host acceptance, platform preview, public article rendering,
  scheduled-send, or publish success.

## 2026-06-19 Public Host ArtifactRef Validator

- [x] public-host-artifact-ref-validator-20260619.txt
- `public-image-host` proof requires accepted public/platform host status plus a traceable
  `artifactRef`.
- Host-status-only public-host rows emit `style-proof-manifest-artifact-ref-missing`.
- Acceptance requirement rows carrying `style-proof-manifest-artifact-ref-missing` report
  `invalid` rather than generic `blocked-by-external`.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 109 tests.
- 4-file cross-platform regression passed at 4 files / 148 tests, and full export serial
  regression passed at 35 files / 1082 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: local validator/runbook proof only. It does not prove public-host acceptance, account
  upload, platform preview, public article rendering, scheduled-send, or publish success.

## 2026-06-19 Published Preview Exact Artifact Validator

- [x] published-preview-exact-artifact-validator-20260619.txt
- `published-url-or-platform-preview` proof requires `exactArtifact:true` on the same authenticated
  public-web or credentialed-channel published-preview artifact.
- Missing exact artifact binding emits `style-proof-manifest-exact-artifact-missing`.
- Acceptance requirement rows carrying `style-proof-manifest-exact-artifact-missing` report
  `invalid`.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 110 tests.
- 4-file cross-platform regression passed at 4 files / 149 tests, and full export serial
  regression passed at 35 files / 1083 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; generated
  `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: local validator/runbook proof only. It does not prove account authentication, platform
  preview, public article rendering, scheduled-send, or publish success.

## 2026-06-19 Phone Matrix Exact Artifact Validator

- [x] phone-matrix-exact-artifact-validator-20260619.txt
- `phone-preview-readback`, `dark-mode-check`, and `cover-thumbnail-check` require same-artifact
  exact export binding for their accepted proof rows.
- Unbound phone/Dark Mode/cover rows emit `style-proof-manifest-exact-artifact-missing`, even when
  a separate local exact-artifact proof exists for the manifest.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 111 tests.
- 4-file cross-platform regression passed at 4 files / 150 tests, and full export serial
  regression passed at 35 files / 1084 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  23.68s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: local validator/runbook proof only. It does not prove WeChat phone preview, mobile
  interaction, Dark Mode, cover thumbnail, scheduled-send, or publish success.

## 2026-06-19 Phone Screenshot Exact Artifact Validator

- [x] phone-screenshot-exact-artifact-validator-20260619.txt
- `phone-screenshot` runbook fields include `artifactFingerprint` and `exactArtifact`.
- `phone-screenshot` requires same-artifact exact export binding for the accepted phone preview
  screenshot row.
- Unbound phone screenshot rows emit `style-proof-manifest-exact-artifact-missing`, even when a
  separate local exact-artifact proof exists for the manifest.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 111 tests.
- 4-file cross-platform regression passed at 4 files / 150 tests, and full export serial
  regression passed at 35 files / 1084 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  28.23s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: local validator/runbook proof only. It does not prove WeChat phone preview, mobile
  interaction, Dark Mode, cover thumbnail, scheduled-send, or publish success.

## 2026-06-19 Exact Artifact Fingerprint Validator

- [x] exact-artifact-fingerprint-validator-20260619.txt
- Generic `exact-artifact` proof requires `exactArtifact:true` and a non-empty
  `artifactFingerprint` on the same proof row.
- Bare exact-artifact boolean rows emit `style-proof-manifest-exact-artifact-missing`.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 112 tests.
- 4-file cross-platform regression passed at 4 files / 151 tests, and full export serial
  regression passed at 35 files / 1085 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  24.59s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: local validator/runbook proof only. It does not prove WeChat phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled-send, platform preview, public article
  rendering, or publish success.

## 2026-06-19 WeChat Draft List CloakBrowser Readback

- [x] wechat-draft-list-cloakbrowser-readback-20260619.txt
- CloakBrowser-only read-only backend home and draft-list state check.
- No screenshot, form fill, paste, save, sync, phone preview, scheduled send, publish, delete, or
  draft mutation.
- Raw URL token, account text, article titles, and page text samples were not recorded.
- Authenticated draft-list route was reachable with login/relogin blocker signals absent.
- Redacted selector counts on the draft-list surface: iframe 0, contenteditable editor nodes 0,
  textarea 0, ProseMirror 0, editor-like containers 6, draft/card-like containers 64, buttons 31,
  anchors 93.
- Boundary: authenticated draft-list reachability evidence only. It does not prove authenticated
  article editor target readback, ordinary PC paste, editor body mutation, safe disposable draft
  cleanup, WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, credentialed sync,
  scheduled send, platform preview, public article rendering, or publish success.

## 2026-06-19 WeChat Draft Edit Entry CloakBrowser Readback

- [x] wechat-draft-edit-entry-cloakbrowser-readback-20260619.txt
- CloakBrowser-only read-only draft edit-entry check from the authenticated draft-list surface.
- No screenshot, form fill, paste, save, sync, phone preview, scheduled send, publish, delete, or
  draft mutation.
- Raw credential parameters, account text, article titles, draft body, page text samples, raw
  network URLs, browser session secrets, and local runtime paths were not recorded.
- The delete-shaped control and publish-shaped control were distinguished from the edit-shaped
  control by parent wrapper text flags and control placement; only the edit-shaped control was
  clicked.
- After waiting for the active page to settle, the active CloakBrowser page remained on the
  draft-list route shape.
- Redacted selector counts after edit-entry click: iframe 0, contenteditable editor nodes 0,
  textarea 0, ProseMirror 0, editor-like class/id nodes 6, rich-media/appmsg-edit/js-editor nodes 0,
  known JS editor ids 0.
- Boundary: authenticated draft-list and edit-shaped control reachability evidence only. It does
  not prove authenticated article editor DOM, ordinary PC paste, editor body mutation, safe
  disposable draft cleanup, WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail,
  credentialed sync, scheduled send, platform preview, public article rendering, or publish
  success.

## 2026-06-19 WeChat New Article Editor CloakBrowser Readback

- [x] wechat-new-article-editor-cloakbrowser-readback-20260619.txt
- CloakBrowser-only authenticated new-article editor surface readback.
- No screenshot, form fill, paste, save, preview, sync, phone preview, scheduled send, publish,
  delete, or draft cleanup action.
- Raw credential parameters, account text, article titles, article body, page text samples, raw
  network URLs, browser session secrets, and local runtime paths were not recorded.
- Existing list-card edit controls were distinguishable from delete and publish controls, but the
  existing-card edit click remained on the list route shape.
- The browser used the current authenticated session and the official new-article route shape
  exposed by the WeChat static bundle to reach `media/appmsg_edit_v2`, `action=edit`, `isNew=1`,
  `type=10`.
- Redacted selector counts on the final editor route: iframe 1, visible iframe 0,
  `contenteditable=true` 3, visible contenteditable 2, textarea 2, visible textarea 1,
  ProseMirror 2, known JS editor ids 31, appmsg-edit signals 16, rich-media signals 1,
  `#js_content` signals 1, title/input signals 103, cover signals 46, visible save/preview
  controls 2, visible publish/send controls 1.
- The visible main body editor was a ProseMirror contenteditable under a mock-iframe wrapper,
  approximately 586px wide and 538px high, with `white-space: break-spaces`,
  `word-break: break-word`, `font-size: 17px`, `line-height: 27.2px`, and `max-width: 100%`.
- Empty main body embedded counts: SVG 0, `foreignObject` 0, style 0, image 0, section 1,
  paragraph 0, span 1.
- Boundary: authenticated new-article editor surface reachability and redacted DOM identity only.
  It does not prove ordinary PC Ctrl+V rich HTML/SVG paste, editor body mutation, safe disposable
  draft cleanup, WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail,
  credentialed sync, scheduled send, platform preview, public article rendering, or publish
  success.

## 2026-06-19 WeChat Editor Surface Validator

- [x] wechat-editor-surface-validator-20260619.txt
- Local style-proof manifest validator and runbook contract hardening.
- Added `StyleProofArtifact.platformEditorSurfaceVerified?: boolean`.
- Added `platformEditorSurfaceVerified` to `StyleProofArtifactVerificationField`.
- Added `style-proof-manifest-platform-editor-surface-not-verified`.
- `pc-editor-paste-event` now requires same-artifact `platformEditorSurfaceVerified:true`.
- The runbook exposes the new field as required PC paste proof.
- Regression coverage rejects PC paste proof with all ordinary paste flags present but no verified
  exact editor body surface.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 113 tests.
- 4-file cross-platform export regression passed at 4 files / 152 tests, and full export serial
  regression passed at 35 files / 1086 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  26.43s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: local validator/runbook proof only. It does not prove ordinary WeChat Ctrl+V rich
  HTML/SVG acceptance, editor body mutation in the live platform, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, credentialed sync, scheduled send, platform preview,
  public article rendering, or publish success.

## 2026-06-19 Style Proof Credentialed Sync Exact Artifact

- [x] style-proof-credentialed-sync-exact-artifact-20260619.txt
- Local style-proof validator/runbook contract hardening only.
- `credentialed-channel-response` and `sync-readback` now require `exactArtifact:true` in addition
  to `artifactFingerprint`, `externalAccountAuthenticated:true`, and `safeForCommit:true`.
- `validateStyleProofManifest()` emits `style-proof-manifest-exact-artifact-missing` when an
  authenticated credentialed response or sync readback is not bound to the exact exported artifact.
- Runbook failure signals reject account responses, upload responses, draft ids, or material
  readbacks for a different artifact as current-artifact sync proof.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 117 tests.
- 4-file cross-platform export regression passed at 4 files / 156 tests, and full export serial
  regression passed at 35 files / 1090 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  26.43s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove credentialed sync,
  draft/material readback, scheduled-send, platform preview, public rendering, upload, or publish
  success.

## 2026-06-19 Style Proof Scheduled Send Contract

- [x] style-proof-scheduled-send-contract-20260619.txt
- Local style-proof validator/runbook contract hardening only.
- `published` proof now includes a distinct `scheduled-send-readback` requirement.
- `scheduled-send-readback` uses the `platform-publish` gate and requires a
  credentialed-channel `scheduled-send` artifact with `scheduled-send-state` or equivalent
  send-state readback, `externalAccountAuthenticated:true`, `exactArtifact:true`,
  `scheduledSendVerified:true`, `artifactFingerprint`, and `safeForCommit:true`.
- `validateStyleProofManifest()` emits `style-proof-manifest-scheduled-send-not-verified` when
  scheduled-send-shaped evidence lacks the exact authenticated send/schedule-state confirmation.
- Runbook failure signals reject credentialed sync responses, editor previews, draft creation, and
  public preview URLs as scheduled-send proof.
- `ExportModal` now has a type-complete label for `scheduled-send-readback`.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 116 tests.
- 4-file cross-platform export regression passed at 4 files / 155 tests, and full export serial
  regression passed at 35 files / 1089 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  29.30s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/runbook proof only. It does not prove credentialed sync,
  scheduled-send, platform preview, public article rendering, upload, or publish success.

## 2026-06-19 Style Proof Phone Runbook Failure Signals

- [x] style-proof-phone-runbook-failure-signals-20260619.txt
- Local execution-runbook hardening only.
- `buildStyleProofExecutionFailureSignals()` now makes phone-preview rows explicitly reject scan
  entries, setup dialogs, PC preview shells, relogin pages, generic QR screens, local browser
  screenshots, and PC DOM as final phone article proof.
- Dark Mode runbook rows explicitly reject Dark Mode settings pages, generic phone screenshots, and
  PC preview shells unless the exact article body is inspected with mobile Dark Mode enabled.
- Cover-thumbnail runbook rows explicitly reject cover crop panels, cover-setting screens, and
  upload dialogs unless the exact cover thumbnail is accepted in a phone share, preview entry, or
  platform list entry.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 116 tests.
- 4-file cross-platform export regression passed at 4 files / 155 tests, and full export serial
  regression passed at 35 files / 1089 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  28.42s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local checklist/runbook proof only. It does not prove WeChat phone preview,
  mobile interaction, Dark Mode, cover thumbnail, credentialed sync, scheduled send, platform
  preview, public article rendering, or publish success.

## 2026-06-19 WeChat Editor DOM Surface Validator

- [x] wechat-editor-dom-surface-validator-20260619.txt
- Local style-proof manifest validator and runbook contract hardening.
- `pc-editor-dom-readback` now requires `platformEditorSurfaceVerified:true` together with
  `authenticatedSessionVerified:true`, `platformEditorTargetVerified:true`,
  `platformEditorDomVerified:true`, and `safeForCommit:true`.
- `validateStyleProofManifest()` emits
  `style-proof-manifest-platform-editor-surface-not-verified` when PC editor DOM readback never
  verifies the intended main body editing surface.
- Regression coverage rejects DOM readback that proves authenticated session, article-editor target,
  and editor DOM nodes but not the body surface.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 114 tests.
- 4-file cross-platform export regression passed at 4 files / 153 tests, and full export serial
  regression passed at 35 files / 1087 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  33.13s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: local validator/runbook proof only. It does not prove ordinary WeChat Ctrl+V rich
  HTML/SVG acceptance, editor body mutation in the live platform, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, credentialed sync, scheduled send, platform preview,
  public article rendering, or publish success.

## 2026-06-19 WeChat PC Paste Artifact Binding Validator

- [x] wechat-pc-paste-artifact-binding-validator-20260619.txt
- Local style-proof manifest validator and runbook contract hardening.
- `pc-editor-paste-event` now requires one same `platform-editor` / `pc-paste` artifact to carry
  exact artifact binding, authenticated-session proof, target/surface/DOM proof, ordinary Ctrl+V
  proof, same-tab proof, paste/input proof, editor-body mutation, mojibake-free readback, and
  `safeForCommit:true`.
- Added `style-proof-manifest-safe-commit-not-verified` for pc-paste rows that are not explicitly
  safe for repository evidence.
- Regression coverage rejects strong paste flags that lack same-artifact exact/authenticated/DOM
  binding and keeps split multi-artifact paste proof invalid.
- Focused verification passed with `platform-export-rendering.test.ts` at 1 file / 115 tests.
- 4-file cross-platform export regression passed at 4 files / 154 tests, and full export serial
  regression passed at 35 files / 1088 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  31.57s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: local validator/runbook proof only. It does not prove ordinary WeChat Ctrl+V rich
  HTML/SVG acceptance, editor body mutation in the live platform, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, credentialed sync, scheduled send, platform preview,
  public article rendering, or publish success.

## 2026-06-19 WeChat Tempera Entity-Safe Ordinary Ctrl+V Cleanup

- [x] wechat-tempera-entity-ordinary-ctrlv-cleanup-20260619.txt
- CloakBrowser-only authenticated WeChat PC editor proof; Playwright was not used.
- Exact source `flagship-tempera.html` was transformed only by decimal HTML entity encoding for
  non-ASCII characters before writing Windows `HTML Format` plus `UnicodeText`.
- Source SHA-256:
  `d173f8dd2ba807b2fe90b7f0c2a6dea7907a3672d6c225fc0acc918751392585`.
- Entity-safe SHA-256:
  `f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878`.
- The transform changed source bytes `41754` to entity HTML bytes `46456`, reduced non-ASCII
  characters from `944` to `0`, and preserved `svgCount=35`, `dataInkSvgCount=3`, and
  `dataInkBlockCount=23`.
- Same-visible-tab ordinary OS Ctrl+V reached the authenticated WeChat PC editor and read back
  `bodyPaste=1`, `docPaste=1`, `docInput=1`, `trustedPaste=2`, `mutation=4`, `svgCount=35`,
  `dataInkSvgCount=3`, `dataInkBlockCount=23`, `replacementCharCount=0`,
  `mojibakeHintCount=0`, `literalEntityTextCount=0`, and `htmlEntityCount=0`.
- Cleanup completed: session-bound platform delete returned `base_resp.ret=0`; two post-delete
  reload readbacks found zero title/content/app-id matches.
- Product rule: WeChat rich clipboard copy must apply the non-ASCII decimal entity transform at
  the clipboard boundary, while normal preview/export HTML remains unchanged.
- Boundary: this proves the entity-safe clipboard payload, not the raw UTF-8 source artifact
  without transformation. It does not prove phone preview, mobile interaction, Dark Mode, cover
  thumbnail, sync, scheduled send, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Public Host and Manifest Safe Commit Binding

- [x] style-proof-public-host-manifest-safe-commit-20260619.txt
- Local style-proof manifest validator and acceptance-audit contract hardening.
- `public-image-host` now requires the same public-web host artifact to carry accepted
  `hostStatus`, non-empty `artifactRef`, and `safeForCommit:true`.
- `xhs-artifact-manifest` and `zhihu-artifact-manifest` now require the same
  artifact-manifest validation row to carry non-empty `artifactRef`,
  `artifactManifestValidated:true`, and `safeForCommit:true`.
- Requirement-level acceptance audit now treats `style-proof-manifest-safe-commit-not-verified`,
  `style-proof-manifest-sensitive-artifact`, and
  `style-proof-manifest-unsafe-commit-artifact` as invalid even when the broader gate is external.
- Regression coverage rejects public-host proof without same-row safe-for-commit, rejects
  artifact-manifest proof without same-row safe-for-commit, and rejects split manifest rows where
  `artifactRef` and `artifactManifestValidated:true` appear on different artifacts.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 117 tests.
- 4-file cross-platform export regression passed at 4 files / 156 tests, and full export serial
  regression passed at 35 files / 1090 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  36.83s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove public-host availability,
  XHS/Zhihu account upload, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Required Safe Commit Contract

- [x] style-proof-required-safe-commit-contract-20260619.txt
- Local style-proof manifest validator and acceptance-audit contract hardening.
- Added a generic safe-for-commit layer for every execution contract that lists
  `safeForCommit` in `requiredFields`.
- Matching action/channel proof rows now require same-row `safeForCommit:true`; otherwise they emit
  `style-proof-manifest-safe-commit-not-verified` and keep the requirement-level acceptance audit
  invalid.
- Existing specialized validators keep their precise checks; the generic layer only fills the
  common `safeForCommit` gap and skips duplicate safe-commit issues.
- Regression coverage rejects unsafe `unit-test-coverage`, `authenticated-editor-url`, and
  `phone-screenshot` proof rows.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 118 tests.
- 4-file cross-platform export regression passed at 4 files / 157 tests, and full export serial
  regression passed at 35 files / 1091 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  32.66s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, credentialed
  sync, scheduled send, public-host availability, platform preview, public article rendering, or
  publish success.

## 2026-06-19 Style Proof Host and Manifest Audit Regression

- [x] style-proof-host-manifest-audit-regression-20260619.txt
- Local style-proof acceptance-audit regression coverage.
- Locked Zhihu `public-image-host` proof rows with non-public host status (`local-only`) as
  `invalid` in both manifest report and acceptance audit.
- Locked XHS `xhs-artifact-manifest` proof rows without `artifactManifestValidated:true`, and
  split ref/validation rows, as `invalid` in both manifest report and acceptance audit.
- No production code change was needed; current validators and acceptance status mapping already
  preserve these invalid states.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 129 tests.
- 4-file cross-platform export regression passed at 4 files / 168 tests, and full export serial
  regression passed at 35 files / 1102 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  38.59s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit regression proof only. It does not prove phone preview,
  credentialed sync, scheduled send, public-host availability, platform preview, public article
  rendering, or publish success.

## 2026-06-19 Style Proof Scheduled Send Audit

- [x] style-proof-scheduled-send-audit-20260619.txt
- Local style-proof acceptance-audit contract hardening.
- Added `style-proof-manifest-scheduled-send-not-verified` to the acceptance-audit invalid issue
  set.
- Same-account exact-artifact scheduled-send proof rows without `scheduledSendVerified:true` now
  stay invalid in both manifest report and acceptance audit.
- Ordinary missing scheduled-send gates still use the existing `unsafe-to-automate` status; the fix
  only covers concrete invalid scheduled-send proof rows.
- TDD failed first because `scheduled-send-readback` was classified as `unsafe-to-automate`;
  focused verification passed after the fix.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 128 tests.
- 4-file cross-platform export regression passed at 4 files / 167 tests, and full export serial
  regression passed at 35 files / 1101 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  34.94s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, credentialed
  sync, scheduled send, public-host availability, platform preview, public article rendering, or
  publish success.

## 2026-06-19 Style Proof External Account Auth Audit

- [x] style-proof-external-account-auth-audit-20260619.txt
- Local style-proof acceptance-audit contract hardening.
- Added `style-proof-manifest-external-account-auth-missing` to the acceptance-audit invalid issue
  set.
- Credentialed sync, sync readback, and published-preview proof rows that omit positive
  `externalAccountAuthenticated:true` now stay invalid in both manifest report and acceptance
  audit.
- Ordinary missing external gates still use the existing `blocked-by-external` or
  `unsafe-to-automate` status; the fix only covers concrete invalid account-auth proof rows.
- TDD failed first because `published-url-or-platform-preview` was classified as
  `unsafe-to-automate`; focused verification passed after the fix.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 127 tests.
- 4-file cross-platform export regression passed at 4 files / 166 tests, and full export serial
  regression passed at 35 files / 1100 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  43.46s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, credentialed
  sync, scheduled send, public-host availability, platform preview, public article rendering, or
  publish success.

## 2026-06-19 Style Proof Dark Mode Same Row Contract

- [x] style-proof-dark-mode-same-row-contract-20260619.txt
- Local style-proof manifest validator and acceptance-audit contract hardening.
- Dark Mode proof now requires `phonePreviewContentVerified:true` and
  `darkModeEnabledVerified:true` on the same `dark-mode-check` proof artifact.
- Split Dark Mode proof rows now emit `style-proof-manifest-dark-mode-not-verified` and keep
  manifest requirement status invalid.
- Requirement-level acceptance audit now treats phone-content-missing, dark-mode-not-verified, and
  cover-thumbnail-not-accepted as invalid local proof rows instead of generic phone external
  blockers.
- TDD first run failed as expected because split Dark Mode proof emitted no issue; after the
  validator fix, focused verification passed.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 123 tests.
- 4-file cross-platform export regression passed at 4 files / 162 tests, and full export serial
  regression passed at 35 files / 1096 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  53.80s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Required Field Binding Contract

- [x] style-proof-required-field-binding-contract-20260619.txt
- Local style-proof manifest validator and acceptance-audit contract hardening.
- Added `style-proof-manifest-proof-not-bound` for required fields split across multiple matching
  proof rows.
- Added a generic same-row validator that only fires after every required field exists somewhere
  among matching channel/action/host/readback candidates, but no single candidate carries all
  required fields.
- Requirement-level acceptance audit now treats proof-not-bound as invalid local proof.
- Regression coverage rejects `phone-screenshot` proof split across two matching screenshot rows.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 124 tests.
- 4-file cross-platform export regression passed at 4 files / 163 tests, and full export serial
  regression passed at 35 files / 1097 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  39.51s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Forbidden Field Contract

- [x] style-proof-forbidden-field-contract-20260619.txt
- Local style-proof manifest validator and acceptance-audit contract hardening.
- Added executable `forbiddenFields` validation for matching channel/action/readback contract rows.
- Matching `no-proprietary-template-source` and `no-sensitive-artifact` hygiene rows with
  `sensitive:true` now emit requirement-level `style-proof-manifest-sensitive-artifact` issues
  instead of relying only on artifact-level hygiene.
- Synchronized `no-proprietary-template-source` so market-editor source-hygiene rows match the
  existing validator and regression fixtures.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 125 tests.
- 4-file cross-platform export regression passed at 4 files / 164 tests, and full export serial
  regression passed at 35 files / 1098 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  1m 30s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Action Channel Contract

- [x] style-proof-action-channel-contract-20260619.txt
- Local style-proof manifest validator and acceptance-audit contract hardening.
- Added executable `requiredChannels` / `requiredActions` validation for artifacts attached to a
  requirement.
- Wrong-channel hygiene rows now emit
  `style-proof-manifest-contract-action-channel-mismatch` instead of satisfying
  `no-proprietary-template-source` or `no-sensitive-artifact`.
- Synchronized `local-browser-rendering` so existing Tauri/WebView2 local-render evidence remains
  a valid local rendering contract row.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 126 tests.
- 4-file cross-platform export regression passed at 4 files / 165 tests, and full export serial
  regression passed at 35 files / 1099 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  35.55s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Requirement Scope Regression

- [x] style-proof-requirement-scope-regression-20260619.txt
- Local style-proof manifest regression coverage.
- Added a regression proving PC paste proof fields cannot backfill from an artifact assigned to
  `authenticated-editor-url` into `pc-editor-paste-event`.
- No production code change was needed; current validators already keep the target requirement
  invalid.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 127 tests.
- 4-file cross-platform export regression passed at 4 files / 166 tests, and full export serial
  regression passed at 35 files / 1100 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  34.21s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, mobile
  SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host
  availability, platform preview, public article rendering, or publish success.

## 2026-06-19 Style Proof Required Readback Contract

- [x] style-proof-required-readback-contract-20260619.txt
- Local style-proof manifest validator and acceptance-audit contract hardening.
- Added a generic `requiredReadbacks` layer for every execution contract.
- Matching action/channel proof rows now require an accepted same-row `readback`; otherwise they
  emit `style-proof-manifest-readback-missing` and keep requirement-level manifest status invalid.
- Shared required-field helpers now only accept proof rows whose channel, action, accepted host
  status when applicable, and readback all match the execution contract before `safeForCommit`,
  `artifactFingerprint`, or `exactArtifact` can satisfy the row.
- Synchronized required readback lists with the existing market-editor, authenticated editor, PC
  editor DOM, safe disposable draft, phone preview, Dark Mode, cover thumbnail, and
  published/platform-preview validators.
- Regression coverage rejects readback-split phone screenshot proof and authenticated editor rows
  with unsupported readback types.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 122 tests.
- 4-file cross-platform export regression passed at 4 files / 161 tests, and full export serial
  regression passed at 35 files / 1095 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  47.75s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, credentialed
  sync, scheduled send, public-host availability, platform preview, public article rendering, or
  publish success.

## 2026-06-19 Style Proof Required Exact Artifact Contract

- [x] style-proof-required-exact-artifact-contract-20260619.txt
- Local style-proof manifest validator and acceptance-audit contract hardening.
- Added a generic exact-artifact layer for every execution contract that lists `exactArtifact` in
  `requiredFields`.
- Matching action/channel proof rows now require same-row `exactArtifact:true`; otherwise they
  emit `style-proof-manifest-exact-artifact-missing` and keep requirement-level acceptance audit
  invalid.
- Existing specialized validators keep their precise checks; the generic layer only fills the
  common exact-artifact binding gap and avoids duplicate exact-artifact issues.
- Regression coverage rejects phone screenshot, credentialed sync, scheduled-send, and
  published-preview proof rows that carry matching fingerprints and business flags but no
  same-row `exactArtifact:true`.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 120 tests.
- 4-file cross-platform export regression passed at 4 files / 159 tests, and full export serial
  regression passed at 35 files / 1093 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  29.30s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, credentialed
  sync, scheduled send, public-host availability, platform preview, public article rendering, or
  publish success.

## 2026-06-19 Style Proof Required Artifact Fingerprint Contract

- [x] style-proof-required-artifact-fingerprint-contract-20260619.txt
- Local style-proof manifest validator and acceptance-audit contract hardening.
- Added a generic artifact-fingerprint layer for every execution contract that lists
  `artifactFingerprint` in `requiredFields`.
- Matching action/channel proof rows now require a non-empty same-row `artifactFingerprint`;
  otherwise they emit `style-proof-manifest-exact-artifact-missing` and keep requirement-level
  acceptance audit invalid.
- Existing specialized validators keep their precise exact-artifact checks; the generic layer only
  closes the common fingerprint traceability gap and avoids duplicate exact-artifact issues.
- Regression coverage rejects untraceable phone screenshot, credentialed sync, scheduled-send, and
  published-preview proof rows.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 119 tests.
- 4-file cross-platform export regression passed at 4 files / 158 tests, and full export serial
  regression passed at 35 files / 1092 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  35.43s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove phone preview, credentialed
  sync, scheduled send, public-host availability, platform preview, public article rendering, or
  publish success.

## 2026-06-19 Style Proof Market Editor Applied Audit

- [x] style-proof-market-editor-application-audit-20260619.txt
- Local style-proof manifest validator and acceptance-audit classification hardening.
- Bound the market-editor non-applied regression to `wechat-classic-inline` so platform acceptance
  aggregation includes `market-applied-dom-readback`.
- `centralEditorChanged:false` proof rows now keep `market-applied-dom-readback` invalid in both
  manifest report and acceptance audit, with
  `style-proof-manifest-market-editor-not-applied` exposed in `issueIds`.
- TDD first run failed because the acceptance audit classified that concrete invalid row as
  `blocked-by-external`; the issue id is now part of the acceptance-audit invalid issue set.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 129 tests.
- 4-file cross-platform export regression passed at 4 files / 168 tests, and full export serial
  regression passed at 35 files / 1102 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  45.98s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove 135/Xiumi account
  operations, WeChat PC paste, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail,
  credentialed sync, scheduled send, public-host availability, platform preview, public article
  rendering, upload, or publish success.

## 2026-06-19 Style Proof Safe Draft Cleanup Audit

- [x] style-proof-safe-draft-cleanup-audit-20260619.txt
- Local style-proof manifest validator and acceptance-audit classification hardening.
- `safe-disposable-draft` proof rows with `disposableDraft:true` but missing
  `cleanupPathVerified:true` now keep the requirement-level acceptance audit `invalid`.
- `style-proof-manifest-disposable-draft-missing` and
  `style-proof-manifest-cleanup-path-missing` are part of the acceptance-audit invalid issue set.
- TDD first run failed because that concrete invalid proof was downgraded to
  `unsafe-to-automate`; missing proof still remains a manual authenticated-PC-editor gate.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 129 tests.
- 4-file cross-platform export regression passed at 4 files / 168 tests, and full export serial
  regression passed at 35 files / 1102 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  38.36s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove WeChat authenticated PC
  paste, safe draft deletion on the live platform, phone preview, mobile SMIL/click, mobile Dark
  Mode, cover thumbnail, credentialed sync, scheduled send, public-host availability, platform
  preview, public article rendering, upload, or publish success.

## 2026-06-19 Style Proof Ordinary PC Paste Audit

- [x] style-proof-pc-paste-ordinary-audit-20260619.txt
- Local style-proof manifest validator and acceptance-audit classification hardening.
- Programmatic ClipboardEvent-style proof rows now keep `pc-editor-paste-event` invalid in
  requirement-level acceptance audit when `ordinaryClipboardPasteVerified:true` is absent, even if
  the same row carries exact artifact, authenticated session, editor target/surface/DOM, same tab,
  paste/input, body mutation, mojibake-free, and safe-commit flags.
- PC paste-specific issue ids are part of the acceptance-audit invalid issue set:
  ordinary paste not verified, same editor tab not verified, paste/input missing, editor body not
  mutated, mojibake not ruled out, and paste proof not bound.
- TDD first run failed because that concrete invalid proof was downgraded to
  `unsafe-to-automate`; missing PC paste proof still remains a manual authenticated-PC-editor gate.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 129 tests.
- 4-file cross-platform export regression passed at 4 files / 168 tests, and full export serial
  regression passed at 35 files / 1102 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  53.47s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit proof only. It does not prove WeChat ordinary Ctrl+V rich
  HTML/SVG paste on the live platform, safe draft deletion, phone preview, mobile SMIL/click,
  mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public-host availability,
  platform preview, public article rendering, upload, or publish success.

## 2026-06-19 Style Proof Gate Invalid Status Audit

- [x] style-proof-gate-invalid-status-audit-20260619.txt
- Local acceptance-audit gate classification hardening.
- A concrete invalid proof row must make its aggregate acceptance gate `invalid`; the gate must not
  hide failed proof behind `blocked-by-external` or `unsafe-to-automate`.
- TDD first run failed because an invalid `scheduled-send-readback` row left the
  `platform-publish` gate as `unsafe-to-automate`.
- `buildStyleProofAcceptanceGateAudit()` now maps `gate.invalid > 0` to `invalid` before external
  or manual fallback. Missing, unattempted phone/account/publish gates keep their existing external
  or unsafe-to-automate status.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 129 tests.
- 4-file cross-platform export regression passed at 4 files / 168 tests, and full export serial
  regression passed at 35 files / 1102 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  32.90s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local acceptance-audit classification proof only. It does not prove scheduled
  send, publish, phone preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed
  sync, public-host availability, platform preview, public article rendering, upload, or publish
  success.

## 2026-06-19 Style Proof Readback Requirement Status Audit

- [x] style-proof-readback-requirement-status-audit-20260619.txt
- Local acceptance-audit requirement classification hardening.
- A phone-screenshot proof row with the expected action/channel but wrong readback must keep the
  requirement-level acceptance audit `invalid`; it must not be hidden behind
  `blocked-by-external`.
- The authenticated-PC-editor wrong-readback path remains `unsafe-to-automate`, preserving the
  manual editor-surface boundary.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 130 tests.
- 4-file cross-platform export regression passed at 4 files / 169 tests, and full export serial
  regression passed at 35 files / 1103 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  34.09s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local acceptance-audit classification proof only. It does not prove phone
  preview, mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send,
  public-host availability, platform preview, public article rendering, upload, or publish success.

## 2026-06-19 Style Proof PC Paste Editor Flags Audit

- [x] style-proof-pc-paste-editor-flags-audit-20260619.txt
- Local acceptance-audit requirement classification hardening for concrete PC paste rows.
- A `pc-editor-paste-event` row that carries exact artifact, ordinary paste, same editor tab,
  paste/input, body mutation, mojibake-free, and safe-commit proof but misses authenticated session,
  editor target, editor surface, or editor DOM proof must keep the requirement-level acceptance
  audit `invalid`.
- The same issue ids remain manual-gate signals for `authenticated-editor-url` and
  `pc-editor-dom-readback`.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 134 tests.
- 4-file cross-platform export regression passed at 4 files / 173 tests, and full export serial
  regression passed at 35 files / 1107 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  33.62s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local acceptance-audit classification proof only. It does not prove WeChat
  ordinary Ctrl+V rich HTML/SVG paste on the live platform, safe draft deletion, phone preview,
  mobile SMIL/click, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send,
  public-host availability, platform preview, public article rendering, upload, or publish success.

## 2026-06-19 Market Editor CloakBrowser Field Study

- [x] market-editor-cloakbrowser-field-study-20260619.txt
- Real headed CloakBrowser observation covered 135 SVG editor and Xiumi studio authoring surfaces.
- 135 material-included free-trial SVG effects render a zero-font/zero-line-height section with a
  background-only 1080x1920 SVG visual layer, separate authoring trigger hot-area overlay, and
  structured right-panel controls for media, direction, timing, and expanded content.
- Xiumi SVG category insertion can materialize in the center editor as nested `tn-cell` article,
  page, layer, group, image, text, container, fixed, and flow-canvas authoring cells instead of
  literal inline SVG.
- Extracted rule: use market samples as schema inspiration for InkForge-owned background media,
  hotspot, motion, fallback, and manifest models; treat all vendor authoring wrappers as residue
  blockers in publishable output.
- Boundary: this is rule extraction only. It does not prove WeChat paste, phone preview, mobile
  interaction, cover thumbnail acceptance, credentialed sync, scheduled send, public host,
  XHS/Zhihu account upload, or publish success.

## 2026-06-19 WeChat Editor Surface CloakBrowser Revalidation

- [x] wechat-editor-surface-cloakbrowser-revalidation-20260619.txt
- Recovered the fixed CloakBrowser browser session after a stale no-window Chrome holder blocked
  startup; a temporary empty-session smoke proved the CloakBrowser package itself was functional.
- The authenticated WeChat backend home surface loaded after recovery, with `公众号` title,
  `/cgi-bin/home` path, and home signals for creation, draft, material, and publish-record entry
  points.
- The current authenticated platform session entered the official new-article editor route shape.
  The editor loaded with login/scan signals absent, 3 contenteditable nodes, 2 textareas, 53 inputs,
  1 iframe, 9 SVG nodes, 99 editor-candidate selectors, 104 title-candidate selectors, 46 cover
  candidates, 1 visible preview control, 2 visible save controls, and 1 visible publish control.
- Visual inspection confirmed the left draft card, top toolbar, central editor canvas, and bottom
  save/preview/publish controls; the transient local visual file was deleted and not committed.
- Boundary: this proves current authenticated editor-surface reachability only. It does not prove
  ordinary Ctrl+V rich HTML/SVG paste, editor body mutation, safe draft cleanup, phone preview,
  mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled
  send, public host, platform preview, public article rendering, XHS/Zhihu account upload, or
  publish success.

## 2026-06-20 Style Proof Current Open Gate Audit

- [x] style-proof-current-open-gate-audit-20260620.txt
- Current committed proof audit confirms local/unit/browser evidence for WeChat Kiln, Tempera,
  Amber, and XHS cover carousel, plus positive WeChat PC evidence for Amber and Tempera only.
- Kiln remains intentionally absent from the positive WeChat PC pack because its ordinary and
  entity-safe platform paste attempts are negative evidence.
- Amber and Tempera PC rows satisfy authenticated editor, PC DOM, exact artifact, safe draft
  cleanup, PC paste, and sensitive-hygiene requirements for their exact artifacts, but phone
  preview, Dark Mode, cover thumbnail, scheduled-send, and published/platform preview rows remain
  missing/cannot-claim.
- Verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "committed.*evidence" --reporter=default`
  at 1 file / 2 selected tests.
- Boundary: this is current local audit evidence only. It does not prove phone preview, mobile
  interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send,
  public host, platform preview, public article rendering, XHS/Zhihu account upload, or publish
  success.

## 2026-06-20 Style Proof Committed Evidence Combined Audit

- [x] style-proof-committed-evidence-combined-audit-20260620.txt
- Added a combined committed-evidence audit helper for already redacted repository proof.
- `getCommittedStyleProofEvidenceManifests()` clones and concatenates the committed local pack
  with the committed WeChat PC pack, while `getCommittedStyleProofEvidenceAuditReport()` exposes
  local, WeChat PC, and combined acceptance reports.
- The combined view intentionally exposes `style-proof-manifest-pack-fingerprint-mismatch` when
  local WebView/browser evidence and PC paste evidence for the same WeChat choice refer to
  different exact artifact fingerprints.
- The summary exposes `hasExactArtifactFingerprintConflicts:true`; consumers must treat this as a
  cannot-claim warning, not as complete exact-artifact proof.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "committed local and WeChat PC evidence together" --reporter=default`
  at 1 file / 1 selected test.
- Full local verification also passed: committed evidence focused group 3 selected tests,
  `platform-export-rendering.test.ts` 147 tests, four-file cross-platform export regression
  186 tests, full `src/services/export` serial run 35 files / 1120 tests, targeted ESLint,
  `vue-tsc --noEmit`, and production build. Vite built in 30.70s, and generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local committed-evidence aggregation only. It does not prove WeChat ordinary
  Ctrl+V for Kiln, phone preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public article rendering, XHS/Zhihu account
  upload, public host, or publish success.

## 2026-06-20 WeChat Tempera Preview Entry Precondition Failed

- [x] wechat-tempera-preview-entry-precondition-failed-20260620.txt
- Authenticated WeChat editor loaded and the already-proven Tempera entity-safe CF_HTML payload was
  prepared, but preview was not opened because the exact artifact did not reach the main article
  body.
- Attempt 1 used `keybd_event` Ctrl+V without mouse movement/click; body paste/input/mutation
  counters stayed 0 and the main body stayed placeholder-only.
- Attempt 2 used `keybd_event` Ctrl+V after a fixed screen click inside the central editor area.
  Foreground stayed stable, but rich SVG/HTML was not preserved: `svgCount=0`,
  `dataInkSvgCount=0`, `dataInkBlockCount=0`, and `sectionNice=false`.
- Direct cleanup readback showed the first ProseMirror/title surface had the plain-text payload,
  while the second ProseMirror body surface still had placeholder-length content. Both surfaces were
  cleared before leaving the editor.
- Draftbox checks found 0 matches for the cleanup sentinel, preview-gate marker, entity-safe hash,
  and artifact filename. No draft delete action was performed because no current-run marker was
  present; existing drafts were left untouched.
- Boundary: this is negative precondition evidence only. It does not prove PC paste, phone preview,
  mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled
  send, public host, platform preview, public article rendering, XHS/Zhihu account upload, or
  publish success.

## 2026-06-20 Style Proof Wrong-Surface Preview Regression

- [x] style-proof-wrong-surface-preview-regression-20260620.txt
- Added `platform-export-rendering.test.ts` coverage for the real wrong-surface/plain-text
  preview-entry failure mode.
- The regression keeps `pc-editor-paste-event` invalid when OS Ctrl+V and same-tab evidence exist
  but the main body surface was not verified, the body paste/input event was absent, and the main
  body did not mutate.
- A companion `phone-preview-entry-readback` row with `phonePreviewBlocked:true` keeps
  `phone-preview-readback` invalid and cannot unlock phone screenshot, Dark Mode, cover thumbnail,
  or publish rows.
- Verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 135 tests.
- Cross-platform export regression passed with 4 files / 174 tests, and full export serial
  regression passed with 35 files / 1108 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  32.53s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit regression proof only. It does not prove PC paste, phone
  preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, public host, platform preview, public article rendering, XHS/Zhihu account
  upload, or publish success.

## 2026-06-20 Public Source Rule Refresh

- [x] public-source-rule-refresh-20260620.txt
- Used Exa and Grok as discovery tools, then promoted only official documentation or source
  repository claims into project rules.
- Checked WeChat official editor plugin specification, WeChat editor JSAPI, doocs/md,
  mdnice/markdown-nice, wx-art-formatter, and md2red.
- Updated `docs/platform-rendering-rules/market-practices-catalog.md` and
  `.trellis/spec/frontend/wechat-svg-modules.md` with the public-source refresh.
- `git diff --check` and sensitive scan passed for this docs/evidence slice.
- Rule outcome: official WeChat editor bad cases stay hard blockers; public formatter architecture
  reinforces CSS inlining and `text/html` artifact output; XHS remains an image-card/carousel/
  long-image artifact family with plain text metadata.
- Boundary: this is public-source rule refresh only. It does not prove WeChat PC paste, phone
  preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, public host, platform preview, public article rendering, XHS/Zhihu account
  upload, or publish success.

## 2026-06-20 WeChat Home Post-Reboot Readonly

- [x] wechat-home-post-reboot-readonly-20260620.txt
- Used CloakBrowser only with the existing InkForge browser profile.
- Authenticated WeChat backend home readback succeeded after the workstation reboot: title
  `公众号`, sanitized route shape `/cgi-bin/home`, login/scan state absent, and backend home /
  creation / draft-material / publish-record style entry signals present.
- Account and draft strings were redacted and not recorded.
- No form fill, paste, save, preview, publish, delete, sync, upload, phone action, or draft mutation
  was performed.
- Boundary: this proves current authenticated WeChat backend home reachability only. It does not
  prove new-article editor body reachability, PC paste, body mutation, safe draft cleanup, phone
  preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload, or publish
  success.

## 2026-06-20 WeChat Official Bad-Case Runtime Audit

- [x] wechat-official-badcase-runtime-audit-20260620.txt
- Confirmed the public-source WeChat editor bad cases are already executable in
  `detectWechatOfficialEditorSpecIssues()`.
- Existing local blockers cover line-height-zero, fixed container size, logical text alignment,
  ordinary prose in `<pre>`, transparent image plus SVG overlay, touchstart-only SVG animation,
  event handlers, class/id dependency, unsupported CSS, unsafe SVG constructs, SVG text Dark Mode
  risk, important styles, and layout-report-required.
- Verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "WeChat official editor structure risks|blocks generic WeChat unsafe" --reporter=default`
  at 1 file / 2 selected tests, 133 skipped.
- Boundary: this is local detector/test coverage proof only. It does not prove WeChat PC paste,
  phone preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed
  sync, scheduled send, platform preview, public article rendering, XHS/Zhihu account upload, or
  publish success.

## 2026-06-20 WeChat Draft Editor Readonly Preflight

- [x] wechat-draft-editor-readonly-preflight-20260620.txt
- Used CloakBrowser only with the existing authenticated WeChat backend session.
- Reached the sanitized existing-draft editor route shape through the official card-list route and
  the public WeChat bundle's edit route template; appmsg id, credential query values, account
  strings, draft title, full URL, browser runtime directory, and transient visual file names were
  redacted and not recorded.
- No form fill, paste, save, preview, publish, delete, sync, upload, phone action, or draft
  mutation was performed.
- Readonly DOM evidence confirmed a visible main `.ProseMirror` body with 3948 text chars,
  87187 HTML chars, 70 inline SVG nodes, 4 images, 94 sections, 390 inline style attributes, 4
  animation-related hits, and 0 script/iframe/object/embed tags inside the main body.
- Visual inspection confirmed the editor was not blank and showed toolbar, left draft/history rail,
  central article canvas, body content, and bottom save/preview/publish controls; the transient
  screenshots were deleted and not committed.
- Negative fidelity finding: the real draft body visibly contained replacement-glyph/mojibake
  blocks, with 4520 replacement-character hits across main body text/html and 2236 text
  replacement-character hits. This is a badcase, not a successful style proof.
- Boundary: this proves authenticated existing-draft editor reachability and readonly PC DOM
  preconditions only. It does not prove InkForge artifact paste, exact artifact preservation, safe
  draft cleanup, phone preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public article rendering, XHS/Zhihu account
  upload, or publish success.

## 2026-06-20 Style Proof Editor Mojibake Readback Contract

- [x] style-proof-editor-mojibake-readback-contract-20260620.txt
- Converted the real WeChat existing-draft replacement-glyph/mojibake badcase into an executable
  local manifest contract.
- `pc-editor-dom-readback` now requires `mojibakeFreeVerified:true` on the same authenticated
  editor DOM proof row; missing clearance emits
  `style-proof-manifest-editor-mojibake-not-ruled-out`.
- Regression coverage keeps a PC editor DOM row invalid even when session, target, surface, DOM,
  readback, and safe-for-commit flags are present but mojibake clearance is absent.
- Focused verification passed with
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  at 1 file / 136 tests.
- Cross-platform export regression passed with 4 files / 175 tests, and full export serial
  regression passed with 35 files / 1109 tests.
- Targeted ESLint, `vue-tsc --noEmit --pretty false`, and production build passed; Vite built in
  32.06s and generated `inkforge/tsconfig.tsbuildinfo` was restored after validation.
- Boundary: this is local validator/audit enforcement only. It does not prove WeChat artifact
  paste, exact artifact preservation, safe draft cleanup, phone preview, mobile interaction, mobile
  Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send, platform preview,
  public article rendering, XHS/Zhihu account upload, public host, or publish success.

## 2026-06-20 Market Editor CloakBrowser SVG Deep Pass

- [x] market-editor-cloakbrowser-svg-deep-pass-20260620.txt
- Used CloakBrowser only to inspect the 135 SVG editor and Xiumi paper editor SVG category after
  concrete list/category interaction and central canvas/editor readback.
- 135 free-trial/no-material SVG effects exposed image slots, hidden trigger overlays, percentage
  hot-area geometry, direction controls, animation-duration fields, expanded-content editing,
  ordering, spacing, copy/delete, and gap-removal controls.
- Xiumi SVG category exposed component/function metadata for SVG gallery/layout/animation, free
  sliding layout, overlapping layout, gallery scroll/switch, transition, slide sequence, fade-in,
  interactive/non-interactive state, and image ratios such as 1080x720, 1080x1440, and 1080x2223.
- Updated `.trellis/spec/frontend/wechat-svg-modules.md` and
  `docs/platform-rendering-rules/market-practices-catalog.md` to convert those observations into
  InkForge-owned taxonomy, manifest fields, layout-report requirements, fallback rules, and
  market-editor residue blockers.
- Boundary: this is market rule extraction only. It does not prove WeChat paste, phone preview,
  mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled
  send, platform preview, public article rendering, XHS/Zhihu account upload, public host, or
  publish success.

## 2026-06-20 Market Editor Trigger Overlay Residue Contract

- [x] market-editor-trigger-overlay-residue-contract-20260620.txt
- Converted the 135 SVG trigger-hot-area overlay observation into a runtime quality-detector
  blocker.
- `MARKET_EDITOR_RESIDUE_RULES` now explicitly detects copied 135 trigger overlay authoring
  markers such as `block-img__trigger`, `edit-trigger`, `edit-trigger__switch`, and
  `trigger__ajuster`.
- Added a regression fixture that does not rely on `app-content-canvas` or known effect
  `data-name` values, then asserted `wechat-market-editor-residue`, `xhs-market-editor-residue`,
  and `zhihu-market-editor-residue`.
- Verification passed: focused trigger-overlay test, full `platform-export-rendering.test.ts`,
  4-file cross-platform export regression, full export serial regression, targeted ESLint,
  `vue-tsc`, and production build.
- Boundary: this is local detector/test enforcement only. It does not prove WeChat paste, phone
  preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload, public
  host, or publish success.

## 2026-06-26 135 SVG Trigger Hot-Area Overlay Residue

- [x] 135-svg-trigger-hot-area-overlay-residue-20260626.txt
- Split the 135 SVG trigger hot-area overlay markers out of the broader builder-canvas diagnostic.
- `block-img__trigger`, `edit-trigger`, `edit-trigger__switch`, and `trigger__ajuster` now report
  `135 SVG trigger hot-area overlay residue`.
- The reduced regression intentionally keeps trigger overlay markers without `app-content-canvas`,
  known `data-name` values, hosted material, or canvas shell markers, proving the overlay residue is
  blocked independently.
- Adjacent canvas regressions keep ordinary builder canvas and trigger-prompt fixtures reporting
  `135 SVG builder canvas residue`.
- Boundary: this is local detector/test enforcement only. It does not prove WeChat paste, phone
  preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload, public
  host, or publish success.

## 2026-06-26 135 SVG Trigger Child-Handle Residue

- [x] 135-svg-trigger-child-handle-residue-20260626.txt
- CloakBrowser inspection of the 135 SVG free-trial editor canvas found child-only hot-area
  residues: `trigger_tip` labels and `ajuster` resize handles.
- A reduced regression now proves those children fail as
  `135 SVG trigger hot-area overlay residue` even when the parent `trigger__ajuster` wrapper is
  absent.
- Verification passed: red/green focused platform rendering test, full export serial regression,
  targeted ESLint, `vue-tsc`, production build, and release preflight expected external blocker.
- Boundary: this is local detector/test enforcement only. It does not prove WeChat paste, phone
  preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload, public
  host, or publish success.

## 2026-06-26 135 SVG Trigger Switch Control Residue

- [x] 135-svg-trigger-switch-control-residue-20260626.txt
- Added a static quality rule for 135 SVG trigger switch controls observed in the applied editor:
  `ant-switch`, `ant-switch-checked`, `ant-switch-inner`, and `ant-switch-handle`.
- The reduced regression intentionally keeps only the Ant switch control plus readable text,
  proving the switch residue is blocked without relying on trigger overlay geometry,
  `app-content-canvas`, known `data-name` values, hosted material, or canvas shell markers.
- Adjacent regressions keep ordinary builder canvas, trigger-prompt, and trigger overlay fixtures
  reporting their existing residue labels.
- Boundary: this is local detector/test enforcement only. It does not prove WeChat paste, phone
  preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload, public
  host, or publish success.

## 2026-06-26 135 SVG Editor Base Shell Residue

- [x] 135-svg-editor-base-shell-residue-20260626.txt
- Expanded the existing `135 SVG editor shell residue` rule to cover base center-shell markers
  observed in the applied editor: `content-canvas` with `content-background` / `content-inner`,
  plus `block-inner` and exact `block-img`.
- The reduced regression intentionally keeps only these base shell markers and readable SVG content,
  proving the shell residue is blocked without relying on `block-img__inner`,
  `placeholder__help/icon`, `article-item__*`, `articles_pop`, `_135editor`,
  `app-content-canvas`, known `data-name` values, trigger overlays, hosted material URLs, or
  `svg:135` styles.
- Generic `block` alone remains insufficient for the residue gate.
- Boundary: this is local detector/test enforcement only. It does not prove WeChat paste, phone
  preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload, public
  host, or publish success.

## 2026-06-20 135 SVG Editor Shell Residue Contract

- [x] 135-svg-editor-shell-residue-contract-20260620.txt
- Used CloakBrowser only on the active 135 SVG editor free-trial page after clicking a visible
  `免费试用` control and reading the center canvas/editor state.
- The applied center shell exposed wrapper families such as `content-canvas`, `content-background`,
  `content-inner`, `block`, `block-inner`, `block-img`, `block-img__inner`,
  `placeholder__help`, `placeholder__icon`, `article-item__inner`, `article-item__label`, and
  `article-item__del`.
- Converted the shell-only markers into the runtime residue label
  `135 SVG editor shell residue`, without relying on `_135editor`, `app-content-canvas`, known
  builder `data-name`, trigger overlay classes, or hosted material URLs.
- TDD first run failed because the shell-only fixture produced no market-editor residue issue.
  After the rule update, the focused shell regression and adjacent market-residue regression passed.
- Full verification passed: `platform-export-rendering.test.ts` 145 tests, four-file
  cross-platform export regression 184 tests, full export serial regression 35 files / 1118 tests,
  targeted ESLint, `vue-tsc`, and production build. The generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is 135 SVG editor authoring-shell learning and local detector enforcement only. It
  does not prove WeChat paste, phone preview, mobile interaction, mobile Dark Mode, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public article rendering,
  XHS/Zhihu account upload, public host, or publish success.

## 2026-06-20 135 SVG Editor Layout Control Residue Contract

- [x] 135-svg-editor-layout-control-residue-contract-20260620.txt
- Used CloakBrowser only on the active 135 SVG editor free-trial page after clicking a visible
  `免费试用` control and reading the center `.content-canvas` state.
- The applied center canvas exposed `nodes=328`, `svgs=11`, `images=4`, `inlineStyle=46`,
  `dataName=11`, `absolute=90`, `zeroFont=4`, and `hidden=54`.
- Newly blocked authoring-control residue includes `block-spacing`, `block-gap`,
  `gap-item-wrapper`, `article-item__editing`, `ant-slider-track`, and `ant-slider-handle`.
- Converted these controls into the runtime residue label
  `135 SVG editor layout control residue`, without relying on `_135editor`,
  `app-content-canvas`, known builder `data-name`, trigger overlay classes, hosted material URLs,
  or previous shell markers.
- TDD first run failed because the layout-control-only fixture produced no market-editor residue
  issue. After the rule update, the focused layout-control regression passed.
- Full verification passed: adjacent 135/market residue regression 7 selected tests,
  `platform-export-rendering.test.ts` 150 tests, four-file cross-platform export regression
  189 tests, full export serial regression 35 files / 1123 tests, targeted ESLint, `vue-tsc`, and
  production build. Vite built in 26.30s, and generated `inkforge/tsconfig.tsbuildinfo` was
  restored afterward.
- Boundary: this is 135 SVG editor authoring-control learning and local detector enforcement only.
  It does not prove WeChat paste, phone preview, mobile interaction, mobile Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, platform preview, public article
  rendering, XHS/Zhihu account upload, public host, or publish success.

## 2026-06-20 135 Background-Only SVG Compatibility Fixture

- [x] 135-background-only-svg-compatibility-fixture-20260620.txt
- Added a minimal fixture for the 135 material-included/background-only SVG risk without vendor
  residue markers: no `_135editor`, no `app-content-canvas`, no known builder `data-name`, no
  trigger-overlay classes, and no hosted material URLs.
- The fixture locks the previously observed compatibility shape: zero font/line-height wrapper,
  `viewBox="0 0 1080 1920"`, `width="100%"`, `background-size:100.1% 100.1%`,
  `margin-top:-1px`, `vertical-align:top`, and `pointer-events:none`.
- Existing detectors already block it: WeChat emits `wechat-line-height-zero` plus
  `wechat-layout-report-required`; Xiaohongshu emits HTML/SVG leakage errors; Zhihu emits inline
  SVG, HTML tag, and inline style findings.
- Full verification passed: focused fixture regression, adjacent 8-test compatibility regression,
  `platform-export-rendering.test.ts` 146 tests, four-file cross-platform export regression
  185 tests, full export serial regression 35 files / 1119 tests, targeted ESLint, `vue-tsc`, and
  production build. The generated `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is a local compatibility fixture and regression contract only. It does not prove
  WeChat paste, phone preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public article rendering, XHS/Zhihu account
  upload, public host, or publish success.

## 2026-06-20 Market Editor Placeholder-Only Readback Contract

- [x] market-editor-placeholder-only-readback-contract-20260620.txt
- Converted the 135/Xiumi applied-editor boundary into a local manifest contract: a changed center
  canvas is not enough when the applied state is listing-only, placeholder-only, no-material, or
  lacks meaningful DOM/controls/slots/visible content.
- `market-applied-dom-readback` now requires same-row `marketAppliedContentVerified:true` in
  addition to `centralEditorChanged:true` and `safeForCommit:true`.
- Missing applied-content proof emits `style-proof-manifest-market-editor-placeholder-only`, keeps
  the requirement-level acceptance audit `invalid`, and exposes the issue in `cannotClaim`.
- Verification passed: focused market-editor regression, full `platform-export-rendering.test.ts`,
  4-file cross-platform export regression, full export serial regression, targeted ESLint,
  `vue-tsc`, and production build.
- Boundary: this is local validator/audit enforcement only. It does not prove WeChat paste, phone
  preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload, public
  host, or publish success.

## 2026-06-20 Style Proof Runbook Field Criteria

- [x] style-proof-runbook-field-criteria-20260620.txt
- Added field-level criteria text for execution runbook required and forbidden fields while keeping
  the raw field names in `requiredArtifact.requiredFields`.
- Market-editor runbook text now explains that `marketAppliedContentVerified:true` means meaningful
  non-placeholder applied DOM, controls, slots, metadata, or visible content was read back.
- Added regression coverage with a manifest claiming `applied-editor-element` so the
  `market-applied-dom-readback` runbook step must expose `marketAppliedContentVerified:true` and
  `non-placeholder` in success/failure text.
- Verification passed: focused execution-runbook regression, full `platform-export-rendering.test.ts`,
  4-file cross-platform export regression, full export serial regression, targeted ESLint,
  `vue-tsc`, and production build.
- Boundary: this is local runbook wording and regression coverage only. It does not prove WeChat
  paste, phone preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public article rendering, XHS/Zhihu account
  upload, public host, or publish success.

## 2026-06-20 Xiumi SVG Layer Slot Residue Contract

- [x] xiumi-svg-layer-slot-residue-contract-20260620.txt
- Used CloakBrowser only on the Xiumi v5 paper editor SVG category.
- Clicked a visible SVG gallery/scrolling item. The center `.tn-editing-panel` changed by
  `htmlLength +31920`, `tnComp +15`, `tnCell +18`, `img +3`, and `contenteditable +1`, while
  center inline SVG stayed `0`.
- Converted the observed fine-grained Xiumi authoring markers into a runtime residue blocker:
  `tn-page-slot`, `tn-layer-slot`, `tn-child-position-absolute/static`,
  `tn-child-orientation-fixed/flow-canvas`, and `raw-image`.
- Added a regression fixture that omits broad `tn-comp` / `tn-cell` wrappers, flow-canvas
  attributes, and Xiumi hosted-media URLs so those fine-grained markers are independently blocked
  across WeChat, Xiaohongshu, and Zhihu.
- Boundary: this is Xiumi applied-authoring DOM learning and local detector enforcement only. It
  does not prove WeChat paste, phone preview, mobile interaction, mobile Dark Mode, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public article rendering,
  XHS/Zhihu account upload, public host, or publish success.

## 2026-06-20 Xiumi SVG Gallery State Wrapper Residue Contract

- [x] xiumi-svg-gallery-state-wrapper-residue-20260620.txt
- Used CloakBrowser only on the active Xiumi v5 paper editor center state. The applied
  SVG-gallery/game-screen sample exposed `totalNodes=4736`, `tnComp=51`, `tnCell=27`,
  `tnLayerSlot=2`, `flowCanvas=3`, `imageWrappers=3`, `contenteditable=2`, `imgs=81`,
  `inlineStyle=347`, `dataOrNgAttrs=5572`, and center inline SVG `0`.
- Converted live state wrappers into a specific runtime residue label:
  `Xiumi SVG gallery state wrapper residue`.
- The detector now blocks `tn-image-inst-wrapper`, `tn-quick-input-*`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `tn-state-*`, `tn-on-*`,
  `tn-in-cell-state-active`, `tn-overflow-hidden`, and `tn-content-overlap` when they appear in
  WeChat/XHS/Zhihu publishable output.
- TDD first run failed because the old detector only reported generic `Xiumi tn-*` labels. After
  the rule update, the focused regression passed.
- Full verification passed: focused market-residue regression 4 selected tests,
  `platform-export-rendering.test.ts` 143 tests, four-file cross-platform export regression
  182 tests, full export serial regression 35 files / 1116 tests, targeted ESLint, `vue-tsc`, and
  production build. The generated `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is Xiumi applied-authoring DOM learning and local detector enforcement only. It
  does not prove WeChat paste, phone preview, mobile interaction, mobile Dark Mode, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public article rendering,
  XHS/Zhihu account upload, public host, or publish success.

## 2026-06-20 Xiumi Component Binding Attribute Residue Contract

- [x] xiumi-component-binding-attribute-residue-20260620.txt
- Used CloakBrowser only on the active Xiumi v5 paper editor center state. The applied
  SVG-gallery/game-screen sample still exposed `nodeCount=4736`, `imgCount=81`, center inline SVG
  `0`, `contenteditableCount=2`, and `inlineStyleCount=347`.
- Converted component/runtime binding attributes into a specific runtime residue label:
  `Xiumi component binding attribute residue`.
- The detector now blocks `tn-bind-comp-tpl-id`, `tn-comp-role`, `tn-comp`, `tn-comp-pose`,
  `tn-uuid`, `tn-animate`, `tn-animate-on-self`, `tn-cell-type`, `tn-child-position`,
  `tn-child-orientation`, `tn-page-stage-size`, `tn-page-cache-gatherer`, `tn-atom-context`,
  `tn-link`, and `tn-image-usage` before falling back to generic `Xiumi tn-* attribute`.
- TDD first run failed because the old detector only reported generic `Xiumi tn-* attribute`.
  After the rule update, the focused regression passed.
- Full verification passed: focused component-binding regression 1 selected test, adjacent
  market-residue regression 9 selected tests, `platform-export-rendering.test.ts` 144 tests,
  four-file cross-platform export regression 183 tests, full export serial regression 35 files /
  1117 tests, targeted ESLint, `vue-tsc`, and production build. The generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is Xiumi applied-authoring DOM learning and local detector enforcement only. It
  does not prove WeChat paste, phone preview, mobile interaction, mobile Dark Mode, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public article rendering,
  XHS/Zhihu account upload, public host, or publish success.

## 2026-06-20 Phone Preview Blocker Forbidden Contract

- [x] style-proof-phone-blocker-forbidden-contract-20260620.txt
- Converted the phone-preview blocker flag into an explicit forbidden-field contract for matching
  phone success rows.
- `phonePreviewBlocked:true` is now forbidden on `phone-preview-readback`, `phone-screenshot`,
  `dark-mode-check`, and `cover-thumbnail-check` rows that otherwise match the required
  channel/action/readback.
- A contradictory row emits `style-proof-manifest-forbidden-field-present`, stays invalid in the
  requirement-level acceptance audit, remains visible in `cannotClaim`, and is named in runbook
  success criteria and failure signals.
- TDD first run failed before the contract update; the focused regression passed after the fix.
- Full verification passed: `platform-export-rendering.test.ts` 141 tests, 4-file cross-platform
  export regression 180 tests, full export serial regression 35 files / 1114 tests, targeted
  ESLint, `vue-tsc`, and production build.
- Boundary: this is local validator/audit/runbook enforcement only. It does not prove WeChat paste,
  phone preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed
  sync, scheduled send, platform preview, public article rendering, XHS/Zhihu account upload,
  public host, or publish success.

## 2026-06-20 External Account Blocker Forbidden Contract

- [x] style-proof-external-account-blocker-forbidden-contract-20260620.txt
- Converted the external-account blocker flag into an explicit forbidden-field contract for
  matching credentialed and publish success rows.
- `externalAccountLoginBlocked:true` is now forbidden on `credentialed-channel-response`,
  `sync-readback`, `scheduled-send-readback`, and `published-url-or-platform-preview` rows that
  otherwise match the required channel/action/readback.
- A contradictory row emits `style-proof-manifest-forbidden-field-present`, stays invalid in the
  requirement-level acceptance audit, remains visible in `cannotClaim`, and is named in runbook
  success criteria and failure signals.
- TDD first run failed before the contract update; after the fix the focused regression passed, the
  full platform rendering suite passed 142 tests, the four-file cross-platform export regression
  passed 181 tests, the full serial `src/services/export` run passed 35 files / 1115 tests, and
  targeted ESLint, `vue-tsc --noEmit`, and production build passed. The generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local validator/audit/runbook enforcement only. It does not prove credentialed
  sync, scheduled send, platform preview, public article rendering, public URL acceptance,
  XHS/Zhihu account upload, public host, or publish success.

## 2026-06-20 Market Fallback Catalog Contract

- `market-fallback-catalog-contract-20260620.txt` records the executable catalog contract that
  keeps 135/Xiumi SVG/H5/rich-layout taxonomy visible only as blocked fallback choices:
  `wechat-market-svg-h5-fallback-matrix`, `xhs-market-rich-card-fallback`, and
  `zhihu-market-rich-layout-fallback`. It is local catalog/proof-gate evidence only and does not
  claim phone preview, sync, public-host acceptance, upload, or publish success.

## 2026-06-20 Style Proof Committed Evidence Runbook Report

- [x] style-proof-committed-evidence-runbook-report-20260620.txt
- Added committed-evidence execution-runbook helpers for already redacted repository proof.
- `getCommittedStyleProofLocalEvidenceExecutionRunbook()` and
  `getCommittedStyleProofWechatPcEvidenceExecutionRunbook()` run the existing execution-runbook
  layer over their matching committed manifest packs.
- `getCommittedStyleProofEvidenceExecutionRunbookReport()` exposes local, WeChat PC, and combined
  runbook views plus a summary for exact-artifact fingerprint conflicts, cannot-claim steps,
  phone-open steps, external-dependency-open steps, unsafe-to-automate steps, and mutating-open
  steps.
- TDD first run failed because `getCommittedStyleProofEvidenceExecutionRunbookReport()` did not
  exist. After implementation, the focused committed runbook regression passed.
- Full verification passed: committed evidence focused group 4 selected tests,
  `platform-export-rendering.test.ts` 148 tests, four-file cross-platform export regression
  187 tests, full export serial regression 35 files / 1121 tests, targeted ESLint, `vue-tsc`, and
  production build. The generated `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local committed-evidence runbook aggregation only. It does not prove WeChat
  phone preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed
  sync, scheduled send, platform preview, public article rendering, XHS/Zhihu account upload,
  public host, or publish success.

## 2026-06-20 Style Proof Committed Evidence Release Gate

- [x] style-proof-committed-evidence-release-gate-20260620.txt
- Added `getCommittedStyleProofEvidenceReleaseGateReport()` as the top-level local release-claim
  gate for committed proof.
- The report reads only from `getCommittedStyleProofEvidenceExecutionRunbookReport()` and returns
  `canClaimComplete:false` for the current committed pack.
- The current status is `blocked-by-local-conflict` because combined committed evidence still has
  the exact-artifact fingerprint mismatch. Phone preview, external dependency,
  unsafe-to-automate, and mutating-platform blockers remain visible in separate blocker rows.
- The local-conflict blocker now includes `fingerprintConflicts` for the current
  `wechat-flagship-amber` and `wechat-flagship-tempera` local-vs-PC exact artifact conflicts.
- TDD first run failed because the release-gate helper did not exist. After implementation, the
  focused release-claim regression passed.
- Full local verification also passed: committed evidence plus release-claim focused group
  5 selected tests, `platform-export-rendering.test.ts` 150 tests, four-file cross-platform export
  regression 189 tests, full `src/services/export` serial run 35 files / 1123 tests, targeted
  ESLint, `vue-tsc --noEmit`, and production build. Vite built in 26.19s, and generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local release-claim blocking only. It does not prove WeChat phone preview,
  mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled
  send, platform preview, public article rendering, XHS/Zhihu account upload, public host, or
  publish success.

## 2026-06-20 ExportModal Committed Release Gate Preflight

- [x] exportmodal-release-gate-preflight-20260620.txt
- ExportModal now surfaces the committed-evidence release gate as a read-only preflight row.
- The style capability summary and preflight row expose `canClaimComplete=false`, blocker count,
  and the committed local-vs-PC evidence conflict count. The 2026-06-21 Amber reconciliation
  refreshed that then-current count to `fingerprintConflicts 1`; the later Tempera reconciliation
  refreshes the current count to 0 while the preflight row remains blocked.
- CloakBrowser local DOM/visual verification opened the real ExportModal from the existing local
  article "未命名文章" and confirmed the release row is `preflight-blocked`, the panel is nonblank,
  and page/body scroll width stays equal to the 1400px viewport.
- Verification passed: ExportModal ESLint, `vue-tsc --noEmit`, e2e CJS syntax check, and
  production build. Vite built in 24.34s.
- Boundary: this is local UI/readout proof only. It does not prove phone preview, mobile
  interaction, mobile Dark Mode, cover thumbnail, credentialed sync, scheduled send, public preview,
  XHS/Zhihu account upload, public-host acceptance, or publish success.

## 2026-06-20 Release Gate Operator Actions

- [x] release-gate-operator-actions-20260620.txt
- Committed release-gate blockers now expose `nextOperatorActions` derived from the existing
  execution runbook instead of inventing new proof rows.
- ExportModal now includes a short `operatorNext` summary in the committed-proof-release preflight
  row while keeping `canClaimComplete=false` and the row blocked.
- TDD first exposed that external-dependency actions could hide public-host behind repeated PC
  editor actions; sorting now prioritizes blocker-specific gates and deduplicates repeated
  platform/gate/boundary/action rows.
- Focused verification passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "blocks committed evidence release claims" --reporter=default`.
- Full verification also passed: `platform-export-rendering.test.ts` 150 tests, four-file
  cross-platform export regression 189 tests, full `src/services/export` serial run 35 files /
  1123 tests, targeted ESLint, `vue-tsc --noEmit`, e2e CJS syntax check, and production build
  (Vite built in 25.23s). `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- CloakBrowser local visual/DOM verification confirmed the committed-proof-release row contains
  `operatorNext`, the reconciliation action, and the phone-preview action on desktop 1400x900 and
  mobile 390x844, with no document/body/panel/row horizontal overflow. Screenshots were used only
  for local visual inspection and were not committed as evidence.
- Boundary: this is local operator guidance and UI readout only. It does not prove WeChat paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public
  preview, XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-06-20 Style Proof External Freshness Contract

- [x] style-proof-external-freshness-contract-20260620.txt
- External proof rows now require `collectedAt` on the same matching proof row for market-editor,
  authenticated PC editor, phone-preview, credentialed-channel, platform-publish, and public-host
  gates.
- The default freshness window is 14 days. Missing timestamps, future/unparseable timestamps, and
  stale timestamps emit `style-proof-manifest-collected-at-missing`,
  `style-proof-manifest-collected-at-invalid`, or `style-proof-manifest-proof-stale`.
- These issue ids are acceptance-invalid, so affected requirements stay `invalid` and visible in
  `cannotClaim`.
- Committed WeChat PC proof manifests are bound to their real evidence collection dates; local test
  runs do not auto-renew external proof.
- Verification passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  with 151 tests; four-file cross-platform export regression with 190 tests; full
  `src/services/export` serial regression with 35 files / 1124 tests; targeted ESLint;
  `vue-tsc --noEmit`; and production build (Vite built in 31.07s). The generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local proof freshness enforcement only. It does not prove WeChat paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview,
  XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-06-21 Style Proof Runbook Freshness Guidance

- [x] style-proof-runbook-freshness-guidance-20260621.txt
- Execution runbook steps now expose `requiresFreshCollectedAt`, `freshnessMaxDays`, and
  `freshnessIssueIds`.
- Missing, future/unparseable, and stale `collectedAt` issues now produce specialized
  `cannotClaimReason` and recapture-oriented `nextOperatorAction` text.
- Success criteria and failure signals now name the active freshness window, so UI/report consumers
  do not need to duplicate validator logic.
- Verification passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts --reporter=default`
  with 151 tests; four-file cross-platform export regression with 190 tests; full
  `src/services/export` serial regression with 35 files / 1124 tests; targeted ESLint;
  `vue-tsc --noEmit`; and production build (Vite built in 1m 8s). The generated
  `inkforge/tsconfig.tsbuildinfo` was restored afterward.
- Boundary: this is local runbook/operator guidance only. It does not prove WeChat paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview,
  XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-07-03 Style Proof Stale External Release Routing

- [x] style-proof-stale-external-release-routing-20260703.txt
- Stale committed external proof rows still emit `style-proof-manifest-proof-stale`, remain
  acceptance-invalid, and stay visible in cannot-claim, runbook, release preflight, external
  checklist, local-actionability, external-handoff, and redacted packet APIs.
- Release-gate `local-conflict` now remains reserved for local proof hygiene and manifest
  conflicts. Stale authenticated PC editor proof routes through external-dependency and
  mutating-platform blockers instead of pretending it is locally automatable.
- Current release preflight remains unclaimable:
  `canClaimComplete=false`, `status=blocked-by-external`, `blockerCount=4`,
  `combinedIssueCount=15`, `externalHandoffRows=19`, `safeExternalRows=0`,
  and `actionableLocalRows=0`.
- Boundary: this is local release-gate accounting only. It does not refresh stale proof or prove
  WeChat paste, phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled
  send, public preview, XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-07-03 Sensitive Platform Artifact Reference Hygiene

- [x] sensitive-platform-artifact-reference-hygiene-20260703.txt
- Extended `StyleProofManifest` proof hygiene so sensitive artifact detection checks artifact id,
  label, and `artifactRef`, not just `artifactRef`.
- Raw local WeChat backend/account-state PNG evidence such as preview QR, cover crop, cover
  vessel, account, backend, or vessel captures remains uncommittable even if a manifest marks the
  row `safeForCommit:true`.
- Redacted local paste HTML reports under `prompts/0601/evidence/wechat-paste/` remain
  committable; the rule intentionally does not block safe `.html` proof fixtures.
- Boundary: this is committed-proof hygiene only. It does not prove paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview, XHS/Zhihu upload,
  public-host acceptance, or publish success.

## 2026-06-21 135 SVG Free Trial CloakBrowser Recheck

- [x] 135-svg-free-trial-cloakbrowser-recheck-20260621.txt
- CloakBrowser opened the live 135 SVG editor and clicked a visible `免费试用` effect.
- Post-click center editor DOM contained duplicated `content-canvas` / `content-inner` /
  `content-background` containers, ten `block-img__inner` image-slot shells, ten
  `placeholder__help` helpers, spacing/gap controls, slider handles, and trigger switches.
- No new detector code was needed: existing 135 SVG builder, editor-shell, trigger-hot-area, and
  layout-control residue tests already cover the observed authoring markers.
- Focused verification passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "135 SVG" --reporter=default`
  with 5 selected tests.
- Boundary: this is market-editor DOM learning only. It does not prove WeChat paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview,
  XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-06-21 Xiumi SVG Recovery Modal Blocker

- [x] xiumi-svg-recheck-recovery-modal-blocker-20260621.txt
- CloakBrowser opened the live Xiumi v5 paper editor and selected the left-side SVG category.
- The SVG category exposed families such as basic SVG, image carousel, click-expand, path
  animation, slide trigger, click switch, page flip, zoom, long-press switch, area trigger, and
  click + auto.
- The center `.tn-editing-panel` was readable and still contained high-volume `tn-*`, `ng-*`,
  `raw-image`, `tn-bind-comp-tpl-id`, `tn-comp-role`, and `opera-tn-ra-*` authoring markers.
- A recovery confirmation dialog asked whether to restore a previous unsaved draft, so no recovery
  or cancel action was automated and no applied proof was claimed.
- Boundary: this is a blocked market-editor DOM recheck only. It does not prove Xiumi applied
  content, WeChat paste, phone preview, mobile interaction, Dark Mode, cover thumbnail, sync,
  scheduled send, public preview, XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-06-21 Style Proof Current Release/Runbook Audit

- [x] style-proof-current-release-runbook-audit-20260621.txt
- Local API readout of `getCommittedStyleProofEvidenceReleaseGateReport()` returned
  `status=blocked-by-local-conflict`, `canClaimComplete=false`, and `blockerCount=5`.
- The same readout reported `combinedManifestCount=6`, `combinedIssueCount=14`,
  `hasExactArtifactFingerprintConflicts=true`, `cannotClaimSteps=35`, `phoneOpenSteps=4`,
  `externalDependencyOpenSteps=15`, `unsafeToAutomateOpenSteps=14`, and `mutatingOpenSteps=14`.
- This same-day snapshot is superseded by the later Amber, Tempera, and Zhihu data-table local
  evidence slices; the current release-gate refresh records `localManifestCount=5`,
  `combinedManifestCount=7`, `combinedIssueCount=13`, and
  `hasExactArtifactFingerprintConflicts=false`.
- The combined execution runbook stayed fully open at 35 total/open/cannot-claim steps. Platform
  summaries stayed isolated: WeChat 17 open steps, Xiaohongshu 8 open steps, and Zhihu 10 open
  steps.
- The release gate still exposes local-conflict, phone-preview, external-dependency,
  unsafe-to-automate, and mutating-platform blocker buckets with operator actions. This is the
  expected current state and must not be converted into a completion claim.
- Boundary: this is local committed-evidence accounting only. It does not prove WeChat paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public
  preview, XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-06-21 WeChat MP Login State Blocker

- [x] wechat-mp-login-state-blocker-20260621.txt
- CloakBrowser opened the WeChat Official Account Platform entry page.
- The visible state was a public login entry with a WeChat scan-login panel, not an authenticated
  article editor, preview surface, draft list, material manager, or publishing control surface.
- No QR image, browser runtime artifact, account identifier, credential material, request payload,
  or raw platform response was committed.
- The next WeChat proof attempt still requires a human operator to complete the official login flow
  in the visible browser, then use a disposable authenticated editor/draft surface for redacted
  DOM/visual readback.
- Boundary: this is a login-state blocker only. It does not prove WeChat paste, phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview, public
  article rendering, or publish success.

## 2026-06-21 WeChat Session Timeout Read-Only Recheck

- [x] wechat-session-timeout-readonly-recheck-20260621.txt
- CloakBrowser opened the WeChat backend home route and the visible page reported
  `登录超时，请重新登录`.
- DOM readback found no contenteditable editor, no iframe, and no editor candidates such as
  `#js_editor`, `#js_appmsg_editor`, `#ueditor_0`, `.edui-editor`, `.ProseMirror`, or
  `.rich_media_content`.
- Existing validator regressions passed for login/expired-session rows: 1 file / 2 selected tests.
- Boundary: this is session-timeout blocker evidence only. It does not prove WeChat paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, platform preview,
  public article rendering, or publish success.

## 2026-06-21 Local Full Validation Sweep

- [x] local-full-validation-sweep-20260621.txt
- Serial full Vitest passed: 87 test files and 1464 tests.
- `vue-tsc --noEmit --pretty false` passed with exit code 0.
- Production build passed with `NODE_OPTIONS=--max-old-space-size=4096`: Vite transformed 4652
  modules and built in 46.89s.
- The build-generated `inkforge/tsconfig.tsbuildinfo` file was restored after verification.
- Fidelity output files regenerated by the full test run were restored before staging.
- Non-failing warnings were limited to intentional boundary tests: KaTeX quirks-mode output,
  oversize HTML hard-limit warnings, IndexedDB/audit fallback paths, and keychain-unavailable
  paths.
- Boundary: this is local validation only. It does not prove WeChat paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview, public article
  rendering, XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-06-21 Style Acceptance ExportModal E2E Refresh

- [x] style-acceptance-exportmodal-e2e-refresh-20260621.txt
- Initial full WDIO run failed because `svg-render.spec.cjs` still expected stale catalog counts:
  WeChat `8/16` while the real runtime UI exposed `8/17`.
- Catalog authority check returned current counts: WeChat 17 total / 8 available / 5 blocked / 4
  unavailable; Xiaohongshu 8 total / 4 available / 3 blocked / 1 unavailable; Zhihu 8 total / 4
  available / 3 blocked / 1 unavailable.
- Updated the real Tauri/WebView2 e2e to assert current counts and to keep the market fallback
  choices blocked until real fallback/public-host proof exists.
- Verification passed:
  `node --check inkforge/tests/e2e/specs/svg-render.spec.cjs`;
  targeted `svg-render.spec.cjs` WDIO run with 1 spec / 6 tests; full `pnpm -C inkforge test:e2e`
  with 2 specs / 17 tests.
- Boundary: this is local Tauri/WebView2 e2e proof only. It does not prove WeChat paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public preview,
  public article rendering, XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-06-21 Market Editor SVG Pipeline Residue Refresh

- [x] market-editor-cloakbrowser-svg-pipeline-residue-refresh-20260621.txt
- CloakBrowser opened the live 135 SVG editor, clicked a visible `免费试用` SVG effect, and read
  the center `.editor-content` DOM without saving, exporting, syncing, uploading, publishing, or
  capturing account artifacts.
- 135 background SVG layers exposed a 135-specific `svg:135` inline-style marker alongside
  background positioning/sizing, zero-gap section wrappers, `pointer-events:none`,
  `user-select:none`, and tall `viewBox="0 0 1080 1920"` geometry.
- CloakBrowser opened the live Xiumi v5 paper editor, cancelled the unsaved-draft recovery prompt,
  and read taxonomy, export menu, animation controls, and template-renderer markers without
  mutating account/editor state.
- Xiumi exposed template pipeline markers such as `tplLib.onTemplateClicked`, `tpl2BoxClasses`,
  `tpl2PresentType`, `tn-tpl-pose-fit-box`, `renderer_accelerate`, and
  `validateImageTypeInHtml`.
- Added detector labels `135 SVG background style marker` and
  `Xiumi template renderer pipeline residue`, both routed through the existing
  WeChat/XHS/Zhihu market-editor-residue issues.
- Verification passed: focused TDD pair with 2 selected tests and adjacent market/135/Xiumi
  regression with 18 selected tests.
- Boundary: this is market-editor DOM learning and local detector enforcement only. It does not
  prove WeChat paste, phone preview, mobile interaction, Dark Mode, cover thumbnail, sync,
  scheduled send, public preview, public article rendering, XHS/Zhihu upload, public-host
  acceptance, or publish success.

## 2026-06-21 Style Proof Amber Reconciliation

- [x] style-proof-amber-reconciliation-20260621.txt
- Reconciled the runtime catalog with the 2026-06-18 CloakBrowser-only ordinary OS Ctrl+V exact
  `flagship-amber.html` proof.
- `wechat-flagship-amber` is now `available` for its `pc-editor-paste` evidence floor, while
  phone preview, mobile Dark Mode, cover thumbnail, platform preview, sync, scheduled send, and
  publish proof remain open.
- The committed local Amber manifest now uses the exact raw HTML artifact SHA
  `sha256:09607268931e18aa05244594f941dfd181d24bc6420f3263a022ff263018fa3d`; the local Tauri
  screenshot evidence reference stays an `artifactRef`.
- At this Amber-only checkpoint, Tempera still had a local-vs-PC fingerprint split. The later
  `style-proof-tempera-fingerprint-reconciliation-20260621.txt` slice reconciles Tempera to the
  entity-safe WeChat clipboard artifact fingerprint, so the current committed pack has no
  `fingerprintConflicts`.
- Verification passed: focused committed/release claim regression with 5 selected tests, full
  platform-export file with 153 tests, 4-file cross-platform export regression with 192 tests, full
  export serial suite with 1126 tests, targeted TS/Vue ESLint, `node --check`, targeted
  `svg-render.spec.cjs` WDIO with 1 spec / 6 tests, `vue-tsc`, production build, and full WDIO e2e
  with 2 specs / 17 tests.
- Boundary: this is local catalog/evidence accounting only. It does not prove WeChat phone preview,
  mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, platform preview, public
  article rendering, XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-06-21 Style Proof Current Release Gate Refresh

- [x] style-proof-current-release-gate-refresh-20260621.txt
- Local API readout after Amber reconciliation, the WeChat session-timeout recheck, Tempera
  fingerprint reconciliation, and Zhihu data-table local evidence returned
  `status=blocked-by-local-conflict`, `canClaimComplete=false`, and `blockerCount=5`.
- Current summary: `localManifestCount=5`, `combinedManifestCount=7`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, `cannotClaimSteps=34`, `phoneOpenSteps=4`,
  `externalDependencyOpenSteps=14`, `unsafeToAutomateOpenSteps=13`, and
  `mutatingOpenSteps=13`.
- Amber and Tempera are no longer listed in release gate `fingerprintConflicts`; no current
  exact-artifact fingerprint conflict remains in the committed pack.
- Combined runbook platform summaries now show WeChat 17 total / 1 completed / 16 open steps,
  Xiaohongshu 8 total / 0 completed / 8 open steps, and Zhihu 10 total / 0 completed / 10 open
  steps.
- Boundary: this is local committed-evidence accounting only. It does not prove WeChat paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail, sync, scheduled send, public
  preview, public article rendering, XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-06-21 Style Proof Tempera Fingerprint Reconciliation

- [x] style-proof-tempera-fingerprint-reconciliation-20260621.txt
- Reconciled `wechat-flagship-tempera` committed local evidence to the proven entity-safe WeChat
  clipboard artifact SHA:
  `sha256:f7142d6e996a7933d80f8b7494a85db79779a6ac63c200754015772ba8e1a878`.
- Kept the local Tauri/WebView screenshot evidence reference as `artifactRef`; the fingerprint now
  represents the effective WeChat clipboard artifact, matching the committed PC proof.
- At the Tempera checkpoint the release gate still returned `canClaimComplete=false` and
  `status=blocked-by-local-conflict`, with `hasExactArtifactFingerprintConflicts=false` and
  `combinedIssueCount=11`. The later Zhihu data-table local evidence slice refreshes the current
  committed count to `combinedIssueCount=13`.
- Follow-up fixed the release-gate local-conflict `operatorNext` text: with
  `fingerprintConflicts 0`, the UI now points at remaining proof collection instead of asking for
  manifest fingerprint reconciliation.
- Verification passed: GitNexus impact LOW for the manifest constant and release report; focused
  committed/release claim Vitest passed 1 file / 5 selected tests; full platform-export regression
  passed 153 tests; 4-file cross-platform export regression passed 192 tests; full export serial
  suite passed 35 files / 1126 tests; targeted ESLint, `vue-tsc`, and production build passed;
  runtime API readout confirmed the updated counts; follow-up `node --check`, targeted WDIO, and
  full `pnpm -C inkforge test:e2e` passed against the updated preflight text.
- Boundary: this is local catalog/evidence accounting only. It does not prove raw UTF-8 Tempera
  direct paste, WeChat phone preview, mobile interaction, Dark Mode, cover thumbnail, sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu upload, public-host
  acceptance, or publish success.

## 2026-06-21 WeChat Session Timeout Post-Reboot Recheck

- [x] wechat-session-timeout-post-reboot-recheck-20260621.txt
- CloakBrowser-only read-only recheck after the local reboot opened the WeChat backend home route.
- Page title remained `公众号`, visible text was the relogin/public footer state beginning with
  `请重新登录`, and DOM readback found zero editor candidates for `#js_editor`,
  `#js_appmsg_editor`, `#ueditor_0`, `.edui-editor`, `.ProseMirror`, `.rich_media_content`,
  `[contenteditable="true"]`, `iframe`, or `[data-action]`.
- No login attempt, credential entry, QR capture, draft creation, paste, save, preview, sync,
  upload, scheduled send, publish, screenshot capture, HAR capture, account artifact, browser
  runtime artifact, or raw platform response was recorded.
- Boundary: this is session-state blocker evidence only. It does not prove authenticated editor
  access, WeChat paste, phone preview, mobile interaction, Dark Mode, cover thumbnail, sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu upload, public-host
  acceptance, or publish success.

## 2026-06-21 Zhihu Data Table Local Evidence

- [x] zhihu-data-table-local-artifact-20260621.md
- [x] zhihu-data-table-local-evidence-20260621.txt
- Generated a source-owned clean Markdown table artifact through the real local
  `markdownToZhihuClean(..., { tableHandling:'preserve', codeLangCoerce:true })` path.
- The exact clean Markdown artifact hash is
  `sha256:9e828ff7b50d642be8f59f4907dc5cd47fc9973f465e904446a21f6e79bccd8f`.
- The real local Zhihu preview fidelity renderer produced one table, no inline SVG, no
  `data-ink-svg`, and a `#zhihu-answer` container for the `zhihu-tech` preset.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one `zhihu-data-table` local
  manifest. It satisfies local `unit-test-coverage`, `local-browser-rendering`, `exact-artifact`,
  and `no-sensitive-artifact` rows only.
- The Zhihu local manifest intentionally keeps `zhihu-artifact-manifest`, `public-image-host`,
  credentialed sync, scheduled send, platform preview, public article rendering, and publish rows
  open/unclaimable.
- Current release-gate readout after this slice is `localManifestCount=5`,
  `combinedManifestCount=7`, `combinedIssueCount=13`, `hasExactArtifactFingerprintConflicts=false`,
  and `canClaimComplete=false`.
- Verification passed: focused committed/local/release runbook regression with 4 selected tests,
  full `platform-export-rendering.test.ts` with 153 tests, 4-file cross-platform export regression
  with 192 tests, full export serial suite with 35 files / 1126 tests, targeted ESLint,
  `vue-tsc`, and production build with 4652 transformed modules in 37.77s.
- Boundary: this is local clean Markdown/table artifact accounting only. It does not prove Zhihu
  public image-host acceptance, account upload, editor preview, sync, scheduled send, platform
  preview, public article rendering, or publish success.

## 2026-06-21 XHS Cover Hook Local Evidence

- [x] xhs-cover-hook-local-evidence-20260621.txt
- [x] xhs-raster/xhs-raster-cover-hook-browser-2026-06-21.png
- [x] xhs-raster/xhs-raster-cover-hook-browser-2026-06-21.json
- CloakBrowser opened the local Vite app and generated the exact PNG through the source-owned
  browser canvas path: `cover-title` SVG module -> `renderXhsPosterCard(..., '3:4', '#fff7ed')`.
- Visual QA adjusted the subtitle until the committed PNG had no ellipsis/truncation.
- Final PNG dimensions are 1080 x 1440, bytes 92316, hash
  `sha256:c7200947079cda16ccafc51b5c56bfd840355da199da48b790b6725233af2d32`.
- `validateXhsImageArtifactManifest()` returned `issues=[]` for the exact one-page image manifest.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one `xhs-cover-hook` manifest. It
  satisfies local `unit-test-coverage`, `local-browser-rendering`, `exact-artifact`,
  `xhs-artifact-manifest`, and `no-sensitive-artifact` rows only.
- Current release-gate readout after this slice is `localManifestCount=6`,
  `combinedManifestCount=8`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, and `canClaimComplete=false`.
- Verification passed: focused committed/local/release runbook regression with 4 selected tests,
  full `platform-export-rendering.test.ts` with 153 tests, 4-file cross-platform export regression
  with 192 tests, full export serial suite with 35 files / 1126 tests, targeted ESLint,
  `vue-tsc`, and production build with 4652 transformed modules in 30.25s.
- Boundary: this is local XHS raster/image-manifest accounting only. It does not prove
  Xiaohongshu account upload, mobile/platform preview, public URL acceptance, scheduled send,
  public article rendering, or publish success.

## 2026-06-21 XHS Clean Text Local Evidence

- [x] xhs-clean-text-local-artifact-20260621.txt
- [x] xhs-clean-text-local-evidence-20260621.txt
- Generated a source-owned clean Xiaohongshu text artifact through the real local
  `markdownToXiaohongshuText(...)` path.
- The persisted artifact hash is
  `sha256:e590d621cb09f988c76f76c7b4db87295bce7765bdd8300479dac2d80c4d4e68`; persisted bytes are
  531, exporter char count is 203, paragraph count is 7, and `overLimit=false`.
- Local hygiene check found no HTML tags and no Markdown control syntax after expected XHS hashtag
  markers were removed.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one `xhs-clean-text` manifest. It
  satisfies local `unit-test-coverage`, `exact-artifact`, and `no-sensitive-artifact` rows only.
- The clean-text manifest intentionally does not claim `local-browser-rendering` or
  `xhs-artifact-manifest`.
- Current release-gate readout after this slice is `localManifestCount=7`,
  `combinedManifestCount=9`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, and `canClaimComplete=false`.
- Verification passed: focused committed/local/release runbook regression with 4 selected tests,
  full `platform-export-rendering.test.ts` with 153 tests, 4-file cross-platform export regression
  with 192 tests, full export serial suite with 35 files / 1126 tests, targeted ESLint,
  `vue-tsc`, and production build with 4652 transformed modules in 27.21s.
- Boundary: this is local XHS clean-text export and exact-artifact accounting only. It does not
  prove Xiaohongshu account upload, mobile/platform preview, public URL acceptance, scheduled send,
  public article rendering, or publish success.

## 2026-06-21 XHS Data Card Local Evidence

- [x] xhs-data-card-local-evidence-20260621.txt
- [x] xhs-raster/xhs-data-card-browser-2026-06-21.json
- [x] xhs-raster/xhs-data-card-browser-2026-06-21-page-01.png
- [x] xhs-raster/xhs-data-card-browser-2026-06-21-page-02.png
- [x] xhs-raster/xhs-data-card-browser-2026-06-21-page-03.png
- CloakBrowser opened the local Vite app and generated the exact PNG pack through the source-owned
  browser canvas path:
  `sliceMarkdownToXhsCards` -> `renderXhsMarkdownCardSliceSvg` -> `renderXhsPosterCard`.
- Visual QA rejected two earlier variants because of table/slash wrapping, overflow warnings, and
  mixed English term splits. The committed pack uses short Chinese metric rows and has no overflow
  warning.
- Final JSON pack hash:
  `sha256:bb78392d7b217251509eff0a9295ff3d601303747dd4eaa772e1b871c60bdc1a`.
- Final page hashes:
  page 01 `sha256:00fb3bd22433e7a65bc630bb0f39d44acfbef11da7bf873182939ec15002577f`;
  page 02 `sha256:0fdcefa6f1fcd285c2cb8f16f580b994ae689d7db7e19794b1e70bc2ab3c9e48`;
  page 03 `sha256:7ced2189801b60ee22a279874b65b8f64167661c081a1c3712119daaef433a67`.
- Browser-side `validateXhsImageArtifactManifest()` returned `issues=[]`; independent Node
  verification re-read JSON/PNG files, checked hashes, bytes, and 1080 x 1440 dimensions.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one `xhs-data-card` manifest.
  The catalog row is now local-browser available; progress local and sensitive-hygiene gates are
  satisfied while platform-publish remains missing. This local evidence does not make it selectable
  or publishable.
- Boundary: this is local XHS data-card raster/image-manifest accounting only. It does not prove
  Xiaohongshu account upload, mobile/platform preview, public URL acceptance, scheduled send,
  public article rendering, or publish success.

## 2026-06-21 XHS Long Report Local Evidence

- [x] xhs-long-report-local-evidence-20260621.txt
- [x] xhs-raster/xhs-long-report-browser-2026-06-21.json
- [x] xhs-raster/xhs-long-report-browser-2026-06-21-page-01.png
- [x] xhs-raster/xhs-long-report-browser-2026-06-21-page-02.png
- [x] xhs-raster/xhs-long-report-browser-2026-06-21-page-03.png
- [x] xhs-raster/xhs-long-report-browser-2026-06-21-page-04.png
- CloakBrowser opened the local Vite app and generated the exact PNG pack through the source-owned
  browser canvas path:
  `sliceMarkdownToXhsCards` -> `renderXhsMarkdownCardSliceSvg` -> `renderXhsPosterCard`.
- A first sparse variant passed manifest validation but was regenerated to better exercise the
  long-report layout. The committed pack uses six short Chinese rows per page and has no overflow
  warning.
- Final JSON pack hash:
  `sha256:102dafef61c4d978f8fd4cb501f7469d714f4db5125e1943e940f77df59d2a9e`.
- Final page hashes:
  page 01 `sha256:5b71f34ef0df133f61ae87e2e4849cd4530067ac8092ee7a2459995a44960cce`;
  page 02 `sha256:167e6d909d09f85922c6e80fb6fcc871e6a49f3127d378585ba13ae8b7fc036c`;
  page 03 `sha256:a86d239369571a66c71014ce5a10a8845a1f6f3db0918fa81e8c2ff15751e7ea`;
  page 04 `sha256:fb7fcdfeacc7c0c964ac58eb3539cc7ac89eba23ada45d0ef3129137c6fe1b8c`.
- Browser-side `validateXhsImageArtifactManifest()` returned `issues=[]`; independent Node
  verification re-read JSON/PNG files, checked hashes, bytes, 1080 x 1440 dimensions,
  `overflow=false`, body references `[1, 2, 3, 4]`, and page crop/reference fields.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one `xhs-long-report` manifest.
  The catalog row is now local-browser available; progress local and sensitive-hygiene gates are
  satisfied while platform-publish remains missing. This local evidence does not make it selectable
  or publishable.
- Current release-gate readout after the 2026-06-22 XHS catalog-open slice is
  `localManifestCount=20`, `combinedManifestCount=22`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, `status=blocked-by-external`, and
  `canClaimComplete=false`.
- Boundary: this is local XHS long-report raster/image-manifest accounting only. It does not prove
  Xiaohongshu account upload, mobile/platform preview, public URL acceptance, scheduled send,
  public article rendering, or publish success.

## 2026-06-21 XHS Market Rich Card Fallback Local Evidence

- [x] xhs-market-rich-card-fallback-local-evidence-20260621.txt
- [x] xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21.json
- [x] xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21-page-01.png
- [x] xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21-page-02.png
- [x] xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21-page-03.png
- [x] xhs-raster/xhs-market-rich-card-fallback-browser-2026-06-21-page-04.png
- CloakBrowser opened the local Vite app and generated the exact PNG pack through the source-owned
  browser canvas path:
  `sliceMarkdownToXhsCards` -> `renderXhsMarkdownCardSliceSvg` -> `renderXhsPosterCard`.
- The committed source Markdown captures market-rich fallback rules as InkForge-owned image-page
  guidance. It does not copy 135/Xiumi template source, vendor class names, remote media, cookies,
  tokens, HAR files, QR artifacts, account screenshots, or browser profile material.
- Visual QA inspected pages 1-4. The committed pack has no blank output, crop, overlap,
  unreadable wrapping, or overflow warning. The final page states that platform upload needs an
  account and must not be described as publish success.
- Final JSON pack hash:
  `sha256:beefe00ac8ceaa97aaaf1ad27b72055e70a3967bc148372666cd1d9e3f6a1b7b`.
- Source Markdown hash:
  `sha256:a157969d5a838589e9d2f42e6da717666af3b96257512db7377e0b57a6426644`.
- Final page hashes:
  page 01 `sha256:4fe54645576d8bd55fb232ee543011199834a45d65b4e60e1edacde59c9687df`;
  page 02 `sha256:0c181783d54ea487b92cb0bd3883e1f6d5271abf0dcff26a97956cdb3f08086f`;
  page 03 `sha256:43ad3d12495da5a670818aefba1fe34aacc1187f56d57b897989c9ffa40e7968`;
  page 04 `sha256:ae31e128b05d26621ea2451688b981109cd7c47b323bc94fd6bf787587aad4d3`.
- Browser-side `validateXhsImageArtifactManifest()` returned `issues=[]`; independent Node
  verification re-read JSON/PNG files, checked hashes, bytes, 1080 x 1440 dimensions,
  `overflow=false`, body references `[1, 2, 3, 4]`, cover marking, and page crop/reference fields.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one
  `xhs-market-rich-card-fallback` manifest. The catalog row is now local-browser available;
  progress local and sensitive-hygiene gates are satisfied while platform-publish remains missing.
  This local evidence does not make it selectable or publishable.
- Current release-gate readout after the 2026-06-22 XHS catalog-open slice remains blocked with
  `localManifestCount=20`, `combinedManifestCount=22`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, `status=blocked-by-external`,
  `canClaimComplete=false`, and blocker kinds `phone-preview`, `external-dependency`,
  `unsafe-to-automate`, and `mutating-platform`.
- Boundary: this is local XHS market-rich fallback raster/image-manifest accounting only. It does
  not prove Xiaohongshu account upload, mobile/platform preview, public URL acceptance, scheduled
  send, public article rendering, or publish success.

## 2026-06-21 WeChat Classic Inline Local Evidence

- [x] wechat-classic-inline-local-evidence-20260621.txt
- [x] wechat-classic-inline-local-artifact-20260621.html
- CloakBrowser opened the local Vite app and generated the exact HTML artifact through the real
  WeChat path:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('report'), options)`.
- The source Markdown is InkForge-owned and covers headings, paragraphs, quote, list, and code
  flow. It does not contain 135/Xiumi template source, vendor class names, remote media, cookies,
  tokens, HAR files, QR artifacts, account screenshots, or browser profile material.
- Artifact hash:
  `sha256:13531674720c5015b00b652e05c8127c75c01b6395922d0f1572726a5b030562`.
- Source Markdown hash:
  `sha256:e147546a1ef52498b139cc226c7dfbf4f3a1f91160dce9fb8a2e2ef652870aa7`.
- Independent Node verification re-read the committed HTML, checked the hash, byte length 3605,
  `id="nice"`, inline style presence, and absence of obvious market-editor residue or credential
  path markers.
- Browser-side `detectQuality(html, 'wechat')` still reports `wechat-line-height-zero`,
  `wechat-fixed-container-size`, `wechat-class-id-dependency`, and
  `wechat-layout-report-required`. These are recorded as local quality blockers and are not
  treated as platform proof.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one `wechat-classic-inline`
  manifest. It claims only `unit-tested` evidence and satisfies unit, exact-artifact, and
  sensitive-hygiene accounting for this exact HTML artifact.
- CloakBrowser runtime smoke from local Vite confirmed the release gate remains blocked with
  `canClaimComplete=false`, `status=blocked-by-local-conflict`, `localManifestCount=15`,
  `wechatPcManifestCount=2`, `combinedManifestCount=17`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: independent HTML evidence verification; CloakBrowser runtime smoke; focused
  committed/local/release regression with 1 file / 4 selected tests;
  `platform-export-rendering.test.ts` with 1 file / 155 tests; 4-file cross-platform export
  regression with 4 files / 194 tests; full `src/services/export` serial regression with
  36 files / 1132 tests; targeted ESLint; `vue-tsc`; and production build with
  4653 transformed modules in 30.43s. GitNexus detect reported 39 dirty files across the whole
  worktree, 0 affected processes, and low risk; this includes unrelated pre-existing local changes.
- Boundary: this is local WeChat classic inline unit/exact-artifact/sensitive-hygiene accounting
  only. It does not prove official editor paste, phone preview, mobile interaction, Dark Mode,
  cover thumbnail acceptance, sync, scheduled send, platform preview, public article rendering, or
  publish success.

## 2026-06-21 WeChat Quiet Editorial Local Evidence

- [x] wechat-quiet-editorial-local-evidence-20260621.txt
- [x] wechat-quiet-editorial-local-artifact-20260621.html
- Generated the exact HTML artifact through the real WeChat path:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('flagship-tempera'), options)`.
- The source Markdown is InkForge-owned and exercises quiet editorial blocks: lede, reading bar,
  quote, banner, list markers, citation card, footer, and cover SVG. It does not contain 135/Xiumi
  template source, vendor class names, hosted media, cookies, tokens, HAR files, QR artifacts,
  account screenshots, or browser profile material.
- Artifact hash:
  `sha256:1962d5ef8cd5a76c9b8b5ffe33b87f80bd59cf1cd284b05d529608e1fbd2255e`.
- Source Markdown hash:
  `sha256:ed57e4a7006141cf236db45ff7a7f526919bbb40b5f30577818531c0d33a577a`.
- Independent Node verification re-read the committed HTML, checked the hash, byte length 15324,
  `id="nice"`, editorial block sentinels, SVG sentinel, and absence of obvious market-editor
  residue or credential path markers.
- CloakBrowser loaded a local read-only artifact preview and measured the committed artifact:
  `rootWidth=677`, `niceWidth=677`, `viewportWidth=1400`, `documentScrollWidth=1385`,
  `bodyOverflowX=false`, `overflowing=[]`, `svgElementCount=17`, `textLength=486`.
- Local DOM readback found `flagship-readbar=1`, `flagship-h2=1`, `flagship-quote=1`,
  `flagship-banner=1`, `flagship-lede=1`, `flagship-ul=4`, `flagship-h3=1`,
  `flagship-citation=1`, `flagship-footer=1`, and `data-ink-svg="cover-title"=1`.
- Browser-side `detectQuality(html, 'wechat')` still reports `wechat-line-height-zero`,
  `wechat-fixed-container-size`, `wechat-class-id-dependency`, and
  `wechat-layout-report-required`. These are recorded as flagship-pipeline detector blockers and
  are not treated as PC editor paste, phone preview, Dark Mode, cover thumbnail, sync, or publish
  proof.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one `wechat-quiet-editorial`
  manifest. It claims only `unit-tested` and `local-browser` evidence and satisfies unit,
  local-browser, exact-artifact, and sensitive-hygiene accounting for this exact HTML artifact.
- CloakBrowser runtime smoke from local Vite confirmed the release gate remains blocked with
  `canClaimComplete=false`, `status=blocked-by-local-conflict`, `localManifestCount=16`,
  `wechatPcManifestCount=2`, `combinedManifestCount=18`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: independent HTML evidence verification; CloakBrowser artifact readback;
  CloakBrowser runtime smoke; focused committed/local/release regression with 1 file / 4 selected
  tests; `platform-export-rendering.test.ts` with 1 file / 155 tests; 4-file cross-platform export
  regression with 4 files / 194 tests; full `src/services/export` serial regression with
  36 files / 1132 tests; targeted ESLint; `vue-tsc`; and production build with
  4653 transformed modules in 1m19s. GitNexus detect reported 39 dirty files across the whole
  worktree, 0 affected processes, and low risk; this includes unrelated pre-existing local changes.
- Boundary: this is local WeChat quiet editorial browser/exact-artifact/sensitive-hygiene
  accounting only. It does not prove official editor paste, phone preview, mobile interaction,
  Dark Mode, cover thumbnail acceptance, sync, scheduled send, platform preview, public article
  rendering, or publish success.

## 2026-06-22 WeChat Toolbar Parameter Map Local Evidence

- [x] wechat-toolbar-parameter-map-local-evidence-20260622.txt
- [x] wechat-toolbar-parameter-map-local-artifact-20260622.html
- Generated the exact HTML artifact through the real WeChat path:
  `markdownToWechatWithStats(sourceMarkdown, getDefaultPreset(), options)`.
- Options exercised current renderer-owned toolbar mappings:
  `fontFamily=serif`, `fontSize=17px`, `primaryColor=#0F766E`, `enableTextIndent=true`,
  `enableCjkSpacing=true`, `enableEnhancedTable=true`, and `maxContentWidth=677`.
- The source Markdown is InkForge-owned and exercises title, paragraphs, blockquote, list, table,
  inline code, code block, font family, font size, primary color, line height, letter spacing,
  first-line indent, and content-width clamp. It does not contain 135/Xiumi template source,
  vendor class names, hosted media, credential/runtime capture artifacts, account-captured images,
  or local browser runtime material.
- Artifact hash:
  `sha256:f5e6487905e11bfc64e2998d553de45de29b372a87b584014076e38b49263e79`.
- Source Markdown hash:
  `sha256:c9be54a38b16d9765d8168bd1b47692a26db6f925aa32fa9cbebdb5a16f3d1cb`.
- Independent Node verification re-read the committed HTML, checked the hash, byte length 9058,
  parameter sentinels, structural sentinels, and structured sensitive / market-editor residue
  scan.
- CloakBrowser loaded a local read-only artifact preview and measured the committed artifact:
  `viewportWidth=1400`, `clamp.width=677`, `clamp.scrollWidth=677`, `bodyOverflowX=false`,
  `pageOverflowing=[]`, `styleElementCount=0`, `classAttrCount=0`, `foreignObjectCount=0`,
  `scriptCount=0`, `svgElementCount=0`, and `textLength=579`.
- Local DOM readback found `paragraph=5`, `h1=1`, `h2=1`, `blockquote=1`, `ul=1`,
  `table=1`, and `code=6`; parameter readback found `fontSize17=true`, `primaryColor=true`,
  `textIndent=true`, and `maxWidth677=true`.
- Browser-side `detectQuality(html, 'wechat')` still reports `wechat-line-height-zero`,
  `wechat-fixed-container-size`, `wechat-class-id-dependency`, `wechat-unsupported-css`,
  `wechat-layout-report-required`, and `render-html-table`. These are recorded blockers and are
  not treated as PC editor paste, phone preview, Dark Mode, sync, or publish proof.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one
  `wechat-toolbar-parameter-map` manifest. It claims only `unit-tested` and `local-browser`
  evidence and satisfies unit, local-browser, exact-artifact, and sensitive-hygiene accounting for
  this exact HTML artifact.
- Toolbar parameters that are not exposed by current `WechatExportOptions` remain rule and UI
  taxonomy only; they must not bypass `markdownToWechatWithStats` or the existing WeChat renderer.
- Current committed release-gate accounting remains blocked with `canClaimComplete=false`,
  `status=blocked-by-local-conflict`, `localManifestCount=19`, `wechatPcManifestCount=2`,
  `combinedManifestCount=21`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: temporary artifact generator, independent HTML evidence verification,
  CloakBrowser artifact readback, focused committed/local/release regression with 1 file /
  4 selected tests, full `platform-export-rendering.test.ts` regression with 1 file / 155 tests,
  four-file cross-platform export regression with 4 files / 194 tests, full export serial
  regression with 36 files / 1132 tests, targeted ESLint, `vue-tsc`, and production build with
  4653 transformed modules in 36.36s. `git diff --check` passed for the slice files, and GitNexus
  detect reported 39 dirty files across the whole working tree, 32 changed symbols, 0 affected
  processes, and low risk; the dirty-file count includes unrelated pre-existing files.
- Boundary: this is local WeChat toolbar-parameter browser/exact-artifact/sensitive-hygiene
  accounting only. It does not prove official editor paste, phone preview, mobile interaction,
  Dark Mode, sync, scheduled send, platform preview, public article rendering, or publish success.

## 2026-06-22 WeChat Cover Seal Divider Local Evidence

- [x] wechat-cover-seal-divider-local-evidence-20260622.txt
- [x] wechat-cover-seal-divider-local-artifact-20260622.html
- Generated the exact HTML artifact through the real WeChat path:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('flagship-kiln'), options)`.
- The source Markdown is InkForge-owned and exercises static SVG cover/seal/divider blocks:
  `cover-grid`, two `divider-forge` blocks, reading bar, H2/H3, callout, lede, list markers,
  footer, and endmark/seal motifs. It does not contain 135/Xiumi template source, vendor class
  names, hosted media, credential/runtime capture artifacts, account-captured images, or local
  browser runtime material.
- Artifact hash:
  `sha256:e8537db3ddff4b51b5fc6cd189d92cc71fdc9dcc7b8beea7879c7dc96ecfcb2f`.
- Source Markdown hash:
  `sha256:50fb494a48a0e320dda15913b793e65860fa9181b18969e25788310081c2dabd`.
- Independent Node verification re-read the committed HTML, checked the hash, byte length 15452,
  static SVG sentinels, block sentinels, and structured sensitive / market-editor residue scan.
- CloakBrowser loaded a local read-only artifact preview and measured the committed artifact:
  `viewportWidth=1400`, `clamp.width=677`, `clamp.scrollWidth=677`, `bodyOverflowX=false`,
  `pageOverflowing=[]`, `svgElementCount=16`, `styleElementCount=0`, `foreignObjectCount=0`,
  `imageInSvgCount=0`, `scriptCount=0`, and `textLength=503`.
- Local DOM readback found `cover-grid=1`, `divider-forge=2`, `flagship-callout=1`,
  `flagship-footer=1`, `flagship-h2=1`, `flagship-h3=1`, `flagship-lede=1`,
  `flagship-readbar=1`, and `flagship-ul=4`.
- Browser-side `detectQuality(html, 'wechat')` still reports `wechat-line-height-zero`,
  `wechat-fixed-container-size`, `wechat-class-id-dependency`, and
  `wechat-layout-report-required`. These are recorded as flagship-pipeline detector blockers and
  are not treated as PC editor paste, phone preview, Dark Mode, cover thumbnail, sync, or publish
  proof.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one
  `wechat-cover-seal-divider` manifest. It claims only `unit-tested` and `local-browser` evidence
  and satisfies unit, local-browser, exact-artifact, and sensitive-hygiene accounting for this
  exact HTML artifact.
- Current committed release-gate accounting remains blocked with `canClaimComplete=false`,
  `status=blocked-by-local-conflict`, `localManifestCount=18`, `wechatPcManifestCount=2`,
  `combinedManifestCount=20`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: temporary artifact generator, independent HTML evidence verification,
  CloakBrowser artifact readback, focused committed/local/release regression with 1 file /
  4 selected tests, full `platform-export-rendering.test.ts` regression with 1 file / 155 tests,
  four-file cross-platform export regression with 4 files / 194 tests, full export serial
  regression with 36 files / 1132 tests, targeted ESLint, `vue-tsc`, and production build with
  4653 transformed modules in 32.60s. `git diff --check` passed for the slice files, and GitNexus
  detect reported 39 dirty files across the whole working tree, 24 changed symbols, 0 affected
  processes, and low risk; the dirty-file count includes unrelated pre-existing files.
- Boundary: this is local WeChat cover/seal/divider browser/exact-artifact/sensitive-hygiene
  accounting only. It does not prove official editor paste, phone preview, mobile interaction,
  Dark Mode, cover thumbnail acceptance, sync, scheduled send, platform preview, public article
  rendering, or publish success.

## 2026-06-22 Market Live Recheck - 135 SVG and Xiumi

- [x] market-live-recheck-135-xiumi-20260622.txt
- CloakBrowser post-reboot recheck opened the live 135 SVG editor, clicked a visible
  `免费试用` effect, accepted the material-included confirmation, and read back an active
  `coverclickmovewithspread` block in the center editor.
- The sampled 135 block used a zero-font/zero-line-height wrapper and a background-only
  `viewBox="0 0 1080 1920"` SVG with `background-size:100.1% 100.1%`, `display:inline-block`,
  `margin-top:-1px`, `pointer-events:none`, `svg:135`, `user-select:none`, `vertical-align:top`,
  and `width:100%`.
- The 135 rule is retained as schema/gap-sealing evidence for InkForge-owned image slots, trigger
  zones, fallback, and layout reports. Copied 135 markers and hosted material remain
  market-editor residue.
- The same CloakBrowser profile opened Xiumi Studio v5 but stayed on the editor-selection/login
  surface after `图文排版` was clicked. This is login-state blocker evidence only, not Xiumi
  applied-editor DOM evidence.
- Final `npx gitnexus detect-changes -r InkForge --scope all` reported low risk, 37 dirty files
  across the whole working tree, 7 changed symbols, and 0 affected processes; the dirty-file count
  includes unrelated pre-existing local changes and does not define the staged boundary.
- Boundary: this is market-rule extraction and blocker evidence only. It does not prove official
  WeChat paste, phone preview, Dark Mode, cover thumbnail, credentialed sync, XHS/Zhihu upload,
  scheduled send, public rendering, or publish success.

## 2026-06-22 Style Proof External Checklist

- [x] style-proof-external-checklist-20260622.txt
- Added the read-only `getCommittedStyleProofExternalProofChecklistReport()` API to turn the
  current committed release-gate blockers into an operator handoff checklist.
- Current snapshot remains `status=blocked-by-external`, `canClaimComplete=false`,
  `blockerCount=4`, `groupCount=4`, `groupRowCount=44`, `uniqueChecklistRowCount=18`,
  `phoneRows=4`, `externalAccountRows=13`, `publicHostRows=1`, `mutatingRows=13`,
  `unsafeToAutomateRows=13`, and `safeToAutomateRows=0`.
- Checklist groups are `phone-preview`, `external-dependency`, `unsafe-to-automate`, and
  `mutating-platform`; local-only proof chores are intentionally excluded from the checklist rows.
- Verification passed: refreshed GitNexus index; impact analysis for the committed release gate,
  committed runbook report, and shared runbook; focused external-checklist Vitest with 1 file / 1
  selected test; full `platform-export-rendering.test.ts` with 1 file / 156 tests; full
  `src/services/export` serial regression with 36 files / 1133 tests; targeted ESLint;
  `vue-tsc`; production build with 4653 modules transformed in 30.78s; `git diff --check`; and
  GitNexus detect with low risk, 39 dirty files across the whole working tree, 19 changed
  symbols, and 0 affected processes. The dirty-file count includes unrelated pre-existing local
  changes.
- Boundary: this checklist is proof-collection handoff only. It does not prove official WeChat
  paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed
  sync, public host acceptance, scheduled send, platform preview, public rendering, XHS/Zhihu
  upload, or publish success.

## 2026-06-22 WeChat Card Rich Local Evidence

- [x] wechat-card-rich-local-evidence-20260622.txt
- [x] wechat-card-rich-local-artifact-20260622.html
- Generated the exact HTML artifact through the real WeChat path:
  `markdownToWechatWithStats(sourceMarkdown, getPresetById('flagship-tempera'), options)`.
- The source Markdown is InkForge-owned and exercises rich card blocks: data stat, comparison
  card, timeline, gallery track, citation card, list markers, reading bar, lede, H2/H3, footer,
  and cover SVG. It does not contain 135/Xiumi template source, vendor class names, hosted media,
  credential/runtime capture artifacts, account-captured images, or local browser runtime material.
- Artifact hash:
  `sha256:91a8c7ac75fc9a9359cc5cd6a6f9a407a7317bb300cf827403bc72e67e4d2990`.
- Source Markdown hash:
  `sha256:8448b9c82bd1175c115dba40e815601ab744fc1dfec0a1b5e5b6d8f378e0b3dd`.
- Independent Node verification re-read the committed HTML, checked the hash, byte length 24797,
  card-rich block sentinels, SVG sentinel, and structured sensitive / market-editor residue scan.
- CloakBrowser loaded a local read-only artifact preview and measured the committed artifact:
  `viewportWidth=1400`, `clamp.width=677`, `clamp.scrollWidth=677`, `bodyOverflowX=false`,
  `pageOverflowing=[]`, `svgElementCount=23`, `styleElementCount=0`, `foreignObjectCount=0`,
  `imageInSvgCount=0`, and `scriptCount=0`.
- The gallery block intentionally remains an internal horizontal track:
  `gallery.width=677`, `gallery.scrollWidth=1786`, `gallery.clientWidth=677`,
  `galleryOverflowX=true`. This is not page-level overflow.
- Local DOM readback found `flagship-stat=1`, `flagship-compare=1`, `flagship-timeline=1`,
  `flagship-gallery=1`, `flagship-citation=1`, `flagship-readbar=1`, `flagship-h2=1`,
  `flagship-h3=1`, `flagship-lede=1`, `flagship-ul=4`, `flagship-footer=1`, and
  `data-ink-svg="cover-title"=1`.
- Browser-side `detectQuality(html, 'wechat')` still reports `wechat-line-height-zero`,
  `wechat-fixed-container-size`, `wechat-class-id-dependency`, and
  `wechat-layout-report-required`. These are recorded as flagship-pipeline detector blockers and
  are not treated as PC editor paste, phone preview, Dark Mode, cover thumbnail, sync, or publish
  proof.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one `wechat-card-rich`
  manifest. It claims only `unit-tested` and `local-browser` evidence and satisfies unit,
  local-browser, exact-artifact, and sensitive-hygiene accounting for this exact HTML artifact.
- Current committed release-gate accounting remains blocked with `canClaimComplete=false`,
  `status=blocked-by-local-conflict`, `localManifestCount=17`, `wechatPcManifestCount=2`,
  `combinedManifestCount=19`, `combinedIssueCount=16`,
  `hasExactArtifactFingerprintConflicts=false`, and blocker kinds `local-conflict`,
  `phone-preview`, `external-dependency`, `unsafe-to-automate`, and `mutating-platform`.
- Verification passed: temporary artifact generator, independent HTML evidence verification,
  CloakBrowser artifact readback, focused committed/local/release regression with 1 file / 4
  selected tests, `platform-export-rendering.test.ts` with 1 file / 155 tests, 4-file
  cross-platform export regression with 4 files / 194 tests, full `src/services/export` serial
  regression with 36 files / 1132 tests, targeted ESLint, `vue-tsc`, and production build with
  4653 transformed modules in 36.58s. GitNexus detect reported 39 dirty files across the whole
  worktree, 20 changed symbols, 0 affected processes, and low risk; this includes unrelated
  pre-existing local changes.
- Boundary: this is local WeChat card-rich browser/exact-artifact/sensitive-hygiene accounting
  only. It does not prove official editor paste, phone preview, mobile interaction, Dark Mode,
  cover thumbnail acceptance, sync, scheduled send, platform preview, public article rendering, or
  publish success.

## 2026-06-21 Zhihu Clean Column Local Evidence

- [x] zhihu-clean-column-local-artifact-20260621.md
- [x] zhihu-clean-column-local-evidence-20260621.txt
- Generated a source-owned clean Zhihu Markdown artifact through the real local
  `markdownToZhihuClean(..., { tableHandling:'preserve', codeLangCoerce:true })` path.
- The persisted artifact hash is
  `sha256:eccc28007327ade6c6b05fd37567dd31632b9daada68b28aa7146afe8b64b329`; persisted bytes are
  563, exporter Markdown char count before the final file newline is 248, and pipeline
  `issues=[]`.
- Local hygiene check found no HTML tags, inline SVG, `data-ink-svg`, or `foreignObject`.
- `getCommittedStyleProofLocalEvidenceManifests()` now includes one `zhihu-clean-column`
  manifest. It satisfies local `unit-test-coverage`, `exact-artifact`, and
  `no-sensitive-artifact` rows only.
- The clean-column manifest intentionally does not claim `local-browser-rendering`,
  `public-image-host`, or `zhihu-artifact-manifest`.
- Current release-gate readout after this slice is `localManifestCount=8`,
  `combinedManifestCount=10`, `combinedIssueCount=13`,
  `hasExactArtifactFingerprintConflicts=false`, and `canClaimComplete=false`.
- Verification passed: focused committed/local/release runbook regression with 4 selected tests,
  full `platform-export-rendering.test.ts` with 153 tests, 4-file cross-platform export regression
  with 192 tests, full export serial suite with 35 files / 1126 tests, targeted ESLint,
  `vue-tsc`, and production build with 4652 transformed modules in 27.68s.
- Boundary: this is local Zhihu clean Markdown export and exact-artifact accounting only. It does
  not prove Zhihu public image-host acceptance, account upload, editor preview, sync, scheduled
  send, platform preview, public article rendering, or publish success.

## 2026-06-22 ExportModal External Checklist Surface

- [x] exportmodal-external-checklist-surface-20260622.txt
- ExportModal now displays the committed external proof checklist as a read-only operator surface.
- Current UI readback shows `外部证明清单 18 行；分组 4；手机 4；账号 13；public host 1；需人工 13`
  and four groups: `手机预览`, `外部依赖`, `需人工`, and `平台变更`.
- The release preflight row includes the same checklist summary while keeping
  `canClaimComplete=false` and the warning that publish, sync, phone preview, public host,
  scheduled send, platform preview, public rendering, upload, and publish success are not
  claimable.
- Verification passed: targeted ExportModal ESLint, `vue-tsc`, E2E script syntax check,
  production build, CloakBrowser desktop and mobile readback with no horizontal overflow, and
  real Tauri/WebView2 `svg-render.spec.cjs` with 1 spec / 6 tests.
- Boundary: this UI surface does not prove WeChat official editor paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, public host acceptance,
  Xiaohongshu upload, Zhihu upload, scheduled send, platform preview, public rendering, or publish
  success.

## 2026-06-22 Zhihu Clean-Primary Requirement Scope

- [x] zhihu-clean-primary-requirement-scope-20260622.txt
- `getStyleChoiceProofRequirements()` now scopes Zhihu `public-image-host` and
  `zhihu-artifact-manifest` to image-fallback primary outputs and the explicit upload checklist.
- Clean Markdown primary choices such as `zhihu-data-table` and `zhihu-clean-column` no longer
  inherit image fallback manifest requirements solely from their fallback path.
- Runtime readback after the change keeps the committed release gate
  `status=blocked-by-external`, `canClaimComplete=false`, and `blockerCount=4`; only local issue
  noise drops from `combinedIssueCount=13` to `combinedIssueCount=11`.
- Verification passed: focused style proof requirements / committed manifests / execution runbooks
  regression; full `platform-export-rendering.test.ts` with 156 tests; targeted ESLint; full
  `src/services/export` serial regression with 36 files / 1133 tests; `vue-tsc`; and production
  build with 4653 modules transformed in 33.90s.
- Boundary: this does not prove Zhihu public image-host acceptance, account upload, editor sync,
  scheduled send, platform preview, public rendering, or publish success.

## 2026-06-22 Style Proof Local Actionability

- [x] style-proof-local-actionability-20260622.txt
- Added the read-only `getCommittedStyleProofLocalActionabilityReport()` API above the committed
  release gate and external proof checklist.
- Current snapshot remains `status=blocked-by-external`, `canClaimComplete=false`,
  `blockerCount=4`, `safeLocalOpenRows=11`, `actionableLocalRows=0`,
  `catalogBlockedLocalRows=11`, `externalChecklistRows=18`, `externalChecklistGroupRows=44`,
  `phoneExternalRows=4`, `unsafeExternalRows=13`, `mutatingExternalRows=13`, and
  `safeExternalRows=0`.
- All current local safe open rows are `catalog-blocked`: their missing counts are fully explained
  by blocked catalog choices, so the report exposes no `nextLocalActionableRow`.
- External phone/account/public-host/platform rows stay in the external checklist and are not
  converted into local chores.
- Verification passed: focused `local actionability` Vitest with 1 file / 1 selected test; full
  `platform-export-rendering.test.ts` with 1 file / 157 tests; full `src/services/export` serial
  regression with 36 files / 1134 tests; targeted ESLint; `vue-tsc`; and production build with
  4653 modules transformed in 54.34s.
- Boundary: this is local actionability accounting only. It does not prove WeChat official editor
  paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed
  sync, public host acceptance, scheduled send, platform preview, public rendering, Xiaohongshu
  upload, Zhihu upload, or publish success.

## 2026-06-22 ExportModal Local Actionability Surface

- [x] exportmodal-local-actionability-surface-20260622.txt
- ExportModal now displays the committed local actionability report as a read-only style capability
  block.
- Current UI readback shows `本地可行动 0；目录阻断 11；安全本地 11；外部清单 18`.
- The visible groups are `本地可做` with 0 rows and `目录阻断` with 11 rows. The zero-actionable
  row says `当前没有可直接本地补证行；先处理目录阻断或外部证明`.
- The committed proof release preflight row includes `本地可行动 0` while keeping
  `canClaimComplete=false`.
- Verification passed: `node --check` for the WDIO spec, targeted ExportModal ESLint, focused
  local-actionability Vitest, `vue-tsc`, production build, real Tauri/WebView2
  `svg-render.spec.cjs` with 1 spec / 6 tests, and CloakBrowser narrow viewport readback at
  `390x844` with `document.scrollWidth=390`, `document.clientWidth=390`, panel `374/374`, local
  block `331/331`, and `overflowCount=0`.
- Boundary: this UI surface does not prove WeChat official editor paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, public host acceptance,
  Xiaohongshu upload, Zhihu upload, scheduled send, platform preview, public rendering, or publish
  success.

## 2026-06-22 Market Material Panel Residue Gate

- [x] market-live-recheck-135-xiumi-20260622.txt
- The same-day 135/Xiumi CloakBrowser recheck now has executable detector coverage for the newly
  observed material/parameter panel and visible Xiumi card-tree residue.
- `135 SVG material panel residue` blocks copied 135 panel fragments such as `editor-bar`,
  `editor-img__block`, `editor-spread__edit`, and `editor-background` on WeChat, Xiaohongshu, and
  Zhihu publishable outputs.
- The visible Xiumi card-tree fixture blocks `tn-tpl-item`, `tn-from-house-paper-cp`, and
  `section.tn-comp-pin.tn-comp-style-pin` authoring trees as `Xiumi tn-* authoring tree` on all
  three publishable output targets.
- Verification passed: focused market-editor Vitest with 6 selected tests, targeted ESLint, full
  `platform-export-rendering.test.ts` with 159 tests, and full serial `src/services/export`
  regression with 36 files / 1136 tests. `vue-tsc`, production build, and GitNexus impact/diff
  checks also passed with 0 affected processes; the staged commit boundary is 7 files.
- Boundary: this is local market-editor residue blocking only. It does not prove WeChat official
  editor paste, mobile trigger behavior, phone preview, Dark Mode, cover thumbnail acceptance,
  credentialed sync, public-host acceptance, account upload, scheduled send, platform preview,
  public rendering, or publish success.

## 2026-06-26 135 SVG Material Panel Child Controls

- [x] 135-svg-material-panel-child-controls-residue-20260626.txt
- CloakBrowser inspection of the 135 SVG right-side settings panel found child-only controls for
  image slots and animation settings: `edit-image`, `image__title-bar`, `edit-add-images`,
  `edit-add-btn`, `edit-add__title`, `edit-animate`, `edit-animate__title`,
  `edit-animate__opt`, and `animate__dur`.
- A reduced regression now proves those children fail as `135 SVG material panel residue` even
  when parent `editor-bar`, `editor-img`, and `editor-course` wrappers are absent.
- Verification passed: red/green focused platform rendering test, full platform rendering test,
  full export serial regression, targeted ESLint, `vue-tsc`, production build, and release
  preflight expected external blocker.
- Boundary: this is local detector/test enforcement only. It does not prove WeChat paste, phone
  preview, mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public article rendering, XHS/Zhihu account upload, public
  host, or publish success.

## 2026-06-22 Xiumi Applied SVG Sample CloakBrowser Probe

- [x] xiumi-applied-svg-sample-cloakbrowser-20260622.txt
- In the already-open Xiumi v5 paper editor, clicking the `SVG` category expanded the library from
  23 to 43 template items and exposed SVG interaction subcategories such as image carousel, click
  expand, path animation, transition, click switch, flip, zoom, quiz, click show, popup, click play,
  long-press switch, and region trigger.
- Clicking the first visible SVG image-gallery sample changed the center `.tn-editing-panel` from
  21 to 51 `tn-comp` nodes, 9 to 27 `tn-cell` nodes, 78 to 81 images, and 1 to 2 contenteditable
  cells, while center literal SVG stayed 0.
- The applied center exposed `tn-animate`, `tn-link`, `tn-uuid`, `opera-tn-ra-*`,
  `tn-image-presenter raw-image`, `tn-content-overlap`, `ui-sortable`, `ui-slider`, Angular
  runtime attributes, and hosted `statics.xiumi.us` references. Existing detector families already
  block these as Xiumi authoring residue if copied into publishable output.
- Boundary: this is applied-editor DOM learning only. It does not prove WeChat official editor
  paste, mobile rendering, Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send,
  public-host acceptance, Xiaohongshu upload, Zhihu upload, platform preview, public rendering, or
  publish success.

## 2026-06-23 Public Source Refresh

- [x] public-source-refresh-20260623.txt
- Grok Search direct fetch confirmed the WeChat official editor plugin specification, MP editor
  JSAPI, H5 DarkMode guide, and doocs/md architecture reference are still the relevant public
  sources for this slice.
- Same-day recheck: Grok session `10428e903db8` and Exa cross-search reconfirmed the same official
  WeChat plugin-spec / H5 DarkMode / MP Editor JSAPI boundaries; no code or catalog availability
  change was required.
- WeChat official docs reinforce the existing hard-blocker families: opacity-hidden images below
  SVG backgrounds, `line-height:0`, fixed width/height containers, `text-align:start/end`,
  `touchstart`-only SVG triggers, ordinary prose inside `<pre>`, invalid/deep article structure,
  font-family drift, SVG text Dark Mode risk, `data-no-dark` current-node scope, and unsafe
  `!important`.
- WeChat MP editor JSAPI remains credentialed-channel runbook material only; API existence does not
  prove InkForge paste, phone preview, sync, cover acceptance, scheduled send, or publish success.
- doocs/md remains an OSS architecture benchmark for Markdown parsing, CSS inlining, sanitization,
  and themed HTML output, not a second renderer or platform proof.
- Xiaohongshu's public creator entry stayed login-gated; Zhihu public search produced community or
  open-source references rather than official hard specs. Both platforms keep upload, platform
  preview, public rendering, public-host, and publish gates open until exact platform evidence
  exists.
- Boundary: this docs-only refresh does not prove WeChat official editor paste, phone preview,
  mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, public-host
  acceptance, Xiaohongshu upload, Zhihu upload, scheduled send, platform preview, public rendering,
  or publish success.

## 2026-06-23 Style Proof External Handoff Report

- [x] style-proof-external-handoff-20260623.txt
- Added `getCommittedStyleProofExternalHandoffReport()` as a read-only composition above the
  committed release gate, external proof checklist, and local actionability reports.
- Current readback remains `status=blocked-by-external`, `canClaimComplete=false`,
  `canContinueLocally=false`, `requiresOperator=true`, `requiresPhone=true`,
  `requiresExternalAccount=true`, `requiresPublicHost=true`,
  `containsUnsafeToAutomateRows=true`, and `containsMutatingPlatformRows=true`.
- Current counts are `externalHandoffRows=18`, `externalHandoffGroups=4`, `phoneRows=4`,
  `externalAccountRows=13`, `publicHostRows=1`, `unsafeToAutomateRows=13`, `mutatingRows=13`,
  `safeExternalRows=0`, `safeLocalOpenRows=11`, `actionableLocalRows=0`, and
  `catalogBlockedLocalRows=11`.
- Verification passed: focused external-handoff Vitest with 1 selected test, full
  `platform-export-rendering.test.ts` with 160 tests, and targeted ESLint for the changed export
  service files.
- Boundary: this handoff report does not prove WeChat official editor paste, phone preview,
  mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, public-host
  acceptance, Xiaohongshu upload, Zhihu upload, scheduled send, platform preview, public rendering,
  or publish success.

## 2026-06-23 ExportModal External Handoff Surface

- [x] exportmodal-external-handoff-surface-20260623.txt
- ExportModal now displays `getCommittedStyleProofExternalHandoffReport()` as a read-only operator
  handoff block inside the style capability area.
- Current UI readback shows `外部交接 18 行；分组 4；安全外部 0；本地可行动 0`.
- The five visible handoff categories are `手机 4`, `账号 13`, `公网 1`, `人工 13`, and
  `平台变更 13`.
- The visible reason says `没有可本地自动化的安全外部证明行` and keeps credentialed, phone,
  public-host, sync, and publish work outside local automation.
- Verification passed: GitNexus analyze/impact, `node --check` for the WDIO spec, targeted
  ExportModal ESLint, `vue-tsc`, focused handoff/checklist/actionability Vitest, production build,
  real Tauri/WebView2 `svg-render.spec.cjs` with 1 spec / 6 tests, full serial
  `src/services/export` regression with 36 files / 1,137 tests, and CloakBrowser narrow viewport
  readback at `390x844` with document/body `390/390`, panel `374/374`, handoff `331/331`, and
  `overflowingCount=0`.
- Boundary: this UI surface does not prove WeChat official editor paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, public-host acceptance,
  Xiaohongshu upload, Zhihu upload, scheduled send, platform preview, public rendering, or publish
  success.

## 2026-06-23 Style Proof Manifest Intake Report

- [x] style-proof-manifest-intake-20260623.txt
- Added `getStyleProofManifestIntakeReport(input)` as the runtime-safe local intake/preflight entry
  for redacted `StyleProofManifest` packs supplied by an operator or external proof collection
  workflow.
- Accepted inputs are an array of manifest-like objects, a `{ manifests: [...] }` object, or one
  manifest-like object. Invalid roots and schema-invalid manifests are rejected before reaching the
  existing semantic validator.
- Unknown manifest/artifact fields are warning-level schema issues and are dropped from sanitized
  accepted manifests. Unsafe or sensitive accepted artifacts still flow into the existing semantic
  issue ids.
- Verification passed: focused `platform-export-rendering.test.ts` run with 5 selected
  manifest/intake tests; full `platform-export-rendering.test.ts` with 163 tests; full serial
  `src/services/export` regression with 36 files / 1140 tests; targeted ESLint; `vue-tsc`;
  production build with 4653 modules transformed; and GitNexus detect-changes with 0 affected
  processes.
- Boundary: this is local intake accounting only. It does not prove WeChat official editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  public-host acceptance, Xiaohongshu upload, Zhihu upload, scheduled send, platform preview,
  public rendering, or publish success.

## 2026-06-23 Style Proof Manifest JSON Intake Report

- [x] style-proof-manifest-json-intake-20260623.txt
- Added `getStyleProofManifestJsonIntakeReport(jsonText)` as the safe JSON-string companion for
  redacted external proof manifest packs.
- Valid JSON delegates into `getStyleProofManifestIntakeReport()`. Empty or malformed JSON returns
  a normal schema-invalid intake report with one root rejected row and
  `style-proof-manifest-intake-json-invalid` instead of throwing parse errors.
- Verification passed: focused `platform-export-rendering.test.ts` run with 7 selected
  manifest/intake/JSON-intake tests; full `platform-export-rendering.test.ts` run with 165 tests;
  serial `src/services/export` run with 36 files / 1142 tests; target ESLint; `vue-tsc`; and
  production build with 4653 modules transformed in 36.64s. GitNexus staged detect reported low
  risk, 8 staged files, 14 touched symbols, and 0 affected processes.
- Boundary: this is local JSON parse safety only. It does not prove WeChat official editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  public-host acceptance, Xiaohongshu upload, Zhihu upload, scheduled send, platform preview,
  public rendering, or publish success.

## 2026-06-23 Style Proof Manifest JSON Size Guard

- [x] style-proof-manifest-json-size-guard-20260623.txt
- Added a 2,000,000 character pre-parse guard to `getStyleProofManifestJsonIntakeReport(jsonText)`.
- Oversized JSON-string input returns a normal schema-invalid intake report with one root rejected
  row and `style-proof-manifest-intake-json-too-large`.
- Verification passed: focused `platform-export-rendering.test.ts` run with 8 selected
  manifest/intake/JSON-intake tests; full `platform-export-rendering.test.ts` run with 166 tests;
  serial `src/services/export` run with 36 files / 1143 tests; target ESLint; `vue-tsc`; and
  production build with 4653 modules transformed in 37.62s. GitNexus staged detect reported low
  risk, 7 staged files, 5 changed symbols, and 0 affected processes.
- Boundary: this is local JSON intake resource protection only. It does not prove WeChat official
  editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, public-host acceptance, Xiaohongshu upload, Zhihu upload, scheduled send,
  platform preview, public rendering, or publish success.

## 2026-06-23 Style Proof Manifest Cardinality Guard

- [x] style-proof-manifest-cardinality-guard-20260623.txt
- Added root manifest-pack and per-manifest artifact-array cardinality guards to the local intake
  boundary.
- Packs above 128 manifests return `style-proof-manifest-intake-manifest-count-too-large`.
- Manifests above 512 artifacts return `style-proof-manifest-intake-artifact-count-too-large`.
- Oversized inputs fail closed and do not truncate partial proof into accepted manifests.
- Verification passed: focused `platform-export-rendering.test.ts` run with 10 selected
  manifest/intake/JSON-intake tests; full `platform-export-rendering.test.ts` run with 168 tests;
  serial `src/services/export` run with 36 files / 1145 tests; target ESLint; `vue-tsc`; and
  production build with 4653 modules transformed in 36.09s. GitNexus staged detect reported low
  risk, 7 staged files, 9 changed symbols, and 0 affected processes.
- Boundary: this is local proof-handoff resource protection only. It does not prove WeChat official
  editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, public-host acceptance, Xiaohongshu upload, Zhihu upload, scheduled send,
  platform preview, public rendering, or publish success.

## 2026-06-23 WeChat Home Authenticated CloakBrowser Readback

- [x] wechat-home-authenticated-cloakbrowser-readback-20260623.txt
- CloakBrowser-only read-only check confirmed the live WeChat Official Account backend home page was
  readable in the existing InkForge browser context.
- Observed home/dashboard navigation signals included 首页, 草稿箱, 素材库, 发表记录, 内容管理, and
  设置与开发. Account label, draft titles, published titles, credential material, and local browser
  details are redacted and not recorded.
- The page was not an editor surface: `contenteditableCount=0` and `iframeCount=0`.
- Boundary: this is authenticated-home session evidence only. It does not prove WeChat official
  editor paste, PC editor DOM readback, phone preview, mobile interaction, Dark Mode, cover
  thumbnail acceptance, credentialed sync, public preview, scheduled send, public rendering, or
  publish success.

## 2026-06-23 Market Live DOM Study - 135 SVG Editor and Xiumi Studio

- [x] market-live-dom-135-xiumi-20260623.txt
- CloakBrowser-only live DOM study of 135 SVG editor and Xiumi Studio v5.
- 135: clicked a visible free-trial SVG item, accepted the material-included confirmation, and read
  the center editor DOM. Active `multiselectpopup` used a zero-flow wrapper, 1080-wide background
  SVG, `background-size:100.1% 100.1%`, `margin-top:-1px`, `pointer-events:none`, and absolute
  percentage trigger zones.
- Xiumi: opened the SVG taxonomy and clicked the first SVG card. The library exposed rich SVG
  categories and wrapper-heavy `tn-*` preview structures, but the center editor readback contained
  no visible inline SVG after that click, so it remains taxonomy/wrapper evidence rather than
  applied interactive SVG proof.
- Boundary: this is market-rule extraction only. It does not prove WeChat editor paste, phone
  preview, mobile interaction, Dark Mode, cover thumbnail acceptance, sync, public preview,
  scheduled send, public rendering, Xiumi account save, 135 export, XHS/Zhihu upload, or publish
  success.

## 2026-06-23 WeChat Market SVG/H5 Fallback Matrix Runtime Refresh

- [x] wechat-market-svg-h5-fallback-matrix-20260623.txt
- Expanded the executable `wechat-market-svg-h5-fallback-matrix` content family map with the
  observed 135/Xiumi/public-source categories: background SVG shell, click show/hide, click
  switch, slide trigger, card/title/divider/cover structures, text marquee, quiz/game, typed
  image-slot manifest, trigger-zone manifest, and external H5 handoff boundary.
- Kept the choice blocked, mobile-only, unmapped from style applications, and gated by
  phone-preview plus publish proof.
- Added catalog blockers for 135 background-SVG shells, source-owned layout reports, image-slot
  manifests, trigger-zone manifests, static/raster fallback, and Xiumi wrapper/image-layer trees
  that do not prove center inline SVG.
- Added a blocker that keeps external H5 pages, vendor H5 packages, and plugin/sync handoffs as
  publish-checklist states until the exact InkForge artifact has platform preview or publish proof.
- Verification passed: TDD red run for the missing runtime taxonomy fields; post-fix focused
  `unproven market-inspired` rerun; focused `platform-export-rendering.test.ts` run with 3
  selected availability/application/market tests; full `platform-export-rendering.test.ts` run with
  171 tests; serial `src/services/export` run with 36 files / 1148 tests; targeted ESLint;
  `vue-tsc`; production build with 4653 modules transformed in 33.05s; path-scoped
  `git diff --check`; and GitNexus low-risk impact/detect.
- Boundary: this is local runtime-catalog accounting only. It does not prove WeChat editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, sync, public preview,
  scheduled send, public rendering, XHS/Zhihu upload, or publish success.

## 2026-06-23 ExportModal WeChat Market Fallback CloakBrowser Smoke

- [x] exportmodal-wechat-market-fallback-cloakbrowser-20260623.txt
- CloakBrowser-only local UI smoke at 390 x 844 using the real local Workstation and Publish flow.
- ExportModal readback: `documentElement.scrollWidth=390`, `body.scrollWidth=390`,
  `overflowCount=0`, `hasModal=true`.
- WeChat style capability stayed `当前可用 8/17`; committed proof stayed `canClaimComplete=false`
  with `blockers 4`; external handoff stayed `外部交接 18 行`, `安全外部 0`, and `本地可行动 0`.
- `Market SVG/H5 fallback matrix` rendered as a disabled blocked choice, not a selectable action.
- Boundary: this is local UI layout and blocked-choice display evidence only. It does not prove
  WeChat editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  sync, public preview, scheduled send, public rendering, XHS/Zhihu upload, or publish success.

## 2026-06-23 Style Proof Manifest String Field Guard

- [x] style-proof-manifest-string-field-guard-20260623.txt
- Added a 4,096 character guard for required and optional local intake string fields.
- Oversized string fields return `style-proof-manifest-intake-field-too-large`.
- Oversized string inputs fail closed and do not truncate partial proof into accepted manifests.
- Verification passed: focused `platform-export-rendering.test.ts` run with 11 selected
  manifest/intake/JSON-intake tests; full `platform-export-rendering.test.ts` run with 169 tests;
  serial `src/services/export` run with 36 files / 1146 tests; target ESLint; `vue-tsc`; and
  production build with 4653 modules transformed in 46.34s. GitNexus staged detect reported low
  risk, 7 staged files, 7 changed symbols, and 0 affected processes.
- Boundary: this is local proof-handoff resource protection only. It does not prove WeChat official
  editor paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, public-host acceptance, Xiaohongshu upload, Zhihu upload, scheduled send,
  platform preview, public rendering, or publish success.

## 2026-06-23 WeChat Draft Box Authenticated CloakBrowser Readback

- [x] wechat-draftbox-authenticated-cloakbrowser-readback-20260623.txt
- CloakBrowser-only read-only check confirmed the live WeChat Official Account backend draft-box
  list was reachable after the authenticated home/dashboard shell.
- Draft-box readback used sanitized backend URL category `https://mp.weixin.qq.com/cgi-bin/appmsg`
  and reported `iframe=0`, `contenteditable=0`, `ProseMirror=0`, `textarea=0`, `input=1`, and
  `appmsgItems=118`.
- The observed new-creation control was not activated; existing draft cards were not opened.
- Account labels, draft titles, published titles, credential query parameters, account images,
  runtime capture locations, and local browser-state details are redacted and not recorded.
- Verification passed: docs/evidence `git diff --check`, staged redaction scan, and GitNexus
  staged detect with `No changes detected`.
- Boundary: this is authenticated draft-box list evidence only. It does not prove WeChat editor
  reachability, PC editor DOM readback, paste, exact-artifact proof, safe-disposable-draft proof,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, sync, scheduled send,
  platform preview, public rendering, or publish success.

## 2026-06-23 WeChat New Creation Menu CloakBrowser Readback

- [x] wechat-new-creation-menu-cloakbrowser-readback-20260623.txt
- CloakBrowser-only read-only check opened the draft-box new-creation dropdown without activating
  any child option.
- The menu exposed `文章`, `选择已有内容`, `贴图`, `视频`, `播客`, and `转载`.
- Editor-surface counts stayed `iframe=0`, `contenteditable=0`, `ProseMirror=0`, `textarea=0`,
  `input=1`; no editor route or editor link was proven by this menu readback.
- Verification passed: docs/evidence `git diff --check`, staged redaction scan, and GitNexus
  staged detect with `No changes detected`.
- Boundary: this is route-discovery evidence only. It does not prove WeChat editor reachability,
  PC editor DOM readback, paste, exact-artifact proof, safe-disposable-draft proof, phone preview,
  mobile interaction, Dark Mode, cover thumbnail acceptance, sync, scheduled send, platform
  preview, public rendering, or publish success.

## 2026-06-23 WeChat Safe Disposable Draft Preflight Blocker

- [x] wechat-safe-disposable-draft-preflight-blocker-20260623.txt
- CloakBrowser-only read-only metadata scan found that the visible article/create menu option did
  not expose a sanitized `href`, `data-url`, or `data-action` route.
- A separate article-template link exposed only `https://mp.weixin.qq.com/cgi-bin/appmsgtemplate`;
  this is not the proof target editor route.
- Existing generic untitled draft labels were present, so creating another blank/untitled draft
  would make cleanup ambiguous.
- The slice therefore did not activate the article/create menu option and keeps
  `safe-disposable-draft`, editor reachability, PC editor DOM readback, and paste unclaimed.
- Verification passed: docs/evidence `git diff --check`, staged redaction scan, and GitNexus
  staged detect with `No changes detected`.
- Boundary: this is preflight blocker evidence only. It does not prove WeChat editor reachability,
  PC editor DOM readback, paste, exact-artifact proof, safe-disposable-draft proof, phone preview,
  mobile interaction, Dark Mode, cover thumbnail acceptance, sync, scheduled send, platform
  preview, public rendering, or publish success.

## 2026-06-23 Style Proof Safe Disposable Draft Preflight Blocker Fields

- [x] style-proof-safe-disposable-draft-preflight-blockers-20260623.txt
- Added executable manifest blocker fields for read-only WeChat safe-draft preflight evidence:
  `createRouteActionMetadataMissing` and `cleanupTargetAmbiguous`.
- Added semantic issue ids `style-proof-manifest-create-route-action-missing` and
  `style-proof-manifest-cleanup-target-ambiguous`.
- Intake accepts both boolean fields without schema warnings, but semantic validation invalidates
  the artifact and keeps `safe-disposable-draft` in acceptance-audit `cannotClaim`.
- Verification passed: TDD red run for the new route-discovery preflight regression; post-fix
  focused route-discovery regression; 23 selected proof/acceptance/runbook tests; full
  `platform-export-rendering.test.ts` with 170 tests; full serial `src/services/export` with 36
  files / 1147 tests; targeted ESLint; `vue-tsc`; and production build with 4653 modules
  transformed in 31.46s.
- Boundary: this is local cannot-claim enforcement only. It does not prove WeChat editor
  reachability, PC editor DOM readback, paste, exact-artifact proof, safe-disposable-draft creation
  or cleanup, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, sync,
  scheduled send, platform preview, public rendering, or publish success.

## 2026-06-23 Style Proof Redaction Review Gate

- [x] style-proof-redaction-review-gate-20260623.txt
- Added manifest fields `redactionReviewRequired` and `redactionVerified` for platform visible-text
  evidence hygiene.
- Added semantic issue id `style-proof-manifest-redaction-review-missing`.
- Intake accepts both boolean fields without schema warnings, while semantic validation keeps a
  `redactionReviewRequired:true` artifact invalid until `redactionVerified:true` is recorded.
- Verification passed: TDD red run for the unknown redaction fields; focused visible-text
  regression; 21 selected manifest/intake/sensitive/proof/acceptance tests; full
  `platform-export-rendering.test.ts` with 171 tests; full serial `src/services/export` with 36
  files / 1148 tests; targeted ESLint; `vue-tsc`; and production build with 4653 modules
  transformed in 34.94s.
- Boundary: this is local evidence-hygiene accounting only. It does not prove WeChat editor
  reachability, PC editor DOM readback, paste, exact-artifact proof, safe-disposable-draft creation
  or cleanup, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, sync,
  scheduled send, platform preview, public rendering, upload, or publish success.

## 2026-06-23 Public Market Taxonomy and Platform Boundary Review

- [x] market-public-taxonomy-platform-boundary-20260623.txt
- Used Grok search sessions `50ecebc6b723`, `31150d11bddd`, `df08e1ab933d`, and `347737359f24`.
- Recorded public-source taxonomy for WeChat SVG/H5 market editor families: background SVG, click
  reveal/switch, carousel, slide trigger, area trigger, path/parallax, quiz/game, card, title,
  divider, cover, and image-slot manifests.
- Preserved conservative XHS and Zhihu boundaries: XHS rich content remains text plus image/card
  artifacts; Zhihu rich content remains clean Markdown plus platform/public hosted images.
- Boundary: this is public-source research and docs-only evidence. It does not prove WeChat editor
  paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, sync,
  public-host acceptance, XHS/Zhihu account upload, scheduled send, platform preview, public
  rendering, or publish success.

## 2026-06-23 WeChat Home New-Creation Route Blocker

- [x] wechat-home-new-creation-route-blocker-20260623.txt
- CloakBrowser-only read-only check reached the authenticated backend home surface at sanitized URL
  category `https://mp.weixin.qq.com/cgi-bin/home`.
- Aggregate counts: `iframe=0`, `contenteditable=0`, `ProseMirror=0`, `textarea=0`, `input=0`,
  `svg=63`, `editorLike=0`, `appmsgLinks=19`.
- Generic new-creation entries were visible for article, existing-content selection, sticker/image,
  video, reprint, and podcast, but the entries did not expose sanitized `href`, `data-url`, or
  `data-action` metadata in the read-only scan.
- Existing draft and published labels were visible in the browser surface but remain redacted and
  are not committed.
- Boundary: this is backend-home reachability and route-blocker evidence only. It does not prove
  WeChat editor reachability, PC editor DOM readback, paste, exact-artifact proof,
  safe-disposable-draft proof, phone preview, mobile interaction, Dark Mode, cover thumbnail
  acceptance, sync, scheduled send, platform preview, public rendering, upload, or publish success.

## 2026-06-23 ExportModal Market Fallback Local CloakBrowser Smoke

- [x] exportmodal-market-fallback-local-cloakbrowser-smoke-20260623.txt
- Reused the existing local Vite server on `http://127.0.0.1:3005/` and opened a real local
  Workstation draft through the UI.
- At `390x844`, Home and Workstation both measured `document.scrollWidth=390`,
  `document.clientWidth=390`, `body.scrollWidth=390`, and `body.clientWidth=390`.
- The Workstation editor was real and non-empty at the DOM boundary:
  `contenteditable/textarea=1`, `ProseMirror=1`, `buttons=32`, `svg=35`.
- The local Publish panel opened from the real button and returned `dialogs=7`, `buttons=88`,
  `disabledButtons=11`, and `styleChoiceRows=262`.
- WeChat/XHS/Zhihu style/proof/blocker terms were visible, and the WeChat
  `Market SVG/H5 fallback matrix` row remained blocked/non-applicable with the external-H5/plugin
  sync blocker visible.
- Boundary: this is local UI visibility and layout smoke only. It does not prove WeChat editor
  paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, sync, scheduled
  send, platform preview, public rendering, XHS/Zhihu upload, or publish success.

## 2026-06-23 Style Proof External Handoff Packet

- [x] style-proof-external-handoff-packet-20260623.txt
- Added a deterministic committed-proof operator packet and Markdown formatter:
  `getCommittedStyleProofExternalHandoffPacket()` and
  `formatCommittedStyleProofExternalHandoffPacketMarkdown()`.
- Packet snapshot remains `status=blocked-by-external`, `canClaimComplete=false`,
  `canContinueLocally=false`, `safeExternalRows=0`, `externalHandoffRows=18`,
  `phoneRows=4`, `externalAccountRows=13`, `publicHostRows=1`,
  `unsafeToAutomateRows=13`, and `mutatingRows=13`.
- Markdown rows include required channels/actions/readbacks, required and forbidden evidence
  fields, accepted host statuses, freshness, redaction boundary, success criteria, failure signals,
  cannot-claim reason, and next operator action.
- Verification passed: TDD red run for the missing packet API; focused packet regression passed 1
  selected test; adjacent checklist/actionability/handoff/release selected run passed 5 tests; full
  `platform-export-rendering.test.ts` passed 172 tests; full serial `src/services/export` passed
  36 files / 1149 tests; targeted ESLint, `vue-tsc`, production build, staged diff check,
  sensitive-fragment scan, and GitNexus staged detect passed.
- Boundary: this is local operator handoff formatting only. It does not prove WeChat editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public rendering, public-host acceptance, XHS/Zhihu upload, or
  publish success.

## 2026-06-23 ExportModal External Handoff Packet UI

- [x] exportmodal-external-handoff-packet-ui-20260623.txt
- ExportModal now exposes the deterministic external handoff packet in the local Publish modal by
  consuming `getCommittedStyleProofExternalHandoffPacket()` and
  `formatCommittedStyleProofExternalHandoffPacketMarkdown()`.
- The copy action uses the existing local clipboard helper and changes only local feedback state.
  It does not mark platform proof complete.
- CloakBrowser local smoke used a real local Workstation article and the real Publish modal. At
  `390x844`, readback showed `scrollWidth=390`, `bodyScrollWidth=390`, `handoffVisible=true`,
  `actionVisible=true`, `copyButtonPresent=true`, `flagCount=5`, `checklistGroupCount=4`,
  `overflowing=false`, and `modalWidth=374`.
- Hit-test readback showed the button visible, enabled, and not covered; DOM handler smoke verified
  the Vue binding and success feedback text.
- Verification passed: targeted ExportModal ESLint, `vue-tsc`, production build, docs/evidence
  diff check, staged redaction scan, and GitNexus staged detect.
- Boundary: this is local UI reachability, layout safety, and Vue handler wiring only. It does not
  prove operating-system clipboard contents, WeChat editor paste, phone preview, mobile interaction,
  Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send, platform preview, public
  rendering, public-host acceptance, XHS/Zhihu upload, or publish success.

## 2026-06-23 135/Xiumi Applied SVG DOM Learning

- [x] market-editor-applied-dom-135-xiumi-20260623.txt
- Used CloakBrowser only.
- 135 SVG editor applied readback: visible `免费试用` effect -> material prompt `不需要` -> center
  canvas rendered five `section + svg` blocks with safe wrapper spacing, portrait view boxes,
  background image SVG frames, seam compensation, and explicit trigger/image/timing guidance in the
  right panel.
- Xiumi paper editor applied readback: cancelled old draft recovery -> SVG category -> visible SVG
  style card -> center document changed to a nested article component tree with `section=14`,
  `svg=12`, `foreignObject=4`, `animate=2`, `rect=2`, and text paragraph nodes.
- Updated docs/spec mappings for source-owned wrapper rules, image-slot manifests, trigger-zone
  manifests, layout reports, fallback rules, and market-editor residue blocking.
- Boundary: this is market-editor applied DOM learning only. It does not prove WeChat editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public rendering, public-host acceptance, XHS/Zhihu upload, or
  publish success.

## 2026-06-23 Xiumi Applied SVG Detector Regression

- [x] xiumi-applied-svg-foreignobject-detector-20260623.txt
- Added a regression fixture for a Xiumi-like applied SVG tree with `tn-*` authoring metadata,
  SVG background layers, `foreignObject` text, and SMIL `animate`.
- The regression asserts all three platform residue gates stay blocking and WeChat additionally
  reports `wechat-unsafe-svg-construct` for `foreignObject`.
- Verification passed: 1 selected regression, full `platform-export-rendering.test.ts` with 173
  tests, targeted ESLint, full serial `src/services/export` with 36 files / 1150 tests, and
  `vue-tsc --noEmit`.
- Boundary: this is local detector regression coverage only. It does not prove WeChat editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public rendering, public-host acceptance, XHS/Zhihu upload, or
  publish success.

## 2026-06-23 Xiumi Applied SVG Content-Layer Residue

- [x] xiumi-applied-svg-content-layer-residue-20260623.txt
- Added a production detector rule for Xiumi applied SVG content-layer classes on SVG/SMIL
  elements: `svg-layout-content`, `root-svg`, `rect-content`, and `fade-self-animation`.
- Added a reduced fixture without `tn-*` wrappers or Xiumi-hosted backgrounds to ensure cleaned
  copied SVG still fails as market-editor residue on WeChat, Xiaohongshu, and Zhihu.
- TDD red run failed before implementation because `wechat-market-editor-residue` was absent; the
  focused green run passed after adding the detector rule.
- Verification passed: full `platform-export-rendering.test.ts` with 174 tests, targeted ESLint,
  full serial `src/services/export` with 36 files / 1151 tests, `vue-tsc --noEmit`, and production
  build.
- Boundary: this is local quality-detector hardening only. It does not prove WeChat editor paste,
  phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync,
  scheduled send, platform preview, public rendering, public-host acceptance, XHS/Zhihu upload, or
  publish success.

## 2026-06-23 WeChat Home Article Create Click Blocker

- [x] wechat-home-article-create-click-blocker-20260623.txt
- CloakBrowser-only readback confirmed authenticated WeChat home visibility and a visible
  `新的创作` / `文章` creation card.
- Three CloakBrowser click attempts against the visible card/container/content did not enter the
  article editor.
- Final readback remained on the sanitized home route with `contenteditableCount=0`,
  `iframeCount=0`, no `#js_appmsg_editor`, and no `#ueditor_0`.
- Boundary: this is authenticated home visibility and route blocker evidence only. It does not
  prove WeChat editor creation, PC paste, phone preview, mobile interaction, Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, platform preview, public rendering,
  public-host acceptance, XHS/Zhihu upload, or publish success.

## 2026-06-23 WeChat Draftbox Editor Entry Click Blocker

- [x] wechat-draftbox-editor-entry-click-blocker-20260623.txt
- CloakBrowser-only readback confirmed authenticated WeChat draftbox list reachability at the
  sanitized route category `action=list_card` / `type=77`.
- Safe visible labels included `草稿箱`, `文章模板`, and `新的创作`; draft card/container wrappers
  were present.
- Publish/send controls were observed only as route-risk markers and were not clicked.
- `新的创作`, existing draft-title, edit-pencil, and draft-card-inner click paths did not expose the
  article editor.
- A native pointer/mouse/click dispatch against `新的创作` also remained on draftbox and exposed no
  creation menu/editor.
- Final editor signals remained absent: `iframeCount=0`, `contenteditableCount=0`, no
  `#js_appmsg_editor`, no `#ueditor_0`, no `.ProseMirror`, no `.rich_media_content`, and no visible
  modal.
- Boundary: this is authenticated draftbox list reachability and standard-click blocker evidence
  only. By itself it does not prove WeChat editor reachability, PC paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send, platform
  preview, public rendering, public-host acceptance, XHS/Zhihu upload, or publish success.

## 2026-06-23 WeChat Editor Entry Surface Readback

- [x] wechat-editor-entry-surface-readback-20260623.txt
- CloakBrowser-only editor-entry run used the page's own Vue parent `createMsg(0)` article action
  after standard selector clicks stayed blocked by stable-position checks.
- `window.open` was temporarily redirected to same-tab navigation so CloakBrowser could keep the
  official editor as the active page.
- Captured route category: `action=edit`, `type=10`, `t=media/appmsg_edit_v2`; credential query
  parameters were redacted.
- Final active route category: `appmsg-edit-like`.
- Editor readback returned `#js_appmsg_editor=1`, `#ueditor_0=1`, `.ProseMirror=2`,
  `.rich_media_content=1`, `contenteditable=3`, `iframe=1`, `textarea=2`, `input=53`, `svg=9`,
  and `button=18`.
- A visible title ProseMirror editor with placeholder `请在这里输入标题` and a visible focused body
  ProseMirror editor were present.
- Save-draft, preview, and publish controls were visible as route-risk markers and were not
  clicked.
- The surface showed platform auto-save/zero-body-word-count state; this is not manual save proof.
- Boundary: this proves authenticated WeChat article editor reachability and PC editor DOM surface
  readback only. It does not prove ordinary paste, exact InkForge artifact retention, safe
  disposable draft cleanup, phone preview, mobile interaction, Dark Mode, cover thumbnail
  acceptance, credentialed sync, scheduled send, platform preview, public rendering,
  public-host acceptance, XHS/Zhihu upload, or publish success.

## 2026-06-23 WeChat Kiln Paste-Safe Editor Ctrl+V No-Input

- [x] wechat-kiln-paste-safe-editor-ctrlv-noinput-20260623.txt
- Live authenticated WeChat article editor run used the same-session CloakBrowser editor route.
- Clipboard artifact:
  `prompts/0601/evidence/wechat-paste/flagship-kiln-paste-safe.html`.
- Artifact SHA-256:
  `338f47e5237131b8e51cf8637d0430b91a8a5e7de0d2f8ccf0625880c062b491`.
- Clipboard was written as Windows `HTML Format` plus `UnicodeText` with 41618 HTML bytes,
  41787 CF_HTML bytes, 35 source SVGs, 3 `data-ink-svg` markers, and 23 `data-ink-block` markers.
- Attempted disposable marker `InkForge disposable proof 20260623-0925` matched in the editor, but
  the draftbox list later returned `markerCount=0`; no delete action was executed because no unique
  disposable draft card was present.
- OS input attempts:
  Win32 `keybd_event` Ctrl+V with foreground click, Win32 `keybd_event` Ctrl+V with `NoMove` /
  `NoClick`, and Win32 `SendInput` Ctrl+V with a temporary body event probe.
- Final editor body readback stayed unchanged: body text length 8, body HTML length 298,
  `svgCount=0`, `dataInkSvgCount=0`, `dataInkBlockCount=0`, `sectionNice=false`, and
  `eventCount=0` for the probed `SendInput` attempt.
- Boundary: this is negative live WeChat PC paste evidence. It must not set
  `ordinaryClipboardPasteVerified:true`, `pasteInputEventVerified:true`,
  `editorBodyMutationVerified:true`, `safe-disposable-draft`, or `cleanupPathVerified:true`; it does
  not prove phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed
  sync, scheduled send, platform preview, public rendering, public-host acceptance, XHS/Zhihu
  upload, or publish success.

## 2026-06-23 WeChat Disposable Save No-Card

- [x] wechat-disposable-save-no-card-20260623.txt
- Live authenticated WeChat article editor cleanup preflight used the same-session CloakBrowser
  `createMsg(0)` editor route.
- Attempt 1 wrote title marker `InkForge disposable cleanup 20260623-1010`, verified
  `保存为草稿`, and tried DOM pointer/mouse/click plus DOM `click()` after CloakBrowser physical
  click was blocked by stable-position checking.
- Attempt 1 draftbox readback returned `markerCount=0`; no delete action was executed.
- Attempt 2 wrote title marker `InkForge disposable cleanup 20260623-1025` plus body sentinel
  `InkForge cleanup body sentinel 20260623-1025`, verified `保存为草稿`, and sent a real Windows
  mouse click to the save-draft button center.
- Attempt 2 draftbox readback returned `markerCount=0`, `bodyMarkerCount=0`, and
  `cardWrapperCount=14`; no delete action was executed because no unique disposable draft card was
  present.
- Boundary: this is negative safe-disposable-draft lifecycle evidence. It must not set
  `safe-disposable-draft`, `disposableDraft:true`, or `cleanupPathVerified:true`; it does not prove
  ordinary paste, exact artifact retention, phone preview, mobile interaction, Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, platform preview, public rendering,
  public-host acceptance, XHS/Zhihu upload, or publish success.

## 2026-06-23 Foreground Input ClickOnly Helper

- [x] foreground-input-clickonly-helper-20260623.txt
- Added `-Action ClickOnly` to `inkforge/scripts/probe-windows-foreground-input.ps1`.
- `ClickOnly` preserves the existing foreground-window restore, optional move, and optional mouse
  click behavior while skipping all keyboard input paths.
- Fixed empty-input reporting with `@($inputs).Count` so `requestedInputCount=0` works under
  PowerShell StrictMode.
- Verification command used `-NoMove -NoClick`, matched the current WeChat Chromium window, and
  returned `requestedInputCount=0`, `sentInputCount=0`, and `keybdEventCount=0`.
- Boundary: this is local proof-tooling support only. It does not prove WeChat save-draft success,
  cleanup, paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, public-host acceptance,
  XHS/Zhihu upload, or publish success.

## 2026-06-23 Style Proof Save-Draft No-Card Validator

- [x] style-proof-save-draft-no-card-validator-20260623.txt
- Added `StyleProofArtifact.saveDraftNoCard?: boolean`.
- Added issue id `style-proof-manifest-save-draft-no-card`.
- Safe-disposable-draft artifacts with `saveDraftNoCard:true` are invalid blocker evidence.
- Intake accepts `saveDraftNoCard` as a known boolean field without schema warnings.
- Acceptance audit treats `style-proof-manifest-save-draft-no-card` as invalid proof rather than a
  missing manual gate.
- TDD red failed before implementation because the issue id was absent; focused green passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t 'save-draft no-card' --reporter=default`.
- Boundary: this is local validation/accounting only. It does not prove WeChat save-draft success,
  cleanup, paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, platform preview, public rendering, public-host acceptance,
  XHS/Zhihu upload, or publish success.

## 2026-06-23 Market Editor DOM Learning

- [x] market-editor-dom-learning-20260623.txt
- CloakBrowser-only live inspection of 135 SVG editor and Xiumi article editor.
- 135 observations: left SVG taxonomy, `免费试用` insertion, 336 px central WeChat-width canvas,
  gap-safe `section` wrappers, 1080x1920 visual panel scaling, redacted background-image SVG layers,
  `background-size:100.1% 100.1%`, seam protection, and `pointer-events:none` on decorative layers.
- Xiumi observations: article editor SVG taxonomy, SVG subcategories, capability metadata, inserted
  article component tree, image/text/cell/group class families, flex/ratio/overflow/line-height-zero
  layout rules, and editor-only sync/plugin boundary.
- Public-source cross-check: Zhihu/CNBlogs SVG/CSS WeChat boundary notes, 135 SVG workflow page,
  and Doocs WeChat Markdown editor docs/GitHub.
- Boundary: this is taxonomy/rendering-rule learning only. It does not prove 135/Xiumi template
  reuse, WeChat paste, phone, sync, schedule, public rendering, upload, or publish success.

## 2026-06-23 Style Market Capability Metadata

- [x] style-market-capability-metadata-20260623.txt
- Added executable market capability metadata to the style catalog without changing renderer output,
  proof manifests, release gates, availability, or selectability.
- Added `getStyleChoiceMarketCapabilities(choiceId)` and
  `getPlatformStyleMarketCapabilityReport(platform)`.
- WeChat market matrix now records source-owned capability metadata for background SVG shell,
  image carousel, click/slide/long-press/region trigger families, ratio-image wrappers, title/card
  layouts, H5 handoff, and static raster fallback.
- XHS market fallback records source-owned image-page / long-image fallback metadata with
  `xhs-artifact-manifest` proof requirements.
- Zhihu market fallback records clean Markdown and public-image fallback metadata with public host,
  `zhihu-artifact-manifest`, and platform proof requirements.
- Regression coverage proves the metadata does not promote WeChat proof, does not create a preset
  application for the blocked WeChat market matrix, and returns empty capabilities for normal
  non-market choices.
- Boundary: this is local executable metadata only. It does not prove paste, phone preview, sync,
  upload, public rendering, or publish success.

## 2026-06-23 ExportModal Market Capability UI

- [x] export-modal-market-capability-ui-20260623.txt
- ExportModal now surfaces market capability summaries and compact capability chips in the existing
  style catalog cards.
- The UI consumes `getPlatformStyleMarketCapabilityReport(selectedPlatform)` and does not mutate
  availability, selectability, proof manifests, or release-gate accounting.
- CloakBrowser visual checks:
  - WeChat: 17 style cards, 1 market card, 0 horizontal overflow cards.
  - Xiaohongshu: 8 style cards, 1 market card, 0 horizontal overflow cards.
  - Zhihu: 8 style cards, 1 market card, 0 horizontal overflow cards.
- Boundary: this is local UI rendering only. It does not prove paste, phone preview, sync, upload,
  public rendering, or publish success.

## 2026-06-23 ExportModal Market Capability E2E

- [x] exportmodal-market-capability-e2e-20260623.txt
- Extended the real `tests/e2e/specs/svg-render.spec.cjs` ExportModal probe to read visible
  market capability summaries, chip labels, and market-row overflow counts.
- Real Tauri/WebView2 WDIO run passed with 1 spec / 6 tests:
  `pnpm -C inkforge exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/svg-render.spec.cjs`.
- WeChat assertions prove the Market SVG/H5 fallback matrix shows the 14-capability summary and
  learned SVG/H5 chip labels while remaining blocked and disabled.
- Xiaohongshu assertions prove the market rich card fallback shows source-owned/fallback metadata
  while remaining mapped to the real preset-backed action.
- Zhihu assertions prove the market rich layout fallback shows public-host fallback metadata while
  remaining blocked until public-host proof exists.
- Boundary: this is local Tauri/WebView2 ExportModal evidence only. It does not prove paste, phone
  preview, sync, upload, public rendering, public-host acceptance, or publish success.

## 2026-06-23 WDIO E2E CJS Lint

- [x] wdio-e2e-cjs-lint-20260623.txt
- Added a file-scoped `tests/e2e/**/*.cjs` ESLint override in `inkforge/eslint.config.js` for the
  WDIO/Mocha/CommonJS/browser globals used by the real e2e harness.
- The override keeps product `src` lint rules unchanged and does not declare `expect` as a global
  because specs import it from `chai`.
- Removed an unused `spawnSync` import from `tests/e2e/probes/paint-h1.cjs`.
- Removed a repeated `ready = false` assignment from `tests/e2e/specs/svg-render.spec.cjs`.
- Verification passed:
  `pnpm -C inkforge exec eslint 'tests/e2e/**/*.cjs' --quiet`;
  `node --check` for changed CJS/config files; targeted real Tauri/WebView2 `svg-render.spec.cjs`
  WDIO run with 1 spec / 6 tests.
- Boundary: this is local lint/test-harness maintainability only. It does not prove paste, phone
  preview, sync, upload, public rendering, public-host acceptance, or publish success.

## 2026-06-23 Full Tauri/WebView2 E2E Refresh

- [x] full-tauri-webview2-e2e-refresh-20260623.txt
- Ran `pnpm -C inkforge test:e2e` after the market capability e2e and WDIO CJS lint slices.
- Result: 2 spec files / 17 tests passed against the real Tauri/WebView2 harness.
- `svg-render.spec.cjs`: 6 tests passed, including real Pinia draft seeding, ExportModal
  WeChat/XHS/Zhihu style capability gates, three flagship SVG probes, and mobile line-width probe.
- `visual.spec.cjs`: 11 tests passed, including titlebar controls, IPC round trips, brand mark,
  tokens, focus ring, and theme cascade.
- Boundary: this is local Tauri/WebView2 e2e evidence only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, or publish success.

## 2026-06-23 Local Release Validation Refresh

- [x] local-release-validation-refresh-20260623.txt
- Ran the export service regression serially:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism`.
- Result: 36 files / 1153 tests passed.
- Ran `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`; passed.
- Ran `NODE_OPTIONS=--max-old-space-size=4096 pnpm -C inkforge build`; passed with 4653 modules
  transformed and Vite build completed in 37.39s.
- Restored `inkforge/tsconfig.tsbuildinfo` after the build.
- Boundary: this is local test/type/build evidence only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, or publish success.

## 2026-06-23 Style Proof External Handoff Next-Row Dedupe

- [x] style-proof-external-handoff-nextrow-dedupe-20260623.txt
- Added `nextRowRefs` to the committed external handoff packet so the five logical next-action
  categories remain visible even when several categories point at the same underlying proof row.
- `nextRows` is now the unique row projection deduped by checklist row id; current runtime readback
  is `nextRowRefs=5`, `nextRows=3`, `externalHandoffRows=18`, `safeExternalRows=0`, and
  `canClaimComplete=false`.
- The Markdown formatter now labels next operator rows by category while preserving the full
  canonical proof-row list.
- Boundary: this is local operator-packet clarity only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-23 Style Proof Release Preflight CLI

- [x] style-proof-release-preflight-cli-20260623.txt
- Added `pnpm -C inkforge style-proof:release-preflight` as a local deployment-acceptance guard for
  committed style-proof release accounting.
- The command reads the committed release gate and handoff packet from `style-catalog.ts`, prints a
  compact human or `--json` report, and exits `1` while `canClaimComplete=false`.
- Current readback is `status=blocked-by-external`, `externalHandoffRows=18`,
  `safeExternalRows=0`, `actionableLocalRows=0`, `nextRowRefs=5`, and `uniqueNextRows=3`.
- Verification covered CLI lint/help/human/JSON modes, JSON parse assertion, focused release/packet
  tests, full export tests, type-check, and production build.
- Boundary: this is a release-blocking local preflight command only. It does not prove paste, phone
  preview, sync, upload, public rendering, public-host acceptance, scheduled send, or publish
  success.

## 2026-06-23 Style Proof Release Preflight CLI Regression

- [x] style-proof-release-preflight-cli-regression-20260623.txt
- Added automated child-process regression coverage for the release preflight CLI.
- Fixed `--json` output to compact single-line JSON, matching the release-preflight spec contract.
- The regression uses current Node plus local `tsx` for stable Windows execution and avoids shell
  argument-separator ambiguity inside Vitest.
- Current regression readback remains `status=blocked-by-external`, `canClaimComplete=false`,
  `externalHandoffRows=18`, `safeExternalRows=0`, `nextRowRefs=5`, and `uniqueNextRows=3`.
- Boundary: this is local CLI regression coverage only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 135 SVG Editor Applied DOM Refresh

- [x] 135-svgeditor-applied-dom-refresh-20260625.txt
- CloakBrowser readback from the applied central editor canvas in the 135 SVG editor.
- Current sanitized readback: 17 block wrappers, 17 SVG nodes, 5 large poster-like SVG viewBoxes,
  12 icon/placeholder SVG viewBoxes, 0 `foreignObject`, 0 animation-like nodes, and 0 defs-like
  paint-server/reuse nodes.
- Rule captured for InkForge: separate editor-only hotzone controls from export payload; for
  poster-like modules prefer deterministic viewBox, width-100 responsive SVG, zero-line-height
  centered wrapper, and asset-pipeline-controlled imagery.
- Boundary: this is market editor DOM learning only. It does not prove paste, phone preview, sync,
  upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Applied SVG/Style DOM Refresh

- [x] xiumi-applied-svg-style-dom-refresh-20260625.txt
- CloakBrowser readback from the live Xiumi v5 paper editor after clicking a visible SVG style card
  and then reading the central editor DOM.
- Baseline central editor readback before the SVG card: `htmlLength=566067`, `tnComp=21`,
  `tnCell=9`, `img=78`, `svg=0`, `contenteditable=1`, `ng-* attributes=4507`,
  `opera-* attributes=16`, and Xiumi-hosted media references `=16`.
- After clicking the visible SVG card preview, the center changed to `htmlLength=587422`,
  `tnComp=31`, `tnCell=14`, `svg=18`, `foreignObject=5`, animate-like SVG nodes `=14`,
  `contenteditable=2`, `ng-* attributes=4546`, `opera-* attributes=26`, and Xiumi-hosted media
  references `=21`.
- Rule captured for InkForge: Xiumi SVG/H5 ideas should become source-owned viewBox shells,
  image-slot manifests, trigger/action manifests, layout reports, static/raster fallback rules, and
  residue blockers. Xiumi `tn-*`, `ng-*`, `opera-*`, `contenteditable`, flow-canvas wrappers,
  hosted media references, `foreignObject`, and SMIL-like nodes must not be copied into publishable
  output.
- A Title-category click while the SVG sequence editor was active did not change the center counts,
  so it remains center-unchanged taxonomy evidence only, not applied title proof.
- Boundary: this is market editor DOM learning only. It does not prove paste, phone preview, sync,
  upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 WeChat Login-State Readonly Check

- [x] wechat-login-state-readonly-20260625.txt
- CloakBrowser-only read-only check of the WeChat Public Platform entry page after the Xiumi
  market-editor study.
- Sanitized readback: page title indicated the public platform entry surface, body text length was
  374, `.ProseMirror=0`, `[contenteditable]=0`, `iframes=2`, scan-login visual markers `=2`, and
  draft/article/create-like actions `=0`.
- Text signals showed a login/scan prompt, with backend dashboard text absent and article editor
  text absent.
- Boundary: this is external-account blocker evidence only. It does not prove editor reachability,
  ordinary rich paste, exact artifact retention, safe disposable draft cleanup, phone preview,
  mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send,
  platform preview, public rendering, or publish success.

## 2026-06-25 WeChat Login-State Blocker Manifest

- [x] style-proof-wechat-login-blocker-manifest-20260625.txt
- Added a committed external-blocker manifest pack for the WeChat login-state readback.
- The pack is exposed only through `getCommittedStyleProofExternalBlockerManifests()` and
  `getCommittedStyleProofExternalBlockerAuditReport()`.
- The blocker manifest records `authenticated-editor-url` and `pc-editor-dom-readback` as invalid
  external-account blocked rows, with `no-sensitive-artifact` satisfied by a redacted hygiene row.
- Boundary: this is local cannot-claim accounting only. It does not prove authenticated editor
  access, ordinary rich paste, exact artifact retention, safe disposable draft cleanup, phone
  preview, mobile interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled
  send, platform preview, public rendering, or publish success.

## 2026-06-25 135 Background-Size SVG Shell Residue

- [x] style-proof-135-background-size-shell-residue-20260625.txt
- Added a static quality rule for the applied 135-style poster shell:
  `background-size:100.1% 100.1%` plus a nearby `svg viewBox="0 0 1080 <height>"`.
- The rule reports `135 SVG background-size shell marker` as market-editor residue for WeChat,
  Xiaohongshu, and Zhihu even when vendor class/id/source markers are absent.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Flow-Canvas Animation Wrapper Residue

- [x] xiumi-flow-canvas-animation-wrapper-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor wrapper class observed in the central
  SVG/style readback: `tn-group-flow-canvas-for-svg-animation`.
- The reduced regression intentionally keeps only that wrapper class plus a plain inline SVG shell,
  proving the cleaned wrapper residue is blocked without relying on broad `tn-cell`, `tn-animate`,
  `ng-*`, `opera-*`, `contenteditable`, or hosted-media markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Paper Document Root Residue

- [x] xiumi-paper-document-root-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor root wrapper class observed in the
  central SVG/style readback: `tn-paper-document-root`.
- The reduced regression intentionally keeps only that wrapper class plus a plain section, proving
  the cleaned root residue is blocked without relying on broad `tn-comp`, `tn-cell`, `ng-*`,
  `opera-*`, SVG content-layer, hosted-media, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Text Cell Class Residue

- [x] xiumi-text-cell-class-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor text-cell class observed in the central
  SVG/style readback: `tn-text`.
- The reduced regression intentionally keeps only that class plus readable text, proving the
  cleaned text-cell residue is blocked without relying on broad `tn-cell`, `tn-link`,
  `tn-animate`, `contenteditable`, `ng-*`, `opera-*`, hosted-media, SVG content-layer, or
  `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Interaction Style Residue

- [x] xiumi-interaction-style-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor interaction style pair observed in the
  central SVG/style readback: `touch-action` plus `user-select`.
- The reduced regression intentionally keeps only that same-style-attribute pair plus readable
  text, proving the cleaned interaction-layer residue is blocked without relying on `tn-*`,
  `ng-*`, `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi UI Slider Control Residue

- [x] xiumi-ui-slider-control-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor slider control family observed in the
  central SVG/style readback: `ui-slider`, `ui-slider-horizontal`, and `ui-slider-handle`.
- The reduced regression intentionally keeps only those class/id control markers, proving the
  cleaned editor-control residue is blocked without relying on `tn-*`, `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `touch-action`, `user-select`,
  `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Operation Panel Loader Residue

- [x] xiumi-operation-panel-loader-residue-20260625.txt
- Added a static quality rule for the Xiumi applied Angular runtime operation-panel class observed
  around editor partials: `op-loader`.
- The reduced regression intentionally keeps only that class plus readable text, proving the
  cleaned operation-panel residue is blocked without relying on `tn-*`, `ng-*`, Angular runtime
  classes, `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `ui-slider`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Operation Panel Directive Residue

- [x] xiumi-operation-panel-directive-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 operation panel/menu directive attributes
  including `tn-panel-move`, `tn-op-back-mask`, and `tn-op-menu`.
- The reduced regression intentionally keeps only those source-specific directive attributes,
  proving cleaned-down operation panel/menu residue gets a precise label instead of relying only
  on the broad `Xiumi tn-* attribute` fallback.
- The detector intentionally does not block ordinary panel wording, menu wording, move wording,
  mask wording, CSS positioning properties, or article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  H5 panel/menu interaction fidelity, sync, upload, public rendering, public-host acceptance,
  scheduled send, or publish success.

## 2026-06-26 Xiumi Operator Dock Control Residue

- [x] xiumi-operator-dock-control-residue-20260626.txt
- Added a static quality rule for Xiumi operator-dock and external-edit-panel child controls
  observed after a live CloakBrowser template click changed the center paper: `op-dock`,
  `out-comp-edit-dock`, `out-comp-edit-panel`, `op-ce-layout-carousel`,
  `cell-group-edit-container`, `menu-style-input`, and `svg-animation-assistant`.
- The reduced regression intentionally keeps only those child-control class/id markers, proving
  the cleaned operator-control residue is blocked without relying on `tn-*`, `ng-*`,
  `opera-tn-*`, `op-loader`, `contenteditable`, hosted-media, SVG content-layer, `ui-slider`,
  `ui-sortable`, `touch-action`, or `user-select` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Operator Depot Item Residue

- [x] xiumi-operator-depot-item-residue-20260626.txt
- Added a static quality rule for Xiumi operator-depot/menu item controls observed in a live
  Xiumi v5 paper-editor readback: `op-dc-depot`, `op-dc-hidden`, `op-dc-slot`, `ce-dc`,
  `dc-ce-*`, `dc-cp-*`, and related item markers.
- The reduced regression intentionally keeps only those depot/item child markers, proving the
  cleaned residue is blocked without relying on `op-dock`, `out-comp-*`, `op-loader`, broad
  `tn-*`, broad `ng-*`, `opera-tn-*`, `contenteditable`, hosted-media, SVG content-layer,
  `ui-slider`, `ui-sortable`, `touch-action`, or `user-select` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Selection Overlay Control Residue

- [x] xiumi-selection-overlay-control-residue-20260626.txt
- Added a static quality rule for Xiumi selected-component overlay and gesture child controls
  observed after a live CloakBrowser template click changed the center paper: `full-screen-mask`,
  `brim-group`, `box-lines`, `box-handles`, `hm-recognizer-options`, `hm-panstart`,
  `hm-panend`, and `hm-panmove`.
- The reduced regression intentionally keeps only those selection-overlay markers, proving the
  cleaned child-control residue is blocked without relying on operator-dock parents, `tn-*`,
  `ng-*`, `opera-tn-*`, `op-loader`, `contenteditable`, hosted-media, SVG content-layer,
  `ui-slider`, `ui-sortable`, `touch-action`, or `user-select` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Worker Surface Crop Control Residue

- [x] xiumi-worker-surface-crop-control-residue-20260626.txt
- Added a static quality rule for Xiumi crop/worker-surface controls observed in a live Xiumi v5
  paper-editor readback: `crop-mask`, `crop-box`, `crop-handle`, `op-worker-surface`, and
  `op-worker-block-gesture`.
- The reduced regression intentionally keeps only those worker/crop markers, proving the cleaned
  residue is blocked without relying on selection-overlay wrappers, operator-dock parents,
  operator depot items, `op-loader`, broad `tn-*`, broad `ng-*`, `opera-tn-*`, `contenteditable`,
  hosted-media, SVG content-layer, `ui-slider`, `ui-sortable`, `touch-action`, or `user-select`
  markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Paper Auxiliary Component Tree Residue

- [x] xiumi-paper-auxiliary-component-tree-residue-20260626.txt
- Added a static quality rule for Xiumi paper auxiliary component-tree controls observed in a live
  Xiumi v5 paper-editor readback: `tn-paper-aux-comps-tree-assistant`,
  `tn-paper-aux-comps-tree`, `paper-comps-assistant`, `paper-aux-comp-tree`,
  `aux-tree-node-data`, and `on-paper-aux-tree-node-*`.
- The reduced regression intentionally keeps only those auxiliary tree markers, proving the
  cleaned residue is blocked without relying on selection-overlay wrappers, crop/worker controls,
  operator-dock parents, operator depot items, `op-loader`, broad `tn-*`, broad `ng-*`,
  `opera-tn-*`, `contenteditable`, hosted-media, SVG content-layer, `ui-slider`, `ui-sortable`,
  `touch-action`, or `user-select` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Top Operation Button Residue

- [x] xiumi-top-operation-button-residue-20260626.txt
- Added a static quality rule for Xiumi top operation buttons observed in a live Xiumi v5
  paper-editor readback: `x3-nav-op-buttons`, `tn-op-btn-group`, `op-btn`,
  `op-btn-inset-icon`, `op-btn-inset-desc`, and `op-more`.
- The reduced regression intentionally keeps only those top operation button markers, proving the
  cleaned residue is blocked without relying on broad Angular `ng-*`, paper auxiliary tree
  controls, selection-overlay wrappers, crop/worker controls, operator-dock parents, operator
  depot items, `op-loader`, broad `tn-*`, `opera-tn-*`, `contenteditable`, hosted-media, SVG
  content-layer, `ui-slider`, `ui-sortable`, `touch-action`, or `user-select` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi UI Bootstrap Control Directive Residue

- [x] xiumi-ui-bootstrap-control-directive-residue-20260626.txt
- Added a static quality rule for Angular UI Bootstrap directives observed in a live Xiumi v5
  paper-editor readback: `uib-dropdown`, `uib-dropdown-toggle`, `uib-dropdown-menu`,
  `uib-tooltip`, `tooltip-placement`, and `tooltip-popup-delay`.
- The reduced regression intentionally keeps only those UI Bootstrap directive markers, proving
  the cleaned residue is blocked without relying on top operation classes, broad Angular `ng-*`,
  paper auxiliary tree controls, selection-overlay wrappers, crop/worker controls, operator-dock
  parents, operator depot items, `op-loader`, broad `tn-*`, `opera-tn-*`, `contenteditable`,
  hosted-media, SVG content-layer, `ui-slider`, `ui-sortable`, `touch-action`, or `user-select`
  markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Sortable Control Residue

- [x] xiumi-sortable-control-residue-20260625.txt
- Added a static quality rule for the Xiumi/jQuery-UI sortable control family recorded in the
  market editor state catalog: `ui-sortable` and `ui-sortable-*`.
- The reduced regression intentionally keeps only that class plus readable text, proving the
  cleaned drag/sort control residue is blocked without relying on `tn-*`, `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `ui-slider`, `op-loader`, `touch-action`,
  `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Content-Overlap State Residue

- [x] xiumi-content-overlap-state-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor image-gallery state class observed in
  the central SVG sample readback: `tn-content-overlap`.
- The reduced regression intentionally keeps only that class plus readable text, proving the
  cleaned content-overlap state residue is blocked without relying on broader `tn-*`, `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `ui-slider`,
  `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Image Presenter Residue

- [x] xiumi-image-presenter-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor image-presentation class observed in
  the central SVG sample readback: `tn-image-presenter`.
- The reduced regression intentionally keeps only that class plus readable text, proving the
  cleaned image-presenter residue is blocked without relying on broader `tn-*`, `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `raw-image`,
  `tn-child-position-*`, `tn-child-orientation-*`, `tn-content-overlap`, `ui-slider`,
  `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Raw Image Cell Residue

- [x] xiumi-raw-image-cell-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor image-cell class observed in the
  central SVG sample readback: `raw-image`.
- The reduced regression intentionally keeps only that class plus readable text, proving the
  cleaned raw image-cell residue is blocked without relying on broader `tn-*`, `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `tn-page-slot`, `tn-layer-slot`,
  `tn-child-position-*`, `tn-child-orientation-*`, `tn-image-presenter`, `tn-content-overlap`,
  `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Image Instance Wrapper Residue

- [x] xiumi-image-instance-wrapper-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor image-instance wrapper class observed in
  the central SVG sample readback: `tn-image-inst-wrapper`.
- The reduced regression intentionally keeps only that class plus readable text, proving the
  cleaned image-instance wrapper residue is blocked without relying on broader `tn-*`, `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `raw-image`,
  `tn-image-presenter`, `tn-content-overlap`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Overflow-Hidden State Residue

- [x] xiumi-overflow-hidden-state-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor overflow state class observed in the
  central SVG sample readback: `tn-overflow-hidden`.
- The reduced regression intentionally keeps only that class plus readable text, proving the
  cleaned overflow-hidden state residue is blocked without relying on broader `tn-*`, `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `raw-image`,
  `tn-image-presenter`, `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Page Vessel Residue

- [x] xiumi-page-vessel-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor page vessel class observed in the
  central SVG sample readback: `tn-page-vessel`.
- The reduced regression intentionally keeps only that class plus readable text, proving the
  cleaned page-vessel residue is blocked without relying on additional `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-group-sortable-box`,
  `tn-sortable-pin`, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`,
  `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Group Sortable Box Residue

- [x] xiumi-group-sortable-box-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor group sortable container class observed
  in the central SVG sample readback: `tn-group-sortable-box`.
- The reduced regression intentionally keeps only that class plus readable text, proving the
  cleaned group sortable-box residue is blocked without relying on additional `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-sortable-pin`, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`,
  `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Sortable Pin Residue

- [x] xiumi-sortable-pin-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor sortable position class observed in the
  central SVG sample readback: `tn-sortable-pin`.
- The reduced regression intentionally keeps only that class plus readable text, proving the
  cleaned sortable-pin residue is blocked without relying on additional `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`,
  `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Quick Input Residue

- [x] xiumi-quick-input-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor quick-input class family observed in
  the central SVG sample readback: `tn-quick-input`, `tn-quick-input-block`, and
  `tn-quick-input-comp`.
- The reduced regression intentionally keeps only `tn-quick-input-block` plus readable text,
  proving the cleaned quick-input residue is blocked without relying on additional `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `raw-image`,
  `tn-image-presenter`, `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`,
  `tn-page-vessel`, `tn-group-sortable-box`, `tn-sortable-pin`, `ui-slider`, `ui-sortable`,
  `op-loader`, `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or
  `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi State Toggle Residue

- [x] xiumi-state-toggle-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor state-toggle class family observed in
  the central SVG sample readback: `tn-state-active` and `tn-state-frozen`.
- The reduced regression intentionally keeps only `tn-state-active` plus readable text, proving the
  cleaned state-toggle residue is blocked without relying on additional `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `tn-quick-input*`, `ui-slider`, `ui-sortable`,
  `op-loader`, `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or
  `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Editing State Residue

- [x] xiumi-editing-state-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor editing-state class family observed in
  the central SVG sample readback: `tn-on-editing`, `tn-on-child-editing`,
  `tn-on-son-editing`, and `tn-on-multi-select`.
- The reduced regression intentionally keeps only `tn-on-child-editing` plus readable text,
  proving the cleaned editing-state residue is blocked without relying on additional `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `raw-image`,
  `tn-image-presenter`, `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`,
  `tn-page-vessel`, `tn-group-sortable-box`, `tn-sortable-pin`, `tn-quick-input*`,
  `tn-state-*`, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`,
  `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi In-Cell Active State Residue

- [x] xiumi-in-cell-active-state-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor in-cell active state class observed in
  the central SVG sample readback: `tn-in-cell-state-active`.
- The reduced regression intentionally keeps only `tn-in-cell-state-active` plus readable text,
  proving the cleaned in-cell active-state residue is blocked without relying on additional
  `ng-*`, `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `raw-image`,
  `tn-image-presenter`, `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`,
  `tn-page-vessel`, `tn-group-sortable-box`, `tn-sortable-pin`, `tn-quick-input*`,
  `tn-state-*`, `tn-on-*`, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`,
  `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Group Box Wrapper Residue

- [x] xiumi-group-box-wrapper-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor group box wrapper classes observed in
  the central SVG sample readback: `tn-group-box-wrapper` and `tn-group-fixed-box`.
- The reduced regression intentionally keeps only `tn-group-box-wrapper` plus readable text,
  proving the cleaned group-box wrapper residue is blocked without relying on additional `ng-*`,
  `opera-*`, `contenteditable`, hosted-media, SVG content-layer, `raw-image`,
  `tn-image-presenter`, `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`,
  `tn-page-vessel`, `tn-group-sortable-box`, `tn-sortable-pin`, `tn-quick-input*`,
  `tn-state-*`, `tn-on-*`, `tn-in-cell-state-active`, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Page Layer Slot Residue

- [x] xiumi-page-layer-slot-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor page/layer slot classes observed in
  the central SVG sample readback: `tn-page-slot` and `tn-layer-slot`.
- The reduced regression intentionally keeps only `tn-page-slot` plus readable text, proving the
  cleaned page/layer slot residue is blocked without relying on additional `ng-*`, `opera-*`,
  `contenteditable`, hosted-media, SVG content-layer, `raw-image`, `tn-image-presenter`,
  `tn-content-overlap`, `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`,
  `tn-group-sortable-box`, `tn-sortable-pin`, `tn-quick-input*`, `tn-state-*`, `tn-on-*`,
  `tn-in-cell-state-active`, `tn-group-box-wrapper`, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Child Layer State Residue

- [x] xiumi-child-layer-state-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor child layer state classes observed in
  the central SVG/image-layer sample readback: `tn-child-position-absolute`,
  `tn-child-position-static`, `tn-child-orientation-fixed`, and
  `tn-child-orientation-flow-canvas`.
- The reduced regression intentionally keeps only `tn-child-position-absolute` plus readable text,
  proving the cleaned child layer state residue is blocked without relying on additional
  `tn-page-slot`, `tn-layer-slot`, `ng-*`, `opera-*`, `contenteditable`, hosted-media, SVG
  content-layer, `raw-image`, `tn-image-presenter`, `tn-content-overlap`,
  `tn-image-inst-wrapper`, `tn-overflow-hidden`, `tn-page-vessel`, `tn-group-sortable-box`,
  `tn-sortable-pin`, `tn-quick-input*`, `tn-state-*`, `tn-on-*`,
  `tn-in-cell-state-active`, `tn-group-box-wrapper`, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Placeholder Metadata Residue

- [x] xiumi-placeholder-metadata-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor placeholder attribute observed in the
  central SVG carousel/text-cell sample readback: `tn-placeholder`.
- The reduced regression intentionally keeps only `tn-placeholder` plus readable text, proving the
  cleaned placeholder metadata residue is blocked without relying on `tn-yzk-font-*`, `tn-cell`,
  flow-canvas, Angular `ng-*`, `opera-*`, `contenteditable`, hosted-media, SVG content-layer,
  `raw-image`, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi YZK Font Metadata Residue

- [x] xiumi-yzk-font-metadata-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor font binding attribute observed in the
  central SVG carousel/text-cell sample readback: `tn-yzk-font-usage-id`.
- The reduced regression intentionally keeps only `tn-yzk-font-usage-id` plus readable text,
  proving the cleaned yzk font metadata residue is blocked without relying on `tn-placeholder`,
  `tn-cell`, flow-canvas, Angular `ng-*`, `opera-*`, `contenteditable`, hosted-media, SVG
  content-layer, `raw-image`, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`,
  `op-loader`, `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or
  `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Disabled Control Binding Residue

- [x] xiumi-disabled-control-binding-residue-20260625.txt
- Added a static quality rule for the Xiumi applied-editor disabled control binding attribute
  observed in the runtime sample readback: `disable-tn-group-flex-box`.
- The reduced regression intentionally keeps only `disable-tn-group-flex-box` plus readable text,
  proving the cleaned disabled control binding residue is blocked without relying on
  `opera-tn-ra-*`, `tn-*`, Angular `ng-*`, `opera-*`, `contenteditable`, hosted-media, SVG
  content-layer, `raw-image`, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`,
  `op-loader`, `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or
  `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Runtime Path Binding Residue

- [x] xiumi-runtime-path-binding-residue-20260626.txt
- Split Xiumi applied-editor runtime path readbacks into component/cell diagnostics:
  `opera-tn-ra-comp` reports `Xiumi component runtime path binding residue`, and
  `opera-tn-ra-cell` reports `Xiumi cell runtime path binding residue`.
- The reduced regressions intentionally keep only one runtime path binding plus readable text,
  proving the cleaned runtime path residue is blocked without relying on `disable-tn-*`, broader
  `tn-*`, Angular `ng-*`, `opera-*`, `contenteditable`, hosted-media, SVG content-layer,
  `raw-image`, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- The old broad `Xiumi runtime binding attribute` bucket is now decomposed for `opera-tn-ra-comp`
  and `opera-tn-ra-cell`; the generic `Xiumi tn-* attribute` guard remains a final catch-all for
  nested Xiumi `tn-*` leakage in copied runtime attribute names.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Component Authoring Tree Residue

- [x] xiumi-component-authoring-tree-residue-20260625.txt
- Added a static quality rule for Xiumi component authoring tree classes observed in applied
  component/canvas DOM readbacks: `tn-comp`, `tn-comp-inst`, `tn-comp-top-level`, `tn-comp-pin`,
  and `tn-comp-style-pin`.
- The reduced regression intentionally keeps only `tn-comp-inst` plus readable text, proving the
  cleaned component authoring tree residue is blocked without relying on `tn-page`, `tn-cell`,
  `tn-tpl`, hosted-media, Angular `ng-*`, `opera-*`, `contenteditable`, SVG content-layer,
  `raw-image`, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Cell Container Authoring Residue

- [x] xiumi-cell-container-authoring-residue-20260625.txt
- Added a static quality rule for Xiumi cell/container authoring classes observed in applied
  card, text-cell, image-cell, and SVG gallery DOM readbacks: `tn-cell`, `tn-cell-inst`,
  `tn-cell-image`, `tn-cell-text`, and `tn-cell-group`.
- The reduced regression intentionally keeps only `tn-cell tn-cell-group` plus readable text,
  proving the cleaned cell container authoring residue is blocked without relying on `tn-comp`,
  `tn-page`, `tn-tpl`, hosted-media, Angular `ng-*`, `opera-*`, `contenteditable`, SVG
  content-layer, `raw-image`, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`,
  `op-loader`, `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or
  `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Layer Authoring Tree Residue

- [x] xiumi-layer-authoring-tree-residue-20260625.txt
- Added a static quality rule for Xiumi layer authoring classes observed in applied SVG/H5 layered
  editor DOM readbacks: `tn-layer`, `tn-layer-absolute`, and other `tn-layer-*` markers.
- The reduced regression intentionally keeps only `tn-layer tn-layer-absolute` plus readable text,
  proving the cleaned layer authoring tree residue is blocked without relying on `tn-comp`,
  `tn-cell`, `tn-page`, `tn-tpl`, hosted-media, Angular `ng-*`, `opera-*`, `contenteditable`,
  SVG content-layer, `raw-image`, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`,
  `op-loader`, `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or
  `foreignObject` markers.
- The page/layer slot guard keeps `tn-layer-slot` on the existing
  `Xiumi page layer slot residue` label after the split.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Page Authoring Tree Residue

- [x] xiumi-page-authoring-tree-residue-20260625.txt
- Added a static quality rule for Xiumi page authoring classes observed in applied page/root editor
  DOM readbacks: `tn-page`, `tn-page-root`, and other `tn-page-*` markers.
- The reduced regression intentionally keeps only `tn-page tn-page-root` plus readable text,
  proving the cleaned page authoring tree residue is blocked without relying on `tn-comp`,
  `tn-cell`, `tn-layer`, `tn-tpl`, hosted-media, Angular `ng-*`, `opera-*`, `contenteditable`,
  SVG content-layer, `raw-image`, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`,
  `op-loader`, `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or
  `foreignObject` markers.
- The page/layer slot and page-vessel guards keep `tn-page-slot` on
  `Xiumi page layer slot residue` and `tn-page-vessel` on `Xiumi page vessel residue`.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Template Authoring Tree Residue

- [x] xiumi-template-authoring-tree-residue-20260625.txt
- Added a static quality rule for Xiumi template authoring classes observed in applied template/card
  editor DOM readbacks: `tn-tpl`, `tn-tpl-card`, and other `tn-tpl-*` markers.
- The reduced regression intentionally keeps only `tn-tpl tn-tpl-card` plus readable text,
  proving the cleaned template authoring tree residue is blocked without relying on `tn-comp`,
  `tn-cell`, `tn-layer`, `tn-page`, hosted-media, Angular `ng-*`, `opera-*`, renderer-pipeline
  attributes, `contenteditable`, SVG content-layer, `raw-image`, page/layer slots, gallery
  wrappers, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`,
  `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- The template renderer pipeline guard keeps `ng-bind-html`, `ng-click`, `ng-switch`, and
  `tn-tpl-pose-fit-box` on `Xiumi template renderer pipeline residue`.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Source-House Authoring Residue

- [x] xiumi-source-house-authoring-residue-20260625.txt
- Added a static quality rule for Xiumi source-house authoring classes observed in material/source
  metadata readbacks: `tn-from-house`, `tn-from-house-template`, and other `tn-from-house-*`
  markers.
- The reduced regression intentionally keeps only `tn-from-house tn-from-house-template` plus
  readable text, proving the cleaned source-house residue is blocked without relying on
  `tn-comp`, `tn-cell`, `tn-layer`, `tn-page`, `tn-tpl`, hosted-media, Angular `ng-*`, `opera-*`,
  renderer-pipeline attributes, `contenteditable`, SVG content-layer, `raw-image`, page/layer
  slots, gallery wrappers, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`,
  `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Theme Color Mask Residue

- [x] xiumi-theme-color-mask-residue-20260625.txt
- Added a static quality rule for Xiumi theme color mask classes observed in editor-side theme
  overlay state: `tn-theme-color-mask`, `tn-theme-color-mask-active`, and other
  `tn-theme-color-mask-*` markers.
- The reduced regression intentionally keeps only `tn-theme-color-mask tn-theme-color-mask-active`
  plus readable text, proving the cleaned theme color mask residue is blocked without relying on
  `tn-comp`, `tn-cell`, `tn-layer`, `tn-page`, `tn-tpl`, `tn-from-house`, hosted-media, Angular
  `ng-*`, `opera-*`, renderer-pipeline attributes, `contenteditable`, SVG content-layer,
  `raw-image`, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- This closes the old generic `Xiumi tn-* authoring tree` active bucket into source-specific
  diagnostics for component, cell, layer, page, template, source-house, and theme-color-mask
  residues.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-25 Xiumi Component Template Binding Residue

- [x] xiumi-component-template-binding-residue-20260625.txt
- Added a static quality rule for Xiumi component-template binding attributes observed in
  editor-side component instance state: `tn-bind-comp-tpl-id` and `tn-bind-comp-index`.
- The reduced regression intentionally keeps only `tn-bind-comp-tpl-id` /
  `tn-bind-comp-index` plus readable text, proving the cleaned template binding residue is blocked
  without relying on `tn-comp`, `tn-comp-role`, `tn-uuid`, `tn-animate`, `tn-cell-type`,
  `tn-child-position`, `tn-page-stage-size`, `tn-link`, `tn-image-usage`, component/cell/layer/page
  classes, hosted-media, Angular `ng-*`, `opera-*`, renderer-pipeline attributes,
  `contenteditable`, SVG content-layer, `raw-image`, page/layer slots, gallery wrappers,
  `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- The broader `Xiumi component binding attribute residue` bucket remains active for the other
  component/runtime binding attributes after `tn-bind-comp-*` moved to a narrower diagnostic.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Component Identity Metadata Residue

- [x] xiumi-component-identity-metadata-residue-20260626.txt
- Added a static quality rule for Xiumi component identity metadata observed in editor-side
  component instance state: `tn-uuid`.
- The reduced regression intentionally keeps only `tn-uuid` plus readable text, proving the
  cleaned component identity residue is blocked without relying on `tn-bind-comp-*`, `tn-comp`,
  `tn-comp-role`, `tn-animate`, `tn-cell-type`, `tn-child-position`, `tn-page-stage-size`,
  `tn-link`, `tn-image-usage`, component/cell/layer/page classes, hosted-media, Angular `ng-*`,
  `opera-*`, renderer-pipeline attributes, `contenteditable`, SVG content-layer, `raw-image`,
  page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`,
  `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- The broader `Xiumi component binding attribute residue` bucket remains active for the other
  component/runtime binding attributes after `tn-uuid` moved to a narrower diagnostic.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Animation Binding Metadata Residue

- [x] xiumi-animation-binding-metadata-residue-20260626.txt
- Added a static quality rule for Xiumi animation binding metadata observed in editor-side SVG/H5
  effect state: `tn-animate` and `tn-animate-on-self`.
- The reduced regression intentionally keeps only `tn-animate` / `tn-animate-on-self` plus
  readable text, proving the cleaned animation binding residue is blocked without relying on
  `tn-bind-comp-*`, `tn-uuid`, `tn-comp`, `tn-comp-role`, `tn-cell-type`, `tn-child-position`,
  `tn-page-stage-size`, `tn-link`, `tn-image-usage`, component/cell/layer/page classes,
  hosted-media, Angular `ng-*`, `opera-*`, renderer-pipeline attributes, `contenteditable`, SVG
  content-layer, `raw-image`, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`,
  `op-loader`, `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or
  `foreignObject` markers.
- The broader `Xiumi component binding attribute residue` bucket remains active for the other
  component/runtime binding attributes after animation binding metadata moved to a narrower
  diagnostic.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Link Binding Metadata Residue

- [x] xiumi-link-binding-metadata-residue-20260626.txt
- Added a static quality rule for Xiumi link binding metadata observed in editor-side card/cell
  state: `tn-link`.
- The reduced regression intentionally keeps only `tn-link` plus readable text, proving the
  cleaned link binding residue is blocked without relying on `tn-bind-comp-*`, `tn-uuid`,
  `tn-animate`, `tn-comp`, `tn-comp-role`, `tn-cell-type`, `tn-child-position`,
  `tn-page-stage-size`, `tn-image-usage`, component/cell/layer/page classes, hosted-media,
  Angular `ng-*`, `opera-*`, renderer-pipeline attributes, `contenteditable`, SVG content-layer,
  `raw-image`, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- The broader `Xiumi component binding attribute residue` bucket remains active for the other
  component/runtime binding attributes after link binding metadata moved to a narrower diagnostic.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Image Binding Metadata Residue

- [x] xiumi-image-binding-metadata-residue-20260626.txt
- Added a static quality rule for Xiumi image/material binding metadata observed in editor-side
  image/card state: `tn-image` and `tn-image-usage`.
- The reduced regression intentionally keeps only `tn-image` / `tn-image-usage` plus readable
  text, proving the cleaned image binding residue is blocked without relying on `tn-bind-comp-*`,
  `tn-uuid`, `tn-animate`, `tn-link`, `tn-comp`, `tn-comp-role`, `tn-cell-type`,
  `tn-child-position`, `tn-page-stage-size`, component/cell/layer/page classes, hosted-media,
  Angular `ng-*`, `opera-*`, renderer-pipeline attributes, `contenteditable`, SVG content-layer,
  `raw-image`, image wrapper classes, page/layer slots, gallery wrappers, `ui-slider`,
  `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- The broader `Xiumi component binding attribute residue` bucket remains active for the other
  component/runtime binding attributes after image binding metadata moved to a narrower
  diagnostic.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Preload Image Directive Residue

- [x] xiumi-preload-image-directive-residue-20260629.txt
- Added a static quality rule for the live Xiumi v5 image preload directive `tn-pre-load-image`.
- The reduced regression intentionally keeps only that source-specific directive attribute,
  proving cleaned-down preload image residue gets a precise label instead of relying only on the
  broad `Xiumi tn-* attribute` fallback.
- The detector intentionally does not block ordinary preload wording, image wording, lazy-loading
  prose, CSS image properties, standard `<img>` markup, or article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, image loading fidelity, public rendering, public-host acceptance, scheduled send,
  or publish success.

## 2026-06-26 Xiumi Component Structure Binding Metadata Residue

- [x] xiumi-component-structure-binding-metadata-residue-20260626.txt
- Added a static quality rule for Xiumi component-structure binding metadata observed in
  editor-side component instance state: `tn-comp`, `tn-comp-role`, `tn-comp-index`, and
  `tn-comp-pose`.
- The reduced regression intentionally keeps only `tn-comp*` binding attributes plus readable
  text, proving the cleaned component-structure binding residue is blocked without relying on
  `tn-bind-comp-*`, `tn-uuid`, `tn-animate`, `tn-link`, `tn-image`, `tn-image-usage`,
  `tn-cell-type`, `tn-child-position`, `tn-page-stage-size`, component/cell/layer/page classes,
  hosted-media, Angular `ng-*`, `opera-*`, renderer-pipeline attributes, `contenteditable`, SVG
  content-layer, `raw-image`, image wrapper classes, page/layer slots, gallery wrappers,
  `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- The broader `Xiumi component binding attribute residue` bucket remains active for the
  still-unsplit `tn-cell*`, `tn-child-*`, `tn-page-*`, and `tn-atom-context` binding attributes
  after component-structure binding metadata moved to a narrower diagnostic.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Cell Binding Metadata Residue

- [x] xiumi-cell-binding-metadata-residue-20260626.txt
- Added a static quality rule for Xiumi cell binding metadata observed in editor-side cell/content
  slot state: `tn-cell` and `tn-cell-type`.
- The reduced regression intentionally keeps only `tn-cell` / `tn-cell-type` binding attributes
  plus readable text, proving the cleaned cell binding residue is blocked without relying on
  `tn-bind-comp-*`, `tn-uuid`, `tn-animate`, `tn-link`, `tn-image`, `tn-image-usage`,
  `tn-comp*`, `tn-child-position`, `tn-page-stage-size`, component/cell/layer/page classes,
  hosted-media, Angular `ng-*`, `opera-*`, renderer-pipeline attributes, `contenteditable`, SVG
  content-layer, `raw-image`, image wrapper classes, page/layer slots, gallery wrappers,
  `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- The broader `Xiumi component binding attribute residue` bucket remains active for the
  still-unsplit `tn-child-*`, `tn-page-*`, and `tn-atom-context` binding attributes after cell
  binding metadata moved to a narrower diagnostic.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Child Layout Binding Metadata Residue

- [x] xiumi-child-layout-binding-metadata-residue-20260626.txt
- Added a static quality rule for Xiumi child layout binding metadata observed in editor-side
  child/layer layout state: `tn-child-position` and `tn-child-orientation`.
- The reduced regression intentionally keeps only `tn-child-position` / `tn-child-orientation`
  binding attributes plus readable text, proving the cleaned child layout binding residue is
  blocked without relying on `tn-bind-comp-*`, `tn-uuid`, `tn-animate`, `tn-link`, `tn-image`,
  `tn-image-usage`, `tn-comp*`, `tn-cell*`, `tn-page-stage-size`, component/cell/layer/page
  classes, hosted-media, Angular `ng-*`, `opera-*`, renderer-pipeline attributes,
  `contenteditable`, SVG content-layer, `raw-image`, image wrapper classes, page/layer slots,
  gallery wrappers, `ui-slider`, `ui-sortable`, `op-loader`, `touch-action`, `user-select`,
  `pointer-events`, `visibility:hidden`, or `foreignObject` markers.
- The fixture intentionally uses `tn-child-orientation="flow-canvas"`, so the existing
  `Xiumi SVG carousel flow-canvas residue` may remain in the report as a separate SVG/H5 risk.
- The broader `Xiumi component binding attribute residue` bucket remains active for the
  still-unsplit `tn-page-*` and `tn-atom-context` binding attributes after child layout binding
  metadata moved to a narrower diagnostic.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Page Binding Metadata Residue

- [x] xiumi-page-binding-metadata-residue-20260626.txt
- Added a static quality rule for Xiumi page/stage binding metadata observed in editor-side page
  canvas state: `tn-page-stage-size`, `tn-page-view-box-editor-desktop`, and
  `tn-page-cache-gatherer`.
- The reduced regression intentionally keeps only `tn-page-*` binding attributes plus readable
  text, proving the cleaned page binding residue is blocked without relying on
  `tn-bind-comp-*`, `tn-uuid`, `tn-animate`, `tn-link`, `tn-image`, `tn-image-usage`,
  `tn-comp*`, `tn-cell*`, `tn-child-*`, component/cell/layer/page classes, hosted-media,
  Angular `ng-*`, `opera-*`, renderer-pipeline attributes, `contenteditable`, SVG content-layer,
  `raw-image`, image wrapper classes, page/layer slots, gallery wrappers, `ui-slider`,
  `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- The broader `Xiumi component binding attribute residue` bucket remains active for the
  still-unsplit `tn-atom-context` binding attribute after page binding metadata moved to a
  narrower diagnostic.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Atom Context Binding Metadata Residue

- [x] xiumi-atom-context-binding-metadata-residue-20260626.txt
- Added a static quality rule for Xiumi atom context binding metadata observed in editor-side
  atom/component runtime state: `tn-atom-context`.
- The reduced regression intentionally keeps only `tn-atom-context` plus readable text, proving the
  cleaned atom-context residue is blocked without relying on `tn-bind-comp-*`, `tn-uuid`,
  `tn-animate`, `tn-link`, `tn-image`, `tn-image-usage`, `tn-comp*`, `tn-cell*`, `tn-child-*`,
  `tn-page-*`, component/cell/layer/page classes, hosted-media, Angular `ng-*`, `opera-*`,
  renderer-pipeline attributes, `contenteditable`, SVG content-layer, `raw-image`, image wrapper
  classes, page/layer slots, gallery wrappers, `ui-slider`, `ui-sortable`, `op-loader`,
  `touch-action`, `user-select`, `pointer-events`, `visibility:hidden`, or `foreignObject`
  markers.
- The old broad `Xiumi component binding attribute residue` bucket is now fully decomposed; the
  generic `Xiumi tn-* attribute` guard remains a final catch-all for unexpected Xiumi `tn-*`
  leakage.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Auxiliary Binding Metadata Residue

- [x] xiumi-auxiliary-binding-metadata-residue-20260626.txt
- Added a static quality rule for Xiumi auxiliary binding metadata observed in a live Xiumi v5
  paper-editor center sample: `tn-bind-aux-prop`.
- The reduced regression intentionally keeps only `tn-bind-aux-prop` plus readable text, proving
  the cleaned auxiliary-binding residue is blocked without relying on `tn-bind-comp-*`, `tn-uuid`,
  `tn-animate`, `tn-link`, `tn-image`, `tn-image-usage`, `tn-comp*`, `tn-cell*`, `tn-child-*`,
  `tn-page-*`, `tn-atom-context`, component/cell/layer/page classes, hosted-media, Angular
  `ng-*`, `opera-*`, renderer-pipeline attributes, `contenteditable`, SVG content-layer,
  `raw-image`, image wrapper classes, page/layer slots, gallery wrappers, `ui-slider`,
  `ui-sortable`, `op-loader`, `touch-action`, `user-select`, `pointer-events`,
  `visibility:hidden`, or `foreignObject` markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Operation Bar Dropdown Residue

- [x] xiumi-operation-bar-dropdown-residue-20260626.txt
- Added a static quality rule for Xiumi operation-bar dropdown/menu controls observed in the live
  Xiumi v5 paper-editor DOM: `op-bar-menu`, `op-bar-btn`, `op-bar-icon`,
  `shortcut-op-bar-panel`, `spacing-panel`, `format-panel`, `size-list-menu`, and
  `insert-text-op-bar-panel`.
- The reduced regression intentionally keeps only source-specific operation-bar classes plus
  readable shortcut/menu text, proving the cleaned dropdown/menu control residue is blocked
  without relying on UI Bootstrap directives, top operation classes, broad Angular `ng-*`,
  paper auxiliary tree controls, selection overlays, crop/worker controls, operator-dock parents,
  operator depot items, `op-loader`, broad `tn-*`, `opera-tn-*`, `contenteditable`, hosted media,
  SVG content-layer, `ui-slider`, `ui-sortable`, `touch-action`, or `user-select` markers.
- The detector intentionally does not block generic `dropdown-menu`, `btn`, `btn-group`,
  `line-spacing`, or readable shortcut text by themselves.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Color Selector Control Residue

- [x] xiumi-color-selector-control-residue-20260626.txt
- Added a static quality rule for Xiumi color-selector controls observed in the live Xiumi v5
  paper-editor DOM: `color-selector-dropdown`, `op-theme-color-sec`, `text-color-btn`,
  `tn-color-circle`, `text-shadow-icon`, `text-fill-image-icon`, `tn-color-selector`,
  `tn-color-selector-x`, `hello-color-x`, `on-color-choose`, `on-color-changing`,
  `on-color-choose-cancel`, `support-color-category`, `fetch-color-from-template-panel`, and
  `support-batch-change-color`.
- The reduced regression intentionally keeps only source-specific color-selector controls plus
  readable color labels, proving the cleaned color-control residue is blocked without relying on
  operation-bar controls, UI Bootstrap directives, top operation classes, broad Angular `ng-*`,
  paper auxiliary tree controls, selection overlays, crop/worker controls, operator-dock parents,
  operator depot items, `op-loader`, broad non-color `tn-*`, `opera-tn-*`, `contenteditable`,
  hosted media, SVG content-layer, `ui-slider`, `ui-sortable`, `touch-action`, or `user-select`
  markers.
- The detector intentionally does not block ordinary text about colors, generic
  `dropdown-toggle`, generic `btn-group`, readable color labels, or regular inline style color
  declarations by themselves.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Font And Format Control Residue

- [x] xiumi-font-format-control-residue-20260626.txt
- Added a static quality rule for Xiumi font-family, font-size, and basic-format controls observed
  in the live Xiumi v5 paper-editor DOM: `tn-global-format-dropdown`,
  `tn-basic-format-tabset`, `font-family-menu`, `font-family-list`, `stc-family-name-yzk--1`,
  `text-format-brush`, `text-misc`, `size-input`, `tn-list-locate-active-item`,
  `tn-number-input`, `tn-text-input-begin`, `tn-text-input-done`, `skim-value-prev`, `skim-value-next`,
  `skim-change`, and `skim-end`.
- The reduced regression intentionally keeps only source-specific font/basic-format controls plus
  readable font labels, proving the cleaned typography-control residue is blocked without relying
  on color-selector controls, operation-bar controls, UI Bootstrap directives, top operation
  classes, broad Angular `ng-*`, paper auxiliary tree controls, selection overlays,
  crop/worker controls, operator-dock parents, operator depot items, `op-loader`, broad non-font
  `tn-*`, `opera-tn-*`, `contenteditable`, hosted media, SVG content-layer, `ui-slider`,
  `ui-sortable`, `touch-action`, or `user-select` markers.
- The detector intentionally does not block ordinary prose containing font names, generic
  `font-family`, generic `font-size`, generic `btn-group`, regular inline font styles, or readable
  font labels by themselves.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Text Input Begin Directive Residue

- [x] xiumi-text-input-begin-directive-residue-20260629.txt
- Extended the existing `Xiumi font and format control residue` rule for the live Xiumi v5
  text/title/author input begin callback directive `tn-text-input-begin`.
- The reduced regression intentionally keeps only that source-specific directive attribute,
  proving cleaned-down text input begin callbacks get the same precise font/format label instead
  of relying only on the broad `Xiumi tn-* attribute` fallback.
- The detector intentionally does not block ordinary title wording, author wording, input wording,
  begin wording, CSS typography properties, standard text inputs, or article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  title/author input fidelity, typography fidelity, sync, upload, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Text Toolbar Control Residue

- [x] xiumi-text-toolbar-control-residue-20260626.txt
- Added a static quality rule for Xiumi text-toolbar controls observed in the live Xiumi v5
  paper-editor DOM where `op-text-sec` is paired with `font-size`, `font-family`, `text-style`, or
  `text-misc` on the same element.
- The reduced regression intentionally keeps only paired text-toolbar controls plus readable
  toolbar labels, proving the cleaned toolbar residue is blocked without relying on font-family
  menus, font-size skimmer attributes, color-selector controls, operation-bar controls,
  UI Bootstrap directives, top operation classes, broad Angular `ng-*`, paper auxiliary tree
  controls, selection overlays, crop/worker controls, operator-dock parents, operator depot items,
  `op-loader`, broad `tn-*`, `opera-tn-*`, `contenteditable`, hosted media, SVG content-layer,
  `ui-slider`, `ui-sortable`, `touch-action`, or `user-select` markers.
- Follow-up rule `xiumi-text-operation-section-residue-20260629.txt` extends this same precise
  label to standalone `op-text-sec` class/id markers. The detector still does not block standalone
  `font-size`, standalone `font-family`, ordinary text about fonts, regular inline font styles, or
  readable toolbar labels by themselves.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Text Operation Section Residue

- [x] xiumi-text-operation-section-residue-20260629.txt
- Extended the existing static quality rule for live Xiumi v5 text-toolbar controls to cover
  standalone `op-text-sec` class/id markers.
- The reduced regression intentionally keeps only `op-text-sec`, proving cleaned-down text
  operation sections are reported precisely without relying on font-size, font-family, text-style,
  text-misc, color-selector controls, font-format controls, text editing flyouts, brush panels,
  hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary text wording, toolbar wording, CSS font
  properties, article typography prose, generic text sections, or non-Xiumi class names by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  typography fidelity, Dark Mode, sync, upload, public rendering, public-host acceptance,
  scheduled send, or publish success.

## 2026-06-29 Xiumi Text Editing Flyout Residue

- [x] xiumi-text-editing-flyout-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 text editing flyout child controls including
  `in-text-cell-editing-op`, `cp-op-quick-input-prompt`, `op-text-img-resizing-surface`,
  `text-bgd-shadow`, and `toggle-color-btn`.
- The reduced regression intentionally keeps only those source-specific child control markers,
  proving cleaned-down text flyout residue is blocked without relying on `op-text-sec`,
  `font-size`, `font-family`, `text-style`, `font-family-menu`, `op-bar-menu`,
  `op-worker-surface`, operation loader chrome, hosted media, Angular runtime attributes, sidebar
  controls, or meta panels.
- The detector intentionally does not block ordinary text, color, background, shadow, quick input,
  resize, toolbar, font, style, button, or prompt wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Brush Panel Residue

- [x] xiumi-brush-panel-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 text-format brush panel child controls including
  `brush-panel`.
- The reduced regression intentionally keeps only that source-specific child control plus inert
  image context, proving cleaned-down brush-panel residue is blocked without relying on
  `text-format-brush`, `op-text-sec`, `in-text-cell-editing-op`, `op-bar-menu`, font-format
  controls, operation loader chrome, hosted media, Angular runtime attributes, sidebar controls,
  or meta panels.
- The detector intentionally does not block ordinary brush, format, list, drag, pin, style, or
  toolbar wording by itself; `icon-image` is observed context only and is not a standalone trigger.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Editor Prompt Banner Residue

- [x] xiumi-editor-prompt-banner-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 prompt banner markers including
  `tn-compatible-prompt` and `tn-operate-prompt`.
- The reduced regression intentionally keeps only those source-specific prompt markers, proving
  browser-compatibility and copy/plugin operation prompts are blocked without relying on
  `tn-working-pallet`, `tn-studio-paper`, `tn-editing-desk`, Angular runtime classes, top
  operation buttons, user profile menus, operation-bar dropdowns, hosted media, sidebar controls,
  or meta panels.
- The detector intentionally does not block ordinary browser, compatibility, copy, plugin,
  operation, prompt, close, sync, paste, or article wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Navigation Shell Residue

- [x] xiumi-navigation-shell-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 navigation shell wrappers including `x3-navbar`,
  `x3-nav-brand`, `x3-nav-path`, and `x3-nav-misc`.
- The reduced regression intentionally keeps only those source-specific shell markers, proving
  brand/path/login navigation chrome is blocked without relying on `x3-nav-op-buttons`,
  `tn-op-btn-group`, operation buttons, prompt banners, Angular runtime classes,
  UI Bootstrap directives, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary nav, navbar, path, brand, login, breadcrumb,
  menu, Xiumi wording, or generic `navbar` classes by themselves.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Header Shell Residue

- [x] xiumi-header-shell-residue-20260629.txt
- Added a static quality rule for the live Xiumi v5 top header wrapper `tn-header`.
- The reduced regression intentionally keeps only that source-specific header marker plus inert
  generic navbar text, proving the editor header shell is reported precisely without relying on
  `x3-navbar`, `x3-nav-*`, operation buttons, prompt banners, Angular runtime classes,
  UI Bootstrap directives, hosted media, sidebar controls, or meta panels.
- Before the exact rule, the same fixture was already blocked only by the broad
  `Xiumi tn-* attribute` fallback; this slice improves diagnosability without loosening the gate.
- The detector intentionally does not block ordinary header, navigation, transition, brand, path,
  login, menu wording, generic `header` tags, or `navbar-static-top` classes by themselves.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Audio Room Tab Residue

- [x] xiumi-audio-room-tab-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 audio/video library room tabs:
  `tn-aud-rooms-tab` and `tn-aud-room-item`.
- The reduced regression intentionally keeps only those source-specific media-room tab classes,
  proving audio/video library tab chrome is reported precisely without relying on parent `audios`
  wrappers, audio panel controls, hidden audio-library controls, hidden upload inputs,
  generated-link controls, account/sync panels, Angular runtime attributes, hosted media, sidebar
  controls, or meta panels.
- The detector intentionally does not block ordinary tab/list markup, ordinary music/video prose,
  ordinary `<audio>` elements, or standard Bootstrap `nav nav-tabs` classes by themselves.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile media playback, mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance,
  public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Login Layer Residue

- [x] xiumi-login-layer-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 login, authorization, and preview overlay shells
  carrying the source-specific `tn-login-layer` class marker.
- The reduced regression intentionally keeps only that shell marker plus contextual authorization
  child markup, proving login/authorization overlay chrome is reported precisely without relying
  on account/sync panels, audio panel controls, audio-room tabs, hidden audio-library controls,
  hidden upload inputs, generated-link controls, Angular runtime attributes, hosted media, sidebar
  controls, or meta panels.
- The detector intentionally does not block ordinary authorization, login, preview, account, or
  popup wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile media playback, mobile SMIL/click interaction, account authorization, preview dialog
  success, sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance,
  scheduled send, or publish success.

## 2026-06-29 Xiumi Template Entry Block Residue

- [x] xiumi-template-entry-block-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 template recommendation / entry block chrome
  carrying the source-specific `tn-tpl-entry-ex-block` class marker.
- The reduced regression intentionally keeps only that marker, proving template-library entry
  chrome is reported precisely without relying on renderer-pipeline attributes, source-house
  markers, scene markers, template-card hover classes, hosted media, Angular runtime attributes,
  sidebar controls, or meta panels.
- The broad template authoring and `tn-*` fallbacks may still report the same fragment; the exact
  label exists for operator diagnosis and rule accounting.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, template reuse rights, sync, upload, cover thumbnail acceptance,
  public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Template List Refresh Directive Residue

- [x] xiumi-template-list-refresh-directive-residue-20260629.txt
- Added a static quality rule for the live Xiumi v5 template/material list refresh directive
  `tn-pull-to-refresh`.
- The reduced regression intentionally keeps only that source-specific directive attribute,
  proving cleaned-down template/material list refresh residue gets a precise label instead of
  relying only on the broad `Xiumi tn-* attribute` fallback.
- The detector intentionally does not block ordinary template wording, list wording, refresh
  wording, pull wording, pagination prose, standard list markup, or article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  material-list loading fidelity, template refresh behavior, sync, upload, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Editor Interaction Directive Residue

- [x] xiumi-editor-interaction-directive-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 editor interaction directives including
  `tn-snatch-at`, `tn-ui-droppable`, `tn-comp-enter-editing`, `tn-comp-exit-editing`,
  `tn-bind-comp-inst-page-mode`, and `tn-data-list`.
- The reduced regression intentionally keeps only those source-specific directive attributes,
  proving cleaned-down editor interaction residue gets a precise label instead of relying only on
  the broad `Xiumi tn-* attribute` fallback.
- The detector intentionally does not block ordinary interaction wording, editor wording,
  drag/drop prose, component wording, ordered-list markup, or article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  drag/drop fidelity, component-editing fidelity, H5 interaction behavior, sync, upload, public
  rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Image Crop Directive Residue

- [x] xiumi-image-crop-directive-residue-20260629.txt
- Added a static quality rule for the live Xiumi v5 image crop directive `tn-img-crop`.
- The reduced regression intentionally keeps only that source-specific directive attribute,
  proving cleaned-down image crop residue gets a precise label instead of relying only on the
  broad `Xiumi tn-* attribute` fallback.
- The detector intentionally does not block ordinary crop wording, image wording, standard `<img>`
  markup, standard cropping prose, or article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  image crop fidelity, public-host acceptance, sync, upload, cover thumbnail acceptance,
  scheduled send, or publish success.

## 2026-06-29 Xiumi Sound/Comment Binding Metadata Residue

- [x] xiumi-sound-comment-binding-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 sound/comment binding metadata directives:
  `tn-sound` and `tn-comment`.
- The reduced regression intentionally keeps only those source-specific directive attributes,
  proving cleaned-down sound/comment binding metadata gets a precise label instead of relying
  only on the broad `Xiumi tn-* attribute` fallback.
- The detector intentionally does not block ordinary sound wording, comment wording, ordinary
  `<audio>` elements, article text, or non-Xiumi class names by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  media playback fidelity, comment-system fidelity, sync, upload, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Third-Party Image Source Coverage

- [x] xiumi-third-party-image-source-coverage-20260629.txt
- Added direct three-platform regression coverage for the existing
  `Xiumi third-party image source` detector.
- The reduced regression intentionally keeps only `img` / `source` nodes whose source attributes
  point to Xiumi-hosted material URLs, proving the external asset dependency diagnostic does not
  require `tn-*`, `ng-*`, contenteditable, editor wrapper classes, sidebar controls, or meta
  panels.
- The detector intentionally does not block ordinary local image references, ordinary public HTTPS
  image hosts, article text mentioning Xiumi, or non-image/link attributes by itself.
- Boundary: this is static publishability protection only. It does not prove image availability,
  public-host acceptance, platform-host proxying, paste, phone preview, upload, scheduled send, or
  publish success.

## 2026-06-29 135 Base Residue Coverage

- [x] 135-base-residue-coverage-20260629.txt
- Added direct three-platform regression coverage for the existing 135 base detector labels:
  `135 data-tools marker`, `135 numeric style id on copied market block`, and
  `135 third-party image source`.
- The reduced regression intentionally keeps only a 135 wrapper with `data-tools="135编辑器"`, a
  numeric `data-id`, and a 135-hosted image source, proving base provenance and external material
  diagnostics do not require SVG builder controls, material list controls, hosted-background
  diagnostics, Xiumi markers, Angular/Vue markers, contenteditable, sidebar controls, or meta
  panels.
- The detectors intentionally do not block ordinary prose about 135, local image references,
  ordinary public HTTPS image hosts, or numeric ids unrelated to 135 market blocks by themselves.
- Boundary: this is static publishability protection only. It does not prove image availability,
  public-host acceptance, platform-host proxying, paste, phone preview, upload, scheduled send, or
  publish success.

## 2026-06-29 Xiumi Page Mode Binding Residue

- [x] xiumi-page-mode-binding-residue-20260629.txt
- Added static quality coverage for the live Xiumi v5 page-mode binding directive
  `tn-bind-page-mode` under the existing `Xiumi page binding metadata residue` label.
- The reduced regression intentionally keeps only that source-specific directive attribute,
  proving cleaned-down page-mode binding residue gets a precise page binding label instead of
  relying only on the broad `Xiumi tn-* attribute` fallback.
- The detector intentionally does not block ordinary page wording, mode wording, layout prose,
  article text, or non-Xiumi class names by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  page-mode fidelity, sync, upload, public rendering, public-host acceptance, scheduled send, or
  publish success.

## 2026-06-29 Xiumi State Loading Utility Residue

- [x] xiumi-state-loading-utility-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 state/loading utility controls including
  `tn-state-transition-animation`, `tn-input-sortable-group`, `tn-bar-btn-active-color`,
  `tn-loading-overlap`, and `tn-top-loading-block`.
- The reduced regression intentionally keeps only those source-specific state/loading utility
  markers, proving transition/loading utility controls are reported precisely without relying on
  `tn-quick-input*`, `tn-state-active`, `tn-state-frozen`, `tn-sortable-pin`,
  `tn-group-sortable-box`, operation-panel controls, component-depot controls, hosted media,
  sidebar controls, or meta panels.
- The detector intentionally does not block ordinary state wording, loading wording, transition
  wording, sortable wording, active-color prose, loading UI text, CSS transition properties, CSS
  animation properties, or article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  state/loading animation fidelity, mobile SMIL/click interaction, H5 behavior, Dark Mode, sync,
  upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Background Transparency Operation Residue

- [x] xiumi-background-transparency-operation-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 background/transparency operation controls
  including `op-background-sec` and `op-gen-transparency`.
- The reduced regression intentionally keeps only those source-specific operation markers, proving
  background/transparency controls are reported precisely without relying on `bg-attr-menu`,
  `bg-repeat-select`, `bg-attach-check`, `ce-op-background`, `op-cp-bg-bar`, crop panels, worker
  surfaces, operation-panel component controls, generated-link controls, attribute-board controls,
  hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary background wording, transparency wording,
  generated-image wording, CSS background properties, CSS opacity properties, or article text by
  itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  background fidelity, transparency rendering, Dark Mode, sync, upload, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Operation Panel Component Control Residue

- [x] xiumi-operation-panel-component-control-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 operation-panel component controls including
  `op-cp-animation`, `op-cp-insert-text`, `op-cp-margin`, `op-cp-margin-tb`,
  `op-cp-save`, `op-cp-scale`, `op-ce-bg-bar`, and `op-ce-profile-card`.
- The reduced regression intentionally keeps only supported `op-cp-*` and `op-ce-*` panel
  markers, proving operation-panel component controls are reported precisely without relying on
  `op-dock`, `out-comp-*`, `op-ce-layout-*`, `op-cp-pose`,
  `op-cp-paper-comps-assistant`, `op-gen-link`, `op-cp-background-audio`,
  `op-cp-wx-miniprogram-link`, `dc-cp-*`, `dc-ce-*`, `tn-op-dc-item`, paper auxiliary tree
  controls, generated-link controls, attribute-board controls, hosted media, sidebar controls, or
  meta panels.
- The detector intentionally does not block ordinary animation wording, insert-text wording,
  margin CSS, save wording, scale wording, background wording, profile-card prose, or article text
  by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  profile-card fidelity, component action behavior, H5 behavior, sync, upload, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Component Operation Depot Action Residue

- [x] xiumi-component-operation-depot-action-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component operation-depot actions including
  `dc-cp-link`, `dc-cp-copy-to-clipboard`, `dc-cp-wx-miniprogram-link`,
  `dc-cp-out-comp-edit`, `dc-cp-quick-input-prompt`, `dc-cp-replace-template`,
  `dc-cp-rolling-over`, and `dc-cp-zorder`.
- The reduced regression intentionally keeps only supported `dc-cp-*` action markers, proving
  component operation-depot actions are reported precisely without relying on `op-dc-*`, `ce-dc`,
  `cp-dc`, `dc-ce-*`, `dc-multi-cp-*`, `tn-op-dc-item`, operator-dock parents,
  generated-link controls, attribute-board controls, native/embed controls, SVG/animation
  controls, image transform controls, box style controls, typography controls, table controls,
  layout/geometry controls, form/input controls, mobile viewport controls, hosted media, sidebar
  controls, or meta panels.
- The broad `Xiumi operator depot item residue` detector excludes the reduced `dc-cp-*` action
  fixture so it is not double-reported as generic operator-depot residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  link fidelity, component action behavior, H5 behavior, sync, upload, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Component Depot Native Control Residue

- [x] xiumi-component-depot-native-control-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component-depot native/embed controls including
  `dc-ce-audio-card`, `dc-ce-music-card`, `dc-ce-map`, `dc-ce-map-tx`,
  `dc-ce-profile-card`, `dc-ce-redpack-cover`, `dc-ce-svg`, `dc-ce-video-card`,
  `dc-ce-video-link`, `dc-ce-video-tx`, and `dc-ce-video-xm`.
- The reduced regression intentionally keeps only supported native/embed `dc-ce-*` component
  markers, proving component-depot media/map/profile/red-packet/SVG/video entries are reported
  precisely without relying on `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`,
  operator-dock parents, attribute-board controls, generated-link controls, audio panels, media
  upload inputs, Angular runtime attributes, hosted media, sidebar controls, or meta panels.
- The broad `Xiumi operator depot item residue` detector excludes the reduced native/embed
  component fixture so it is not double-reported as generic operator-depot residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile media playback, mobile SMIL/click interaction, native/embed component acceptance, sync,
  upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled send, or
  publish success.

## 2026-06-29 Xiumi Component Depot SVG Animation Residue

- [x] xiumi-component-depot-svg-animation-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component-depot SVG/animation controls including
  `dc-ce-animation`, `dc-ce-svg-animate`, and `dc-ce-svg-animation`.
- The reduced regression intentionally keeps only supported SVG/animation `dc-ce-*` component
  markers, proving component-depot SVG animation controls are reported precisely without relying
  on plain `dc-ce-svg`, `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`,
  operator-dock parents, animation attribute panels, animation style pickers, native/embed
  controls, image transform controls, box style controls, typography controls, table controls,
  layout/geometry controls, form/input controls, mobile viewport controls, hosted media, sidebar
  controls, or meta panels.
- The native `dc-ce-svg` detector no longer overmatches `dc-ce-svg-*`, and the broad
  `Xiumi operator depot item residue` detector excludes the reduced SVG animation fixture so it is
  not double-reported as generic operator-depot residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  SVG animation fidelity, mobile SMIL/click interaction, H5 behavior, sync, upload, public
  rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Component Depot External Edit Link Residue

- [x] xiumi-component-depot-external-edit-link-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component-depot external edit/link controls
  including `dc-ce-out-cell-edit` and `dc-ce-play-cp-link`.
- The reduced regression intentionally keeps only supported external edit/link `dc-ce-*`
  component markers, proving component-depot external edit/link controls are reported precisely
  without relying on `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`,
  operator-dock parents, generated-link controls, attribute-board controls, native/embed controls,
  SVG/animation controls, image transform controls, box style controls, typography controls, table
  controls, layout/geometry controls, form/input controls, mobile viewport controls, hosted media,
  sidebar controls, or meta panels.
- The broad `Xiumi operator depot item residue` detector excludes the reduced external edit/link
  fixture so it is not double-reported as generic operator-depot residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  link fidelity, external component behavior, sync, upload, public rendering, public-host
  acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Component Depot Form Input Residue

- [x] xiumi-component-depot-form-input-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component-depot form/input controls including
  `dc-ce-input-checkbox`, `dc-ce-input-radio`, `dc-ce-input-select`, `dc-ce-input-text`, and
  `dc-ce-input-multi-line-text`.
- The reduced regression intentionally keeps only supported `dc-ce-input-*` component markers,
  proving component-depot form/input entries are reported precisely without relying on
  `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents, layout/form
  panels, layout/form child controls, attribute-board controls, generated-link controls, Angular
  runtime attributes, hosted media, sidebar controls, or meta panels.
- The broad `Xiumi operator depot item residue` detector excludes the reduced form/input component
  fixture so it is not double-reported as generic operator-depot residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile form interaction, mobile SMIL/click interaction, native component acceptance, sync,
  upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled send, or
  publish success.

## 2026-06-29 Xiumi Component Depot Layout Geometry Residue

- [x] xiumi-component-depot-layout-geometry-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component-depot layout/geometry controls including
  `dc-ce-layout-free`, `dc-ce-layout-fixed-aspect-ratio`, `dc-ce-layout-scroll-direction`,
  `dc-ce-layout-column`, `dc-ce-layout-hidden`, `dc-ce-layout-style`,
  `dc-ce-layout-transparent`, `dc-ce-layout-vertical-align`, `dc-ce-static-position-size`,
  `dc-ce-auto-align`, `dc-ce-width`, `dc-ce-height`, `dc-ce-margin`, `dc-ce-spacing`, and
  `dc-ce-frozen`.
- The reduced regression intentionally keeps only supported layout/geometry `dc-ce-*` component
  markers, proving component-depot layout/geometry entries are reported precisely without relying
  on `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents, layout/form
  panels, layout/form child controls, attribute-board controls, generated-link controls, Angular
  runtime attributes, hosted media, sidebar controls, or meta panels.
- The broad `Xiumi operator depot item residue` detector excludes the reduced layout/geometry
  component fixture so it is not double-reported as generic operator-depot residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile free-layout interaction, mobile SMIL/click interaction, native component acceptance, sync,
  upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled send, or
  publish success.

## 2026-06-29 Xiumi Component Depot Mobile Viewport Residue

- [x] xiumi-component-depot-mobile-viewport-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component-depot mobile viewport controls including
  `dc-ce-mobile-background`, `dc-ce-mobile-group`, `dc-ce-mobile-image`,
  `dc-ce-mobile-text`, and `dc-ce-mobile-unsupport`.
- The reduced regression intentionally keeps only supported mobile viewport `dc-ce-mobile-*`
  component markers, proving component-depot mobile viewport entries are reported precisely
  without relying on `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock
  parents, layout/geometry controls, form/input controls, native/embed controls,
  attribute-board controls, generated-link controls, Angular runtime attributes, hosted media,
  sidebar controls, or meta panels.
- The broad `Xiumi operator depot item residue` detector excludes the reduced mobile viewport
  component fixture so it is not double-reported as generic operator-depot residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile viewport acceptance, mobile H5 interaction, mobile SMIL/click interaction, native
  component acceptance, sync, upload, cover thumbnail acceptance, public rendering, public-host
  acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Component Depot Table Control Residue

- [x] xiumi-component-depot-table-control-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component-depot table controls including
  `dc-ce-classic-table-column-width`, `dc-ce-classic-table-grid`,
  `dc-ce-classic-table-merge`, `dc-ce-classic-table-quickly`,
  `dc-ce-classic-table-style`, and `dc-ce-classic-table-width`.
- The reduced regression intentionally keeps only supported `dc-ce-classic-table-*` component
  markers, proving component-depot table controls are reported precisely without relying on
  `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  layout/geometry controls, form/input controls, native/embed controls, mobile viewport controls,
  attribute-board controls, generated-link controls, Angular runtime attributes, hosted media,
  sidebar controls, or meta panels.
- The broad `Xiumi operator depot item residue` detector excludes the reduced table control
  component fixture so it is not double-reported as generic operator-depot residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  complex table rendering, table merge/width fidelity, mobile SMIL/click interaction, native
  component acceptance, sync, upload, cover thumbnail acceptance, public rendering, public-host
  acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Component Depot Image Transform Residue

- [x] xiumi-component-depot-image-transform-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component-depot image transform controls including
  `dc-ce-crop-image-crop`, `dc-ce-image-animation`, `dc-ce-image-crop`,
  `dc-ce-image-design`, `dc-ce-image-enhancement`, `dc-ce-image-flip`,
  `dc-ce-image-for-layout-datum`, `dc-ce-image-library`, `dc-ce-image-png-size`,
  `dc-ce-image-popup`, `dc-ce-image-replace-color`, `dc-ce-image-src`,
  `dc-ce-image-straw-color`, `dc-ce-image-style-brush`, `dc-ce-image-svg-clip`, and
  `dc-ce-image-to-background`.
- The reduced regression intentionally keeps only supported image transform `dc-ce-*` component
  markers, proving component-depot image transform controls are reported precisely without relying
  on `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  table controls, layout/geometry controls, form/input controls, native/embed controls, mobile
  viewport controls, crop panels, worker surfaces, hosted media, sidebar controls, or meta panels.
- The broad `Xiumi operator depot item residue` detector and the crop-panel child detector exclude
  the reduced image transform fixture so it is not double-reported as generic operator-depot or
  crop-panel child residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  image crop fidelity, SVG clip fidelity, popup image behavior, cover thumbnail acceptance, sync,
  upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Component Depot Table Auxiliary Residue

- [x] xiumi-component-depot-table-auxiliary-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component-depot table auxiliary controls including
  `dc-ce-table-column-width`, `dc-ce-table-grid`, and `dc-ce-table-style-brush`.
- The reduced regression intentionally keeps only supported table auxiliary `dc-ce-*` component
  markers, proving component-depot table auxiliary controls are reported precisely without relying
  on `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  classic-table controls, image transform controls, box style controls, typography controls,
  layout/geometry controls, form/input controls, native/embed controls, mobile viewport controls,
  hosted media, sidebar controls, or meta panels.
- The broad `Xiumi operator depot item residue` detector excludes the reduced table auxiliary
  fixture so it is not double-reported as generic operator-depot residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  table rendering, column-width fidelity, grid fidelity, style-brush fidelity, sync, upload,
  public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Component Depot Box Style Residue

- [x] xiumi-component-depot-box-style-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component-depot box/background style controls
  including `dc-ce-background`, `dc-ce-box-border`, `dc-ce-box-formats`,
  `dc-ce-box-metrics`, `dc-ce-box-shadow`, and `dc-ce-transparency`.
- The reduced regression intentionally keeps only supported box/background style `dc-ce-*`
  component markers, proving component-depot box style controls are reported precisely without
  relying on `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  image transform controls, typography controls, table controls, layout/geometry controls,
  form/input controls, native/embed controls, mobile viewport controls, hosted media, sidebar
  controls, or meta panels.
- The broad `Xiumi operator depot item residue` detector excludes the reduced box style fixture
  so it is not double-reported as generic operator-depot residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  visual-style fidelity, background rendering, border/shadow fidelity, transparency rendering,
  Dark Mode, sync, upload, public rendering, public-host acceptance, scheduled send, or publish
  success.

## 2026-06-29 Xiumi Component Depot Typography Control Residue

- [x] xiumi-component-depot-typography-control-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component-depot typography controls including
  `dc-ce-font-size-scale`, `dc-ce-paragraph-margin`, `dc-ce-text-all`,
  `dc-ce-text-code`, `dc-ce-text-decoration`, `dc-ce-text-shadow`, and
  `dc-ce-text-shadow-style`.
- The reduced regression intentionally keeps only supported typography `dc-ce-*` component
  markers, proving component-depot typography controls are reported precisely without relying on
  `op-dc-*`, `ce-dc`, `cp-dc`, `dc-cp-*`, `tn-op-dc-item`, operator-dock parents,
  image transform controls, table controls, layout/geometry controls, form/input controls,
  native/embed controls, mobile viewport controls, hosted media, text toolbars, sidebar controls,
  or meta panels.
- The broad `Xiumi operator depot item residue` detector excludes the reduced typography fixture
  so it is not double-reported as generic operator-depot residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  paragraph spacing fidelity, code typography fidelity, text-shadow rendering, Dark Mode, sync,
  upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Audio Library Control Residue

- [x] xiumi-audio-library-control-residue-20260629.txt
- Added a static quality rule for the live Xiumi v5 audio/video library hidden media control:
  `<audio id="audio-library-control" class="bgm-audio ...">`.
- The reduced regression intentionally keeps only that exact source-specific audio id, proving
  audio-library chrome is reported precisely without relying on parent `audios` wrappers, audio
  panel controls, hidden upload inputs, generated-link controls, account/sync panels, Angular
  runtime attributes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary `<audio>` elements, article prose about
  audio/music/video, `class="bgm-audio"` without the live Xiumi id, or media wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile media playback, mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance,
  public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Audio Panel Residue

- [x] xiumi-audio-panel-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 audio/video library and background-music panel
  chrome: `audios`, `audio-panel`, `audio-src`, `audio-status`, `audio-edit`, `audio-del`, and
  `audio-group`.
- The reduced regression intentionally keeps only those source-specific media panel classes,
  proving audio panel chrome is reported precisely without relying on hidden upload inputs,
  generated-link controls, account/sync panels, Angular runtime classes, hosted media, sidebar
  controls, or meta panels.
- The detector intentionally does not block ordinary audio, music, video, panel, source, edit,
  delete, status, background, library, or media wording by itself, and does not block ordinary
  `<audio>` elements without the Xiumi class/id markers.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile media playback, mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance,
  public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Theme Color Widget Residue

- [x] xiumi-theme-color-widget-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 theme-color widget chrome:
  `color-widget`, `op-color-text`, `tn-color-palette-dock`, and `tn-color-picker-mask`.
- The reduced regression intentionally keeps only those source-specific left-side color widget
  classes, proving theme color widget chrome is reported precisely without relying on
  color-palette panels, color-picker trigger ids, color-selector controls, Angular runtime
  classes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary theme, color, widget, palette, dock, mask,
  picker, clear, or style wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Color Selector Class Residue

- [x] xiumi-color-selector-class-residue-20260629.txt
- Extended the existing static quality rule for live Xiumi v5 color selector controls to cover
  `tn-color-selector` and `tn-color-selector-x` when they appear as class/id tokens.
- The reduced regression intentionally keeps only those source-specific color selector classes,
  proving color selector chrome is reported precisely without relying on color selector dropdowns,
  theme color controls, `tn-color-circle`, color selector directives, palette panels, picker
  triggers, theme color widgets, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary color wording, selector wording, CSS color
  properties, palette prose, user article text, generic form controls, or non-Xiumi class names by
  itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  color fidelity, Dark Mode, sync, upload, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-29 Xiumi Color Picker Trigger Residue

- [x] xiumi-color-picker-trigger-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 hidden color picker trigger ids:
  `tnColorPickerTrigger` and `tnGradientColorPickerTrigger`.
- The reduced regression intentionally keeps only those source-specific body-level trigger ids,
  proving hidden color picker activation chrome is reported precisely without relying on
  color-palette panels, color-selector controls, Angular runtime classes, hosted media, sidebar
  controls, or meta panels.
- The detector intentionally does not block ordinary color, picker, trigger, gradient, palette,
  popup, hidden, or theme wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Media Upload Input Residue

- [x] xiumi-media-upload-input-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 hidden media upload inputs including
  `audioFileUploadInput`, `videoFileUploadInput`, `tn-audio-uploader`, and
  `tn-video-uploader`.
- The reduced regression intentionally keeps only those source-specific hidden upload markers,
  proving audio/video file-selector chrome is reported precisely without relying on generated-link
  controls, account/sync panels, Angular runtime attributes, hosted media, sidebar controls, or
  meta panels.
- The detector intentionally does not block ordinary audio, video, upload, file, input, media,
  mp3, m4a, mp4, or mov wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Color Palette Panel Residue

- [x] xiumi-color-palette-panel-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 color palette popup and mask markers including
  `tn-color-palette-panel`, `tn-color-palette-panel-mask`, `tnColorPaletteInst`, and
  `tnColorPaletteMask`.
- The reduced regression intentionally keeps only those source-specific color palette markers,
  proving popup/mask chrome is reported precisely without relying on color-selector controls,
  operation-bar dropdown controls, panel-header controls, Angular runtime attributes, hosted media,
  sidebar controls, or meta panels.
- The detector intentionally does not block ordinary color, palette, panel, mask, picker, storage,
  popup, or theme wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Component Drag Receiver Residue

- [x] xiumi-component-drag-receiver-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 component drag/drop receiver surfaces including
  `tn-comp-dragging-receiver`, `tn-comp-container-dragging-cancel`,
  `tn-comp-container-dragging-remove`, `tn-comp-moving-canceler`, and `tn-comp-trash-receiver`.
- The reduced regression intentionally keeps only those source-specific component drag/drop
  surfaces, proving drop/cancel/remove chrome is reported precisely without relying on atom
  drag-drop markers, header/navigation shells, operation buttons, prompt banners, UI Bootstrap
  directives, hosted media, sidebar controls, or meta panels.
- Before the exact rule, the same fixture was already blocked only by broader
  `Xiumi component authoring tree residue` and `Xiumi tn-* attribute` fallbacks; this slice
  improves diagnosability without loosening the gate.
- The detector intentionally does not block ordinary component, drag, drop, receiver, cancel,
  remove, move, trash, or surface wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi User Profile Menu Residue

- [x] xiumi-user-profile-menu-residue-20260629.txt
- Added a static quality rule for the live Xiumi v5 user profile dropdown marker
  `usr-info-desc-frame`.
- The reduced regression intentionally keeps only that source-specific user-menu marker plus
  generic dropdown context, proving cleaned-down account profile chrome is blocked without relying
  on `wx-user-panel`, `usr-message-box`, `message-box-toggle`, top operation buttons, dropdown
  directives, operation-bar dropdowns, Angular runtime attributes, hosted media, sidebar controls,
  or meta panels.
- The detector intentionally does not block ordinary account, profile, settings, invoice, sign
  out, user, dropdown, panel, or article wording by itself; `sign-out`, `nickname`, and
  `glyphicon` are observed context only.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Message Panel Residue

- [x] xiumi-message-panel-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 message notification dropdown markers including
  `usr-message-box`, `message-box-toggle`, `turn-to-message-setting`, and
  `turn-to-message-list`.
- The reduced regression intentionally keeps only those source-specific message-panel markers plus
  generic dropdown context, proving cleaned-down message chrome is blocked without relying on
  `wx-user-panel`, `usr-info`, top operation buttons, dropdown directives, operation-bar dropdowns,
  Angular runtime attributes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary message, notification, setting, list,
  account, dropdown, panel, or article wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Statistics Panel Residue

- [x] xiumi-statistics-panel-residue-20260629.txt
- Added a static quality rule for the live Xiumi v5 statistics dropdown panel marker
  `statistics-tool-panel`.
- The reduced regression intentionally keeps only that source-specific marker plus generic
  dropdown context, proving cleaned-down statistics panel residue is blocked without relying on
  `content-statistics`, `tn-page-toolbar`, right-toolbar controls, account/sync panels, dropdown
  directives, operation-bar dropdowns, Angular runtime attributes, hosted media, sidebar controls,
  or meta panels.
- The detector intentionally does not block ordinary statistics, count, reading time, link, image,
  library, panel, dropdown, or article wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Account Sync Panel Residue

- [x] xiumi-account-sync-panel-residue-20260629.txt
- Added a static quality rule for the live Xiumi v5 account/authorization/sync dropdown panel
  marker `wx-user-panel`.
- The reduced regression intentionally keeps only that source-specific marker plus generic
  dropdown context, proving cleaned-down account/sync panel residue is blocked without relying on
  `usr-info`, `user-info-toggle`, dropdown directives, generated-link controls, operation-bar
  dropdowns, account names, platform credentials, Angular runtime attributes, hosted media,
  sidebar controls, or meta panels.
- The detector intentionally does not block ordinary account, authorization, sync, public account,
  comment, preview, user, panel, dropdown, or article wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Menu Pin Control Residue

- [x] xiumi-menu-pin-control-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 operation menu pin controls including
  `op-cp-menu-pin` and `op-cp-menu-pin-tb`.
- The reduced regression intentionally keeps only those source-specific empty pin markers,
  proving cleaned-down menu-pin residue is blocked without relying on `op-loader`, `op-dock`,
  operator depot controls, attribute context-menu host controls, attribute-board controls,
  operation-bar dropdowns, Angular runtime attributes, hosted media, sidebar controls, or meta
  panels.
- The detector intentionally does not block ordinary menu, pin, fixed, floating, toolbar,
  operation, or article wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Attribute Context Menu Host Residue

- [x] xiumi-attr-context-menu-host-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 attribute context-menu host controls including
  `attr-bar-context-menu-host-for-comp-insert`, `attr-bar-context-menu-host-for-comp-modify`, and
  `attr-bar-context-menu-host-for-cell`.
- The reduced regression intentionally keeps only those source-specific empty host markers,
  proving cleaned-down attribute context-menu residue is blocked without relying on
  `op-gl-dc-attr-bars`, `op-dc-depot`, `op-dc-hidden`, `cp-role-*`, `ce-type-*`,
  attribute-board controls, operation-bar dropdowns, operator-dock controls, Angular runtime
  attributes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary attribute, context, menu, host, component,
  insert, modify, cell, or article wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Right Toolbar Control Residue

- [x] xiumi-right-toolbar-control-residue-20260626.txt
- Added a static quality rule for Xiumi right-side toolbar controls observed in the live Xiumi v5
  paper-editor DOM: `x5-right-toolbar`, `right-toolbar-container`,
  `right-toolbar-container-normal`, `right-toolbar-switch-container`, `right-toolbar-switch`,
  `right-toolbar-arrow-up`, `right-toolbar-arrow-down`, `content-statistics`,
  `page-assist-on-toolbar`, `zooming-selector`, and `tn-viewport-zooming-panel`.
- The reduced regression intentionally keeps only source-specific right-toolbar controls plus
  readable statistics/assistant/zoom labels, proving the cleaned editor chrome residue is blocked
  without relying on text-toolbar controls, font-family menus, font-size skimmer attributes,
  color-selector controls, operation-bar controls, UI Bootstrap directives, top operation classes,
  broad Angular `ng-*`, paper auxiliary tree controls, selection overlays, crop/worker controls,
  operator-dock parents, operator depot items, `op-loader`, broad non-toolbar `tn-*`,
  `opera-tn-*`, `contenteditable`, hosted media, SVG content-layer, `ui-slider`, `ui-sortable`,
  `touch-action`, or `user-select` markers.
- The detector intentionally does not block ordinary prose containing toolbar, statistics, zoom,
  assistant, or right-side wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Sidebar Tab Control Residue

- [x] xiumi-sidebar-tab-control-residue-20260626.txt
- Added a static quality rule for Xiumi left-sidebar and material/template tab controls observed in
  the live Xiumi v5 paper-editor DOM: `sidebar-panel`, `sidebar-style-normal`, `x3-tab-item`, and
  `tn-tab-ctrl-pin`.
- Adjacent icon classes such as `icon templates`, `icon material-img`, `icon fragments`,
  `icon clipboard`, `icon images`, `icon team-images`, and `icon music` are documented as observed
  context only; they are not standalone detector triggers.
- The reduced regression intentionally keeps only non-`tn-*` sidebar/tab controls plus readable
  template/material labels, proving the cleaned editor chrome residue is blocked without relying on
  right-toolbar controls, text-toolbar controls, font-family menus, color-selector controls,
  operation-bar controls, UI Bootstrap directives, top operation classes, broad Angular `ng-*`,
  paper auxiliary tree controls, selection overlays, crop/worker controls, operator-dock parents,
  operator depot items, `op-loader`, broad `tn-*`, `opera-tn-*`, `contenteditable`, hosted media,
  SVG content-layer, `ui-slider`, `ui-sortable`, `touch-action`, or `user-select` markers.
- The detector intentionally does not block ordinary prose containing sidebar, template, material,
  image, music, clipboard, tab, or icon wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 Xiumi Meta Panel Control Residue

- [x] xiumi-meta-panel-control-residue-20260626.txt
- Added a static quality rule for Xiumi cover/article metadata panel controls observed in the live
  Xiumi v5 paper-editor DOM: `tn-meta-container`, `tn-meta-panel`, and `toggle-green-gray`.
- Adjacent generic classes such as `top-group`, `meta-group`, `toggle-btn`, `toggle-off`,
  `toggle-on`, and `tn-lighting-box` are documented as observed context only; they are not
  standalone detector triggers.
- The reduced regression intentionally keeps only `toggle-green-gray` meta-panel controls plus
  readable cover/music/custom-title labels, proving the cleaned editor chrome residue is blocked
  without relying on sidebar/tab controls, right-toolbar controls, text-toolbar controls,
  font-family menus, color-selector controls, operation-bar controls, UI Bootstrap directives,
  top operation classes, broad Angular `ng-*`, paper auxiliary tree controls, selection overlays,
  crop/worker controls, operator-dock parents, operator depot items, `op-loader`, broad `tn-*`,
  `opera-tn-*`, `contenteditable`, hosted media, SVG content-layer, `ui-slider`, `ui-sortable`,
  `touch-action`, or `user-select` markers.
- The detector intentionally does not block ordinary prose containing cover, music, video, custom
  title, spacing, tag, ratio, metadata, toggle, or image wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 135 SVG Editor Toolbar Residue

- [x] 135-svg-editor-toolbar-residue-20260626.txt
- Added a static quality rule for live 135 SVG editor top-toolbar controls: `editor-toolbar`,
  `editor-toolbar__tool`, `toolbar-tool`, `bar-item`, `bar-item__label`,
  `delete-dropdown_entry`, `tool-dropdown_entry`, and `team_btn`.
- The reduced regression intentionally keeps only source-specific toolbar controls plus readable
  toolbar labels, proving the cleaned editor chrome residue is blocked without relying on 135 SVG
  canvas markers, shell wrappers, layout controls, material-panel controls, known 135 `data-name`
  values, hosted media, trigger overlays, Ant switch controls, `svg:135` styles, or
  `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing toolbar, undo, redo,
  spacing, copy, delete, team, or tool wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG User Header Chrome Residue

- [x] 135-svg-user-header-chrome-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor user/header chrome controls:
  `header-user`, `user-info noheader`, `user-info__head`, and `user-info__nickname`.
- The reduced regression intentionally keeps only source-specific user/header chrome plus
  redacted account text, proving the cleaned editor chrome residue is blocked without relying on
  toolbar controls, sidebar/navigation controls, material-list cards, material component paths,
  material search controls, material purchase controls, shell wrappers, layout controls,
  material-panel controls, known 135 `data-name` values, hosted media, trigger overlays, Ant
  switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing user, avatar, nickname,
  profile, account, personal mode, header, or editor wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Header Logo Menu Residue

- [x] 135-svg-header-logo-menu-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor header/logo/menu chrome controls:
  `header__logo`, `header__link menu` paired with `/svgeditor/`, and `img/logo_name.*.png`.
- The reduced regression intentionally keeps only source-specific header/logo/menu chrome, proving
  the cleaned editor chrome residue is blocked without relying on user/header chrome, work-title
  controls, toolbar controls, sidebar/navigation controls, material-list cards, material component
  paths, material search controls, material purchase controls, shell wrappers, layout controls,
  material-panel controls, known 135 `data-name` values, hosted media, trigger overlays, Ant
  switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing header, logo, menu, home,
  brand, link, or editor wording by itself, and `header__link menu` only counts when tied to
  `/svgeditor/`.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Work Title Edit Control Residue

- [x] 135-svg-work-title-edit-control-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor work-title controls: `work-title`,
  `work-title__editing`, `edit-text__input`, and the live placeholder `作品标题`.
- The reduced regression intentionally keeps only source-specific title edit controls, proving the
  cleaned editor chrome residue is blocked without relying on user/header chrome, toolbar
  controls, sidebar/navigation controls, material-list cards, material component paths, material
  search controls, material purchase controls, shell wrappers, layout controls, material-panel
  controls, known 135 `data-name` values, hosted media, trigger overlays, Ant switch controls,
  `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing title, work, edit, input,
  placeholder, `作品标题`, header, or editor wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Work Tool Quick-Entry Residue

- [x] 135-svg-work-tool-quick-entry-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor work-tool quick-entry chrome:
  `work-tool`, `work-tool-signature fixed`, `ant_btn_panel`, `idea-entry-quick`,
  `entry-popover`, and `btn-entry ant-btn`.
- The reduced regression intentionally keeps only source-specific work-tool quick-entry chrome,
  proving the cleaned editor chrome residue is blocked without relying on header/logo/menu chrome,
  user/header chrome, work-title controls, toolbar controls, sidebar/navigation controls,
  material-list cards, material component paths, material search controls, material purchase
  controls, shell wrappers, layout controls, material-panel controls, known 135 `data-name` values,
  hosted media, trigger overlays, Ant switch controls, `svg:135` styles, or
  `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing work, tool, entry, history,
  signature, quick, panel, button, or editor wording by itself, and generic `entry-list`,
  `entry-item`, `history`, `button`, or `ant-btn` is not a standalone trigger.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Sidebar Icon Help Residue

- [x] 135-svg-sidebar-icon-help-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor sidebar icon/help chrome:
  `side-tab-menu__icon-box`, `side-tab-menu__icon`, `side-bar-banner-wrap`, and
  `sidebar-help black`.
- The reduced regression intentionally keeps only source-specific sidebar icon/help chrome,
  proving the cleaned editor chrome residue is blocked without relying on sidebar navigation
  wrappers, toolbar classes, material search controls, material-panel controls, header/user
  chrome, work-title controls, work-tool quick-entry chrome, material cards, shell wrappers,
  layout controls, known 135 `data-name` values, hosted media, trigger overlays, Ant switch
  controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing sidebar, icon, help, banner,
  active, work, upload, material, or editor wording by itself. The older sidebar-navigation rule
  now treats `side-bar` as a complete class name so `side-bar-banner-wrap` is not mislabeled.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Sidebar Icon Asset Residue

- [x] 135-svg-sidebar-icon-asset-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor sidebar icon asset paths:
  `img/sidebar-*.png`, including the observed active work-tab icon asset family.
- The reduced regression intentionally keeps only the source-specific relative asset path,
  proving the cleaned editor chrome residue is blocked without relying on sidebar icon/help
  classes, sidebar navigation wrappers, toolbar classes, material search controls, material-panel
  controls, header/user chrome, work-title controls, work-tool quick-entry chrome, material cards,
  shell wrappers, layout controls, known 135 `data-name` values, hosted media, trigger overlays,
  Ant switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing sidebar, icon, asset, image,
  help, active, work, upload, material, or editor wording by itself, and it does not treat generic
  data images as residue.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-26 135 SVG Sidebar Navigation Residue

- [x] 135-svg-sidebar-navigation-residue-20260626.txt
- Added a static quality rule for live 135 SVG editor left sidebar/navigation controls:
  `side-bar`, `side-bar-wrap`, `side-bar-menu-wrap`, `side-tab-menu`,
  `side-tab-menu__content`, `side-tab-menu__label`, `side-tab-content`,
  `side-bar-content-wrap`, and `tab-special`.
- The reduced regression intentionally keeps only source-specific sidebar/navigation controls plus
  readable SVG effect/template labels, proving the cleaned editor chrome residue is blocked
  without relying on 135 SVG canvas markers, toolbar controls, shell wrappers, layout controls,
  material-panel controls, known 135 `data-name` values, hosted media, trigger overlays, Ant
  switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing sidebar, navigation, SVG
  effect, SVG template, work, upload, material, clipboard, search, or tab wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Material List Item Residue

- [x] 135-svg-material-list-item-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor material/list-card controls:
  `item-element`, `item-element_id`, `item-element__box`, `item-element__help`,
  `item-content__tag`, `item-element__title`, `item-element__price`, `item-line`,
  `element-price__wrap`, `element-actions__wrap`, `item-summary-tag`, and
  `item-collect-tag`.
- The reduced regression intentionally keeps only source-specific material-list card controls plus
  readable trial/buy labels, proving the cleaned editor chrome residue is blocked without relying
  on 135 SVG canvas markers, sidebar/navigation controls, toolbar controls, shell wrappers, layout
  controls, material-panel controls, known 135 `data-name` values, hosted media, trigger overlays,
  Ant switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing material, item, card, title,
  price, buy, trial, collect, or action wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Material Filter Control Residue

- [x] 135-svg-material-filter-control-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor material filter/category controls:
  `menu-filter`, `menu-filter__container`, `menu-filter__group`, `menu-level__group`,
  `menu__warp_btn`, `level_entry`, `svg-types`, `tab-switch_btn`, `special-tags__left`,
  `special-tags__center`, `special-tags__right`, `special-tags__cover`, `tab-visible_cat`,
  `preview-guide`, `usage-history`, and `modal-entrance`.
- The reduced regression intentionally keeps only source-specific material filter/category
  controls plus readable category labels, proving the cleaned editor chrome residue is blocked
  without relying on 135 SVG canvas markers, sidebar/navigation controls, material-list card
  controls, toolbar controls, shell wrappers, layout controls, material-panel controls, known 135
  `data-name` values, hosted media, trigger overlays, Ant switch controls, `svg:135` styles, or
  `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing filter, search, category,
  preview, history, modal, all, click, material, SVG, or tag wording by itself, and it does not
  use generic `search-input`, `search-container`, `list-item`, or `new` selectors.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Material Category Wrapper Residue

- [x] 135-svg-material-category-wrapper-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor material category/list wrappers and activity
  entrances: `tab-special__functions`, `tab-special__tags`, `tab-special__tap`,
  `tab-special__list`, `tab_special_functions`, `tab-menufilter`, `filter_category`,
  `filter-list__fold`, `svgMubanYaoqingEnter`, and `img-preview-hide`.
- The reduced regression intentionally keeps only source-specific category/list wrappers plus
  readable labels, proving the cleaned editor chrome residue is blocked without relying on 135 SVG
  canvas markers, sidebar/navigation controls, material-filter controls, material-list card
  controls, toolbar controls, shell wrappers, layout controls, material-panel controls, known 135
  `data-name` values, hosted media, trigger overlays, Ant switch controls, `svg:135` styles, or
  `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing category, fold, list, tab,
  template, preview, activity, SVG, item, active, more, or new wording by itself, and it does not
  use generic `item`, `active`, `more`, `new`, `search-input`, or `list-item` selectors.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Material Preview Asset Residue

- [x] 135-svg-material-preview-asset-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor material preview icon resource paths:
  `img/img-preview-show.0471d3a6.svg` and `img/img-preview-hide.bff8f2cc.svg`.
- The reduced regression intentionally keeps only source-specific preview asset paths plus
  readable text, proving the cleaned editor asset residue is blocked without relying on 135 SVG
  canvas markers, preview classes, material-category wrappers, material-filter controls,
  sidebar icon assets, material-list card controls, toolbar controls, shell wrappers, layout
  controls, material-panel controls, known 135 `data-name` values, hosted media, trigger
  overlays, Ant switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing preview, image, show, hide,
  material, SVG, asset, or editor wording by itself, and it does not use generic SVG image paths.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Material Action Asset Residue

- [x] 135-svg-material-action-asset-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor material-card action icon resource pairs:
  `img/message.6ba842d4.svg` and `img/collect.645fe3be.svg`.
- The reduced regression intentionally keeps only the paired source-specific action asset paths
  plus readable text, proving the cleaned editor asset residue is blocked without relying on 135
  SVG canvas markers, material-list card classes, preview asset paths, material-category wrappers,
  material-filter controls, sidebar icon assets, toolbar controls, shell wrappers, layout
  controls, material-panel controls, known 135 `data-name` values, hosted media, trigger
  overlays, Ant switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing message, collect, summary,
  action, icon, material, SVG, asset, or editor wording by itself, and it does not use single
  generic SVG icon paths.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Material Category Helper Asset Residue

- [x] 135-svg-material-category-helper-asset-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor material category helper resource pairs:
  `img/hot.74ee6ac4.png` and `img/icon-up2.e0ef1973.png`.
- The reduced regression intentionally keeps only the paired source-specific category helper asset
  paths plus readable text, proving the cleaned editor asset residue is blocked without relying on
  135 SVG canvas markers, material-category classes, material-filter controls, preview asset
  paths, action asset paths, material-list card classes, sidebar icon assets, toolbar controls,
  shell wrappers, layout controls, material-panel controls, known 135 `data-name` values, hosted
  media, trigger overlays, Ant switch controls, `svg:135` styles, or `background-size:100.1%`
  background shells.
- The detector intentionally does not block ordinary prose containing hot, fold, up, category,
  helper, icon, material, PNG, asset, or editor wording by itself, and it does not use single
  generic PNG image paths.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Material List Loader Residue

- [x] 135-svg-material-list-loader-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor material list-loader/runtime state:
  `issvglist="true"`, `list-loader__inner`, `list-loader__load`,
  `list-loader__loading`, and `list-loader__loading-inner`.
- The reduced regression intentionally keeps only source-specific list-loader state plus readable
  load labels, proving the cleaned editor list runtime residue is blocked without relying on 135
  SVG canvas markers, sidebar/navigation controls, material-filter controls, material-category
  wrappers, material-list card controls, toolbar controls, shell wrappers, layout controls,
  material-panel controls, known 135 `data-name` values, hosted media, trigger overlays, Ant
  switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing load, loading, list, more,
  material, or SVG wording by itself, and it does not use generic `list-item`, `loading`, `black`,
  `active`, Ant icon, or button selectors.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Material Search Control Residue

- [x] 135-svg-material-search-control-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor material search child controls:
  `search__wrap`, `search-area`, `search-input`, `search__input`, `search-hint`, the placeholder
  `请输入关键词搜索`, and search/help icon markers.
- The reduced regression intentionally keeps only search child controls plus the live placeholder
  and help marker, proving the cleaned editor search residue is blocked without relying on 135 SVG
  canvas markers, sidebar/navigation controls, material-filter controls, material-category
  wrappers, material-list card controls, material list-loader state, purchase controls, toolbar
  controls, shell wrappers, layout controls, material-panel controls, known 135 `data-name` values,
  hosted media, trigger overlays, Ant switch controls, `svg:135` styles, or
  `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing search, keyword,
  placeholder, material, SVG, help, or icon wording by itself, and it does not use generic
  `search-input` alone, `anticon`, `ant-btn`, button, or other generic UI selectors.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Material Purchase Control Residue

- [x] 135-svg-material-purchase-control-residue-20260627.txt
- Added a static quality rule for live 135 SVG editor material purchase/discount child controls:
  `discount-instructions`, `discount-desc`, and `btn-buy` buttons paired with `ant-btn` and the
  live action text `免费试用` / `立即购买`.
- The reduced regression intentionally keeps only purchase/discount child controls plus readable
  labels, proving the cleaned editor purchase-control residue is blocked without relying on 135
  SVG canvas markers, sidebar/navigation controls, material-filter controls, material-category
  wrappers, material-list card controls, material list-loader state, toolbar controls, shell
  wrappers, layout controls, material-panel controls, known 135 `data-name` values, hosted media,
  trigger overlays, Ant switch controls, `svg:135` styles, or `background-size:100.1%` background
  shells.
- The detector intentionally does not block ordinary prose containing price, buy, purchase, trial,
  discount, material, SVG, button, free, or action wording by itself, and it does not use generic
  `btn`, `ant-btn`, `button`, or `new` selectors.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Material Component Path Residue

- [x] 135-svg-material-component-path-residue-20260627.txt
- Added a static quality rule for the exact live 135 SVG material component path
  `file_path="sidebar/tabs/ItemElement"`.
- The reduced regression intentionally keeps only the exact component-path attribute plus readable
  text, proving the cleaned editor source-path residue is blocked without relying on 135 SVG canvas
  markers, sidebar/navigation controls, material-filter controls, material-category wrappers,
  material-list card controls, material list-loader state, material search controls, purchase
  controls, toolbar controls, shell wrappers, layout controls, material-panel controls, known 135
  `data-name` values, hosted media, trigger overlays, Ant switch controls, `svg:135` styles, or
  `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing path, sidebar, tab, item,
  component, material, SVG, or editor wording by itself, and it does not use generic `file_path`
  selectors.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Editor Article List Wrapper Residue

- [x] 135-svg-editor-article-list-wrapper-residue-20260627.txt
- Added a static quality rule for the live 135 SVG editor center-canvas article/list wrapper
  class `artilce-list`.
- The reduced regression intentionally keeps only the source-specific misspelled wrapper plus a
  generic `article-item` child, proving the cleaned editor wrapper residue is blocked without
  relying on 135 SVG canvas markers, shell children, material controls, sidebar/navigation
  controls, toolbar controls, layout controls, material-panel controls, known 135 `data-name`
  values, hosted media, trigger overlays, Ant switch controls, `svg:135` styles, or
  `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing article, list, wrapper,
  material, SVG, or editor wording by itself, and it does not use generic `article-item` as a
  standalone trigger.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Editor Articles Anchor Residue

- [x] 135-svg-editor-articles-anchor-residue-20260627.txt
- Added a static quality rule for the live 135 SVG editor center-canvas article/navigation anchor
  wrapper class `articles-anchor`.
- The reduced regression intentionally keeps only the source-specific anchor wrapper plus a
  generic `article-item` child, proving the cleaned editor wrapper residue is blocked without
  relying on `artilce-list`, `article-item__inner/label/del`, `articles_pop`, 135 SVG canvas
  markers, shell children, material controls, sidebar/navigation controls, toolbar controls,
  layout controls, material-panel controls, known 135 `data-name` values, hosted media, trigger
  overlays, Ant switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing article, anchor, list,
  wrapper, material, SVG, or editor wording by itself, and it does not use generic `article-item`
  as a standalone trigger.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Editor Gap Input Child Residue

- [x] 135-svg-editor-gap-input-child-residue-20260627.txt
- Added `gap_input` to the existing `135 SVG editor layout control residue` quality rule.
- The reduced regression intentionally keeps only the source-specific gap/spacing input child,
  proving the cleaned editor layout-control residue is blocked without relying on
  `block-spacing`, `block-gap`, `gap-item-wrapper`, `article-item__editing`, Ant slider controls,
  135 SVG canvas markers, shell children, material controls, sidebar/navigation controls, toolbar
  controls, material-panel controls, known 135 `data-name` values, hosted media, trigger overlays,
  Ant switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing gap, spacing, input,
  material, SVG, or editor wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Builder Effect Data-Name Expansion

- [x] 135-svg-builder-effect-data-name-expansion-20260627.txt
- Added the live 135 free-trial effect metadata values `autobounceflipcard`,
  `multipletouchmovetodismissimgs`, `svgscrollswithgruopsslide`,
  `clickchangecoverwithscroll`, and `clickredpakcetwithscroll` to the existing
  `135 SVG builder effect data-name` quality rule.
- The reduced regression intentionally keeps only the source-specific `data-name` attributes,
  proving the cleaned builder metadata residue is blocked without relying on `app-content-canvas`,
  `content-wrapper`, `block-img__content`, `block-img__default`, `edit-placeholder`,
  `placeholder__name`, editor shell wrappers, trigger overlays, layout controls, toolbar classes,
  sidebar/navigation wrappers, material controls, material-panel controls, hosted media, Ant
  switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing the effect words by itself;
  the trigger is the exact `data-name` metadata attribute.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 135 SVG Builder Effect Data-Name Second Expansion

- [x] 135-svg-builder-effect-data-name-second-expansion-20260627.txt
- Added 19 second-batch live 135 free-trial effect metadata values to the existing
  `135 SVG builder effect data-name` quality rule through a second same-label detector row.
- The reduced regression intentionally keeps only the source-specific `data-name` attributes,
  proving the cleaned builder metadata residue is blocked without relying on `app-content-canvas`,
  `content-wrapper`, `block-img__content`, `block-img__default`, `edit-placeholder`,
  `placeholder__name`, editor shell wrappers, trigger overlays, layout controls, toolbar classes,
  sidebar/navigation wrappers, material controls, material-panel controls, hosted media, Ant
  switch controls, `svg:135` styles, or `background-size:100.1%` background shells.
- The detector intentionally does not block ordinary prose containing the effect words by itself;
  the trigger is the exact `data-name` metadata attribute.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-27 Xiumi Quick Input Instance Residue

- [x] xiumi-quick-input-instance-residue-20260627.txt
- Added `tn-__quick_input__-inst` to the existing `Xiumi quick input residue` quality rule after
  CloakBrowser confirmed it in the live Xiumi v5 paper-editor DOM.
- The reduced regression intentionally keeps only the source-specific quick-input instance class,
  proving the cleaned instance residue is blocked without relying on `tn-quick-input-block`,
  `tn-quick-input-comp`, `tn-from-house-*`, broader `tn-comp-*` classes,
  component/page/template authoring trees, Angular runtime attributes, hosted media, operator
  controls, selection overlays, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary prose containing quick, input, instance,
  Xiumi, editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Editing Frozen-Toggle Residue

- [x] xiumi-editing-frozen-toggle-residue-20260628.txt
- Added a static quality rule for the live Xiumi v5 page editing/frozen-toggle class
  `tn-editing-cell-frozen-toggle-enabled`.
- The reduced regression intentionally keeps only the source-specific frozen-toggle class,
  proving the cleaned page editing state residue is blocked without relying on
  `tn-page-container`, `tn-page-*`, `tn-scrolled-page`, `tn-on-*`, `tn-in-cell-*`, broader
  authoring tree classes, Angular runtime attributes, atom drag/drop attributes, hosted media,
  operator controls, selection overlays, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary prose containing editing, frozen, toggle,
  enabled, active, Xiumi, editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Atom Drag-Drop Residue

- [x] xiumi-atom-drag-drop-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 atom drag/drop editor state markers:
  `tn-atom-dragging-source`, `tn-atom-dropping-sink`, and `on-atom-drop`.
- The reduced regression intentionally keeps only the source-specific atom drag/drop classes,
  proving the cleaned interaction-state residue reports a precise label instead of relying on the
  generic `Xiumi tn-* attribute` diagnostic.
- The detector intentionally does not block ordinary prose containing atom, drag, drop, source,
  sink, Xiumi, editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Editing Dock Residue

- [x] xiumi-editing-dock-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 editing dock markers:
  `tn-editing-dock`, `tn-editing-show-data`, and `tn-editing-cube-index`.
- The reduced regression intentionally keeps only the source-specific editing dock class, proving
  the cleaned editor dock residue is blocked without relying on atom drag/drop markers,
  component authoring tree classes, broader page/container wrappers, Angular runtime attributes,
  hosted media, operator controls, selection overlays, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary prose containing editing, dock, cube, index,
  show, data, Xiumi, editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Comment Toolbar Panel Residue

- [x] xiumi-comment-toolbar-panel-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 comment toolbar/panel markers:
  `page-comment-on-toolbar`, `tn-comment-panel`, and `tn-comment-list`.
- The reduced regression intentionally keeps only the source-specific comment toolbar class,
  proving the cleaned comment entry residue is blocked without relying on right-toolbar controls,
  paper auxiliary tree controls, sidebar/tab controls, Angular runtime attributes, broader
  `tn-*` classes, hosted media, operator controls, selection overlays, or meta panels.
- The detector intentionally does not block ordinary prose containing comment, toolbar, panel,
  page, Xiumi, editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Panel Header Control Residue

- [x] xiumi-panel-header-control-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 panel-header child controls including
  `panel-handler`, `panel-placeholder`, `hammer-handler`, `comment-panel-header`, and the
  `glyphicon` + `panel-close` class combination.
- The reduced regression intentionally keeps only those source-specific child controls, proving
  cleaned-down panel-header residue is blocked without relying on `op-cp-paper-comps-assistant`,
  `tn-paper-aux-comps-tree-assistant`, `tn-comment-panel`, `tn-color-palette-panel`,
  `op-bar-menu`, color-selector controls, operation loader chrome, hosted media, Angular runtime
  attributes, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary panel, header, close, comment, color,
  placeholder, handler, drag, menu, or toolbar wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Page Toolbar Residue

- [x] xiumi-page-toolbar-residue-20260628.txt
- Added a static quality rule for the live Xiumi v5 page toolbar marker `tn-page-toolbar`.
- The reduced regression intentionally keeps only the source-specific page toolbar class, proving
  the cleaned editor statistics toolbar residue reports a precise label without relying on
  right-toolbar controls, comment toolbar/panel controls, paper auxiliary tree controls,
  sidebar/tab controls, Angular runtime attributes, hosted media, operator controls, selection
  overlays, meta panels, or broader page authoring-tree controls.
- The detector intentionally does not block ordinary prose containing page, toolbar, menu,
  booklet, statistics, Xiumi, editor, or template wording by itself; co-observed `tn-menu`,
  `booklet`, and `stop-propagation` are not standalone triggers for this rule.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Attribute Board Control Residue

- [x] xiumi-attribute-board-control-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 attribute-board controls including
  `tn-attribute-board-entry`, `tn-attr-assemble-tabs`, `op-attr-assemble-*`, and
  `op-attr-view-attr-assemble-*`.
- The reduced regression intentionally keeps only the source-specific attribute-board classes,
  proving the cleaned property panel residue is blocked without relying on operator dock/depot
  classes, `dc-*` depot markers, selection overlays, worker/crop controls, paper auxiliary tree
  controls, toolbar controls, Angular runtime attributes, hosted media, sidebar controls, or meta
  panels.
- The detector intentionally does not block ordinary prose containing attribute, board, margin,
  border, shadow, action, link, Xiumi, editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Generated Link Control Residue

- [x] xiumi-generated-link-control-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 generated-link controls including `op-gen-link`,
  `op-cp-background-audio`, and `op-cp-wx-miniprogram-link`.
- The reduced regression intentionally keeps only the source-specific generated-link class,
  proving the cleaned background-music / mini-program link control residue is blocked without
  relying on attribute-board controls, operator dock/depot classes, paper auxiliary tree controls,
  selection overlays, worker/crop controls, toolbar controls, Angular runtime attributes, hosted
  media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary prose containing generated, link, background
  music, mini-program, Xiumi, editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi WeChat Cover Control Residue

- [x] xiumi-wechat-cover-control-residue-20260628.txt
- Added a static quality rule for the live Xiumi v5 WeChat cover picker marker `op-ce-wx-cover`.
- The reduced regression intentionally keeps only the source-specific WeChat cover control class
  plus an inert mask child, proving the cleaned cover-picker residue is blocked without relying on
  generated-link controls, attribute-board controls, operator dock/depot classes, paper auxiliary
  tree controls, selection overlays, worker/crop controls, toolbar controls, Angular runtime
  attributes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary prose containing WeChat, cover, gallery,
  Xiumi, editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-28 Xiumi Scale Panel Control Residue

- [x] xiumi-scale-panel-control-residue-20260628.txt
- Added a static quality rule for the live Xiumi v5 scale/size panel marker `op-ce-scale`.
- The reduced regression intentionally keeps only the source-specific scale panel class, proving
  the cleaned size-control residue is blocked without relying on WeChat cover controls,
  generated-link controls, attribute-board controls, operator dock/depot classes, paper auxiliary
  tree controls, selection overlays, worker/crop controls, toolbar controls, Angular runtime
  attributes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary prose containing scale, width, height,
  Xiumi, editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-28 Xiumi Menu Input/Icon Control Residue

- [x] xiumi-menu-input-icon-control-residue-20260628.txt
- Added a static quality rule for the live Xiumi v5 menu input/icon markers `op-menu-input`,
  `op-menu-icon`, and `op-bar-item-icon`.
- The reduced regression intentionally keeps only those source-specific menu input/icon classes,
  proving the cleaned parameter/menu residue is blocked without relying on operation-bar dropdown
  controls, scale controls, WeChat cover controls, generated-link controls, attribute-board
  controls, operator dock/depot classes, paper auxiliary tree controls, selection overlays,
  worker/crop controls, Angular runtime attributes, hosted media, sidebar controls, or meta
  panels.
- The detector intentionally does not block ordinary `input`, `img`, `button`, `dropdown`, menu
  wording, icon wording, or readable shortcut text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-28 Xiumi Operation Bar Input/Separator Residue

- [x] xiumi-operation-bar-input-separator-residue-20260628.txt
- Added a static quality rule for the live Xiumi v5 operation-bar input/separator markers
  `op-bar-input` and `op-bar-separator`.
- The reduced regression intentionally keeps only those source-specific operation-bar
  input/separator classes, proving the cleaned width/height, x/y, margin, padding, line-height,
  text-decoration, and panel separator residue is blocked without relying on operation-bar
  dropdown controls, menu input/icon controls, scale controls, WeChat cover controls,
  generated-link controls, attribute-board controls, operator dock/depot classes, paper auxiliary
  tree controls, selection overlays, worker/crop controls, Angular runtime attributes, hosted
  media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary `input`, `hr`, separator wording,
  margin/width/height wording, readable numeric values, or generic form classes by themselves.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-28 Xiumi Box Metrics Control Residue

- [x] xiumi-box-metrics-control-residue-20260628.txt
- Added a static quality rule for the live Xiumi v5 box-metrics marker `op-ce-box-metrics`.
- The reduced regression intentionally keeps only that source-specific box-metrics class, proving
  the cleaned margin, padding, line-height, border, radius, and format-extraction panel residue is
  blocked without relying on operation-bar input/separator controls, operation-bar dropdown
  controls, menu input/icon controls, scale controls, WeChat cover controls, generated-link
  controls, attribute-board controls, operator dock/depot classes, paper auxiliary tree controls,
  selection overlays, worker/crop controls, Angular runtime attributes, hosted media, sidebar
  controls, or meta panels.
- The detector intentionally does not block ordinary box, metrics, margin, padding, line-height,
  border, radius, extraction, Xiumi, editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-28 Xiumi Crop Panel Child Control Residue

- [x] xiumi-crop-panel-child-control-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 crop-panel child markers including `crop-panel`,
  `crop-attr-menu`, `crop-ratio-item`, and `crop-image`.
- The reduced regression intentionally keeps only those source-specific crop-panel child classes,
  proving the cleaned crop-menu, crop-ratio, and crop-preview residue is blocked without relying
  on `crop-mask`, `crop-box`, `crop-handle`, `op-worker-surface`, `op-worker-block-gesture`,
  selection-overlay controls, operator dock/depot classes, paper auxiliary tree controls, Angular
  runtime attributes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary crop, image, panel, ratio, cover, Xiumi,
  editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-28 Xiumi Background Attribute Control Residue

- [x] xiumi-background-attribute-control-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 background-attribute markers including
  `bg-attr-menu`, `bg-repeat-select`, `bg-attach-check`, and `ce-op-background`.
- The reduced regression intentionally keeps only those source-specific background-attribute
  classes, proving the cleaned background-repeat, background-attachment, and background-operation
  residue is blocked without relying on crop-panel child controls, worker-surface crop controls,
  selection-overlay controls, attribute-board controls, operator dock/depot classes, paper
  auxiliary tree controls, Angular runtime attributes, hosted media, sidebar controls, or meta
  panels.
- The detector intentionally does not block ordinary background CSS, image, repeat, attach, cover,
  Xiumi, editor, or template wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-29 Xiumi Background Bar Child Residue

- [x] xiumi-background-bar-child-residue-20260629.txt
- Extended the existing `Xiumi background attribute control residue` rule for the live Xiumi v5
  background operation child bar `op-cp-bg-bar`.
- The reduced regression intentionally keeps only `op-cp-bg-bar`, proving cleaned-down background
  bar residue is blocked without relying on `bg-attr-menu`, `bg-repeat-select`, `bg-attach-check`,
  `ce-op-background`, crop-panel controls, worker-surface controls, attribute-board controls, or
  operator dock/depot classes.
- The detector intentionally does not block ordinary background, image, color, clear, or menu
  wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-29 Xiumi Document Selection Shell Residue

- [x] xiumi-document-selection-shell-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 document selection and dock shell markers:
  `multi-comp-select-panel`, `tn-fly-away-workaround-ios13`, and `dock-loader`.
- The reduced regression intentionally keeps only those source-specific class tokens, proving
  cleaned-down selection shell residue is blocked without relying on `tn-paper-document-root`,
  group/ground markers, editing dock markers, component tree classes, Angular runtime attributes,
  hosted media, or operation-panel controls.
- The detector intentionally does not block ordinary selection, shell, dock, loader, iOS, or
  workaround wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-29 Xiumi Cover Placeholder Residue

- [x] xiumi-cover-placeholder-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 cover placeholder and mask shell markers:
  `cover-imgs`, `cover-placeholder`, `cover-mask`, `mask-border`, `play-placeholder`, and
  `second-placeholder`.
- The reduced regression intentionally keeps only those source-specific class tokens, proving
  cleaned-down cover placeholder residue is blocked without relying on `op-bar-menu`,
  `cover-menu`, `dropdown-menu`, `op-ce-wx-cover`, `op-dark-mask`, generated-link controls, or
  operation-bar controls.
- The detector intentionally does not block ordinary cover, placeholder, mask, border, play, or
  image wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-29 Xiumi Cover Image Description Residue

- [x] xiumi-cover-image-description-residue-20260629.txt
- Extended the existing static quality rule for live Xiumi v5 cover child markers:
  `cover-img` and `cover-desc` now report the precise `Xiumi cover placeholder residue` label.
- The reduced regression intentionally keeps only those source-specific class tokens, proving
  cleaned-down cover image/description residue is blocked without relying on `cover-imgs`,
  `cover-placeholder`, `cover-mask`, `mask-border`, `play-placeholder`, `second-placeholder`,
  `op-bar-menu`, `cover-menu`, `op-ce-wx-cover`, `op-dark-mask`, generated-link controls, or
  operation-bar controls.
- The detector intentionally does not block ordinary cover description, image description, article
  cover prose, generic image classes, generic description classes, or non-Xiumi class names by
  itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-29 Xiumi Template Card Hover Residue

- [x] xiumi-template-card-hover-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 template card hover and feature-match markers:
  `inner-image-box`, `lighting-hover`, `comp-feature-matched`, and `large-tpl`.
- The reduced regression intentionally keeps only those source-specific class tokens, proving
  cleaned-down template card residue is blocked without relying on `tn-tpl-*`, `tn-scene-paper`,
  `tn-lighting-box`, `tn-comp-*`, `tn-from-house-*`, template renderer attributes, hosted media,
  Angular runtime attributes, or operation controls.
- The detector intentionally does not block ordinary template, hover, feature, card, image, or
  list wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  sync, upload, cover thumbnail acceptance, public rendering, public-host acceptance, scheduled
  send, or publish success.

## 2026-06-28 Xiumi Animation Attribute Panel Residue

- [x] xiumi-animation-attribute-panel-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 animation attribute panel markers including
  `op-comp-animation-attr-board`, `op-attr-view-cp-animation*`, and `anim-selector-x`.
- The reduced regression intentionally keeps only those source-specific animation-panel classes,
  proving the cleaned animation effect/direction/duration/delay/loop/easing/extraction/clipboard
  residue is blocked without relying on attribute-board controls, operator-depot controls,
  operator-dock controls, crop/background controls, paper auxiliary tree controls, Angular runtime
  attributes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary animation wording, CSS animation properties,
  SVG `<animate>` elements, or motion-related article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Dropdown Directive Residue

- [x] xiumi-dropdown-directive-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 dropdown directive attributes including
  `tn-dropdown`, `tn-dropdown-toggle`, and `tn-dropdown-menu`.
- The reduced regression intentionally keeps only those source-specific directive attributes,
  proving the cleaned dropdown residue is blocked without relying on `uib-dropdown*`,
  `op-bar-menu`, operation-bar classes, or the generic `Xiumi tn-* attribute` diagnostic.
- The detector intentionally does not block ordinary dropdown/menu wording or standard
  `class="dropdown"` by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Template Scene Marker Residue

- [x] xiumi-template-scene-marker-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 template scene/list class tokens including
  `tn-scene-paper` and `tn-lighting-box`.
- The reduced regression intentionally keeps only those source-specific single class tokens,
  proving cleaned-down template-scene residue is blocked without relying on `tn-tpl*`,
  `tn-from-house*`, renderer-pipeline bindings, broad Angular runtime attributes, hosted media,
  sidebar controls, meta panels, or the generic `Xiumi tn-* attribute` diagnostic.
- The detector intentionally does not block ordinary scene, paper, lighting, or box wording by
  itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Group Ground Marker Residue

- [x] xiumi-group-ground-marker-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 group/ground/cube authoring class tokens including
  `tn-group-usage-normal`, `tn-ground-slot`, `tn-ground-inst`, and `tn-cube-inst`.
- The reduced regression intentionally keeps only those source-specific single class tokens,
  proving cleaned-down group/ground residue is blocked without relying on `tn-page*`,
  `tn-layer*`, `tn-comp*`, `tn-tpl*`, `tn-from-house*`, group-box wrappers, renderer-pipeline
  bindings, broad Angular runtime attributes, hosted media, sidebar controls, meta panels, or the
  generic `Xiumi tn-* attribute` diagnostic.
- The detector intentionally does not block ordinary group, ground, cube, page, layer, or cell
  wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Image Enhancement Crop Control Residue

- [x] xiumi-image-enhancement-crop-control-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 image enhancement, image popup, and thumbnail crop
  child controls including `op-cp-image-enhancement`, `op-ce-image-enhancement`,
  `op-ce-image-popup`, `enhance-attr-menu`, and `thumb-crop-img`.
- The reduced regression intentionally keeps only those source-specific single class tokens,
  proving cleaned-down image/crop panel residue is blocked without relying on `op-worker-*`,
  `crop-*`, `cover-menu`, `tn-meta-*`, `op-dock`, `op-loader`, broad `tn-*`, broad Angular
  runtime attributes, hosted media, sidebar controls, or template markers.
- The detector intentionally does not block ordinary image, enhancement, popup, crop, zoom, blur,
  brightness, contrast, sharpen, thumbnail, or cover wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi WeChat Cover Menu Residue

- [x] xiumi-wechat-cover-menu-residue-20260628.txt
- Extended the existing `Xiumi WeChat cover control residue` quality rule for live Xiumi v5 cover
  menu and preview markers including the exact `op-bar-menu` + `cover-menu` class combination,
  `op-ce-video-xm-cover`, and `svg-cover`.
- The reduced regression intentionally keeps only source-specific cover menu/preview markers plus
  contextual `cover-desc` and `cover-imgs` child classes, proving the cleaned cover-menu residue is
  blocked without relying on generated-link controls, dark-mask controls, or generic operation-bar
  diagnostics.
- The generic `Xiumi operation bar dropdown residue` detector now excludes `cover-menu` so cover
  picker controls are reported under the more precise WeChat cover-control label.
- The detector intentionally does not block ordinary WeChat cover, gallery, cover description, or
  cover image wording by itself. The later `Xiumi Cover Image Description Residue` slice covers
  standalone `cover-desc` / `cover-img` child shells under the cover-placeholder label.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Basic Style Fragment Residue

- [x] xiumi-basic-style-fragment-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 basic style fragment markers including
  `basic-style-desc`, `flow-page-basic-style`, and `fragment-type-flow_page_basic_style`.
- CloakBrowser observed these markers in editor-side basic-format fragment cards whose visible
  text contains font size, line height, letter spacing, page margins, and set-current-format
  affordances.
- The reduced regression intentionally keeps only those source-specific style-fragment classes,
  proving the cleaned basic-format residue is blocked without relying on `tn-tpl*`,
  `tn-from-house*`, `tn-theme-color-mask*`, Angular runtime attributes, hosted media, sidebar
  controls, or meta panels.
- The detector intentionally does not block ordinary prose about basic style, font size, line
  height, letter spacing, page margins, or typography by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Animation Panel Child Control Residue

- [x] xiumi-animation-panel-child-control-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 animation panel child markers including
  `anim-unit-container`, `anim-item-list`, `anim-unit-box`, `anim-clipboard`,
  `anim-title-bar`, and `anim-content`.
- The reduced regression intentionally keeps only those source-specific child classes, proving the
  cleaned animation list/title/unit/clipboard residue is blocked without relying on
  `op-comp-animation-attr-board`, `op-attr-view-cp-animation*`, `anim-selector-x`,
  attribute-board controls, operator-depot controls, operator-dock controls, crop/background
  controls, paper auxiliary tree controls, Angular runtime attributes, hosted media, sidebar
  controls, or meta panels.
- The detector intentionally does not block ordinary animation wording, CSS animation properties,
  SVG `<animate>` elements, or motion-related article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Attribute Stack Panel Residue

- [x] xiumi-attribute-stack-panel-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 attribute stack panel markers including
  `tn-attribute-stack-panel-root` and `tn-attribute-stack-panel`.
- The reduced regression intentionally keeps only those source-specific stack-panel classes,
  proving the cleaned attribute-stack residue is blocked without relying on
  `tn-attribute-board-entry`, `tn-attr-assemble-tabs`, `op-attr-*`, generated-link controls,
  operator-depot controls, operator-dock controls, Angular runtime attributes, hosted media,
  sidebar controls, or meta panels.
- The detector intentionally does not block ordinary attribute wording, stack wording, panel
  wording, style article text, or non-Xiumi class names by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Animate Operation Panel Residue

- [x] xiumi-animate-operation-panel-residue-20260628.txt
- Added a static quality rule for the live Xiumi v5 animate operation marker
  `animate-op-btn-panel`.
- The reduced regression intentionally keeps only that source-specific operation panel class,
  proving the cleaned action-extraction residue is blocked without relying on `anim-unit-*`,
  `anim-item-list`, `anim-title-bar`, `op-comp-animation-attr-board`,
  `op-attr-view-cp-animation*`, `anim-selector-x`, top operation buttons, paper auxiliary tree
  controls, Angular runtime attributes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary animate/action wording, button wording, panel
  wording, SVG `<animate>` elements, or motion-related article text by itself.
- The adjacent top-operation detector was tightened to class/id token matching so
  `animate-op-btn-panel` is not misclassified as `Xiumi top operation button residue`.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Dark Mask Control Residue

- [x] xiumi-dark-mask-control-residue-20260628.txt
- Added a static quality rule for the live Xiumi v5 operation dark-mask marker `op-dark-mask`.
- The reduced regression intentionally keeps only that source-specific dark-mask class, proving the
  cleaned editor overlay residue is blocked without relying on `op-ce-wx-cover`, generated-link
  controls, selection-overlay controls, worker-surface crop controls, operator-dock controls,
  Angular runtime attributes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary dark/mask wording, image overlay wording,
  background CSS, or article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Layout Form Panel Residue

- [x] xiumi-layout-form-panel-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 layout/form panel markers including
  `layout-box-panel`, `form-input-panel`, `op-ce-form-input`, `trigger-props-panel`, and
  `trigger-radio-input`.
- The reduced regression intentionally keeps only those source-specific child panel classes,
  proving the cleaned layout/form/trigger residue is blocked without relying on `op-bar-menu`,
  `op-loader`, `op-dock`, generated-link controls, Angular runtime attributes, hosted media,
  sidebar controls, or meta panels.
- The detector intentionally does not block ordinary layout/form/required/option/trigger wording,
  radio input elements without the Xiumi class marker, or article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Layout Form Child Residue

- [x] xiumi-layout-form-child-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 layout/form child controls including
  `cell-layout-box`, `menuitem-level`, `padding-input`, `attr-thin-label`, and `attr-btn`.
- The reduced regression intentionally keeps only those source-specific child control markers,
  proving cleaned-down layout/form residue is blocked without relying on `layout-box-panel`,
  `form-input-panel`, `op-ce-form-input`, `trigger-props-panel`, `trigger-radio-input`,
  operation-bar dropdowns, generated-link controls, operator-dock controls, Angular runtime
  attributes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary layout, form, padding, menu, attribute,
  layer, button, confirm, reset, or option wording by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-28 Xiumi Animation Style Picker Residue

- [x] xiumi-animation-style-picker-residue-20260628.txt
- [x] xiumi-animation-style-picker-icon-residue-20260628.txt
- Added a static quality rule for live Xiumi v5 animation style picker markers including
  `anim-desc`, `anim-expand-bottom`, `anim-icon`, `anim-style`, `anim-styles`,
  `animate-styles-type`, and `animate-general`.
- The reduced regression intentionally keeps only those source-specific style picker classes,
  proving the cleaned animation-effect residue is blocked without relying on `anim-item-list`,
  `anim-unit-*`, `anim-title-bar`, `op-comp-animation-attr-board`,
  `op-attr-view-cp-animation*`, `anim-selector-x`, `animate-op-btn-panel`, Angular runtime
  attributes, hosted media, sidebar controls, or meta panels.
- The icon-only regression intentionally keeps only `anim-expand-bottom`, proving partially cleaned
  style picker icon residue is blocked without relying on `anim-style`, `anim-styles`,
  `anim-desc`, `anim-icon`, `animate-styles-type`, or `animate-general`.
- The detector intentionally does not block ordinary animation wording, CSS animation properties,
  SVG `<animate>` elements, or motion-related article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Animation Picker Directive Residue

- [x] xiumi-animation-picker-directive-residue-20260629.txt
- Added a static quality rule for live Xiumi v5 animation picker directives including
  `tn-animation-picker`, `tn-animation-selector`, `tn-animate-x-clipboard`,
  `tn-animate-x-creator`, `tn-animate-x-list`, `tn-animate-x-selector`, and
  `tn-animate-x-unit`.
- The reduced regression intentionally keeps only those source-specific directive attributes,
  proving cleaned-down animation picker residue gets a precise label instead of relying only on
  the broad `Xiumi tn-* attribute` fallback.
- The detector intentionally does not block ordinary animation wording, picker wording, selector
  wording, clipboard/list/unit prose, CSS animation properties, SVG `<animate>` elements, or
  motion-related article text by itself.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile SMIL/click interaction, sync, upload, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Angular Input Source Event Residue

- [x] xiumi-angular-input-source-event-residue-20260629.txt
- Extended the existing static `Angular/Vue authoring attribute` quality rule for live Xiumi v5
  Angular attributes including `ng-keydown`, `ng-keyup`, `ng-src`, `ng-mousedown`, `ng-mouseup`,
  `ng-mouseenter`, `ng-copy`, `ng-readonly`, and `ng-transclude`.
- The reduced regression intentionally keeps only input/source/mouse/copy/transclusion attributes,
  proving class-cleaned Angular residue is blocked without relying on Angular runtime classes,
  `tn-*`, `opera-tn-*`, contenteditable, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary prose about Angular, key events, source
  images, copy, hover, readonly fields, transclusion, or Xiumi by itself; it remains anchored to
  real tag attributes with an assignment.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  input behavior fidelity, mobile SMIL/click interaction, Dark Mode, sync, upload, cover thumbnail
  acceptance, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Hammer Pan Directive Residue

- [x] xiumi-hammer-pan-directive-residue-20260629.txt
- Extended the existing static `Xiumi selection overlay control residue` quality rule for the live
  Xiumi v5 Hammer gesture attribute `hm-pan`.
- The reduced regression intentionally keeps only `hm-pan`, proving class-cleaned gesture routing
  residue is blocked without relying on selection overlay classes, `hm-panstart`, `hm-panend`,
  `hm-panmove`, `hm-recognizer-options`, `stop-propagation`, `tn-attach-to`, broad `tn-*`,
  Angular runtime attributes, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary prose about pan, drag, gesture, Hammer, or
  Xiumi by itself; it remains anchored to a real tag attribute with an assignment.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  mobile gesture fidelity, mobile SMIL/click interaction, Dark Mode, sync, upload, cover thumbnail
  acceptance, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Style Binding Metadata Residue

- [x] xiumi-style-binding-metadata-residue-20260629.txt
- Added a static quality rule for the live Xiumi v5 style binding directive `tn-style`.
- The reduced regression intentionally keeps only `tn-style`, proving cleaned-down style-binding
  metadata gets a precise label instead of relying only on the broad `Xiumi tn-* attribute`
  fallback.
- The detector intentionally does not block ordinary inline `style`, CSS examples, style prose,
  article text, or non-Xiumi class names by itself; it remains anchored to the Xiumi-specific
  `tn-style` attribute.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  style fidelity, mobile SMIL/click interaction, Dark Mode, sync, upload, cover thumbnail
  acceptance, public rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Angular Link Dropzone Residue

- [x] xiumi-angular-link-dropzone-residue-20260629.txt
- Extended the existing static `Angular/Vue authoring attribute` quality rule for live Xiumi v5
  Angular binding attributes including `ng-href`, `ng-dropzone`, `ng-dropzone-handler`, and
  `ng-dropzone-options`.
- The reduced regression intentionally keeps only link/dropzone attributes, proving class-cleaned
  Angular residue is blocked without relying on Angular runtime classes, `tn-*`, `opera-tn-*`,
  contenteditable, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary `href`, upload prose, link prose, dropzone
  wording, handler/options prose, or Xiumi by itself; it remains anchored to real Angular
  `ng-*` attributes with an assignment.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  link fidelity, drag/drop fidelity, upload, sync, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-07-03 Xiumi UI Router View Directive Residue

- [x] xiumi-ui-router-view-directive-residue-20260703.txt
- Extended the existing static `Angular/Vue authoring attribute` quality rule for the live Xiumi
  v5 UI Router route outlet directive `ui-view`.
- The reduced regression intentionally keeps only `ui-view`, proving class-cleaned route outlet
  plumbing is blocked without relying on `ng-*`, Angular runtime classes, `uib-*`, modal runtime
  directives, `tn-*`, operation buttons, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary prose about routing, views, headers, actions,
  or Xiumi by itself; it remains anchored to the explicit `ui-view` directive attribute.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  route rendering fidelity, upload, sync, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-07-03 Xiumi Context Menu Directive Residue

- [x] xiumi-context-menu-directive-residue-20260703.txt
- Extended the existing static `Xiumi attribute context menu host residue` quality rule for live
  Xiumi v5 context-menu directives `context-menu` and `context-menu-on`.
- The reduced regression intentionally keeps only those two attributes, proving class-cleaned
  menu invocation plumbing is blocked without relying on operator depot controls,
  attribute-board controls, operation-bar dropdowns, menu-pin wrappers, Angular runtime classes,
  UI Bootstrap directives, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary context/menu/click prose, attribute wording,
  or Xiumi by itself; it remains anchored to explicit context-menu directive attributes or the
  known `attr-bar-context-menu-host-for-*` host classes.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  context-menu interaction fidelity, upload, sync, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Text Input Done-For Residue

- [x] xiumi-text-input-done-for-residue-20260629.txt
- Extended the existing static `Xiumi font and format control residue` quality rule for the live
  Xiumi v5 text-input completion directive `tn-text-input-done-for`.
- The reduced regression intentionally keeps only `tn-text-input-done-for`, proving class-cleaned
  text input completion metadata gets an actionable font/format label instead of relying only on
  the broad `Xiumi tn-* attribute` fallback.
- The detector intentionally does not block ordinary text, blur wording, completion prose,
  typography wording, or Xiumi by itself; it remains anchored to the Xiumi-specific directive
  attribute.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  text editing fidelity, typography fidelity, upload, sync, cover thumbnail acceptance, public
  rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Angular UIB Button State Residue

- [x] xiumi-angular-uib-button-state-residue-20260629.txt
- Extended the existing static `Angular/Vue authoring attribute` and
  `Xiumi UI Bootstrap control directive residue` quality rules for live Xiumi v5 button-state
  directives including `ng-checked`, `uib-btn-radio`, and `uib-btn-checkbox`.
- The reduced regressions intentionally keep only those selection/toggle attributes, proving
  class-cleaned button-state metadata is blocked without relying on Angular runtime classes,
  `tn-*`, dropdown wrappers, operation buttons, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary checkbox/radio prose, checked wording,
  button wording, option prose, or Xiumi by itself; it remains anchored to real directive
  attributes.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  form-control fidelity, upload, sync, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi UIB Tab Content Transclude Residue

- [x] xiumi-uib-tab-content-transclude-residue-20260629.txt
- Extended the existing static `Xiumi UI Bootstrap control directive residue` quality rule for the
  live Xiumi v5 tab-body directive `uib-tab-content-transclude`.
- The reduced regression intentionally keeps only `uib-tab-content-transclude`, proving
  class-cleaned tab panel plumbing is blocked without relying on dropdown wrappers, heading
  transclusion, Angular runtime classes, `tn-*`, operation buttons, hosted media, sidebar controls,
  or meta panels.
- The detector intentionally does not block ordinary tab prose, content prose, heading prose,
  transclusion wording, or Xiumi by itself; it remains anchored to the explicit UI Bootstrap
  directive attribute.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  tab interaction fidelity, upload, sync, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi UIB Modal Animation Directive Residue

- [x] xiumi-uib-modal-directive-residue-20260629.txt
- Extended the existing static `Xiumi UI Bootstrap control directive residue` quality rule for the
  live Xiumi v5 modal-animation directive `uib-modal-animation-class`.
- The reduced regression intentionally keeps only `uib-modal-animation-class`, proving
  class-cleaned modal plumbing is blocked without relying on dropdown wrappers, tooltip
  attributes, tab transclusion, button-state controls, Angular/Vue authoring attributes, `tn-*`,
  operation buttons, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary modal prose, animation prose, class prose, or
  Xiumi by itself; it remains anchored to the explicit UI Bootstrap modal directive attribute.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  modal interaction fidelity, upload, sync, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi Modal Runtime Directive Residue

- [x] xiumi-modal-runtime-directive-residue-20260629.txt
- Extended the existing static `Xiumi UI Bootstrap control directive residue` quality rule for the
  live Xiumi v5 modal runtime directives `modal-render`, `modal-in-class`, and `modal-animation`.
- The reduced regression intentionally keeps only those modal runtime attributes, proving
  class-cleaned modal runtime plumbing is blocked without relying on `uib-*`, dropdown wrappers,
  tooltip attributes, tab transclusion, button-state controls, Angular/Vue authoring attributes,
  `tn-*`, operation buttons, hosted media, sidebar controls, or meta panels.
- The detector intentionally does not block ordinary modal prose, render prose, animation prose,
  class prose, or Xiumi by itself; it remains anchored to explicit modal runtime directive
  attributes.
- Boundary: this is static publishability protection only. It does not prove paste, phone preview,
  modal interaction fidelity, upload, sync, cover thumbnail acceptance, public rendering,
  public-host acceptance, scheduled send, or publish success.

## 2026-06-29 Xiumi CSS Background Image Source

- [x] xiumi-css-background-image-source-20260629.txt
- Extended the existing static `Xiumi third-party image source` quality rule for inline CSS
  `background` / `background-image` URLs pointing at Xiumi material hosts.
- The reduced regression intentionally keeps only a normal element with a Xiumi-hosted
  `background-image:url(...)`, proving hosted background material is blocked without relying on
  Xiumi SVG wrapper classes, SMIL rows, `tn-*`, Angular runtime attributes, editable cells,
  sidebar controls, or meta panels.
- The detector intentionally does not block ordinary local image references, ordinary public HTTPS
  image hosts, ordinary local CSS backgrounds, or prose mentioning Xiumi by itself; it remains
  anchored to an inline CSS background URL plus a supported Xiumi material host.
- Boundary: this is static publishability protection only. It does not prove image availability,
  public-host acceptance, platform-host proxying, paste, phone preview, upload, sync, public
  rendering, public-host acceptance, scheduled send, or publish success.

## 2026-06-29 135 SVG Trial Coverage Audit

- [x] 135-svg-trial-coverage-audit-20260629.txt
- Rechecked the live 135 SVG editor through CloakBrowser by selecting a center-canvas `试用`
  effect and reading the selected block plus the right-side settings panel.
- Observed source-specific center markers remain covered by existing `135 SVG builder effect
  data-name`, `135 SVG builder canvas residue`, and `135 SVG editor shell residue` diagnostics.
- Observed right-side effect controls remain covered by existing `135 SVG material panel residue`
  and related image-slot/animation-panel diagnostics.
- Vue scoped `data-v-*` attributes were observed but are intentionally not promoted to an
  independent blocker because they are too broad without a source-specific 135 anchor.
- Boundary: this is a coverage audit only. It does not prove paste, phone preview, SVG interaction
  fidelity, upload, sync, public rendering, public-host acceptance, scheduled send, or publish
  success.

## 2026-07-03 WeChat Paste Raw Platform Capture Ignore Guard

- [x] wechat-paste-raw-platform-capture-ignore-guard-20260703.txt
- Added `prompts/0601/evidence/wechat-paste/.gitignore` so raw WeChat backend,
  preview QR, cover dialog, vessel, and account-state PNG captures stay local-only by default.
- Verified `git check-ignore -v` matches `wechat-preview-scan-qr.png`,
  `wechat-cover-crop-vessel.png`, and `wechat-cover-vessel-mark-set.png`.
- The guard does not delete the local files and does not ignore text or HTML evidence.
- Boundary: this is repository hygiene only. It does not prove paste, phone preview, mobile
  interaction, Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send, public
  article rendering, XHS/Zhihu upload, public-host acceptance, or publish success.

## 2026-07-03 135 SVG Public Panel Login-Gate Recheck

- [x] 135-svg-public-panel-login-gate-recheck-20260703.txt
- Rechecked the live 135 SVG editor through CloakBrowser. The page was in public login-gated
  state (`登录/注册`), and clicking a visible `免费试用` button opened a login tab instead of
  applying a center-canvas effect.
- Recorded sanitized public shell markers for sidebar/category/list/free-trial controls and the
  center canvas shell.
- Existing `135 SVG sidebar navigation`, material filter/category, material list/loader/purchase,
  and builder canvas/editor shell diagnostics already cover the observed source-specific markers.
- Boundary: this is public-shell coverage and login-gate evidence only. It does not prove
  authenticated free-trial application, paste, phone preview, mobile interaction, Dark Mode, cover
  thumbnail acceptance, credentialed sync, scheduled send, public rendering, XHS/Zhihu upload,
  public-host acceptance, or publish success.

## 2026-07-03 Xiumi SVG Category Login-Gated Taxonomy Recheck

- [x] xiumi-svg-category-login-gate-recheck-20260703.txt
- CloakBrowser-only live recheck stayed on the Xiumi v5 paper editor route with the visible top
  bar still showing `登录`, so the run is login-gated/public editor-state evidence only.
- The open SVG category exposed SVG taxonomy and list-card wrappers/directives including
  `tn-tpl-item`, `tn-lighting-box`, `tn-tpl-comp`, `tn-scene-paper`, `tn-tpl-categ-paper-cp`,
  `tn-tpl-comp-box`, `lighting-hover`, `tn-tpl-comp-item`, `tn-tpl-ra-bind-box`,
  `tn-tpl-pose-fit-box`, `disable-tn-group-flex-box`, `tn-feature-toggle`,
  `feature-matched-class`, `feature-not-matched-class`, `ng-bind-html`, and `context-menu`.
- Clicking the first visible SVG template card did not change the center editor:
  `centerHtmlLength=566103`, `centerHash=9ecbbf1`, `centerSvg=0`, `centerForeignObject=0`, and
  `centerAnimateLike=0` stayed unchanged. This is taxonomy/list-card/static-residue coverage, not
  applied center SVG proof.
- Existing Xiumi diagnostics already cover the observed markers; no source-code detector change
  was required.
- Focused regression passed:
  `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts -t "Xiumi (template renderer pipeline|template authoring tree|template entry blocks|template scene markers|template card hover|component template binding|disabled control binding|component depot SVG animation|Angular runtime controls|UI Bootstrap directives|attribute context menu host|group and ground markers|paper document root|document selection shell)" --reporter=default --test-timeout=90000`
  with 1 file and 14 selected tests.
- Boundary: this does not prove authenticated Xiumi account access, successful template
  application, WeChat PC paste, phone preview, mobile interaction fidelity, mobile Dark Mode,
  cover thumbnail acceptance, upload, credentialed sync, scheduled send, platform preview, public
  article rendering, public-host acceptance, XHS/Zhihu account upload, or publish success.

## 2026-07-03 Style Proof Release Preflight Next-Row Issue Traceability

- [x] style-proof-release-preflight-nextrow-issues-20260703.txt
- Current WeChat read-only CloakBrowser probe reached the login/scan gate, not an authenticated
  editor; therefore authenticated-editor and PC-editor-DOM proof could not be refreshed.
- Fixed the red `scripts/style-proof-release-preflight.test.ts` count drift and enriched the
  release-preflight CLI `nextRows[]` JSON with issue ids, freshness issue ids, cannot-claim
  reasons, and next operator actions.
- Current blocking summary remains `canClaimComplete=false`, `status=blocked-by-external`,
  `combinedIssueCount=15`, `cannotClaimSteps=30`, `externalHandoffRows=19`, `nextRowRefs=5`, and
  `uniqueNextRows=4`.
- Current next rows expose:
  `style-proof-manifest-requirement-missing` for phone/public-host/credentialed-channel rows and
  `style-proof-manifest-proof-stale` for authenticated-editor rows.
- Focused regression and ESLint passed. The CLI still exits 1 in JSON and text modes as a release
  blocker.
- Boundary: this is local release gate observability only. It does not prove WeChat authenticated
  editor access, paste, phone preview, mobile interaction, Dark Mode, cover thumbnail acceptance,
  credentialed sync, scheduled send, public rendering, XHS/Zhihu upload, public-host acceptance,
  or publish success.

## 2026-07-03 Style Proof Post-Commit Local Validation

- [x] style-proof-postcommit-local-validation-20260703.txt
- Re-ran the local release preflight in JSON and human text modes after the latest preflight
  traceability commit. Both modes exited 1 as expected while preserving
  `canClaimComplete=false`, `status=blocked-by-external`, `combinedIssueCount=15`,
  `cannotClaimSteps=30`, `externalHandoffRows=19`, `nextRowRefs=5`, and `uniqueNextRows=4`.
- Re-ran the script regression surface:
  `pnpm -C inkforge exec vitest run scripts --reporter=default --test-timeout=90000 --maxWorkers=1 --no-file-parallelism`
  passed with 1 file and 3 tests.
- Re-ran the full export service suite serially:
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --test-timeout=90000`
  passed with 36 files and 1349 tests.
- Re-ran `pnpm -C inkforge exec vue-tsc --noEmit --pretty false` and
  `$env:NODE_OPTIONS='--max-old-space-size=4096'; pnpm -C inkforge build`; both passed. The
  build transformed 4653 modules, completed in 38.30s, and the generated
  `inkforge/tsconfig.tsbuildinfo` diff was restored afterward.
- Recorded expected non-fatal diagnostics: KaTeX quirks-mode warnings and hard-limit safety
  warnings for the oversize 510641-character input test.
- Boundary: this is local validation evidence only. It does not prove authenticated WeChat editor
  access, ordinary rich paste retention, phone preview, mobile interaction, mobile Dark Mode,
  cover thumbnail acceptance, credentialed sync, scheduled send, public rendering, Zhihu
  public-host acceptance, XHS/Zhihu account upload, or publish success.

## 2026-07-03 Style Proof E2E and Typewriter Cleanup

- [x] style-proof-e2e-typewriter-cleanup-20260703.txt
- Removed the remaining direct TypewriterMode debug probes for `[typewriter] plugin1 update` and
  `[typewriter] decorations call`; `rg` now returns no Typewriter debug-console matches.
- Real Tauri/WebView2 e2e first exposed stale ExportModal style-proof assertions after the
  release gate moved from 18 to 19 external rows. The e2e contract now matches the committed
  release-preflight/service-test counts: external rows 19, account rows 14, unsafe rows 10,
  mutating rows 14, and external dependency rows 15.
- Verification passed:
  `pnpm -C inkforge exec vitest run src/extensions/__tests__/TypewriterMode.decorations.test.ts --reporter=default --test-timeout=90000`,
  `pnpm -C inkforge exec eslint src/extensions/TypewriterMode.ts tests/e2e/specs/svg-render.spec.cjs --quiet`,
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`,
  `pnpm -C inkforge exec vitest run --reporter=default --maxWorkers=1 --no-file-parallelism --test-timeout=120000`,
  `pnpm -C inkforge test:e2e`, and
  `$env:NODE_OPTIONS='--max-old-space-size=4096'; pnpm -C inkforge build`.
- Results: focused Typewriter regression 1 file / 6 tests passed; full Vitest 89 files / 1692
  tests passed; real e2e 2 spec files / 17 tests passed; production build transformed 4653
  modules and built in 29.24s.
- Boundary: this is local/e2e validation and debug-log cleanup only. It does not prove WeChat
  authenticated editor access, ordinary rich paste retention, phone preview, mobile interaction,
  mobile Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled send, public
  rendering, Zhihu public-host acceptance, XHS/Zhihu account upload, or publish success.

## 2026-07-03 Platform Account Gate Recheck

- [x] platform-account-gate-recheck-20260703.txt
- CloakBrowser-only recheck of the currently open WeChat, 135 SVG editor, and Xiumi paper editor
  tabs. No Playwright direct tools, publish, sync, upload, scheduled send, phone preview, QR
  capture, account screenshot, clipboard write, or artifact creation was used.
- WeChat public platform remained on the login panel with no authenticated backend/editor DOM.
- 135 SVG editor showed a public/listing shell with `登录/注册`, 183 item-card-like nodes,
  1 `svg-types` node, 1 `content-wrapper`, 1 `content-background`, and 60 buy/free-trial controls.
- Xiumi showed a visible editor and SVG category, but a visible `登录` link remained. Clicking the
  `SVG` category and the first visible SVG card left the center digest unchanged:
  `hash=689c3dd4`, `htmlLength=566103`, `tnComp=82`, `tnCell=49`, `tnUuid=7`,
  `contenteditable=1`, `svg=0`, and `img=78`.
- Boundary: this is login-gate, taxonomy, list-card, and no-center-delta evidence only. It does
  not prove WeChat authenticated editor access, ordinary rich paste retention, phone preview,
  mobile interaction, mobile Dark Mode, cover thumbnail acceptance, credentialed sync, scheduled
  send, public rendering, Zhihu public-host acceptance, XHS/Zhihu account upload, or publish
  success.

## 2026-07-03 Style Proof External Handoff CLI

- [x] style-proof-external-handoff-cli-20260703.txt
- Added `pnpm -C inkforge style-proof:external-handoff` as a read-only operator handoff CLI for
  the committed external proof packet. The command prints markdown by default, supports explicit
  `--markdown`, supports raw packet JSON through `--json`, rejects conflicting output modes, and
  rejects unknown arguments before reading or claiming proof state.
- The CLI exits 1 while `canClaimComplete=false`, preserving the current blocked release gate.
  Current local state remains `status=blocked-by-external`, `externalHandoffRows=19`,
  `phoneRows=4`, `externalAccountRows=14`, `publicHostRows=1`, `unsafeToAutomateRows=10`,
  `mutatingRows=14`, `safeExternalRows=0`, and `actionableLocalRows=0`.
- The markdown formatter now includes proof row issue ids, freshness issue ids, proof counters,
  and artifact counters, so `style-proof-manifest-proof-stale` and
  `style-proof-manifest-requirement-missing` are visible in handoff logs.
- Verification passed:
  `pnpm -C inkforge exec vitest run scripts/style-proof-external-handoff.test.ts --reporter=default --test-timeout=90000`,
  `pnpm -C inkforge exec vitest run scripts --reporter=default --test-timeout=90000 --maxWorkers=1 --no-file-parallelism`,
  `pnpm -C inkforge exec eslint scripts/style-proof-external-handoff.ts scripts/style-proof-external-handoff.test.ts src/services/export/style-catalog.ts --quiet`,
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --test-timeout=90000`,
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`, and
  `$env:NODE_OPTIONS='--max-old-space-size=4096'; pnpm -C inkforge build`.
  Export service coverage passed with 36 files and 1349 tests; production build transformed 4653
  modules and built in 31.09s.
- Boundary: this is local handoff observability only. It does not prove WeChat authenticated
  editor access, ordinary rich paste retention, phone preview, mobile interaction, mobile Dark
  Mode, cover thumbnail acceptance, credentialed sync, scheduled send, public rendering, Zhihu
  public-host acceptance, XHS/Zhihu account upload, or publish success.

## 2026-07-03 Style Proof Manifest Intake CLI

- [x] style-proof-manifest-intake-cli-20260703.txt
- Added `pnpm -C inkforge style-proof:manifest-intake --file <redacted-manifest.json>` as a
  read-only validator for operator-supplied redacted `StyleProofManifest` JSON packs.
- The command reuses `getStyleProofManifestJsonIntakeReport()` and prints sanitized text or JSON
  summaries only. It does not import proof, mutate committed manifests, create artifacts, open a
  browser, upload, sync, schedule, or publish.
- Exit codes are explicit: 0 only when the supplied pack can claim complete, 1 when parsed proof
  remains incomplete/cannot-claim, and 2 for CLI usage, file-read, or schema/JSON intake errors.
- Output includes status, counts, issue-id counts, per-platform summaries, and cannot-claim rows,
  but does not print the input path, raw artifact references, browser profile paths, cookies,
  tokens, HAR references, QR payloads, draft URLs, or publish URLs.
- Verification passed:
  `pnpm -C inkforge exec vitest run scripts/style-proof-manifest-intake.test.ts --reporter=default --test-timeout=90000`,
  `pnpm -C inkforge exec eslint scripts/style-proof-manifest-intake.ts scripts/style-proof-manifest-intake.test.ts --quiet`,
  `pnpm -C inkforge exec vitest run scripts --reporter=default --test-timeout=90000 --maxWorkers=1 --no-file-parallelism`,
  `pnpm -C inkforge exec eslint scripts/style-proof-manifest-intake.ts scripts/style-proof-manifest-intake.test.ts scripts/style-proof-external-handoff.ts scripts/style-proof-external-handoff.test.ts scripts/style-proof-release-preflight.ts scripts/style-proof-release-preflight.test.ts --quiet`,
  `pnpm -C inkforge exec vitest run src/services/export --reporter=default --maxWorkers=1 --no-file-parallelism --test-timeout=90000`,
  `pnpm -C inkforge exec vue-tsc --noEmit --pretty false`,
  `$env:NODE_OPTIONS='--max-old-space-size=4096'; pnpm -C inkforge build`, and
  `pnpm -C inkforge style-proof:manifest-intake --help`.
  Script coverage passed with 3 files and 16 tests; export coverage passed with 36 files and 1349
  tests; production build transformed 4653 modules and built in 32.09s.
- `pnpm -C inkforge style-proof:release-preflight --json` still exits 1 with
  `canClaimComplete=false`, `status=blocked-by-external`, `externalHandoffRows=19`,
  `safeExternalRows=0`, and `actionableLocalRows=0`.
- Boundary: this is local manifest intake validation only. It does not prove WeChat authenticated
  editor access, ordinary rich paste retention, phone preview, mobile interaction, mobile Dark
  Mode, cover thumbnail acceptance, credentialed sync, scheduled send, public rendering, Zhihu
  public-host acceptance, XHS/Zhihu account upload, or publish success.
