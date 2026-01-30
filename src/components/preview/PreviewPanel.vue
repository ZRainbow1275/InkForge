<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useArticleStore } from '@/stores/article'
import { useEditorStore } from '@/stores/editor'
import { storeToRefs } from 'pinia'
import { 
  ExternalLink, User, Calendar, Tag, Copy, 
  CheckCircle, Maximize2
} from 'lucide-vue-next'
import { themePresets, convertToWechat, copyToClipboard, getDefaultPreset } from '@/services/export'
import ExportModal from '@/components/export/ExportModal.vue'
import type { ExportPreset } from '@/types'

const articleStore = useArticleStore()
const editorStore = useEditorStore()
const { selectedArticle } = storeToRefs(articleStore)
const { currentContent } = storeToRefs(editorStore)

// 导出模态框
const showExportModal = ref(false)

// 预设选择
const selectedPresetId = ref(getDefaultPreset().id)
const selectedPreset = computed(() => 
  themePresets.find(p => p.id === selectedPresetId.value) || getDefaultPreset()
)

// 预览HTML
const previewHtml = ref('')
const copySuccess = ref(false)

// 更新预览
watch([currentContent, selectedPresetId], async () => {
  if (currentContent.value?.body) {
    previewHtml.value = convertToWechat(currentContent.value.body, selectedPreset.value)
  }
}, { immediate: true, deep: true })

// 复制到微信
async function copyToWechat() {
  if (!previewHtml.value) return
  
  const success = await copyToClipboard(previewHtml.value)
  if (success) {
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  }
}

// 选择预设
function selectPreset(preset: ExportPreset) {
  selectedPresetId.value = preset.id
}
</script>

<template>
  <div class="preview-panel">
    <template v-if="selectedArticle">
      <!-- 元数据区 -->
      <div class="metadata">
        <h1 class="article-title">{{ selectedArticle.title }}</h1>
        
        <div class="meta-row">
          <span class="meta-item">
            <ExternalLink :size="14" />
            <a :href="selectedArticle.sourceUrl" target="_blank" class="source-link">
              {{ selectedArticle.sourceName }}
            </a>
          </span>
        </div>

        <div class="meta-row">
          <span v-if="selectedArticle.authors?.length" class="meta-item">
            <User :size="14" />
            {{ selectedArticle.authors.join(', ') }}
          </span>
          <span v-if="selectedArticle.publishedAt" class="meta-item">
            <Calendar :size="14" />
            {{ new Date(selectedArticle.publishedAt).toLocaleDateString('zh-CN') }}
          </span>
        </div>

        <div v-if="selectedArticle.tags?.length" class="tags-row">
          <Tag :size="14" />
          <span v-for="tag in selectedArticle.tags" :key="tag" class="tag">
            {{ tag }}
          </span>
        </div>
      </div>

      <!-- 预设选择 -->
      <div class="preset-section">
        <h3>📝 文章风格</h3>
        <div class="preset-grid">
          <button
            v-for="preset in themePresets"
            :key="preset.id"
            class="preset-btn"
            :class="{ active: selectedPresetId === preset.id }"
            @click="selectPreset(preset)"
            :title="preset.description"
          >
            <span class="preset-icon">{{ preset.icon }}</span>
            <span class="preset-name">{{ preset.name }}</span>
          </button>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <button 
          class="action-btn primary" 
          @click="copyToWechat"
          :class="{ success: copySuccess }"
        >
          <CheckCircle v-if="copySuccess" :size="16" />
          <Copy v-else :size="16" />
          {{ copySuccess ? '已复制!' : '复制到微信' }}
        </button>
        <button 
          class="action-btn"
          @click="showExportModal = true"
          title="全屏导出"
        >
          <Maximize2 :size="16" />
        </button>
      </div>

      <!-- 预览区域 -->
      <div class="preview-section">
        <h3>👁️ 预览效果</h3>
        <div class="preview-frame">
          <div class="preview-content" v-html="previewHtml"></div>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <p>👈 请从左侧选择一条资讯</p>
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

/* 预设选择 */
.preset-section h3 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
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
  font-size: 20px;
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
