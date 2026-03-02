<script setup lang="ts">
import { ref, watch } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { css } from '@codemirror/lang-css'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { storeToRefs } from 'pinia'
import { useThemeStore } from '@/stores/theme'

// Theme store
const themeStore = useThemeStore()
const { customCSS } = storeToRefs(themeStore)

// Local state
const code = ref(customCSS.value || '')

// Sync to store
watch(code, (newVal) => {
  customCSS.value = newVal
})

// Sync from store
watch(customCSS, (newVal) => {
  if (newVal !== code.value) {
    code.value = newVal
  }
})

// Extensions
const extensions = [
  css(),
  oneDark,
  EditorView.lineWrapping
]
</script>

<template>
  <div class="css-editor">
    <div class="editor-header">
      <span>自定义 CSS</span>
    </div>
    <Codemirror
      v-model="code"
      :extensions="extensions"
      :autofocus="false"
      :indent-with-tab="true"
      :tab-size="2"
      placeholder="/* 在此输入自定义 CSS，会实时应用到预览 */"
    />
  </div>
</template>

<style scoped>
.css-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1a1a;
}

.editor-header {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #999;
  border-bottom: 1px solid #333;
}

.css-editor :deep(.cm-editor) {
  flex: 1;
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 13px;
}

.css-editor :deep(.cm-scroller) {
  padding: 12px;
}
</style>
