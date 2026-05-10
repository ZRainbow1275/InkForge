import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const BROWSER_NODE_COMPAT_SHIM = resolve(__dirname, 'src/shims/browser-node-compat.ts')

const CODEMIRROR_LANGUAGE_DATA_PACKAGE = '@codemirror/language-data'

const CODEMIRROR_DEDUPED_DEPS = [
    'codemirror',
    'vue-codemirror',
    '@codemirror/state',
    '@codemirror/view',
    '@codemirror/language',
    '@codemirror/commands',
    '@codemirror/lang-markdown',
    '@codemirror/lang-css',
    '@codemirror/theme-one-dark',
    CODEMIRROR_LANGUAGE_DATA_PACKAGE,
]

const HIGHLIGHT_LANGUAGE_CHUNKS: Record<string, string> = {
    arduino: 'syntax-highlight-systems',
    bash: 'syntax-highlight-systems',
    c: 'syntax-highlight-systems',
    cpp: 'syntax-highlight-systems',
    csharp: 'syntax-highlight-systems',
    diff: 'syntax-highlight-systems',
    go: 'syntax-highlight-systems',
    ini: 'syntax-highlight-systems',
    java: 'syntax-highlight-systems',
    makefile: 'syntax-highlight-systems',
    objectivec: 'syntax-highlight-systems',
    perl: 'syntax-highlight-systems',
    rust: 'syntax-highlight-systems',
    shell: 'syntax-highlight-systems',
    sql: 'syntax-highlight-systems',
    swift: 'syntax-highlight-systems',
    vbnet: 'syntax-highlight-systems',
    wasm: 'syntax-highlight-systems',

    css: 'syntax-highlight-web',
    graphql: 'syntax-highlight-web',
    html: 'syntax-highlight-web',
    javascript: 'syntax-highlight-web',
    json: 'syntax-highlight-web',
    less: 'syntax-highlight-web',
    markdown: 'syntax-highlight-web',
    php: 'syntax-highlight-web',
    'php-template': 'syntax-highlight-web',
    scss: 'syntax-highlight-web',
    typescript: 'syntax-highlight-web',
    xml: 'syntax-highlight-web',
    yaml: 'syntax-highlight-web',

    dart: 'syntax-highlight-product-languages',
    kotlin: 'syntax-highlight-product-languages',
    lua: 'syntax-highlight-product-languages',
    plaintext: 'syntax-highlight-product-languages',
    python: 'syntax-highlight-product-languages',
    'python-repl': 'syntax-highlight-product-languages',
    r: 'syntax-highlight-product-languages',
    ruby: 'syntax-highlight-product-languages',
    scala: 'syntax-highlight-product-languages',
}

function normalizeModuleId(id: string): string {
    return id.replace(/\\/g, '/')
}

function isNodeModule(id: string, packageName: string): boolean {
    return id.includes(`/node_modules/${packageName}/`)
}

function getHighlightLanguageChunk(id: string): string | undefined {
    const marker = '/node_modules/highlight.js/lib/languages/'
    const markerIndex = id.indexOf(marker)
    if (markerIndex === -1) {
        return undefined
    }

    const languageFile = id.slice(markerIndex + marker.length).split('?')[0]
    const languageName = languageFile.replace(/\.js$/, '')
    return HIGHLIGHT_LANGUAGE_CHUNKS[languageName] ?? 'syntax-highlight-misc'
}

function manualChunks(id: string): string | undefined {
    const normalized = normalizeModuleId(id)
    if (!normalized.includes('/node_modules/')) {
        return undefined
    }

    if (
        isNodeModule(normalized, 'vue') ||
        isNodeModule(normalized, '@vue') ||
        isNodeModule(normalized, 'vue-router') ||
        isNodeModule(normalized, 'pinia')
    ) {
        return 'vendor-vue-runtime'
    }

    if (
        isNodeModule(normalized, '@tiptap') ||
        normalized.includes('/node_modules/prosemirror-')
    ) {
        return 'editor-prosemirror'
    }

    if (isNodeModule(normalized, CODEMIRROR_LANGUAGE_DATA_PACKAGE)) {
        return 'editor-codemirror-languages'
    }

    if (CODEMIRROR_DEDUPED_DEPS.some((packageName) => isNodeModule(normalized, packageName))) {
        return 'editor-codemirror-core'
    }

    if (
        isNodeModule(normalized, 'marked') ||
        isNodeModule(normalized, 'dompurify') ||
        isNodeModule(normalized, 'juice') ||
        isNodeModule(normalized, 'entities') ||
        isNodeModule(normalized, 'htmlparser2') ||
        isNodeModule(normalized, 'parse5') ||
        isNodeModule(normalized, 'css-select') ||
        isNodeModule(normalized, 'css-what') ||
        isNodeModule(normalized, 'domhandler') ||
        isNodeModule(normalized, 'domutils')
    ) {
        return 'markdown-rendering'
    }

    const highlightLanguageChunk = getHighlightLanguageChunk(normalized)
    if (highlightLanguageChunk) {
        return highlightLanguageChunk
    }

    if (
        isNodeModule(normalized, 'lowlight') ||
        isNodeModule(normalized, 'highlight.js') ||
        isNodeModule(normalized, 'hast-util-to-html') ||
        isNodeModule(normalized, 'hast-util-to-jsx-runtime') ||
        isNodeModule(normalized, 'unist-util')
    ) {
        return 'syntax-lowlight-core'
    }

    if (isNodeModule(normalized, 'katex')) {
        return 'math-katex'
    }

    if (
        isNodeModule(normalized, 'dexie') ||
        isNodeModule(normalized, 'minisearch') ||
        isNodeModule(normalized, 'zod')
    ) {
        return 'data-runtime'
    }

    if (isNodeModule(normalized, 'lucide-vue-next')) {
        return 'ui-icons'
    }

    if (
        isNodeModule(normalized, 'cytoscape') ||
        isNodeModule(normalized, 'cytoscape-cose-bilkent') ||
        isNodeModule(normalized, 'dagre') ||
        isNodeModule(normalized, 'elkjs')
    ) {
        return 'diagram-layout-engines'
    }

    return undefined
}

/**
 * 开发环境 CORS 代理插件
 * 将 /api/cors-proxy?url=<encoded_url> 的请求转发到目标 URL
 * 包含 SSRF 防护（阻止内网访问）
 */
function devCorsProxy(): Plugin {
    return {
        name: 'dev-cors-proxy',
        configureServer(server) {
            server.middlewares.use('/api/cors-proxy', async (req, res) => {
                // 处理 CORS preflight
                if (req.method === 'OPTIONS') {
                    res.writeHead(204, {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        'Access-Control-Max-Age': '86400',
                    })
                    res.end()
                    return
                }

                const urlParam = new URL(req.url || '', 'http://localhost').searchParams.get('url')
                if (!urlParam) {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: '缺少 url 参数' }))
                    return
                }

                let targetUrl: URL
                try {
                    targetUrl = new URL(decodeURIComponent(urlParam))
                } catch {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: 'URL 格式无效' }))
                    return
                }

                // SSRF 防护
                const hostname = targetUrl.hostname.toLowerCase()
                const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
                const blockedSuffixes = ['.local', '.localhost', '.internal', '.lan']
                if (
                    blockedHosts.includes(hostname) ||
                    blockedSuffixes.some(s => hostname.endsWith(s)) ||
                    /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)
                ) {
                    res.writeHead(403, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: 'SSRF 防护：禁止访问内网地址' }))
                    return
                }

                // 收集请求体
                const chunks: Buffer[] = []
                for await (const chunk of req) {
                    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
                }
                const body = Buffer.concat(chunks)

                // 转发请求头（过滤 hop-by-hop 头）
                const forwardHeaders: Record<string, string> = {}
                const skipHeaders = new Set(['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade'])
                for (const [key, val] of Object.entries(req.headers)) {
                    if (!skipHeaders.has(key.toLowerCase()) && val) {
                        forwardHeaders[key] = Array.isArray(val) ? val.join(', ') : val
                    }
                }
                forwardHeaders['host'] = targetUrl.host

                try {
                    const proxyRes = await fetch(targetUrl.toString(), {
                        method: req.method || 'GET',
                        headers: forwardHeaders,
                        body: body.length > 0 ? body : undefined,
                        signal: AbortSignal.timeout(30_000),
                    })

                    // 转发响应
                    const resHeaders: Record<string, string> = {}
                    proxyRes.headers.forEach((val, key) => {
                        if (!skipHeaders.has(key.toLowerCase())) {
                            resHeaders[key] = val
                        }
                    })
                    // 添加 CORS 头
                    resHeaders['access-control-allow-origin'] = '*'
                    resHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                    resHeaders['access-control-allow-headers'] = 'Content-Type, Authorization'

                    res.writeHead(proxyRes.status, resHeaders)
                    const resBody = await proxyRes.arrayBuffer()
                    res.end(Buffer.from(resBody))
                } catch (e) {
                    console.error('[CORS Proxy] 转发失败:', e)
                    res.writeHead(502, { 'Content-Type': 'application/json' })
                    res.end(JSON.stringify({ error: `代理转发失败: ${e instanceof Error ? e.message : String(e)}` }))
                }
            })
        }
    }
}

export default defineConfig({
    plugins: [vue(), devCorsProxy()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            fs: BROWSER_NODE_COMPAT_SHIM,
            juice: resolve(__dirname, 'node_modules/juice/client.js'),
            path: BROWSER_NODE_COMPAT_SHIM,
            'source-map-js': BROWSER_NODE_COMPAT_SHIM,
            url: BROWSER_NODE_COMPAT_SHIM
        },
        dedupe: [
            'prosemirror-state',
            'prosemirror-view',
            'prosemirror-model',
            'prosemirror-transform',
            'prosemirror-keymap',
            'prosemirror-commands',
            'prosemirror-schema-list',
            'prosemirror-inputrules',
            'prosemirror-dropcursor',
            'prosemirror-gapcursor',
            'prosemirror-history',
            '@tiptap/core',
            '@tiptap/pm',
            ...CODEMIRROR_DEDUPED_DEPS,
        ],
    },
    optimizeDeps: {
        include: CODEMIRROR_DEDUPED_DEPS,
    },
    server: {
        port: 3005,
        host: true,
        headers: {
            'Content-Security-Policy': [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "img-src 'self' data: blob: https:",
                "font-src 'self' data: https://fonts.gstatic.com",
                "connect-src 'self' http://localhost:* ws://localhost:* https://*.siliconflow.cn https://*.openai.com https://*.anthropic.com https://*.deepseek.com",
                "frame-ancestors 'none'",
                "base-uri 'self'",
                "form-action 'self'"
            ].join('; ')
        },
    },
    build: {
        minify: 'terser',
        chunkSizeWarningLimit: 650,
        rollupOptions: {
            output: {
                manualChunks,
            },
        },
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        }
    }
})
