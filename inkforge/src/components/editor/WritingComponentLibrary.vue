<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Blocks,
  Check,
  Download,
  FileJson,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-vue-next'

import {
  deleteCustomWritingComponentDefinition,
  exportCustomWritingComponentDefinitions,
  importCustomWritingComponentDefinitions,
  listWritingComponentDefinitions,
  parseWritingComponentSource,
  renderWritingComponentSource,
  saveCustomWritingComponentDefinition,
  serializeWritingComponentNode,
  validateWritingComponentNode,
  type CustomWritingComponentDefinition,
  type WritingComponentDefinition,
  type WritingComponentProp,
  type WritingComponentProps,
} from '@/services/writing-components'

const props = defineProps<{
  visible: boolean
  initialSource?: string
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'insert', source: string): void
}>()

type LibraryTab = 'built-in' | 'custom'

const activeTab = ref<LibraryTab>('built-in')
const searchQuery = ref('')
const definitions = ref<WritingComponentDefinition[]>([])
const selectedId = ref('')
const formProps = ref<WritingComponentProps>({})
const sourceRecoveryMessage = ref('')
const customEditorVisible = ref(false)
const customEditorError = ref('')
const customEditingId = ref<string | null>(null)
const customDraft = ref<CustomWritingComponentDefinition>({
  id: 'CustomCard',
  label: '',
  description: '',
  accent: '#D32F2F',
})
const importInputRef = ref<HTMLInputElement | null>(null)
const dialogRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)

const selectedDefinition = computed(() => (
  definitions.value.find(definition => definition.id === selectedId.value) ?? null
))

const visibleDefinitions = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('zh-CN')
  return definitions.value.filter(definition => {
    if (activeTab.value === 'built-in' ? !definition.builtIn : definition.builtIn) return false
    return !query || [definition.label, definition.description, definition.id, definition.category]
      .some(value => value.toLocaleLowerCase('zh-CN').includes(query))
  })
})

const currentNode = computed(() => {
  const definition = selectedDefinition.value
  return definition
    ? {
        componentId: definition.id,
        version: definition.version,
        props: { ...formProps.value },
      }
    : null
})

const validation = computed(() => (
  currentNode.value
    ? validateWritingComponentNode(currentNode.value)
    : {
        status: 'unknown' as const,
        node: null,
        definition: null,
        issues: sourceRecoveryMessage.value ? [sourceRecoveryMessage.value] : [],
      }
))

const canonicalSource = computed(() => (
  currentNode.value ? serializeWritingComponentNode(currentNode.value) : ''
))

const previewHtml = computed(() => (
  validation.value.status === 'ready'
    ? renderWritingComponentSource(canonicalSource.value) ?? ''
    : ''
))

const insertLabel = computed(() => {
  if (validation.value.status === 'ready') return props.initialSource ? '更新组件' : '插入组件'
  return props.initialSource ? '保存待补充组件' : '插入待补充组件'
})
const canInsert = computed(() => (
  Boolean(canonicalSource.value)
  && (validation.value.status === 'ready' || validation.value.status === 'incomplete')
))

function emptyFieldValue(type: WritingComponentDefinition['fields'][number]['type']): WritingComponentProp {
  if (type === 'boolean') return false
  return ''
}

function selectDefinition(definition: WritingComponentDefinition, values?: WritingComponentProps): void {
  selectedId.value = definition.id
  sourceRecoveryMessage.value = ''
  formProps.value = Object.fromEntries(
    definition.fields.map(field => [
      field.key,
      values?.[field.key] ?? emptyFieldValue(field.type),
    ]),
  )
}

function refreshDefinitions(): void {
  definitions.value = listWritingComponentDefinitions()
}

function resetLibrary(): void {
  refreshDefinitions()
  searchQuery.value = ''
  customEditorVisible.value = false
  customEditorError.value = ''
  sourceRecoveryMessage.value = ''

  const parsed = props.initialSource
    ? parseWritingComponentSource(props.initialSource)
    : null
  if (parsed?.definition && parsed.node) {
    activeTab.value = parsed.definition.builtIn ? 'built-in' : 'custom'
    selectDefinition(parsed.definition, parsed.node.props)
    return
  }
  if (parsed) {
    selectedId.value = ''
    formProps.value = {}
    sourceRecoveryMessage.value = parsed.issues.join(' ') || '该组件暂时无法编辑，原始语法仍会保留。'
    return
  }

  activeTab.value = 'built-in'
  const first = definitions.value.find(definition => definition.builtIn)
  if (first) selectDefinition(first)
}

watch(
  () => [props.visible, props.initialSource] as const,
  ([visible]) => {
    if (!visible) return
    resetLibrary()
    void nextTick(() => searchInputRef.value?.focus())
  },
  { immediate: true },
)

watch(activeTab, () => {
  const selected = selectedDefinition.value
  if (selected && (activeTab.value === 'built-in') === selected.builtIn) return
  const first = visibleDefinitions.value[0]
  if (first) selectDefinition(first)
  else {
    selectedId.value = ''
    formProps.value = {}
  }
})

function updateField(key: string, event: Event): void {
  const target = event.target as EventTarget & { value: string }
  formProps.value = { ...formProps.value, [key]: target.value }
}

function updateBooleanField(key: string, event: Event): void {
  const target = event.target as HTMLInputElement
  formProps.value = { ...formProps.value, [key]: target.checked }
}

function close(): void {
  emit('close')
}

function insert(): void {
  if (!canInsert.value) return
  emit('insert', canonicalSource.value)
}

function beginCustomCreate(): void {
  customEditingId.value = null
  customDraft.value = {
    id: 'CustomCard',
    label: '',
    description: '',
    accent: '#D32F2F',
  }
  customEditorError.value = ''
  customEditorVisible.value = true
}

function beginCustomEdit(): void {
  const selected = selectedDefinition.value
  if (!selected || selected.builtIn) return
  const persisted = definitions.value.find(definition => definition.id === selected.id)
  customEditingId.value = selected.id
  customDraft.value = {
    id: selected.id,
    label: selected.label,
    description: selected.description,
    accent: persisted?.accent ?? '#D32F2F',
  }
  customEditorError.value = ''
  customEditorVisible.value = true
}

function saveCustom(): void {
  try {
    const saved = saveCustomWritingComponentDefinition(customDraft.value)
    if (customEditingId.value && customEditingId.value !== saved.id) {
      deleteCustomWritingComponentDefinition(customEditingId.value)
    }
    refreshDefinitions()
    const definition = definitions.value.find(item => item.id === saved.id)
    if (definition) {
      activeTab.value = 'custom'
      selectDefinition(definition)
    }
    customEditorVisible.value = false
    customEditingId.value = null
    customEditorError.value = ''
  } catch (error) {
    customEditorError.value = error instanceof Error ? error.message : '自定义组件保存失败。'
  }
}

function removeCustom(): void {
  const selected = selectedDefinition.value
  if (!selected || selected.builtIn) return
  if (!window.confirm(`删除自定义组件“${selected.label}”？已有文稿中的原始语法会继续保留。`)) return
  deleteCustomWritingComponentDefinition(selected.id)
  refreshDefinitions()
  const next = definitions.value.find(definition => !definition.builtIn)
  if (next) selectDefinition(next)
  else {
    selectedId.value = ''
    formProps.value = {}
  }
}

function exportCustom(): void {
  const blob = new Blob([exportCustomWritingComponentDefinitions()], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'inkforge-writing-components.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

function requestImport(): void {
  importInputRef.value?.click()
}

async function importCustom(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    importCustomWritingComponentDefinitions(await file.text())
    refreshDefinitions()
    const first = definitions.value.find(definition => !definition.builtIn)
    if (first) {
      activeTab.value = 'custom'
      selectDefinition(first)
    }
    customEditorError.value = ''
  } catch (error) {
    customEditorError.value = error instanceof Error ? error.message : '组件定义导入失败。'
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (!props.visible) return
  if (event.key === 'Escape') {
    event.preventDefault()
    if (customEditorVisible.value) {
      customEditorVisible.value = false
      return
    }
    close()
    return
  }
  if (event.key !== 'Tab' || !dialogRef.value) return

  const focusable = Array.from(dialogRef.value.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )).filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true')
  if (focusable.length === 0) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  if (event.shiftKey && (active === first || !dialogRef.value.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="component-library">
      <div
        v-if="visible"
        class="component-library-backdrop"
        @mousedown.self="close"
      >
        <section
          ref="dialogRef"
          class="component-library"
          role="dialog"
          aria-modal="true"
          aria-labelledby="component-library-title"
          tabindex="-1"
        >
          <header class="component-library__header">
            <div class="component-library__title">
              <Blocks :size="22" />
              <div>
                <h2 id="component-library-title">
                  组件
                </h2>
                <p>把结构化内容插入当前文稿光标；缺少真实字段时只保留待补充节点。</p>
              </div>
            </div>
            <button
              type="button"
              class="icon-button"
              aria-label="关闭组件库"
              @click="close"
            >
              <X :size="20" />
            </button>
          </header>

          <nav
            class="component-library__tabs"
            role="tablist"
            aria-label="组件类型"
          >
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'built-in'"
              :tabindex="activeTab === 'built-in' ? 0 : -1"
              :class="{ active: activeTab === 'built-in' }"
              @click="activeTab = 'built-in'"
            >
              <Blocks :size="16" />
              内置组件
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeTab === 'custom'"
              :tabindex="activeTab === 'custom' ? 0 : -1"
              :class="{ active: activeTab === 'custom' }"
              @click="activeTab = 'custom'"
            >
              <FileJson :size="16" />
              自定义组件
            </button>
          </nav>

          <div class="component-library__toolbar">
            <label class="component-search">
              <Search :size="17" />
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="search"
                placeholder="搜索组件、用途或分类"
                aria-label="搜索组件"
              >
            </label>
            <div
              v-if="activeTab === 'custom'"
              class="custom-actions"
            >
              <button
                type="button"
                @click="exportCustom"
              >
                <Download :size="15" />
                导出
              </button>
              <button
                type="button"
                @click="requestImport"
              >
                <Upload :size="15" />
                导入
              </button>
              <button
                type="button"
                class="primary-compact"
                @click="beginCustomCreate"
              >
                <Plus :size="15" />
                新建
              </button>
              <input
                ref="importInputRef"
                type="file"
                accept="application/json,.json"
                hidden
                @change="importCustom"
              >
            </div>
          </div>

          <main class="component-library__main">
            <aside
              class="component-catalog"
              role="listbox"
              aria-label="组件列表"
            >
              <button
                v-for="definition in visibleDefinitions"
                :key="definition.id"
                type="button"
                role="option"
                :aria-selected="definition.id === selectedId"
                class="component-catalog__item"
                :class="{ active: definition.id === selectedId }"
                @click="selectDefinition(definition)"
              >
                <span class="component-catalog__icon">
                  <Blocks :size="17" />
                </span>
                <span class="component-catalog__copy">
                  <strong>{{ definition.label }}</strong>
                  <small>{{ definition.description }}</small>
                  <span>{{ definition.category }} · {{ definition.fields.length }} 个字段</span>
                </span>
              </button>
              <div
                v-if="visibleDefinitions.length === 0"
                class="component-catalog__empty"
              >
                {{ activeTab === 'custom' ? '暂无自定义组件，可点击“新建”创建。' : '没有匹配的内置组件。' }}
              </div>
            </aside>

            <section class="component-editor">
              <template v-if="selectedDefinition">
                <header class="component-editor__head">
                  <div>
                    <span>{{ selectedDefinition.category }}</span>
                    <h3>{{ selectedDefinition.label }}</h3>
                    <p>{{ selectedDefinition.description }}</p>
                  </div>
                  <div
                    v-if="!selectedDefinition.builtIn"
                    class="custom-definition-actions"
                  >
                    <button
                      type="button"
                      @click="beginCustomEdit"
                    >
                      编辑定义
                    </button>
                    <button
                      type="button"
                      class="danger"
                      aria-label="删除自定义组件"
                      @click="removeCustom"
                    >
                      <Trash2 :size="15" />
                    </button>
                  </div>
                </header>

                <div class="component-editor__body">
                  <form
                    class="component-fields"
                    @submit.prevent="insert"
                  >
                    <label
                      v-for="field in selectedDefinition.fields"
                      :key="field.key"
                      class="component-field"
                    >
                      <span>
                        {{ field.label }}
                        <b v-if="field.required">必填</b>
                      </span>
                      <textarea
                        v-if="field.type === 'textarea' || field.type === 'lines'"
                        :value="String(formProps[field.key] ?? '')"
                        :placeholder="field.placeholder"
                        rows="4"
                        @input="updateField(field.key, $event)"
                      />
                      <input
                        v-else-if="field.type === 'boolean'"
                        type="checkbox"
                        :checked="Boolean(formProps[field.key])"
                        @change="updateBooleanField(field.key, $event)"
                      >
                      <input
                        v-else
                        :type="field.type === 'number' ? 'number' : field.type === 'url' || field.type === 'https-url' ? 'url' : 'text'"
                        :value="String(formProps[field.key] ?? '')"
                        :placeholder="field.placeholder"
                        @input="updateField(field.key, $event)"
                      >
                      <small v-if="field.description">{{ field.description }}</small>
                    </label>
                  </form>

                  <aside class="component-preview">
                    <header>
                      <span>即时预览</span>
                      <span
                        class="component-status"
                        :class="validation.status"
                      >
                        {{ validation.status === 'ready' ? '可渲染' : '待补充' }}
                      </span>
                    </header>
                    <div
                      v-if="previewHtml"
                      class="component-preview__canvas"
                      v-html="previewHtml"
                    />
                    <div
                      v-else
                      class="component-preview__pending"
                    >
                      <Blocks :size="28" />
                      <strong>填写真实字段后显示渲染结果</strong>
                      <p>待补充组件可以保存到文稿，但不会向平台产物写入示例值。</p>
                    </div>
                    <ul
                      v-if="validation.issues.length"
                      class="component-issues"
                    >
                      <li
                        v-for="issue in validation.issues"
                        :key="issue"
                      >
                        {{ issue }}
                      </li>
                    </ul>
                    <code class="component-source">{{ canonicalSource }}</code>
                  </aside>
                </div>
              </template>

              <div
                v-else
                class="component-recovery"
              >
                <FileJson :size="30" />
                <h3>组件定义暂不可用</h3>
                <p>{{ sourceRecoveryMessage || '请选择或新建一个组件。' }}</p>
                <code v-if="initialSource">{{ initialSource }}</code>
              </div>
            </section>
          </main>

          <footer class="component-library__footer">
            <span>属性只保存为声明式数据，不执行脚本、事件或任意 HTML。</span>
            <div>
              <button
                type="button"
                @click="close"
              >
                取消
              </button>
              <button
                type="button"
                class="primary-action"
                :disabled="!canInsert"
                @click="insert"
              >
                <Check :size="16" />
                {{ insertLabel }}
              </button>
            </div>
          </footer>

          <section
            v-if="customEditorVisible"
            class="custom-editor"
            role="dialog"
            aria-label="自定义组件定义"
          >
            <header>
              <div>
                <h3>自定义组件定义</h3>
                <p>自定义组件使用固定安全字段：标题、正文和公开链接。</p>
              </div>
              <button
                type="button"
                class="icon-button"
                aria-label="关闭自定义组件定义"
                @click="customEditorVisible = false"
              >
                <X :size="18" />
              </button>
            </header>
            <div class="custom-editor__fields">
              <label>
                <span>组件标识</span>
                <input
                  v-model="customDraft.id"
                  type="text"
                  placeholder="CustomResearchCard"
                >
              </label>
              <label>
                <span>显示名称</span>
                <input
                  v-model="customDraft.label"
                  type="text"
                  placeholder="研究资料卡"
                >
              </label>
              <label>
                <span>用途说明</span>
                <input
                  v-model="customDraft.description"
                  type="text"
                  placeholder="说明这个组件适合放什么真实内容"
                >
              </label>
              <label>
                <span>强调色</span>
                <input
                  v-model="customDraft.accent"
                  type="color"
                >
              </label>
            </div>
            <p
              v-if="customEditorError"
              class="custom-editor__error"
            >
              {{ customEditorError }}
            </p>
            <footer>
              <button
                type="button"
                @click="customEditorVisible = false"
              >
                取消
              </button>
              <button
                type="button"
                class="primary-action"
                @click="saveCustom"
              >
                保存定义
              </button>
            </footer>
          </section>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.component-library-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1800;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(24, 30, 34, 0.72);
  backdrop-filter: blur(4px);
}

.component-library {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(1180px, 96vw);
  height: min(820px, 92vh);
  overflow: hidden;
  border: 1px solid var(--hairline);
  border-radius: 14px;
  background: var(--bg-surface);
  box-shadow: var(--elev-4);
  color: var(--text-primary);
}

.component-library__header,
.component-library__footer,
.component-library__toolbar,
.component-library__tabs {
  flex: 0 0 auto;
}

.component-library__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--hairline);
}

.component-library__title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.component-library__title > svg {
  margin-top: 3px;
  color: var(--ember);
}

.component-library h2,
.component-library h3,
.component-library p {
  margin: 0;
}

.component-library__title h2 {
  font-family: var(--font-display);
  font-size: 22px;
}

.component-library__title p,
.component-editor__head p,
.custom-editor header p {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.icon-button {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.icon-button:hover {
  border-color: var(--hairline);
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.component-library__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 10px 24px;
  background: var(--bg-rice-paper);
}

.component-library__tabs button,
.component-library__toolbar button,
.component-library__footer button,
.custom-definition-actions button,
.custom-editor button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  font: inherit;
  cursor: pointer;
}

.component-library__tabs button {
  min-height: 42px;
  border-color: transparent;
  background: transparent;
  font-weight: 650;
}

.component-library__tabs button.active {
  border-color: var(--hairline);
  background: var(--bg-surface);
  color: var(--text-primary);
  box-shadow: var(--elev-1);
}

.component-library__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--hairline);
}

.component-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(440px, 100%);
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--hairline);
  border-radius: 9px;
  background: var(--bg-surface);
  color: var(--text-muted);
}

.component-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
}

.custom-actions {
  display: flex;
  gap: 7px;
}

.component-library__toolbar button,
.component-library__footer button,
.custom-definition-actions button,
.custom-editor button {
  padding: 0 12px;
}

.primary-compact,
.primary-action {
  border-color: var(--ember) !important;
  background: var(--ember) !important;
  color: #fff !important;
}

.component-library__main {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  min-height: 0;
  flex: 1 1 auto;
}

.component-catalog {
  min-height: 0;
  overflow: auto;
  padding: 12px;
  border-right: 1px solid var(--hairline);
  background: var(--bg-rice-paper);
}

.component-catalog__item {
  display: flex;
  width: 100%;
  gap: 11px;
  padding: 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.component-catalog__item + .component-catalog__item {
  margin-top: 5px;
}

.component-catalog__item:hover,
.component-catalog__item.active {
  border-color: var(--hairline);
  background: var(--bg-surface);
}

.component-catalog__item.active {
  box-shadow: inset 3px 0 0 var(--ember);
}

.component-catalog__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  border-radius: 8px;
  background: var(--ember-soft);
  color: var(--ember);
}

.component-catalog__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.component-catalog__copy strong {
  font-size: 14px;
}

.component-catalog__copy small {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.component-catalog__copy span {
  color: var(--text-muted);
  font-size: 10px;
}

.component-catalog__empty,
.component-recovery {
  padding: 32px 18px;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
}

.component-editor {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 20px 24px;
}

.component-editor__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--hairline);
}

.component-editor__head > div > span {
  color: var(--ember);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .1em;
}

.component-editor__head h3 {
  margin-top: 4px;
  font-size: 20px;
}

.custom-definition-actions {
  display: flex;
  gap: 6px;
}

.custom-definition-actions .danger {
  padding: 0;
  width: 34px;
  color: var(--danger);
}

.component-editor__body {
  display: grid;
  grid-template-columns: minmax(260px, .85fr) minmax(320px, 1.15fr);
  gap: 24px;
  padding-top: 18px;
}

.component-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.component-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.component-field > span {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 650;
}

.component-field b {
  margin-left: 5px;
  color: var(--ember);
  font-size: 9px;
}

.component-field input:not([type='checkbox']),
.component-field textarea,
.custom-editor input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--hairline);
  border-radius: 8px;
  outline: 0;
  background: var(--bg-surface);
  color: var(--text-primary);
  font: inherit;
}

.component-field input:not([type='checkbox']),
.custom-editor input {
  min-height: 38px;
  padding: 0 11px;
}

.component-field textarea {
  min-height: 88px;
  padding: 9px 11px;
  resize: vertical;
}

.component-field input:focus,
.component-field textarea:focus,
.custom-editor input:focus {
  border-color: var(--ember);
  box-shadow: 0 0 0 3px var(--ember-soft);
}

.component-preview {
  align-self: start;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--bg-rice-paper);
}

.component-preview > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.component-status {
  padding: 3px 7px;
  border-radius: 999px;
  background: var(--warning-soft);
  color: var(--warning);
}

.component-status.ready {
  background: var(--success-soft);
  color: var(--success);
}

.component-preview__canvas {
  overflow: auto;
  max-height: 320px;
  padding: 12px;
  border: 1px solid var(--hairline);
  border-radius: 9px;
  background: #fff;
}

.component-preview__pending {
  display: grid;
  place-items: center;
  min-height: 180px;
  padding: 22px;
  border: 1px dashed var(--hairline);
  border-radius: 9px;
  color: var(--text-muted);
  text-align: center;
}

.component-preview__pending strong {
  margin-top: 10px;
  color: var(--text-secondary);
}

.component-preview__pending p {
  margin-top: 5px;
  font-size: 11px;
}

.component-issues {
  margin: 10px 0 0;
  padding: 10px 10px 10px 28px;
  border-radius: 8px;
  background: var(--warning-soft);
  color: var(--warning);
  font-size: 11px;
}

.component-source {
  display: block;
  max-height: 90px;
  overflow: auto;
  margin-top: 10px;
  padding: 9px;
  border-radius: 7px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 10px;
  white-space: pre-wrap;
  word-break: break-all;
}

.component-library__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 24px;
  border-top: 1px solid var(--hairline);
  color: var(--text-muted);
  font-size: 11px;
}

.component-library__footer > div {
  display: flex;
  gap: 8px;
}

.component-library__footer button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.component-recovery {
  display: grid;
  place-items: center;
  min-height: 300px;
}

.component-recovery h3 {
  margin-top: 12px;
}

.component-recovery p {
  margin-top: 6px;
}

.component-recovery code {
  margin-top: 14px;
  padding: 10px;
  border-radius: 7px;
  background: var(--bg-rice-paper);
  word-break: break-all;
}

.custom-editor {
  position: absolute;
  inset: 68px 80px auto;
  z-index: 3;
  padding: 20px;
  border: 1px solid var(--hairline);
  border-radius: 12px;
  background: var(--bg-surface);
  box-shadow: var(--elev-4);
}

.custom-editor > header,
.custom-editor > footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.custom-editor__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 18px 0;
}

.custom-editor__fields label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 12px;
}

.custom-editor__error {
  margin-bottom: 12px !important;
  color: var(--danger);
  font-size: 12px;
}

.custom-editor > footer {
  justify-content: flex-end;
}

.component-library-enter-active,
.component-library-leave-active {
  transition: opacity 160ms ease;
}

.component-library-enter-active .component-library,
.component-library-leave-active .component-library {
  transition: transform 180ms ease, opacity 160ms ease;
}

.component-library-enter-from,
.component-library-leave-to {
  opacity: 0;
}

.component-library-enter-from .component-library,
.component-library-leave-to .component-library {
  opacity: 0;
  transform: translateY(8px) scale(.985);
}

@media (max-width: 860px) {
  .component-library-backdrop {
    padding: 8px;
  }

  .component-library {
    width: 100%;
    height: 96vh;
  }

  .component-library__main {
    grid-template-columns: 1fr;
  }

  .component-catalog {
    max-height: 180px;
    border-right: 0;
    border-bottom: 1px solid var(--hairline);
  }

  .component-editor__body {
    grid-template-columns: 1fr;
  }

  .component-library__footer > span {
    display: none;
  }

  .custom-editor {
    inset: 56px 12px auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .component-library-enter-active,
  .component-library-leave-active,
  .component-library-enter-active .component-library,
  .component-library-leave-active .component-library {
    transition: none;
  }
}
</style>
