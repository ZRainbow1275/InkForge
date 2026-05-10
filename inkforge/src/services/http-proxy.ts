import { useSettingsStore, type ProxySettings } from '@/stores/settings'

export interface ProxyValidationResult {
  valid: boolean
  message: string
}

export interface ResolvedProxyConfig {
  protocol: ProxySettings['protocol']
  host: string
  port: number
  url: string
  maskedUrl: string
  hasCredentials: boolean
}

export interface ProxyPreview {
  status: 'disabled' | 'invalid' | 'ready'
  message: string
  config: ResolvedProxyConfig | null
}

function readProxySettings(): ProxySettings {
  return useSettingsStore().settings.proxy
}

function buildAuthSegment(proxy: ProxySettings): string {
  if (!proxy.username.trim()) {
    return ''
  }

  const username = encodeURIComponent(proxy.username.trim())
  const password = proxy.password ? `:${encodeURIComponent(proxy.password)}` : ''
  return `${username}${password}@`
}

export function validateProxySettings(source: ProxySettings = readProxySettings()): ProxyValidationResult {
  if (!source.enabled) {
    return {
      valid: true,
      message: '代理未启用。',
    }
  }

  if (!source.host.trim()) {
    return {
      valid: false,
      message: '启用代理后必须填写主机地址。',
    }
  }

  if (!Number.isInteger(source.port) || source.port < 1 || source.port > 65535) {
    return {
      valid: false,
      message: '代理端口必须在 1 到 65535 之间。',
    }
  }

  return {
    valid: true,
    message: '代理配置有效。',
  }
}

export function getProxyConfig(source: ProxySettings = readProxySettings()): ResolvedProxyConfig | null {
  const validation = validateProxySettings(source)
  if (!source.enabled || !validation.valid) {
    return null
  }

  const host = source.host.trim()
  const authSegment = buildAuthSegment(source)
  const url = `${source.protocol}://${authSegment}${host}:${source.port}`
  const maskedUrl = `${source.protocol}://${source.username.trim() ? '***:***@' : ''}${host}:${source.port}`

  return {
    protocol: source.protocol,
    host,
    port: source.port,
    url,
    maskedUrl,
    hasCredentials: Boolean(source.username.trim()),
  }
}

export function getProxyPreview(source: ProxySettings = readProxySettings()): ProxyPreview {
  if (!source.enabled) {
    return {
      status: 'disabled',
      message: '未启用代理，将直接使用目标服务地址。',
      config: null,
    }
  }

  const validation = validateProxySettings(source)
  if (!validation.valid) {
    return {
      status: 'invalid',
      message: validation.message,
      config: null,
    }
  }

  const config = getProxyConfig(source)

  return {
    status: 'ready',
    message: config
      ? `当前代理地址：${config.maskedUrl}`
      : '代理配置尚未就绪。',
    config,
  }
}
