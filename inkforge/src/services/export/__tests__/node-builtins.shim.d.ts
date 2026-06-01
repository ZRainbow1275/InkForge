// 局部 Node 内建模块的极小类型声明（仅供本目录下的「产物发射器」测试使用）。
//
// 本仓库 tsconfig 用 `types: ["vite/client"]`，不注入 @types/node 全局。
// 直接在测试里写 `/// <reference types="node" />` 会把 Node 的
// setTimeout/setInterval 重载灌进整个编译单元，导致别处 `window.setTimeout()`
// 的返回类型从 `number` 退化为 `NodeJS.Timeout`（项目级 TS2322）。
//
// 此处用一个独立、无 import/export 的环境声明文件（全局脚本上下文 →
// `declare module` 即「环境模块声明」而非「模块增强」），只暴露发射器用到的
// 极小表面，既能通过 vue-tsc，又绝不污染全局 lib。运行时由 vitest（node）真实提供。

declare module 'node:fs' {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void
  export function writeFileSync(path: string, data: string, encoding: string): void
}

declare module 'node:path' {
  export function dirname(path: string): string
  export function resolve(...segments: string[]): string
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string
}
