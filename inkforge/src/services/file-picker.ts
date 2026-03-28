/**
 * 跨平台文件选择抽象层
 *
 * - Tauri: 使用 @tauri-apps/api/dialog + @tauri-apps/api/fs
 * - Web: 使用 input[type=file] + FileReader
 */

import { logger } from '@/services/error'
import { isTauriEnv } from '@/utils/platform'

/** 文件选择配置 */
export interface FilePickerOptions {
    /** MIME 类型过滤，如 ['text/markdown', 'text/plain', 'text/html'] */
    accept?: string[]
    /** 是否允许多选 */
    multiple?: boolean
    /** 对话框标题（仅 Tauri 环境生效） */
    title?: string
}

/** 已选择的文件 */
export interface PickedFile {
    /** 文件名 */
    name: string
    /** 文件路径（仅 Tauri 环境） */
    path?: string
    /** 文本内容 */
    content: string
    /** MIME 类型 */
    mimeType: string
    /** 文件大小（字节） */
    size: number
}

/**
 * 从文件名推断 MIME 类型
 * 当浏览器无法识别 .md 等扩展名时作为回退
 */
function inferMimeType(filename: string, browserType?: string): string {
    if (browserType && browserType !== 'application/octet-stream') {
        return browserType
    }
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'md':
        case 'markdown':
        case 'mdx':
            return 'text/markdown'
        case 'html':
        case 'htm':
            return 'text/html'
        case 'txt':
            return 'text/plain'
        default:
            return 'application/octet-stream'
    }
}

/** MIME 类型映射为 Tauri 文件对话框 extensions 过滤器 */
function mimeToExtensions(mimeTypes: string[]): { name: string; extensions: string[] }[] {
    const extMap: Record<string, string[]> = {
        'text/markdown': ['md', 'markdown', 'mdx'],
        'text/html': ['html', 'htm'],
        'text/plain': ['txt'],
    }
    const allExts: string[] = []
    for (const mime of mimeTypes) {
        const exts = extMap[mime]
        if (exts) {
            allExts.push(...exts)
        }
    }
    if (allExts.length === 0) {
        return [{ name: '所有文件', extensions: ['*'] }]
    }
    return [{ name: '支持的文件类型', extensions: allExts }]
}

/** MIME 类型转换为 HTML input[type=file] accept 属性 */
function mimeToAcceptString(mimeTypes: string[]): string {
    const extMap: Record<string, string[]> = {
        'text/markdown': ['.md', '.markdown', '.mdx'],
        'text/html': ['.html', '.htm'],
        'text/plain': ['.txt'],
    }
    const parts: string[] = []
    for (const mime of mimeTypes) {
        const exts = extMap[mime]
        if (exts) {
            parts.push(...exts)
        } else {
            parts.push(mime)
        }
    }
    return parts.join(',')
}

/**
 * 跨平台文件选择
 *
 * - Tauri: 使用原生文件对话框（@tauri-apps/api/dialog）
 * - Web: 使用浏览器 input[type=file]
 *
 * @param options 文件选择配置
 * @returns 已选择的文件列表（用户取消时返回空数组）
 */
export async function pickFiles(options: FilePickerOptions = {}): Promise<PickedFile[]> {
    if (isTauriEnv()) {
        return pickFilesTauri(options)
    }
    return pickFilesWeb(options)
}

/**
 * Tauri 环境：使用原生文件对话框
 * 动态导入 Tauri API，失败时自动回退到 Web 模式
 */
async function pickFilesTauri(options: FilePickerOptions): Promise<PickedFile[]> {
    try {
        const { open } = await import('@tauri-apps/api/dialog')
        const { readTextFile } = await import('@tauri-apps/api/fs')

        const filters = options.accept
            ? mimeToExtensions(options.accept)
            : [{ name: '文档文件', extensions: ['md', 'markdown', 'mdx', 'html', 'htm', 'txt'] }]

        const result = await open({
            multiple: options.multiple ?? true,
            filters,
            title: options.title ?? '选择文件',
        })

        if (!result) return []

        const paths = Array.isArray(result) ? result : [result]
        const files: PickedFile[] = []

        for (const filePath of paths) {
            try {
                const content = await readTextFile(filePath)
                const name = filePath.split(/[/\\]/).pop() ?? 'unknown'
                files.push({
                    name,
                    path: filePath,
                    content,
                    mimeType: inferMimeType(name),
                    size: new Blob([content]).size,
                })
            } catch (err) {
                // 单个文件读取失败不阻断其他文件
                logger.warn(`[FilePicker] 读取文件失败: ${filePath}`, { err })
            }
        }

        return files
    } catch {
        // Tauri API 不可用，回退到 Web 模式
        return pickFilesWeb(options)
    }
}

/**
 * Web 环境：使用浏览器文件选择器
 * 通过动态创建 input[type=file] 触发系统文件对话框
 */
function pickFilesWeb(options: FilePickerOptions): Promise<PickedFile[]> {
    return new Promise((resolve) => {
        // 防止 change / cancel 事件多次触发导致重复 resolve
        let resolved = false
        const safeResolve = (files: PickedFile[]) => {
            if (!resolved) {
                resolved = true
                resolve(files)
            }
        }

        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = options.multiple ?? true

        if (options.accept && options.accept.length > 0) {
            input.accept = mimeToAcceptString(options.accept)
        } else {
            input.accept = '.md,.markdown,.mdx,.html,.htm,.txt'
        }

        input.addEventListener('change', async () => {
            const fileList = input.files
            if (!fileList || fileList.length === 0) {
                safeResolve([])
                return
            }

            const files: PickedFile[] = []
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i]
                try {
                    const content = await file.text()
                    files.push({
                        name: file.name,
                        content,
                        mimeType: inferMimeType(file.name, file.type),
                        size: file.size,
                    })
                } catch (err) {
                    logger.warn(`[FilePicker] 读取文件失败: ${file.name}`, { err })
                }
            }

            safeResolve(files)
        })

        // 用户取消文件选择
        input.addEventListener('cancel', () => safeResolve([]))

        input.click()
    })
}
