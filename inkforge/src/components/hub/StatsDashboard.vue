<script setup lang="ts">
import { Flame, FolderOpen, PenSquare, Target, TextCursorInput } from 'lucide-vue-next'

interface HubStats {
  totalArticles: number
  totalWords: string
  completionRate: string
  completionRateNum: number
  assetCount: number
  streak: number
}

const props = defineProps<{
  stats: HubStats
}>()

const metricCards = [
  {
    key: 'totalArticles',
    label: '文章',
    icon: FolderOpen,
    tone: 'red',
  },
  {
    key: 'totalWords',
    label: '字数',
    icon: TextCursorInput,
    tone: 'blue',
  },
  {
    key: 'completionRate',
    label: '完成率',
    icon: Target,
    tone: 'green',
  },
  {
    key: 'assetCount',
    label: '素材',
    icon: PenSquare,
    tone: 'amber',
  },
] as const
</script>

<template>
  <section class="stats-dashboard">
    <header class="stats-dashboard__header">
      <h3 class="stats-dashboard__title">
        今日总览
      </h3>
      <div class="stats-dashboard__streak">
        <Flame :size="14" />
        <span>{{ props.stats.streak }} 天</span>
      </div>
    </header>

    <div class="stats-dashboard__grid">
      <article
        v-for="card in metricCards"
        :key="card.key"
        class="stats-dashboard__metric"
      >
        <div
          class="stats-dashboard__icon"
          :class="`stats-dashboard__icon--${card.tone}`"
        >
          <component
            :is="card.icon"
            :size="16"
          />
        </div>
        <div class="stats-dashboard__value">
          {{ props.stats[card.key] }}
        </div>
        <div class="stats-dashboard__label">
          {{ card.label }}
        </div>
      </article>
    </div>

    <div class="stats-dashboard__progress">
      <div class="stats-dashboard__progress-meta">
        <span>处理进度</span>
        <strong>{{ props.stats.completionRate }}</strong>
      </div>
      <div class="stats-dashboard__progress-track">
        <div
          class="stats-dashboard__progress-fill"
          :style="{ width: `${props.stats.completionRateNum}%` }"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats-dashboard {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
  padding: 22px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #eceff1;
  border-radius: 20px;
}

.stats-dashboard__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stats-dashboard__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #263238;
}

.stats-dashboard__streak {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(211, 47, 47, 0.08);
  color: #d32f2f;
  font-size: 12px;
  font-weight: 700;
}

.stats-dashboard__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stats-dashboard__metric {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 116px;
  padding: 16px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid #f0f2f4;
}

.stats-dashboard__icon {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.stats-dashboard__icon--red {
  background: rgba(211, 47, 47, 0.12);
  color: #d32f2f;
}

.stats-dashboard__icon--blue {
  background: rgba(21, 101, 192, 0.12);
  color: #1565c0;
}

.stats-dashboard__icon--green {
  background: rgba(46, 125, 50, 0.12);
  color: #2e7d32;
}

.stats-dashboard__icon--amber {
  background: rgba(245, 124, 0, 0.14);
  color: #ef6c00;
}

.stats-dashboard__value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  color: #263238;
}

.stats-dashboard__label {
  font-size: 12px;
  color: #90a4ae;
  font-weight: 600;
}

.stats-dashboard__progress {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stats-dashboard__progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #607d8b;
}

.stats-dashboard__progress-meta strong {
  color: #d32f2f;
  font-size: 14px;
}

.stats-dashboard__progress-track {
  height: 10px;
  border-radius: 999px;
  background: #eceff1;
  overflow: hidden;
}

.stats-dashboard__progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #d32f2f 0%, #ff6b6b 100%);
  transition: width 0.3s ease;
}
</style>
