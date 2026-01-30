/**
 * URL 解析服务 - 请求管理器
 * 统一管理请求状态，支持取消和重置
 */

import { logger } from '../error'

/**
 * 请求状态管理器类
 * 封装模块级可变状态，提供类型安全的接口
 */
export class RequestStateManager {
    private activeController: AbortController | null = null
    private readonly name: string

    constructor(name: string) {
        this.name = name
    }

    /**
     * 设置活跃的 AbortController
     */
    setController(controller: AbortController): void {
        this.activeController = controller
    }

    /**
     * 清除 AbortController 引用
     */
    clearController(): void {
        this.activeController = null
    }

    /**
     * 如果有活跃请求则取消
     * @returns 是否成功取消了请求
     */
    abortIfActive(): boolean {
        if (this.activeController) {
            this.activeController.abort()
            this.activeController = null
            logger.debug(`${this.name} 请求已取消`)
            return true
        }
        return false
    }

    /**
     * 获取当前活跃的 AbortSignal
     */
    getSignal(): AbortSignal | null {
        return this.activeController?.signal ?? null
    }

    /**
     * 检查是否有活跃请求
     */
    isActive(): boolean {
        return this.activeController !== null
    }

    /**
     * 重置状态（用于测试或清理）
     */
    reset(): void {
        if (this.activeController) {
            this.activeController.abort()
        }
        this.activeController = null
    }
}

// 导出 Parser 专用的请求状态管理器实例
export const parserRequestState = new RequestStateManager('Parser')
