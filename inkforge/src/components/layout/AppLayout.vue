<script setup lang="ts">
import { ref } from 'vue'
import { Eye, FileText, Folder, PenLine } from 'lucide-vue-next'
import ResizablePanel from './ResizablePanel.vue'
import CategoryPanel from '../category/CategoryPanel.vue'
import ArticlePanel from '../article/ArticlePanel.vue'
import PreviewPanel from '../preview/PreviewPanel.vue'
import EditorPanel from '../editor/EditorPanel.vue'

// 面板宽度
const categoryWidth = ref(200)
const articleWidth = ref(300)
const editorWidth = ref(400)
</script>

<template>
  <div class="app-layout">
    <!-- 左1: 分类面板 -->
    <ResizablePanel 
      v-model:width="categoryWidth" 
      :min-width="160" 
      :max-width="400"
      side="right"
    >
      <div class="panel-header">
        <span><Folder :size="14" /> 分类</span>
      </div>
      <div class="panel-content">
        <CategoryPanel />
      </div>
    </ResizablePanel>

    <!-- 左2: 资讯列表 -->
    <ResizablePanel 
      v-model:width="articleWidth" 
      :min-width="250" 
      :max-width="500"
      side="right"
    >
      <div class="panel-header">
        <span><FileText :size="14" /> 资讯列表</span>
      </div>
      <div class="panel-content">
        <ArticlePanel />
      </div>
    </ResizablePanel>

    <!-- 中: 预览面板 -->
    <main
      class="panel flex-1"
      style="min-width: 300px;"
    >
      <div class="panel-header">
        <span><Eye :size="14" /> 内容预览</span>
      </div>
      <div class="panel-content">
        <PreviewPanel />
      </div>
    </main>

    <!-- 右: 编辑器面板 -->
    <ResizablePanel 
      v-model:width="editorWidth" 
      :min-width="350" 
      :max-width="800"
      side="left"
    >
      <div class="panel-header">
        <span><PenLine :size="14" /> 编辑器</span>
      </div>
      <div class="panel-content">
        <EditorPanel />
      </div>
    </ResizablePanel>
  </div>
</template>

<style scoped>
.panel {
  transition: width 0.2s ease;
}
</style>
