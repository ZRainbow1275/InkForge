<script setup lang="ts">
import { ref } from 'vue'
import { useArticleStore } from '@/stores/article'
import { storeToRefs } from 'pinia'
import { Plus, Star, Trash2, Loader2, AlertCircle, Link } from 'lucide-vue-next'

const articleStore = useArticleStore()
const { filteredArticles, selectedArticleId, parsing, parseError } = storeToRefs(articleStore)

// 添加资讯模态框状态
const showAddModal = ref(false)
const urlInput = ref('')
const addError = ref<string | null>(null)

function selectArticle(id: string) {
  articleStore.selectArticle(id)
}

function deleteArticle(id: string, event: Event) {
  event.stopPropagation()
  if (confirm('确定要删除这条资讯吗？')) {
    articleStore.deleteArticle(id)
  }
}

async function handleAddArticle() {
  if (!urlInput.value.trim()) return
  
  addError.value = null
  try {
    await articleStore.addArticleFromUrl(urlInput.value.trim())
    urlInput.value = ''
    showAddModal.value = false
  } catch (error) {
    addError.value = error instanceof Error ? error.message : '添加失败'
  }
}

function openAddModal() {
  showAddModal.value = true
  addError.value = null
  urlInput.value = ''
}
</script>

<template>
  <div class="article-panel">
    <!-- 解析中状态 -->
    <div v-if="parsing" class="parsing-status">
      <Loader2 :size="16" class="animate-spin" />
      <span>正在解析网页...</span>
    </div>

    <!-- 解析错误 -->
    <div v-if="parseError && !parsing" class="parse-error">
      <AlertCircle :size="16" />
      <span>{{ parseError }}</span>
    </div>

    <!-- 资讯列表 -->
    <div 
      v-for="article in filteredArticles" 
      :key="article.id"
      class="article-card"
      :class="{ active: selectedArticleId === article.id }"
      @click="selectArticle(article.id)"
    >
      <div class="source">
        <span class="source-name">{{ article.sourceName }}</span>
        <button 
          class="delete-btn"
          @click="deleteArticle(article.id, $event)"
          title="删除资讯"
        >
          <Trash2 :size="14" />
        </button>
      </div>
      <h3 class="title">{{ article.title }}</h3>
      <p class="description">{{ article.description }}</p>
      <div class="meta">
        <span class="score" v-if="article.score !== undefined">
          <Star :size="12" />
          {{ typeof article.score === 'number' ? article.score.toFixed(1) : '0.0' }}
        </span>
        <span class="tags" v-if="article.tags">
          <span 
            v-for="tag in article.tags.slice(0, 3)" 
            :key="tag" 
            class="tag"
          >
            {{ tag }}
          </span>
        </span>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredArticles.length === 0 && !parsing" class="empty-state">
      <p>暂无资讯</p>
      <button class="add-btn" @click="openAddModal">
        <Plus :size="16" />
        添加资讯
      </button>
    </div>

    <!-- 添加按钮（悬浮） -->
    <button v-if="filteredArticles.length > 0" class="fab" @click="openAddModal" :disabled="parsing">
      <Loader2 v-if="parsing" :size="20" class="animate-spin" />
      <Plus v-else :size="20" />
    </button>

    <!-- 添加资讯模态框 -->
    <Teleport to="body">
      <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <Link :size="18" />
              添加资讯
            </h3>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label>网页URL</label>
              <input 
                v-model="urlInput"
                type="url" 
                class="form-input"
                placeholder="https://example.com/article"
                @keydown.enter="handleAddArticle"
                autofocus
              />
            </div>
            
            <div v-if="addError" class="modal-error">
              <AlertCircle :size="14" />
              <span>{{ addError }}</span>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn cancel" @click="showAddModal = false">取消</button>
            <button 
              class="btn confirm" 
              @click="handleAddArticle"
              :disabled="!urlInput.trim() || parsing"
            >
              <Loader2 v-if="parsing" :size="14" class="animate-spin" />
              <span>{{ parsing ? '解析中...' : '添加并解析' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.article-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  min-height: 100%;
}

.article-card {
  padding: 16px;
  border: 2px solid #2c3e50;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  /* Soviet Style: Hard edges, no radius */
}

.article-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 rgba(44, 62, 80, 0.2);
}

.article-card.active {
  border-color: var(--color-primary);
  box-shadow: 4px 4px 0 var(--color-primary);
  transform: translate(-2px, -2px);
  background: #fff; /* Keep white for contrast */
}




.source {
  margin-bottom: 6px;
}

.source-name {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.description {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #f59e0b;
  font-weight: 600;
}

.tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.tag {
  font-size: 11px;
  padding: 2px 6px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  color: var(--color-text-secondary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
  gap: 16px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.fab {
  position: sticky;
  bottom: 16px;
  align-self: flex-end;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
  transition: all 0.2s ease;
}

.fab:hover {
  transform: scale(1.1);
}

/* 解析状态 */
.parsing-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: white;
  border: 2px solid var(--color-primary);
  color: var(--color-primary);
  font-size: 13px;
  font-weight: bold;
  box-shadow: 4px 4px 0 rgba(0, 102, 204, 0.2);
}

.parse-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: white;
  border: 2px solid #ef4444;
  color: #ef4444;
  font-size: 13px;
  font-weight: bold;
  box-shadow: 4px 4px 0 rgba(239, 68, 68, 0.2);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* 删除按钮 */
.delete-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
  margin-left: auto;
}

.article-card:hover .delete-btn {
  display: flex;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.source {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/*
 * 模态框样式已迁移到全局 styles/components/modal.css
 * 包括: .modal-overlay, .modal-container, .modal-header, .modal-body,
 *       .modal-footer, .modal-error, .form-group, .form-input, .btn
 */

</style>
