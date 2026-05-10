<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
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
            IF
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
                开始使用 InkForge
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
    radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.16), transparent 34%),
    radial-gradient(circle at 80% 10%, rgba(15, 23, 42, 0.22), transparent 28%),
    rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(14px);
}

.if-welcome__dialog {
  position: relative;
  width: min(560px, 100%);
  padding: 32px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(246, 248, 251, 0.96)),
    #ffffff;
  box-shadow: 0 24px 90px rgba(15, 23, 42, 0.28);
  color: #0f172a;
}

.if-welcome__mark {
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: 20px;
  border-radius: 18px;
  background: #111827;
  color: #f8fafc;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.if-welcome__eyebrow {
  margin: 0 0 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.if-welcome h2 {
  margin: 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(28px, 6vw, 44px);
  line-height: 1.05;
}

.if-welcome__lead {
  margin: 18px 0 0;
  color: #475569;
  font-size: 16px;
  line-height: 1.8;
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
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
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
  padding: 12px 18px;
  border-radius: 999px;
  background: #0f172a;
  color: #ffffff;
  font-weight: 700;
}

.if-welcome__ghost {
  padding: 10px 12px;
  border-radius: 999px;
  background: transparent;
  color: #475569;
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
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 20px;
  background: #f8fafc;
  color: #0f172a;
  text-align: left;
}

.if-welcome__path-card span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.if-welcome__path-card small {
  color: #64748b;
  line-height: 1.5;
}

.if-welcome__error {
  margin: 18px 0 0;
  color: #b91c1c;
  font-size: 13px;
}

.if-welcome__primary:focus-visible,
.if-welcome__ghost:focus-visible,
.if-welcome__path-card:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.35);
  outline-offset: 3px;
}

.if-welcome-fade-enter-active,
.if-welcome-fade-leave-active {
  transition: opacity 180ms ease;
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