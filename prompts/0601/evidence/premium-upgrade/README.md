# Flagship Premium Upgrade — Before / After Evidence (2026-06-02)

User feedback on the first flagship render (real WeChat phone): **"太素"** — it looked like a
clean GitHub-markdown→WeChat dump (thin green line-art, zero solid color blocks). This upgrade
adds a WeChat-safe **inline-styled HTML color-block layer** for every text-bearing node while
keeping SVG only for pure-graphic motifs.

## Files
| File | What it shows |
|------|---------------|
| `BEFORE-tempera-plain.png` | OLD flagship-tempera (line-art only: bare corner-bracket quote, empty-bracket H2, thin vrule H3, no footer). |
| `BEFORE-kiln-plain.png` | OLD flagship-kiln (already had a flat ribbon bar; still no cards/footer/highlight). |
| `AFTER-tempera-mobile-top.png` | NEW tempera @393px: 深读 kicker cover, reading-meta, tinted quote card + big quote-mark, key-sentence highlight, "01" number-chip H2 + accent rule. |
| `AFTER-kiln-mobile-top.png` | NEW kiln @393px: 专栏 kicker grid cover, kiln-tint quote card, **solid filled white-on-red H2 bar** (boldest). |
| `AFTER-amber-mobile-top.png` | NEW amber @393px: 洞察 kicker, amber-tint quote card, left-bar + "PART 01" uppercase kicker H2 (ink text — auto-contrast). |
| `REALWECHAT-tempera-editor-top.png` | NEW tempera **pasted into the live mp.weixin.qq.com editor** — cover kicker, quote card, key-sentence highlight, H2 chip all survive + render. |
| `REALWECHAT-tempera-editor-mid.png` | Same paste, mid: circular number-chip ordered list, code block, divider, 郑板桥 quote card — all survive. |

## What changed (per node)
- **Cover**: + kicker/eyebrow chip (专栏/深读/洞察), font-family bug fixed.
- **H2**: filled bar (kiln) / number-chip + rule (tempera) / left-bar + PART kicker (amber).
- **H3**: left accent bar + tint plate.
- **Blockquote**: tinted quote card with big quote-mark + attribution (was bare SVG corners); callout/note box variant (NEW) with non-emoji icon.
- **Body**: key-sentence highlight (NEW).
- **Lists**: accent square markers (ul) / circular number chips (ol).
- **Footer**: signature card (NEW) — vessel mark + 墨铸·InkForge + 成为作者吧 + 全文完.

## Verification
1. **Design** — local Playwright render of the real `markdownToWechat` artifacts at 393px (20-22 CJK chars/line confirmed), all 3 presets.
2. **WeChat-safe** — `assertWechatSafe` + grep vs WeChat's `postProcessForWechat` strip list; svg-modules + export suites **851 tests green**, vue-tsc + eslint clean.
3. **Real-WeChat survival** — pasted into the live WeChat ProseMirror editor: 5 inline svg + 18 bg blocks + 3 border-left + 19 radius + footer brand + quote cards + number chips survived the paste sanitizer and render (see REALWECHAT-* shots).

> Authoritative final check (user-gated): paste the regenerated `../wechat-paste/flagship-*.html`,
> hit 预览, scan the QR, eyeball on a real phone. The PC-editor render above is a strong proxy.
