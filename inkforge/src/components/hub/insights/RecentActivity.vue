<script setup lang="ts">
import { Activity, FilePlus2, PencilLine } from 'lucide-vue-next'
import type { RecentActivityItem } from './types'
import InsightEmptyState from './InsightEmptyState.vue'

defineProps<{ activities: RecentActivityItem[] }>()
</script>

<template>
  <article class="insight-card recent-activity-card">
    <header class="insight-card-head compact">
      <div>
        <p class="insight-eyebrow">
          近期动态
        </p>
        <h3>最近活动</h3>
      </div>
    </header>

    <div
      v-if="activities.length > 0"
      class="activity-list"
    >
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="activity-row"
      >
        <span class="activity-icon">
          <FilePlus2
            v-if="activity.action === 'created'"
            :size="15"
            :stroke-width="2.2"
          />
          <PencilLine
            v-else
            :size="15"
            :stroke-width="2.2"
          />
        </span>
        <span class="activity-copy">
          <strong>{{ activity.title || '未命名文稿' }}</strong>
          <small>{{ activity.description }} · {{ activity.timeLabel }}</small>
        </span>
      </div>
    </div>
    <InsightEmptyState
      v-else
      :icon="Activity"
      title="暂无活动"
      description="没有独立活动日志时，这里从真实文章创建/编辑时间推断。"
    />
  </article>
</template>

<style scoped>
.activity-list { display: grid; gap: 11px; margin-top: 14px; }
.activity-row { display: grid; grid-template-columns: 30px 1fr; gap: 10px; align-items: center; }
.activity-icon { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 10px; color: var(--ember); background: var(--ember-soft); }
.activity-copy strong, .activity-copy small { display: block; }
.activity-copy strong { color: var(--text-primary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity-copy small { margin-top: 2px; color: var(--text-muted); font-size: 12px; }
</style>