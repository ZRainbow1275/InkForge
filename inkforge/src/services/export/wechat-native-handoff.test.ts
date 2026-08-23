import { describe, expect, it } from 'vitest'

import {
  listWritingComponentDefinitions,
  renderWritingComponentsInMarkdown,
  serializeWritingComponentNode,
  type WritingComponentDefinition,
  type WritingComponentProps,
} from '../writing-components'
import { buildWechatNativeComponentHandoffReport } from './wechat-native-handoff'

function acceptanceProps(definition: WritingComponentDefinition): WritingComponentProps {
  return Object.fromEntries(definition.fields.map(field => {
    if (field.key === 'kind') return [field.key, '视频']
    if (field.key === 'resourceId') return [field.key, `resource-${definition.id}`]
    if (field.key === 'columns') return [field.key, '项目|结果|来源']
    if (field.key === 'images') {
      return [field.key, [`https://example.com/${definition.id}/image.png|真实图片|真实题注`]]
    }
    if (field.type === 'lines') return [field.key, ['真实项目|真实结果|真实来源']]
    if (field.type === 'url' || field.type === 'https-url') {
      return [field.key, `https://example.com/${definition.id}/${field.key}`]
    }
    if (field.type === 'number') return [field.key, 1]
    if (field.type === 'boolean') return [field.key, true]
    return [field.key, `${field.label}验收值`]
  }))
}

describe('WeChat native component handoff', () => {
  it('derives the complete capability matrix from the runtime registry', async () => {
    const report = await buildWechatNativeComponentHandoffReport({
      markdown: '# 验收稿',
      artifactContent: '<section>真实微信产物</section>',
    })
    const registryIds = listWritingComponentDefinitions().map(item => item.id).sort()

    expect(report.registryMatrix.map(item => item.componentId).sort()).toEqual(registryIds)
    expect(new Set(report.registryMatrix.map(item => item.componentId)).size).toBe(registryIds.length)
    expect(report.registryMatrix.every(item => item.validator === 'writing-component-registry')).toBe(true)
    expect(report.registryMatrix.find(item => item.componentId === 'SongBlock')).toMatchObject({
      disposition: 'manual-native-insert',
      fallback: 'static-safe-html',
      nativeKind: 'song',
    })
    expect(report.registryMatrix.find(item => item.componentId === 'MpProfile')).toMatchObject({
      disposition: 'manual-native-insert',
      nativeKind: 'profile',
    })
    expect(report.registryMatrix.find(item => item.componentId === 'TipBlock')).toMatchObject({
      disposition: 'safe-rich-text',
      nativeKind: null,
    })
    expect(report.valid).toBe(true)
    expect(report.issues).toEqual([])
    expect(report.registryMatrix.every(item => item.localEvidence === 'not-run')).toBe(true)
    expect(report.currentArtifactOccurrenceCount).toBe(0)
    expect(report.currentArtifactExecutedOccurrenceCount).toBe(0)
  })

  it('executes every runtime registry definition through production serialization and rendering', async () => {
    const definitions = listWritingComponentDefinitions()
    const markdown = definitions.flatMap((definition, index) => [
      `组件 ${index + 1} 前文锚点`,
      serializeWritingComponentNode({
        componentId: definition.id,
        version: definition.version,
        props: acceptanceProps(definition),
      }),
      `组件 ${index + 1} 后文锚点`,
    ]).join('\n')
    const artifactContent = renderWritingComponentsInMarkdown(markdown)
    const report = await buildWechatNativeComponentHandoffReport({ markdown, artifactContent })

    expect(report.registryMatrix).toHaveLength(definitions.length)
    expect(report.registryMatrix.every(item => item.localEvidence === 'local')).toBe(true)
    expect(report.currentArtifactOccurrenceCount).toBe(definitions.length)
    expect(report.currentArtifactExecutedOccurrenceCount).toBe(definitions.length)
    expect(report.issues).toEqual([])
    expect(report.valid).toBe(true)
    expect(report.handoffs.length).toBeGreaterThan(0)
    expect(report.handoffs.every(item => item.status === 'manual-native-insert')).toBe(true)
    expect(new Set(report.handoffs.map(item => item.anchor)).size).toBe(report.handoffs.length)
    expect(report.nativeInsertionProven).toBe(false)
    expect(report.published).toBe(false)
  })

  it('audits only occurrences present in the current artifact without blocking on unused definitions', async () => {
    const report = await buildWechatNativeComponentHandoffReport({
      markdown: '<SongBlock title="真实歌曲" artist="真实作者" url="https://example.com/song" />',
      artifactContent: '<section data-ink-component-id="SongBlock" data-ink-component-status="ready">真实歌曲 · 真实作者</section>',
    })

    expect(report.registryMatrix.find(item => item.componentId === 'SongBlock')?.localEvidence).toBe('local')
    expect(report.registryMatrix.find(item => item.componentId === 'MpProfile')?.localEvidence).toBe('not-run')
    expect(report.currentArtifactOccurrenceCount).toBe(1)
    expect(report.currentArtifactExecutedOccurrenceCount).toBe(1)
    expect(report.issues).not.toContain('组件“公众号 / 作者名片”未在当前 Markdown/artifact 中完成本地执行。')
    expect(report.valid).toBe(true)
  })

  it('fails completeness for an unexecuted or unknown artifact component', async () => {
    const report = await buildWechatNativeComponentHandoffReport({
      markdown: '<TipBlock content="正文提示" />',
      artifactContent: '<section data-ink-component-id="UnknownBlock"></section>',
    })

    expect(report.registryMatrix.find(item => item.componentId === 'TipBlock')?.localEvidence).toBe('not-run')
    expect(report.issues.some(issue => issue.includes('未在当前 Markdown/artifact 中完成本地执行'))).toBe(true)
    expect(report.issues).toContain('产物包含未在当前 registry 注册的组件：UnknownBlock。')
    expect(report.valid).toBe(false)
  })

  it('does not treat pending or partially rendered occurrences as local', async () => {
    const source = '<SongBlock title="真实歌曲" artist="真实作者" url="https://example.com/song" />'
    const pending = await buildWechatNativeComponentHandoffReport({
      markdown: source,
      artifactContent: '<section data-ink-component-id="SongBlock" data-ink-component-status="pending"></section>',
    })
    expect(pending.registryMatrix.find(item => item.componentId === 'SongBlock')?.localEvidence).toBe('not-run')
    expect(pending.currentArtifactOccurrenceCount).toBe(1)
    expect(pending.currentArtifactExecutedOccurrenceCount).toBe(0)
    expect(pending.valid).toBe(false)
    expect(pending.issues.some(issue => issue.includes('未在当前 Markdown/artifact 中完成本地执行'))).toBe(true)

    const partiallyRendered = await buildWechatNativeComponentHandoffReport({
      markdown: [source, source].join('\n'),
      artifactContent: '<section data-ink-component-id="SongBlock" data-ink-component-status="ready"></section>',
    })
    expect(partiallyRendered.registryMatrix.find(item => item.componentId === 'SongBlock')?.localEvidence).toBe('not-run')
    expect(partiallyRendered.valid).toBe(false)
    expect(partiallyRendered.issues.some(issue => issue.includes('未在当前 Markdown/artifact 中完成本地执行'))).toBe(true)

    const duplicated = await buildWechatNativeComponentHandoffReport({
      markdown: source,
      artifactContent: [
        '<section data-ink-component-id="SongBlock" data-ink-component-status="ready"></section>',
        '<section data-ink-component-id="SongBlock" data-ink-component-status="ready"></section>',
      ].join(''),
    })
    expect(duplicated.valid).toBe(false)
    expect(duplicated.issues.some(issue => issue.includes('occurrence 数量为 2'))).toBe(true)
  })

  it('creates unique ephemeral occurrence keys without exposing component URLs or resource ids', async () => {
    const report = await buildWechatNativeComponentHandoffReport({
      markdown: [
        '## 开篇',
        '<SongBlock title="真实歌曲" artist="真实作者" url="https://example.com/song" />',
        '正文过渡。',
        '<SongBlock title="真实歌曲" artist="真实作者" url="https://example.com/song" />',
        '## 结尾',
        '<WechatMediaBlock kind="视频" title="真实媒体" resourceId="private-resource-id" />',
      ].join('\n'),
      artifactContent: '<section>同一最终微信产物</section>',
    })

    expect(report.artifactFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(report.handoffs).toHaveLength(3)
    expect(report.handoffs.map(item => item.occurrenceKey)).toEqual([
      expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
    ])
    expect(new Set(report.handoffs.map(item => item.occurrenceKey)).size).toBe(3)
    expect(report.handoffs.map(item => item.status)).toEqual([
      'manual-native-insert',
      'manual-native-insert',
      'manual-native-insert',
    ])
    expect(report.handoffs.map(item => item.expectedIdentity)).toEqual([
      '真实歌曲 · 真实作者',
      '真实歌曲 · 真实作者',
      '视频 · 真实媒体',
    ])
    expect(JSON.stringify(report)).not.toContain('https://example.com/song')
    expect(JSON.stringify(report)).not.toContain('private-resource-id')
  })

  it('fails closed when adjacent equal native components have an ambiguous visible anchor', async () => {
    const source = '<SongBlock title="同名歌曲" artist="同一作者" url="https://example.com/song" />'
    const report = await buildWechatNativeComponentHandoffReport({
      markdown: ['锚点之前', source, source, '锚点之后'].join('\n'),
      artifactContent: '<section>含重复组件</section>',
    })

    expect(report.valid).toBe(false)
    expect(report.handoffs.map(item => item.status)).toEqual(['blocked', 'blocked'])
    expect(report.handoffs.every(item => item.issues.some(issue => issue.includes('锚点不唯一')))).toBe(true)
  })

  it('keeps incomplete native metadata and duplicate delivery ids blocked', async () => {
    const report = await buildWechatNativeComponentHandoffReport({
      markdown: '<SongBlock title="" url="" />',
      artifactContent: '<section>缺失元数据</section>',
      deliveryConfig: {
        readingTime: { enabled: true, wordsPerMinute: 300 },
        license: 'none',
        components: [
          { id: 'delivery-song', type: 'song', enabled: true, title: '真实抬头歌曲', artist: '真实作者', url: '' },
          { id: 'delivery-profile', type: 'contact-card', enabled: true, displayName: '真实公众号', accountId: '', profileUrl: '' },
          { id: 'delivery-profile', type: 'contact-card', enabled: true, displayName: '重复公众号', accountId: '', profileUrl: '' },
        ],
      },
    })

    expect(report.valid).toBe(false)
    expect(report.handoffs.some(item => item.source === 'body' && item.status === 'blocked')).toBe(true)
    expect(report.handoffs.some(item => item.source === 'delivery' && item.expectedIdentity === '真实抬头歌曲 · 真实作者')).toBe(true)
    expect(report.handoffs.some(item => item.source === 'delivery' && item.expectedIdentity === '真实公众号')).toBe(true)
    expect(report.handoffs.some(item => item.issues.some(issue => issue.includes('交付组件 ID 重复')))).toBe(true)
  })
})
