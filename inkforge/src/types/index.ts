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

/**
 * Preset persona - groups 17 presets into 4 visual identity families
 * Drives base font stack, decoration density, and color motif.
 */
export type PresetPersona = 'academic' | 'business' | 'lifestyle' | 'creative'

/**
 * Export target for preset decoration pipeline.
 * - 'preview' keeps full CSS3 (pseudo-elements, counters, calc, etc.)
 * - 'wechat' / 'xhs' / 'zhihu' must survive juice + platform CSS stripping
 */
export type ExportTarget = 'preview' | 'wechat' | 'xhs' | 'zhihu'

/**
 * Bilingual font stack for CJK + Latin pair.
 */
export interface FontSpec {
    /** CJK font family stack, e.g. "'Source Han Serif SC', 'Noto Serif SC', serif" */
    cjk: string
    /** Latin font family stack, e.g. "'EB Garamond', Georgia, serif" */
    latin: string
}

/**
 * A compact, user-visible account of the real visual decisions a preset makes.
 * The fields mirror the output categories covered by persona-distinction tests;
 * they are descriptive metadata, never a second rendering rule source.
 */
export interface PresetVisualSignature {
    /** Preset-owned masthead composition; descriptive metadata only. */
    masthead?: string
    rhythm: string
    heading: string
    quote: string
    divider: string
    media: string
    modules: readonly string[]
    /** Placement and treatment of optional song plus real reading metrics. */
    delivery?: string
    /** Preset-owned profile, CC, and colophon close. */
    ending?: string
}

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

    // ─── PR1 dual-track schema (optional, back-compat with customCSS) ──────
    /** Visual persona family - groups presets for shared base styles */
    persona?: PresetPersona
    /** Bilingual font pair (CJK + Latin) */
    fonts?: FontSpec
    /** Full CSS3 for preview pane (pseudo-elements, counters, gradients) */
    previewCSS?: string
    /** Juice-safe CSS subset for platform exports */
    exportCSS?: string
    /** Post-process function for export-time decoration injection */
    decorate?: (html: string, target: ExportTarget) => string
    /** Optional override of default sample content for empty-state preview */
    sampleContent?: string
    /** Visual signature derived from this preset's real CSS/decorator chain */
    visualSignature?: PresetVisualSignature
}

