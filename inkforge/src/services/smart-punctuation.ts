export const SMART_PUNCTUATION_RULE_IDS = [
  'curlyQuotes',
  'emDash',
  'ellipsis',
  'spacedDash',
  'arrows',
  'fractions',
  'multiplication',
  'copyrightSymbols',
  'degree',
  'panguSpacing',
] as const

export type SmartPunctuationRuleId = typeof SMART_PUNCTUATION_RULE_IDS[number]

export type SmartPunctuationRuleSettings = Record<SmartPunctuationRuleId, boolean>

export interface SmartPunctuationRuleDefinition {
  id: SmartPunctuationRuleId
  label: string
  description: string
  previewBefore: string
  previewAfter: string
  defaultEnabled: boolean
}

export const SMART_PUNCTUATION_RULE_DEFINITIONS = [
  {
    id: 'curlyQuotes',
    label: '弯引号',
    description: '将直引号转换为中文写作更自然的弯引号，支持双引号和单引号。',
    previewBefore: '"Ink" / \'Ink\'',
    previewAfter: '“Ink” / ‘Ink’',
    defaultEnabled: true,
  },
  {
    id: 'emDash',
    label: '破折号',
    description: '连续输入两个连字符时转换为 em dash。',
    previewBefore: 'Ink--Forge',
    previewAfter: 'Ink—Forge',
    defaultEnabled: true,
  },
  {
    id: 'ellipsis',
    label: '省略号',
    description: '连续输入三个英文句点时转换为省略号。',
    previewBefore: '继续...',
    previewAfter: '继续…',
    defaultEnabled: true,
  },
  {
    id: 'spacedDash',
    label: '空格连字符',
    description: '保守规则，将 - - 转换为破折号，默认关闭以避免误触。',
    previewBefore: 'A - - B',
    previewAfter: 'A — B',
    defaultEnabled: false,
  },
  {
    id: 'arrows',
    label: '箭头符号',
    description: '将 ->、<-、=> 转换为箭头符号，默认关闭以保护代码输入。',
    previewBefore: 'A -> B',
    previewAfter: 'A → B',
    defaultEnabled: false,
  },
  {
    id: 'fractions',
    label: '分数符号',
    description: '将 1/2、1/4、3/4 转换为排版分数，默认关闭。',
    previewBefore: '1/2 cup',
    previewAfter: '½ cup',
    defaultEnabled: false,
  },
  {
    id: 'multiplication',
    label: '乘号',
    description: '将数字间的 x 转换为乘号，默认关闭以避免英文误触。',
    previewBefore: '2x3',
    previewAfter: '2×3',
    defaultEnabled: false,
  },
  {
    id: 'copyrightSymbols',
    label: '版权符号',
    description: '将 (c)、(r)、(tm) 转换为版权、注册商标和商标符号。',
    previewBefore: '(c) (r) (tm)',
    previewAfter: '© ® ™',
    defaultEnabled: true,
  },
  {
    id: 'degree',
    label: '度数符号',
    description: '将数字后的 deg 转换为度数符号，默认关闭。',
    previewBefore: '45 deg',
    previewAfter: '45°',
    defaultEnabled: false,
  },
  {
    id: 'panguSpacing',
    label: '中英文空格',
    description: '在 CJK 字符与英文或数字之间自动补一个空格。',
    previewBefore: '使用Vue3',
    previewAfter: '使用 Vue3',
    defaultEnabled: true,
  },
] as const satisfies readonly SmartPunctuationRuleDefinition[]

export function getDefaultSmartPunctuationRuleSettings(): SmartPunctuationRuleSettings {
  return SMART_PUNCTUATION_RULE_DEFINITIONS.reduce((acc, rule) => {
    acc[rule.id] = rule.defaultEnabled
    return acc
  }, {} as SmartPunctuationRuleSettings)
}

export function normalizeSmartPunctuationRuleSettings(input: unknown): SmartPunctuationRuleSettings {
  const defaults = getDefaultSmartPunctuationRuleSettings()
  if (typeof input !== 'object' || input === null) {
    return defaults
  }

  const candidate = input as Partial<Record<SmartPunctuationRuleId, unknown>>
  const normalized = { ...defaults }

  for (const rule of SMART_PUNCTUATION_RULE_DEFINITIONS) {
    const value = candidate[rule.id]
    if (typeof value === 'boolean') {
      normalized[rule.id] = value
    }
  }

  return normalized
}
