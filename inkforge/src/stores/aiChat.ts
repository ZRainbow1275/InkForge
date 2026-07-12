import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ChatMessage } from '@/services/ai/types'
import { composeAISystemPrompt, useAIStore } from '@/stores/ai'
import { useSettingsStore } from '@/stores/settings'

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

/** 一轮对话（用户或助手的单条消息） */
export interface ChatTurn {
    id: string
    role: 'user' | 'assistant'
    content: string
    status: 'streaming' | 'done' | 'error'
    createdAt: number
}

/** 文档上下文最大字符数，限制 prompt 体积 */
const DOC_CONTEXT_MAX_CHARS = 6000

/** 自增 id 计数器（不依赖随机数，保证可预测） */
let seq = 0
function nextId(): string {
    return 'turn-' + ++seq
}

// ═══════════════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════════════

/**
 * AI 对话 Store
 * 复用 useAIStore 的 streamChat 流式能力，维护多轮会话状态
 */
export const useAIChatStore = defineStore('aiChat', () => {
    const turns = ref<ChatTurn[]>([])
    const isStreaming = ref(false)
    const error = ref<string | null>(null)
    /** 用户主动停止标记：停止时将进行中的回合视为正常完成而非错误 */
    let stopping = false
    /** 最近一次有效发送所附的文档上下文，供重新生成同一回复时复用。 */
    let lastDocContext: string | undefined

    /** 是否可发送：AI 可用且当前无流式进行 */
    const canSend = computed(() => useAIStore().isAvailable && !isStreaming.value)

    /** 执行一次流式请求，将增量写入指定的助手回合 */
    async function runStream(
        messages: ChatMessage[],
        assistantTurn: ChatTurn
    ): Promise<void> {
        isStreaming.value = true
        error.value = null
        stopping = false

        try {
            await useAIStore().streamChat(messages, chunk => {
                assistantTurn.content += chunk
            })
            assistantTurn.status = 'done'
        } catch (e) {
            // 用户主动停止：保留已生成内容并标记为完成，不视为错误
            if (stopping) {
                assistantTurn.status = 'done'
            } else {
                assistantTurn.status = 'error'
                error.value = e instanceof Error ? e.message : '生成失败'
                if (assistantTurn.content === '') {
                    assistantTurn.content = '(生成失败)'
                }
            }
        } finally {
            isStreaming.value = false
            stopping = false
        }
    }

    /** 将已有回合映射为 provider 消息（不含未创建的助手回合） */
    function buildMessages(docContext?: string): ChatMessage[] {
        const settingsStore = useSettingsStore()
        const messages: ChatMessage[] = []

        const systemPrompt = composeAISystemPrompt(
            settingsStore.settings.ai.systemPrompt,
            docContext
                ? '当前文档内容供参考：\n\n' + docContext.slice(0, DOC_CONTEXT_MAX_CHARS)
                : undefined
        )
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt })
        }

        for (const turn of turns.value) {
            messages.push({ role: turn.role, content: turn.content })
        }

        return messages
    }

    /**
     * 发送一条用户消息并流式接收助手回复
     * @param text - 用户输入
     * @param opts.docContext - 可选的当前文档正文，作为参考上下文
     */
    async function send(text: string, opts?: { docContext?: string }): Promise<void> {
        const trimmed = text.trim()
        if (!trimmed || !canSend.value) return

        lastDocContext = opts?.docContext?.slice(0, DOC_CONTEXT_MAX_CHARS)

        turns.value.push({
            id: nextId(),
            role: 'user',
            content: trimmed,
            status: 'done',
            createdAt: Date.now(),
        })

        const messages = buildMessages(lastDocContext)

        const assistantTurn: ChatTurn = {
            id: nextId(),
            role: 'assistant',
            content: '',
            status: 'streaming',
            createdAt: Date.now(),
        }
        turns.value.push(assistantTurn)

        await runStream(messages, assistantTurn)
    }

    /** 停止当前流式请求，并将进行中的助手回合标记为完成 */
    function stop(): void {
        stopping = true
        useAIStore().cancelRequest()
        const last = turns.value[turns.value.length - 1]
        if (last && last.role === 'assistant' && last.status === 'streaming') {
            last.status = 'done'
        }
        isStreaming.value = false
    }

    /** 清空全部对话 */
    function clear(): void {
        turns.value = []
        error.value = null
        lastDocContext = undefined
    }

    /** 重新生成：丢弃末尾助手回合，从最后一条用户消息重新请求 */
    async function regenerateLast(): Promise<void> {
        if (!canSend.value) return

        while (
            turns.value.length > 0 &&
            turns.value[turns.value.length - 1].role === 'assistant'
        ) {
            turns.value.pop()
        }

        if (turns.value.length === 0) return

        const messages = buildMessages(lastDocContext)

        const assistantTurn: ChatTurn = {
            id: nextId(),
            role: 'assistant',
            content: '',
            status: 'streaming',
            createdAt: Date.now(),
        }
        turns.value.push(assistantTurn)

        await runStream(messages, assistantTurn)
    }

    return {
        turns,
        isStreaming,
        error,
        canSend,
        send,
        stop,
        clear,
        regenerateLast,
    }
})
