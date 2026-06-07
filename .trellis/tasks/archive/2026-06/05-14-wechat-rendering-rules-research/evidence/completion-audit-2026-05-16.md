# Completion Audit - 2026-05-16

## Audited scope

- Original task: 独立研究微信公众号 CSS/SVG 支持规则、精美图文/图表策略、微信组件/API 边界，并沉淀 PRD 与 research 文档。
- User-confirmed implementation slice: 在不重写既有 `convertToWechat` 预览主链的前提下，落地“最小真实发布链 + 最小可见状态”。

## Prompt-to-artifact checklist

| Requirement | Evidence | Status | Notes |
| --- | --- | --- | --- |
| 独立 Trellis 任务存在且处于执行态 | `task.json` status=`in_progress` | Done | `.trellis/tasks/05-14-wechat-rendering-rules-research/task.json` |
| PRD 与研究文档齐备 | `prd.md` + 3 篇 `research/*.md` | Done | 研究、规则、组件/API 边界、现有管线均已落盘 |
| 明确微信 CSS/SVG/图表规则 | `research/wechat-css-svg-rules.md` | Done | 记录官方事实、CSS 限制、SVG 可靠性分层、Inkforge 差距 |
| 明确微信组件/API 边界 | `research/wechat-components-and-api-boundaries.md` | Done | 区分可自动化 API 与必须后台人工插入的组件 |
| 明确本地代码现状 | `research/repo-current-wechat-pipeline.md` | Done | 已更新为当前最小真实发布链状态 |
| 凭据状态探测为真实能力，不伪造发布支持 | `src-tauri/src/commands/wechat.rs` `wechat_publish_status`; `src/services/export/wechat-publish.ts` `getWechatPublishStatus`; `ExportModal.vue` | Done | 缺凭据时返回结构化 blocked 状态，而不是假成功 |
| 凭据文件查找顺序与敏感错误边界 | `src-tauri/src/commands/wechat.rs` | Done | 2026-05-16 code review 后修复：`.env.local` 就近优先并兼容 `inkforge/.env.local`；微信 API URL 使用 `Url` query 编码，错误信息不回传 secret/access_token query |
| 正文图片真实上传链路 | `wechat_upload_article_image`; `uploadWechatArticleImage`; `WechatUploader` | Done | 支持 `inkforge-asset://` / `blob:` 归一化；拒绝 SVG/GIF/WebP/AVIF；JPG/PNG + 2MB 限制已前后端校验；已替换 stub |
| 封面永久素材上传链路 | `wechat_upload_cover_image`; `uploadWechatCoverImage` | Done | 返回 `mediaId` / `thumb_media_id` 所需素材 ID |
| 草稿创建链路 | `wechat_create_draft`; `createWechatDraft`; `publishWechatDraft` | Done | 标题/正文/封面校验 + 20,000 字符边界 + `src`/`srcset` foreign image host 阻断 |
| draft payload 正确序列化到微信接口字段 | `WechatDraftArticlePayload` + Rust unit test | Done | 前端 invoke 保持 camelCase，微信 API 出站用 snake_case；包含 `show_cover_pic`；Absent optional 字段不再序列化为 JSON `null` |
| 后端 remoteUrl 拉取边界 | `fetch_remote_bytes`; `validate_remote_image_url` | Done | 阻断 localhost/private/link-local IP literal、非 HTTP(S)、缺少 `Content-Length` 和超 2MB 图片，降低 SSRF 与大文件内存风险 |
| UI 中可见真实状态 | `ExportModal.vue` preflight rows | Done | 仅在 `visible && selectedPlatform==='wechat'` 时探测，带 version guard |
| 凭据边界安全落点 | `inkforge/.env.example` | Done | 仅声明 `WECHAT_APP_ID` / `WECHAT_APP_SECRET`，明确禁止 `VITE_` |
| Spec 已同步当前能力分类 | `.trellis/spec/backend/directory-structure.md`; `.trellis/spec/backend/quality-guidelines.md` | Done | 去掉 WeChat uploader stub 假设，增加桥接契约与验证要求 |
| 不伪造后台专有组件或群发 publish | 研究文档 + 未新增相关实现 | Done | 小程序卡片/视频号/投票/群发 publish 仍在范围外 |

## Verification log

All commands were re-run on 2026-05-16 in `D:\\Desktop\\Inkforge`.

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/image-pipeline/image-pipeline.test.ts` | Pass | 2 files, 24 tests passed after deeper code review fixes |
| `pnpm -C inkforge typecheck` | Pass | `vue-tsc --noEmit` |
| `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet` | Pass | No lint output |
| `pnpm -C inkforge build` | Pass | `vue-tsc -b && vite build` succeeded |
| `cargo check --manifest-path inkforge/src-tauri/Cargo.toml` | Blocked initially | Current sandbox hit `crates.io` TLS / schannel credential failure because worktree currently keeps `src-tauri/Cargo.lock` deleted |
| `cargo check --manifest-path inkforge/src-tauri/Cargo.toml --offline` with temporary HEAD `Cargo.lock`, then immediate file removal | Pass | Cargo locked two extra packages (`mime_guess`, `unicase`) and completed `Checking inkforge ... Finished` without leaving `Cargo.lock` in the worktree |
| `cargo test --manifest-path inkforge/src-tauri/Cargo.toml --offline` with temporary HEAD `Cargo.lock`, then immediate file removal | Pass | 13 Rust unit tests passed, including env candidate ordering, URL query encoding, payload `null` omission, `show_cover_pic`, upload limits, remoteUrl guard, and `srcset` validation |
| `pnpm -C inkforge dev -- --host 127.0.0.1` + Playwright Chromium smoke | Pass | Opened `http://127.0.0.1:3005/`, created a blank article, opened the export modal, verified WeChat preflight text and no browser console errors. Latest screenshot: `C:\Users\HP\Downloads\inkforge-wechat-export-modal-review-deeper-2026-05-16T05-08-50-483Z.png` |

## Scope explicitly not completed

- 真正的群发 publish / mass send
- 小程序卡片、视频号、音频、投票、商品等后台专有组件的自动插入
- 真实公众号后台预览或手机端截图验收自动化
- 成体系的微信安全视觉模板库与图表资产设计系统
- ExportModal 已有标题、手填 `thumb_media_id` 和“创建草稿”入口，但封面素材上传 UI、真实账号预览和群发 publish / mass send 仍未完成

## Audit conclusion

For the approved thin slice, the implementation is complete and honestly verified at the service / IPC / visible-status level:

- research + PRD artifacts exist,
- the minimum real WeChat publish bridge is live end-to-end at the code-contract level,
- the UI exposes real availability instead of fake publish readiness,
- tests, type-check, lint, build, Rust offline check/test, and browser smoke all passed with real command evidence.

Anything beyond this slice, especially cover upload from UI, real account preview, and mass-send publish, remains explicitly out of scope and must be tracked as follow-up work instead of being implied as done.

## Additional code-review pass - 2026-05-16 13:40 CST

### Newly confirmed issues / fixes

- Fixed: WeChat API responses with `errcode=0` are now treated as success.
  Before this, any endpoint that returned an explicit success code could be
  surfaced as `wechat ... failed (0): ok`.
- Fixed: `.env.local` candidate files are now merged nearest-first by key.
  A higher-priority `.env.local` that only contains `WECHAT_APP_ID` no longer
  shadows a lower-priority `inkforge/.env.local` that supplies
  `WECHAT_APP_SECRET`.
- Fixed: remote image URL validation now rejects IPv4 multicast literals,
  IPv4-mapped local IPv6 literals, and hostnames that resolve to local/private
  addresses before fetching.
- Fixed: Rust draft image validation now finds `<img src>` even when another
  quoted attribute contains `>` before `src`.

### Still-open review findings

- The service/IPC layer has `publishWechatDraft`, `createWechatDraft`, and
  upload commands. The current modal has title + manual `thumb_media_id` +
  create button, but does not expose cover image upload, author, digest, source
  URL, or comment flag fields.
- Token reuse has since been added. Remaining token gap: endpoint-level
  invalid/expired-token responses do not evict cache and retry once.
- WeChat Mermaid/chart handling has since been degraded to a readable PNG/JPG
  placeholder. Remaining gap: it still does not create a real uploaded chart
  image.
- `ExportModal.vue` and `PublishView.vue` now share
  `markdownToWechatWithStats()`. Remaining gap: no component-level test covers
  the modal draft button wiring.
- No live WeChat API test was performed because no `WECHAT_APP_ID` /
  `WECHAT_APP_SECRET` credentials were available in this session.

### Verification added in this pass

| Command / check | Result | Notes |
| --- | --- | --- |
| `cargo test --manifest-path inkforge/src-tauri/Cargo.toml --offline` with temporary HEAD `Cargo.lock`, then immediate removal | Pass | 16 Rust tests passed, including the new `errcode=0`, env merge, quoted-`>` image parsing, multicast / IPv4-mapped host guards |
| `cargo check --manifest-path inkforge/src-tauri/Cargo.toml --offline` with temporary HEAD `Cargo.lock`, then immediate removal | Pass | Tauri command layer still checks offline |
| `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/image-pipeline/image-pipeline.test.ts src/services/export/platform-export-rendering.test.ts` | Pass | 3 files, 37 tests |
| `pnpm -C inkforge typecheck` | Pass | `vue-tsc --noEmit` |
| `pnpm -C inkforge exec eslint src --ext .ts,.tsx,.vue --quiet` | Pass | No lint output |
| `pnpm -C inkforge build` | Pass | Production build succeeded |
| Browser smoke at `http://127.0.0.1:3005/` | Pass with open product gap | Created a real blank article, opened ExportModal from Workstation, confirmed WeChat preflight row and no browser console errors for that pass. Later pass supersedes the old action-list observation: the modal now has a disabled-in-Web-runtime “创建草稿” action plus manual `thumb_media_id` input. Screenshot: `C:\Users\HP\Downloads\inkforge-wechat-export-modal-review-2026-05-16-deeper-pass-2026-05-16T05-40-56-174Z.png` |

## Deeper code-review and runtime pass - 2026-05-16 14:45 CST

### Newly confirmed issues / fixes

- Fixed: WeChat styled preview, native output, and PublishView now route
  Markdown through the same `markdownToWechatWithStats()` path instead of one
  path using raw `marked()` output. This prevents Mermaid from showing as a raw
  `MERMAID` code block in the styled copy path.
- Fixed: Mermaid SVG degradation now prefers `data-source` / clean text labels
  and strips SVG `style`, `script`, and `defs` text before building the WeChat
  placeholder summary. The final WeChat output no longer leaks SVG CSS such as
  `font-family` / `@keyframes` from Mermaid internals.
- Fixed: WeChat access-token cache TTL now subtracts the refresh skew and uses a
  minimum TTL for short `expires_in` values instead of caching the full short
  lifetime.
- Fixed: WeChat reading header stats now use the same AST-backed stats returned
  by `markdownToWechatWithStats()`. Browser repro before the fix: the Workstation
  article showed 19 words, but the WeChat preview header showed `全文 661 字 /
  3 分钟` because Mermaid SVG markup inflated `calculateStats()`. Browser repro
  after the fix: `阅读约 1 分钟 全文 28 字`.
- Fixed: Mermaid is no longer duplicated as a generic
  `render-code-language-unsupported` warning. The visible quality report keeps
  the WeChat-specific PNG/JPG conversion suggestion.

### Still-open review findings

- P1: Cover upload is implemented in the service layer but is not reachable from
  the ExportModal UI. `publishWechatDraft()` can upload `coverImage` when
  `thumbMediaId` is absent, but the modal only exposes a manual
  `thumb_media_id` text input and calls `publishWechatDraft()` with that string.
  A user without a pre-existing permanent material ID still cannot complete the
  cover step from Inkforge.
- P1: `wechat_publish_status()` treats credential presence as configured/ready.
  It does not call the token API or verify account permission, so an invalid
  `appid`/`secret` can make the UI show "ready" until the first upload/draft
  call fails.
- P1: Cached access tokens are reused until TTL but there is no eviction/retry
  path when a later WeChat endpoint reports token-expired/invalid-token errors.
  A bad cached token can keep failing upload/draft operations until expiry.
- P2: The remote image SSRF guard still has a DNS rebinding gap: validation
  resolves the host first, but the later reqwest request performs its own
  connection resolution. Redirects are disabled, but the validated IP is not
  bound to the actual socket connection.
- P2: Tauri draft validation still mainly checks title/content/thumb flags and
  body image hosts. Unsupported or hostile HTML tags are cleaned by the normal
  frontend export path, but `wechat_create_draft` itself does not independently
  reject a direct command payload containing unsupported tags.
- P2 / needs official-live confirmation: a Grok search against WeChat official
  doc URLs indicated `media/uploadimg` body images are smaller than the current
  shared `WECHAT_IMAGE_MAX_BYTES = 2MB` guard, while permanent image material has
  a different limit. The code currently uses one shared limit for article body
  and permanent cover image upload, so the limits should be split after checking
  the current official pages and, ideally, a test account response.

### Verification added in this pass

| Command / check | Result | Notes |
| --- | --- | --- |
| `pnpm -C inkforge exec vitest run src/services/export/platform-export-rendering.test.ts src/services/export/wechat-publish.test.ts src/services/export/image-pipeline/image-pipeline.test.ts --reporter=default` | Pass | 3 files, 43 tests. Added regressions for Mermaid placeholder, reading header stats, and duplicate warning removal. |
| `pnpm -C inkforge typecheck` | Pass | `vue-tsc --noEmit`. |
| `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue src/views/PublishView.vue src/services/export/wechat.ts src/services/export/quality-detector.ts src/services/rendering/optional-renderers.ts src/services/export/platform-export-rendering.test.ts src/services/export/index.ts --ext .ts,.tsx,.vue --quiet` | Pass | No lint output. |
| `cargo fmt --manifest-path inkforge/src-tauri/Cargo.toml --check` with temporary HEAD `Cargo.lock`, then removal | Pass | Cargo.lock was restored only for the Rust check and deleted back to the existing worktree state. |
| `cargo test --manifest-path inkforge/src-tauri/Cargo.toml --offline` with temporary HEAD `Cargo.lock`, then removal | Pass | 20 Rust tests passed. |
| `cargo check --manifest-path inkforge/src-tauri/Cargo.toml --offline` with temporary HEAD `Cargo.lock`, then removal | Pass | Tauri command layer checks offline. |
| Browser smoke at `http://127.0.0.1:3005/workstation?id=c6a66bd5-0457-46a5-9308-ca07350fe362` | Pass with open product gaps | Opened a real saved article from Workstation, opened ExportModal, confirmed Web runtime blocks draft creation, Mermaid degrades to PNG/JPG placeholder, reading header is `全文 28 字` instead of stale `661 字`, duplicate Mermaid unsupported-language warning is gone, and current console error log is empty. Screenshots: `.trellis/tasks/05-14-wechat-rendering-rules-research/evidence/inkforge-wechat-export-modal-stats-fixed-2026-05-16.png-2026-05-16T06-43-14-131Z.png`, `.trellis/tasks/05-14-wechat-rendering-rules-research/evidence/inkforge-wechat-export-modal-quality-fixed-2026-05-16.png-2026-05-16T06-45-08-491Z.png`. |

### External reference note

- Grok search result referenced these WeChat official documentation URLs for the
  next API-limit confirmation pass:
  - `https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html`
  - `https://developers.weixin.qq.com/doc/service/api/material/permanent/api_uploadimage.html`
  - `https://developers.weixin.qq.com/doc/service/api/material/permanent/api_addmaterial.html`

## Follow-up issue hunt - 2026-05-16 14:59 CST

### Newly confirmed findings

- P1: Draft field limits are not enforced before the WeChat API call. The
  official `draft_add` page says `title` is max 32 characters, `author` max 16,
  `digest` max 128, `content_source_url` max 1 KB, and `content` must be under
  both 20,000 chars and 1 MB. Current frontend/Tauri checks only non-empty
  title/content/thumb and content char count. Browser DOM also confirmed the
  modal title input uses `maxlength=64`, so the UI can accept a title that the
  API rejects.
- P1: Article-body image and permanent-cover image upload rules are conflated.
  Official `media/uploadimg` requires JPG/PNG and size below 1 MB. Current Rust
  command layer uses one shared `WECHAT_IMAGE_MAX_BYTES = 2MB` for both
  `media/uploadimg` and `material/add_material`, so a 1-2 MB body image can pass
  local validation and fail at WeChat. The same shared JPEG/PNG-only gate is
  also too narrow for permanent material behavior if the cover path is intended
  to mirror WeChat's material API.
- P2: Final WeChat HTML reintroduces `margin:0 auto` after the normal WeChat
  post-process step. `postProcessForWechat()` removes `margin:auto`, but
  `clampContentWidth()` runs later and adds
  `style="max-width:677px;margin:0 auto;"`. Browser DOM confirmed this is in
  the final `.preview-render` output.
- P2: Draft API payload support is still limited to `news`. Current code has no
  `article_type`, `newspic`, `image_info`, `cover_info`, `pic_crop_235_1`, or
  `pic_crop_1_1` path even though the official `draft_add` payload exposes
  those fields. This is a product gap for image-heavy WeChat posts and cover
  crop control.
- P2: ExportModal does not expose service-supported draft metadata. The service
  type supports `author`, `digest`, `contentSourceUrl`, `needOpenComment`, and
  `onlyFansCanComment`, but the modal only sends `title`, `contentHtml`,
  `thumbMediaId`, and `showCoverPic`.
- P2: ExportModal rich-copy fallback is weaker than PublishView. The shared
  `copyToClipboard()` fallback calls `copyTextToClipboard(html)`, which copies
  literal HTML text, while `PublishView.copyRichText()` uses a selected
  sanitized DOM node with `execCommand('copy')`. If `navigator.clipboard.write`
  is denied/unavailable, the ExportModal success path can degrade to non-rich
  HTML text rather than a WeChat-pasteable fragment.
- P3 / compatibility risk: the final WeChat preview still contains
  `background:linear-gradient(...)` in the reading-time header. The current
  support matrix marks gradients as supported, so this is not classified as a
  confirmed bug, but it is a conservative-template risk and should either have
  a solid-color fallback or be covered by real WeChat-editor paste/API evidence.

### Verification added in this pass

| Command / check | Result | Notes |
| --- | --- | --- |
| Browser smoke at `http://127.0.0.1:3005/workstation?id=c6a66bd5-0457-46a5-9308-ca07350fe362` | Pass with newly confirmed gaps | ExportModal opened against the real saved article. Confirmed `.wechat-draft-area` has no file input, title input has `maxlength=64`, create draft is disabled in Web runtime, final preview contains `style="max-width:677px;margin:0 auto;"` and a reading header `linear-gradient`. Console error log was empty. Screenshot: `.trellis/tasks/05-14-wechat-rendering-rules-research/evidence/inkforge-wechat-export-modal-more-findings-2026-05-16-2026-05-16T06-59-32-905Z.png`. |
| `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/platform-export-rendering.test.ts --reporter=default` | Pass | 2 files, 32 tests. Existing coverage still passes, which confirms these are uncovered product/compat gaps rather than currently failing tests. |
| `npx gitnexus status` | Pass | Index reports current commit `9e3c463` and up-to-date. |
| `npx gitnexus impact clampContentWidth --repo Inkforge --direction upstream --include-tests` | Low risk | One direct test impact reported. |
| `npx gitnexus impact copyToClipboard --repo Inkforge --direction upstream --include-tests` | Low risk | No upstream graph impact reported by current index. |
| `npx gitnexus impact validate_draft_article --repo Inkforge --direction upstream --include-tests` | Not indexed | New uncommitted Rust symbol is not present in the current GitNexus index. |
| `npx gitnexus impact prepare_upload --repo Inkforge --direction upstream --include-tests` | Not indexed | New uncommitted Rust symbol is not present in the current GitNexus index. |

### Official docs checked in this pass

- `https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html`
- `https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_uploadimage.html`
- `https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_addmaterial.html`

## P1 validation repair - 2026-05-16 15:12 CST

### Fixed

- Split article-body image upload validation from permanent-cover material
  validation.
  - Frontend article images now allow only JPG/PNG.
  - Frontend permanent cover upload now allows BMP/GIF/JPG/PNG.
  - Tauri article upload cap is now 1 MB.
  - Tauri permanent image material cap is now 10 MB.
- Added draft metadata preflight validation before `draft/add`:
  - `title` <= 32 chars.
  - `author` <= 16 chars.
  - `digest` <= 128 chars.
  - `contentSourceUrl` <= 1 KB and HTTP(S)-only.
  - `content` remains below both 20,000 chars and 1 MB.
- Aligned ExportModal draft title input with the official 32-character title
  limit.
- Updated `.trellis/spec/backend/quality-guidelines.md` so future work does not
  regress to the old shared 2 MB JPG/PNG upload rule.

### Verification added in this repair pass

| Command / check | Result | Notes |
| --- | --- | --- |
| `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts --reporter=default` | Pass | 16 tests. Covers separated article/cover format handling and draft metadata limit rejection. |
| `pnpm -C inkforge exec vitest run src/services/export/wechat-publish.test.ts src/services/export/platform-export-rendering.test.ts --reporter=default` | Pass | 2 files, 33 tests. Existing Mermaid/stats regressions still pass. |
| `pnpm -C inkforge typecheck` | Pass | `vue-tsc --noEmit`. |
| `pnpm -C inkforge exec eslint src/components/export/ExportModal.vue src/services/export/wechat-publish.ts src/services/export/wechat-publish.test.ts --ext .ts,.tsx,.vue --quiet` | Pass | No lint output. |
| `cargo fmt --manifest-path inkforge/src-tauri/Cargo.toml --check` with temporary HEAD `Cargo.lock`, then removal | Pass | Rust formatting gate passed after running `cargo fmt`. |
| `cargo check --manifest-path inkforge/src-tauri/Cargo.toml --offline` with temporary HEAD `Cargo.lock`, then removal | Pass | Tauri command layer checks offline. |
| `cargo test --manifest-path inkforge/src-tauri/Cargo.toml --offline wechat -- --nocapture` with temporary HEAD `Cargo.lock`, then removal | Pass | 20 WeChat-related Rust tests passed. |
| Browser smoke at `http://127.0.0.1:3005/workstation?id=c6a66bd5-0457-46a5-9308-ca07350fe362` | Pass | ExportModal title input reports `maxLength=32`, draft creation remains blocked in Web runtime, preview still contains the Mermaid PNG/JPG placeholder and `全文 28 字`, and fresh console error logs are empty. Screenshot: `.trellis/tasks/05-14-wechat-rendering-rules-research/evidence/inkforge-wechat-export-modal-validation-fix-2026-05-16-2026-05-16T07-12-02-425Z.png`. |

### Still open after this repair

- ExportModal still lacks cover image picker/upload UI for users without a
  pre-existing permanent `thumb_media_id`.
- `wechat_publish_status()` still reports configured based on credential
  presence, not live token/API permission verification.
- Cached token eviction/retry on endpoint-level invalid/expired token errors is
  still open.
- `article_type=newspic`, `image_info`, `cover_info`, and crop-coordinate fields
  remain out of this repair slice.
- No live WeChat API draft creation was performed because this session still
  lacks real test/public-account credentials.
