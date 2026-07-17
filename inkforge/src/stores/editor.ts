import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { EditedContentSchema, type EditedContent, type Version, type VersionTrigger } from '@/schemas/article'
import { contentRepository } from '@/services/repository'
import { useArticleStore } from './article'
import { logger, AppError } from '@/services/error'
import { ARTICLE_STATUS, EDITOR_CONFIG, VERSION } from '@/constants'
import { createEventSubscriptionManager } from '@/utils/events'
import { buildVersionSnapshot } from '@/services/version-bundle'
import { VERSION_MANAGEMENT } from '@/config/security'
import { generateId } from '@/utils/uuid'
import { isLikelyHtmlContent, serializeHtmlToMarkdown } from '@/extensions/TyporaMode'
import {
    createRecoveryPoint,
    getCurrentProfileId,
    getOrCreateWindowId,
    updateCachedEmergencySnapshot,
    writeEmergencyPayloadSync,
} from '@/services/crash-recovery'

export type EditorStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error';

function normalizeMarkdownBody(body: string): string {
    return isLikelyHtmlContent(body) ? serializeHtmlToMarkdown(body) : body
}

function normalizeVersion(version: Version): Version {
    const normalizedBody = normalizeMarkdownBody(version.body)
    return normalizedBody === version.body
        ? version
        : { ...version, body: normalizedBody }
}

function normalizeEditedContent(content: EditedContent): EditedContent {
    const normalizedBody = normalizeMarkdownBody(content.body)
    const normalizedVersions = content.versions.map(normalizeVersion)

    if (
        normalizedBody === content.body &&
        normalizedVersions.every((version, index) => version === content.versions[index])
    ) {
        return content
    }

    return {
        ...content,
        body: normalizedBody,
        versions: normalizedVersions,
    }
}

/**
 * 缂栬緫鍣?Store (FSM Refactored)
 * 鐘舵€侀┍鍔ㄥ紑鍙戯紝涓ユ牸鏍￠獙杈撳叆杈撳嚭
 */
export const useEditorStore = defineStore('editor', () => {
    const articleStore = useArticleStore()

    // 鐘舵€佹満鏍稿績
    const status = ref<EditorStatus>('idle')
    const currentContent = ref<EditedContent | null>(null)
    const error = ref<string | null>(null)

    // 淇濆瓨璇锋眰 ID锛岀敤浜庨槻姝㈢珵鎬佹潯浠?
    const saveRequestId = ref<number>(0)
    let contentWriteQueue: Promise<void> = Promise.resolve()

    function enqueueContentWrite<T>(operation: () => Promise<T>): Promise<T> {
        const result = contentWriteQueue.then(operation)
        contentWriteQueue = result.then(() => undefined, () => undefined)
        return result
    }

    async function resolveQueuedContent(contentId: string): Promise<EditedContent | null> {
        if (currentContent.value?.id === contentId) {
            return currentContent.value
        }

        const persisted = await contentRepository.findById(contentId)
        return persisted ? normalizeEditedContent(EditedContentSchema.parse(persisted)) : null
    }

    // 褰撳墠鐗堟湰
    const currentVersion = computed(() => {
        if (!currentContent.value) return null
        return currentContent.value.versions.find(
            (v: Version) => v.id === currentContent.value!.currentVersionId
        ) || null
    })

    // 鐘舵€佹満杞崲
    function setStatus(newStatus: EditorStatus, errorMsg?: string) {
        status.value = newStatus
        if (errorMsg) {
            error.value = errorMsg
        } else if (newStatus !== 'error') {
            error.value = null
        }
    }

    async function syncArticleSnapshot(articleId: string, snapshot: Pick<EditedContent, 'title' | 'body'>) {
        const targetArticle = articleStore.articles.find(article => article.id === articleId)
        if (!targetArticle) return

        const articleUpdates: { title?: string; rawContent?: string; status?: typeof ARTICLE_STATUS[keyof typeof ARTICLE_STATUS] } = {}

        if (snapshot.title && snapshot.title !== targetArticle.title) {
            articleUpdates.title = snapshot.title
        }

        if (snapshot.body !== targetArticle.rawContent) {
            articleUpdates.rawContent = snapshot.body
        }

        if (
            Object.keys(articleUpdates).length > 0 &&
            (targetArticle.status === ARTICLE_STATUS.NEW || targetArticle.status === ARTICLE_STATUS.READ)
        ) {
            articleUpdates.status = ARTICLE_STATUS.DRAFT
        }

        if (Object.keys(articleUpdates).length === 0) {
            return
        }

        await articleStore.updateArticle(articleId, articleUpdates)
    }

    let contentLoadSequence = 0

    function isCurrentContentLoad(articleId: string | null, loadSequence: number): boolean {
        return loadSequence === contentLoadSequence && articleStore.selectedArticleId === articleId
    }

    // 鐩戝惉閫変腑鐨勮祫璁紝鍔犺浇鎴栧垱寤虹紪杈戝唴瀹?
    watch(() => articleStore.selectedArticleId, async (articleId: string | null) => {
        const loadSequence = ++contentLoadSequence
        if (!articleId) {
            setStatus('idle')
            currentContent.value = null
            return
        }

        setStatus('loading')
        try {
            // 灏濊瘯鍔犺浇宸叉湁鍐呭
            const existing = await contentRepository.findByArticleId(articleId)
            if (!isCurrentContentLoad(articleId, loadSequence)) return

            if (existing) {
                // 杩愯鏃舵牎楠? 纭繚 DB 鏁版嵁绗﹀悎 Schema (闃茶厫灞?
                try {
                    const parsed = EditedContentSchema.parse(existing);
                    const normalized = normalizeEditedContent(parsed);

                    if (normalized !== parsed) {
                        await contentRepository.update(normalized.id, normalized)
                        if (!isCurrentContentLoad(articleId, loadSequence)) return
                    }

                    currentContent.value = normalized;
                    await syncArticleSnapshot(articleId, normalized)
                    if (!isCurrentContentLoad(articleId, loadSequence)) return
                    setStatus('ready')
                } catch (validationError) {
                    if (!isCurrentContentLoad(articleId, loadSequence)) return
                    logger.error('Content integrity validation failed', validationError);
                    setStatus('error', 'Unable to initialize editor state');
                    return; // 鏍￠獙澶辫触鍚庡繀椤昏繑鍥烇紝閬垮厤缁х画鎵ц
                }
            } else {
                // 鍒涘缓鏂扮殑缂栬緫鍐呭
                const article = articleStore.articles.find(candidate => candidate.id === articleId)
                if (article) {
                    await createContent(
                        article.id,
                        article.title,
                        article.rawContent || article.description,
                        loadSequence,
                    )
                } else if (isCurrentContentLoad(articleId, loadSequence)) {
                    setStatus('error', "鏃犳硶鎵惧埌瀵瑰簲鐨勬枃绔犲厓鏁版嵁")
                }
            }
        } catch (err) {
            if (!isCurrentContentLoad(articleId, loadSequence)) return
            const msg = err instanceof AppError ? err.toUserMessage() : '鍔犺浇鍐呭澶辫触'
            logger.error('鍔犺浇缂栬緫鍐呭澶辫触', err, { articleId })
            setStatus('error', msg)
        }
    }, { immediate: true, flush: 'sync' })

    // 鍒涘缓鏂扮殑缂栬緫鍐呭
    async function createContent(articleId: string, title: string, body: string, loadSequence?: number) {
        try {
            const now = new Date();
            const normalizedBody = normalizeMarkdownBody(body)
            const version = buildVersionSnapshot(
                { title, body: normalizedBody, transcript: '' },
                {
                    label: VERSION.INITIAL_LABEL,
                    trigger: 'manual_save',
                    authorId: getCurrentProfileId(),
                    now,
                    force: true,
                },
                null,
            );

            const content = {
                id: generateId(),
                articleId,
                title,
                body: normalizedBody,
                transcript: '',
                selectedLinks: [],
                selectedImages: [],
                versions: [version],
                currentVersionId: version.id,
                createdAt: now,
                updatedAt: now
            };

            // Pre-Validate creation
            const validatedContent = EditedContentSchema.parse(content);

            await contentRepository.create(validatedContent)
            if (loadSequence !== undefined && !isCurrentContentLoad(articleId, loadSequence)) {
                return validatedContent
            }
            currentContent.value = validatedContent
            await syncArticleSnapshot(articleId, validatedContent)
            if (loadSequence !== undefined && !isCurrentContentLoad(articleId, loadSequence)) {
                return validatedContent
            }
            setStatus('ready')
            return validatedContent
        } catch (e) {
            logger.error('鍒涘缓鍐呭澶辫触', e);
            if (loadSequence === undefined || isCurrentContentLoad(articleId, loadSequence)) {
                setStatus('error', 'Unable to initialize editor state');
            }
            throw e;
        }
    }

    // 鏇存柊鍐呭
    async function updateContentUnlocked(
        contentId: string,
        updates: { title?: string; body?: string; transcript?: string },
    ) {
        const sourceContent = await resolveQueuedContent(contentId)
        if (!sourceContent) return

        // 生成新的请求 ID，用于防止竞态条件
        const currentRequestId = ++saveRequestId.value
        if (currentContent.value?.id === contentId) {
            setStatus('saving')
        }
        let recoveryCandidate: EditedContent | null = null

        try {
            const normalizedUpdates = updates.body === undefined
                ? updates
                : {
                    ...updates,
                    body: normalizeMarkdownBody(updates.body),
                }

            const updated = {
                ...sourceContent,
                ...normalizedUpdates,
                updatedAt: new Date()
            }
            recoveryCandidate = updated

            // Validate before saving
            const validated = EditedContentSchema.parse(updated);

            await contentRepository.update(validated.id, validated)
            // 竞态守卫: 仅当此请求仍为最新时才更新内存状态
            // 防止慢请求覆盖快请求的结果
            if (saveRequestId.value !== currentRequestId) return
            if (currentContent.value?.id === validated.id) {
                currentContent.value = validated
            }
            await syncArticleSnapshot(validated.articleId, validated)
            await updateCachedEmergencySnapshot({
                profileId: getCurrentProfileId(),
                windowId: getOrCreateWindowId(),
                articleId: validated.articleId,
                title: validated.title,
                content: validated.body,
                dirty: false,
            })

            // Delay to show saving state (UX)
            // 使用捕获的请求 ID 验证，防止竞态条件
            const capturedId = currentRequestId
            setTimeout(() => {
                // 只有当这是最新的保存请求时才更新状态
                if (
                    status.value === 'saving' &&
                    saveRequestId.value === capturedId &&
                    currentContent.value?.id === contentId
                ) {
                    setStatus('ready')
                }
            }, EDITOR_CONFIG.SAVE_STATUS_DELAY_MS)

        } catch (err) {
            const msg = err instanceof AppError ? err.toUserMessage() : '保存失败'
            logger.error('保存编辑内容失败', err)

            if (recoveryCandidate) {
                try {
                    const profileId = getCurrentProfileId()
                    const windowId = getOrCreateWindowId()
                    await createRecoveryPoint({
                        articleId: recoveryCandidate.articleId,
                        title: recoveryCandidate.title,
                        content: recoveryCandidate.body,
                        trigger: 'autosave-failure',
                        profileId,
                        windowId,
                        reason: msg,
                    })
                    const payload = await updateCachedEmergencySnapshot({
                        profileId,
                        windowId,
                        articleId: recoveryCandidate.articleId,
                        title: recoveryCandidate.title,
                        content: recoveryCandidate.body,
                        dirty: true,
                    })
                    writeEmergencyPayloadSync(payload)
                } catch (recoveryError) {
                    logger.error('Crash recovery fallback failed after editor save error', recoveryError)
                }
            }

            if (currentContent.value?.id === contentId) {
                setStatus('error', '保存失败: ' + msg)
            }
            // Revert status manually if needed, but error state is safer
        }
    }

    function updateContent(updates: { title?: string; body?: string; transcript?: string }): Promise<void> {
        const contentId = currentContent.value?.id
        if (!contentId) return Promise.resolve()
        return enqueueContentWrite(() => updateContentUnlocked(contentId, updates))
    }

    // 创建新版本（带版本数量上限检查）
    async function createVersionUnlocked(
        contentId: string,
        trigger: VersionTrigger,
        label?: string,
    ): Promise<Version | null> {
        const sourceContent = await resolveQueuedContent(contentId)
        if (!sourceContent) return null

        let sourceVersions = sourceContent.versions
        const currentVersionCount = sourceVersions.length
        const maxVersions = VERSION_MANAGEMENT.MAX_VERSIONS_PER_DOCUMENT
        const warningThreshold = VERSION_MANAGEMENT.VERSION_WARNING_THRESHOLD

        // 妫€鏌ユ槸鍚﹁揪鍒扮増鏈暟閲忎笂闄?
        if (currentVersionCount >= maxVersions) {
            // 鏌ユ壘鏈€鏃х殑闈炲綋鍓嶇増鏈繘琛屽垹闄?
            const oldestNonCurrentIndex = sourceVersions.findIndex(
                v => v.id !== sourceContent.currentVersionId
            )

            if (oldestNonCurrentIndex !== -1) {
                const deletedVersion = sourceVersions[oldestNonCurrentIndex]
                logger.warn('Version limit reached; deleting oldest non-current version', {
                    currentCount: currentVersionCount,
                    maxVersions,
                    deletedVersionId: deletedVersion.id,
                    deletedVersionLabel: deletedVersion.label
                })
                // 涓嶅彲鍙樺垹闄わ細鍒涘缓鏂版暟缁勬帓闄よ鍒犻櫎鐨勭増鏈?
                sourceVersions = [
                    ...sourceVersions.slice(0, oldestNonCurrentIndex),
                    ...sourceVersions.slice(oldestNonCurrentIndex + 1),
                ]
            } else {
                // 鎵€鏈夌増鏈兘鏄綋鍓嶇増鏈紙鐞嗚涓婁笉鍙兘锛屼絾闃插尽鎬у鐞嗭級
                logger.error('鐗堟湰绠＄悊寮傚父锛氭墍鏈夌増鏈兘鏄綋鍓嶇増鏈紝鏃犳硶鍒犻櫎', {
                    currentCount: currentVersionCount,
                    maxVersions
                })
                throw new Error('鐗堟湰鏁伴噺宸茶揪涓婇檺涓旀棤娉曡嚜鍔ㄦ竻鐞嗭紝璇锋墜鍔ㄥ垹闄ゆ棫鐗堟湰')
            }
        } else if (currentVersionCount >= maxVersions * warningThreshold) {
            // 鎺ヨ繎涓婇檺鏃跺彂鍑鸿鍛?
            logger.info('鐗堟湰鏁伴噺鎺ヨ繎涓婇檺', {
                currentCount: currentVersionCount,
                maxVersions,
                warningThreshold: `${warningThreshold * 100}%`
            })
        }

        const versionNumber = sourceVersions.length + 1
        const now = new Date()
        const previousVersion = sourceVersions.find(
            version => version.id === sourceContent.currentVersionId
        ) ?? null
        const validatedVersion = buildVersionSnapshot(
            {
                title: sourceContent.title,
                body: normalizeMarkdownBody(sourceContent.body),
                transcript: sourceContent.transcript,
                versions: sourceVersions,
                currentVersionId: sourceContent.currentVersionId,
            },
            {
                label: label ?? VERSION.generateLabel(versionNumber),
                trigger,
                authorId: getCurrentProfileId(),
                now,
            },
            previousVersion,
        )

        const updatedVersions = [...sourceVersions, validatedVersion]

        // 只持久化版本字段，避免慢版本写入覆盖随后到达的正文保存。
        await contentRepository.update(sourceContent.id, {
            versions: updatedVersions,
            currentVersionId: validatedVersion.id,
            updatedAt: validatedVersion.createdAt,
        })

        const liveContent = currentContent.value
        if (
            liveContent?.id === sourceContent.id &&
            liveContent.currentVersionId === sourceContent.currentVersionId
        ) {
            currentContent.value = {
                ...liveContent,
                versions: updatedVersions,
                currentVersionId: validatedVersion.id,
                updatedAt: validatedVersion.createdAt,
            }
        }
        return validatedVersion
    }

    function createVersion(trigger: VersionTrigger = 'manual_save', label?: string): Promise<Version | null> {
        const contentId = currentContent.value?.id
        if (!contentId) return Promise.resolve(null)
        return enqueueContentWrite(() => createVersionUnlocked(contentId, trigger, label))
    }

    async function pruneVersionsUnlocked(contentId: string, versionIds: readonly string[]): Promise<void> {
        const sourceContent = await resolveQueuedContent(contentId)
        if (!sourceContent || versionIds.length === 0) return

        const deleteIds = new Set(versionIds)
        deleteIds.delete(sourceContent.currentVersionId)
        const prunedVersions = sourceContent.versions.filter(version => !deleteIds.has(version.id))
        if (prunedVersions.length === sourceContent.versions.length) return

        await contentRepository.update(sourceContent.id, { versions: prunedVersions })

        const liveContent = currentContent.value
        if (liveContent?.id === sourceContent.id) {
            deleteIds.delete(liveContent.currentVersionId)
            currentContent.value = {
                ...liveContent,
                versions: liveContent.versions.filter(version => !deleteIds.has(version.id)),
            }
        }
    }

    function pruneVersions(versionIds: readonly string[]): Promise<void> {
        const contentId = currentContent.value?.id
        if (!contentId) return Promise.resolve()
        return enqueueContentWrite(() => pruneVersionsUnlocked(contentId, versionIds))
    }

    // 鍒囨崲鐗堟湰锛堜笉鍙彉鏇存柊锛?
    async function switchVersionUnlocked(contentId: string, versionId: string) {
        const sourceContent = await resolveQueuedContent(contentId)
        if (!sourceContent) {
            throw new Error('当前文稿内容已不存在，请重新打开文稿后重试。')
        }

        const version = sourceContent.versions.find((v: Version) => v.id === versionId)
        if (!version) {
            throw new Error('目标版本已不存在，请刷新版本列表后重试。')
        }

        // 浣跨敤涓嶅彲鍙樻洿鏂版ā寮?
        const updated = {
            ...sourceContent,
            currentVersionId: version.id,
            title: version.title,
            body: normalizeMarkdownBody(version.body),
            transcript: version.transcript,
            updatedAt: new Date()
        }

        // 鍏堟寔涔呭寲锛屾垚鍔熷悗鍐嶆洿鏂版湰鍦扮姸鎬侊紙閬垮厤绔炴€佹潯浠讹級
        await contentRepository.update(updated.id, updated)
        if (currentContent.value?.id === sourceContent.id) {
            currentContent.value = updated
        }
        await syncArticleSnapshot(updated.articleId, updated)
    }

    function switchVersion(versionId: string): Promise<void> {
        const contentId = currentContent.value?.id
        if (!contentId) return Promise.resolve()
        return enqueueContentWrite(() => switchVersionUnlocked(contentId, versionId))
    }

    // 鏇存柊閫変腑鐨勯摼鎺ワ紙涓嶅彲鍙樻洿鏂帮級
    async function updateSelectedLinks(links: string[]) {
        if (!currentContent.value) return

        // 鍏堟寔涔呭寲
        await contentRepository.update(currentContent.value.id, { selectedLinks: links })

        // 鎴愬姛鍚庢洿鏂版湰鍦扮姸鎬侊紙涓嶅彲鍙橈級
        currentContent.value = {
            ...currentContent.value,
            selectedLinks: links
        }
    }

    // 鏇存柊閫変腑鐨勫浘鐗囷紙涓嶅彲鍙樻洿鏂帮級
    async function updateSelectedImages(images: string[]) {
        if (!currentContent.value) return

        // 鍏堟寔涔呭寲
        await contentRepository.update(currentContent.value.id, { selectedImages: images })

        // 鎴愬姛鍚庢洿鏂版湰鍦扮姸鎬侊紙涓嶅彲鍙橈級
        currentContent.value = {
            ...currentContent.value,
            selectedImages: images
        }
    }

    // 椤甸潰鍏抽棴鏃跺鏋滄鍦ㄤ繚瀛橈紝鎻愮ず鐢ㄦ埛
    // 浣跨敤鍛藉悕鍑芥暟浠ヤ究娓呯悊
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (status.value === 'saving') {
            e.preventDefault()
            e.returnValue = '姝ｅ湪淇濆瓨涓紝纭畾瑕佺寮€鍚楋紵'
            return e.returnValue
        }
    }

    // 浜嬩欢璁㈤槄绠＄悊鍣?
    const eventManager = createEventSubscriptionManager()

    // 娉ㄥ唽 beforeunload 鐩戝惉鍣?
    if (typeof window !== 'undefined') {
        eventManager.addEventListener(window, 'beforeunload', handleBeforeUnload)
    }

    /**
     * 鏄惧紡娓呯悊 Store 璧勬簮
     * 鐢变簬 Pinia Store 鏄崟渚嬶紝onScopeDispose 鍙兘姘歌繙涓嶄細瑙﹀彂
     * 缁勪欢搴斿湪閫傚綋鏃舵満璋冪敤姝ゆ柟娉曪紙濡傚簲鐢ㄥ嵏杞芥椂锛?
     */
    function cleanup() {
        eventManager.dispose()
        logger.info('Editor store 浜嬩欢鐩戝惉鍣ㄥ凡娓呯悊')
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
        pruneVersions,
        switchVersion,
        updateSelectedLinks,
        updateSelectedImages,

        // Lifecycle
        cleanup
    }
})
