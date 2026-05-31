<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowUpRight } from 'lucide-vue-next'
import ForgeNibMark from '@/components/chrome/ForgeNibMark.vue'
import { useFTUEStore } from '@/stores/ftue'
import type { OnboardingPath } from '@/services/ftue/types'

const router = useRouter()
const ftueStore = useFTUEStore()
const step = ref<'welcome' | 'path'>('welcome')
const primaryButton = ref<HTMLButtonElement | null>(null)

const visible = computed(() => ftueStore.welcomeVisible)

watch(visible, async (isVisible) => {
  if (!isVisible) {
    step.value = 'welcome'
    return
  }

  await nextTick()
  primaryButton.value?.focus()
})

async function skip(): Promise<void> {
  await ftueStore.skipWelcome()
}

function showPathStep(): void {
  step.value = 'path'
}

async function complete(path: OnboardingPath): Promise<void> {
  await ftueStore.completeWelcome(path)

  if (path === 'create') {
    await router.push('/account')
    return
  }

  await router.push({ path: '/settings', query: { tab: 'data' } })
}

function handleEscape(): void {
  void skip()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="if-welcome-fade">
      <div
        v-if="visible"
        class="if-welcome"
        @keydown.esc="handleEscape"
      >
        <div
          class="if-welcome__backdrop"
          aria-hidden="true"
        />
        <section
          class="if-welcome__dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="if-welcome-title"
          aria-describedby="if-welcome-description"
        >
          <div
            class="if-welcome__mark"
            aria-hidden="true"
          >
            <ForgeNibMark
              :size="56"
              :tier="256"
              interactive
            />
          </div>

          <template v-if="step === 'welcome'">
            <p class="if-welcome__eyebrow">
              InkForge
            </p>
            <h2 id="if-welcome-title">
              Markdown-first 深度写作工具
            </h2>
            <p
              id="if-welcome-description"
              class="if-welcome__lead"
            >
              轻量欢迎，不创建示例文档，不强迫引导。所有功能从第一天起可见。
            </p>

            <div
              class="if-welcome__points"
              aria-label="首次使用原则"
            >
              <span>真实本地数据</span>
              <span>完整功能可见</span>
              <span>帮助随时调出</span>
            </div>

            <div class="if-welcome__actions">
              <button
                ref="primaryButton"
                type="button"
                class="if-welcome__primary"
                @click="showPathStep"
              >
                <span>开始使用 InkForge</span>
                <ArrowUpRight
                  :size="16"
                  class="if-welcome__nib"
                />
              </button>
              <button
                type="button"
                class="if-welcome__ghost"
                @click="skip"
              >
                跳过，直接进入
              </button>
            </div>
          </template>

          <template v-else>
            <p class="if-welcome__eyebrow">
              选择下一步
            </p>
            <h2 id="if-welcome-title">
              保持主动权在你手里
            </h2>
            <p
              id="if-welcome-description"
              class="if-welcome__lead"
            >
              这里不会生成任何演示内容。你可以进入真实账户入口，也可以导入现有本地数据。
            </p>

            <div class="if-welcome__path-grid">
              <button
                ref="primaryButton"
                type="button"
                class="if-welcome__path-card"
                @click="complete('create')"
              >
                <span>创建新账户</span>
                <strong>进入账户中心</strong>
                <small>用于真实头像、作者信息和本地 profile。</small>
              </button>
              <button
                type="button"
                class="if-welcome__path-card"
                @click="complete('import')"
              >
                <span>导入本地数据</span>
                <strong>进入数据设置</strong>
                <small>从现有资料开始，不写入示例文档。</small>
              </button>
            </div>

            <div class="if-welcome__actions if-welcome__actions--split">
              <button
                type="button"
                class="if-welcome__ghost"
                @click="step = 'welcome'"
              >
                返回
              </button>
              <button
                type="button"
                class="if-welcome__ghost"
                @click="skip"
              >
                暂时跳过
              </button>
            </div>
          </template>

          <p
            v-if="ftueStore.lastError"
            class="if-welcome__error"
            role="alert"
          >
            {{ ftueStore.lastError }}
          </p>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.if-welcome {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 24px;
}

.if-welcome__backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 20%, var(--ember-soft), transparent 34%),
    radial-gradient(circle at 80% 10%, var(--scrim), transparent 28%),
    var(--scrim);
  backdrop-filter: blur(14px);
}

.if-welcome__dialog {
  position: relative;
  width: min(560px, 100%);
  padding: 32px;
  border: 1px solid var(--hairline);
  border-radius: 28px;
  background: var(--bg-surface);
  box-shadow: var(--elev-3);
  color: var(--text-primary);
}

.if-welcome__mark {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: 20px;
  border-radius: 12px;
}

.if-welcome__eyebrow {
  margin: 0 0 8px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.if-welcome h2 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--type-step-3);
  font-weight: var(--type-weight-emphasis);
  line-height: 1.1;
  letter-spacing: 0.02em;
}

.if-welcome__lead {
  margin: 18px 0 0;
  color: var(--text-secondary);
  font-size: var(--type-step-1);
  line-height: 1.6;
}

.if-welcome__points,
.if-welcome__actions,
.if-welcome__path-grid {
  margin-top: 24px;
}

.if-welcome__points {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.if-welcome__points span {
  padding: 8px 12px;
  border: 1px solid var(--hairline);
  border-radius: 999px;
  background: var(--bg-rice-paper);
  color: var(--text-secondary);
  font-size: 13px;
}

.if-welcome__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.if-welcome__actions--split {
  justify-content: space-between;
}

.if-welcome__primary,
.if-welcome__ghost,
.if-welcome__path-card {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.if-welcome__primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 999px;
  background: var(--text-primary);
  color: var(--bg-surface);
  font-weight: 700;
}

.if-welcome__nib {
  transition: transform var(--motion-fast) var(--ease-out-quart);
}

.if-welcome__primary:hover .if-welcome__nib {
  transform: translate(2px, -2px);
}

.if-welcome__ghost {
  padding: 10px 12px;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
}

.if-welcome__path-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.if-welcome__path-card {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid var(--hairline);
  border-radius: 20px;
  background: var(--bg-rice-paper);
  color: var(--text-primary);
  text-align: left;
  transition: box-shadow var(--motion-fast) var(--ease-out-quart),
              transform var(--motion-fast) var(--ease-out-quart);
}

.if-welcome__path-card:hover {
  box-shadow: var(--elev-2);
  transform: translateY(-1px);
}

.if-welcome__path-card span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.if-welcome__path-card small {
  color: var(--text-muted);
  line-height: 1.5;
}

.if-welcome__error {
  margin: 18px 0 0;
  color: var(--error);
  font-size: 13px;
}

.if-welcome__primary:focus-visible,
.if-welcome__ghost:focus-visible,
.if-welcome__path-card:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.if-welcome-fade-enter-active,
.if-welcome-fade-leave-active {
  transition: opacity var(--motion-slow) var(--ease-out-quart);
}

.if-welcome-fade-enter-from,
.if-welcome-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .if-welcome__dialog {
    padding: 24px;
  }

  .if-welcome__path-grid {
    grid-template-columns: 1fr;
  }
}
</style>