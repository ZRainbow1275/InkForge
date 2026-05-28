<script setup lang="ts">
/**
 * Restrained Premium router cross-fade.
 *
 * Wraps <RouterView> with a 240ms opacity transition driven by the shared
 * motion tokens. `prefers-reduced-motion: reduce` cascades --motion-slow to
 * 0ms in tokens.css, so this transition collapses to instant automatically
 * without per-rule overrides.
 *
 * Reference: docs/inkforge-brand-identity.md §13.
 */
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <Transition
      name="view-fade"
      mode="out-in"
    >
      <component
        :is="Component"
        :key="route.fullPath"
        class="app-route-shell"
      />
    </Transition>
  </RouterView>
</template>

<style scoped>
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity var(--motion-slow) var(--ease-out-quart);
}

.view-fade-enter-from,
.view-fade-leave-to {
  opacity: 0;
}
</style>
