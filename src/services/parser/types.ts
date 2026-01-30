/**
 * URL 解析服务 - 类型定义
 */

import { z } from 'zod'

/**
 * 解析结果接口
 */
export interface ParseResult {
    title: string
    description: string
    authors: string[]
    publishedAt?: Date
    rawContent: string
    links: string[]
    images: string[]
    sourceName: string
}

/**
 * 代理配置接口
 */
export interface ProxyConfig {
    /** 代理 URL 前缀 */
    url: string
    /** 是否为自建代理（安全） */
    isSelfHosted: boolean
}

/**
 * JSON-LD 结构化数据 Zod Schema（运行时校验）
 */
export const JsonLdAuthorSchema = z.object({
    name: z.string().optional()
}).passthrough()

export const JsonLdSchema = z.object({
    author: z.union([
        JsonLdAuthorSchema,
        z.array(JsonLdAuthorSchema)
    ]).optional(),
    datePublished: z.string().optional(),
    '@type': z.string().optional()
}).passthrough()

export type JsonLdData = z.infer<typeof JsonLdSchema>
