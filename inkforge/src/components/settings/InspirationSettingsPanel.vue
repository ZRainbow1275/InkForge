<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  Check,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-vue-next'

import {
  getDailyQuote,
  loadHubInspirationState,
  saveHubInspirationState,
  type HubInspirationSource,
  type HubInspirationState,
} from '@/data/quotes'

const persistedState = loadHubInspirationState()
const source = ref<HubInspirationSource>(persistedState.source)
const localText = ref(persistedState.local.text)
const localAuthor = ref(persistedState.local.author)
const aiInspiration = ref(persistedState.ai)
const saveState = ref<'idle' | 'saved' | 'error'>('idle')
let saveStateTimer: ReturnType<typeof setTimeout> | null = null

const sourceDescription = computed(() => source.value === 'local'
  ? '首页展示这里保存的固定灵感；首页本身保持只读。'
  : '首页展示最近一次真实 AI 生成结果；尚未生成时显示明确空态。')

const saveStateLabel = computed(() => {
  if (saveState.value === 'saved') return '已保存到本机'
  if (saveState.value === 'error') return '保存失败'
  return '等待保存'
})

function normalizeDraft(): HubInspirationState {
  const fallback = getDailyQuote()
  return {
    source: source.value,
    local: {
      text: localText.value.trim().slice(0, 160) || fallback.text,
      author: localAuthor.value.trim().slice(0, 48) || fallback.author,
    },
    ai: aiInspiration.value,
  }
}

function setSource(nextSource: HubInspirationSource): void {
  source.value = nextSource
  saveState.value = 'idle'
}

function restoreDailyQuote(): void {
  const quote = getDailyQuote()
  localText.value = quote.text
  localAuthor.value = quote.author
  source.value = 'local'
  saveState.value = 'idle'
}

function saveInspiration(): void {
  const nextState = normalizeDraft()
  localText.value = nextState.local.text
  localAuthor.value = nextState.local.author
  saveState.value = saveHubInspirationState(nextState) ? 'saved' : 'error'

  if (saveStateTimer) clearTimeout(saveStateTimer)
  saveStateTimer = setTimeout(() => {
    saveState.value = 'idle'
  }, 2400)
}

onBeforeUnmount(() => {
  if (saveStateTimer) clearTimeout(saveStateTimer)
})
</script>

<template>
  <section
    class="inspiration-settings"
    aria-labelledby="inspiration-settings-title"
  >
    <header class="inspiration-settings__header">
      <div class="inspiration-settings__heading">
        <span class="inspiration-settings__mark">
          <Sparkles
            :size="18"
            :stroke-width="2.1"
            aria-hidden="true"
          />
        </span>
        <div>
          <h3 id="inspiration-settings-title">
            每日灵感
          </h3>
          <p>编辑本地灵感、默认署名与首页来源策略；首页只负责展示、切换和刷新。</p>
        </div>
      </div>
      <span
        class="inspiration-settings__status"
        :class="`is-${saveState}`"
        role="status"
        aria-live="polite"
      >
        <Check
          v-if="saveState === 'saved'"
          :size="13"
          aria-hidden="true"
        />
        {{ saveStateLabel }}
      </span>
    </header>

    <div
      class="inspiration-source-options"
      role="radiogroup"
      aria-label="首页每日灵感来源策略"
    >
      <button
        type="button"
        role="radio"
        :aria-checked="source === 'local'"
        :class="{ selected: source === 'local' }"
        @click="setSource('local')"
      >
        <strong>本地固定</strong>
        <span>使用下方保存的文字与署名</span>
      </button>
      <button
        type="button"
        role="radio"
        :aria-checked="source === 'ai'"
        :class="{ selected: source === 'ai' }"
        @click="setSource('ai')"
      >
        <strong>AI 最近结果</strong>
        <span>使用首页真实生成并保存的结果</span>
      </button>
    </div>

    <p class="inspiration-settings__source-note">
      {{ sourceDescription }}
    </p>

    <div class="inspiration-settings__form">
      <label class="inspiration-settings__quote">
        <span>本地灵感正文</span>
        <textarea
          v-model="localText"
          maxlength="160"
          rows="4"
          aria-describedby="inspiration-text-help"
          @input="saveState = 'idle'"
        />
        <small id="inspiration-text-help">{{ localText.length }} / 160；留空保存时恢复为今日内置名言。</small>
      </label>

      <label>
        <span>默认署名</span>
        <input
          v-model="localAuthor"
          type="text"
          maxlength="48"
          @input="saveState = 'idle'"
        >
        <small>{{ localAuthor.length }} / 48</small>
      </label>
    </div>

    <div
      v-if="aiInspiration"
      class="inspiration-settings__ai-record"
    >
      <span>最近 AI 结果</span>
      <blockquote>
        {{ aiInspiration.text }}
        <cite>— {{ aiInspiration.author }}</cite>
      </blockquote>
    </div>

    <footer class="inspiration-settings__actions">
      <button
        type="button"
        class="inspiration-settings__secondary"
        @click="restoreDailyQuote"
      >
        <RotateCcw
          :size="15"
          aria-hidden="true"
        />
        恢复今日名言
      </button>
      <button
        type="button"
        class="inspiration-settings__primary"
        @click="saveInspiration"
      >
        <Save
          :size="15"
          aria-hidden="true"
        />
        保存每日灵感
      </button>
    </footer>
  </section>
</template>

<style scoped>
.inspiration-settings {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--hairline, #E3E7EA);
  border-left: 3px solid var(--ember, #D32F2F);
  border-radius: 18px 22px 18px 22px;
  background:
    radial-gradient(circle at 100% 0%, var(--ember-soft, rgba(211, 47, 47, 0.08)), transparent 36%),
    var(--bg-surface, #FFFFFF);
  box-shadow: var(--elev-1, 0 8px 24px rgba(38, 50, 56, 0.06));
}

.inspiration-settings__header,
.inspiration-settings__heading,
.inspiration-settings__actions {
  display: flex;
  align-items: center;
}

.inspiration-settings__header {
  justify-content: space-between;
  gap: 16px;
}

.inspiration-settings__heading {
  min-width: 0;
  align-items: flex-start;
  gap: 12px;
}

.inspiration-settings__mark {
  display: grid;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--ember-border, rgba(211, 47, 47, 0.24));
  border-radius: 12px;
  background: var(--ember-soft, rgba(211, 47, 47, 0.08));
  color: var(--ember, #D32F2F);
}

.inspiration-settings h3 {
  margin: 0;
  color: var(--text-primary, #263238);
  font-family: var(--font-serif, serif);
  font-size: 17px;
}

.inspiration-settings__heading p {
  margin: 5px 0 0;
  color: var(--text-secondary, #607D8B);
  font-size: 12px;
  line-height: 1.6;
}

.inspiration-settings__status {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--bg-rice-paper, #F5F7F8);
  color: var(--text-muted, #90A4AE);
  font-size: 11px;
  font-weight: 700;
}

.inspiration-settings__status.is-saved {
  background: rgba(46, 125, 50, 0.10);
  color: #2E7D32;
}

.inspiration-settings__status.is-error {
  background: rgba(211, 47, 47, 0.10);
  color: #B71C1C;
}

.inspiration-source-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.inspiration-source-options button {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 13px 14px;
  border: 1px solid var(--hairline, #E3E7EA);
  border-radius: 12px;
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-primary, #263238);
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--motion-fast, 160ms) ease,
    background var(--motion-fast, 160ms) ease,
    box-shadow var(--motion-fast, 160ms) ease;
}

.inspiration-source-options button:hover,
.inspiration-source-options button:focus-visible {
  outline: none;
  border-color: var(--ember-border, rgba(211, 47, 47, 0.32));
}

.inspiration-source-options button.selected {
  border-color: var(--ember, #D32F2F);
  background: var(--ember-soft, rgba(211, 47, 47, 0.08));
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.08);
}

.inspiration-source-options strong {
  font-size: 13px;
}

.inspiration-source-options span,
.inspiration-settings small {
  color: var(--text-muted, #90A4AE);
  font-size: 11px;
  line-height: 1.5;
}

.inspiration-settings__source-note {
  margin: -6px 0 0;
  color: var(--text-secondary, #607D8B);
  font-size: 11px;
}

.inspiration-settings__form {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(180px, 0.5fr);
  gap: 12px;
}

.inspiration-settings__form label {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 6px;
  color: var(--text-primary, #263238);
  font-size: 12px;
  font-weight: 700;
}

.inspiration-settings__form textarea,
.inspiration-settings__form input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--hairline, #DDE3E7);
  border-radius: 10px;
  outline: none;
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-primary, #263238);
  font: inherit;
  font-weight: 500;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.inspiration-settings__form textarea {
  min-height: 112px;
  padding: 12px;
  resize: vertical;
  line-height: 1.7;
}

.inspiration-settings__form input {
  height: 40px;
  padding: 0 12px;
}

.inspiration-settings__form textarea:focus,
.inspiration-settings__form input:focus {
  border-color: var(--ember, #D32F2F);
  box-shadow: 0 0 0 3px rgba(211, 47, 47, 0.10);
}

.inspiration-settings__ai-record {
  display: grid;
  gap: 7px;
  padding: 12px 14px;
  border: 1px dashed var(--hairline, #DDE3E7);
  border-radius: 12px;
  color: var(--text-secondary, #607D8B);
  font-size: 11px;
}

.inspiration-settings__ai-record blockquote {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 16px;
  margin: 0;
  color: var(--text-primary, #263238);
  font-family: var(--font-serif, serif);
  font-size: 13px;
  line-height: 1.65;
}

.inspiration-settings__ai-record cite {
  color: var(--text-muted, #90A4AE);
  font-family: var(--font-sans, sans-serif);
  font-size: 11px;
  font-style: normal;
}

.inspiration-settings__actions {
  justify-content: flex-end;
  gap: 10px;
}

.inspiration-settings__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
}

.inspiration-settings__actions button:hover {
  transform: translateY(-1px);
}

.inspiration-settings__secondary {
  border: 1px solid var(--hairline, #DDE3E7);
  background: var(--bg-surface, #FFFFFF);
  color: var(--text-secondary, #607D8B);
}

.inspiration-settings__primary {
  border: 1px solid var(--ember, #D32F2F);
  background: var(--ember, #D32F2F);
  color: #FFFFFF;
}

@media (max-width: 820px) {
  .inspiration-settings__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .inspiration-settings__form {
    grid-template-columns: 1fr;
  }

  .inspiration-settings__actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }
}

@media (prefers-reduced-motion: reduce) {
  .inspiration-settings *,
  .inspiration-settings *::before,
  .inspiration-settings *::after {
    transition-duration: 0.01ms !important;
  }
}
</style>
