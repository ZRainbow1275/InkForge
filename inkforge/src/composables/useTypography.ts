/**
 * 排版控制 Composable
 *
 * 提供对编辑器/预览的实时排版参数控制，
 * 统一管理 appearance.typography 下的所有排版参数。
 *
 * 通过响应式 sliderControls / indentControl 暴露给 Inspector 面板，
 * 也可在其他需要排版控制的场景中复用。
 */
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

// ═══════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════

export interface TypographySliderControl {
  /** 当前值 */
  value: number
  /** 最小值 */
  min: number
  /** 最大值 */
  max: number
  /** 步长 */
  step: number
  /** 显示标签 */
  label: string
  /** 值单位（px / em / 空） */
  unit: string
}

export interface TypographyToggleControl {
  /** 当前值 */
  value: boolean
  /** 显示标签 */
  label: string
}

type NumericTypographyKey = 'fontSize' | 'lineHeight' | 'letterSpacing' | 'paragraphSpacing' | 'listSpacing'
type TypographyControlKey = NumericTypographyKey | 'paragraphIndent'

// ═══════════════════════════════════════════════════════════════════
// Composable
// ═══════════════════════════════════════════════════════════════════

export function useTypography() {
  const settingsStore = useSettingsStore()

  /** 排版参数直接引用（可在模板中直接读写） */
  const typography = computed(() => settingsStore.settings.appearance.typography)

  /** 滑块类控制列表（供 v-for 渲染） */
  const sliderControls = computed<Record<NumericTypographyKey, TypographySliderControl>>(() => ({
    fontSize: {
      value: typography.value.fontSize,
      min: 12,
      max: 24,
      step: 1,
      label: '字号',
      unit: 'px',
    },
    lineHeight: {
      value: typography.value.lineHeight,
      min: 1.2,
      max: 2.4,
      step: 0.1,
      label: '行高',
      unit: '',
    },
    letterSpacing: {
      value: typography.value.letterSpacing,
      min: -0.05,
      max: 0.2,
      step: 0.01,
      label: '字间距',
      unit: 'em',
    },
    paragraphSpacing: {
      value: typography.value.paragraphSpacing,
      min: 0,
      max: 32,
      step: 2,
      label: '段间距',
      unit: 'px',
    },
    listSpacing: {
      value: typography.value.listSpacing,
      min: 2,
      max: 16,
      step: 1,
      label: '列表项距',
      unit: 'px',
    },
  }))

  /** 首行缩进开关 */
  const indentControl = computed<TypographyToggleControl>(() => ({
    value: typography.value.paragraphIndent,
    label: '首行缩进',
  }))

  /**
   * 更新排版参数
   * 直接修改 store 中的 typography 对象，触发 deep watch 自动持久化
   */
  function updateTypography(key: TypographyControlKey, value: number | boolean): void {
    const typo = settingsStore.settings.appearance.typography
    if (key === 'paragraphIndent') {
      if (typeof value === 'boolean') typo.paragraphIndent = value
      return
    }

    if (typeof value === 'number') typo[key] = value
  }

  /**
   * 重置全部排版参数到默认值
   */
  function resetTypography(): void {
    const typo = settingsStore.settings.appearance.typography
    typo.fontSize = 16
    typo.lineHeight = 1.618
    typo.letterSpacing = 0
    typo.paragraphSpacing = 16
    typo.paragraphIndent = false
    typo.textAlign = 'left'
    typo.listSpacing = 8
    typo.headingScale = 'balanced'
    typo.headingStyle = 'none'
    typo.blockquoteStyle = 'classic'
    typo.dividerStyle = 'line'
    typo.mediaStyle = 'plain'
  }

  return {
    typography,
    sliderControls,
    indentControl,
    updateTypography,
    resetTypography,
  }
}
