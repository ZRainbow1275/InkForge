/**
 * InkForge 全局常量定义
 * 统一管理魔术字符串和默认值
 */

// ═══════════════════════════════════════════════════════════════════
// 从 Schema 导入核心状态常量（Single Source of Truth）
// ═══════════════════════════════════════════════════════════════════

export { ARTICLE_STATUS } from '@/schemas/article-status';
export type { ArticleStatusValue as ArticleStatus } from '@/schemas/article-status';

// ═══════════════════════════════════════════════════════════════════
// 预设相关
// ═══════════════════════════════════════════════════════════════════

/** 默认预设 ID */
export const DEFAULT_PRESET_ID = 'report' as const

// ═══════════════════════════════════════════════════════════════════
// 文档状态
// ═══════════════════════════════════════════════════════════════════

/** 文档状态枚举 */
export const DOCUMENT_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published'
} as const

export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS]

// ═══════════════════════════════════════════════════════════════════
// 默认值
// ═══════════════════════════════════════════════════════════════════

/** 应用默认值 */
export const DEFAULTS = {
    /** 手动添加资讯的默认分数 */
    MANUAL_ARTICLE_SCORE: 8.0,
    /** 长文阈值（字符数） */
    LONG_ARTICLE_THRESHOLD: 2000,
    /** 默认来源名称 */
    SOURCE_NAME: '手动添加'
} as const

// ═══════════════════════════════════════════════════════════════════
// 文章标签
// ═══════════════════════════════════════════════════════════════════

/** 文章标签常量 */
export const ARTICLE_TAGS = {
    NEW: '新增',
    HAS_AUTHOR: '有作者',
    HAS_IMAGES: '含图片',
    LONG_ARTICLE: '长文'
} as const

// ═══════════════════════════════════════════════════════════════════
// 版本相关
// ═══════════════════════════════════════════════════════════════════

/** 版本相关常量 */
export const VERSION = {
    /** 初始版本标签 */
    INITIAL_LABEL: 'v1',
    /** 初始版本描述 */
    INITIAL_DESCRIPTION: '初始版本',
    /** 新版本默认描述 */
    DEFAULT_DESCRIPTION: '新版本',
    /** 版本标签前缀 */
    LABEL_PREFIX: 'v',
    /**
     * 生成版本标签
     * @param versionNumber - 版本序号
     * @returns 格式化的版本标签，如 'v1', 'v2'
     */
    generateLabel: (versionNumber: number): string => `v${versionNumber}`
} as const

// ═══════════════════════════════════════════════════════════════════
// 编辑器相关
// ═══════════════════════════════════════════════════════════════════

/** 编辑器配置常量 */
export const EDITOR_CONFIG = {
    /** 保存状态显示延迟（毫秒） */
    SAVE_STATUS_DELAY_MS: 500,
} as const

// ═══════════════════════════════════════════════════════════════════
// 解析器相关（统一配置）
// ═══════════════════════════════════════════════════════════════════

/** 解析器配置常量（统一） */
export const PARSER_CONFIG = {
    /** 解析请求超时时间（毫秒） */
    TIMEOUT_MS: 10000,
    /** 最大重试次数 */
    MAX_RETRIES: 3,
    /** 初始重试延迟时间（毫秒），用于指数退避算法 */
    INITIAL_RETRY_DELAY_MS: 1000,
    /** 描述截断最大长度 */
    DESCRIPTION_MAX_LENGTH: 200,
    /** 内容截断最大长度 */
    CONTENT_MAX_LENGTH: 3000,
    /** 最大链接提取数量 */
    MAX_LINKS: 20,
    /** 最大图片提取数量 */
    MAX_IMAGES: 10,
} as const

// ═══════════════════════════════════════════════════════════════════
// 字体栈定义（Single Source of Truth）
// ═══════════════════════════════════════════════════════════════════

/**
 * 统一字体栈定义
 * 用于编辑器预览和导出，确保一致性
 */
export const FONT_STACKS = {
    /** 无衬线字体（默认） */
    sans: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif',
    /** 衬线字体 — CJK 字族优先，Latin 兜底。
     *  原顺序把 Georgia 排首位，会让有 Georgia 的环境用 Latin 字面的"逐字符回退"
     *  渲染中文，导致字号/字重错位（fidelity 任务 typography review v1 / v2 HIGH 项）。 */
    serif: '"Source Han Serif SC", "Noto Serif SC", "Source Han Serif CN", STSong, Georgia, "Times New Roman", Times, serif',
    /** 楷体 */
    kai: 'KaiTi, STKaiti, "AR PL UKai CN", "KaiTi_GB2312", serif',
    /** 仿宋 — Windows/macOS/Linux 均保留可读衬线回退 */
    fangsong: 'FangSong, STFangsong, "FangSong_GB2312", "Source Han Serif SC", "Noto Serif SC", serif',
    /** 文楷 — 优先使用开源霞鹜文楷，缺失时回退到系统楷体 */
    wenkai: '"LXGW WenKai Screen", "LXGW WenKai", "Klee One", KaiTi, STKaiti, serif',
    /** 现代人文无衬线 — 品牌字体不可用时安全回退到系统 UI 字体 */
    humanist: '"HarmonyOS Sans SC", MiSans, "OPPO Sans", "Alibaba PuHuiTi 3.0", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei UI", sans-serif',
    /** 等宽字体 */
    mono: '"Fira Code", "JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace'
} as const

export type FontFamily = keyof typeof FONT_STACKS
