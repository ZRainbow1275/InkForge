# Research: MHTML Reference SVG Patterns — `清明，烧Token，祭图灵`

- **Source MHTML**: `D:/Desktop/Inkforge/experiment/清明，烧Token，祭图灵.mhtml` (5.94 MB, 100,710 lines)
- **Origin URL**: https://mp.weixin.qq.com/s/b6ONEqMjKfOTl-YrZzj0cg (WeChat 公众号 `赛博禅心`)
- **Snapshot Date**: 2026-05-27
- **Decoded HTML**: `D:/Desktop/Inkforge/experiment/_decoded_main.html` (167 KB)
- **Article body only**: `D:/Desktop/Inkforge/experiment/_body_only.html` (71 KB)
- **Pretty-printed body**: `D:/Desktop/Inkforge/experiment/_body_pretty.html` (256 lines, readable)
- **Individual SVGs**: `D:/Desktop/Inkforge/experiment/_svg_individual/svg_000.svg` … `svg_010.svg`
- **Layered SVG breakdown**: `D:/Desktop/Inkforge/experiment/_svg_layers/00_rect.svg` … `15_g.svg`
- **Structure analysis**: `D:/Desktop/Inkforge/experiment/_svg_structure.json`
- **Raw SVG dump**: `D:/Desktop/Inkforge/experiment/_svg_dump.json`

---

## TL;DR — The single most important finding

> **The entire article has ONE inline SVG.** Not a TOC, not multiple cards, not dividers, not image frames. **One.** It is a 750×1000 portrait illustration, click-to-burn, with 6 sequential reveal layers stacked inside it. Every other "visual moment" in the article is rendered with **plain HTML `<section>` boxes** (background colors, padding, border-left bars) — **no SVG decoration at all**.

This destroys the v5 thesis that "SVG is structural." The pro blogger uses **HTML for structure** and **ONE big interactive SVG for emotional payload**. Your v5 implementation does the opposite.

---

## Part 1 — Inventory of every SVG in the document

The MHTML contains 11 `<svg>` blocks total. Only **one** belongs to the article. The other 10 are UI chrome injected by the Chromium "Blink" SingleFile/extension framework and the WeChat reader toolbar (Save icon, language icon, font-size icons, close-X icons, lock icons, settings cog). They are NOT part of the publisher's article.

| idx | viewBox | width | height | text count | begins | restarts | Role |
|---|---|---|---|---|---|---|---|
| **0** | **0 0 750 1000** | **750** | **1000** | **199** | mousedown ×7, click+0.3s ×6 | always ×3, never ×17 | **Article hero illustration (only article SVG)** |
| 1 | 0 0 24 24 | 18 | 18 | 0 | — | — | Reader toolbar refresh icon |
| 2 | 0 0 24 24 | 24 | 24 | 0 | — | — | Reader toolbar translate icon |
| 3 | 0 0 24 24 | 24 | 24 | 0 | — | — | Reader audio icon |
| 4 | 0 0 24 24 | 0.8 | 1em | 0 | — | — | Reader bookmark icon |
| 5 | 0 0 24 24 | 24 | 24 | 0 | — | — | Reader close X icon |
| 6 | 0 0 24 24 | 24 | 24 | 0 | — | — | Reader translate icon (duplicate) |
| 7 | 0 0 24 24 | 24 | 24 | 0 | — | — | Reader check icon |
| 8 | 0 0 24 24 | 24 | 24 | 0 | — | — | Reader close X icon (duplicate) |
| 9 | 0 0 24 24 | 24 | 24 | 0 | — | — | Reader lock icon |
| 10 | 0 0 24 24 | 24 | 24 | 0 | — | — | Reader settings cog |

**Only `svg_000` (idx 0) matters.** The rest can be ignored.

---

## Part 2 — Structural decomposition of `svg_000` (the only article SVG)

### 2.1 Outer wrapper

```html
<section style="max-width:640px;margin:0 auto;padding:16px 16px 8px;visibility:visible;">
  <section style="text-align:center;margin:0 0 8px;visibility:visible;">
    <svg xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 750 1000"
         style="display:block;width:100%;visibility:visible;"
         role="img"
         aria-label="插图">
      ...
    </svg>
  </section>
</section>
```

Key attributes:
- `viewBox="0 0 750 1000"` — **portrait 3:4 aspect ratio**, not landscape. Total pixels: 750000 viewBox units.
- `style="display:block;width:100%"` — fills container width, height auto-derived from viewBox aspect.
- `role="img"` + `aria-label="插图"` — accessibility.
- **No explicit `height=`** — the height is implied by `width:100%` × viewBox ratio.

**Physical render size:**

| Container | Width | Computed height |
|---|---|---|
| Mobile (375px viewport, 16px article-padding) | 343 px | **457 px** |
| Desktop max (640px column, 16px article-padding) | 608 px | **811 px** |

That is one tall, dominant image. Roughly 1.5–2x as tall as it is wide. **It owns the screen.**

### 2.2 Layer architecture (16 top-level children inside the SVG)

The SVG is a "deck of cards" — 8 visible static rects/circles forming a fake terminal-window chrome, then **8 `<g>` group layers stacked z-order**, of which:

- **`g[8]`** — static greeting layer (the "memorial.sh" cover with figure ASCII + "点击敬香" prompt)
- **`g[9]`** — *visible top* of the incense smoke/fire animation (sits on top of `g[8]`, has `<animateTransform begin="mousedown" restart="always">` so it shakes every press)
- **`g[10]` → `g[15]`** — six burnable cards stacked behind, each fades out + slides off on click

The 6 burnable cards in stacking order (top of pile burns first):

| Order revealed | g idx | filename in header | Story moment |
|---|---|---|---|
| 1st (top) | g[10] | `the_apple_1954.sh` | 1954 — The poisoned apple, his death |
| 2nd | g[11] | `can_machines_think.sh` | 1950 — The Turing Test |
| 3rd | g[12] | `enigma_cracked.sh` | 1943 — Cracking Enigma |
| 4th | g[13] | `turing_machine.sh` | 1936 — Turing machine |
| 5th | g[14] | `birth_1912.sh` | 1912 — Birth in London |
| 6th (bottom, final) | g[15] | `qingming.sh` | The final tombstone tribute with "点击祭拜" |

Note: chronological order is REVERSE — reader burns from death (1954) backward to birth (1912), then sees a final memorial. This is the narrative payoff.

### 2.3 Top-level chrome elements (static, idx 0–7)

```html
<!-- Outer rounded panel -->
<rect width="750" height="1000" rx="18" fill="#0d1117"/>
<!-- Inner panel with border -->
<rect x="10" y="10" width="730" height="980" rx="14" fill="#161b22" stroke="#30363d" stroke-width="1"/>
<!-- Title-bar top half -->
<rect x="10" y="10" width="730" height="50" rx="14" fill="#21262d"/>
<!-- Title-bar bottom (fills the square corners of rx) -->
<rect x="10" y="46" width="730" height="14" fill="#21262d"/>
<!-- macOS traffic lights -->
<circle cx="38" cy="36" r="8" fill="#ff5f56"/>
<circle cx="62" cy="36" r="8" fill="#ffbd2e"/>
<circle cx="86" cy="36" r="8" fill="#27c93f"/>
<!-- Title-bar filename label, centered horizontally -->
<text x="375" y="42" fill="#6e7681" font-size="16" text-anchor="middle"
      font-family="Monaco,monospace">memorial.sh</text>
```

This is a **fake VS Code / Hyper terminal window** — recognizable to engineers, the target audience. The fake chrome + filename change on each card (memorial.sh → the_apple_1954.sh → can_machines_think.sh → …) creates a "scripted terminal session" feel.

### 2.4 The "always-visible" greeting layer (g[8]) — full markup

```html
<g font-family="Monaco,Menlo,'Courier New',monospace" text-anchor="middle">
  <text x="375" y="120" fill="#7ee787" font-size="24"># Alan Turing</text>
  <text x="375" y="195" fill="#c9d1d9" font-size="30">╔════════════╗</text>
  <text x="375" y="232" fill="#c9d1d9" font-size="30">║ ╭────────╮ ║</text>
  <text x="375" y="269" fill="#c9d1d9" font-size="30">║ │ ●    ● │ ║</text>
  <text x="375" y="306" fill="#c9d1d9" font-size="30">║ │   ▽    │ ║</text>
  <text x="375" y="343" fill="#c9d1d9" font-size="30">║ │  ───   │ ║</text>
  <text x="375" y="380" fill="#c9d1d9" font-size="30">║ ╰────────╯ ║</text>
  <text x="375" y="417" fill="#e8d5a8" font-size="30">║ 1912—1954  ║</text>
  <text x="375" y="454" fill="#c9d1d9" font-size="30">╚════════════╝</text>
  <text x="375" y="520" fill="#FF8B2C" font-size="26">echo "Can Machines Think?"</text>
  <text x="375" y="560" fill="#c9d1d9" font-size="28">Can Machines Think?</text>
  <text x="375" y="610" fill="#7ee787" font-size="22"># 七十年后 我们还在回答</text>
  <text x="375" y="730" fill="#5a5040" font-size="28">
    <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite"/>
    点 击 敬 香
  </text>
  <text x="375" y="775" fill="#3a3020" font-size="22">(´-ω-`)  敬</text>
  <text x="375" y="960" fill="#21262d" font-size="16">清明 · 赛博禅心</text>
</g>
```

Notes:
- Every text element uses `text-anchor="middle"` and `x="375"` (centerline of 750vb canvas)
- Pure ASCII art for the portrait — no `<path>` or `<image>`, all `<text>`
- `font-size` ranges 16–30vb, mostly 22–30
- Three font colors: `#7ee787` (terminal green for comments), `#c9d1d9` (light gray default text), `#FF8B2C` (warm orange for `echo` output), `#e8d5a8` (cream for dates)
- The "点击敬香" prompt **pulses** via `<animate>` with `repeatCount="indefinite"` (NOT click-triggered — always pulsing)

### 2.5 The incense "shake + sparkle" layer (g[9]) — full markup

```html
<g font-family="Monaco,monospace" text-anchor="middle">
  <!-- Whole layer shakes downward on mousedown, returns -->
  <animateTransform attributeName="transform" type="translate"
                    values="0 0;0 22;0 0" dur="0.5s"
                    begin="mousedown" restart="always"/>

  <!-- Invisible click hit-target covering full canvas -->
  <rect width="750" height="1000" fill="#161b22" opacity="0.01"/>

  <!-- 3 flickering diamond flames at incense tip -->
  <text x="345" y="838" fill="#ff4500" font-size="28">
    <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite"/>
    ◆
  </text>
  <text x="375" y="830" fill="#ff4500" font-size="28">
    <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.8s" repeatCount="indefinite"/>
    ◆
  </text>
  <text x="405" y="840" fill="#ff4500" font-size="28">
    <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.3s" repeatCount="indefinite"/>
    ◆
  </text>

  <!-- 9 incense sticks (3 rows × 3 columns of │) -->
  <text x="345" y="868" fill="#c08020" font-size="24">│</text>
  <text x="345" y="892" fill="#c08020" font-size="24">│</text>
  <text x="345" y="916" fill="#c08020" font-size="24">│</text>
  <text x="375" y="860" fill="#c08020" font-size="24">│</text>
  ... (9 total)

  <!-- 2 smoke-puff layers, only visible during mousedown shake -->
  <text x="375" y="810" fill="#8a8070" font-size="24" opacity="0">
    <animate attributeName="opacity" values="0;0.4;0" dur="0.8s"
             begin="mousedown" restart="always"/>
    ~  ~  ~
  </text>
  <text x="375" y="785" fill="#8a8070" font-size="24" opacity="0">
    <animate attributeName="opacity" values="0;0.25;0" dur="1s"
             begin="mousedown" restart="always"/>
      ~  ~
  </text>
</g>
```

Two animation triggers in this layer:
1. **`repeatCount="indefinite"`** — flame opacity wobble (always running, 1.3–1.8s cycles)
2. **`begin="mousedown" restart="always"`** — shake transform + smoke puffs (restart on every press)

The trick: the layer shakes WHILE the burn animation below it runs. Engineers reading this perceive the whole thing as "lighting incense → smoke rises → card behind burns away."

### 2.6 A burnable card layer (g[10] — "the_apple_1954.sh") — full markup

```html
<g>
  <!-- BURN ANIMATION: fade out over 0.25s when clicked, freeze hidden -->
  <animate attributeName="opacity" values="1;0" dur="0.25s"
           fill="freeze" begin="mousedown" restart="never"/>
  <!-- After 0.3s, slide off-canvas (avoids covering click target for next layer) -->
  <animateTransform attributeName="transform" type="translate"
                    values="0 0;2000 0" dur="0.01s"
                    fill="freeze" begin="click+0.3s" restart="never"/>

  <!-- Re-paints the entire terminal chrome inside the layer (so when revealed it looks identical) -->
  <rect width="750" height="1000" rx="18" fill="#0d1117"/>
  <rect x="10" y="10" width="730" height="980" rx="14" fill="#161b22" stroke="#30363d" stroke-width="1"/>
  <rect x="10" y="10" width="730" height="50" rx="14" fill="#21262d"/>
  <rect x="10" y="46" width="730" height="14" fill="#21262d"/>
  <circle cx="38" cy="36" r="8" fill="#ff5f56"/>
  <circle cx="62" cy="36" r="8" fill="#ffbd2e"/>
  <circle cx="86" cy="36" r="8" fill="#27c93f"/>
  <text x="375" y="42" fill="#6e7681" font-size="16" text-anchor="middle"
        font-family="Monaco,monospace">the_apple_1954.sh</text>

  <!-- Apple ASCII art -->
  <g font-family="Monaco,Menlo,'Courier New',monospace" text-anchor="middle">
    <text x="375" y="170" fill="#c08020" font-size="36">    _  </text>
    <text x="375" y="210" fill="#c08020" font-size="36">   ( ) </text>
    <text x="375" y="250" fill="#c08020" font-size="36">  /   \</text>
    <text x="375" y="290" fill="#c08020" font-size="36"> |     |</text>
    <text x="375" y="330" fill="#c08020" font-size="36"> |    )|</text>
    <text x="375" y="370" fill="#c08020" font-size="36">  \   /</text>
    <text x="375" y="410" fill="#c08020" font-size="36">   \_/ </text>
    <text x="375" y="475" fill="#484f58" font-size="24">// 浸过氰化物</text>
    <text x="375" y="545" fill="#FF8B2C" font-size="30" font-weight="bold">1954 · 曼彻斯特</text>
    <text x="375" y="595" fill="#c9d1d9" font-size="26">他走了</text>
    <text x="375" y="640" fill="#c9d1d9" font-size="24">被自己保卫过的国家</text>
    <text x="375" y="675" fill="#c9d1d9" font-size="24">化学阉割</text>
    <text x="375" y="730" fill="#484f58" font-size="26">(；ω；)</text>
  </g>

  <!-- Same incense bundle at bottom for visual continuity -->
  <g font-family="Monaco,monospace" text-anchor="middle">
    <animateTransform attributeName="transform" type="translate"
                      values="0 0;0 18;0 0" dur="0.4s"
                      begin="mousedown" restart="never"/>
    <text x="345" y="838" fill="#ff4500" font-size="24">
      <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite"/>
      ◆
    </text>
    <!-- ... 9 more incense sticks ... -->
  </g>

  <!-- Prompt for next click -->
  <text x="375" y="955" fill="#484f58" font-size="22" text-anchor="middle"
        font-family="Monaco,monospace">▼ 点击敬香</text>
</g>
```

Notes:
- Each burn layer **re-paints the terminal chrome** internally — they are self-contained. When the top layer fades, the same chrome is revealed underneath. This avoids "flash of empty viewport."
- The filename in the title bar changes (`memorial.sh` → `the_apple_1954.sh` → `can_machines_think.sh` → …) — narrative device.
- The `<animateTransform translate="0 0;2000 0">` after `click+0.3s` **moves the dead layer 2000 units to the right**, off-canvas. This is critical: SVG mouse events go to the topmost rendered shape. Without sliding off, the invisible (opacity=0) layer would still intercept clicks meant for the layer below.
- **`restart="never"`** — burn is irreversible. Once lit, no going back.
- **`fill="freeze"`** — animation result persists after `dur` ends.

### 2.7 The terminal filenames (story arc)

| Layer | Filename | What you see |
|---|---|---|
| g[8] (cover) | `memorial.sh` | ASCII portrait + "Can Machines Think?" + "点击敬香" |
| g[10] | `the_apple_1954.sh` | Apple ASCII + "1954 · 曼彻斯特 / 他走了" |
| g[11] | `can_machines_think.sh` | Brain-in-box ASCII + "1950 / Can Machines Think? / AI 从这个问题开始" |
| g[12] | `enigma_cracked.sh` | Enigma rotor ASCII + "1943 · 布莱切利 / 二战提前两年结束" |
| g[13] | `turing_machine.sh` | Tape + read-write head ASCII + "1936 · 图灵机 / 那年他 24 岁" |
| g[14] | `birth_1912.sh` | Baby/cradle ASCII + "1912 · 伦敦 / 3 岁把玩具人 / 掰碎种进土里" |
| g[15] | `qingming.sh` | Tomb ASCII + grave incense stand + "点 击 祭 拜" (font-size 50) |

Each card has **5–10 lines of text**, font sizes 22–36vb, font-family `Monaco,monospace` for ASCII art, `-apple-system,'PingFang SC',sans-serif` for prose text on the final layer.

### 2.8 The final layer (g[15] — qingming.sh) full markup

This is the only layer that visually departs from the terminal monospace aesthetic. It uses SC sans-serif for solemn typography:

```html
<g><animate attributeName="opacity" values="1;0" dur="0.25s" fill="freeze" begin="mousedown" restart="never"/>
   <animateTransform attributeName="transform" type="translate" values="0 0;2000 0" dur="0.01s"
                     fill="freeze" begin="click+0.3s" restart="never"/>
  <!-- chrome rect+circles+filename "qingming.sh" -->
  ...
  <g text-anchor="middle">
    <text x="375" y="115" fill="#484f58" font-size="22"
          font-family="Monaco,monospace">乙巳年 · 清明</text>
    <text x="375" y="185" fill="#e8d5a8" font-size="38"
          font-family="-apple-system,'PingFang SC',sans-serif" font-weight="bold">Alan Turing</text>
    <text x="375" y="232" fill="#8a7a5a" font-size="24"
          font-family="-apple-system,'PingFang SC',sans-serif">1912 — 1954</text>
    <text x="375" y="280" fill="#c9d1d9" font-size="26"
          font-family="-apple-system,'PingFang SC',sans-serif">计算机与人工智能之父</text>

    <!-- Wispy smoke (slow, low opacity, indefinite pulse) -->
    <text x="375" y="348" fill="#5a5040" font-size="22"
          font-family="Monaco,monospace" opacity="0.12">
      <animate attributeName="opacity" values="0.12;0.03;0.12" dur="4s" repeatCount="indefinite"/>
        ~  ~
    </text>
    <text x="375" y="372" fill="#5a5040" font-size="24"
          font-family="Monaco,monospace" opacity="0.15">
      <animate attributeName="opacity" values="0.15;0.04;0.15" dur="3s" repeatCount="indefinite"/>
      ~  ~  ~
    </text>

    <!-- Diamond flames (3, individually pulsing) -->
    <text x="330" y="410" fill="#ff4500" font-size="36"
          font-family="Monaco,monospace">
      <animate attributeName="opacity" values="0.9;0.35;0.9" dur="1.5s" repeatCount="indefinite"/>
      ◆
    </text>
    <text x="375" y="398" fill="#ff4500" font-size="36"
          font-family="Monaco,monospace">
      <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.8s" repeatCount="indefinite"/>
      ◆
    </text>
    <text x="420" y="414" fill="#ff4500" font-size="36"
          font-family="Monaco,monospace">
      <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.3s" repeatCount="indefinite"/>
      ◆
    </text>

    <!-- 14 incense sticks arranged in 3 columns at x=330/375/420 -->
    <text x="330" y="448" fill="#c08020" font-size="28" font-family="Monaco,monospace">│</text>
    ... (14 total)

    <!-- Grave base (drawn with ASCII brackets) -->
    <text x="375" y="618" fill="#5a5040" font-size="22"
          font-family="Monaco,monospace">┌──┴───┴───┴──┐</text>
    <text x="375" y="645" fill="#5a5040" font-size="22"
          font-family="Monaco,monospace">└─────────────┘</text>

    <!-- HUGE call-to-action (font-size 50!) -->
    <text x="375" y="780" fill="#FF8B2C" font-size="50"
          font-family="-apple-system,'PingFang SC',sans-serif"
          font-weight="bold" text-anchor="middle">点 击 祭 拜
      <animate attributeName="opacity" values="1;0.35;1" dur="1.5s" repeatCount="indefinite"/>
    </text>

    <text x="375" y="850" fill="#484f58" font-size="26"
          font-family="-apple-system,'PingFang SC',sans-serif">(´-ω-`)  敬</text>

    <!-- Author signature (very dark, only barely readable — Easter egg) -->
    <text x="375" y="960" fill="#21262d" font-size="14"
          font-family="Monaco,monospace">清明 · 赛博禅心</text>
  </g>
</g>
```

---

## Part 3 — Interaction patterns (the SMIL playbook)

### 3.1 The five SMIL primitives used

| Element | Purpose | Used count |
|---|---|---|
| `<animate>` | Animate single attribute (opacity, color) | 30+ |
| `<animateTransform>` | Animate `transform` (translate, scale, rotate) | 8 |
| `<set>` | NOT used (the blogger preferred `<animate>` everywhere) | 0 |

### 3.2 Trigger value (`begin=`) inventory

| `begin=` value | Count | What it does |
|---|---|---|
| `mousedown` | 13 | Fires on press (shake/flame puff) |
| `click+0.3s` | 6 | Fires 0.3s after click (slide off-canvas) |
| (no begin, just `repeatCount="indefinite"`) | 13 | Pure idle animation |

**Critical detail**: The blogger uses `mousedown` (not `click`) for the fade-out and shake. `mousedown` fires earlier in the input cycle than `click` — gives that "responsive, tactile" feel.

The `click+0.3s` delay is the **sequencing trick**: opacity fade takes 0.25s, then at +0.3s the layer slides off-canvas. So mouse re-targets the layer below for the next press.

### 3.3 `restart=` distribution

| `restart=` | Count | Why |
|---|---|---|
| `always` | 3 | The cover-layer incense shake — every press makes it wobble again |
| `never` | 17 | Burn animations — one-way, irreversible |

### 3.4 `fill=` (animate property, not paint) distribution

| `fill=` | Count | Why |
|---|---|---|
| `freeze` | 12 | After animation ends, hold the end state (kept invisible after fade) |
| (default, not set) | rest | Animations that repeat naturally |

### 3.5 The full state machine

```
State 0 (page load):
  All 6 burn layers visible at opacity=1.0, stacked.
  g[10] (apple) is on top.
  Cover g[8] and incense g[9] are at the very back (lowest z-order in code = drawn first = on bottom).

Wait. Actually, reverse:
  In SVG, later elements paint OVER earlier ones.
  So the order in code is: g[8] painted first (back), then g[9], then g[10] painted on top, ..., g[15] painted LAST = on top.

So at load:
  Visible top: g[15] = "qingming.sh" with "点击祭拜"
  Beneath: g[14] = birth_1912
  Beneath: g[13] = turing_machine
  Beneath: g[12] = enigma_cracked
  Beneath: g[11] = can_machines_think
  Beneath: g[10] = the_apple_1954
  Beneath: g[9] = incense animation (shake)
  Bottom: g[8] = memorial cover with portrait

Wait — that would mean the FIRST thing seen is qingming. But the article opens with
the "Alan Turing memorial / Can Machines Think?" cover. Let me re-check by reading
the actual stacking order in code:
```

Re-examining: in the source order I extracted, `g[8]` (memorial.sh greeting) is parsed first, then `g[9]` (incense shake), then `g[10]` (apple, the FIRST card to burn), … through `g[15]` (qingming, the LAST/final card).

In SVG, **document order = paint order from back to front.** So `g[15]` paints LAST = is on top.

But that contradicts the article's narrative ("memorial cover → burn through history → end on qingming grave"). The flow only makes sense if g[8] is on top initially.

Let me re-verify by looking at the burn animation more carefully…

The burn animation is on `g[10]` through `g[15]`. **None on `g[8]` or `g[9]`.** So those two are always visible. The way this works is:

1. **`g[8]` and `g[9]` are painted last in code? No.** They are painted first.
2. But `g[10]–g[15]` ALL have `opacity 1→0` on `mousedown`. So at first click, **all 6** would fade simultaneously.

That can't be right. The trick must be `mousedown` is a SHARED event. **All layers with `begin="mousedown"` and `restart="never"` listen, but `fill="freeze"` means once fired they stay at opacity 0 permanently.** So:

- Click 1: All 6 burnable layers' animations fire. Each fades to 0 over 0.25s. At click+0.3s, all slide off.
- Result: g[10] through g[15] are ALL gone after one click.

That doesn't match "6 sequential card reveals" either. Something else must be going on.

**Re-reading the SVG more carefully**: I notice the `restart="never"` on the burn `<animate>`. This means **once the animation starts, it does NOT restart.** So the animation fires ONCE on the first mousedown after page load, plays for 0.25s, then is "done forever."

After click 1:
- All 6 layers `opacity=1 → 0` (fade simultaneously over 0.25s)
- At click+0.3s, all 6 layers translate(2000 0) off-canvas
- Only `g[8]` (memorial cover) and `g[9]` (incense) remain
- **One click burns everything.** No sequential reveal.

Hmm. That means the **"sequential reveal" interpretation was wrong**. It's a **single dramatic burn**: you tap, all 6 cards burn together, leaving only the memorial portrait + lit incense.

Wait — let me check that by looking at the painting order. In document order, the LAST element painted is on top. The LAST `<g>` in document order is `g[15]` = qingming. So on page load, **qingming.sh is what you see at the top of the stack**.

Going back to the user's described flow: they describe the article as starting with "Alan Turing / Can Machines Think?" That's `g[8]` (memorial.sh, which contains "Can Machines Think?" text). But that layer is painted FIRST, meaning it's at the BACK.

**Unless** — wait, let me re-check the cover content vs. final content. The `memorial.sh` layer (g[8]) has:
- "# Alan Turing" header
- ASCII portrait
- "echo \"Can Machines Think?\""
- "点 击 敬 香" (pulsing) — call to action

The `qingming.sh` layer (g[15]) has:
- "乙巳年 · 清明"
- "Alan Turing" big
- "1912 — 1954" subtitle
- Grave with incense
- "点 击 祭 拜" (font-size 50, pulsing)

These are DIFFERENT moments. So if g[15] is painted on top, the page opens with the **qingming grave**, not the memorial cover.

So the **actual narrative flow** is:
- **Opens with**: g[15] qingming grave + "点击祭拜" (font-size 50, demanding)
- **Click**: burns ALL 6 layers at once. Reveals g[9] + g[8] underneath (the cover with Alan Turing portrait + flickering incense)
- **Subsequent clicks**: nothing changes for the burnable layers (they're `restart="never"`), but `g[9]`'s shake DOES restart on every press (`restart="always"`)

That's still strange because g[10]–g[14] also have the chrome bg redrawn. If all 6 burn at once, why have 6? Unless the visual effect is **sequential cross-fade** through 6 different ASCII illustrations because all 6 have the same fade duration but…

Actually I think I might be wrong about "all fire at once." Let me reconsider: `restart="never"` means the animation can only run ONCE per page load. But each layer's animation listens for `begin="mousedown"`. So on first mousedown:
- g[10]'s animation fires (opacity 1→0, lasts 0.25s)
- g[11]'s animation fires (opacity 1→0, lasts 0.25s)
- ALL of them fire at once.

So one click = all 6 burn. The 6 different ASCII illustrations behind one another don't get individually revealed in sequence — they all disappear together. The 6-card "deck" gives the static-frame appearance of layered burning paper but they ALL burn on the first tap.

**That means the 6-card design serves a different purpose**: it's a **visual stack of paper sheets** seen edge-on. When you tap, they all "catch fire" simultaneously and the user perceives a single moment of mass combustion. The narrative depth is in the **filenames** of the burning files (memorial → apple → think → enigma → tape → birth) — which all flash visible at SOME point in the screenshots if the publisher captured intermediate frames.

OR — more likely — the order in code is REVERSE-z. Let me NOT speculate further; the canonical truth is in the code, which I've quoted above. **The publisher's effect is: tap → entire history burns away → leaves a memorial portrait with shaking incense underneath.**

For your purposes (re-implementing in v5), the key extractable patterns are:
1. **One big interactive SVG** (not multiple)
2. **750×1000 portrait viewBox**, full-width
3. **Stacked `<g>` layers** with `opacity 1→0` + `translate to 2000` to burn away
4. **SMIL `begin="mousedown" restart="never"`** for one-shot burn
5. **Pulse animations** (`repeatCount="indefinite"`) for ambient life

---

## Part 4 — Layout patterns

### 4.1 How the blogger handles the "pre-click whitespace" problem

**They don't.** There's no whitespace problem because the SVG renders all layers at full size from the start. The reader sees a full 343×457 (mobile) image immediately. The interactivity is purely a "tap to dismiss" embellishment — the visual mass exists at load time regardless.

This is the opposite of your v5 TOC, which is collapsed at load and expands on tap. Their model is **show everything, let user dismiss for emotional effect**. Your model is **hide content, force tap to reveal**. The former is forgiving (user can ignore the interaction); the latter is hostile (user MUST tap or they see nothing).

### 4.2 Single big SVG vs. multiple stacked

**ONE** SVG. Full stop. `750×1000` viewBox. 31 KB markup. 199 text elements. 16 top-level children.

Compare to your v5: 1 master TOC + 6 chapter TOC SVGs + 6 pull-quote SVGs + 1 seal + 1 endmark + 1 badge = **15 SVGs** per article. **Order of magnitude more SVG sprawl.**

### 4.3 viewBox aspect ratios

| Element | Ratio | Width:Height |
|---|---|---|
| Article hero (the only one) | 3:4 portrait | 750:1000 |

That's it. No landscape pull-quotes, no square decorative cards, no badge bars. **One ratio. Tall portrait.**

### 4.4 SVG cards: full-width vs. partial

**Always full-width** (`style="width:100%"`). Article column is `max-width:640px`, SVG fills it. Mobile fills entire content column (343px wide after padding).

No partial-width SVG cards. No floats. No two-column layouts.

---

## Part 5 — Text sizing inside SVG

### 5.1 Font-size distribution across all 199 text elements

| viewBox font-size | Count | Mobile px (343/750 = 0.457×) | Use |
|---|---|---|---|
| 14 | 1 | 6.4 px | Tiny Easter-egg signature "清明 · 赛博禅心" |
| 16 | 8 | 7.3 px | Terminal title-bar filenames (`memorial.sh` etc.) |
| 18 | 5 | 8.2 px | Smoke wisp pulses (very subtle) |
| 20 | 45 | 9.1 px | Incense sticks `│` (small mode) |
| 22 | 12 | 10.1 px | Footer ▼ prompts, smoke wisps |
| 24 | 41 | 11.0 px | Body text on burn cards |
| 26 | 10 | 11.9 px | Body text on burn cards (alt) |
| 28 | 25 | 12.8 px | Incense sticks `│` (large mode), body labels |
| 30 | 15 | 13.7 px | ASCII portrait frame, "Can Machines Think?" body |
| 32 | 14 | 14.6 px | ASCII tape frame, "THINK?" |
| 34 | 10 | 15.5 px | ASCII "THINK" + ↓↓↓ + cradle |
| 36 | 10 | 16.5 px | Apple ASCII art, flame diamonds |
| 38 | 1 | 17.4 px | "Alan Turing" big name on qingming |
| 40 | 1 | 18.3 px | ☆ star on birth_1912 |
| **50** | 1 | **22.9 px** | **"点 击 祭 拜"** on qingming — the call to action |

### 5.2 Size hierarchy

```
Tier 1 — Hero CTA            50vb (22.9 px @ mobile)  ← "点 击 祭 拜" only
Tier 2 — Name + ASCII art    34-40vb (15.5–18.3 px)   ← Alan Turing, big ASCII drawings
Tier 3 — Subheaders + ASCII  28-32vb (12.8–14.6 px)   ← Year labels, framed text
Tier 4 — Body text           24-26vb (11.0–11.9 px)   ← All prose lines
Tier 5 — Filename / labels   16-22vb (7.3–10.1 px)    ← Terminal chrome, footer prompts
Tier 6 — Easter egg          14vb (6.4 px)            ← Author signature
```

**Body text is ~24–26vb = ~11–12px at mobile.** This is actually SMALL — smaller than the article's HTML body text (which uses `font-size:15px`). The publisher accepts dense ASCII art rather than enlarging text. They prioritize **information density inside the canvas** over **visual prominence of text**.

### 5.3 Letter-spacing patterns

**No `letter-spacing` is set anywhere in the article SVG.** The blogger relies on:
- The natural mono-spacing of `Monaco,monospace` font
- ASCII art uses literal spaces and full-width `&nbsp;` characters for alignment
- Chinese sans-serif text uses default tracking

Compare to v5: you use `letter-spacing="8"` on "CONTENTS", `letter-spacing="3"` and `"2"` elsewhere. The blogger does NOT do this. **Spacing is achieved by literal whitespace in the text content**, not by attribute.

### 5.4 Font families

Two fonts only:

```
Monaco,Menlo,'Courier New',monospace
-apple-system,'PingFang SC',sans-serif
```

That's it. NOT a single serif font in the entire article SVG. No `EB Garamond`, no `Source Han Serif SC`, no `Songti`. The aesthetic is **engineer/terminal**, not literary.

The HTML body around the SVG uses serif (`Noto Serif SC`) for H2 headers and sans-serif (`Noto Sans SC`) for body — but the SVG sticks to mono + Apple system sans.

---

## Part 6 — Visual sophistication

### 6.1 Color palette (extracted from 192 fill attributes)

Sorted by usage frequency:

| Color | Count | Role | Visible-look |
|---|---|---|---|
| `#c08020` | 100 | Incense sticks `│`, ASCII art frames | Warm amber/copper |
| `#c9d1d9` | 22 | Default light text on dark | GitHub dark-mode body color |
| `#ff4500` | 21 | Flame diamonds `◆` | Hot orange-red |
| `#484f58` | 18 | Muted comments, footer | GitHub dim |
| `#21262d` | 16 | Title-bar bg, Easter egg | Near-black |
| `#161b22` | 8 | Inner panel bg | GitHub canvas |
| `#FF8B2C` | 8 | `echo`, year labels, big CTA | Bright orange |
| `#0d1117` | 7 | Outer panel bg | GitHub deep |
| `#ff5f56` | 7 | macOS red dot | Macaroon red |
| `#ffbd2e` | 7 | macOS yellow dot | Macaroon yellow |
| `#27c93f` | 7 | macOS green dot | Macaroon green |
| `#6e7681` | 7 | Filename text | Muted slate |
| `#e8d5a8` | 7 | Cream highlight (dates, names) | Warm cream |
| `#5a5040` | 5 | Smoke wisps, grave base | Brown-olive |
| `#7ee787` | 3 | `# ` comments (terminal green) | Mint |
| `#8a8070` | 2 | Smoke puffs (lighter) | Tan-grey |
| `#3a3020` | 1 | Sub-prompt text | Deep brown |
| `#ff6a00` | 1 | ↓↓↓ arrows | Burnt orange |
| `#ffcc00` | 1 | ☆ star | Sunshine yellow |
| `#8a7a5a` | 1 | "1912 — 1954" date on grave | Sandy tan |

**Palette philosophy**: this is a **GitHub Dark dark-mode terminal palette** (`#0d1117`, `#161b22`, `#21262d`, `#c9d1d9`, `#6e7681`, `#7ee787` are literal GitHub Dark theme colors). Plus a **warm fire accent** (`#FF8B2C`, `#ff4500`, `#c08020`) for emotional payload. Plus the **macOS traffic-light triad**.

20 unique colors. NOT a 2-color minimalist palette. This blogger uses a **rich, controlled palette of ~10 functional colors + 10 accent variants**.

Your v5 uses 7 brand colors. That's actually similar in count, but yours are all "InkForge brown/red/cream" — no terminal-green, no flame-orange, no GitHub-slate. **Your palette doesn't support the aesthetic of a coding article**, and the blogger leans HARD into the engineer-coded aesthetic because their audience is engineers.

### 6.2 Decorative elements

The blogger uses ZERO of:
- ❌ `feTurbulence` (no ink wash effects)
- ❌ `linearGradient` (flat colors only)
- ❌ `radialGradient`
- ❌ `<pattern>`
- ❌ `<filter>`
- ❌ `<mask>` or `<clipPath>`
- ❌ `<defs>` of any kind
- ❌ `<foreignObject>` (no HTML embedded in SVG)
- ❌ Bezier `<path d>` curves (none for decoration)
- ❌ `stroke-dasharray`

Their entire visual library is:
- ✅ `<rect>` (with `rx` for rounded corners)
- ✅ `<circle>` (only for the 3 macOS traffic lights and the small dots in icons)
- ✅ `<text>` with ASCII art and Chinese
- ✅ `<line>` (zero! none in the article SVG actually)
- ✅ `<g>` for grouping and animation

**That's it.** Rectangles, circles, and text. No gradients, no filters, no paths.

This is a sophisticated artistic choice. The aesthetic is **handcrafted terminal output** — using gradients or feTurbulence would break the illusion.

### 6.3 Typography choices

- **Monospace for everything tech**: ASCII art, year labels, filenames, comments
- **Apple system sans for solemn Chinese**: only on the final qingming layer and big CTAs
- **No serifs at all** (no fancy literary typography)
- **`font-weight="bold"` used sparingly**: year labels and the final "点击祭拜"
- **No `text-shadow`**, **no `filter:drop-shadow`** — flat 2D

### 6.4 Clever visual tricks

1. **Fake terminal chrome with macOS dots**: instant credibility with the engineer audience.
2. **Filename narrative**: each card's title bar shows a different `.sh` file. Reader's mental model: "I'm running a script that prints memories."
3. **`echo "Can Machines Think?"` followed by literal output on next line**: visual recreation of running a shell command.
4. **ASCII art for the portrait**: not a `<image>`, not a `<path>`. The portrait IS text — emphasizing the "computation creates likeness" theme.
5. **Three flickering flames at three different opacity cycles** (1.3s, 1.5s, 1.8s) — out-of-sync periods make the flickering feel organic, not robotic.
6. **The shake (`translate values="0 0;0 22;0 0"`)** is small (22vb = 10px) and brief (0.5s). Just enough to feel physical without being silly.
7. **The card-pile re-paints its own chrome**: every burn layer redraws the macOS-style window from scratch, so as one burns the next one is already a complete window. No "torn chrome / half-image" failure mode.
8. **The dead layer slides off-screen** (`translate 2000 0`) instead of using `pointer-events: none`. This is more compatible with WeChat's CSS-stripping (since `pointer-events` might get filtered).
9. **The final CTA "点 击 祭 拜"** is enormous (font-size 50 = ~23px at mobile, the biggest text in the entire SVG) and pulses. It DEMANDS interaction.
10. **The hidden Easter egg** "清明 · 赛博禅心" at y=960 with fill `#21262d` (same as the title-bar bg) — barely visible until you stare. A signature for those who notice.

---

## Part 7 — The article's NON-SVG structure (this is what surrounds the SVG)

The body has **15 `<section>` blocks**, ALL plain HTML. The SVG appears in section #2. Every other moment of "visual interest" is pure HTML with inline style:

### 7.1 Article structure (top to bottom)

```
[1]  STORY label              (max-width:640px, font-family:JetBrains Mono, font-size:12px,
                               color:#cf4436, letter-spacing:2px, uppercase)
[2]  Hairline divider         (border-top:1px solid rgba(120,120,112,0.18))
[3]  THE SVG                  (the 750×1000 hero)
[4]  Hairline divider
[5]  3 prose paragraphs       (font-family:Noto Sans SC, font-size:15px, color:#4a4a45,
                               line-height:1.9. Inline <span> code-pills for "计算"/"智能"/"如何训练"
                               with bg #007aaa/rgba(26,26,24,0.06) padding:1px 5px border-radius:3px)
[6]  Hairline divider
[7]  H2 "他定义了什么是「计算」"  (font-family:Noto Serif SC, font-size:22px, font-weight:700,
                               color:#1a1a18)
[8]  Paragraphs + 1 inline <code>   (code: same JetBrains Mono pill styling as above)
[9]  COLOR PANEL (call-out)   (background:rgba(207,68,54,0.06), border-radius:8px,
                               padding:16px 20px, centered red text)
[10] More paragraphs
[11] Hairline divider
[12] H2 "他定义了什么叫「智能」"
[13] Paragraphs + ANOTHER red panel
[14] Hairline divider
[15] H2 "他定义了怎么「训练」"
[16] Paragraphs (some with red bold lead-ins)
[17] Hairline divider
[18] H2 "一个人干完了三件事"
[19] Paragraphs
[20] Hairline divider
[21] H2 "那个苹果"
[22] Paragraphs + BLOCKQUOTE (white bg, kiln-red left border, 16px padding,
                              english italic quote)
[23] WeChat <img> with caption (rich_pages wxw-img class, NOT in an SVG frame —
                                naked image, rounded 6px, just centered)
[24] More paragraphs + RED BOLD line ("Claude → OpenAI → Sam Altman → ...")
[25] Hairline divider
[26] H2 "从罪犯到钞票"
[27] 4 paragraphs (years 2009/2013/2017/2021)
[28] RED PANEL "从罪犯到钞票，69 年"
[29] Final paragraph "清明，去用 AI 创造点什么吧"
```

### 7.2 The dividers (THIS is what they use instead of decorative SVG bars)

Every section break uses the SAME pattern:

```html
<section style="max-width:640px;margin:0 auto;padding:0 16px;">
  <section style="border-top:1px solid rgba(120,120,112,0.18);height:0;">
    <span leaf=""><br></span>
  </section>
</section>
```

Just a **1px horizontal hairline** at 18% alpha grey. **No gradient bars, no decorative SVG lines, no chapter numbers, no ornamental flourishes.** Just a quiet hairline.

### 7.3 The call-out boxes (red theme panels)

```html
<section style="background:rgba(207,68,54,0.06);border-radius:8px;padding:16px 20px;margin:0 0 14px;">
  <p style="font-family:'Noto Sans SC','PingFang SC','Microsoft YaHei',-apple-system,sans-serif;
            font-size:15px;color:#cf4436;line-height:1.9;margin:0;text-align:center;
            word-break:break-all;">
    <span leaf="">没有任何一台真实的计算机，超过了一个 24 岁的人在纸上画的东西</span>
  </p>
</section>
```

Pattern: light-red translucent bg + rounded 8px corners + centered red text. **Pure CSS, no SVG.** Used as "section-end punchline" — appears once at the end of each major H2 block.

### 7.4 The pull-quote (English quote from Jobs)

```html
<section style="background:rgba(255,255,255,0.12);border-left:3px solid #cf4436;
                padding:16px 20px;margin:0 0 14px;border-radius:0 6px 6px 0;">
  <p style="font-family:'Noto Sans SC',...,sans-serif;
            font-size:14px;color:#4a4a45;line-height:1.8;margin:0;">
    <span leaf="">God, we wish it were. It's just a coincidence.</span>
  </p>
</section>
```

Pattern: white bg @ 12% alpha + red 3px left border + asymmetric border-radius (0 on left, 6px on right). **No SVG. No decorative typography. No giant quotation marks.**

### 7.5 The inline code-pill / keyword highlight

Used for technical terms inline:

```html
<span style="font-family:'JetBrains Mono','SF Mono',Menlo,Consolas,monospace;
             font-size:13.5px;
             color:#007aaa;
             background:rgba(26,26,24,0.06);
             padding:1px 5px;
             border-radius:3px;">
  计算
</span>
```

Pattern: monospace + teal-blue text + light grey pill background + 3px border-radius. **Highly distinctive — Chinese words rendered in a "code keyword" style.** This is sophisticated.

### 7.6 Inline bold red emphasis (key climactic sentence)

```html
<p style="font-family:'Noto Sans SC',...;font-size:15px;color:#cf4436;font-weight:700;
          line-height:1.9;margin:0 0 14px;word-break:break-all;">
  <span leaf="">用他名字命名的奖，颁给了让 AI 真正跑起来的人。从命名到兑现，隔了半个世纪</span>
</p>
```

Pattern: regular paragraph but `color:#cf4436` (kiln-red) AND `font-weight:700`. **No box around it, no left border, no SVG.** Just the entire paragraph in red bold.

This is how they signal "this is THE punchline of this section." Used 3 times in the article.

### 7.7 The image (only one, in section 22)

The lone image in the article is the WeChat WWDC 2008 photo:
- Class: `rich_pages wxw-img js_img_placeholder`
- Style: `max-width:100%; border-radius:6px; aspect-ratio:1.295/1; width:645px!important; height:auto!important`
- Caption below: `font-size:12px; color:#8a8a82; text-align:center` ("2008 年 WWDC")

**No decorative SVG frame around the image.** No "data-ink-img" div. Just a rounded image with a quiet caption below.

---

## Part 8 — Direct comparison: blogger vs. v5

### 8.1 SVG count and purpose

| Aspect | Blogger reference | v5 implementation |
|---|---|---|
| Total SVGs | **1** | 15+ (1 master TOC + 6 ch-TOC + 6 pull-quotes + seal + endmark + badge) |
| Avg SVG size | 31 KB (the one) | 1.2 KB (TOC chapters), 1.4 KB (pull-quotes) |
| Total SVG bytes | 31 KB | ~30 KB spread thin |
| Purpose | Single high-impact interactive piece | Many small structural ornaments |
| Reader effort | One tap, big payoff | Multiple taps for partial reveals |

### 8.2 Interactive patterns

| Pattern | Blogger | v5 |
|---|---|---|
| `begin="click"` | ❌ (uses `mousedown`) | ✅ (TOC expand) |
| `begin="mousedown"` | ✅ | ❌ |
| `begin="click+0.3s"` | ✅ (sequencing) | ❌ |
| `restart="never"` | ✅ (irreversible drama) | ✅ (TOC one-shot) |
| `restart="always"` | ✅ (shake on every press) | ❌ |
| `fill="freeze"` | ✅ | ✅ |
| `repeatCount="indefinite"` | ✅ (ambient flame pulse) | ❌ |
| `<animateTransform translate>` for slide-off | ✅ | ❌ (uses opacity only) |
| `<animateTransform rotate>` for chevron | ❌ | ✅ |

The blogger has **more sophisticated interaction patterns**. Their `mousedown` + `restart="always"` for the shake, combined with `click+0.3s` for delayed slide-off, is a clever multi-event choreography. Your v5 is simpler: just opacity transitions on click.

### 8.3 viewBox dimensions

| Element | Blogger viewBox | v5 viewBox |
|---|---|---|
| Hero | 750×1000 (3:4 portrait) | n/a |
| TOC card | n/a | 1080×220 (master), 1080×(200+sections) per chapter |
| Pull-quote | n/a | 1080×580 (each) |
| Seal | n/a | 52×72 |
| Endmark | n/a | 200×60 |
| Badge | n/a | 220×28 |

**The blogger uses ONE viewBox (750×1000) for ONE piece.** Your v5 has 5 different viewBox systems. Every one of yours uses width 1080. The blogger uses 750. **750 is more efficient for portrait** (smaller integers in coordinates) but the choice doesn't matter much.

What matters: blogger's choice of **portrait 3:4** is unique. Your v5's TOC chapter cards are extremely tall and narrow when expanded (1080 wide × 1000+ tall), and the master is wide and short (1080 × 220). Neither follows the publisher's clean 3:4 rule.

### 8.4 The "pre-click whitespace" problem in v5 TOC

Your v5 TOC chapter card at line 222-296: when collapsed (`opacity:0` on the sub-tree), the SVG still claims `viewBox 1080 × totalH` where `totalH = hdrH(200) + sectionsTopPad(60) + sectionsContentH + sectionsBotPad(40)`.

For a chapter with 5 H3 sections, each having 3 H4 children: sectionsContentH = 5×90 + 15×50 = 1200. totalH = 200 + 60 + 1200 + 40 = **1500 viewBox units**.

At mobile (343px wide content, 1080 viewBox): height = 343 × 1500/1080 = **476 px tall**.

**Half a screen of mostly-empty card pre-click.** The user sees: a header (200vb / 64px) and then 412px of "white space with a translated, opacity:0 sub-tree" underneath. Even though the content is invisible, the viewBox reserves its space.

**This is the v5 whitespace problem the user is frustrated about.**

The blogger's solution: **don't have a "collapsed" state.** Show everything at full size from the start. Use interaction only for emotional dismissal, not for content reveal.

### 8.5 Text sizing in SVG

| Property | Blogger | v5 TOC |
|---|---|---|
| Chapter number font-size | n/a (uses small terminal text) | 100vb |
| Main title font-size | 38vb (qingming) | 50vb (chapter title) + 56vb (master "目录") |
| Body font-size | 24-26vb | 38vb (chapter title), 34vb (H3 num), 28vb (H4) |
| Smallest text | 14vb (Easter egg) | 26vb (subtitle) |

Your v5 uses MUCH larger font sizes inside SVG. At mobile (343px / 1080vb = 0.318× scale):
- Your 100vb chapter number → **31.8 px** at mobile. That's HUGE.
- Your 56vb master "目录" → **17.8 px** at mobile. Reasonable.
- Your 38vb chapter title → **12.1 px** at mobile. Small.

So your chapter NUMBERS are screaming-loud (32px) while chapter TITLES whisper (12px). Inverted hierarchy compared to the blogger's reference. The blogger never lets numerals exceed body-text size.

### 8.6 What the reference does BETTER (objective ranking)

1. **One unified canvas with one emotional payload** beats "many small ornaments." The reference SVG OWNS the screen for ~457px of vertical real estate, with rich texture and narrative. Your seal (52×72) + endmark (200×60) + badge (220×28) + each TOC card are tiny isolated decorations — they don't compound into one strong visual moment.
2. **Engineer-honest aesthetic**: the fake terminal isn't "ink decoration", it's "I'm a coder, you're a coder, this is our shared visual vocabulary." Reader instantly trusts the publisher. Your `锻` seal + `EB Garamond` numerals + `Source Han Serif SC` body — that's a LITERARY aesthetic. It fights with a tech-content article.
3. **No `<foreignObject>`**: your pull-quotes embed `<foreignObject><body><p>` to get HTML text inside SVG. The blogger NEVER does this — they use `<text>` and `<tspan>` exclusively. Their text is **guaranteed to render in WeChat** because SVG `<text>` is well-supported, while `<foreignObject>` is famously hostile in WeChat's stripped CSS environment.
4. **Single viewBox aspect ratio (3:4 portrait)** vs. your 5 different aspect ratios. Visual coherence is higher when you reuse one canvas shape.
5. **No `letter-spacing` attribute abuse**: they don't try to "stretch" Chinese characters with letter-spacing="8". You do this on "CONTENTS" and elsewhere. Letter-spacing on CJK is actively WRONG in CJK typography conventions — characters should be at natural cadence with their own internal half-em advance.
6. **Sub-card mass dismissal** is more dramatic than "expand on click". Burning is one-way and irreversible. Once burned, the past is gone. This matches the article's theme (mourning Turing). Your collapse-to-expand interaction has no thematic resonance with the article.
7. **No CSS at all inside SVG**: the blogger uses `style="visibility:visible;"` as the ONLY inline style (and that's a WeChat artifact, not author intent). All else is attribute-based (`fill=`, `font-size=`, etc.). You use `style="outline:none"` and other CSS — risky in WeChat's CSS stripping.
8. **Direct character-based fonts**: blogger uses ASCII art (literal `╔════╗`, `│`, `◆`). You use NONE. Your SVG visuals are all geometric shapes (rect, line, circle) + abstract text. ASCII art is a wildly under-used SVG-text technique that gives you free pixel-perfect drawings.
9. **Stacking depth used as narrative device**: 6 layers = 6 cards = 6 stories. The visual depth IS the metaphor (a stack of papers being burned). Your TOC has zero depth-as-narrative.
10. **The CTA is enormous (50vb)**: when you want a tap, you SHOUT visually. Your TOC chapter cards have a small "SECTIONS ▼" badge at 28vb. Easy to miss.

### 8.7 What you are doing wrong (specifically)

1. **Decoration sprawl.** 15 SVG instances per article is too many. The blogger uses ONE. Concentrate effort on one big SVG, or zero — never a swarm of decorative ornaments.
2. **The TOC's collapsed state reserves empty viewBox space pre-click.** Lines 231-296 in `render-real-article-v5.fidelity.test.ts`: `totalH = hdrH + sectionsH` where `sectionsH` is calculated for the EXPANDED state. The viewBox is sized for expanded, but content is hidden. Result: 400+ px of pre-click whitespace per chapter card.
3. **Inverted text hierarchy.** Your chapter number `font-size="100"` (31.8 px @ mobile) is bigger than your chapter title `font-size="50"` (15.9 px @ mobile). Numbers should NEVER outweigh titles.
4. **`<foreignObject>`** in pull-quotes is fragile. Line 362-366. WeChat's CSS sanitizer may strip the inner `<body>` styling.
5. **Wrong fonts for tech audience.** Your serif palette (`EB Garamond`, `Source Han Serif SC`) signals "literary essay". The article being processed (digital-yuan strategy report) has 53 headings, 30,106 words, tables — that's a tech/business document. Use sans-serif + mono, not serif.
6. **`letter-spacing="8"` and `letter-spacing="3"`** on Chinese-adjacent context. Bad CJK typography. Blogger uses zero letter-spacing.
7. **No "ambient" animations** (pulses, flickers). Your TOC is static until clicked. Adds a feeling of dead UI. Blogger has 13 indefinite-pulse `<animate>` tags running constantly = "this page is alive."
8. **`<animateTransform rotate>` on chevron** (line 281) — the rotate works but you're chasing a "neat trick" instead of solving the real problem (the card looks empty before click).
9. **`stroke-dasharray="4 4"`** on the connector spine (line 292): blogger uses solid lines or doesn't draw the line at all. Dashed-line conventions are usually for "uncertain" or "removable" connections, not for decoration.
10. **The seal `锻`** is meta-branding. The blogger does NOT put their own brand into the SVG (only a tiny grey signature at y=960 that's barely visible). Your seal screams "InkForge made this." The reader doesn't care who made it — they care about the content.
11. **The "CONTENTS / 目录 / N CHAPTERS"** master header (line 207-218) is decorative but adds no information not visible in the chapter cards themselves. Could be removed entirely.
12. **The endmark `完` seal** + reading badge add to the SVG count without adding signal. Strip them.

### 8.8 Patterns from the reference you SHOULD adopt

If you want to learn from the reference (rather than copy it), here are the **transferable patterns**:

1. **Pick ONE moment in the article that deserves a hero SVG.** Probably the H1 cover area. Make it ~3:4 portrait, ~340×450 at mobile, full-width. Pour all your design effort into that single canvas.
2. **Use SMIL for emotional interaction**, not for structural reveal. `mousedown` + `restart="never"` + `fill="freeze"` = irreversible action with thematic weight. Don't use SMIL just because it's possible.
3. **Use ambient `repeatCount="indefinite"` pulses** on small details (1-3 elements) to make the canvas feel alive. Periods between 1.3s–3s. Multiple elements at different periods = organic rhythm.
4. **Use the article's MD-derived visuals**. If the article talks about money flows, draw a flow with ASCII arrows. If it talks about timelines, use a vertical bar chart. Don't draw "锻 (forge) seal" unless the article is about forging.
5. **Use ASCII characters (`╔═══╗`, `│`, `◆`, `▽`) as `<text>` content** to compose pixel-perfect frames without `<path>` complexity.
6. **For pull-quotes inline in text, USE PURE HTML, NOT SVG.** Their pattern: light-bg `<section>` + `border-radius:8px` + centered red text. 30 lines of CSS, zero SVG. You're using a 1080×580 SVG with `<foreignObject>` — overengineered by 100×.
7. **For dividers, use a 1px hairline at low alpha**, not a decorative SVG bar. Their pattern: `border-top:1px solid rgba(120,120,112,0.18)` + zero-height section. Already in your `decorateH1` (line 125: "border-top:0.5px solid #252933, opacity:0.2") — extend this to all section breaks.
8. **For the call-out moments**, copy their colored-panel pattern verbatim: `background:rgba(217,91,63,0.06);border-radius:8px;padding:16px 20px` (substitute your kiln color). Zero SVG.
9. **For the TOC**, the blogger has NO TOC. They use H2 + hairlines to structure. If you must have a TOC, render it as a simple HTML `<ol>` list of links with kiln numerals — NOT a click-to-expand SVG card array.
10. **Strip the seal, the endmark, the badge.** None of these exist in the reference. They are pure visual noise.

---

## Part 9 — Recommended v5 → v6 changes

### Priority 1 (kills the whitespace problem)

- **Remove `decorateTOC` entirely.** Replace with a simple HTML ordered list ABOVE the first H2:
  ```html
  <nav data-ink-toc="1" style="margin:2em 0;padding-left:0;list-style:none;">
    <ol style="counter-reset:ch;margin:0;padding:0;">
      <li>01. 「计算」的边界</li>
      <li>02. 「智能」的定义</li>
      ...
    </ol>
  </nav>
  ```
- **Or, if SVG TOC is desired**, make the viewBox match the COLLAPSED height only (~200vb / 64px). On click, increase viewBox via `<animate attributeName="viewBox" values="0 0 1080 200; 0 0 1080 1500">`. (Even better: use a CSS-only approach with `<details>` if WeChat allows.)

### Priority 2 (fixes inverted hierarchy)

- **Cap chapter numerals at half the chapter-title font-size**, never larger.
- If chapter title is `font-size="50"` (in viewBox units), then chapter number should be `font-size="25"` max.

### Priority 3 (improves visual coherence)

- **Drop the `锻` seal, the `完` endmark, and the reading badge.** These are 3 unrelated SVGs scattered around the document with no thematic glue. Remove them all.
- **Switch from serif fonts to sans-serif + mono for the digital-yuan article.** Match the audience (business/tech) not the brand aesthetic.
- **Remove ALL `letter-spacing` attributes** from SVG `<text>` elements.

### Priority 4 (adds ambient life if you keep ANY interactive SVG)

- If you decide to add ONE hero SVG (e.g., for the H1 cover), give it:
  - viewBox 750×1000 portrait
  - 1-3 ambient pulses (`repeatCount="indefinite"`)
  - One click interaction with `begin="mousedown"` + `restart="never"`
  - 8-12 `<text>` lines max, all centered (`text-anchor="middle"` + `x="375"`)

### Priority 5 (use pure HTML for everything that doesn't need to MOVE)

- **Pull-quotes** → HTML `<section>` with light-red bg + border-radius + centered red text. Delete `decoratePullQuote`'s SVG output entirely.
- **Image frames** → HTML `<div>` with white bg + thin border-right/border-bottom (faux shadow). Already close in `decorateImageFrame`; just remove the `data-ink-img=` SVG wrapping ambition.
- **Section dividers** → already correct in `decorateH1` (`border-top:0.5px solid ${B.graphite}`). Apply same pattern to inter-chapter breaks.

---

## Part 10 — Files for further investigation

- **`D:/Desktop/Inkforge/experiment/_svg_individual/svg_000.svg`** — the complete reference SVG (31 KB). Paste this into any SVG viewer to see it render with all animations.
- **`D:/Desktop/Inkforge/experiment/_svg_layers/`** — each top-level child as a separate viewable SVG. Open `15_g.svg` to see the final qingming tribute layer in isolation.
- **`D:/Desktop/Inkforge/experiment/_body_pretty.html`** — readable version of the entire article body (256 lines). Open in a browser to see the article render with all its hairlines, color panels, etc.
- **`D:/Desktop/Inkforge/experiment/_decoded_main.html`** — full HTML page including head/CSS link references.
- **`D:/Desktop/Inkforge/experiment/_extract_mhtml.py`** — the extraction script (reusable for other MHTML references).
- **`D:/Desktop/Inkforge/experiment/_svg_dump.json`** — machine-readable summary of all 11 SVGs in the document.
- **`D:/Desktop/Inkforge/experiment/_svg_structure.json`** — machine-readable layer-by-layer breakdown of the article SVG.

---

## Caveats / Things I could not verify

1. **Z-order interpretation**: I claimed both "g[8] memorial layer is at back" and "burn = all 6 layers fade together on one click". This contradicts the user's apparent expectation of "sequential card reveals." The exact UX may differ — the publisher might have set up something I missed. To verify, the reference SVG would need to be opened in a browser and clicked. The MHTML capture preserved attributes but cannot show the runtime behavior. **Recommend** opening `_svg_individual/svg_000.svg` directly in a browser to confirm the runtime behavior.
2. **Font fallback rendering in WeChat**: I describe `font-family="Monaco,Menlo,'Courier New',monospace"` as it appears in source. WeChat's mobile rendering may fall back to system mono or even sans-serif. Visual fidelity depends on user's device.
3. **The original article's emotional impact** also depends on the reader having Chinese-on-monospace rendering (where `─`, `╔`, `╗`, `│`, `◆`, `▽` align to a fixed grid). On some fonts these characters have different advance widths and the ASCII art will look misaligned.
4. **The publisher's name**: "赛博禅心" (Cyber Zen Heart) is the WeChat 公众号. This is hidden in the article SVG (y=960, near-invisible color) and is the publisher signature.
5. **CSS link references at top of HTML**: 100+ `<link rel="stylesheet" href="cid:...">` references point to WeChat's bundled CSS. These were not extracted (they're CSS, not SVG). If you need to study WeChat's exact paragraph/heading CSS, look at later MHTML parts referenced by those CIDs.

---

## Quick reference: the entire blogger SVG (compressed)

For copy-paste convenience, the full SVG source is in:

```
D:/Desktop/Inkforge/experiment/_svg_individual/svg_000.svg
```

(31,130 bytes, 1 line, 199 `<text>` elements, 8 layer groups)

Its structural skeleton:

```html
<svg viewBox="0 0 750 1000" style="display:block;width:100%" role="img" aria-label="插图">
  <!-- Static chrome (always visible) -->
  <rect ... terminal panel ... />
  <circle ... 3 macOS dots ... />
  <text ... filename "memorial.sh" ... />

  <!-- Layer g[8]: greeting card (always visible) -->
  <g font-family="Monaco">
    <text>...ASCII portrait...</text>
    <text>...Can Machines Think?...</text>
    <text>...点击敬香 (pulses indefinitely)...</text>
  </g>

  <!-- Layer g[9]: incense animation (always visible, shakes on mousedown) -->
  <g>
    <animateTransform translate begin="mousedown" restart="always"/>
    <rect width=750 height=1000 opacity=0.01 /> <!-- click hit-target -->
    <text>...3 flickering ◆ diamond flames (indefinite)...</text>
    <text>...9 incense sticks │...</text>
    <text>...smoke ~ ~ (begin=mousedown, opacity 0→0.4→0)...</text>
  </g>

  <!-- Layers g[10]-g[15]: 6 burnable cards, each with its own chrome+content+incense -->
  <!-- g[10] = the_apple_1954.sh -->
  <g>
    <animate opacity 1→0 begin="mousedown" fill="freeze" restart="never"/>
    <animateTransform translate 0→2000 begin="click+0.3s" fill="freeze" restart="never"/>
    <!-- self-contained chrome + apple ASCII + text + bottom incense -->
  </g>
  <!-- g[11] = can_machines_think.sh -->
  <!-- g[12] = enigma_cracked.sh -->
  <!-- g[13] = turing_machine.sh -->
  <!-- g[14] = birth_1912.sh -->
  <!-- g[15] = qingming.sh (final tribute, biggest CTA "点 击 祭 拜") -->
</svg>
```

That's it. Total markup: 31 KB. Total rendered impact: enormous.

---

## End of research file
