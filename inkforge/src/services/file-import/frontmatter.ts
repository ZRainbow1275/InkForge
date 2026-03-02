/**
 * Markdown Frontmatter 解析器
 *
 * 不依赖外部 YAML 库，使用简单的逐行解析。
 * 支持 --- 和 +++ 分隔符格式。
 * 支持字符串、布尔值、数组（- item 格式）。
 */

/** Frontmatter 解析结果 */
export interface FrontmatterResult {
    title?: string
    description?: string
    tags?: string[]
    category?: string
    author?: string
    date?: string
    /** 其他自定义字段 */
    [key: string]: unknown
}

/** parseFrontmatter 返回值 */
export interface ParsedFrontmatter {
    /** 解析出的 frontmatter 元数据 */
    frontmatter: FrontmatterResult
    /** 去除 frontmatter 后的正文内容 */
    content: string
}

/**
 * 解析单个 YAML 值
 * 支持：字符串（含引号包裹）、布尔值、数字、null
 */
function parseScalarValue(raw: string): string | boolean | number | null {
    const trimmed = raw.trim()

    // 空值
    if (trimmed === '' || trimmed === 'null' || trimmed === '~') {
        return null
    }

    // 布尔值
    if (trimmed === 'true' || trimmed === 'True' || trimmed === 'TRUE') {
        return true
    }
    if (trimmed === 'false' || trimmed === 'False' || trimmed === 'FALSE') {
        return false
    }

    // 引号包裹的字符串（去除引号）
    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1)
    }

    // 数字
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed)
    }

    // 原始字符串
    return trimmed
}

/**
 * 解析内联数组格式 [item1, item2, item3]
 */
function parseInlineArray(raw: string): string[] | null {
    const trimmed = raw.trim()
    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
        return null
    }
    const inner = trimmed.slice(1, -1).trim()
    if (inner === '') return []
    return inner.split(',').map(item => {
        const s = item.trim()
        // 去除引号
        if (
            (s.startsWith('"') && s.endsWith('"')) ||
            (s.startsWith("'") && s.endsWith("'"))
        ) {
            return s.slice(1, -1)
        }
        return s
    })
}

/**
 * 解析 Markdown 文件的 frontmatter
 *
 * 支持 `---` 和 `+++` 分隔符。
 * 使用逐行解析代替 YAML 库，零外部依赖。
 *
 * @param markdown 完整的 Markdown 文件内容
 * @returns 解析结果，包含 frontmatter 对象和去除 frontmatter 后的正文
 *
 * @example
 * ```
 * const result = parseFrontmatter(`---
 * title: My Article
 * tags:
 *   - vue
 *   - typescript
 * ---
 * # Hello World
 * `)
 * // result.frontmatter.title === 'My Article'
 * // result.frontmatter.tags === ['vue', 'typescript']
 * // result.content === '# Hello World\n'
 * ```
 */
export function parseFrontmatter(markdown: string): ParsedFrontmatter {
    const emptyResult: ParsedFrontmatter = {
        frontmatter: {},
        content: markdown,
    }

    if (!markdown || typeof markdown !== 'string') {
        return emptyResult
    }

    // 检测分隔符类型
    const lines = markdown.split('\n')
    const firstLine = lines[0]?.trim()

    let delimiter: string | null = null
    if (firstLine === '---') {
        delimiter = '---'
    } else if (firstLine === '+++') {
        delimiter = '+++'
    }

    if (!delimiter) {
        return emptyResult
    }

    // 查找结束分隔符
    let endIndex = -1
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === delimiter) {
            endIndex = i
            break
        }
    }

    // 未找到结束分隔符，视为无 frontmatter
    if (endIndex === -1) {
        return emptyResult
    }

    // 提取 frontmatter 行（不含分隔符）
    const fmLines = lines.slice(1, endIndex)
    // 提取正文（跳过结束分隔符后的空行）
    let contentStartIndex = endIndex + 1
    while (contentStartIndex < lines.length && lines[contentStartIndex].trim() === '') {
        contentStartIndex++
    }
    const content = lines.slice(contentStartIndex).join('\n')

    // 逐行解析 key: value
    const frontmatter: FrontmatterResult = {}
    let currentKey: string | null = null
    let currentArray: string[] | null = null

    for (const line of fmLines) {
        // 跳过注释和空行
        if (line.trim() === '' || line.trim().startsWith('#')) {
            continue
        }

        // 检测列表项（以 - 开头，属于当前 key 的数组值）
        const listItemMatch = line.match(/^\s+- (.+)$/)
        if (listItemMatch && currentKey) {
            if (!currentArray) {
                currentArray = []
            }
            const value = parseScalarValue(listItemMatch[1])
            currentArray.push(String(value ?? ''))
            continue
        }

        // 如果之前在收集数组，保存它
        if (currentKey && currentArray) {
            frontmatter[currentKey] = currentArray
            currentArray = null
        }

        // 解析 key: value 对
        const kvMatch = line.match(/^([a-zA-Z_][\w-]*)\s*:\s*(.*)$/)
        if (kvMatch) {
            currentKey = kvMatch[1]
            const rawValue = kvMatch[2].trim()

            // 值为空，可能后续是列表
            if (rawValue === '') {
                // 等待下一行判断是否是列表
                continue
            }

            // 检查内联数组 [a, b, c]
            const inlineArr = parseInlineArray(rawValue)
            if (inlineArr !== null) {
                frontmatter[currentKey] = inlineArr
                currentKey = null
                continue
            }

            // 标量值
            frontmatter[currentKey] = parseScalarValue(rawValue)
            currentKey = null
        }
    }

    // 处理最后一个 key 的数组
    if (currentKey && currentArray) {
        frontmatter[currentKey] = currentArray
    }

    return { frontmatter, content }
}

/**
 * 从文件名生成标题
 * 去除扩展名，将 - 和 _ 替换为空格
 */
export function filenameToTitle(filename: string): string {
    return filename
        .replace(/\.(md|markdown|mdx|html|htm|txt)$/i, '')
        .replace(/[-_]/g, ' ')
        .trim()
}
