/**
 * 图片 URL 提取工具
 *
 * 从 Markdown 和 HTML 内容中提取所有图片引用。
 * 支持多种格式：标准 Markdown 语法、HTML img 标签。
 */

/**
 * 从 Markdown 内容中提取所有图片 URL
 *
 * 支持的格式：
 * - `![alt](url)` 标准 Markdown 图片
 * - `![alt](url "title")` 带 title 的图片
 * - `<img src="url">` 内联 HTML img 标签
 *
 * @param markdown Markdown 文本内容
 * @returns 去重后的图片 URL 数组
 */
export function extractImagesFromMarkdown(markdown: string): string[] {
    if (!markdown || typeof markdown !== 'string') {
        return []
    }

    const urls = new Set<string>()

    // 匹配 ![alt](url) 和 ![alt](url "title")
    const mdImageRegex = /!\[(?:[^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
    let match: RegExpExecArray | null
    while ((match = mdImageRegex.exec(markdown)) !== null) {
        const url = match[1].trim()
        if (url && isValidImageUrl(url)) {
            urls.add(url)
        }
    }

    // 匹配 <img src="url"> 或 <img src='url'>
    const htmlImgRegex = /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi
    while ((match = htmlImgRegex.exec(markdown)) !== null) {
        const url = match[1].trim()
        if (url && isValidImageUrl(url)) {
            urls.add(url)
        }
    }

    return Array.from(urls)
}

/**
 * 从 HTML 内容中提取所有图片 URL
 *
 * 使用 DOMParser 安全解析 HTML，提取所有 img 元素的 src 属性。
 *
 * @param html HTML 文本内容
 * @returns 去重后的图片 URL 数组
 */
export function extractImagesFromHtml(html: string): string[] {
    if (!html || typeof html !== 'string') {
        return []
    }

    const urls = new Set<string>()

    try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const images = doc.querySelectorAll('img')

        images.forEach((img) => {
            const src = img.getAttribute('src')
            if (src && isValidImageUrl(src)) {
                urls.add(src.trim())
            }
        })
    } catch {
        // DOMParser 解析失败，使用正则回退
        const imgRegex = /<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi
        let match: RegExpExecArray | null
        while ((match = imgRegex.exec(html)) !== null) {
            const url = match[1].trim()
            if (url && isValidImageUrl(url)) {
                urls.add(url)
            }
        }
    }

    return Array.from(urls)
}

/**
 * 验证图片 URL 是否有效
 * 排除空白、javascript: 协议等不安全/无效的 URL
 */
function isValidImageUrl(url: string): boolean {
    if (!url) return false
    const trimmed = url.trim()
    if (trimmed.length === 0) return false

    // 排除 data: 以外的危险协议
    const lowerUrl = trimmed.toLowerCase()
    if (lowerUrl.startsWith('javascript:')) return false
    if (lowerUrl.startsWith('vbscript:')) return false

    // 允许：http(s), 相对路径, data:image, //协议相对路径
    return true
}
