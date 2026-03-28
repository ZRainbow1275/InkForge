<script setup lang="ts">
import { ArrowDown, ArrowUp, Replace, Search, X } from 'lucide-vue-next'

withDefaults(defineProps<{
  visible: boolean
  mode?: 'find' | 'replace'
  query: string
  replacement: string
  matchLabel?: string
}>(), {
  mode: 'find',
  matchLabel: '未开始查找',
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:query', value: string): void
  (e: 'update:replacement', value: string): void
  (e: 'next'): void
  (e: 'previous'): void
  (e: 'replace'): void
  (e: 'replace-all'): void
}>()
</script>

<template>
  <Transition name="find-replace-fade">
    <section
      v-if="visible"
      class="find-replace"
      @mousedown.stop
    >
      <div class="find-replace__row">
        <label class="find-replace__field">
          <Search :size="14" />
          <input
            :value="query"
            type="text"
            placeholder="查找"
            @input="emit('update:query', ($event.target as HTMLInputElement).value)"
          >
        </label>
        <span class="find-replace__meta">{{ matchLabel }}</span>
        <button
          class="icon-btn"
          type="button"
          title="上一个匹配"
          @click="emit('previous')"
        >
          <ArrowUp :size="14" />
        </button>
        <button
          class="icon-btn"
          type="button"
          title="下一个匹配"
          @click="emit('next')"
        >
          <ArrowDown :size="14" />
        </button>
        <button
          class="icon-btn"
          type="button"
          title="关闭查找"
          @click="emit('close')"
        >
          <X :size="14" />
        </button>
      </div>

      <div
        v-if="mode === 'replace'"
        class="find-replace__row"
      >
        <label class="find-replace__field">
          <Replace :size="14" />
          <input
            :value="replacement"
            type="text"
            placeholder="替换为"
            @input="emit('update:replacement', ($event.target as HTMLInputElement).value)"
          >
        </label>
        <button
          class="secondary-btn"
          type="button"
          @click="emit('replace')"
        >
          替换当前
        </button>
        <button
          class="secondary-btn"
          type="button"
          @click="emit('replace-all')"
        >
          全部替换
        </button>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.find-replace {
  position: absolute;
  top: 18px;
  right: 24px;
  z-index: 24;
  width: min(460px, calc(100% - 48px));
  padding: 12px;
  border: 1px solid rgba(38, 50, 56, 0.08);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
  box-shadow: 0 12px 32px rgba(38, 50, 56, 0.12);
}

.find-replace__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.find-replace__row + .find-replace__row {
  margin-top: 10px;
}

.find-replace__field {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.88);
  border: 1px solid rgba(38, 50, 56, 0.08);
  color: #37474f;
}

.find-replace__field input {
  width: 100%;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font-size: 13px;
}

.find-replace__meta {
  flex-shrink: 0;
  font-size: 12px;
  color: #607d8b;
}

.icon-btn,
.secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(38, 50, 56, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  color: #37474f;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.icon-btn {
  width: 34px;
  height: 34px;
}

.secondary-btn {
  height: 36px;
  padding: 0 12px;
  font-size: 12px;
}

.icon-btn:hover,
.secondary-btn:hover {
  border-color: rgba(211, 47, 47, 0.28);
  background: rgba(255, 250, 250, 0.96);
}

.find-replace-fade-enter-active,
.find-replace-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.find-replace-fade-enter-from,
.find-replace-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

[data-theme='dark'] .find-replace {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(30, 41, 59, 0.94);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.36);
}

[data-theme='dark'] .find-replace__field,
[data-theme='dark'] .icon-btn,
[data-theme='dark'] .secondary-btn {
  border-color: rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.56);
  color: #e2e8f0;
}

[data-theme='dark'] .find-replace__meta {
  color: #94a3b8;
}

[data-theme='dark'] .find-replace__field input {
  color: #f8fafc;
}

[data-theme='dark'] .icon-btn:hover,
[data-theme='dark'] .secondary-btn:hover {
  border-color: rgba(239, 83, 80, 0.28);
  background: rgba(239, 83, 80, 0.14);
}
</style>
