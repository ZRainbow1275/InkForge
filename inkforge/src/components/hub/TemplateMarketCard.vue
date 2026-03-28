<script setup lang="ts">
import { ArrowRight, Check, Palette, Sparkles } from 'lucide-vue-next'
import { RouterLink } from 'vue-router'
import type { ExportPreset } from '@/types'
import { resolveIconComponent } from '@/utils/lucide-icons'

const props = defineProps<{
  presets: ExportPreset[]
  activePresetId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', presetId: string): void
  (e: 'apply', presetId: string): void
}>()

function normalizeHexColor(input: string): string {
  if (/^#[0-9a-f]{6}$/i.test(input)) {
    return input
  }

  if (/^#[0-9a-f]{3}$/i.test(input)) {
    const [, r, g, b] = input
    return `#${r}${r}${g}${g}${b}${b}`
  }

  return '#D32F2F'
}

function hexToRgb(input: string): { r: number; g: number; b: number } {
  const hex = normalizeHexColor(input).slice(1)
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  }
}

function tintColor(input: string, amount: number): string {
  const { r, g, b } = hexToRgb(input)
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

  return `rgb(${clamp(r + (255 - r) * amount)}, ${clamp(g + (255 - g) * amount)}, ${clamp(b + (255 - b) * amount)})`
}

function getContrastColor(input: string): string {
  const { r, g, b } = hexToRgb(input)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.72 ? '#263238' : '#FFFFFF'
}

function getPreviewStyle(preset: ExportPreset): Record<string, string> {
  const base = normalizeHexColor(preset.primaryColor)
  return {
    background: `linear-gradient(135deg, ${base} 0%, ${tintColor(base, 0.72)} 100%)`,
    color: getContrastColor(base),
  }
}

function getFontTag(fontFamily: string): string {
  switch (fontFamily) {
    case 'serif':
      return '衬线'
    case 'sans-serif':
    case 'sans':
      return '无衬线'
    case 'kai':
      return '楷体'
    case 'mono':
      return '等宽'
    default:
      return '混排'
  }
}

function getThemeTag(theme: string): string {
  switch (theme) {
    case 'grace':
      return '典雅'
    case 'default':
      return '现代'
    case 'dark':
      return '深色'
    default:
      return theme
  }
}

function getLayoutTag(preset: ExportPreset): string {
  if (preset.isUseIndent && preset.isUseJustify) {
    return '缩进对齐'
  }

  if (preset.isUseIndent) {
    return '首行缩进'
  }

  if (preset.isUseJustify) {
    return '两端对齐'
  }

  return '自由布局'
}

function getPresetTags(preset: ExportPreset): string[] {
  return [getFontTag(preset.fontFamily), getThemeTag(preset.theme), getLayoutTag(preset)]
}

function handleKeyboardSelect(event: KeyboardEvent, presetId: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('select', presetId)
  }
}
</script>

<template>
  <section class="template-market">
    <div class="template-market__header">
      <h2 class="template-market__title">
        <Palette :size="18" />
        <span>模板市场</span>
      </h2>
      <div class="template-market__header-meta">
        <span class="template-market__count">{{ props.presets.length }} 款预设</span>
        <RouterLink
          class="template-market__link"
          to="/themes"
        >
          查看全部
          <ArrowRight :size="14" />
        </RouterLink>
      </div>
    </div>

    <div class="template-market__grid">
      <article
        v-for="preset in props.presets"
        :key="preset.id"
        class="theme-card"
        :class="{ 'theme-card--active': props.activePresetId === preset.id }"
        tabindex="0"
        role="button"
        :aria-pressed="props.activePresetId === preset.id"
        @click="emit('select', preset.id)"
        @keydown="handleKeyboardSelect($event, preset.id)"
      >
        <div
          class="theme-card__preview"
          :style="getPreviewStyle(preset)"
        >
          <span
            v-if="props.activePresetId === preset.id"
            class="theme-card__active-indicator"
          >
            <Check :size="14" />
          </span>
          <h3 class="theme-card__preview-title">
            {{ preset.name }}
          </h3>
          <p class="theme-card__preview-text">
            {{ preset.description }}
          </p>
        </div>

        <div class="theme-card__info">
          <div class="theme-card__meta">
            <div class="theme-card__name">
              <component
                :is="resolveIconComponent(preset.icon, 'Palette')"
                :size="16"
              />
              <span>{{ preset.name }}</span>
            </div>
            <div class="theme-card__desc">
              {{ preset.description }}
            </div>
            <div class="theme-card__tags">
              <span
                v-for="tag in getPresetTags(preset)"
                :key="`${preset.id}-${tag}`"
                class="theme-card__tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>
          <div class="theme-card__side">
            <span
              class="theme-card__color"
              :style="{ background: normalizeHexColor(preset.primaryColor) }"
            />
            <button
              type="button"
              class="theme-card__apply"
              @click.stop="emit('apply', preset.id)"
            >
              <Sparkles :size="12" />
              <span>应用</span>
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.template-market {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.template-market__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.template-market__header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.template-market__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #263238;
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-market__count {
  font-size: 12px;
  font-weight: 500;
  color: #90a4ae;
}

.template-market__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: #d32f2f;
  text-decoration: none;
}

.template-market__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.template-market__grid::-webkit-scrollbar {
  width: 4px;
}

.template-market__grid::-webkit-scrollbar-track {
  background: transparent;
}

.template-market__grid::-webkit-scrollbar-thumb {
  background: #eceff1;
  border-radius: 2px;
}

.theme-card {
  background: #ffffff;
  border: 2px solid #eceff1;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.theme-card:hover,
.theme-card:focus-visible {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.theme-card--active {
  border-color: #d32f2f;
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.15);
}

.theme-card__preview {
  position: relative;
  height: 160px;
  padding: 18px 18px 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.theme-card__active-indicator {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #d32f2f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.theme-card__preview-title {
  margin: 0 0 6px;
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}

.theme-card__preview-text {
  margin: 0;
  max-width: 22ch;
  font-size: 12px;
  line-height: 1.6;
  opacity: 0.78;
}

.theme-card__info {
  padding: 10px 14px;
  border-top: 1px solid #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.theme-card__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.theme-card__name {
  font-size: 13px;
  font-weight: 700;
  color: #263238;
  display: flex;
  align-items: center;
  gap: 6px;
}

.theme-card__desc {
  font-size: 11px;
  color: #90a4ae;
  line-height: 1.5;
}

.theme-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.theme-card__tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fafbfc;
  border: 1px solid #eceff1;
  font-size: 10px;
  font-weight: 600;
  color: #607d8b;
}

.theme-card__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.theme-card__color {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.theme-card__apply {
  opacity: 0;
  transition: opacity 0.15s ease;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: #d32f2f;
  color: white;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.theme-card:hover .theme-card__apply,
.theme-card:focus-visible .theme-card__apply,
.theme-card--active .theme-card__apply {
  opacity: 1;
}

.theme-card__apply:hover {
  background: #b71c1c;
}

@media (max-width: 767px) {
  .template-market__header {
    align-items: flex-start;
    gap: 10px;
  }

  .template-market__header-meta {
    width: 100%;
    justify-content: space-between;
  }

  .template-market__grid {
    grid-template-columns: 1fr;
  }

  .theme-card__desc {
    max-width: none;
  }
}
</style>
