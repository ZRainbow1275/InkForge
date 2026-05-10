import { z } from 'zod'

export const DEFAULT_PROFILE_ID = 'local-default'
export const PROFILE_ID_LENGTH = 21
export const PROFILE_SOFT_DELETE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

export const PROFILE_AVATAR_ICON_VALUES = [
  'User',
  'UserCircle',
  'UserSquare',
  'Contact',
  'Badge',
  'PersonStanding',
  'UserCheck',
  'UserCog',
  'Users',
  'BriefcaseBusiness',
  'GraduationCap',
  'PenTool',
] as const

export const PROFILE_STATUS_VALUES = ['active', 'deleted'] as const
export const PROFILE_FILE_ROOT_STATUS_VALUES = ['unassigned', 'selected', 'native-unavailable'] as const
export const PROFILE_THEME_VALUES = ['light', 'dark'] as const
export const PROFILE_PAPER_WIDTH_VALUES = ['narrow', 'standard', 'wide', 'fullwidth'] as const
export const PROFILE_TOOLBAR_MODE_VALUES = ['simple', 'full'] as const
export const PROFILE_EDITOR_MODE_VALUES = ['typora', 'source', 'preview'] as const

export const PROFILE_ACCENT_PRESETS = [
  '#2563EB',
  '#7C3AED',
  '#059669',
  '#EA580C',
  '#DC2626',
  '#0891B2',
  '#B45309',
  '#475569',
] as const

export type ProfileAvatarIcon = typeof PROFILE_AVATAR_ICON_VALUES[number]
export type ProfileStatus = typeof PROFILE_STATUS_VALUES[number]
export type ProfileFileRootStatus = typeof PROFILE_FILE_ROOT_STATUS_VALUES[number]
export type ProfileTheme = typeof PROFILE_THEME_VALUES[number]
export type ProfilePaperWidth = typeof PROFILE_PAPER_WIDTH_VALUES[number]
export type ProfileToolbarMode = typeof PROFILE_TOOLBAR_MODE_VALUES[number]
export type ProfileEditorMode = typeof PROFILE_EDITOR_MODE_VALUES[number]

export interface ProfileSyncConfig {
  providerId: string
  enabled: boolean
  lastSyncAt?: number
}

export interface ProfileSettings {
  theme: ProfileTheme
  fontSize: number
  fontFamily: string
  paperWidth: ProfilePaperWidth
  toolbarMode: ProfileToolbarMode
  editorMode: ProfileEditorMode
}

export interface ProfileRecord {
  id: string
  name: string
  avatarIcon: ProfileAvatarIcon
  colorAccent: string
  fileRoot: string | null
  fileRootStatus: ProfileFileRootStatus
  dbNamespace: string
  status: ProfileStatus
  createdAt: number
  updatedAt: number
  lastActiveAt: number
  deletedAt?: number
  sourceAccountId?: string
  syncConfig?: ProfileSyncConfig
  settingsOverride?: Partial<ProfileSettings>
}

export interface ProfileCreateInput {
  name: string
  avatarIcon?: ProfileAvatarIcon
  colorAccent?: string
  fileRoot?: string | null
  fileRootStatus?: ProfileFileRootStatus
  syncConfig?: ProfileSyncConfig
  settingsOverride?: Partial<ProfileSettings>
}

export interface ProfileSharedTemplateRecord {
  id: string
  name: string
  content: string
  version: number
  createdAt: number
  updatedAt: number
}

export interface ProfileSharedExportPresetRecord {
  id: string
  name: string
  platform: string
  options: Record<string, unknown>
  createdAt: number
  updatedAt: number
}

export interface ProfileSharedAIConfigRecord {
  id: string
  provider: string
  endpoint?: string
  createdAt: number
  updatedAt: number
}

export interface ProfileDatabaseMetadataRecord {
  id: string
  profileId: string
  profileName: string
  dbNamespace: string
  schemaVersion: 1
  createdAt: number
  updatedAt: number
}

const URL_SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{21}$/u
const UUID_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const DB_NAMESPACE_PATTERN = /^inkforge-[A-Za-z0-9_-]{21}$|^inkforge-local-default$|^inkforge-[0-9a-f-]{36}$/iu
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/u
const URL_SAFE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-'

export function isProfileId(value: string): boolean {
  return value === DEFAULT_PROFILE_ID || URL_SAFE_ID_PATTERN.test(value) || UUID_ID_PATTERN.test(value)
}

export function buildProfileDatabaseNamespace(profileId: string): string {
  if (!isProfileId(profileId)) {
    throw new Error(`Invalid profile id: ${profileId}`)
  }
  return `inkforge-${profileId}`
}

export function generateProfileId(): string {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new Error('Secure random profile id generation is unavailable in this runtime')
  }

  const bytes = new Uint8Array(PROFILE_ID_LENGTH)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => URL_SAFE_ALPHABET[byte & 63]).join('')
}

export function normalizeProfileFileRoot(value: string): string {
  return value.trim().replace(/\+/gu, '/').replace(/\/+/gu, '/').replace(/\/$/u, '')
}

export function normalizeProfileFileRootForComparison(value: string): string {
  return normalizeProfileFileRoot(value).toLowerCase()
}

export function isRecoverableDeletedProfile(profile: Pick<ProfileRecord, 'status' | 'deletedAt'>, now = Date.now()): boolean {
  return profile.status === 'deleted'
    && typeof profile.deletedAt === 'number'
    && now - profile.deletedAt < PROFILE_SOFT_DELETE_RETENTION_MS
}

export function assertUniqueProfileName(name: string, profiles: readonly ProfileRecord[], selfId?: string): void {
  const normalized = name.trim().toLowerCase()
  const duplicate = profiles.some(profile => {
    return profile.id !== selfId && profile.status === 'active' && profile.name.trim().toLowerCase() === normalized
  })
  if (duplicate) {
    throw new Error('工作区名称已存在')
  }
}

export function validateProfileFileRoot(candidate: string | null | undefined, profiles: readonly ProfileRecord[], selfId?: string): string | null {
  if (!candidate) {
    return null
  }

  const normalized = normalizeProfileFileRoot(candidate)
  if (normalized.length === 0) {
    return null
  }

  const comparable = normalizeProfileFileRootForComparison(normalized)
  const conflict = profiles.find(profile => {
    if (profile.id === selfId || !profile.fileRoot) return false
    const other = normalizeProfileFileRootForComparison(profile.fileRoot)
    return comparable === other || comparable.startsWith(`${other}/`) || other.startsWith(`${comparable}/`)
  })

  if (conflict) {
    throw new Error(`文件根目录与工作区「${conflict.name}」重叠`)
  }

  return normalized
}

export const profileSyncConfigSchema = z.object({
  providerId: z.string().trim().min(1),
  enabled: z.boolean(),
  lastSyncAt: z.number().int().nonnegative().optional(),
}).strict()

export const profileSettingsSchema = z.object({
  theme: z.enum(PROFILE_THEME_VALUES),
  fontSize: z.number().int().min(10).max(32),
  fontFamily: z.string().trim().min(1).max(120),
  paperWidth: z.enum(PROFILE_PAPER_WIDTH_VALUES),
  toolbarMode: z.enum(PROFILE_TOOLBAR_MODE_VALUES),
  editorMode: z.enum(PROFILE_EDITOR_MODE_VALUES),
}).strict()

export const profileRecordSchema = z.object({
  id: z.string().refine(isProfileId, 'Invalid profile id'),
  name: z.string().trim().min(1, '工作区名称不能为空').max(50, '工作区名称最多 50 个字符'),
  avatarIcon: z.enum(PROFILE_AVATAR_ICON_VALUES),
  colorAccent: z.string().regex(HEX_COLOR_PATTERN, '强调色必须是 hex 颜色'),
  fileRoot: z.string().trim().min(1).nullable(),
  fileRootStatus: z.enum(PROFILE_FILE_ROOT_STATUS_VALUES),
  dbNamespace: z.string().regex(DB_NAMESPACE_PATTERN, 'Invalid profile database namespace'),
  status: z.enum(PROFILE_STATUS_VALUES),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  lastActiveAt: z.number().int().nonnegative(),
  deletedAt: z.number().int().nonnegative().optional(),
  sourceAccountId: z.string().min(1).optional(),
  syncConfig: profileSyncConfigSchema.optional(),
  settingsOverride: profileSettingsSchema.partial().optional(),
}).strict().superRefine((profile, ctx) => {
  const expectedNamespace = `inkforge-${profile.id}`
  if (profile.dbNamespace !== expectedNamespace) {
    ctx.addIssue({ code: 'custom', path: ['dbNamespace'], message: `dbNamespace must be ${expectedNamespace}` })
  }
  if (profile.fileRootStatus === 'selected' && !profile.fileRoot) {
    ctx.addIssue({ code: 'custom', path: ['fileRoot'], message: 'selected file root status requires fileRoot' })
  }
  if (profile.status === 'deleted' && typeof profile.deletedAt !== 'number') {
    ctx.addIssue({ code: 'custom', path: ['deletedAt'], message: 'deleted profiles require deletedAt' })
  }
}) satisfies z.ZodType<ProfileRecord>

export const profileCreateInputSchema = z.object({
  name: z.string().trim().min(1, '工作区名称不能为空').max(50, '工作区名称最多 50 个字符'),
  avatarIcon: z.enum(PROFILE_AVATAR_ICON_VALUES).optional(),
  colorAccent: z.string().regex(HEX_COLOR_PATTERN, '强调色必须是 hex 颜色').optional(),
  fileRoot: z.string().trim().min(1).nullable().optional(),
  fileRootStatus: z.enum(PROFILE_FILE_ROOT_STATUS_VALUES).optional(),
  syncConfig: profileSyncConfigSchema.optional(),
  settingsOverride: profileSettingsSchema.partial().optional(),
}).strict() satisfies z.ZodType<ProfileCreateInput>

export function parseProfileRecord(input: unknown): ProfileRecord {
  return profileRecordSchema.parse(input)
}

export function parseProfileCreateInput(input: ProfileCreateInput): ProfileCreateInput {
  return profileCreateInputSchema.parse(input)
}
