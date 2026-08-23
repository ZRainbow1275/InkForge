<script setup lang="ts">
import { Dock, MonitorUp, PictureInPicture2, X } from 'lucide-vue-next'
import {
  INSPECTOR_WIDGET_META,
  type InspectorWidgetId,
  type InspectorWidgetPlacement,
} from '@/services/inspector-widgets'

const props = defineProps<{
  surfaceId: InspectorWidgetId
  placement: InspectorWidgetPlacement
}>()

const emit = defineEmits<{
  float: []
  native: []
  dock: []
  close: []
}>()

const title = INSPECTOR_WIDGET_META[props.surfaceId].title
</script>

<template>
  <div
    class="widget-actions"
    :aria-label="`${title}小组件操作`"
  >
    <button
      v-if="placement !== 'docked'"
      type="button"
      :aria-label="`将${title}重新停靠`"
      :title="`将${title}重新停靠`"
      @click.stop="emit('dock')"
    >
      <Dock :size="13" />
    </button>
    <button
      v-if="placement !== 'floating'"
      type="button"
      :aria-label="`在 InkForge 内浮动${title}`"
      :title="`在 InkForge 内浮动${title}`"
      @click.stop="emit('float')"
    >
      <PictureInPicture2 :size="13" />
    </button>
    <button
      v-if="placement !== 'native'"
      type="button"
      :aria-label="`将${title}摘到桌面`"
      :title="`将${title}摘到桌面`"
      @click.stop="emit('native')"
    >
      <MonitorUp :size="13" />
    </button>
    <button
      type="button"
      :aria-label="`关闭${title}小组件`"
      :title="`关闭${title}小组件`"
      @click.stop="emit('close')"
    >
      <X :size="13" />
    </button>
  </div>
</template>

<style scoped>
.widget-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.widget-actions button {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-medium);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.widget-actions button:hover {
  border-color: var(--hairline);
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}
</style>
