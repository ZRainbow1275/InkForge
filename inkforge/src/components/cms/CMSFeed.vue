<script setup lang="ts">
import { useArticleStore } from '@/stores/article'
import { storeToRefs } from 'pinia'
import { Move, Trash2 } from 'lucide-vue-next'

const articleStore = useArticleStore()
const { filteredArticles, selectedArticleId } = storeToRefs(articleStore)

function selectArticle(id: string) {
  articleStore.selectArticle(id)
}
</script>

<template>
  <div class="cms-feed">
    <div 
      v-for="article in filteredArticles" 
      :key="article.id" 
      class="feed-card"
      :class="{ active: selectedArticleId === article.id }"
      @click="selectArticle(article.id)"
    >
      <div class="card-header">
        <h3 class="title">
          {{ article.title }}
        </h3>
      </div>
      
      <p class="summary">
        {{ article.description || '暂无摘要' }}
      </p>
      
      <div class="card-footer">
        <div class="score-badge">
          {{ article.score || 0 }}
        </div>
        
        <div class="tags">
          <span
            v-for="tag in article.tags?.slice(0,3)"
            :key="tag"
            class="mini-tag"
          >
            {{ tag }}
          </span>
        </div>
        
        <div class="actions">
          <button
            class="icon-btn"
            title="移动"
          >
            <Move :size="14" />
          </button>
          <button
            class="icon-btn danger"
            title="删除"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </div>
    </div>
    
    <div
      v-if="filteredArticles.length === 0"
      class="empty-state"
    >
      暂无资讯
    </div>
  </div>
</template>

<style scoped>
.cms-feed {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--cms-bg-app);
}

.feed-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--cms-shadow-sm);
}

.feed-card:hover {
  border-color: #cbd5e1;
  transform: translateY(-1px);
  box-shadow: var(--cms-shadow-md);
}

.feed-card.active {
  border-color: var(--cms-primary);
  ring: 1px solid var(--cms-primary);
  background: #f0f9ff;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: var(--cms-text-primary);
  margin: 0 0 8px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.summary {
  font-size: 12px;
  color: var(--cms-text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.score-badge {
  background: #10b981;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 32px;
  text-align: center;
}

.tags {
  display: flex;
  gap: 4px;
}

.mini-tag {
  background: #f1f5f9;
  color: #64748b;
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 2px;
}

.actions {
  display: flex;
  gap: 4px;
  opacity: 0; /* Show on hover */
  transition: opacity 0.2s;
}

.feed-card:hover .actions {
  opacity: 1;
}

.icon-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
}
.icon-btn:hover { background: #f1f5f9; color: #475569; }
.icon-btn.danger:hover { background: #fee2e2; color: #ef4444; }

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--cms-text-tertiary);
  font-size: 13px;
}
</style>
