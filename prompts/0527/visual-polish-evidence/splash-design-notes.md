# PR2 Evidence — Splash Window + IPC Handshake

> Date: 2026-05-27
> PR: PR2 of `.trellis/tasks/05-27-visual-polish-pass`
> Sub-agent: trellis-implement
> Status: code-complete, awaiting visual verification

---

## What this evidence shows

Static HTML preview of the splash window content. The seal-drop animation and
8-direction ink bleed are CSS-only, so opening either preview file in a modern
browser is sufficient to verify the visual identity end-to-end *minus* the
Rust-side IPC handshake (which requires `pnpm tauri dev`).

| File | What it shows |
|------|---------------|
| `splash-light-static.html` | Iframed light-mode preview, forces `data-theme="light"` |
| `splash-dark-static.html` | Iframed dark-mode preview, forces `data-theme="dark"` |

Canonical source is `inkforge/public/splash.html`. Both evidence files iframe
that path so any change to the splash is reflected without manual sync.

---

## Three animation phases

```
t = 0ms        SEAL drops (translateY -40px → 0, scale 0.92 → 1.0)
               easing: cubic-bezier(0.16, 1, 0.3, 1)

t = 300ms      SEAL squishes (scaleY 0.92 → 1.02 → 1.0)
               60ms rubber-stamp "盖印" moment

t = 240ms      WORDMARK rises (translateY 8px → 0, opacity 0 → 1, 500ms)

t = 360ms      INK BLEEDS in 8 directions
               opacity 0 → 0.35 → 0 over 440ms
               radial gradients from --ink-seal Kiln

t = 480ms      TAGLINE fades in (opacity 0 → 1, 400ms)

t ≈ 880ms      All animations settle
```

Reduced-motion path: all four animation states become `animation: none !important`,
opacity pinned at 1, transform reset to none, and the 8-bleed wrapper is
`display: none` (the bare dots have no meaning without motion).

---

## IPC handshake sequence

```
Rust (setup hook)                          Vue (App.vue)
─────────────────────                      ──────────────
1. dark_light::detect()
2. splash window auto-shown by tauri.conf  (splash.html paints)
3. inject_splash_theme()
   → splash.eval(`<html data-theme>`)
4. spawn cancellable 3s timeout
   ↓
   tokio::select! {
     _ = notify.notified() => no-op,
     _ = sleep(3s) => close_splash + show_main
   }

                                           5. Vue mounts
                                           6. await nextTick()
                                           7. notifyAppReady()
                                              → invoke('app_ready')

8. app_ready cmd handler:
   - notify.notify_waiters()  ← cancels timeout task
   - splash.close()
   - main.show() + set_focus()
```

If step 7 never fires (panic, hang), step 4's timer triggers the same
`close_splash + show_main` path at +3s, so the user is never stranded.

---

## Files touched by PR2

### Rust
- `inkforge/src-tauri/Cargo.toml` — added `dark-light = "1"`
- `inkforge/src-tauri/tauri.conf.json` — main `visible: false` + new `splash` window entry
- `inkforge/src-tauri/src/main.rs` — setup hook (theme detect + splash inject + 3s timeout task) + register `app_ready` handler
- `inkforge/src-tauri/src/splash.rs` — new (inject_splash_theme + close_splash_and_show_main)
- `inkforge/src-tauri/src/commands/mod.rs` — exposes `pub mod app_ready;`
- `inkforge/src-tauri/src/commands/app_ready.rs` — new (`#[tauri::command] app_ready` + `SplashReadySignal` Tauri state)

### Frontend
- `inkforge/public/splash.html` — new (CSS-only animated splash, 520×340)
- `inkforge/src/services/app-lifecycle/notifyAppReady.ts` — new (invoke wrapper, non-Tauri no-op)
- `inkforge/src/App.vue` — onMounted async + await nextTick + void notifyAppReady()

### Docs / evidence
- `docs/inkforge-brand-identity.md` — appended §10 Splash Screen 启动屏 (between §9 Logo and §11 Loading Placeholder which PR3 added in parallel)
- `prompts/0527/visual-polish-evidence/splash-light-static.html` — this evidence (light preview)
- `prompts/0527/visual-polish-evidence/splash-dark-static.html` — this evidence (dark preview)
- `prompts/0527/visual-polish-evidence/splash-design-notes.md` — this file

---

## Manual verification checklist

These need `pnpm tauri dev` and cannot be automated from the trellis sub-agent:

- [ ] Cold start: no white flash; splash appears in 0–100ms
- [ ] Seal drops + squishes + ink bleeds (light mode)
- [ ] Dark mode: same animation, Char bg + Kiln-lifted seal
- [ ] reduced-motion: static identity, no movement, 8-bleed hidden
- [ ] `notifyAppReady()` fires → splash closes → main shows in ≤ 800ms typical
- [ ] Force panic in `onMounted` → 3s timeout still recovers main window
- [ ] Reload main window with F5 → splash *not* re-shown (only main reloads; index.html inline loading from PR3 takes over)

---

## Quality gates run

See team-lead message for cargo check / clippy / fmt / typecheck / lint output.
