<script setup lang="ts">
interface SectionNavProps {
  sectionCount: number
  activeIndex: number
}

const props = defineProps<SectionNavProps>()

const emit = defineEmits<{
  (e: 'navigate', index: number): void
}>()
</script>

<template>
  <nav
    v-if="props.sectionCount > 1"
    class="section-nav"
    aria-label="Hub 分区导航"
  >
    <button
      v-for="index in props.sectionCount"
      :key="index"
      type="button"
      class="section-nav__dot"
      :class="{ 'section-nav__dot--active': props.activeIndex === index - 1 }"
      :aria-label="`跳转到第 ${index} 个分区`"
      :aria-current="props.activeIndex === index - 1 ? 'true' : undefined"
      @click="emit('navigate', index - 1)"
    />
  </nav>
</template>

<style scoped>
.section-nav {
  position: fixed;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-nav__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #b0bec5;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 0;
}

.section-nav__dot:hover {
  background: #607d8b;
  transform: scale(1.3);
}

.section-nav__dot--active {
  background: #d32f2f;
  transform: scale(1.4);
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.2);
}

@media (max-width: 767px) {
  .section-nav {
    display: none;
  }
}
</style>
