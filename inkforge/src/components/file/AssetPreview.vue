<script setup lang="ts">
import { ImageOff, Trash2 } from 'lucide-vue-next'
import type { AssetRecord } from '@/utils/db'

interface AssetPreviewProps {
    asset: AssetRecord
    thumbnailUrl: string | null
    selected?: boolean
}

interface AssetPreviewEmits {
    (e: 'click', asset: AssetRecord): void
    (e: 'dragstart', event: DragEvent, asset: AssetRecord): void
    (e: 'delete', assetId: string): void
}

const props = withDefaults(defineProps<AssetPreviewProps>(), {
    selected: false,
})

const emit = defineEmits<AssetPreviewEmits>()

function handleClick(): void {
    emit('click', props.asset)
}

function handleDragStart(event: DragEvent): void {
    emit('dragstart', event, props.asset)
}

function handleDelete(): void {
    emit('delete', props.asset.id)
}
</script>

<template>
  <div
    class="asset-preview"
    :class="{ 'asset-preview--selected': props.selected }"
    role="button"
    tabindex="0"
    draggable="true"
    @click="handleClick"
    @dragstart="handleDragStart"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <div class="asset-preview__thumb-wrap">
      <img
        v-if="props.thumbnailUrl"
        :src="props.thumbnailUrl"
        :alt="props.asset.name"
        class="asset-preview__thumb"
      >
      <div
        v-else
        class="asset-preview__placeholder"
      >
        <ImageOff
          class="asset-preview__placeholder-icon"
          :size="16"
        />
      </div>

      <button
        type="button"
        class="asset-preview__delete"
        :title="`删除素材 ${props.asset.name}`"
        @click.stop="handleDelete"
      >
        <Trash2 :size="12" />
      </button>
    </div>

    <span class="asset-preview__name">{{ props.asset.name }}</span>
  </div>
</template>

<style scoped>
.asset-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 0;
    cursor: pointer;
    user-select: none;
}

.asset-preview__thumb-wrap {
    position: relative;
    width: 56px;
    height: 56px;
}

.asset-preview__thumb,
.asset-preview__placeholder {
    width: 56px;
    height: 56px;
    border-radius: 6px;
    border: 1px solid #E5E7EB;
    background: #F9FAFB;
}

.asset-preview__thumb {
    object-fit: cover;
}

.asset-preview__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #90A4AE;
}

.asset-preview__placeholder-icon {
    opacity: 0.72;
}

.asset-preview__delete {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 999px;
    background: rgba(38, 50, 56, 0.72);
    color: #FFFFFF;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, background 0.15s ease;
}

.asset-preview:hover .asset-preview__delete,
.asset-preview:focus-within .asset-preview__delete {
    opacity: 1;
}

.asset-preview__delete:hover {
    background: rgba(211, 47, 47, 0.92);
}

.asset-preview--selected .asset-preview__thumb,
.asset-preview--selected .asset-preview__placeholder {
    border-color: #D32F2F;
    box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.16);
}

.asset-preview__name {
    max-width: 56px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10px;
    color: #6B7280;
    text-align: center;
}
</style>
