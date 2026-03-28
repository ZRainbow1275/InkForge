<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronDown, FilePenLine, Trash2 } from 'lucide-vue-next'
import { useArticleStore } from '@/stores/article'
import { ARTICLE_STATUS } from '@/constants'
import type { Article } from '@/types'
import { formatRelativeTime } from '@/utils/format-relative-time'

interface DraftBoxProps {
    selectedArticleId: string | null
}

interface DraftBoxEmits {
    (e: 'select', articleId: string): void
    (e: 'delete', articleId: string): void
    (e: 'publish', articleId: string): void
}

const props = defineProps<DraftBoxProps>()
const emit = defineEmits<DraftBoxEmits>()

const articleStore = useArticleStore()
const { articles } = storeToRefs(articleStore)

const expanded = ref(true)

const drafts = computed<Article[]>(() => {
    return [...articles.value]
        .filter(article =>
            article.status === ARTICLE_STATUS.NEW ||
            article.status === ARTICLE_STATUS.READ
        )
        .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
})

function toggleExpanded(): void {
    expanded.value = !expanded.value
}

function handleSelect(articleId: string): void {
    emit('select', articleId)
}

function handleDelete(articleId: string): void {
    emit('delete', articleId)
}
</script>

<template>
  <section class="draft-box">
    <button
      type="button"
      class="draft-box__header"
      :aria-expanded="expanded"
      @click="toggleExpanded"
    >
      <ChevronDown
        class="draft-box__chevron"
        :class="{ 'draft-box__chevron--open': expanded }"
        :size="14"
      />
      <FilePenLine
        class="section-icon"
        :size="14"
      />
      <span>草稿箱</span>
      <span
        v-if="drafts.length > 0"
        class="section-count"
      >{{ drafts.length }}</span>
    </button>

    <div
      v-if="expanded"
      class="draft-box__body"
    >
      <div
        v-if="drafts.length === 0"
        class="draft-box__empty"
      >
        <FilePenLine
          class="draft-box__empty-icon"
          :size="14"
        />
        <span>暂无草稿</span>
      </div>

      <div
        v-else
        class="draft-box__list"
      >
        <div
          v-for="article in drafts"
          :key="article.id"
          class="draft-box__item"
          :class="{ 'draft-box__item--active': props.selectedArticleId === article.id }"
        >
          <button
            type="button"
            class="draft-box__select"
            :title="article.title"
            @click="handleSelect(article.id)"
          >
            <span class="draft-box__title">{{ article.title }}</span>
            <span class="draft-box__time">{{ formatRelativeTime(article.updatedAt) }}</span>
          </button>

          <button
            type="button"
            class="draft-box__delete"
            :title="`删除草稿 ${article.title}`"
            @click.stop="handleDelete(article.id)"
          >
            <Trash2 :size="12" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.draft-box {
    flex-shrink: 0;
    border-bottom: 1px solid #E5E7EB;
    background: rgba(250, 251, 252, 0.72);
}

.draft-box__header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    background: transparent;
    color: var(--text-secondary, #607D8B);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.3px;
    cursor: pointer;
    text-align: left;
}

.draft-box__chevron {
    flex-shrink: 0;
    color: #90A4AE;
    transition: transform 0.15s ease;
}

.draft-box__chevron--open {
    transform: rotate(90deg);
}

.draft-box__body {
    padding: 0 10px 10px;
}

.draft-box__empty {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px 2px 28px;
    color: #90A4AE;
    font-size: 12px;
}

.draft-box__empty-icon {
    opacity: 0.7;
}

.draft-box__list {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.draft-box__item {
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 8px;
    transition: background 0.15s ease, color 0.15s ease;
}

.draft-box__item:hover,
.draft-box__item--active {
    background: rgba(211, 47, 47, 0.08);
}

.draft-box__select {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px 6px 28px;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
}

.draft-box__title {
    flex: 1;
    min-width: 0;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: #263238;
}

.draft-box__time {
    flex-shrink: 0;
    font-size: 11px;
    color: #90A4AE;
}

.draft-box__delete {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin-right: 6px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: #90A4AE;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.draft-box__item:hover .draft-box__delete,
.draft-box__item:focus-within .draft-box__delete {
    opacity: 1;
}

.draft-box__delete:hover {
    background: rgba(211, 47, 47, 0.08);
    color: #D32F2F;
}
</style>
