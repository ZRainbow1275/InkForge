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
  color: var(--text-muted);
  border: 1px dashed var(--hairline);
  border-radius: 18px;
  background: var(--bg-rice-paper);
}

.insight-empty-state strong {
  color: var(--text-secondary);
  font-size: 14px;
}

.insight-empty-state span {
  max-width: 260px;
  font-size: 12px;
  line-height: 1.6;
}
</style>