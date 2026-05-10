//! Desktop runtime commands.

use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;

use super::window::{list_open_windows, DesktopWindowInfo};

#[derive(Debug, Serialize)]
pub struct DesktopRuntimeInfo {
    #[serde(rename = "productName")]
    product_name: String,
    version: String,
    #[serde(rename = "targetOs")]
    target_os: String,
    #[serde(rename = "appDataDir")]
    app_data_dir: Option<String>,
    windows: Vec<DesktopWindowInfo>,
}

#[tauri::command]
pub async fn get_desktop_runtime_info(app: AppHandle) -> Result<DesktopRuntimeInfo, String> {
    let package_info = app.package_info();
    let app_data_dir = app
        .path_resolver()
        .app_data_dir()
        .map(|path| path.to_string_lossy().to_string());
    let windows = list_open_windows(app.clone()).await?;

    Ok(DesktopRuntimeInfo {
        product_name: package_info.name.clone(),
        version: package_info.version.to_string(),
        target_os: std::env::consts::OS.to_string(),
        app_data_dir,
        windows,
    })
}

#[tauri::command]
pub async fn reveal_in_explorer(path: String) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("path is required".to_string());
    }

    let target = PathBuf::from(trimmed);
    if !target.exists() {
        return Err(format!("path does not exist: {}", target.display()));
    }

    reveal_path(target)
}

#[cfg(target_os = "windows")]
fn reveal_path(path: PathBuf) -> Result<(), String> {
    let argument = if path.is_file() {
        format!("/select,{}", path.display())
    } else {
        path.to_string_lossy().to_string()
    };

    Command::new("explorer")
        .arg(argument)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
fn reveal_path(path: PathBuf) -> Result<(), String> {
    Command::new("open")
        .arg("-R")
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "linux")]
fn reveal_path(path: PathBuf) -> Result<(), String> {
    let directory = if path.is_dir() {
        path
    } else {
        path.parent()
            .map(PathBuf::from)
            .ok_or_else(|| "path has no parent directory".to_string())?
    };

    Command::new("xdg-open")
        .arg(directory)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}
