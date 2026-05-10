/**
 * 加密服务 - 类型定义
 */

/** 加密后的数据格式（Base64 编码的 IV + Ciphertext） */
export interface EncryptedData {
    /** 标识这是加密数据 */
    __encrypted: true
    /** Base64 编码的加密数据（IV || Ciphertext） */
    data: string
    /** 加密版本：2=真随机密钥 */
    version: 2
}

/** 未加密数据标记（加密禁用时使用） */
export interface UnencryptedData {
    /** 标识这是未加密数据 */
    __encrypted: false
    /** Base64 编码的原始数据 */
    data: string
    /** 版本标记 */
    version: 0
}

/** 包装后的主密钥存储格式 */
export interface WrappedMasterKey {
    /** 包装后的密钥数据（Base64） */
    wrappedKey: string
    /** 包装时使用的 IV（Base64） */
    iv: string
    /** 版本号 */
    version: number
}

/** 密钥导出格式 */
export interface ExportedKeyBundle {
    /** 导出版本 */
    version: number
    /** 加密后的主密钥（使用导出密码加密） */
    encryptedKey: string
    /** 加密 IV（Base64） */
    iv: string
    /** 密钥派生盐值（Base64） */
    salt: string
    /** 创建时间 */
    createdAt: string
    /** 校验和（用于验证导入完整性） */
    checksum: string
}

/** Tauri IPC 命令接口定义 */
export interface TauriKeyChainCommands {
    /** 将密钥存储到系统密钥链 */
    store_key: (args: { keyId: string; keyData: string }) => Promise<void>
    /** 从系统密钥链获取密钥 */
    get_key: (args: { keyId: string }) => Promise<string | null>
    /** 从系统密钥链删除密钥 */
    delete_key: (args: { keyId: string }) => Promise<void>
}

/** Tauri invoke 函数类型 */
export type TauriInvoke = <T extends keyof TauriKeyChainCommands>(
    cmd: T,
    args: Parameters<TauriKeyChainCommands[T]>[0]
) => ReturnType<TauriKeyChainCommands[T]>

/** 密钥操作类型 */
export type KeyOperationType = 'generate' | 'load' | 'access' | 'cache_hit' | 'cache_clear' | 'wrap' | 'unwrap' | 'export' | 'import'

/** 需要加密的敏感字段列表 */
export const SENSITIVE_FIELDS = [
    'rawContent',
    'markdownSource',
    'htmlCache',
    'aiSummary',
    'body',
    'transcript'
] as const

export type SensitiveField = typeof SENSITIVE_FIELDS[number]

/** 判断是否为加密数据 */
export function isEncryptedData(value: unknown): value is EncryptedData {
    return (
        typeof value === 'object' &&
        value !== null &&
        '__encrypted' in value &&
        (value as EncryptedData).__encrypted === true &&
        'data' in value &&
        'version' in value
    )
}

/** 判断是否为未加密标记数据 */
export function isUnencryptedData(value: unknown): value is UnencryptedData {
    return (
        typeof value === 'object' &&
        value !== null &&
        '__encrypted' in value &&
        (value as UnencryptedData).__encrypted === false &&
        'data' in value &&
        'version' in value &&
        (value as UnencryptedData).version === 0
    )
}
