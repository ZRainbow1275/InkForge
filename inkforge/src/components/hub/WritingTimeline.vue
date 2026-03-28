<script setup lang="ts">
import { computed } from 'vue'
import { Clock3, Edit3, Plus } from 'lucide-vue-next'
import type { Article } from '@/types'
import { formatDateKey, formatWordCount, startOfDay } from './insight-utils'

interface TimelineItem {
  id: string
  articleId: string
  title: string
  action: 'created' | 'edited'
  wordCount: number
  timestamp: Date
}

interface TimelineEntry {
  dateLabel: string
  dateKey: string
  items: TimelineItem[]
}

const props = withDefaults(defineProps<{
  articles: Article[]
  maxDays?: number
}>(), {
  maxDays: 7,
})

function buildTimeline(articles: Article[], maxDays: number): TimelineEntry[] {
  const today = startOfDay(new Date())
  const timelineMap = new Map<string, TimelineItem[]>()

  for (const article of articles) {
    const createdAt = new Date(article.createdAt)
    const updatedAt = new Date(article.updatedAt || article.createdAt)
    const wordCount = article.rawContent?.length ?? 0

    const createdKey = formatDateKey(createdAt)
    timelineMap.set(createdKey, [
      ...(timelineMap.get(createdKey) ?? []),
      {
        id: `created-${article.id}`,
        articleId: article.id,
        title: article.title,
        action: 'created',
        wordCount,
        timestamp: createdAt,
      },
    ])

    if (updatedAt.getTime() !== createdAt.getTime()) {
      const updatedKey = formatDateKey(updatedAt)
      timelineMap.set(updatedKey, [
        ...(timelineMap.get(updatedKey) ?? []),
        {
          id: `edited-${article.id}`,
          articleId: article.id,
          title: article.title,
          action: 'edited',
          wordCount,
          timestamp: updatedAt,
        },
      ])
    }
  }

  return Array.from({ length: maxDays }, (_, offset) => {
    const current = new Date(today)
    current.setDate(today.getDate() - offset)
    const dateKey = formatDateKey(current)
    const dateLabel = offset === 0
      ? '今天'
      : offset === 1
        ? '昨天'
        : current.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })

    const items = (timelineMap.get(dateKey) ?? []).sort(
      (left, right) => right.timestamp.getTime() - left.timestamp.getTime(),
    )

    return {
      dateLabel,
      dateKey,
      items,
    }
  })
}

const entries = computed(() => buildTimeline(props.articles, props.maxDays))
const hasActivities = computed(() => entries.value.some((entry) => entry.items.length > 0))
</script>

<template>
  <section class="insight-card timeline-card">
    <div class="insight-eyebrow">
      Writing Timeline
    </div>
    <div class="timeline-card__header">
      <h3 class="insight-heading">
        <Clock3 :size="18" />
        写作时间线
      </h3>
      <span class="timeline-card__range">最近 {{ maxDays }} 天</span>
    </div>

    <div
      v-if="!hasActivities"
      class="insight-empty"
    >
      <Clock3
        :size="32"
        class="insight-empty__icon"
      />
      <p class="insight-empty__text">
        还没有写作活动记录，开始创作你的第一篇文章。
      </p>
    </div>

    <div
      v-else
      class="timeline-list"
    >
      <div
        v-for="entry in entries"
        :key="entry.dateKey"
        class="timeline-day"
      >
        <div class="timeline-day__date">
          {{ entry.dateLabel }}
        </div>
        <div class="timeline-day__content">
          <div class="timeline-day__line" />
          <div
            v-if="entry.items.length === 0"
            class="timeline-empty"
          >
            <span class="timeline-empty__dot" />
            <span>(无活动)</span>
          </div>
          <div
            v-for="item in entry.items"
            :key="item.id"
            class="timeline-item"
          >
            <span
              class="timeline-item__dot"
              :class="item.action"
            />
            <component
              :is="item.action === 'created' ? Plus : Edit3"
              :size="14"
              class="timeline-item__icon"
            />
            <div class="timeline-item__body">
              <p class="timeline-item__title text-truncate">
                {{ item.title }}
              </p>
              <p class="timeline-item__meta">
                {{ item.action === 'created' ? '创建' : '编辑' }} · {{ formatWordCount(item.wordCount) }}
              </p>
            </div>
            <span class="timeline-item__time">
              {{ item.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.timeline-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.insight-heading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.timeline-card__range {
  font-size: 12px;
  color: #90a4ae;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-day {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
}

.timeline-day__date {
  font-size: 12px;
  font-weight: 700;
  color: #607d8b;
  padding-top: 4px;
}

.timeline-day__content {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.timeline-day__line {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 7px;
  width: 2px;
  border-radius: 999px;
  background: #eceff1;
}

.timeline-empty,
.timeline-item {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 14px 16px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.timeline-empty {
  color: #90a4ae;
  font-size: 12px;
}

.timeline-empty__dot,
.timeline-item__dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: #eceff1;
  border: 3px solid rgba(255, 255, 255, 0.96);
}

.timeline-item__dot.created {
  background: #d32f2f;
}

.timeline-item__dot.edited {
  background: #1565c0;
}

.timeline-item__icon {
  color: #607d8b;
}

.timeline-item__body {
  min-width: 0;
}

.timeline-item__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #263238;
}

.timeline-item__meta,
.timeline-item__time {
  font-size: 11px;
  color: #90a4ae;
}

.timeline-item__meta {
  margin: 2px 0 0;
}

@media (max-width: 767px) {
  .timeline-day {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

[data-theme='dark'] .timeline-card__range,
[data-theme='dark'] .timeline-day__date,
[data-theme='dark'] .timeline-empty,
[data-theme='dark'] .timeline-item__meta,
[data-theme='dark'] .timeline-item__time {
  color: #94a3b8;
}

[data-theme='dark'] .timeline-day__line {
  background: rgba(148, 163, 184, 0.16);
}

[data-theme='dark'] .timeline-empty__dot,
[data-theme='dark'] .timeline-item__dot {
  border-color: rgba(30, 41, 59, 0.96);
}

[data-theme='dark'] .timeline-item__title {
  color: #f1f5f9;
}

[data-theme='dark'] .timeline-item__icon {
  color: #cbd5e1;
}
</style>
