<script setup lang="ts">
/**
 * InkForge TitleBar — Inkstone Glass chrome for the Tauri main window.
 *
 * Windows / Linux: tauri.conf decorations:false. This component draws a 36px
 *  glassmorphism strip with left-anchored seal + wordmark + active document
 *  title, min/max/close controls on the right, an ember-line ::after at the
 *  bottom edge, and a `@supports`-gated backdrop-filter with a solid Vellum
 *  fallback for engines that cannot composite blur (older WebKitGTK / SW
 *  rasterizer).
 * macOS: titleBarStyle:"Overlay" + hiddenTitle keeps the system traffic light
 *  on the left; this component reserves space and renders the brand mark on
 *  the right side of the inset.
 *
 * Brand reference: docs/inkforge-brand-identity.md §§12-15.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Minus, Square, Copy, X } from 'lucide-vue-next'
import ForgeNibMark from '@/components/chrome/ForgeNibMark.vue'
import { isTauriEnv } from '@/utils/platform'
import {
    close as closeWindow,
    minimize as minimizeWindow,
    toggleMaximize,
    isMaximized,
    subscribeMaximize,
    type WindowMaximizeSubscription,
} from '@/services/window-controls'

interface TitleBarProps {
    documentTitle?: string | null
    tagline?: string
}

const props = withDefaults(defineProps<TitleBarProps>(), {
    documentTitle: null,
    tagline: '成为作者吧',
})

function detectIsMac(): boolean {
    if (typeof navigator === 'undefined') {
        return false
    }
    const platform = navigator.platform ?? ''
    const userAgent = navigator.userAgent ?? ''
    return /mac/i.test(platform) || /mac os x/i.test(userAgent)
}

const isMac = ref<boolean>(detectIsMac())
const maximized = ref<boolean>(false)
let maximizeSubscription: WindowMaximizeSubscription | null = null

// Inkstone Glass: 36px chrome on Win/Linux, macOS keeps 28px inset.
const titlebarHeightPx = computed<number>(() => (isMac.value ? 28 : 36))
const showWindowControls = computed<boolean>(() => !isMac.value && isTauriEnv())

const trimmedDocTitle = computed<string>(() => (props.documentTitle ?? '').trim())
const hasActiveDocument = computed<boolean>(() => trimmedDocTitle.value.length > 0)

// macOS keeps the legacy single-string fallback because the bar is inset and
// the brand strip lives centered above the system traffic light.
const macDisplayTitle = computed<string>(() =>
    hasActiveDocument.value ? trimmedDocTitle.value : props.tagline,
)

async function refreshMaximizedState(): Promise<void> {
    maximized.value = await isMaximized()
}

async function handleMinimize(): Promise<void> {
    await minimizeWindow()
}

async function handleToggleMaximize(): Promise<void> {
    await toggleMaximize()
    await refreshMaximizedState()
}

async function handleClose(): Promise<void> {
    await closeWindow()
}

function applyRootTitlebarHeight(): void {
    document.documentElement.style.setProperty('--ink-titlebar-height', `${titlebarHeightPx.value}px`)
}

onMounted(async () => {
    // Refresh once after Tauri OS API resolves (more reliable than navigator).
    if (isTauriEnv()) {
        try {
            const { platform } = await import('@tauri-apps/api/os')
            const osPlatform = await platform()
            isMac.value = osPlatform === 'darwin'
        } catch {
            // Fall back to navigator detection set above.
        }
    }
    applyRootTitlebarHeight()
    await refreshMaximizedState()
    maximizeSubscription = await subscribeMaximize((next) => {
        maximized.value = next
    })
})

onBeforeUnmount(() => {
    maximizeSubscription?.unsubscribe()
    maximizeSubscription = null
})
</script>

<template>
  <header
    class="ink-titlebar"
    :class="{ 'ink-titlebar--mac': isMac, 'ink-titlebar--maximized': maximized }"
    :data-platform="isMac ? 'mac' : 'pc'"
    :style="{ '--ink-titlebar-h': `${titlebarHeightPx}px` }"
  >
    <!-- macOS reserves ~80px for traffic light (rendered by system Overlay style).
         Marked draggable so user can grab inside this band the same way the
         right side of the bar drags. -->
    <div
      v-if="isMac"
      class="ink-titlebar__mac-traffic-spacer"
      aria-hidden="true"
      data-tauri-drag-region
    />

    <!-- macOS layout: keep the centered seal + display title strip (single
         line). Inkstone Glass left-anchor pattern applies to Win/Linux only. -->
    <div
      v-if="isMac"
      class="ink-titlebar__drag ink-titlebar__drag--mac"
      data-tauri-drag-region
    >
      <span
        class="ink-titlebar__seal"
        aria-hidden="true"
      >
        <ForgeNibMark
          :size="14"
          interactive
        />
      </span>
      <span
        class="ink-titlebar__title"
        :title="macDisplayTitle"
      >{{ macDisplayTitle }}</span>
    </div>

    <!-- Win/Linux: Inkstone Glass left-anchor layout. When no active doc, the
         center stays silent (no tagline fallback rendered). -->
    <div
      v-else
      class="ink-titlebar__drag ink-titlebar__drag--pc"
      data-tauri-drag-region
    >
      <span
        class="ink-titlebar__seal"
        aria-hidden="true"
      >
        <ForgeNibMark
          :size="20"
          interactive
        />
      </span>
      <span class="ink-titlebar__wordmark">InkForge</span>
      <span
        v-if="hasActiveDocument"
        class="ink-titlebar__separator"
        aria-hidden="true"
      >·</span>
      <span
        v-if="hasActiveDocument"
        class="ink-titlebar__title"
        :title="trimmedDocTitle"
      >{{ trimmedDocTitle }}</span>
    </div>

    <div
      v-if="showWindowControls"
      class="ink-titlebar__controls"
    >
      <button
        type="button"
        class="ink-titlebar__btn"
        aria-label="最小化"
        title="最小化"
        data-tauri-drag-region="false"
        @click="handleMinimize"
      >
        <Minus
          :size="14"
          stroke-width="1.6"
        />
      </button>
      <button
        type="button"
        class="ink-titlebar__btn"
        :aria-label="maximized ? '还原' : '最大化'"
        :title="maximized ? '还原' : '最大化'"
        data-tauri-drag-region="false"
        @click="handleToggleMaximize"
      >
        <Copy
          v-if="maximized"
          :size="14"
          stroke-width="1.6"
        />
        <Square
          v-else
          :size="13"
          stroke-width="1.6"
        />
      </button>
      <button
        type="button"
        class="ink-titlebar__btn ink-titlebar__btn--close"
        aria-label="关闭"
        title="关闭"
        data-tauri-drag-region="false"
        @click="handleClose"
      >
        <X
          :size="15"
          stroke-width="1.8"
        />
      </button>
    </div>
  </header>
</template>

<style scoped>
.ink-titlebar {
    --ink-titlebar-fg: var(--ink-text, #252933);
    --ink-titlebar-fg-muted: var(--ink-text-muted, #6E7580);
    --ink-titlebar-border: var(--ink-border, #DED7CA);
    --ink-titlebar-accent: var(--ink-accent, #D95B3F);
    --ink-titlebar-btn-hover-bg: rgba(217, 91, 63, 0.10);
    /* Inkstone Glass: the chrome surface uses the @supports-gated translucent
       palette below. The fallback hex keeps the bar opaque on engines that
       cannot composite backdrop-filter (older WebKitGTK / SW rasterizer). */
    --ink-titlebar-surface-fallback: var(--surface-chrome-fallback-light, #F5F0E6);
    --ink-titlebar-surface: var(--surface-chrome-light, rgba(245, 240, 230, 0.92));

    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--ink-titlebar-h, 36px);
    display: flex;
    align-items: stretch;
    /* @supports block below upgrades to translucent + backdrop-filter. */
    background: var(--ink-titlebar-surface-fallback);
    color: var(--ink-titlebar-fg);
    /* Border removed; ember-line ::after renders the bottom edge. */
    border-bottom: none;
    user-select: none;
    z-index: 1000;
    font-family: var(--font-serif, 'EB Garamond', 'Source Han Serif SC', 'Noto Serif SC', Georgia, serif);
    font-size: 12px;
    line-height: 1;
}

/* Inkstone Glass ember line — 1px wide gradient that fades Kiln in/out across
   the bottom edge. Replaces the prior solid box-shadow hairline. */
.ink-titlebar::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(217, 91, 63, 0.25) 50%,
        transparent 100%
    );
    pointer-events: none;
}

/* Glass enhancement: any engine that supports backdrop-filter (or the
   -webkit- prefix) gets the translucent + blur surface; everyone else keeps
   the solid fallback declared above. Probing with blur(1px) per research. */
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
    .ink-titlebar:not(.ink-titlebar--mac) {
        background: var(--ink-titlebar-surface);
        backdrop-filter: blur(20px) saturate(140%);
        -webkit-backdrop-filter: blur(20px) saturate(140%);
    }
}

/* macOS: keep transparent so titleBarStyle:Overlay system chrome shows through.
   Drag region still spans the full bar; native traffic light renders above. */
.ink-titlebar--mac {
    background: transparent;
    border-bottom: none;
}

.ink-titlebar--mac::after {
    /* No ember line under the system Overlay — would clash with traffic light. */
    display: none;
}

.ink-titlebar__mac-traffic-spacer {
    flex: 0 0 80px;
}

.ink-titlebar__drag {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    min-width: 0;
}

.ink-titlebar__drag--mac {
    justify-content: center;
}

.ink-titlebar__drag--pc {
    justify-content: flex-start;
    gap: 10px;
    padding: 0 14px;
}

.ink-titlebar__seal {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    /* Children of [data-tauri-drag-region] must not capture mousedown,
       otherwise Tauri 1.x stops treating the parent as a drag surface. */
    pointer-events: none;
}

/* mac legacy 14px seal */
.ink-titlebar__drag--mac .ink-titlebar__seal {
    flex-basis: 14px;
    width: 14px;
    height: 14px;
}

.ink-titlebar__drag--mac .ink-titlebar__seal svg {
    width: 14px;
    height: 14px;
    display: block;
}

/* Inkstone Glass 20px seal */
.ink-titlebar__drag--pc .ink-titlebar__seal {
    flex-basis: 20px;
    width: 20px;
    height: 20px;
}

.ink-titlebar__drag--pc .ink-titlebar__seal svg {
    width: 20px;
    height: 20px;
    display: block;
}

.ink-titlebar__wordmark {
    font-family: var(--font-serif, 'EB Garamond', 'Source Han Serif SC', 'Noto Serif SC', Georgia, serif);
    font-style: italic;
    font-size: 12px;
    font-weight: var(--type-weight-normal, 400);
    letter-spacing: 0.04em;
    color: var(--ink-titlebar-fg);
    opacity: 0.72;
    /* Drag-region rule: brand strip text must keep parent surface draggable. */
    pointer-events: none;
}

.ink-titlebar__separator {
    color: var(--ink-titlebar-accent);
    opacity: 0.5;
    font-style: normal;
    pointer-events: none;
}

.ink-titlebar__title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--ink-titlebar-fg);
    font-family: var(--font-serif, 'EB Garamond', 'Source Han Serif SC', 'Noto Serif SC', Georgia, serif);
    font-style: italic;
    /* macOS keeps the legacy 12px size to fit the 28px inset bar. */
    font-size: 12px;
    font-weight: var(--type-weight-normal, 400);
    letter-spacing: 0.06em;
    opacity: 0.72;
    max-width: 60vw;
    pointer-events: none;
}

/* Inkstone Glass doc title — slightly larger to anchor the brand strip. */
.ink-titlebar__drag--pc .ink-titlebar__title {
    font-size: 14px;
    letter-spacing: 0.04em;
}

.ink-titlebar__controls {
    flex: 0 0 auto;
    display: flex;
    align-items: stretch;
}

.ink-titlebar__btn {
    /* Restrained Premium controls: 50px wide, motion tokens for hover. */
    width: 50px;
    height: var(--ink-titlebar-h, 36px);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--ink-titlebar-fg);
    border: none;
    margin: 0;
    padding: 0;
    cursor: pointer;
    transition: background-color var(--motion-fast, 120ms) var(--ease-out-quart, ease-out),
                color var(--motion-fast, 120ms) var(--ease-out-quart, ease-out);
    /* Tauri 1.x honors `data-tauri-drag-region="false"` per-button (set in
       template). The Electron-only `-webkit-app-region: no-drag` is dead
       code on Tauri WebView2/WKWebView and is intentionally not declared. */
}

.ink-titlebar__btn:hover {
    background: var(--ink-titlebar-btn-hover-bg);
}

/* Inset focus ring — controls sit at the window edge, so an outer ring would
   spill past the chrome. Inset keeps the Kiln double-ring visible. */
.ink-titlebar__btn:focus-visible {
    outline: none;
    box-shadow: inset var(--focus-ring, 0 0 0 2px #D95B3F);
}

.ink-titlebar__btn--close:hover {
    background: var(--ink-titlebar-accent);
    color: #FFFFFF;
}

.ink-titlebar__btn--close:focus-visible {
    background: var(--ink-titlebar-accent);
    color: #FFFFFF;
    outline: none;
    box-shadow: inset var(--focus-ring, 0 0 0 2px #D95B3F);
}

/* Dark mode contract: chrome flips when :root[data-theme="dark"] is set
   by the Settings store; also follow OS preference as a fallback. */
:global(:root[data-theme='dark']) .ink-titlebar {
    --ink-titlebar-fg: #E8E4DC;
    --ink-titlebar-fg-muted: #9B958D;
    --ink-titlebar-border: #3A3D44;
    --ink-titlebar-accent: #E8734F;
    --ink-titlebar-btn-hover-bg: rgba(232, 115, 79, 0.16);
    --ink-titlebar-surface-fallback: var(--surface-chrome-fallback-dark, #1A1D24);
    --ink-titlebar-surface: var(--surface-chrome-dark, rgba(26, 29, 36, 0.84));
}

:global(:root[data-theme='dark']) .ink-titlebar::after {
    background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(232, 115, 79, 0.25) 50%,
        transparent 100%
    );
}

@media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme])) .ink-titlebar,
    :global(:root[data-theme='system']) .ink-titlebar {
        --ink-titlebar-fg: #E8E4DC;
        --ink-titlebar-fg-muted: #9B958D;
        --ink-titlebar-border: #3A3D44;
        --ink-titlebar-accent: #E8734F;
        --ink-titlebar-btn-hover-bg: rgba(232, 115, 79, 0.16);
        --ink-titlebar-surface-fallback: var(--surface-chrome-fallback-dark, #1A1D24);
        --ink-titlebar-surface: var(--surface-chrome-dark, rgba(26, 29, 36, 0.84));
    }

    :global(:root:not([data-theme])) .ink-titlebar::after,
    :global(:root[data-theme='system']) .ink-titlebar::after {
        background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(232, 115, 79, 0.25) 50%,
            transparent 100%
        );
    }
}
</style>
