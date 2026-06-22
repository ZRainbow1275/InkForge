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
  observed 135/Xiumi live-DOM categories: click show/hide, click switch, slide trigger, text
  marquee, quiz/game, typed image-slot manifest, and trigger-zone manifest.
- Kept the choice blocked, mobile-only, unmapped from style applications, and gated by
  phone-preview plus publish proof.
- Added catalog blockers for 135 background-SVG shells, source-owned layout reports, image-slot
  manifests, trigger-zone manifests, static/raster fallback, and Xiumi wrapper/image-layer trees
  that do not prove center inline SVG.
- Verification passed: focused `platform-export-rendering.test.ts` run with 3 selected
  availability/application/market tests; full `platform-export-rendering.test.ts` run with 169
  tests; serial `src/services/export` run with 36 files / 1146 tests; target ESLint; `vue-tsc`;
  and production build with 4653 modules transformed in 44.63s.
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
