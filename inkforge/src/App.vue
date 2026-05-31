<script setup lang="ts">
/**
 * InkForge App Root
 * 使用 Vue Router 支持工作区和编辑器两种模式
 * 包含全局错误边界，捕获未处理的组件异常
 * + 全局 CSS Variables 从 Settings Store 同步
 */
import { ref, computed, watch, nextTick, onMounted, onUnmounted, onErrorCaptured, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logger, ErrorCode, AppError } from './services/error'
import { useSettingsStore } from './stores/settings'
import WelcomeModal from '@/components/help/WelcomeModal.vue'
import HelpCenter from '@/components/help/HelpCenter.vue'
import CommandPalette from '@/components/command-palette/CommandPalette.vue'
import UpdateToast from '@/components/settings/UpdateToast.vue'
import UpdateDetailsModal from '@/components/settings/UpdateDetailsModal.vue'
import { buildVisualSystemTokens, syncVisualSystemRoot } from '@/services/visual-system'
import { useFTUEStore } from '@/stores/ftue'
import { useArticleStore } from '@/stores/article'
import { useCommandPaletteStore } from '@/stores/command-palette'
import { useDevPanelStore } from '@/stores/devPanel'
import { useUpdaterStore } from '@/stores/updater'
import { createBuiltinCommands } from '@/services/command/builtin'
import { CommandContextTag } from '@/types/command-palette'
import { DevPanelKeyChordActivator, isDevPanelKeyboardShortcut, shouldIgnoreDevPanelShortcut } from '@/services/dev-tools'
import {
  appendCustomCssErrorLog,
  applyCustomCssRuntime,
  shouldSuspendForCustomCssErrors,
} from '@/services/custom-css'
import { notifyAppReady } from '@/services/app-lifecycle/notifyAppReady'
import TitleBar from '@/components/chrome/TitleBar.vue'
import ViewTransition from '@/components/chrome/ViewTransition.vue'
import './styles/tokens.css'

/**
 * Settings → 全局 CSS Variables 同步
 */
const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const ftueStore = useFTUEStore()
const articleStore = useArticleStore()
const commandPaletteStore = useCommandPaletteStore()
const devPanelStore = useDevPanelStore()
const updaterStore = useUpdaterStore()
const devPanelActivator = new DevPanelKeyChordActivator()
let lastCustomCssRuntimeRejectionKey: string | null = null
const DevPanel = defineAsyncComponent(() => import('@/views/dev/DevPanel.vue'))
const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')

/** 将 settings 中的外观配置同步到 :root CSS 变量 */
function syncCSSVariables(): void {
  const root = document.documentElement
  const visualSystem = buildVisualSystemTokens(
    settingsStore.settings.appearance,
    colorSchemeQuery.matches,
  )

  syncVisualSystemRoot(root, visualSystem)
  applyTheme(visualSystem.resolvedTheme)

  root.setAttribute('data-theme-chrome', visualSystem.resolvedTheme)
  root.setAttribute('data-theme-paper', visualSystem.resolvedTheme)
  root.setAttribute('data-typography-preset', visualSystem.diagnostics.typographyPresetId)
  root.setAttribute('data-typography-heading-style', settingsStore.settings.appearance.typography.headingStyle)
  root.setAttribute('data-typography-blockquote-style', settingsStore.settings.appearance.typography.blockquoteStyle)

  // 减少动画：同时写入 class 与 data attribute，供全局 CSS 和测试稳定识别。
  root.classList.toggle('reduce-motion', settingsStore.settings.appearance.reducedMotion)
  root.setAttribute('data-reduced-motion', settingsStore.settings.appearance.reducedMotion ? 'true' : 'false')
}

/** 应用主题 class + data-theme，保持 CSS 变量与自动化检查一致 */
function applyTheme(theme: 'light' | 'dark'): void {
  const root = document.documentElement
  root.classList.remove('theme-light', 'theme-dark')
  root.classList.add(`theme-${theme}`)
  root.setAttribute('data-theme', theme)
}

function handleColorSchemeChange(): void {
  if (settingsStore.settings.appearance.theme === 'system') {
    syncCSSVariables()
  }
}

function syncCustomCssRuntime(): void {
  const customCss = settingsStore.settings.advanced.customCss
  const result = applyCustomCssRuntime(customCss)

  if (result.status === 'suspended' && customCss.enabled) {
    customCss.enabled = false
    customCss.suspendedReason = 'safe-mode'
    customCss.errorLog = appendCustomCssErrorLog(customCss.errorLog, {
      type: 'safe-mode',
      message: result.message,
    })
    settingsStore.save()
    logger.warn(result.message)
    return
  }

  if (result.status !== 'rejected') {
    lastCustomCssRuntimeRejectionKey = null
    return
  }

  const rejectionKey = `${customCss.published}::${result.message}`
  if (lastCustomCssRuntimeRejectionKey === rejectionKey) {
    return
  }
  lastCustomCssRuntimeRejectionKey = rejectionKey

  customCss.errorLog = appendCustomCssErrorLog(customCss.errorLog, {
    type: 'runtime',
    message: result.message,
    snippet: result.sandboxResult?.sourceCss.slice(0, 500),
  })

  if (shouldSuspendForCustomCssErrors(customCss.errorLog)) {
    customCss.enabled = false
    customCss.suspendedReason = 'sandbox-error-limit'
    applyCustomCssRuntime(customCss)
  }

  settingsStore.save()
  logger.warn('CustomCSS runtime rejected persisted CSS', {
    reason: result.message,
  })
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const nativeEditable = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  const ariaEditable = target.getAttribute('role') === 'textbox' || Boolean(target.closest('[role="textbox"]'))
  const contentEditable = target.isContentEditable || Boolean(target.closest('[contenteditable="true"]'))

  return nativeEditable || ariaEditable || contentEditable
}

function handleGlobalHelpShortcut(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === '/' && !isEditableTarget(event.target)) {
    event.preventDefault()
    ftueStore.openHelpCenter('markdown')
  }
}

function syncCommandPaletteContext(): void {
  commandPaletteStore.setAppContext({
    routePath: route.fullPath,
    routeName: typeof route.name === 'string' ? route.name : null,
    activeDocumentId: articleStore.selectedArticleId,
  })
}

function handleGlobalDevPanelShortcut(event: KeyboardEvent): void {
  if (!isDevPanelKeyboardShortcut(event) || shouldIgnoreDevPanelShortcut(event)) {
    return
  }

  if (devPanelStore.developerModeEnabled) {
    event.preventDefault()
    devPanelStore.togglePanel('keyboard')
    return
  }

  if (devPanelActivator.record(event)) {
    event.preventDefault()
    devPanelStore.enableSessionDeveloperMode('triple-shortcut')
    devPanelStore.openPanel('triple-shortcut')
  }
}
function handleGlobalCommandShortcut(event: KeyboardEvent): void {
  if (event.isComposing || event.key.toLowerCase() !== 'k' || (!event.ctrlKey && !event.metaKey)) {
    return
  }

  if (isEditableTarget(event.target)) {
    return
  }

  if (event.shiftKey) {
    event.preventDefault()
    commandPaletteStore.open({
      contextFilter: [CommandContextTag.Document, CommandContextTag.Editor],
      triggerSource: 'keyboard',
    })
    return
  }

  event.preventDefault()
  commandPaletteStore.open({ triggerSource: 'keyboard' })
}

// Initial load plus global listeners.
onMounted(async () => {
  syncCSSVariables()
  syncCustomCssRuntime()
  void ftueStore.initialize()
  devPanelStore.initializeFromStartup()
  commandPaletteStore.registerCommands(createBuiltinCommands({
    router,
    articleStore,
    getWorkstationBridge: () => commandPaletteStore.workstationBridge,
    toggleDevPanel: () => devPanelStore.togglePanel('command-palette'),
    checkForUpdates: async () => updaterStore.checkNow(),
  }))
  syncCommandPaletteContext()
  void updaterStore.initialize().then(() => {
    updaterStore.scheduleStartupCheck()
    updaterStore.startIntervalChecks()
  })
  colorSchemeQuery.addEventListener('change', handleColorSchemeChange)
  window.addEventListener('keydown', handleGlobalHelpShortcut)
  window.addEventListener('keydown', handleGlobalCommandShortcut)
  window.addEventListener('keydown', handleGlobalDevPanelShortcut)

  // Tell the Rust backend the app is mounted; close splash + show main window.
  // Guarded inside notifyAppReady() against non-Tauri environments.
  await nextTick()
  void notifyAppReady()
})

onUnmounted(() => {
  colorSchemeQuery.removeEventListener('change', handleColorSchemeChange)
  window.removeEventListener('keydown', handleGlobalHelpShortcut)
  window.removeEventListener('keydown', handleGlobalCommandShortcut)
  window.removeEventListener('keydown', handleGlobalDevPanelShortcut)
  updaterStore.stopScheduledChecks()
})

watch(
  () => settingsStore.settings.appearance,
  () => syncCSSVariables(),
  { deep: true }
)

watch(
  () => settingsStore.settings.advanced.customCss,
  () => syncCustomCssRuntime(),
  { deep: true },
)

watch(
  () => [route.fullPath, route.name, articleStore.selectedArticleId] as const,
  () => syncCommandPaletteContext(),
  { immediate: true },
)

/**
 * 环境检测
 */
const isProduction = computed(() => import.meta.env.PROD)

/**
 * Titlebar 当前文档名（无活动文档时由 TitleBar 自身回退到 tagline）
 */
const activeArticleTitle = computed<string | null>(() => articleStore.selectedArticle?.title ?? null)

/**
 * 错误状态
 */
const hasError = ref(false)
const errorMessage = ref('')
const errorDetails = ref('')

/**
 * 是否显示技术细节（仅开发环境）
 */
const showTechnicalDetails = computed(() => !isProduction.value && errorDetails.value)

/**
 * 全局错误捕获钩子
 * 捕获所有子组件的未处理异常
 */
onErrorCaptured((error: Error, instance, info: string) => {
  // 记录错误到日志
  const appError = new AppError(
    ErrorCode.UNKNOWN_ERROR,
    error.message,
    {
      componentName: instance?.$options?.name ?? 'Unknown',
      errorInfo: info,
      stack: error.stack,
    }
  )
  logger.appError(appError)

  // 设置错误状态，显示回退 UI
  hasError.value = true
  errorMessage.value = error.message || '应用发生未知错误'
  errorDetails.value = info

  // 返回 false 阻止错误继续向上传播
  // 这样可以防止 Vue 的默认错误处理（控制台警告）
  return false
})

/**
 * 重试：刷新页面
 */
function handleRetry(): void {
  window.location.reload()
}

/**
 * 重置错误状态（尝试恢复）
 */
function handleDismiss(): void {
  hasError.value = false
  errorMessage.value = ''
  errorDetails.value = ''
}
</script>

<template>
  <TitleBar :document-title="activeArticleTitle" />

  <div class="app-content">
    <!-- 错误回退 UI -->
    <div
      v-if="hasError"
      class="error-boundary"
    >
      <div class="error-boundary__content">
        <div class="error-boundary__icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
            />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
            />
            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
            />
          </svg>
        </div>
        <h1 class="error-boundary__title">
          页面出现问题
        </h1>
        <p class="error-boundary__message">
          {{ errorMessage }}
        </p>
        <p
          v-if="showTechnicalDetails"
          class="error-boundary__details"
        >
          错误位置: {{ errorDetails }}
        </p>
        <div class="error-boundary__actions">
          <button
            class="error-boundary__btn error-boundary__btn--primary"
            type="button"
            @click="handleRetry"
          >
            刷新页面
          </button>
          <button
            class="error-boundary__btn error-boundary__btn--secondary"
            type="button"
            @click="handleDismiss"
          >
            尝试恢复
          </button>
        </div>
      </div>
    </div>

    <!-- Normal content -->
    <template v-else>
      <ViewTransition />

      <WelcomeModal />
      <HelpCenter />
      <CommandPalette />
      <UpdateToast />
      <UpdateDetailsModal />
      <DevPanel v-if="devPanelStore.shouldRenderPanel" />
    </template>
  </div>
</template>

<style>
/* ────────────────────────────────────────────────────────────────────
 * Global tokens-driven baseline (Inkstone Glass foundation).
 *
 * - Body font defaults to Inter/system UI per the dual-weight ladder.
 * - All keyboard-focusable interactive elements get the Kiln double-ring
 *   so we never strand keyboard users with `outline: none`. Scoped to
 *   buttons/links/form controls/[tabindex] to avoid blanketing routine
 *   text spans / images / icons.
 * ──────────────────────────────────────────────────────────────────── */
body {
  font-family: var(--font-sans);
  font-weight: var(--type-weight-normal);
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[tabindex]:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
  border-radius: 4px;
}

/*
 * Editor canvas exemption.
 *
 * The TipTap writing surface (`.ProseMirror`, a focusable contenteditable that
 * carries a tabindex) otherwise matches the `[tabindex]:focus-visible` /
 * focusable rule above and wraps the entire writing canvas in the loud Kiln
 * red double-ring. The main writing surface is not a discrete control — it is
 * the page — so it must NOT wear a keyboard-focus ring. Real buttons / links /
 * form controls keep theirs (above). Placed AFTER the global rule so equal
 * specificity resolves in this override's favour. The subtle
 * `.editor-paper:focus-within` lift (EditorPanel.vue) stays untouched.
 */
.ProseMirror:focus-visible,
.ProseMirror:focus,
.editor-scroll [contenteditable]:focus-visible,
.editor-scroll [contenteditable]:focus {
  box-shadow: none;
  outline: none;
}

#app {
  width: 100%;
  height: 100vh;
}

/* TitleBar offsets the route content. TitleBar.vue writes the actual height
   (32px Win/Linux, 28px macOS) to --ink-titlebar-height on :root. */
/*
 * .app-content uses `overflow: hidden` intentionally:
 * - All globally floating UI (CommandPalette, ExportModal, WelcomeModal,
 *   HelpCenter, UpdateToast, UpdateDetailsModal, etc.) is `<Teleport to="body">`
 *   so it bypasses this clip region.
 * - PublishView and other route-internal popovers use `position: fixed` on the
 *   viewport (no ancestor with `transform`/`filter`/`perspective`/`contain`
 *   creates a containing block here), so they are not clipped by this overflow.
 * - Route-internal `position: absolute` elements (preset color bars, toggle
 *   knobs, etc.) are intentionally clipped to their own bounded container.
 * Switching to `overflow: visible` would let route-internal scroll bleed into
 * the TitleBar and is not necessary for current modal/popover wiring.
 */
.app-content {
  width: 100%;
  height: calc(100vh - var(--ink-titlebar-height, 32px));
  margin-top: var(--ink-titlebar-height, 32px);
  overflow: hidden;
}

.app-route-shell {
  width: 100%;
  height: 100%;
}

@media (max-width: 640px) {
  .app-route-shell {
    padding-bottom: 72px;
    box-sizing: border-box;
  }
}

/* 全局减少动画 */
.reduce-motion *,
.reduce-motion *::before,
.reduce-motion *::after,
[data-reduced-motion="true"] *,
[data-reduced-motion="true"] *::before,
[data-reduced-motion="true"] *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}

/* 错误边界样式 */
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #F5F0E6 0%, #EDE7DB 100%);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.error-boundary__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 480px;
  padding: 48px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: var(--elev-3);
  text-align: center;
}

.error-boundary__icon {
  color: #e53935;
  margin-bottom: 24px;
}

.error-boundary__title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 600;
  color: #252933;
}

.error-boundary__message {
  margin: 0 0 8px;
  font-size: 16px;
  color: #6E7580;
  line-height: 1.5;
}

.error-boundary__details {
  margin: 0 0 24px;
  font-size: 14px;
  color: #9B958D;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

.error-boundary__actions {
  display: flex;
  gap: 12px;
}

.error-boundary__btn {
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 500;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.error-boundary__btn--primary {
  background: #D95B3F;
  color: #ffffff;
}

.error-boundary__btn--primary:hover {
  background: #B84A30;
}

.error-boundary__btn--secondary {
  background: #EDE7DB;
  color: #252933;
}

.error-boundary__btn--secondary:hover {
  background: #DED7CA;
}
</style>
