<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { Editor } from '@tiptap/core'
import {
  ArrowUpRight,
  Copy,
  FileInput,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-vue-next'
import { useAIChatStore } from '@/stores/aiChat'
import { useAIStore } from '@/stores/ai'
import { useEditorStore } from '@/stores/editor'

const props = defineProps<{
  editor?: Editor
}>()

const chatStore = useAIChatStore()
const { turns, isStreaming, error, canSend } = storeToRefs(chatStore)

const aiStore = useAIStore()
const { isAvailable, currentModelName } = storeToRefs(aiStore)

const editorStore = useEditorStore()

// ─── 本地状态 ───
const draft = ref('')
const attachDoc = ref(false)
const scrollEl = ref<HTMLElement | null>(null)
const textareaEl = ref<HTMLTextAreaElement | null>(null)

const hasTurns = computed(() => turns.value.length > 0)
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ─── 自动滚动到底部 ───
function scrollToBottom(): void {
  const el = scrollEl.value
  if (!el) return
  el.scrollTo({
    top: el.scrollHeight,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  })
}

watch(
  () => turns.value.map(t => t.content.length).join(','),
  () => {
    void nextTick(scrollToBottom)
  }
)

watch(
  () => turns.value.length,
  () => {
    void nextTick(scrollToBottom)
  }
)

// ─── 文本框自动增高 ───
function autoGrow(): void {
  const el = textareaEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

watch(draft, () => {
  void nextTick(autoGrow)
})

// ─── 发送 ───
async function handleSend(): Promise<void> {
  const text = draft.value
  if (!text.trim() || !canSend.value) return
  draft.value = ''
  void nextTick(autoGrow)
  const docContext = attachDoc.value
    ? editorStore.currentContent?.body ?? ''
    : undefined
  await chatStore.send(text, { docContext })
}

function handleKeydown(e: KeyboardEvent): void {
  // 防止输入法组合期间误发送
  if (e.isComposing) return
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    void handleSend()
  }
}

function handleStop(): void {
  chatStore.stop()
}

function handleClear(): void {
  chatStore.clear()
}

function handleRegenerate(): void {
  void chatStore.regenerateLast()
}

// ─── 气泡操作 ───
async function copyTurn(content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content)
  } catch {
    // 剪贴板不可用时静默
  }
}

function insertTurn(content: string): void {
  props.editor?.chain().focus().insertContent(content).run()
}

const canRegenerate = computed(
  () =>
    canSend.value &&
    turns.value.length > 0 &&
    turns.value[turns.value.length - 1].role === 'assistant'
)
</script>

<template>
  <div class="chat-panel">
    <!-- 头部 -->
    <header class="chat-header">
      <span class="chat-title">AI 对话</span>
      <span
        v-if="isAvailable"
        class="chat-model"
      >{{ currentModelName }}</span>
      <button
        class="chat-clear"
        type="button"
        title="清空对话"
        :disabled="!hasTurns"
        @click="handleClear"
      >
        <Trash2 :size="14" />
        <span>清空</span>
      </button>
    </header>

    <!-- 未配置提示 -->
    <div
      v-if="!isAvailable"
      class="chat-help"
    >
      <p class="chat-help-text">
        AI 未配置。前往 设置 → AI 配置 Provider 或本地 Ollama。
      </p>
      <ol class="chat-help-steps">
        <li>安装 Ollama 并启动服务</li>
        <li>运行 <code>ollama pull qwen2.5:7b</code></li>
        <li>在设置中选择 Ollama 或填入 API Key</li>
      </ol>
    </div>

    <!-- 对话区 -->
    <div
      ref="scrollEl"
      class="chat-scroll"
    >
      <div
        v-if="!hasTurns"
        class="chat-empty"
      >
        <p class="chat-empty-text">
          暂无对话。输入消息，与 AI 协作写作。
        </p>
      </div>

      <div
        v-for="turn in turns"
        :key="turn.id"
        class="chat-row"
        :class="`chat-row--${turn.role}`"
      >
        <div
          class="chat-bubble"
          :class="{
            'chat-bubble--user': turn.role === 'user',
            'chat-bubble--assistant': turn.role === 'assistant',
            'chat-bubble--error': turn.status === 'error',
          }"
        >
          <span class="chat-content">{{ turn.content }}</span><span
            v-if="turn.role === 'assistant' && turn.status === 'streaming'"
            class="chat-caret"
            aria-hidden="true"
          />

          <div
            v-if="turn.role === 'assistant' && turn.status === 'done'"
            class="chat-actions"
          >
            <button
              class="chat-action"
              type="button"
              title="复制"
              @click="copyTurn(turn.content)"
            >
              <Copy :size="13" />
            </button>
            <button
              v-if="props.editor"
              class="chat-action"
              type="button"
              title="插入到文档"
              @click="insertTurn(turn.content)"
            >
              <FileInput :size="13" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误行 -->
    <div
      v-if="error"
      class="chat-error"
    >
      {{ error }}
    </div>

    <!-- 输入区 -->
    <div class="chat-composer">
      <div class="composer-bar">
        <label class="composer-toggle">
          <input
            v-model="attachDoc"
            type="checkbox"
            :disabled="!isAvailable"
          >
          <span>附带文档</span>
        </label>
        <button
          v-if="canRegenerate"
          class="composer-regen"
          type="button"
          title="重新生成"
          @click="handleRegenerate"
        >
          <RotateCcw :size="13" />
          <span>重新生成</span>
        </button>
      </div>

      <div class="composer-input">
        <textarea
          ref="textareaEl"
          v-model="draft"
          class="composer-textarea"
          rows="1"
          placeholder="输入消息，Enter 发送 · Shift+Enter 换行"
          :disabled="!isAvailable"
          @keydown="handleKeydown"
        />

        <button
          v-if="isStreaming"
          class="ai-btn--primary chat-send chat-send--stop"
          type="button"
          title="停止生成"
          @click="handleStop"
        >
          <Square :size="15" />
        </button>
        <button
          v-else
          class="ai-btn--primary chat-send"
          type="button"
          title="发送"
          :disabled="!canSend || !draft.trim()"
          @click="handleSend"
        >
          <ArrowUpRight
            :size="16"
            class="chat-send__nib"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--bg-rice-paper);
  font-family: var(--font-sans);
}

/* ─── 头部 ─── */
.chat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-light);
}

.chat-title {
  font-size: var(--type-step-1);
  font-weight: 600;
  color: var(--text-primary);
}

.chat-model {
  flex: 1;
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-clear {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 4px 8px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-small);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart),
    background-color var(--motion-fast) var(--ease-out-quart);
}

.chat-clear:hover:not(:disabled) {
  border-color: var(--border);
  background: var(--bg-hover);
  color: var(--text-primary);
}

.chat-clear:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ─── 未配置提示 ─── */
.chat-help {
  margin: 12px 14px;
  padding: 12px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-medium);
}

.chat-help-text {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.chat-help-steps {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--text-muted);
}

.chat-help-steps code {
  padding: 1px 6px;
  background: var(--bg-input);
  border-radius: var(--radius-small);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
}

/* ─── 对话区 ─── */
.chat-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.chat-empty-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted);
  text-align: center;
}

.chat-row {
  display: flex;
}

.chat-row--user {
  justify-content: flex-end;
}

.chat-row--assistant {
  justify-content: flex-start;
}

.chat-bubble {
  position: relative;
  max-width: 88%;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-bubble--user {
  background: var(--ember-soft);
  border: 1px solid var(--ember-border);
  border-radius: var(--radius-large);
}

.chat-bubble--assistant {
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-large);
}

.chat-bubble--error {
  background: var(--danger-soft);
  border-color: var(--danger);
}

.chat-content {
  display: inline;
}

/* 流式光标 */
.chat-caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 1px;
  vertical-align: text-bottom;
  background: var(--ember);
  animation: chat-caret-blink 1s steps(2, start) infinite;
}

@keyframes chat-caret-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

/* 气泡操作（hover 显隐） */
.chat-actions {
  position: absolute;
  top: -10px;
  right: 8px;
  display: flex;
  gap: 4px;
  padding: 2px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-small);
  box-shadow: var(--elev-1);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--motion-fast) var(--ease-out-quart);
}

.chat-bubble:hover .chat-actions,
.chat-bubble:focus-within .chat-actions {
  opacity: 1;
  pointer-events: auto;
}

.chat-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-small);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart);
}

.chat-action:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* ─── 错误行 ─── */
.chat-error {
  margin: 0 14px 8px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--danger);
  background: var(--danger-soft);
  border-radius: var(--radius-small);
}

/* ─── 输入区 ─── */
.chat-composer {
  padding: 10px 14px 14px;
  border-top: 1px solid var(--border-light);
}

.composer-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  min-height: 20px;
}

.composer-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.composer-toggle input {
  accent-color: var(--ember);
  cursor: pointer;
}

.composer-regen {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 3px 8px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-small);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart);
}

.composer-regen:hover {
  border-color: var(--border);
  color: var(--text-primary);
}

.composer-input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.composer-textarea {
  flex: 1;
  min-height: 38px;
  max-height: 160px;
  padding: 9px 12px;
  resize: none;
  background: var(--bg-input);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-medium);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 13px;
  line-height: 1.5;
  transition: border-color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart);
}

.composer-textarea::placeholder {
  color: var(--text-muted);
}

.composer-textarea:focus {
  outline: none;
  border-color: var(--ember-border);
  box-shadow: var(--focus-ring);
}

.composer-textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 主操作：铸红 CTA + 笔尖箭头（复刻 AIPanel .ai-btn--primary） */
.ai-btn--primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border: 1px solid transparent;
  border-radius: var(--radius-medium);
  background: var(--ember);
  color: #fff;
  cursor: pointer;
  box-shadow: var(--elev-1);
  transition: box-shadow var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart),
    opacity var(--motion-fast) var(--ease-out-quart);
}

.ai-btn--primary:hover:not(:disabled) {
  box-shadow: var(--glow-ember);
  transform: translateY(-1px);
}

.ai-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-btn--primary:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.chat-send__nib {
  transition: transform var(--motion-fast) var(--ease-out-quart);
}

.chat-send:hover:not(:disabled) .chat-send__nib {
  transform: translate(2px, -2px);
}

/* ─── 滚动条 ─── */
.chat-scroll::-webkit-scrollbar {
  width: 6px;
}

.chat-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.chat-scroll::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: var(--radius-round);
}

/* ─── 动效降级 ─── */
@media (prefers-reduced-motion: reduce) {
  .chat-caret {
    animation: none;
  }

  .ai-btn--primary,
  .chat-send__nib {
    transition: none;
  }

  .ai-btn--primary:hover:not(:disabled) {
    transform: none;
  }
}
</style>
