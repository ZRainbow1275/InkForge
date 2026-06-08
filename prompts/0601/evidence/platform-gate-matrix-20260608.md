# Platform Gate Matrix — 2026-06-08

This matrix records the current proof state for the `06-01-multiplatform-render-svg`
acceptance gates. It is evidence-driven: a gate is marked complete only when the named
artifact exists and proves the exact platform state.

## Current Browser State

- `https://mp.weixin.qq.com/` was rechecked through Playwright in this session.
- Current page state: login / QR-login entry, title `微信公众平台`.
- Result: no authenticated WeChat article editor was available, so no new `flagship-amber`
  PC paste proof or mobile-preview proof was collected.

## Machine Gates

| Gate | Evidence | Current state |
| --- | --- | --- |
| Focused cross-platform export tests | `focused-export-refresh-20260608.txt`: 4 files / 64 tests passed | complete |
| SVG module + flagship artifact tests | `svg-modules-refresh-20260608.txt`: 15 files / 383 tests passed | complete |
| Prior Tauri/WebView2 e2e | `e2e-svg-render-20260608-083022.txt`, `e2e/flagship-{kiln,tempera,amber}.png` | complete for local/Tauri e2e only |
| Prior XHS browser canvas raster proof | `xhs-raster/xhs-raster-cover-grid-browser-*.png` and README | complete |

## WeChat Platform Gates

| Gate | Required evidence | Current state | Notes |
| --- | --- | --- | --- |
| `flagship-kiln` PC editor paste | Existing `wechat-paste/wechat-kiln-*.png` plus report text | complete for PC editor paste | Does not prove mobile preview. |
| `flagship-tempera` PC editor paste | Existing `wechat-paste/wechat-tempera-*.png` plus report text | complete for PC editor paste | Does not prove mobile preview. |
| `flagship-amber` PC editor paste | `wechat-paste/wechat-amber-*.png` from authenticated `mp.weixin.qq.com` article editor | missing | Current WeChat page is login entry. |
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
3. Save a non-sensitive local crop proving `flagship-amber` SVG blocks survived PC paste.
4. Configure a cover thumbnail, open phone WeChat preview, and capture the three mobile
   screenshots plus Dark Mode and interaction evidence.

