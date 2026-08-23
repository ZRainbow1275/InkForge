<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { Link, Image, LayoutTemplate, Copy } from 'lucide-vue-next'
import { convertToNativeFormat, copyWechatHtmlToClipboard } from '@/services/export'
import { useThemeStore } from '@/stores/theme'
// Import existing ThemePanel logic or recreate simple one
import ThemePanel from '@/components/editor/ThemePanel.vue'

const editorStore = useEditorStore()
const themeStore = useThemeStore()
const { currentContent } = storeToRefs(editorStore)
const { currentPresetId } = storeToRefs(themeStore)

const activeTab = ref<'links' | 'images' | 'theme'>('links')

// --- Link Extraction ---
const extractedLinks = computed(() => {
  if (!currentContent.value?.body) return []
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  const links = []
  let match
  while ((match = regex.exec(currentContent.value.body)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
      full: match[0]
    })
  }
  return links
})

const selectedLinkUrls = ref<Set<string>>(new Set())

function toggleLink(url: string) {
  if (selectedLinkUrls.value.has(url)) {
    selectedLinkUrls.value.delete(url)
  } else {
    selectedLinkUrls.value.add(url)
  }
  // Data binding: update store
  editorStore.updateSelectedLinks(Array.from(selectedLinkUrls.value))
}

// --- Image Extraction ---
const extractedImages = computed(() => {
    if (!currentContent.value?.body) return []
    const regex = /!\[([^\]]*)\]\(([^)]+)\)/g
    const images = []
    let match
    while ((match = regex.exec(currentContent.value.body)) !== null) {
        images.push({
            alt: match[1],
            url: match[2]
        })
    }
    return images
})
async function copyWeChat(): Promise<void> {
    const markdown = currentContent.value?.body
    if (!markdown?.trim()) return
    const result = await convertToNativeFormat(markdown, 'wechat', {
        presetId: currentPresetId.value,
    })
    const copied = result.format === 'html'
        && await copyWechatHtmlToClipboard(result.content)
    alert(copied ? '已复制到公众号格式！' : '复制失败，请检查剪贴板权限后重试。')
}
</script>

<template>
  <div class="cms-tools">
    <div class="cms-header">
      <span>工具箱</span>
      <button
        class="primary-btn"
        @click="copyWeChat"
      >
        <Copy :size="14" /> 复制
      </button>
    </div>

    <!-- Tab Bar -->
    <div class="tool-tabs">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'links' }"
        @click="activeTab = 'links'"
      >
        <Link :size="14" /> 链接 ({{ extractedLinks.length }})
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'images' }"
        @click="activeTab = 'images'"
      >
        <Image :size="14" /> 图片 ({{ extractedImages.length }})
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'theme' }"
        @click="activeTab = 'theme'"
      >
        <LayoutTemplate :size="14" /> 主题
      </button>
    </div>

    <!-- Content Area -->
    <div class="cms-scroll tool-content">
      <!-- Links Panel -->
      <div
        v-show="activeTab === 'links'"
        class="panel-inner"
      >
        <div class="tool-list">
          <div
            v-for="(link, idx) in extractedLinks"
            :key="idx"
            class="tool-item"
          >
            <input 
              type="checkbox" 
              :checked="selectedLinkUrls.has(link.url)"
              @change="toggleLink(link.url)"
            >
            <div class="item-info">
              <div class="item-text">
                {{ link.text }}
              </div>
              <div class="item-url">
                {{ link.url }}
              </div>
            </div>
          </div>
          <div
            v-if="extractedLinks.length === 0"
            class="empty"
          >
            文中无链接
          </div>
        </div>
      </div>

      <!-- Images Panel -->
      <div
        v-show="activeTab === 'images'"
        class="panel-inner"
      >
        <div class="image-grid">
          <div 
            v-for="(img, idx) in extractedImages" 
            :key="idx" 
            class="image-item"
          >
            <img
              :src="img.url"
              :title="img.alt"
            >
          </div>
        </div>
        <div
          v-if="extractedImages.length === 0"
          class="empty"
        >
          文中无图片
        </div>
      </div>

      <!-- Theme Panel -->
      <div
        v-show="activeTab === 'theme'"
        class="panel-inner"
      >
        <ThemePanel class="embedded-theme-panel" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cms-tools {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  border-left: var(--cms-border);
}

.primary-btn {
  background: var(--cms-primary);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.primary-btn:hover { background: var(--cms-primary-hover); }

.tool-tabs {
  display: flex;
  border-bottom: var(--cms-border);
  padding: 0 8px;
  gap: 4px;
  background: #f8fafc;
}

.tab-btn {
  padding: 10px 12px;
  font-size: 12px;
  color: var(--cms-text-secondary);
  border: none;
  background: transparent;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tab-btn:hover { color: var(--cms-text-primary); }
.tab-btn.active {
  color: var(--cms-primary);
  border-bottom-color: var(--cms-primary);
  font-weight: 500;
}

.tool-content {
  padding: 0;
  background: #fff;
}

.panel-inner {
  padding: 12px;
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tool-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px;
  border: 1px solid #f1f5f9;
  border-radius: 4px;
}

.item-info {
  flex: 1;
  overflow: hidden;
}

.item-text {
  font-size: 12px;
  color: var(--cms-text-primary);
  font-weight: 500;
  margin-bottom: 2px;
}

.item-url {
  font-size: 10px;
  color: var(--cms-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty {
  text-align: center;
  padding: 20px;
  color: #ccc;
  font-size: 12px;
}

/* Fix styles for embedded ThemePanel */
:deep(.theme-panel) {
  padding: 0 !important;
}
</style>
