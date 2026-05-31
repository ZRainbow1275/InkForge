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
          :tier="32"
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
          :tier="32"
          interactive
        />
      </span>
      <span class="ink-titlebar__wordmark">InkForge</span>
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
        @click="handleMinimize"
      >
        <svg
          class="ink-titlebar__icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        type="button"
        class="ink-titlebar__btn"
        :aria-label="maximized ? '还原' : '最大化'"
        :title="maximized ? '还原' : '最大化'"
        @click="handleToggleMaximize"
      >
        <svg
          v-if="maximized"
          class="ink-titlebar__icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="8" y="8" width="12" height="12" rx="1.5" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
        <svg
          v-else
          class="ink-titlebar__icon"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      </button>
      <button
        type="button"
        class="ink-titlebar__btn ink-titlebar__btn--close"
        aria-label="关闭"
        title="关闭"
        @click="handleClose"
      >
        <svg
          class="ink-titlebar__icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.ink-titlebar {
    --ink-titlebar-fg: var(--ink-text, #252933);
    --ink-titlebar-fg-muted: var(--ink-text-muted, #6E7580);
    --ink-titlebar-border: var(--ink-border, #DED7CA);
    /* Accent routed to the dark-aware --ember token (retires legacy #D95B3F /
       #E8734F literals); hover wash uses --ember-soft so light/dark stay synced. */
    --ink-titlebar-accent: var(--ember);
    --ink-titlebar-btn-hover-bg: var(--ember-soft);
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
    /* color-mix keeps the gradient a faded --ember in BOTH themes, so the
       hand-written dark override below is no longer needed. */
    background: linear-gradient(
        90deg,
        transparent 0%,
        color-mix(in srgb, var(--ember) 25%, transparent) 50%,
        transparent 100%
    );
    pointer-events: none;
}

/* Glass enhancement: any engine that supports backdrop-filter (or the
   -webkit- prefix) gets the translucent + blur surface; everyone else keeps
   the solid fallback declared above. Probing with blur(1px) per research. */
/* NOTE: Inkstone Glass `backdrop-filter: blur(20px) saturate(140%)` removed
   on Win/Linux chrome bar. WebView2's compositor culls flex-end children of
   a backdrop-filter ancestor — the chrome controls (min / max / close) paint
   transparent over the cream surface, hiding the buttons users need to
   minimize the window. Why: the user-visible bug ("can't minimize") trumps
   the visual treatment. The opaque cream/Vellum fallback already declared
   above keeps the bar's Inkstone palette intact. How to apply: macOS keeps
   its own native traffic-light chrome via `titleBarStyle: Overlay`, so the
   blur there is provided by the system and we don't need CSS backdrop-filter
   to begin with. Win/Linux now use the solid `--ink-titlebar-surface-fallback`
   color throughout. */

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

/* Win/Linux chrome controls cluster. Why: WebView2's compositor was culling
   these flex-end children when the parent .ink-titlebar carried
   backdrop-filter; lifting them to their own stacking context via
   `isolation: isolate` + `transform: translateZ(0)` forces a dedicated
   composited layer that the GPU paints reliably. `position: relative` keeps
   the cluster inside the flex flow at the bar's right edge while still being
   a positioned ancestor for the buttons. How to apply: any future
   backdrop-filter restoration on the bar must keep this isolation in place. */
.ink-titlebar__controls {
    flex: 0 0 auto;
    display: flex;
    align-items: stretch;
    position: relative;
    z-index: 1;
    isolation: isolate;
    transform: translateZ(0);
    will-change: transform;
}

.ink-titlebar__btn {
    /* Restrained Premium controls: 50px wide, motion tokens for hover.
       Each button forces its own composited layer so WebView2 paints the
       inline <svg> glyph instead of culling it. `isolation: isolate` +
       `transform: translateZ(0)` + `will-change: transform` is the canonical
       Chromium/WebView2 workaround for the flex-child-not-painting bug
       under backdrop-filter ancestors. */
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
    position: relative;
    z-index: 1;
    isolation: isolate;
    transform: translateZ(0);
    will-change: transform;
    transition: background-color var(--motion-fast, 120ms) var(--ease-out-quart, ease-out),
                color var(--motion-fast, 120ms) var(--ease-out-quart, ease-out);
    /* Tauri 1.x core.js checks `e.target.hasAttribute('data-tauri-drag-region')`
       — the attribute's PRESENCE triggers drag regardless of its value, so
       writing `data-tauri-drag-region="false"` on buttons would still trap
       mousedown and prevent the @click handler from firing. Buttons must NOT
       carry the attribute at all. Only the parent `.ink-titlebar__drag` div
       has it (and its child text spans use pointer-events:none so mousedown
       on text still bubbles up to the drag region). */
}

/* Inline SVG glyphs inside controls must not capture mousedown — `e.target`
   must be the button itself so the @click handler runs (and so the parent
   button's lack of data-tauri-drag-region attribute means no spurious drag
   fires). Why inline SVG instead of lucide-vue-next: WebView2's compositor
   was culling lucide-rendered icons even when DOM said they had correct
   bbox + stroke. Inline `<svg>` with explicit `stroke="currentColor"` and
   stroke-linecap markup gives the GPU a concrete paint path to rasterize. */
.ink-titlebar__btn svg,
.ink-titlebar__icon {
    pointer-events: none;
    display: block;
    flex-shrink: 0;
}

.ink-titlebar__btn:hover {
    background: var(--ink-titlebar-btn-hover-bg);
}

/* Inset focus ring — controls sit at the window edge, so an outer ring would
   spill past the chrome. Inset keeps the Kiln double-ring visible. */
.ink-titlebar__btn:focus-visible {
    outline: none;
    box-shadow: inset var(--focus-ring);
}

.ink-titlebar__btn--close:hover {
    background: var(--ember);
    color: var(--paper-warm);
}

.ink-titlebar__btn--close:focus-visible {
    background: var(--ember);
    color: var(--paper-warm);
    outline: none;
    box-shadow: inset var(--focus-ring);
}

/* Dark mode contract: chrome flips when :root[data-theme="dark"] is set
   by the Settings store; also follow OS preference as a fallback. */
/* Dark chrome contract: only the neutral spine (fg / border / surface) needs a
   dark override now — the accent + hover wash route through --ember/--ember-soft
   and the ::after gradient through color-mix(--ember), so all three are already
   dark-aware and their previous hand-written overrides were deleted to keep
   light/dark synced. */
:global(:root[data-theme='dark']) .ink-titlebar {
    --ink-titlebar-fg: #E8E4DC;
    --ink-titlebar-fg-muted: #9B958D;
    --ink-titlebar-border: #3A3D44;
    --ink-titlebar-surface-fallback: var(--surface-chrome-fallback-dark, #1A1D24);
    --ink-titlebar-surface: var(--surface-chrome-dark, rgba(26, 29, 36, 0.84));
}

@media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme])) .ink-titlebar,
    :global(:root[data-theme='system']) .ink-titlebar {
        --ink-titlebar-fg: #E8E4DC;
        --ink-titlebar-fg-muted: #9B958D;
        --ink-titlebar-border: #3A3D44;
        --ink-titlebar-surface-fallback: var(--surface-chrome-fallback-dark, #1A1D24);
        --ink-titlebar-surface: var(--surface-chrome-dark, rgba(26, 29, 36, 0.84));
    }
}
</style>
