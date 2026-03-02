import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

// ═══════════════════════════════════════════════════════════════════
// 智能标点转换 TipTap 扩展
// 将常见的 ASCII 标点序列自动替换为排版标点
// ═══════════════════════════════════════════════════════════════════

/** 标点替换规则 */
interface PunctuationRule {
    /** 触发序列（正则模式） */
    pattern: RegExp
    /** 替换结果 */
    replacement: string
    /** 触发字符（用于快速判断是否需要检查） */
    trigger: string
}

/** 扩展配置 */
export interface SmartPunctuationOptions {
    /** 启用状态（响应式，可动态切换） */
    enabled: boolean
    /** 启用破折号转换 (-- → ——) */
    dash: boolean
    /** 启用省略号转换 (... → ……) */
    ellipsis: boolean
    /** 启用中文引号转换 ("" → \u201C\u201D) */
    quotes: boolean
    /** 启用中英文间距自动插入 */
    autoSpacing: boolean
}

/** 默认配置 */
const DEFAULT_OPTIONS: SmartPunctuationOptions = {
    enabled: true,
    dash: true,
    ellipsis: true,
    quotes: true,
    autoSpacing: true,
}

/**
 * 中文字符正则
 * 覆盖范围:
 * - CJK 统一汉字基本区 (U+4E00–U+9FFF)
 * - CJK 统一汉字扩展 A (U+3400–U+4DBF)
 * - CJK 兼容汉字 (U+F900–U+FAFF)
 * - CJK 统一汉字扩展 B (U+20000–U+2A6DF) — 生僻字
 * - CJK 统一汉字扩展 C/D/E/F (U+2A700–U+2CEAF)
 * - CJK 标点符号 (U+3000–U+303F)
 * - 全角字符 (U+FF00–U+FFEF)
 */
const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]|\ud840[\udc00-\udfff]|\ud841[\udc00-\udfff]|\ud842[\udc00-\udfff]|\ud843[\udc00-\udfff]|\ud844[\udc00-\udfff]|\ud845[\udc00-\udfff]|\ud846[\udc00-\udfff]|\ud847[\udc00-\udfff]|\ud848[\udc00-\udfff]|\ud849[\udc00-\udfff]/

/** ASCII 字母/数字正则 */
const ASCII_ALNUM_RE = /[a-zA-Z0-9]/

/** 标点替换规则集 */
function buildRules(options: SmartPunctuationOptions): PunctuationRule[] {
    const rules: PunctuationRule[] = []

    if (options.dash) {
        // -- → ——（中文破折号）
        rules.push({
            pattern: /--$/,
            replacement: '——',
            trigger: '-',
        })
    }

    if (options.ellipsis) {
        // ... → ……（中文省略号）
        rules.push({
            pattern: /\.\.\.$/,
            replacement: '……',
            trigger: '.',
        })
    }

    if (options.quotes) {
        // "内容" → \u201C内容\u201D（中文双引号）
        // 当用户输入闭合的 " 时，回溯查找配对的开头 "，整体替换
        //
        // 已知限制: 引号配对仅在同一 ProseMirror 父节点内生效。
        // 如果开引号 " 和闭引号 " 跨越了行内格式节点边界
        // (如 "部分**加粗**内容")，则不会触发自动转换。
        // 这是 ProseMirror 文本节点模型的固有约束，
        // 用户可通过手动输入中文引号或在同一格式块内完成引号配对来规避。
        rules.push({
            pattern: /"([^"]*)"$/,
            replacement: '\u201C$1\u201D',
            trigger: '"',
        })
    }

    return rules
}

/**
 * 引号替换需要特殊处理：正则捕获组替换
 * 普通规则的 replacement 直接替换匹配文本
 * 引号规则的 replacement 包含 $1 占位符，需要展开
 */
function expandReplacement(replacement: string, match: RegExpMatchArray): string {
    let result = replacement
    for (let i = 1; i < match.length; i++) {
        result = result.replace(`$${i}`, match[i] ?? '')
    }
    return result
}

/**
 * 检查是否需要在中英文之间插入空格
 * @param textBefore - 光标前的文本
 * @param insertedChar - 即将输入的字符
 * @returns 是否需要在前面插入空格
 */
function needsAutoSpacing(textBefore: string, insertedChar: string): boolean {
    if (textBefore.length === 0) return false

    const lastChar = textBefore[textBefore.length - 1]

    // 中文后输入英文/数字 → 插入空格
    if (CJK_RE.test(lastChar) && ASCII_ALNUM_RE.test(insertedChar)) {
        return true
    }

    // 英文/数字后输入中文 → 插入空格
    if (ASCII_ALNUM_RE.test(lastChar) && CJK_RE.test(insertedChar)) {
        return true
    }

    return false
}

/** ProseMirror 插件 Key */
const smartPunctuationPluginKey = new PluginKey('smartPunctuation')

/**
 * SmartPunctuation TipTap Extension
 *
 * 功能：
 * 1. 破折号转换: -- → ——
 * 2. 省略号转换: ... → ……
 * 3. 中文引号转换: "" → \u201C\u201D
 * 4. 中英文自动加空格
 */
export const SmartPunctuation = Extension.create<SmartPunctuationOptions>({
    name: 'smartPunctuation',

    addOptions() {
        return { ...DEFAULT_OPTIONS }
    },

    addProseMirrorPlugins() {
        const extensionOptions = this.options

        return [
            new Plugin({
                key: smartPunctuationPluginKey,

                props: {
                    handleTextInput(view, from, to, text) {
                        if (!extensionOptions.enabled) return false

                        // IME 组合阶段（如拼音/日文输入）跳过处理，
                        // 避免在用户未确认候选词时触发标点替换或自动加空格
                        if (view.composing) return false

                        const { state } = view
                        const $from = state.doc.resolve(from)

                        // 获取当前文本节点中光标前的文本
                        const textBefore = $from.parent.textBetween(
                            0,
                            $from.parentOffset,
                            undefined,
                            '\ufffc'
                        )

                        // 1. 检查标点替换规则
                        const rules = buildRules(extensionOptions)
                        const candidateText = textBefore + text

                        for (const rule of rules) {
                            if (text !== rule.trigger) continue

                            const match = candidateText.match(rule.pattern)
                            if (match) {
                                const matchLength = match[0].length
                                const replaceFrom = from - (matchLength - text.length)

                                // 安全校验: 替换起始位置不得越过当前父节点的起始边界
                                // 防止跨节点替换破坏文档结构 (如引号跨越加粗/斜体边界)
                                const parentStart = from - $from.parentOffset
                                if (replaceFrom < parentStart) continue

                                // 执行替换（支持捕获组展开，如引号规则的 $1）
                                const finalText = expandReplacement(rule.replacement, match)
                                const tr = state.tr.replaceWith(
                                    replaceFrom,
                                    to,
                                    state.schema.text(finalText)
                                )
                                view.dispatch(tr)
                                return true
                            }
                        }

                        // 2. 中英文自动加空格
                        if (extensionOptions.autoSpacing && text.length === 1) {
                            if (needsAutoSpacing(textBefore, text)) {
                                const tr = state.tr.insertText(' ' + text, from, to)
                                view.dispatch(tr)
                                return true
                            }
                        }

                        return false
                    },
                },
            }),
        ]
    },
})
