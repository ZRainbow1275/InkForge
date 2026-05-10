//! InkForge Tauri 后端入口
//!
//! 提供以下功能：
//! - Ollama API 代理（解决 CORS 问题）
//! - 文件系统操作
//! - 系统剪贴板访问

#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;

use commands::{desktop, ollama, window};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            desktop::get_desktop_runtime_info,
            desktop::reveal_in_explorer,
            window::list_open_windows,
            window::focus_window,
            window::close_window,
            window::create_new_window,
            ollama::check_ollama_status,
            ollama::ollama_generate,
            ollama::ollama_generate_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
