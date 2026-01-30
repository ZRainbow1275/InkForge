<script setup lang="ts">
/**
 * SettingsView - 设置页面
 * 5 个 Tab：外观、编辑器、导出、账户、AI 服务
 */
import { ref, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { logger } from '@/services/error'

const router = useRouter()

// 当前 Tab
const currentTab = ref('appearance')
const tabs = [
  { id: 'appearance', name: '外观', icon: 'palette' },
  { id: 'editor', name: '编辑器', icon: 'edit' },
  { id: 'export', name: '导出', icon: 'share' },
  { id: 'account', name: '账户', icon: 'user' },
  { id: 'ai', name: 'AI 服务', icon: 'sparkles' },
]

// 设置状态（持久化到 localStorage）
const settings = reactive({
  appearance: {
    theme: 'light',
    fontFamily: 'serif',
    fontSize: 16,
    lineHeight: 1.8,
    accentColor: '#D32F2F',
  },
  editor: {
    autoSave: true,
    autoSaveInterval: 30,
    spellCheck: false,
    typewriterMode: false,
    smartPunctuation: true,
    wordWrap: true,
  },
  export: {
    defaultPreset: 'default',
    macCodeBlock: true,
    lineNumbers: false,
    convertFootnotes: true,
    textIndent: false,
  },
  account: {
    email: '',
    displayName: '',
  },
  ai: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4',
    maxTokens: 2000,
  },
})

// 保存设置
function saveSettings() {
  localStorage.setItem('inkforge-settings', JSON.stringify(settings))
}

// 加载设置
function loadSettings() {
  const saved = localStorage.getItem('inkforge-settings')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(settings, parsed)
    } catch (e) {
      logger.error('加载设置失败', e)
    }
  }
}

// 监听变化自动保存
watch(settings, saveSettings, { deep: true })

// 导航
function goBack() {
  router.back()
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div class="settings-container">
    <!-- Header -->
    <header class="settings-header">
      <button class="back-btn" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        返回
      </button>
      <h1 class="header-title">设置</h1>
      <div class="header-placeholder"></div>
    </header>

    <!-- Main -->
    <main class="settings-main">
      <!-- Sidebar -->
      <aside class="settings-sidebar">
        <nav class="settings-nav">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            class="nav-item"
            :class="{ active: currentTab === tab.id }"
            @click="currentTab = tab.id"
          >
            <!-- Icons -->
            <svg v-if="tab.icon === 'palette'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="13.5" cy="6.5" r=".5"></circle>
              <circle cx="17.5" cy="10.5" r=".5"></circle>
              <circle cx="8.5" cy="7.5" r=".5"></circle>
              <circle cx="6.5" cy="12.5" r=".5"></circle>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"></path>
            </svg>
            <svg v-else-if="tab.icon === 'edit'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <svg v-else-if="tab.icon === 'share'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
              <polyline points="16 6 12 2 8 6"></polyline>
              <line x1="12" y1="2" x2="12" y2="15"></line>
            </svg>
            <svg v-else-if="tab.icon === 'user'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <svg v-else-if="tab.icon === 'sparkles'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
              <path d="M5 3v4"></path>
              <path d="M3 5h4"></path>
              <path d="M19 17v4"></path>
              <path d="M17 19h4"></path>
            </svg>
            {{ tab.name }}
          </button>
        </nav>
      </aside>

      <!-- Content -->
      <div class="settings-content">
        <!-- Appearance Tab -->
        <div v-show="currentTab === 'appearance'" class="tab-content">
          <h2 class="content-title">外观</h2>
          <p class="content-desc">自定义界面外观和视觉风格</p>

          <div class="form-group">
            <label class="form-label">主题模式</label>
            <div class="radio-group">
              <label class="radio-item">
                <input type="radio" v-model="settings.appearance.theme" value="light">
                <span class="radio-text">浅色</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="settings.appearance.theme" value="dark">
                <span class="radio-text">深色</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="settings.appearance.theme" value="system">
                <span class="radio-text">跟随系统</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">预览字体</label>
            <select v-model="settings.appearance.fontFamily" class="select">
              <option value="serif">思源宋体</option>
              <option value="sans">思源黑体</option>
              <option value="kai">楷体</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">字体大小</label>
            <div class="range-group">
              <input type="range" v-model.number="settings.appearance.fontSize" min="12" max="24" step="1">
              <span class="range-value">{{ settings.appearance.fontSize }}px</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">行高</label>
            <div class="range-group">
              <input type="range" v-model.number="settings.appearance.lineHeight" min="1.4" max="2.4" step="0.1">
              <span class="range-value">{{ settings.appearance.lineHeight.toFixed(1) }}</span>
            </div>
          </div>
        </div>

        <!-- Editor Tab -->
        <div v-show="currentTab === 'editor'" class="tab-content">
          <h2 class="content-title">编辑器</h2>
          <p class="content-desc">编辑器行为和功能设置</p>

          <div class="form-group">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">自动保存</span>
                <span class="toggle-desc">定时自动保存编辑内容</span>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.editor.autoSave">
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="form-group" v-show="settings.editor.autoSave">
            <label class="form-label">保存间隔（秒）</label>
            <select v-model.number="settings.editor.autoSaveInterval" class="select">
              <option :value="10">10 秒</option>
              <option :value="30">30 秒</option>
              <option :value="60">1 分钟</option>
              <option :value="120">2 分钟</option>
            </select>
          </div>

          <div class="form-group">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">拼写检查</span>
                <span class="toggle-desc">启用浏览器拼写检查</span>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.editor.spellCheck">
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">打字机模式</span>
                <span class="toggle-desc">保持光标在屏幕中央</span>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.editor.typewriterMode">
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">智能标点</span>
                <span class="toggle-desc">自动转换中英文标点</span>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.editor.smartPunctuation">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Export Tab -->
        <div v-show="currentTab === 'export'" class="tab-content">
          <h2 class="content-title">导出</h2>
          <p class="content-desc">导出和发布相关的默认设置</p>

          <div class="form-group">
            <label class="form-label">默认主题预设</label>
            <select v-model="settings.export.defaultPreset" class="select">
              <option value="default">默认</option>
              <option value="thesis">论文翻译</option>
              <option value="legal">法学研讨</option>
              <option value="report">行业研报</option>
              <option value="news">时事点评</option>
            </select>
          </div>

          <div class="form-group">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">Mac 风格代码块</span>
                <span class="toggle-desc">为代码块添加红黄绿圆点装饰</span>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.export.macCodeBlock">
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">代码行号</span>
                <span class="toggle-desc">在代码块中显示行号</span>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.export.lineNumbers">
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">外链转脚注</span>
                <span class="toggle-desc">将外部链接转换为底部脚注</span>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.export.convertFootnotes">
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <div class="toggle-row">
              <div class="toggle-info">
                <span class="toggle-label">首行缩进</span>
                <span class="toggle-desc">段落自动首行缩进两格</span>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="settings.export.textIndent">
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Account Tab -->
        <div v-show="currentTab === 'account'" class="tab-content">
          <h2 class="content-title">账户</h2>
          <p class="content-desc">管理您的账户信息</p>

          <div class="account-card">
            <div class="avatar-large">U</div>
            <div class="account-info">
              <span class="account-name">本地用户</span>
              <span class="account-type">离线模式</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">显示名称</label>
            <input type="text" v-model="settings.account.displayName" class="input" placeholder="输入您的昵称">
          </div>

          <div class="form-group">
            <label class="form-label">邮箱（可选）</label>
            <input type="email" v-model="settings.account.email" class="input" placeholder="用于同步和恢复">
          </div>

          <div class="info-card">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <p>InkForge 使用本地 IndexedDB 存储所有数据，无需联网即可使用。云同步功能即将推出。</p>
          </div>
        </div>

        <!-- AI Tab -->
        <div v-show="currentTab === 'ai'" class="tab-content">
          <h2 class="content-title">AI 服务</h2>
          <p class="content-desc">配置 AI 辅助写作功能</p>

          <div class="form-group">
            <label class="form-label">服务提供商</label>
            <select v-model="settings.ai.provider" class="select">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="deepseek">DeepSeek</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">API Key</label>
            <input type="password" v-model="settings.ai.apiKey" class="input" placeholder="sk-...">
            <span class="form-hint">您的 API Key 仅存储在本地，不会上传到服务器</span>
          </div>

          <div class="form-group">
            <label class="form-label">模型</label>
            <select v-model="settings.ai.model" class="select">
              <template v-if="settings.ai.provider === 'openai'">
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </template>
              <template v-else-if="settings.ai.provider === 'anthropic'">
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
              </template>
              <template v-else>
                <option value="deepseek-chat">DeepSeek Chat</option>
                <option value="deepseek-coder">DeepSeek Coder</option>
              </template>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">最大 Token 数</label>
            <div class="range-group">
              <input type="range" v-model.number="settings.ai.maxTokens" min="500" max="4000" step="100">
              <span class="range-value">{{ settings.ai.maxTokens }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.settings-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-rice-paper);
}

/* Header */
.settings-header {
  height: 56px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 var(--space-medium);
  flex-shrink: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: var(--radius-medium);
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.back-btn:hover {
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.header-title {
  flex: 1;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-placeholder {
  width: 80px;
}

/* Main */
.settings-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Sidebar */
.settings-sidebar {
  width: 220px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border);
  padding: var(--space-medium);
  flex-shrink: 0;
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-small);
  padding: 10px 12px;
  border-radius: var(--radius-medium);
  background: transparent;
  border: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.nav-item:hover {
  background: var(--bg-rice-paper);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-primary-light);
  color: var(--accent-primary);
}

/* Content */
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-large) var(--space-macro);
}

.tab-content {
  max-width: 600px;
}

.content-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-small);
}

.content-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: var(--space-large);
}

/* Form */
.form-group {
  margin-bottom: var(--space-large);
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-small);
}

.form-hint {
  display: block;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: var(--space-small);
}

/* Radio Group */
.radio-group {
  display: flex;
  gap: var(--space-medium);
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.radio-item input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-primary);
}

.radio-text {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Range */
.range-group {
  display: flex;
  align-items: center;
  gap: var(--space-medium);
}

.range-group input[type="range"] {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  appearance: none;
}

.range-group input[type="range"]::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent-primary);
  border: none;
  cursor: pointer;
  appearance: none;
}

.range-value {
  min-width: 50px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
}

/* Toggle */
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-medium);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-medium);
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.toggle-desc {
  font-size: 11px;
  color: var(--text-muted);
}

/* Switch */
.switch {
  position: relative;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background: var(--border);
  border-radius: 22px;
  transition: 0.2s;
}

.slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: 0.2s;
  box-shadow: var(--shadow-soft);
}

.switch input:checked + .slider {
  background: var(--accent-primary);
}

.switch input:checked + .slider::before {
  transform: translateX(18px);
}

/* Account */
.account-card {
  display: flex;
  align-items: center;
  gap: var(--space-medium);
  padding: var(--space-medium);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-large);
  margin-bottom: var(--space-large);
}

.avatar-large {
  width: 56px;
  height: 56px;
  background: var(--accent-primary-light);
  color: var(--accent-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.account-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.account-type {
  font-size: 12px;
  color: var(--text-muted);
}

/* Info Card */
.info-card {
  display: flex;
  gap: var(--space-medium);
  padding: var(--space-medium);
  background: var(--accent-secondary-light);
  border-radius: var(--radius-medium);
  color: var(--accent-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.info-card svg {
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
