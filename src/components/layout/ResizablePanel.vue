<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const props = defineProps<{
  width: number
  minWidth?: number
  maxWidth?: number
  side?: 'left' | 'right'
}>()

const emit = defineEmits<{
  (e: 'update:width', width: number): void
}>()

const isResizing = ref(false)
let startX = 0
let startWidth = 0

function startResize(e: MouseEvent) {
  isResizing.value = true
  startX = e.clientX
  startWidth = props.width
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleMouseMove(e: MouseEvent) {
  if (!isResizing.value) return
  
  const dx = e.clientX - startX
  // 如果 handle 在右边(side='right')，向右拖动增加宽度
  // 如果 handle 在左边(side='left')，向右拖动减小宽度 (因为它是右侧面板的左边缘)
  const newWidth = props.side === 'left' ? startWidth - dx : startWidth + dx
  
  const min = props.minWidth || 100
  const max = props.maxWidth || 800
  
  if (newWidth >= min && newWidth <= max) {
    emit('update:width', newWidth)
  }
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  stopResize()
})
</script>

<template>
  <aside 
    class="resizable-panel" 
    :style="{ width: `${width}px` }"
  >
    <!-- 左侧把手 -->
    <div 
      v-if="side === 'left'"
      class="resize-handle left"
      :class="{ active: isResizing }"
      @mousedown.prevent="startResize"
    ></div>

    <div class="panel-container">
      <slot></slot>
    </div>

    <!-- 右侧把手 -->
    <div 
      v-if="side === 'right'"
      class="resize-handle right"
      :class="{ active: isResizing }"
      @mousedown.prevent="startResize"
    ></div>
  </aside>
</template>

<style scoped>
.resizable-panel {
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  background: var(--color-bg);
  border-right: 1px solid var(--color-border);
}

.resizable-panel:last-child {
  border-right: none;
}

.panel-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  z-index: 10;
  transition: background 0.2s;
}

.resize-handle:hover,
.resize-handle.active {
  background: var(--color-primary);
}

.resize-handle.right {
  right: -2px;
}

.resize-handle.left {
  left: -2px;
}
</style>
