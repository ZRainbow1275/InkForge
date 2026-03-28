/// <reference types="vite/client" />

/**
 * Vite 环境变量类型定义
 * 确保所有环境变量都有类型安全的访问
 */
interface ImportMetaEnv {
    // ═══════════════════════════════════════════════════════════════════
    // Ollama AI 服务配置
    // ═══════════════════════════════════════════════════════════════════

    /** Ollama 服务 URL（默认: http://localhost:11434） */
    readonly VITE_OLLAMA_URL?: string

    /** Ollama 模型名称（默认: qwen2.5:7b） */
    readonly VITE_OLLAMA_MODEL?: string

    /** AI 状态检查超时时间（毫秒，默认: 5000） */
    readonly VITE_AI_STATUS_TIMEOUT?: string

    /** AI 内容生成超时时间（毫秒，默认: 60000） */
    readonly VITE_AI_GENERATE_TIMEOUT?: string

    /** AI 请求节流间隔（毫秒，默认: 1000） */
    readonly VITE_AI_THROTTLE_INTERVAL?: string

    /** AI 输入最大长度（字符数，默认: 10000） */
    readonly VITE_AI_MAX_INPUT_LENGTH?: string

    // ═══════════════════════════════════════════════════════════════════
    // CORS 代理配置
    // ═══════════════════════════════════════════════════════════════════

    /**
     * 自建 CORS 代理 URL
     *
     * 安全要求：
     * - 必须使用 HTTPS 协议
     * - 生产环境必须配置此变量
     * - 示例: https://your-proxy.example.com/fetch?url=
     */
    readonly VITE_CORS_PROXY_URL?: string

    // ═══════════════════════════════════════════════════════════════════
    // URL 解析服务配置
    // ═══════════════════════════════════════════════════════════════════

    /** 解析请求超时时间（毫秒，默认: 10000） */
    readonly VITE_PARSE_TIMEOUT?: string

    /** 解析最大重试次数（默认: 3） */
    readonly VITE_PARSE_MAX_RETRIES?: string

    /** 描述截断最大长度（字符数，默认: 200） */
    readonly VITE_PARSE_MAX_DESCRIPTION?: string

    /** 内容截断最大长度（字符数，默认: 3000） */
    readonly VITE_PARSE_MAX_CONTENT?: string

    // ═══════════════════════════════════════════════════════════════════
    // 日志配置
    // ═══════════════════════════════════════════════════════════════════

    /** 日志级别（debug | info | warn | error，默认: info） */
    readonly VITE_LOG_LEVEL?: string

    // ═══════════════════════════════════════════════════════════════════
    // Vite 内置变量
    // ═══════════════════════════════════════════════════════════════════

    /** 当前模式（development | production） */
    readonly MODE: string

    /** 是否为开发环境 */
    readonly DEV: boolean

    /** 是否为生产环境 */
    readonly PROD: boolean

    /** 是否启用 SSR */
    readonly SSR: boolean

    /** 应用基础路径 */
    readonly BASE_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

declare module '*.css' {
    const css: string
    export default css
}
