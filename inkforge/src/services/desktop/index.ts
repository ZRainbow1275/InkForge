import { pickFiles, type FilePickerOptions, type PickedFile } from '@/services/file-picker'
import { isInspectorWidgetId, type InspectorWidgetId } from '@/services/inspector-widgets'
import { getAppInfo, tauriInvoke } from '@/utils/platform'
import { detectDesktopRuntime } from './environment'
import type {
  DesktopCapabilityId,
  DesktopCapabilityState,
  DesktopCapabilityStatus,
  DesktopCommandResult,
  DesktopRuntimeKind,
  DesktopRuntimeSnapshot,
  DesktopRuntimeInfo,
  DesktopWindowInfo,
  LocalDeliveryFileInput,
  LocalDeliveryWriteResult,
} from './types'

export type {
  DesktopCapabilityId,
  DesktopCapabilityState,
  DesktopCapabilityStatus,
  DesktopCommandResult,
  DesktopRuntimeDetection,
  DesktopRuntimeInfo,
  DesktopRuntimeKind,
  DesktopRuntimeSignal,
  DesktopRuntimeSnapshot,
  DesktopWindowInfo,
  LocalDeliveryFileInput,
  LocalDeliveryWriteResult,
  LocalDeliveryWrittenFile,
} from './types'
export { detectDesktopRuntime, detectTauriRuntimeSignal, isDesktopRuntime } from './environment'

const CAPABILITY_LABELS: Record<DesktopCapabilityId, string> = {
  'app-info': 'Application Info',
  'window-management': 'Window Management',
  'native-file-dialog': 'Native File Dialog',
  'file-reveal': 'Reveal in File Manager',
  'shell-open': 'External URL Open',
  'clipboard-text': 'Clipboard Text',
  'file-watch': 'File Watcher',
  'system-tray': 'System Tray',
  'global-shortcut': 'Global Shortcut',
  updater: 'Update Notification',
  'platform-auth': 'Platform Authentication',
  'package-signing': 'Package Signing',
}

function status(id: DesktopCapabilityId, state: DesktopCapabilityState, detail: string): DesktopCapabilityStatus {
  return { id, label: CAPABILITY_LABELS[id], state, detail }
}

export function buildDesktopCapabilityMatrix(kind: DesktopRuntimeKind): DesktopCapabilityStatus[] {
  if (kind === 'tauri') {
    return [
      status('app-info', 'available', 'Resolved through Tauri app/runtime commands.'),
      status('window-management', 'available', 'Rust window commands are registered for create, list, and focus.'),
      status('native-file-dialog', 'available', 'Existing file picker uses Tauri dialog and fs APIs.'),
      status('file-reveal', 'available', 'Rust reveal_in_explorer command validates and opens real paths.'),
      status('shell-open', 'available', 'Tauri shell.open is used for external URLs.'),
      status('clipboard-text', 'available', 'Tauri allowlist includes clipboard text access; rich clipboard remains future scope.'),
      status('file-watch', 'planned', 'Spec watcher/conflict resolution is not enabled in this baseline.'),
      status('system-tray', 'planned', 'Tray menu is reserved for the full Spec 18 slice.'),
      status('global-shortcut', 'planned', 'Global shortcuts are reserved for the full Spec 18 slice.'),
      status('updater', 'planned', 'Updater is configured as inactive until a real release endpoint exists.'),
      status('platform-auth', 'planned', 'Windows Hello and Touch ID are not claimed in this baseline.'),
      status('package-signing', 'planned', 'Signing verification is a CI/release concern, not a local runtime capability.'),
    ]
  }

  return [
    status('app-info', 'degraded', 'Browser mode exposes package-level app identity only.'),
    status('window-management', 'unavailable', 'Browser tabs cannot use Tauri multi-window commands.'),
    status('native-file-dialog', 'degraded', 'Browser file input is real but does not expose persistent native paths.'),
    status('file-reveal', 'unavailable', 'Browser runtime cannot reveal local filesystem paths.'),
    status('shell-open', 'degraded', 'Browser window.open is used with popup-blocker limitations.'),
    status('clipboard-text', 'degraded', 'Browser Clipboard API depends on secure context and user gesture.'),
    status('file-watch', 'unavailable', 'Browser runtime cannot watch arbitrary local folders.'),
    status('system-tray', 'unavailable', 'System tray requires a native desktop runtime.'),
    status('global-shortcut', 'unavailable', 'Global shortcuts require a native desktop runtime.'),
    status('updater', 'unavailable', 'Updater checks are native-release only.'),
    status('platform-auth', 'unavailable', 'OS authentication requires native commands.'),
    status('package-signing', 'unavailable', 'Signing status is not observable from web runtime.'),
  ]
}

function unavailable<T>(message: string, source: DesktopRuntimeKind = detectDesktopRuntime().kind): DesktopCommandResult<T> {
  return { ok: false, reason: 'unavailable', message, source }
}

function failed<T>(message: string, source: DesktopRuntimeKind): DesktopCommandResult<T> {
  return { ok: false, reason: 'failed', message, source }
}

function invalidInput<T>(message: string, source: DesktopRuntimeKind): DesktopCommandResult<T> {
  return { ok: false, reason: 'invalid-input', message, source }
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function invokeNative<T>(command: string, args?: Record<string, unknown>): Promise<DesktopCommandResult<T>> {
  const runtime = detectDesktopRuntime()
  if (runtime.kind !== 'tauri') {
    return unavailable<T>('Native command "' + command + '" is unavailable in web runtime.', runtime.kind)
  }

  try {
    const value = await tauriInvoke<T>(command, args)
    return { ok: true, value, source: runtime.kind }
  } catch (error) {
    return failed<T>(normalizeError(error), runtime.kind)
  }
}

export async function listNativeWindows(): Promise<DesktopCommandResult<DesktopWindowInfo[]>> {
  return invokeNative<DesktopWindowInfo[]>('list_open_windows')
}

export async function createNativeWindow(profileId: string, articleId?: string): Promise<DesktopCommandResult<string>> {
  const trimmedProfileId = profileId.trim()
  if (!trimmedProfileId) {
    return invalidInput<string>('profileId is required to create a native window.', detectDesktopRuntime().kind)
  }

  return invokeNative<string>('create_new_window', {
    profileId: trimmedProfileId,
    articleId: articleId?.trim() || null,
  })
}

export async function focusNativeWindow(windowId: string): Promise<DesktopCommandResult<void>> {
  const trimmedWindowId = windowId.trim()
  if (!trimmedWindowId) {
    return invalidInput<void>('windowId is required to focus a native window.', detectDesktopRuntime().kind)
  }

  return invokeNative<void>('focus_window', { windowId: trimmedWindowId })
}

export async function closeNativeWindow(windowId: string): Promise<DesktopCommandResult<void>> {
  const trimmedWindowId = windowId.trim()
  if (!trimmedWindowId) {
    return invalidInput<void>('windowId is required to close a native window.', detectDesktopRuntime().kind)
  }

  return invokeNative<void>('close_window', { windowId: trimmedWindowId })
}

export async function createInspectorWidgetWindow(
  surfaceId: InspectorWidgetId,
  profileId: string,
  articleId: string,
): Promise<DesktopCommandResult<string>> {
  const trimmedProfileId = profileId.trim()
  const trimmedArticleId = articleId.trim()
  if (!isInspectorWidgetId(surfaceId)) {
    return invalidInput<string>('Inspector widget surface is not allowed.', detectDesktopRuntime().kind)
  }
  if (!trimmedProfileId || !trimmedArticleId) {
    return invalidInput<string>('profileId and articleId are required to create an inspector widget.', detectDesktopRuntime().kind)
  }

  return invokeNative<string>('create_inspector_widget', {
    surfaceId,
    profileId: trimmedProfileId,
    articleId: trimmedArticleId,
  })
}

export async function revealPathInFileManager(filePath: string): Promise<DesktopCommandResult<void>> {
  const trimmedPath = filePath.trim()
  if (!trimmedPath) {
    return invalidInput<void>('filePath is required to reveal a local file.', detectDesktopRuntime().kind)
  }

  return invokeNative<void>('reveal_in_explorer', { path: trimmedPath })
}

export async function openExternalUrl(url: string): Promise<DesktopCommandResult<void>> {
  const runtime = detectDesktopRuntime()
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return invalidInput<void>('URL format is invalid.', runtime.kind)
  }

  if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
    return invalidInput<void>('URL protocol is not allowed: ' + parsed.protocol, runtime.kind)
  }

  if (runtime.kind === 'tauri') {
    try {
      const { open } = await import('@tauri-apps/api/shell')
      await open(parsed.toString())
      return { ok: true, value: undefined, source: runtime.kind }
    } catch (error) {
      return failed<void>(normalizeError(error), runtime.kind)
    }
  }

  const opened = window.open(parsed.toString(), '_blank', 'noopener,noreferrer')
  if (!opened) {
    return failed<void>('Browser blocked the external window.', runtime.kind)
  }
  return { ok: true, value: undefined, source: runtime.kind }
}

function isBrowserClipboardSecure(): boolean {
  return typeof window === 'undefined' || window.isSecureContext !== false
}

function getBrowserClipboard(): Pick<Clipboard, 'readText' | 'writeText'> | null {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return null
  }

  return navigator.clipboard
}

export async function writeClipboardText(text: string): Promise<DesktopCommandResult<void>> {
  const runtime = detectDesktopRuntime()

  if (runtime.kind === 'tauri') {
    try {
      const { writeText } = await import('@tauri-apps/api/clipboard')
      await writeText(text)
      return { ok: true, value: undefined, source: runtime.kind }
    } catch (error) {
      return failed<void>(normalizeError(error), runtime.kind)
    }
  }

  const clipboard = getBrowserClipboard()
  if (!clipboard || typeof clipboard.writeText !== 'function' || !isBrowserClipboardSecure()) {
    return unavailable<void>('Browser Clipboard.writeText is unavailable in this runtime.', runtime.kind)
  }

  try {
    await clipboard.writeText(text)
    return { ok: true, value: undefined, source: runtime.kind }
  } catch (error) {
    return failed<void>(normalizeError(error), runtime.kind)
  }
}

export async function readClipboardText(): Promise<DesktopCommandResult<string | null>> {
  const runtime = detectDesktopRuntime()

  if (runtime.kind === 'tauri') {
    try {
      const { readText } = await import('@tauri-apps/api/clipboard')
      return { ok: true, value: await readText(), source: runtime.kind }
    } catch (error) {
      return failed<string | null>(normalizeError(error), runtime.kind)
    }
  }

  const clipboard = getBrowserClipboard()
  if (!clipboard || typeof clipboard.readText !== 'function' || !isBrowserClipboardSecure()) {
    return unavailable<string | null>('Browser Clipboard.readText is unavailable in this runtime.', runtime.kind)
  }

  try {
    return { ok: true, value: await clipboard.readText(), source: runtime.kind }
  } catch (error) {
    return failed<string | null>(normalizeError(error), runtime.kind)
  }
}

export async function pickNativeDirectory(title = 'Select workspace directory'): Promise<DesktopCommandResult<string>> {
  const runtime = detectDesktopRuntime()
  if (runtime.kind !== 'tauri') {
    return unavailable<string>('Native directory selection is unavailable in web runtime.', runtime.kind)
  }

  try {
    const { open } = await import('@tauri-apps/api/dialog')
    const selected = await open({ directory: true, multiple: false, title })
    if (selected === null) {
      return { ok: false, reason: 'cancelled', message: 'Directory selection was cancelled.', source: runtime.kind }
    }
    if (Array.isArray(selected) || selected.trim().length === 0) {
      return failed<string>('Native directory picker returned an invalid selection.', runtime.kind)
    }
    return { ok: true, value: selected, source: runtime.kind }
  } catch (error) {
    return failed<string>(normalizeError(error), runtime.kind)
  }
}

export async function writeLocalDeliveryBundle(
  files: LocalDeliveryFileInput[],
  pickerTitle = 'Select export directory',
): Promise<DesktopCommandResult<LocalDeliveryWriteResult>> {
  if (files.length === 0) {
    return invalidInput<LocalDeliveryWriteResult>(
      'At least one file is required to write a local delivery bundle.',
      detectDesktopRuntime().kind,
    )
  }

  const result = await invokeNative<LocalDeliveryWriteResult | null>('write_local_delivery_bundle', {
    input: { pickerTitle: pickerTitle.trim() || 'Select export directory', files },
  })
  if (!result.ok) return result
  if (result.value === null) {
    return {
      ok: false,
      reason: 'cancelled',
      message: 'Directory selection was cancelled.',
      source: result.source,
    }
  }
  return { ok: true, value: result.value, source: result.source }
}

export async function openMarkdownFiles(options: FilePickerOptions = {}): Promise<DesktopCommandResult<PickedFile[]>> {
  try {
    const files = await pickFiles({
      accept: ['text/markdown', 'text/plain'],
      multiple: options.multiple ?? true,
      title: options.title ?? 'Open Markdown files',
      ...options,
    })

    return { ok: true, value: files, source: detectDesktopRuntime().kind }
  } catch (error) {
    return failed<PickedFile[]>(normalizeError(error), detectDesktopRuntime().kind)
  }
}

export async function getDesktopRuntimeSnapshot(): Promise<DesktopRuntimeSnapshot> {
  const runtime = detectDesktopRuntime()
  const appInfo = await getAppInfo()
  const fallbackWindows: DesktopWindowInfo[] = []

  if (runtime.kind !== 'tauri') {
    return {
      runtime,
      app: {
        name: appInfo.name,
        version: appInfo.version,
        targetOs: 'web',
        appDataDir: null,
      },
      currentWindow: null,
      windows: fallbackWindows,
      capabilities: buildDesktopCapabilityMatrix(runtime.kind),
      sampledAt: new Date().toISOString(),
      note: 'Web runtime: native desktop APIs are not mocked.',
    }
  }

  const runtimeInfoResult = await invokeNative<DesktopRuntimeInfo>('get_desktop_runtime_info')
  const runtimeInfo = runtimeInfoResult.ok ? runtimeInfoResult.value : null

  const currentWindow: DesktopWindowInfo | null = await (async () => {
    try {
      const { getCurrent } = await import('@tauri-apps/api/window')
      const current = getCurrent()
      return { label: current.label, title: null }
    } catch {
      return null
    }
  })()

  return {
    runtime,
    app: {
      name: runtimeInfo?.productName ?? appInfo.name,
      version: runtimeInfo?.version ?? appInfo.version,
      targetOs: runtimeInfo?.targetOs ?? 'native',
      appDataDir: runtimeInfo?.appDataDir ?? null,
    },
    currentWindow,
    windows: runtimeInfo?.windows ?? fallbackWindows,
    capabilities: buildDesktopCapabilityMatrix(runtime.kind),
    sampledAt: new Date().toISOString(),
    note: runtimeInfoResult.ok
      ? 'Native runtime information loaded from real Tauri commands.'
      : 'Tauri runtime detected, but runtime command failed: ' + runtimeInfoResult.message,
  }
}
