import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DEFAULT_PRESET_ID, FONT_STACKS } from '@/constants'
import { logger } from '@/services/error'

/**
 * 文章类型预设配置
 * 基于 PRD 定义的 10 种文章类型
 */
export interface ThemePreset {
    id: string
    name: string
    baseTheme: 'default' | 'grace' | 'simple'
    primaryColor: string
    fontFamily: 'sans' | 'serif' | 'mono'
    fontSize: number
    lineHeight: number
    firstLineIndent: boolean
    textAlign: 'left' | 'justify'
    macCodeBlock: boolean
    codeLineNumbers: boolean
    footnotes: boolean
}

/**
 * 编辑器预览预设（10 种文章类型）
 *
 * 注意：此预设用于编辑器内的实时预览配置
 * 导出时使用 services/export/themes.ts 中的 themePresets
 * 两者 ID 保持一致以确保预览与导出效果匹配
 *
 * @see services/export/themes.ts - 导出专用预设
 */
export const ARTICLE_PRESETS: ThemePreset[] = [
    {
        id: 'thesis',
        name: '论文翻译',
        baseTheme: 'grace',
        primaryColor: '#8B0000', // 苏联红
        fontFamily: 'serif',
        fontSize: 14,
        lineHeight: 1.8,
        firstLineIndent: true,
        textAlign: 'justify',
        macCodeBlock: false,
        codeLineNumbers: false,
        footnotes: true
    },
    {
        id: 'legal',
        name: '法学研讨',
        baseTheme: 'grace',
        primaryColor: '#1A3A5C', // 藏青
        fontFamily: 'serif',
        fontSize: 14,
        lineHeight: 1.8,
        firstLineIndent: true,
        textAlign: 'justify',
        macCodeBlock: false,
        codeLineNumbers: false,
        footnotes: true
    },
    {
        id: 'report',
        name: '行业研报',
        baseTheme: 'default',
        primaryColor: '#004080', // 商务蓝
        fontFamily: 'sans',
        fontSize: 14,
        lineHeight: 1.6,
        firstLineIndent: false,
        textAlign: 'left',
        macCodeBlock: false,
        codeLineNumbers: false,
        footnotes: true
    },
    {
        id: 'commentary',
        name: '时事点评',
        baseTheme: 'simple',
        primaryColor: '#C00000', // 新闻红
        fontFamily: 'sans',
        fontSize: 14,
        lineHeight: 1.6,
        firstLineIndent: false,
        textAlign: 'left',
        macCodeBlock: false,
        codeLineNumbers: false,
        footnotes: true
    },
    {
        id: 'aigc',
        name: 'AIGC创意',
        baseTheme: 'default',
        primaryColor: '#7B2D8E', // 赛博紫
        fontFamily: 'sans',
        fontSize: 14,
        lineHeight: 1.6,
        firstLineIndent: false,
        textAlign: 'left',
        macCodeBlock: true,
        codeLineNumbers: true,
        footnotes: false
    },
    {
        id: 'code',
        name: '编程创造',
        baseTheme: 'default',
        primaryColor: '#00FF41', // 终端绿
        fontFamily: 'mono',
        fontSize: 14,
        lineHeight: 1.5,
        firstLineIndent: false,
        textAlign: 'left',
        macCodeBlock: true,
        codeLineNumbers: true,
        footnotes: false
    },
    {
        id: 'notes',
        name: '学习笔记',
        baseTheme: 'grace',
        primaryColor: '#E07020', // 温暖橙
        fontFamily: 'sans',
        fontSize: 14,
        lineHeight: 1.7,
        firstLineIndent: false,
        textAlign: 'left',
        macCodeBlock: false,
        codeLineNumbers: false,
        footnotes: false
    },
    {
        id: 'news',
        name: '新闻',
        baseTheme: 'simple',
        primaryColor: '#000000', // 纯黑
        fontFamily: 'sans',
        fontSize: 14,
        lineHeight: 1.6,
        firstLineIndent: false,
        textAlign: 'left',
        macCodeBlock: false,
        codeLineNumbers: false,
        footnotes: false
    },
    {
        id: 'meme',
        name: '整活',
        baseTheme: 'default',
        primaryColor: '#FF6B9D', // 活力粉
        fontFamily: 'sans',
        fontSize: 14,
        lineHeight: 1.6,
        firstLineIndent: false,
        textAlign: 'left',
        macCodeBlock: false,
        codeLineNumbers: false,
        footnotes: false
    },
    {
        id: 'life',
        name: '人生感悟',
        baseTheme: 'simple',
        primaryColor: '#666666', // 淡雅灰
        fontFamily: 'serif',
        fontSize: 14,
        lineHeight: 1.8,
        firstLineIndent: true,
        textAlign: 'left',
        macCodeBlock: false,
        codeLineNumbers: false,
        footnotes: false
    }
]

/**
 * 主题 Store
 * 管理编辑器主题和导出样式
 */
export const useThemeStore = defineStore('theme', () => {
    // 当前预设 ID
    const currentPresetId = ref<string>(DEFAULT_PRESET_ID)

    // 自定义 CSS
    const customCSS = ref<string>('')

    // 存储警告信息
    const storageWarning = ref<string | null>(null)

    // 基础主题
    const baseTheme = ref<'default' | 'grace' | 'simple'>('default')

    // 主题色
    const primaryColor = ref<string>('#0066cc')

    // 字体设置
    const fontFamily = ref<'sans' | 'serif' | 'mono'>('sans')
    const fontSize = ref<number>(14)
    const lineHeight = ref<number>(1.6)

    // 排版设置
    const firstLineIndent = ref<boolean>(false)
    const textAlign = ref<'left' | 'justify'>('left')

    // 代码块设置
    const macCodeBlock = ref<boolean>(true)
    const codeLineNumbers = ref<boolean>(false)

    // 其他
    const footnotes = ref<boolean>(true)

    // 当前预设
    const currentPreset = computed(() => {
        return ARTICLE_PRESETS.find(p => p.id === currentPresetId.value) || null
    })

    // localStorage key for theme preset persistence
    const STORAGE_KEY = 'inkforge_theme_preset'

    // 应用预设
    function applyPreset(presetId: string) {
        const preset = ARTICLE_PRESETS.find(p => p.id === presetId)
        if (!preset) return

        currentPresetId.value = presetId
        baseTheme.value = preset.baseTheme
        primaryColor.value = preset.primaryColor
        fontFamily.value = preset.fontFamily
        fontSize.value = preset.fontSize
        lineHeight.value = preset.lineHeight
        firstLineIndent.value = preset.firstLineIndent
        textAlign.value = preset.textAlign
        macCodeBlock.value = preset.macCodeBlock
        codeLineNumbers.value = preset.codeLineNumbers
        footnotes.value = preset.footnotes

        // 持久化到 localStorage
        try {
            localStorage.setItem(STORAGE_KEY, presetId)
            storageWarning.value = null // 清除之前的警告
        } catch (e) {
            // 检测 QuotaExceededError
            if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
                storageWarning.value = '存储空间已满，主题偏好无法保存。请清理浏览器存储后重试。'
                logger.error('localStorage 配额已满，无法保存主题预设', e)
            } else {
                storageWarning.value = '保存主题偏好失败，下次访问可能需要重新设置。'
                logger.error('保存主题预设到 localStorage 失败', e)
            }
        }
    }

    // 初始化：从 localStorage 读取并应用保存的预设
    function initFromStorage() {
        try {
            const savedPresetId = localStorage.getItem(STORAGE_KEY)
            const presetIdToApply = savedPresetId && ARTICLE_PRESETS.some(p => p.id === savedPresetId)
                ? savedPresetId
                : DEFAULT_PRESET_ID
            applyPreset(presetIdToApply)
        } catch (e) {
            logger.error('从 localStorage 读取主题预设失败', e)
            applyPreset(DEFAULT_PRESET_ID)
        }
    }

    // 立即执行初始化
    initFromStorage()

    // 生成 CSS
    const generatedCSS = computed(() => {
        return `
/* InkForge Generated Theme CSS */
.preview-content {
  font-family: ${FONT_STACKS[fontFamily.value]};
  font-size: ${fontSize.value}px;
  line-height: ${lineHeight.value};
  color: #333;
  text-align: ${textAlign.value};
}

.preview-content p {
  margin-bottom: 1.5em;
  ${firstLineIndent.value ? 'text-indent: 2em;' : ''}
}

.preview-content h2 {
  color: ${primaryColor.value};
  border-bottom: 2px solid ${primaryColor.value};
  padding-bottom: 8px;
}

.preview-content h3 {
  color: ${primaryColor.value};
}

.preview-content blockquote {
  border-left: 4px solid ${primaryColor.value};
  background: ${primaryColor.value}10;
}

.preview-content a {
  color: ${primaryColor.value};
}

.preview-content code {
  background: ${primaryColor.value}15;
}

${customCSS.value}
`.trim()
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
