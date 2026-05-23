<script setup lang="ts">
import { computed } from 'vue'
import { Tag } from 'lucide-vue-next'
import type { TagCloudItem } from './types'

const props = defineProps<{ tags: TagCloudItem[] }>()

const FALLBACK_TAGS = ['草稿', '已发布', '灵感', '笔记', '待整理']
const FALLBACK_WEIGHTS = [1, 0.78, 0.62, 0.48, 0.36] as const
const FALLBACK_PALETTE = ['#D32F2F', '#1565C0', '#F57C00', '#6A1B9A', '#2E7D32']
const MIN_TAG_FONT_SIZE = 12
const MAX_TAG_FONT_SIZE = 28

const displayTags = computed<TagCloudItem[]>(() => {
  if (props.tags.length > 0) return props.tags
  return FALLBACK_TAGS.map((tag, index) => ({
    tag,
    count: 0,
    weight: FALLBACK_WEIGHTS[index % FALLBACK_WEIGHTS.length],
    color: FALLBACK_PALETTE[index % FALLBACK_PALETTE.length],
  }))
})

const isEmpty = computed<boolean>(() => props.tags.length === 0)

function fontSizeFromWeight(weight: number): number {
  const clamped = Math.max(0, Math.min(1, weight))
  const scaled = Math.log1p(clamped * 9) / Math.log1p(9)
  return Math.round(MIN_TAG_FONT_SIZE + scaled * (MAX_TAG_FONT_SIZE - MIN_TAG_FONT_SIZE))
}

function fontSizeFor(item: TagCloudItem): string {
  const explicitFontSize = item.fontSize
  const size = typeof explicitFontSize === 'number' && Number.isFinite(explicitFontSize)
    ? explicitFontSize
    : fontSizeFromWeight(item.weight)
  return `${Math.round(Math.max(MIN_TAG_FONT_SIZE, Math.min(MAX_TAG_FONT_SIZE, size)))}px`
}
</script>

<template>
  <article class="insight-card tag-cloud-card">
    <header class="insight-card-head compact">
      <div>
        <p class="insight-eyebrow">
          标签索引
        </p>
        <h3>标签云</h3>
      </div>
    </header>

    <div
      v-if="!isEmpty"
      class="tag-cloud"
    >
      <span
        v-for="item in displayTags"
        :key="item.tag"
        :style="{
          fontSize: fontSizeFor(item),
          color: item.color ?? `rgb(${96 + Math.round(item.weight * 115)}, ${125 - Math.round(item.weight * 78)}, ${139 - Math.round(item.weight * 92)})`,
        }"
        :title="`${item.tag}：${item.count} 篇`"
      >{{ item.tag }}</span>
    </div>
    <div
      v-else
      class="tag-cloud-empty"
    >
      <div class="tag-cloud tag-cloud--placeholder">
        <span
          v-for="(item, index) in displayTags"
          :key="item.tag"
          :style="{
            fontSize: fontSizeFor(item),
            color: item.color,
            opacity: 0.42 - index * 0.05,
          }"
        >{{ item.tag }}</span>
      </div>
      <p class="tag-empty-hint">
        <Tag :size="13" :stroke-width="2" />
        <span>为文档添加标签后将展示真实标签云</span>
      </p>
    </div>
  </article>
</template>

<style scoped>
.tag-cloud {
  min-height: 100px;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 10px 14px;
  padding: 14px 8px 4px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 144, 156, 0.32) transparent;
}
.tag-cloud::-webkit-scrollbar { width: 6px; }
.tag-cloud::-webkit-scrollbar-track { background: transparent; }
.tag-cloud::-webkit-scrollbar-thumb { background: rgba(120, 144, 156, 0.28); border-radius: 999px; }
.tag-cloud::-webkit-scrollbar-thumb:hover { background: rgba(211, 47, 47, 0.40); }
.tag-cloud span {
  line-height: 1;
  font-weight: 700;
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.tag-cloud span:hover { transform: scale(1.08); }
.tag-cloud-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding-top: 6px;
  flex: 1;
  justify-content: center;
}
.tag-cloud--placeholder {
  min-height: 0;
  padding: 0;
  filter: blur(0.4px);
}
.tag-empty-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(207, 216, 220, 0.18);
  color: #78909C;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

html.theme-dark .tag-empty-hint,
html[data-theme="dark"] .tag-empty-hint {
  background: rgba(255, 255, 255, 0.04);
  color: #8590A0;
}
</style>
