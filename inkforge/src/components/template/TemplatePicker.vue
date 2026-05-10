<!--
  TemplatePicker.vue
  文章模板选择器 — 按分类展示模板卡片，点击后确认插入
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import {
    Code2,
    FileText,
    GitBranch,
    LayoutTemplate,
    PenLine,
} from 'lucide-vue-next'
import {
    ARTICLE_TEMPLATES,
    getTemplatesByCategory,
    type ArticleTemplate,
} from '@/data/templates'

const emit = defineEmits<{
    (e: 'select', template: ArticleTemplate): void
    (e: 'close'): void
}>()

// 分组数据
const grouped = computed(() => getTemplatesByCategory())
const categoryNames = computed(() => Object.keys(grouped.value))

// 选中的模板（预览）
const selectedTemplate = ref<ArticleTemplate | null>(null)

// 搜索
const searchQuery = ref('')
const filteredTemplates = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    if (!q) return null // null 表示不过滤，使用分组视图
    return ARTICLE_TEMPLATES.filter(
        t => t.name.toLowerCase().includes(q) ||
             t.description.toLowerCase().includes(q)
    )
})

const iconMap: Record<string, ReturnType<typeof FileText>> = {
    guide: LayoutTemplate,
    review: FileText,
    diary: PenLine,
    devlog: Code2,
    news: FileText,
    notes: FileText,
    compare: GitBranch,
    memo: PenLine,
}

function resolveTemplateIcon(iconKey: string) {
    return iconMap[iconKey] ?? FileText
}

function handleSelect(template: ArticleTemplate) {
    selectedTemplate.value = template
}

function confirmSelect() {
    if (selectedTemplate.value) {
        emit('select', selectedTemplate.value)
    }
}

function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
        emit('close')
    }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="template-overlay"
      @click="handleBackdropClick"
    >
      <div class="template-modal">
        <!-- 头部 -->
        <div class="modal-header">
          <h3>选择模板</h3>
          <button
            class="close-btn"
            @click="$emit('close')"
          >
            &times;
          </button>
        </div>

        <!-- 搜索 -->
        <div class="search-bar">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9CA3AF"
            stroke-width="2"
          >
            <circle
              cx="11"
              cy="11"
              r="8"
            /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索模板…"
            class="search-input"
          >
        </div>

        <div class="modal-body">
          <!-- 模板网格 -->
          <div class="templates-area">
            <!-- 搜索模式：平铺显示 -->
            <template v-if="filteredTemplates">
              <div
                v-if="filteredTemplates.length === 0"
                class="empty-state"
              >
                没有匹配的模板
              </div>
              <div
                v-else
                class="template-grid"
              >
                <div
                  v-for="t in filteredTemplates"
                  :key="t.id"
                  class="template-card"
                  :class="{ selected: selectedTemplate?.id === t.id }"
                  @click="handleSelect(t)"
                  @dblclick="handleSelect(t); confirmSelect()"
                >
                  <span class="template-icon">
                    <component
                      :is="resolveTemplateIcon(t.icon)"
                      :size="18"
                      :stroke-width="2"
                    />
                  </span>
                  <span class="template-name">{{ t.name }}</span>
                  <span class="template-desc">{{ t.description }}</span>
                </div>
              </div>
            </template>

            <!-- 分组模式：按分类展示 -->
            <template v-else>
              <div
                v-for="catName in categoryNames"
                :key="catName"
                class="category-group"
              >
                <h4 class="category-title">
                  {{ catName }}
                </h4>
                <div class="template-grid">
                  <div
                    v-for="t in grouped[catName]"
                    :key="t.id"
                    class="template-card"
                    :class="{ selected: selectedTemplate?.id === t.id }"
                    @click="handleSelect(t)"
                    @dblclick="handleSelect(t); confirmSelect()"
                  >
                    <span class="template-icon">
                      <component
                        :is="resolveTemplateIcon(t.icon)"
                        :size="18"
                        :stroke-width="2"
                      />
                    </span>
                    <span class="template-name">{{ t.name }}</span>
                    <span class="template-desc">{{ t.description }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- 预览区 -->
          <div class="preview-area">
            <template v-if="selectedTemplate">
              <div class="preview-header">
                <span class="preview-icon">
                  <component
                    :is="resolveTemplateIcon(selectedTemplate.icon)"
                    :size="24"
                    :stroke-width="2"
                  />
                </span>
                <div>
                  <div class="preview-name">
                    {{ selectedTemplate.name }}
                  </div>
                  <div class="preview-desc">
                    {{ selectedTemplate.description }}
                  </div>
                </div>
              </div>
              <pre class="preview-body">{{ selectedTemplate.body }}</pre>
            </template>
            <div
              v-else
              class="preview-empty"
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#D1D5DB"
                stroke-width="1.5"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line
                  x1="16"
                  y1="13"
                  x2="8"
                  y2="13"
                />
                <line
                  x1="16"
                  y1="17"
                  x2="8"
                  y2="17"
                />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p>选择一个模板预览</p>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            class="btn btn-primary"
            :disabled="!selectedTemplate"
            @click="confirmSelect"
          >
            使用此模板
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.template-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(2px);
}

.template-modal {
    width: 90vw;
    max-width: 860px;
    max-height: 80vh;
    background: #FFFFFF;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #E5E7EB;
}

.modal-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1F2937;
}

.close-btn {
    border: none;
    background: none;
    font-size: 22px;
    color: #9CA3AF;
    cursor: pointer;
    padding: 0;
    line-height: 1;
}

.close-btn:hover {
    color: #1F2937;
}

.search-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-bottom: 1px solid #F3F4F6;
}

.search-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    color: #1F2937;
    background: transparent;
}

.search-input::placeholder {
    color: #9CA3AF;
}

.modal-body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.templates-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    border-right: 1px solid #E5E7EB;
}

.category-group {
    margin-bottom: 20px;
}

.category-group:last-child {
    margin-bottom: 0;
}

.category-title {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #9CA3AF;
}

.template-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.template-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.template-card:hover {
    border-color: #D1D5DB;
    background: #F9FAFB;
}

.template-card.selected {
    border-color: #D32F2F;
    background: rgba(211, 47, 47, 0.04);
}

.template-icon {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #D32F2F;
    flex-shrink: 0;
}

.template-name {
    font-size: 13px;
    font-weight: 600;
    color: #1F2937;
}

.template-desc {
    font-size: 11px;
    color: #9CA3AF;
    line-height: 1.4;
}

.preview-area {
    width: 340px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.preview-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid #F3F4F6;
}

.preview-icon {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #D32F2F;
    flex-shrink: 0;
}

.preview-name {
    font-size: 14px;
    font-weight: 600;
    color: #1F2937;
}

.preview-desc {
    font-size: 12px;
    color: #6B7280;
    margin-top: 2px;
}

.preview-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: #374151;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: 'SF Mono', 'Fira Code', monospace;
    background: #FAFBFC;
}

.preview-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #D1D5DB;
}

.preview-empty p {
    margin: 0;
    font-size: 13px;
    color: #9CA3AF;
}

.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #9CA3AF;
    font-size: 13px;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid #E5E7EB;
}

.btn {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    border: 1px solid;
}

.btn-secondary {
    background: #FFFFFF;
    border-color: #D1D5DB;
    color: #374151;
}

.btn-secondary:hover {
    background: #F9FAFB;
}

.btn-primary {
    background: #D32F2F;
    border-color: #D32F2F;
    color: #FFFFFF;
}

.btn-primary:hover {
    background: #B71C1C;
}

.btn-primary:disabled {
    background: #E5E7EB;
    border-color: #E5E7EB;
    color: #9CA3AF;
    cursor: not-allowed;
}
</style>
