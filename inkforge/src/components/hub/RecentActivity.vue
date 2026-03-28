<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { Activity, Download, Edit3, Plus, Trash2 } from 'lucide-vue-next'
import type { Article } from '@/types'
import { getActivityLogs, type ActivityLog } from '@/utils/db'
import { logger } from '@/services/error'
import { formatRelativeTime, formatWordCount, getArticleWordCount } from './insight-utils'

interface ActivityEntry {
  id: string
  action: 'created' | 'edited' | 'exported' | 'deleted'
  title: string
  detail: string
  timeLabel: string
  timestamp: Date
  icon: Component
}

const props = withDefaults(defineProps<{
  articles: Article[]
  maxItems?: number
}>(), {
  maxItems: 10,
})

const entries = ref<ActivityEntry[]>([])
let refreshIntervalId: number | null = null

const platformNames: Record<string, string> = {
  wechat: '微信公众号',
  xiaohongshu: '小红书',
  zhihu: '知乎',
  juejin: '掘金',
  toutiao: '头条',
  bilibili: 'B站',
}

function mapLogAction(log: ActivityLog, articleMap: Map<string, Article>): ActivityEntry | null {
  const article = articleMap.get(log.targetId)
  const timestamp = new Date(log.timestamp)

  switch (log.action) {
    case 'create':
      return {
        id: log.id,
        action: 'created',
        title: log.targetTitle,
        detail: article ? formatWordCount(getArticleWordCount(article)) : '',
        timeLabel: formatRelativeTime(timestamp),
        timestamp,
        icon: Plus,
      }
    case 'edit':
      return {
        id: log.id,
        action: 'edited',
        title: log.targetTitle,
        detail: article ? formatWordCount(getArticleWordCount(article)) : '',
        timeLabel: formatRelativeTime(timestamp),
        timestamp,
        icon: Edit3,
      }
    case 'delete':
      return {
        id: log.id,
        action: 'deleted',
        title: log.targetTitle,
        detail: '',
        timeLabel: formatRelativeTime(timestamp),
        timestamp,
        icon: Trash2,
      }
    case 'export': {
      const platform = typeof log.metadata.platform === 'string' ? log.metadata.platform : ''
      return {
        id: log.id,
        action: 'exported',
        title: log.targetTitle,
        detail: platformNames[platform] ?? platform,
        timeLabel: formatRelativeTime(timestamp),
        timestamp,
        icon: Download,
      }
    }
    default:
      return null
  }
}

function buildActivityFromArticles(articles: Article[], maxItems: number): ActivityEntry[] {
  return articles
    .flatMap((article) => {
      const createdAt = new Date(article.createdAt)
      const updatedAt = new Date(article.updatedAt || article.createdAt)
      const wordCount = formatWordCount(getArticleWordCount(article))
      const values: ActivityEntry[] = [
        {
          id: `created-${article.id}`,
          action: 'created',
          title: article.title,
          detail: wordCount,
          timeLabel: formatRelativeTime(createdAt),
          timestamp: createdAt,
          icon: Plus,
        },
      ]

      if (updatedAt.getTime() !== createdAt.getTime()) {
        values.push({
          id: `edited-${article.id}`,
          action: 'edited',
          title: article.title,
          detail: wordCount,
          timeLabel: formatRelativeTime(updatedAt),
          timestamp: updatedAt,
          icon: Edit3,
        })
      }

      return values
    })
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, maxItems)
}

async function loadEntries(): Promise<void> {
  try {
    const articleMap = new Map(props.articles.map((article) => [article.id, article] as const))
    const logs = await getActivityLogs(Math.max(props.maxItems * 4, 40))
    const logEntries = logs
      .map((log) => mapLogAction(log, articleMap))
      .filter((entry): entry is ActivityEntry => entry !== null)
      .slice(0, props.maxItems)

    entries.value = logEntries.length > 0
      ? logEntries
      : buildActivityFromArticles(props.articles, props.maxItems)
  } catch (error) {
    logger.warn('加载最近活动失败，回退到文章推断数据', {
      error: error instanceof Error ? error.message : String(error),
    })
    entries.value = buildActivityFromArticles(props.articles, props.maxItems)
  }
}

function handleActivityLogUpdated(): void {
  void loadEntries()
}

watch(
  () => props.articles.map((article) => `${article.id}:${article.updatedAt || article.createdAt}`).join('|'),
  () => {
    void loadEntries()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('inkforge:activity-log-updated', handleActivityLogUpdated as EventListener)
  refreshIntervalId = window.setInterval(() => {
    void loadEntries()
  }, 15000)
})

onBeforeUnmount(() => {
  window.removeEventListener('inkforge:activity-log-updated', handleActivityLogUpdated as EventListener)
  if (refreshIntervalId !== null) {
    window.clearInterval(refreshIntervalId)
    refreshIntervalId = null
  }
})
</script>

<template>
  <section class="insight-card recent-activity-card">
    <div class="insight-eyebrow">
      Recent Activity
    </div>
    <h3 class="insight-heading recent-activity-card__heading">
      <Activity :size="18" />
      最近活动
    </h3>

    <div
      v-if="entries.length === 0"
      class="insight-empty"
    >
      <Activity
        :size="32"
        class="insight-empty__icon"
      />
      <p class="insight-empty__text">
        还没有活动记录，所有创作操作都会在这里留下足迹。
      </p>
    </div>

    <div
      v-else
      class="recent-activity-list"
    >
      <article
        v-for="entry in entries"
        :key="entry.id"
        class="recent-activity-item"
      >
        <div class="recent-activity-item__time">
          {{ entry.timeLabel }}
        </div>
        <div class="recent-activity-item__icon">
          <component
            :is="entry.icon"
            :size="15"
          />
        </div>
        <div class="recent-activity-item__content">
          <p class="recent-activity-item__title text-truncate">
            {{ entry.title }}
          </p>
          <p class="recent-activity-item__detail text-clamp-2">
            {{
              entry.action === 'created'
                ? `创建 · ${entry.detail || '新文稿'}`
                : entry.action === 'edited'
                  ? `编辑 · ${entry.detail || '内容更新'}`
                  : entry.action === 'exported'
                    ? `导出 · ${entry.detail || '已导出'}`
                    : '删除'
            }}
          </p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.recent-activity-card__heading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
}

.recent-activity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recent-activity-item {
  display: grid;
  grid-template-columns: 52px 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.recent-activity-item__time {
  font-size: 11px;
  font-weight: 700;
  color: #90a4ae;
}

.recent-activity-item__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 12px;
  background: rgba(211, 47, 47, 0.1);
  color: #d32f2f;
}

.recent-activity-item__content {
  min-width: 0;
}

.recent-activity-item__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #263238;
}

.recent-activity-item__detail {
  margin: 3px 0 0;
  font-size: 11px;
  color: #607d8b;
}

[data-theme='dark'] .recent-activity-item__time,
[data-theme='dark'] .recent-activity-item__detail {
  color: #94a3b8;
}

[data-theme='dark'] .recent-activity-item__title {
  color: #f1f5f9;
}

[data-theme='dark'] .recent-activity-item__icon {
  background: rgba(239, 83, 80, 0.14);
}
</style>
