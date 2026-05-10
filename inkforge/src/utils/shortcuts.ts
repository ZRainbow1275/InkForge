const MODIFIER_ALIASES: Record<string, 'Ctrl' | 'Shift' | 'Alt'> = {
  CTRL: 'Ctrl',
  CONTROL: 'Ctrl',
  CMD: 'Ctrl',
  COMMAND: 'Ctrl',
  META: 'Ctrl',
  MOD: 'Ctrl',
  SHIFT: 'Shift',
  ALT: 'Alt',
  OPTION: 'Alt',
}

const NAMED_KEY_ALIASES: Record<string, string> = {
  ESC: 'Escape',
  ESCAPE: 'Escape',
  SPACE: 'Space',
  SPACEBAR: 'Space',
  RETURN: 'Enter',
  ENTER: 'Enter',
  BACKSPACE: 'Backspace',
  DELETE: 'Delete',
  DEL: 'Delete',
  TAB: 'Tab',
}

const MODIFIER_EVENT_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'OS'])

const PHYSICAL_CODE_ALIASES: Record<string, string> = {
  Backquote: '`',
  Backslash: '\\',
  BracketLeft: '[',
  BracketRight: ']',
  Comma: ',',
  Equal: '=',
  IntlBackslash: '\\',
  Minus: '-',
  NumpadAdd: '+',
  NumpadDecimal: '.',
  NumpadDivide: '/',
  NumpadEnter: 'Enter',
  NumpadMultiply: '*',
  NumpadSubtract: '-',
  Period: '.',
  Quote: "'",
  Semicolon: ';',
  Slash: '/',
  Space: 'Space',
}

export function normalizeShortcutKey(key: string): string | null {
  const trimmed = key.trim()
  if (!trimmed) {
    return null
  }

  const upper = trimmed.toUpperCase()
  const alias = NAMED_KEY_ALIASES[upper]
  if (alias) {
    return alias
  }

  if (/^F\d{1,2}$/i.test(trimmed)) {
    return upper
  }

  if (trimmed.length === 1) {
    return trimmed.toUpperCase()
  }

  return trimmed
}

export function normalizeShortcutBinding(binding: string | undefined): string | null {
  if (!binding) {
    return null
  }

  const rawParts = binding
    .split('+')
    .map(part => part.trim())
    .filter(Boolean)

  if (rawParts.length === 0) {
    return null
  }

  const modifiers = new Set<'Ctrl' | 'Shift' | 'Alt'>()
  const keyParts: string[] = []

  for (const part of rawParts) {
    const modifier = MODIFIER_ALIASES[part.toUpperCase()]
    if (modifier) {
      modifiers.add(modifier)
      continue
    }

    const normalizedKey = normalizeShortcutKey(part)
    if (normalizedKey) {
      keyParts.push(normalizedKey)
    }
  }

  const key = keyParts[keyParts.length - 1]
  if (!key) {
    return null
  }

  const orderedParts: string[] = []
  if (modifiers.has('Ctrl')) orderedParts.push('Ctrl')
  if (modifiers.has('Shift')) orderedParts.push('Shift')
  if (modifiers.has('Alt')) orderedParts.push('Alt')
  orderedParts.push(key)

  return orderedParts.join('+')
}

export function keyboardEventMainKey(event: KeyboardEvent): string | null {
  if (MODIFIER_EVENT_KEYS.has(event.key)) {
    return null
  }

  if (event.code.startsWith('Key')) {
    return event.code.slice(3).toUpperCase()
  }

  if (event.code.startsWith('Digit')) {
    return event.code.slice(5)
  }

  if (event.code.startsWith('Numpad') && /^Numpad\d$/u.test(event.code)) {
    return event.code.slice(6)
  }

  const physicalKey = PHYSICAL_CODE_ALIASES[event.code]
  if (physicalKey) {
    return physicalKey
  }

  return normalizeShortcutKey(event.key === ' ' ? 'Space' : event.key)
}

export function keyboardEventToShortcut(event: KeyboardEvent): string | null {
  const key = keyboardEventMainKey(event)
  if (!key) {
    return null
  }

  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) {
    parts.push('Ctrl')
  }
  if (event.shiftKey) {
    parts.push('Shift')
  }
  if (event.altKey) {
    parts.push('Alt')
  }
  parts.push(key)

  return parts.join('+')
}

export function matchesKeyboardShortcut(event: KeyboardEvent, binding: string | undefined): boolean {
  const normalizedEvent = keyboardEventToShortcut(event)
  const normalizedBinding = normalizeShortcutBinding(binding)

  return normalizedEvent !== null && normalizedBinding !== null && normalizedEvent === normalizedBinding
}

export function shouldIgnoreShortcutEvent(event: KeyboardEvent): boolean {
  return event.isComposing || event.defaultPrevented
}
