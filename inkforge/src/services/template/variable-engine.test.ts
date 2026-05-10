import { describe, expect, it } from 'vitest'
import {
  extractUserInputVariables,
  formatTemplateDate,
  renderTemplateVariables,
  validateTemplateVariables,
} from './index'

const createdAt = new Date('2026-05-02T09:08:00.000Z')

describe('Template variable engine', () => {
  it('formats supported date tokens deterministically', () => {
    expect(formatTemplateDate(createdAt, 'YYYY-MM-DD HH:mm')).toBe('2026-05-02 17:08')
    expect(formatTemplateDate(createdAt, 'YYYY年MM月DD日')).toBe('2026年05月02日')
  })

  it('renders user, date, author, uuid, week number, and cursor variables', () => {
    const rendered = renderTemplateVariables(
      '# {{title}}\n作者：{{author}}\n日期：{{date:YYYY-MM-DD}}\n周次：{{weekNumber}}\nID：{{uuid}}\n{{CURSOR}}正文',
      {
        userInputs: { title: '真实模板标题' },
        authorName: '本地作者',
        createdAt,
        uuidFactory: () => 'uuid-fixed',
      },
    )

    expect(rendered.content).toContain('# 真实模板标题')
    expect(rendered.content).toContain('作者：本地作者')
    expect(rendered.content).toContain('日期：2026-05-02')
    expect(rendered.content).toContain('周次：18')
    expect(rendered.content).toContain('ID：uuid-fixed')
    expect(rendered.content).not.toContain('{{CURSOR}}')
    expect(rendered.cursorOffset).toBe(rendered.content.indexOf('正文'))
  })

  it('extracts only user-input variables and de-duplicates them', () => {
    expect(extractUserInputVariables('{{title}} {{date:YYYY-MM-DD}} {{title}} {{bookTitle}} {{rating}} {{author}}')).toEqual([
      { name: 'title', label: '文档标题', type: 'text', required: false },
      { name: 'bookTitle', label: '书名', type: 'text', required: false },
      { name: 'rating', label: '评分', type: 'number', required: false },
    ])
  })

  it('validates malformed template variable braces', () => {
    expect(validateTemplateVariables('valid {{title}}').isValid).toBe(true)
    const unclosed = validateTemplateVariables('broken {{title')
    expect(unclosed.isValid).toBe(false)
    expect(unclosed.errors[0]?.position).toBe(7)

    const unexpectedClose = validateTemplateVariables('broken title}}')
    expect(unexpectedClose.isValid).toBe(false)
    expect(unexpectedClose.errors[0]?.message).toContain('Unexpected closing')
  })
})
