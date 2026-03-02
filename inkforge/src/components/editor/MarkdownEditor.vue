<script setup lang="ts">
import { ref, watch } from 'vue'
import { Codemirror } from 'vue-codemirror'
import type { Events } from 'vue-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

// 从 vue-codemirror 导出的 Events 类型中提取 ready 回调的 payload 类型
// 避免 pnpm 硬链接导致 @codemirror/state 和 @codemirror/view 重复模块的类型不兼容
type ReadyPayload = Parameters<Events['ready']>[0]

// Props with defaults
const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  readonly?: boolean
}>(), {
  modelValue: '',
  placeholder: '# 开始写作...',
  readonly: false
})

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'ready', payload: ReadyPayload): void
}>()

// Local state
const code = ref(props.modelValue)

// Watch external changes
watch(() => props.modelValue, (newVal) => {
  if (newVal !== code.value) {
    code.value = newVal
  }
})

// Sync changes back
function handleChange(value: string) {
  code.value = value
  emit('update:modelValue', value)
}

// Editor ready — vue-codemirror 传入 { view, state, container }
function handleReady(payload: ReadyPayload) {
  emit('ready', payload)
}

// Extensions
const extensions = [
  markdown({
    base: markdownLanguage,
    codeLanguages: languages
  }),
  oneDark,
  EditorView.lineWrapping
]
</script>

<template>
  <div class="markdown-editor">
    <Codemirror
      v-model="code"
      :placeholder="placeholder"
      :extensions="extensions"
      :disabled="readonly"
      :autofocus="true"
      :indent-with-tab="true"
      :tab-size="2"
      @change="handleChange"
      @ready="handleReady"
    />
  </div>
</template>

<style scoped>
.markdown-editor {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.markdown-editor :deep(.cm-editor) {
  height: 100%;
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 15px;
  line-height: 1.6;
}

.markdown-editor :deep(.cm-scroller) {
  overflow: auto;
  padding: 16px;
}

.markdown-editor :deep(.cm-content) {
  min-height: 100%;
}

/* Soviet Style: Hard focus ring */
.markdown-editor :deep(.cm-editor.cm-focused) {
  outline: 2px solid #2c3e50;
  outline-offset: -2px;
}

/* Custom scrollbar */
.markdown-editor :deep(.cm-scroller)::-webkit-scrollbar {
  width: 8px;
}

.markdown-editor :deep(.cm-scroller)::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.markdown-editor :deep(.cm-scroller)::-webkit-scrollbar-thumb {
  background: #3a3a3a;
  border-radius: 4px;
}
</style>
