/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { listWritingComponentDefinitions } from '@/services/writing-components'
import type { DeliveryAdornmentConfig } from './index'
import {
  ARTICLE_PROFILES,
  convertToWechatWithStats,
  getPlatformPresetForVariant,
  getWechatRenderingRuleCatalog,
  resolveVisualVariant,
  themePresets,
} from './index'

const REAL_STRUCTURE_FIXTURE = [
  '<h1>同一篇真实文章</h1>',
  '<h2>第一部分</h2>',
  '<h3>结构重点</h3>',
  '<p>连续正文用于验证真实转换后的结构区别。</p>',
  '<blockquote>真实引用</blockquote>',
  '<ul><li>列表项目</li></ul>',
  '<table><thead><tr><th>字段</th></tr></thead><tbody><tr><td>真实值</td></tr></tbody></table>',
  '<pre><code>const verified = true</code></pre>',
  '<section class="ink-writing-component"><strong>真实写作组件</strong><p>组件正文</p></section>',
  '<hr>',
].join('')

const REAL_DELIVERY_CONFIG: DeliveryAdornmentConfig = {
  readingTime: { enabled: true, wordsPerMinute: 300 },
  license: 'cc-by-4.0',
  components: [
    {
      id: 'catalog-song',
      type: 'song',
      enabled: true,
      title: '验收歌曲',
      artist: '验收作者',
      url: 'https://example.com/song',
    },
    {
      id: 'catalog-profile',
      type: 'contact-card',
      enabled: true,
      displayName: 'InkForge',
      accountId: 'inkforge',
      profileUrl: 'https://example.com/profile',
      description: '成为作者吧',
    },
  ],
}

type FinalArtifactZone = keyof ReturnType<typeof getWechatRenderingRuleCatalog>[number]['runtimeStructureFingerprint']

const FINAL_ARTIFACT_ZONES: readonly FinalArtifactZone[] = [
  'masthead',
  'headingRhythm',
  'bodyFlow',
  'semanticBlocks',
  'componentsAndDelivery',
  'ending',
]

function normalizeStyleValue(value: string): string {
  return value
    .replace(/url\([^)]*\)/gi, 'URL')
    .replace(/#[0-9a-f]{3,8}\b/gi, 'COLOR')
    .replace(/(?:rgb|hsl)a?\([^)]*\)/gi, 'COLOR')
    .replace(/\b(?:transparent|currentcolor|black|white)\b/gi, 'COLOR')
    .replace(/(['"])[\s\S]*?\1/g, 'TEXT')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeInlineStyle(style: string): string {
  return style
    .split(';')
    .map((declaration) => {
      const colon = declaration.indexOf(':')
      if (colon < 1) return ''
      const property = declaration.slice(0, colon).trim().toLowerCase()
      if (!property || property.startsWith('--')) return ''
      return `${property}:${normalizeStyleValue(declaration.slice(colon + 1))}`
    })
    .filter(Boolean)
    .sort()
    .join(';')
}

function normalizeFinalElement(element: Element): string {
  const clone = element.cloneNode(true) as Element
  for (const empty of Array.from(clone.querySelectorAll('span,div,section,i,b,small')).reverse()) {
    if (empty.childElementCount === 0 && !empty.textContent?.trim()) empty.remove()
  }

  const visit = (node: Element): void => {
    const style = normalizeInlineStyle(node.getAttribute('style') ?? '')
    for (const attribute of Array.from(node.attributes)) node.removeAttribute(attribute.name)
    if (style) node.setAttribute('style', style)
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) child.remove()
      else if (child instanceof Element) visit(child)
    }
  }
  visit(clone)
  return clone.outerHTML.replace(/\s+/g, ' ').trim()
}

function uniqueTopLevelElements(elements: readonly (Element | null)[]): Element[] {
  const matches = [...new Set(elements.filter((element): element is Element => Boolean(element)))]
  return matches.filter(element => !matches.some(candidate => candidate !== element && candidate.contains(element)))
}

function findTextBlock(root: Element, needle: string, selectors: string): Element | null {
  const matches = Array.from(root.querySelectorAll(selectors))
    .filter(element => element.textContent?.replace(/\s+/g, '').includes(needle.replace(/\s+/g, '')))
    .sort((left, right) => (left.textContent?.length ?? 0) - (right.textContent?.length ?? 0))
  const shortestLength = matches[0]?.textContent?.length
  const shortest = matches.filter(element => element.textContent?.length === shortestLength)
  return shortest.find(element => !shortest.some(candidate => candidate !== element && candidate.contains(element))) ?? null
}

function getFinalArtifactFingerprints(html: string): Record<FinalArtifactZone, string> {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const root = parsed.body
  if (!parsed.querySelector('#nice')) throw new Error('微信最终产物缺少 #nice 根节点')

  const masthead = uniqueTopLevelElements([
    ...Array.from(root.querySelectorAll('[data-ink-svg^="cover-"]')),
    findTextBlock(root, '文章值得您享受', 'section'),
  ])
  const headingRhythm = uniqueTopLevelElements([
    findTextBlock(root, '同一篇真实文章', 'h1,h2,h3,h4,h5,h6,section,div,p'),
    findTextBlock(root, '第一部分', 'h1,h2,h3,h4,h5,h6,section,div,p'),
    findTextBlock(root, '结构重点', 'h1,h2,h3,h4,h5,h6,section,div,p'),
  ])
  const bodyFlow = uniqueTopLevelElements([
    findTextBlock(root, '连续正文用于验证真实转换后的结构区别', 'p,section,div'),
    findTextBlock(root, '列表项目', 'ul,ol'),
  ])
  const semanticBlocks = uniqueTopLevelElements([
    findTextBlock(root, '真实引用', 'blockquote,section,div'),
    findTextBlock(root, 'constverified=true', 'pre'),
    findTextBlock(root, '字段真实值', 'table'),
    ...Array.from(root.querySelectorAll('[data-ink-svg^="divider-"]')),
  ])
  const componentsAndDelivery = uniqueTopLevelElements([
    findTextBlock(root, '验收歌曲', 'section'),
    findTextBlock(root, '全文', 'p'),
    findTextBlock(root, '真实写作组件组件正文', 'section'),
  ])
  const ending = uniqueTopLevelElements([
    findTextBlock(root, '成为作者吧', 'section'),
    findTextBlock(root, 'CCBY4.0', 'section'),
  ])
  const zones: Record<FinalArtifactZone, readonly Element[]> = {
    masthead,
    headingRhythm,
    bodyFlow,
    semanticBlocks,
    componentsAndDelivery,
    ending,
  }

  return Object.fromEntries(FINAL_ARTIFACT_ZONES.map(zone => [
    zone,
    zones[zone].map(normalizeFinalElement).join('|'),
  ])) as Record<FinalArtifactZone, string>
}

function renderFinalArtifact(presetId: string): string {
  const preset = themePresets.find(candidate => candidate.id === presetId)
  if (!preset) throw new Error(`缺少微信预设 ${presetId}`)
  return convertToWechatWithStats(REAL_STRUCTURE_FIXTURE, preset, {
    enableReadingTime: true,
    articleTitle: '同一篇真实文章',
    articleCategory: '真实分类',
    enableCiteStatus: false,
    enableCodeHighlight: false,
    enableEnhancedTable: false,
    enableCjkSpacing: false,
    deliveryAdornment: REAL_DELIVERY_CONFIG,
  }).html
}

describe('WeChat rendering rule catalog', () => {
  it('derives one complete, non-template rule from every real WeChat preset', () => {
    const rules = getWechatRenderingRuleCatalog()
    const writingComponentIds = listWritingComponentDefinitions().map(definition => definition.id)

    expect(rules).toHaveLength(16)
    expect(rules.map(rule => rule.presetId)).toEqual(themePresets.map(preset => preset.id))
    expect(new Set(rules.map(rule => rule.presetId)).size).toBe(rules.length)

    for (const rule of rules) {
      expect(rule.variantId).toBe(resolveVisualVariant('wechat', rule.presetId).variantId)
      expect(rule.brandAnchors).toContain('文章值得您享受')
      expect(rule.safeInvariants).toContain('single converter path')
      expect(rule.customizationKnobs).toContain('headingStyle')
      expect(Object.values(rule.zones).every(value => (
        typeof value === 'string' ? value.trim().length > 0 : value.length > 0
      ))).toBe(true)
      expect(Object.values(rule.runtimeStructureFingerprint).every(value => value.trim().length > 0)).toBe(true)
      expect(rule.writingComponentIds).toEqual(writingComponentIds)
      expect(JSON.stringify(rule)).not.toMatch(/<\/?[a-z]|#nice|style=|class=/i)

      for (const profileId of rule.compatibleProfileIds) {
        const profile = ARTICLE_PROFILES.find(item => item.id === profileId)
        expect(profile).toBeDefined()
        expect(getPlatformPresetForVariant(profile!.variantId, 'wechat', profile!.id)).toBe(rule.presetId)
      }
    }
  })

  it('binds every catalog row to a distinct real converter structure', () => {
    const fingerprints = getWechatRenderingRuleCatalog()
      .map(rule => Object.values(getFinalArtifactFingerprints(renderFinalArtifact(rule.presetId))).join('|'))

    expect(new Set(fingerprints).size).toBe(themePresets.length)
  })

  it('does not count copy, ids, sources, colours, or empty wrappers as structure', () => {
    const parsed = new DOMParser().parseFromString([
      '<section id="left" class="one" data-proof="left" style="margin:12px;color:#fff;border:1px solid #000">',
      '<a href="https://example.com/left">左侧文本</a><span></span></section>',
      '<section id="right" class="two" data-proof="right" style="border:1px solid rgb(0,0,0);color:#000;margin:12px">',
      '<a href="https://example.com/right">右侧文本</a></section>',
    ].join(''), 'text/html')
    const [left, right] = Array.from(parsed.body.children)

    expect(normalizeFinalElement(left)).toBe(normalizeFinalElement(right))
  })

  it('keeps every pair different in at least three non-colour composition zones', () => {
    const rules = getWechatRenderingRuleCatalog()
    const finalArtifactFingerprints = rules.map(rule => getFinalArtifactFingerprints(renderFinalArtifact(rule.presetId)))
    const violations: string[] = []
    let comparisons = 0

    for (let leftIndex = 0; leftIndex < rules.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < rules.length; rightIndex += 1) {
        const left = rules[leftIndex].zones
        const right = rules[rightIndex].zones
        const leftValues = [
          left.masthead,
          left.headingRhythm,
          left.bodyFlow,
          left.semanticBlocks.join('|'),
          left.componentsAndDelivery.join('|'),
          left.ending,
        ]
        const rightValues = [
          right.masthead,
          right.headingRhythm,
          right.bodyFlow,
          right.semanticBlocks.join('|'),
          right.componentsAndDelivery.join('|'),
          right.ending,
        ]
        const differenceCount = leftValues.filter((value, index) => value !== rightValues[index]).length

        const leftRuntime = Object.values(rules[leftIndex].runtimeStructureFingerprint)
        const rightRuntime = Object.values(rules[rightIndex].runtimeStructureFingerprint)
        const runtimeDifferenceCount = leftRuntime.filter((value, index) => value !== rightRuntime[index]).length

        expect(differenceCount, `${rules[leftIndex].presetId} vs ${rules[rightIndex].presetId}`).toBeGreaterThanOrEqual(3)
        expect(runtimeDifferenceCount, `runtime ${rules[leftIndex].presetId} vs ${rules[rightIndex].presetId}`).toBeGreaterThanOrEqual(3)
        const finalDifferenceCount = FINAL_ARTIFACT_ZONES
          .filter(zone => (
            finalArtifactFingerprints[leftIndex][zone as FinalArtifactZone]
            !== finalArtifactFingerprints[rightIndex][zone as FinalArtifactZone]
          )).length
        if (finalDifferenceCount < 3) {
          const sameZones = FINAL_ARTIFACT_ZONES.filter(zone => (
            finalArtifactFingerprints[leftIndex][zone]
            === finalArtifactFingerprints[rightIndex][zone]
          ))
          violations.push(`${rules[leftIndex].presetId} vs ${rules[rightIndex].presetId}: ${finalDifferenceCount}; same=${sameZones.join(',')}`)
        }
        comparisons += 1
      }
    }

    expect(comparisons).toBe(120)
    expect(violations).toEqual([])
    for (const fingerprint of finalArtifactFingerprints) {
      expect(Object.values(fingerprint).every(value => value.length > 0)).toBe(true)
    }
  })
})
