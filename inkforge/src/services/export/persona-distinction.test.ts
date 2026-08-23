/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest'
import { convertToWechatWithStats } from './wechat'
import { convertToXiaohongshu, xiaohongshuPresets } from './xiaohongshu'
import { convertToZhihu, getZhihuPresets } from './zhihu'
import { themePresets } from './themes'

const FIXTURE_HTML = [
  '<h1>同一篇文章</h1>',
  '<h2>核心观点</h2>',
  '<h3>证据与方法</h3>',
  '<p>用于检验所有内容类型是否真正产生不同排版结构。</p>',
  '<blockquote><p>引用文本。</p></blockquote>',
  '<ol><li>第一项</li><li>第二项</li></ol>',
  '<hr>',
  '<table><thead><tr><th>指标</th><th>值</th></tr></thead><tbody><tr><td>A</td><td>1</td></tr></tbody></table>',
].join('')

const PARAGRAPH_ONLY_HTML = [
  '<p>纯正文文章也必须体现平台预设的排版节奏。</p>',
  '<p>不能依赖标题、引用或代码块才产生差异。</p>',
].join('')

const FULL_SEMANTIC_HTML = [
  '<h1>一级标题</h1><h2>二级标题</h2><h3>三级标题</h3>',
  '<h4>四级标题</h4><h5>五级标题</h5><h6>六级标题</h6>',
  '<p>正文含<strong>加粗</strong><em>斜体</em><del>删除</del><code>inline()</code>',
  '<a href="https://example.com/source">真实链接</a>。</p>',
  '<pre><code class="language-ts">const verified = true</code></pre>',
  '<p><span class="katex">E=mc²</span></p>',
  '<section class="mermaid" data-mermaid="graph TD;A-->B">流程图</section>',
  '<blockquote><p>引用与来源。</p></blockquote>',
  '<ul><li>无序项</li></ul><ol><li>有序项</li></ol>',
  '<ul data-type="taskList"><li data-checked="true">已完成任务</li></ul>',
  '<table><thead><tr><th>指标</th><th>值</th></tr></thead><tbody><tr><td>A</td><td>42</td></tr></tbody></table>',
  '<figure><img src="https://example.com/verified.png" alt="真实配图"><figcaption>真实题注</figcaption></figure>',
  '<hr><section class="ink-citation"><p>引文来源</p></section>',
  '<section class="ink-footnotes"><ol><li>脚注来源</li></ol></section>',
].join('')

const ALL_PLATFORM_PRESETS = [
  ...themePresets,
  ...xiaohongshuPresets,
  ...getZhihuPresets(),
]

const CANONICAL_WECHAT_VARIANT_PRESET_IDS = [
  'thesis',
  'legal',
  'report',
  'commentary',
  'aigc',
  'notes',
  'life',
] as const

function withoutColorIdentity(html: string): string {
  const template = document.createElement('template')
  template.innerHTML = html

  for (const element of template.content.querySelectorAll('*')) {
    const attributes = Array.from(element.attributes)
      .filter(attribute => !/^(?:id|class|role|title|alt|contenteditable|spellcheck|tabindex|aria-.+|data-.+)$/i.test(attribute.name))
      .map((attribute) => {
        const value = attribute.name === 'style'
          ? attribute.value
              .split(';')
              .map((declaration) => {
                const separator = declaration.indexOf(':')
                return separator < 0
                  ? declaration.trim()
                  : `${declaration.slice(0, separator).trim().toLowerCase()}:${declaration.slice(separator + 1).trim().replace(/\s+/g, ' ')}`
              })
              .filter(Boolean)
              .sort()
              .join(';')
          : attribute.value
        return [attribute.name, value] as const
      })
      .sort(([left], [right]) => left.localeCompare(right))

    for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name)
    for (const [name, value] of attributes) element.setAttribute(name, value)
  }

  return template.innerHTML
    .replace(/#[0-9a-f]{3,8}\b/gi, '#COLOR')
    .replace(/rgba?\([^)]*\)/gi, 'COLOR')
    .replace(/hsla?\([^)]*\)/gi, 'COLOR')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('preset visual signature contract', () => {
  it('describes every selectable preset with all real output categories', () => {
    for (const preset of ALL_PLATFORM_PRESETS) {
      const signature = preset.visualSignature
      expect(signature, preset.id).toBeDefined()
      expect(signature?.rhythm.trim(), `${preset.id}:rhythm`).toBeTruthy()
      expect(signature?.heading.trim(), `${preset.id}:heading`).toBeTruthy()
      expect(signature?.quote.trim(), `${preset.id}:quote`).toBeTruthy()
      expect(signature?.divider.trim(), `${preset.id}:divider`).toBeTruthy()
      expect(signature?.media.trim(), `${preset.id}:media`).toBeTruthy()
      expect(signature?.modules.length, `${preset.id}:modules`).toBeGreaterThanOrEqual(3)
      expect(new Set(signature?.modules).size, `${preset.id}:modules`).toBe(signature?.modules.length)
    }
  })

  it('keeps each platform preset signature unique instead of repeating flagship marketing copy', () => {
    const fingerprints = ALL_PLATFORM_PRESETS.map(preset => JSON.stringify(preset.visualSignature))
    expect(new Set(fingerprints).size).toBe(ALL_PLATFORM_PRESETS.length)
  })
})

describe('WeChat content persona distinction', () => {
  it('does not count non-visual metadata or CSS declaration order as persona distinction', () => {
    const left = '<section id="left" class="theme-a" data-preset="a" style="color:#123456; margin: 1em; font-size: 16px">正文</section>'
    const right = '<section id="right" class="theme-b" data-preset="b" style="font-size:16px;margin:1em;color:#abcdef">正文</section>'

    expect(withoutColorIdentity(left)).toBe(withoutColorIdentity(right))
  })

  it('renders every selectable persona into a distinct structure beyond accent color', () => {
    const fingerprints = themePresets.map((preset) => {
      const result = convertToWechatWithStats(FIXTURE_HTML, preset, {
        enableReadingTime: false,
        enableCiteStatus: false,
        enableCodeHighlight: false,
        enableEnhancedTable: false,
        enableCjkSpacing: false,
      })
      expect(result.html, preset.id).toContain('同一篇文章')
      expect(result.html, preset.id).toContain('引用文本')
      return withoutColorIdentity(result.html)
    })

    expect(new Set(fingerprints).size).toBe(themePresets.length)
  })

  it('keeps all seven canonical variants distinct for paragraph-only articles', () => {
    const fingerprints = CANONICAL_WECHAT_VARIANT_PRESET_IDS.map((presetId) => {
      const preset = themePresets.find(candidate => candidate.id === presetId)
      expect(preset, presetId).toBeDefined()
      return withoutColorIdentity(convertToWechatWithStats(PARAGRAPH_ONLY_HTML, preset!, {
        enableReadingTime: true,
        enableCiteStatus: false,
        enableCodeHighlight: false,
        enableEnhancedTable: false,
        enableCjkSpacing: false,
      }).html)
    })

    expect(new Set(fingerprints).size).toBe(CANONICAL_WECHAT_VARIANT_PRESET_IDS.length)
  })

  it('keeps the complete semantic article set safe and visible in every selectable preset', () => {
    for (const preset of themePresets) {
      const result = convertToWechatWithStats(FULL_SEMANTIC_HTML, preset, {
        enableReadingTime: false,
        enableCiteStatus: false,
        enableCodeHighlight: false,
        enableEnhancedTable: false,
        enableCjkSpacing: false,
      })
      const template = document.createElement('template')
      template.innerHTML = result.html

      for (const selector of [
        'h4', 'h5', 'h6',
        'strong', 'em', 'del', 'code', 'pre', 'a',
        'ul', 'ol', 'table', 'img', 'figcaption',
      ]) {
        expect(template.content.querySelector(selector), `${preset.id}:${selector}`).not.toBeNull()
      }
      for (const [semantic, selector] of [
        ['h1', 'h1, [data-ink-svg^="cover-"]'],
        ['h2', 'h2, [data-ink-block="flagship-h2"]'],
        ['h3', 'h3, [data-ink-block="flagship-h3"]'],
        ['blockquote', 'blockquote, [data-ink-block="flagship-quote"], [data-ink-block="flagship-callout"], [data-ink-block="flagship-pullquote"]'],
      ] as const) {
        expect(template.content.querySelector(selector), `${preset.id}:${semantic}`).not.toBeNull()
      }
      expect(result.html, `${preset.id}:divider`).toMatch(
        /<hr\b|data-ink-svg=["']divider-|·\s*·\s*·|❀\s*❀\s*❀|◆/,
      )
      expect(template.content.textContent, `${preset.id}:semantic-text`).toContain('E=mc²')
      expect(template.content.textContent, `${preset.id}:semantic-text`).toContain('流程图')
      expect(template.content.textContent, `${preset.id}:semantic-text`).toContain('引文来源')
      expect(template.content.textContent, `${preset.id}:semantic-text`).toContain('脚注来源')
      expect(result.html, preset.id).not.toMatch(/<script\b|<iframe\b|<foreignObject\b|\son\w+=/i)
    }
  })
})

describe('cross-platform content persona distinction', () => {
  it('renders every Xiaohongshu preset into a distinct structure beyond accent color', () => {
    const fingerprints = xiaohongshuPresets.map(preset => (
      withoutColorIdentity(convertToXiaohongshu(FIXTURE_HTML, preset.id))
    ))

    expect(new Set(fingerprints).size).toBe(xiaohongshuPresets.length)
  })

  it('renders every Zhihu preset into a distinct structure beyond accent color', () => {
    const presets = getZhihuPresets()
    const fingerprints = presets.map(preset => (
      withoutColorIdentity(convertToZhihu(FIXTURE_HTML, preset.id))
    ))

    expect(new Set(fingerprints).size).toBe(presets.length)
  })

  it('keeps every Zhihu preset distinct for paragraph-only articles', () => {
    const presets = getZhihuPresets()
    const fingerprints = presets.map(preset => (
      withoutColorIdentity(convertToZhihu(PARAGRAPH_ONLY_HTML, preset.id))
    ))

    expect(new Set(fingerprints).size).toBe(presets.length)
  })

  it('keeps Xiaohongshu and Zhihu wrappers isolated from WeChat SVG output', () => {
    const xhsHtml = convertToXiaohongshu(FIXTURE_HTML, xiaohongshuPresets[0].id)
    const zhihuHtml = convertToZhihu(FIXTURE_HTML, getZhihuPresets()[0].id)

    expect(xhsHtml).toContain('xhs-note')
    expect(xhsHtml).not.toContain('zhihu-answer')
    expect(zhihuHtml).toContain('zhihu-answer')
    expect(zhihuHtml).not.toContain('xhs-note')
    expect(`${xhsHtml}${zhihuHtml}`).not.toContain('<svg')
  })
})
