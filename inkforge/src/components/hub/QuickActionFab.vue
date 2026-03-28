<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import {
  FilePlus2,
  LayoutTemplate,
  Plus,
  Upload,
  type LucideIcon,
} from 'lucide-vue-next'

interface FabAction {
  key: 'new-article' | 'import-file' | 'from-template'
  label: string
  icon: LucideIcon
}

const emit = defineEmits<{
  (e: 'new-article'): void
  (e: 'import-file'): void
  (e: 'from-template'): void
}>()

const isOpen = ref(false)

const actions: readonly FabAction[] = [
  {
    key: 'new-article',
    label: '新建文章',
    icon: FilePlus2,
  },
  {
    key: 'import-file',
    label: '导入文件',
    icon: Upload,
  },
  {
    key: 'from-template',
    label: '从模板创建',
    icon: LayoutTemplate,
  },
] as const

function toggleFab(): void {
  isOpen.value = !isOpen.value
}

function closeFab(): void {
  isOpen.value = false
}

function handleAction(action: FabAction['key']): void {
  if (action === 'new-article') {
    emit('new-article')
  } else if (action === 'import-file') {
    emit('import-file')
  } else {
    emit('from-template')
  }
  closeFab()
}

function handleWindowClick(): void {
  if (isOpen.value) {
    closeFab()
  }
}

function handleWindowKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    closeFab()
  }
}

onMounted(() => {
  window.addEventListener('click', handleWindowClick)
  window.addEventListener('keydown', handleWindowKeydown)
})

onUnmounted(() => {
  window.removeEventListener('click', handleWindowClick)
  window.removeEventListener('keydown', handleWindowKeydown)
})
</script>

<template>
  <div
    class="fab-container"
    @click.stop
  >
    <TransitionGroup name="fab-action">
      <template v-if="isOpen">
        <button
          v-for="(action, index) in actions"
          :key="action.key"
          type="button"
          class="fab-action"
          :style="{ '--i': String(index) }"
          :title="action.label"
          @click="handleAction(action.key)"
        >
          <component
            :is="action.icon"
            :size="18"
          />
          <span class="fab-action__label">{{ action.label }}</span>
        </button>
      </template>
    </TransitionGroup>

    <button
      type="button"
      class="fab-main"
      :class="{ 'fab-main--open': isOpen }"
      :title="isOpen ? '关闭快速操作' : '打开快速操作'"
      @click="toggleFab"
    >
      <Plus :size="22" />
    </button>
  </div>
</template>

<style scoped>
.fab-container {
  position: fixed;
  right: 32px;
  bottom: 32px;
  z-index: 40;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
}

.fab-main {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #d32f2f;
  color: #ffffff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(211, 47, 47, 0.3);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fab-main:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 24px rgba(211, 47, 47, 0.4);
}

.fab-main--open {
  transform: rotate(45deg);
  background: #b71c1c;
}

.fab-action {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid #eceff1;
  color: #607d8b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fab-action:hover {
  border-color: #d32f2f;
  color: #d32f2f;
  transform: scale(1.08);
}

.fab-action__label {
  position: absolute;
  right: calc(100% + 12px);
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  color: #263238;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 4px 10px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  pointer-events: none;
}

.fab-action-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: calc(var(--i) * 50ms);
}

.fab-action-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.8);
}

.fab-action-leave-active {
  transition: all 0.15s ease-in;
}

.fab-action-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

@media (max-width: 767px) {
  .fab-container {
    right: 20px;
    bottom: 20px;
  }

  .fab-action__label {
    display: none;
  }
}
</style>
