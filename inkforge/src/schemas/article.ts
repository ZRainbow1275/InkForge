import { z } from 'zod';
import { ARTICLE_STATUS } from './article-status';

export { ARTICLE_STATUS } from './article-status';

/**
 * Zod Schema Definitions
 * 单一类型真相源 (Single Source of Truth)
 *
 * 架构原则：
 * - 所有核心业务类型定义以此文件为准
 * - types/index.ts 仅做 re-export
 * - 运行时校验与编译时类型保持一致
 * - constants/ 中的状态常量从此处派生
 */

// ═══════════════════════════════════════════════════════════════════
// 核心常量定义（Single Source of Truth）
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// Shared Schemas
// ═══════════════════════════════════════════════════════════════════

export const TimestampSchema = z.union([z.date(), z.string(), z.number()])
    .transform((val) => new Date(val));

/** UUID Schema（严格模式） */
export const UUIDSchema = z.string().uuid();

// ═══════════════════════════════════════════════════════════════════
// Article Status Schema
// ═══════════════════════════════════════════════════════════════════

export const ArticleStatusSchema = z.enum([
    ARTICLE_STATUS.DRAFT,
    ARTICLE_STATUS.WRITING,
    ARTICLE_STATUS.UNDER_REVIEW,
    ARTICLE_STATUS.READY_TO_PUBLISH,
    ARTICLE_STATUS.PUBLISHED,
    ARTICLE_STATUS.ARCHIVED,
    ARTICLE_STATUS.TRASHED,
    ARTICLE_STATUS.NEW,
    ARTICLE_STATUS.READ,
    ARTICLE_STATUS.PROCESSED
]);

export type ArticleStatus = z.infer<typeof ArticleStatusSchema>;

export const VersionTriggerSchema = z.enum([
    'manual_save',
    'interval',
    'before_close',
    'mode_switch',
    'crash_recovery'
]);

export type VersionTrigger = z.infer<typeof VersionTriggerSchema>;

// ═══════════════════════════════════════════════════════════════════
// Version Schema
// ═══════════════════════════════════════════════════════════════════

export const VersionSchema = z.object({
    id: UUIDSchema,
    label: z.string().min(1, 'Version label represents the version name'),
    title: z.string(),
    body: z.string(), // TipTap HTML
    transcript: z.string(),
    createdAt: TimestampSchema,
    deltaChars: z.number().int().optional(),
    wordCount: z.number().int().nonnegative().optional(),
    isMilestone: z.boolean().optional(),
    trigger: VersionTriggerSchema.optional(),
    authorId: z.string().min(1).optional(),
    updatedAt: TimestampSchema.optional()
});

// ═══════════════════════════════════════════════════════════════════
// Edited Content Schema
// ═══════════════════════════════════════════════════════════════════

export const EditedContentSchema = z.object({
    id: UUIDSchema,
    articleId: UUIDSchema,
    title: z.string(),
    body: z.string(),
    transcript: z.string(),
    selectedLinks: z.array(z.string()),
    selectedImages: z.array(z.string()),
    versions: z.array(VersionSchema),
    currentVersionId: UUIDSchema,
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema
}).refine((data) => {
    // Integrity Check: currentVersionId must exist in versions
    return data.versions.some(v => v.id === data.currentVersionId);
}, {
    message: import.meta.env.PROD
        ? "数据校验失败"
        : "Data Integrity Error: currentVersionId does not exist in versions array",
    path: ["currentVersionId"]
});

// ═══════════════════════════════════════════════════════════════════
// Category Schema
// ═══════════════════════════════════════════════════════════════════

export const CategorySchema = z.object({
    id: UUIDSchema,
    name: z.string().min(1, 'Category name is required'),
    icon: z.string().optional(),
    articleCount: z.number().int().min(0).default(0),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
});

// ═══════════════════════════════════════════════════════════════════
// Article Schema
// ═══════════════════════════════════════════════════════════════════

export const ArticleSchema = z.object({
    id: UUIDSchema,
    categoryId: UUIDSchema.nullable(),
    sourceUrl: z.string(),
    sourceName: z.string(),
    title: z.string().min(1, 'Article title is required'),
    description: z.string(),

    // 元数据
    authors: z.array(z.string()),
    publishedAt: TimestampSchema.optional(),

    // 解析内容
    rawContent: z.string(),

    // Markdown 权威模型（0420/10 baseline）
    markdownSource: z.string().default(''),
    htmlCache: z.string().nullable().default(null),
    sourceHash: z.string().default(''),
    cacheVersion: z.number().int().nonnegative().default(0),
    cacheGeneratedAt: TimestampSchema.nullable().default(null),

    links: z.array(z.string()),
    images: z.array(z.string()),

    // AI 内容
    aiSummary: z.string().optional(),

    // 状态
    score: z.number(),
    tags: z.array(z.string()),
    status: ArticleStatusSchema,
    deletedAt: TimestampSchema.nullable().optional(),
    expiresAt: TimestampSchema.nullable().optional(),
    deletedBy: z.string().nullable().optional(),
    preTrashStatus: ArticleStatusSchema.nullable().optional(),

    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
});

// ═══════════════════════════════════════════════════════════════════
// Type Exports（从 Schema 推断）
// ═══════════════════════════════════════════════════════════════════

export type Category = z.infer<typeof CategorySchema>;
export type Version = z.infer<typeof VersionSchema>;
export type EditedContent = z.infer<typeof EditedContentSchema>;
export type Article = z.infer<typeof ArticleSchema>;

// ═══════════════════════════════════════════════════════════════════
// DTO Schemas（输入验证边界）
// ═══════════════════════════════════════════════════════════════════

/**
 * 手动创建资讯的输入 Schema
 * 用于 Store Action 入口的运行时校验
 */
export const CreateArticleDTOSchema = z.object({
    categoryId: z.string().uuid().nullable().optional(),
    /** 来源 URL 或本地路径标识（文件导入场景允许非 URL 格式） */
    sourceUrl: z.string().min(1, '来源不能为空'),
    sourceName: z.string().optional(),
    title: z.string().min(1, '标题不能为空'),
    description: z.string().optional(),
    authors: z.array(z.string()).optional(),
    rawContent: z.string().optional(),
    links: z.array(z.string().url()).optional(),
    /** 图片引用列表（支持 URL 和本地路径） */
    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    status: ArticleStatusSchema.optional(),
});

/**
 * 更新资讯的输入 Schema
 * 仅允许特定字段更新
 */
export const UpdateArticleDTOSchema = z.object({
    title: z.string().min(1, '标题不能为空').optional(),
    description: z.string().optional(),
    status: ArticleStatusSchema.optional(),
    tags: z.array(z.string()).optional(),
    aiSummary: z.string().optional(),
    rawContent: z.string().optional(),
});

/**
 * 创建分类的输入 Schema
 */
export const CreateCategoryDTOSchema = z.object({
    name: z.string().min(1, '分类名称不能为空'),
    icon: z.string().optional(),
});

/**
 * 更新分类的输入 Schema
 */
export const UpdateCategoryDTOSchema = z.object({
    name: z.string().min(1, '分类名称不能为空').optional(),
    icon: z.string().optional(),
});

// DTO 类型导出（从 Schema 推断）
export type CreateArticleDTO = z.infer<typeof CreateArticleDTOSchema>;
export type UpdateArticleDTO = z.infer<typeof UpdateArticleDTOSchema>;
export type CreateCategoryDTO = z.infer<typeof CreateCategoryDTOSchema>;
export type UpdateCategoryDTO = z.infer<typeof UpdateCategoryDTOSchema>;

// ═══════════════════════════════════════════════════════════════════
// Document Schemas（文档管理）
// ═══════════════════════════════════════════════════════════════════

/** 文档状态 */
export const DocumentStatusSchema = z.enum(['draft', 'published']);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

/**
 * 创建文档的输入 Schema
 * 用于 createDocument 函数的运行时校验
 */
export const CreateDocumentDTOSchema = z.object({
    title: z.string()
        .min(1, '文档标题不能为空')
        .max(200, '文档标题不能超过 200 个字符')
        .trim(),
    content: z.string()
        .max(500_000, '文档内容不能超过 500,000 个字符')
        .optional()
        .default(''),
});

export type CreateDocumentDTO = z.infer<typeof CreateDocumentDTOSchema>;
