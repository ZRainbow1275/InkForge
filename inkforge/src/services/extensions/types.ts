import { z } from 'zod'
import { COMMAND_PERMISSION_VALUES, type Command, type Permission } from '@/types/command-palette'

export const EXTENSION_PERMISSION_VALUES = [
  'editor:read',
  'editor:write',
  'storage:read',
  'storage:write',
  'network:fetch',
  'ui:command',
  'ui:toolbar',
  'ui:menu',
  'theme',
  'export',
] as const

export const SANDBOX_LEVEL_VALUES = ['strict', 'standard'] as const
export const EXTENSION_STATUS_VALUES = ['installed', 'enabled', 'disabled', 'error', 'blocked'] as const

export type ExtensionPermission = typeof EXTENSION_PERMISSION_VALUES[number]
export type ExtensionSandboxLevel = typeof SANDBOX_LEVEL_VALUES[number]
export type ExtensionStatus = typeof EXTENSION_STATUS_VALUES[number]
export type ExtensionSource = 'local-manifest'
export type ExtensionStorageValue = string | number | boolean | null | ExtensionStorageValue[] | { [key: string]: ExtensionStorageValue }
export type ExtensionConfig = Record<string, ExtensionStorageValue>

export interface ExtensionNetworkPolicy {
  allowedOrigins: string[]
}

export interface ExtensionManifest {
  id: string
  name: string
  version: string
  author: string
  description?: string
  entry: string
  inkforgeVersion: string
  permissions: ExtensionPermission[]
  sandboxLevel: ExtensionSandboxLevel
  networkPolicy?: ExtensionNetworkPolicy
  commandPermissions: Permission[]
  configDefaults: ExtensionConfig
}

export interface ExtensionRecord {
  id: string
  profileId: string
  extensionId: string
  manifest: ExtensionManifest
  status: ExtensionStatus
  enabled: boolean
  declaredPermissions: ExtensionPermission[]
  grantedPermissions: ExtensionPermission[]
  sandboxLevel: ExtensionSandboxLevel
  commandPermissions: Permission[]
  source: ExtensionSource
  installedAt: number
  updatedAt: number
  lastActivatedAt?: number
  lastErrorMessage?: string
  runtimeBlockedReason?: string
  errorCount: number
}

export interface ExtensionStorageRecord {
  id: string
  profileId: string
  extensionId: string
  key: string
  value: ExtensionStorageValue
  createdAt: number
  updatedAt: number
}

export interface ExtensionInstallOptions {
  profileId: string
  actorId?: string
  grantedPermissions?: ExtensionPermission[]
  source?: ExtensionSource
}

export interface ExtensionLifecycleResult {
  record: ExtensionRecord
  message: string
}

export interface ExtensionCommandRegistrationInput {
  profileId: string
  extensionId: string
  commands: Command[]
}

const EXTENSION_ID_PATTERN = /^[a-z0-9-]+\.[a-z0-9-]+$/u
const EXTENSION_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u
const EXTENSION_ENTRY_PATTERN = /^[./A-Za-z0-9_-][A-Za-z0-9_./-]*$/u
const EXTENSION_STORAGE_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/u
const LOCAL_HTTP_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function isExtensionStorageValue(value: unknown, depth = 0): value is ExtensionStorageValue {
  if (depth > 8) return false
  if (value === null) return true

  const valueType = typeof value
  if (valueType === 'string' || valueType === 'boolean') return true
  if (valueType === 'number') return Number.isFinite(value)

  if (Array.isArray(value)) {
    return value.every(item => isExtensionStorageValue(item, depth + 1))
  }

  if (valueType === 'object') {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) return false
    return Object.entries(value as Record<string, unknown>).every(([key, nested]) => {
      return key.length > 0 && key.length <= 160 && isExtensionStorageValue(nested, depth + 1)
    })
  }

  return false
}

function isSafeManifestEntry(entry: string): boolean {
  if (!EXTENSION_ENTRY_PATTERN.test(entry)) return false
  if (entry.startsWith('/') || entry.startsWith('\\')) return false
  if (entry.includes('://')) return false
  return !entry.split(/[\\/]+/u).includes('..')
}

export function normalizeExtensionOrigin(origin: string): string | null {
  if (origin.includes('*')) return null
  try {
    const parsed = new URL(origin)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    if (parsed.protocol === 'http:' && !LOCAL_HTTP_HOSTS.has(parsed.hostname)) return null
    if (parsed.origin !== origin) return null
    return parsed.origin
  } catch {
    return null
  }
}

const extensionStorageValueSchema = z.custom<ExtensionStorageValue>(isExtensionStorageValue, {
  message: 'Extension config values must be JSON-serializable primitives, arrays, or plain objects',
})

export const extensionConfigSchema = z.record(
  z.string().regex(EXTENSION_STORAGE_KEY_PATTERN, 'Invalid extension config key'),
  extensionStorageValueSchema,
)

export const extensionNetworkPolicySchema = z.object({
  allowedOrigins: z.array(z.string().refine(value => normalizeExtensionOrigin(value) !== null, 'Allowed origin must be an exact http(s) origin without wildcard'))
    .max(16, 'At most 16 origins are allowed'),
}).strict()

export const extensionManifestSchema = z.object({
  id: z.string().regex(EXTENSION_ID_PATTERN, 'Extension id must use author.name lowercase format'),
  name: z.string().trim().min(1).max(80),
  version: z.string().regex(EXTENSION_VERSION_PATTERN, 'Extension version must be semver-like'),
  author: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  entry: z.string().trim().min(1).max(240).refine(isSafeManifestEntry, 'Entry must be a relative path without parent traversal'),
  inkforgeVersion: z.string().trim().min(1).max(80),
  permissions: z.array(z.enum(EXTENSION_PERMISSION_VALUES)).max(16),
  sandboxLevel: z.enum(SANDBOX_LEVEL_VALUES),
  networkPolicy: extensionNetworkPolicySchema.optional(),
  commandPermissions: z.array(z.enum(COMMAND_PERMISSION_VALUES)).max(8).default([]),
  configDefaults: extensionConfigSchema.default({}),
}).strict().superRefine((manifest, ctx) => {
  if (new Set(manifest.permissions).size !== manifest.permissions.length) {
    ctx.addIssue({ code: 'custom', path: ['permissions'], message: 'Duplicate extension permissions are not allowed' })
  }
  if (new Set(manifest.commandPermissions).size !== manifest.commandPermissions.length) {
    ctx.addIssue({ code: 'custom', path: ['commandPermissions'], message: 'Duplicate command permissions are not allowed' })
  }
  if (manifest.permissions.includes('network:fetch') && (!manifest.networkPolicy || manifest.networkPolicy.allowedOrigins.length === 0)) {
    ctx.addIssue({ code: 'custom', path: ['networkPolicy', 'allowedOrigins'], message: 'network:fetch requires at least one allowed origin' })
  }
}) satisfies z.ZodType<ExtensionManifest>

export const extensionStorageKeySchema = z.string().regex(EXTENSION_STORAGE_KEY_PATTERN, 'Invalid extension storage key')
export const extensionStorageValueSchemaStrict = extensionStorageValueSchema

export function buildExtensionRecordId(profileId: string, extensionId: string): string {
  return `${profileId}::${extensionId}`
}

export function buildExtensionStorageRecordId(profileId: string, extensionId: string, key: string): string {
  return `${profileId}::${extensionId}::${key}`
}
