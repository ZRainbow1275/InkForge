//! InkForge Tauri 后端入口
//!
//! 提供以下功能：
//! - Ollama API 代理（解决 CORS 问题）
//! - 文件系统操作
//! - 系统剪贴板访问
//! - Splash window + IPC handshake (`app_ready`) with 3s fallback timeout

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod splash;

use std::time::Duration;

use commands::app_ready::SplashReadySignal;
use commands::{app_ready, desktop, ollama, secure_store, wechat, window};
use tauri::Manager;

const SPLASH_FALLBACK_TIMEOUT: Duration = Duration::from_secs(3);

fn main() {
    tauri::Builder::default()
        .manage(SplashReadySignal::new())
        .setup(|app| {
            // Detect system theme and inject it into the splash DOM before the
            // seal animation begins. Defaults to "light" if detection fails so
            // we never block the user behind an undefined state.
            let theme = match dark_light::detect() {
                dark_light::Mode::Dark => "dark",
                _ => "light",
            };
            splash::inject_splash_theme(&app.handle(), theme);

            // Spawn the 3s fallback timeout. The task is cancelled cheaply via
            // `Notify::notify_waiters()` from the `app_ready` command. If the
            // frontend never signals readiness (panic, hang, infinite loop),
            // the timeout fires and the user still gets a usable main window.
            let signal_state = app.state::<SplashReadySignal>();
            let notify = signal_state.handle();
            let handle = app.handle();
            tauri::async_runtime::spawn(async move {
                tokio::select! {
                    _ = notify.notified() => {
                        // Frontend signalled ready first; nothing to do.
                    }
                    _ = tokio::time::sleep(SPLASH_FALLBACK_TIMEOUT) => {
                        splash::close_splash_and_show_main(&handle);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            desktop::get_desktop_runtime_info,
            desktop::reveal_in_explorer,
            desktop::write_local_delivery_bundle,
            window::list_open_windows,
            window::focus_window,
            window::close_window,
            window::create_new_window,
            window::create_inspector_widget,
            ollama::check_ollama_status,
            ollama::ollama_generate,
            ollama::ollama_generate_stream,
            wechat::wechat_publish_status,
            wechat::wechat_upload_article_image,
            wechat::wechat_upload_cover_image,
            wechat::wechat_create_draft,
            wechat::wechat_draft_live_round_trip,
            app_ready::app_ready,
            secure_store::store_key,
            secure_store::get_key,
            secure_store::delete_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
