/**
 * ensureMasterKeyUnlocked() 单测
 *
 * 覆盖「prod 前端 + Tauri 下加密开启但主密钥永不解锁」缺陷修复的全部分支：
 * 1. ENABLE_ENCRYPTION=false      → 返回 false 且不触碰 keychain
 * 2. 已缓存                        → 返回 true
 * 3. keychain 有 key（已存在）     → importKey 成功并 setCachedKey、返回 true
 * 4. keychain 无 key（首次运行）   → generate + save 被调用、setCachedKey、返回 true
 * 5. keychain 抛错                 → 返回 false 不抛
 *
 * 说明：本测试真实运行 WebCrypto（Node 20+ 的 globalThis.crypto.subtle，非 mock），
 * 仅对 ./storage（keychain I/O）、./environment（Tauri 环境判定）、./config
 * （ENABLE_ENCRYPTION）做 mock。`./storage` 的纯函数 helper（toBase64/fromBase64/
 * secureZero）保留真实实现，因为 key-management 内部依赖它们做真实密钥编解码。
 */

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

// ── config: 用可变状态控制 ENABLE_ENCRYPTION ──────────────────────────
let enableEncryptionFlag = true
vi.mock('../config', async () => {
    const actual = await vi.importActual<typeof import('../config')>('../config')
    return {
        ...actual,
        get ENABLE_ENCRYPTION() {
            return enableEncryptionFlag
        },
    }
})

// ── environment: 控制 isTauriEnvironment；保留真实 crypto 可用性检测 ─────
let tauriEnvFlag = true
vi.mock('../environment', async () => {
    const actual = await vi.importActual<typeof import('../environment')>('../environment')
    return {
        ...actual,
        isTauriEnvironment: () => tauriEnvFlag,
    }
})

// ── storage: 仅 mock keychain I/O，保留真实的 base64 / secureZero helper ──
vi.mock('../storage', async () => {
    const actual = await vi.importActual<typeof import('../storage')>('../storage')
    return {
        ...actual,
        loadMasterKeyFromTauriKeychain: vi.fn(),
        saveMasterKeyToTauriKeychain: vi.fn(),
        deleteMasterKeyFromTauriKeychain: vi.fn(),
    }
})

import { ensureMasterKeyUnlocked, getMasterKey } from '../key-management'
import { clearKeyCache, getCachedKey, setCachedKey } from '../lifecycle'
import {
    loadMasterKeyFromTauriKeychain,
    saveMasterKeyToTauriKeychain,
    toBase64,
} from '../storage'
import { CRYPTO_CONFIG } from '../config'

const loadMock = loadMasterKeyFromTauriKeychain as unknown as Mock
const saveMock = saveMasterKeyToTauriKeychain as unknown as Mock

/** 生成一个合法的 base64 32 字节随机密钥（模拟密钥链已存在的密钥材料） */
function makeStoredKeyBase64(): string {
    const raw = crypto.getRandomValues(new Uint8Array(32))
    return toBase64(raw)
}

describe('ensureMasterKeyUnlocked', () => {
    beforeEach(() => {
        enableEncryptionFlag = true
        tauriEnvFlag = true
        clearKeyCache()
        loadMock.mockReset()
        saveMock.mockReset()
    })

    afterEach(() => {
        clearKeyCache()
    })

    it('1) ENABLE_ENCRYPTION=false → 返回 false 且不触碰 keychain', async () => {
        enableEncryptionFlag = false

        const result = await ensureMasterKeyUnlocked()

        expect(result).toBe(false)
        expect(loadMock).not.toHaveBeenCalled()
        expect(saveMock).not.toHaveBeenCalled()
        expect(getCachedKey()).toBeNull()
    })

    it('2) 已缓存 → 返回 true（不再访问 keychain）', async () => {
        // 真实生成并缓存一个工作密钥
        const cached = await crypto.subtle.generateKey(
            { name: CRYPTO_CONFIG.ALGORITHM, length: CRYPTO_CONFIG.KEY_LENGTH },
            false,
            ['encrypt', 'decrypt']
        )
        setCachedKey(cached)

        const result = await ensureMasterKeyUnlocked()

        expect(result).toBe(true)
        expect(loadMock).not.toHaveBeenCalled()
        expect(saveMock).not.toHaveBeenCalled()
    })

    it('3) keychain 有 key → importKey 成功并 setCachedKey、返回 true', async () => {
        loadMock.mockResolvedValue(makeStoredKeyBase64())

        const result = await ensureMasterKeyUnlocked()

        expect(result).toBe(true)
        expect(loadMock).toHaveBeenCalledTimes(1)
        expect(saveMock).not.toHaveBeenCalled()

        const key = getCachedKey()
        expect(key).not.toBeNull()
        // 验证真实可用：能加解密
        const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.IV_LENGTH))
        const plaintext = new TextEncoder().encode('hello-inkforge')
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key!, plaintext)
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key!, ciphertext)
        expect(new TextDecoder().decode(decrypted)).toBe('hello-inkforge')
    })

    it('4) keychain 无 key（首次）→ generate + save 被调用、setCachedKey、返回 true', async () => {
        loadMock.mockResolvedValue(null)
        saveMock.mockResolvedValue(true)

        const result = await ensureMasterKeyUnlocked()

        expect(result).toBe(true)
        expect(loadMock).toHaveBeenCalledTimes(1)
        expect(saveMock).toHaveBeenCalledTimes(1)
        // save 收到的是一个非空 base64 字符串
        const savedArg = saveMock.mock.calls[0][0]
        expect(typeof savedArg).toBe('string')
        expect((savedArg as string).length).toBeGreaterThan(0)
        expect(getCachedKey()).not.toBeNull()
    })

    it('4b) keychain 无 key 且 save 返回 false → 拒绝缓存临时密钥', async () => {
        loadMock.mockResolvedValue(null)
        saveMock.mockResolvedValue(false)

        const result = await ensureMasterKeyUnlocked()

        expect(result).toBe(false)
        expect(saveMock).toHaveBeenCalledTimes(1)
        expect(getCachedKey()).toBeNull()
    })

    it('4c) cache expiry reloads only an existing key and never generates a replacement', async () => {
        loadMock.mockResolvedValue(makeStoredKeyBase64())

        const key = await getMasterKey()

        expect(key).toBe(getCachedKey())
        expect(loadMock).toHaveBeenCalledTimes(1)
        expect(saveMock).not.toHaveBeenCalled()
    })

    it('4d) cache expiry fails closed when the persisted key is missing', async () => {
        loadMock.mockResolvedValue(null)

        await expect(getMasterKey()).rejects.toThrow('已拒绝生成替代密钥')
        expect(loadMock).toHaveBeenCalledTimes(1)
        expect(saveMock).not.toHaveBeenCalled()
        expect(getCachedKey()).toBeNull()
    })

    it('5) keychain 抛错 → 返回 false 不抛', async () => {
        loadMock.mockRejectedValue(new Error('keychain unavailable'))

        await expect(ensureMasterKeyUnlocked()).resolves.toBe(false)
        expect(getCachedKey()).toBeNull()
    })

    it('6) 非 Tauri 环境（web prod）→ 返回 false 不触碰 keychain', async () => {
        tauriEnvFlag = false

        const result = await ensureMasterKeyUnlocked()

        expect(result).toBe(false)
        expect(loadMock).not.toHaveBeenCalled()
        expect(saveMock).not.toHaveBeenCalled()
    })
})
