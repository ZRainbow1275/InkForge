<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { X, FolderPlus } from 'lucide-vue-next'
import { CATEGORY_ICON_OPTIONS } from '@/utils/iconography'

const props = defineProps<{
  visible: boolean
  pending?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', data: { name: string; icon: string }): void
}>()

const categoryName = ref('')
const selectedIcon = ref('folder')
const categoryNameInputRef = ref<HTMLInputElement | null>(null)

const iconOptions = CATEGORY_ICON_OPTIONS

function handleConfirm() {
  if (props.pending || !categoryName.value.trim()) return
  emit('confirm', {
    name: categoryName.value.trim(),
    icon: selectedIcon.value
  })
}

function handleClose() {
  if (props.pending) return
  emit('close')
}

function resetForm() {
  categoryName.value = ''
  selectedIcon.value = 'folder'
}

// ESC 关闭
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleClose()
  }
}

watch(() => props.visible, async (visible) => {
  if (visible) {
    document.addEventListener('keydown', handleKeydown)
    await nextTick()
    categoryNameInputRef.value?.focus()
  } else {
    document.removeEventListener('keydown', handleKeydown)
    resetForm()
  }
}, { immediate: true })

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
      <form
        class="modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-category-title"
        :aria-busy="pending ? 'true' : 'false'"
        data-category-create-dialog
        @submit.prevent="handleConfirm"
      >
        <div class="modal-header">
          <h3 id="add-category-title">
            <FolderPlus :size="18" />
            添加分类
          </h3>
          <button
            type="button"
            class="close-btn"
            aria-label="关闭添加分类"
            data-category-create-close
            :disabled="pending"
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
                v-for="option in iconOptions"
                :key="option.key"
                type="button"
                class="icon-btn"
                :class="{ active: selectedIcon === option.key }"
                :title="option.label"
                :aria-pressed="selectedIcon === option.key"
                :disabled="pending"
                @click="selectedIcon = option.key"
              >
                <component
                  :is="option.component"
                  :size="18"
                  :stroke-width="2"
                />
              </button>
            </div>
          </div>
          
          <!-- 名称输入 -->
          <div class="form-group">
            <label for="add-category-name">分类名称</label>
            <input 
              id="add-category-name"
              ref="categoryNameInputRef"
              v-model="categoryName"
              type="text" 
              class="form-input"
              placeholder="输入分类名称..."
              maxlength="50"
              autocomplete="off"
              data-category-name-input
              :aria-invalid="error ? 'true' : 'false'"
              :aria-describedby="error ? 'add-category-error' : undefined"
              :disabled="pending"
            >
            <p
              v-if="error"
              id="add-category-error"
              class="form-error"
              role="alert"
              data-category-create-error
            >
              {{ error }}
            </p>
          </div>
        </div>
        
        <div class="modal-footer">
          <button
            type="button"
            class="btn cancel"
            :disabled="pending"
            @click="handleClose"
          >
            取消
          </button>
          <button 
            type="submit"
            class="btn confirm" 
            data-category-create-confirm
            :disabled="pending || !categoryName.trim()"
          >
            {{ pending ? '添加中...' : '确认添加' }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--scrim);
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
  box-shadow: var(--elev-3);
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
  transition: background var(--motion-fast) var(--ease-out-quart),
    color var(--motion-fast) var(--ease-out-quart);
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
  transition: border-color var(--motion-fast) var(--ease-out-quart),
    background var(--motion-fast) var(--ease-out-quart);
}

.icon-btn svg {
  width: 18px;
  height: 18px;
}

.icon-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-bg-secondary);
}

.icon-btn.active {
  border-color: var(--ember-border);
  background: var(--ember-soft);
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
  transition: border-color var(--motion-fast) var(--ease-out-quart);
}

.form-input:focus {
  border-color: var(--color-primary);
}

.form-error {
  margin: 8px 0 0;
  color: var(--danger, #C62828);
  font-size: 12px;
  line-height: 1.5;
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
  transition: background var(--motion-fast) var(--ease-out-quart),
    box-shadow var(--motion-fast) var(--ease-out-quart),
    transform var(--motion-fast) var(--ease-out-quart),
    opacity var(--motion-fast) var(--ease-out-quart);
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
  background: var(--ember);
  border: none;
  color: white;
  box-shadow: var(--elev-1);
}

.btn.confirm:hover:not(:disabled) {
  box-shadow: var(--glow-ember);
  transform: translateY(-1px);
}

.btn.confirm:focus-visible {
  box-shadow: var(--focus-ring);
  outline: none;
}

.btn.confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-btn:disabled,
.icon-btn:disabled,
.btn.cancel:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
