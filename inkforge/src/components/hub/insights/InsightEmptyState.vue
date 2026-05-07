<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  description: string
}>()
</script>

<template>
  <div class="insight-empty-state">
    <component
      :is="icon"
      :size="24"
      :stroke-width="2.1"
    />
    <strong>{{ title }}</strong>
    <span>{{ description }}</span>
  </div>
</template>

<style scoped>
.insight-empty-state {
  min-height: 148px;
  display: grid;
  place-items: center;
  gap: 8px;
  text-align: center;
  color: #78909C;
  border: 1px dashed rgba(120, 144, 156, 0.32);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(250, 250, 250, 0.92), rgba(245, 247, 248, 0.72));
}

.insight-empty-state strong {
  color: #455A64;
  font-size: 14px;
}

.insight-empty-state span {
  max-width: 260px;
  font-size: 12px;
  line-height: 1.6;
}

html.theme-dark .insight-empty-state,
html[data-theme="dark"] .insight-empty-state {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
  border-color: rgba(255, 255, 255, 0.10);
  color: #8590A0;
}
html.theme-dark .insight-empty-state strong,
html[data-theme="dark"] .insight-empty-state strong {
  color: #ECEFF4;
}
</style>