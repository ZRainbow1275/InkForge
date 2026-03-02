/**
 * 统一错误处理服务
 * 提供结构化错误类型和处理函数
 */

import { LOG_SECURITY, secureShouldSample } from '@/config/security'

/**
 * 业务错误代码
 */
export enum ErrorCode {
    // 解析相关
    PARSE_URL_INVALID = 'PARSE_URL_INVALID',
    PARSE_FETCH_FAILED = 'PARSE_FETCH_FAILED',
    PARSE_CONTENT_EMPTY = 'PARSE_CONTENT_EMPTY',

    // 数据库相关
    DB_READ_FAILED = 'DB_READ_FAILED',
    DB_WRITE_FAILED = 'DB_WRITE_FAILED',
    DB_NOT_FOUND = 'DB_NOT_FOUND',

    // AI相关
    AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
    AI_GENERATION_FAILED = 'AI_GENERATION_FAILED',

    // 通用
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * 结构化业务错误
 */
export class AppError extends Error {
    readonly code: ErrorCode
    readonly context?: Record<string, unknown>
    readonly timestamp: Date

    constructor(
        code: ErrorCode,
        message: string,
        context?: Record<string, unknown>
    ) {
        super(message)
        this.name = 'AppError'
        this.code = code
        this.context = context
        this.timestamp = new Date()
        // 修复 Error 继承问题，确保 instanceof 正确工作
        Object.setPrototypeOf(this, AppError.prototype)
    }

    /**
     * 转换为用户友好的错误消息
     */
    toUserMessage(): string {
        const messages: Record<ErrorCode, string> = {
            [ErrorCode.PARSE_URL_INVALID]: '无效的URL格式',
            [ErrorCode.PARSE_FETCH_FAILED]: '无法获取网页内容，请检查网络连接',
            [ErrorCode.PARSE_CONTENT_EMPTY]: '网页内容为空',
            [ErrorCode.DB_READ_FAILED]: '读取数据失败',
            [ErrorCode.DB_WRITE_FAILED]: '保存数据失败',
            [ErrorCode.DB_NOT_FOUND]: '数据不存在',
            [ErrorCode.AI_SERVICE_UNAVAILABLE]: 'AI服务不可用，请检查Ollama是否运行',
            [ErrorCode.AI_GENERATION_FAILED]: 'AI生成失败',
            [ErrorCode.UNKNOWN_ERROR]: '发生未知错误',
            [ErrorCode.VALIDATION_ERROR]: '数据验证失败',
        }
        return messages[this.code] || this.message
    }

    /**
     * 转换为日志格式
     */
    toLogEntry(): string {
        return JSON.stringify({
            code: this.code,
            message: this.message,
            context: this.context,
            timestamp: this.timestamp.toISOString(),
        })
    }
}

/**
 * 错误日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * 日志级别优先级映射
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
}

/**
 * 检查是否应该采样此日志
 * 使用 crypto.getRandomValues 代替 Math.random 以获得加密安全的随机数
 */
function shouldSample(level: LogLevel): boolean {
    // 生产环境启用采样，开发环境不采样
    if (!import.meta.env.PROD) return true

    const rate = LOG_SECURITY.SAMPLING_RATES[level]
    return secureShouldSample(rate)
}


/**
 * 日志记录器
 */
class Logger {
    private readonly prefix = '[InkForge]'

    /**
     * 获取当前日志级别
     * 生产环境默认 warn，开发环境默认 debug
     */
    private getLogLevel(): LogLevel {
        const envLevel = import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined
        if (envLevel && LOG_LEVEL_PRIORITY[envLevel] !== undefined) {
            return envLevel
        }
        // 生产环境默认 warn，开发环境默认 debug
        return import.meta.env.PROD ? 'warn' : 'debug'
    }

    /**
     * 检查是否应该输出该级别的日志
     */
    private shouldLog(level: LogLevel): boolean {
        const currentLevel = this.getLogLevel()
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel]
    }

    /**
     * 检查字段名是否为敏感字段（不区分大小写）
     */
    private isSensitiveField(fieldName: string): boolean {
        const lowerFieldName = fieldName.toLowerCase()
        return LOG_SECURITY.SENSITIVE_FIELDS.some(sensitive =>
            lowerFieldName.includes(sensitive.toLowerCase())
        )
    }

    /**
     * 截断过长字符串
     */
    private truncateString(value: string): string {
        if (value.length <= LOG_SECURITY.MAX_STRING_LENGTH) {
            return value
        }
        return `${value.substring(0, LOG_SECURITY.MAX_STRING_LENGTH)}... [TRUNCATED, original length: ${value.length}]`
    }

    /**
     * 递归过滤敏感字段并截断字符串
     */
    private sanitizeValue(value: unknown, visited = new WeakSet<object>()): unknown {
        // 处理 null 和 undefined
        if (value === null || value === undefined) {
            return value
        }

        // 处理字符串：截断过长内容
        if (typeof value === 'string') {
            return this.truncateString(value)
        }

        // 处理原始类型
        if (typeof value !== 'object') {
            return value
        }

        // 防止循环引用
        if (visited.has(value as object)) {
            return '[CIRCULAR]'
        }
        visited.add(value as object)

        // 处理数组
        if (Array.isArray(value)) {
            return value.map(item => this.sanitizeValue(item, visited))
        }

        // 处理对象
        const sanitized: Record<string, unknown> = {}
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
            if (this.isSensitiveField(key)) {
                sanitized[key] = '[REDACTED]'
            } else {
                sanitized[key] = this.sanitizeValue(val, visited)
            }
        }
        return sanitized
    }

    /**
     * 安全处理上下文对象
     */
    private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
        if (!context) {
            return undefined
        }
        return this.sanitizeValue(context) as Record<string, unknown>
    }

    private format(level: LogLevel, message: string, context?: Record<string, unknown>): string {
        const timestamp = new Date().toISOString()
        const sanitizedContext = this.sanitizeContext(context)
        const truncatedMessage = this.truncateString(message)
        const contextStr = sanitizedContext ? ` | ${JSON.stringify(sanitizedContext)}` : ''
        return `${this.prefix} [${level.toUpperCase()}] ${timestamp} | ${truncatedMessage}${contextStr}`
    }

    debug(message: string, context?: Record<string, unknown>): void {
        if (!this.shouldLog('debug')) return
        if (!shouldSample('debug')) return  // 采样检查
        console.debug(this.format('debug', message, context))
    }

    info(message: string, context?: Record<string, unknown>): void {
        if (!this.shouldLog('info')) return
        if (!shouldSample('info')) return  // 采样检查
        console.info(this.format('info', message, context))
    }

    warn(message: string, context?: Record<string, unknown>): void {
        if (!this.shouldLog('warn')) return
        console.warn(this.format('warn', message, context))
    }

    error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
        if (!this.shouldLog('error')) return
        // 对错误消息进行脱敏处理，防止敏感信息泄露到日志
        const sanitizedErrorMessage = error instanceof Error
            ? this.truncateString(error.message)
            : this.truncateString(String(error))
        const errorContext = error instanceof Error
            ? { ...context, errorName: error.name, errorMessage: sanitizedErrorMessage }
            : { ...context, error: sanitizedErrorMessage }
        console.error(this.format('error', message, errorContext))
    }

    /**
     * 记录AppError（始终输出，因为是错误级别）
     */
    appError(appError: AppError): void {
        if (!this.shouldLog('error')) return
        const sanitizedEntry = {
            code: appError.code,
            message: this.truncateString(appError.message),
            context: this.sanitizeContext(appError.context),
            timestamp: appError.timestamp.toISOString(),
        }
        console.error(JSON.stringify(sanitizedEntry))
    }
}

/**
 * 全局日志实例
 */
export const logger = new Logger()

/**
 * 包装函数：将普通错误转换为AppError
 */
export function wrapError(
    error: unknown,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    context?: Record<string, unknown>
): AppError {
    if (error instanceof AppError) {
        return error
    }

    const message = error instanceof Error ? error.message : String(error)
    return new AppError(code, message, context)
}

/**
 * 安全执行：捕获错误并返回结果
 */
export async function safeExecute<T>(
    operation: () => Promise<T>,
    errorCode: ErrorCode,
    context?: Record<string, unknown>
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
    try {
        const data = await operation()
        return { success: true, data }
    } catch (error) {
        const appError = wrapError(error, errorCode, context)
        logger.appError(appError)
        return { success: false, error: appError }
    }
}
