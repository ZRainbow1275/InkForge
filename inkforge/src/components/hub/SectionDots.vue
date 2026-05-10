<script setup lang="ts">
const props = defineProps<{
  sections: { id: string; label: string }[]
  activeIndex: number
}>()

const emit = defineEmits<{
  (e: 'navigate', index: number): void
}>()
</script>

<template>
  <nav
    class="section-dots"
    aria-label="Hub 版面导航"
  >
    <button
      v-for="(section, index) in props.sections"
      :key="section.id"
      type="button"
      class="section-dot"
      :class="{ 'section-dot--active': props.activeIndex === index }"
      :aria-label="section.label"
      :aria-current="props.activeIndex === index ? 'true' : 'false'"
      @click="emit('navigate', index)"
    >
      <span class="section-dot-bullet" />
      <span class="section-dot-label">{{ section.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.section-dots {
  position: fixed;
  top: 50%;
  right: 18px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transform: translateY(-50%);
}

.section-dot {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #90A4AE;
  transition: color 0.2s ease;
}

.section-dot-bullet {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #CFD8DC;
  /* 预占与 active 同形的 4px halo spread — 仅 alpha 在两端不同。
     这样切换时浏览器只插值 alpha，避免 spread 0→4 引发的"halo 弹出"感
     与旧的 `none ↔ 4px shadow` 退化路径导致的红点残留闪烁。 */
  box-shadow: 0 0 0 4px rgba(211, 47, 47, 0);
  will-change: transform, background-color, box-shadow;
  transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1),
              background-color 220ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

.section-dot-label {
  position: absolute;
  right: calc(100% + 4px);
  top: 50%;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.3px;
  color: #D32F2F;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(211, 47, 47, 0.16);
  border-radius: 6px;
  padding: 3px 8px;
  pointer-events: none;
  opacity: 0;
  transform: translate(4px, -50%);
  transition: opacity 0.18s ease, transform 0.18s ease;
  box-shadow: 0 4px 12px rgba(38, 50, 56, 0.10);
}

.section-dot {
  position: relative;
}

.section-dot:hover {
  color: #455A64;
}

.section-dot:hover .section-dot-bullet {
  background-color: #90A4AE;
}

.section-dot:hover .section-dot-label {
  opacity: 1;
  transform: translate(0, -50%);
}

.section-dot--active {
  color: #D32F2F;
}

.section-dot--active .section-dot-bullet {
  background-color: #D32F2F;
  transform: scale(1.25);
  box-shadow: 0 0 0 4px rgba(211, 47, 47, 0.16);
}

.section-dot--active:hover .section-dot-label {
  border-color: rgba(211, 47, 47, 0.32);
}

.section-dot:focus-visible {
  outline: 2px solid #D32F2F;
  outline-offset: 2px;
  border-radius: 6px;
}

@media (max-width: 1100px) {
  .section-dot-label {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .section-dot-bullet,
  .section-dot-label {
    transition: none;
  }
}

html.theme-dark .section-dot-bullet,
html[data-theme="dark"] .section-dot-bullet {
  background-color: rgba(255, 255, 255, 0.18);
  /* 同步 light mode 策略：预占 4px halo，过渡仅插值 alpha */
  box-shadow: 0 0 0 4px rgba(239, 83, 80, 0);
}
html.theme-dark .section-dot:hover .section-dot-bullet,
html[data-theme="dark"] .section-dot:hover .section-dot-bullet {
  background-color: rgba(255, 255, 255, 0.42);
}
html.theme-dark .section-dot--active .section-dot-bullet,
html[data-theme="dark"] .section-dot--active .section-dot-bullet {
  background-color: #EF5350;
  box-shadow: 0 0 0 4px rgba(239, 83, 80, 0.20);
}

html.theme-dark .section-dot-label,
html[data-theme="dark"] .section-dot-label {
  background: rgba(26, 34, 45, 0.96);
  border-color: rgba(239, 83, 80, 0.32);
  color: #EF9A9A;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.40);
}
html.theme-dark .section-dot--active:hover .section-dot-label,
html[data-theme="dark"] .section-dot--active:hover .section-dot-label {
  border-color: rgba(239, 83, 80, 0.55);
}
</style>
