<script setup lang="ts">
/**
 * InkForge brand mark — Forge Nib geometry, pure path/shape, 0 font dependency.
 * Mirrors public/favicon.svg + master.svg seal body. Use anywhere a brand
 * icon is needed; the wrapper sizes via the `size` prop.
 *
 * Reference: docs/inkforge-brand-identity.md §9.
 */
interface ForgeNibMarkProps {
    size?: number | string
    /** Hide from a11y tree when used purely decoratively next to a text label. */
    decorative?: boolean
}

withDefaults(defineProps<ForgeNibMarkProps>(), {
    size: 32,
    decorative: true,
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    :aria-hidden="decorative ? 'true' : undefined"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : 'InkForge 墨铸'"
    class="forge-nib-mark"
  >
    <rect
      x="2"
      y="2"
      width="28"
      height="28"
      rx="5"
      ry="5"
      fill="#D95B3F"
    />
    <polygon
      points="16,7 25,16 16,25 7,16"
      fill="#252933"
    />
    <rect
      x="15.5"
      y="9.5"
      width="1"
      height="13"
      rx="0.5"
      ry="0.5"
      fill="#F5F0E6"
    />
    <rect
      x="9"
      y="26.5"
      width="14"
      height="1.2"
      rx="0.6"
      ry="0.6"
      fill="#C19A56"
    />
  </svg>
</template>

<style scoped>
.forge-nib-mark {
    display: block;
}
</style>
