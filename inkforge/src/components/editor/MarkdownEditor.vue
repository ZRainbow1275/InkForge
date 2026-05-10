<script setup lang="ts">
import { markRaw, nextTick, ref, shallowRef, watch } from 'vue'
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
const editorKey = ref(0)
const lastEmittedValue = ref<string | null>(null)

// Reset the editor when the parent swaps in a different document so undo
// history starts from the loaded markdown, not from the placeholder shell.
watch(() => props.modelValue, (newVal) => {
  if (newVal === code.value) {
    if (lastEmittedValue.value === newVal) {
      lastEmittedValue.value = null
    }
    return
  }

  code.value = newVal

  if (lastEmittedValue.value === newVal) {
    lastEmittedValue.value = null
    return
  }

  editorKey.value += 1
})

// Sync changes back
function handleChange(value: string) {
  lastEmittedValue.value = value
  code.value = value
  emit('update:modelValue', value)
}

// Editor ready — vue-codemirror 传入 { view, state, container }
function handleReady(payload: ReadyPayload) {
  emit('ready', payload)
  void nextTick(() => {
    payload.view.requestMeasure()
  })
}

// Extensions
const baseExtensions = markRaw([
  markRaw(markdown({
    base: markdownLanguage,
    codeLanguages: languages,
  })),
  markRaw(oneDark),
  markRaw(EditorView.lineWrapping),
])
const extensions = shallowRef(baseExtensions)
</script>

<template>
  <div class="markdown-editor">
    <Codemirror
      :key="editorKey"
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
