import type { AdvancedSettings } from '@/stores/settings'

type ProxySettings = AdvancedSettings['proxy']

export interface ProxyRuntimeConfig {
  enabled: boolean
  protocol: ProxySettings['protocol']
  host: string
  port: number
  username: string
  password: string
  hasAuth: boolean
  url: string | null
}

function normalizeProxyInput(source: AdvancedSettings | ProxySettings): ProxySettings {
  return 'proxy' in source ? source.proxy : source
}

export function getProxyRuntimeConfig(source: AdvancedSettings | ProxySettings): ProxyRuntimeConfig {
  const proxy = normalizeProxyInput(source)
  const host = proxy.host.trim()
  const port = Number(proxy.port)
  const normalizedPort = Number.isFinite(port) && port > 0 ? Math.trunc(port) : 0
  const hasAuth = Boolean(proxy.username.trim() || proxy.password.trim())
  const enabled = proxy.enabled && Boolean(host) && normalizedPort > 0
  const authSegment = proxy.username.trim()
    ? `${encodeURIComponent(proxy.username.trim())}${proxy.password.trim() ? ':******' : ''}@`
    : ''

  return {
    enabled,
    protocol: proxy.protocol,
    host,
    port: normalizedPort,
    username: proxy.username.trim(),
    password: proxy.password,
    hasAuth,
    url: enabled ? `${proxy.protocol}://${authSegment}${host}:${normalizedPort}` : null,
  }
}

export function describeProxyConfig(source: AdvancedSettings | ProxySettings): string {
  const config = getProxyRuntimeConfig(source)
  if (!config.enabled || !config.url) {
    return '未启用'
  }

  return config.hasAuth
    ? `${config.protocol.toUpperCase()} 代理 (${config.host}:${config.port}，已配置认证)`
    : `${config.protocol.toUpperCase()} 代理 (${config.host}:${config.port})`
}
