<script setup lang="ts">
/**
 * InkForge App Root
 * 使用 Vue Router 支持工作区和编辑器两种模式
 * 包含全局错误边界，捕获未处理的组件异常
 * + 全局 CSS Variables 从 Settings Store 同步
 */
import { ref, computed, watch, onMounted, onErrorCaptured } from 'vue'
import { logger, ErrorCode, AppError } from './services/error'
import { useSettingsStore } from './stores/settings'

/**
 * Settings → 全局 CSS Variables 同步
 */
const settingsStore = useSettingsStore()

/** 将 settings 中的外观配置同步到 :root CSS 变量 */
function syncCSSVariables(): void {
  const root = document.documentElement
  const { accentColor, theme, fontFamily, fontSize, lineHeight, reducedMotion } = settingsStore.settings.appearance

  // 主题色
  root.style.setProperty('--accent-primary', accentColor)
  // 计算较浅的主题色（用于 hover/bg）
  root.style.setProperty('--accent-primary-light', accentColor + '1A') // 10% opacity hex
  root.style.setProperty('--accent-primary-dark', adjustColor(accentColor, -20))

  // 字体
  const fontMap: Record<string, string> = {
    serif: "'Noto Serif SC', Georgia, 'Times New Roman', serif",
    sans: "'Noto Sans SC', -apple-system, system-ui, sans-serif",
    kai: "'KaiTi', 'STKaiti', serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  }
  root.style.setProperty('--font-body', fontMap[fontFamily] || fontMap.serif)
  root.style.setProperty('--font-size-body', `${fontSize}px`)
  root.style.setProperty('--line-height-body', String(lineHeight))

  // 主题 (light/dark/system)
  applyTheme(theme)

  // 减少动画
  if (reducedMotion) {
    root.classList.add('reduce-motion')
  } else {
    root.classList.remove('reduce-motion')
  }
}

/** 应用主题 class */
function applyTheme(theme: 'light' | 'dark' | 'system'): void {
  const root = document.documentElement
  root.classList.remove('theme-light', 'theme-dark')

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.add(prefersDark ? 'theme-dark' : 'theme-light')
  } else {
    root.classList.add(`theme-${theme}`)
  }
}

/** 简单的颜色明度调整 */
function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

// 初次加载 + 响应式监听
onMounted(() => {
  syncCSSVariables()

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (settingsStore.settings.appearance.theme === 'system') {
      applyTheme('system')
    }
  })
})

watch(
  () => settingsStore.settings.appearance,
  () => syncCSSVariables(),
  { deep: true }
)

/**
 * 环境检测
 */
const isProduction = computed(() => import.meta.env.PROD)

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
          @click="handleRetry"
        >
          刷新页面
        </button>
        <button
          class="error-boundary__btn error-boundary__btn--secondary"
          @click="handleDismiss"
        >
          尝试恢复
        </button>
      </div>
    </div>
  </div>

  <!-- 正常内容 -->
  <router-view v-else />
</template>

<style>
#app {
  width: 100%;
  height: 100vh;
}

/* 全局减少动画 */
.reduce-motion *,
.reduce-motion *::before,
.reduce-motion *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* 错误边界样式 */
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
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
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
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
  color: #1a1a1a;
}

.error-boundary__message {
  margin: 0 0 8px;
  font-size: 16px;
  color: #666666;
  line-height: 1.5;
}

.error-boundary__details {
  margin: 0 0 24px;
  font-size: 14px;
  color: #999999;
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
  background: #0066cc;
  color: #ffffff;
}

.error-boundary__btn--primary:hover {
  background: #0052a3;
}

.error-boundary__btn--secondary {
  background: #f0f0f0;
  color: #333333;
}

.error-boundary__btn--secondary:hover {
  background: #e0e0e0;
}
</style>
