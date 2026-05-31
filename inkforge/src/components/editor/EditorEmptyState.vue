<script setup lang="ts">
import ForgeNibMark from '@/components/chrome/ForgeNibMark.vue'
</script>

<template>
  <div class="empty-state">
    <div class="empty-compose">
      <div class="empty-card">
        <ForgeNibMark
          :size="88"
          :tier="256"
          :reactive="false"
          class="empty-mark"
        />
        <h2 class="empty-title">
          准备落墨
        </h2>
        <div
          class="forge-line"
          aria-hidden="true"
        />
        <p class="empty-instruction">
          从左侧选择或新建一篇文章，开始你的创作。
        </p>
        <div class="empty-status">
          <span
            class="live-dot"
            aria-hidden="true"
          />
          <span>等待选择文稿</span>
        </div>
      </div>
      <div
        class="empty-colophon"
        aria-hidden="true"
      >
        ◇ ◇ ◇
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 静谧刊印 · 空状态中心件 — 让真实的 InkForge 标记在最空的屏幕上「自我锻造」。
   全部走 token，因而天然获得暗色契约（旧版 #f5f5f5/#2c3e50/#c0392b 在暗色下
   会刺眼发白）。垂直居中填满画布，下半部的空旷由 ◇◇◇ 落款收口。 */
.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-rice-paper);
  padding: 24px;
}

.empty-compose {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: min(420px, calc(100% - 32px));
  padding: clamp(28px, 7vw, 48px) clamp(24px, 8vw, 56px);
  background: var(--bg-surface);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-xlarge);
  box-shadow: var(--elev-2);
}

.empty-mark {
  margin-bottom: 18px;
}

.empty-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: var(--type-step-2);
  font-weight: var(--type-weight-emphasis);
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

/* Forge Line（品牌 §4.2）— 落墨一笔，挂载时画一次。token 驱动时长，
   prefers-reduced-motion 下 --motion-slow→0ms 自动落到终态。 */
.forge-line {
  width: 72px;
  height: 3px;
  margin: 12px auto 20px;
  background: var(--ember);
  border-radius: 1.5px;
  transform-origin: left center;
  animation: forge-line var(--motion-slow) var(--ease-out-quart) both;
}

@keyframes forge-line {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.empty-instruction {
  margin: 0 0 22px;
  font-size: var(--type-step-1);
  line-height: 1.6;
  color: var(--text-secondary);
}

.empty-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  border-radius: var(--radius-round);
  background: var(--ember-soft);
  color: var(--ember);
  font-size: 12px;
  font-weight: var(--type-weight-emphasis);
  letter-spacing: 0.04em;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ember);
}

.empty-colophon {
  color: var(--ember);
  font-size: 16px;
  letter-spacing: 0.5em;
  opacity: 0.55;
  user-select: none;
}

@media (max-width: 560px) {
  .empty-state {
    align-items: flex-start;
    padding: 36px 16px;
  }
}
</style>
