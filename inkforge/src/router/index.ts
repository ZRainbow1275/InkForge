/**
 * InkForge 路由配置 v2.0
 * 基于原型设计的新路由架构
 *
 * 导航流程：
 * Hub (/) → Workstation (/workstation) → Publish/Settings/Themes
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { logger } from '@/services/error'

// 扩展 RouteMeta 类型定义
declare module 'vue-router' {
    interface RouteMeta {
        title?: string
    }
}

// 懒加载视图组件
const HubView = () => import('@/views/HubView.vue')
const WorkstationView = () => import('@/views/WorkstationView.vue')
const PublishView = () => import('@/views/PublishView.vue')
const SettingsView = () => import('@/views/SettingsView.vue')
const ThemesView = () => import('@/views/ThemesView.vue')
const NotFoundView = () => import('@/views/NotFoundView.vue')

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'Hub',
        component: HubView,
        meta: { title: 'InkForge - 首页' }
    },
    {
        path: '/workstation',
        name: 'Workstation',
        component: WorkstationView,
        meta: { title: 'InkForge - 工作站' }
    },
    {
        path: '/publish',
        name: 'Publish',
        component: PublishView,
        meta: { title: 'InkForge - 发布' }
    },
    {
        path: '/settings',
        name: 'Settings',
        component: SettingsView,
        meta: { title: 'InkForge - 设置' }
    },
    {
        path: '/themes',
        name: 'Themes',
        component: ThemesView,
        meta: { title: 'InkForge - 主题' }
    },
    // 兼容性重定向
    {
        path: '/editor',
        redirect: '/workstation'
    },
    {
        path: '/cms',
        redirect: '/'
    },
    {
        path: '/nexus',
        redirect: '/'
    },
    {
        path: '/client',
        redirect: '/workstation'
    },
    {
        path: '/workspace',
        redirect: '/workstation'
    },
    // 404 catch-all 路由
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: NotFoundView,
        meta: { title: 'InkForge - 页面不存在' }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫：更新页面标题
router.beforeEach((to, _from, next) => {
    try {
        // 使用类型守卫替代类型断言
        const title = typeof to.meta?.title === 'string' ? to.meta.title : 'InkForge'
        document.title = title
    } catch (error) {
        // 使用统一的 logger 服务记录异常
        logger.warn('设置页面标题失败', {
            path: to.path,
            error: error instanceof Error ? error.message : String(error)
        })
        document.title = 'InkForge'
    }
    next()
})

export default router
