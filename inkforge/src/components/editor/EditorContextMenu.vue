<script setup lang="ts">
import type { Component } from 'vue'
import {
  Bold,
  CheckSquare,
  ClipboardPaste,
  Code,
  Copy,
  Eraser,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Scissors,
  Search,
  Strikethrough,
  Table,
  Underline,
} from 'lucide-vue-next'

interface ContextMenuItem {
  id: string
  label: string
  icon: Component
  shortcut?: string
  dividerAfter?: boolean
}

defineProps<{
  visible: boolean
  x: number
  y: number
}>()

const emit = defineEmits<{
  (e: 'command', value: string): void
}>()

const items: ContextMenuItem[] = [
  { id: 'cut', label: '剪切', icon: Scissors, shortcut: 'Ctrl+X' },
  { id: 'copy', label: '复制', icon: Copy, shortcut: 'Ctrl+C' },
  { id: 'paste', label: '粘贴', icon: ClipboardPaste, shortcut: 'Ctrl+V', dividerAfter: true },
  { id: 'bold', label: '加粗', icon: Bold, shortcut: 'Ctrl+B' },
  { id: 'italic', label: '斜体', icon: Italic, shortcut: 'Ctrl+I' },
  { id: 'underline', label: '下划线', icon: Underline, shortcut: 'Ctrl+U' },
  { id: 'strikethrough', label: '删除线', icon: Strikethrough, shortcut: 'Ctrl+Shift+S' },
  { id: 'inlineCode', label: '行内代码', icon: Code, shortcut: 'Ctrl+Shift+`' },
  { id: 'blockquote', label: '引用块', icon: Quote, shortcut: 'Ctrl+Shift+Q' },
  { id: 'bulletList', label: '无序列表', icon: List, shortcut: 'Ctrl+Shift+]' },
  { id: 'orderedList', label: '有序列表', icon: ListOrdered, shortcut: 'Ctrl+Shift+[', dividerAfter: true },
  { id: 'link', label: '插入链接', icon: Link2, shortcut: 'Ctrl+K' },
  { id: 'image', label: '插入图片', icon: ImagePlus, shortcut: '拖拽 / 粘贴' },
  { id: 'table', label: '插入表格', icon: Table, shortcut: 'Ctrl+T' },
  { id: 'horizontalRule', label: '插入分割线', icon: Minus, shortcut: 'Ctrl+Enter', dividerAfter: true },
  { id: 'findReplace', label: '查找替换', icon: Search, shortcut: 'Ctrl+H' },
  { id: 'clearFormat', label: '清除格式', icon: Eraser, shortcut: 'Ctrl+\\' },
  { id: 'selectAll', label: '全选', icon: CheckSquare, shortcut: 'Ctrl+A' },
]
</script>

<template>
  <Transition name="context-menu-fade">
    <section
      v-if="visible"
      class="editor-context-menu"
      :style="{ left: `${x}px`, top: `${y}px` }"
      @mousedown.stop
    >
      <template
        v-for="item in items"
        :key="item.id"
      >
        <button
          class="editor-context-menu__item"
          type="button"
          @click="emit('command', item.id)"
        >
          <span class="editor-context-menu__label">
            <component
              :is="item.icon"
              :size="14"
            />
            {{ item.label }}
          </span>
          <span
            v-if="item.shortcut"
            class="editor-context-menu__shortcut"
          >
            {{ item.shortcut }}
          </span>
        </button>
        <div
          v-if="item.dividerAfter"
          class="editor-context-menu__divider"
        />
      </template>
    </section>
  </Transition>
</template>

<style scoped>
.editor-context-menu {
  position: absolute;
  z-index: 30;
  min-width: 240px;
  max-width: 280px;
  padding: 6px;
  border-radius: 16px;
  border: 1px solid rgba(96, 125, 139, 0.14);
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(18px);
  box-shadow: 0 20px 40px rgba(38, 50, 56, 0.16), 0 2px 8px rgba(38, 50, 56, 0.08);
}

.editor-context-menu__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #37474f;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.editor-context-menu__item:hover {
  background: rgba(211, 47, 47, 0.08);
}

.editor-context-menu__label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
}

.editor-context-menu__shortcut {
  flex-shrink: 0;
  font-size: 11px;
  color: #78909c;
  font-family: 'JetBrains Mono', 'SF Mono', monospace;
}

.editor-context-menu__divider {
  height: 1px;
  margin: 4px 8px;
  background: rgba(96, 125, 139, 0.12);
}

.context-menu-fade-enter-active,
.context-menu-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.context-menu-fade-enter-from,
.context-menu-fade-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

[data-theme='dark'] .editor-context-menu {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(30, 41, 59, 0.96);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.34);
}

[data-theme='dark'] .editor-context-menu__item {
  color: #e2e8f0;
}

[data-theme='dark'] .editor-context-menu__item:hover {
  background: rgba(239, 83, 80, 0.14);
}

[data-theme='dark'] .editor-context-menu__shortcut {
  color: #94a3b8;
}

[data-theme='dark'] .editor-context-menu__divider {
  background: rgba(148, 163, 184, 0.14);
}
</style>
