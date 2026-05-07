<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { User } from 'lucide-vue-next'
import { useAccountStore } from '@/stores/account'

const props = withDefaults(defineProps<{ size?: number }>(), { size: 48 })

const emit = defineEmits<{
  (e: 'open-account'): void
  (e: 'open-settings'): void
  (e: 'switch-account'): void
  (e: 'sign-out'): void
}>()

const accountStore = useAccountStore()

const open = ref(false)
const triggerRef = ref<HTMLButtonElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const imageError = ref(false)

watch(() => accountStore.avatarUrl, () => {
  imageError.value = false
})

const fallbackBg = computed<string>(() => {
  const id = accountStore.currentAccount?.id ?? accountStore.displayName
  const seed = String(id ?? 'inkforge')
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const hue = hash % 360
  return `linear-gradient(135deg, hsl(${hue} 65% 56%) 0%, hsl(${(hue + 30) % 360} 60% 44%) 100%)`
})

function toggle(): void {
  open.value = !open.value
}

function close(): void {
  open.value = false
}

function handleDocumentClick(event: MouseEvent): void {
  if (!open.value) return
  const target = event.target as Node | null
  if (!target) return
  if (popoverRef.value?.contains(target)) return
  if (triggerRef.value?.contains(target)) return
  close()
}

function handleEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape' && open.value) {
    close()
    triggerRef.value?.focus()
  }
}

function onAvatarError(): void {
  imageError.value = true
}

function dispatch(channel: 'open-account' | 'open-settings' | 'switch-account' | 'sign-out'): void {
  close()
  if (channel === 'open-account') emit('open-account')
  else if (channel === 'open-settings') emit('open-settings')
  else if (channel === 'switch-account') emit('switch-account')
  else emit('sign-out')
}

watch(open, value => {
  if (value) {
    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)
  } else {
    document.removeEventListener('mousedown', handleDocumentClick)
    document.removeEventListener('keydown', handleEscape)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <div class="user-avatar-popover">
    <button
      ref="triggerRef"
      type="button"
      class="user-avatar-trigger"
      :title="`本地账户：${accountStore.displayName}`"
      :aria-expanded="open"
      aria-haspopup="menu"
      :style="{ width: `${props.size}px`, height: `${props.size}px` }"
      @click.stop="toggle"
    >
      <img
        v-if="accountStore.avatarUrl && !imageError"
        :src="accountStore.avatarUrl"
        :alt="accountStore.displayName"
        class="user-avatar-img"
        @error="onAvatarError"
      >
      <span
        v-else
        class="user-avatar-fallback"
        :style="{ background: fallbackBg }"
        aria-hidden="true"
      >
        <User
          :size="Math.round(props.size * 0.50)"
          :stroke-width="2.2"
        />
      </span>
    </button>

    <transition name="user-popover">
      <div
        v-if="open"
        ref="popoverRef"
        class="user-popover"
        role="menu"
        aria-label="账户菜单"
      >
        <header class="user-popover-head">
          <span
            class="user-popover-avatar"
            :style="{ background: fallbackBg }"
            aria-hidden="true"
          >
            <img
              v-if="accountStore.avatarUrl && !imageError"
              :src="accountStore.avatarUrl"
              :alt="accountStore.displayName"
              @error="onAvatarError"
            >
            <User
              v-else
              :size="20"
              :stroke-width="2.2"
            />
          </span>
          <div class="user-popover-text">
            <strong>{{ accountStore.displayName }}</strong>
            <span>本地账户</span>
          </div>
        </header>

        <div
          class="user-popover-list"
          role="none"
        >
          <button
            type="button"
            class="user-popover-item"
            role="menuitem"
            @click="dispatch('open-account')"
          >
            <span>账户管理</span>
            <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            class="user-popover-item"
            role="menuitem"
            @click="dispatch('open-settings')"
          >
            <span>设置</span>
            <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            class="user-popover-item"
            role="menuitem"
            @click="dispatch('switch-account')"
          >
            <span>切换账户</span>
            <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            class="user-popover-item user-popover-item--danger"
            role="menuitem"
            @click="dispatch('sign-out')"
          >
            <span>退出</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.user-avatar-popover {
  position: relative;
  display: inline-flex;
}

.user-avatar-trigger {
  border: none;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  background: transparent;
  box-shadow: 0 2px 8px rgba(38, 50, 56, 0.12);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.user-avatar-trigger:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(38, 50, 56, 0.18);
}

.user-avatar-trigger:focus-visible {
  outline: 2px solid #D32F2F;
  outline-offset: 2px;
}

.user-avatar-img,
.user-avatar-fallback {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

.user-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
}

.user-avatar-initial {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.5px;
}

.user-popover {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  z-index: 250;
  min-width: 240px;
  padding: 14px;
  background: #FFFFFF;
  border: 1px solid #ECEFF1;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(38, 50, 56, 0.16);
  transform-origin: top right;
}

.user-popover-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 4px 12px;
  border-bottom: 1px solid #ECEFF1;
}

.user-popover-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #FFFFFF;
  font-weight: 700;
  font-size: 15px;
  overflow: hidden;
}

.user-popover-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-popover-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.user-popover-text strong {
  color: #263238;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.2;
}

.user-popover-text span {
  color: #90A4AE;
  font-size: 11px;
  letter-spacing: 0.3px;
}

.user-popover-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 8px;
}

.user-popover-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #455A64;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.user-popover-item:hover {
  background: #FAFBFC;
  color: #263238;
}

.user-popover-item:focus-visible {
  outline: 2px solid #D32F2F;
  outline-offset: 1px;
}

.user-popover-item--danger {
  color: #C62828;
}

.user-popover-item--danger:hover {
  background: #FFEBEE;
  color: #B71C1C;
}

.user-popover-item span[aria-hidden="true"] {
  color: #B0BEC5;
  font-size: 12px;
}

.user-popover-enter-active,
.user-popover-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.user-popover-enter-from,
.user-popover-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

@media (prefers-reduced-motion: reduce) {
  .user-avatar-trigger,
  .user-popover-enter-active,
  .user-popover-leave-active {
    transition: none;
  }
}
</style>
