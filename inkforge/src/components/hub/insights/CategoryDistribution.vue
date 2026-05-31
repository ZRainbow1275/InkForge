<script setup lang="ts">
import { computed } from 'vue'
import { PieChart } from 'lucide-vue-next'
import type { CategorySlice } from './types'
import InsightEmptyState from './InsightEmptyState.vue'

const props = defineProps<{ slices: CategorySlice[] }>()

const total = computed(() => props.slices.reduce((sum, slice) => sum + slice.count, 0))
const hasData = computed(() => total.value > 0)
</script>

<template>
  <article class="insight-card category-card">
    <header class="insight-card-head compact">
      <div>
        <p class="insight-eyebrow">
          分类结构
        </p>
        <h3>分类分布</h3>
      </div>
    </header>

    <div
      v-if="hasData"
      class="category-list"
    >
      <div
        v-for="slice in slices"
        :key="slice.id"
        class="category-row"
      >
        <span
          class="category-dot"
          :style="{ background: slice.color }"
        />
        <span>{{ slice.name }}</span>
        <strong>{{ slice.count }}</strong>
        <div
          class="category-meter"
          aria-hidden="true"
        >
          <span :style="{ width: `${Math.round(slice.count / total * 100)}%`, background: slice.color }" />
        </div>
      </div>
    </div>
    <InsightEmptyState
      v-else
      :icon="PieChart"
      title="暂无分类数据"
      description="文章归入分类后，这里会使用真实分类聚合。"
    />
  </article>
</template>

<style scoped>
.category-list {
  display: grid;
  gap: 12px;
  margin-top: 14px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  align-content: start;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}
.category-list::-webkit-scrollbar { width: 6px; }
.category-list::-webkit-scrollbar-track { background: transparent; }
.category-list::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: var(--radius-round); }
.category-list::-webkit-scrollbar-thumb:hover { background: var(--ember-border); }
.category-row { display: grid; grid-template-columns: 10px 1fr auto; gap: 9px; align-items: center; font-size: 13px; color: var(--text-secondary); }
.category-dot { width: 10px; height: 10px; border-radius: 999px; }
.category-row strong { color: var(--text-primary); }
.category-meter { grid-column: 2 / 4; height: 7px; border-radius: 999px; overflow: hidden; background: var(--bg-rice-paper); }
.category-meter span { display: block; height: 100%; border-radius: inherit; }
</style>