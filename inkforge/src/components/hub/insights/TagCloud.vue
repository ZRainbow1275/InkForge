<script setup lang="ts">
import { Tag } from 'lucide-vue-next'
import type { TagCloudItem } from './types'

const props = defineProps<{ tags: TagCloudItem[] }>()

const MIN_TAG_FONT_SIZE = 12
const MAX_TAG_FONT_SIZE = 28

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
      v-if="props.tags.length > 0"
      class="tag-cloud"
    >
      <span
        v-for="item in props.tags"
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
      <p class="tag-empty-hint">
        <Tag
          :size="13"
          :stroke-width="2"
        />
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
  scrollbar-color: var(--scrollbar-thumb) transparent;
}
.tag-cloud::-webkit-scrollbar { width: 6px; }
.tag-cloud::-webkit-scrollbar-track { background: transparent; }
.tag-cloud::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: var(--radius-round); }
.tag-cloud::-webkit-scrollbar-thumb:hover { background: var(--ember-border); }
.tag-cloud span {
  line-height: 1;
  font-weight: 700;
  transition: transform var(--motion-base) var(--ease-out-quart), opacity var(--motion-base) var(--ease-out-quart);
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
.tag-empty-hint {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--bg-rice-paper);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.3px;
}
</style>
