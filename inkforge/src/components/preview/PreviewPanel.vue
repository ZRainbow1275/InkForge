<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useArticleStore } from '@/stores/article'
import { useEditorStore } from '@/stores/editor'
import { storeToRefs } from 'pinia'
import {
  ArrowLeft, CheckCircle, Copy, Calendar, ExternalLink,
  Eye, Maximize2, Tag, User
} from 'lucide-vue-next'
import {
  convertToPlatform, getPlatformPresets, copyToClipboard, getDefaultPreset,
  markdownToXiaohongshuText, markdownToZhihuClean,
} from '@/services/export'
import { renderXhsMockHtml } from '@/services/export/preview-fidelity/xiaohongshu-mock'
import { renderZhihuMockHtml } from '@/services/export/preview-fidelity/zhihu-mock'
import type { Platform } from '@/services/export'
import ExportModal from '@/components/export/ExportModal.vue'
import { resolveExportIcon } from '@/utils/iconography'

const articleStore = useArticleStore()
const editorStore = useEditorStore()
const { selectedArticle } = storeToRefs(articleStore)
const { currentContent } = storeToRefs(editorStore)

// ─── 导出模态框 ────────────────────────────────────
const showExportModal = ref(false)

// ─── 平台选择 ──────────────────────────────────────
const PLATFORMS = [
  { id: 'wechat' as Platform, name: '微信', icon: 'wechat' },
  { id: 'xiaohongshu' as Platform, name: '小红书', icon: 'xiaohongshu' },
  { id: 'zhihu' as Platform, name: '知乎', icon: 'zhihu' },
] as const

const selectedPlatform = ref<Platform>('wechat')
const platformInfo = computed(() => PLATFORMS.find(p => p.id === selectedPlatform.value)!)

// ─── 预设管理（按平台独立记忆） ───────────────────
interface PresetDisplay { id: string; name: string; icon: string }

const platformPresetIds = ref<Record<Platform, string>>({
  wechat: getDefaultPreset().id,
  xiaohongshu: 'xhs-fresh',
  zhihu: 'zhihu-academic',
})

const selectedPresetId = computed(() => platformPresetIds.value[selectedPlatform.value])

const currentPresets = computed((): PresetDisplay[] => {
  const presets = getPlatformPresets(selectedPlatform.value)
  return presets.map(p => ({ id: p.id, name: p.name, icon: p.icon }))
})

function selectPreset(id: string) {
  platformPresetIds.value[selectedPlatform.value] = id
}

// ─── 预览 HTML ────────────────────────────────────
const previewHtml = ref('')
const copySuccess = ref(false)

// 竞态保护
let renderVersion = 0

watch([currentContent, selectedPresetId, selectedPlatform], async () => {
  if (!currentContent.value?.body) {
    previewHtml.value = ''
    return
  }
  const thisVersion = ++renderVersion
  const md = currentContent.value.body
  const platform = selectedPlatform.value
  const presetId = selectedPresetId.value
  let html: string
  if (platform === 'xiaohongshu') {
    const r = markdownToXiaohongshuText(md)
    const presetMatch = presetId.match(/^xhs-(fresh|simple|warm|tech|nature)$/)
    html = renderXhsMockHtml(
      {
        text: r.text,
        title: r.title,
        body: r.body,
        hashtags: r.hashtags,
        suggestedTags: r.suggestedTags,
        charCount: r.charCount,
        overLimit: r.overLimit,
      },
      { presetId: (presetMatch?.[1] as 'fresh' | 'simple' | 'warm' | 'tech' | 'nature' | undefined) }
    )
  } else if (platform === 'zhihu') {
    const r = markdownToZhihuClean(md)
    const presetMatch = presetId.match(/^zhihu-(academic|tech|insight)$/)
    html = renderZhihuMockHtml(
      {
        markdown: r.markdown,
        latexBlocks: r.latexBlocksConverted,
        latexInlines: r.latexInlinesConverted,
        mermaidCount: r.mermaidCount,
        taskListCount: r.taskListCount,
      },
      { presetId: (presetMatch?.[1] as 'academic' | 'tech' | 'insight' | undefined) }
    )
  } else {
    html = await convertToPlatform(md, platform, { presetId })
  }
  if (renderVersion === thisVersion) {
    previewHtml.value = html
  }
}, { immediate: true, deep: true })

// ─── 复制 ─────────────────────────────────────────
async function handleCopy() {
  if (!previewHtml.value) return

  const success = await copyToClipboard(previewHtml.value)
  if (success) {
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}
</script>

<template>
  <div class="preview-panel">
    <template v-if="selectedArticle">
      <!-- 元数据区 -->
      <div class="metadata">
        <h1 class="article-title">
          {{ selectedArticle.title }}
        </h1>

        <div class="meta-row">
          <span class="meta-item">
            <ExternalLink :size="14" />
            <a
              :href="selectedArticle.sourceUrl"
              target="_blank"
              class="source-link"
            >
              {{ selectedArticle.sourceName }}
            </a>
          </span>
        </div>

        <div class="meta-row">
          <span
            v-if="selectedArticle.authors?.length"
            class="meta-item"
          >
            <User :size="14" />
            {{ selectedArticle.authors.join(', ') }}
          </span>
          <span
            v-if="selectedArticle.publishedAt"
            class="meta-item"
          >
            <Calendar :size="14" />
            {{ new Date(selectedArticle.publishedAt).toLocaleDateString('zh-CN') }}
          </span>
        </div>

        <div
          v-if="selectedArticle.tags?.length"
          class="tags-row"
        >
          <Tag :size="14" />
          <span
            v-for="tag in selectedArticle.tags"
            :key="tag"
            class="tag"
          >
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- 平台选择 -->
      <div class="platform-section">
        <div class="platform-pills">
          <button
            v-for="p in PLATFORMS"
            :key="p.id"
            class="platform-pill"
            :class="{ active: selectedPlatform === p.id }"
            @click="selectedPlatform = p.id"
          >
            <component
              :is="resolveExportIcon(p.icon, p.id)"
              class="platform-icon"
              :size="14"
              :stroke-width="2"
            />
            {{ p.name }}
          </button>
        </div>
      </div>

      <!-- 预设选择 -->
      <div class="preset-section">
        <h3 class="preset-heading">
          <component
            :is="resolveExportIcon(platformInfo.icon, platformInfo.id)"
            class="section-icon"
            :size="14"
            :stroke-width="2"
          />
          <span>文章风格</span>
        </h3>
        <div class="preset-grid">
          <button
            v-for="preset in currentPresets"
            :key="preset.id"
            class="preset-btn"
            :class="{ active: selectedPresetId === preset.id }"
            @click="selectPreset(preset.id)"
          >
            <component
              :is="resolveExportIcon(preset.id || preset.icon, preset.id)"
              class="preset-icon"
              :size="16"
              :stroke-width="2"
            />
            <span class="preset-name">{{ preset.name }}</span>
          </button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <button
          class="action-btn primary"
          :class="{ success: copySuccess }"
          @click="handleCopy"
        >
          <CheckCircle
            v-if="copySuccess"
            :size="16"
          />
          <Copy
            v-else
            :size="16"
          />
          {{ copySuccess ? '已复制!' : `复制到${platformInfo.name}` }}
        </button>
        <button
          class="action-btn"
          title="全屏导出"
          @click="showExportModal = true"
        >
          <Maximize2 :size="16" />
        </button>
      </div>

      <!-- 预览区域 -->
      <div class="preview-section">
        <h3 class="preview-title">
          <Eye :size="14" />
          <span>预览效果</span>
        </h3>
        <div class="preview-frame">
          <div
            class="preview-content"
            v-html="previewHtml"
          />
        </div>
      </div>
    </template>

    <div
      v-else
      class="empty-state"
    >
      <p class="empty-state-copy">
        <ArrowLeft :size="14" />
        <span>请从左侧选择一条资讯</span>
      </p>
    </div>

    <!-- 导出模态框 -->
    <ExportModal
      :visible="showExportModal"
      :content="currentContent?.body || ''"
      @close="showExportModal = false"
    />
  </div>
</template>

<style scoped>
.preview-panel {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.metadata {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.article-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
  margin-bottom: 12px;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.source-link {
  color: var(--color-primary);
  text-decoration: none;
}

.source-link:hover {
  text-decoration: underline;
}

.tags-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: var(--color-text-secondary);
}

.tag {
  font-size: 12px;
  padding: 3px 8px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
}

/* 平台选择 */
.platform-section {
  padding-bottom: 4px;
}

.platform-pills {
  display: flex;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}

.platform-pill {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.platform-pill:hover {
  color: var(--color-text);
}

.platform-pill.active {
  background: var(--color-bg);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: 600;
}

.platform-icon {
  flex-shrink: 0;
}

/* 预设选择 */
.preset-section h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.preset-heading,
.preview-title,
.empty-state-copy {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.section-icon {
  flex-shrink: 0;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  cursor: pointer;
  transition: all 0.15s ease;
}

.preset-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-secondary);
}

.preset-btn.active {
  border-color: var(--color-primary);
  background: rgba(0, 102, 204, 0.1);
}

.preset-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.preset-name {
  font-size: 11px;
  color: var(--color-text);
  text-align: center;
}

/* 操作按钮 */
.action-section {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s ease;
}

.action-btn.primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
  flex: 1;
}

.action-btn.primary:hover {
  opacity: 0.9;
}

.action-btn.success {
  background: #10b981;
  border-color: #10b981;
}

/* 预览区域 */
.preview-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.preview-section h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.preview-frame {
  flex: 1;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: white;
  overflow-y: auto;
}

.preview-content {
  padding: 16px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--color-text-secondary);
  font-size: 14px;
}
</style>
