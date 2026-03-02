/**
 * 异步操作生命周期管理器
 *
 * 解决的问题：
 * - 互斥锁无超时导致无限等待
 * - 队列无超时导致 Promise 永久挂起
 * - 缺乏统一的异步操作追踪
 *
 * 设计原则：
 * - 所有异步操作都有超时保护
 * - 统一的资源清理机制
 * - 可观测的操作状态
 */

import { logger } from '@/services/error'
import { generateId } from '@/utils/uuid'

// ═══════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════

/** 操作状态 */
export type OperationStatus = 'pending' | 'running' | 'completed' | 'timeout' | 'cancelled'

/** 操作追踪信息 */
export interface OperationTracker {
    id: string
    name: string
    status: OperationStatus
    startedAt: number
    timeoutAt: number | null
    completedAt: number | null
}

/** 超时错误 */
export class TimeoutError extends Error {
    constructor(message: string, public readonly operationName: string) {
        super(message)
        this.name = 'TimeoutError'
        Object.setPrototypeOf(this, TimeoutError.prototype)
    }
}

/** 队列满错误 */
export class QueueFullError extends Error {
    constructor(message: string, public readonly queueName: string) {
        super(message)
        this.name = 'QueueFullError'
        Object.setPrototypeOf(this, QueueFullError.prototype)
    }
}

// ═══════════════════════════════════════════════════════════════════
// 带超时的互斥锁
// ═══════════════════════════════════════════════════════════════════

interface MutexWaiter {
    resolve: () => void
    reject: (error: Error) => void
    timeoutId: ReturnType<typeof setTimeout>
    addedAt: number
}

/**
 * 带超时的互斥锁
 * 确保异步操作的原子性，同时防止死锁
 */
export class TimeoutMutex {
    private locked = false
    private waitQueue: MutexWaiter[] = []
    private readonly name: string
    private readonly defaultTimeoutMs: number
    private readonly maxQueueSize: number

    constructor(options: {
        name?: string
        defaultTimeoutMs?: number
        maxQueueSize?: number
    } = {}) {
        this.name = options.name ?? 'unnamed-mutex'
        this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30_000 // 默认 30 秒
        this.maxQueueSize = options.maxQueueSize ?? 100
    }

    /**
     * 获取锁（带超时）
     * @param timeoutMs 超时时间（毫秒），默认使用构造时配置
     * @throws TimeoutError 如果超时
     * @throws QueueFullError 如果队列已满
     */
    async acquire(timeoutMs?: number): Promise<void> {
        const timeout = timeoutMs ?? this.defaultTimeoutMs

        if (!this.locked) {
            this.locked = true
            return
        }

        // 检查队列是否已满
        if (this.waitQueue.length >= this.maxQueueSize) {
            throw new QueueFullError(
                `互斥锁 ${this.name} 等待队列已满 (${this.maxQueueSize})`,
                this.name
            )
        }

        return new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                // 从队列中移除
                const index = this.waitQueue.findIndex(w => w.timeoutId === timeoutId)
                if (index !== -1) {
                    this.waitQueue.splice(index, 1)
                }
                reject(new TimeoutError(
                    `互斥锁 ${this.name} 获取超时 (${timeout}ms)`,
                    this.name
                ))
            }, timeout)

            this.waitQueue.push({
                resolve,
                reject,
                timeoutId,
                addedAt: Date.now()
            })
        })
    }

    /**
     * 释放锁
     */
    release(): void {
        if (this.waitQueue.length > 0) {
            const next = this.waitQueue.shift()!
            clearTimeout(next.timeoutId)
            next.resolve()
        } else {
            this.locked = false
        }
    }

    /**
     * 使用锁执行操作（自动释放）
     */
    async withLock<T>(fn: () => Promise<T>, timeoutMs?: number): Promise<T> {
        await this.acquire(timeoutMs)
        try {
            return await fn()
        } finally {
            this.release()
        }
    }

    /**
     * 获取当前状态
     */
    getStatus(): { locked: boolean; queueLength: number; name: string } {
        return {
            locked: this.locked,
            queueLength: this.waitQueue.length,
            name: this.name
        }
    }

    /**
     * 强制释放所有等待者（用于清理）
     */
    forceReleaseAll(): void {
        const error = new Error(`互斥锁 ${this.name} 被强制释放`)
        for (const waiter of this.waitQueue) {
            clearTimeout(waiter.timeoutId)
            waiter.reject(error)
        }
        this.waitQueue = []
        this.locked = false
        logger.warn(`[AsyncManager] 互斥锁 ${this.name} 强制释放`, {
            releasedCount: this.waitQueue.length
        })
    }
}

// ═══════════════════════════════════════════════════════════════════
// 带超时的队列
// ═══════════════════════════════════════════════════════════════════

interface QueueItem<T> {
    resolve: (value: T) => void
    reject: (error: Error) => void
    timeoutId: ReturnType<typeof setTimeout>
    addedAt: number
}

/**
 * 带超时的异步队列
 * 用于限制并发操作数量
 */
export class TimeoutQueue<T = void> {
    private queue: QueueItem<T>[] = []
    private activeCount = 0
    private readonly name: string
    private readonly maxConcurrent: number
    private readonly maxQueueSize: number
    private readonly defaultTimeoutMs: number

    constructor(options: {
        name?: string
        maxConcurrent?: number
        maxQueueSize?: number
        defaultTimeoutMs?: number
    } = {}) {
        this.name = options.name ?? 'unnamed-queue'
        this.maxConcurrent = options.maxConcurrent ?? 1
        this.maxQueueSize = options.maxQueueSize ?? 100
        this.defaultTimeoutMs = options.defaultTimeoutMs ?? 60_000 // 默认 60 秒
    }

    /**
     * 获取执行槽位（带超时）
     * @param timeoutMs 超时时间（毫秒）
     * @throws TimeoutError 如果超时
     * @throws QueueFullError 如果队列已满
     */
    async acquireSlot(timeoutMs?: number): Promise<void> {
        const timeout = timeoutMs ?? this.defaultTimeoutMs

        if (this.activeCount < this.maxConcurrent) {
            this.activeCount++
            return
        }

        // 检查队列是否已满
        if (this.queue.length >= this.maxQueueSize) {
            throw new QueueFullError(
                `队列 ${this.name} 已满 (${this.maxQueueSize})`,
                this.name
            )
        }

        return new Promise<void>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                // 从队列中移除
                const index = this.queue.findIndex(item => item.timeoutId === timeoutId)
                if (index !== -1) {
                    this.queue.splice(index, 1)
                }
                reject(new TimeoutError(
                    `队列 ${this.name} 等待超时 (${timeout}ms)`,
                    this.name
                ))
            }, timeout)

            this.queue.push({
                resolve: resolve as (value: T) => void,
                reject,
                timeoutId,
                addedAt: Date.now()
            })
        })
    }

    /**
     * 释放执行槽位
     */
    releaseSlot(): void {
        this.activeCount = Math.max(0, this.activeCount - 1)

        if (this.queue.length > 0) {
            const next = this.queue.shift()!
            clearTimeout(next.timeoutId)
            this.activeCount++
            next.resolve(undefined as T)
        }
    }

    /**
     * 使用槽位执行操作（自动释放）
     */
    async withSlot<R>(fn: () => Promise<R>, timeoutMs?: number): Promise<R> {
        await this.acquireSlot(timeoutMs)
        try {
            return await fn()
        } finally {
            this.releaseSlot()
        }
    }

    /**
     * 获取当前状态
     */
    getStatus(): {
        activeCount: number
        queueLength: number
        maxConcurrent: number
        name: string
    } {
        return {
            activeCount: this.activeCount,
            queueLength: this.queue.length,
            maxConcurrent: this.maxConcurrent,
            name: this.name
        }
    }

    /**
     * 检查队列健康状态
     */
    isHealthy(): boolean {
        // 如果有项目在队列中等待超过一半超时时间，认为不健康
        const now = Date.now()
        const halfTimeout = this.defaultTimeoutMs / 2
        return !this.queue.some(item => now - item.addedAt > halfTimeout)
    }

    /**
     * 强制清空队列（用于清理）
     */
    forceReleaseAll(): void {
        const error = new Error(`队列 ${this.name} 被强制清空`)
        for (const item of this.queue) {
            clearTimeout(item.timeoutId)
            item.reject(error)
        }
        const releasedCount = this.queue.length
        this.queue = []
        this.activeCount = 0
        logger.warn(`[AsyncManager] 队列 ${this.name} 强制清空`, { releasedCount })
    }
}

// ═══════════════════════════════════════════════════════════════════
// 操作追踪器
// ═══════════════════════════════════════════════════════════════════

/**
 * 异步操作追踪管理器
 * 用于监控所有正在进行的异步操作
 */
export class AsyncOperationTracker {
    private operations: Map<string, OperationTracker> = new Map()
    private readonly maxOperations: number

    constructor(maxOperations = 1000) {
        this.maxOperations = maxOperations
    }

    /**
     * 开始追踪操作
     */
    start(name: string, timeoutMs?: number): string {
        const id = generateId()
        const now = Date.now()

        // 清理已完成的旧操作
        if (this.operations.size >= this.maxOperations) {
            this.cleanup()
        }

        this.operations.set(id, {
            id,
            name,
            status: 'running',
            startedAt: now,
            timeoutAt: timeoutMs ? now + timeoutMs : null,
            completedAt: null
        })

        return id
    }

    /**
     * 完成操作
     */
    complete(id: string, status: 'completed' | 'timeout' | 'cancelled' = 'completed'): void {
        const op = this.operations.get(id)
        if (op) {
            op.status = status
            op.completedAt = Date.now()
        }
    }

    /**
     * 获取操作状态
     */
    get(id: string): OperationTracker | undefined {
        return this.operations.get(id)
    }

    /**
     * 获取所有活跃操作
     */
    getActive(): OperationTracker[] {
        return Array.from(this.operations.values())
            .filter(op => op.status === 'running' || op.status === 'pending')
    }

    /**
     * 检查是否有超时的操作
     */
    getTimedOut(): OperationTracker[] {
        const now = Date.now()
        return Array.from(this.operations.values())
            .filter(op =>
                op.status === 'running' &&
                op.timeoutAt !== null &&
                now > op.timeoutAt
            )
    }

    /**
     * 清理已完成的操作
     */
    cleanup(): void {
        const toRemove: string[] = []
        for (const [id, op] of this.operations) {
            if (op.status === 'completed' || op.status === 'timeout' || op.status === 'cancelled') {
                toRemove.push(id)
            }
        }
        toRemove.forEach(id => this.operations.delete(id))
    }

    /**
     * 获取统计信息
     */
    getStats(): {
        total: number
        active: number
        completed: number
        timedOut: number
    } {
        let active = 0
        let completed = 0
        let timedOut = 0

        for (const op of this.operations.values()) {
            if (op.status === 'running' || op.status === 'pending') active++
            else if (op.status === 'completed') completed++
            else if (op.status === 'timeout') timedOut++
        }

        return {
            total: this.operations.size,
            active,
            completed,
            timedOut
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// 全局实例
// ═══════════════════════════════════════════════════════════════════

/** 全局操作追踪器 */
export const globalOperationTracker = new AsyncOperationTracker()

/**
 * 创建带追踪的超时 Promise
 */
export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string
): Promise<T> {
    const trackerId = globalOperationTracker.start(operationName, timeoutMs)

    return new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            globalOperationTracker.complete(trackerId, 'timeout')
            reject(new TimeoutError(
                `操作 ${operationName} 超时 (${timeoutMs}ms)`,
                operationName
            ))
        }, timeoutMs)

        promise
            .then(value => {
                clearTimeout(timeoutId)
                globalOperationTracker.complete(trackerId, 'completed')
                resolve(value)
            })
            .catch(error => {
                clearTimeout(timeoutId)
                globalOperationTracker.complete(trackerId, 'cancelled')
                reject(error)
            })
    })
}

/**
 * 创建可取消的 Promise
 */
export function createCancellablePromise<T>(
    executor: (signal: AbortSignal) => Promise<T>
): { promise: Promise<T>; cancel: () => void } {
    const controller = new AbortController()

    const promise = executor(controller.signal)

    return {
        promise,
        cancel: () => controller.abort()
    }
}
