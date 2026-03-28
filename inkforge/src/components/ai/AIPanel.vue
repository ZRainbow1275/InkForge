<script setup lang="ts">
import { useAIStore } from '@/stores/ai'
import { storeToRefs } from 'pinia'
import { 
  Sparkles, FileText, Mic, Wand2, Expand, Minimize2, 
  RefreshCw, AlertCircle, CheckCircle, Loader2
} from 'lucide-vue-next'

const aiStore = useAIStore()
const { status, loading, currentTask, error, isAvailable, currentModel } = storeToRefs(aiStore)

// 重新检查状态
function recheckStatus() {
  aiStore.checkStatus()
}
</script>

<template>
  <div class="ai-panel">
    <!-- AI 状态 -->
    <div
      class="ai-status"
      :class="{ available: isAvailable, unavailable: !isAvailable }"
    >
      <div class="status-indicator">
        <CheckCircle
          v-if="isAvailable"
          :size="16"
          class="text-green-500"
        />
        <AlertCircle
          v-else
          :size="16"
          class="text-orange-500"
        />
      </div>
      <div class="status-info">
        <span
          v-if="isAvailable"
          class="status-text"
        >
          AI 就绪 · {{ currentModel }}
        </span>
        <span
          v-else
          class="status-text"
        >
          {{ status.error || 'AI 未连接' }}
        </span>
      </div>
      <button
        class="refresh-btn"
        title="刷新状态"
        @click="recheckStatus"
      >
        <RefreshCw :size="14" />
      </button>
    </div>

    <!-- 加载状态 -->
    <div
      v-if="loading"
      class="ai-loading"
    >
      <Loader2
        :size="20"
        class="animate-spin"
      />
      <span>{{ currentTask }}...</span>
    </div>

    <!-- 错误提示 -->
    <div
      v-if="error"
      class="ai-error"
    >
      <AlertCircle :size="14" />
      <span>{{ error }}</span>
    </div>

    <!-- AI 功能按钮 -->
    <div
      class="ai-actions"
      :class="{ disabled: !isAvailable || loading }"
    >
      <h4>✨ AI 生成</h4>
      
      <div class="action-grid">
        <button 
          class="ai-btn"
          :disabled="!isAvailable || loading"
          @click="aiStore.generateArticleSummary()"
        >
          <Sparkles :size="16" />
          <span>生成摘要</span>
        </button>
        
        <button 
          class="ai-btn"
          :disabled="!isAvailable || loading"
          @click="aiStore.generateArticleTitle()"
        >
          <FileText :size="16" />
          <span>生成标题</span>
        </button>
        
        <button 
          class="ai-btn"
          :disabled="!isAvailable || loading"
          @click="aiStore.generateArticleTranscript()"
        >
          <Mic :size="16" />
          <span>生成口播稿</span>
        </button>
        
        <button 
          class="ai-btn"
          :disabled="!isAvailable || loading"
          @click="aiStore.polishCurrentArticle('专业')"
        >
          <Wand2 :size="16" />
          <span>润色文章</span>
        </button>
        
        <button 
          class="ai-btn"
          :disabled="!isAvailable || loading"
          @click="aiStore.expandCurrentContent(500)"
        >
          <Expand :size="16" />
          <span>扩写内容</span>
        </button>
        
        <button 
          class="ai-btn"
          :disabled="!isAvailable || loading"
          @click="aiStore.condenseCurrentContent(200)"
        >
          <Minimize2 :size="16" />
          <span>精简内容</span>
        </button>
      </div>
    </div>

    <!-- 安装说明（未连接时显示） -->
    <div
      v-if="!isAvailable"
      class="ai-help"
    >
      <h4>📖 如何使用本地 AI</h4>
      <ol>
        <li>
          安装 <a
            href="https://ollama.ai"
            target="_blank"
          >Ollama</a>
        </li>
        <li>运行 <code>ollama pull qwen2.5:7b</code></li>
        <li>启动 Ollama 服务</li>
        <li>点击"刷新状态"按钮</li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  margin-top: 12px;
}

.ai-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.ai-status.available {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.ai-status.unavailable {
  background: rgba(249, 115, 22, 0.1);
  border: 1px solid rgba(249, 115, 22, 0.3);
}

.status-indicator {
  display: flex;
  align-items: center;
}

.status-info {
  flex: 1;
}

.status-text {
  font-size: 12px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.refresh-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.ai-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(0, 102, 204, 0.1);
  border-radius: 6px;
  font-size: 13px;
  color: var(--color-primary);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.ai-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 6px;
  font-size: 12px;
  color: #ef4444;
}

.ai-actions h4 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.ai-actions.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.ai-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.ai-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  background: rgba(0, 102, 204, 0.05);
}

.ai-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-help {
  padding: 12px;
  background: var(--color-bg);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.ai-help h4 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}

.ai-help ol {
  font-size: 12px;
  padding-left: 20px;
  color: var(--color-text-secondary);
  line-height: 1.8;
}

.ai-help a {
  color: var(--color-primary);
  text-decoration: none;
}

.ai-help code {
  background: var(--color-bg-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
}
</style>
