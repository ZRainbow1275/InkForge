/**
 * 平台检测与适配层
 *
 * 自动检测运行环境（Web/Tauri），提供统一的 API 调用接口
 */

/** 运行时平台类型 */
export type Platform = 'web' | 'tauri'

/** 平台检测结果缓存 */
let cachedPlatform: Platform | null = null

/**
 * 检测当前运行平台
 * - Tauri: 桌面应用模式（Windows/macOS/Linux）
 * - Web: 浏览器模式
 */
export function detectPlatform(): Platform {
    if (cachedPlatform) return cachedPlatform

    // Tauri 会在 window 对象上注入 __TAURI__ 标识
    const isTauri = hasTauriGlobal()

    cachedPlatform = isTauri ? 'tauri' : 'web'
    return cachedPlatform
}

/**
 * 是否运行在 Tauri 桌面环境
 */
export function isTauriEnv(): boolean {
    return detectPlatform() === 'tauri'
}

/**
 * 是否运行在 Web 浏览器环境
 */
export function isWebEnv(): boolean {
    return detectPlatform() === 'web'
}

/**
 * Tauri IPC 调用封装（类型安全）
 */
export async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    if (!isTauriEnv()) {
        throw new Error(`tauriInvoke 只能在 Tauri 环境中使用，当前环境: ${detectPlatform()}`)
    }

    // 动态导入 Tauri API（避免 Web 环境报错）
    const { invoke } = await import('@tauri-apps/api/tauri')
    return invoke<T>(cmd, args)
}

/**
 * 平台相关的应用信息
 */
export interface AppInfo {
    platform: Platform
    version: string
    name: string
}

/**
 * 获取应用信息
 */
export async function getAppInfo(): Promise<AppInfo> {
    const platform = detectPlatform()

    if (platform === 'tauri') {
        try {
            const { getName, getVersion } = await import('@tauri-apps/api/app')
            const [name, version] = await Promise.all([getName(), getVersion()])
            return { platform, name, version }
        } catch {
            return { platform, name: 'InkForge', version: '0.1.0' }
        }
    }

    // Web 环境从 package.json 或环境变量获取
    return {
        platform,
        name: 'InkForge',
        version: import.meta.env.VITE_APP_VERSION || '0.1.0'
    }
}

/**
 * 类型安全地检查 window.__TAURI__ 是否存在
 * 避免与 @tauri-apps/api 或 vite-env.d.ts 中的 declare global 声明冲突
 */
function hasTauriGlobal(): boolean {
    return typeof window !== 'undefined' &&
        '__TAURI__' in window &&
        (window as unknown as Record<string, unknown>).__TAURI__ !== undefined
}
