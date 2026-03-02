import { z } from 'zod';

/**
 * API Response Schemas
 * 外部 API 响应的 Zod Schema 验证层
 *
 * 架构原则：
 * - 所有外部 API 响应必须经过 Schema 验证
 * - 使用 safeParse 进行安全校验，避免运行时崩溃
 * - 提供友好的错误信息，便于调试和用户反馈
 * - 与 article.ts 风格保持一致
 */

// ═══════════════════════════════════════════════════════════════════
// Ollama API Schemas
// ═══════════════════════════════════════════════════════════════════

/**
 * Ollama 模型信息 Schema
 * 对应 /api/tags 返回的单个模型
 */
export const OllamaModelSchema = z.object({
    name: z.string().min(1, '模型名称不能为空'),
    model: z.string().optional(),
    modified_at: z.string().optional(),
    size: z.number().optional(),
    digest: z.string().optional(),
    details: z.object({
        parent_model: z.string().optional(),
        format: z.string().optional(),
        family: z.string().optional(),
        families: z.array(z.string()).optional(),
        parameter_size: z.string().optional(),
        quantization_level: z.string().optional(),
    }).optional(),
});

/**
 * Ollama /api/tags 响应 Schema
 * GET /api/tags - 获取可用模型列表
 */
export const OllamaTagsResponseSchema = z.object({
    models: z.array(OllamaModelSchema).default([]),
});

/**
 * Ollama /api/generate 响应 Schema（非流式）
 * POST /api/generate - 生成文本
 */
export const OllamaGenerateResponseSchema = z.object({
    model: z.string(),
    created_at: z.string().optional(),
    response: z.string().default(''),
    done: z.boolean(),
    done_reason: z.string().optional(),
    context: z.array(z.number()).optional(),
    total_duration: z.number().optional(),
    load_duration: z.number().optional(),
    prompt_eval_count: z.number().optional(),
    prompt_eval_duration: z.number().optional(),
    eval_count: z.number().optional(),
    eval_duration: z.number().optional(),
});

/**
 * Ollama 错误响应 Schema
 */
export const OllamaErrorResponseSchema = z.object({
    error: z.string(),
});

// ═══════════════════════════════════════════════════════════════════
// Type Exports（从 Schema 推断）
// ═══════════════════════════════════════════════════════════════════

export type OllamaModel = z.infer<typeof OllamaModelSchema>;
export type OllamaTagsResponse = z.infer<typeof OllamaTagsResponseSchema>;
export type OllamaGenerateResponse = z.infer<typeof OllamaGenerateResponseSchema>;
export type OllamaErrorResponse = z.infer<typeof OllamaErrorResponseSchema>;

// ═══════════════════════════════════════════════════════════════════
// 校验结果类型
// ═══════════════════════════════════════════════════════════════════

/**
 * 统一的校验结果类型
 */
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    details?: z.ZodError;
}

// ═══════════════════════════════════════════════════════════════════
// 错误格式化
// ═══════════════════════════════════════════════════════════════════

/**
 * 格式化 Zod 错误为友好的错误信息
 */
function formatZodError(error: z.ZodError): string {
    const issues = error.issues.map((issue) => {
        const path = issue.path.length > 0 ? `[${issue.path.join('.')}] ` : '';
        return `${path}${issue.message}`;
    });
    return issues.join('; ');
}

/**
 * 通用校验函数工厂
 * @param schema - Zod Schema
 * @param entityName - 实体名称（用于错误信息）
 */
function createValidator<T extends z.ZodType>(
    schema: T,
    entityName: string
): (data: unknown) => ValidationResult<z.infer<T>> {
    return (data: unknown): ValidationResult<z.infer<T>> => {
        const result = schema.safeParse(data);

        if (result.success) {
            return {
                success: true,
                data: result.data,
            };
        }

        return {
            success: false,
            error: `${entityName}校验失败: ${formatZodError(result.error)}`,
            details: result.error,
        };
    };
}

// ═══════════════════════════════════════════════════════════════════
// 校验函数
// ═══════════════════════════════════════════════════════════════════

/**
 * 校验 Ollama Tags 响应
 * @param data - 原始响应数据
 * @returns 校验结果
 *
 * @example
 * const response = await fetch('/api/tags');
 * const json = await response.json();
 * const result = validateOllamaTagsResponse(json);
 * if (result.success) {
 *   console.log(result.data.models);
 * } else {
 *   console.error(result.error);
 * }
 */
export const validateOllamaTagsResponse = createValidator(
    OllamaTagsResponseSchema,
    'Ollama 模型列表'
);

/**
 * 校验 Ollama Generate 响应
 * @param data - 原始响应数据
 * @returns 校验结果
 *
 * @example
 * const response = await fetch('/api/generate', { method: 'POST', body: ... });
 * const json = await response.json();
 * const result = validateOllamaGenerateResponse(json);
 * if (result.success) {
 *   console.log(result.data.response);
 * } else {
 *   console.error(result.error);
 * }
 */
export const validateOllamaGenerateResponse = createValidator(
    OllamaGenerateResponseSchema,
    'Ollama 生成结果'
);

/**
 * 校验 Ollama 错误响应
 * @param data - 原始响应数据
 * @returns 校验结果
 */
export const validateOllamaErrorResponse = createValidator(
    OllamaErrorResponseSchema,
    'Ollama 错误'
);

// ═══════════════════════════════════════════════════════════════════
// 兼容性函数（保留旧 API）
// ═══════════════════════════════════════════════════════════════════

/**
 * 安全解析 Ollama Tags 响应
 * @deprecated 建议使用 validateOllamaTagsResponse 获取详细错误信息
 * @returns 解析结果或 null（校验失败时）
 */
export function parseOllamaTagsResponse(data: unknown): OllamaTagsResponse | null {
    const result = OllamaTagsResponseSchema.safeParse(data);
    return result.success ? result.data : null;
}

/**
 * 安全解析 Ollama Generate 响应
 * @deprecated 建议使用 validateOllamaGenerateResponse 获取详细错误信息
 * @returns 解析结果或 null（校验失败时）
 */
export function parseOllamaGenerateResponse(data: unknown): OllamaGenerateResponse | null {
    const result = OllamaGenerateResponseSchema.safeParse(data);
    return result.success ? result.data : null;
}

// ═══════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════

/**
 * 安全解析 JSON 并校验
 * @param json - JSON 字符串
 * @param validator - 校验函数
 * @returns 校验结果
 */
export function safeParseAndValidate<T>(
    json: string,
    validator: (data: unknown) => ValidationResult<T>
): ValidationResult<T> {
    try {
        const data = JSON.parse(json);
        return validator(data);
    } catch (e) {
        return {
            success: false,
            error: `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`,
        };
    }
}

/**
 * 判断响应是否为 Ollama 错误响应
 * @param data - 响应数据
 */
export function isOllamaError(data: unknown): data is OllamaErrorResponse {
    const result = OllamaErrorResponseSchema.safeParse(data);
    return result.success;
}

/**
 * 提取 Ollama 错误信息
 * @param data - 响应数据
 * @returns 错误信息，如果不是错误响应则返回 null
 */
export function extractOllamaError(data: unknown): string | null {
    if (isOllamaError(data)) {
        return data.error;
    }
    return null;
}
