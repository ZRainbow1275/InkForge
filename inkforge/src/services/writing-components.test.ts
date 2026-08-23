// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import {
  deleteCustomWritingComponentDefinition,
  getWritingComponentDefinition,
  importCustomWritingComponentDefinitions,
  insertWritingComponentSourceAtRange,
  listWritingComponentDefinitions,
  loadCustomWritingComponentDefinitions,
  parseWritingComponentSource,
  renderWritingComponentSource,
  renderWritingComponentVisualBody,
  renderWritingComponentsInMarkdown,
  saveCustomWritingComponentDefinition,
  serializeWritingComponentNode,
} from './writing-components'

describe('writing components', () => {
  beforeEach(() => localStorage.clear())

  it('registers the full built-in writing component set', () => {
    const ids = listWritingComponentDefinitions().map(item => item.id)
    expect(ids).toEqual(expect.arrayContaining([
      'MpProfile',
      'QRCodeBlock',
      'AuthorBlock',
      'TipBlock',
      'InfoGrid',
      'TableBlock',
      'TimelineBlock',
      'CompareBlock',
      'StatBlock',
      'GalleryBlock',
      'CitationBlock',
      'SongBlock',
      'ImageBlock',
      'LinkBlock',
      'ArticleBlock',
      'ContactCard',
      'WechatMediaBlock',
    ]))
  })

  it('round-trips registered JSX with stable field order and safe rendering', () => {
    const source = serializeWritingComponentNode({
      componentId: 'StatBlock',
      version: 1,
      props: {
        source: '2026 年真实年报',
        value: '42%',
        label: '完成率',
        description: '已核验样本',
      },
    })
    expect(source).toBe('<StatBlock version="1" label="完成率" value="42%" description="已核验样本" source="2026 年真实年报" />')

    const parsed = parseWritingComponentSource(source)
    expect(parsed?.status).toBe('ready')
    expect(parsed?.node?.props.source).toBe('2026 年真实年报')
    const rendered = renderWritingComponentsInMarkdown(source)
    expect(rendered).toContain('42%')
    expect(rendered).toContain('2026 年真实年报')
    expect(rendered).not.toContain('<script')
  })

  it('exposes the validated definition visual without a second canonical source wrapper', () => {
    const source = '<TipBlock version="1" title="注意" content="真实提示" />'
    const visual = renderWritingComponentVisualBody(source)

    expect(visual).toContain('data-ink-writing-component="TipBlock"')
    expect(visual).toContain('真实提示')
    expect(visual).not.toContain('data-ink-component-source=')
    expect(renderWritingComponentVisualBody('<TipBlock version="1" />')).toBeNull()
  })

  it('keeps incomplete and unknown sources recoverable without outputting sample content', () => {
    const incomplete = renderWritingComponentsInMarkdown('<SongBlock version="1" title="" artist="" url="" />')
    expect(incomplete).toContain('data-ink-component-status="incomplete"')
    expect(incomplete).not.toContain('未命名歌曲')

    const unknown = renderWritingComponentsInMarkdown('<FutureBlock version="9" answer="42" />')
    expect(unknown).toContain('data-ink-component-status="unknown"')
    expect(unknown).toContain('FutureBlock')
    expect(unknown).not.toContain('answer="42">')
  })

  it('round-trips optional SongBlock and MpProfile HTTPS media without changing legacy JSX', () => {
    const legacySong = '<SongBlock version="1" title="夜航" artist="墨铸" url="https://example.com/night-flight" />'
    const parsedLegacySong = parseWritingComponentSource(legacySong)
    expect(parsedLegacySong?.status).toBe('ready')
    expect(serializeWritingComponentNode(parsedLegacySong!.node!)).toBe(legacySong)
    expect(renderWritingComponentSource(legacySong)).not.toContain('<img')

    const song = '<SongBlock version="1" title="夜航" artist="墨铸" url="https://example.com/night-flight" coverUrl="https://images.example.com/cover.png" />'
    const profile = '<MpProfile version="1" displayName="墨铸公众号" accountId="inkforge" description="欢迎关注" profileUrl="https://example.com/inkforge" avatarUrl="https://images.example.com/avatar.png" qrImageUrl="https://images.example.com/qr.png" />'

    for (const source of [song, profile]) {
      const parsed = parseWritingComponentSource(source)
      expect(parsed?.status).toBe('ready')
      expect(serializeWritingComponentNode(parsed!.node!)).toBe(source)
    }

    expect(renderWritingComponentSource(song)).toContain('https://images.example.com/cover.png')
    expect(renderWritingComponentSource(profile)).toContain('https://images.example.com/avatar.png')
    expect(renderWritingComponentSource(profile)).toContain('https://images.example.com/qr.png')
    expect(parseWritingComponentSource(song.replace('https://images.example.com/cover.png', 'http://images.example.com/cover.png'))?.status).toBe('invalid')
  })

  it('rejects dangerous attributes and ignores component syntax inside code fences', () => {
    expect(parseWritingComponentSource('<TipBlock version="1" constructor="x" content="安全" />')?.status).toBe('invalid')
    const markdown = [
      '```md',
      '<TipBlock version="1" content="代码示例" />',
      '```',
      '<TipBlock version="1" content="真实提示" />',
    ].join('\n')
    const rendered = renderWritingComponentsInMarkdown(markdown)
    expect(rendered).toContain('<TipBlock version="1" content="代码示例" />')
    expect(rendered).toContain('真实提示')
  })

  it('keeps components literal inside long fences that contain shorter fence runs', () => {
    const markdown = [
      '````md',
      '```',
      '<TipBlock version="1" content="长围栏中的组件" />',
      '```',
      '````',
      '<TipBlock version="1" content="围栏后的真实组件" />',
    ].join('\n')

    const rendered = renderWritingComponentsInMarkdown(markdown)
    expect(rendered).toContain('<TipBlock version="1" content="长围栏中的组件" />')
    expect(rendered).toContain('围栏后的真实组件')
    expect(rendered.match(/data-ink-component-id="TipBlock"/g)).toHaveLength(1)
  })

  it('persists safe declarative custom cards without overriding built-ins', () => {
    saveCustomWritingComponentDefinition({
      id: 'CustomResearchNote',
      label: '研究札记',
      description: '真实资料卡',
      accent: '#345678',
    })
    expect(getWritingComponentDefinition('CustomResearchNote')?.builtIn).toBe(false)
    expect(() => saveCustomWritingComponentDefinition({
      id: 'CustomMpProfile',
      label: '冲突',
      description: '',
      accent: '#D32F2F',
    })).not.toThrow()
    expect(() => saveCustomWritingComponentDefinition({
      id: 'MpProfile',
      label: '覆盖',
      description: '',
      accent: '#D32F2F',
    })).toThrow()

    deleteCustomWritingComponentDefinition('CustomResearchNote')
    expect(getWritingComponentDefinition('CustomResearchNote')).toBeUndefined()
  })

  it('rejects a 49th custom component without replacing the 48 valid stored definitions', () => {
    const definitions = Array.from({ length: 48 }, (_, index) => ({
      id: `CustomCard${String(index + 1).padStart(2, '0')}`,
      label: `自定义卡片 ${index + 1}`,
      description: '真实自定义组件',
      accent: '#345678',
    }))
    definitions.forEach(definition => saveCustomWritingComponentDefinition(definition))
    const storedBefore = localStorage.getItem('inkforge-custom-writing-components-v1')

    expect(() => saveCustomWritingComponentDefinition({
      id: 'CustomCard49',
      label: '自定义卡片 49',
      description: '超过容量上限',
      accent: '#345678',
    })).toThrow()
    expect(localStorage.getItem('inkforge-custom-writing-components-v1')).toBe(storedBefore)
    expect(loadCustomWritingComponentDefinitions()).toHaveLength(48)
  })

  it('rejects an import merged beyond 48 definitions without erasing existing storage', () => {
    Array.from({ length: 48 }, (_, index) => ({
      id: `CustomImport${String(index + 1).padStart(2, '0')}`,
      label: `导入基线 ${index + 1}`,
      description: '真实导入基线',
      accent: '#345678',
    })).forEach(definition => saveCustomWritingComponentDefinition(definition))
    const storedBefore = localStorage.getItem('inkforge-custom-writing-components-v1')

    expect(() => importCustomWritingComponentDefinitions(JSON.stringify([{
      id: 'CustomImport49',
      label: '导入第 49 项',
      description: '超过容量上限',
      accent: '#345678',
    }]))).toThrow()
    expect(localStorage.getItem('inkforge-custom-writing-components-v1')).toBe(storedBefore)
    expect(loadCustomWritingComponentDefinitions()).toHaveLength(48)
  })

  it('inserts source at the saved cursor with stable block spacing', () => {
    const result = insertWritingComponentSourceAtRange(
      '上文\n下文',
      '<TipBlock version="1" content="真实提示" />',
      { from: 3, to: 3 },
    )
    expect(result.markdown).toBe('上文\n\n<TipBlock version="1" content="真实提示" />\n\n下文')
    expect(result.cursor).toBe(result.markdown.indexOf('下文'))
  })
})
