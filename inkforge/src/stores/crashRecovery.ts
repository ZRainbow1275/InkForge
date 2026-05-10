import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { EditedContentSchema, type EditedContent } from '@/schemas/article'
import { contentRepository } from '@/services/repository'
import { logger } from '@/services/error'
import { generateId } from '@/utils/uuid'
import { useArticleStore } from './article'
import {
    clearCrashCount,
    clearEmergencyPayloadByKey,
    createRecoveryPointFromEmergencyPayload,
    createStartupRecoveryState,
    getCurrentProfileId,
    getOrCreateWindowId,
    markRecoveryPointConsumed,
    readRecoverableEmergencyPayloads,
    type CrashRecoveryStartupState,
    type StoredEmergencyPayload,
} from '@/services/crash-recovery'

function createRecoveredContent(payload: StoredEmergencyPayload): EditedContent | null {
    const activeArticle = payload.payload.activeArticle
    if (!activeArticle) {
        return null
    }

    const now = new Date()
    const versionId = generateId()
    const content: EditedContent = {
        id: generateId(),
        articleId: activeArticle.articleId,
        title: activeArticle.title,
        body: activeArticle.content,
        transcript: '',
        selectedLinks: [],
        selectedImages: [],
        versions: [{
            id: versionId,
            label: 'Crash recovery',
            title: activeArticle.title,
            body: activeArticle.content,
            transcript: '',
            createdAt: now,
        }],
        currentVersionId: versionId,
        createdAt: now,
        updatedAt: now,
    }

    return EditedContentSchema.parse(content)
}

export const useCrashRecoveryStore = defineStore('crashRecovery', () => {
    const initialized = ref(false)
    const startupState = ref<CrashRecoveryStartupState | null>(null)
    const pendingPayloads = ref<StoredEmergencyPayload[]>([])
    const restoringKey = ref<string | null>(null)
    const error = ref<string | null>(null)

    const hasPendingRecovery = computed(() => pendingPayloads.value.length > 0)
    const primaryPendingPayload = computed(() => pendingPayloads.value[0] ?? null)
    const pendingRecoveryCount = computed(() => pendingPayloads.value.length)
    const shouldEnterSafeMode = computed(() => startupState.value?.shouldEnterSafeMode ?? false)

    function refreshPendingPayloads(profileId = startupState.value?.profileId ?? getCurrentProfileId()): void {
        pendingPayloads.value = readRecoverableEmergencyPayloads(profileId)
    }

    function initialize(profileId = getCurrentProfileId(), windowId = getOrCreateWindowId()): CrashRecoveryStartupState {
        if (initialized.value && startupState.value) {
            refreshPendingPayloads(profileId)
            return startupState.value
        }

        const state = createStartupRecoveryState(profileId, windowId)
        startupState.value = state
        pendingPayloads.value = state.pendingPayloads
        initialized.value = true
        error.value = null

        window.setTimeout(() => {
            clearCrashCount(profileId)
        }, 3000)

        return state
    }

    async function restorePayload(key: string): Promise<void> {
        const target = pendingPayloads.value.find(item => item.key === key)
        if (!target?.payload.activeArticle) {
            return
        }

        restoringKey.value = key
        error.value = null
        try {
            const articleStore = useArticleStore()
            const activeArticle = target.payload.activeArticle
            const recoveryPoint = await createRecoveryPointFromEmergencyPayload(target.payload, key)
            const existingContent = await contentRepository.findByArticleId(activeArticle.articleId)
            const nextContent = existingContent
                ? EditedContentSchema.parse({
                    ...existingContent,
                    title: activeArticle.title,
                    body: activeArticle.content,
                    updatedAt: new Date(),
                })
                : createRecoveredContent(target)

            if (!nextContent) {
                throw new Error('Emergency payload does not contain active article content')
            }

            if (existingContent) {
                await contentRepository.update(existingContent.id, nextContent)
            } else {
                await contentRepository.create(nextContent)
            }

            await articleStore.updateArticle(activeArticle.articleId, {
                title: activeArticle.title,
                rawContent: activeArticle.content,
            })
            articleStore.selectArticle(activeArticle.articleId)

            if (recoveryPoint) {
                await markRecoveryPointConsumed(recoveryPoint.id)
            }
            clearEmergencyPayloadByKey(key)
            refreshPendingPayloads(target.payload.profileId)
        } catch (caught) {
            const message = caught instanceof Error ? caught.message : String(caught)
            error.value = message
            logger.error('Crash recovery restore failed', caught)
            throw caught
        } finally {
            restoringKey.value = null
        }
    }

    function dismissPayload(key: string): void {
        clearEmergencyPayloadByKey(key)
        refreshPendingPayloads()
    }

    return {
        initialized,
        startupState,
        pendingPayloads,
        restoringKey,
        error,
        hasPendingRecovery,
        primaryPendingPayload,
        pendingRecoveryCount,
        shouldEnterSafeMode,
        initialize,
        refreshPendingPayloads,
        restorePayload,
        dismissPayload,
    }
})
