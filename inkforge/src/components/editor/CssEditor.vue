<script setup lang="ts">
import { computed, markRaw, ref, shallowRef, watch } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { css } from '@codemirror/lang-css'
import { oneDark } from '@codemirror/theme-one-dark'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'

const props = withDefaults(defineProps<{
  modelValue?: string
  title?: string
  placeholder?: string
  minHeight?: string
  dark?: boolean
  disabled?: boolean
}>(), {
  modelValue: undefined,
  title: '自定义 CSS',
  placeholder: '/* 在此输入自定义 CSS */',
  minHeight: '240px',
  dark: true,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const themeStore = useThemeStore()
const { customCSS } = storeToRefs(themeStore)
const usesExternalModel = computed(() => props.modelValue !== undefined)
const code = ref(usesExternalModel.value ? props.modelValue ?? '' : customCSS.value || '')

watch(
  () => props.modelValue,
  value => {
    if (usesExternalModel.value && value !== undefined && value !== code.value) {
      code.value = value
    }
  },
)

watch(customCSS, value => {
  if (!usesExternalModel.value && value !== code.value) {
    code.value = value
  }
})

watch(code, value => {
  if (usesExternalModel.value) {
    emit('update:modelValue', value)
    return
  }

  customCSS.value = value
})

const lightTheme = markRaw(EditorView.theme({
  '&': {
    backgroundColor: '#FFFFFF',
    color: '#263238',
  },
  '.cm-content': {
    caretColor: '#D32F2F',
  },
  '.cm-gutters': {
    backgroundColor: '#FAFBFC',
    color: '#78909C',
    borderRightColor: '#ECEFF1',
  },
  '&.cm-focused': {
    outline: 'none',
  },
}))

const extensions = shallowRef<Extension[]>([])

watch(
  () => props.dark,
  dark => {
    extensions.value = markRaw([
      markRaw(css()),
      markRaw(EditorView.lineWrapping),
      dark ? markRaw(oneDark) : lightTheme,
    ])
  },
  { immediate: true },
)

const editorStyle = computed(() => ({ minHeight: props.minHeight }))
</script>

<template>
  <div
    class="css-editor"
    :class="{ 'css-editor--light': !dark, 'css-editor--disabled': disabled }"
    :style="editorStyle"
  >
    <div class="editor-header">
      <span>{{ title }}</span>
      <span class="editor-header__meta">CSS / .editor-content</span>
    </div>
    <Codemirror
      v-model="code"
      :extensions="extensions"
      :autofocus="false"
      :disabled="disabled"
      :indent-with-tab="true"
      :tab-size="2"
      :placeholder="placeholder"
    />
  </div>
</template>

<style scoped>
.css-editor {
  display: flex;
  flex-direction: column;
  min-height: 240px;
  background: #1A1A1A;
  border: 1px solid rgba(38, 50, 56, 0.12);
  border-radius: 12px;
  overflow: hidden;
}

.css-editor--light {
  background: #FFFFFF;
}

.css-editor--disabled {
  opacity: 0.72;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #999;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.css-editor--light .editor-header {
  color: #607D8B;
  border-bottom-color: #ECEFF1;
}

.editor-header__meta {
  font-weight: 500;
  color: inherit;
  opacity: 0.72;
}

.css-editor :deep(.cm-editor) {
  flex: 1;
  min-height: inherit;
  font-family: var(--font-code-family, 'JetBrains Mono', 'Consolas', monospace);
  font-size: var(--typography-code-size, 13px);
}

.css-editor :deep(.cm-scroller) {
  padding: 12px;
}

.css-editor :deep(.cm-content) {
  min-height: 220px;
}
</style>
