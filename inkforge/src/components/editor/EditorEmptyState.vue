<script setup lang="ts">
import { PenTool } from 'lucide-vue-next'
</script>

<template>
  <div class="empty-state">
    <div class="soviet-card">
      <div class="icon-wrapper">
        <PenTool
          :size="48"
          class="icon"
        />
      </div>
      
      <h2 class="title">
        准备写作
      </h2>
      <h3 class="subtitle">
        写作就绪
      </h3>
      
      <div class="divider" />
      
      <p class="instruction">
        从左侧选择或新建一篇文章<br>
        开始您的创作任务
      </p>

      <div class="status-badge">
        <span>等待选择文稿</span>
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
  width: min(400px, calc(100% - 32px));
  box-sizing: border-box;
  border: 2px solid #2c3e50;
  padding: clamp(28px, 7vw, 40px) clamp(24px, 8vw, 60px);
  background: #fff;
  box-shadow: 8px 8px 0px rgba(44, 62, 80, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
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
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

@media (max-width: 560px) {
  .empty-state {
    align-items: flex-start;
    min-height: 520px;
    height: auto;
    padding: 36px 0;
  }

  .soviet-card {
    margin: 0 auto;
    box-shadow: 5px 5px 0 rgba(44, 62, 80, 0.16);
  }

  .title {
    font-size: 26px;
    letter-spacing: 0.08em;
  }

  .subtitle {
    letter-spacing: 0.22em;
  }
}
</style>
