<script setup lang="ts">
import { computed } from 'vue'
import { Share2 } from 'lucide-vue-next'
import type { ExportFrequencyItem } from './types'
import InsightEmptyState from './InsightEmptyState.vue'

const props = defineProps<{ items: ExportFrequencyItem[] }>()

const maxCount = computed(() => Math.max(1, ...props.items.map(item => item.count)))
const hasData = computed(() => props.items.some(item => item.count > 0))
</script>

<template>
  <article class="insight-card export-frequency-card">
    <header class="insight-card-head">
      <div>
        <p class="insight-eyebrow">
          导出记录
        </p>
        <h3>导出频率</h3>
      </div>
      <span>真实日志</span>
    </header>

    <div
      v-if="hasData"
      class="export-list"
    >
      <div
        v-for="item in items"
        :key="item.platform"
        class="export-row"
      >
        <span>{{ item.label }}</span>
        <div
          class="export-meter"
          aria-hidden="true"
        >
          <span :style="{ width: `${Math.round(item.count / maxCount * 100)}%`, background: item.color }" />
        </div>
        <strong>{{ item.count }}</strong>
      </div>
    </div>
    <InsightEmptyState
      v-else
      :icon="Share2"
      title="导出文章后显示"
      description="当前库尚未记录导出日志，因此保持真实空状态，不从平台列表造假。"
    />
  </article>
</template>

<style scoped>
.export-list { display: grid; gap: 12px; margin-top: 14px; }
.export-row { display: grid; grid-template-columns: 86px 1fr 34px; gap: 12px; align-items: center; color: var(--text-secondary); font-size: 13px; }
.export-meter { height: 10px; overflow: hidden; border-radius: 999px; background: var(--bg-rice-paper); }
.export-meter span { display: block; height: 100%; border-radius: inherit; }
.export-row strong { color: var(--text-primary); text-align: right; }
</style>