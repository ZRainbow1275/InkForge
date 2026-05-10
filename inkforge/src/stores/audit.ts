import { computed, onScopeDispose, ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_ACCOUNT_ID } from './account'
import { auditEventBus, auditRepository, type AuditAction, type AuditExportResult, type AuditLogRecord, type AuditOutcome, type AuditQueryParams, type AuditSeverity } from '@/services/audit'

const DEFAULT_LIMIT = 50
const DEFAULT_RANGE_DAYS = 7

function defaultQueryParams(profileId = DEFAULT_ACCOUNT_ID): AuditQueryParams {
    return {
        profileId,
        from: Date.now() - DEFAULT_RANGE_DAYS * 86_400_000,
        limit: DEFAULT_LIMIT,
        offset: 0,
    }
}

export const useAuditStore = defineStore('audit', () => {
    const entries = ref<AuditLogRecord[]>([])
    const totalCount = ref(0)
    const isLoading = ref(false)
    const error = ref<string | null>(null)
    const queryParams = ref<AuditQueryParams>(defaultQueryParams())
    const lastExport = ref<AuditExportResult | null>(null)
    const integrityStatus = ref<'unknown' | 'valid' | 'broken'>('unknown')
    const integrityMessage = ref<string | null>(null)

    const hasEntries = computed(() => entries.value.length > 0)
    const page = computed(() => Math.floor((queryParams.value.offset ?? 0) / (queryParams.value.limit ?? DEFAULT_LIMIT)) + 1)
    const pageCount = computed(() => Math.max(1, Math.ceil(totalCount.value / (queryParams.value.limit ?? DEFAULT_LIMIT))))

    async function fetchEntries(overrides: Partial<AuditQueryParams> = {}): Promise<void> {
        isLoading.value = true
        error.value = null
        queryParams.value = { ...queryParams.value, ...overrides }
        try {
            const result = await auditRepository.query(queryParams.value)
            entries.value = result.entries
            totalCount.value = result.total
        } catch (err) {
            error.value = err instanceof Error ? err.message : String(err)
            throw err
        } finally {
            isLoading.value = false
        }
    }

    function setProfile(profileId: string): void {
        queryParams.value = defaultQueryParams(profileId)
    }

    async function setKeyword(keyword: string): Promise<void> {
        await fetchEntries({ keyword, offset: 0 })
    }

    async function setSeverities(severities: AuditSeverity[]): Promise<void> {
        await fetchEntries({ severities: severities.length > 0 ? severities : undefined, offset: 0 })
    }

    async function setOutcomes(outcomes: AuditOutcome[]): Promise<void> {
        await fetchEntries({ outcomes: outcomes.length > 0 ? outcomes : undefined, offset: 0 })
    }

    async function setActions(actions: AuditAction[]): Promise<void> {
        await fetchEntries({ actions: actions.length > 0 ? actions : undefined, offset: 0 })
    }

    async function nextPage(): Promise<void> {
        if (page.value >= pageCount.value) return
        await fetchEntries({ offset: (queryParams.value.offset ?? 0) + (queryParams.value.limit ?? DEFAULT_LIMIT) })
    }

    async function previousPage(): Promise<void> {
        await fetchEntries({ offset: Math.max(0, (queryParams.value.offset ?? 0) - (queryParams.value.limit ?? DEFAULT_LIMIT)) })
    }

    async function exportCSV(): Promise<AuditExportResult> {
        lastExport.value = await auditRepository.exportCSV(queryParams.value)
        return lastExport.value
    }

    async function exportJSON(): Promise<AuditExportResult> {
        lastExport.value = await auditRepository.exportJSON(queryParams.value)
        return lastExport.value
    }

    async function verifyIntegrity(): Promise<void> {
        const report = await auditRepository.verifyIntegrity(queryParams.value.profileId)
        integrityStatus.value = report.valid ? 'valid' : 'broken'
        integrityMessage.value = report.valid
            ? `已验证 ${report.checked} 条审计链路`
            : `审计链在 ${report.firstBrokenEntryId ?? '未知条目'} 处断裂：${report.reason ?? '未知原因'}`
    }

    function appendEntry(entry: AuditLogRecord): void {
        if (entry.profileId !== queryParams.value.profileId) return
        entries.value = [entry, ...entries.value].slice(0, queryParams.value.limit ?? DEFAULT_LIMIT)
        totalCount.value += 1
        integrityStatus.value = 'unknown'
    }

    const unsubscribe = auditEventBus.on(appendEntry)
    onScopeDispose(unsubscribe)

    return {
        entries,
        totalCount,
        isLoading,
        error,
        queryParams,
        lastExport,
        integrityStatus,
        integrityMessage,
        hasEntries,
        page,
        pageCount,
        fetchEntries,
        setProfile,
        setKeyword,
        setSeverities,
        setOutcomes,
        setActions,
        nextPage,
        previousPage,
        exportCSV,
        exportJSON,
        verifyIntegrity,
        appendEntry,
    }
})
