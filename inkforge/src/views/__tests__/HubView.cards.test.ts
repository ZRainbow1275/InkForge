/**
 * @vitest-environment happy-dom
 *
 * Regression: Hub card redundancy elimination.
 *
 * The PRD (.trellis/tasks/05-26-redesign-hub-cards-eliminate-redundancy)
 * requires:
 *   1. card-new must no longer render the `new-metrics` block (drafts + streak
 *      duplicated 累计 stats).
 *   2. card-recent's todoArticlesForCard list must exclude the latestArticle
 *      so the hero article does not also appear in the “未完成” list below.
 *   3. Stats fields (字数 / 草稿 / 完成率 / 连续) must still live on card-stats
 *      so the 累计 card remains the single dashboard.
 *
 * @vue/test-utils is not installed in this project and HubView.vue boots
 * 6+ Pinia stores plus IndexedDB-backed services through onMounted, so a full
 * SFC mount is intentionally avoided. Instead this test combines:
 *   (a) Template source inspection of HubView.vue to pin the structural facts
 *       the PRD demanded (drives a real regression alarm when the markup
 *       changes back).
 *   (b) Behavioural re-execution of the same selection logic the SFC uses
 *       (latestArticle, unfinishedArticles, todoArticlesForCard) against
 *       hand-built Article datasets. The logic mirrors HubView.vue lines
 *       around the `latestArticle` / `todoArticlesForCard` computed and
 *       delegates to the real `@/core/lifecycle` helpers so a refactor
 *       affecting either side fails this test.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import { ARTICLE_STATUS } from '@/schemas/article'
import {
  getLifecycleContinuationPriority,
  isUnfinishedStatus,
} from '@/core/lifecycle'
import type { Article } from '@/types'
import { loadHubInspirationState, saveHubInspirationState } from '@/data/quotes'
// Vite ?raw suffix imports the file body as a string at build time, avoiding
// `node:fs` (which is not in the project's tsconfig `types` list).
import INSPIRATION_SETTINGS_SOURCE from '../../components/settings/InspirationSettingsPanel.vue?raw'
import TEMPLATE_MARKET_SOURCE from '../../components/hub/TemplateMarketGrid.vue?raw'
import HUB_VIEW_SOURCE from '../HubView.vue?raw'
import SETTINGS_VIEW_SOURCE from '../SettingsView.vue?raw'

// ---------------------------------------------------------------------------
// Behavioural mirror of HubView.vue computed
// ---------------------------------------------------------------------------

function compareByContinuationPriority(a: Article, b: Article): number {
  const priorityDiff = getLifecycleContinuationPriority(a.status) - getLifecycleContinuationPriority(b.status)
  if (priorityDiff !== 0) return priorityDiff
  return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
}

function pickLatestArticle(articles: Article[]): Article | null {
  if (articles.length === 0) return null
  return [...articles].sort((a, b) =>
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  )[0]
}

function buildUnfinished(articles: Article[]): Article[] {
  return [...articles]
    .filter(article => isUnfinishedStatus(article.status))
    .sort(compareByContinuationPriority)
}

function buildTodoForCard(articles: Article[]): Article[] {
  const latest = pickLatestArticle(articles)
  return buildUnfinished(articles)
    .filter(article => article.id !== latest?.id)
    .slice(0, 4)
}

// ---------------------------------------------------------------------------
// Fixture builder
// ---------------------------------------------------------------------------

type ArticleInput = {
  id: string
  status: Article['status']
  updatedAt: string
  createdAt?: string
  categoryId?: string | null
  title?: string
}

function makeArticle(partial: ArticleInput): Article {
  // The Zod TimestampSchema transforms to Date at runtime but the inferred
  // type is `Date & string` (a union with the input). Cast through unknown so
  // the test fixture compiles regardless of the inferred shape.
  return {
    id: partial.id,
    categoryId: partial.categoryId ?? null,
    sourceUrl: 'inkforge://test/' + partial.id,
    sourceName: 'test',
    title: partial.title ?? `Article ${partial.id}`,
    description: '',
    authors: [],
    rawContent: '',
    markdownSource: '',
    htmlCache: null,
    sourceHash: '',
    cacheVersion: 0,
    cacheGeneratedAt: null,
    links: [],
    images: [],
    score: 0,
    tags: [],
    status: partial.status,
    createdAt: new Date(partial.createdAt ?? partial.updatedAt),
    updatedAt: new Date(partial.updatedAt),
  } as unknown as Article
}

// ---------------------------------------------------------------------------
// Template invariants (structural assertions)
// ---------------------------------------------------------------------------

describe('HubView.vue — card redundancy invariants (template)', () => {
  it('does not render a `.new-metrics` block in card-new (草稿/连续 removed)', () => {
    expect(HUB_VIEW_SOURCE).not.toMatch(/class="new-metrics"/)
    expect(HUB_VIEW_SOURCE).not.toMatch(/class="new-metric"/)
    expect(HUB_VIEW_SOURCE).not.toMatch(/new-metric-label/)
    expect(HUB_VIEW_SOURCE).not.toMatch(/new-metric-value/)
  })

  it('keeps the four 累计 rows (字数 / 草稿 / 完成率 / 连续) on card-stats', () => {
    expect(HUB_VIEW_SOURCE).toMatch(/<span class="stats-row-label">字数<\/span>/)
    expect(HUB_VIEW_SOURCE).toMatch(/<span class="stats-row-label">草稿<\/span>/)
    expect(HUB_VIEW_SOURCE).toMatch(/<span class="stats-row-label">完成率<\/span>/)
    expect(HUB_VIEW_SOURCE).toMatch(/<span class="stats-row-label">连续<\/span>/)
  })

  it('filters latestArticle out of todoArticlesForCard in the computed source', () => {
    // The PRD requires the todo list to exclude the latestArticle so the same
    // article does not appear in both the hero and the “未完成” list.
    // Detect either inline-arrow filter or the explicit comparison the impl
    // uses (`a.id !== latestArticle?.id`).
    const filterPattern = /\.filter\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*\1\.id\s*!==\s*latestArticle(?:\.value)?\?\.id/
    expect(HUB_VIEW_SOURCE).toMatch(filterPattern)
  })

  it('keeps only the Start area and red FAB creation surfaces', () => {
    expect(HUB_VIEW_SOURCE).not.toContain('headerQuickActionTriggerRef')
    expect(HUB_VIEW_SOURCE).not.toContain('headerQuickActionTriggerId')
    expect(HUB_VIEW_SOURCE).not.toContain('recent-create-actions')
    expect(HUB_VIEW_SOURCE).not.toContain('class="hero-empty-actions"')
    expect(HUB_VIEW_SOURCE).not.toContain('@click="startNewProject"')
    expect(HUB_VIEW_SOURCE).not.toContain('@create-new="openTemplatePicker"')
    expect(TEMPLATE_MARKET_SOURCE).not.toContain("emit('create-new')")
    expect(TEMPLATE_MARKET_SOURCE).not.toContain('template-market-card--cta')
    expect(HUB_VIEW_SOURCE).toContain('class="new-actions"')
    expect(HUB_VIEW_SOURCE).toContain('class="quick-action-fab"')
  })

  it('renders 最近编辑 as a real card heading instead of a small eyebrow', () => {
    expect(HUB_VIEW_SOURCE).toContain('<h3 class="recent-label">')
    expect(HUB_VIEW_SOURCE).toMatch(/\.recent-label\s*\{[^}]*font-size:\s*18px;[^}]*font-weight:\s*700;/)
  })

  it('renders an anchored keyboard-operable search result surface', () => {
    expect(HUB_VIEW_SOURCE).toContain('class="header-search-results"')
    expect(HUB_VIEW_SOURCE).toContain('role="listbox"')
    expect(HUB_VIEW_SOURCE).toContain('@keydown.down.prevent="moveHeaderSearchSelection(1)"')
    expect(HUB_VIEW_SOURCE).toContain('@keydown.up.prevent="moveHeaderSearchSelection(-1)"')
    expect(HUB_VIEW_SOURCE).toContain('@keydown.enter.prevent="openActiveHeaderSearchResult"')
    expect(HUB_VIEW_SOURCE).not.toContain('class="search-box"')
  })

  it('keeps Ctrl/Cmd+F available even when focus starts inside an editable Hub control', () => {
    const keydownSource = HUB_VIEW_SOURCE.slice(
      HUB_VIEW_SOURCE.indexOf('function handleHubKeydown'),
      HUB_VIEW_SOURCE.indexOf('\nfunction goToSettings'),
    )
    const searchShortcutIndex = keydownSource.indexOf("if (primaryKey && normalizedKey === 'f'")
    const editableGuardIndex = keydownSource.indexOf('if (isEditableTarget(event.target))')

    expect(searchShortcutIndex).toBeGreaterThan(-1)
    expect(editableGuardIndex).toBeGreaterThan(-1)
    expect(searchShortcutIndex).toBeLessThan(editableGuardIndex)
  })

  it('closes a keyboard-focused result with Escape and restores the search input focus', () => {
    const keydownSource = HUB_VIEW_SOURCE.slice(
      HUB_VIEW_SOURCE.indexOf('function handleHubKeydown'),
      HUB_VIEW_SOURCE.indexOf('\nfunction goToSettings'),
    )
    const closeSource = HUB_VIEW_SOURCE.slice(
      HUB_VIEW_SOURCE.indexOf('function closeHeaderSearch'),
      HUB_VIEW_SOURCE.indexOf('\nfunction clearHeaderSearch'),
    )

    expect(keydownSource).toContain("headerSearchOpen.value && normalizedKey === 'escape'")
    expect(keydownSource).toContain('closeHeaderSearch(true)')
    expect(closeSource).toContain('restoreFocus = false')
    expect(closeSource).toContain('headerSearchInputRef.value?.focus()')
  })

  it('keeps Hub inspiration read-only while Settings owns local text and author editing', () => {
    expect(HUB_VIEW_SOURCE).toContain('class="inspiration-source-switch"')
    expect(HUB_VIEW_SOURCE).not.toContain('v-model="localInspiration.text"')
    expect(HUB_VIEW_SOURCE).not.toContain('v-model="localInspiration.author"')
    expect(HUB_VIEW_SOURCE).not.toContain('aria-label="编辑本地每日灵感"')
    expect(HUB_VIEW_SOURCE).toContain("goToSettings('editor', 'inspiration')")
    expect(HUB_VIEW_SOURCE).toContain("inspirationSaveFailed ? '来源保存失败' : '本地配置'")
    expect(SETTINGS_VIEW_SOURCE).toContain('data-settings-section="inspiration"')
    expect(SETTINGS_VIEW_SOURCE).toContain('<InspirationSettingsPanel />')
    expect(INSPIRATION_SETTINGS_SOURCE).toContain('v-model="localText"')
    expect(INSPIRATION_SETTINGS_SOURCE).toContain('v-model="localAuthor"')
    expect(INSPIRATION_SETTINGS_SOURCE).toContain('saveHubInspirationState(nextState)')
    expect(HUB_VIEW_SOURCE).not.toMatch(/^void generateAIInspiration\(\)$/m)
  })

  it('owns exactly one search focus ring on the shell, never on the inner input', () => {
    expect(HUB_VIEW_SOURCE).toMatch(/\.header-search-bar:focus-within\s*\{[^}]*border-color:\s*transparent;[^}]*box-shadow:\s*0 0 0 2px rgba\(211,\s*47,\s*47,\s*0\.82\);/)
    expect(HUB_VIEW_SOURCE).toContain('.header-search-bar.has-value:not(:focus-within)')
    expect(HUB_VIEW_SOURCE).toMatch(/\.header-search-input:focus,[\s\S]*?\.header-search-input:focus-visible\s*\{[^}]*border:\s*0 !important;[^}]*outline:\s*0 !important;[^}]*box-shadow:\s*none !important;/)
    expect(HUB_VIEW_SOURCE).not.toMatch(/\.header-search-bar\.has-value\s*\{/)
  })

  it('binds dashboard regions to the software route shell and releases fixed-screen clipping at constrained viewports', () => {
    expect(HUB_VIEW_SOURCE).toMatch(/\.hub-page\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;/)
    expect(HUB_VIEW_SOURCE).not.toMatch(/\.hub-page\s*\{[^}]*height:\s*100vh;/)
    expect(HUB_VIEW_SOURCE).toMatch(/\.hub-region\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*100%;/)
    expect(HUB_VIEW_SOURCE).toMatch(/grid-template-rows:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)\s+minmax\(180px,\s*0\.72fr\);/)
    expect(HUB_VIEW_SOURCE).toMatch(/@media \(max-width:\s*1200px\)\s*\{[\s\S]*?\.hub-region\s*\{[^}]*height:\s*auto;[^}]*overflow:\s*visible;/)
    expect(HUB_VIEW_SOURCE).toMatch(/@media \(max-width:\s*1200px\)\s*\{[\s\S]*?\.card-inspiration\s*\{[^}]*grid-column:\s*auto;[^}]*grid-row:\s*auto;/)
    expect(HUB_VIEW_SOURCE).toContain('@media (max-height: 820px) and (min-width: 1201px)')
  })

  it('uses the available software viewport when the article archive contains only one sparse row', () => {
    expect(HUB_VIEW_SOURCE).toContain(":class=\"{ 'is-sparse': displayArticles.length <= 3 }\"")
    expect(HUB_VIEW_SOURCE).toMatch(/\.waterfall-grid\.is-sparse\s*\{[^}]*display:\s*grid;[^}]*min-height:\s*calc\(100dvh - 170px\);/)
    expect(HUB_VIEW_SOURCE).toMatch(/\.waterfall-grid\.is-sparse \.article-card\s*\{[^}]*min-height:\s*calc\(100dvh - 190px\);/)
  })
})

describe('HubView.vue — persisted inspiration preference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips source and editable local copy through real localStorage', () => {
    expect(saveHubInspirationState({
      source: 'ai',
      local: { text: '写下真实内容。', author: '本地作者' },
      ai: { text: '一次真实生成。', author: 'AI 灵感' },
    })).toBe(true)

    expect(loadHubInspirationState()).toEqual({
      source: 'ai',
      local: { text: '写下真实内容。', author: '本地作者' },
      ai: { text: '一次真实生成。', author: 'AI 灵感' },
    })
  })

  it('recovers malformed storage to a valid local quote', () => {
    localStorage.setItem('inkforge-hub-inspiration', '{broken')

    const state = loadHubInspirationState()
    expect(state.source).toBe('local')
    expect(state.local.text.length).toBeGreaterThan(0)
    expect(state.local.author.length).toBeGreaterThan(0)
    expect(state.ai).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Behavioural assertions on the selection logic
// ---------------------------------------------------------------------------

describe('HubView.vue — card-recent selection logic', () => {
  it('returns no articles when there are zero articles', () => {
    expect(pickLatestArticle([])).toBeNull()
    expect(buildUnfinished([])).toEqual([])
    expect(buildTodoForCard([])).toEqual([])
  })

  it('mixed status set: stats helpers classify drafts/published correctly', () => {
    const articles: Article[] = [
      makeArticle({ id: 'done', status: ARTICLE_STATUS.PUBLISHED, updatedAt: '2026-05-20T10:00:00Z' }),
      makeArticle({ id: 'draft', status: ARTICLE_STATUS.DRAFT, updatedAt: '2026-05-21T10:00:00Z' }),
      makeArticle({ id: 'writing-1', status: ARTICLE_STATUS.WRITING, updatedAt: '2026-05-22T10:00:00Z' }),
      makeArticle({ id: 'writing-2', status: ARTICLE_STATUS.WRITING, updatedAt: '2026-05-23T10:00:00Z' }),
    ]

    // The PRD’s “mixed 3 articles” premise is generalised: latestArticle must
    // be the most-recently-updated article regardless of status.
    expect(pickLatestArticle(articles)?.id).toBe('writing-2')

    // 未完成 count = total - completed (published/archived/processed).
    const unfinished = buildUnfinished(articles)
    expect(unfinished.map(a => a.id)).toEqual(['writing-2', 'writing-1', 'draft'])

    // The todo card list MUST drop the latestArticle (writing-2) so the
    // hero doesn’t duplicate in the list below.
    const todo = buildTodoForCard(articles)
    expect(todo.map(a => a.id)).toEqual(['writing-1', 'draft'])
    expect(todo.find(a => a.id === 'writing-2')).toBeUndefined()
  })

  it('single unfinished article: todo list becomes empty (latestArticle is excluded)', () => {
    const articles: Article[] = [
      makeArticle({ id: 'only', status: ARTICLE_STATUS.WRITING, updatedAt: '2026-05-25T10:00:00Z' }),
    ]

    expect(pickLatestArticle(articles)?.id).toBe('only')
    // unfinishedArticles still contains the article (it is unfinished)
    expect(buildUnfinished(articles).map(a => a.id)).toEqual(['only'])
    // but the todo list shown beneath the hero must be empty after the
    // dedup filter that the PRD added.
    expect(buildTodoForCard(articles)).toEqual([])
  })

  it('respects the continuation priority order (writing < draft < new < under_review)', () => {
    const articles: Article[] = [
      makeArticle({ id: 'review', status: ARTICLE_STATUS.UNDER_REVIEW, updatedAt: '2026-05-26T10:00:00Z' }),
      makeArticle({ id: 'draft', status: ARTICLE_STATUS.DRAFT, updatedAt: '2026-05-26T09:00:00Z' }),
      makeArticle({ id: 'writing', status: ARTICLE_STATUS.WRITING, updatedAt: '2026-05-26T08:00:00Z' }),
      makeArticle({ id: 'latest-but-finished', status: ARTICLE_STATUS.PUBLISHED, updatedAt: '2026-05-27T00:00:00Z' }),
    ]

    // The most recently updated article (PUBLISHED) is excluded from the todo
    // filter through the latestArticle.id check.
    expect(pickLatestArticle(articles)?.id).toBe('latest-but-finished')
    expect(buildUnfinished(articles).map(a => a.id)).toEqual(['writing', 'draft', 'review'])
    expect(buildTodoForCard(articles).map(a => a.id)).toEqual(['writing', 'draft', 'review'])
  })
})
