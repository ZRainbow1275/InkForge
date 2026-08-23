//! Native window commands for the Tauri desktop baseline.

use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};

const INSPECTOR_WIDGET_STATE_EVENT: &str = "inkforge://inspector-widget-state";

#[derive(Debug, Serialize)]
pub struct DesktopWindowInfo {
    label: String,
    title: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InspectorWidgetContext<'a> {
    surface_id: &'static str,
    article_id: &'a str,
    window_label: &'a str,
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum InspectorWidgetSurface {
    PlatformPreview,
    References,
    DocumentStatistics,
}

impl InspectorWidgetSurface {
    fn parse(value: &str) -> Result<Self, String> {
        match value {
            "platform-preview" => Ok(Self::PlatformPreview),
            "references" => Ok(Self::References),
            "document-statistics" => Ok(Self::DocumentStatistics),
            _ => Err(format!(
                "inspector widget surface is not allowed: {}",
                value
            )),
        }
    }

    fn id(self) -> &'static str {
        match self {
            Self::PlatformPreview => "platform-preview",
            Self::References => "references",
            Self::DocumentStatistics => "document-statistics",
        }
    }

    fn title(self) -> &'static str {
        match self {
            Self::PlatformPreview => "InkForge · 平台预览",
            Self::References => "InkForge · 引用链接",
            Self::DocumentStatistics => "InkForge · 文稿统计",
        }
    }
}

#[tauri::command]
pub async fn create_inspector_widget(
    app: AppHandle,
    surface_id: String,
    profile_id: String,
    article_id: String,
) -> Result<String, String> {
    let surface = InspectorWidgetSurface::parse(surface_id.trim())?;
    let profile_id = required_identity("profileId", &profile_id)?;
    let article_id = required_identity("articleId", &article_id)?;
    let label = inspector_widget_label(surface, profile_id);

    if let Some(window) = app.get_window(&label) {
        window.unminimize().map_err(|error| error.to_string())?;
        window.show().map_err(|error| error.to_string())?;
        window
            .emit(
                INSPECTOR_WIDGET_STATE_EVENT,
                InspectorWidgetContext {
                    surface_id: surface.id(),
                    article_id,
                    window_label: &label,
                },
            )
            .map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(label);
    }

    let url = format!(
        "index.html?inspectorWidget={}&profileId={}&articleId={}&windowLabel={}",
        surface.id(),
        encode_query(profile_id),
        encode_query(article_id),
        encode_query(&label),
    );

    WindowBuilder::new(&app, label.clone(), WindowUrl::App(url.into()))
        .title(surface.title())
        .inner_size(440.0, 560.0)
        .min_inner_size(320.0, 260.0)
        .resizable(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .center()
        .build()
        .map_err(|error| error.to_string())?;

    Ok(label)
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

fn required_identity<'a>(name: &str, value: &'a str) -> Result<&'a str, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(format!("{} is required", name));
    }
    if trimmed.len() > 256 {
        return Err(format!("{} is too long", name));
    }
    Ok(trimmed)
}

fn inspector_widget_label(surface: InspectorWidgetSurface, profile_id: &str) -> String {
    format!(
        "inspector-{}-{:016x}",
        surface.id(),
        stable_hash(profile_id.as_bytes()),
    )
}

fn stable_hash(bytes: &[u8]) -> u64 {
    bytes.iter().fold(0xcbf29ce484222325_u64, |hash, byte| {
        (hash ^ u64::from(*byte)).wrapping_mul(0x100000001b3)
    })
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

#[cfg(test)]
mod tests {
    use super::{
        encode_query, inspector_widget_label, required_identity, InspectorWidgetContext,
        InspectorWidgetSurface,
    };

    #[test]
    fn inspector_surface_is_whitelist_only() {
        assert_eq!(
            InspectorWidgetSurface::parse("references"),
            Ok(InspectorWidgetSurface::References)
        );
        assert!(InspectorWidgetSurface::parse("https://example.com").is_err());
        assert!(InspectorWidgetSurface::parse("<script>").is_err());
    }

    #[test]
    fn inspector_label_is_stable_and_tauri_safe() {
        let first = inspector_widget_label(InspectorWidgetSurface::PlatformPreview, "profile A/一");
        let second =
            inspector_widget_label(InspectorWidgetSurface::PlatformPreview, "profile A/一");
        assert_eq!(first, second);
        assert!(first.starts_with("inspector-platform-preview-"));
        assert!(first
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-'));
    }

    #[test]
    fn identity_and_query_boundaries_reject_or_encode_untrusted_values() {
        assert!(required_identity("articleId", " ").is_err());
        assert!(required_identity("articleId", &"x".repeat(257)).is_err());
        assert_eq!(
            encode_query("article?id=1&name=一"),
            "article%3Fid%3D1%26name%3D%E4%B8%80"
        );
    }

    #[test]
    fn inspector_reuse_context_matches_the_frontend_handshake_shape() {
        let value = serde_json::to_value(InspectorWidgetContext {
            surface_id: "references",
            article_id: "article-b",
            window_label: "inspector-references-1234",
        })
        .expect("inspector context should serialize");

        assert_eq!(
            value,
            serde_json::json!({
                "surfaceId": "references",
                "articleId": "article-b",
                "windowLabel": "inspector-references-1234",
            })
        );
    }
}
