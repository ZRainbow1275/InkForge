<script setup lang="ts">
import { Clock } from 'lucide-vue-next'
import type { TimelineEvent } from './types'
import InsightEmptyState from './InsightEmptyState.vue'

defineProps<{ events: TimelineEvent[] }>()
</script>

<template>
  <article class="insight-card timeline-card">
    <header class="insight-card-head">
      <div>
        <p class="insight-eyebrow">
          时间线
        </p>
        <h3>写作时间线</h3>
      </div>
      <span>最近 {{ events.length }} 条</span>
    </header>

    <div
      v-if="events.length > 0"
      class="timeline-list"
    >
      <div
        v-for="event in events"
        :key="event.id"
        class="timeline-item"
        :class="event.action"
      >
        <span class="timeline-dot" />
        <div>
          <strong>{{ event.title || '未命名文稿' }}</strong>
          <p>{{ event.action === 'created' ? '创建' : '编辑' }} · {{ event.date }}</p>
        </div>
      </div>
    </div>
    <InsightEmptyState
      v-else
      :icon="Clock"
      title="暂无写作记录"
      description="创建或编辑文章后，这里会按真实 createdAt / updatedAt 排列。"
    />
  </article>
</template>

<style scoped>
.timeline-list {
  display: grid;
  gap: 13px;
  margin-top: 16px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 6px;
  align-content: start;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}
.timeline-list::-webkit-scrollbar { width: 6px; }
.timeline-list::-webkit-scrollbar-track { background: transparent; }
.timeline-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: var(--radius-round);
}
.timeline-list::-webkit-scrollbar-thumb:hover {
  background: var(--ember-border);
}
.timeline-item { display: grid; grid-template-columns: 16px 1fr; gap: 12px; align-items: start; color: var(--text-secondary); }
.timeline-dot { width: 12px; height: 12px; margin-top: 4px; border-radius: 999px; background: var(--accent-secondary); box-shadow: 0 0 0 5px color-mix(in srgb, var(--accent-secondary) 14%, transparent); }
.timeline-item.created .timeline-dot { background: var(--ember); box-shadow: 0 0 0 5px var(--ember-soft); }
.timeline-item strong { display: block; color: var(--text-primary); font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.timeline-item p { margin: 3px 0 0; font-size: 12px; }
</style>