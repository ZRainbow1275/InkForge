<script setup lang="ts">
import { computed } from 'vue'
import { BarChart } from 'lucide-vue-next'
import type { WordBucket } from './types'
import InsightEmptyState from './InsightEmptyState.vue'

const props = defineProps<{ buckets: WordBucket[] }>()

const maxCount = computed(() => Math.max(1, ...props.buckets.map(bucket => bucket.count)))
const hasData = computed(() => props.buckets.some(bucket => bucket.count > 0))
</script>

<template>
  <article class="insight-card word-distribution-card">
    <header class="insight-card-head compact">
      <div>
        <p class="insight-eyebrow">
          篇幅分布
        </p>
        <h3>字数分布</h3>
      </div>
    </header>

    <div
      v-if="hasData"
      class="bucket-list"
    >
      <div
        v-for="bucket in buckets"
        :key="bucket.label"
        class="bucket-row"
        :class="{ 'bucket-row--empty': bucket.count === 0 }"
      >
        <span>{{ bucket.label }}</span>
        <svg
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect
            x="0"
            y="1"
            width="100"
            height="8"
            rx="4"
            fill="#ECEFF1"
          />
          <rect
            v-if="bucket.count > 0"
            x="0"
            y="1"
            :width="Math.max(6, Math.round(bucket.count / maxCount * 100))"
            height="8"
            rx="4"
            fill="#D32F2F"
          />
          <circle
            v-else
            cx="3"
            cy="5"
            r="1.6"
            fill="#CFD8DC"
          />
        </svg>
        <strong>{{ bucket.count }}</strong>
      </div>
    </div>
    <InsightEmptyState
      v-else
      :icon="BarChart"
      title="暂无字数分布"
      description="写入文章正文后，将按真实字数落入 6 个区间。"
    />
  </article>
</template>

<style scoped>
.bucket-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  align-content: start;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 144, 156, 0.32) transparent;
}
.bucket-list::-webkit-scrollbar { width: 6px; }
.bucket-list::-webkit-scrollbar-track { background: transparent; }
.bucket-list::-webkit-scrollbar-thumb { background: rgba(120, 144, 156, 0.28); border-radius: 999px; }
.bucket-list::-webkit-scrollbar-thumb:hover { background: rgba(211, 47, 47, 0.40); }
.bucket-row { display: grid; grid-template-columns: 56px 1fr 28px; gap: 10px; align-items: center; color: #607D8B; font-size: 12px; transition: color 0.15s ease; }
.bucket-row svg { width: 100%; height: 10px; }
.bucket-row strong { text-align: right; color: #263238; font-variant-numeric: tabular-nums; font-size: 12px; }
.bucket-row--empty { color: #B0BEC5; }
.bucket-row--empty strong { color: #B0BEC5; }

html.theme-dark .bucket-row,
html[data-theme="dark"] .bucket-row {
  color: #B5BFCC;
}
html.theme-dark .bucket-row strong,
html[data-theme="dark"] .bucket-row strong {
  color: #ECEFF4;
}
html.theme-dark .bucket-row svg rect:first-child,
html[data-theme="dark"] .bucket-row svg rect:first-child {
  fill: rgba(255, 255, 255, 0.06);
}
html.theme-dark .bucket-row svg rect:nth-child(2),
html[data-theme="dark"] .bucket-row svg rect:nth-child(2) {
  fill: #EF5350;
}
html.theme-dark .bucket-row svg circle,
html[data-theme="dark"] .bucket-row svg circle {
  fill: rgba(255, 255, 255, 0.18);
}
html.theme-dark .bucket-row--empty,
html[data-theme="dark"] .bucket-row--empty {
  color: rgba(181, 191, 204, 0.55);
}
html.theme-dark .bucket-row--empty strong,
html[data-theme="dark"] .bucket-row--empty strong {
  color: rgba(236, 239, 244, 0.5);
}
</style>