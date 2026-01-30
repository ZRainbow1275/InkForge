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

use commands::ollama;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ollama::check_ollama_status,
            ollama::ollama_generate,
            ollama::ollama_generate_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
