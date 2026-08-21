# InkForge 微信富复制运行态证据（2026-08-21）

## 结论

本批次按用户批准的上限执行了 3 个、且仅 3 个一次性富复制草稿；正文图片 API 上传为 `0`，永久封面 API 上传为 `0`，未发表、未群发。三个草稿均使用唯一短标题与 repo-owned sentinel，显式保存、重载、尝试手机预览并精确删除。

当前结论仍为 `blocked-by-external`：三个官方草稿候选都因正文字符数超过 `<20,000` 而不可执行；富复制保存后正文图片和链接被微信宿主清除，导致手机预览、Dark Mode 与封面验证被微信的“必须插入一张图片”门禁阻断。

## 绑定与授权

- corpus SHA-256：`ef1682648bef8bd8b07e7869db1ff61cfe1c627bf92e9bf8ec801803f159ad25`
- preflight bound commit：`3a5711464526d6b11964ca52ee99849cbbe7cdcf`
- 唯一已认证编辑器会话：现场可见并匹配；不持久化账号值、Cookie、Token、私有 URL 或浏览器 profile。
- 批次上限与实际：`draftCreates=3`、`articleImageUploads=0`、`permanentCoverUploads=0`。
- 生产通道：三个 case 均由 `markdownToWechatWithStats()` 生成，再由 `copyWechatHtmlToClipboard()` 写入双 MIME 剪贴板；每个编辑器只粘贴一次。

## 分层结果

| case | canonical fingerprint | clipboard payload digest | applied | explicit save + reload | phone / Dark Mode / cover | cleanup |
|---|---|---|---|---|---|---|
| Classic inline | `sha256:517175aa6dab6a8520d58f61b996e4d8913960f5c5605be4bbfc7b1fdfdd7e26` | 完整临时摘要因重启丢失，未重建 | 标题精确、sentinel `1`、正文图片 `1` | 图片 `0`、链接 `0`；主要文本结构与 6 个公式仍在 | blocked：必须插入一张图片 | 精确标题删除后确认不存在；首轮计时步骤偏离 AC9，见下文 |
| Flagship Kiln | `sha256:2960b1d79ba2b4f6ab301477e95b4536b28e5af1e6b4cbdd9ecbb5766d0c49c9` | `51df8c13508d20d0737b44c4896646cc8c6ea7d942692f1b7cdf877e70c653c8` | semantic `976893174b5dba7678ead6b96e899415a059d08cef1c986bf4ddef13989ce44f` | semantic `639895b96e68609d1f47dd8a0c18a2803af4b784ecd2f63cb117a6b5c10c146a` | blocked：必须插入一张图片 | 约 9 秒与 19 秒刷新检查均不存在，草稿数回到 35 |
| Flagship Kiln paste-safe | `sha256:f662fe5d9a7d24144e2f3290ba8799dd9166cdf02c05be18e0f401c28001ad5b` | `dc91a5c4752884b3d14eb18ebddab6267abbd447f8b92235354c47d63536d844` | semantic `c627494a7903255e33bfb39ce738e2d574d9bb3556838bcb3daff9bc26aabc87` | semantic `8f9b531fd4c927c48667344a9be2f4d8b9b8f8abe739d7702910058199980d2d` | blocked：必须插入一张图片 | 约 11 秒与 27 秒刷新检查均不存在，草稿数回到 35 |

### Kiln 与 paste-safe 的可比较计数

| layer | elements | headings | paragraphs | lists / items | tables | code | formulas | images | links | SVG |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| payload（两者相同投影） | 378 | 4 | 17 | 6 / 12 | 1 | 2 | 6 | 1 | 8 | 11 |
| Kiln applied | 542 | 4 | 41 | 6 / 12 | 1 | 2 | 6 | 1 | 10 | 18 |
| Kiln saved | 530 | 4 | 41 | 6 / 12 | 1 | 2 | 6 | 0 | 0 | 18 |
| paste-safe applied | 516 | 4 | 41 | 6 / 12 | 1 | 2 | 6 | 1 | 10 | 17 |
| paste-safe saved | 504 | 4 | 41 | 6 / 12 | 1 | 2 | 6 | 0 | 0 | 17 |

完整的两个可验证 case 位于 `wechat-fidelity-receipt.json`。其中只持久化 allowlisted tag/role/attribute/style 的顺序、计数和值哈希；原始编辑器 DOM 仅经过 localhost 内存桥瞬时传递，并在摘要生成后立即覆盖，没有写入仓库。

## Classic 证据降级边界

Classic 在重启前已经完成：应用态标题精确、sentinel `1`、正文可见字符 `1575`、元素 `384`、标题 `8`、段落 `25`、表格 `1`、正文图片 `1`；显式保存历史显示“手动保存”，重载后图片与链接均为 `0`，标题、引用、列表、表格、两个代码块与 6 个公式仍在。手机预览被“必须插入一张图片”阻断，草稿数由 36 回到 35。

重启清除了 Classic 的三份完整临时 semantic wrapper，因此本轮没有根据聊天摘要伪造数组或 fingerprint，也没有重新创建草稿（重新执行会超过已批准的 3 个 case）。删除后的标题最终确认不存在，但该 case 未严格完成“立即刷新、至少 15 秒、且 30 秒内”三段计时协议，所以不进入可验证 receipt。

## 根因分类与产品决策

1. **canonical 层已存在引用语义缺口。** 两个 SVG-heavy payload 的 `blockquotes=0` 且都报告 `missing-blockquote`；这是引用 SVG 模块替换原始 `<blockquote>` 后的 canonical 变换，不是微信保存造成。当前证据没有建立该视觉模块与源引用语义的可接受等价规则，因此继续 blocked，不把它写成已解决的 renderer 结论。
2. **editor-application 层存在未解释的结构 normalization。** payload→applied 的 `textSha256`、tag/attribute/style 顺序和节点数均变化；可见计数为 `378/17/11` 扩展到 Kiln 的 `542/41/18`、paste-safe 的 `516/41/17`（elements/paragraphs/SVG）。变化首次出现在粘贴应用后，但没有足够证据证明语义等价，继续 blocked。
3. **SVG 与公式没有观察到保存阶段丢失。** 两个 SVG-heavy case 在显式保存重载后仍分别保留 18 与 17 个 SVG，6 个公式也都保留；这只排除已观察到的 save-loss，不覆盖前两项 canonical/application 差异，因此不启动公式 P1。
4. **正文图片与链接是 host-save normalization 缺口。** 两个 case 在 applied 层都有图片与链接，保存重载后均归零；这不是 canonical renderer 或剪贴板写入失败。
5. **当前批准范围内没有安全的共享代码修复。** data-PNG 要持久化必须先进入微信托管媒体路径；本批明确批准 API 上传为零，而官方草稿又因正文超限不可执行。外链同样由宿主保存策略移除，不能通过放宽 sanitizer 或复制竞品属性强行绕过。引用与应用态 normalization 则需先有可接受等价规则和真机证据，不能凭本轮 blocked readback 改 renderer。
6. **媒体残留采用保守口径。** 富复制自身没有可观察的正文图片 API 计数或素材删除合同；即使保存后图片为零，也不据此声明平台侧绝对无残留，receipt 保留 `residual-external-media`。

因此本轮产品改动保持为此前已提交的共享 no-write planner、一次性确认桥和浏览器一致性修复；真实微信证据既不足以接受 canonical/application normalization，也没有支持一个安全的 renderer 补丁或新增编辑页 companion。

## Official-draft 边界

无写入 preflight 的正文字符数分别为 `25,532`、`39,906`、`37,618`，全部是 `official-draft-ineligible / content-invalid`。本轮没有缩减 corpus、没有强行写入、没有正文图片或永久封面上传，也没有可声称完成的官方草稿 case；因此 AC7、AC8 与 release completion 继续 blocked。
