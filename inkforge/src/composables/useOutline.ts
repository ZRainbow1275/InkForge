import { ref, watch, onBeforeUnmount, type Ref, type ShallowRef, type ComputedRef } from 'vue'
import type { Editor } from '@tiptap/core'

// ═══════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════

/** 大纲项的标题等级 */
type HeadingLevel = 2 | 3 | 4

/** 大纲树节点 */
export interface OutlineItem {
  /** 基于文档位置生成的唯一标识 */
  id: string
  /** 标题等级 */
  level: HeadingLevel
  /** 标题文本内容 */
  text: string
  /** ProseMirror 文档中的位置 */
  position: number
  /** 子节点（H2 包含 H3，H3 包含 H4） */
  children: OutlineItem[]
}

/** 从文档中提取的扁平标题项 */
interface FlatOutlineItem {
  id: string
  level: HeadingLevel
  text: string
  position: number
}

// ═══════════════════════════════════════════════════════════════════
// Composable
// ═══════════════════════════════════════════════════════════════════

/**
 * 从 TipTap Editor 实例中提取文档大纲的可复用组合函数。
 *
 * 功能：
 * - 实时提取编辑器中的 H2/H3/H4 标题
 * - 构建层级树结构
 * - 追踪当前光标所在标题
 * - 提供跳转到指定标题的能力
 *
 * @param editorRef - TipTap Editor 实例的响应式引用（可能为 undefined）
 */
export function useOutline(editorRef: Ref<Editor | undefined> | ShallowRef<Editor | undefined> | ComputedRef<Editor | undefined>) {
  const outline = ref<OutlineItem[]>([])
  const activeId = ref<string | null>(null)

  // 防抖定时器
  let updateTimer: ReturnType<typeof setTimeout> | null = null
  let selectionTimer: ReturnType<typeof setTimeout> | null = null

  // 事件解绑函数
  let unbindUpdate: (() => void) | null = null
  let unbindSelectionUpdate: (() => void) | null = null

  // ─────────────────────────────────────────────────────────────────
  // 核心逻辑
  // ─────────────────────────────────────────────────────────────────

  /**
   * 从编辑器文档中提取所有标题节点为扁平列表。
   */
  function extractFlatHeadings(editor: Editor): FlatOutlineItem[] {
    const items: FlatOutlineItem[] = []
    const doc = editor.state.doc

    doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const level = node.attrs.level as number
        // 只处理 H2-H4
        if (level >= 2 && level <= 4) {
          items.push({
            id: `heading-${pos}`,
            level: level as HeadingLevel,
            text: node.textContent,
            position: pos,
          })
        }
      }
      // 标题是块级节点，不需要递归其子节点来找更多标题
      // 但 descendants 自身会继续遍历，这里无需特殊返回
    })

    return items
  }

  /**
   * 将扁平标题列表转换为嵌套树结构。
   *
   * 算法：使用栈追踪当前层级路径。
   * - H2 总是作为顶层节点
   * - H3 挂载到最近的 H2 下
   * - H4 挂载到最近的 H3 下
   */
  function buildTree(items: FlatOutlineItem[]): OutlineItem[] {
    const roots: OutlineItem[] = []

    // 栈中维护当前路径上的节点引用，便于快速挂载子节点
    const stack: OutlineItem[] = []

    for (const item of items) {
      const node: OutlineItem = {
        id: item.id,
        level: item.level,
        text: item.text,
        position: item.position,
        children: [],
      }

      // 弹出栈中层级 >= 当前项的节点
      // 例如遇到 H3 时，弹出之前的 H3 和 H4，但保留 H2
      while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
        stack.pop()
      }

      if (stack.length === 0) {
        // 栈为空，作为顶层节点
        roots.push(node)
      } else {
        // 挂载到栈顶节点的 children
        stack[stack.length - 1].children.push(node)
      }

      stack.push(node)
    }

    return roots
  }

  /**
   * 从编辑器中提取大纲并更新响应式数据。
   */
  function extractOutline(): void {
    const editor = editorRef.value
    if (!editor || editor.isDestroyed) {
      outline.value = []
      return
    }

    const flatItems = extractFlatHeadings(editor)
    outline.value = buildTree(flatItems)
  }

  /**
   * 根据当前光标位置更新高亮的大纲项。
   *
   * 策略：找到光标位置之前（或所在）最近的标题节点。
   */
  function updateActiveItem(): void {
    const editor = editorRef.value
    if (!editor || editor.isDestroyed) {
      activeId.value = null
      return
    }

    const { from } = editor.state.selection
    let closestId: string | null = null
    let closestPos = -1

    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const level = node.attrs.level as number
        if (level >= 2 && level <= 4 && pos <= from && pos > closestPos) {
          closestPos = pos
          closestId = `heading-${pos}`
        }
      }
    })

    activeId.value = closestId
  }

  /**
   * 跳转到指定位置的标题，并将其滚动到可视区域。
   */
  function scrollToHeading(position: number): void {
    const editor = editorRef.value
    if (!editor || editor.isDestroyed) return

    // 将光标移动到目标标题开始处
    editor
      .chain()
      .focus()
      .setTextSelection(position)
      .scrollIntoView()
      .run()

    // 立即更新高亮
    activeId.value = `heading-${position}`
  }

  // ─────────────────────────────────────────────────────────────────
  // 防抖更新
  // ─────────────────────────────────────────────────────────────────

  function debouncedExtract(): void {
    if (updateTimer !== null) {
      clearTimeout(updateTimer)
    }
    updateTimer = setTimeout(() => {
      extractOutline()
      updateTimer = null
    }, 300)
  }

  function debouncedSelectionUpdate(): void {
    if (selectionTimer !== null) {
      clearTimeout(selectionTimer)
    }
    selectionTimer = setTimeout(() => {
      updateActiveItem()
      selectionTimer = null
    }, 100)
  }

  // ─────────────────────────────────────────────────────────────────
  // 事件绑定/解绑
  // ─────────────────────────────────────────────────────────────────

  function bindEditorEvents(editor: Editor): void {
    unbindEditorEvents()

    editor.on('update', debouncedExtract)
    editor.on('selectionUpdate', debouncedSelectionUpdate)

    unbindUpdate = () => editor.off('update', debouncedExtract)
    unbindSelectionUpdate = () => editor.off('selectionUpdate', debouncedSelectionUpdate)

    // 立即提取当前内容
    extractOutline()
    updateActiveItem()
  }

  function unbindEditorEvents(): void {
    unbindUpdate?.()
    unbindSelectionUpdate?.()
    unbindUpdate = null
    unbindSelectionUpdate = null
  }

  // ─────────────────────────────────────────────────────────────────
  // 生命周期
  // ─────────────────────────────────────────────────────────────────

  // 监听 editor ref 变化（编辑器可能延迟初始化）
  watch(
    () => editorRef.value,
    (newEditor, oldEditor) => {
      if (oldEditor && !oldEditor.isDestroyed) {
        unbindEditorEvents()
      }
      if (newEditor && !newEditor.isDestroyed) {
        bindEditorEvents(newEditor)
      } else {
        outline.value = []
        activeId.value = null
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    unbindEditorEvents()
    if (updateTimer !== null) {
      clearTimeout(updateTimer)
    }
    if (selectionTimer !== null) {
      clearTimeout(selectionTimer)
    }
  })

  return {
    /** 树状大纲数据 */
    outline,
    /** 当前高亮项 ID */
    activeId,
    /** 跳转到指定标题位置 */
    scrollToHeading,
  }
}
