<script setup lang="ts">
import { computed, ref } from 'vue'
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/vue-3'
import { Check, Copy } from 'lucide-vue-next'
import { SUPPORTED_CODE_LANGUAGES } from '@/extensions/codeLanguages'

const props = defineProps<NodeViewProps>()
const copied = ref(false)

const language = computed(() => {
  const value = props.node.attrs.language
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : 'plaintext'
})

const isSupportedLanguage = computed(() => {
  return (SUPPORTED_CODE_LANGUAGES as readonly string[]).includes(language.value)
})

const languageLabel = computed(() => {
  return isSupportedLanguage.value ? language.value : `${language.value} / plain`
})

async function copyCode(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.node.textContent)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1200)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <NodeViewWrapper
    class="rich-code-block"
    :data-language="language"
  >
    <div
      class="code-header"
      contenteditable="false"
    >
      <span
        class="language-pill"
        :class="{ unsupported: !isSupportedLanguage }"
      >{{ languageLabel }}</span>
      <button
        type="button"
        class="copy-button"
        @click="copyCode"
      >
        <Check
          v-if="copied"
          :size="14"
        />
        <Copy
          v-else
          :size="14"
        />
        <span>{{ copied ? 'Copied' : 'Copy' }}</span>
      </button>
    </div>
    <pre><NodeViewContent
as="code"
                          class="code-content"
:class="`language-${language}`"
    /></pre>
  </NodeViewWrapper>
</template>

<style scoped>
.rich-code-block {
  position: relative;
  overflow: hidden;
  margin: 22px 0;
  background: #1f2937;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.18);
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0));
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.language-pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 9px;
  color: #cbd5e1;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(148, 163, 184, 0.16);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 999px;
}

.language-pill.unsupported {
  color: #fed7aa;
  background: rgba(249, 115, 22, 0.16);
  border-color: rgba(249, 115, 22, 0.28);
}

.copy-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  color: #d1d5db;
  font-size: 0.78rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  cursor: pointer;
}

.copy-button:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.13);
}

.rich-code-block pre {
  margin: 0;
  padding: 16px 18px 18px;
  overflow-x: auto;
  color: #e5e7eb;
  font-size: 0.9rem;
  line-height: 1.75;
  background: transparent;
}

.rich-code-block :deep(.code-content) {
  display: block;
  min-height: 1.5em;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  white-space: pre;
}
</style>
