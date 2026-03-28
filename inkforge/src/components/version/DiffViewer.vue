<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DiffLine } from '@/composables/useVersionManager'
import { annotateDiffLines, computeChunkedDiff, computeDiffStats, type AnnotatedDiffLine } from '@/utils/diff'

interface DiffViewerProps {
    lines: DiffLine[]
    mode: 'unified' | 'side-by-side'
    contextLines?: number
    showLineNumbers?: boolean
    syntaxHighlight?: boolean
    maxHeight?: number
}

interface DiffViewerEmits {
    (e: 'line-click', lineNumber: number, type: DiffLine['type']): void
}

const props = withDefaults(defineProps<DiffViewerProps>(), {
    contextLines: 3,
    showLineNumbers: true,
    syntaxHighlight: false,
    maxHeight: 420,
})

const emit = defineEmits<DiffViewerEmits>()

const leftPanelRef = ref<HTMLElement | null>(null)
const rightPanelRef = ref<HTMLElement | null>(null)
const isSyncing = ref(false)

const stats = computed(() => computeDiffStats(props.lines))
const annotatedLines = computed(() => annotateDiffLines(props.lines))

const noDiff = computed(() => {
    return stats.value.additions === 0 && stats.value.deletions === 0
})

const chunkedLines = computed(() => {
    return computeChunkedDiff(props.lines, props.contextLines).map((chunk) => ({
        ...chunk,
        annotatedLines: annotatedLines.value.slice(chunk.startIndex, chunk.endIndex + 1),
    }))
})

interface SideBySideRow {
    left: AnnotatedDiffLine | null
    right: AnnotatedDiffLine | null
}

const sideBySideRows = computed<SideBySideRow[]>(() => {
    const rows: SideBySideRow[] = []
    const source = annotatedLines.value
    let index = 0

    while (index < source.length) {
        const current = source[index]

        if (current.type === 'unchanged') {
            rows.push({ left: current, right: current })
            index += 1
            continue
        }

        const removed: AnnotatedDiffLine[] = []
        const added: AnnotatedDiffLine[] = []

        while (index < source.length && source[index].type !== 'unchanged') {
            if (source[index].type === 'removed') {
                removed.push(source[index])
            } else if (source[index].type === 'added') {
                added.push(source[index])
            }
            index += 1
        }

        const rowCount = Math.max(removed.length, added.length)
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
            rows.push({
                left: removed[rowIndex] ?? null,
                right: added[rowIndex] ?? null,
            })
        }
    }

    return rows
})

const viewerBodyStyle = computed(() => ({
    maxHeight: `${props.maxHeight}px`,
}))

function handleLineClick(line: AnnotatedDiffLine | null): void {
    if (!line) return

    const lineNumber = line.newLineNumber ?? line.oldLineNumber
    if (!lineNumber) return

    emit('line-click', lineNumber, line.type)
}

function syncScroll(source: 'left' | 'right', scrollTop: number): void {
    const target = source === 'left' ? rightPanelRef.value : leftPanelRef.value
    if (!target || isSyncing.value) return

    isSyncing.value = true
    target.scrollTop = scrollTop

    requestAnimationFrame(() => {
        isSyncing.value = false
    })
}

function handlePanelScroll(source: 'left' | 'right', event: Event): void {
    const target = event.target as HTMLElement | null
    if (!target) return
    syncScroll(source, target.scrollTop)
}

function getUnifiedPrefix(line: AnnotatedDiffLine): string {
    if (line.type === 'added') return '+'
    if (line.type === 'removed') return '-'
    return ' '
}
</script>

<template>
  <div class="diff-viewer">
    <div class="diff-stats-bar">
      <span class="stat-additions">+{{ stats.additions }}</span>
      <span class="stat-deletions">-{{ stats.deletions }}</span>
      <span class="stat-unchanged">{{ stats.unchanged }} unchanged</span>
      <span class="stat-change-rate">变更率 {{ Math.round(stats.changeRate * 100) }}%</span>
    </div>

    <div
      v-if="noDiff"
      class="diff-empty"
      :style="viewerBodyStyle"
    >
      两个版本内容完全相同
    </div>

    <div
      v-else-if="mode === 'unified'"
      class="diff-unified"
      :style="viewerBodyStyle"
    >
      <div
        v-for="chunk in chunkedLines"
        :key="`${chunk.startIndex}-${chunk.endIndex}`"
        class="diff-chunk"
      >
        <div class="diff-row diff-row--chunk-header">
          <span class="diff-row__content">
            @@ -{{ chunk.oldStart }},{{ chunk.oldCount }} +{{ chunk.newStart }},{{ chunk.newCount }} @@
          </span>
        </div>

        <button
          v-for="line in chunk.annotatedLines"
          :key="`${line.oldLineNumber ?? 'n'}-${line.newLineNumber ?? 'n'}-${line.type}-${line.content}`"
          type="button"
          class="diff-row"
          :class="`diff-row--${line.type}`"
          @click="handleLineClick(line)"
        >
          <template v-if="showLineNumbers">
            <span class="diff-row__line-number">{{ line.oldLineNumber ?? '' }}</span>
            <span class="diff-row__line-number">{{ line.newLineNumber ?? '' }}</span>
          </template>
          <span class="diff-row__marker">{{ getUnifiedPrefix(line) }}</span>
          <span class="diff-row__content">{{ line.content || ' ' }}</span>
        </button>
      </div>
    </div>

    <div
      v-else
      class="diff-side"
      :style="viewerBodyStyle"
    >
      <div
        ref="leftPanelRef"
        class="diff-side__panel"
        @scroll="handlePanelScroll('left', $event)"
      >
        <div
          v-for="(row, index) in sideBySideRows"
          :key="`left-${index}`"
          class="diff-side__row"
        >
          <button
            type="button"
            class="diff-side__cell"
            :class="row.left ? `diff-side__cell--${row.left.type}` : 'diff-side__cell--empty'"
            @click="handleLineClick(row.left)"
          >
            <template v-if="showLineNumbers">
              <span class="diff-side__line-number">{{ row.left?.oldLineNumber ?? '' }}</span>
            </template>
            <span class="diff-side__content">{{ row.left?.content || ' ' }}</span>
          </button>
        </div>
      </div>

      <div
        ref="rightPanelRef"
        class="diff-side__panel"
        @scroll="handlePanelScroll('right', $event)"
      >
        <div
          v-for="(row, index) in sideBySideRows"
          :key="`right-${index}`"
          class="diff-side__row"
        >
          <button
            type="button"
            class="diff-side__cell"
            :class="row.right ? `diff-side__cell--${row.right.type}` : 'diff-side__cell--empty'"
            @click="handleLineClick(row.right)"
          >
            <template v-if="showLineNumbers">
              <span class="diff-side__line-number">{{ row.right?.newLineNumber ?? '' }}</span>
            </template>
            <span class="diff-side__content">{{ row.right?.content || ' ' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-viewer {
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.diff-stats-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: var(--bg-rice-paper, #FAFBFC);
    border-bottom: 1px solid var(--border, #E5E7EB);
    font-size: 12px;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
}

.stat-additions {
    color: var(--success, #2E7D32);
    font-weight: 700;
}

.stat-deletions {
    color: var(--error, #C62828);
    font-weight: 700;
}

.stat-unchanged {
    color: var(--text-muted, #90A4AE);
}

.stat-change-rate {
    margin-left: auto;
    color: var(--text-secondary, #607D8B);
}

.diff-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 16px;
    color: var(--text-muted, #90A4AE);
    font-size: 13px;
}

.diff-unified {
    overflow: auto;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 12px;
}

.diff-chunk + .diff-chunk {
    border-top: 1px solid rgba(21, 101, 192, 0.08);
}

.diff-row {
    display: flex;
    align-items: stretch;
    width: 100%;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: background 150ms ease;
}

.diff-row--chunk-header {
    cursor: default;
    background: rgba(21, 101, 192, 0.06);
    border-left-color: var(--accent-secondary, #1565C0);
    color: var(--accent-secondary, #1565C0);
    font-weight: 600;
}

.diff-row--added {
    background: rgba(46, 125, 50, 0.08);
    border-left-color: var(--success, #2E7D32);
}

.diff-row--removed {
    background: rgba(198, 40, 40, 0.08);
    border-left-color: var(--error, #C62828);
}

.diff-row:hover:not(.diff-row--chunk-header) {
    background: rgba(0, 0, 0, 0.03);
}

.diff-row--added:hover {
    background: rgba(46, 125, 50, 0.12);
}

.diff-row--removed:hover {
    background: rgba(198, 40, 40, 0.12);
}

.diff-row__line-number {
    width: 36px;
    flex-shrink: 0;
    padding: 7px 8px 7px 0;
    text-align: right;
    color: var(--text-muted, #90A4AE);
    opacity: 0.6;
}

.diff-row__marker {
    width: 24px;
    flex-shrink: 0;
    padding: 7px 0;
    text-align: center;
    color: var(--text-muted, #90A4AE);
    font-weight: 700;
}

.diff-row--added .diff-row__marker {
    color: var(--success, #2E7D32);
}

.diff-row--removed .diff-row__marker {
    color: var(--error, #C62828);
}

.diff-row__content {
    flex: 1;
    min-width: 0;
    padding: 7px 16px 7px 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-primary, #263238);
}

.diff-row--removed .diff-row__content {
    opacity: 0.72;
    text-decoration: line-through;
}

.diff-side {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    overflow: hidden;
    border-top: 1px solid var(--border, #E5E7EB);
}

.diff-side__panel {
    overflow: auto;
}

.diff-side__panel + .diff-side__panel {
    border-left: 1px solid var(--border, #E5E7EB);
}

.diff-side__row + .diff-side__row {
    border-top: 1px solid rgba(229, 231, 235, 0.6);
}

.diff-side__cell {
    display: flex;
    align-items: stretch;
    width: 100%;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    border-left: 3px solid transparent;
    transition: background 150ms ease;
}

.diff-side__cell--added {
    background: rgba(46, 125, 50, 0.08);
    border-left-color: var(--success, #2E7D32);
}

.diff-side__cell--removed {
    background: rgba(198, 40, 40, 0.08);
    border-left-color: var(--error, #C62828);
}

.diff-side__cell--empty {
    cursor: default;
    background: rgba(250, 251, 252, 0.5);
}

.diff-side__cell:hover:not(.diff-side__cell--empty) {
    background: rgba(0, 0, 0, 0.03);
}

.diff-side__cell--added:hover {
    background: rgba(46, 125, 50, 0.12);
}

.diff-side__cell--removed:hover {
    background: rgba(198, 40, 40, 0.12);
}

.diff-side__line-number {
    width: 36px;
    flex-shrink: 0;
    padding: 7px 8px 7px 0;
    text-align: right;
    color: var(--text-muted, #90A4AE);
    opacity: 0.6;
}

.diff-side__content {
    flex: 1;
    min-width: 0;
    padding: 7px 16px 7px 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-primary, #263238);
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    font-size: 12px;
}

.diff-side__cell--removed .diff-side__content {
    opacity: 0.72;
    text-decoration: line-through;
}
</style>
