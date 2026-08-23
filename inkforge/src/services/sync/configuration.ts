import { z } from 'zod'
import {
    type ConflictStrategy,
    type SyncConfig,
    type SyncCredentials,
    type SyncProvider,
} from './provider'
import { GitProvider } from './providers/git'
import { SelfHostedProvider } from './providers/self-hosted'
import { WebDAVProvider } from './providers/webdav'

export const SYNC_CONFIGURATION_VERSION = 1
export const SYNC_PROVIDER_SELECTIONS = ['none', 'webdav', 'self-hosted', 'git'] as const
export const SYNC_AUTH_MODES = ['none', 'token', 'basic', 'ssh'] as const

export type SyncProviderSelection = typeof SYNC_PROVIDER_SELECTIONS[number]
export type SyncAuthMode = typeof SYNC_AUTH_MODES[number]

const SyncProfileConfigurationSchema = z.object({
    version: z.literal(SYNC_CONFIGURATION_VERSION),
    profileId: z.string().trim().min(1).max(120),
    providerId: z.enum(SYNC_PROVIDER_SELECTIONS),
    displayName: z.string().trim().min(1).max(120),
    endpoint: z.string().trim().max(2048),
    authMode: z.enum(SYNC_AUTH_MODES),
    username: z.string().trim().max(200),
    keyPath: z.string().trim().max(2048),
    syncIntervalMs: z.number().int().min(30_000).max(86_400_000),
    conflictStrategy: z.enum(['three-way-merge', 'manual-always']),
    enabled: z.boolean(),
    autoSync: z.boolean(),
    updatedAt: z.number().int().nonnegative(),
}).strict()

const SyncConfigurationRegistrySchema = z.object({
    version: z.literal(SYNC_CONFIGURATION_VERSION),
    profiles: z.record(z.string(), SyncProfileConfigurationSchema),
}).strict()

export type SyncProfileConfiguration = z.infer<typeof SyncProfileConfigurationSchema>

export type SyncConfigurationResult<T> =
    | { ok: true; value: T }
    | { ok: false; message: string }

const STORAGE_KEY = 'inkforge-sync-configuration-v1'

export function getDefaultSyncProfileConfiguration(profileId: string): SyncProfileConfiguration {
    return {
        version: SYNC_CONFIGURATION_VERSION,
        profileId: profileId.trim(),
        providerId: 'none',
        displayName: 'InkForge 同步',
        endpoint: '',
        authMode: 'none',
        username: '',
        keyPath: '',
        syncIntervalMs: 300_000,
        conflictStrategy: 'three-way-merge',
        enabled: false,
        autoSync: false,
        updatedAt: 0,
    }
}

export function validateSyncProfileConfiguration(
    input: unknown
): SyncConfigurationResult<SyncProfileConfiguration> {
    const result = SyncProfileConfigurationSchema.safeParse(input)
    if (!result.success) {
        return {
            ok: false,
            message: result.error.issues
                .map(issue => `${issue.path.join('.') || 'configuration'}: ${issue.message}`)
                .join('; '),
        }
    }

    const config = result.data
    if (config.providerId === 'none') {
        return { ok: true, value: config }
    }
    if (!config.endpoint) {
        return { ok: false, message: '同步端点不能为空' }
    }
    if (config.authMode === 'basic' && !config.username) {
        return { ok: false, message: 'Basic 认证需要用户名' }
    }
    if (config.authMode === 'ssh' && !config.keyPath) {
        return { ok: false, message: 'SSH 认证需要私钥路径' }
    }
    if (config.providerId !== 'git' && config.authMode === 'ssh') {
        return { ok: false, message: 'SSH 认证仅适用于 Git Provider' }
    }
    if (config.providerId === 'git' && config.endpoint.toLowerCase().startsWith('http://')) {
        return { ok: false, message: 'Git remote 必须使用 HTTPS 或 SSH' }
    }
    return { ok: true, value: config }
}

function readRegistry(): SyncConfigurationResult<z.infer<typeof SyncConfigurationRegistrySchema>> {
    if (typeof localStorage === 'undefined') {
        return { ok: false, message: '同步元数据存储仅在 InkForge 应用运行时可用' }
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) {
            return {
                ok: true,
                value: { version: SYNC_CONFIGURATION_VERSION, profiles: {} },
            }
        }
        const parsed = SyncConfigurationRegistrySchema.safeParse(JSON.parse(raw))
        if (!parsed.success) {
            return { ok: false, message: '同步配置文件无效，请重新保存配置' }
        }
        return { ok: true, value: parsed.data }
    } catch (error) {
        return {
            ok: false,
            message: `同步配置读取失败: ${error instanceof Error ? error.message : String(error)}`,
        }
    }
}

export function loadSyncProfileConfiguration(
    profileId: string
): SyncConfigurationResult<SyncProfileConfiguration> {
    const normalizedProfileId = profileId.trim()
    if (!normalizedProfileId) return { ok: false, message: 'profileId 不能为空' }
    const registry = readRegistry()
    if (!registry.ok) return registry
    return {
        ok: true,
        value: registry.value.profiles[normalizedProfileId]
            ?? getDefaultSyncProfileConfiguration(normalizedProfileId),
    }
}

export function saveSyncProfileConfiguration(
    input: SyncProfileConfiguration
): SyncConfigurationResult<SyncProfileConfiguration> {
    const validated = validateSyncProfileConfiguration({
        ...input,
        updatedAt: Date.now(),
    })
    if (!validated.ok) return validated
    const registry = readRegistry()
    if (!registry.ok) return registry

    const next: z.infer<typeof SyncConfigurationRegistrySchema> = {
        version: SYNC_CONFIGURATION_VERSION,
        profiles: {
            ...registry.value.profiles,
            [validated.value.profileId]: validated.value,
        },
    }
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return { ok: true, value: validated.value }
    } catch (error) {
        return {
            ok: false,
            message: `同步配置保存失败: ${error instanceof Error ? error.message : String(error)}`,
        }
    }
}

export function requiresSyncSecret(config: SyncProfileConfiguration): boolean {
    return config.authMode === 'token'
        || config.authMode === 'basic'
        || config.authMode === 'ssh'
}

function buildRuntimeCredentials(
    config: SyncProfileConfiguration,
    secret: string | null
): SyncCredentials {
    if (config.authMode === 'none') return { kind: 'none' }
    if (!secret?.trim()) {
        throw new Error('系统凭据库中没有当前同步 Provider 所需的运行时密钥')
    }
    if (config.authMode === 'token') return { kind: 'token', token: secret.trim() }
    if (config.authMode === 'basic') {
        return {
            kind: 'basic-secret',
            username: config.username,
            password: secret,
        }
    }
    return {
        kind: 'ssh',
        keyPath: config.keyPath,
        passphrase: secret,
    }
}

export function toRuntimeSyncConfig(
    config: SyncProfileConfiguration,
    secret: string | null
): SyncConfig {
    if (config.providerId === 'none') {
        throw new Error('未选择同步 Provider')
    }
    return {
        providerId: config.providerId,
        displayName: config.displayName,
        endpoint: config.endpoint,
        credentials: buildRuntimeCredentials(config, secret),
        options: {},
        syncIntervalMs: config.syncIntervalMs,
        conflictStrategy: config.conflictStrategy as ConflictStrategy,
        enabled: config.enabled,
        profileId: config.profileId,
    }
}

export function createConfiguredSyncProvider(
    config: SyncProfileConfiguration,
    secret: string | null
): SyncProvider {
    const runtimeConfig = toRuntimeSyncConfig(config, secret)
    switch (config.providerId) {
        case 'webdav':
            return new WebDAVProvider(runtimeConfig)
        case 'self-hosted':
            return new SelfHostedProvider(runtimeConfig)
        case 'git':
            return new GitProvider(runtimeConfig)
        case 'none':
            throw new Error('未选择同步 Provider')
    }
}
