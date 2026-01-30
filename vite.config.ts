import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    server: {
        port: 3005,
        host: true,
        headers: {
            // CSP 安全头配置（开发环境）
            'Content-Security-Policy': [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 开发环境需要
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data: blob: https:",
                "font-src 'self' data:",
                "connect-src 'self' http://localhost:* ws://localhost:*",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
            ].join('; ')
        },
        // ═══════════════════════════════════════════════════════════════════
        // 本地 CORS 代理配置
        // ═══════════════════════════════════════════════════════════════════
        // 使用方法：在 .env.local 中设置
        // VITE_CORS_PROXY_URL=http://localhost:3005/api/cors-proxy?url=
        //
        // 安全说明：
        // - 仅在开发环境使用，生产环境请部署自建代理服务
        // - 已实现 SSRF 防护（阻止访问内网地址）
        // ═══════════════════════════════════════════════════════════════════
        proxy: {
            '/api/cors-proxy': {
                target: 'https://placeholder.invalid', // 占位符，实际目标由 configure 动态设置
                changeOrigin: true,
                secure: true,
                configure: (proxy) => {
                    proxy.on('proxyReq', (proxyReq, req) => {
                        // 从查询参数获取目标 URL
                        const urlParam = new URL(req.url || '', 'http://localhost').searchParams.get('url')
                        if (urlParam) {
                            try {
                                const targetUrl = new URL(decodeURIComponent(urlParam))

                                // SSRF 防护：阻止访问内网地址
                                const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
                                const blockedSuffixes = ['.local', '.localhost', '.internal', '.lan']
                                const hostname = targetUrl.hostname.toLowerCase()

                                if (blockedHosts.includes(hostname) ||
                                    blockedSuffixes.some(suffix => hostname.endsWith(suffix)) ||
                                    /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) {
                                    console.error('[Vite Proxy] SSRF 防护：阻止访问内网地址', hostname)
                                    proxyReq.destroy()
                                    return
                                }

                                // 动态修改目标
                                proxyReq.setHeader('host', targetUrl.host)
                                proxyReq.path = targetUrl.pathname + targetUrl.search
                            } catch (e) {
                                console.error('[Vite Proxy] URL 解析失败:', e)
                                proxyReq.destroy()
                            }
                        }
                    })
                },
                rewrite: () => '' // 路径由 configure 处理
            }
        }
    },
    build: {
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        }
    }
})
