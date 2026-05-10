export enum CommandGroup {
  Editor = 'editor',
  Document = 'document',
  Hub = 'hub',
  Export = 'export',
  Publish = 'publish',
  View = 'view',
  Settings = 'settings',
  AI = 'ai',
  Extension = 'extension',
}

export enum CommandScope {
  Global = 'global',
  Document = 'document',
  Editor = 'editor',
  Hub = 'hub',
}

export enum CommandContextTag {
  Global = 'global',
  Document = 'document',
  Editor = 'editor',
  Selection = 'selection',
  CodeBlockContext = 'codeBlockContext',
  TableContext = 'tableContext',
  ListContext = 'listContext',
  ImageContext = 'imageContext',
  MathContext = 'mathContext',
  HubPage = 'hubPage',
  FileManagerPage = 'fileManagerPage',
  SettingsPage = 'settingsPage',
}

export type CommandEditorMode = 'typora' | 'source' | 'preview'

export interface EditorSelection {
  from: number
  to: number
  text: string
}

export interface CursorContext {
  blockType:
    | 'paragraph'
    | 'heading'
    | 'codeBlock'
    | 'table'
    | 'tableCell'
    | 'image'
    | 'mathBlock'
    | 'detailsBlock'
    | 'listItem'
    | 'blockquote'
    | 'footnote'
  inCodeBlock: boolean
  inTable: boolean
  headingLevel: number | null
  hasSelection: boolean
}

export interface CommandContext {
  activeDocumentId: string | null
  cursorContext: CursorContext | null
  selection: EditorSelection | null
  editorMode: CommandEditorMode | null
  currentRoute: string
  triggerSource: 'keyboard' | 'toolbar' | 'context-menu'
  activeContexts: CommandContextTag[]
  permissions: Permission[]
}

export interface Command {
  id: string
  title: string
  subtitle?: string
  keywords: string[]
  icon: string
  scope: CommandScope
  handler: (context: CommandContext) => Promise<void> | void
  shortcut?: string
  group: CommandGroup
  contexts: CommandContextTag[]
  isDestructive?: boolean
  requiresVersionCheckpoint?: boolean
  auditLogged?: boolean
  subcommands?: SubCommand[]
  requiredPermissions?: Permission[]
  featured?: boolean
  since?: string
}

export interface SubCommand {
  id: string
  title: string
  subtitle?: string
  icon?: string
  handler: (context: CommandContext) => Promise<void> | void
  isDestructive?: boolean
}

export const COMMAND_PERMISSION_VALUES = [
  'document.read',
  'document.write',
  'document.delete',
  'settings.read',
  'settings.write',
  'export.execute',
  'publish.execute',
  'network.request',
] as const

export type Permission = typeof COMMAND_PERMISSION_VALUES[number]

export interface ExtensionManifest {
  id: string
  name: string
  version: string
  permissions: Permission[]
  sandboxLevel: 'strict' | 'standard'
}

export interface RegisterResult {
  registered: string[]
  rejected: { id: string; reason: string }[]
}

export interface CommandHistoryEntry {
  commandId: string
  executedAt: number
  query: string
}

export interface CommandMatchRange {
  key: 'title' | 'subtitle' | 'keywords' | 'group'
  indices: [number, number][]
}

export interface SearchResult {
  command: Command
  score: number
  matches: CommandMatchRange[]
}

export interface OpenOptions {
  initialQuery?: string
  contextFilter?: CommandContextTag[]
  triggerSource?: CommandContext['triggerSource']
}

export interface ExecuteResult {
  success: boolean
  commandId: string
  error?: Error
  versionCheckpointCreated: boolean
  auditLogged: boolean
}

export interface CanExecuteResult {
  canExecute: boolean
  reason?: 'permission_denied' | 'context_mismatch' | 'command_not_found'
}

export type GroupedResults = {
  group: CommandGroup
  label: string
  commands: SearchResult[]
}[]

export interface QuickCommandSection {
  id: 'recent' | 'featured' | 'favorites'
  title: string
  commands: SearchResult[]
}

export interface WorkstationCommandBridge {
  activeDocumentId: string | null
  editorMode: CommandEditorMode
  isFocusMode: boolean
  canExport: boolean
  actions: {
    toggleFocusMode: () => void
    toggleTypewriterMode: () => void
    switchEditorMode: (mode: CommandEditorMode) => Promise<void> | void
    openExportModal: () => void
    toggleManagerPanel: () => void
    togglePreviewMode: () => Promise<void> | void
    toggleSplitView: () => void
  }
}

export class DuplicateCommandError extends Error {
  constructor(commandId: string) {
    super(`Command with id "${commandId}" is already registered`)
    this.name = 'DuplicateCommandError'
  }
}

export class PermissionDeniedError extends Error {
  constructor(commandId: string, permission: Permission) {
    super(`Command "${commandId}" requires permission "${permission}"`)
    this.name = 'PermissionDeniedError'
  }
}
