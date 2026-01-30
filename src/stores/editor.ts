import { defineStore } from 'pinia'
import { ref, computed, watch, onScopeDispose } from 'vue'
import { EditedContentSchema, VersionSchema, type EditedContent, type Version } from '@/schemas/article'
import { contentRepository } from '@/services/repository'
import { useArticleStore } from './article'
import { logger, AppError } from '@/services/error'
import { EDITOR_CONFIG, VERSION } from '@/constants'
import { createEventSubscriptionManager } from '@/utils/events'
import { VERSION_MANAGEMENT } from '@/config/security'

export type EditorStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

/**
 * 编辑器 Store (FSM Refactored)
 * 状态驱动开发，严格校验输入输出
 */
export const useEditorStore = defineStore('editor', () => {
    const articleStore = useArticleStore()

    // 状态机核心
    const status = ref<EditorStatus>('idle')
    const currentContent = ref<EditedContent | null>(null)
    const error = ref<string | null>(null)

    // 保存请求 ID，用于防止竞态条件
    const saveRequestId = ref<number>(0)

    // 当前版本
    const currentVersion = computed(() => {
        if (!currentContent.value) return null
        return currentContent.value.versions.find(
            (v: Version) => v.id === currentContent.value!.currentVersionId
        ) || null
    })

    // 状态机转换
    function setStatus(newStatus: EditorStatus, errorMsg?: string) {
        status.value = newStatus
        if (errorMsg) {
            error.value = errorMsg
        } else if (newStatus !== 'error') {
            error.value = null
        }
    }

    // 监听选中的资讯，加载或创建编辑内容
    watch(() => articleStore.selectedArticleId, async (articleId: string | null) => {
        if (!articleId) {
            setStatus('idle')
            currentContent.value = null
            return
        }

        setStatus('loading')
        try {
            // 尝试加载已有内容
            const existing = await contentRepository.findByArticleId(articleId)

            if (existing) {
                // 运行时校验: 确保 DB 数据符合 Schema (防腐层)
                try {
                    const parsed = EditedContentSchema.parse(existing);
                    currentContent.value = parsed;
                    setStatus('ready')
                } catch (validationError) {
                    logger.error("数据完整性错误", validationError);
                    setStatus('error', "数据校验失败: 数据库内容已损坏");
                    return; // 校验失败后必须返回，避免继续执行
                }
            } else {
                // 创建新的编辑内容
                const article = articleStore.selectedArticle
                if (article) {
                    await createContent(article.id, article.title, article.description)
                } else {
                    setStatus('error', "无法找到对应的文章元数据")
                }
            }
        } catch (err) {
            const msg = err instanceof AppError ? err.toUserMessage() : '加载内容失败'
            logger.error('加载编辑内容失败', err, { articleId })
            setStatus('error', msg)
        }
    }, { immediate: true })

    // 创建新的编辑内容
    async function createContent(articleId: string, title: string, body: string) {
        try {
            const versionId = crypto.randomUUID();
            const now = new Date();

            const version = {
                id: versionId,
                label: VERSION.INITIAL_LABEL,
                title,
                body,
                transcript: '',
                createdAt: now
            };

            const content = {
                id: crypto.randomUUID(),
                articleId,
                title,
                body,
                transcript: '',
                selectedLinks: [],
                selectedImages: [],
                versions: [version],
                currentVersionId: versionId,
                createdAt: now,
                updatedAt: now
            };

            // Pre-Validate creation
            const validatedContent = EditedContentSchema.parse(content);

            await contentRepository.create(validatedContent)
            currentContent.value = validatedContent
            setStatus('ready')
            return validatedContent
        } catch (e) {
            logger.error('创建内容失败', e);
            setStatus('error', '无法初始化编辑器状态');
            throw e;
        }
    }

    // 更新内容
    async function updateContent(updates: { title?: string; body?: string; transcript?: string }) {
        if (status.value !== 'ready' && status.value !== 'saving') return
        if (!currentContent.value) return

        // 生成新的请求 ID，用于防止竞态条件
        const currentRequestId = ++saveRequestId.value
        setStatus('saving')

        try {
            const updated = {
                ...currentContent.value,
                ...updates,
                updatedAt: new Date()
            }

            // Validate before saving
            const validated = EditedContentSchema.parse(updated);

            await contentRepository.update(validated.id, validated)
            currentContent.value = validated

            // Delay to show saving state (UX)
            // 使用捕获的请求 ID 验证，防止竞态条件
            const capturedId = currentRequestId
            setTimeout(() => {
                // 只有当这是最新的保存请求时才更新状态
                if (status.value === 'saving' && saveRequestId.value === capturedId) {
                    setStatus('ready')
                }
            }, EDITOR_CONFIG.SAVE_STATUS_DELAY_MS)

        } catch (err) {
            const msg = err instanceof AppError ? err.toUserMessage() : '保存失败'
            logger.error('保存编辑内容失败', err)
            setStatus('error', '保存失败: ' + msg)
            // Revert status manually if needed, but error state is safer
        }
    }

    // 创建新版本（带版本数量上限检查）
    async function createVersion(): Promise<Version | null> {
        if (!currentContent.value) return null

        const currentVersionCount = currentContent.value.versions.length
        const maxVersions = VERSION_MANAGEMENT.MAX_VERSIONS_PER_DOCUMENT
        const warningThreshold = VERSION_MANAGEMENT.VERSION_WARNING_THRESHOLD

        // 检查是否达到版本数量上限
        if (currentVersionCount >= maxVersions) {
            // 查找最旧的非当前版本进行删除
            const oldestNonCurrentIndex = currentContent.value.versions.findIndex(
                v => v.id !== currentContent.value!.currentVersionId
            )

            if (oldestNonCurrentIndex !== -1) {
                const deletedVersion = currentContent.value.versions[oldestNonCurrentIndex]
                logger.warn('版本数量已达上限，自动删除最旧的非当前版本', {
                    currentCount: currentVersionCount,
                    maxVersions,
                    deletedVersionId: deletedVersion.id,
                    deletedVersionLabel: deletedVersion.label
                })
                // 不可变删除：创建新数组排除被删除的版本
                currentContent.value = {
                    ...currentContent.value,
                    versions: [
                        ...currentContent.value.versions.slice(0, oldestNonCurrentIndex),
                        ...currentContent.value.versions.slice(oldestNonCurrentIndex + 1)
                    ]
                }
            } else {
                // 所有版本都是当前版本（理论上不可能，但防御性处理）
                logger.error('版本管理异常：所有版本都是当前版本，无法删除', {
                    currentCount: currentVersionCount,
                    maxVersions
                })
                throw new Error('版本数量已达上限且无法自动清理，请手动删除旧版本')
            }
        } else if (currentVersionCount >= maxVersions * warningThreshold) {
            // 接近上限时发出警告
            logger.info('版本数量接近上限', {
                currentCount: currentVersionCount,
                maxVersions,
                warningThreshold: `${warningThreshold * 100}%`
            })
        }

        const versionNumber = currentContent.value.versions.length + 1
        const version = {
            id: crypto.randomUUID(),
            label: VERSION.generateLabel(versionNumber),
            title: currentContent.value.title,
            body: currentContent.value.body,
            transcript: currentContent.value.transcript,
            createdAt: new Date()
        }

        // Zod check
        const validatedVersion = VersionSchema.parse(version);

        // 不可变更新：创建新对象用于持久化
        const updatedContent = {
            ...currentContent.value,
            versions: [...currentContent.value.versions, validatedVersion],
            currentVersionId: validatedVersion.id
        }

        // 先持久化，成功后再更新本地状态（避免不一致）
        await contentRepository.update(updatedContent.id, updatedContent)
        currentContent.value = updatedContent
        return validatedVersion
    }

    // 切换版本（不可变更新）
    async function switchVersion(versionId: string) {
        if (!currentContent.value) return

        const version = currentContent.value.versions.find((v: Version) => v.id === versionId)
        if (!version) return

        // 使用不可变更新模式
        const updated = {
            ...currentContent.value,
            currentVersionId: versionId,
            title: version.title,
            body: version.body,
            transcript: version.transcript,
            updatedAt: new Date()
        }

        // 先持久化，成功后再更新本地状态（避免竞态条件）
        await contentRepository.update(updated.id, updated)
        currentContent.value = updated
    }

    // 更新选中的链接（不可变更新）
    async function updateSelectedLinks(links: string[]) {
        if (!currentContent.value) return

        // 先持久化
        await contentRepository.update(currentContent.value.id, { selectedLinks: links })

        // 成功后更新本地状态（不可变）
        currentContent.value = {
            ...currentContent.value,
            selectedLinks: links
        }
    }

    // 更新选中的图片（不可变更新）
    async function updateSelectedImages(images: string[]) {
        if (!currentContent.value) return

        // 先持久化
        await contentRepository.update(currentContent.value.id, { selectedImages: images })

        // 成功后更新本地状态（不可变）
        currentContent.value = {
            ...currentContent.value,
            selectedImages: images
        }
    }

    // 页面关闭时如果正在保存，提示用户
    // 使用命名函数以便清理
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (status.value === 'saving') {
            e.preventDefault()
            e.returnValue = '正在保存中，确定要离开吗？'
            return e.returnValue
        }
    }

    // 事件订阅管理器
    const eventManager = createEventSubscriptionManager()

    // 注册 beforeunload 监听器
    if (typeof window !== 'undefined') {
        eventManager.addEventListener(window, 'beforeunload', handleBeforeUnload)
    }

    /**
     * 显式清理 Store 资源
     * 由于 Pinia Store 是单例，onScopeDispose 可能永远不会触发
     * 组件应在适当时机调用此方法（如应用卸载时）
     */
    function cleanup() {
        eventManager.dispose()
        logger.info('Editor store 事件监听器已清理')
    }

    return {
        // State
        status, // Expose status machine
        currentContent,
        error,

        // Getters
        currentVersion,
        isReady: computed(() => status.value === 'ready' || status.value === 'saving'),
        isSaving: computed(() => status.value === 'saving'),

        // Actions
        createContent,
        updateContent,
        createVersion,
        switchVersion,
        updateSelectedLinks,
        updateSelectedImages,

        // Lifecycle
        cleanup
    }
})
