<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/vue-3'
import { AlignCenter, AlignLeft, AlignRight, Check, Copy, ExternalLink, ImageOff, Link2, MoveLeft, MoveRight, RefreshCw, Trash2, Type, Unlink, Upload } from 'lucide-vue-next'
import { useAssetStore } from '@/stores/asset'
import { useEditorStore } from '@/stores/editor'
import { normalizeImageAlign, normalizeImageLink } from '@/extensions/ImageV2/imageAttrs'
import type { ImageAlign } from '@/extensions/ImageV2/types'
import { createInkforgeAssetUrl, extractInkforgeAssetId } from '@/utils/asset-url'

type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

const props = defineProps<NodeViewProps>()
const assetStore = useAssetStore()
const editorStore = useEditorStore()

const imageRef = ref<HTMLImageElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const hovering = ref(false)
const copied = ref(false)
const loadFailed = ref(false)
const replacing = ref(false)
const retryCount = ref(0)

const source = computed(() => String(props.node.attrs.src ?? ''))
const assetId = computed(() => {
  const attrAssetId = props.node.attrs.assetId
  if (typeof attrAssetId === 'string' && attrAssetId.trim()) {
    return attrAssetId.trim()
  }

  return extractInkforgeAssetId(source.value)
})
const align = computed<ImageAlign>(() => normalizeImageAlign(props.node.attrs.align))
const caption = computed(() => String(props.node.attrs.caption ?? ''))
const alt = computed(() => String(props.node.attrs.alt ?? 'Image'))
const title = computed(() => String(props.node.attrs.title ?? alt.value))
const link = computed(() => normalizeImageLink(props.node.attrs.link))
const width = computed(() => Number(props.node.attrs.width) || undefined)
const height = computed(() => Number(props.node.attrs.height) || undefined)
const isSelected = computed(() => props.selected)
const shouldShowTools = computed(() => isSelected.value || hovering.value)

const displaySrc = computed(() => {
  void assetStore.assets.length
  const id = assetId.value
  if (!id) {
    return source.value
  }

  return assetStore.getAssetUrl(id) ?? ''
})

const imageStyle = computed(() => ({
  width: width.value ? `${width.value}px` : undefined,
  height: height.value ? `${height.value}px` : undefined,
}))

const linkLabel = computed(() => (link.value ? '编辑图片链接' : '添加图片链接'))

watch(displaySrc, (nextSrc, previousSrc) => {
  if (nextSrc && nextSrc !== previousSrc) {
    resetLoadError()
  }
})

function updateAlign(nextAlign: ImageAlign): void {
  props.updateAttributes({ align: nextAlign })
}

function updateImageLink(): void {
  const nextLink = window.prompt('Image link URL', link.value ?? '')
  if (nextLink === null) {
    return
  }

  props.updateAttributes({ link: normalizeImageLink(nextLink) })
}

function removeImageLink(): void {
  props.updateAttributes({ link: null })
}

function viewOriginalImage(): void {
  const value = displaySrc.value || source.value
  if (!value) {
    return
  }

  window.open(value, '_blank', 'noopener,noreferrer')
}

function requestReplaceImage(): void {
  fileInputRef.value?.click()
}

async function replaceImage(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) {
    return
  }

  replacing.value = true
  try {
    const asset = await assetStore.uploadAsset(file, editorStore.currentContent?.articleId)
    props.updateAttributes({
      src: createInkforgeAssetUrl(asset.id),
      alt: asset.name,
      title: asset.name,
      assetId: asset.id,
      width: asset.width ?? null,
      height: asset.height ?? null,
      naturalWidth: asset.width ?? null,
      naturalHeight: asset.height ?? null,
    })
    loadFailed.value = false
  } finally {
    replacing.value = false
  }
}

function updateCaption(event: Event): void {
  const target = event.target as HTMLInputElement
  props.updateAttributes({ caption: target.value })
}

function resetLoadError(): void {
  loadFailed.value = false
  retryCount.value = 0
}

function handleImageError(): void {
  retryCount.value += 1
  loadFailed.value = true
}

function retryImageLoad(): void {
  if (retryCount.value < 3) {
    loadFailed.value = false
  }
}

function handleImageLoad(event: Event): void {
  resetLoadError()
  const image = event.target as HTMLImageElement
  if (!props.node.attrs.naturalWidth || !props.node.attrs.naturalHeight) {
    props.updateAttributes({
      naturalWidth: image.naturalWidth || null,
      naturalHeight: image.naturalHeight || null,
    })
  }
}

async function copySource(): Promise<void> {
  const value = source.value
  if (!value) {
    return
  }

  try {
    await navigator.clipboard.writeText(value)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 1200)
  } catch {
    copied.value = false
  }
}

function removeImage(): void {
  props.deleteNode()
}

function startResize(corner: ResizeCorner, event: MouseEvent): void {
  event.preventDefault()
  event.stopPropagation()

  const element = imageRef.value
  if (!element) {
    return
  }

  const startX = event.clientX
  const startY = event.clientY
  const startWidth = element.getBoundingClientRect().width || width.value || element.naturalWidth || 240
  const startHeight = element.getBoundingClientRect().height || height.value || element.naturalHeight || 160
  const ratio = startWidth / Math.max(startHeight, 1)

  const onMouseMove = (moveEvent: MouseEvent): void => {
    let deltaX = moveEvent.clientX - startX
    let deltaY = moveEvent.clientY - startY

    if (corner === 'top-left' || corner === 'bottom-left') {
      deltaX = -deltaX
    }
    if (corner === 'top-left' || corner === 'top-right') {
      deltaY = -deltaY
    }

    const nextWidth = Math.max(80, Math.round(startWidth + deltaX))
    const nextHeight = moveEvent.shiftKey
      ? Math.max(80, Math.round(startHeight + deltaY))
      : Math.max(80, Math.round(nextWidth / ratio))

    element.style.width = `${nextWidth}px`
    element.style.height = `${nextHeight}px`
  }

  const onMouseUp = (): void => {
    const finalWidth = Math.round(element.getBoundingClientRect().width)
    const finalHeight = Math.round(element.getBoundingClientRect().height)
    props.updateAttributes({ width: finalWidth, height: finalHeight })
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp, { once: true })
}
</script>

<template>
  <NodeViewWrapper
    as="figure"
    class="asset-image-node"
    :class="[`align-${align}`, { selected: isSelected, failed: loadFailed }]"
    contenteditable="false"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <div
      v-if="shouldShowTools"
      class="image-toolbar"
    >
      <button
        type="button"
        :class="{ active: align === 'left' }"
        aria-label="Align left"
        @click="updateAlign('left')"
      >
        <AlignLeft :size="15" />
      </button>
      <button
        type="button"
        :class="{ active: align === 'center' }"
        aria-label="Align center"
        @click="updateAlign('center')"
      >
        <AlignCenter :size="15" />
      </button>
      <button
        type="button"
        :class="{ active: align === 'right' }"
        aria-label="Align right"
        @click="updateAlign('right')"
      >
        <AlignRight :size="15" />
      </button>
      <button
        type="button"
        :class="{ active: align === 'float-left' }"
        aria-label="Float left"
        @click="updateAlign('float-left')"
      >
        <MoveLeft :size="15" />
      </button>
      <button
        type="button"
        :class="{ active: align === 'float-right' }"
        aria-label="Float right"
        @click="updateAlign('float-right')"
      >
        <MoveRight :size="15" />
      </button>
      <span class="toolbar-divider" />
      <button
        type="button"
        aria-label="图片说明"
        @click="props.updateAttributes({ caption: caption || alt })"
      >
        <Type :size="15" />
      </button>
      <button
        type="button"
        :aria-label="linkLabel"
        :class="{ active: Boolean(link) }"
        @click="updateImageLink"
      >
        <Link2 :size="15" />
      </button>
      <button
        v-if="link"
        type="button"
        aria-label="移除图片链接"
        @click="removeImageLink"
      >
        <Unlink :size="15" />
      </button>
      <button
        type="button"
        aria-label="替换图片"
        :disabled="replacing"
        @click="requestReplaceImage"
      >
        <RefreshCw
          v-if="replacing"
          :size="15"
          class="spin-icon"
        />
        <Upload
          v-else
          :size="15"
        />
      </button>
      <button
        type="button"
        aria-label="查看原图"
        @click="viewOriginalImage"
      >
        <ExternalLink :size="15" />
      </button>
      <button
        type="button"
        aria-label="复制图片来源"
        @click="copySource"
      >
        <Check
          v-if="copied"
          :size="15"
        />
        <Copy
          v-else
          :size="15"
        />
      </button>
      <button
        type="button"
        class="danger"
        aria-label="删除图片"
        @click="removeImage"
      >
        <Trash2 :size="15" />
      </button>
    </div>

    <input
      ref="fileInputRef"
      class="image-replace-input"
      type="file"
      accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
      @change="replaceImage"
    >

    <div class="image-shell">
      <img
        v-if="displaySrc && !loadFailed"
        ref="imageRef"
        class="editor-image asset-image"
        :src="displaySrc"
        :alt="alt"
        :title="title"
        :style="imageStyle"
        :data-link="link ?? undefined"
        loading="lazy"
        draggable="true"
        @load="handleImageLoad"
        @error="handleImageError"
      >
      <div
        v-else
        class="image-fallback"
      >
        <ImageOff :size="28" />
        <span>图片资源暂不可用</span>
        <small v-if="alt">{{ alt }}</small>
        <div class="image-fallback-actions">
          <button
            v-if="retryCount < 3 && displaySrc"
            type="button"
            @click="retryImageLoad"
          >
            <RefreshCw :size="14" />
            重试
          </button>
          <button
            type="button"
            class="danger"
            @click="removeImage"
          >
            <Trash2 :size="14" />
            删除
          </button>
        </div>
      </div>

      <template v-if="shouldShowTools && !loadFailed">
        <span
          class="resize-handle top-left"
          @mousedown="startResize('top-left', $event)"
        />
        <span
          class="resize-handle top-right"
          @mousedown="startResize('top-right', $event)"
        />
        <span
          class="resize-handle bottom-left"
          @mousedown="startResize('bottom-left', $event)"
        />
        <span
          class="resize-handle bottom-right"
          @mousedown="startResize('bottom-right', $event)"
        />
      </template>
    </div>

    <input
      v-if="caption || shouldShowTools"
      class="image-caption-input"
      :value="caption"
      placeholder="添加图片说明"
      @input="updateCaption"
      @mousedown.stop
      @keydown.stop
    >
  </NodeViewWrapper>
</template>

<style scoped>
.asset-image-node {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 20px 0;
  max-width: 100%;
}

.asset-image-node.align-left {
  align-items: flex-start;
}

.asset-image-node.align-center {
  align-items: center;
}

.asset-image-node.align-right {
  align-items: flex-end;
}

.asset-image-node.align-float-left {
  float: left;
  align-items: flex-start;
  max-width: min(50%, 420px);
  margin: 8px 18px 12px 0;
}

.asset-image-node.align-float-right {
  float: right;
  align-items: flex-end;
  max-width: min(50%, 420px);
  margin: 8px 0 12px 18px;
}

.asset-image-node.failed {
  width: fit-content;
}

.image-shell {
  position: relative;
  display: inline-flex;
  max-width: 100%;
}

.asset-image {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  cursor: pointer;
  transition: box-shadow 0.16s ease, transform 0.16s ease;
}

.asset-image-node.selected .asset-image,
.asset-image-node:hover .asset-image {
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.24);
}

.image-toolbar {
  position: absolute;
  top: -42px;
  left: 50%;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(31, 41, 55, 0.12);
  border-radius: 12px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.16);
  transform: translateX(-50%);
  backdrop-filter: blur(10px);
}

.image-toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  color: #4b5563;
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.image-toolbar button:hover,
.image-toolbar button.active {
  color: #d32f2f;
  background: #fff1f2;
}

.image-toolbar button:disabled {
  cursor: progress;
  opacity: 0.58;
}

.image-toolbar button.danger:hover {
  color: #b91c1c;
  background: #fee2e2;
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background: rgba(31, 41, 55, 0.12);
}

.image-replace-input {
  display: none;
}

.spin-icon {
  animation: image-spin 0.8s linear infinite;
}

@keyframes image-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #d32f2f;
  border: 2px solid #ffffff;
  border-radius: 3px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.25);
}

.resize-handle.top-left {
  top: -5px;
  left: -5px;
  cursor: nwse-resize;
}

.resize-handle.top-right {
  top: -5px;
  right: -5px;
  cursor: nesw-resize;
}

.resize-handle.bottom-left {
  bottom: -5px;
  left: -5px;
  cursor: nesw-resize;
}

.resize-handle.bottom-right {
  right: -5px;
  bottom: -5px;
  cursor: nwse-resize;
}

.image-caption-input {
  width: min(100%, 520px);
  padding: 5px 8px;
  color: #6b7280;
  font-size: 0.86rem;
  font-style: italic;
  text-align: center;
  background: transparent;
  border: 0;
  border-bottom: 1px dashed rgba(107, 114, 128, 0.35);
  outline: none;
}

.image-caption-input:focus {
  color: #374151;
  border-bottom-color: rgba(211, 47, 47, 0.55);
}

.image-fallback {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 240px;
  min-height: 132px;
  padding: 18px;
  color: #6b7280;
  text-align: center;
  background: #f9fafb;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
}

.image-fallback small {
  max-width: 240px;
  overflow: hidden;
  color: #9ca3af;
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-fallback-actions {
  display: inline-flex;
  gap: 8px;
}

.image-fallback-actions button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  color: #4b5563;
  background: #ffffff;
  border: 1px solid rgba(31, 41, 55, 0.12);
  border-radius: 8px;
  cursor: pointer;
}

.image-fallback-actions button:hover {
  color: #d32f2f;
  border-color: rgba(211, 47, 47, 0.28);
}

.image-fallback-actions button.danger:hover {
  color: #b91c1c;
  border-color: rgba(185, 28, 28, 0.32);
  background: #fee2e2;
}
</style>
