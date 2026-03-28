<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Download } from 'lucide-vue-next'
import type { Article } from '@/types'
import { getActivityLogs } from '@/utils/db'
import { logger } from '@/services/error'

interface PlatformExportEntry {
  platform: string
  displayName: string
  count: number
  percentage: number
  color: string
}

const props = withDefaults(defineProps<{
  articles?: Article[]
  maxPlatforms?: number
}>(), {
  articles: () => [],
  maxPlatforms: 6,
})

const platformEntries = ref<PlatformExportEntry[]>([])
let refreshIntervalId: number | null = null

const platformMeta: Record<string, { displayName: string; color: string }> = {
  wechat: { displayName: '微信公众号', color: '#07C160' },
  xiaohongshu: { displayName: '小红书', color: '#FE2C55' },
  zhihu: { displayName: '知乎', color: '#0066FF' },
  juejin: { displayName: '掘金', color: '#1E80FF' },
  toutiao: { displayName: '头条', color: '#F85959' },
  bilibili: { displayName: 'B站', color: '#00A1D6' },
}

async function loadExportFrequency(): Promise<void> {
  try {
    const logs = await getActivityLogs(120)
    const platformCounts = new Map<string, number>()

    for (const log of logs) {
      if (log.action !== 'export') {
        continue
      }

      const platform = typeof log.metadata.platform === 'string'
        ? log.metadata.platform
        : ''
      if (!platform) {
        continue
      }

      platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1)
    }

    const maxCount = Math.max(...platformCounts.values(), 0)
    platformEntries.value = [...platformCounts.entries()]
      .map(([platform, count]) => ({
        platform,
        displayName: platformMeta[platform]?.displayName ?? platform,
        count,
        percentage: maxCount === 0 ? 0 : Math.max(8, Math.round((count / maxCount) * 100)),
        color: platformMeta[platform]?.color ?? '#607D8B',
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, props.maxPlatforms)
  } catch (error) {
    logger.warn('加载导出频率失败', {
      error: error instanceof Error ? error.message : String(error),
    })
    platformEntries.value = []
  }
}

function handleActivityLogUpdated(): void {
  void loadExportFrequency()
}

watch(
  () => props.articles.map((article) => `${article.id}:${article.updatedAt || article.createdAt}`).join('|'),
  () => {
    void loadExportFrequency()
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('inkforge:activity-log-updated', handleActivityLogUpdated as EventListener)
  refreshIntervalId = window.setInterval(() => {
    void loadExportFrequency()
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
  <section class="insight-card export-frequency-card">
    <div class="insight-eyebrow">
      Export Frequency
    </div>
    <h3 class="insight-heading export-frequency-card__heading">
      <Download :size="18" />
      导出频率分布
    </h3>

    <div
      v-if="platformEntries.length === 0"
      class="insight-empty"
    >
      <Download
        :size="32"
        class="insight-empty__icon"
      />
      <p class="insight-empty__text">
        还没有导出记录，在工作台使用导出功能后，平台分布将自动生成。
      </p>
    </div>

    <div
      v-else
      class="export-chart"
    >
      <div
        v-for="entry in platformEntries"
        :key="entry.platform"
        class="export-row"
      >
        <span class="export-row__label text-truncate">{{ entry.displayName }}</span>
        <div class="export-row__track">
          <div
            class="export-row__bar"
            :style="{ width: `${entry.percentage}%`, background: entry.color }"
          />
        </div>
        <span class="export-row__count">{{ entry.count }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.export-frequency-card__heading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
}

.export-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.export-row {
  display: grid;
  grid-template-columns: minmax(92px, 110px) minmax(0, 1fr) 36px;
  align-items: center;
  gap: 12px;
}

.export-row__label {
  font-size: 13px;
  font-weight: 600;
  color: #455a64;
  text-align: right;
}

.export-row__track {
  height: 20px;
  border-radius: 999px;
  background: rgba(38, 50, 56, 0.05);
  overflow: hidden;
}

.export-row__bar {
  height: 100%;
  min-width: 4px;
  border-radius: 999px;
  transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.export-row__count {
  font-size: 13px;
  font-weight: 700;
  color: #263238;
}

@media (max-width: 767px) {
  .export-row {
    grid-template-columns: 88px minmax(0, 1fr) 32px;
    gap: 10px;
  }
}

[data-theme='dark'] .export-row__label {
  color: #cbd5e1;
}

[data-theme='dark'] .export-row__track {
  background: rgba(148, 163, 184, 0.14);
}

[data-theme='dark'] .export-row__count {
  color: #f1f5f9;
}
</style>
