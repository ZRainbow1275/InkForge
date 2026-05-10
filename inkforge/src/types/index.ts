/**
 * InkForge 核心类型定义
 *
 * 架构原则：
 * - schemas/article.ts 为单一类型真相源 (Single Source of Truth)
 * - 此文件仅做 re-export，不重复定义
 * - DTO 类型从 Schema 推断（确保运行时与编译时类型一致）
 */

// ═══════════════════════════════════════════════════════════════════
// 从 Schema 统一导出核心类型
// ═══════════════════════════════════════════════════════════════════

export type {
    Article,
    Category,
    EditedContent,
    Version,
    ArticleStatus
} from '@/schemas/article';

export type {
    Tag,
    TagRecord,
    DocTag,
    DocTagRecord,
    TagCloudNode,
    TagColorPreset,
    TagFilterMode,
    TagSortField,
    TagSortDirection,
    CreateTagParams,
    UpdateTagParams,
    MergeTagsParams
} from '@/services/tag-system';

// ═══════════════════════════════════════════════════════════════════
// 从 Schema 统一导出 DTO 类型（运行时校验边界）
// ═══════════════════════════════════════════════════════════════════

export type {
    CreateArticleDTO,
    UpdateArticleDTO,
    CreateCategoryDTO,
    UpdateCategoryDTO
} from '@/schemas/article';

// ═══════════════════════════════════════════════════════════════════
// 导出预设类型
// ═══════════════════════════════════════════════════════════════════

export interface ExportPreset {
    id: string
    name: string
    icon: string
    description: string

    // 样式配置
    theme: string
    fontFamily: string
    fontSize: string
    primaryColor: string

    // 开关
    isUseIndent: boolean
    isUseJustify: boolean

    // 自定义CSS
    customCSS?: string
}

