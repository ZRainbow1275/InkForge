<script setup lang="ts">
import { PenTool } from 'lucide-vue-next'
</script>

<template>
  <div class="empty-state">
    <div class="soviet-card">
      <div class="icon-wrapper">
        <PenTool :size="48" class="icon" />
      </div>
      
      <h2 class="title">准备写作</h2>
      <h3 class="subtitle">READY FOR WRITING</h3>
      
      <div class="divider"></div>
      
      <p class="instruction">
        请从左侧列表选择一篇资讯<br>
        开始您的创作任务
      </p>

      <div class="status-badge">
        <span>STATUS: IDLE</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  background-image: radial-gradient(#e0e0e0 1px, transparent 1px);
  background-size: 20px 20px;
}

.soviet-card {
  border: 2px solid #2c3e50;
  padding: 40px 60px;
  background: #fff;
  box-shadow: 8px 8px 0px rgba(44, 62, 80, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 400px;
  text-align: center;
}

.icon-wrapper {
  margin-bottom: 20px;
  color: #c0392b; /* Soviet Red */
  border: 2px solid #c0392b;
  padding: 16px;
  border-radius: 50%;
}

.title {
  font-size: 28px;
  font-weight: 800;
  color: #2c3e50;
  margin: 0;
  letter-spacing: 2px;
}

.subtitle {
  font-size: 12px;
  font-weight: 700;
  color: #7f8c8d;
  margin: 8px 0 20px;
  letter-spacing: 4px;
}

.divider {
  width: 100%;
  height: 2px;
  background: #c0392b;
  margin-bottom: 24px;
}

.instruction {
  font-size: 16px;
  color: #34495e;
  line-height: 1.6;
  margin-bottom: 30px;
}

.status-badge {
  background: #2c3e50;
  color: #fff;
  padding: 4px 12px;
  font-size: 12px;
  font-family: monospace;
  font-weight: bold;
}
</style>
