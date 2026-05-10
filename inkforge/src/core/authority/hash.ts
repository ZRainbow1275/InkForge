const HASH_ALGORITHM = 'SHA-256' as const

function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer), byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Computes SHA-256 for Markdown authority invariants.
 * Uses Web Crypto so browser/Tauri runtime and IndexedDB writes share one implementation.
 */
export async function sha256Hex(input: string): Promise<string> {
    const subtle = globalThis.crypto?.subtle
    if (!subtle) {
        throw new Error('SHA-256 requires Web Crypto SubtleCrypto in the current runtime')
    }

    const bytes = new TextEncoder().encode(input)
    const digest = await subtle.digest(HASH_ALGORITHM, bytes)
    return toHex(digest)
}
