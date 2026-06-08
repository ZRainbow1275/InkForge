# Platform Gate Matrix — 2026-06-08

This matrix records the current proof state for the `06-01-multiplatform-render-svg`
acceptance gates. It is evidence-driven: a gate is marked complete only when the named
artifact exists and proves the exact platform state.

## Current Browser State

- Earlier 2026-06-08 passes found `https://mp.weixin.qq.com/` at the login / QR-login entry.
- A later continuation reached the authenticated article editor (`title=公众号`, URL token
  redacted) and found `.ProseMirror`.
- The editor contained prior `flagship-amber` content, but DOM readback proved it was plain
  text only: `dataInkSvg=0`, `dataInkBlock=0`, `svg=0`, `styleAttr=0`, `classAttr=0`.
- A real retry wrote the exact `wechat-paste/flagship-amber.html` body to the browser clipboard
  as `text/html` and `text/plain`. Clipboard artifact stats were `dataInkSvg=3`, `svg=35`,
  `dataInkBlock=23`, `styleTag=0`, `scriptTag=0`, `classAttr=0`.
- After real `Control+A` / `Control+V` into `.ProseMirror`, WeChat editor readback was still
  plain text only: `dataInkSvg=0`, `dataInkBlock=0`, `svg=0`, `styleAttr=0`, `classAttr=0`.
- Result: ordinary PC clipboard paste for `flagship-amber` is explicitly not proven; this pass
  records a sanitizer/channel failure and keeps the gate blocked. Evidence file:
  `style-catalog-amber-paste-refresh-20260608.txt`.

## Machine Gates

| Gate | Evidence | Current state |
| --- | --- | --- |
| Focused cross-platform export tests | `focused-export-refresh-20260608.txt`: 4 files / 64 tests passed | complete |
| SVG module + flagship artifact tests | `svg-modules-refresh-20260608.txt`: 15 files / 383 tests passed | complete |
| Prior Tauri/WebView2 e2e | `e2e-svg-render-20260608-083022.txt`, `e2e/flagship-{kiln,tempera,amber}.png` | complete for local/Tauri e2e only |
| Prior XHS browser canvas raster proof | `xhs-raster/xhs-raster-cover-grid-browser-*.png` and README | complete |
| Current XHS raw Markdown leakage gate | `xhs-markdown-gate-refresh-20260608.txt`: 4 files / 67 tests and export suite / 960 tests passed | complete |
| Current style-choice catalog gate | `style-catalog-amber-paste-refresh-20260608.txt`: focused catalog/export test 1 file / 34 tests, cross-platform focused suite 4 files / 73 tests, full export suite 35 files / 966 tests, ESLint, `vue-tsc`, build, and GitNexus low-risk detect-changes all passed | complete for executable catalog and automated platform-rule gates only |

## WeChat Platform Gates

| Gate | Required evidence | Current state | Notes |
| --- | --- | --- | --- |
| `flagship-kiln` PC editor paste | Existing `wechat-paste/wechat-kiln-*.png` plus report text | complete for PC editor paste | Does not prove mobile preview. |
| `flagship-tempera` PC editor paste | Existing `wechat-paste/wechat-tempera-*.png` plus report text | complete for PC editor paste | Does not prove mobile preview. |
| `flagship-amber` PC editor paste | Authenticated `mp.weixin.qq.com` article editor readback containing `data-ink-svg` / inline SVG / inline styles for the exact amber artifact | blocked | 2026-06-08 ordinary `text/html` clipboard paste wrote a rich artifact to clipboard but WeChat readback was plain text only. Different channels such as plugin transfer, developer-tool HTML replacement, or credentialed sync need separate proof. |
| `flagship-kiln` mobile WeChat preview | `wechat-flagship-kiln-mobile-<date>.png` | missing | Must be captured in phone WeChat preview. |
| `flagship-tempera` mobile WeChat preview | `wechat-flagship-tempera-mobile-<date>.png` | missing | Must be captured in phone WeChat preview. |
| `flagship-amber` mobile WeChat preview | `wechat-flagship-amber-mobile-<date>.png` | missing | Must be captured in phone WeChat preview. |
| Mobile SMIL / click interaction | `smil-interaction-<presetId>-<date>.png` or before/after pair | missing | PC editor DOM, local browser, and Tauri e2e do not prove this. |
| Mobile Dark Mode | `darkmode-flagship-{kiln,tempera,amber}-<date>.png` | missing | Required because SVG/HTML block contrast must survive mobile WeChat Dark Mode. |
| Cover thumbnail / preview entry | Mobile preview screenshot and/or non-sensitive note proving cover setup | missing | WeChat preview requires cover setup before phone preview. |

## Source Trust Rules Confirmed

- 135 and Xiumi observations are taxonomy/workflow inputs only.
- 135 SVG center labels such as `仅支持手机端触发` keep the module in `mobile-only-risk`
  until phone WeChat proof exists.
- Plugin transfer, sync draft, preview share, scheduled send, and enterprise/API entry points
  are channel or permission states, not rendering proof.
- Grok Search summaries that introduce unsupported official-guide names, version numbers, or
  percentages remain weak conflict sources and cannot loosen the WeChat-safe contract.

## Next Evidence Actions

1. Login to `mp.weixin.qq.com` with a real account and open the article editor.
2. Paste `wechat-paste/flagship-amber.html` through real `text/html` paste into the PC editor.
3. If ordinary paste still degrades to text, test only a clearly named alternative channel
   (plugin transfer, developer-tool HTML replacement, or credentialed sync) and read back
   non-sensitive DOM counts. Do not merge channel states.
4. Save a non-sensitive local crop or DOM note proving `flagship-amber` SVG blocks survived the
   exact channel under test.
5. Configure a cover thumbnail, open phone WeChat preview, and capture the three mobile
   screenshots plus Dark Mode and interaction evidence.
