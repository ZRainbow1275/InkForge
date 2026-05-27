<script setup lang="ts">
/**
 * InkForge TitleBar — custom chrome for Tauri main window.
 *
 * Windows / Linux: tauri.conf decorations:false, this component draws the seal
 *  logo + document name + min/max/close controls and the drag region.
 * macOS: titleBarStyle:"Overlay" + hiddenTitle keeps the system traffic light
 *  on the left; this component reserves space and renders the brand mark on
 *  the right side of the inset.
 *
 * Brand reference: docs/inkforge-brand-identity.md §12.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Minus, Square, Copy, X } from 'lucide-vue-next'
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

const titlebarHeightPx = computed<number>(() => (isMac.value ? 28 : 32))
const showWindowControls = computed<boolean>(() => !isMac.value && isTauriEnv())

const displayTitle = computed<string>(() => {
    const docTitle = props.documentTitle?.trim()
    if (docTitle && docTitle.length > 0) {
        return docTitle
    }
    return props.tagline
})

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
    <!-- macOS reserves ~80px for traffic light (rendered by system Overlay style). -->
    <div
      v-if="isMac"
      class="ink-titlebar__mac-traffic-spacer"
      aria-hidden="true"
    />

    <div
      class="ink-titlebar__drag"
      data-tauri-drag-region
    >
      <span
        class="ink-titlebar__seal"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1024 1024"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
        >
          <rect
            x="226"
            y="226"
            width="572"
            height="572"
            rx="72"
            ry="72"
            fill="#D95B3F"
          />
          <text
            x="512"
            y="612"
            text-anchor="middle"
            font-family="'Source Han Serif SC','Noto Serif SC','Songti SC','STSong','SimSun',serif"
            font-weight="700"
            font-size="380"
            fill="#252933"
          >铸</text>
        </svg>
      </span>
      <span
        class="ink-titlebar__title"
        :title="displayTitle"
      >{{ displayTitle }}</span>
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
    --ink-titlebar-bg: var(--ink-bg, #F5F0E6);
    --ink-titlebar-fg: var(--ink-text, #252933);
    --ink-titlebar-fg-muted: var(--ink-text-muted, #6E7580);
    --ink-titlebar-border: var(--ink-border, #DED7CA);
    --ink-titlebar-accent: var(--ink-accent, #D95B3F);
    --ink-titlebar-btn-hover-bg: rgba(217, 91, 63, 0.10);

    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--ink-titlebar-h, 32px);
    display: flex;
    align-items: stretch;
    background: var(--ink-titlebar-bg);
    color: var(--ink-titlebar-fg);
    border-bottom: 1px solid var(--ink-titlebar-border);
    user-select: none;
    z-index: 1000;
    font-family: 'Source Han Serif SC', 'Noto Serif SC', 'EB Garamond', Georgia, serif;
    font-size: 12px;
    line-height: 1;
}

/* macOS: keep transparent so titleBarStyle:Overlay system chrome shows through.
   Drag region still spans the full bar; native traffic light renders above. */
.ink-titlebar--mac {
    background: transparent;
    border-bottom: none;
}

.ink-titlebar__mac-traffic-spacer {
    flex: 0 0 80px;
}

.ink-titlebar__drag {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 12px;
    min-width: 0;
}

.ink-titlebar__seal {
    flex: 0 0 16px;
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.ink-titlebar__seal svg {
    width: 16px;
    height: 16px;
    display: block;
}

.ink-titlebar__title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--ink-titlebar-fg);
    font-weight: 600;
    letter-spacing: 0.04em;
    max-width: 60vw;
}

.ink-titlebar__controls {
    flex: 0 0 auto;
    display: flex;
    align-items: stretch;
}

.ink-titlebar__btn {
    width: 46px;
    height: var(--ink-titlebar-h, 32px);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--ink-titlebar-fg);
    border: none;
    margin: 0;
    padding: 0;
    cursor: pointer;
    transition: background-color 0.12s ease, color 0.12s ease;
    -webkit-app-region: no-drag;
}

.ink-titlebar__btn:hover,
.ink-titlebar__btn:focus-visible {
    background: var(--ink-titlebar-btn-hover-bg);
    outline: none;
}

.ink-titlebar__btn--close:hover,
.ink-titlebar__btn--close:focus-visible {
    background: var(--ink-titlebar-accent);
    color: #FFFFFF;
}

/* Dark mode contract: chrome flips when :root[data-theme="dark"] is set
   by the Settings store; also follow OS preference as a fallback. */
:global(:root[data-theme='dark']) .ink-titlebar {
    --ink-titlebar-bg: #1A1D24;
    --ink-titlebar-fg: #E8E4DC;
    --ink-titlebar-fg-muted: #9B958D;
    --ink-titlebar-border: #3A3D44;
    --ink-titlebar-accent: #E8734F;
    --ink-titlebar-btn-hover-bg: rgba(232, 115, 79, 0.16);
}

@media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme])) .ink-titlebar,
    :global(:root[data-theme='system']) .ink-titlebar {
        --ink-titlebar-bg: #1A1D24;
        --ink-titlebar-fg: #E8E4DC;
        --ink-titlebar-fg-muted: #9B958D;
        --ink-titlebar-border: #3A3D44;
        --ink-titlebar-accent: #E8734F;
        --ink-titlebar-btn-hover-bg: rgba(232, 115, 79, 0.16);
    }
}
</style>
