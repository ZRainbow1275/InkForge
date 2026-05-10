/**
 * 版本管理 Composable
 * 提供自动快照、版本差异对比等功能
 *
 * 设计原则：
 * - 依赖 editor store 的现有版本管理 API
 * - 不直接操作持久化，一切通过 store action
 * - 自动快照可配置、可暂停
 */

import { ref, computed, watch, onUnmounted, type Ref } from 'vue'
import type { Version, VersionTrigger } from '@/schemas/article'
import { logger } from '@/services/error'
import { contentRepository } from '@/services/repository'

// ═══════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════

/** Diff 行类型 */
export interface DiffLine {
    type: 'added' | 'removed' | 'unchanged'
    content: string
    lineNumber?: number
}

/** Diff 统计摘要 */
export interface DiffSummary {
    addedCount: number
    removedCount: number
    unchangedCount: number
}

/** 版本元数据 */
export interface VersionMeta {
    id: string
    label: string
    wordCount: number
    createdAt: Date
    isAuto: boolean
}

/** 自动快照配置 */
export interface AutoSnapshotConfig {
    /** 自动快照间隔（毫秒），默认 5 分钟 */
    intervalMs: number
    /** 是否启用自动快照 */
    enabled: boolean
    /** 自动快照保留数量上限 */
    maxBackups: number
}

/** Editor Store 接口（仅声明本 composable 所需的最小契约） */
interface EditorStoreContract {
    currentContent: {
        id: string
        body: string
        title: string
        versions: Version[]
        currentVersionId: string
    } | null
    currentVersion: Version | null
    createVersion: (trigger?: VersionTrigger, label?: string) => Promise<Version | null>
    switchVersion: (versionId: string) => Promise<void>
}

// ═══════════════════════════════════════════════════════════════════
// Diff 算法
// ═══════════════════════════════════════════════════════════════════

/**
 * 计算两段文本的逐行差异
 * 使用 LCS（最长公共子序列）简化版本：O(n*m) 时间复杂度
 * 对于编辑器场景的文本体量（通常 <5000 行）足够高效
 *
 * @param oldText - 旧版本文本
 * @param newText - 新版本文本
 * @returns DiffLine 数组
 */
export function computeDiff(oldText: string, newText: string): DiffLine[] {
    const oldLines = oldText.split('\n')
    const newLines = newText.split('\n')

    // 构建 LCS 表
    const m = oldLines.length
    const n = newLines.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
            }
        }
    }

    // 回溯构建 diff
    const result: DiffLine[] = []
    let i = m
    let j = n

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            result.push({
                type: 'unchanged',
                content: oldLines[i - 1],
                lineNumber: j,
            })
            i--
            j--
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.push({
                type: 'added',
                content: newLines[j - 1],
                lineNumber: j,
            })
            j--
        } else if (i > 0) {
            result.push({
                type: 'removed',
                content: oldLines[i - 1],
                lineNumber: i,
            })
            i--
        }
    }

    return result.reverse()
}

/**
 * 从 DiffLine 数组计算统计摘要
 */
export function computeDiffSummary(lines: DiffLine[]): DiffSummary {
    let addedCount = 0
    let removedCount = 0
    let unchangedCount = 0

    for (const line of lines) {
        switch (line.type) {
            case 'added':
                addedCount++
                break
            case 'removed':
                removedCount++
                break
            case 'unchanged':
                unchangedCount++
                break
        }
    }

    return { addedCount, removedCount, unchangedCount }
}

// ═══════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════

/** 中文字符正则 */
const CHINESE_CHAR_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g

/** 英文单词正则 */
const ENGLISH_WORD_RE = /[a-zA-Z]+(?:[''][a-zA-Z]+)*/g

/**
 * 计算文本字数（中文字符 + 英文单词）
 */
function countWords(text: string): number {
    const plainText = text.replace(/<[^>]*>/g, '')
    const chineseMatches = plainText.match(CHINESE_CHAR_RE)
    const englishMatches = plainText.match(ENGLISH_WORD_RE)
    return (chineseMatches?.length ?? 0) + (englishMatches?.length ?? 0)
}

/**
 * 生成自动快照标签
 * 格式：auto-MMDD-HHmm
 */
function generateAutoLabel(): string {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `auto-${month}${day}-${hours}${minutes}`
}

/**
 * 判断版本标签是否为自动生成
 */
export function isAutoVersion(label: string): boolean {
    return /^auto-\d{4}-\d{4}$/.test(label)
}

// ═══════════════════════════════════════════════════════════════════
// 默认配置
// ═══════════════════════════════════════════════════════════════════

/** 默认自动快照间隔：5 分钟 */
const DEFAULT_AUTO_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000
const MIN_AUTO_SNAPSHOT_INTERVAL_MS = 1000
const DEFAULT_MAX_AUTO_BACKUPS = 5

function normalizeAutoSnapshotIntervalMs(value: number | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return DEFAULT_AUTO_SNAPSHOT_INTERVAL_MS
    }

    return Math.max(MIN_AUTO_SNAPSHOT_INTERVAL_MS, Math.trunc(value))
}

function normalizeAutoSnapshotMaxBackups(value: number | undefined): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return DEFAULT_MAX_AUTO_BACKUPS
    }

    return Math.max(1, Math.trunc(value))
}

// ═══════════════════════════════════════════════════════════════════
// Composable
// ═══════════════════════════════════════════════════════════════════

/**
 * 版本管理 Composable
 *
 * @param editorStore - editor store 实例（reactive）
 * @param config - 自动快照配置（可选）
 */
export function useVersionManager(
    editorStore: Ref<EditorStoreContract> | EditorStoreContract,
    config?: Partial<AutoSnapshotConfig>
) {
    // 解包 ref
    const getStore = (): EditorStoreContract => {
        return 'value' in editorStore ? editorStore.value : editorStore
    }

    // ─── 自动快照配置 ─────────────────────────────────────────
    const autoSnapshotConfig = ref<AutoSnapshotConfig>({
        intervalMs: normalizeAutoSnapshotIntervalMs(config?.intervalMs),
        enabled: config?.enabled ?? true,
        maxBackups: normalizeAutoSnapshotMaxBackups(config?.maxBackups),
    })

    let autoSnapshotTimer: ReturnType<typeof setInterval> | null = null

    // 上次快照时的 body 内容，用于判断是否有变更
    let lastSnapshotBody: string | null = null

    /**
     * 执行自动快照
     * 仅当内容发生变化时才创建版本
     */
    async function performAutoSnapshot(): Promise<void> {
        const store = getStore()
        if (!store.currentContent) return

        const currentBody = store.currentContent.body

        // 内容未变化，跳过
        if (lastSnapshotBody !== null && lastSnapshotBody === currentBody) {
            logger.debug('自动快照：内容未变化，跳过')
            return
        }

        try {
            const autoLabel = generateAutoLabel()
            const version = await store.createVersion('interval', autoLabel)
            if (version) {
                const currentContent = store.currentContent
                if (currentContent) {
                    version.label = autoLabel
                    const labeledVersions = currentContent.versions.map((item) =>
                        item.id === version.id
                            ? { ...item, label: autoLabel }
                            : item
                    )

                    const autoVersions = labeledVersions
                        .filter(item => isAutoVersion(item.label))
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

                    const overflowCount = Math.max(0, autoVersions.length - autoSnapshotConfig.value.maxBackups)
                    const overflowIds = new Set(autoVersions.slice(0, overflowCount).map(item => item.id))
                    const prunedVersions = labeledVersions.filter(item => !overflowIds.has(item.id))

                    currentContent.versions = prunedVersions
                    await contentRepository.update(currentContent.id, {
                        versions: prunedVersions,
                    })
                }

                lastSnapshotBody = currentBody
                logger.info('自动快照创建成功', {
                    versionId: version.id,
                    label: version.label,
                })
            }
        } catch (err) {
            logger.error('自动快照失败', err instanceof Error ? err : new Error(String(err)))
        }
    }

    /**
     * 启动自动快照定时器
     */
    function startAutoSnapshot(): void {
        stopAutoSnapshot()

        if (!autoSnapshotConfig.value.enabled) return

        // 记录当前内容作为基准
        const store = getStore()
        if (store.currentContent) {
            lastSnapshotBody = store.currentContent.body
        }

        autoSnapshotTimer = setInterval(
            () => { void performAutoSnapshot() },
            autoSnapshotConfig.value.intervalMs
        )

        logger.info('自动快照已启动', {
            intervalMs: String(autoSnapshotConfig.value.intervalMs),
        })
    }

    /**
     * 停止自动快照定时器
     */
    function stopAutoSnapshot(): void {
        if (autoSnapshotTimer !== null) {
            clearInterval(autoSnapshotTimer)
            autoSnapshotTimer = null
            logger.info('自动快照已停止')
        }
    }

    /**
     * 更新自动快照配置
     */
    function updateAutoSnapshotConfig(newConfig: Partial<AutoSnapshotConfig>): void {
        const wasEnabled = autoSnapshotConfig.value.enabled

        if (newConfig.intervalMs !== undefined) {
            autoSnapshotConfig.value.intervalMs = normalizeAutoSnapshotIntervalMs(newConfig.intervalMs)
        }
        if (newConfig.enabled !== undefined) {
            autoSnapshotConfig.value.enabled = newConfig.enabled
        }
        if (newConfig.maxBackups !== undefined) {
            autoSnapshotConfig.value.maxBackups = normalizeAutoSnapshotMaxBackups(newConfig.maxBackups)
        }

        // 如果配置发生变化，重新启动定时器
        if (autoSnapshotConfig.value.enabled) {
            startAutoSnapshot()
        } else if (wasEnabled) {
            stopAutoSnapshot()
        }
    }

    // ─── 版本列表与元数据 ─────────────────────────────────────

    /**
     * 按时间倒序的版本列表（带元数据）
     */
    const versionList = computed<VersionMeta[]>(() => {
        const store = getStore()
        if (!store.currentContent) return []

        return [...store.currentContent.versions]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((v) => ({
                id: v.id,
                label: v.label,
                wordCount: countWords(v.body),
                createdAt: new Date(v.createdAt),
                isAuto: isAutoVersion(v.label),
            }))
    })

    /**
     * 当前版本 ID
     */
    const currentVersionId = computed<string | null>(() => {
        const store = getStore()
        return store.currentContent?.currentVersionId ?? null
    })

    // ─── Diff 功能 ────────────────────────────────────────────

    /**
     * 获取指定 ID 的版本
     */
    function getVersionById(versionId: string): Version | null {
        const store = getStore()
        if (!store.currentContent) return null
        return store.currentContent.versions.find((v) => v.id === versionId) ?? null
    }

    /**
     * 当前内容与指定版本的差异
     */
    function diffWithVersion(versionId: string): DiffLine[] {
        const store = getStore()
        if (!store.currentContent) return []

        const targetVersion = getVersionById(versionId)
        if (!targetVersion) return []

        return computeDiff(targetVersion.body, store.currentContent.body)
    }

    /**
     * 对比两个版本之间的差异
     */
    function diffBetween(oldVersionId: string, newVersionId: string): DiffLine[] {
        const oldVersion = getVersionById(oldVersionId)
        const newVersion = getVersionById(newVersionId)

        if (!oldVersion || !newVersion) return []

        return computeDiff(oldVersion.body, newVersion.body)
    }

    // ─── 手动创建版本（带自定义标签） ─────────────────────────

    /**
     * 创建手动版本
     * 通过 store.createVersion() 创建后，若提供自定义标签，
     * 会通过覆盖 label 来更新（依赖 store 的不可变更新模式）
     *
     * 注意：由于不修改 store 文件的约束，此处直接调用 store.createVersion()
     * 自定义标签会在 store 创建后通过 currentContent 的不可变更新来应用
     */
    async function createManualVersion(customLabel?: string): Promise<Version | null> {
        const store = getStore()
        const autoLabel = generateAutoLabel()
            const version = await store.createVersion('interval', autoLabel)

        if (version && customLabel && customLabel.trim().length > 0) {
            // 通过不可变方式更新版本标签
            if (store.currentContent) {
                const updatedVersions = store.currentContent.versions.map((v) =>
                    v.id === version.id ? { ...v, label: customLabel.trim() } : v
                )
                store.currentContent.versions = updatedVersions
                version.label = customLabel.trim()
                await contentRepository.update(store.currentContent.id, {
                    versions: updatedVersions,
                })
            }
        }

        // 更新 lastSnapshotBody 防止自动快照重复
        if (version && store.currentContent) {
            lastSnapshotBody = store.currentContent.body
        }

        return version
    }

    // ─── 自动生命周期管理 ─────────────────────────────────────

    // 监听 currentContent 变化，自动启停快照
    const stopWatcher = watch(
        () => getStore().currentContent,
        (content) => {
            if (content && autoSnapshotConfig.value.enabled) {
                startAutoSnapshot()
            } else {
                stopAutoSnapshot()
            }
        },
        { immediate: true }
    )

    // ─── 生成自动标签（暴露给外部使用） ──────────────────────

    // 组件卸载时自动清理
    onUnmounted(() => {
        stopAutoSnapshot()
        stopWatcher()
    })

    return {
        // 配置
        autoSnapshotConfig,
        updateAutoSnapshotConfig,

        // 自动快照控制
        startAutoSnapshot,
        stopAutoSnapshot,

        // 版本列表
        versionList,
        currentVersionId,

        // 版本创建
        createManualVersion,

        // Diff
        diffWithVersion,
        diffBetween,
        computeDiffSummary,
        getVersionById,

        // 工具
        generateAutoLabel,
        isAutoVersion,
    }
}
