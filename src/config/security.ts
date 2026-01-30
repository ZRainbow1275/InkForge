/**
 * 安全配置中心
 * 统一管理所有安全相关配置，确保一致性和可维护性
 *
 * 设计原则：
 * - Single Source of Truth: 所有安全参数集中定义
 * - 硬性上限: 环境变量不能超越安全边界
 * - 类型安全: 完整的 TypeScript 类型定义
 */

// ═══════════════════════════════════════════════════════════════════
// 密码策略配置
// ═══════════════════════════════════════════════════════════════════

/**
 * 密码策略配置
 *
 * @description 定义密码复杂度要求的基准配置
 *
 * 环境差异说明：
 * - **开发环境** (`import.meta.env.PROD === false`):
 *   使用此基准配置，`REQUIRE_SPECIAL` 为 `false`
 *
 * - **生产环境** (`import.meta.env.PROD === true`):
 *   通过 `getPasswordPolicy()` 函数获取增强配置，
 *   `REQUIRE_SPECIAL` 强制设为 `true`
 *
 * @example
 * ```typescript
 * // 开发环境直接使用
 * import { PASSWORD_POLICY } from '@/config/security'
 *
 * // 生产环境推荐使用
 * import { getPasswordPolicy } from '@/config/security'
 * const policy = getPasswordPolicy() // 自动应用环境增强
 * ```
 *
 * @see getPasswordPolicy 获取环境感知的策略
 * @see validatePassword 统一密码验证函数
 */
export const PASSWORD_POLICY = {
    /** 最小长度 */
    MIN_LENGTH: 12,
    /** 最大长度（防止 DoS） */
    MAX_LENGTH: 128,
    /** 是否要求大写字母 */
    REQUIRE_UPPERCASE: true,
    /** 是否要求小写字母 */
    REQUIRE_LOWERCASE: true,
    /** 是否要求数字 */
    REQUIRE_NUMBER: true,
    /** 是否要求特殊字符 */
    REQUIRE_SPECIAL: false, // 当前设为 false，可根据需求启用
    /** 特殊字符正则 */
    SPECIAL_CHARS_REGEX: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
} as const

/** 密码验证结果 */
export interface PasswordValidationResult {
    valid: boolean
    errors: string[]
}

/**
 * 统一密码验证函数
 * @param password 待验证的密码
 * @returns 验证结果，包含是否有效和错误列表
 */
export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = []

    // 长度检查
    if (!password || password.length < PASSWORD_POLICY.MIN_LENGTH) {
        errors.push(`密码长度至少需要 ${PASSWORD_POLICY.MIN_LENGTH} 个字符`)
    }

    if (password && password.length > PASSWORD_POLICY.MAX_LENGTH) {
        errors.push(`密码长度不能超过 ${PASSWORD_POLICY.MAX_LENGTH} 个字符`)
    }

    // 复杂度检查
    if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        errors.push('密码必须包含大写字母')
    }

    if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        errors.push('密码必须包含小写字母')
    }

    if (PASSWORD_POLICY.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
        errors.push('密码必须包含数字')
    }

    if (PASSWORD_POLICY.REQUIRE_SPECIAL && !PASSWORD_POLICY.SPECIAL_CHARS_REGEX.test(password)) {
        errors.push('密码必须包含特殊字符')
    }

    return {
        valid: errors.length === 0,
        errors
    }
}

/**
 * 验证密码并抛出异常（用于需要立即中断的场景）
 * @throws Error 如果密码不符合策略
 */
export function assertPasswordValid(password: string): void {
    const result = validatePassword(password)
    if (!result.valid) {
        throw new Error(result.errors.join('；'))
    }
}

// ═══════════════════════════════════════════════════════════════════
// 加密配置
// ═══════════════════════════════════════════════════════════════════

/** 加密算法配置 */
export const CRYPTO_SECURITY = {
    /** 加密算法 */
    ALGORITHM: 'AES-GCM' as const,
    /** 密钥长度（位） */
    KEY_LENGTH: 256,
    /** IV 长度（字节） */
    IV_LENGTH: 12,
    /** 盐值长度（字节） */
    SALT_LENGTH: 16,
    /** PBKDF2 迭代次数（OWASP 2023 推荐值） */
    PBKDF2_ITERATIONS: 310_000,
    /** 密钥缓存超时时间（毫秒）- 5分钟 */
    KEY_CACHE_TIMEOUT_MS: 5 * 60 * 1000,
    /** 导出密钥版本 */
    EXPORT_VERSION: 1,
} as const

// ═══════════════════════════════════════════════════════════════════
// SSRF 防护配置
// ═══════════════════════════════════════════════════════════════════

/** SSRF 防护配置 */
export const SSRF_PROTECTION = {
    /** 允许的 URL 协议白名单 */
    ALLOWED_PROTOCOLS: ['http:', 'https:'] as const,

    /** 禁止的私有域名 */
    BLOCKED_HOSTNAMES: [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '[::1]',
        '::1'
    ] as const,

    /** 禁止的私有域名后缀 */
    BLOCKED_HOSTNAME_SUFFIXES: [
        '.local',
        '.localhost',
        '.internal',
        '.lan',
        '.home',
        '.corp',
        '.private'
    ] as const,

    /** IPv4 私有网络 CIDR 范围 */
    IPV4_PRIVATE_RANGES: [
        { network: 0x7F000000, mask: 0xFF000000 },  // 127.0.0.0/8
        { network: 0x0A000000, mask: 0xFF000000 },  // 10.0.0.0/8
        { network: 0xAC100000, mask: 0xFFF00000 },  // 172.16.0.0/12
        { network: 0xC0A80000, mask: 0xFFFF0000 },  // 192.168.0.0/16
        { network: 0xA9FE0000, mask: 0xFFFF0000 },  // 169.254.0.0/16
        { network: 0x00000000, mask: 0xFF000000 },  // 0.0.0.0/8
        { network: 0xE0000000, mask: 0xF0000000 },  // 224.0.0.0/4
        { network: 0xF0000000, mask: 0xF0000000 }   // 240.0.0.0/4
    ] as const,

    /** IPv6 私有网络前缀 */
    IPV6_PRIVATE_PREFIXES: [
        '::1',
        'fc',
        'fd',
        'fe80',
        'fec0',
        '::ffff:127.',
        '::ffff:10.',
        '::ffff:172.16',
        '::ffff:192.168'
    ] as const,

    /** 启用 DNS Rebinding 防护 */
    ENABLE_DNS_REBINDING_PROTECTION: true,

    /** DNS 解析缓存时间（毫秒） */
    DNS_CACHE_TTL_MS: 60_000,
} as const

// ═══════════════════════════════════════════════════════════════════
// 请求限制配置
// ═══════════════════════════════════════════════════════════════════

/** 请求限制配置 */
export const REQUEST_LIMITS = {
    /** AI 请求队列最大大小 */
    AI_QUEUE_MAX_SIZE: 10,
    /** AI 请求最大并发数 */
    AI_MAX_CONCURRENT: 1,
    /** AI 请求节流间隔（毫秒） */
    AI_THROTTLE_INTERVAL_MS: 1000,
    /** AI 生成超时（毫秒） */
    AI_GENERATE_TIMEOUT_MS: 60_000,
    /** AI 状态检查超时（毫秒） */
    AI_STATUS_TIMEOUT_MS: 3_000,
    /** AI 最大输入长度（字符）- 硬性上限 */
    AI_MAX_INPUT_LENGTH_HARD_LIMIT: 50_000,
    /** AI 最大输入长度（默认） */
    AI_MAX_INPUT_LENGTH_DEFAULT: 10_000,
    /** 最大请求体大小（字节）- 1MB */
    MAX_REQUEST_BODY_SIZE: 1024 * 1024,
    /** 解析响应最大大小（字节）- 5MB */
    PARSE_MAX_RESPONSE_SIZE: 5 * 1024 * 1024,
} as const

/**
 * 获取带硬性上限的配置值
 * @param envValue 环境变量值
 * @param defaultValue 默认值
 * @param hardLimit 硬性上限
 */
export function getConfigWithHardLimit(
    envValue: string | undefined,
    defaultValue: number,
    hardLimit: number
): number {
    const value = envValue ? Number(envValue) : defaultValue
    if (isNaN(value) || value <= 0) {
        return defaultValue
    }
    return Math.min(value, hardLimit)
}

// ═══════════════════════════════════════════════════════════════════
// 日志安全配置
// ═══════════════════════════════════════════════════════════════════

/** 日志安全配置 */
export const LOG_SECURITY = {
    /** 敏感字段列表（不区分大小写匹配） */
    SENSITIVE_FIELDS: [
        'password', 'token', 'apiKey', 'secret', 'credential', 'auth',
        'key', 'cookie', 'session', 'authorization', 'bearer',
        'jwt', 'refresh', 'access', 'private',
        'signature', 'hash', 'salt', 'iv', 'nonce',
        'rawContent', 'body', 'transcript', 'aiSummary', 'content'
    ] as const,

    /** 字符串最大长度限制 */
    MAX_STRING_LENGTH: 500,

    /** 日志采样配置（生产环境） */
    SAMPLING_RATES: {
        debug: 0.1,
        info: 0.5,
        warn: 1.0,
        error: 1.0
    } as const,
} as const

/**
 * 使用加密安全的随机数进行日志采样
 * @param rate 采样率 (0-1)
 * @returns 是否应该采样
 */
export function secureShouldSample(rate: number): boolean {
    // 输入验证：处理无效数字
    if (typeof rate !== 'number' || !Number.isFinite(rate)) {
        return true // 无效输入时默认采样，确保日志不丢失
    }

    if (rate >= 1) return true
    if (rate <= 0) return false

    // 使用 crypto.getRandomValues 代替 Math.random
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    // 0x100000000 = 2^32，确保 randomValue 在 [0, 1) 范围内
    const randomValue = array[0] / 0x100000000
    return randomValue < rate
}

// ═══════════════════════════════════════════════════════════════════
// HTML 安全配置
// ═══════════════════════════════════════════════════════════════════

/** HTML 安全白名单 */
export const HTML_SECURITY = {
    /** 安全的 HTML 元素白名单 */
    SAFE_TAGS: [
        'article', 'section', 'nav', 'aside', 'header', 'footer', 'main',
        'div', 'span', 'p', 'br', 'hr',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        'a', 'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
        'sub', 'sup', 'small', 'mark', 'abbr', 'cite', 'q',
        'pre', 'code', 'kbd', 'samp', 'var',
        'blockquote', 'figure', 'figcaption',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
        'img', 'picture', 'source', 'audio', 'video',
        'time', 'address', 'details', 'summary'
    ] as const,

    /** 安全的 HTML 属性白名单（移除了 autoplay） */
    SAFE_ATTRS: [
        'href', 'src', 'alt', 'title', 'class', 'id', 'name',
        'width', 'height', 'colspan', 'rowspan', 'scope',
        'datetime', 'cite', 'lang', 'dir', 'aria-*', 'data-*',
        'controls', 'loop', 'muted', 'poster'
        // 注意：已移除 'autoplay' - 防止资源消耗攻击和用户体验问题
    ] as const,
} as const

// ═══════════════════════════════════════════════════════════════════
// Ollama AI 服务配置
// ═══════════════════════════════════════════════════════════════════

/** Ollama AI 服务配置 */
export const OLLAMA_CONFIG = {
    /** 默认 Ollama API 地址（本地） */
    DEFAULT_BASE_URL: 'http://localhost:11434',
    /** 默认模型 */
    DEFAULT_MODEL: 'qwen2.5:7b',
    /** 首选模型列表（按优先级排序） */
    PREFERRED_MODELS: ['qwen2.5:7b', 'qwen2.5:3b', 'llama3.2:3b', 'mistral:7b'] as const,
    /** 允许的主机列表（安全验证用） */
    ALLOWED_HOSTS: ['localhost', '127.0.0.1', '::1'] as const,
} as const

// ═══════════════════════════════════════════════════════════════════
// 版本管理安全配置
// ═══════════════════════════════════════════════════════════════════

/** 版本管理配置 */
export const VERSION_MANAGEMENT = {
    /** 每个文档的最大版本数量限制 */
    MAX_VERSIONS_PER_DOCUMENT: 50,
    /** 版本数量警告阈值（百分比） */
    VERSION_WARNING_THRESHOLD: 0.8,
} as const

// ═══════════════════════════════════════════════════════════════════
// ReDoS 防护配置
// ═══════════════════════════════════════════════════════════════════

/** ReDoS 防护配置 */
export const REDOS_PROTECTION = {
    /** HTML 输入最大长度限制（字节）- 超过此长度跳过复杂正则处理 */
    MAX_HTML_LENGTH: 500_000,
    /** 最大正则处理迭代次数 */
    MAX_REGEX_ITERATIONS: 100,
} as const

// ═══════════════════════════════════════════════════════════════════
// CSS 注入防护配置
// ═══════════════════════════════════════════════════════════════════

/**
 * CSS 注入防护 - 危险模式列表
 * 每个模式使用字符串形式，调用时创建新正则实例避免状态污染
 */
export const CSS_INJECTION_PATTERNS = {
    /** 危险 CSS 模式字符串 */
    DANGEROUS_PATTERNS: [
        // JavaScript/VBScript 注入
        'expression\\s*\\(',           // IE expression()
        'javascript\\s*:',             // javascript: 协议
        'vbscript\\s*:',               // vbscript: 协议
        // 绑定注入
        '-moz-binding\\s*:',           // Firefox XBL 绑定
        'behavior\\s*:',               // IE behavior
        'binding\\s*:',                // 通用绑定
        '-o-link\\s*:',                // Opera 链接
        '-o-link-source\\s*:',         // Opera 链接源
        // URL 注入
        'url\\s*\\(\\s*["\']?\\s*data:',      // data: URL 注入
        'url\\s*\\(\\s*["\']?\\s*javascript:', // javascript: URL
        // CSS 导入/字符集
        '@import',                     // CSS @import
        '@charset',                    // CSS @charset（可能被用于编码绕过）
        // 字体注入
        'src\\s*:\\s*url\\s*\\(',      // 字体 src:url() 注入
        // Unicode 转义检测（检测常见的危险关键字编码）
        '\\\\6a\\s*\\\\61\\s*\\\\76\\s*\\\\61\\s*\\\\73\\s*\\\\63\\s*\\\\72\\s*\\\\69\\s*\\\\70\\s*\\\\74',  // "javascript" Unicode
        '\\\\65\\s*\\\\78\\s*\\\\70\\s*\\\\72\\s*\\\\65\\s*\\\\73\\s*\\\\73\\s*\\\\69\\s*\\\\6f\\s*\\\\6e',  // "expression" Unicode
    ] as const,

    /** 需要完全移除的 URL 模式 */
    DANGEROUS_URL_PATTERN: 'url\\s*\\([^)]*\\)',

    /** 追踪类 CSS 属性（可能泄露用户数据） */
    TRACKING_PATTERNS: [
        'background-image\\s*:\\s*url\\s*\\([^)]*\\)',  // 背景图片追踪
        'list-style-image\\s*:\\s*url\\s*\\([^)]*\\)',  // 列表图片追踪
        'cursor\\s*:\\s*url\\s*\\([^)]*\\)',            // 光标追踪
    ] as const,
} as const

// ═══════════════════════════════════════════════════════════════════
// DNS 缓存配置
// ═══════════════════════════════════════════════════════════════════

/** DNS 缓存配置 */
export const DNS_CACHE_CONFIG = {
    /** 最大缓存条目数（LRU 策略） */
    MAX_ENTRIES: 1000,
    /** 缓存 TTL（毫秒） */
    TTL_MS: 60_000,
} as const

// ═══════════════════════════════════════════════════════════════════
// 环境配置验证
// ═══════════════════════════════════════════════════════════════════

/**
 * 环境感知的密码策略
 * 生产环境启用更严格的策略
 */
export function getPasswordPolicy(): typeof PASSWORD_POLICY {
    const isProduction = typeof import.meta !== 'undefined'
        && import.meta.env?.PROD === true

    if (isProduction) {
        return {
            ...PASSWORD_POLICY,
            REQUIRE_SPECIAL: true,  // 生产环境强制要求特殊字符
        }
    }
    return PASSWORD_POLICY
}

// ═══════════════════════════════════════════════════════════════════
// 错误信息净化配置
// ═══════════════════════════════════════════════════════════════════

/** 错误信息净化配置 */
export const ERROR_SANITIZATION = {
    /** 敏感路径模式（将被替换为 [REDACTED]） */
    SENSITIVE_PATH_PATTERNS: [
        /[A-Za-z]:\\[^:\s]*/g,          // Windows 路径
        /\/(?:Users|home)\/[^\/\s]+/g,  // Unix 用户目录
        /\/tmp\/[^\/\s]+/g,             // 临时目录
        /\/var\/[^\/\s]+/g,             // var 目录
    ] as const,

    /** 替换文本 */
    REDACTED_TEXT: '[REDACTED]',
} as const

/**
 * 净化错误信息，移除敏感路径
 * @param message 原始错误信息
 * @returns 净化后的信息
 */
export function sanitizeErrorMessage(message: string): string {
    let result = message
    for (const pattern of ERROR_SANITIZATION.SENSITIVE_PATH_PATTERNS) {
        // 创建新正则实例避免状态污染
        const regex = new RegExp(pattern.source, pattern.flags)
        result = result.replace(regex, ERROR_SANITIZATION.REDACTED_TEXT)
    }
    return result
}
