//! Splash window lifecycle helpers.
//!
//! The splash window is declared in `tauri.conf.json` and shown automatically
//! at startup. The main window is configured with `visible: false` so the user
//! never sees the default white flash. This module owns the two transitions:
//!
//! 1. Initial theme injection — the Rust setup hook detects the system theme
//!    via `dark-light` and asks the splash DOM to mirror it before the seal
//!    animation starts, so light/dark mode is consistent end-to-end.
//! 2. Tear-down — when the frontend signals `app_ready` (or the 3s timeout
//!    expires), the splash window is closed and the main window is shown.

use tauri::{AppHandle, Manager};

const SPLASH_LABEL: &str = "splash";
const MAIN_LABEL: &str = "main";

/// Inject `data-theme="dark"|"light"` on the splash document root so CSS
/// variables resolve correctly before any animation runs.
pub fn inject_splash_theme(app: &AppHandle, theme: &str) {
    let Some(splash) = app.get_window(SPLASH_LABEL) else {
        return;
    };

    let safe_theme = if theme == "dark" { "dark" } else { "light" };
    let script = format!(
        "document.documentElement.setAttribute('data-theme', '{}');",
        safe_theme
    );

    if let Err(error) = splash.eval(&script) {
        eprintln!("[splash] failed to inject theme: {error}");
    }
}

/// Close the splash window (if still present) and show the main window.
///
/// Safe to call multiple times — both branches no-op when their target has
/// already been transitioned.
pub fn close_splash_and_show_main(app: &AppHandle) {
    if let Some(splash) = app.get_window(SPLASH_LABEL) {
        if let Err(error) = splash.close() {
            eprintln!("[splash] failed to close splash window: {error}");
        }
    }

    if let Some(main) = app.get_window(MAIN_LABEL) {
        if let Err(error) = main.show() {
            eprintln!("[splash] failed to show main window: {error}");
        }
        if let Err(error) = main.set_focus() {
            eprintln!("[splash] failed to focus main window: {error}");
        }
    }
}
