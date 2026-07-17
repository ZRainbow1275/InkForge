<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Editor } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { ChevronDown, ChevronUp, Replace, Search, X } from 'lucide-vue-next'
import type { FindReplaceMode } from '@/extensions/KeyboardShortcuts'

interface FindMatch { from: number; to: number; text: string; replacement: string }
interface DecorationState { decorations: DecorationSet }
interface FindMeta { matches: FindMatch[]; activeIndex: number }

const props = defineProps<{ editor: Editor | undefined; mode: FindReplaceMode }>()
const emit = defineEmits<{ (event: 'close'): void }>()

const pluginKey = new PluginKey<DecorationState>('inkforgeFindReplace')
const plugin = new Plugin<DecorationState>({
  key: pluginKey,
  state: {
    init: () => ({ decorations: DecorationSet.empty }),
    apply: (tr, previous) => {
      const meta = tr.getMeta(pluginKey) as FindMeta | undefined
      if (!meta) return { decorations: previous.decorations.map(tr.mapping, tr.doc) }
      return {
        decorations: DecorationSet.create(tr.doc, meta.matches.map((match, index) => Decoration.inline(
          match.from,
          match.to,
          { class: index === meta.activeIndex ? 'inkforge-find-replace-match inkforge-find-replace-match--active' : 'inkforge-find-replace-match' },
        ))),
      }
    },
  },
  props: {
    decorations(state) {
      return pluginKey.getState(state)?.decorations ?? DecorationSet.empty
    },
  },
})

const query = ref('')
const replacement = ref('')
const caseSensitive = ref(false)
const regexEnabled = ref(false)
const wholeWord = ref(false)
const matches = ref<FindMatch[]>([])
const activeIndex = ref(0)
const errorMessage = ref('')
const queryInputRef = ref<HTMLInputElement | null>(null)
let activeEditor: Editor | undefined
let applyingDecorations = false

const isReplaceMode = computed(() => props.mode === 'replace')
const matchStatus = computed(() => {
  if (!query.value.trim()) return 'Type query'
  if (errorMessage.value) return 'Invalid pattern'
  return matches.value.length === 0 ? '0/0' : `${activeIndex.value + 1}/${matches.value.length}`
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isWordChar(value: string | undefined): boolean {
  return typeof value === 'string' && /[\p{L}\p{N}_]/u.test(value)
}

function isWholeWordMatch(text: string, index: number, length: number): boolean {
  return !wholeWord.value || (!isWordChar(text[index - 1]) && !isWordChar(text[index + length]))
}

function buildRegex(): RegExp | null {
  const raw = query.value.trim()
  if (!raw) {
    errorMessage.value = ''
    return null
  }
  try {
    errorMessage.value = ''
    return new RegExp(regexEnabled.value ? raw : escapeRegExp(raw), `g${caseSensitive.value ? '' : 'i'}u`)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Invalid regular expression'
    return null
  }
}

function replacementFor(matchText: string): string {
  if (!regexEnabled.value) return replacement.value
  try {
    return matchText.replace(new RegExp(query.value.trim(), `${caseSensitive.value ? '' : 'i'}u`), replacement.value)
  } catch {
    return replacement.value
  }
}

function collectMatches(editor: Editor): FindMatch[] {
  const matcher = buildRegex()
  if (!matcher) return []
  const found: FindMatch[] = []
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return true
    matcher.lastIndex = 0
    let match = matcher.exec(node.text)
    while (match) {
      const text = match[0]
      if (text.length === 0) {
        matcher.lastIndex += 1
      } else if (isWholeWordMatch(node.text, match.index, text.length)) {
        found.push({ from: pos + match.index, to: pos + match.index + text.length, text, replacement: replacementFor(text) })
      }
      match = matcher.exec(node.text)
    }
    return true
  })
  return found
}

function dispatchDecorations(editor: Editor): void {
  applyingDecorations = true
  editor.view.dispatch(editor.state.tr.setMeta(pluginKey, { matches: matches.value, activeIndex: activeIndex.value } satisfies FindMeta).setMeta('addToHistory', false))
  applyingDecorations = false
}

function selectActive(): void {
  const editor = props.editor
  const match = matches.value[activeIndex.value]
  if (!editor || !match) return
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, match.from, match.to)).scrollIntoView())
  editor.view.focus()
}

function refresh(shouldSelect: boolean): void {
  const editor = props.editor
  if (!editor) {
    matches.value = []
    activeIndex.value = 0
    return
  }
  matches.value = collectMatches(editor)
  activeIndex.value = matches.value.length === 0 ? 0 : Math.min(activeIndex.value, matches.value.length - 1)
  dispatchDecorations(editor)
  if (shouldSelect && matches.value.length > 0) selectActive()
}

function go(direction: 1 | -1): void {
  if (matches.value.length === 0) return
  activeIndex.value = (activeIndex.value + direction + matches.value.length) % matches.value.length
  if (props.editor) dispatchDecorations(props.editor)
  selectActive()
}

function replaceCurrent(): void {
  const editor = props.editor
  const match = matches.value[activeIndex.value]
  if (!editor || !match) return
  editor.chain().focus().insertContentAt({ from: match.from, to: match.to }, match.replacement).run()
  refresh(false)
}

function replaceAll(): void {
  const editor = props.editor
  if (!editor || matches.value.length === 0) return
  let chain = editor.chain().focus()
  for (const match of [...matches.value].sort((a, b) => b.from - a.from)) {
    chain = chain.insertContentAt({ from: match.from, to: match.to }, match.replacement)
  }
  chain.run()
  refresh(false)
}

function closePanel(): void {
  if (props.editor) {
    matches.value = []
    activeIndex.value = 0
    dispatchDecorations(props.editor)
  }
  emit('close')
}

function handlePanelKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closePanel()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (isReplaceMode.value && event.altKey) replaceCurrent()
    else go(event.shiftKey ? -1 : 1)
  }
}

function onEditorTransaction(): void {
  if (!applyingDecorations) refresh(false)
}

function detachEditor(): void {
  if (!activeEditor) return
  activeEditor.off('transaction', onEditorTransaction)
  try { activeEditor.unregisterPlugin(pluginKey) } catch { /* editor may be destroying */ }
  activeEditor = undefined
}

function attachEditor(editor: Editor): void {
  detachEditor()
  activeEditor = editor
  try { editor.unregisterPlugin(pluginKey) } catch { /* prevent duplicate plugin registration */ }
  editor.registerPlugin(plugin)
  editor.on('transaction', onEditorTransaction)
  refresh(false)
}

watch(() => props.editor, editor => { if (editor) attachEditor(editor); else detachEditor() }, { immediate: true })
watch([query, replacement, caseSensitive, regexEnabled, wholeWord], () => refresh(false))
watch(() => props.mode, () => { void nextTick(() => queryInputRef.value?.focus()) }, { immediate: true })
onBeforeUnmount(detachEditor)
</script>

<template>
  <section
    class="find-replace-panel"
    @keydown="handlePanelKeydown"
  >
    <header class="find-replace-header">
      <div class="find-replace-title">
        <Replace
          v-if="isReplaceMode"
          :size="16"
        />
        <Search
          v-else
          :size="16"
        />
        <span>{{ isReplaceMode ? 'Find and replace' : 'Find' }}</span>
      </div>
      <button
        type="button"
        class="find-replace-icon-btn"
        aria-label="Close find replace"
        @click="closePanel"
      >
        <X :size="16" />
      </button>
    </header>
    <div class="find-replace-row">
      <input
        ref="queryInputRef"
        v-model="query"
        class="find-replace-input"
        type="text"
        placeholder="Find text"
      >
      <span class="find-replace-count">{{ matchStatus }}</span>
    </div>
    <div
      v-if="isReplaceMode"
      class="find-replace-row"
    >
      <input
        v-model="replacement"
        class="find-replace-input"
        type="text"
        placeholder="Replace with"
      >
    </div>
    <p
      v-if="errorMessage"
      class="find-replace-error"
    >
      {{ errorMessage }}
    </p>
    <div class="find-replace-options">
      <label><input
        v-model="caseSensitive"
        type="checkbox"
      > Case</label>
      <label><input
        v-model="regexEnabled"
        type="checkbox"
      > Regex</label>
      <label><input
        v-model="wholeWord"
        type="checkbox"
      > Whole word</label>
    </div>
    <div class="find-replace-actions">
      <button
        type="button"
        class="find-replace-btn"
        :disabled="matches.length === 0"
        @click="go(-1)"
      >
        <ChevronUp :size="15" />Prev
      </button>
      <button
        type="button"
        class="find-replace-btn"
        :disabled="matches.length === 0"
        @click="go(1)"
      >
        <ChevronDown :size="15" />Next
      </button>
      <button
        v-if="isReplaceMode"
        type="button"
        class="find-replace-btn"
        :disabled="matches.length === 0"
        @click="replaceCurrent"
      >
        Replace
      </button>
      <button
        v-if="isReplaceMode"
        type="button"
        class="find-replace-btn primary"
        :disabled="matches.length === 0"
        @click="replaceAll"
      >
        Replace all
      </button>
    </div>
  </section>
</template>

<style scoped>
.find-replace-panel{position:absolute;top:18px;right:18px;z-index:150;width:min(360px,calc(100% - 36px));padding:14px;border:1px solid rgba(120,70,54,.14);border-radius:14px;background:rgba(255,252,246,.98);box-shadow:0 18px 48px rgba(62,39,35,.16);color:#3E2723}
.find-replace-header,.find-replace-title,.find-replace-row,.find-replace-options,.find-replace-actions,.find-replace-btn{display:flex;align-items:center}.find-replace-header{justify-content:space-between;margin-bottom:12px}.find-replace-title{gap:8px;font-size:13px;font-weight:700}.find-replace-row{gap:8px;margin-bottom:8px}.find-replace-input{flex:1;min-width:0;height:34px;border:1px solid rgba(120,70,54,.16);border-radius:10px;padding:0 10px;background:#fff;color:#3E2723;font-size:13px}.find-replace-input:focus{outline:2px solid rgba(211,47,47,.18);border-color:rgba(211,47,47,.38)}
.find-replace-icon-btn,.find-replace-btn{border:1px solid rgba(120,70,54,.14);background:#fff;color:#5D4037;cursor:pointer}.find-replace-icon-btn{width:28px;height:28px;border-radius:8px}.find-replace-count{min-width:72px;color:#8D6E63;font-size:12px;text-align:right}.find-replace-error{margin:2px 0 8px;color:#B71C1C;font-size:12px}.find-replace-options{flex-wrap:wrap;gap:10px;margin:10px 0 12px;color:#6D4C41;font-size:12px}.find-replace-actions{flex-wrap:wrap;gap:8px}.find-replace-btn{gap:4px;min-height:30px;border-radius:9px;padding:0 10px;font-size:12px}.find-replace-btn:hover:not(:disabled),.find-replace-icon-btn:hover{border-color:rgba(211,47,47,.34);color:#D32F2F}.find-replace-btn:disabled{cursor:not-allowed;opacity:.46}.find-replace-btn.primary{border-color:rgba(211,47,47,.36);background:#D32F2F;color:#fff}
:global(.inkforge-find-replace-match){border-radius:3px;background:rgba(255,213,79,.62);box-shadow:0 0 0 1px rgba(251,192,45,.28)}:global(.inkforge-find-replace-match--active){background:rgba(211,47,47,.22);box-shadow:0 0 0 2px rgba(211,47,47,.42)}
</style>
