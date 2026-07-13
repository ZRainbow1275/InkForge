<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { keyboardEventToShortcut, normalizeShortcutBinding } from '@/utils/shortcuts'

const RESERVED_SHORTCUTS: Record<string, string> = {
  'Ctrl+L': '浏览器地址栏',
  'Ctrl+N': '新建窗口',
  'Ctrl+R': '刷新页面',
  'Ctrl+T': '新建标签页',
  'Ctrl+W': '关闭标签页',
  'Ctrl+Shift+N': '无痕窗口',
  'Ctrl+Shift+T': '恢复关闭的标签页',
  F5: '刷新页面',
}

interface ShortcutInputProps {
  modelValue: string
  shortcutId: string
  allShortcuts: Record<string, string>
  shortcutLabels?: Record<string, string>
  disabled?: boolean
}

const props = withDefaults(defineProps<ShortcutInputProps>(), {
  shortcutLabels: () => ({}),
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  conflict: [value: string | null]
}>()

const isRecording = ref(false)
const localConflict = ref<string | null>(null)

const shortcutParts = computed(() => props.modelValue.split('+').filter(Boolean))

watch(
  () => props.modelValue,
  () => {
    if (!isRecording.value) {
      localConflict.value = null
      emit('conflict', null)
    }
  },
)

function beginRecording(): void {
  if (props.disabled) {
    return
  }

  window.addEventListener('blur', stopRecording)
  isRecording.value = true
  localConflict.value = null
  emit('conflict', null)
}

function stopRecording(): void {
  window.removeEventListener('blur', stopRecording)
  isRecording.value = false
}

function handleBlur(event: FocusEvent): void {
  const trigger = event.currentTarget
  if (!(trigger instanceof HTMLButtonElement)) {
    stopRecording()
    return
  }

  requestAnimationFrame(() => {
    if (!document.hasFocus() || document.activeElement !== trigger) {
      stopRecording()
    }
  })
}

onBeforeUnmount(stopRecording)

function findConflict(nextBinding: string): string | null {
  const normalizedNextBinding = normalizeShortcutBinding(nextBinding) ?? nextBinding
  const reservedConflict = RESERVED_SHORTCUTS[normalizedNextBinding]

  if (reservedConflict) {
    return `与浏览器快捷键冲突：${reservedConflict}`
  }

  const duplicated = Object.entries(props.allShortcuts).find(([shortcutId, binding]) => {
    return shortcutId !== props.shortcutId && normalizeShortcutBinding(binding) === normalizedNextBinding
  })

  if (!duplicated) {
    return null
  }

  const duplicatedLabel = props.shortcutLabels[duplicated[0]] ?? duplicated[0]
  return `与“${duplicatedLabel}”冲突`
}

function buildShortcut(event: KeyboardEvent): string | null {
  const nextBinding = keyboardEventToShortcut(event)
  if (!nextBinding) {
    return null
  }

  const parts = nextBinding.split('+')
  const mainKey = parts[parts.length - 1]
  const isFunctionKey = /^F\d{1,2}$/u.test(mainKey)

  if (!isFunctionKey && parts.length < 2) {
    return null
  }

  return nextBinding
}

function handleKeydown(event: KeyboardEvent): void {
  if (!isRecording.value) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  if (event.key === 'Escape') {
    localConflict.value = null
    emit('conflict', null)
    stopRecording()
    return
  }

  const nextBinding = buildShortcut(event)

  if (!nextBinding) {
    localConflict.value = '至少需要一个修饰键，或使用 F 功能键。'
    emit('conflict', localConflict.value)
    return
  }

  const conflict = findConflict(nextBinding)
  if (conflict) {
    localConflict.value = conflict
    emit('conflict', conflict)
    return
  }

  emit('update:modelValue', nextBinding)
  emit('conflict', null)
  localConflict.value = null
  stopRecording()
}
</script>

<template>
  <div class="shortcut-input">
    <button
      type="button"
      class="shortcut-input__trigger"
      :class="{ 'shortcut-input__trigger--recording': isRecording }"
      :aria-label="`录制${props.shortcutLabels[props.shortcutId] ?? props.shortcutId}快捷键`"
      :data-shortcut-id="props.shortcutId"
      :disabled="disabled"
      @click="isRecording ? stopRecording() : beginRecording()"
      @keydown="handleKeydown"
      @blur="handleBlur"
    >
      <template v-if="isRecording">
        <span class="shortcut-input__hint">按下新的快捷键...</span>
      </template>
      <template v-else>
        <kbd
          v-for="part in shortcutParts"
          :key="part"
          class="shortcut-input__key"
        >
          {{ part }}
        </kbd>
      </template>
    </button>

    <p
      v-if="localConflict"
      class="shortcut-input__message"
    >
      {{ localConflict }}
    </p>
  </div>
</template>

<style scoped>
.shortcut-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.shortcut-input__trigger {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--border, #eceff1);
  border-radius: 10px;
  background: var(--bg-surface, #fff);
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  outline: none;
}

.shortcut-input__trigger:hover:not(:disabled),
.shortcut-input__trigger:focus-visible {
  border-color: var(--accent-primary, #d32f2f);
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.08);
}

.shortcut-input__trigger:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.shortcut-input__trigger--recording {
  border-color: var(--accent-primary, #d32f2f);
  background: var(--accent-primary-light, #ffebee);
}

.shortcut-input__hint {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-primary, #d32f2f);
}

.shortcut-input__key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 4px 8px;
  border: 1px solid #eceff1;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  color: #455a64;
}

.shortcut-input__message {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: #d32f2f;
}
</style>
