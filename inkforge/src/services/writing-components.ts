import { z } from 'zod'

export type WritingComponentProp = string | number | boolean | string[]
export type WritingComponentProps = Record<string, WritingComponentProp>
export type WritingComponentFieldType =
  | 'text'
  | 'textarea'
  | 'url'
  | 'https-url'
  | 'number'
  | 'boolean'
  | 'lines'

export interface WritingComponentField {
  key: string
  label: string
  type: WritingComponentFieldType
  required?: boolean
  placeholder?: string
  description?: string
}

export interface InkComponentNode {
  componentId: string
  version: number
  props: WritingComponentProps
}

export interface WritingComponentDefinition {
  id: string
  label: string
  description: string
  category: string
  version: number
  fields: readonly WritingComponentField[]
  builtIn: boolean
  accent?: string
  render: (props: WritingComponentProps) => string
  validate?: (props: WritingComponentProps) => string[]
}

export type WritingComponentValidationStatus =
  | 'ready'
  | 'incomplete'
  | 'invalid'
  | 'unknown'
  | 'unsupported-version'

export interface WritingComponentValidation {
  status: WritingComponentValidationStatus
  node: InkComponentNode | null
  definition: WritingComponentDefinition | null
  issues: string[]
}

export interface ParsedWritingComponentSource extends WritingComponentValidation {
  source: string
}

export interface WritingComponentSourceOccurrence {
  ordinal: number
  line: number
  parsed: ParsedWritingComponentSource
}

export interface WritingComponentSourceInsertion {
  markdown: string
  insertedText: string
  cursor: number
}

export interface CustomWritingComponentDefinition {
  id: string
  label: string
  description: string
  accent: string
}

const CUSTOM_COMPONENT_STORAGE_KEY = 'inkforge.writing-components.custom.v1'
const COMPONENT_SOURCE_PATTERN = /^<([A-Z][A-Za-z0-9]{1,63})(?:\s+([\s\S]*?))?\s*\/>$/
const COMPONENT_ATTRIBUTE_PATTERN = /([A-Za-z][A-Za-z0-9]*)\s*=\s*"([^"]*)"/g
const DANGEROUS_PROP_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const COMPONENT_PROP_VALUE_SCHEMA = z.union([
  z.string().max(8000),
  z.number().finite(),
  z.boolean(),
  z.array(z.string().max(2048)).max(64),
])
const INK_COMPONENT_NODE_SCHEMA = z.object({
  componentId: z.string().regex(/^[A-Z][A-Za-z0-9]{1,63}$/),
  version: z.number().int().min(1).max(100),
  props: z.record(z.string(), COMPONENT_PROP_VALUE_SCHEMA),
}).strict()
const CUSTOM_COMPONENT_SCHEMA = z.object({
  id: z.string().regex(/^Custom[A-Z][A-Za-z0-9]{1,55}$/),
  label: z.string().trim().min(1).max(48),
  description: z.string().trim().max(160).default(''),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#D32F2F'),
}).strict()
const CUSTOM_COMPONENT_LIST_SCHEMA = z.array(CUSTOM_COMPONENT_SCHEMA).max(48)

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttribute(value: unknown): string {
  return escapeHtml(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\r?\n/g, '&#10;')
}

function decodeAttribute(value: string): string {
  return value
    .replace(/&#10;/g, '\n')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function normalizeText(value: WritingComponentProp | undefined): string {
  return Array.isArray(value) ? value.join('\n') : String(value ?? '').trim()
}

function normalizeInlineText(value: WritingComponentProp | undefined): string {
  return normalizeText(value).replace(/\s+/g, ' ')
}

function splitLines(value: WritingComponentProp | undefined): string[] {
  if (Array.isArray(value)) return value.map(item => item.trim()).filter(Boolean)
  return normalizeText(value).split(/\r?\n/).map(item => item.trim()).filter(Boolean)
}

function normalizeUrl(value: WritingComponentProp | undefined, httpsOnly = false): string | null {
  const raw = normalizeInlineText(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    const protocolAllowed = httpsOnly
      ? url.protocol === 'https:'
      : url.protocol === 'https:' || url.protocol === 'http:'
    return protocolAllowed && !url.username && !url.password ? url.toString() : null
  } catch {
    return null
  }
}

function componentShell(
  id: string,
  label: string,
  body: string,
): string {
  return [
    `<section class="ink-writing-component ink-writing-component--${escapeAttribute(id)}" data-ink-writing-component="${escapeAttribute(id)}" `,
    'style="box-sizing:border-box;margin:24px 0;padding:18px;border:1px solid #E3E8EC;',
    'border-left:4px solid #7A848C;border-radius:12px;background:transparent;',
    'color:inherit;font-size:15px;line-height:1.75;">',
    '<span class="ink-writing-component__label" style="display:block;margin-bottom:10px;color:inherit;font-size:11px;',
    `font-weight:700;letter-spacing:.08em;">${escapeHtml(label)}</span>`,
    body,
    '</section>',
  ].join('')
}

function linkCard(
  id: string,
  kind: string,
  title: string,
  description: string,
  url: string,
  mediaHtml = '',
): string {
  return componentShell(id, kind, [
    mediaHtml,
    `<a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer" `,
    'style="display:block;color:inherit;text-decoration:none;">',
    `<strong class="ink-writing-component__accent" style="display:block;font-size:17px;line-height:1.5;">${escapeHtml(title)}</strong>`,
    description
      ? `<span style="display:block;margin-top:6px;color:inherit;font-size:13px;opacity:.72;">${escapeHtml(description)}</span>`
      : '',
    `<span style="display:block;margin-top:8px;color:inherit;font-size:11px;opacity:.66;word-break:break-all;">${escapeHtml(url)}</span>`,
    '</a>',
  ].join(''))
}

function rowsFromLines(value: WritingComponentProp | undefined, separator = '|'): string[][] {
  return splitLines(value)
    .map(line => line.split(separator).map(cell => cell.trim()))
    .filter(row => row.some(Boolean))
}

function renderProfile(props: WritingComponentProps): string {
  const name = normalizeInlineText(props.displayName)
  const account = normalizeInlineText(props.accountId)
  const description = normalizeInlineText(props.description)
  const url = normalizeUrl(props.profileUrl)
  const avatarUrl = normalizeUrl(props.avatarUrl, true)
  const qrImageUrl = normalizeUrl(props.qrImageUrl, true)
  const body = [
    avatarUrl ? `<img src="${escapeAttribute(avatarUrl)}" alt="${escapeAttribute(`${name} 头像`)}" style="display:block;width:72px;max-width:100%;height:auto;margin:0 auto 10px;border-radius:50%;" />` : '',
    `<strong class="ink-writing-component__accent" style="display:block;font-size:18px;">${escapeHtml(name)}</strong>`,
    account ? `<span style="display:block;margin-top:4px;color:inherit;font-size:12px;opacity:.68;">${escapeHtml(account)}</span>` : '',
    description ? `<p style="margin:10px 0 0;color:inherit;opacity:.78;">${escapeHtml(description)}</p>` : '',
    url ? `<a class="ink-writing-component__accent" href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:10px;color:inherit;">查看公开资料</a>` : '',
    qrImageUrl ? `<img src="${escapeAttribute(qrImageUrl)}" alt="${escapeAttribute(`${name} 二维码`)}" style="display:block;width:144px;max-width:70%;height:auto;margin:14px auto 0;" />` : '',
  ].join('')
  return componentShell('MpProfile', '公众号 / 作者名片', body)
}

function renderAuthor(props: WritingComponentProps): string {
  const name = normalizeInlineText(props.name)
  const role = normalizeInlineText(props.role)
  const bio = normalizeInlineText(props.bio)
  return componentShell('AuthorBlock', '作者', [
    `<strong class="ink-writing-component__accent" style="display:block;font-size:18px;">${escapeHtml(name)}</strong>`,
    role ? `<span style="display:block;margin-top:3px;color:inherit;font-size:12px;opacity:.68;">${escapeHtml(role)}</span>` : '',
    bio ? `<p style="margin:10px 0 0;">${escapeHtml(bio)}</p>` : '',
  ].join(''))
}

function renderQrCode(props: WritingComponentProps): string {
  const imageUrl = normalizeUrl(props.imageUrl, true)!
  const targetUrl = normalizeUrl(props.url)!
  const label = normalizeInlineText(props.label) || '扫码访问'
  return componentShell('QRCodeBlock', '二维码', [
    `<a href="${escapeAttribute(targetUrl)}" target="_blank" rel="noopener noreferrer" style="display:block;text-align:center;text-decoration:none;">`,
    `<img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(label)}" style="display:block;width:168px;max-width:70%;height:auto;margin:0 auto 10px;" />`,
    `<span style="color:inherit;font-size:13px;opacity:.78;">${escapeHtml(label)}</span>`,
    '</a>',
  ].join(''))
}

function renderTip(props: WritingComponentProps): string {
  const title = normalizeInlineText(props.title)
  const content = normalizeText(props.content)
  return componentShell('TipBlock', title || '提示', `<p style="margin:0;white-space:pre-line;">${escapeHtml(content)}</p>`)
}

function renderInfoGrid(props: WritingComponentProps): string {
  const items = rowsFromLines(props.items, '|')
  return componentShell('InfoGrid', normalizeInlineText(props.title) || '信息', [
    '<table style="width:100%;border-collapse:collapse;table-layout:fixed;">',
    '<tbody>',
    ...items.map(([key = '', value = '']) => [
      '<tr>',
      `<td style="width:38%;padding:9px;border:1px solid #E3E8EC;color:inherit;font-size:11px;opacity:.72;">${escapeHtml(key)}</td>`,
      `<td style="padding:9px;border:1px solid #E3E8EC;"><strong class="ink-writing-component__accent" style="font-size:15px;">${escapeHtml(value)}</strong></td>`,
      '</tr>',
    ].join('')),
    '</tbody>',
    '</table>',
  ].join(''))
}

function renderTable(props: WritingComponentProps): string {
  const headers = normalizeText(props.columns).split('|').map(item => item.trim()).filter(Boolean)
  const rows = rowsFromLines(props.rows, '|')
  return componentShell('TableBlock', normalizeInlineText(props.title) || '表格', [
    '<section style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">',
    `<thead><tr>${headers.map(header => `<th style="padding:9px;border:1px solid #DDE3E7;background:#F6F8F9;text-align:left;">${escapeHtml(header)}</th>`).join('')}</tr></thead>`,
    `<tbody>${rows.map(row => `<tr>${headers.map((_, index) => `<td style="padding:9px;border:1px solid #E3E8EC;">${escapeHtml(row[index] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>`,
    '</table></section>',
  ].join(''))
}

function renderTimeline(props: WritingComponentProps): string {
  const items = rowsFromLines(props.items, '|')
  return componentShell('TimelineBlock', normalizeInlineText(props.title) || '时间线', items.map(([time = '', title = '', description = '']) => [
    '<section class="ink-writing-component__accent-border" style="margin:0 0 14px;padding:0 0 14px 14px;border-left:2px solid #D9DFE3;">',
    `<span class="ink-writing-component__accent" style="display:block;color:inherit;font-size:11px;">${escapeHtml(time)}</span>`,
    `<strong style="display:block;margin-top:2px;">${escapeHtml(title)}</strong>`,
    description ? `<p style="margin:4px 0 0;color:inherit;font-size:13px;opacity:.72;">${escapeHtml(description)}</p>` : '',
    '</section>',
  ].join('')).join(''))
}

function renderCompare(props: WritingComponentProps): string {
  const leftItems = splitLines(props.leftItems)
  const rightItems = splitLines(props.rightItems)
  const column = (title: string, items: string[]) => [
    '<section style="padding:14px;border:1px solid #E3E8EC;border-radius:9px;">',
    `<strong class="ink-writing-component__accent" style="display:block;margin-bottom:8px;">${escapeHtml(title)}</strong>`,
    `<ul style="margin:0;padding-left:18px;">${items.map(item => `<li style="margin:5px 0;">${escapeHtml(item)}</li>`).join('')}</ul>`,
    '</section>',
  ].join('')
  return componentShell('CompareBlock', normalizeInlineText(props.title) || '对比', [
    '<table style="width:100%;border-collapse:separate;border-spacing:6px;table-layout:fixed;"><tbody><tr>',
    `<td style="width:50%;padding:0;vertical-align:top;">${column(normalizeInlineText(props.leftTitle), leftItems)}</td>`,
    `<td style="width:50%;padding:0;vertical-align:top;">${column(normalizeInlineText(props.rightTitle), rightItems)}</td>`,
    '</tr></tbody></table>',
  ].join(''))
}

function renderStat(props: WritingComponentProps): string {
  const label = normalizeInlineText(props.label)
  const value = normalizeInlineText(props.value)
  const description = normalizeInlineText(props.description)
  const source = normalizeInlineText(props.source)
  return componentShell('StatBlock', label, [
    `<strong class="ink-writing-component__accent" style="display:block;font-size:34px;line-height:1.2;color:inherit;">${escapeHtml(value)}</strong>`,
    description ? `<p style="margin:8px 0 0;">${escapeHtml(description)}</p>` : '',
    `<span style="display:block;margin-top:10px;color:inherit;font-size:11px;opacity:.68;">来源：${escapeHtml(source)}</span>`,
  ].join(''))
}

function parseGalleryImages(value: WritingComponentProp | undefined): Array<{ url: string; alt: string; caption: string }> {
  return rowsFromLines(value, '|').flatMap(([rawUrl = '', alt = '', caption = '']) => {
    const url = normalizeUrl(rawUrl, true)
    return url ? [{ url, alt, caption }] : []
  })
}

function renderGallery(props: WritingComponentProps): string {
  const images = parseGalleryImages(props.images)
  return componentShell('GalleryBlock', normalizeInlineText(props.title) || '图集', [
    ...images.map(image => [
      '<figure style="margin:0 0 14px;">',
      `<img src="${escapeAttribute(image.url)}" alt="${escapeAttribute(image.alt)}" style="display:block;width:100%;height:auto;border-radius:8px;" />`,
      image.caption ? `<figcaption style="margin-top:5px;color:inherit;font-size:11px;text-align:center;opacity:.68;">${escapeHtml(image.caption)}</figcaption>` : '',
      '</figure>',
    ].join('')),
  ].join(''))
}

function renderCitation(props: WritingComponentProps): string {
  const quote = normalizeText(props.quote)
  const source = normalizeInlineText(props.source)
  const author = normalizeInlineText(props.author)
  const sourceUrl = normalizeUrl(props.sourceUrl)
  const sourceText = [author, source].filter(Boolean).join(' · ')
  const footer = sourceUrl
    ? `<a class="ink-writing-component__accent" href="${escapeAttribute(sourceUrl)}" target="_blank" rel="noopener noreferrer" style="color:inherit;">${escapeHtml(sourceText)}</a>`
    : escapeHtml(sourceText)
  return componentShell('CitationBlock', '引文来源', [
    `<blockquote style="margin:0;padding:0;border:0;font-size:17px;line-height:1.8;">${escapeHtml(quote)}</blockquote>`,
    `<footer style="margin-top:12px;color:inherit;font-size:12px;text-align:right;opacity:.72;">${footer}</footer>`,
  ].join(''))
}

function renderSong(props: WritingComponentProps): string {
  const title = normalizeInlineText(props.title)
  const artist = normalizeInlineText(props.artist)
  const url = normalizeUrl(props.url)!
  const coverUrl = normalizeUrl(props.coverUrl, true)
  const cover = coverUrl
    ? `<img src="${escapeAttribute(coverUrl)}" alt="${escapeAttribute(`${title} 封面`)}" style="display:block;width:100%;max-width:240px;height:auto;margin:0 auto 12px;border-radius:10px;" />`
    : ''
  return linkCard('SongBlock', '歌曲', title, artist ? `演唱：${artist}` : '', url, cover)
}

function renderImage(props: WritingComponentProps): string {
  const url = normalizeUrl(props.url, true)!
  const alt = normalizeInlineText(props.alt)
  const caption = normalizeInlineText(props.caption)
  return componentShell('ImageBlock', '图片', [
    '<figure style="margin:0;text-align:center;">',
    `<img src="${escapeAttribute(url)}" alt="${escapeAttribute(alt)}" style="display:block;width:100%;max-width:100%;height:auto;margin:0 auto;border-radius:9px;" />`,
    caption ? `<figcaption style="margin-top:8px;color:inherit;font-size:12px;opacity:.68;">${escapeHtml(caption)}</figcaption>` : '',
    '</figure>',
  ].join(''))
}

function renderLink(props: WritingComponentProps): string {
  return linkCard(
    'LinkBlock',
    '链接',
    normalizeInlineText(props.title),
    normalizeInlineText(props.description),
    normalizeUrl(props.url)!,
  )
}

function renderArticle(props: WritingComponentProps): string {
  return linkCard(
    'ArticleBlock',
    '关联文章',
    normalizeInlineText(props.title),
    normalizeInlineText(props.summary),
    normalizeUrl(props.url)!,
  )
}

function renderContact(props: WritingComponentProps): string {
  const name = normalizeInlineText(props.displayName)
  const account = normalizeInlineText(props.accountId)
  const url = normalizeUrl(props.profileUrl)!
  return linkCard('ContactCard', '联系人 / 名片', name, account ? `账号：${account}` : '', url)
}

function renderWechatMedia(props: WritingComponentProps): string {
  const kind = normalizeInlineText(props.kind)
  const title = normalizeInlineText(props.title)
  const resourceId = normalizeInlineText(props.resourceId)
  const url = normalizeUrl(props.url)
  const details = [
    resourceId ? `资源标识：${resourceId}` : '',
    '微信原生媒体仍需在公众号编辑器内确认绑定',
  ].filter(Boolean).join(' · ')
  return url
    ? linkCard('WechatMediaBlock', `微信原生${kind}`, title, details, url)
    : componentShell('WechatMediaBlock', `微信原生${kind}`, [
        `<strong class="ink-writing-component__accent" style="display:block;font-size:17px;">${escapeHtml(title)}</strong>`,
        `<p style="margin:7px 0 0;color:inherit;font-size:12px;opacity:.72;">${escapeHtml(details)}</p>`,
      ].join(''))
}

function fields(
  values: Array<[string, string, WritingComponentFieldType, boolean?, string?]>,
): WritingComponentField[] {
  return values.map(([key, label, type, required, placeholder]) => ({
    key,
    label,
    type,
    required,
    placeholder,
  }))
}

const BUILTIN_WRITING_COMPONENTS: readonly WritingComponentDefinition[] = [
  {
    id: 'MpProfile',
    label: '公众号 / 作者名片',
    description: '展示真实公众号、作者或机构资料。',
    category: '身份',
    version: 1,
    builtIn: true,
    fields: fields([
      ['displayName', '名称', 'text', true],
      ['accountId', '账号', 'text'],
      ['description', '简介', 'textarea'],
      ['profileUrl', '公开资料链接', 'url'],
      ['avatarUrl', '头像 HTTPS 地址', 'https-url'],
      ['qrImageUrl', '二维码图片 HTTPS 地址', 'https-url'],
    ]),
    render: renderProfile,
  },
  {
    id: 'AuthorBlock',
    label: '作者信息',
    description: '展示真实作者姓名、角色与简介。',
    category: '身份',
    version: 1,
    builtIn: true,
    fields: fields([
      ['name', '作者姓名', 'text', true],
      ['role', '身份 / 角色', 'text'],
      ['bio', '作者简介', 'textarea'],
    ]),
    render: renderAuthor,
  },
  {
    id: 'QRCodeBlock',
    label: '二维码',
    description: '使用真实二维码图片与目标链接。',
    category: '媒体',
    version: 1,
    builtIn: true,
    fields: fields([
      ['url', '目标链接', 'url', true],
      ['imageUrl', '二维码图片 HTTPS 地址', 'https-url', true],
      ['label', '说明', 'text'],
    ]),
    render: renderQrCode,
  },
  {
    id: 'TipBlock',
    label: '提示框',
    description: '高亮提醒、注意事项或摘要。',
    category: '内容',
    version: 1,
    builtIn: true,
    fields: fields([
      ['title', '标题', 'text'],
      ['content', '内容', 'textarea', true],
    ]),
    render: renderTip,
  },
  {
    id: 'InfoGrid',
    label: '信息网格',
    description: '按“字段|值”逐行展示结构化信息。',
    category: '数据',
    version: 1,
    builtIn: true,
    fields: fields([
      ['title', '标题', 'text'],
      ['items', '信息项', 'lines', true, '作者|墨铸\n日期|2026-07-28'],
    ]),
    render: renderInfoGrid,
  },
  {
    id: 'TableBlock',
    label: '表格',
    description: '按竖线分隔列名与真实表格数据。',
    category: '数据',
    version: 1,
    builtIn: true,
    fields: fields([
      ['title', '标题', 'text'],
      ['columns', '列名', 'text', true, '项目|结果|来源'],
      ['rows', '数据行', 'lines', true, 'A|42|年度报告'],
    ]),
    render: renderTable,
  },
  {
    id: 'TimelineBlock',
    label: '时间线',
    description: '按“时间|标题|说明”逐行组织事件。',
    category: '叙事',
    version: 1,
    builtIn: true,
    fields: fields([
      ['title', '标题', 'text'],
      ['items', '时间线项目', 'lines', true, '2026-01|项目启动|真实事件说明'],
    ]),
    render: renderTimeline,
  },
  {
    id: 'CompareBlock',
    label: '对比卡',
    description: '并列展示两组真实差异。',
    category: '数据',
    version: 1,
    builtIn: true,
    fields: fields([
      ['title', '标题', 'text'],
      ['leftTitle', '左栏标题', 'text', true],
      ['leftItems', '左栏条目', 'lines', true],
      ['rightTitle', '右栏标题', 'text', true],
      ['rightItems', '右栏条目', 'lines', true],
    ]),
    render: renderCompare,
  },
  {
    id: 'StatBlock',
    label: '数据统计卡',
    description: '展示一个真实指标并要求填写来源。',
    category: '数据',
    version: 1,
    builtIn: true,
    fields: fields([
      ['label', '指标名称', 'text', true],
      ['value', '指标数值', 'text', true],
      ['description', '说明', 'textarea'],
      ['source', '数据来源', 'text', true],
    ]),
    render: renderStat,
  },
  {
    id: 'GalleryBlock',
    label: '图集',
    description: '按“HTTPS 图片|替代文本|题注”逐行添加图片。',
    category: '媒体',
    version: 1,
    builtIn: true,
    fields: fields([
      ['title', '标题', 'text'],
      ['images', '图片', 'lines', true, 'https://…|图片说明|真实题注'],
    ]),
    render: renderGallery,
    validate: props => parseGalleryImages(props.images).length === splitLines(props.images).length
      ? []
      : ['图集中的每一项都必须使用无凭据的 HTTPS 图片地址。'],
  },
  {
    id: 'CitationBlock',
    label: '引文来源',
    description: '展示真实引文、作者与来源。',
    category: '引用',
    version: 1,
    builtIn: true,
    fields: fields([
      ['quote', '引文', 'textarea', true],
      ['author', '作者', 'text'],
      ['source', '来源', 'text', true],
      ['sourceUrl', '来源链接', 'url'],
    ]),
    render: renderCitation,
  },
  {
    id: 'SongBlock',
    label: '歌曲',
    description: '插入真实歌曲资料；微信原生曲库仍需平台确认。',
    category: '媒体',
    version: 1,
    builtIn: true,
    fields: fields([
      ['title', '歌曲名', 'text', true],
      ['artist', '歌手 / 创作者', 'text'],
      ['url', '公开链接', 'url', true],
      ['coverUrl', '封面 HTTPS 地址', 'https-url'],
    ]),
    render: renderSong,
  },
  {
    id: 'ImageBlock',
    label: '图片',
    description: '插入真实公开 HTTPS 图片与题注。',
    category: '媒体',
    version: 1,
    builtIn: true,
    fields: fields([
      ['url', '图片 HTTPS 地址', 'https-url', true],
      ['alt', '替代文本', 'text', true],
      ['caption', '题注', 'text'],
    ]),
    render: renderImage,
  },
  {
    id: 'LinkBlock',
    label: '链接卡片',
    description: '展示真实标题、说明与公开链接。',
    category: '链接',
    version: 1,
    builtIn: true,
    fields: fields([
      ['title', '标题', 'text', true],
      ['description', '说明', 'textarea'],
      ['url', '链接', 'url', true],
    ]),
    render: renderLink,
  },
  {
    id: 'ArticleBlock',
    label: '关联文章',
    description: '展示真实关联文章链接与摘要。',
    category: '链接',
    version: 1,
    builtIn: true,
    fields: fields([
      ['title', '文章标题', 'text', true],
      ['summary', '摘要', 'textarea'],
      ['url', '文章链接', 'url', true],
    ]),
    render: renderArticle,
  },
  {
    id: 'ContactCard',
    label: '联系人 / 名片',
    description: '展示真实联系人、账号与公开资料。',
    category: '身份',
    version: 1,
    builtIn: true,
    fields: fields([
      ['displayName', '名称', 'text', true],
      ['accountId', '账号', 'text'],
      ['profileUrl', '公开资料链接', 'url', true],
    ]),
    render: renderContact,
  },
  {
    id: 'WechatMediaBlock',
    label: '微信原生媒体描述',
    description: '记录歌曲、音频、视频、小程序、名片或文章的真实绑定信息。',
    category: '微信',
    version: 1,
    builtIn: true,
    fields: fields([
      ['kind', '媒体类型', 'text', true, '歌曲 / 音频 / 视频 / 小程序 / 名片 / 文章'],
      ['title', '标题', 'text', true],
      ['resourceId', '真实资源标识', 'text'],
      ['url', '公开降级链接', 'url'],
    ]),
    render: renderWechatMedia,
    validate: props => normalizeInlineText(props.resourceId) || normalizeUrl(props.url)
      ? []
      : ['微信媒体真实资源标识或公开降级链接为必填项。'],
  },
]

function renderCustomComponent(
  definition: CustomWritingComponentDefinition,
  props: WritingComponentProps,
): string {
  const title = normalizeInlineText(props.title)
  const content = normalizeText(props.content)
  const url = normalizeUrl(props.url)
  const body = [
    `<strong class="ink-writing-component__accent" style="display:block;font-size:18px;">${escapeHtml(title)}</strong>`,
    content ? `<p style="margin:8px 0 0;white-space:pre-line;">${escapeHtml(content)}</p>` : '',
    url ? `<a class="ink-writing-component__accent" href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:10px;color:inherit;">打开链接</a>` : '',
  ].join('')
  return componentShell(definition.id, definition.label, body)
}

function toRuntimeCustomDefinition(
  definition: CustomWritingComponentDefinition,
): WritingComponentDefinition {
  return {
    ...definition,
    category: '自定义',
    version: 1,
    builtIn: false,
    fields: fields([
      ['title', '标题', 'text', true],
      ['content', '内容', 'textarea'],
      ['url', '链接', 'url'],
    ]),
    render: props => renderCustomComponent(definition, props),
  }
}

export function loadCustomWritingComponentDefinitions(): CustomWritingComponentDefinition[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const parsed = CUSTOM_COMPONENT_LIST_SCHEMA.safeParse(
      JSON.parse(localStorage.getItem(CUSTOM_COMPONENT_STORAGE_KEY) ?? '[]'),
    )
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

function persistCustomWritingComponentDefinitions(
  definitions: CustomWritingComponentDefinition[],
): void {
  if (typeof localStorage === 'undefined') return
  const validated = CUSTOM_COMPONENT_LIST_SCHEMA.parse(definitions)
  localStorage.setItem(CUSTOM_COMPONENT_STORAGE_KEY, JSON.stringify(validated))
}

export function saveCustomWritingComponentDefinition(
  input: CustomWritingComponentDefinition,
): CustomWritingComponentDefinition {
  const definition = CUSTOM_COMPONENT_SCHEMA.parse(input)
  if (BUILTIN_WRITING_COMPONENTS.some(item => item.id === definition.id)) {
    throw new Error('自定义组件不能覆盖内置组件。')
  }
  const definitions = loadCustomWritingComponentDefinitions()
  const existingIndex = definitions.findIndex(item => item.id === definition.id)
  const nextDefinitions = existingIndex >= 0
    ? definitions.map(item => item.id === definition.id ? definition : item)
    : [...definitions, definition]
  persistCustomWritingComponentDefinitions(nextDefinitions)
  return definition
}

export function deleteCustomWritingComponentDefinition(id: string): void {
  persistCustomWritingComponentDefinitions(
    loadCustomWritingComponentDefinitions().filter(item => item.id !== id),
  )
}

export function exportCustomWritingComponentDefinitions(): string {
  return JSON.stringify(loadCustomWritingComponentDefinitions(), null, 2)
}

export function importCustomWritingComponentDefinitions(
  raw: string,
): CustomWritingComponentDefinition[] {
  const imported = CUSTOM_COMPONENT_LIST_SCHEMA.parse(JSON.parse(raw))
  const builtInIds = new Set(BUILTIN_WRITING_COMPONENTS.map(item => item.id))
  if (imported.some(item => builtInIds.has(item.id))) {
    throw new Error('导入文件不能覆盖内置组件。')
  }
  const merged = new Map(
    [...loadCustomWritingComponentDefinitions(), ...imported].map(item => [item.id, item]),
  )
  const definitions = Array.from(merged.values())
  persistCustomWritingComponentDefinitions(definitions)
  return definitions
}

export function listWritingComponentDefinitions(): WritingComponentDefinition[] {
  return [
    ...BUILTIN_WRITING_COMPONENTS,
    ...loadCustomWritingComponentDefinitions().map(toRuntimeCustomDefinition),
  ]
}

export function getWritingComponentDefinition(
  id: string,
): WritingComponentDefinition | undefined {
  return listWritingComponentDefinitions().find(definition => definition.id === id)
}

function propIsEmpty(value: WritingComponentProp | undefined): boolean {
  return Array.isArray(value)
    ? value.length === 0 || value.every(item => !item.trim())
    : typeof value === 'string'
      ? !value.trim()
      : value === undefined || value === null
}

export function validateWritingComponentNode(input: unknown): WritingComponentValidation {
  const parsed = INK_COMPONENT_NODE_SCHEMA.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'invalid',
      node: null,
      definition: null,
      issues: parsed.error.issues.map(issue => issue.message),
    }
  }

  const node = parsed.data
  if (Object.keys(node.props).some(key => DANGEROUS_PROP_KEYS.has(key))) {
    return {
      status: 'invalid',
      node,
      definition: null,
      issues: ['组件包含不允许的属性名。'],
    }
  }

  const definition = getWritingComponentDefinition(node.componentId) ?? null
  if (!definition) {
    return {
      status: 'unknown',
      node,
      definition: null,
      issues: ['当前软件未注册该组件；原始语法已保留。'],
    }
  }
  if (node.version > definition.version) {
    return {
      status: 'unsupported-version',
      node,
      definition,
      issues: [`组件版本 ${node.version} 高于当前支持版本 ${definition.version}。`],
    }
  }

  const allowedKeys = new Set(definition.fields.map(field => field.key))
  const issues: string[] = []
  for (const key of Object.keys(node.props)) {
    if (!allowedKeys.has(key)) issues.push(`未知属性：${key}`)
  }
  for (const field of definition.fields) {
    const value = node.props[field.key]
    if (field.required && propIsEmpty(value)) {
      issues.push(`${field.label}为必填项。`)
    }
    if (!propIsEmpty(value) && field.type === 'url' && !normalizeUrl(value)) {
      issues.push(`${field.label}仅允许无凭据的 HTTP/HTTPS URL。`)
    }
    if (!propIsEmpty(value) && field.type === 'https-url' && !normalizeUrl(value, true)) {
      issues.push(`${field.label}仅允许无凭据的 HTTPS URL。`)
    }
  }
  issues.push(...(definition.validate?.(node.props) ?? []))

  return {
    status: issues.length === 0
      ? 'ready'
      : issues.every(issue => issue.endsWith('为必填项。'))
        ? 'incomplete'
        : 'invalid',
    node,
    definition,
    issues,
  }
}

function parseFieldValue(
  definition: WritingComponentDefinition | null,
  key: string,
  rawValue: string,
): WritingComponentProp {
  const field = definition?.fields.find(item => item.key === key)
  if (field?.type === 'number') {
    const value = Number(rawValue)
    return Number.isFinite(value) ? value : rawValue
  }
  if (field?.type === 'boolean') return rawValue === 'true'
  if (field?.type === 'lines') return rawValue.split('\n')
  return rawValue
}

export function parseWritingComponentSource(
  sourceValue: string,
): ParsedWritingComponentSource | null {
  const source = sourceValue.trim()
  const match = COMPONENT_SOURCE_PATTERN.exec(source)
  if (!match) return null

  const componentId = match[1]
  const definition = getWritingComponentDefinition(componentId) ?? null
  const rawAttributes = match[2] ?? ''
  const attributes = new Map<string, string>()
  let consumed = ''
  let cursor = 0
  COMPONENT_ATTRIBUTE_PATTERN.lastIndex = 0
  for (let attributeMatch = COMPONENT_ATTRIBUTE_PATTERN.exec(rawAttributes); attributeMatch; attributeMatch = COMPONENT_ATTRIBUTE_PATTERN.exec(rawAttributes)) {
    consumed += rawAttributes.slice(cursor, attributeMatch.index)
    if (consumed.trim()) {
      return {
        source,
        status: 'invalid',
        node: null,
        definition,
        issues: ['组件属性必须使用 key="value" 格式。'],
      }
    }
    const key = attributeMatch[1]
    if (attributes.has(key) || DANGEROUS_PROP_KEYS.has(key)) {
      return {
        source,
        status: 'invalid',
        node: null,
        definition,
        issues: [`重复或不允许的属性：${key}`],
      }
    }
    attributes.set(key, decodeAttribute(attributeMatch[2]))
    cursor = attributeMatch.index + attributeMatch[0].length
    consumed = ''
  }
  if (rawAttributes.slice(cursor).trim()) {
    return {
      source,
      status: 'invalid',
      node: null,
      definition,
      issues: ['组件属性必须使用双引号并以自闭合语法结束。'],
    }
  }

  const versionRaw = attributes.get('version') ?? '1'
  attributes.delete('version')
  const version = Number(versionRaw)
  const props = Object.fromEntries(
    Array.from(attributes, ([key, value]) => [key, parseFieldValue(definition, key, value)]),
  )
  const validation = validateWritingComponentNode({ componentId, version, props })
  return { source, ...validation }
}

function serializePropValue(value: WritingComponentProp): string {
  if (Array.isArray(value)) return value.join('\n')
  return String(value)
}

export function serializeWritingComponentNode(nodeValue: InkComponentNode): string {
  const parsed = INK_COMPONENT_NODE_SCHEMA.parse(nodeValue)
  const definition = getWritingComponentDefinition(parsed.componentId)
  const fieldOrder = definition?.fields.map(field => field.key) ?? []
  const orderedKeys = [
    ...fieldOrder.filter(key => Object.prototype.hasOwnProperty.call(parsed.props, key)),
    ...Object.keys(parsed.props).filter(key => !fieldOrder.includes(key)).sort(),
  ]
  const attributes = [
    `version="${parsed.version}"`,
    ...orderedKeys.map(key => `${key}="${escapeAttribute(serializePropValue(parsed.props[key]))}"`),
  ]
  return `<${parsed.componentId} ${attributes.join(' ')} />`
}

function pendingComponentElement(parsed: ParsedWritingComponentSource): string {
  const label = parsed.definition?.label ?? parsed.node?.componentId ?? '未知组件'
  return [
    `<section data-ink-component-source="${escapeAttribute(parsed.source)}" `,
    `data-ink-component-id="${escapeAttribute(parsed.node?.componentId ?? 'Unknown')}" `,
    `data-ink-component-status="${escapeAttribute(parsed.status)}" `,
    `data-ink-component-label="${escapeAttribute(label)}"></section>`,
  ].join('')
}

function renderParsedWritingComponentVisualBody(
  parsed: ParsedWritingComponentSource,
): string | null {
  if (parsed.status !== 'ready' || !parsed.node || !parsed.definition) return null
  return parsed.definition.render(parsed.node.props)
}

export function renderWritingComponentVisualBody(source: string): string | null {
  const parsed = parseWritingComponentSource(source)
  return parsed ? renderParsedWritingComponentVisualBody(parsed) : null
}

export function renderWritingComponentSource(source: string): string | null {
  const parsed = parseWritingComponentSource(source)
  if (!parsed) return null
  const visualBody = renderParsedWritingComponentVisualBody(parsed)
  if (!visualBody || !parsed.node || !parsed.definition) {
    return pendingComponentElement(parsed)
  }
  return [
    `<section data-ink-component-source="${escapeAttribute(parsed.source)}" `,
    `data-ink-component-id="${escapeAttribute(parsed.node.componentId)}" `,
    `data-ink-component-status="ready" `,
    `data-ink-component-label="${escapeAttribute(parsed.definition.label)}">`,
    visualBody,
    '</section>',
  ].join('')
}

type WritingComponentFence = { marker: '`' | '~'; length: number }
function transitionWritingComponentFence(
  line: string,
  current: WritingComponentFence | null,
): { boundary: boolean; fence: WritingComponentFence | null } {
  const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
  if (!match) return { boundary: false, fence: current }
  const marker = match[1][0] as '`' | '~'
  if (!current) return { boundary: true, fence: { marker, length: match[1].length } }
  const closes = marker === current.marker
    && match[1].length >= current.length
    && /^[\t ]*$/.test(match[2])
  return closes ? { boundary: true, fence: null } : { boundary: false, fence: current }
}

export function collectWritingComponentOccurrences(
  markdown: string,
): WritingComponentSourceOccurrence[] {
  const occurrences: WritingComponentSourceOccurrence[] = []
  let fence: WritingComponentFence | null = null
  for (const [lineIndex, line] of markdown.split('\n').entries()) {
    const transition = transitionWritingComponentFence(line, fence)
    fence = transition.fence
    if (transition.boundary || fence) continue
    const parsed = parseWritingComponentSource(line)
    if (!parsed) continue
    occurrences.push({ ordinal: occurrences.length, line: lineIndex + 1, parsed })
  }
  return occurrences
}

export function renderWritingComponentsInMarkdown(markdown: string): string {
  const lines = markdown.split('\n')
  let fence: WritingComponentFence | null = null
  return lines.map(line => {
    const transition = transitionWritingComponentFence(line, fence)
    fence = transition.fence
    if (transition.boundary || fence) return line
    return renderWritingComponentSource(line) ?? line
  }).join('\n')
}

export function degradeWritingComponentsForPlainText(markdown: string): string {
  const lines = markdown.split('\n')
  let fence: WritingComponentFence | null = null
  return lines.map(line => {
    const transition = transitionWritingComponentFence(line, fence)
    fence = transition.fence
    if (transition.boundary || fence) return line
    const parsed = parseWritingComponentSource(line)
    if (!parsed) return line
    if (parsed.status !== 'ready' || !parsed.node || !parsed.definition) return ''

    const node = parsed.node
    const definition = parsed.definition
    const values = definition.fields.flatMap(field => {
      const value = normalizeText(node.props[field.key])
      return value ? [`${field.label}：${value.replace(/\r?\n/g, '；')}`] : []
    })
    return [`[${definition.label}]`, ...values].join('\n')
  }).join('\n')
}

export function insertWritingComponentSourceAtRange(
  markdown: string,
  source: string,
  range: { from: number; to: number },
): WritingComponentSourceInsertion {
  const from = Math.max(0, Math.min(range.from, markdown.length))
  const to = Math.max(from, Math.min(range.to, markdown.length))
  const before = markdown.slice(0, from)
  const after = markdown.slice(to)
  const prefix = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n'
  const suffix = !after || after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n'
  const insertedText = `${prefix}${source}${suffix}`
  return {
    markdown: `${before}${insertedText}${after}`,
    insertedText,
    cursor: from + insertedText.length,
  }
}
