/**
 * UUID 生成工具
 *
 * 提供跨平台兼容的 UUID v4 生成。
 * 在 Tauri WebView 等非 Secure Context 环境中，
 * crypto.randomUUID() 可能不可用，此模块提供 fallback。
 */

/**
 * 生成 UUID v4 标识符
 *
 * 优先使用 crypto.randomUUID()（Secure Context），
 * 回退使用 crypto.getRandomValues() 手动构建 RFC4122 v4 UUID。
 */
export function generateId(): string {
  // 优先使用原生 API（性能最优，密码学安全）
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  // Fallback: 使用 crypto.getRandomValues（仍然密码学安全）
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)

    // RFC4122 v4: 设置 version (4) 和 variant (10xx)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
  }

  // 最终 Fallback: Math.random（非密码学安全，仅用于极端环境）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
