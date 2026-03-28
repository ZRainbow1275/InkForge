<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { X, FolderPlus } from 'lucide-vue-next'
import { CATEGORY_ICON_OPTIONS, resolveIconComponent } from '@/utils/lucide-icons'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', data: { name: string; icon: string }): void
}>()

const categoryName = ref('')
const selectedIcon = ref('Folder')

function handleConfirm() {
  if (!categoryName.value.trim()) return
  emit('confirm', {
    name: categoryName.value.trim(),
    icon: selectedIcon.value
  })
  resetForm()
}

function handleClose() {
  emit('close')
  resetForm()
}

function resetForm() {
  categoryName.value = ''
  selectedIcon.value = 'Folder'
}

// ESC 关闭
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  } else if (e.key === 'Enter' && categoryName.value.trim()) {
    handleConfirm()
  }
}

watch(() => props.visible, (visible) => {
  if (visible) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="modal-overlay"
      @click.self="handleClose"
    >
      <div class="modal-container">
        <div class="modal-header">
          <h3>
            <FolderPlus :size="18" />
            添加分类
          </h3>
          <button
            class="close-btn"
            @click="handleClose"
          >
            <X :size="18" />
          </button>
        </div>
        
        <div class="modal-body">
          <!-- 图标选择 -->
          <div class="form-group">
            <label>选择图标</label>
            <div class="icon-grid">
              <button
                v-for="option in CATEGORY_ICON_OPTIONS"
                :key="option.value"
                class="icon-btn"
                :class="{ active: selectedIcon === option.value }"
                :title="option.label"
                type="button"
                @click="selectedIcon = option.value"
              >
                <component
                  :is="resolveIconComponent(option.value, 'Folder')"
                  :size="18"
                />
              </button>
            </div>
          </div>
          
          <!-- 名称输入 -->
          <div class="form-group">
            <label>分类名称</label>
            <input 
              v-model="categoryName"
              type="text" 
              class="form-input"
              placeholder="输入分类名称..."
              autofocus
            >
          </div>
        </div>
        
        <div class="modal-footer">
          <button
            class="btn cancel"
            @click="handleClose"
          >
            取消
          </button>
          <button 
            class="btn confirm" 
            :disabled="!categoryName.trim()"
            @click="handleConfirm"
          >
            确认添加
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-container {
  width: 90%;
  max-width: 400px;
  background: var(--color-bg);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--color-text-secondary);
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.15s ease;
}

.icon-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-secondary);
  color: var(--color-primary);
}

.icon-btn.active {
  border-color: var(--color-primary);
  background: rgba(0, 102, 204, 0.1);
  color: var(--color-primary);
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-input:focus {
  border-color: var(--color-primary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn.cancel {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.btn.cancel:hover {
  background: var(--color-bg-secondary);
}

.btn.confirm {
  background: var(--color-primary);
  border: none;
  color: white;
}

.btn.confirm:hover:not(:disabled) {
  opacity: 0.9;
}

.btn.confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
