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
      <button @click="goHome">返回首页</button>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #f5f5f5;
}
.content {
  text-align: center;
}
.content h1 {
  font-size: 120px;
  color: #ccc;
  margin: 0;
}
.content p {
  font-size: 24px;
  color: #666;
  margin: 16px 0 32px;
}
.content button {
  padding: 12px 32px;
  font-size: 16px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.content button:hover {
  background: #0052a3;
}
</style>
