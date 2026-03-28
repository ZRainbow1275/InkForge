<script setup lang="ts">
import { computed } from 'vue'
import { Tags } from 'lucide-vue-next'
import type { Article } from '@/types'

interface TagEntry {
  tag: string
  count: number
  fontSize: number
}

const props = defineProps<{
  articles: Article[]
}>()

const tags = computed<TagEntry[]>(() => {
  const tagMap = new Map<string, number>()

  for (const article of props.articles) {
    for (const tag of article.tags ?? []) {
      const normalizedTag = tag.trim()
      if (!normalizedTag) {
        continue
      }
      tagMap.set(normalizedTag, (tagMap.get(normalizedTag) ?? 0) + 1)
    }
  }

  if (tagMap.size < 3) {
    return []
  }

  const maxFrequency = Math.max(...tagMap.values())
  return [...tagMap.entries()]
    .map(([tag, count]) => ({
      tag,
      count,
      fontSize: 12 + (count / maxFrequency) * 16,
    }))
    .sort((left, right) => right.count - left.count)
})
</script>

<template>
  <section class="insight-card tag-cloud-card">
    <div class="insight-eyebrow">
      Tag Cloud
    </div>
    <h3 class="insight-heading tag-cloud-card__heading">
      <Tags :size="18" />
      标签词云
    </h3>

    <div
      v-if="tags.length === 0"
      class="insight-empty"
    >
      <Tags
        :size="32"
        class="insight-empty__icon"
      />
      <p class="insight-empty__text">
        文章标签为空，在工作台为文章添加标签后，词云将自动生成。
      </p>
    </div>

    <div
      v-else
      class="tag-cloud"
    >
      <button
        v-for="tag in tags"
        :key="tag.tag"
        type="button"
        class="tag-cloud__tag"
        :style="{
          fontSize: `${tag.fontSize}px`,
          color: tag.count >= 4 ? '#D32F2F' : tag.count >= 2 ? '#607D8B' : '#90A4AE',
        }"
      >
        {{ tag.tag }}
        <span class="tag-cloud__count">{{ tag.count }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.tag-cloud-card__heading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 12px;
}

.tag-cloud__tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(96, 125, 139, 0.08);
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.88);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.tag-cloud__tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 20px rgba(38, 50, 56, 0.08);
}

.tag-cloud__count {
  font-size: 11px;
  color: #90a4ae;
}

[data-theme='dark'] .tag-cloud__tag {
  border-color: rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.5);
}

[data-theme='dark'] .tag-cloud__count {
  color: #94a3b8;
}
</style>
