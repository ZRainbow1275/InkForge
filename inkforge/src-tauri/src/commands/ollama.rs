//! Ollama API 代理命令
//!
//! 通过 Tauri IPC 代理 Ollama 请求，解决浏览器 CORS 限制问题。
//! 在桌面应用中，前端通过 invoke() 调用这些命令而非直接 fetch。

use serde::{Deserialize, Serialize};
use tauri::command;

/// Ollama 服务基础 URL
const OLLAMA_BASE_URL: &str = "http://localhost:11434";

/// Ollama 状态检查响应
#[derive(Debug, Serialize, Deserialize)]
pub struct OllamaStatus {
    pub available: bool,
    pub model: Option<String>,
    pub error: Option<String>,
}

/// Ollama 模型信息
#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
}

/// Ollama 标签列表响应
#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModel>>,
}

/// 生成请求参数
#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateRequest {
    pub model: String,
    pub prompt: String,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<GenerateOptions>,
}

/// 生成选项
#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_predict: Option<i32>,
}

/// 生成响应
#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateResponse {
    pub response: String,
    #[serde(default)]
    pub done: bool,
}

/// 首选模型列表（按优先级排序）
const PREFERRED_MODELS: &[&str] = &["qwen2.5:7b", "qwen2.5:3b", "llama3.2:3b", "mistral:7b"];

/// 检查 Ollama 服务状态
///
/// # 返回值
///
/// 返回 Ollama 服务的可用性状态和当前模型信息
#[command]
pub async fn check_ollama_status() -> Result<OllamaStatus, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    let response = match client.get(format!("{}/api/tags", OLLAMA_BASE_URL)).send().await {
        Ok(resp) => resp,
        Err(e) => {
            return Ok(OllamaStatus {
                available: false,
                model: None,
                error: Some(format!("Ollama 未运行: {}", e)),
            });
        }
    };

    if !response.status().is_success() {
        return Ok(OllamaStatus {
            available: false,
            model: None,
            error: Some(format!("Ollama 服务响应异常: {}", response.status())),
        });
    }

    let tags: OllamaTagsResponse = response.json().await.map_err(|e| e.to_string())?;

    let models = tags.models.unwrap_or_default();
    if models.is_empty() {
        return Ok(OllamaStatus {
            available: false,
            model: None,
            error: Some("没有可用的模型，请运行: ollama pull qwen2.5:7b".to_string()),
        });
    }

    // 查找首选模型
    let mut selected_model = models[0].name.clone();
    for preferred in PREFERRED_MODELS {
        if models.iter().any(|m| m.name == *preferred) {
            selected_model = preferred.to_string();
            break;
        }
    }

    Ok(OllamaStatus {
        available: true,
        model: Some(selected_model),
        error: None,
    })
}

/// 调用 Ollama 生成 API（非流式）
///
/// # 参数
///
/// - `request`: 生成请求参数
///
/// # 返回值
///
/// 返回生成的文本内容
#[command]
pub async fn ollama_generate(request: GenerateRequest) -> Result<GenerateResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .post(format!("{}/api/generate", OLLAMA_BASE_URL))
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("请求失败: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama 生成失败: {}", response.status()));
    }

    let result: GenerateResponse = response
        .json()
        .await
        .map_err(|e| format!("解析响应失败: {}", e))?;

    Ok(result)
}

/// 调用 Ollama 生成 API（流式 - 占位符）
///
/// 注意：完整的流式实现需要使用 Tauri 的事件系统
/// 这里提供一个简化版本，实际使用建议用 ollama_generate
#[command]
pub async fn ollama_generate_stream(request: GenerateRequest) -> Result<String, String> {
    // 流式实现需要 Tauri 事件系统支持
    // 这里暂时使用非流式接口
    let result = ollama_generate(request).await?;
    Ok(result.response)
}
