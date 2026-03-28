<script setup lang="ts">
import { computed } from 'vue'
import type { Article } from '@/types'
import { Clock3, FileText, Folder } from 'lucide-vue-next'

const props = defineProps<{
  article: Article
  categoryName: string
  categoryColor: string
  animationIndex: number
}>()

const emit = defineEmits<{
  (e: 'open', articleId: string): void
}>()

const coverImage = computed(() => props.article.images?.[0] ?? null)

const excerpt = computed(() => {
  if (props.article.description) return props.article.description.substring(0, 200)
  if (props.article.rawContent) return props.article.rawContent.substring(0, 200)
  return '暂无内容摘要'
})

const wordCount = computed(() => (props.article.rawContent?.length ?? 0).toLocaleString())

const statusLabel = computed(() => {
  switch (props.article.status) {
    case 'processed':
      return '已完成'
    case 'read':
      return '已读'
    default:
      return '草稿'
  }
})

const statusClass = computed(() => {
  switch (props.article.status) {
    case 'processed':
      return 'article-card__status--done'
    case 'read':
      return 'article-card__status--read'
    default:
      return 'article-card__status--draft'
  }
})

const relativeTime = computed(() => {
  const date = new Date(props.article.updatedAt || props.article.createdAt)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (diffMinutes < 1) return '刚才'
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
})

function openCard() {
  emit('open', props.article.id)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openCard()
  }
}
</script>

<template>
  <article
    class="article-card"
    :style="{ '--i': props.animationIndex }"
    tabindex="0"
    role="button"
    @click="openCard"
    @keydown="handleKeydown"
  >
    <div
      class="article-card__accent"
      :style="{ background: props.categoryColor }"
    />

    <div
      v-if="coverImage"
      class="article-card__cover"
    >
      <img
        :src="coverImage"
        :alt="props.article.title"
        loading="lazy"
      >
    </div>

    <div class="article-card__tags">
      <span
        v-if="props.article.sourceName"
        class="article-card__source"
      >
        {{ props.article.sourceName }}
      </span>
      <span
        class="article-card__status"
        :class="statusClass"
      >
        {{ statusLabel }}
      </span>
    </div>

    <h3 class="article-card__title">
      {{ props.article.title }}
    </h3>
    <p class="article-card__excerpt">
      {{ excerpt }}
    </p>

    <div class="article-card__meta">
      <span
        v-if="props.categoryName"
        class="article-card__category"
      >
        <Folder :size="12" />
        {{ props.categoryName }}
      </span>
      <span class="article-card__words">
        <FileText :size="12" />
        {{ wordCount }} 字
      </span>
      <span class="article-card__time">
        <Clock3 :size="12" />
        {{ relativeTime }}
      </span>
    </div>
  </article>
</template>

<style scoped>
.article-card {
  break-inside: avoid;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #eceff1;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  animation: article-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: calc(min(var(--i), 10) * 50ms);
  outline: none;
}

.article-card:hover,
.article-card:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  border-color: rgba(211, 47, 47, 0.2);
}

.article-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 16px 16px 0 0;
}

.article-card__cover {
  margin: -20px -20px 16px;
  overflow: hidden;
  border-radius: 16px 16px 0 0;
  max-height: 180px;
}

.article-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.article-card__tags {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.article-card__source {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  background: #f5f5f5;
  color: #607d8b;
}

.article-card__status {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.article-card__status--draft {
  background: #fff8e1;
  color: #f57c00;
}

.article-card__status--read {
  background: #e3f2fd;
  color: #1565c0;
}

.article-card__status--done {
  background: #e8f5e9;
  color: #2e7d32;
}

.article-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #263238;
  margin: 0 0 8px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-card__excerpt {
  font-size: 13px;
  color: #607d8b;
  line-height: 1.6;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11px;
  color: #90a4ae;
}

.article-card__meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.article-card__category {
  font-weight: 600;
  color: #607d8b;
}

@keyframes article-fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
