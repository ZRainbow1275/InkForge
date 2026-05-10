export const DEV_PANEL_SHORTCUT = 'Ctrl+Shift+D'
export const DEV_PANEL_TRIPLE_PRESS_COUNT = 3
export const DEV_PANEL_TRIPLE_PRESS_WINDOW_MS = 500

interface StartupGlobalCandidate {
  __INKFORGE_DEV_PANEL__?: unknown
  __INKFORGE_DEV_PANEL_ARGV__?: unknown
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox' ||
    Boolean(target.closest('[contenteditable="true"], [role="textbox"]'))
}

export function isDevPanelKeyboardShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'd'
}

export function shouldIgnoreDevPanelShortcut(event: KeyboardEvent): boolean {
  return event.isComposing || event.defaultPrevented || isEditableTarget(event.target)
}

export class DevPanelKeyChordActivator {
  private timestamps: number[] = []

  constructor(
    private readonly requiredPresses = DEV_PANEL_TRIPLE_PRESS_COUNT,
    private readonly windowMs = DEV_PANEL_TRIPLE_PRESS_WINDOW_MS,
  ) {}

  record(event: KeyboardEvent, now = Date.now()): boolean {
    if (!isDevPanelKeyboardShortcut(event) || shouldIgnoreDevPanelShortcut(event)) {
      return false
    }

    this.timestamps = [...this.timestamps.filter(timestamp => now - timestamp <= this.windowMs), now]
    if (this.timestamps.length >= this.requiredPresses) {
      this.timestamps = []
      return true
    }
    return false
  }

  reset(): void {
    this.timestamps = []
  }
}

export function resolveDevPanelStartupSignal(
  location: Pick<Location, 'search'> | null = typeof window === 'undefined' ? null : window.location,
  globalCandidate: StartupGlobalCandidate = globalThis as StartupGlobalCandidate,
): boolean {
  if (globalCandidate.__INKFORGE_DEV_PANEL__ === true || globalCandidate.__INKFORGE_DEV_PANEL_ARGV__ === true) {
    return true
  }

  const search = location?.search ?? ''
  if (!search) return false

  const params = new URLSearchParams(search)
  return params.get('dev-panel') === '1' || params.get('devPanel') === '1' || params.has('dev-panel')
}