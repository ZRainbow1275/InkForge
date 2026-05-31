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
            fill="var(--bg-rice-paper)"
          />
          <rect
            v-if="bucket.count > 0"
            x="0"
            y="1"
            :width="Math.max(6, Math.round(bucket.count / maxCount * 100))"
            height="8"
            rx="4"
            fill="var(--ember)"
          />
          <circle
            v-else
            cx="3"
            cy="5"
            r="1.6"
            fill="var(--text-muted)"
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
  scrollbar-color: var(--scrollbar-thumb) transparent;
}
.bucket-list::-webkit-scrollbar { width: 6px; }
.bucket-list::-webkit-scrollbar-track { background: transparent; }
.bucket-list::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: var(--radius-round); }
.bucket-list::-webkit-scrollbar-thumb:hover { background: var(--ember-border); }
.bucket-row { display: grid; grid-template-columns: 56px 1fr 28px; gap: 10px; align-items: center; color: var(--text-secondary); font-size: 12px; transition: color var(--motion-fast) var(--ease-out-quart); }
.bucket-row svg { width: 100%; height: 10px; }
.bucket-row strong { text-align: right; color: var(--text-primary); font-variant-numeric: tabular-nums; font-size: 12px; }
.bucket-row--empty { color: var(--text-muted); }
.bucket-row--empty strong { color: var(--text-muted); }
</style>