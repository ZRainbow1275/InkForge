import { describe, expect, it } from 'vitest'

import FILE_MANAGER_SOURCE from './FileManager.vue?raw'
import TAG_BADGE_SOURCE from '../tag-system/TagBadge.vue?raw'
import TAG_BROWSER_SOURCE from '../tag-system/TagBrowser.vue?raw'
import TAG_INPUT_SOURCE from '../tag-system/TagInput.vue?raw'
import EDITOR_STORE_SOURCE from '../../stores/editor.ts?raw'

function templateOf(source: string): string {
  return source.slice(source.indexOf('<template>'), source.indexOf('<style'))
}

describe('Workstation manager information architecture', () => {
  it('keeps the folder tree as the only file presentation', () => {
    const template = templateOf(FILE_MANAGER_SOURCE)

    expect(FILE_MANAGER_SOURCE).toContain("const FILE_MANAGER_VIEW_MODES: FileManagerViewMode[] = ['tree']")
    expect(FILE_MANAGER_SOURCE).toMatch(/viewMode:\s*'tree'/)
    expect(template).not.toContain('fm-segmented')
    expect(template).not.toContain('平铺')
    expect(template).not.toContain('最近')
    expect(template).not.toContain('fm-quick-access')
    expect(template).toContain('class="fm-tree"')
    expect(template).toContain('class="fm-assets-section"')
    expect(template).toContain('data-file-category-id')
    expect(template).toContain('data-file-article-id')
  })

  it('renames article metadata and edited content through one queued authority path', () => {
    expect(FILE_MANAGER_SOURCE).toContain('await editorStore.renameArticleTitle(id, newTitle)')
    expect(FILE_MANAGER_SOURCE).not.toContain('await articleStore.updateArticle(id, { title: newTitle })')
    expect(EDITOR_STORE_SOURCE).toContain('async function renameArticleTitle(articleId: string, title: string): Promise<void>')
    expect(EDITOR_STORE_SOURCE).toContain('await contentRepository.findByArticleId(articleId)')
    expect(EDITOR_STORE_SOURCE).toContain("await updateContentUnlocked(content.id, { title: normalizedTitle })")
  })

  it('flattens tags into one scrollable manager surface without nested cards', () => {
    const template = templateOf(TAG_BROWSER_SOURCE)

    expect(template).toContain('class="tag-browser-scroll"')
    expect(template).toContain('class="tag-browser-group current-doc-section"')
    expect(template).not.toContain('class="tag-section')
    expect(TAG_BROWSER_SOURCE).toMatch(/\.tag-browser-scroll\s*\{[^}]*overflow-y:\s*auto;/)
    expect(TAG_BROWSER_SOURCE).toMatch(/\.tag-browser-group\s*\{[^}]*border-bottom:/)
    expect(TAG_BROWSER_SOURCE).not.toMatch(/\.tag-browser-group\s*\{[^}]*border-radius:/)
    expect(template).toContain('data-tag-manager-open')
    expect(template).toContain('data-tag-all-list')
    expect(template).toContain('data-tag-filter-apply')
  })

  it('uses compact desktop controls for tag creation and filtering', () => {
    const browserTemplate = templateOf(TAG_BROWSER_SOURCE)
    const inputTemplate = templateOf(TAG_INPUT_SOURCE)

    expect(browserTemplate).toContain('class="filter-mode-switch"')
    expect(browserTemplate).toContain('class="filter-actions"')
    expect(browserTemplate).toContain('任一匹配')
    expect(browserTemplate).toContain('全部匹配')
    expect(browserTemplate).toContain('应用筛选')
    expect(TAG_BROWSER_SOURCE).not.toContain('button:last-of-type')

    expect(inputTemplate).toContain('class="tag-query-field"')
    expect(inputTemplate).toContain('class="tag-input-actions"')
    expect(inputTemplate).toContain('class="tag-color-control"')
    expect(TAG_INPUT_SOURCE).toContain('ChevronDown')
    expect(TAG_INPUT_SOURCE).toMatch(/\.tag-color-control select\s*\{[^}]*appearance:\s*none;/)
    expect(TAG_INPUT_SOURCE).not.toMatch(/\.tag-input-row select,\s*\.tag-input-row button\s*\{[^}]*grid-column:\s*1 \/ -1;/)

    expect(TAG_BADGE_SOURCE).toContain('var(--bg-surface)')
    expect(TAG_BADGE_SOURCE).toContain('var(--text-primary)')
    expect(TAG_BADGE_SOURCE).not.toContain('#ffffff')
  })
})
