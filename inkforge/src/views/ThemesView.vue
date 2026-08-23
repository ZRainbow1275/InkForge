<script setup lang="ts">
/**
 * ThemesView - 多平台主题中心
 * 直接消费共享预设注册表和真实平台渲染器。
 */
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import {
  convertToPlatform,
  DEFAULT_SAMPLE_MARKDOWN,
  getPlatformPresets,
} from '@/services/export'
import type { Platform, PresetVisualSignature } from '@/services/export'
import { logger } from '@/services/error'
import { useSettingsStore } from '@/stores/settings'

const PLATFORM_OPTIONS: ReadonlyArray<{ value: Platform; label: string }> = [
  { value: 'wechat', label: '微信公众号' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'zhihu', label: '知乎' },
]

const DEFAULT_PRESET_IDS: Record<Platform, string> = {
  wechat: 'thesis',
  xiaohongshu: 'xhs-fresh',
  zhihu: 'zhihu-academic',
}

const PERSONA_LABELS: Record<string, string> = {
  academic: '学术',
  business: '商务',
  editorial: '编辑',
  creative: '创意',
  lifestyle: '生活',
  technical: '技术',
}

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()

function normalizePlatform(value: unknown): Platform | undefined {
  const candidate = Array.isArray(value) ? value[0] : value
  return PLATFORM_OPTIONS.some(option => option.value === candidate)
    ? candidate as Platform
    : undefined
}

function isPlatformPreset(platform: Platform, presetId: string): boolean {
  return getPlatformPresets(platform).some(preset => preset.id === presetId)
}

const initialPlatform = normalizePlatform(route.query.platform)
  ?? settingsStore.settings.export.defaultPlatform
const selectedPlatform = ref<Platform>(initialPlatform)
const platformPresetIds = ref<Record<Platform, string>>({ ...DEFAULT_PRESET_IDS })
const storedPlatform = settingsStore.settings.export.defaultPlatform
const storedPresetId = settingsStore.settings.export.defaultPresetId
if (isPlatformPreset(storedPlatform, storedPresetId)) {
  platformPresetIds.value[storedPlatform] = storedPresetId
}

const selectedPreset = computed({
  get: () => platformPresetIds.value[selectedPlatform.value],
  set: (presetId: string) => {
    platformPresetIds.value[selectedPlatform.value] = presetId
  },
})

function getSignatureDetails(signature?: PresetVisualSignature): Array<{ label: string; value: string }> {
  if (!signature) return []
  return [
    { label: '节奏', value: signature.rhythm },
    { label: '标题', value: signature.heading },
    { label: '引用', value: signature.quote },
    { label: '分隔', value: signature.divider },
    { label: '图片', value: signature.media },
  ]
}

const themes = computed(() => getPlatformPresets(selectedPlatform.value).map(preset => ({
  id: preset.id,
  name: preset.name,
  description: preset.description || `${preset.name}平台排版配方`,
  primaryColor: preset.primaryColor,
  persona: preset.persona,
  visualSignature: preset.visualSignature,
  signatureDetails: getSignatureDetails(preset.visualSignature),
})))

const selectedThemeData = computed(() => (
  themes.value.find(theme => theme.id === selectedPreset.value) ?? themes.value[0]!
))
const previewHtml = ref('')
const previewError = ref('')
const isPreviewRendering = ref(false)
let previewSequence = 0

function selectPlatform(platform: Platform): void {
  selectedPlatform.value = platform
}

function selectPreset(presetId: string): void {
  selectedPreset.value = presetId
}

function getPersonaLabel(persona?: string): string {
  return persona ? PERSONA_LABELS[persona] ?? persona : '平台配方'
}

function isCurrentPreset(presetId: string): boolean {
  return settingsStore.settings.export.defaultPlatform === selectedPlatform.value
    && settingsStore.settings.export.defaultPresetId === presetId
}

async function renderPreview(): Promise<void> {
  const sequence = ++previewSequence
  previewError.value = ''
  isPreviewRendering.value = true
  try {
    const html = await convertToPlatform(DEFAULT_SAMPLE_MARKDOWN, selectedPlatform.value, {
      presetId: selectedPreset.value,
    })
    if (sequence === previewSequence) previewHtml.value = html
  } catch (error) {
    if (sequence !== previewSequence) return
    previewError.value = '真实平台预览生成失败，请切换样式重试。'
    logger.error('主题中心平台预览生成失败', error)
  } finally {
    if (sequence === previewSequence) isPreviewRendering.value = false
  }
}

watch([selectedPlatform, selectedPreset], () => {
  void renderPreview()
}, { immediate: true })

function applyPreset(): void {
  settingsStore.settings.export.defaultPlatform = selectedPlatform.value
  settingsStore.settings.export.defaultPresetId = selectedPreset.value
  void router.push('/workstation')
}

function cancel(): void {
  router.back()
}
</script>

<template>
  <div class="themes-container">
    <!-- Header -->
    <header class="themes-header">
      <div class="header-left">
        <button
          type="button"
          class="back-btn"
          aria-label="返回上一页"
          title="返回上一页"
          @click="cancel"
        >
          <ArrowLeft
            :size="16"
            aria-hidden="true"
          />
        </button>
        <h1 class="header-title">
          主题中心
        </h1>
      </div>
      <button
        type="button"
        class="header-apply-btn"
        @click="applyPreset"
      >
        应用
      </button>
    </header>

    <!-- Main: Left Grid + Right Preview -->
    <div class="themes-body">
      <!-- Left: Theme Grid -->
      <div class="themes-grid-wrapper">
        <div
          class="platform-switch"
          role="tablist"
          aria-label="选择排版平台"
        >
          <button
            v-for="option in PLATFORM_OPTIONS"
            :key="option.value"
            type="button"
            class="platform-switch-btn"
            :class="{ active: selectedPlatform === option.value }"
            :aria-selected="selectedPlatform === option.value"
            role="tab"
            @click="selectPlatform(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <div class="themes-grid">
          <button
            v-for="theme in themes"
            :key="theme.id"
            type="button"
            class="theme-card"
            :class="{ active: selectedPreset === theme.id }"
            :aria-pressed="selectedPreset === theme.id"
            :aria-label="`选择主题：${theme.name}`"
            @click="selectPreset(theme.id)"
          >
            <!-- Color Bar -->
            <div
              class="theme-color-bar"
              :style="{ backgroundColor: theme.primaryColor }"
            />

            <!-- Current Badge -->
            <span
              v-if="isCurrentPreset(theme.id)"
              class="current-badge"
            >当前</span>

            <!-- Card Content -->
            <div class="theme-card-content">
              <div
                class="theme-card-motif"
                :style="{ '--theme-accent': theme.primaryColor }"
                aria-hidden="true"
              >
                <span class="theme-card-motif__title" />
                <span class="theme-card-motif__copy theme-card-motif__copy--long" />
                <span class="theme-card-motif__copy" />
                <span class="theme-card-motif__quote" />
              </div>
              <div class="theme-card-name">
                {{ theme.name }}
              </div>
              <div class="theme-card-tags">
                <span class="tag-pill">{{ PLATFORM_OPTIONS.find(option => option.value === selectedPlatform)?.label }}</span>
                <span class="tag-pill">{{ getPersonaLabel(theme.persona) }}</span>
              </div>
              <p class="theme-card-preview">
                {{ theme.description }}
              </p>
              <div
                v-if="theme.signatureDetails.length"
                class="theme-card-signatures"
              >
                <span
                  v-for="detail in theme.signatureDetails.slice(0, 3)"
                  :key="detail.label"
                >
                  <small>{{ detail.label }}</small>
                  {{ detail.value }}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Right: Preview Panel -->
      <aside class="preview-panel">
        <div class="preview-panel-header">
          <h2 class="preview-panel-title">
            {{ selectedThemeData.name }}
          </h2>
          <p class="preview-panel-desc">
            {{ selectedThemeData.description }}
          </p>
          <dl
            v-if="selectedThemeData.signatureDetails.length"
            class="preview-signature-grid"
          >
            <div
              v-for="detail in selectedThemeData.signatureDetails"
              :key="detail.label"
            >
              <dt>{{ detail.label }}</dt>
              <dd>{{ detail.value }}</dd>
            </div>
          </dl>
          <div
            v-if="selectedThemeData.visualSignature?.modules.length"
            class="preview-signature-modules"
          >
            <span
              v-for="moduleName in selectedThemeData.visualSignature.modules"
              :key="moduleName"
            >{{ moduleName }}</span>
          </div>
        </div>

        <div class="preview-render-area">
          <div
            v-if="isPreviewRendering"
            class="preview-status"
          >
            正在生成真实平台预览
          </div>
          <div
            v-else-if="previewError"
            class="preview-status preview-status-error"
          >
            {{ previewError }}
          </div>
          <div
            v-else
            class="preview-render-content"
            v-html="previewHtml"
          />
        </div>

        <div class="preview-panel-actions">
          <button
            type="button"
            class="btn-apply"
            @click="applyPreset"
          >
            应用此主题
          </button>
          <button
            type="button"
            class="btn-cancel"
            @click="cancel"
          >
            取消
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ═══ PAGE CONTAINER ═══ */
.themes-container {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-rice-paper, #FAFBFC);
}

/* ═══ HEADER ═══ */
.themes-header {
  height: 52px;
  background: var(--bg-surface, #FFFFFF);
  border-bottom: 1px solid var(--hairline, #ECEFF1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--hairline, #ECEFF1);
  cursor: pointer;
  color: var(--text-secondary, #607D8B);
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    border-color var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart);
}

.back-btn:hover {
  background: var(--accent-primary-light, #FFEBEE);
  border-color: var(--accent-primary, #D32F2F);
  color: var(--accent-primary, #D32F2F);
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #263238);
}

.header-apply-btn {
  padding: 6px 20px;
  background: var(--accent-primary, #D32F2F);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart);
}

.header-apply-btn:hover {
  background: var(--accent-primary-dark, #B71C1C);
}

/* ═══ BODY: GRID + PREVIEW ═══ */
.themes-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ═══ LEFT: GRID WRAPPER ═══ */
.themes-grid-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

.platform-switch {
  display: inline-flex;
  gap: 4px;
  margin-bottom: 18px;
  padding: 4px;
  border: 1px solid var(--hairline, #ECEFF1);
  border-radius: 10px;
  background: var(--bg-surface, #FFFFFF);
}

.platform-switch-btn {
  min-height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-secondary, #607D8B);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.platform-switch-btn:hover {
  color: var(--text-primary, #263238);
  background: var(--bg-rice-paper, #F5F5F5);
}

.platform-switch-btn.active {
  color: var(--accent-primary-dark, #B71C1C);
  background: var(--accent-primary-light, #FFEBEE);
}

.platform-switch-btn:focus-visible {
  outline: 2px solid var(--accent-primary, #D32F2F);
  outline-offset: 2px;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

/* ═══ THEME CARD ═══ */
.theme-card {
  appearance: none;
  width: 100%;
  padding: 0;
  position: relative;
  background: var(--bg-surface, #FFFFFF);
  border: 2px solid transparent;
  border-radius: 12px;
  color: inherit;
  font: inherit;
  text-align: left;
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--elev-1);
  transition: box-shadow var(--motion-base) var(--ease-out-quart),
    border-color var(--motion-base) var(--ease-out-quart),
    transform var(--motion-base) var(--ease-out-quart);
  animation: cardSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.theme-card:nth-child(1)  { animation-delay: 0.05s; }
.theme-card:nth-child(2)  { animation-delay: 0.10s; }
.theme-card:nth-child(3)  { animation-delay: 0.15s; }
.theme-card:nth-child(4)  { animation-delay: 0.20s; }
.theme-card:nth-child(5)  { animation-delay: 0.25s; }
.theme-card:nth-child(6)  { animation-delay: 0.30s; }
.theme-card:nth-child(7)  { animation-delay: 0.35s; }
.theme-card:nth-child(8)  { animation-delay: 0.40s; }
.theme-card:nth-child(9)  { animation-delay: 0.45s; }
.theme-card:nth-child(10) { animation-delay: 0.50s; }

@keyframes cardSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.theme-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--elev-2);
}

.theme-card.active {
  border-color: var(--accent-primary, #D32F2F);
}

/* Color Bar */
.theme-color-bar {
  height: 4px;
  width: 100%;
}

/* Current Badge */
.current-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--accent-primary, #D32F2F);
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  z-index: 1;
}

/* Card Content */
.theme-card-content {
  padding: 20px;
}

.theme-card-motif {
  --theme-accent: var(--accent-primary, #D32F2F);
  position: relative;
  height: 58px;
  margin: -5px 0 14px;
  overflow: hidden;
  border: 1px solid var(--hairline, #ECEFF1);
  border-radius: 8px;
  background: var(--bg-rice-paper, #FAFBFC);
}

.theme-card-motif__title,
.theme-card-motif__copy,
.theme-card-motif__quote {
  position: absolute;
  display: block;
  border-radius: 999px;
}

.theme-card-motif__title {
  top: 10px;
  left: 11px;
  width: 44%;
  height: 7px;
  background: var(--theme-accent);
}

.theme-card-motif__copy {
  top: 30px;
  left: 11px;
  width: 36%;
  height: 3px;
  background: var(--text-muted, #90A4AE);
  opacity: 0.55;
}

.theme-card-motif__copy--long {
  top: 22px;
  width: 58%;
}

.theme-card-motif__quote {
  right: 11px;
  bottom: 9px;
  width: 25%;
  height: 22px;
  border: 1px solid var(--theme-accent);
  border-left-width: 3px;
  border-radius: 4px;
  opacity: 0.75;
}

.theme-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #263238);
  margin-bottom: 4px;
}

.theme-card-tags {
  display: flex;
  gap: 6px;
}

.tag-pill {
  font-size: 10px;
  background: var(--bg-rice-paper, #F5F5F5);
  color: var(--text-secondary, #607D8B);
  padding: 2px 8px;
  border-radius: 10px;
}

.theme-card-preview {
  font-size: 12px;
  color: var(--text-muted, #90A4AE);
  margin-top: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.theme-card-signatures {
  display: grid;
  gap: 5px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--hairline, #ECEFF1);
}

.theme-card-signatures span {
  overflow: hidden;
  color: var(--text-secondary, #607D8B);
  font-size: 10px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-card-signatures small {
  margin-right: 5px;
  color: var(--text-muted, #90A4AE);
  font-size: 9px;
  letter-spacing: 0.08em;
}

/* ═══ RIGHT: PREVIEW PANEL ═══ */
.preview-panel {
  width: 400px;
  flex-shrink: 0;
  box-sizing: border-box;
  height: 100%;
  background: var(--bg-surface, #FFFFFF);
  border-left: 1px solid var(--hairline, #ECEFF1);
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.preview-panel-header {
  margin-bottom: 20px;
}

.preview-panel-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #263238);
  margin-bottom: 4px;
}

.preview-panel-desc {
  font-size: 13px;
  color: var(--text-secondary, #607D8B);
}

.preview-signature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px 12px;
  margin: 14px 0 0;
}

.preview-signature-grid > div {
  min-width: 0;
  padding-left: 8px;
  border-left: 2px solid var(--hairline, #ECEFF1);
}

.preview-signature-grid dt {
  color: var(--text-muted, #90A4AE);
  font-size: 9px;
  letter-spacing: 0.1em;
}

.preview-signature-grid dd {
  margin: 2px 0 0;
  color: var(--text-primary, #263238);
  font-size: 10px;
  line-height: 1.35;
}

.preview-signature-modules {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
}

.preview-signature-modules span {
  padding: 2px 7px;
  border: 1px solid var(--hairline, #ECEFF1);
  border-radius: 999px;
  background: var(--bg-rice-paper, #FAFBFC);
  color: var(--text-secondary, #607D8B);
  font-size: 9px;
  line-height: 1.45;
}

/* Render Area — 样张预览场（砚白纸面） */
.preview-render-area {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--hairline, #ECEFF1);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  background: var(--paper-warm, #F7F4EF);
}

.preview-render-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, #37474F);
}

.preview-status {
  min-height: 160px;
  display: grid;
  place-items: center;
  color: var(--text-muted, #90A4AE);
  font-size: 13px;
  text-align: center;
}

.preview-status-error {
  color: var(--accent-primary-dark, #B71C1C);
}

/* Action Buttons */
.preview-panel-actions {
  flex-shrink: 0;
}

.btn-apply {
  width: 100%;
  height: 42px;
  background: var(--accent-primary, #D32F2F);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart);
}

.btn-apply:hover {
  background: var(--accent-primary-dark, #B71C1C);
  box-shadow: var(--glow-ember);
  transform: translateY(-1px);
}

.btn-cancel {
  width: 100%;
  height: 38px;
  background: transparent;
  border: 1px solid var(--hairline, #ECEFF1);
  color: var(--text-secondary, #607D8B);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  margin-top: 8px;
  transition: background-color var(--motion-fast) var(--ease-out-quart),
    border-color var(--motion-fast) var(--ease-out-quart);
}

.btn-cancel:hover {
  background: var(--bg-rice-paper, #FAFBFC);
  border-color: var(--hairline, #CFD8DC);
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 1000px) {
  .preview-panel {
    display: none;
  }
  .themes-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .themes-grid {
    grid-template-columns: 1fr;
  }
  .themes-grid-wrapper {
    padding: 16px;
  }
}
</style>
