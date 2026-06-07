//! WeChat Official Account publishing commands.
//!
//! Secrets stay inside Tauri. The renderer only sends image payloads and draft
//! metadata; app id / secret are loaded from process env or `inkforge/.env.local`.

use base64::Engine;
use reqwest::{multipart, redirect::Policy, Client, StatusCode, Url};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::net::IpAddr;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::command;

const WECHAT_API_BASE: &str = "https://api.weixin.qq.com/cgi-bin";
const WECHAT_IMAGE_HOSTS: [&str; 2] = ["mmbiz.qpic.cn", "mmbiz.qlogo.cn"];
const WECHAT_ARTICLE_IMAGE_MAX_BYTES: usize = 1024 * 1024;
const WECHAT_PERMANENT_IMAGE_MAX_BYTES: usize = 10 * 1024 * 1024;
const WECHAT_DRAFT_TITLE_MAX_CHARS: usize = 32;
const WECHAT_DRAFT_AUTHOR_MAX_CHARS: usize = 16;
const WECHAT_DRAFT_DIGEST_MAX_CHARS: usize = 128;
const WECHAT_ARTICLE_CONTENT_MAX_CHARS: usize = 20_000;
const WECHAT_ARTICLE_CONTENT_MAX_BYTES: usize = 1024 * 1024;
const WECHAT_DRAFT_CONTENT_SOURCE_URL_MAX_BYTES: usize = 1024;
const WECHAT_ACCESS_TOKEN_DEFAULT_EXPIRES_IN_SECS: u64 = 7_200;
const WECHAT_ACCESS_TOKEN_REFRESH_SKEW_SECS: u64 = 300;
const WECHAT_ACCESS_TOKEN_MIN_TTL_SECS: u64 = 1;
const WECHAT_ACCESS_TOKEN_ENDPOINT_ERRCODES: [i64; 3] = [40001, 40014, 42001];

static WECHAT_ACCESS_TOKEN_CACHE: OnceLock<Mutex<Option<AccessTokenCacheEntry>>> = OnceLock::new();

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CredentialSource {
    ProcessEnv,
    EnvLocal,
    Mixed,
    None,
}

impl CredentialSource {
    fn as_str(self) -> &'static str {
        match self {
            CredentialSource::ProcessEnv => "process-env",
            CredentialSource::EnvLocal => "env.local",
            CredentialSource::Mixed => "mixed",
            CredentialSource::None => "none",
        }
    }
}

#[derive(Debug, Clone)]
struct WechatApiConfig {
    app_id: String,
    app_secret: String,
}

#[derive(Debug, Clone)]
struct AccessTokenCacheEntry {
    app_id: String,
    access_token: String,
    expires_at: Instant,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WechatPublishStatus {
    configured: bool,
    missing_keys: Vec<String>,
    source: String,
    app_id_hint: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WechatUploadInput {
    data_url: Option<String>,
    remote_url: Option<String>,
    filename: Option<String>,
    mime_type: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WechatImageUploadResponse {
    remote_url: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WechatCoverUploadResponse {
    remote_url: String,
    media_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WechatDraftArticle {
    title: String,
    content: String,
    thumb_media_id: String,
    author: Option<String>,
    digest: Option<String>,
    show_cover_pic: Option<u8>,
    content_source_url: Option<String>,
    need_open_comment: Option<u8>,
    only_fans_can_comment: Option<u8>,
}

#[derive(Debug, Clone, Serialize)]
struct WechatDraftArticlePayload {
    title: String,
    content: String,
    thumb_media_id: String,
    show_cover_pic: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    author: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    digest: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    content_source_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    need_open_comment: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    only_fans_can_comment: Option<u8>,
}

impl From<&WechatDraftArticle> for WechatDraftArticlePayload {
    fn from(article: &WechatDraftArticle) -> Self {
        Self {
            title: article.title.clone(),
            content: article.content.clone(),
            thumb_media_id: article.thumb_media_id.clone(),
            show_cover_pic: article.show_cover_pic.unwrap_or(0),
            author: article.author.clone(),
            digest: article.digest.clone(),
            content_source_url: article.content_source_url.clone(),
            need_open_comment: article.need_open_comment,
            only_fans_can_comment: article.only_fans_can_comment,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WechatDraftCreateResponse {
    media_id: String,
    article_count: usize,
}

#[derive(Debug, Deserialize)]
struct AccessTokenResponse {
    access_token: Option<String>,
    expires_in: Option<u64>,
    errcode: Option<i64>,
    errmsg: Option<String>,
}

#[derive(Debug, Deserialize)]
struct UploadImageResponse {
    url: Option<String>,
    errcode: Option<i64>,
    errmsg: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MaterialUploadResponse {
    media_id: Option<String>,
    url: Option<String>,
    errcode: Option<i64>,
    errmsg: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DraftCreateApiResponse {
    media_id: Option<String>,
    errcode: Option<i64>,
    errmsg: Option<String>,
}

#[derive(Debug, Clone)]
struct PreparedUpload {
    bytes: Vec<u8>,
    mime_type: String,
    filename: String,
}

#[derive(Debug, Clone, Copy)]
enum WechatUploadKind {
    ArticleContentImage,
    PermanentImage,
}

impl WechatUploadKind {
    fn label(self) -> &'static str {
        match self {
            WechatUploadKind::ArticleContentImage => "article content image",
            WechatUploadKind::PermanentImage => "permanent image material",
        }
    }

    fn max_bytes(self) -> usize {
        match self {
            WechatUploadKind::ArticleContentImage => WECHAT_ARTICLE_IMAGE_MAX_BYTES,
            WechatUploadKind::PermanentImage => WECHAT_PERMANENT_IMAGE_MAX_BYTES,
        }
    }

    fn supported_formats_label(self) -> &'static str {
        match self {
            WechatUploadKind::ArticleContentImage => "JPG/PNG",
            WechatUploadKind::PermanentImage => "BMP/GIF/JPG/PNG",
        }
    }

    fn supports_mime(self, mime_type: &str) -> bool {
        match self {
            WechatUploadKind::ArticleContentImage => {
                matches!(mime_type, "image/jpeg" | "image/png")
            }
            WechatUploadKind::PermanentImage => {
                matches!(
                    mime_type,
                    "image/bmp" | "image/gif" | "image/jpeg" | "image/png"
                )
            }
        }
    }
}

fn sanitize_env_value(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.len() >= 2 {
        let first = trimmed.chars().next().unwrap_or_default();
        let last = trimmed.chars().last().unwrap_or_default();
        if (first == '"' && last == '"') || (first == '\'' && last == '\'') {
            return trimmed[1..trimmed.len() - 1].to_string();
        }
    }
    trimmed.to_string()
}

fn parse_env_contents(contents: &str) -> HashMap<String, String> {
    let mut values = HashMap::new();
    for line in contents.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let without_export = trimmed.strip_prefix("export ").unwrap_or(trimmed);
        let Some((key, value)) = without_export.split_once('=') else {
            continue;
        };
        values.insert(key.trim().to_string(), sanitize_env_value(value));
    }
    values
}

fn push_unique_env_candidate(out: &mut Vec<PathBuf>, candidate: PathBuf) {
    if !out.iter().any(|existing| existing == &candidate) {
        out.push(candidate);
    }
}

fn collect_env_file_candidates(start: &Path, out: &mut Vec<PathBuf>) {
    for ancestor in start.ancestors() {
        push_unique_env_candidate(out, ancestor.join(".env.local"));
        push_unique_env_candidate(out, ancestor.join("inkforge").join(".env.local"));
    }
}

fn load_env_file_values() -> HashMap<String, String> {
    let mut candidates = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        collect_env_file_candidates(&cwd, &mut candidates);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            collect_env_file_candidates(parent, &mut candidates);
        }
    }

    load_env_file_values_from_candidates(&candidates)
}

fn load_env_file_values_from_candidates(candidates: &[PathBuf]) -> HashMap<String, String> {
    let mut values = HashMap::new();

    for candidate in candidates {
        if !candidate.exists() {
            continue;
        }
        if let Ok(contents) = fs::read_to_string(&candidate) {
            for (key, value) in parse_env_contents(&contents) {
                values.entry(key).or_insert(value);
            }
        }
    }

    values
}

fn summarize_sources(from_env: bool, from_file: bool) -> CredentialSource {
    match (from_env, from_file) {
        (true, true) => CredentialSource::Mixed,
        (true, false) => CredentialSource::ProcessEnv,
        (false, true) => CredentialSource::EnvLocal,
        (false, false) => CredentialSource::None,
    }
}

fn load_wechat_config() -> Result<(WechatApiConfig, CredentialSource), Vec<String>> {
    let file_values = load_env_file_values();

    let app_id_env = std::env::var("WECHAT_APP_ID")
        .ok()
        .filter(|value| !value.trim().is_empty());
    let app_secret_env = std::env::var("WECHAT_APP_SECRET")
        .ok()
        .filter(|value| !value.trim().is_empty());

    let app_id_file = file_values
        .get("WECHAT_APP_ID")
        .cloned()
        .filter(|value| !value.trim().is_empty());
    let app_secret_file = file_values
        .get("WECHAT_APP_SECRET")
        .cloned()
        .filter(|value| !value.trim().is_empty());

    let app_id = app_id_env.clone().or(app_id_file.clone());
    let app_secret = app_secret_env.clone().or(app_secret_file.clone());

    let mut missing = Vec::new();
    if app_id.as_deref().unwrap_or_default().is_empty() {
        missing.push("WECHAT_APP_ID".to_string());
    }
    if app_secret.as_deref().unwrap_or_default().is_empty() {
        missing.push("WECHAT_APP_SECRET".to_string());
    }

    if !missing.is_empty() {
        return Err(missing);
    }

    Ok((
        WechatApiConfig {
            app_id: app_id.unwrap_or_default(),
            app_secret: app_secret.unwrap_or_default(),
        },
        summarize_sources(
            app_id_env.is_some() || app_secret_env.is_some(),
            app_id_file.is_some() || app_secret_file.is_some(),
        ),
    ))
}

fn mask_app_id(app_id: &str) -> Option<String> {
    let trimmed = app_id.trim();
    if trimmed.is_empty() {
        return None;
    }
    if trimmed.len() <= 6 {
        return Some(trimmed.to_string());
    }
    let prefix = &trimmed[..4];
    let suffix = &trimmed[trimmed.len() - 2..];
    Some(format!("{}***{}", prefix, suffix))
}

fn ensure_upload_input(input: &WechatUploadInput) -> Result<(), String> {
    let has_data_url = input
        .data_url
        .as_ref()
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);
    let has_remote_url = input
        .remote_url
        .as_ref()
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false);

    match (has_data_url, has_remote_url) {
        (true, false) | (false, true) => Ok(()),
        (false, false) => Err("wechat upload requires either dataUrl or remoteUrl".to_string()),
        (true, true) => {
            Err("wechat upload accepts only one source: dataUrl or remoteUrl".to_string())
        }
    }
}

fn infer_extension(mime_type: &str) -> &'static str {
    match mime_type {
        "image/bmp" => "bmp",
        "image/gif" => "gif",
        "image/png" => "png",
        "image/jpeg" => "jpg",
        _ => "bin",
    }
}

fn default_filename(input: &WechatUploadInput, mime_type: &str) -> String {
    input
        .filename
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| format!("wechat-upload.{}", infer_extension(mime_type)))
}

fn parse_data_url(data_url: &str) -> Result<(Vec<u8>, String), String> {
    let Some((header, payload)) = data_url.split_once(',') else {
        return Err("invalid data URL: missing payload".to_string());
    };
    if !header.starts_with("data:") {
        return Err("invalid data URL: missing mime header".to_string());
    }
    if !header.contains(";base64") {
        return Err("invalid data URL: only base64 payload is supported".to_string());
    }

    let mime_type = header
        .strip_prefix("data:")
        .and_then(|value| value.split(';').next())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("application/octet-stream")
        .to_string();

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(payload)
        .map_err(|error| format!("invalid data URL payload: {}", error))?;

    Ok((bytes, mime_type))
}

fn normalize_image_mime_type(mime_type: &str) -> String {
    let normalized = mime_type
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();
    match normalized.as_str() {
        "image/jpg" => "image/jpeg".to_string(),
        _ => normalized,
    }
}

fn detect_image_mime_from_bytes(bytes: &[u8]) -> Option<&'static str> {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Some("image/png");
    }
    if bytes.len() >= 3 && bytes[0] == 0xff && bytes[1] == 0xd8 && bytes[2] == 0xff {
        return Some("image/jpeg");
    }
    if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        return Some("image/gif");
    }
    if bytes.starts_with(b"BM") {
        return Some("image/bmp");
    }

    let start = bytes
        .iter()
        .position(|byte| !byte.is_ascii_whitespace())
        .unwrap_or(0);
    if let Some(prefix) = bytes.get(start..start.saturating_add(16)) {
        if prefix.starts_with(b"<svg") || prefix.starts_with(b"<?xml") {
            return Some("image/svg+xml");
        }
        if prefix.len() >= 4 && prefix[..4].eq_ignore_ascii_case(b"<svg") {
            return Some("image/svg+xml");
        }
    }

    None
}

fn is_generic_mime_type(mime_type: &str) -> bool {
    mime_type.is_empty()
        || matches!(
            mime_type,
            "application/octet-stream" | "binary/octet-stream"
        )
}

fn ensure_supported_wechat_image(
    mime_type: &str,
    bytes: &[u8],
    kind: WechatUploadKind,
) -> Result<String, String> {
    let normalized_hint = normalize_image_mime_type(mime_type);
    let detected_mime = detect_image_mime_from_bytes(bytes).ok_or_else(|| {
        format!(
            "wechat {} upload requires real BMP/GIF/JPG/PNG image bytes",
            kind.label()
        )
    })?;

    if !is_generic_mime_type(&normalized_hint) && normalized_hint != detected_mime {
        return Err(format!(
            "wechat {} declared mime {} does not match image bytes {}",
            kind.label(),
            normalized_hint,
            detected_mime
        ));
    }

    if !kind.supports_mime(detected_mime) {
        let display_mime = if detected_mime.is_empty() {
            "unknown"
        } else {
            detected_mime
        };
        return Err(format!(
            "wechat {} only supports {} image uploads; got {}",
            kind.label(),
            kind.supported_formats_label(),
            display_mime
        ));
    }

    let max_bytes = kind.max_bytes();
    if bytes.len() > max_bytes {
        return Err(format!(
            "wechat {} image is too large: {} bytes > {} bytes",
            kind.label(),
            bytes.len(),
            max_bytes
        ));
    }

    Ok(detected_mime.to_string())
}

fn is_blocked_remote_host(host: &str) -> bool {
    let normalized = host.trim().trim_matches(['[', ']']).to_ascii_lowercase();
    if normalized == "localhost" || normalized.ends_with(".localhost") {
        return true;
    }

    let Ok(ip) = normalized.parse::<IpAddr>() else {
        return false;
    };

    is_blocked_remote_ip(ip)
}

fn is_blocked_remote_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(ipv4) => {
            ipv4.is_private()
                || ipv4.is_loopback()
                || ipv4.is_link_local()
                || ipv4.is_broadcast()
                || ipv4.is_multicast()
                || ipv4.is_unspecified()
        }
        IpAddr::V6(ipv6) => {
            if let Some(mapped) = ipv6.to_ipv4_mapped() {
                return is_blocked_remote_ip(IpAddr::V4(mapped));
            }
            ipv6.is_loopback()
                || ipv6.is_unspecified()
                || ipv6.is_unique_local()
                || ipv6.is_unicast_link_local()
                || ipv6.is_multicast()
        }
    }
}

fn validate_remote_image_url(parsed: &Url) -> Result<(), String> {
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err(format!("unsupported remoteUrl scheme: {}", parsed.scheme()));
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| "remoteUrl must include a host".to_string())?;
    if is_blocked_remote_host(host) {
        return Err(
            "wechat remote image upload rejects localhost/private network hosts".to_string(),
        );
    }

    Ok(())
}

async fn validate_remote_image_resolution(parsed: &Url) -> Result<(), String> {
    let host = parsed
        .host_str()
        .ok_or_else(|| "remoteUrl must include a host".to_string())?;

    if host.trim().parse::<IpAddr>().is_ok() {
        return Ok(());
    }

    let port = parsed
        .port_or_known_default()
        .ok_or_else(|| "remoteUrl must use a scheme with a known port".to_string())?;

    let mut resolved = tokio::net::lookup_host((host, port))
        .await
        .map_err(|error| format!("failed to resolve remoteUrl host: {}", error))?;

    let mut resolved_any = false;
    for socket_addr in &mut resolved {
        resolved_any = true;
        if is_blocked_remote_ip(socket_addr.ip()) {
            return Err(
                "wechat remote image upload rejects hosts resolving to localhost/private networks"
                    .to_string(),
            );
        }
    }

    if !resolved_any {
        return Err("remoteUrl host did not resolve to any address".to_string());
    }

    Ok(())
}

fn ensure_remote_image_response_status(status: StatusCode) -> Result<(), String> {
    if status.is_redirection() {
        return Err(format!(
            "remote image redirects are not allowed for WeChat upload: {}",
            status
        ));
    }

    if !status.is_success() {
        return Err(format!("remote image request failed: {}", status));
    }

    Ok(())
}

async fn fetch_remote_bytes(
    client: &Client,
    remote_url: &str,
    max_bytes: usize,
) -> Result<(Vec<u8>, String), String> {
    let parsed = Url::parse(remote_url).map_err(|error| format!("invalid remoteUrl: {}", error))?;
    validate_remote_image_url(&parsed)?;
    validate_remote_image_resolution(&parsed).await?;

    let response = client
        .get(parsed)
        .send()
        .await
        .map_err(|error| format!("failed to fetch remote image: {}", error))?;

    ensure_remote_image_response_status(response.status())?;

    let content_length = response.content_length().ok_or_else(|| {
        "remote image response missing Content-Length; use a local asset or data URL for WeChat upload"
            .to_string()
    })?;
    if content_length > max_bytes as u64 {
        return Err(format!(
            "remote image is too large for WeChat upload: {} bytes > {} bytes",
            content_length, max_bytes
        ));
    }

    let mime_type = response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.split(';').next())
        .filter(|value| value.trim().to_ascii_lowercase().starts_with("image/"))
        .map(normalize_image_mime_type)
        .unwrap_or_else(|| "application/octet-stream".to_string());

    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("failed to read remote image bytes: {}", error))?
        .to_vec();
    if bytes.len() > max_bytes {
        return Err(format!(
            "remote image is too large for WeChat upload: {} bytes > {} bytes",
            bytes.len(),
            max_bytes
        ));
    }

    Ok((bytes, mime_type))
}

async fn prepare_upload(
    client: &Client,
    input: &WechatUploadInput,
    kind: WechatUploadKind,
) -> Result<PreparedUpload, String> {
    ensure_upload_input(input)?;

    let (bytes, detected_mime) = if let Some(data_url) = input.data_url.as_ref() {
        parse_data_url(data_url.trim())?
    } else if let Some(remote_url) = input.remote_url.as_ref() {
        fetch_remote_bytes(client, remote_url.trim(), kind.max_bytes()).await?
    } else {
        return Err("wechat upload input is empty".to_string());
    };

    let fallback_mime_type = input
        .mime_type
        .as_ref()
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or(&detected_mime);
    let detected_mime = normalize_image_mime_type(&detected_mime);
    let candidate_mime = if detected_mime == "application/octet-stream" {
        fallback_mime_type
    } else {
        &detected_mime
    };
    let mime_type = ensure_supported_wechat_image(candidate_mime, &bytes, kind)?;

    Ok(PreparedUpload {
        filename: default_filename(input, &mime_type),
        mime_type,
        bytes,
    })
}

fn build_client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(20))
        .redirect(Policy::none())
        .build()
        .map_err(|error| format!("failed to build reqwest client: {}", error))
}

fn ensure_no_api_error(
    errcode: Option<i64>,
    errmsg: Option<String>,
    operation: &str,
) -> Result<(), String> {
    if let Some(code) = errcode {
        if code == 0 {
            return Ok(());
        }
        let message = errmsg.unwrap_or_else(|| "unknown error".to_string());
        return Err(format!(
            "wechat {} failed ({}): {}",
            operation, code, message
        ));
    }
    Ok(())
}

fn build_wechat_url(path: &str, query: &[(&str, &str)]) -> Result<Url, String> {
    let mut url = Url::parse(&format!(
        "{}/{}",
        WECHAT_API_BASE,
        path.trim_start_matches('/')
    ))
    .map_err(|error| format!("failed to build wechat {} URL: {}", path, error))?;

    {
        let mut pairs = url.query_pairs_mut();
        for (key, value) in query {
            pairs.append_pair(key, value);
        }
    }

    Ok(url)
}

fn format_request_error(operation: &str, error: reqwest::Error) -> String {
    match error.status() {
        Some(status) => format!(
            "wechat {} request failed with HTTP status {}",
            operation, status
        ),
        None => format!("wechat {} request failed before HTTP status", operation),
    }
}

fn format_response_parse_error(operation: &str, error: reqwest::Error) -> String {
    match error.status() {
        Some(status) => format!(
            "wechat {} response parse failed with HTTP status {}",
            operation, status
        ),
        None => format!("wechat {} response parse failed", operation),
    }
}

fn access_token_cache() -> &'static Mutex<Option<AccessTokenCacheEntry>> {
    WECHAT_ACCESS_TOKEN_CACHE.get_or_init(|| Mutex::new(None))
}

fn access_token_cache_ttl(expires_in: Option<u64>) -> Duration {
    let seconds = expires_in.unwrap_or(WECHAT_ACCESS_TOKEN_DEFAULT_EXPIRES_IN_SECS);
    let effective_seconds = seconds
        .saturating_sub(WECHAT_ACCESS_TOKEN_REFRESH_SKEW_SECS)
        .max(WECHAT_ACCESS_TOKEN_MIN_TTL_SECS);

    Duration::from_secs(effective_seconds)
}

fn cached_access_token(config: &WechatApiConfig, now: Instant) -> Option<String> {
    let mut guard = access_token_cache().lock().ok()?;
    match guard.as_ref() {
        Some(entry) if entry.app_id == config.app_id && entry.expires_at > now => {
            Some(entry.access_token.clone())
        }
        Some(entry) if entry.app_id == config.app_id => {
            *guard = None;
            None
        }
        _ => None,
    }
}

fn cache_access_token(
    config: &WechatApiConfig,
    access_token: String,
    expires_in: Option<u64>,
    now: Instant,
) -> String {
    let expires_at = now + access_token_cache_ttl(expires_in);
    if let Ok(mut guard) = access_token_cache().lock() {
        *guard = Some(AccessTokenCacheEntry {
            app_id: config.app_id.clone(),
            access_token: access_token.clone(),
            expires_at,
        });
    }

    access_token
}

fn clear_access_token_cache() {
    if let Ok(mut guard) = access_token_cache().lock() {
        *guard = None;
    }
}

#[cfg(test)]
fn clear_access_token_cache_for_tests() {
    clear_access_token_cache();
}

fn is_access_token_endpoint_error(errcode: Option<i64>) -> bool {
    errcode
        .map(|code| WECHAT_ACCESS_TOKEN_ENDPOINT_ERRCODES.contains(&code))
        .unwrap_or(false)
}

async fn fetch_access_token_uncached(
    client: &Client,
    config: &WechatApiConfig,
) -> Result<AccessTokenResponse, String> {
    let url = build_wechat_url(
        "token",
        &[
            ("grant_type", "client_credential"),
            ("appid", &config.app_id),
            ("secret", &config.app_secret),
        ],
    )?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format_request_error("access_token", error))?;

    let payload: AccessTokenResponse = response
        .json()
        .await
        .map_err(|error| format_response_parse_error("access_token", error))?;

    ensure_no_api_error(payload.errcode, payload.errmsg.clone(), "access_token")?;
    Ok(payload)
}

async fn fetch_access_token(client: &Client, config: &WechatApiConfig) -> Result<String, String> {
    let now = Instant::now();
    if let Some(access_token) = cached_access_token(config, now) {
        return Ok(access_token);
    }

    let payload = fetch_access_token_uncached(client, config).await?;
    let access_token = payload
        .access_token
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "wechat access_token response missing access_token".to_string())?;

    Ok(cache_access_token(
        config,
        access_token,
        payload.expires_in,
        Instant::now(),
    ))
}

async fn upload_multipart_image(
    client: &Client,
    url: Url,
    prepared: &PreparedUpload,
    operation: &str,
) -> Result<reqwest::Response, String> {
    let part = multipart::Part::bytes(prepared.bytes.clone())
        .file_name(prepared.filename.clone())
        .mime_str(&prepared.mime_type)
        .map_err(|error| format!("invalid mime type for {}: {}", operation, error))?;

    let form = multipart::Form::new().part("media", part);
    client
        .post(url)
        .multipart(form)
        .send()
        .await
        .map_err(|error| format_request_error(operation, error))
}

fn find_ascii_case_insensitive(haystack: &[u8], needle: &[u8], start: usize) -> Option<usize> {
    if needle.is_empty() || start >= haystack.len() || needle.len() > haystack.len() {
        return None;
    }

    haystack[start..]
        .windows(needle.len())
        .position(|window| window.eq_ignore_ascii_case(needle))
        .map(|position| start + position)
}

fn find_html_tag_end(html: &str, start: usize) -> Option<usize> {
    let bytes = html.as_bytes();
    let mut quote: Option<u8> = None;
    let mut cursor = start;

    while cursor < bytes.len() {
        let byte = bytes[cursor];
        match quote {
            Some(current_quote) => {
                if byte == current_quote {
                    quote = None;
                }
            }
            None => match byte {
                b'\'' | b'"' => quote = Some(byte),
                b'>' => return Some(cursor),
                _ => {}
            },
        }
        cursor += 1;
    }

    None
}

fn is_attr_name_boundary(byte: Option<u8>) -> bool {
    match byte {
        None => true,
        Some(value) => value.is_ascii_whitespace() || matches!(value, b'<' | b'/'),
    }
}

fn extract_img_attribute_value(tag: &str, attribute: &str) -> Option<String> {
    let bytes = tag.as_bytes();
    let mut cursor = 0usize;
    let needle = attribute.as_bytes();

    while let Some(attr_index) = find_ascii_case_insensitive(bytes, needle, cursor) {
        let before = attr_index
            .checked_sub(1)
            .and_then(|index| bytes.get(index))
            .copied();
        if !is_attr_name_boundary(before) {
            cursor = attr_index + needle.len();
            continue;
        }

        let mut index = attr_index + needle.len();
        while bytes.get(index).is_some_and(u8::is_ascii_whitespace) {
            index += 1;
        }
        if bytes.get(index) != Some(&b'=') {
            cursor = attr_index + needle.len();
            continue;
        }

        index += 1;
        while bytes.get(index).is_some_and(u8::is_ascii_whitespace) {
            index += 1;
        }

        let value_start;
        let value_end;
        match bytes.get(index).copied() {
            Some(quote @ (b'"' | b'\'')) => {
                value_start = index + 1;
                let Some(relative_end) = bytes[value_start..]
                    .iter()
                    .position(|value| *value == quote)
                else {
                    return None;
                };
                value_end = value_start + relative_end;
            }
            Some(_) => {
                value_start = index;
                let relative_end = bytes[value_start..]
                    .iter()
                    .position(|value| value.is_ascii_whitespace() || *value == b'>')
                    .unwrap_or(bytes.len() - value_start);
                value_end = value_start + relative_end;
            }
            None => return None,
        }

        if let Ok(value) = std::str::from_utf8(&bytes[value_start..value_end]) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }

        cursor = attr_index + needle.len();
    }

    None
}

fn extract_img_srcset_values(tag: &str) -> Vec<String> {
    let Some(srcset) = extract_img_attribute_value(tag, "srcset") else {
        return Vec::new();
    };

    srcset
        .split(',')
        .filter_map(|candidate| candidate.split_whitespace().next())
        .map(str::trim)
        .filter(|candidate| !candidate.is_empty())
        .map(ToOwned::to_owned)
        .collect()
}

fn extract_img_srcs(html: &str) -> Vec<String> {
    let mut out = Vec::new();
    let bytes = html.as_bytes();
    let mut cursor = 0usize;

    while let Some(start) = find_ascii_case_insensitive(bytes, b"<img", cursor) {
        let Some(end) = find_html_tag_end(html, start) else {
            break;
        };
        if let Some(tag) = html.get(start..=end) {
            if let Some(src) = extract_img_attribute_value(tag, "src") {
                out.push(src);
            }
            out.extend(extract_img_srcset_values(tag));
        }

        cursor = end + 1;
    }

    out
}

fn is_wechat_image_url(url: &str) -> bool {
    let Ok(parsed) = Url::parse(url) else {
        return false;
    };
    matches!(parsed.scheme(), "http" | "https")
        && WECHAT_IMAGE_HOSTS.iter().any(|host| {
            parsed
                .host_str()
                .map(|value| value.eq_ignore_ascii_case(host))
                .unwrap_or(false)
        })
}

fn ensure_text_max_chars(label: &str, value: &str, max_chars: usize) -> Result<(), String> {
    let count = value.trim().chars().count();
    if count > max_chars {
        return Err(format!(
            "wechat draft {} must be at most {} characters; got {}",
            label, max_chars, count
        ));
    }
    Ok(())
}

fn ensure_optional_text_max_chars(
    label: &str,
    value: Option<&String>,
    max_chars: usize,
) -> Result<(), String> {
    if let Some(value) = value {
        ensure_text_max_chars(label, value, max_chars)?;
    }
    Ok(())
}

fn ensure_optional_text_max_bytes(
    label: &str,
    value: Option<&String>,
    max_bytes: usize,
) -> Result<(), String> {
    if let Some(value) = value {
        let bytes = value.trim().as_bytes().len();
        if bytes > max_bytes {
            return Err(format!(
                "wechat draft {} must be at most {} bytes; got {}",
                label, max_bytes, bytes
            ));
        }
    }
    Ok(())
}

fn validate_content_source_url(value: Option<&String>) -> Result<(), String> {
    let Some(value) = value
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
    else {
        return Ok(());
    };
    let parsed = Url::parse(value)
        .map_err(|error| format!("wechat draft contentSourceUrl is invalid: {}", error))?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err("wechat draft contentSourceUrl must use HTTP(S)".to_string());
    }
    Ok(())
}

fn validate_draft_article(article: &WechatDraftArticle) -> Result<(), String> {
    if article.title.trim().is_empty() {
        return Err("wechat draft title is required".to_string());
    }
    ensure_text_max_chars("title", &article.title, WECHAT_DRAFT_TITLE_MAX_CHARS)?;
    ensure_optional_text_max_chars(
        "author",
        article.author.as_ref(),
        WECHAT_DRAFT_AUTHOR_MAX_CHARS,
    )?;
    ensure_optional_text_max_chars(
        "digest",
        article.digest.as_ref(),
        WECHAT_DRAFT_DIGEST_MAX_CHARS,
    )?;
    ensure_optional_text_max_bytes(
        "contentSourceUrl",
        article.content_source_url.as_ref(),
        WECHAT_DRAFT_CONTENT_SOURCE_URL_MAX_BYTES,
    )?;
    validate_content_source_url(article.content_source_url.as_ref())?;
    if article.content.trim().is_empty() {
        return Err("wechat draft content is required".to_string());
    }
    if article.content.as_bytes().len() >= WECHAT_ARTICLE_CONTENT_MAX_BYTES {
        return Err(format!(
            "wechat draft content must be fewer than {} bytes",
            WECHAT_ARTICLE_CONTENT_MAX_BYTES
        ));
    }
    if article.content.chars().count() >= WECHAT_ARTICLE_CONTENT_MAX_CHARS {
        return Err(format!(
            "wechat draft content must be fewer than {} characters",
            WECHAT_ARTICLE_CONTENT_MAX_CHARS
        ));
    }
    if article.thumb_media_id.trim().is_empty() {
        return Err("wechat draft thumbMediaId is required".to_string());
    }
    if let Some(value) = article.show_cover_pic {
        if value > 1 {
            return Err("wechat draft showCoverPic must be 0 or 1".to_string());
        }
    }
    if let Some(value) = article.need_open_comment {
        if value > 1 {
            return Err("wechat draft needOpenComment must be 0 or 1".to_string());
        }
    }
    if let Some(value) = article.only_fans_can_comment {
        if value > 1 {
            return Err("wechat draft onlyFansCanComment must be 0 or 1".to_string());
        }
    }

    let foreign_images: Vec<String> = extract_img_srcs(&article.content)
        .into_iter()
        .filter(|src| !is_wechat_image_url(src))
        .collect();

    if !foreign_images.is_empty() {
        return Err(format!(
            "wechat draft content still contains non-WeChat image URLs: {}",
            foreign_images.join(", ")
        ));
    }

    Ok(())
}

#[command]
pub async fn wechat_publish_status() -> Result<WechatPublishStatus, String> {
    match load_wechat_config() {
        Ok((config, source)) => Ok(WechatPublishStatus {
            configured: true,
            missing_keys: Vec::new(),
            source: source.as_str().to_string(),
            app_id_hint: mask_app_id(&config.app_id),
        }),
        Err(missing) => Ok(WechatPublishStatus {
            configured: false,
            missing_keys: missing,
            source: CredentialSource::None.as_str().to_string(),
            app_id_hint: None,
        }),
    }
}

#[command]
pub async fn wechat_upload_article_image(
    input: WechatUploadInput,
) -> Result<WechatImageUploadResponse, String> {
    let (config, _) = load_wechat_config().map_err(|missing| {
        format!(
            "wechat credentials are not configured; missing {}",
            missing.join(", ")
        )
    })?;
    let client = build_client()?;
    let prepared = prepare_upload(&client, &input, WechatUploadKind::ArticleContentImage).await?;
    let mut access_token = fetch_access_token(&client, &config).await?;

    let response = upload_multipart_image(
        &client,
        build_wechat_url("media/uploadimg", &[("access_token", &access_token)])?,
        &prepared,
        "uploadimg",
    )
    .await?;

    let mut payload: UploadImageResponse = response
        .json()
        .await
        .map_err(|error| format_response_parse_error("uploadimg", error))?;

    if is_access_token_endpoint_error(payload.errcode) {
        clear_access_token_cache();
        access_token = fetch_access_token(&client, &config).await?;
        let retry_response = upload_multipart_image(
            &client,
            build_wechat_url("media/uploadimg", &[("access_token", &access_token)])?,
            &prepared,
            "uploadimg",
        )
        .await?;
        payload = retry_response
            .json()
            .await
            .map_err(|error| format_response_parse_error("uploadimg", error))?;
    }

    ensure_no_api_error(payload.errcode, payload.errmsg, "uploadimg")?;
    let remote_url = payload
        .url
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "wechat uploadimg response missing url".to_string())?;

    Ok(WechatImageUploadResponse { remote_url })
}

#[command]
pub async fn wechat_upload_cover_image(
    input: WechatUploadInput,
) -> Result<WechatCoverUploadResponse, String> {
    let (config, _) = load_wechat_config().map_err(|missing| {
        format!(
            "wechat credentials are not configured; missing {}",
            missing.join(", ")
        )
    })?;
    let client = build_client()?;
    let prepared = prepare_upload(&client, &input, WechatUploadKind::PermanentImage).await?;
    let mut access_token = fetch_access_token(&client, &config).await?;

    let response = upload_multipart_image(
        &client,
        build_wechat_url(
            "material/add_material",
            &[("access_token", &access_token), ("type", "image")],
        )?,
        &prepared,
        "add_material",
    )
    .await?;

    let mut payload: MaterialUploadResponse = response
        .json()
        .await
        .map_err(|error| format_response_parse_error("add_material", error))?;

    if is_access_token_endpoint_error(payload.errcode) {
        clear_access_token_cache();
        access_token = fetch_access_token(&client, &config).await?;
        let retry_response = upload_multipart_image(
            &client,
            build_wechat_url(
                "material/add_material",
                &[("access_token", &access_token), ("type", "image")],
            )?,
            &prepared,
            "add_material",
        )
        .await?;
        payload = retry_response
            .json()
            .await
            .map_err(|error| format_response_parse_error("add_material", error))?;
    }

    ensure_no_api_error(payload.errcode, payload.errmsg, "add_material")?;

    let media_id = payload
        .media_id
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "wechat add_material response missing media_id".to_string())?;
    let remote_url = payload
        .url
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "wechat add_material response missing url".to_string())?;

    Ok(WechatCoverUploadResponse {
        remote_url,
        media_id,
    })
}

#[command]
pub async fn wechat_create_draft(
    article: WechatDraftArticle,
) -> Result<WechatDraftCreateResponse, String> {
    validate_draft_article(&article)?;

    let (config, _) = load_wechat_config().map_err(|missing| {
        format!(
            "wechat credentials are not configured; missing {}",
            missing.join(", ")
        )
    })?;
    let client = build_client()?;
    let mut access_token = fetch_access_token(&client, &config).await?;
    let draft_payload = WechatDraftArticlePayload::from(&article);
    let url = build_wechat_url("draft/add", &[("access_token", &access_token)])?;

    let response = client
        .post(url)
        .json(&serde_json::json!({
            "articles": [draft_payload.clone()],
        }))
        .send()
        .await
        .map_err(|error| format_request_error("draft/add", error))?;

    let mut payload: DraftCreateApiResponse = response
        .json()
        .await
        .map_err(|error| format_response_parse_error("draft/add", error))?;

    if is_access_token_endpoint_error(payload.errcode) {
        clear_access_token_cache();
        access_token = fetch_access_token(&client, &config).await?;
        let retry_response = client
            .post(build_wechat_url(
                "draft/add",
                &[("access_token", &access_token)],
            )?)
            .json(&serde_json::json!({
                "articles": [draft_payload],
            }))
            .send()
            .await
            .map_err(|error| format_request_error("draft/add", error))?;
        payload = retry_response
            .json()
            .await
            .map_err(|error| format_response_parse_error("draft/add", error))?;
    }

    ensure_no_api_error(payload.errcode, payload.errmsg, "draft/add")?;

    let media_id = payload
        .media_id
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "wechat draft/add response missing media_id".to_string())?;

    Ok(WechatDraftCreateResponse {
        media_id,
        article_count: 1,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        access_token_cache_ttl, build_wechat_url, cache_access_token, cached_access_token,
        clear_access_token_cache_for_tests, collect_env_file_candidates, ensure_no_api_error,
        ensure_remote_image_response_status, ensure_supported_wechat_image, extract_img_srcs,
        is_access_token_endpoint_error, is_wechat_image_url, load_env_file_values_from_candidates,
        parse_env_contents, sanitize_env_value, validate_draft_article, validate_remote_image_url,
        WechatApiConfig, WechatDraftArticle, WechatDraftArticlePayload, WechatUploadKind,
        WECHAT_ACCESS_TOKEN_MIN_TTL_SECS, WECHAT_ACCESS_TOKEN_REFRESH_SKEW_SECS,
        WECHAT_ARTICLE_CONTENT_MAX_BYTES, WECHAT_ARTICLE_CONTENT_MAX_CHARS,
        WECHAT_ARTICLE_IMAGE_MAX_BYTES, WECHAT_DRAFT_AUTHOR_MAX_CHARS,
        WECHAT_DRAFT_DIGEST_MAX_CHARS, WECHAT_DRAFT_TITLE_MAX_CHARS,
        WECHAT_PERMANENT_IMAGE_MAX_BYTES,
    };
    use std::{
        fs,
        path::{Path, PathBuf},
        time::{Duration, Instant},
    };

    const PNG_BYTES: &[u8] = b"\x89PNG\r\n\x1a\nfake-png";
    const GIF_BYTES: &[u8] = b"GIF89afake-gif";
    const JPEG_BYTES: &[u8] = &[
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, b'J', b'F', b'I', b'F', 0x00,
    ];

    #[test]
    fn parse_env_contents_skips_comments_and_export_prefix() {
        let parsed = parse_env_contents(
            r#"
            # comment
            export WECHAT_APP_ID = "wx123456"
            WECHAT_APP_SECRET='secret'
            INVALID_LINE
            "#,
        );

        assert_eq!(
            parsed.get("WECHAT_APP_ID").map(String::as_str),
            Some("wx123456")
        );
        assert_eq!(
            parsed.get("WECHAT_APP_SECRET").map(String::as_str),
            Some("secret")
        );
        assert!(!parsed.contains_key("INVALID_LINE"));
    }

    #[test]
    fn sanitize_env_value_trims_quotes() {
        assert_eq!(sanitize_env_value("\"demo\""), "demo");
        assert_eq!(sanitize_env_value("'demo'"), "demo");
        assert_eq!(sanitize_env_value(" demo "), "demo");
    }

    #[test]
    fn env_file_candidates_prefer_nearest_and_nested_app_file() {
        let mut candidates = Vec::new();
        collect_env_file_candidates(Path::new("/workspace/Inkforge"), &mut candidates);

        assert_eq!(
            candidates[0],
            PathBuf::from("/workspace/Inkforge/.env.local")
        );
        assert_eq!(
            candidates[1],
            PathBuf::from("/workspace/Inkforge/inkforge/.env.local")
        );
    }

    #[test]
    fn env_file_values_merge_nearest_first_without_shadowing_missing_keys() {
        let base =
            std::env::temp_dir().join(format!("inkforge_wechat_env_merge_{}", std::process::id()));
        let nested = base.join("inkforge");
        fs::create_dir_all(&nested).unwrap();
        fs::write(base.join(".env.local"), "WECHAT_APP_ID=wx-root\n").unwrap();
        fs::write(
            nested.join(".env.local"),
            "WECHAT_APP_ID=wx-nested\nWECHAT_APP_SECRET=secret-nested\n",
        )
        .unwrap();

        let candidates = vec![base.join(".env.local"), nested.join(".env.local")];
        let values = load_env_file_values_from_candidates(&candidates);

        assert_eq!(
            values.get("WECHAT_APP_ID").map(String::as_str),
            Some("wx-root")
        );
        assert_eq!(
            values.get("WECHAT_APP_SECRET").map(String::as_str),
            Some("secret-nested")
        );

        let _ = fs::remove_dir_all(base);
    }

    #[test]
    fn build_wechat_url_percent_encodes_query_values() {
        let url = build_wechat_url("token", &[("appid", "wx123"), ("secret", "a+b&c=d")]).unwrap();

        assert_eq!(
            url.as_str(),
            "https://api.weixin.qq.com/cgi-bin/token?appid=wx123&secret=a%2Bb%26c%3Dd"
        );
    }

    #[test]
    fn extract_img_srcs_finds_multiple_sources() {
        let html = r#"<p><img src="https://example.com/a.png"><img alt="b" src='https://mmbiz.qpic.cn/x.png'></p>"#;
        let sources = extract_img_srcs(html);

        assert_eq!(sources.len(), 2);
        assert_eq!(sources[0], "https://example.com/a.png");
        assert_eq!(sources[1], "https://mmbiz.qpic.cn/x.png");
    }

    #[test]
    fn extract_img_srcs_handles_multibyte_attrs_and_unquoted_sources() {
        let html = r#"<p><img alt="中文" src=https://example.com/a.png><IMG data-src="skip" SRC='https://mmbiz.qpic.cn/x.png'></p>"#;
        let sources = extract_img_srcs(html);

        assert_eq!(sources.len(), 2);
        assert_eq!(sources[0], "https://example.com/a.png");
        assert_eq!(sources[1], "https://mmbiz.qpic.cn/x.png");
    }

    #[test]
    fn extract_img_srcs_handles_gt_inside_quoted_attributes() {
        let html = r#"<p><img alt="a > b" src="https://example.com/a.png"></p>"#;
        let sources = extract_img_srcs(html);

        assert_eq!(sources, vec!["https://example.com/a.png"]);
    }

    #[test]
    fn extract_img_srcs_includes_srcset_candidates_for_validation() {
        let html = r#"<p><img src="https://mmbiz.qpic.cn/ok.png" srcset="https://example.com/a.png 1x, https://mmbiz.qpic.cn/b.png 2x"></p>"#;
        let sources = extract_img_srcs(html);

        assert_eq!(sources.len(), 3);
        assert_eq!(sources[0], "https://mmbiz.qpic.cn/ok.png");
        assert_eq!(sources[1], "https://example.com/a.png");
        assert_eq!(sources[2], "https://mmbiz.qpic.cn/b.png");
    }

    #[test]
    fn wechat_image_host_check_is_strict() {
        assert!(is_wechat_image_url(
            "https://mmbiz.qpic.cn/mmbiz_png/demo/640"
        ));
        assert!(is_wechat_image_url("https://mmbiz.qlogo.cn/example.png"));
        assert!(!is_wechat_image_url("https://example.com/image.png"));
        assert!(!is_wechat_image_url("data:image/png;base64,aaa"));
    }

    #[test]
    fn draft_payload_uses_wechat_api_snake_case_fields() {
        let article = WechatDraftArticle {
            title: "Demo".to_string(),
            content: "<p>hello</p>".to_string(),
            thumb_media_id: "thumb-1".to_string(),
            author: Some("InkForge".to_string()),
            digest: Some("digest".to_string()),
            show_cover_pic: Some(1),
            content_source_url: Some("https://example.com".to_string()),
            need_open_comment: Some(1),
            only_fans_can_comment: Some(0),
        };

        let payload = serde_json::to_value(WechatDraftArticlePayload::from(&article)).unwrap();

        assert_eq!(
            payload
                .get("thumb_media_id")
                .and_then(|value| value.as_str()),
            Some("thumb-1")
        );
        assert_eq!(
            payload
                .get("show_cover_pic")
                .and_then(|value| value.as_u64()),
            Some(1)
        );
        assert_eq!(
            payload
                .get("content_source_url")
                .and_then(|value| value.as_str()),
            Some("https://example.com")
        );
        assert_eq!(
            payload
                .get("need_open_comment")
                .and_then(|value| value.as_u64()),
            Some(1)
        );
        assert!(payload.get("thumbMediaId").is_none());
        assert!(payload.get("contentSourceUrl").is_none());
    }

    #[test]
    fn draft_payload_omits_null_optional_fields_and_defaults_cover_visibility() {
        let article = WechatDraftArticle {
            title: "Demo".to_string(),
            content: "<p>hello</p>".to_string(),
            thumb_media_id: "thumb-1".to_string(),
            author: None,
            digest: None,
            show_cover_pic: None,
            content_source_url: None,
            need_open_comment: None,
            only_fans_can_comment: None,
        };

        let payload = serde_json::to_value(WechatDraftArticlePayload::from(&article)).unwrap();

        assert_eq!(
            payload
                .get("show_cover_pic")
                .and_then(|value| value.as_u64()),
            Some(0)
        );
        assert!(payload.get("author").is_none());
        assert!(payload.get("digest").is_none());
        assert!(payload.get("content_source_url").is_none());
        assert!(payload.get("need_open_comment").is_none());
        assert!(payload.get("only_fans_can_comment").is_none());
    }

    #[test]
    fn draft_validation_rejects_invalid_cover_flag_and_long_content() {
        let mut article = WechatDraftArticle {
            title: "Demo".to_string(),
            content: "<p>hello</p>".to_string(),
            thumb_media_id: "thumb-1".to_string(),
            author: None,
            digest: None,
            show_cover_pic: Some(2),
            content_source_url: None,
            need_open_comment: None,
            only_fans_can_comment: None,
        };

        assert!(validate_draft_article(&article)
            .unwrap_err()
            .contains("showCoverPic"));

        article.show_cover_pic = Some(0);
        article.content = "a".repeat(WECHAT_ARTICLE_CONTENT_MAX_CHARS);
        assert!(validate_draft_article(&article)
            .unwrap_err()
            .contains("fewer than"));

        article.content = "<p>hello</p>".to_string();
        article.title = "t".repeat(WECHAT_DRAFT_TITLE_MAX_CHARS + 1);
        assert!(validate_draft_article(&article)
            .unwrap_err()
            .contains("title"));

        article.title = "Demo".to_string();
        article.author = Some("a".repeat(WECHAT_DRAFT_AUTHOR_MAX_CHARS + 1));
        assert!(validate_draft_article(&article)
            .unwrap_err()
            .contains("author"));

        article.author = None;
        article.digest = Some("d".repeat(WECHAT_DRAFT_DIGEST_MAX_CHARS + 1));
        assert!(validate_draft_article(&article)
            .unwrap_err()
            .contains("digest"));

        article.digest = None;
        article.content_source_url = Some("javascript:alert(1)".to_string());
        assert!(validate_draft_article(&article)
            .unwrap_err()
            .contains("contentSourceUrl"));

        article.content_source_url = None;
        article.content = "a".repeat(WECHAT_ARTICLE_CONTENT_MAX_BYTES);
        assert!(validate_draft_article(&article)
            .unwrap_err()
            .contains("bytes"));

        article.content = "<p>hello</p>".to_string();
        article.content =
            r#"<img src="https://mmbiz.qpic.cn/ok.png" srcset="https://example.com/leak.png 2x">"#
                .to_string();
        assert!(validate_draft_article(&article)
            .unwrap_err()
            .contains("non-WeChat image URLs"));

        article.content = r#"<img alt="a > b" src="https://example.com/leak.png">"#.to_string();
        assert!(validate_draft_article(&article)
            .unwrap_err()
            .contains("non-WeChat image URLs"));
    }

    #[test]
    fn upload_validation_rejects_unsupported_mime_and_oversized_images() {
        assert!(ensure_supported_wechat_image(
            "image/webp",
            PNG_BYTES,
            WechatUploadKind::ArticleContentImage,
        )
        .unwrap_err()
        .contains("does not match"));
        assert!(ensure_supported_wechat_image(
            "image/gif",
            GIF_BYTES,
            WechatUploadKind::ArticleContentImage,
        )
        .unwrap_err()
        .contains("JPG/PNG"));
        assert_eq!(
            ensure_supported_wechat_image("image/gif", GIF_BYTES, WechatUploadKind::PermanentImage)
                .unwrap(),
            "image/gif"
        );
        assert!(ensure_supported_wechat_image(
            "image/png",
            b"fake",
            WechatUploadKind::ArticleContentImage,
        )
        .unwrap_err()
        .contains("real BMP/GIF/JPG/PNG"));

        let mut oversized_article = PNG_BYTES.to_vec();
        oversized_article.resize(WECHAT_ARTICLE_IMAGE_MAX_BYTES + 1, 0);
        assert!(ensure_supported_wechat_image(
            "image/png",
            &oversized_article,
            WechatUploadKind::ArticleContentImage,
        )
        .unwrap_err()
        .contains("too large"));

        let mut oversized_permanent = PNG_BYTES.to_vec();
        oversized_permanent.resize(WECHAT_PERMANENT_IMAGE_MAX_BYTES + 1, 0);
        assert!(ensure_supported_wechat_image(
            "image/png",
            &oversized_permanent,
            WechatUploadKind::PermanentImage,
        )
        .unwrap_err()
        .contains("too large"));
        assert_eq!(
            ensure_supported_wechat_image(
                "image/jpg",
                JPEG_BYTES,
                WechatUploadKind::ArticleContentImage
            )
            .unwrap(),
            "image/jpeg"
        );
        assert_eq!(
            ensure_supported_wechat_image(
                "application/octet-stream",
                PNG_BYTES,
                WechatUploadKind::ArticleContentImage
            )
            .unwrap(),
            "image/png"
        );
    }

    #[test]
    fn remote_image_url_validation_rejects_local_network_targets() {
        for url in [
            "http://localhost/a.png",
            "http://127.0.0.1/a.png",
            "http://10.0.0.1/a.png",
            "http://224.0.0.1/a.png",
            "http://[::1]/a.png",
            "http://[::ffff:127.0.0.1]/a.png",
        ] {
            let parsed = reqwest::Url::parse(url).unwrap();
            assert!(validate_remote_image_url(&parsed).is_err(), "{url}");
        }

        let parsed = reqwest::Url::parse("https://example.com/a.png").unwrap();
        assert!(validate_remote_image_url(&parsed).is_ok());
    }

    #[test]
    fn remote_image_response_validation_rejects_redirects() {
        assert!(ensure_remote_image_response_status(reqwest::StatusCode::OK).is_ok());
        assert!(
            ensure_remote_image_response_status(reqwest::StatusCode::FOUND)
                .unwrap_err()
                .contains("redirects are not allowed")
        );
        assert!(
            ensure_remote_image_response_status(reqwest::StatusCode::NOT_FOUND)
                .unwrap_err()
                .contains("request failed")
        );
    }

    #[test]
    fn api_error_code_zero_is_success() {
        assert!(ensure_no_api_error(Some(0), Some("ok".to_string()), "draft/add").is_ok());
        assert!(
            ensure_no_api_error(Some(40013), Some("invalid appid".to_string()), "token")
                .unwrap_err()
                .contains("40013")
        );
        assert!(ensure_no_api_error(None, None, "uploadimg").is_ok());
    }

    #[test]
    fn endpoint_token_error_codes_trigger_cache_refresh_retry() {
        for code in [40001, 40014, 42001] {
            assert!(is_access_token_endpoint_error(Some(code)), "{code}");
        }

        for code in [0, 40013, 41001] {
            assert!(!is_access_token_endpoint_error(Some(code)), "{code}");
        }
        assert!(!is_access_token_endpoint_error(None));
    }

    #[test]
    fn access_token_cache_reuses_same_app_id_until_skewed_expiry() {
        clear_access_token_cache_for_tests();
        let config = WechatApiConfig {
            app_id: "wx-cache".to_string(),
            app_secret: "secret".to_string(),
        };
        let now = Instant::now();

        let cached = cache_access_token(&config, "token-1".to_string(), Some(7200), now);

        assert_eq!(cached, "token-1");
        assert_eq!(
            cached_access_token(&config, now + Duration::from_secs(60)).as_deref(),
            Some("token-1")
        );
        assert!(cached_access_token(&config, now + Duration::from_secs(7200)).is_none());
    }

    #[test]
    fn access_token_cache_misses_when_app_id_differs() {
        clear_access_token_cache_for_tests();
        let first = WechatApiConfig {
            app_id: "wx-first".to_string(),
            app_secret: "secret-a".to_string(),
        };
        let second = WechatApiConfig {
            app_id: "wx-second".to_string(),
            app_secret: "secret-b".to_string(),
        };
        let now = Instant::now();

        cache_access_token(&first, "token-first".to_string(), Some(7200), now);

        assert!(cached_access_token(&second, now + Duration::from_secs(60)).is_none());
    }

    #[test]
    fn access_token_cache_can_be_cleared_after_endpoint_token_error() {
        clear_access_token_cache_for_tests();
        let config = WechatApiConfig {
            app_id: "wx-clear".to_string(),
            app_secret: "secret".to_string(),
        };
        let now = Instant::now();

        cache_access_token(&config, "stale-token".to_string(), Some(7200), now);
        assert_eq!(
            cached_access_token(&config, now + Duration::from_secs(60)).as_deref(),
            Some("stale-token")
        );

        clear_access_token_cache_for_tests();
        assert!(cached_access_token(&config, now + Duration::from_secs(60)).is_none());
    }

    #[test]
    fn access_token_cache_ttl_applies_refresh_skew_without_underflow() {
        assert_eq!(
            access_token_cache_ttl(Some(WECHAT_ACCESS_TOKEN_REFRESH_SKEW_SECS + 120)),
            Duration::from_secs(120)
        );
        assert_eq!(
            access_token_cache_ttl(Some(WECHAT_ACCESS_TOKEN_REFRESH_SKEW_SECS)),
            Duration::from_secs(WECHAT_ACCESS_TOKEN_MIN_TTL_SECS)
        );
        assert_eq!(access_token_cache_ttl(Some(0)), Duration::from_secs(1));
    }
}
