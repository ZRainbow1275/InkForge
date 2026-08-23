import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DEFAULT_PRESET_ID } from '@/constants'
import { logger } from '@/services/error'
import { generateThemeCSS, themePresets } from '@/services/export/themes'
import { typographyToWechatCss } from '@/services/export/shared-typography'
import type { ExportPreset } from '@/types'
import { useSettingsStore } from './settings'

/**
 * 文章类型预设配置
 * 旧组件读取的规范预设投影
 */
export interface ThemePreset {
    id: string
    name: string
    baseTheme: 'default' | 'grace' | 'simple'
    primaryColor: string
    fontFamily: 'sans' | 'serif' | 'kai' | 'mono'
    fontSize: number
    lineHeight: number
    firstLineIndent: boolean
    textAlign: 'left' | 'justify'
    macCodeBlock: boolean
    codeLineNumbers: boolean
    footnotes: boolean
}

function toLegacyBaseTheme(theme: string): ThemePreset['baseTheme'] {
    return theme === 'grace' || theme === 'simple' ? theme : 'default'
}

function toLegacyFontFamily(fontFamily: string): ThemePreset['fontFamily'] {
    if (fontFamily.includes('mono')) return 'mono'
    if (fontFamily.includes('serif')) return 'serif'
    return 'sans'
}

function getLegacyLineHeight(preset: ExportPreset): number {
    const matched = preset.previewCSS?.match(/#nice p\s*\{[^}]*line-height:\s*([\d.]+)/)
    const value = Number(matched?.[1])
    return Number.isFinite(value) ? value : 1.6
}

function toLegacyThemePreset(preset: ExportPreset): ThemePreset {
    const fontSize = Number.parseFloat(preset.fontSize)
    const codeOrTech = preset.id === 'aigc' || preset.id === 'code' || preset.id === 'tech'

    return {
        id: preset.id,
        name: preset.name,
        baseTheme: toLegacyBaseTheme(preset.theme),
        primaryColor: preset.primaryColor,
        fontFamily: toLegacyFontFamily(preset.fontFamily),
        fontSize: Number.isFinite(fontSize) ? fontSize : 14,
        lineHeight: getLegacyLineHeight(preset),
        firstLineIndent: preset.isUseIndent,
        textAlign: preset.isUseJustify ? 'justify' : 'left',
        macCodeBlock: codeOrTech,
        codeLineNumbers: codeOrTech,
        footnotes: preset.persona === 'academic' || preset.id === 'commentary',
    }
}

/**
 * 旧编辑器组件的只读兼容投影。
 * 预设内容和 CSS 均以 services/export/themes.ts 为唯一事实源。
 */
export const ARTICLE_PRESETS: ThemePreset[] = themePresets.map(toLegacyThemePreset)

const LEGACY_STORAGE_KEY = 'inkforge_theme_preset'
const SETTINGS_STORAGE_KEY = 'inkforge-settings'

function isWechatPresetId(value: unknown): value is string {
    return typeof value === 'string' && ARTICLE_PRESETS.some(preset => preset.id === value)
}

function hasStoredCanonicalPreset(): boolean {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return false

    const candidate: unknown = JSON.parse(raw)
    if (typeof candidate !== 'object' || candidate === null) return false
    const exportSettings = (candidate as { export?: unknown }).export
    if (typeof exportSettings !== 'object' || exportSettings === null) return false
    const record = exportSettings as Record<string, unknown>
    return typeof record.defaultPlatform === 'string'
        && typeof record.defaultPresetId === 'string'
}

/**
 * 主题 Store
 * 管理编辑器主题和导出样式
 */
export const useThemeStore = defineStore('theme', () => {
    const settingsStore = useSettingsStore()
    const legacyPresetId = ref<string>(DEFAULT_PRESET_ID)
    const storageWarning = ref<string | null>(null)

    const currentPresetId = computed({
        get: () => {
            const { defaultPlatform, defaultPresetId } = settingsStore.settings.export
            return defaultPlatform === 'wechat' && isWechatPresetId(defaultPresetId)
                ? defaultPresetId
                : legacyPresetId.value
        },
        set: (presetId: string) => {
            if (!isWechatPresetId(presetId)) return
            legacyPresetId.value = presetId
            settingsStore.settings.export.defaultPlatform = 'wechat'
            settingsStore.settings.export.defaultPresetId = presetId
        },
    })

    const currentPreset = computed(() => {
        return ARTICLE_PRESETS.find(p => p.id === currentPresetId.value) || null
    })

    const customCSS = computed({
        get: () => settingsStore.settings.export.customCss,
        set: (value: string) => { settingsStore.settings.export.customCss = value },
    })
    const baseTheme = computed(() => currentPreset.value?.baseTheme ?? 'default')
    const primaryColor = computed({
        get: () => settingsStore.settings.appearance.accentColor,
        set: (value: string) => { settingsStore.settings.appearance.accentColor = value },
    })
    const fontFamily = computed({
        get: () => settingsStore.settings.appearance.fontFamily,
        set: (value: ThemePreset['fontFamily']) => { settingsStore.settings.appearance.fontFamily = value },
    })
    const fontSize = computed({
        get: () => settingsStore.settings.appearance.typography.fontSize,
        set: (value: number) => { settingsStore.settings.appearance.typography.fontSize = value },
    })
    const lineHeight = computed({
        get: () => settingsStore.settings.appearance.typography.lineHeight,
        set: (value: number) => { settingsStore.settings.appearance.typography.lineHeight = value },
    })
    const firstLineIndent = computed({
        get: () => settingsStore.settings.appearance.typography.paragraphIndent,
        set: (value: boolean) => { settingsStore.settings.appearance.typography.paragraphIndent = value },
    })
    const textAlign = computed<ThemePreset['textAlign']>(() => (
        currentPreset.value?.textAlign ?? 'left'
    ))
    const macCodeBlock = computed({
        get: () => settingsStore.settings.export.macCodeBlock,
        set: (value: boolean) => { settingsStore.settings.export.macCodeBlock = value },
    })
    const codeLineNumbers = computed({
        get: () => settingsStore.settings.export.lineNumbers,
        set: (value: boolean) => { settingsStore.settings.export.lineNumbers = value },
    })
    const footnotes = computed({
        get: () => settingsStore.settings.export.convertFootnotes,
        set: (value: boolean) => { settingsStore.settings.export.convertFootnotes = value },
    })

    function applyPreset(presetId: string): void {
        if (!isWechatPresetId(presetId)) return
        currentPresetId.value = presetId
        try {
            localStorage.setItem(LEGACY_STORAGE_KEY, presetId)
            storageWarning.value = null
        } catch (e) {
            if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
                storageWarning.value = '存储空间已满，主题偏好无法保存。请清理浏览器存储后重试。'
                logger.error('localStorage 配额已满，无法保存主题预设', e)
            } else {
                storageWarning.value = '保存主题偏好失败，下次访问可能需要重新设置。'
                logger.error('保存主题预设到 localStorage 失败', e)
            }
        }
    }

    function initFromStorage(): void {
        try {
            const savedPresetId = localStorage.getItem(LEGACY_STORAGE_KEY)
            if (!isWechatPresetId(savedPresetId)) return
            legacyPresetId.value = savedPresetId
            if (!hasStoredCanonicalPreset()) currentPresetId.value = savedPresetId
        } catch (e) {
            logger.error('从 localStorage 读取主题预设失败', e)
        }
    }

    initFromStorage()

    const generatedCSS = computed(() => {
        const canonicalPreset = themePresets.find(preset => preset.id === currentPresetId.value)
        if (!canonicalPreset) return customCSS.value.trim()
        const typographyCSS = typographyToWechatCss({
            ...settingsStore.settings.appearance.typography,
            fontFamily: settingsStore.settings.appearance.fontFamily,
        }, settingsStore.settings.appearance.accentColor)

        return [generateThemeCSS(canonicalPreset, 'preview'), typographyCSS, customCSS.value]
            .filter(Boolean)
            .join('\n')
            .replace(/#nice/g, '.preview-content')
            .trim()
    })

    return {
        // State
        currentPresetId,
        customCSS,
        baseTheme,
        primaryColor,
        fontFamily,
        fontSize,
        lineHeight,
        firstLineIndent,
        textAlign,
        macCodeBlock,
        codeLineNumbers,
        footnotes,

        // Computed
        currentPreset,
        generatedCSS,

        // Actions
        applyPreset
    }
})
