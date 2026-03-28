import type { DiffLine } from '@/composables/useVersionManager'

export interface DiffChunk {
    oldStart: number
    oldCount: number
    newStart: number
    newCount: number
    startIndex: number
    endIndex: number
    lines: DiffLine[]
}

export interface DiffStats {
    additions: number
    deletions: number
    unchanged: number
    chunkCount: number
    totalLines: number
    changeRate: number
}

export interface AnnotatedDiffLine extends DiffLine {
    oldLineNumber: number | null
    newLineNumber: number | null
}

export function annotateDiffLines(lines: DiffLine[]): AnnotatedDiffLine[] {
    let oldLineNumber = 1
    let newLineNumber = 1

    return lines.map((line) => {
        if (line.type === 'added') {
            const annotated: AnnotatedDiffLine = {
                ...line,
                oldLineNumber: null,
                newLineNumber,
            }
            newLineNumber += 1
            return annotated
        }

        if (line.type === 'removed') {
            const annotated: AnnotatedDiffLine = {
                ...line,
                oldLineNumber,
                newLineNumber: null,
            }
            oldLineNumber += 1
            return annotated
        }

        const annotated: AnnotatedDiffLine = {
            ...line,
            oldLineNumber,
            newLineNumber,
        }
        oldLineNumber += 1
        newLineNumber += 1
        return annotated
    })
}

export function computeChunkedDiff(lines: DiffLine[], contextLines: number = 3): DiffChunk[] {
    const annotatedLines = annotateDiffLines(lines)
    const changeIndices = annotatedLines
        .map((line, index) => line.type === 'unchanged' ? -1 : index)
        .filter((index) => index >= 0)

    if (changeIndices.length === 0) return []

    const ranges: Array<{ start: number; end: number }> = []
    const lastIndex = annotatedLines.length - 1

    for (const index of changeIndices) {
        const start = Math.max(0, index - contextLines)
        const end = Math.min(lastIndex, index + contextLines)
        const previousRange = ranges[ranges.length - 1]

        if (!previousRange || start > previousRange.end + 1) {
            ranges.push({ start, end })
            continue
        }

        previousRange.end = Math.max(previousRange.end, end)
    }

    return ranges.map((range) => {
        const rangeLines = annotatedLines.slice(range.start, range.end + 1)
        const oldCount = rangeLines.filter((line) => line.oldLineNumber !== null).length
        const newCount = rangeLines.filter((line) => line.newLineNumber !== null).length

        return {
            oldStart: resolveChunkStart(annotatedLines, range.start, 'old'),
            oldCount,
            newStart: resolveChunkStart(annotatedLines, range.start, 'new'),
            newCount,
            startIndex: range.start,
            endIndex: range.end,
            lines: lines.slice(range.start, range.end + 1),
        }
    })
}

export function computeDiffStats(lines: DiffLine[]): DiffStats {
    let additions = 0
    let deletions = 0
    let unchanged = 0

    for (const line of lines) {
        switch (line.type) {
            case 'added':
                additions += 1
                break
            case 'removed':
                deletions += 1
                break
            case 'unchanged':
                unchanged += 1
                break
        }
    }

    const totalLines = lines.length
    const chunkCount = computeChunkedDiff(lines).length

    return {
        additions,
        deletions,
        unchanged,
        chunkCount,
        totalLines,
        changeRate: totalLines === 0 ? 0 : (additions + deletions) / totalLines,
    }
}

export function toUnifiedDiff(
    chunks: DiffChunk[],
    oldLabel: string = '旧版本',
    newLabel: string = '新版本'
): string {
    const header = [`--- ${oldLabel}`, `+++ ${newLabel}`]

    if (chunks.length === 0) {
        return header.join('\n')
    }

    const body = chunks.flatMap((chunk) => {
        const chunkHeader = `@@ -${chunk.oldStart},${chunk.oldCount} +${chunk.newStart},${chunk.newCount} @@`
        const chunkLines = chunk.lines.map((line) => {
            const prefix = line.type === 'added'
                ? '+'
                : line.type === 'removed'
                    ? '-'
                    : ' '
            return `${prefix}${line.content}`
        })
        return [chunkHeader, ...chunkLines]
    })

    return [...header, ...body].join('\n')
}

function resolveChunkStart(
    lines: AnnotatedDiffLine[],
    startIndex: number,
    side: 'old' | 'new'
): number {
    const key = side === 'old' ? 'oldLineNumber' : 'newLineNumber'
    const currentValue = lines[startIndex]?.[key]

    if (typeof currentValue === 'number') {
        return currentValue
    }

    for (let index = startIndex - 1; index >= 0; index -= 1) {
        const previousValue = lines[index]?.[key]
        if (typeof previousValue === 'number') {
            return previousValue + 1
        }
    }

    for (let index = startIndex + 1; index < lines.length; index += 1) {
        const nextValue = lines[index]?.[key]
        if (typeof nextValue === 'number') {
            return nextValue
        }
    }

    return 1
}
