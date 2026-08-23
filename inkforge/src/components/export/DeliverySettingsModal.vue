<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { SlidersHorizontal, X } from 'lucide-vue-next'

import type { DeliveryAdornmentConfig, Platform } from '@/services/export'
import DeliveryAdornmentPanel from './DeliveryAdornmentPanel.vue'

type DeliverySettingsSection = 'overview' | 'song' | 'profile' | 'license'

const props = withDefaults(defineProps<{
  visible: boolean
  modelValue: DeliveryAdornmentConfig
  platform: Platform
  initialSection?: DeliverySettingsSection
}>(), {
  initialSection: 'overview',
})

const emit = defineEmits<{
  close: []
  'update:modelValue': [value: DeliveryAdornmentConfig]
}>()

const dialogRef = ref<HTMLElement | null>(null)
const closeButtonRef = ref<HTMLButtonElement | null>(null)
let previouslyFocused: HTMLElement | null = null
let previousBodyOverflow = ''
let bodyLocked = false
let wasVisible = false

const sectionSelectors: Record<DeliverySettingsSection, readonly string[]> = {
  overview: ['[data-delivery-section="overview"] input', '[data-delivery-section="overview"] select'],
  song: ['[data-delivery-component-type="song"] input:not([type="checkbox"])', '[data-delivery-add-type="song"]'],
  profile: ['[data-delivery-component-type="contact-card"] input:not([type="checkbox"])', '[data-delivery-add-type="contact-card"]'],
  license: ['[data-delivery-section="license"] select'],
}

function close(): void {
  emit('close')
}

function focusInitialControl(): void {
  const dialog = dialogRef.value
  if (!dialog) return

  for (const selector of sectionSelectors[props.initialSection]) {
    const target = dialog.querySelector<HTMLElement>(selector)
    if (target) {
      target.focus()
      target.scrollIntoView({ block: 'nearest' })
      return
    }
  }

  closeButtonRef.value?.focus()
}

function handleKeydown(event: KeyboardEvent): void {
  event.stopPropagation()
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }

  if (event.key !== 'Tab' || !dialogRef.value) return
  const controls = Array.from(dialogRef.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter(element => !element.hidden)
  if (controls.length === 0) return

  const first = controls[0]
  const last = controls.at(-1) ?? first
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function restorePageState(): void {
  if (bodyLocked) {
    document.body.style.overflow = previousBodyOverflow
    bodyLocked = false
  }
  previouslyFocused?.focus()
  previouslyFocused = null
}

watch(
  () => [props.visible, props.initialSection] as const,
  async ([visible]) => {
    if (!visible) {
      if (wasVisible) restorePageState()
      wasVisible = false
      return
    }

    if (!wasVisible) {
      previouslyFocused = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      bodyLocked = true
    }
    wasVisible = true
    await nextTick()
    focusInitialControl()
  },
  { immediate: true },
)

onBeforeUnmount(restorePageState)
</script>

<template>
  <Teleport to="body">
    <Transition name="delivery-settings">
      <div
        v-if="visible"
        class="delivery-settings-overlay"
        @click.self="close"
        @keydown="handleKeydown"
      >
        <section
          ref="dialogRef"
          class="delivery-settings-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delivery-settings-title"
          tabindex="-1"
        >
          <header class="delivery-settings-header">
            <div>
              <span class="delivery-settings-eyebrow">InkForge Delivery</span>
              <h2 id="delivery-settings-title">
                <SlidersHorizontal :size="19" />
                文章组件与交付配置
              </h2>
              <p>编辑器投影、预览与导出共用这一份真实配置。</p>
            </div>
            <button
              ref="closeButtonRef"
              type="button"
              class="delivery-settings-close"
              aria-label="关闭文章组件与交付配置"
              @click="close"
            >
              <X :size="18" />
            </button>
          </header>
          <div class="delivery-settings-body">
            <DeliveryAdornmentPanel
              :model-value="modelValue"
              :platform="platform"
              compact
              @update:model-value="emit('update:modelValue', $event)"
            />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.delivery-settings-overlay {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--scrim, rgba(15, 23, 42, 0.46));
  backdrop-filter: blur(8px);
}

.delivery-settings-dialog {
  width: min(880px, 100%);
  max-height: min(860px, calc(100vh - 40px));
  overflow: hidden;
  border: 1px solid var(--border-subtle, rgba(38, 50, 56, 0.14));
  border-radius: 20px;
  background: var(--bg-surface, #fffdf8);
  box-shadow: 0 24px 80px rgba(38, 50, 56, 0.28);
}

.delivery-settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border-subtle, rgba(38, 50, 56, 0.1));
  background: var(--bg-surface, #fffdf8);
}

.delivery-settings-eyebrow {
  color: var(--accent-primary, #d32f2f);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.delivery-settings-header h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 5px 0 0;
  color: var(--text-primary, #263238);
  font-size: 20px;
}

.delivery-settings-header p {
  margin: 6px 0 0;
  color: var(--text-muted, #607d8b);
  font-size: 13px;
}

.delivery-settings-close {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-subtle, rgba(38, 50, 56, 0.14));
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted, #607d8b);
  cursor: pointer;
}

.delivery-settings-close:hover,
.delivery-settings-close:focus-visible {
  border-color: var(--accent-primary, #d32f2f);
  color: var(--accent-primary, #d32f2f);
  outline: none;
}

.delivery-settings-body {
  max-height: calc(100vh - 164px);
  overflow: auto;
  padding: 18px;
  overscroll-behavior: contain;
}

.delivery-settings-enter-active,
.delivery-settings-leave-active {
  transition: opacity 160ms ease;
}

.delivery-settings-enter-active .delivery-settings-dialog,
.delivery-settings-leave-active .delivery-settings-dialog {
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease;
}

.delivery-settings-enter-from,
.delivery-settings-leave-to,
.delivery-settings-enter-from .delivery-settings-dialog,
.delivery-settings-leave-to .delivery-settings-dialog {
  opacity: 0;
}

.delivery-settings-enter-from .delivery-settings-dialog,
.delivery-settings-leave-to .delivery-settings-dialog {
  transform: translateY(10px) scale(0.985);
}

@media (max-width: 640px) {
  .delivery-settings-overlay {
    align-items: end;
    padding: 0;
  }

  .delivery-settings-dialog {
    width: 100%;
    max-height: 92vh;
    border-radius: 18px 18px 0 0;
  }

  .delivery-settings-header {
    padding: 16px;
  }

  .delivery-settings-header p {
    display: none;
  }

  .delivery-settings-body {
    max-height: calc(92vh - 82px);
    padding: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .delivery-settings-enter-active,
  .delivery-settings-leave-active,
  .delivery-settings-enter-active .delivery-settings-dialog,
  .delivery-settings-leave-active .delivery-settings-dialog {
    transition: none;
  }
}
</style>
