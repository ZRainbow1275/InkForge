/**
 * 文本统计 Composable
 * 从编辑器内容中提取实时统计信息
 */

import { ref, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { Editor } from '@tiptap/core'
import {
    isLikelyHtmlContent,
    serializeHtmlToMarkdown,
} from '@/extensions/TyporaMode'

// ═══════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════

/** 基础统计 */
export interface TextStats {
    /** 总字数（中文字符 + 英文单词） */
    wordCount: number
    /** 中文字数 */
    chineseChars: number
    /** 英文单词数 */
    englishWords: number
    /** 标点符号数 */
    punctuationCount: number
    /** 句子数 */
    sentenceCount: number
    /** 段落数 */
    paragraphCount: number
    /** 标题数（H2/H3/H4） */
    headingCount: number
    /** 链接数 */
    linkCount: number
    /** 图片数 */
    imageCount: number
    /** 预计阅读时间（分钟） */
    readingTime: number
}

/** 可读性评分 */
export interface ReadabilityScore {
    /** 总分（0-100） */
    score: number
    /** 等级 */
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    /** 改进建议 */
    suggestions: string[]
}

/** 光标位置 */
export interface CursorPosition {
    line: number
    column: number
}

export interface WritingWindowEntry {
    rawContent?: string | null
    updatedAt?: Date | string | null
    createdAt?: Date | string | null
}

export interface WritingWindowStats {
    todayWords: number
    weeklyWords: number
    todayEntries: number
    weeklyEntries: number
    dayStart: Date
    weekStart: Date
}

export interface WritingGoalProgress {
    documentTarget?: number
    dailyTarget?: number
    weeklyTarget?: number
    currentDocumentWords: number
    todayWords: number
    weeklyWords: number
    documentPercent?: number
    dailyPercent?: number
    weeklyPercent?: number
}

// ═══════════════════════════════════════════════════════════════════
// 统计计算
// ═══════════════════════════════════════════════════════════════════

/** 中文字符正则 */
const CHINESE_CHAR_RE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g

/** 英文单词正则 */
const ENGLISH_WORD_RE = /[a-zA-Z]+(?:[''][a-zA-Z]+)*/g

/** 标点符号正则 */
const PUNCTUATION_RE = /[，。！？、；：""''（）【】《》…—.,!?;:'"()[\]{}]/g

/** 句子结束正则 */
const SENTENCE_END_RE = /[。！？.!?]+/g

/** 阅读速度（中文字/分钟） */
const READING_SPEED = 400

function getNormalizedTextContent(rawContent: string): string {
    if (!rawContent) {
        return ''
    }

    return isLikelyHtmlContent(rawContent)
        ? serializeHtmlToMarkdown(rawContent)
        : rawContent
}

function stripMarkdownForPreview(text: string): string {
    if (!text) {
        return ''
    }

    let normalized = text
    normalized = normalized.replace(/```[\s\S]*?```/g, ' ')
    normalized = normalized.replace(/`([^`]+)`/g, '$1')
    normalized = normalized.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    normalized = normalized.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    normalized = normalized.replace(/^#{1,6}\s+/gm, '')
    normalized = normalized.replace(/\*\*(.+?)\*\*/g, '$1')
    normalized = normalized.replace(/__(.+?)__/g, '$1')
    normalized = normalized.replace(/\*(.+?)\*/g, '$1')
    normalized = normalized.replace(/_(.+?)_/g, '$1')
    normalized = normalized.replace(/~~(.+?)~~/g, '$1')
    normalized = normalized.replace(/^[\s]*[-*+]\s+/gm, '')
    normalized = normalized.replace(/^[\s]*\d+\.\s+/gm, '')
    normalized = normalized.replace(/^>\s*/gm, '')
    normalized = normalized.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, ' ')
    normalized = normalized.replace(/^\|[-: |]+\|$/gm, ' ')
    normalized = normalized.replace(/\|/g, ' ')
    normalized = normalized.replace(/<[^>]+>/g, ' ')
    normalized = normalized.replace(/\s*\n\s*/g, ' ')
    normalized = normalized.replace(/\s{2,}/g, ' ')
    return normalized.trim()
}

function getReferenceDate(value: Date | string | null | undefined): Date | null {
    if (!value) {
        return null
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value
    }

    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

function getDayStart(now: Date): Date {
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    return dayStart
}

function getWeekStart(now: Date): Date {
    const weekStart = getDayStart(now)
    const day = weekStart.getDay()
    const offset = day === 0 ? 6 : day - 1
    weekStart.setDate(weekStart.getDate() - offset)
    return weekStart
}

/**
 * 计算纯文本统计
 */
export function computeTextStats(text: string, html: string): TextStats {
    // 中文字符
    const chineseMatches = text.match(CHINESE_CHAR_RE)
    const chineseChars = chineseMatches ? chineseMatches.length : 0

    // 英文单词
    const englishMatches = text.match(ENGLISH_WORD_RE)
    const englishWords = englishMatches ? englishMatches.length : 0

    // 标点
    const punctMatches = text.match(PUNCTUATION_RE)
    const punctuationCount = punctMatches ? punctMatches.length : 0

    // 句子（按句末标点分割）
    const sentenceMatches = text.match(SENTENCE_END_RE)
    const sentenceCount = sentenceMatches ? sentenceMatches.length : Math.ceil(text.length / 40) || 0

    // 段落（按连续换行分割）
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
    const paragraphCount = paragraphs.length || (text.trim().length > 0 ? 1 : 0)

    // 标题（从 HTML 中计数）
    const headingMatches = html.match(/<h[2-4][^>]*>/gi)
    const headingCount = headingMatches ? headingMatches.length : 0

    // 链接
    const linkMatches = html.match(/<a\s[^>]*>/gi)
    const linkCount = linkMatches ? linkMatches.length : 0

    // 图片
    const imageMatches = html.match(/<img\s[^>]*>/gi)
    const imageCount = imageMatches ? imageMatches.length : 0

    // 总字数和阅读时间
    const wordCount = chineseChars + englishWords
    const readingTime = wordCount > 0 ? Math.max(1, Math.round(wordCount / READING_SPEED)) : 0

    return {
        wordCount,
        chineseChars,
        englishWords,
        punctuationCount,
        sentenceCount,
        paragraphCount,
        headingCount,
        linkCount,
        imageCount,
        readingTime,
    }
}

/**
 * 计算可读性评分
 */
export function computeReadabilityScore(stats: TextStats, text: string): ReadabilityScore {
    const suggestions: string[] = []
    let totalScore = 0

    // 1. 句子长度（25%）—— 平均每句 <40 字为优
    const avgSentenceLength = stats.sentenceCount > 0
        ? stats.wordCount / stats.sentenceCount
        : stats.wordCount
    let sentenceScore: number
    if (avgSentenceLength <= 20) sentenceScore = 100
    else if (avgSentenceLength <= 40) sentenceScore = 100 - (avgSentenceLength - 20) * 2.5
    else sentenceScore = Math.max(0, 50 - (avgSentenceLength - 40) * 2)
    totalScore += sentenceScore * 0.25

    if (avgSentenceLength > 40) {
        suggestions.push('句子平均长度过长，建议拆分长句')
    }

    // 2. 段落密度（25%）—— 平均每段 <200 字为优
    const avgParagraphLength = stats.paragraphCount > 0
        ? stats.wordCount / stats.paragraphCount
        : stats.wordCount
    let paragraphScore: number
    if (avgParagraphLength <= 100) paragraphScore = 100
    else if (avgParagraphLength <= 200) paragraphScore = 100 - (avgParagraphLength - 100)
    else paragraphScore = Math.max(0, 50 - (avgParagraphLength - 200) * 0.5)
    totalScore += paragraphScore * 0.25

    if (avgParagraphLength > 200) {
        suggestions.push('段落偏长，建议适当分段提升阅读体验')
    }

    // 3. 标题频率（20%）—— 每 300-500 字一个标题
    const wordsPerHeading = stats.headingCount > 0
        ? stats.wordCount / stats.headingCount
        : stats.wordCount
    let headingScore: number
    if (stats.wordCount < 100) {
        headingScore = 80 // 短文不强制要求标题
    } else if (wordsPerHeading >= 200 && wordsPerHeading <= 600) {
        headingScore = 100
    } else if (wordsPerHeading < 200) {
        headingScore = 70 // 标题过密
    } else {
        headingScore = Math.max(0, 100 - (wordsPerHeading - 600) * 0.1)
    }
    totalScore += headingScore * 0.20

    if (stats.wordCount > 300 && stats.headingCount === 0) {
        suggestions.push('缺少标题结构，建议添加二级标题')
    }

    // 4. 引用密度（15%）
    const quoteMatches = text.match(/[>"「『]/g)
    const quoteCount = quoteMatches ? quoteMatches.length : 0
    const quotesPerThousand = stats.wordCount > 0 ? (quoteCount / stats.wordCount) * 1000 : 0
    let quoteScore: number
    if (quotesPerThousand >= 1 && quotesPerThousand <= 5) quoteScore = 100
    else if (quotesPerThousand < 1) quoteScore = 60
    else quoteScore = Math.max(40, 100 - (quotesPerThousand - 5) * 10)
    totalScore += quoteScore * 0.15

    // 5. 列表使用（15%）
    const listCount = (text.match(/^[\s]*[-*]\s/gm) || []).length +
        (text.match(/^[\s]*\d+\.\s/gm) || []).length
    let listScore: number
    if (stats.wordCount < 200) {
        listScore = 80
    } else if (listCount >= 1 && listCount <= 10) {
        listScore = 100
    } else if (listCount === 0) {
        listScore = 50
    } else {
        listScore = Math.max(40, 100 - (listCount - 10) * 5)
    }
    totalScore += listScore * 0.15

    // 确定等级
    const score = Math.round(totalScore)
    let grade: ReadabilityScore['grade']
    if (score >= 85) grade = 'A'
    else if (score >= 70) grade = 'B'
    else if (score >= 55) grade = 'C'
    else if (score >= 40) grade = 'D'
    else grade = 'F'

    return { score, grade, suggestions }
}

export function computeContentWordCount(rawContent: string): number {
    const normalizedText = getNormalizedTextContent(rawContent)
    return computeTextStats(normalizedText, '').wordCount
}

export function extractContentPreviewText(rawContent: string, maxLength = 120): string {
    const plainText = stripMarkdownForPreview(getNormalizedTextContent(rawContent))
    if (plainText.length <= maxLength) {
        return plainText
    }

    return `${plainText.slice(0, maxLength).trim()}...`
}

export function computeWritingWindowStats(
    entries: readonly WritingWindowEntry[],
    now: Date = new Date(),
): WritingWindowStats {
    const dayStart = getDayStart(now)
    const weekStart = getWeekStart(now)

    let todayWords = 0
    let weeklyWords = 0
    let todayEntries = 0
    let weeklyEntries = 0

    for (const entry of entries) {
        const referenceDate = getReferenceDate(entry.updatedAt ?? entry.createdAt)
        if (!referenceDate) {
            continue
        }

        const wordCount = computeContentWordCount(entry.rawContent ?? '')

        if (referenceDate >= dayStart) {
            todayWords += wordCount
            todayEntries += 1
        }

        if (referenceDate >= weekStart) {
            weeklyWords += wordCount
            weeklyEntries += 1
        }
    }

    return {
        todayWords,
        weeklyWords,
        todayEntries,
        weeklyEntries,
        dayStart,
        weekStart,
    }
}

// ═══════════════════════════════════════════════════════════════════
// Composable
// ═══════════════════════════════════════════════════════════════════

/**
 * 文本统计 Composable
 * @param editor - TipTap Editor 实例的 Ref
 * @param debounceMs - 防抖时间（默认 300ms）
 */
export function useTextStats(
    editor: Ref<Editor | undefined> | ComputedRef<Editor | undefined>,
    debounceMs: number = 300
) {
    const stats = ref<TextStats>({
        wordCount: 0,
        chineseChars: 0,
        englishWords: 0,
        punctuationCount: 0,
        sentenceCount: 0,
        paragraphCount: 0,
        headingCount: 0,
        linkCount: 0,
        imageCount: 0,
        readingTime: 0,
    })

    const readability = ref<ReadabilityScore>({
        score: 0,
        grade: 'F',
        suggestions: [],
    })

    const cursor = ref<CursorPosition>({ line: 1, column: 1 })

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    function updateStats(): void {
        const ed = editor.value
        if (!ed) return

        const text = ed.getText()
        const html = ed.getHTML()

        stats.value = computeTextStats(text, html)
        readability.value = computeReadabilityScore(stats.value, text)
    }

    function updateCursor(): void {
        const ed = editor.value
        if (!ed) return

        const { from } = ed.state.selection
        const doc = ed.state.doc

        // 计算行号和列号
        let line = 1
        let column = 1

        doc.descendants((node, nodePos) => {
            if (nodePos >= from) return false

            if (node.isBlock && nodePos > 0) {
                line++
                column = 1
            }

            if (node.isText) {
                const textLen = node.text?.length || 0
                const endPos = nodePos + textLen
                if (from >= nodePos && from <= endPos) {
                    column = from - nodePos + 1
                    return false
                }
            }

            return true
        })

        cursor.value = { line, column }
    }

    function debouncedUpdate(): void {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            updateStats()
            updateCursor()
        }, debounceMs)
    }

    // 监听 editor 变化（含旧编辑器事件解绑）
    watch(editor, (newEditor, oldEditor) => {
        // 解绑旧编辑器事件，防止内存泄漏
        if (oldEditor) {
            oldEditor.off('update', debouncedUpdate)
            oldEditor.off('selectionUpdate', updateCursor)
        }
        if (newEditor) {
            newEditor.on('update', debouncedUpdate)
            newEditor.on('selectionUpdate', updateCursor)
            // 初始统计
            updateStats()
            updateCursor()
        }
    }, { immediate: true })

    // 组件卸载时清理所有资源
    onUnmounted(() => {
        // 清理防抖定时器
        if (debounceTimer) {
            clearTimeout(debounceTimer)
            debounceTimer = null
        }
        // 解绑当前编辑器事件
        const ed = editor.value
        if (ed) {
            ed.off('update', debouncedUpdate)
            ed.off('selectionUpdate', updateCursor)
        }
    })

    return {
        stats,
        readability,
        cursor,
        /** 手动触发刷新 */
        refresh: updateStats,
    }
}
