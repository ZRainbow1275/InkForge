import { generateId } from '@/utils/uuid'
import type { PermissionLevel, ShareLink } from './types'

const SAFE_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const SHARE_CODE_LENGTH = 8

export interface CreateShareLinkInput {
    level: Exclude<PermissionLevel, 'private'>
    expiresAt: number | null
    passwordHash?: string | null
}

export function generateShareCode(length = SHARE_CODE_LENGTH): string {
    const bytes = new Uint8Array(length)
    if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
        throw new Error('共享链接短码生成需要 crypto.getRandomValues')
    }
    crypto.getRandomValues(bytes)

    return Array.from(bytes, byte => SAFE_CODE_ALPHABET[byte % SAFE_CODE_ALPHABET.length]).join('')
}

export function createShareLink(input: CreateShareLinkInput): ShareLink {
    return {
        id: generateId(),
        code: generateShareCode(),
        level: input.level,
        expiresAt: input.expiresAt,
        passwordHash: input.passwordHash ?? null,
        createdAt: Date.now(),
        accessCount: 0,
        status: 'active',
    }
}

export function buildShareUrl(code: string, webBase = 'https://app.inkforge.io'): { appUrl: string; webUrl: string } {
    return {
        appUrl: `inkforge://share/${code}`,
        webUrl: `${webBase.replace(/\/$/, '')}/share/${code}`,
    }
}
