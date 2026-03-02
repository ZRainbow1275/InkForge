/**
 * URL 解析服务
 *
 * 此文件现为兼容性导出层，实际实现已模块化至 parser/ 目录：
 * - parser/types.ts: 类型定义
 * - parser/ssrf.ts: SSRF 安全防护
 * - parser/request.ts: 请求状态管理器
 * - parser/proxy.ts: CORS 代理管理
 * - parser/extractor.ts: HTML 内容提取
 * - parser/index.ts: 模块入口
 */

export {
    parseUrl,
    calculateScore,
    cancelParseRequest,
    resetParserState,
    parserRequestState
} from './parser/index'

export type {
    ParseResult,
    ProxyConfig
} from './parser/types'
