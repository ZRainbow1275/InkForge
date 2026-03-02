/**
 * .inkforge 二进制文件格式
 *
 * 布局:
 * [Magic: 4B "INKF"] [Version: 2B] [Flags: 2B]
 * [Key ID: 16B (UUID)] [IV/Nonce: 12B] [Salt: 16B]
 * [Metadata Length: 4B (LE uint32)] [Metadata (encrypted JSON)]
 * [Payload Length: 4B (LE uint32)] [Payload (encrypted body)]
 * [Payload IV: 12B] [Auth Tag: 16B (GCM tag, 包含在密文中)]
 *
 * 安全设计:
 * - AES-256-GCM 加密，每个文档独立 Content Key (HKDF 派生)
 * - Metadata 和 Payload 使用不同 IV 分别加密
 * - Magic Number 作为 AAD (Additional Authenticated Data)
 * - 完整性由 GCM auth tag 保证
 */

import { generateId } from '@/utils/uuid'
import { deriveContentKey, generateSalt, generateIV } from './key-derivation'

// ===================================================================
// 常量定义
// ===================================================================

/** 魔数标识 "INKF" */
export const INKFORGE_MAGIC = new Uint8Array([0x49, 0x4e, 0x4b, 0x46])

/** 文件格式版本 */
export const INKFORGE_FORMAT_VERSION = 1

/** 头部固定区域长度: Magic(4) + Version(2) + Flags(2) + KeyID(16) + IV(12) + Salt(16) = 52 bytes */
const FIXED_HEADER_LENGTH = 52

/** Flags 位定义 */
export const FORMAT_FLAGS = {
    /** bit 0: 内容已压缩 (gzip) */
    COMPRESSED: 0x0001,
    /** bit 1: 包含元数据 */
    HAS_METADATA: 0x0002,
} as const

// ===================================================================
// 类型定义
// ===================================================================

/** .inkforge 文件头部结构 */
export interface InkForgeHeader {
    /** 魔数 (用于验证) */
    magic: Uint8Array
    /** 格式版本号 */
    version: number
    /** 标志位 */
    flags: number
    /** 密钥标识 (UUID, 用于密钥轮换追踪) */
    keyId: string
    /** 元数据加密 IV */
    iv: Uint8Array
    /** 密钥派生盐值 */
    salt: Uint8Array
    /** 加密后的元数据长度 */
    metadataLength: number
    /** 加密后的载荷长度 */
    payloadLength: number
}

/** 文档元数据 (加密存储) */
export interface InkForgeMetadata {
    title: string
    tags?: string[]
    category?: string
    createdAt: string
    updatedAt: string
    documentId: string
}

/** 序列化输入 */
export interface SerializeInput {
    title: string
    body: string
    tags?: string[]
    category?: string
    documentId?: string
}

/** 反序列化输出 */
export interface DeserializeOutput {
    metadata: InkForgeMetadata
    body: string
}

/** 格式验证结果 */
export interface FormatValidation {
    valid: boolean
    version?: number
    flags?: number
    error?: string
}

// ===================================================================
// 工具函数
// ===================================================================

/** 比较两个 Uint8Array 是否相等 */
function arrayEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }
    return true
}

/** 将 UUID 字符串转为 16 字节 Uint8Array */
function uuidToBytes(uuid: string): Uint8Array {
    const hex = uuid.replace(/-/g, '')
    if (hex.length !== 32) {
        throw new Error(`[InkForge Format] 无效的 UUID: ${uuid}`)
    }
    const bytes = new Uint8Array(16)
    for (let i = 0; i < 16; i++) {
        bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
    }
    return bytes
}

/** 将 16 字节 Uint8Array 转为 UUID 字符串 (格式解析工具，供外部扩展使用) */
export function bytesToUuid(bytes: Uint8Array): string {
    if (bytes.length !== 16) {
        throw new Error(`[InkForge Format] UUID 字节长度错误: ${bytes.length}`)
    }
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/** 写入 LE uint16 */
function writeUint16LE(buffer: Uint8Array, offset: number, value: number): void {
    buffer[offset] = value & 0xff
    buffer[offset + 1] = (value >> 8) & 0xff
}

/** 读取 LE uint16 */
function readUint16LE(buffer: Uint8Array, offset: number): number {
    return buffer[offset] | (buffer[offset + 1] << 8)
}

/** 写入 LE uint32 */
function writeUint32LE(buffer: Uint8Array, offset: number, value: number): void {
    buffer[offset] = value & 0xff
    buffer[offset + 1] = (value >> 8) & 0xff
    buffer[offset + 2] = (value >> 16) & 0xff
    buffer[offset + 3] = (value >> 24) & 0xff
}

/** 读取 LE uint32 */
function readUint32LE(buffer: Uint8Array, offset: number): number {
    return (
        buffer[offset] |
        (buffer[offset + 1] << 8) |
        (buffer[offset + 2] << 16) |
        (buffer[offset + 3] << 24)
    ) >>> 0
}

// ===================================================================
// 核心序列化/反序列化
// ===================================================================

/**
 * 序列化文档为 .inkforge 二进制格式
 *
 * @param input - 文档内容和元数据
 * @param masterKey - 用于派生内容密钥的主密钥
 * @returns 加密后的 ArrayBuffer
 *
 * @description
 * 加密流程:
 * 1. 生成随机 Salt 和 IV
 * 2. 从 masterKey + Salt 通过 HKDF 派生 Content Key
 * 3. 使用 Content Key + IV 加密 Metadata (AES-256-GCM, AAD=MAGIC)
 * 4. 使用 Content Key + PayloadIV 加密 Payload (AES-256-GCM)
 * 5. 组装二进制格式
 */
export async function serializeDocument(
    input: SerializeInput,
    masterKey: CryptoKey
): Promise<ArrayBuffer> {
    const documentId = input.documentId ?? generateId()
    const now = new Date().toISOString()

    // 生成加密参数
    const salt = generateSalt()
    const metadataIV = generateIV()
    const payloadIV = generateIV()
    const keyId = generateId()

    // 从主密钥派生内容密钥
    const contentKey = await deriveContentKey(masterKey, salt)

    // 构建元数据
    const metadata: InkForgeMetadata = {
        title: input.title,
        tags: input.tags,
        category: input.category,
        createdAt: now,
        updatedAt: now,
        documentId,
    }

    const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata))
    const payloadBytes = new TextEncoder().encode(input.body)

    // AES-256-GCM 加密元数据 (使用 MAGIC 作为 AAD)
    const encryptedMetadata = new Uint8Array(
        await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: metadataIV, additionalData: INKFORGE_MAGIC },
            contentKey,
            metadataBytes
        )
    )

    // AES-256-GCM 加密载荷
    const encryptedPayload = new Uint8Array(
        await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: payloadIV },
            contentKey,
            payloadBytes
        )
    )

    // 计算总长度并组装
    // 固定头(52) + MetadataLen(4) + Metadata + PayloadLen(4) + PayloadIV(12) + Payload
    const totalLength =
        FIXED_HEADER_LENGTH +
        4 + encryptedMetadata.length +
        4 + 12 + encryptedPayload.length

    const buffer = new Uint8Array(totalLength)
    let offset = 0

    // Magic (4 bytes)
    buffer.set(INKFORGE_MAGIC, offset)
    offset += 4

    // Version (2 bytes LE)
    writeUint16LE(buffer, offset, INKFORGE_FORMAT_VERSION)
    offset += 2

    // Flags (2 bytes LE)
    const flags = FORMAT_FLAGS.HAS_METADATA
    writeUint16LE(buffer, offset, flags)
    offset += 2

    // Key ID (16 bytes)
    buffer.set(uuidToBytes(keyId), offset)
    offset += 16

    // IV (12 bytes) - metadata IV
    buffer.set(metadataIV, offset)
    offset += 12

    // Salt (16 bytes)
    buffer.set(salt, offset)
    offset += 16

    // Metadata Length (4 bytes LE)
    writeUint32LE(buffer, offset, encryptedMetadata.length)
    offset += 4

    // Metadata (encrypted)
    buffer.set(encryptedMetadata, offset)
    offset += encryptedMetadata.length

    // Payload Length (4 bytes LE)
    writeUint32LE(buffer, offset, encryptedPayload.length)
    offset += 4

    // Payload IV (12 bytes)
    buffer.set(payloadIV, offset)
    offset += 12

    // Payload (encrypted)
    buffer.set(encryptedPayload, offset)

    return buffer.buffer
}

/**
 * 反序列化 .inkforge 文件
 *
 * @param buffer - .inkforge 文件的 ArrayBuffer
 * @param masterKey - 用于派生内容密钥的主密钥
 * @returns 解密后的元数据和正文
 *
 * @throws Error 如果文件格式无效或解密失败
 */
export async function deserializeDocument(
    buffer: ArrayBuffer,
    masterKey: CryptoKey
): Promise<DeserializeOutput> {
    const data = new Uint8Array(buffer)

    // 验证最小长度
    if (data.length < FIXED_HEADER_LENGTH + 8) {
        throw new Error('[InkForge Format] 文件过小，不是有效的 .inkforge 文件')
    }

    let offset = 0

    // 验证 Magic
    const magic = data.slice(offset, offset + 4)
    if (!arrayEqual(magic, INKFORGE_MAGIC)) {
        throw new Error('[InkForge Format] 无效的魔数，不是 .inkforge 文件')
    }
    offset += 4

    // 读取 Version
    const version = readUint16LE(data, offset)
    if (version !== INKFORGE_FORMAT_VERSION) {
        throw new Error(`[InkForge Format] 不支持的版本: ${version}，当前支持版本: ${INKFORGE_FORMAT_VERSION}`)
    }
    offset += 2

    // 读取 Flags (当前版本暂未使用，保留用于未来扩展)
    // 跳过 Flags 字段 (2 bytes)
    offset += 2

    // 读取 Key ID (当前版本暂未使用，保留用于密钥轮换追踪)
    // 跳过 Key ID 字段 (16 bytes)
    offset += 16

    // 读取 Metadata IV
    const metadataIV = data.slice(offset, offset + 12)
    offset += 12

    // 读取 Salt
    const salt = data.slice(offset, offset + 16)
    offset += 16

    // 派生内容密钥
    const contentKey = await deriveContentKey(masterKey, salt)

    // 读取 Metadata
    const metadataLength = readUint32LE(data, offset)
    offset += 4

    if (offset + metadataLength > data.length) {
        throw new Error('[InkForge Format] 元数据长度超出文件边界')
    }

    const encryptedMetadata = data.slice(offset, offset + metadataLength)
    offset += metadataLength

    // 解密元数据
    const metadataBytes = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: metadataIV, additionalData: INKFORGE_MAGIC },
        contentKey,
        encryptedMetadata
    )
    const metadata: InkForgeMetadata = JSON.parse(
        new TextDecoder().decode(metadataBytes)
    )

    // 读取 Payload
    const payloadLength = readUint32LE(data, offset)
    offset += 4

    // 读取 Payload IV
    const payloadIV = data.slice(offset, offset + 12)
    offset += 12

    if (offset + payloadLength > data.length) {
        throw new Error('[InkForge Format] 载荷长度超出文件边界')
    }

    const encryptedPayload = data.slice(offset, offset + payloadLength)

    // 解密载荷
    const payloadBytes = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: payloadIV },
        contentKey,
        encryptedPayload
    )
    const body = new TextDecoder().decode(payloadBytes)

    return { metadata, body }
}

/**
 * 验证 .inkforge 文件格式完整性 (不解密)
 *
 * @param buffer - 待验证的 ArrayBuffer
 * @returns 验证结果
 */
export function validateFormat(buffer: ArrayBuffer): FormatValidation {
    try {
        const data = new Uint8Array(buffer)

        // 检查最小长度
        if (data.length < FIXED_HEADER_LENGTH + 8) {
            return { valid: false, error: '文件过小，不是有效的 .inkforge 文件' }
        }

        // 检查魔数
        const magic = data.slice(0, 4)
        if (!arrayEqual(magic, INKFORGE_MAGIC)) {
            return { valid: false, error: '无效的魔数标识' }
        }

        // 读取版本
        const version = readUint16LE(data, 4)
        if (version < 1) {
            return { valid: false, error: `无效的版本号: ${version}` }
        }

        // 读取标志位
        const flags = readUint16LE(data, 6)

        // 检查元数据和载荷长度字段的一致性
        let offset = FIXED_HEADER_LENGTH

        const metadataLength = readUint32LE(data, offset)
        offset += 4 + metadataLength

        if (offset + 4 > data.length) {
            return { valid: false, error: '元数据区域超出文件边界' }
        }

        const payloadLength = readUint32LE(data, offset)
        offset += 4 + 12 + payloadLength // +12 for payload IV

        if (offset > data.length) {
            return { valid: false, error: '载荷区域超出文件边界' }
        }

        return { valid: true, version, flags }
    } catch (err) {
        return {
            valid: false,
            error: `格式验证异常: ${err instanceof Error ? err.message : String(err)}`,
        }
    }
}
