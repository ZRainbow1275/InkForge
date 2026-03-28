<script setup lang="ts">
import { ref } from 'vue'
import { useCategoryStore } from '@/stores/category'
import { storeToRefs } from 'pinia'
import { Library, Plus, Trash2 } from 'lucide-vue-next'
import AddCategoryModal from './AddCategoryModal.vue'
import { resolveIconComponent } from '@/utils/lucide-icons'

const categoryStore = useCategoryStore()
const { categories, selectedCategoryId } = storeToRefs(categoryStore)

// 模态框状态
const showAddModal = ref(false)
const showDeleteConfirm = ref(false)
const pendingDeleteId = ref<string | null>(null)

function selectCategory(id: string | null) {
  categoryStore.selectCategory(id)
}

function handleAddCategory(data: { name: string; icon: string }) {
  categoryStore.addCategory(data.name, data.icon)
  showAddModal.value = false
}

function deleteCategory(id: string, event: Event) {
  event.stopPropagation()
  pendingDeleteId.value = id
  showDeleteConfirm.value = true
}

function confirmDelete() {
  if (pendingDeleteId.value) {
    categoryStore.deleteCategory(pendingDeleteId.value)
  }
  showDeleteConfirm.value = false
  pendingDeleteId.value = null
}

function cancelDelete() {
  showDeleteConfirm.value = false
  pendingDeleteId.value = null
}
</script>

<template>
  <div class="category-panel">
    <!-- 全部分类 -->
    <div 
      class="category-item"
      :class="{ active: selectedCategoryId === null }"
      @click="selectCategory(null)"
    >
      <span class="icon">
        <Library :size="16" />
      </span>
      <span class="name">全部</span>
      <span class="count">{{ categoryStore.totalArticleCount }}</span>
    </div>

    <!-- 分类列表 -->
    <div 
      v-for="category in categories" 
      :key="category.id"
      class="category-item"
      :class="{ active: selectedCategoryId === category.id }"
      @click="selectCategory(category.id)"
    >
      <span class="icon">
        <component
          :is="resolveIconComponent(category.icon, 'Folder')"
          :size="16"
        />
      </span>
      <span class="name">{{ category.name }}</span>
      <span class="count">{{ category.articleCount }}</span>
      <button
        class="delete-btn"
        title="删除分类"
        @click="deleteCategory(category.id, $event)"
      >
        <Trash2 :size="14" />
      </button>
    </div>

    <!-- 添加分类按钮 -->
    <button
      class="add-btn"
      @click="showAddModal = true"
    >
      <Plus :size="16" />
      <span>添加分类</span>
    </button>

    <!-- 添加分类模态框 -->
    <AddCategoryModal
      :visible="showAddModal"
      @close="showAddModal = false"
      @confirm="handleAddCategory"
    />

    <!-- 删除确认模态框 -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="confirm-overlay"
        @click.self="cancelDelete"
      >
        <div class="confirm-modal">
          <h3>确认删除</h3>
          <p>确定要删除这个分类吗？分类下的资讯将移至"全部"。</p>
          <div class="confirm-actions">
            <button
              class="cancel-btn"
              @click="cancelDelete"
            >
              取消
            </button>
            <button
              class="delete-confirm-btn"
              @click="confirmDelete"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.category-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.category-item:hover {
  background: var(--color-bg-secondary);
}

.category-item.active {
  background: var(--color-primary);
  color: white;
}

.category-item .icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: currentColor;
}

.category-item .name {
  flex: 1;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-item .count {
  font-size: 12px;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.category-item.active .count {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  margin-top: 8px;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.add-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-bg-secondary);
}

.delete-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.category-item:hover .delete-btn {
  display: flex;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* 删除确认模态框 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-modal {
  background: var(--color-bg);
  border-radius: 12px;
  padding: 24px;
  width: 320px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.confirm-modal h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
}

.confirm-modal p {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.cancel-btn {
  padding: 8px 16px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: var(--color-bg-secondary);
}

.delete-confirm-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #ef4444;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.delete-confirm-btn:hover {
  background: #dc2626;
}
</style>
