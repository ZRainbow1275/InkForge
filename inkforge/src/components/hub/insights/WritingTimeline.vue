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
  scrollbar-color: rgba(120, 144, 156, 0.32) transparent;
}
.timeline-list::-webkit-scrollbar { width: 6px; }
.timeline-list::-webkit-scrollbar-track { background: transparent; }
.timeline-list::-webkit-scrollbar-thumb {
  background: rgba(120, 144, 156, 0.28);
  border-radius: 999px;
}
.timeline-list::-webkit-scrollbar-thumb:hover {
  background: rgba(211, 47, 47, 0.40);
}
.timeline-item { display: grid; grid-template-columns: 16px 1fr; gap: 12px; align-items: start; color: #546E7A; }
.timeline-dot { width: 12px; height: 12px; margin-top: 4px; border-radius: 999px; background: #1976D2; box-shadow: 0 0 0 5px rgba(25, 118, 210, 0.12); }
.timeline-item.created .timeline-dot { background: #D32F2F; box-shadow: 0 0 0 5px rgba(211, 47, 47, 0.12); }
.timeline-item strong { display: block; color: #263238; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.timeline-item p { margin: 3px 0 0; font-size: 12px; }

html.theme-dark .timeline-item,
html[data-theme="dark"] .timeline-item {
  color: #8590A0;
}
html.theme-dark .timeline-item strong,
html[data-theme="dark"] .timeline-item strong {
  color: #ECEFF4;
}
html.theme-dark .timeline-item .timeline-dot,
html[data-theme="dark"] .timeline-item .timeline-dot {
  background: #64B5F6;
  box-shadow: 0 0 0 5px rgba(100, 181, 246, 0.18);
}
html.theme-dark .timeline-item.created .timeline-dot,
html[data-theme="dark"] .timeline-item.created .timeline-dot {
  background: #EF5350;
  box-shadow: 0 0 0 5px rgba(239, 83, 80, 0.18);
}
html.theme-dark .timeline-list,
html[data-theme="dark"] .timeline-list {
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}
html.theme-dark .timeline-list::-webkit-scrollbar-thumb,
html[data-theme="dark"] .timeline-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
}
html.theme-dark .timeline-list::-webkit-scrollbar-thumb:hover,
html[data-theme="dark"] .timeline-list::-webkit-scrollbar-thumb:hover {
  background: rgba(239, 83, 80, 0.42);
}
</style>