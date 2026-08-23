# Release editor experiment evidence — 2026-08-03

This directory contains the redacted, repository-local evidence for the packaged editor experiment.
It contains no account state, browser profile, Cookie, token, QR, HAR, private draft, or platform
publication artifact.

## Bound release

- Executable: `inkforge/src-tauri/target/release/InkForge.exe`
- Bytes: `17,698,304`
- SHA-256: `52e63429fbb9159786080d59f337065e2504903070618f83793f8b4db6b89414`

## Evidence files

| File | Bytes | SHA-256 |
|---|---:|---|
| `editor-source.md` | 5,203 | `dccf0dad039a15bef4cfabfb6798c85e9e9ecb1c68d70c39e6c0490d4a36f7b6` |
| `editor-source.md.meta.json` | 709 | `d3525e3f7bcfb823bcbc054a9d7d70dbe4a809d3c42f38f10269d9d632958e5f` |
| `editor-persisted-body.md` | 5,239 | `00f1e0e91b740374606a6522fb595a485742698b1e141e35f7b0ce78d2ff8711` |
| `wechat-final-artifact.html` | 70,237 | `cf236c6aaa1b23dee9f9a1e2daca51116a48b4de99527e2f28ca49e3f544793a` |
| `editor-experiment-harness.cjs` | 142,205 | `097f9bb789db076a34dba532eb16c6956259a90a83bfe281971e67beb99deb52` |
| `machine-report.json` | 3,205 | `9906e56906ec0c93f53ea7ab6476f564756ebe77bb69e2e102c41ebe81ab4e9c` |

`machine-report.json` binds the exact executable and files, records the visible editor operations,
and contains the independently parsed final-artifact probe. The harness removes only trailing spaces
at line endings when persisting `innerHTML`; DOM structure, text and styles are unchanged. The isolated
WebdriverIO/Tauri run passed `1` spec / `1` test in 24 seconds.

## Reproduction

Run from the repository root in PowerShell after building the bound release:

```powershell
$evidence = '.trellis/tasks/08-02-rendering-editor-wechat-design-system-parent/native-evidence/editor-experiment-20260803'
$spec = 'inkforge/tests/e2e/specs/__tmp-editor-current.spec.cjs'
Copy-Item "$evidence/editor-experiment-harness.cjs" $spec
try {
  $env:INKFORGE_E2E_APPLICATION = (Resolve-Path 'inkforge/src-tauri/target/release/InkForge.exe').Path
  $env:INKFORGE_E2E_SKIP_TAURI_BUILD = '1'
  $env:INKFORGE_E2E_SEED_MARKDOWN_FILE = (Resolve-Path "$evidence/editor-source.md").Path
  pnpm -C inkforge exec wdio run tests/e2e/wdio.conf.cjs --spec tests/e2e/specs/__tmp-editor-current.spec.cjs
} finally {
  Remove-Item $spec -ErrorAction SilentlyContinue
}
```

This evidence proves only the packaged editor round trip and local final WeChat HTML generation. It
does not prove WeChat PC ordinary paste, phone preview, Dark Mode, native media binding, sync,
scheduled/group send, or publication.
