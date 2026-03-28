<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronRight, List } from 'lucide-vue-next'
import type { Editor } from '@tiptap/core'
import { useOutline, type OutlineItem } from '@/composables/useOutline'

// ═══════════════════════════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════════════════════════

const props = defineProps<{
  editor?: Editor
}>()

// ═══════════════════════════════════════════════════════════════════
// 大纲逻辑
// ═══════════════════════════════════════════════════════════════════

// 将 props.editor 包装为 computed ref 供 composable 使用
const editorRef = computed(() => props.editor)
const { outline, activeId, scrollToHeading } = useOutline(editorRef)

// ═══════════════════════════════════════════════════════════════════
// 折叠状态
// ═══════════════════════════════════════════════════════════════════

/** 记录已折叠的节点 ID 集合 */
const collapsedIds = ref(new Set<string>())

function toggleCollapse(id: string): void {
  const next = new Set(collapsedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  collapsedIds.value = next
}

function isCollapsed(id: string): boolean {
  return collapsedIds.value.has(id)
}

// ═══════════════════════════════════════════════════════════════════
// 交互
// ═══════════════════════════════════════════════════════════════════

function handleItemClick(item: OutlineItem): void {
  scrollToHeading(item.position)
}

// ═══════════════════════════════════════════════════════════════════
// 空状态判断
// ═══════════════════════════════════════════════════════════════════

const isEmpty = computed(() => outline.value.length === 0)
</script>

<template>
  <aside class="outline-panel">
    <!-- 面板标题 -->
    <div class="panel-section-title">
      <List
        class="section-icon"
        :size="14"
      />
      <span>大纲</span>
    </div>

    <!-- 空状态 -->
    <div
      v-if="isEmpty"
      class="outline-empty"
    >
      <p class="outline-empty-text">
        还没有标题，使用 <code>##</code> 添加二级标题
      </p>
    </div>

    <!-- 大纲树 -->
    <nav
      v-else
      class="outline-tree"
      aria-label="文档大纲"
    >
      <ul class="outline-list">
        <template
          v-for="item in outline"
          :key="item.id"
        >
          <li class="outline-node">
            <!-- H2 节点 -->
            <div
              class="outline-item level-2"
              :class="{ active: activeId === item.id }"
              @click="handleItemClick(item)"
            >
              <button
                v-if="item.children.length > 0"
                class="collapse-btn"
                :aria-expanded="!isCollapsed(item.id)"
                :aria-label="isCollapsed(item.id) ? '展开' : '折叠'"
                @click.stop="toggleCollapse(item.id)"
              >
                <ChevronRight
                  :size="12"
                  class="collapse-icon"
                  :class="{ expanded: !isCollapsed(item.id) }"
                />
              </button>
              <span
                v-else
                class="collapse-placeholder"
              />
              <span
                class="outline-text"
                :title="item.text"
              >{{ item.text }}</span>
            </div>

            <!-- H3 子节点 -->
            <ul
              v-if="item.children.length > 0 && !isCollapsed(item.id)"
              class="outline-children"
            >
              <li
                v-for="child in item.children"
                :key="child.id"
                class="outline-node"
              >
                <div
                  class="outline-item level-3"
                  :class="{ active: activeId === child.id }"
                  @click="handleItemClick(child)"
                >
                  <button
                    v-if="child.children.length > 0"
                    class="collapse-btn"
                    :aria-expanded="!isCollapsed(child.id)"
                    :aria-label="isCollapsed(child.id) ? '展开' : '折叠'"
                    @click.stop="toggleCollapse(child.id)"
                  >
                    <ChevronRight
                      :size="12"
                      class="collapse-icon"
                      :class="{ expanded: !isCollapsed(child.id) }"
                    />
                  </button>
                  <span
                    v-else
                    class="collapse-placeholder"
                  />
                  <span
                    class="outline-text"
                    :title="child.text"
                  >{{ child.text }}</span>
                </div>

                <!-- H4 子节点 -->
                <ul
                  v-if="child.children.length > 0 && !isCollapsed(child.id)"
                  class="outline-children"
                >
                  <li
                    v-for="grandchild in child.children"
                    :key="grandchild.id"
                    class="outline-node"
                  >
                    <div
                      class="outline-item level-4"
                      :class="{ active: activeId === grandchild.id }"
                      @click="handleItemClick(grandchild)"
                    >
                      <span class="collapse-placeholder" />
                      <span
                        class="outline-text"
                        :title="grandchild.text"
                      >{{ grandchild.text }}</span>
                    </div>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
        </template>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   Outline Panel - Ethereal Constructivism Design
   ═══════════════════════════════════════════════════════════════════ */

.outline-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #FAFBFC;
  overflow: hidden;
}

/* ─── 空状态 ─── */
.outline-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.outline-empty-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary, #9ca3af);
  text-align: center;
}

.outline-empty-text code {
  display: inline-block;
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
  color: #D32F2F;
}

/* ─── 大纲树 ─── */
.outline-tree {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 8px 16px;
}

.outline-list,
.outline-children {
  list-style: none;
  margin: 0;
  padding: 0;
}

.outline-node {
  margin: 0;
  padding: 0;
}

/* ─── 子节点容器过渡 ─── */
.outline-children {
  overflow: hidden;
}

/* ─── 大纲项 ─── */
.outline-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease;
  border-left: 2px solid transparent;
  user-select: none;
}

.outline-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.outline-item.active {
  border-left-color: #D32F2F;
  background: rgba(211, 47, 47, 0.06);
}

/* ─── 层级样式 ─── */
.outline-item.level-2 {
  padding-left: 8px;
}

.outline-item.level-2 .outline-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #1f2937);
}

.outline-item.level-3 {
  padding-left: 24px;
}

.outline-item.level-3 .outline-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary, #4b5563);
}

.outline-item.level-4 {
  padding-left: 40px;
}

.outline-item.level-4 .outline-text {
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-secondary, #6b7280);
}

/* ─── 文本截断 ─── */
.outline-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

/* ─── 折叠按钮 ─── */
.collapse-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 3px;
  cursor: pointer;
  color: var(--color-text-secondary, #9ca3af);
  transition: color 150ms ease, background 150ms ease;
}

.collapse-btn:hover {
  color: var(--color-text, #1f2937);
  background: rgba(0, 0, 0, 0.06);
}

.collapse-icon {
  transition: transform 150ms ease;
}

.collapse-icon.expanded {
  transform: rotate(90deg);
}

/* 折叠按钮占位符（无子节点时保持对齐） */
.collapse-placeholder {
  display: inline-block;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* ─── 滚动条美化 ─── */
.outline-tree::-webkit-scrollbar {
  width: 4px;
}

.outline-tree::-webkit-scrollbar-track {
  background: transparent;
}

.outline-tree::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 2px;
}

.outline-tree::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}
</style>
