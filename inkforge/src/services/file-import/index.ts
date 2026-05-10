/**
 * 文件导入服务
 *
 * 统一的外部文件导入入口。
 * 支持 Markdown (.md)、HTML (.html/.htm)、纯文本 (.txt) 三种格式。
 *
 * 导入流程：
 * 1. pickFiles() 选择文件
 * 2. 根据 MIME 类型/扩展名判断格式
 * 3. Markdown: 解析 frontmatter + 提取图片引用
 * 4. HTML: 使用 DOMParser 提取纯文本 + 图片
 * 5. TXT: 直接作为内容
 */

import { pickFiles, type FilePickerOptions } from '@/services/file-picker'
import { parseFrontmatter, filenameToTitle, type FrontmatterResult } from './frontmatter'
import { extractImagesFromMarkdown, extractImagesFromHtml } from './image-extractor'

// 重导出子模块类型，方便外部引用
export type { FrontmatterResult } from './frontmatter'
export type { FilePickerOptions } from '@/services/file-picker'

/** 文件源格式 */
export type SourceFormat = 'markdown' | 'html' | 'text'

/** 已识别但当前转换管道尚未支持的迁移格式 */
export type UnsupportedImportFormat = 'docx' | 'zip' | 'json' | 'bear' | 'unknown'

/** 格式检测结果 */
export interface ImportFormatDetection {
    fileName: string
    extension: string
    mimeType: string
    format: SourceFormat | UnsupportedImportFormat
    supported: boolean
    reason: string
}

/** 单个文件的导入结果 */
export interface ImportResult {
    /** 文章标题（优先 frontmatter.title，其次文件名推断） */
    title: string
    /** 正文内容（Markdown 去除 frontmatter 后的正文） */
    content: string
    /** 解析出的 frontmatter 元数据 */
    frontmatter: FrontmatterResult
    /** 从内容中提取的图片 URL 列表 */
    images: string[]
    /** 源文件格式 */
    sourceFormat: SourceFormat
    /** 原始文件名 */
    fileName: string
    /** 原始文件路径（仅 Tauri 环境） */
    filePath?: string
}

/** 批量导入的汇总结果 */
export interface ImportSummary {
    /** 成功导入的文件数 */
    success: number
    /** 失败的文件数 */
    failed: number
    /** 导入结果列表 */
    results: ImportResult[]
    /** 错误信息列表 */
    errors: string[]
    /** 因大小超限跳过的文件数 */
    skippedOversize: number
}

/** 单文件大小上限 (10 MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

function getFileExtension(fileName: string): string {
    const normalized = fileName.trim().toLowerCase()
    const lastDot = normalized.lastIndexOf('.')
    return lastDot >= 0 ? normalized.slice(lastDot + 1) : ''
}

function supportedDetection(
    fileName: string,
    mimeType: string,
    extension: string,
    format: SourceFormat,
    reason: string,
): ImportFormatDetection {
    return { fileName, mimeType, extension, format, supported: true, reason }
}

function unsupportedDetection(
    fileName: string,
    mimeType: string,
    extension: string,
    format: UnsupportedImportFormat,
    reason: string,
): ImportFormatDetection {
    return { fileName, mimeType, extension, format, supported: false, reason }
}

function isSourceFormat(format: SourceFormat | UnsupportedImportFormat): format is SourceFormat {
    return format === 'markdown' || format === 'html' || format === 'text'
}

/**
 * 根据 MIME 类型和文件名判断导入格式，并显式标记当前不支持的迁移格式。
 */
export function detectImportFormat(mimeType: string, fileName: string): ImportFormatDetection {
    const extension = getFileExtension(fileName)
    const normalizedMime = mimeType.toLowerCase()

    if (extension === 'md' || extension === 'markdown' || extension === 'mdx') {
        return supportedDetection(fileName, mimeType, extension, 'markdown', 'markdown-extension')
    }
    if (normalizedMime === 'text/markdown' || normalizedMime === 'text/x-markdown') {
        return supportedDetection(fileName, mimeType, extension, 'markdown', 'markdown-mime')
    }
    if (extension === 'html' || extension === 'htm' || normalizedMime === 'text/html') {
        return supportedDetection(fileName, mimeType, extension, 'html', 'html-extension-or-mime')
    }
    if (extension === 'txt' || (extension === '' && normalizedMime === 'text/plain')) {
        return supportedDetection(fileName, mimeType, extension, 'text', 'plain-text')
    }

    if (extension === 'docx') {
        return unsupportedDetection(fileName, mimeType, extension, 'docx', 'docx-converter-not-installed')
    }
    if (extension === 'zip') {
        return unsupportedDetection(fileName, mimeType, extension, 'zip', 'zip-workspace-import-not-implemented')
    }
    if (extension === 'json' || normalizedMime === 'application/json') {
        return unsupportedDetection(fileName, mimeType, extension, 'json', 'json-import-not-implemented')
    }
    if (extension === 'bear' || extension === 'bear2bk') {
        return unsupportedDetection(fileName, mimeType, extension, 'bear', 'bear-import-not-implemented')
    }

    return unsupportedDetection(fileName, mimeType, extension, 'unknown', 'unsupported-extension-or-mime')
}

export function getSupportedImportFormatOrThrow(mimeType: string, fileName: string): SourceFormat {
    const detection = detectImportFormat(mimeType, fileName)
    if (!detection.supported || !isSourceFormat(detection.format)) {
        throw new Error('不支持导入 ' + fileName + ': ' + detection.reason)
    }

    return detection.format
}

/**
 * 从 HTML 内容中提取纯文本
 * 使用 DOMParser 安全解析，提取 body 内文本
 */
function extractTextFromHtml(html: string): string {
    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')

        // 移除 script 和 style 标签
        doc.querySelectorAll('script, style').forEach(el => el.remove())

        // 提取 body 文本内容
        return doc.body?.textContent?.trim() ?? ''
    } catch {
        // DOMParser 不可用，使用简单正则清除标签
        return html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, '')
            .trim()
    }
}

/**
 * 从 HTML 中提取标题
 * 优先 <title>，其次 <h1>
 */
function extractTitleFromHtml(html: string): string | null {
    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')

        // 优先 <title>
        const title = doc.querySelector('title')?.textContent?.trim()
        if (title) return title

        // 其次 <h1>
        const h1 = doc.querySelector('h1')?.textContent?.trim()
        if (h1) return h1

        return null
    } catch {
        // 正则回退
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        if (titleMatch) return titleMatch[1].trim()
        const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
        if (h1Match) return h1Match[1].trim()
        return null
    }
}

/**
 * 处理单个文件导入
 */
function processFile(
    content: string,
    fileName: string,
    mimeType: string,
    filePath?: string
): ImportResult {
    const sourceFormat = getSupportedImportFormatOrThrow(mimeType, fileName)

    switch (sourceFormat) {
        case 'markdown': {
            const parsed = parseFrontmatter(content)
            const images = extractImagesFromMarkdown(parsed.content)
            const title = (parsed.frontmatter.title as string) || filenameToTitle(fileName)

            return {
                title,
                content: parsed.content,
                frontmatter: parsed.frontmatter,
                images,
                sourceFormat,
                fileName,
                filePath,
            }
        }

        case 'html': {
            const textContent = extractTextFromHtml(content)
            const images = extractImagesFromHtml(content)
            const title = extractTitleFromHtml(content) || filenameToTitle(fileName)

            return {
                title,
                content: textContent,
                frontmatter: {},
                images,
                sourceFormat,
                fileName,
                filePath,
            }
        }

        case 'text':
        default: {
            // 纯文本：第一行非空行作为标题候选
            const lines = content.split('\n').filter(l => l.trim().length > 0)
            const firstLine = lines[0]?.trim() ?? ''
            const title = firstLine.length > 0 && firstLine.length <= 100
                ? firstLine
                : filenameToTitle(fileName)

            return {
                title,
                content,
                frontmatter: {},
                images: [],
                sourceFormat,
                fileName,
                filePath,
            }
        }
    }
}

/**
 * 导入文件
 *
 * 打开文件选择对话框，用户选择文件后解析并返回导入结果。
 * 用户取消选择时返回空 results。
 *
 * @param options 文件选择配置（可选）
 * @returns 导入汇总结果
 */
export async function importFiles(options?: FilePickerOptions): Promise<ImportSummary> {
    const summary: ImportSummary = {
        success: 0,
        failed: 0,
        results: [],
        errors: [],
        skippedOversize: 0,
    }

    const files = await pickFiles({
        accept: ['text/markdown', 'text/html', 'text/plain'],
        multiple: true,
        title: '导入文件',
        ...options,
    })

    if (files.length === 0) {
        return summary
    }

    for (const file of files) {
        // 文件大小保护: 超过 10MB 的文件跳过并记录警告
        if (file.size > MAX_FILE_SIZE_BYTES) {
            summary.skippedOversize++
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
            summary.errors.push(
                `跳过 ${file.name}: 文件过大 (${sizeMB} MB)，上限为 ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`
            )
            continue
        }

        const detection = detectImportFormat(file.mimeType, file.name)
        if (!detection.supported) {
            summary.failed++
            summary.errors.push('不支持导入 ' + file.name + ': ' + detection.reason)
            continue
        }

        try {
            const result = processFile(file.content, file.name, file.mimeType, file.path)
            summary.results.push(result)
            summary.success++
        } catch (err) {
            summary.failed++
            const msg = err instanceof Error ? err.message : String(err)
            summary.errors.push(`导入失败 ${file.name}: ${msg}`)
        }
    }

    return summary
}
