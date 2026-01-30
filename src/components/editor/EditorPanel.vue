<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEditorStore } from '@/stores/editor'
import { useAIStore } from '@/stores/ai'
import { storeToRefs } from 'pinia'
import { 
  FileText, Mic, Save, RefreshCw, ChevronDown, Check, Loader2, Plus,
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Quote, Heading2, Heading3, Undo, Redo, AlertTriangle, Share2
} from 'lucide-vue-next'
import AIPanel from '@/components/ai/AIPanel.vue'
import type { EditedContent } from '@/types'
import EditorEmptyState from './EditorEmptyState.vue'
import { convertToWechat, themePresets, type ExportOptions } from '@/services/export'
import { WeChatFormat } from '@/extensions/WeChatFormat'

// Copy to WeChat using the full export pipeline
async function handleCopyToWeChat() {
  if (!bodyEditor.value) return
  const html = bodyEditor.value.getHTML()
  
  // 使用默认主题预设
  const preset = themePresets[0]
  const options: ExportOptions = {
    enableCiteStatus: true,
    enableCodeHighlight: true,
    enableReadingTime: true
  }
  
  const inlined = convertToWechat(html, preset, options)
  
  try {
    const blob = new Blob([inlined], { type: 'text/html' })
    await navigator.clipboard.write([
      new ClipboardItem({ 'text/html': blob })
    ])
    alert('已复制到剪贴板，请到公众号后台粘贴')
  } catch (_e) {
    // 剪贴板操作失败，静默处理
    alert('复制失败，请重试')
  }
}


const editorStore = useEditorStore()
const aiStore = useAIStore()
const { currentContent, currentVersion, status: editorStatus, error: editorError } = storeToRefs(editorStore)
const { loading: aiLoading, isAvailable: aiAvailable } = storeToRefs(aiStore)

// 派生状态
const isReady = computed(() => editorStatus.value === 'ready' || editorStatus.value === 'saving')
const isSaving = computed(() => editorStatus.value === 'saving')
const isLoading = computed(() => editorStatus.value === 'loading')

// 版本选择器状态
const showVersionDropdown = ref(false)

// 编辑模式
type EditMode = 'title' | 'body' | 'transcript'
const activeMode = ref<EditMode>('body')

// 本地编辑状态
const titleText = ref('')
const transcriptText = ref('')

const bodyEditor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [2, 3, 4]
      }
    }),
    Placeholder.configure({
      placeholder: '开始写作...'
    }),
    CharacterCount,
    WeChatFormat
  ],
  content: '',
  onUpdate: () => {
    // 使用防抖保存
    autoSave()
  }
})

// 同步内容 (仅当 Ready 时)
watch(currentContent, (content: EditedContent | null) => {
  if (content && isReady.value) {
    // 只有当本地值为空，或确实发生外部变更时才更新，避免光标跳动
    if (titleText.value !== content.title) {
       titleText.value = content.title
    }
    if (transcriptText.value !== content.transcript) {
       transcriptText.value = content.transcript
    }
    
    // 只在内容真正变化时更新编辑器
    if (bodyEditor.value && bodyEditor.value.getHTML() !== content.body) {
      bodyEditor.value.commands.setContent(content.body || '')
    }
  }
}, { immediate: true })

// 监听状态变化，重置编辑器
watch(editorStatus, (newStatus) => {
  if (newStatus === 'loading' || newStatus === 'idle') {
    titleText.value = ''
    transcriptText.value = ''
    bodyEditor.value?.commands.setContent('')
  }
})

// 字数统计
function countWords(text: string): number {
  return text.replace(/\s/g, '').length
}

function getBodyWordCount(): number {
  return bodyEditor.value?.storage.characterCount.characters() || 0
}

// 保存
let saveTimeout: ReturnType<typeof setTimeout>
function autoSave() {
  if (!isReady.value) return
  
  clearTimeout(saveTimeout)
  saveTimeout = setTimeout(saveContent, 2000)
}

async function saveContent() {
  if (!isReady.value) return 

  await editorStore.updateContent({
    title: titleText.value,
    body: bodyEditor.value?.getHTML() || '',
    transcript: transcriptText.value
  })
}

// 版本操作
function selectVersion(versionId: string) {
  editorStore.switchVersion(versionId)
  showVersionDropdown.value = false
}

async function createNewVersion() {
  await editorStore.createVersion()
  showVersionDropdown.value = false
}

// 格式化日期
function formatDate(date: Date): string {
  try {
      return new Date(date).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
  } catch (_e) {
      return '-'
  }
}

// 重新生成内容
async function regenerateContent() {
  if (!aiAvailable.value || aiLoading.value || !isReady.value) return
  
  // 根据当前编辑模式选择生成类型
  switch (activeMode.value) {
    case 'title':
      await aiStore.generateArticleTitle()
      break
    case 'body':
      await aiStore.polishCurrentArticle('专业')
      break
    case 'transcript':
      await aiStore.generateArticleTranscript()
      break
  }
}

// 工具栏按钮 (Helper)
type TipTapMarkOptions = { level?: number }
function isActive(type: string, options?: TipTapMarkOptions): boolean {
  return bodyEditor.value?.isActive(type, options) || false
}

const toggleBold = () => bodyEditor.value?.chain().focus().toggleBold().run()
const toggleItalic = () => bodyEditor.value?.chain().focus().toggleItalic().run()
const toggleStrike = () => bodyEditor.value?.chain().focus().toggleStrike().run()
const toggleCode = () => bodyEditor.value?.chain().focus().toggleCode().run()
const toggleBulletList = () => bodyEditor.value?.chain().focus().toggleBulletList().run()
const toggleOrderedList = () => bodyEditor.value?.chain().focus().toggleOrderedList().run()
const toggleBlockquote = () => bodyEditor.value?.chain().focus().toggleBlockquote().run()
const setHeading = (level: 2 | 3) => bodyEditor.value?.chain().focus().toggleHeading({ level }).run()
const undo = () => bodyEditor.value?.chain().focus().undo().run()
const redo = () => bodyEditor.value?.chain().focus().redo().run()

onBeforeUnmount(() => {
  bodyEditor.value?.destroy()
  clearTimeout(saveTimeout)
})
</script>

<template>
  <div class="editor-panel">
    
    <!-- 1. loading 状态 -->
    <div v-if="isLoading" class="state-container loading">
        <Loader2 :size="32" class="animate-spin" />
        <p>正在加载内容...</p>
    </div>

    <!-- 2. error 状态 -->
    <div v-else-if="editorStatus === 'error'" class="state-container error">
        <AlertTriangle :size="32" />
        <h3>发生错误</h3>
        <p>{{ editorError }}</p>
    </div>

    <!-- 3. idle 状态 (空状态) -->
    <EditorEmptyState v-else-if="editorStatus === 'idle'" />

    <!-- 4. ready/saving 状态 (编辑器) -->
    <template v-else>
      <!-- 模式切换标签 -->
      <div class="mode-tabs">
        <button 
          :class="{ active: activeMode === 'title' }"
          @click="activeMode = 'title'"
        >
          <FileText :size="14" />
          标题
          <span class="word-count">{{ countWords(titleText) }} 字</span>
        </button>
        <button 
          :class="{ active: activeMode === 'body' }"
          @click="activeMode = 'body'"
        >
          <FileText :size="14" />
          正文
          <span class="word-count">{{ getBodyWordCount() }} 字</span>
        </button>
        <button 
          :class="{ active: activeMode === 'transcript' }"
          @click="activeMode = 'transcript'"
        >
          <Mic :size="14" />
          口播稿
          <span class="word-count">{{ countWords(transcriptText) }} 字</span>
        </button>
      </div>

      <!-- 编辑区域 -->
      <div class="editor-area">
        <!-- 标题编辑 -->
        <div v-show="activeMode === 'title'" class="editor-section">
          <textarea 
            v-model="titleText"
            placeholder="输入标题..."
            class="editor-input title-input"
            @input="autoSave"
          ></textarea>
        </div>

        <!-- 正文编辑 (TipTap) -->
        <div v-show="activeMode === 'body'" class="editor-section tiptap-section">
          <!-- 工具栏 -->
          <div class="toolbar">
            <button class="toolbar-btn" :class="{ active: isActive('bold') }" @click="toggleBold" title="加粗">
              <Bold :size="16" />
            </button>
            <button class="toolbar-btn" :class="{ active: isActive('italic') }" @click="toggleItalic" title="斜体">
              <Italic :size="16" />
            </button>
            <button class="toolbar-btn" :class="{ active: isActive('strike') }" @click="toggleStrike" title="删除线">
              <Strikethrough :size="16" />
            </button>
            <button class="toolbar-btn" :class="{ active: isActive('code') }" @click="toggleCode" title="行内代码">
              <Code :size="16" />
            </button>
            
            <div class="toolbar-divider"></div>
            
            <button class="toolbar-btn" :class="{ active: isActive('heading', { level: 2 }) }" @click="setHeading(2)" title="二级标题">
              <Heading2 :size="16" />
            </button>
            <button class="toolbar-btn" :class="{ active: isActive('heading', { level: 3 }) }" @click="setHeading(3)" title="三级标题">
              <Heading3 :size="16" />
            </button>
            
            <div class="toolbar-divider"></div>
            
            <button class="toolbar-btn" :class="{ active: isActive('bulletList') }" @click="toggleBulletList" title="无序列表">
              <List :size="16" />
            </button>
            <button class="toolbar-btn" :class="{ active: isActive('orderedList') }" @click="toggleOrderedList" title="有序列表">
              <ListOrdered :size="16" />
            </button>
            <button class="toolbar-btn" :class="{ active: isActive('blockquote') }" @click="toggleBlockquote" title="引用">
              <Quote :size="16" />
            </button>
            
            <div class="toolbar-divider"></div>
            
            <button class="toolbar-btn" @click="undo" title="撤销">
              <Undo :size="16" />
            </button>
            <button class="toolbar-btn" @click="redo" title="重做">
              <Redo :size="16" />
            </button>
          </div>
          
          <!-- TipTap 编辑器 -->
          <EditorContent :editor="bodyEditor" class="tiptap-editor" />
        </div>

        <!-- 口播稿编辑 -->
        <div v-show="activeMode === 'transcript'" class="editor-section">
          <textarea 
            v-model="transcriptText"
            placeholder="输入口播稿..."
            class="editor-input transcript-input"
            @input="autoSave"
          ></textarea>
        </div>
      </div>

      <!-- 版本管理 -->
      <div class="version-section">
        <div class="version-selector">
          <button class="version-btn" @click="showVersionDropdown = !showVersionDropdown">
            <span>{{ currentVersion?.label || 'v1' }}</span>
            <ChevronDown :size="14" :class="{ 'rotate-180': showVersionDropdown }" />
          </button>
          
          <!-- 版本下拉菜单 -->
          <div v-if="showVersionDropdown" class="version-dropdown">
            <button 
              v-for="version in currentContent?.versions" 
              :key="version.id"
              class="version-item"
              :class="{ active: version.id === currentContent?.currentVersionId }"
              @click="selectVersion(version.id)"
            >
              <span class="version-label">{{ version.label }}</span>
              <span class="version-date">{{ formatDate(version.createdAt) }}</span>
            </button>
            <button class="version-item create-btn" @click="createNewVersion">
              <Plus :size="14" />
              <span>保存为新版本</span>
            </button>
          </div>
        </div>
        
        <!-- 保存状态 -->
        <div class="save-status">
          <template v-if="isSaving">
            <Loader2 :size="14" class="animate-spin" />
            <span>保存中...</span>
          </template>
          <template v-else>
            <Check :size="14" class="text-green" />
            <span>已就绪</span>
          </template>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="action-btn primary" @click="saveContent">
          <Save :size="16" />
          保存
        </button>
        <button class="action-btn wechat-copy" @click="handleCopyToWeChat" :disabled="!isReady">
          <Share2 :size="16" />
          复制到公众号
        </button>
        <button 
          class="action-btn" 
          @click="regenerateContent"
          :disabled="!aiAvailable || aiLoading"
          :title="!aiAvailable ? 'AI服务未连接' : '根据当前模式重新生成内容'"
        >
          <RefreshCw :size="16" :class="{ 'animate-spin': aiLoading }" />
          重新生成
        </button>
      </div>

      <!-- AI 助手面板 -->
      <AIPanel />
    </template>
  </div>
</template>

<style scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  /* Soviet: Strong border for the main stage */
  border-left: 2px solid #2c3e50;
  position: relative;
  overflow: hidden;
}

/* Container for Tiptap */
.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 0; /* Let ProseMirror handle padding */
}

/* Ensure empty state is centered */
.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.state-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: var(--color-text-secondary);
}

.state-container.error {
    color: #ef4444;
}

.mode-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
}

.mode-tabs button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.mode-tabs button:hover {
  background: var(--color-bg-secondary);
}

.mode-tabs button.active {
  background: var(--color-primary);
  color: white;
}

.word-count {
  font-size: 11px;
  opacity: 0.7;
}

.editor-area {
  flex: 1;
  overflow: hidden;
  padding: 12px 0;
  display: flex;
  flex-direction: column;
}

.editor-section {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tiptap-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.toolbar-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.toolbar-btn.active {
  background: var(--color-primary);
  color: white;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--color-border);
  margin: 0 4px;
}

/* TipTap 编辑器样式 */
.tiptap-editor {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 0 0 8px 8px;
  background: var(--color-bg);
}

.tiptap-editor :deep(.ProseMirror) {
  padding: 16px;
  min-height: 200px;
  outline: none;
  font-size: 15px;
  line-height: 1.8;
}

.tiptap-editor :deep(.ProseMirror p) {
  margin-bottom: 12px;
}

.tiptap-editor :deep(.ProseMirror h2) {
  font-size: 20px;
  font-weight: 700;
  margin: 24px 0 12px;
}

.tiptap-editor :deep(.ProseMirror h3) {
  font-size: 17px;
  font-weight: 600;
  margin: 20px 0 10px;
}

.tiptap-editor :deep(.ProseMirror blockquote) {
  border-left: 4px solid var(--color-primary);
  padding-left: 16px;
  margin: 16px 0;
  color: var(--color-text-secondary);
  font-style: italic;
}

.tiptap-editor :deep(.ProseMirror code) {
  background: var(--color-bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
}

.tiptap-editor :deep(.ProseMirror ul),
.tiptap-editor :deep(.ProseMirror ol) {
  padding-left: 24px;
  margin: 12px 0;
}

.tiptap-editor :deep(.ProseMirror li) {
  margin-bottom: 6px;
}

.tiptap-editor :deep(.ProseMirror-placeholder) {
  color: var(--color-text-secondary);
  opacity: 0.5;
}

/* 其他输入框 */
.editor-input {
  width: 100%;
  height: 100%;
  min-height: 200px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 15px;
  line-height: 1.8;
  resize: none;
  outline: none;
  transition: border-color 0.15s ease;
}

.editor-input:focus {
  border-color: var(--color-primary);
}

.editor-input::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.5;
}

.title-input {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.5;
}

.version-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--color-border);
}

.version-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  cursor: pointer;
  font-size: 13px;
}

.version-info {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.action-buttons {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--color-bg-secondary);
}

.action-btn.primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.action-btn.primary:hover {
  opacity: 0.9;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn.wechat-copy {
  background: #07c160;
  color: white;
  border-color: #07c160;
}

.action-btn.wechat-copy:hover {
  opacity: 0.9;
}

/* 版本选择器 */
.version-selector {
  position: relative;
}

.version-btn:hover {
  background: var(--color-bg-secondary);
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.2s ease;
}

.version-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  min-width: 200px;
  padding: 8px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 8px;
  z-index: 10;
}

.version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: background 0.15s ease;
}

.version-item:hover {
  background: var(--color-bg-secondary);
}

.version-item.active {
  background: rgba(0, 102, 204, 0.1);
  color: var(--color-primary);
}

.version-item.create-btn {
  border-top: 1px solid var(--color-border);
  margin-top: 4px;
  padding-top: 12px;
  color: var(--color-primary);
  justify-content: flex-start;
}

.version-label {
  font-weight: 500;
}

.version-date {
  font-size: 11px;
  color: var(--color-text-secondary);
}

/* 保存状态 */
.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.text-green {
  color: #10b981;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
