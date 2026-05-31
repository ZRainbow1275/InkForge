<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
import type { Editor } from '@tiptap/core'
import {
  Bold,
  Clipboard,
  ClipboardPaste,
  Code,
  Eraser,
  ExternalLink,
  ImagePlus,
  Italic,
  Link,
  Minus,
  Scissors,
  Search,
  Strikethrough,
  Table,
  TextCursorInput,
} from 'lucide-vue-next'

const props = defineProps<{
  editor: Editor | undefined
  x: number
  y: number
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'request-link'): void
  (e: 'request-image'): void
  (e: 'request-find-replace'): void
}>()

const menuStyle = computed(() => ({
  top: `${props.y}px`,
  left: `${props.x}px`,
}))

const selectedText = computed(() => {
  const editor = props.editor
  if (!editor) {
    return ''
  }

  const { from, to } = editor.state.selection
  return editor.state.doc.textBetween(from, to, '\n').trim()
})

const selectionCount = computed(() => selectedText.value.length)

function close(): void {
  emit('close')
}

function runCommand(command: () => unknown | Promise<unknown>): void {
  void command()
  close()
}

function cutSelection(): void {
  document.execCommand('cut')
}

function copySelection(): void {
  document.execCommand('copy')
}

async function pasteText(): Promise<void> {
  if (!props.editor) {
    return
  }

  const text = await navigator.clipboard.readText()
  if (text) {
    props.editor.chain().focus().insertContent(text).run()
  }
}

function clearFormatting(): void {
  props.editor?.chain().focus().unsetAllMarks().clearNodes().run()
}

function openSelectionWindow(): void {
  const text = selectedText.value
  const win = window.open('', '_blank', 'noopener,noreferrer,width=760,height=640')
  if (!win) {
    return
  }

  win.document.write(`<!doctype html><html><head><title>InkForge Selection</title><meta charset="utf-8"><style>body{font-family:Georgia,serif;line-height:1.7;padding:32px;white-space:pre-wrap;color:#1f2937}</style></head><body>${escapeHtml(text || props.editor?.getText() || '')}</body></html>`)
  win.document.close()
}

function copySelectionCount(): void {
  void navigator.clipboard.writeText(String(selectionCount.value))
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function onDocumentPointerDown(event: globalThis.PointerEvent): void {
  const target = event.target
  if (target instanceof globalThis.Element && target.closest('.editor-context-menu')) {
    return
  }

  close()
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    close()
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      document.addEventListener('pointerdown', onDocumentPointerDown)
      document.addEventListener('keydown', onDocumentKeydown)
    } else {
      document.removeEventListener('pointerdown', onDocumentPointerDown)
      document.removeEventListener('keydown', onDocumentKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <div
    v-if="visible"
    class="editor-context-menu"
    :style="menuStyle"
    @contextmenu.prevent
  >
    <section class="menu-group">
      <button
        type="button"
        @click="runCommand(cutSelection)"
      >
        <Scissors :size="15" /><span>Cut</span>
      </button>
      <button
        type="button"
        @click="runCommand(copySelection)"
      >
        <Clipboard :size="15" /><span>Copy</span>
      </button>
      <button
        type="button"
        @click="runCommand(pasteText)"
      >
        <ClipboardPaste :size="15" /><span>Paste</span>
      </button>
    </section>

    <section class="menu-group">
      <button
        type="button"
        :class="{ active: editor?.isActive('bold') }"
        @click="runCommand(() => editor?.chain().focus().toggleBold().run())"
      >
        <Bold :size="15" /><span>Bold</span>
      </button>
      <button
        type="button"
        :class="{ active: editor?.isActive('italic') }"
        @click="runCommand(() => editor?.chain().focus().toggleItalic().run())"
      >
        <Italic :size="15" /><span>Italic</span>
      </button>
      <button
        type="button"
        :class="{ active: editor?.isActive('strike') }"
        @click="runCommand(() => editor?.chain().focus().toggleStrike().run())"
      >
        <Strikethrough :size="15" /><span>Strike</span>
      </button>
      <button
        type="button"
        :class="{ active: editor?.isActive('code') }"
        @click="runCommand(() => editor?.chain().focus().toggleCode().run())"
      >
        <Code :size="15" /><span>Inline code</span>
      </button>
      <button
        type="button"
        @click="runCommand(clearFormatting)"
      >
        <Eraser :size="15" /><span>清除格式</span>
      </button>
    </section>

    <section class="menu-group">
      <button
        type="button"
        @click="runCommand(() => emit('request-link'))"
      >
        <Link :size="15" /><span>Link</span>
      </button>
      <button
        type="button"
        @click="runCommand(() => emit('request-image'))"
      >
        <ImagePlus :size="15" /><span>Image</span>
      </button>
      <button
        type="button"
        @click="runCommand(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())"
      >
        <Table :size="15" /><span>Table</span>
      </button>
      <button
        type="button"
        @click="runCommand(() => editor?.chain().focus().setHorizontalRule().run())"
      >
        <Minus :size="15" /><span>Divider</span>
      </button>
    </section>

    <section class="menu-group">
      <button
        type="button"
        @click="runCommand(() => emit('request-find-replace'))"
      >
        <Search :size="15" /><span>Find / Replace</span>
      </button>
      <button
        type="button"
        @click="runCommand(copySelectionCount)"
      >
        <TextCursorInput :size="15" /><span>Selection chars: {{ selectionCount }}</span>
      </button>
      <button
        type="button"
        @click="runCommand(openSelectionWindow)"
      >
        <ExternalLink :size="15" /><span>Open in window</span>
      </button>
    </section>
  </div>
</template>

<style scoped>
.editor-context-menu {
  position: fixed;
  z-index: 220;
  min-width: 228px;
  max-width: 280px;
  padding: 7px;
  background: var(--bg-surface);
  border: 1px solid var(--hairline);
  border-radius: 14px;
  box-shadow: var(--elev-3);
  backdrop-filter: blur(12px);
}

.menu-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 5px 0;
}

.menu-group + .menu-group {
  border-top: 1px solid var(--hairline);
}

.editor-context-menu button {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 32px;
  padding: 7px 9px;
  color: var(--text-secondary);
  font-size: 0.86rem;
  text-align: left;
  background: transparent;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart);
}

.editor-context-menu button:hover {
  color: var(--text-primary);
  background: var(--bg-rice-paper);
}

.editor-context-menu button.active {
  color: var(--ember);
  background: var(--ember-soft);
  box-shadow: inset 2px 0 0 var(--ember);
}

.editor-context-menu button span {
  flex: 1;
}
</style>
