<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useThemeStore, ARTICLE_PRESETS } from '@/stores/theme'

const themeStore = useThemeStore()
const { 
  currentPresetId, 
  baseTheme, 
  primaryColor, 
  fontFamily, 
  fontSize, 
  lineHeight,
  firstLineIndent,
  textAlign,
  customCSS 
} = storeToRefs(themeStore)

// Base themes
const baseThemes = [
  { id: 'default', name: '经典' },
  { id: 'grace', name: '优雅' },
  { id: 'simple', name: '简洁' }
] as const

function selectPreset(presetId: string) {
  themeStore.applyPreset(presetId)
}

function selectBaseTheme(themeId: 'default' | 'grace' | 'simple') {
  baseTheme.value = themeId
}
</script>

<template>
  <div class="theme-panel">
    <!-- Base Themes -->
    <section class="panel-section">
      <h3>基础主题</h3>
      <div class="theme-grid">
        <button 
          v-for="t in baseThemes" 
          :key="t.id"
          class="theme-btn"
          :class="{ active: baseTheme === t.id }"
          @click="selectBaseTheme(t.id)"
        >
          {{ t.name }}
        </button>
      </div>
    </section>

    <!-- Article Presets -->
    <section class="panel-section">
      <h3>文章预设</h3>
      <div class="preset-list">
        <button 
          v-for="p in ARTICLE_PRESETS" 
          :key="p.id"
          class="preset-btn"
          :class="{ active: currentPresetId === p.id }"
          @click="selectPreset(p.id)"
        >
          <span
            class="preset-color"
            :style="{ background: p.primaryColor }"
          />
          {{ p.name }}
        </button>
      </div>
    </section>

    <!-- Style Settings -->
    <section class="panel-section">
      <h3>样式设置</h3>
      <div class="setting-group">
        <label>主题色</label>
        <input
          v-model="primaryColor"
          type="color"
          class="color-input"
        >
      </div>
      <div class="setting-group">
        <label>字体</label>
        <select
          v-model="fontFamily"
          class="select-input"
        >
          <option value="sans">
            无衬线
          </option>
          <option value="serif">
            衬线
          </option>
          <option value="mono">
            等宽
          </option>
        </select>
      </div>
      <div class="setting-group">
        <label>字号 {{ fontSize }}px</label>
        <input
          v-model.number="fontSize"
          type="range"
          min="12"
          max="20"
          class="range-input"
        >
      </div>
      <div class="setting-group">
        <label>行高 {{ lineHeight.toFixed(1) }}</label>
        <input
          v-model.number="lineHeight"
          type="range"
          min="1.2"
          max="2.2"
          step="0.1"
          class="range-input"
        >
      </div>
      <div class="setting-group checkbox-group">
        <label>
          <input
            v-model="firstLineIndent"
            type="checkbox"
          >
          首行缩进
        </label>
      </div>
      <div class="setting-group">
        <label>对齐方式</label>
        <select
          v-model="textAlign"
          class="select-input"
        >
          <option value="left">
            左对齐
          </option>
          <option value="justify">
            两端对齐
          </option>
        </select>
      </div>
    </section>

    <!-- Custom CSS -->
    <section class="panel-section">
      <h3>自定义 CSS</h3>
      <textarea 
        v-model="customCSS" 
        class="css-input" 
        placeholder="/* 在此输入自定义 CSS */"
      />
    </section>
  </div>
</template>

<style scoped>
.theme-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  height: 100%;
}

.panel-section h3 {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin: 0 0 12px;
  color: #999;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.theme-btn {
  padding: 10px;
  border: 1px solid #444;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.theme-btn:hover {
  border-color: #666;
}

.theme-btn.active {
  border-color: #07c160;
  background: rgba(7, 193, 96, 0.1);
}

.preset-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.preset-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #444;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: all 0.15s ease;
}

.preset-btn:hover {
  border-color: #666;
  background: rgba(255,255,255,0.05);
}

.preset-btn.active {
  border-color: #07c160;
  background: rgba(7, 193, 96, 0.1);
}

.preset-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}

/* Settings */
.setting-group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.setting-group label {
  font-size: 13px;
  color: #ccc;
}

.color-input {
  width: 40px;
  height: 28px;
  border: none;
  cursor: pointer;
  background: transparent;
}

.select-input {
  padding: 6px 10px;
  border: 1px solid #444;
  background: #1a1a1a;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
}

.range-input {
  width: 100px;
  accent-color: #07c160;
}

.checkbox-group {
  justify-content: flex-start;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-group input {
  accent-color: #07c160;
}

.css-input {
  width: 100%;
  min-height: 120px;
  padding: 12px;
  border: 1px solid #444;
  background: #1a1a1a;
  color: #abb2bf;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  resize: vertical;
}

.css-input:focus {
  outline: none;
  border-color: #07c160;
}
</style>
