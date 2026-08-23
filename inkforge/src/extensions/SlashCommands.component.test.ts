import { describe, expect, it } from 'vitest'

import { SLASH_COMMANDS } from './SlashCommands'

describe('SlashCommands component entry', () => {
  it('exposes the Chinese writing component command', () => {
    expect(SLASH_COMMANDS).toContainEqual(expect.objectContaining({
      id: 'component',
      label: '组件库',
      description: '配置并插入结构化组件',
      icon: 'Blocks',
      category: 'insert',
    }))
  })
})
