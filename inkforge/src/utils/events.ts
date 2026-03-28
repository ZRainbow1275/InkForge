/**
 * 事件监听器管理工具
 * 提供统一的事件监听器注册和清理机制，防止内存泄漏
 */

import { onMounted, onUnmounted } from 'vue'
import { logger } from '@/services/error'

/**
 * 清理函数类型
 */
export type CleanupFn = () => void

/**
 * 创建可管理的事件监听器
 * @param target 事件目标（window、document 或其他 EventTarget）
 * @param event 事件名称
 * @param handler 事件处理函数
 * @param options 事件监听选项
 * @returns 清理函数，调用后移除事件监听器
 *
 * @example
 * ```typescript
 * const cleanup = createManagedEventListener(
 *     window,
 *     'beforeunload',
 *     (e) => { ... }
 * )
 *
 * // 需要清理时调用
 * cleanup()
 * ```
 */
export function createManagedEventListener<K extends keyof WindowEventMap>(
    target: Window,
    event: K,
    handler: (this: Window, ev: WindowEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions
): CleanupFn
export function createManagedEventListener<K extends keyof DocumentEventMap>(
    target: Document,
    event: K,
    handler: (this: Document, ev: DocumentEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions
): CleanupFn
export function createManagedEventListener(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
): CleanupFn
export function createManagedEventListener(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
): CleanupFn {
    target.addEventListener(event, handler, options)

    return () => {
        target.removeEventListener(event, handler, options)
    }
}

/**
 * 事件监听器注册表
 * 用于集中管理多个事件监听器的生命周期
 */
export class EventListenerRegistry {
    private cleanupFns: CleanupFn[] = []

    /**
     * 注册事件监听器
     * @param target 事件目标
     * @param event 事件名称
     * @param handler 事件处理函数
     * @param options 事件监听选项
     */
    add<K extends keyof WindowEventMap>(
        target: Window,
        event: K,
        handler: (this: Window, ev: WindowEventMap[K]) => unknown,
        options?: boolean | AddEventListenerOptions
    ): void
    add<K extends keyof DocumentEventMap>(
        target: Document,
        event: K,
        handler: (this: Document, ev: DocumentEventMap[K]) => unknown,
        options?: boolean | AddEventListenerOptions
    ): void
    add(
        target: EventTarget,
        event: string,
        handler: EventListener,
        options?: boolean | AddEventListenerOptions
    ): void
    add(
        target: EventTarget,
        event: string,
        handler: EventListener,
        options?: boolean | AddEventListenerOptions
    ): void {
        const cleanup = createManagedEventListener(target, event, handler, options)
        this.cleanupFns.push(cleanup)
    }

    /**
     * 清理所有已注册的事件监听器
     */
    cleanup(): void {
        for (const fn of this.cleanupFns) {
            fn()
        }
        this.cleanupFns = []
    }

    /**
     * 获取当前注册的监听器数量
     */
    get size(): number {
        return this.cleanupFns.length
    }
}

/**
 * Vue Composable：在组件生命周期内自动管理事件监听器
 * 在 onMounted 时注册，onUnmounted 时自动清理
 *
 * @param target 事件目标
 * @param event 事件名称
 * @param handler 事件处理函数
 * @param options 事件监听选项
 *
 * @example
 * ```typescript
 * // 在 setup() 或 <script setup> 中使用
 * useEventListener(window, 'resize', handleResize)
 * useEventListener(document, 'keydown', handleKeydown)
 * ```
 */
export function useEventListener<K extends keyof WindowEventMap>(
    target: Window,
    event: K,
    handler: (this: Window, ev: WindowEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions
): void
export function useEventListener<K extends keyof DocumentEventMap>(
    target: Document,
    event: K,
    handler: (this: Document, ev: DocumentEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions
): void
export function useEventListener(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
): void
export function useEventListener(
    target: EventTarget,
    event: string,
    handler: EventListener,
    options?: boolean | AddEventListenerOptions
): void {
    let cleanup: CleanupFn | null = null

    onMounted(() => {
        cleanup = createManagedEventListener(target, event, handler, options)
    })

    onUnmounted(() => {
        if (cleanup) {
            cleanup()
            cleanup = null
        }
    })
}

/**
 * Vue Composable：创建事件监听器注册表并自动管理生命周期
 *
 * @returns 事件监听器注册表实例
 *
 * @example
 * ```typescript
 * // 在 setup() 或 <script setup> 中使用
 * const events = useEventListenerRegistry()
 *
 * events.add(window, 'resize', handleResize)
 * events.add(document, 'keydown', handleKeydown)
 * // 组件卸载时自动清理所有监听器
 * ```
 */
export function useEventListenerRegistry(): EventListenerRegistry {
    const registry = new EventListenerRegistry()

    onUnmounted(() => {
        registry.cleanup()
    })

    return registry
}

// ═══════════════════════════════════════════════════════════════════
// 事件订阅管理器（增强版生命周期管理）
// ═══════════════════════════════════════════════════════════════════

/**
 * 事件订阅管理器
 * 用于统一管理多个事件监听器的生命周期
 */
export class EventSubscriptionManager {
    private cleanupFns: CleanupFn[] = []
    private isDisposed = false

    /**
     * 添加事件监听器
     */
    addEventListener<K extends keyof WindowEventMap>(
        target: Window,
        type: K,
        listener: (ev: WindowEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions
    ): this
    addEventListener<K extends keyof DocumentEventMap>(
        target: Document,
        type: K,
        listener: (ev: DocumentEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions
    ): this
    addEventListener(
        target: EventTarget,
        type: string,
        listener: EventListener,
        options?: boolean | AddEventListenerOptions
    ): this {
        if (this.isDisposed) {
            logger.warn('[EventSubscriptionManager] 尝试在已销毁的管理器上添加监听器')
            return this
        }

        const cleanup = createManagedEventListener(target, type, listener, options)
        this.cleanupFns.push(cleanup)
        return this
    }

    /**
     * 添加自定义清理函数
     */
    addCleanup(fn: CleanupFn): this {
        if (this.isDisposed) return this
        this.cleanupFns.push(fn)
        return this
    }

    /**
     * 清理所有监听器
     */
    dispose(): void {
        if (this.isDisposed) return

        this.cleanupFns.forEach(fn => {
            try {
                fn()
            } catch (e) {
                logger.error('[EventSubscriptionManager] 清理时发生错误:', e)
            }
        })

        this.cleanupFns = []
        this.isDisposed = true
    }

    /**
     * 获取当前管理的监听器数量
     */
    get size(): number {
        return this.cleanupFns.length
    }
}

/**
 * 创建事件订阅管理器的工厂函数
 */
export function createEventSubscriptionManager(): EventSubscriptionManager {
    return new EventSubscriptionManager()
}

// ═══════════════════════════════════════════════════════════════════
// 应用事件总线（Store 解耦）
// ═══════════════════════════════════════════════════════════════════

/**
 * 应用事件类型定义
 */
export type AppEvents = {
    'article:created': { articleId: string; categoryId: string | null }
    'article:deleted': { articleId: string; categoryId: string | null }
    'article:moved': { articleId: string; fromCategoryId: string | null; toCategoryId: string | null }
    'category:deleted': { categoryId: string }
    'sync:data-changed': { table: string }
}

type EventHandler<T> = (payload: T) => void

/**
 * 类型安全的事件总线
 * 用于解耦 Store 之间的循环依赖
 *
 * @example
 * ```typescript
 * // 发送事件
 * eventBus.emit('article:created', { articleId: '123', categoryId: 'cat-1' })
 *
 * // 监听事件
 * const unsubscribe = eventBus.on('article:created', (payload) => {
 *     console.log('文章已创建:', payload.articleId)
 * })
 *
 * // 取消监听
 * unsubscribe()
 * ```
 */
class TypedEventBus {
    private handlers: Map<keyof AppEvents, Set<EventHandler<unknown>>> = new Map()

    /**
     * 订阅事件
     * @param event 事件名称
     * @param handler 事件处理函数
     * @returns 取消订阅函数
     */
    on<K extends keyof AppEvents>(event: K, handler: EventHandler<AppEvents[K]>): () => void {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set())
        }
        this.handlers.get(event)!.add(handler as EventHandler<unknown>)

        return () => {
            this.handlers.get(event)?.delete(handler as EventHandler<unknown>)
        }
    }

    /**
     * 发送事件
     * @param event 事件名称
     * @param payload 事件数据
     */
    emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
        this.handlers.get(event)?.forEach(handler => handler(payload))
    }

    /**
     * 取消订阅事件
     * @param event 事件名称
     * @param handler 事件处理函数
     */
    off<K extends keyof AppEvents>(event: K, handler: EventHandler<AppEvents[K]>): void {
        this.handlers.get(event)?.delete(handler as EventHandler<unknown>)
    }
}

export const eventBus = new TypedEventBus()
