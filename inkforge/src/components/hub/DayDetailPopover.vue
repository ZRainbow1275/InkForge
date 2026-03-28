<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import type { Article } from '@/types'
import { FileText, X } from 'lucide-vue-next'

interface DayDetailPopoverProps {
  visible: boolean
  dateTitle: string
  articles: Article[]
  anchorRect: globalThis.DOMRect | null
}

const props = defineProps<DayDetailPopoverProps>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-article', articleId: string): void
}>()

const popoverStyle = computed(() => {
  if (!props.anchorRect) {
    return { display: 'none' }
  }

  const { left, top, width, height } = props.anchorRect
  const centerX = left + width / 2
  let posY = top - 8
  let transformOrigin = 'bottom center'

  if (posY - 200 < 0) {
    posY = top + height + 8
    transformOrigin = 'top center'
  }

  return {
    left: `${centerX}px`,
    top: `${posY}px`,
    transformOrigin,
  }
})

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      document.addEventListener('keydown', handleKeydown)
      return
    }

    document.removeEventListener('keydown', handleKeydown)
  },
  { immediate: true }
)

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.visible"
      class="day-popover-overlay"
      @click.self="emit('close')"
    >
      <Transition name="popover">
        <div
          v-if="props.visible"
          class="day-popover"
          :style="popoverStyle"
          @click.stop
        >
          <div class="day-popover__header">
            <div class="day-popover__header-main">
              <span class="day-popover__title">{{ props.dateTitle }}</span>
              <span class="day-popover__count">{{ props.articles.length }} 篇</span>
            </div>
            <button
              type="button"
              class="day-popover__close"
              title="关闭"
              @click="emit('close')"
            >
              <X :size="14" />
            </button>
          </div>

          <div
            v-if="props.articles.length > 0"
            class="day-popover__list"
          >
            <button
              v-for="article in props.articles"
              :key="article.id"
              type="button"
              class="day-popover__item"
              @click="emit('open-article', article.id)"
            >
              <FileText :size="14" />
              <span class="day-popover__item-title">{{ article.title }}</span>
            </button>
          </div>
          <div
            v-else
            class="day-popover__empty"
          >
            当天无文章
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.day-popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 99;
}

.day-popover {
  position: fixed;
  width: 280px;
  max-height: 240px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid #eceff1;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow-y: auto;
  transform: translateX(-50%);
}

.day-popover__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
}

.day-popover__header-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.day-popover__title {
  font-size: 13px;
  font-weight: 700;
  color: #263238;
}

.day-popover__count {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 600;
  color: #d32f2f;
  background: #ffebee;
  padding: 2px 8px;
  border-radius: 10px;
}

.day-popover__close {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #eceff1;
  background: #fff;
  color: #90a4ae;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.day-popover__close:hover {
  color: #d32f2f;
  border-color: rgba(211, 47, 47, 0.2);
}

.day-popover__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.day-popover__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease;
  color: #607d8b;
}

.day-popover__item:hover {
  background: #f5f5f5;
}

.day-popover__item-title {
  font-size: 12px;
  font-weight: 500;
  color: #263238;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.day-popover__empty {
  text-align: center;
  font-size: 12px;
  color: #90a4ae;
  padding: 16px 0;
}

.popover-enter-active {
  transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.popover-leave-active {
  transition: all 0.1s ease-in;
}

.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateX(-50%) scale(0.95);
}
</style>
