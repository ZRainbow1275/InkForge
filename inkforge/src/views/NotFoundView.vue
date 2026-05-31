<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
    router.push('/')
}
</script>

<template>
  <div class="not-found">
    <div class="content">
      <h1>404</h1>
      <p>页面不存在</p>
      <button @click="goHome">
        返回首页
      </button>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: var(--bg-rice-paper, #f5f5f5);
}
.content {
  text-align: center;
}
.content h1 {
  font-size: 120px;
  color: var(--text-muted, #ccc);
  margin: 0;
}
.content p {
  font-size: 24px;
  color: var(--text-secondary, #666);
  margin: 16px 0 32px;
}
.content button {
  padding: 12px 32px;
  font-size: 16px;
  background: var(--ember, #C9362C);
  color: #fff;
  border: none;
  border-radius: var(--radius-medium, 8px);
  cursor: pointer;
  box-shadow: var(--elev-1);
  transition: box-shadow var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart);
}
.content button:hover {
  box-shadow: var(--glow-ember);
  transform: translateY(-1px);
}
.content button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
</style>
