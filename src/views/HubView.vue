<script setup lang="ts">
/**
 * HubView - InkForge 首页
 * Ethereal Constructivism + Bento Grid 布局
 * 基于 prototype/inkforge_hub.html 设计稿
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useArticleStore } from '@/stores/article'
import { useCategoryStore } from '@/stores/category'

const router = useRouter()
const articleStore = useArticleStore()
const categoryStore = useCategoryStore()

const { articles } = storeToRefs(articleStore)
const { categories } = storeToRefs(categoryStore)

// 统计数据
const stats = computed(() => ({
  totalArticles: articles.value.length || 24,
  totalViews: '8.5K',
  efficiency: '98%',
  thisWeek: articles.value.filter(a => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    return new Date(a.createdAt).getTime() > weekAgo
  }).length
}))

// 周创作数据（柱状图）
const weeklyData = ref([
  { day: '周一', count: 3, height: 40 },
  { day: '周二', count: 5, height: 60 },
  { day: '周三', count: 2, height: 30 },
  { day: '周四', count: 12, height: 80, active: true },
  { day: '周五', count: 4, height: 50 },
  { day: '周六', count: 8, height: 70 },
  { day: '周日', count: 3, height: 45 },
])

// 最近文件
const recentFile = computed(() => {
  const sorted = [...articles.value].sort((a, b) =>
    new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
  )
  const article = sorted[0]
  if (article) {
    return {
      id: article.id,
      title: article.title,
      excerpt: article.description || article.rawContent?.substring(0, 100) || '',
      status: article.status
    }
  }
  return {
    id: 'demo',
    title: '2024 AI 趋势报告.md',
    excerpt: '生成式视频模型的崛起从根本上改变了内容创作的格局...',
    status: 'new' as const
  }
})

// 分类数据
const categoryItems = computed(() => {
  const defaultCategories = [
    { id: 'tech', name: '科技', icon: 'cpu', count: 12, color: 'tech' },
    { id: 'life', name: '生活', icon: 'coffee', count: 5, color: 'life' },
    { id: 'work', name: '工作', icon: 'briefcase', count: 8, color: 'work' },
  ]
  if (categories.value.length === 0) return defaultCategories
  return categories.value.slice(0, 3).map((c, i) => ({
    ...c,
    icon: ['cpu', 'coffee', 'briefcase'][i % 3],
    color: ['tech', 'life', 'work'][i % 3],
    count: c.articleCount || 0
  }))
})

// 每日灵感
const dailyQuote = ref({
  text: '简约是复杂的终极形式。',
  author: '达·芬奇'
})

// 导航
function startNewProject() {
  router.push('/workstation')
}

function openRecentFile() {
  const id = recentFile.value?.id
  if (id && id !== 'demo') {
    router.push({ path: '/workstation', query: { id } })
  } else {
    router.push('/workstation')
  }
}

function openCategory(categoryId: string) {
  router.push({ path: '/workstation', query: { category: categoryId } })
}

function goToSettings() {
  router.push('/settings')
}

// Avatar 加载失败时的回退处理
function handleAvatarError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22%3E%3Crect fill=%22%23D32F2F%22 width=%2240%22 height=%2240%22 rx=%228%22/%3E%3Ctext x=%2220%22 y=%2226%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2216%22 font-weight=%22bold%22%3EIF%3C/text%3E%3C/svg%3E'
}

// 初始化
onMounted(async () => {
  await categoryStore.loadCategories()
  await articleStore.loadArticles()
})
</script>

<template>
  <div class="hub-container">
    <!-- ══════ HEADER ══════ -->
    <header class="hub-header">
      <div class="header-brand">
        <div class="logo">IF</div>
        <div class="brand-text">
          <h1>InkForge<span class="version">v5.0</span></h1>
          <p>欢迎回来，创作者</p>
        </div>
      </div>

      <div class="header-actions">
        <div class="sync-badge">
          <div class="sync-dot"></div>
          刚刚同步
        </div>
        <button class="icon-btn" @click="goToSettings" title="设置">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </button>
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=InkForge"
          class="avatar"
          alt="Avatar"
          @error="handleAvatarError"
        >
      </div>
    </header>

    <!-- ══════ BENTO GRID ══════ -->
    <div class="bento-container">
      <!-- 1. HERO: Creation Flow (2x2) -->
      <div class="bento-card card-hero">
        <svg class="card-icon" width="192" height="192" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
        <h2>创作流</h2>
        <p class="subtitle">本周产出速度位列前 5%</p>

        <div class="chart-container">
          <div
            v-for="(bar, index) in weeklyData"
            :key="index"
            class="chart-bar"
            :class="{ active: bar.active }"
            :style="{ height: bar.height + '%' }"
          >
            <span class="tooltip">{{ bar.count }} 篇</span>
          </div>
        </div>

        <div class="chart-labels">
          <span v-for="bar in weeklyData" :key="bar.day">{{ bar.day }}</span>
        </div>
      </div>

      <!-- 2. STATS (1x2) -->
      <div class="bento-card card-stats">
        <div class="stat-item">
          <div class="stat-icon red">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div class="stat-value">{{ stats.totalArticles }}</div>
          <div class="stat-label">文章总数</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div>
          <div class="stat-value">{{ stats.totalViews }}</div>
          <div class="stat-label">总阅读量</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-icon green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="stat-value">{{ stats.efficiency }}</div>
          <div class="stat-label">效率指数</div>
        </div>
      </div>

      <!-- 3. NEW PROJECT -->
      <div class="bento-card card-new" @click="startNewProject">
        <div class="new-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
        <h3>开始新项目</h3>
        <p>从模板或空白开始</p>
      </div>

      <!-- 4. CATEGORIES (2x1) -->
      <div class="bento-card card-categories">
        <div class="card-header">
          <h3>我的分类</h3>
          <a href="#" @click.prevent="router.push('/settings')">管理</a>
        </div>
        <div class="category-grid">
          <div
            v-for="cat in categoryItems"
            :key="cat.id"
            class="category-item"
            :class="cat.color"
            @click="openCategory(cat.id)"
          >
            <!-- CPU Icon -->
            <svg v-if="cat.icon === 'cpu'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :style="{ color: cat.color === 'tech' ? '#1565C0' : cat.color === 'life' ? '#F57C00' : '#2E7D32' }">
              <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
              <rect x="9" y="9" width="6" height="6"></rect>
              <line x1="9" y1="1" x2="9" y2="4"></line>
              <line x1="15" y1="1" x2="15" y2="4"></line>
              <line x1="9" y1="20" x2="9" y2="23"></line>
              <line x1="15" y1="20" x2="15" y2="23"></line>
              <line x1="20" y1="9" x2="23" y2="9"></line>
              <line x1="20" y1="14" x2="23" y2="14"></line>
              <line x1="1" y1="9" x2="4" y2="9"></line>
              <line x1="1" y1="14" x2="4" y2="14"></line>
            </svg>
            <!-- Coffee Icon -->
            <svg v-else-if="cat.icon === 'coffee'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :style="{ color: '#F57C00' }">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
            <!-- Briefcase Icon -->
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :style="{ color: '#2E7D32' }">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <div>
              <div class="name">{{ cat.name }}</div>
              <div class="count">{{ cat.count }} 篇文章</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 5. RECENT FILE -->
      <div class="bento-card card-recent">
        <div class="meta">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          最近编辑
        </div>
        <h3>{{ recentFile.title || '2024 AI 趋势报告.md' }}</h3>
        <p class="excerpt">{{ recentFile.excerpt || '生成式视频模型的崛起从根本上改变了内容创作的格局...' }}</p>
        <div class="footer">
          <span class="status-tag" :class="recentFile.status || 'new'">
            {{ recentFile.status === 'processed' ? '已处理' : recentFile.status === 'read' ? '已读' : '新增' }}
          </span>
          <div class="open-btn" @click="openRecentFile">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </div>
        </div>
      </div>

      <!-- 6. INSPIRATION -->
      <div class="bento-card card-inspiration">
        <div class="content">
          <div>
            <svg class="spark-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3L14.39 8.26L20 9.27L16 13.14L16.92 18.74L12 16.12L7.08 18.74L8 13.14L4 9.27L9.61 8.26L12 3Z"></path>
            </svg>
            <h3>每日灵感</h3>
          </div>
          <p class="quote">"{{ dailyQuote.text }}"<br>—— {{ dailyQuote.author }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   InkForge Hub — Ethereal Constructivism + Bento Grid
   统一设计语言：构成主义红 + 便当盒布局
═══════════════════════════════════════════════════════════════════ */

.hub-container {
  min-height: 100vh;
  background: var(--bg-rice-paper);
  padding: var(--space-large);
  /* Rice Paper 微纹理 */
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.015'/%3E%3C/svg%3E");
}

/* ═══ HEADER ═══ */
.hub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto var(--space-large);
  padding: 0 var(--space-small);
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 36px;
  height: 36px;
  background: var(--accent-primary);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: -0.5px;
  box-shadow: 0 2px 8px rgba(211, 47, 47, 0.3);
}

.brand-text h1 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.brand-text .version {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  font-family: var(--font-mono);
  background: var(--border-light);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
}

.brand-text p {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-medium);
}

.sync-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--bg-frosted);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.sync-dot {
  position: relative;
  width: 8px;
  height: 8px;
}

.sync-dot::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.sync-dot::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--success);
  border-radius: 50%;
}

.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--bg-frosted);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.15s var(--ease-smooth);
  color: var(--text-secondary);
}

.icon-btn:hover {
  background: var(--bg-surface);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 2px solid var(--bg-surface);
  box-shadow: var(--shadow-soft);
}

/* ═══ BENTO GRID ═══ */
.bento-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 20px;
  height: calc(100vh - 140px);
  max-width: 1400px;
  margin: 0 auto;
}

.bento-card {
  background: var(--bg-frosted);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: var(--space-large);
  transition: all 0.3s var(--ease-panel);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: fadeInUp 0.5s var(--ease-panel) backwards;
}

.bento-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-float);
  border-color: rgba(211, 47, 47, 0.2);
}

/* Animation delays */
.bento-card:nth-child(1) { animation-delay: 0.05s; }
.bento-card:nth-child(2) { animation-delay: 0.1s; }
.bento-card:nth-child(3) { animation-delay: 0.15s; }
.bento-card:nth-child(4) { animation-delay: 0.2s; }
.bento-card:nth-child(5) { animation-delay: 0.25s; }
.bento-card:nth-child(6) { animation-delay: 0.3s; }

/* ═══ HERO CARD (Creation Flow) ═══ */
.card-hero {
  grid-column: span 2;
  grid-row: span 2;
  background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-dark) 100%);
  border: none;
  color: white;
}

.card-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -30%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
  pointer-events: none;
}

.card-hero .card-icon {
  position: absolute;
  top: 32px;
  right: 32px;
  opacity: 0.15;
}

.card-hero h2 {
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.card-hero .subtitle {
  font-size: 14px;
  opacity: 0.8;
  margin-bottom: var(--space-large);
}

.chart-container {
  flex: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding-top: var(--space-medium);
}

.chart-bar {
  flex: 1;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 6px 6px 0 0;
  transition: all 0.3s var(--ease-bounce);
  cursor: pointer;
  position: relative;
}

.chart-bar:hover {
  background: rgba(255, 255, 255, 0.95);
}

.chart-bar.active {
  background: white;
  box-shadow: 0 -4px 20px rgba(255,255,255,0.4);
}

.chart-bar .tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) scale(0.9);
  background: var(--text-primary);
  color: white;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  transition: all 0.2s var(--ease-bounce);
  pointer-events: none;
}

.chart-bar:hover .tooltip {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}

.chart-labels {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-medium);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
}

/* ═══ STATS CARD ═══ */
.card-stats {
  grid-row: span 2;
  justify-content: center;
  gap: var(--space-large);
}

.stat-item {
  text-align: center;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-small);
}

.stat-icon.red { background: var(--accent-primary-light); color: var(--accent-primary); }
.stat-icon.blue { background: var(--accent-secondary-light); color: var(--accent-secondary); }
.stat-icon.green { background: #E8F5E9; color: var(--success); }

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-muted);
  margin-top: 4px;
}

.stat-divider {
  height: 1px;
  background: var(--border);
}

/* ═══ NEW PROJECT CARD ═══ */
.card-new {
  border: 2px dashed var(--border);
  background: transparent;
  backdrop-filter: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s var(--ease-smooth);
}

.card-new:hover {
  border-color: var(--accent-primary);
  background: var(--accent-primary-light);
  transform: translateY(-4px);
}

.card-new .new-icon {
  width: 56px;
  height: 56px;
  background: var(--bg-surface);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-medium);
  box-shadow: var(--shadow-soft);
  transition: all 0.2s var(--ease-bounce);
  color: var(--text-muted);
}

.card-new:hover .new-icon {
  transform: scale(1.1) rotate(90deg);
  color: var(--accent-primary);
  box-shadow: var(--shadow-medium);
}

.card-new h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-secondary);
}

.card-new:hover h3 {
  color: var(--accent-primary);
}

.card-new p {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* ═══ CATEGORIES CARD ═══ */
.card-categories {
  grid-column: span 2;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-medium);
}

.card-header h3 {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.card-header a {
  font-size: 12px;
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 500;
}

.card-header a:hover {
  text-decoration: underline;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-medium);
  flex: 1;
}

.category-item {
  background: var(--bg-surface);
  border-radius: 12px;
  padding: var(--space-medium);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.15s var(--ease-smooth);
  border: 1px solid transparent;
}

.category-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.category-item.tech { background: #E3F2FD; }
.category-item.tech:hover { border-color: #1565C0; }
.category-item.life { background: #FFF3E0; }
.category-item.life:hover { border-color: #F57C00; }
.category-item.work { background: #E8F5E9; }
.category-item.work:hover { border-color: #2E7D32; }

.category-item svg {
  margin-bottom: var(--space-small);
}

.category-item .name {
  font-size: 14px;
  font-weight: 700;
}

.category-item.tech .name { color: #1565C0; }
.category-item.life .name { color: #E65100; }
.category-item.work .name { color: #2E7D32; }

.category-item .count {
  font-size: 11px;
  opacity: 0.7;
}

/* ═══ RECENT FILE CARD ═══ */
.card-recent .meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--text-muted);
  margin-bottom: var(--space-small);
}

.card-recent h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-small);
  line-height: 1.3;
}

.card-recent .excerpt {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card-recent .footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: var(--space-medium);
}

.status-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--border-light);
  color: var(--text-muted);
}

.status-tag.draft { background: #FFF8E1; color: #F57C00; }
.status-tag.published { background: #E8F5E9; color: #2E7D32; }

.open-btn {
  width: 36px;
  height: 36px;
  background: var(--text-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s var(--ease-bounce);
}

.open-btn:hover {
  transform: scale(1.1);
  background: var(--accent-primary);
}

/* ═══ INSPIRATION CARD ═══ */
.card-inspiration {
  background: var(--text-primary);
  color: white;
  border: none;
}

.card-inspiration::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.card-inspiration .content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
}

.card-inspiration .spark-icon {
  color: #FFC107;
  margin-bottom: var(--space-small);
}

.card-inspiration h3 {
  font-size: 15px;
  font-weight: 700;
}

.card-inspiration .quote {
  font-family: var(--font-serif);
  font-size: 14px;
  font-style: italic;
  opacity: 0.8;
  line-height: 1.6;
}

/* ═══ ANIMATIONS ═══ */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.8); opacity: 0; }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 1200px) {
  .bento-container {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: auto;
    height: auto;
  }

  .card-hero {
    grid-column: span 2;
    grid-row: span 1;
    min-height: 300px;
  }

  .card-stats {
    grid-row: span 1;
    flex-direction: row;
    justify-content: space-around;
  }

  .stat-divider {
    width: 1px;
    height: 60px;
  }
}

@media (max-width: 768px) {
  .hub-container {
    padding: var(--space-medium);
  }

  .bento-container {
    grid-template-columns: 1fr;
  }

  .card-hero,
  .card-categories {
    grid-column: span 1;
  }

  .category-grid {
    grid-template-columns: 1fr;
  }

  .card-stats {
    flex-direction: column;
    gap: var(--space-medium);
  }

  .stat-divider {
    width: 100%;
    height: 1px;
  }
}
</style>
