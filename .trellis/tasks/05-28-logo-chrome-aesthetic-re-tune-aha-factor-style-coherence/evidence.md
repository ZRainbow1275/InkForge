# Logo + Chrome Aesthetic Evidence

## 2026-07-05 Tauri/WebDriver Replay

Scope:
- Replayed the existing real Tauri/WebDriver e2e harness after the current-round SVG/style acceptance scope was narrowed to application + WeChat local readiness.
- This run uses `tauri-driver` + WebView2 through `pnpm -C inkforge test:e2e`; it is not Playwright and it is not a browser-only mock.

Validation:

| Command | Result |
| --- | --- |
| `npx gitnexus impact svg-render.spec.cjs -r InkForge -d upstream --depth 2` | LOW risk; file-only e2e contract edit; 0 affected processes. |
| `pnpm -C inkforge test:e2e` | PASS: 2 spec files / 17 tests. |

Observed coverage from the passing run:

- `visual.spec.cjs`: 11/11 passed in the real Tauri WebView2 shell.
  - TitleBar root, seal slot, and at least 3 chrome control buttons exist.
  - Maximize and minimize controls are clickable and their IPC paths round-trip without throwing.
  - Minimize button does not carry `data-tauri-drag-region`, protecting the prior click-trap regression.
  - TitleBar mark renders Ink-Black drop/anvil paths, carved slice, and Forged-Red ember.
  - Settings About tier-1024 mark renders with the `InkForge·墨铸` wordmark.
  - Motion, typography, easing, focus ring, and light/dark theme cascade tokens remain intact.
- `svg-render.spec.cjs`: 6/6 passed in the same real binary.
  - Seeds a real draft through the live Pinia article store and opens the real ExportModal.
  - Verifies current-round WeChat external handoff rows are 8, not the older three-platform 19-row publish-proof matrix.
  - Keeps `canClaimComplete=false` and external phone/account proof visible.
  - Verifies preset-backed WeChat style rows such as Kiln, Amber, and Toolbar are selectable locally.
  - Confirms flagship Kiln, Tempera, and Amber inject responsive `[data-ink-svg]` modules into the export preview.
  - Confirms flagship body layout stays within the mobile-comfort CJK line-width target.

Boundary:
- This is machine-verifiable chrome/logo/runtime evidence only.
- It does not replace the subjective user acceptance row in this task (`User confirms "this feels Aha"`). That row remains unclaimed until the operator/user confirms the aesthetic result.
- It does not prove WeChat phone preview, mobile Dark Mode, credentialed sync, scheduled send, platform preview, public rendering, Xiaohongshu/Zhihu account upload, or publish success.
