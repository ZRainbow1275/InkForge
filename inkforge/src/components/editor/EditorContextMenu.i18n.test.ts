import { describe, expect, it } from 'vitest'

import CONTEXT_MENU_SOURCE from './EditorContextMenu.vue?raw'

const REQUIRED_CHINESE_LABELS = [
  '剪切',
  '复制',
  '粘贴',
  '粗体',
  '斜体',
  '删除线',
  '行内代码',
  '清除格式',
  '链接',
  '图片',
  '表格',
  '分隔线',
  '查找与替换',
  '选中字符',
  '在独立窗口打开',
] as const

const FORBIDDEN_ENGLISH_LABELS = [
  '>Cut<',
  '>Copy<',
  '>Paste<',
  '>Bold<',
  '>Italic<',
  '>Strike<',
  '>Inline code<',
  '>Link<',
  '>Image<',
  '>Table<',
  '>Divider<',
  '>Find / Replace<',
  '>Selection chars:',
  '>Open in window<',
] as const

describe('EditorContextMenu Chinese product copy', () => {
  it('keeps every visible command label in Chinese without changing command bindings', () => {
    for (const label of REQUIRED_CHINESE_LABELS) {
      expect(CONTEXT_MENU_SOURCE).toContain(label)
    }
    for (const label of FORBIDDEN_ENGLISH_LABELS) {
      expect(CONTEXT_MENU_SOURCE).not.toContain(label)
    }

    expect(CONTEXT_MENU_SOURCE).toContain("document.execCommand('cut')")
    expect(CONTEXT_MENU_SOURCE).toContain("document.execCommand('copy')")
    expect(CONTEXT_MENU_SOURCE).toContain('navigator.clipboard.readText()')
    expect(CONTEXT_MENU_SOURCE).toContain('toggleBold()')
    expect(CONTEXT_MENU_SOURCE).toContain('insertTable({ rows: 3, cols: 3, withHeaderRow: true })')
  })
})
