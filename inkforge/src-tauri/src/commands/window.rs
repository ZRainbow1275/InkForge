//! Native window commands for the Tauri desktop baseline.

use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};

#[derive(Debug, Serialize)]
pub struct DesktopWindowInfo {
    label: String,
    title: Option<String>,
}

#[tauri::command]
pub async fn list_open_windows(app: AppHandle) -> Result<Vec<DesktopWindowInfo>, String> {
    let mut windows = Vec::new();

    for (label, window) in app.windows() {
        windows.push(DesktopWindowInfo {
            label,
            title: window.title().ok(),
        });
    }

    windows.sort_by(|left, right| left.label.cmp(&right.label));
    Ok(windows)
}

#[tauri::command]
pub async fn focus_window(app: AppHandle, window_id: String) -> Result<(), String> {
    let trimmed = window_id.trim();
    if trimmed.is_empty() {
        return Err("windowId is required".to_string());
    }

    let window = app
        .get_window(trimmed)
        .ok_or_else(|| format!("window not found: {}", trimmed))?;

    window.unminimize().map_err(|error| error.to_string())?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn close_window(app: AppHandle, window_id: String) -> Result<(), String> {
    let trimmed = window_id.trim();
    if trimmed.is_empty() {
        return Err("windowId is required".to_string());
    }

    let window = app
        .get_window(trimmed)
        .ok_or_else(|| format!("window not found: {}", trimmed))?;

    window.close().map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn create_new_window(
    app: AppHandle,
    profile_id: String,
    article_id: Option<String>,
) -> Result<String, String> {
    let profile_id = profile_id.trim();
    if profile_id.is_empty() {
        return Err("profileId is required".to_string());
    }

    let label = format!("window-{}", unique_suffix());
    let mut url = format!("index.html?profileId={}", encode_query(profile_id));
    if let Some(article_id) = article_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        url.push_str("&articleId=");
        url.push_str(&encode_query(article_id));
    }

    WindowBuilder::new(&app, label.clone(), WindowUrl::App(url.into()))
        .title("InkForge")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .resizable(true)
        .build()
        .map_err(|error| error.to_string())?;

    Ok(label)
}

fn unique_suffix() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn encode_query(value: &str) -> String {
    let mut encoded = String::new();

    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => {
                encoded.push('%');
                encoded.push_str(&format!("{:02X}", byte));
            }
        }
    }

    encoded
}
