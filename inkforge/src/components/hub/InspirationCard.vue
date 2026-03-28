<script setup lang="ts">
import { RefreshCw, Settings2, Sparkles } from 'lucide-vue-next'

const props = defineProps<{
  quote: string
  author: string
  loading: boolean
  aiAvailable: boolean
  sourceLabel: string
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'configure'): void
}>()
</script>

<template>
  <section class="inspiration-card">
    <div class="inspiration-card__content">
      <div class="inspiration-card__top">
        <div class="inspiration-card__title">
          <Sparkles :size="18" />
          <span>每日灵感</span>
        </div>
        <button
          v-if="props.aiAvailable"
          type="button"
          class="inspiration-card__action"
          :class="{ 'is-spinning': props.loading }"
          :disabled="props.loading"
          title="生成新灵感"
          @click="emit('refresh')"
        >
          <RefreshCw :size="14" />
        </button>
        <button
          v-else
          type="button"
          class="inspiration-card__action"
          title="配置 AI"
          @click="emit('configure')"
        >
          <Settings2 :size="14" />
        </button>
      </div>

      <div class="inspiration-card__body">
        <p
          v-if="props.loading"
          class="inspiration-card__loading"
        >
          AI 正在为你生成新的灵感片段...
        </p>
        <template v-else>
          <p class="inspiration-card__quote">
            “{{ props.quote }}”
          </p>
          <p class="inspiration-card__author">
            {{ props.author }}
          </p>
        </template>
      </div>

      <div class="inspiration-card__source">
        {{ props.sourceLabel }}
      </div>
    </div>
  </section>
</template>

<style scoped>
.inspiration-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 24px;
  border-radius: 20px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-left: 3px solid #D32F2F;
}

.inspiration-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.inspiration-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #94a3b8;
}

.inspiration-card__action {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s;
}
.inspiration-card__action:hover {
  background: rgba(211, 47, 47, 0.08);
  color: #D32F2F;
}
.inspiration-card__action.is-spinning {
  animation: spin 1s linear infinite;
}

.inspiration-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.inspiration-card__quote {
  font-family: 'Noto Serif SC', Georgia, serif;
  font-size: 20px;
  line-height: 1.6;
  color: #1e293b;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.inspiration-card__author {
  margin-top: 12px;
  font-size: 14px;
  color: #64748b;
}

.inspiration-card__loading {
  font-size: 14px;
  color: #94a3b8;
}

.inspiration-card__source {
  margin-top: auto;
  padding-top: 12px;
  font-size: 11px;
  color: #cbd5e1;
}

.inspiration-card__content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
